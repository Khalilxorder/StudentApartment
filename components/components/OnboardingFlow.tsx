'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle, Home, Search, Heart, User, MessageSquare } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string; // CSS selector for highlighting
  position: 'top' | 'bottom' | 'left' | 'right';
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Student Apartments Budapest!',
    description: 'Let us show you around our AI-powered apartment search platform. This quick tour will help you find your perfect student home.',
    icon: <Home className="w-6 h-6" />,
    position: 'bottom'
  },
  {
    id: 'search',
    title: 'Smart Apartment Search',
    description: 'Use our AI-powered chat search to find apartments that match your preferences. Just describe what you\'re looking for!',
    icon: <Search className="w-6 h-6" />,
    target: '[data-onboarding="chat-search"]',
    position: 'top'
  },
  {
    id: 'filters',
    title: 'Advanced Filters',
    description: 'Refine your search with detailed filters for price, location, size, and amenities. Our AI understands your needs.',
    icon: <Search className="w-6 h-6" />,
    target: '[data-onboarding="filters"]',
    position: 'bottom'
  },
  {
    id: 'favorites',
    title: 'Save & Compare',
    description: 'Save apartments you like and compare them side-by-side to make the best decision.',
    icon: <Heart className="w-6 h-6" />,
    target: '[data-onboarding="favorites"]',
    position: 'top'
  },
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Complete your profile to get personalized recommendations and manage your saved searches.',
    icon: <User className="w-6 h-6" />,
    target: '[data-onboarding="profile"]',
    position: 'bottom'
  },
  {
    id: 'messages',
    title: 'Contact Owners',
    description: 'Message apartment owners directly to ask questions and schedule viewings.',
    icon: <MessageSquare className="w-6 h-6" />,
    target: '[data-onboarding="messages"]',
    position: 'top'
  }
];

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function OnboardingFlow({ isOpen, onClose, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Highlight current target element
      const step = onboardingSteps[currentStep];
      if (step.target) {
        const element = document.querySelector(step.target);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentStep]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCompletedSteps(prev => new Set([...Array.from(prev), currentStep]));
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setCompletedSteps(new Set(Array.from({ length: onboardingSteps.length }, (_, i) => i)));
    onComplete();
    onClose();
  };

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  if (!isOpen) return null;

  const step = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
              {step.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{step.title}</h3>
              <p className="text-sm text-gray-500">Step {currentStep + 1} of {onboardingSteps.length}</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-700 leading-relaxed">{step.description}</p>
        </div>

        {/* Step Indicators */}
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index < currentStep
                    ? 'bg-green-500'
                    : index === currentStep
                    ? 'bg-orange-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={handleSkip}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium"
          >
            Skip Tour
          </button>

          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600"
            >
              {currentStep === onboardingSteps.length - 1 ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Complete
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to manage onboarding state
export function useOnboarding() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem('onboarding_completed');
    if (!completed) {
      // Show onboarding for new users after a short delay
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setHasCompletedOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
  };

  const restartOnboarding = () => {
    localStorage.removeItem('onboarding_completed');
    setHasCompletedOnboarding(false);
    setShowOnboarding(true);
  };

  return {
    hasCompletedOnboarding,
    showOnboarding,
    setShowOnboarding,
    completeOnboarding,
    restartOnboarding
  };
}