'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SaveApartmentButton } from '@/components/SaveApartmentButton';
import SearchOriginBadge, { determineSearchOrigin, getScoreForDisplay } from './SearchOriginBadge';
import ExplainWhy, { RecommendationReason } from './ExplainWhy';
import { FeatureIcon } from '@/utils/feature-icons';

import ApartmentImageCarousel from './ApartmentImageCarousel';

interface ApartmentListingCardProps {
    apt: any;
    userWishedFeatures?: FeatureIcon[];
    favoriteIds?: string[];
    onToggleFavorite: (id: string) => void;
    onWhyThisClick?: (apt: any, context: any) => void;
}

export default function ApartmentListingCard({
    apt,
    userWishedFeatures = [],
    favoriteIds = [],
    onToggleFavorite,
    onWhyThisClick
}: ApartmentListingCardProps) {
    const t = useTranslations('Listing');

    // Feature extraction logic remains same
    const apartmentFeatures: string[] = Array.isArray(apt.featureTags) ? apt.featureTags : [];

    // Re-run feature extraction if missing (fallback logic from ChatSearch)
    if (apartmentFeatures.length === 0) {
        if (apt.pet_friendly) apartmentFeatures.push('amen_pet_friendly');
        if (apt.parking_available) apartmentFeatures.push('loc_parking_street');
        if (apt.internet_included) apartmentFeatures.push('amen_internet');
        if (apt.laundry_in_unit) apartmentFeatures.push('amen_washing_machine');
        if (apt.elevator) apartmentFeatures.push('amen_elevator');

        if (Array.isArray(apt.amenities)) {
            apt.amenities.forEach((amenity: any) => {
                const amenityLower = (typeof amenity === 'string' ? amenity : amenity.label || '').toLowerCase();
                if (amenityLower.includes('balcony')) apartmentFeatures.push('amen_balcony');
                if (amenityLower.includes('terrace')) apartmentFeatures.push('amen_terrace');
                if (amenityLower.includes('garden')) apartmentFeatures.push('amen_garden');
                if (amenityLower.includes('furnished')) apartmentFeatures.push('amen_furnished');
                if (amenityLower.includes('air conditioning') || amenityLower.includes('ac')) apartmentFeatures.push('amen_ac');
                if (amenityLower.includes('heating')) apartmentFeatures.push('amen_heating');
                if (amenityLower.includes('dishwasher')) apartmentFeatures.push('amen_dishwasher');
                if (amenityLower.includes('gym')) apartmentFeatures.push('loc_gym');
                if (amenityLower.includes('pool')) apartmentFeatures.push('amen_pool');
            });
        }
        if (apt.distance_to_metro_m && apt.distance_to_metro_m < 1000) apartmentFeatures.push('loc_metro');
        if (apt.distance_to_university_m && apt.distance_to_university_m < 2000) apartmentFeatures.push('loc_university');
    }

    const matchedFeatures = userWishedFeatures.filter(f => apartmentFeatures.includes(f.id));
    const userScoreRaw = apt.aiScore ?? apt.featureMatchScore ?? 0;
    const userScore = Math.max(0, Math.min(100, Math.round(userScoreRaw)));
    const scoreColor = userScore >= 80 ? 'bg-green-500' : userScore >= 60 ? 'bg-yellow-500' : 'bg-orange-500';
    const origin = determineSearchOrigin(apt);
    const badgeScore = getScoreForDisplay(apt) ?? userScore;

    // Explain reasons
    const explainReasons = apt.aiReasons || [];
    const compromiseList = Array.isArray(apt.aiCompromises) ? apt.aiCompromises.filter(Boolean).slice(0, 2) : [];

    // Commute
    const commuteMinutes = typeof apt.distance_to_university_m === 'number'
        ? Math.round(apt.distance_to_university_m / 80)
        : null;

    // Price
    const priceValue = typeof apt.price_huf === 'number'
        ? apt.price_huf
        : typeof apt.price_huf === 'string' && !Number.isNaN(Number(apt.price_huf))
            ? Number(apt.price_huf)
            : typeof apt.price === 'number'
                ? apt.price
                : typeof apt.price === 'string' && !Number.isNaN(Number(apt.price))
                    ? Number(apt.price)
                    : null;
    const priceLabel = priceValue ? `${priceValue.toLocaleString()} HUF` : 'Price on request';

    // Labels
    const districtLabel = apt.district ? `${t('district')} ${apt.district}` : `${t('district')} -`;
    const bedroomLabel = typeof apt.bedrooms === 'number'
        ? `${apt.bedrooms} ${t('beds')}`
        : `Beds -`;
    const bathroomLabel = typeof apt.bathrooms === 'number'
        ? `${apt.bathrooms} ${t('baths')}`
        : `Baths -`;

    return (
        <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-200">
            <div className="relative">
                <a href={`/apartments/${apt.id}`} className="block">
                    <ApartmentImageCarousel
                        images={apt.image_urls || []}
                        alt={apt.title || 'Apartment'}
                    />
                </a>

                {userScore > 0 && (
                    <div className={`absolute top-3 right-3 ${scoreColor} text-white px-3 py-1.5 rounded-full font-bold text-sm shadow-lg pointer-events-none z-10`}>
                        {userScore}% {t('match')}
                    </div>
                )}

                <div className="absolute top-3 left-3 z-30" onClick={(e) => e.stopPropagation()}>
                    <SaveApartmentButton
                        apartmentId={apt.id}
                        initialSaved={favoriteIds.includes(apt.id)}
                        onSaved={() => onToggleFavorite(apt.id)}
                    />
                </div>
            </div>

            <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <a
                        href={`/apartments/${apt.id}`}
                        className="font-bold text-gray-900 text-lg hover:text-orange-600 transition-colors line-clamp-1"
                    >
                        {apt.title || apt.address || 'Apartment'}
                    </a>
                    <span className="text-orange-600 font-bold text-lg whitespace-nowrap ml-2">
                        {priceLabel}
                    </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                    <SearchOriginBadge
                        origin={origin}
                        score={badgeScore}
                        onClick={onWhyThisClick ? () => onWhyThisClick(apt, { matchedFeatures, matchScore: userScore, aiReasons: explainReasons }) : undefined}
                        className="mt-1"
                    />
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>{districtLabel}</span>
                    <span>• {bedroomLabel}</span>
                    <span>• {bathroomLabel}</span>
                    {apt.size_sqm && <span>• {apt.size_sqm} {t('sqm')}</span>}
                </div>

                {commuteMinutes !== null && (
                    <div className="text-xs text-gray-500">≈ {commuteMinutes} min to campus</div>
                )}

                {matchedFeatures.length > 0 && (
                    <div>
                        <div className="text-xs font-semibold text-gray-700 mb-1">Preferences matched</div>
                        <div className="flex flex-wrap gap-1.5">
                            {matchedFeatures.slice(0, 4).map(f => (
                                <span key={f.id} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                                    {f.icon} {f.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {explainReasons.length > 0 && (
                    <ExplainWhy
                        reasons={explainReasons}
                        title="AI says this fits because"
                        className="bg-transparent border-0 shadow-none p-0"
                    />
                )}

                <div className="flex gap-2 pt-2">
                    {onWhyThisClick && (
                        <button
                            onClick={() => onWhyThisClick(apt, { matchedFeatures, matchScore: userScore, aiReasons: explainReasons })}
                            className="flex-1 text-sm px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg transition min-h-[44px]"
                        >
                            {t('why_this')}
                        </button>
                    )}

                    <a
                        href={`/apartments/${apt.id}`}
                        className="flex-1 text-sm px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition text-center min-h-[44px] flex items-center justify-center"
                    >
                        {t('view')}
                    </a>
                </div>
            </div>
        </div>
    );
}
