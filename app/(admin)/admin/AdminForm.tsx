// FILE: app/components/AdminForm.tsx
'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import type { Apartment } from '@/types/apartment';
import { useRouter } from 'next/navigation';
import { addApartment, updateApartment } from './actions';
import SubmitButton from './submit-button';
import Map from './Map';
import { SortableImage } from './SortableImage';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { supabase } from '@/utils/supabaseClient';

type InitialData = Partial<Apartment>;

export default function AdminForm({ initialData }: { initialData?: InitialData }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState<string>(initialData?.title ?? '');
  const [price, setPrice] = useState<number | ''>(initialData?.price_huf ?? '');
  const [address, setAddress] = useState<string>(initialData?.address ?? '');
  const initialDistrict = useMemo(() => {
    const raw = initialData?.district;
    if (!raw) return '';
    const digits = String(raw).match(/\d{1,2}/)?.[0];
    return digits ?? '';
  }, [initialData?.district]);
  const [district, setDistrict] = useState<string>(initialDistrict);
  const [description, setDescription] = useState<string>(initialData?.description ?? '');
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({
    Bedrooms: initialData?.bedrooms ?? 1,
    Bathrooms: initialData?.bathrooms ?? 1,
    Kitchen: initialData?.kitchen ?? 1,
    Balcony: initialData?.balcony ?? 0,
  });

  const [isAvailable, setIsAvailable] = useState<boolean>(initialData?.is_available ?? true);
  const [files, setFiles] = useState<File[]>([]);
  // map objectUrl => File for accurate deletion of newly added files
  const fileMapRef = useRef<Record<string, File>>({});
  // existingImageUrls holds the original uploaded URLs (from DB)
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>((initialData?.image_urls as string[] | undefined) ?? []);
  // previews include both existingImageUrls and newly selected previews
  const [previews, setPreviews] = useState<string[]>([...existingImageUrls]);
  // track which existing image urls the user removed
  const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]);
  const initialCoordinates = useMemo(() => {
    if (typeof initialData?.latitude === 'number' && typeof initialData?.longitude === 'number') {
      return { lat: initialData.latitude, lng: initialData.longitude };
    }
    return null;
  }, [initialData?.latitude, initialData?.longitude]);
  const [location, setLocation] = useState<{ lat: number; lng: number }>(
    initialCoordinates ?? { lat: 47.4979, lng: 19.0402 },
  );

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      // populate mapping
      newPreviews.forEach((url, idx) => (fileMapRef.current[url] = newFiles[idx]));
      setFiles((prev) => [...prev, ...newFiles]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveImage = (index: number) => {
    const url = previews[index];
    // if this url is one of the existing image urls, mark it for deletion
    if (existingImageUrls.includes(url)) {
      setDeletedImageUrls((prev) => [...prev, url]);
      setExistingImageUrls((prev) => prev.filter((u) => u !== url));
      setPreviews((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    // otherwise it's a newly created preview; revoke object URL and remove the mapped file
    URL.revokeObjectURL(url);
    const fileToRemove = fileMapRef.current[url];
    if (fileToRemove) {
      setFiles((prev) => prev.filter((f) => f !== fileToRemove));
      delete fileMapRef.current[url];
    }
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = previews.indexOf(active.id as string);
      const newIndex = previews.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        setPreviews((prev) => arrayMove(prev, oldIndex, newIndex));
        setFiles((prev) => arrayMove(prev, oldIndex, newIndex));
      }
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setLocation({ lat, lng });
  };

  const handleAddressUpdate = (value: string) => {
    setAddress(value);
    const districtMatch =
      value.match(/District\s+(\d{1,2})/i) ?? value.match(/(\d{1,2})\.\s*kerulet/i);
    if (districtMatch) {
      const parsed = Number.parseInt(districtMatch[1], 10);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 23) {
        setDistrict(String(parsed));
      }
    }
  };

  const handleRoomChange = (room: string, value: number) => {
    const normalized = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    const capped =
      room === 'Kitchen' || room === 'Balcony' ? Math.min(normalized, 1) : normalized;
    setRoomCounts((prev) => ({ ...prev, [room]: capped }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    startTransition(async () => {
      try {
        const trimmedTitle = title.trim();
        const trimmedAddress = address.trim();
        const priceValue = typeof price === 'number' ? price : Number.parseInt(String(price), 10);
        const districtValue = Number.parseInt(String(district), 10);

        if (!trimmedTitle) throw new Error('Please enter a listing title');
        if (!trimmedAddress) throw new Error('Please enter the street address');
        if (!Number.isFinite(priceValue) || priceValue <= 0) {
          throw new Error('Please enter a valid positive price');
        }
        if (!Number.isFinite(districtValue) || districtValue < 1 || districtValue > 23) {
          throw new Error('Please select a district between 1 and 23');
        }
        if (files.length === 0 && existingImageUrls.length === 0) {
          throw new Error('Please upload at least one photo');
        }
        if (files.length > 20) throw new Error('Maximum 20 images allowed');

        const uploadedUrls: string[] = [];
        const uploadedKeys: string[] = [];

        for (const file of files) {
          const safeName = `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
          const { error } = await supabase.storage
            .from('apartments')
            .upload(safeName, file, { upsert: false });
          if (error) throw error;
          const { data: publicUrl } = supabase.storage.from('apartments').getPublicUrl(safeName);
          uploadedUrls.push(publicUrl.publicUrl);
          uploadedKeys.push(safeName);
        }

        const kitchenValue = Number(roomCounts.Kitchen ?? 0);
        const balconyValue = Number(roomCounts.Balcony ?? 0);
        const bedroomsValue = Number(roomCounts.Bedrooms ?? 0);
        const bathroomsValue = Number(roomCounts.Bathrooms ?? 0);

        const sanitizedKitchen = kitchenValue > 0 ? 1 : 0;
        const sanitizedBalcony = balconyValue > 0 ? 1 : 0;
        const sanitizedBedrooms = Math.max(0, Math.floor(bedroomsValue));
        const sanitizedBathrooms = Math.max(0, Math.floor(bathroomsValue));
        const trimmedDescription = description.trim();
        if (trimmedDescription.length < 10) {
          throw new Error('Please add a slightly longer description (10+ characters).');
        }

        const formData = new FormData();
        formData.append('title', trimmedTitle);
        formData.append('address', trimmedAddress);
        formData.append('district', String(districtValue));
        formData.append('price_huf', String(priceValue));
        formData.append('description', trimmedDescription);
        formData.append('latitude', String(location.lat));
        formData.append('longitude', String(location.lng));
        formData.append('is_available', isAvailable ? 'true' : 'false');
        formData.append('bedrooms', String(sanitizedBedrooms));
        formData.append('bathrooms', String(sanitizedBathrooms));
        formData.append('kitchen', String(sanitizedKitchen));
        formData.append('balcony', String(sanitizedBalcony));

        // include existing image URLs (those not deleted) and newly uploaded ones
        const finalImageUrls = [...existingImageUrls, ...uploadedUrls];
        finalImageUrls.forEach((url) => formData.append('image_urls', url));

        uploadedKeys.forEach((k) => formData.append('uploaded_image_keys', k));

        const deletedKeys = deletedImageUrls.map((u) => u.split('/').pop() || '').filter(Boolean);
        deletedKeys.forEach((k) => formData.append('deleted_image_keys', k));

        if (initialData?.id) {
          await updateApartment(initialData.id, formData);
          router.push('/admin?success=Apartment updated successfully!');
        } else {
          await addApartment(formData);
          router.push('/admin?success=Apartment added successfully!');
        }
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Error uploading apartment.');
      }
    });
  };

  return (
    <div className="bg-design-container p-6 md:p-8 rounded-design shadow-xl max-w-7xl mx-auto">
      <h2 className="text-center text-xl font-semibold text-gray-700 mb-8">
        {price !== '' ? `Price: ${price} HUF` : 'Enter Price'}
      </h2>
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* LEFT */}
          <div className="flex flex-col gap-4 flex-grow">
            <input
              type="text"
              placeholder="Listing Title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="p-2 w-full border rounded"
            />
            <input
              type="text"
              placeholder="Street Address"
              required
              value={address}
              onChange={(e) => handleAddressUpdate(e.target.value)}
              className="p-2 w-full border rounded"
            />
            <select
              value={district}
              onChange={(e) => {
                const value = e.target.value.trim();
                setDistrict(value);
              }}
              required
              className="p-2 w-full border rounded"
            >
              <option value="">Select District</option>
              {Array.from({ length: 23 }, (_, idx) => {
                const districtNumber = idx + 1;
                return (
                  <option key={districtNumber} value={districtNumber}>
                    District {districtNumber}
                  </option>
                );
              })}
            </select>
            <input
              type="number"
              placeholder="Price (HUF)"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
              className="p-2 w-full border rounded"
            />
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="p-3 w-full border rounded resize-y"
              placeholder="Detailed description..."
            />
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(roomCounts).map(([key, value]) => {
                const isBinary = key === 'Kitchen' || key === 'Balcony';
                return (
                  <div key={key} className="text-center">
                    <input
                      type="number"
                      min={0}
                      max={isBinary ? 1 : undefined}
                      step={1}
                      value={value}
                      onChange={(e) => handleRoomChange(key, Number(e.target.value))}
                      className="w-full p-2 border rounded mb-1 text-center"
                    />
                    <div className="text-xs">{key}</div>
                  </div>
                );
              })}
            </div>
            <label className="mt-2">
              <input type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} className="mr-2" />
              Available
            </label>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-4 flex-grow">
            <div className="w-full bg-gray-100 aspect-video border rounded flex items-center justify-center overflow-hidden">
              {previews.length > 0 ? (
                <img src={previews[0]} className="object-contain w-full h-full" alt="Main preview" />
              ) : (
                <span className="text-gray-400">MAIN IMAGE</span>
              )}
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={previews} strategy={horizontalListSortingStrategy}>
                <div className="grid grid-cols-4 gap-2">
                  {previews.map((url, index) => (
                    <SortableImage key={url} src={url} index={index} onRemove={handleRemoveImage} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded text-center hover:bg-blue-700">
              Choose Files
              <input type="file" name="images" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
            <div className="h-[400px] flex-grow border rounded overflow-hidden">
              <Map
                onLocationSelect={handleLocationSelect}
                initialCoordinates={initialCoordinates ?? undefined}
                onAddressSelect={handleAddressUpdate}
              />
            </div>
          </div>
        </div>
        <div className="pt-8">
          <SubmitButton isEditing={!!initialData?.id} pending={isPending} />
        </div>
      </form>
    </div>
  );
}






