'use client';

import { useState } from 'react';

interface VerificationStatusProps {
  userId: string;
  userType: 'student' | 'owner';
  verificationLevel?: 'none' | 'basic' | 'verified' | 'premium';
  className?: string;
}

export default function VerificationStatus({
  userId,
  userType,
  verificationLevel = 'none',
  className = ''
}: VerificationStatusProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getVerificationInfo = () => {
    switch (verificationLevel) {
      case 'premium':
        return {
          icon: '💎',
          label: 'Premium Verified',
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          description: 'Full verification with enhanced trust score'
        };
      case 'verified':
        return {
          icon: '✅',
          label: 'Verified',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          description: 'Identity and information verified'
        };
      case 'basic':
        return {
          icon: '🔵',
          label: 'Basic Verification',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          description: 'Email and phone verified'
        };
      default:
        return {
          icon: '⚪',
          label: 'Not Verified',
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          description: 'Complete verification to build trust'
        };
    }
  };

  const verification = getVerificationInfo();

  const getVerificationSteps = () => {
    if (userType === 'student') {
      return [
        { step: 'Email Verification', completed: verificationLevel !== 'none', required: true },
        { step: 'Phone Verification', completed: verificationLevel === 'basic' || verificationLevel === 'verified' || verificationLevel === 'premium', required: true },
        { step: 'University ID', completed: verificationLevel === 'verified' || verificationLevel === 'premium', required: false },
        { step: 'Background Check', completed: verificationLevel === 'premium', required: false }
      ];
    } else {
      return [
        { step: 'Email Verification', completed: verificationLevel !== 'none', required: true },
        { step: 'Phone Verification', completed: verificationLevel === 'basic' || verificationLevel === 'verified' || verificationLevel === 'premium', required: true },
        { step: 'Property Documents', completed: verificationLevel === 'verified' || verificationLevel === 'premium', required: true },
        { step: 'Business License', completed: verificationLevel === 'premium', required: false }
      ];
    }
  };

  const steps = getVerificationSteps();
  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <div
        className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors ${verification.bgColor} ${verification.color} hover:opacity-80`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>{verification.icon}</span>
        <span>{verification.label}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Verification Status</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{completedSteps}/{totalSteps} steps</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      step.completed
                        ? 'bg-green-100 text-green-600'
                        : step.required
                        ? 'bg-red-100 text-red-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {step.completed ? '✓' : step.required ? '!' : '○'}
                    </div>
                    <span className={`text-sm ${step.completed ? 'text-gray-900' : 'text-gray-600'}`}>
                      {step.step}
                      {step.required && !step.completed && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </span>
                  </div>
                  {step.completed && (
                    <span className="text-green-600 text-sm">✓</span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Trust Score:</strong> Higher verification levels increase your trustworthiness and visibility to other users.
              </p>
            </div>

            {verificationLevel === 'none' && (
              <div className="mt-4">
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                  Start Verification Process
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}