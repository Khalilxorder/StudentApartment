'use client';

import { useRef, useState, useTransition } from 'react';
import type { Apartment } from '@/types/apartment';
import { createClient } from '@/utils/supabaseClient';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { addApartment, updateApartment } from '@/app/[locale]/(admin)/admin/actions';
import Map from '@/app/[locale]/(admin)/admin/Map';
import { MultiFileUploader } from '@/components/MultiFileUploader';
import { GalleryImage } from '@/components/ImageGallery';
import { useSensor, useSensors, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { QuickDraftForm } from '@/components/QuickDraftForm';
import { PriceValidationHint } from '@/components/PriceValidationHint';

type InitialData = Partial<Apartment> & {
  privacy_level?: string;
  natural_light?: string;
  garden?: number;
  living_room?: number;
  storage?: number;
  features?: string[];
};

export default function OwnerApartmentForm({ initialData }: { initialData?: InitialData }) {
  const supabase = createClient();
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

  const handleRoomCountChange = (room: string, count: number) => {
    setRoomCounts(prev => ({ ...prev, [room]: count }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  // Initialize with proper GalleryImage shape
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(
    (initialData?.image_urls ?? []).map((url, idx) => ({
      id: url,
      url: url,
      status: 'complete',
      isCover: idx === 0
    }))
  );

  const [isAvailable, setIsAvailable] = useState<boolean>(initialData?.is_available ?? true);
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


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        // Client-side validation
        if (!price || price < 0) {
          alert('Please enter a valid price');
          return;
        }

        if (!district) {
          alert('Please select a district');
          return;
        }

        if (!description || description.trim().length === 0) {
          alert('Please enter a description');
          return;
        }

        if (!coordinates) {
          alert('Please select a location on the map');
          return;
        }

        // Validate quality photo requirements
        if (galleryImages.length < 3) {
          alert('Please upload at least 3 quality photos before publishing your listing.');
          return;
        }

        // Check if photos have been processed
        const completedImages = galleryImages.filter(img => img.status === 'complete');
        if (completedImages.length < 3) {
          alert('Please wait for photo processing to complete before publishing.');
          return;
        }

        // Get user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          alert('You must be logged in to create a listing');
          return;
        }

        // Prepare form data
        const formData = new FormData();

        // Add basic fields from form
        const titleInput = formRef.current?.querySelector<HTMLInputElement>('input[name="title"]');
        const addressInput = formRef.current?.querySelector<HTMLInputElement>('input[name="address"]');

        if (!titleInput?.value) {
          alert('Please enter a title');
          return;
        }

        if (!addressInput?.value) {
          alert('Please enter an address');
          return;
        }

        // Add all form data
        formData.append('owner_id', user.id);
        formData.append('title', titleInput.value);
        formData.append('address', addressInput.value);
        formData.append('district', district.toString());
        formData.append('price_huf', price.toString());
        formData.append('description', description);

        // Add room counts
        formData.append('bedrooms', roomCounts.Bedroom.toString());
        formData.append('bathrooms', roomCounts.Bathroom.toString());
        formData.append('kitchen', roomCounts.Kitchen.toString());
        formData.append('balcony', roomCounts.Balcony.toString());
        formData.append('garden', roomCounts.Garden.toString());
        formData.append('living_room', roomCounts['Living Room'].toString());
        formData.append('storage', roomCounts.Storage.toString());

        // Availability
        formData.append('is_available', String(isAvailable));

        // Add images (ordered by galleryImages which handles sorting)
        galleryImages.forEach(img => {
          if (img.status === 'complete' && img.url) {
            formData.append('image_urls', img.url);
          }
        });

        // Add features
        features.forEach(featureId => {
          formData.append('feature_ids', featureId);
        });

        // Add coordinates
        formData.append('latitude', coordinates.lat.toString());
        formData.append('longitude', coordinates.lng.toString());

        // Call appropriate action
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
              Save as Draft & Continue Later
            </button>
          )}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Title (kept for data validity) */}
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

            {/* Price */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Price (HUF) *
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
              {price && district && (
                <div className="mt-2">
                  <PriceValidationHint price={price} district={district} />
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                DESCRIPTION *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                placeholder="Describe your apartment..."
              />
            </div>

            {/* Room Grid (Bedroom, Bathroom, Kitchen, Balcony) */}
            <div className="grid grid-cols-4 gap-4">
              {['Bedroom', 'Bathroom', 'Kitchen', 'Balcony'].map((roomType) => (
                <div key={roomType} className="bg-gray-100 p-3 rounded-lg text-center">
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                    {roomType}
                  </label>
                  <input
                    type="number"
                    value={roomCounts[roomType] || 0}
                    onChange={(e) => handleRoomCountChange(roomType, Number(e.target.value))}
                    min="0"
                    className="w-full text-center bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none font-semibold"
                  />
                </div>
              ))}
            </div>

            {/* Address */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Address:
              </label>
              <input
                type="text"
                id="address"
                name="address"
                required
                defaultValue={initialData?.address ?? ''}
                className="w-full bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none py-1"
                placeholder="Street address"
              />
            </div>

            {/* District */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                District:
              </label>
              <select
                id="district"
                name="district"
                required
                value={district}
                onChange={(e) => setDistrict(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none py-1"
              >
                <option value="">Select District</option>
                {Array.from({ length: 23 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>District {d}</option>
                ))}
              </select>
            </div>

            {/* Furnishing & Elevator */}
            <div className="space-y-3">
              <div className="bg-gray-100 p-4 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Furnishing:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={features.includes('Furnished')}
                    onChange={() => handleFeatureToggle('Furnished')}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-600">Furnished</span>
                </label>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Elevator:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={features.includes('Elevator')}
                    onChange={() => handleFeatureToggle('Elevator')}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-600">Yes</span>
                </label>
              </div>
            </div>

            {/* Other Features (Collapsible or Bottom) */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Other Features</h3>
              <div className="flex flex-wrap gap-2">
                {[
                  'WiFi', 'Parking', 'Air Conditioning', 'Heating', 'Dishwasher',
                  'Washing Machine', 'Dryer', 'Microwave', 'Oven', 'Refrigerator', 'TV',
                  'Terrace', 'Garden', 'Pet Friendly', 'Utilities Included'
                ].map(feature => (
                  <label key={feature} className="inline-flex items-center px-3 py-1 rounded-full border border-gray-200 bg-white text-xs cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={features.includes(feature)}
                      onChange={() => handleFeatureToggle(feature)}
                      className="mr-2 w-3 h-3"
                    />
                    {feature}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6 lg:sticky lg:top-24">
            {/* Images Section */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Photos</h3>
                <span className="text-xs text-gray-500">{galleryImages.length} uploaded</span>
              </div>

              <MultiFileUploader
                apartmentId={initialData?.id}
                existingImages={galleryImages}
                onImagesChange={setGalleryImages}
                maxImages={20}
              />
            </div>

            {/* Map Section */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-[300px]">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Location</h3>
              <div className="h-full rounded-lg overflow-hidden">
                <Map
                  onLocationSelect={(lat, lng) => setCoordinates({ lat, lng })}
                  initialCoordinates={coordinates ?? initialCoordinates}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
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
            {isPending ? (initialData?.id ? 'Updating...' : 'Uploading...') : (initialData?.id ? 'Update Listing' : 'Upload Listing')}
          </button>
        </div>
      </form>
    </>
  );
}
