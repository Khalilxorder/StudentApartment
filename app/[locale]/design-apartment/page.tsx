'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabaseClient';
import {
  ArchetypeProfile,
  Archetype,
  ARCHETYPE_BIG_FIVE_CORRELATIONS,
  APARTMENT_ARCHETYPES
} from '@/utils/archetypal-matching';

interface DesignRequirement {
  category: string;
  description: string;
  priority: 'essential' | 'important' | 'nice-to-have';
  archetypalReasoning: string;
}

interface GeneratedDesign {
  title: string;
  description: string;
  keyFeatures: string[];
  archetypalAlignment: string;
  estimatedBudget: string;
  aiEnhancements: string[];
  gardenOfEdenAlignment: number; // 0-100% alignment with universal ideal
}

export default function DesignApartmentPage() {
  const [userProfile, setUserProfile] = useState<ArchetypeProfile | null>(null);
  const [designPrompt, setDesignPrompt] = useState('');
  const [generatedDesign, setGeneratedDesign] = useState<GeneratedDesign | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [designRequirements, setDesignRequirements] = useState<DesignRequirement[]>([]);

  const loadUserProfile = useCallback(async () => {
    // For now, create a default profile - in production this would come from user assessment
    const defaultProfile: ArchetypeProfile = {
      primaryArchetype: Archetype.MAGICIAN,
      bigFiveScores: {
        openness: 85,
        conscientiousness: 75,
        extraversion: 70,
        agreeableness: 80,
        neuroticism: 35
      },
      symbolicResonances: ['freedom', 'creativity', 'transcendence', 'mystery'],
      spiritualConnections: []
    };

    setUserProfile(defaultProfile);
    generateInitialRequirements(defaultProfile);
  }, []);

  useEffect(() => {
    // Load or create user archetype profile
    loadUserProfile();
  }, [loadUserProfile]);

  const generateInitialRequirements = (profile: ArchetypeProfile) => {
    const archetype = ARCHETYPE_BIG_FIVE_CORRELATIONS[profile.primaryArchetype];
    const requirements: DesignRequirement[] = [
      {
        category: 'Space & Layout',
        description: 'Private, enclosed spaces with high ceilings for contemplation',
        priority: 'essential',
        archetypalReasoning: `${archetype.description} requires sacred, protected spaces for transformation work`
      },
      {
        category: 'Lighting & Energy',
        description: 'Natural light with controlled illumination for focused work',
        priority: 'essential',
        archetypalReasoning: 'Magician archetype needs clarity for seeing patterns and truths'
      },
      {
        category: 'Materials & Aesthetics',
        description: 'Natural materials with symbolic elements and artistic expression',
        priority: 'important',
        archetypalReasoning: 'Creative transformation requires materials that inspire alchemy'
      },
      {
        category: 'Technology Integration',
        description: 'Seamless AI assistance for productivity and insight generation',
        priority: 'important',
        archetypalReasoning: 'Modern magician uses technology as tools for wisdom and creation'
      },
      {
        category: 'Environmental Harmony',
        description: 'Balance between controlled environment and natural elements',
        priority: 'nice-to-have',
        archetypalReasoning: 'Garden of Eden ideal: perfect harmony between order and natural abundance'
      }
    ];

    setDesignRequirements(requirements);
  };

  const generateDesign = async () => {
    if (!userProfile || !designPrompt.trim()) return;

    setIsGenerating(true);

    try {
      // Simulate AI design generation - in production this would call an AI service
      const design: GeneratedDesign = {
        title: `${userProfile.primaryArchetype.charAt(0).toUpperCase() + userProfile.primaryArchetype.slice(1)}'s Sanctuary`,
        description: `A thoughtfully designed space that resonates with your ${userProfile.primaryArchetype} archetype, incorporating Jungian principles of psychological transformation and Peterson's emphasis on meaningful structure.`,
        keyFeatures: [
          'High, arched ceilings symbolizing transcendence and aspiration',
          'Private alcoves for deep contemplation and creative work',
          'Natural materials with embedded AI sensory systems',
          'Symbolic artwork representing your archetypal journey',
          'Adaptive lighting that responds to your creative flow',
          'Integrated technology that enhances rather than distracts'
        ],
        archetypalAlignment: `${ARCHETYPE_BIG_FIVE_CORRELATIONS[userProfile.primaryArchetype].description}`,
        estimatedBudget: '850,000 - 1,200,000 HUF/month',
        aiEnhancements: [
          'Mood-adaptive lighting system that enhances focus and creativity',
          'AI assistant that suggests optimal times for deep work vs. collaboration',
          'Smart materials that respond to your presence and needs',
          'Integrated wellness monitoring for psychological balance',
          'Personalized environmental controls for optimal archetypal resonance'
        ],
        gardenOfEdenAlignment: 87
      };

      setGeneratedDesign(design);
    } catch (error) {
      console.error('Error generating design:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-orange-600 hover:text-orange-700 mb-4 inline-block">
            ← Back to Search
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🏗️ Design Your Archetypal Apartment
          </h1>
          <p className="text-xl text-gray-600">
            AI-powered apartment design based on your psychological profile and archetypal preferences
          </p>
        </div>

        {/* User Profile Display */}
        {userProfile && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Your Archetypal Profile</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-purple-700 mb-2">
                  Primary Archetype: {userProfile.primaryArchetype.toUpperCase()}
                </h3>
                <p className="text-gray-600 mb-4">
                  {ARCHETYPE_BIG_FIVE_CORRELATIONS[userProfile.primaryArchetype].description}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Openness:</span>
                    <span className="font-semibold">{userProfile.bigFiveScores.openness}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conscientiousness:</span>
                    <span className="font-semibold">{userProfile.bigFiveScores.conscientiousness}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extraversion:</span>
                    <span className="font-semibold">{userProfile.bigFiveScores.extraversion}/100</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-700 mb-2">Symbolic Resonances</h3>
                <div className="flex flex-wrap gap-2">
                  {userProfile.symbolicResonances.map((symbol, index) => (
                    <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                      {symbol}
                    </span>
                  ))}
                </div>
                <div className="mt-4">
                  <h4 className="font-semibold text-blue-700">Garden of Eden Alignment</h4>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '76%' }}></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">76% aligned with universal harmony</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Design Requirements */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Archetypal Design Requirements</h2>
          <div className="space-y-4">
            {designRequirements.map((req, index) => (
              <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-purple-700">{req.category}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    req.priority === 'essential' ? 'bg-red-100 text-red-800' :
                    req.priority === 'important' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {req.priority.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-700 mb-2">{req.description}</p>
                <p className="text-sm text-purple-600 italic">{req.archetypalReasoning}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Design Prompt Input */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Describe Your Dream Space</h2>
          <textarea
            value={designPrompt}
            onChange={(e) => setDesignPrompt(e.target.value)}
            placeholder="Describe the apartment of your dreams... What makes you feel truly at home? What symbolic elements resonate with your soul? How do you want to feel when you walk through the door?"
            className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
          <button
            onClick={generateDesign}
            disabled={isGenerating || !designPrompt.trim()}
            className="mt-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition"
          >
            {isGenerating ? '🎨 Generating Design...' : '✨ Generate AI Design'}
          </button>
        </div>

        {/* Generated Design */}
        {generatedDesign && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-center">{generatedDesign.title}</h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-purple-700">Design Concept</h3>
                <p className="text-gray-700 mb-4">{generatedDesign.description}</p>

                <h4 className="font-semibold mb-2">Archetypal Alignment:</h4>
                <p className="text-purple-600 mb-4">{generatedDesign.archetypalAlignment}</p>

                <h4 className="font-semibold mb-2">Estimated Budget:</h4>
                <p className="text-green-600 font-semibold">{generatedDesign.estimatedBudget}</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-700">Key Features</h3>
                <ul className="space-y-2">
                  {generatedDesign.keyFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4 text-orange-700">AI Technology Integration</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {generatedDesign.aiEnhancements.map((enhancement, index) => (
                  <div key={index} className="bg-orange-50 p-4 rounded-lg">
                    <span className="text-orange-600">🤖 {enhancement}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 text-center">
              <div className="bg-green-50 p-4 rounded-lg inline-block">
                <h4 className="font-semibold text-green-700 mb-2">Garden of Eden Alignment</h4>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {generatedDesign.gardenOfEdenAlignment}%
                </div>
                <p className="text-green-700">
                  This design embodies universal harmony and natural abundance
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition mr-4">
                💾 Save Design
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition">
                🔍 Find Similar Apartments
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}