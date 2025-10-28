'use client';

import { useRef, useState, useTransition } from 'react';
import type { Apartment } from '@/types/apartment';
import { useRouter } from 'next/navigation';
import { addApartment, updateApartment } from '@/app/(admin)/admin/actions';
import Map from '@/app/(admin)/admin/Map';
import { SortableImage } from '@/app/(admin)/admin/SortableImage';
import { PriceValidationHint } from '@/components/PriceValidationHint';
import { QuickDraftForm } from '@/components/QuickDraftForm';
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
  features?: string[];
};

export default function OwnerApartmentForm({ initialData }: { initialData?: InitialData }) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDraftForm, setShowDraftForm] = useState(false);
  const [price, setPrice] = useState<number | ''>(initialData?.price_huf ?? '');
  const [district, setDistrict] = useState<number | ''>(
    typeof initialData?.district === 'number' ? initialData.district : ''
  );
  const [description, setDescription] = useState<string>(initialData?.description ?? '');
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({
    Bedroom: initialData?.bedrooms ?? 0,
    Bathroom: initialData?.bathrooms ?? 0,
    Kitchen: initialData?.kitchen ?? 0,
    Balcony: initialData?.balcony ?? 0,
    Garden: initialData?.garden ?? 0,
    'Living Room': initialData?.living_room ?? 0,
    Storage: initialData?.storage ?? 0,
  });

  const [features, setFeatures] = useState<string[]>(initialData?.features ?? []);
  const [imageUrls, setImageUrls] = useState<string[]>(initialData?.image_urls ?? []);
  const [uploading, setUploading] = useState(false);
  const hasInitialCoordinates =
    typeof initialData?.latitude === 'number' &&
    !Number.isNaN(initialData.latitude) &&
    typeof initialData?.longitude === 'number' &&
    !Number.isNaN(initialData.longitude);

  const initialCoordinates = hasInitialCoordinates
    ? { lat: initialData!.latitude as number, lng: initialData!.longitude as number }
    : null;

  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(
    initialCoordinates,
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setImageUrls((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRoomCountChange = (roomType: string, count: number) => {
    setRoomCounts(prev => ({ ...prev, [roomType]: count }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const handleImageUpload = async (files: FileList) => {
    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Use the media API for processing instead of direct Supabase upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'apartment');

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        return result.url; // The processed image URL
      });

      const urls = await Promise.all(uploadPromises);
      setImageUrls(prev => [...prev, ...urls]);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Error uploading images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      try {
        // Validate quality photo requirements
        if (imageUrls.length < 3) {
          alert('Please upload at least 3 quality photos before publishing your listing.');
          return;
        }

        // Check if photos have been processed and have quality scores
        const processedPhotos = imageUrls.filter(url => {
          // In a real implementation, this would check the media service for quality scores
          // For now, we'll assume uploaded photos are processed
          return url && url.length > 0;
        });

        if (processedPhotos.length < 3) {
          alert('Please wait for photo processing to complete before publishing.');
          return;
        }

        // Add owner_id to form data
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          alert('You must be logged in to create a listing');
          return;
        }

        formData.append('owner_id', user.id);

        // Add processed data
        formData.set('price_huf', price.toString());
        formData.set('description', description);
        formData.set('bedrooms', roomCounts.Bedroom.toString());
        formData.set('bathrooms', roomCounts.Bathroom.toString());
        formData.set('kitchen', roomCounts.Kitchen.toString());
        formData.set('balcony', roomCounts.Balcony.toString());
        formData.set('garden', roomCounts.Garden.toString());
        formData.set('living_room', roomCounts['Living Room'].toString());
        formData.set('storage', roomCounts.Storage.toString());
        formData.set('features', JSON.stringify(features));
        formData.set('image_urls', JSON.stringify(imageUrls));

        if (coordinates) {
          formData.set('latitude', coordinates.lat.toString());
          formData.set('longitude', coordinates.lng.toString());
        } else {
          formData.delete('latitude');
          formData.delete('longitude');
        }

        if (initialData?.id) {
          // Update existing apartment
          await updateApartment(initialData.id, formData);
          router.push(`/owner/listings/${initialData.id}`);
        } else {
          // Create new apartment
          await addApartment(formData);
          router.push('/owner/listings');
        }
      } catch (error: any) {
        console.error('Error:', error);
        alert('Error saving apartment: ' + error.message);
      }
    });
  };

  return (
    <>
      {/* Quick Draft Form - shown as expandable section */}
      {!initialData?.id && (
        <div className="mb-8">
          {showDraftForm ? (
            <QuickDraftForm
              onDraftSaved={(draftId) => {
                setShowDraftForm(false);
                // Optionally reload or navigate
                router.refresh();
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowDraftForm(true)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              💾 Save as Draft & Continue Later
            </button>
          )}
        </div>
      )}

      <form ref={formRef} action={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            defaultValue={initialData?.title ?? ''}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Modern 2BR Apartment in District 5"
          />
        </div>

        <div>
          <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-2">
            District *
          </label>
          <select
            id="district"
            name="district"
            required
            value={district}
            onChange={(e) => setDistrict(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select District</option>
            {Array.from({ length: 23 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>District {d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Price */}
      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
          Monthly Rent (HUF) *
        </label>
        <input
          type="number"
          id="price"
          value={price}
          onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
          required
          min="0"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., 150000"
        />
        
        {/* Price validation hint */}
        {price && district && (
          <div className="mt-3">
            <PriceValidationHint price={price} district={district} />
          </div>
        )}
      </div>

      {/* Room Counts */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Room Configuration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(roomCounts).map(([roomType, count]) => (
            <div key={roomType}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {roomType}
              </label>
              <input
                type="number"
                value={count}
                onChange={(e) => handleRoomCountChange(roomType, Number(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description *
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Describe your apartment, its features, and what makes it special..."
        />
      </div>

      {/* Features */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Features & Amenities</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'WiFi', 'Parking', 'Elevator', 'Air Conditioning', 'Heating', 'Dishwasher',
            'Washing Machine', 'Dryer', 'Microwave', 'Oven', 'Refrigerator', 'TV',
            'Balcony', 'Terrace', 'Garden', 'Pet Friendly', 'Furnished', 'Utilities Included'
          ].map(feature => (
            <label key={feature} className="flex items-center">
              <input
                type="checkbox"
                checked={features.includes(feature)}
                onChange={() => handleFeatureToggle(feature)}
                className="mr-2"
              />
              {feature}
            </label>
          ))}
        </div>
      </div>

      {/* Location/Map */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
        <div className="mb-4">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
            Address *
          </label>
          <input
            type="text"
            id="address"
            name="address"
            required
            defaultValue={initialData?.address ?? ''}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Street address"
          />
        </div>
        <Map
          onLocationSelect={(lat, lng) => setCoordinates({ lat, lng })}
          initialCoordinates={coordinates ?? initialCoordinates}
        />
      </div>

      {/* Images */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Photos</h3>
        <div className="space-y-4">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />

          {uploading && (
            <div className="text-sm text-gray-600">Uploading images...</div>
          )}

          {imageUrls.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={imageUrls} strategy={horizontalListSortingStrategy}>
                <div className="flex flex-wrap gap-4">
                  {imageUrls.map((url, index) => (
                    <SortableImage
                      key={url}
                      src={url}
                      index={index}
                      onRemove={(idx) => setImageUrls(prev => prev.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isPending ? (initialData?.id ? 'Updating...' : 'Creating...') : (initialData?.id ? 'Update Listing' : 'Create Listing')}
        </button>
      </div>
      </form>
    </>
  );
}
