'use client';

import Image from 'next/image';
import Link from 'next/link';

type Apartment = {
  id: string;
  image_urls?: string[];
  price_huf?: number;
  title?: string;
};

export default function OwnerCard({ apartment }: { apartment: Apartment }) {
  return (
    <div className="border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white">
      <Link href={`/apartments/${apartment.id}`} className="block w-full h-48 relative">
        <Image
          src={apartment.image_urls?.[0] || '/placeholder.jpg'}
          alt="Apartment preview"
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          quality={85}
          priority={false}
        />
      </Link>
      <div className="p-4">
  <p className="text-lg font-bold text-brown-800">{(apartment.price_huf ?? 0).toLocaleString()} HUF/month</p>
        <p className="text-sm text-gray-600 truncate">{apartment.title || 'Untitled apartment'}</p>
      </div>
    </div>
  );
}
