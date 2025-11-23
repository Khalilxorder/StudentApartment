'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addApartment } from './actions';
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

export default function AdminForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Title replaced with price
  const [price, setPrice] = useState<number | ''>('');
  const [address, setAddress] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({
    Bedroom: 0,
    Bathroom: 0,
    Kitchen: 0,
    Balcony: 0,
    Garden: 0,
    'Living Room': 0,
    Storage: 0,
  });
  const [furnishing, setFurnishing] = useState<string>('');
  const [elevator, setElevator] = useState<string>('');
  const [privacyLevel, setPrivacyLevel] = useState<string>('');
  const [naturalLight, setNaturalLight] = useState<string>('');
  const [storyFit, setStoryFit] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number }>({ lat: 47.4979, lng: 19.0402 });

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setFiles((prev) => [...prev, ...newFiles]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    URL.revokeObjectURL(previews[indexToRemove]);
    setFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
    setPreviews((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = previews.indexOf(active.id as string);
      const newIndex = previews.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        setPreviews((items) => arrayMove(items, oldIndex, newIndex));
        setFiles((items) => arrayMove(items, oldIndex, newIndex));
      }
    }
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setLocation({ lat, lng });
  };

  const handleRoomChange = (room: string, value: number) => {
    setRoomCounts((prev) => ({ ...prev, [room]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    const formData = new FormData();

    formData.append('title', String(price));
    formData.append('address', address);
    formData.append('description', description);
    formData.append('price_huf', String(price));
    Object.entries(roomCounts).forEach(([key, value]) => formData.append(key.toLowerCase().replace(/ /g, '_'), String(value)));
    formData.append('furnishing', furnishing);
    formData.append('elevator', elevator);
    formData.append('privacy_level', privacyLevel);
    formData.append('natural_light', naturalLight);
    formData.append('story_fit', storyFit);
    formData.append('latitude', String(location.lat));
    formData.append('longitude', String(location.lng));
    formData.append('is_available', isAvailable ? 'on' : '');

    files.forEach((file) => formData.append('images', file));
    startTransition(async () => {
      try {
        await addApartment(formData);
        router.push('/admin?success=Apartment added successfully!');
        router.refresh();
      } catch (e: any) {
        alert(e.message || 'Failed to add apartment.');
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
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4 flex-grow">
            <div>
              <label htmlFor="price_huf" className="block text-sm font-medium">Price (HUF)</label>
              <input
                type="number"
                name="price_huf"
                id="price_huf"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Price in Hungarian Forint"
                className="p-2 w-full border rounded"
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium">Address</label>
              <input type="text" name="address" id="address" required value={address} onChange={e => setAddress(e.target.value)} className="p-2 w-full border rounded" />
            </div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="p-3 w-full border rounded resize-y"
              placeholder="Detailed description of the apartment..."
            />
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(roomCounts).map(([key, value]) => (
                <div key={key} className="text-center">
                  <input
                    type="number"
                    name={key.toLowerCase().replace(/ /g, '_')}
                    value={value}
                    onChange={(e) => handleRoomChange(key, Number(e.target.value))}
                    className="w-full p-2 border rounded mb-1 text-center"
                  />
                  <div className="text-xs">{key}</div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-1">🪟 Apartment Environment & Feel</h3>
              <div className="flex flex-col gap-2 border rounded p-2">
                <input name="elevator" value={elevator} onChange={(e) => setElevator(e.target.value)} placeholder="Elevator" className="p-2 w-full border rounded" />
                <input name="natural_light" value={naturalLight} onChange={(e) => setNaturalLight(e.target.value)} placeholder="Natural Light" className="p-2 w-full border rounded" />
                <input name="privacy_level" value={privacyLevel} onChange={(e) => setPrivacyLevel(e.target.value)} placeholder="Privacy Level" className="p-2 w-full border rounded" />
              </div>
            </div>
            <div className="mt-2">
              <label>
                <input type="checkbox" name="is_available" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} className="mr-2" />
                Available
              </label>
            </div>
          </div>

          {/* RIGHT COLUMN */}
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
          <SubmitButton isEditing={false} pending={isPending} />
        </div>
      </form>
    </div>
  );
}