
'use client';

import React from 'react';
import { Archetype, ARCHETYPE_BIG_FIVE_CORRELATIONS } from '@/utils/archetypal-matching';
import { ApartmentArchetypeAnalysis } from '@/utils/archetype-mapper';

interface ArchetypeAnalysisProps {
    analysis: ApartmentArchetypeAnalysis;
}

export default function ArchetypeAnalysis({ analysis }: ArchetypeAnalysisProps) {
    const { primaryArchetype, gardenAlignment, symbolicTags, archetypalDescription } = analysis;
    const archetypeData = ARCHETYPE_BIG_FIVE_CORRELATIONS[primaryArchetype];

    // Helper for progress bar color based on alignment
    const getProgressColor = (score: number) => {
        if (score > 80) return 'bg-green-500';
        if (score > 60) return 'bg-blue-500';
        return 'bg-purple-500';
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-purple-100 overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-100 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 z-0"></div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="text-3xl">✨</div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Soul of the Apartment
                    </h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Left Column: Archetype Info */}
                    <div>
                        <div className="mb-4">
                            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Primary Archetype</span>
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
                                <span className="font-semibold text-gray-700">Garden of Eden Alignment</span>
                                <span className="text-2xl font-bold text-green-600">{gardenAlignment}%</span>
                            </div>
                            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${getProgressColor(gardenAlignment)}`}
                                    style={{ width: `${gardenAlignment}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-right">
                                Resonance with universal harmony & natural abundance
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <div className="text-sm text-gray-500 mb-1">Big Five Openness</div>
                                <div className="font-bold text-blue-700 text-lg">
                                    {(archetypeData.primaryTraits as any).openness || 50}/100
                                </div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                                <div className="text-sm text-gray-500 mb-1">Energy Type</div>
                                <div className="font-bold text-orange-700 text-lg capitalize">
                                    {archetypeData.positive.split(',')[0]}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
