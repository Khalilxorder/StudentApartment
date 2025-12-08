'use client';

import { X } from 'lucide-react';

interface BattleCardProps {
    apartment: any;
    onRemove?: () => void;
    className?: string;
}

export function BattleCard({ apartment, onRemove, className = '' }: BattleCardProps) {
    if (!apartment) return null;

    return (
        <div className={`bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 flex flex-col h-full ${className}`}>
            <div className="relative h-48 sm:h-56 bg-gray-200">
                {apartment.image_urls && apartment.image_urls[0] ? (
                    <img
                        src={apartment.image_urls[0]}
                        alt={apartment.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-4xl">?</span>
                    </div>
                )}
                {onRemove && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
                        aria-label="Remove from battle"
                    >
                        <X size={16} />
                    </button>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <p className="text-white font-bold text-lg truncate shadow-black drop-shadow-md">
                        {apartment.price_huf?.toLocaleString()} Ft
                    </p>
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 mb-1 line-clamp-2 leading-tight">
                    {apartment.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    District {apartment.district} • {apartment.size_sqm} m²
                </p>

                <div className="grid grid-cols-2 gap-2 mt-auto text-sm">
                    <div className="bg-orange-50 px-3 py-2 rounded-lg text-center">
                        <span className="block text-xs text-orange-600 font-medium uppercase tracking-wider">Bedrooms</span>
                        <span className="font-bold text-gray-800">{apartment.bedrooms}</span>
                    </div>
                    <div className="bg-blue-50 px-3 py-2 rounded-lg text-center">
                        <span className="block text-xs text-blue-600 font-medium uppercase tracking-wider">Bathrooms</span>
                        <span className="font-bold text-gray-800">{apartment.bathrooms}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
