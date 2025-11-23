'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableImage({ src, index, onRemove }: { src: string, index: number, onRemove: (index: number) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: src }); // Use the preview URL as a unique ID

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative h-24" // Fixed height for consistent grid display
    >
      <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover rounded-md" />
      {/* Drag Handle - The entire image area is set as draggable */}
      <div {...listeners} className="absolute inset-0 cursor-grab"></div>
      {/* Remove Button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold hover:bg-red-700 z-10"
      >
        &times;
      </button>
    </div>
  );
}