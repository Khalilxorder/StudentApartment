'use client';

export default function SubmitButton({ isEditing, pending }: { isEditing?: boolean; pending?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {pending ? 'Saving...' : (isEditing ? 'Save Changes' : 'Save Apartment')}
    </button>
  );
}