
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ARCHETYPE_BIG_FIVE_CORRELATIONS } from '@/utils/archetypal-matching';
import { ApartmentArchetypeAnalysis } from '@/utils/archetype-mapper';

interface ArchetypeAnalysisProps {
    analysis: ApartmentArchetypeAnalysis;
}

// Type guard to safely access openness from primaryTraits
function getOpennessScore(traits: Record<string, number>): number {
    return typeof traits.openness === 'number' ? traits.openness : 50;
}

// Safely get first item from comma-separated string
function getFirstItem(str: string | undefined): string {
    if (!str) return 'Balanced';
    const parts = str.split(',');
    return parts[0]?.trim() || 'Balanced';
}

export default function ArchetypeAnalysis({ analysis }: ArchetypeAnalysisProps) {
    const t = useTranslations('Archetype');
    const { primaryArchetype, gardenAlignment, symbolicTags, archetypalDescription } = analysis;
    const archetypeData = ARCHETYPE_BIG_FIVE_CORRELATIONS[primaryArchetype];

    // Helper for progress bar color based on alignment
    const getProgressColor = (score: number) => {
        if (score > 80) return 'bg-green-500';
        if (score > 60) return 'bg-blue-500';
        return 'bg-purple-500';
    };

    const opennessScore = getOpennessScore(archetypeData.primaryTraits);
    const energyType = getFirstItem(archetypeData.positive);

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-purple-100 overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-100 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 z-0"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="text-3xl">✨</div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        {t('soul_of_apartment')}
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Left Column: Archetype Info */}
                    <div>
                        <div className="mb-4">
                            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{t('primary_archetype')}</span>
                            <h3 className="text-3xl font-bold text-gray-800 capitalize mt-1">
                                {primaryArchetype.replace('_', ' ')}
                            </h3>
                        </div>

                        <p className="text-gray-600 italic mb-6 leading-relaxed border-l-4 border-purple-300 pl-4 py-1">
                            {archetypalDescription}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {symbolicTags.map((tag, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium border border-purple-100 shadow-sm"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Stats & Garden Alignment */}
                    <div className="flex flex-col justify-center space-y-6">
                        <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                            <div className="flex justify-between items-end mb-2">
                                <span className="font-semibold text-gray-700">{t('garden_alignment')}</span>
                                <span className="text-2xl font-bold text-green-600">{gardenAlignment}%</span>
                            </div>
                            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(gardenAlignment)}`}
                                    style={{ width: `${gardenAlignment}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-right">
                                {t('resonance_description')}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <div className="text-sm text-gray-500 mb-1">{t('big_five_openness')}</div>
                                <div className="font-bold text-blue-700 text-lg">
                                    {opennessScore}/100
                                </div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                                <div className="text-sm text-gray-500 mb-1">{t('energy_type')}</div>
                                <div className="font-bold text-orange-700 text-lg capitalize">
                                    {energyType}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
