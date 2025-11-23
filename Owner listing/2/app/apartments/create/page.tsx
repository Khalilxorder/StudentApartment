// FILE: app/apartments/create/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddApartmentForm({ searchParams }: { searchParams?: { error?: string } }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/apartments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, address, price_huf: Number(price), description }),
      });
      const json = await res.json();
      if (json.error) {
        alert('Failed to create apartment: ' + json.error);
      } else {
        router.push('/apartments');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create apartment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">List a New Apartment</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} type="text" id="title" name="title" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} type="text" id="address" name="address" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
        </div>

        <div>
          <label htmlFor="price_huf" className="block text-sm font-medium text-gray-700">Price (HUF)</label>
          <input value={price} onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')} type="number" id="price_huf" name="price_huf" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} id="description" name="description" rows={4} className="mt-1 block w-full p-2 border border-gray-300 rounded-md"></textarea>
        </div>

        {/* This will display any error message sent back from the server action */}
        {searchParams?.error && (
          <p className="text-red-600 bg-red-100 p-3 rounded-md">{searchParams.error}</p>
        )}

        <button type="submit" disabled={loading} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">{loading ? 'Saving...' : 'Save Apartment'}</button>
      </form>
    </div>
  );
}