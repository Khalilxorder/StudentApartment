// FILE: app/components/AdminForm.tsx
'use client';

import { useRef, useState, useTransition } from 'react';
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

type InitialData = Partial<Apartment> & {
  privacy_level?: string;
  natural_light?: string;
  garden?: number;
  living_room?: number;
  storage?: number;
};

export default function AdminForm({ initialData }: { initialData?: InitialData }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [price, setPrice] = useState<number | ''>(initialData?.price_huf ?? '');
  const [description, setDescription] = useState<string>(initialData?.description ?? '');
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({
    Bedroom: initialData?.bedrooms ?? 0,
    Bathroom: initialData?.bathrooms ?? 0,
    Kitchen: initialData?.kitchen ?? 0,
    Balcony: initialData?.balcony ?? 0,
    Garden: // some seeds/store may use garden or garden_count
      initialData?.garden ?? 0,
    'Living Room': // map possible stored field living_room
      initialData?.living_room ?? 0,
    Storage: // optional
      initialData?.storage ?? 0,
  });

  const [privacyLevel, setPrivacyLevel] = useState<string>(initialData?.privacy_level ?? '');
  const [naturalLight, setNaturalLight] = useState<string>(initialData?.natural_light ?? '');

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
  const [location, setLocation] = useState<{ lat: number; lng: number }>({ lat: initialData?.latitude ?? 47.4979, lng: initialData?.longitude ?? 19.0402 });

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

  const handleRoomChange = (room: string, value: number) => {
    setRoomCounts((prev) => ({ ...prev, [room]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    startTransition(async () => {
      try {
        const uploadedUrls: string[] = [];
        const uploadedKeys: string[] = [];

        for (const file of files) {
          const filename = `${Date.now()}-${file.name}`;
          const { data, error } = await supabase.storage.from('apartments').upload(filename, file);
          if (error) throw error;
          const { data: publicUrl } = supabase.storage.from('apartments').getPublicUrl(filename);
          uploadedUrls.push(publicUrl.publicUrl);
          uploadedKeys.push(filename);
        }

  const formData = new FormData();
  formData.append('price_huf', String(price));
        formData.append('description', description);
        formData.append('latitude', String(location.lat));
        formData.append('longitude', String(location.lng));
        formData.append('is_available', isAvailable ? 'on' : '');

        Object.entries(roomCounts).forEach(([key, value]) => {
          formData.append(key.toLowerCase().replace(/ /g, '_'), String(value));
        });



        formData.append('privacy_level', privacyLevel);
        formData.append('natural_light', naturalLight);


        // include existing image URLs (those not deleted) and newly uploaded ones
        const finalImageUrls = [...existingImageUrls, ...uploadedUrls];
        finalImageUrls.forEach((url) => formData.append('image_urls', url));

        // include image keys for newly uploaded files and existing keys (if any)
        // existing keys: try to extract filename from existingImageUrls when possible
        const existingKeysFromUrls = existingImageUrls
          .map((url) => url.split('/').pop() || '')
          .filter(Boolean);
        const finalImageKeys = [...existingKeysFromUrls, ...uploadedKeys];
        finalImageKeys.forEach((k) => formData.append('image_keys', k));

        // include any deleted image keys so server can remove them from storage
        // convert deletedImageUrls to keys when possible
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
              type="number"
              placeholder="Price (HUF)"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
              className="p-2 w-full border rounded"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="p-3 w-full border rounded resize-y"
              placeholder="Detailed description..."
            />
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(roomCounts).map(([key, value]) => (
                <div key={key} className="text-center">
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => handleRoomChange(key, Number(e.target.value))}
                    className="w-full p-2 border rounded mb-1 text-center"
                  />
                  <div className="text-xs">{key}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 mt-4 border p-2 rounded">

              <input value={naturalLight} onChange={(e) => setNaturalLight(e.target.value)} placeholder="Natural Light" className="p-2 border rounded" />
              <input value={privacyLevel} onChange={(e) => setPrivacyLevel(e.target.value)} placeholder="Privacy Level" className="p-2 border rounded" />


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
              <Map onLocationSelect={handleLocationSelect} />
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
