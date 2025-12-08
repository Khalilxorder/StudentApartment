'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronRight, Home, Camera, DollarSign, FileText, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface OwnerOnboardingWizardProps {
  currentStep?: number;
  onStepChange?: (step: number) => void;
  onComplete?: (data?: any) => void;
}

export default function OwnerOnboardingWizard({
  currentStep = 0,
  onStepChange,
  onComplete,
}: OwnerOnboardingWizardProps) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(currentStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const steps: WizardStep[] = [
    {
      id: 'basics',
      title: 'Property Details',
      description: 'Add title, address, and basic information',
      icon: <Home className="h-5 w-5" />,
      completed: completedSteps.has(0),
    },
    {
      id: 'photos',
      title: 'Photos & Media',
      description: 'Upload photos and virtual tour',
      icon: <Camera className="h-5 w-5" />,
      completed: completedSteps.has(1),
    },
    {
      id: 'pricing',
      title: 'Pricing & Terms',
      description: 'Set rent, deposit, and lease terms',
      icon: <DollarSign className="h-5 w-5" />,
      completed: completedSteps.has(2),
    },
    {
      id: 'description',
      title: 'Description',
      description: 'Write compelling listing description',
      icon: <FileText className="h-5 w-5" />,
      completed: completedSteps.has(3),
    },
    {
      id: 'verification',
      title: 'Verification',
      description: 'Verify ownership and publish',
      icon: <Shield className="h-5 w-5" />,
      completed: completedSteps.has(4),
    },
  ];

  const progressPercentage = Math.round((completedSteps.size / steps.length) * 100);

  const handleStepClick = (index: number) => {
    // Allow clicking on completed steps or next step
    if (completedSteps.has(index) || index === activeStep || index === activeStep + 1) {
      setActiveStep(index);
      onStepChange?.(index);
    }
  };

  const handleStepComplete = () => {
    setCompletedSteps(prev => new Set([...prev, activeStep]));
    
    if (activeStep < steps.length - 1) {
      const nextStep = activeStep + 1;
      setActiveStep(nextStep);
      onStepChange?.(nextStep);
    } else {
      onComplete?.();
    }
  };

  const handleSkip = () => {
    if (activeStep < steps.length - 1) {
      const nextStep = activeStep + 1;
      setActiveStep(nextStep);
      onStepChange?.(nextStep);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Create Your Listing</h2>
          <span className="text-sm font-medium text-gray-500">
            {progressPercentage}% complete
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {steps.map((step, index) => {
            const isActive = index === activeStep;
            const isCompleted = completedSteps.has(index);
            const isClickable = isCompleted || index === activeStep || index === activeStep + 1;

            return (
              <div
                key={step.id}
                className={`
                  relative flex items-start gap-4 p-4 rounded-xl transition-all
                  ${isActive ? 'bg-orange-50 border-2 border-orange-200' : 'bg-white'}
                  ${isClickable ? 'cursor-pointer hover:bg-gray-50' : 'opacity-60'}
                `}
                onClick={() => handleStepClick(index)}
              >
                {/* Step Indicator */}
                <div
                  className={`
                    relative z-10 flex items-center justify-center w-10 h-10 rounded-full
                    transition-all duration-300
                    ${isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                        : 'bg-gray-100 text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                      {step.title}
                    </h3>
                    {isActive && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                        Current
                      </span>
                    )}
                    {isCompleted && !isActive && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Done
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{step.description}</p>

                  {/* Active Step Actions */}
                  {isActive && (
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStepComplete();
                        }}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        {index === steps.length - 1 ? 'Publish Listing' : 'Continue'}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      {index < steps.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSkip();
                          }}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                        >
                          Skip for now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <h4 className="font-medium text-blue-900 mb-2">Need help?</h4>
        <p className="text-sm text-blue-700">
          Our team is here to assist you with your listing. Contact support at{' '}
          <a href="mailto:support@studentapartments.com" className="underline">
            support@studentapartments.com
          </a>
        </p>
      </div>
    </div>
  );
}
