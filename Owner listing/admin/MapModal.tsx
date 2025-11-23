'use client';

import { useState } from 'react';
import Map from './Map'; // Import the updated Map component

export default function MapModal({ onLocationConfirm }: { onLocationConfirm: (location: { lat: number, lng: number }) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationConfirm(selectedLocation);
    }
    setIsOpen(false);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full p-3 bg-blue-600 text-white rounded-design hover:bg-blue-700"
      >
        Select Location on Map
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl">
            <h3 className="text-xl font-semibold mb-4">Select Apartment Location</h3>
            {/* Map component passes selected coordinates to setSelectedLocation */}
            <Map onLocationSelect={(lat, lng) => setSelectedLocation({ lat, lng })} />
            <div className="flex justify-end gap-4 mt-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 bg-green-600 text-white rounded-md"
                disabled={!selectedLocation} // Disable if no location selected
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}