'use client';

import { useState } from 'react';

export default function ImageUploader() {
  const [files, setFiles] = useState<File[]>([]); // State to hold selected File objects
  const [previews, setPreviews] = useState<string[]>([]); // State to hold object URLs for image previews

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      setFiles(prevFiles => [...prevFiles, ...selectedFiles]); // Add new files to state

      const newPreviews = selectedFiles.map(file => URL.createObjectURL(file)); // Create object URLs for previews
      setPreviews(prevPreviews => [...prevPreviews, ...newPreviews]); // Add new previews to state
    }
  };

  const removeImage = (indexToRemove: number) => {
    // Revoke the object URL to free up memory
    URL.revokeObjectURL(previews[indexToRemove]);

    setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove)); // Remove file from state
    setPreviews(prevPreviews => prevPreviews.filter((_, index) => index !== indexToRemove)); // Remove preview from state
  };

  // The `files` state can be passed to a server action for upload later

  return (
    <div className="space-y-6">
      {/* Main Image Preview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Main Image</h3>
        <div className="w-full h-80 bg-gray-200 border-2 border-dashed rounded-md flex items-center justify-center overflow-hidden">
          {previews.length > 0 ? (
            <img src={previews[0]} alt="Main preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-500">Choose an image</span>
          )}
        </div>
      </div>

      {/* Image Gallery & Uploader */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Image Gallery</h3>
        <div className="grid grid-cols-4 gap-4 mb-4">
          {previews.map((src, index) => (
            <div key={index} className="relative h-24">
              <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover rounded-md" />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold hover:bg-red-700"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <div>
          <label htmlFor="image-upload" className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Choose Files
          </label>
          <input
            id="image-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}