'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';

interface OnboardingData {
  userType?: 'student' | 'owner';
  // Student fields
  university?: string;
  studyProgram?: string;
  graduationYear?: number;
  budget?: { min: number; max: number };
  moveInDate?: string;
  // Owner fields
  propertyType?: string;
  propertyCount?: number;
  experience?: string;
  // Common fields
  firstName: string;
  lastName: string;
  phone?: string;
  bio?: string;
  preferences?: {
    notifications: boolean;
    marketing: boolean;
    dataSharing: boolean;
  };
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<OnboardingStepProps>;
}

interface OnboardingStepProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    firstName: '',
    lastName: '',
    preferences: {
      notifications: true,
      marketing: false,
      dataSharing: false,
    },
  });

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Student Apartments!',
      description: 'Let\'s get you set up',
      component: WelcomeStep,
    },
    {
      id: 'user-type',
      title: 'Are you a student or property owner?',
      description: 'This helps us personalize your experience',
      component: UserTypeStep,
    },
    {
      id: 'personal-info',
      title: 'Tell us about yourself',
      description: 'Basic information to get started',
      component: PersonalInfoStep,
    },
    {
      id: 'student-details',
      title: 'Student Information',
      description: 'Help us find the perfect apartment for you',
      component: StudentDetailsStep,
    },
    {
      id: 'owner-details',
      title: 'Property Owner Information',
      description: 'Tell us about your properties',
      component: OwnerDetailsStep,
    },
    {
      id: 'preferences',
      title: 'Your Preferences',
      description: 'Customize your experience',
      component: PreferencesStep,
    },
    {
      id: 'verification',
      title: 'Verify Your Account',
      description: 'Complete verification to unlock all features',
      component: VerificationStep,
    },
  ];

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate required fields
      if (!data.firstName || !data.lastName) {
        throw new Error('Please enter your first and last name');
      }
      if (!data.userType) {
        throw new Error('Please select a user type (student or owner)');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user session found. Please log in again.');

      // Prepare the profile update (without bio to avoid schema cache issues)
      const profileUpdate = {
        id: user.id,
        email: user.email,
        full_name: `${data.firstName} ${data.lastName}`.trim(),
        phone: data.phone || null,
        // Note: bio field omitted due to schema cache issues - storing in preferences instead
        role: data.userType, // 'student' or 'owner'
        preferences: {
          ...(data.preferences || {}),
          bio: data.bio || null, // Store bio in preferences
          onboarding_completed: true,
          notifications: data.preferences?.notifications ?? true,
          marketing: data.preferences?.marketing ?? false,
          data_sharing: data.preferences?.dataSharing ?? true,
        },
      };

      // Add role-specific data
      if (data.userType === 'student') {
        (profileUpdate.preferences as any).student_data = {
          university: data.university,
          study_program: data.studyProgram,
          graduation_year: data.graduationYear,
          budget_min: data.budget?.min,
          budget_max: data.budget?.max,
          move_in_date: data.moveInDate,
        };
      } else if (data.userType === 'owner') {
        (profileUpdate.preferences as any).owner_data = {
          property_type: data.propertyType,
          property_count: data.propertyCount,
          experience_level: data.experience,
        };
      }

      // Save to database with retry logic for schema cache issues
      let retryCount = 0;
      let lastError = null;
      
      while (retryCount < 2) {
        const { error } = await supabase
          .from('profiles')
          .upsert(profileUpdate);

        if (error) {
          lastError = error;
          console.error(`Supabase error (attempt ${retryCount + 1}):`, error);
          
          // If it's a schema cache error, wait and retry
          if (error.message && error.message.includes('schema cache')) {
            retryCount++;
            if (retryCount < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
              continue;
            }
          } else {
            // Other errors should fail immediately
            throw new Error(`Failed to save profile: ${error.message}`);
          }
        } else {
          // Success!
          break;
        }
      }

      if (lastError && retryCount >= 2) {
        throw new Error(`Failed to save profile after retries: ${lastError.message}`);
      }

      // Success! Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete onboarding';
      console.error('Onboarding error:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const CurrentStepComponent = steps[currentStep].component;
  const isLastStep = currentStep === steps.length - 1;

  // Skip irrelevant steps based on user type
  useEffect(() => {
    if (data.userType === 'student' && currentStep === 4) {
      // Skip owner details for students
      setCurrentStep(5);
    } else if (data.userType === 'owner' && currentStep === 3) {
      // Skip student details for owners
      setCurrentStep(4);
    }
  }, [data.userType, currentStep]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${
                  index <= currentStep ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index < currentStep
                      ? 'bg-indigo-600 text-white'
                      : index === currentStep
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index < currentStep ? '✓' : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {steps[currentStep].title}
          </h1>
          <p className="text-gray-600">{steps[currentStep].description}</p>
        </div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto">
          {currentStep === 6 ? (
            <VerificationStep
              data={data}
              onUpdate={updateData}
              onNext={completeOnboarding}
              onBack={prevStep}
              isLoading={isLoading}
              error={error}
            />
          ) : (
            <CurrentStepComponent
              data={data}
              onUpdate={updateData}
              onNext={isLastStep ? completeOnboarding : nextStep}
              onBack={prevStep}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components
function WelcomeStep({ onNext }: OnboardingStepProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="mb-6">
        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Student Apartments Budapest!</h2>
        <p className="text-gray-600 mb-6">
          We're excited to help you find the perfect student accommodation in Budapest.
          Whether you're a student looking for a place to stay or a property owner wanting to rent out your space,
          we've got you covered.
        </p>
      </div>
      <button
        onClick={onNext}
        className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
      >
        Get Started
      </button>
    </div>
  );
}

function UserTypeStep({ data, onUpdate, onNext }: OnboardingStepProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="grid md:grid-cols-2 gap-6">
        <button
          onClick={() => {
            onUpdate({ userType: 'student' });
            onNext();
          }}
          className={`p-6 border-2 rounded-lg text-left hover:border-indigo-300 transition-colors ${
            data.userType === 'student' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">I'm a Student</h3>
              <p className="text-gray-600">Looking for accommodation near my university</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            onUpdate({ userType: 'owner' });
            onNext();
          }}
          className={`p-6 border-2 rounded-lg text-left hover:border-indigo-300 transition-colors ${
            data.userType === 'owner' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">I'm a Property Owner</h3>
              <p className="text-gray-600">Want to rent out my property to students</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function PersonalInfoStep({ data, onUpdate, onNext, onBack }: OnboardingStepProps) {
  const [formData, setFormData] = useState({
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    phone: data.phone || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    onNext();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number (optional)
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="+36 30 123 4567"
          />
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
}

function StudentDetailsStep({ data, onUpdate, onNext, onBack }: OnboardingStepProps) {
  const [formData, setFormData] = useState({
    university: data.university || '',
    studyProgram: data.studyProgram || '',
    graduationYear: data.graduationYear || new Date().getFullYear() + 4,
    budgetMin: data.budget?.min || 80000,
    budgetMax: data.budget?.max || 150000,
    moveInDate: data.moveInDate || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      university: formData.university,
      studyProgram: formData.studyProgram,
      graduationYear: formData.graduationYear,
      budget: { min: formData.budgetMin, max: formData.budgetMax },
      moveInDate: formData.moveInDate,
    });
    onNext();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            University *
          </label>
          <select
            required
            value={formData.university}
            onChange={(e) => setFormData(prev => ({ ...prev, university: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select your university</option>
            <option value="elte">Eötvös Loránd University (ELTE)</option>
            <option value="bme">Budapest University of Technology (BME)</option>
            <option value="corvinus">Corvinus University</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Study Program
          </label>
          <input
            type="text"
            value={formData.studyProgram}
            onChange={(e) => setFormData(prev => ({ ...prev, studyProgram: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g., Computer Science, Business Administration"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expected Graduation Year
          </label>
          <select
            value={formData.graduationYear}
            onChange={(e) => setFormData(prev => ({ ...prev, graduationYear: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Array.from({ length: 8 }, (_, i) => {
              const year = new Date().getFullYear() + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monthly Budget (HUF)
          </label>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <input
                type="number"
                placeholder="Min"
                value={formData.budgetMin}
                onChange={(e) => setFormData(prev => ({ ...prev, budgetMin: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Max"
                value={formData.budgetMax}
                onChange={(e) => setFormData(prev => ({ ...prev, budgetMax: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Move-in Date
          </label>
          <input
            type="date"
            value={formData.moveInDate}
            onChange={(e) => setFormData(prev => ({ ...prev, moveInDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
}

function OwnerDetailsStep({ data, onUpdate, onNext, onBack }: OnboardingStepProps) {
  const [formData, setFormData] = useState({
    propertyType: data.propertyType || '',
    propertyCount: data.propertyCount || 1,
    experience: data.experience || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    onNext();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Property Type *
          </label>
          <select
            required
            value={formData.propertyType}
            onChange={(e) => setFormData(prev => ({ ...prev, propertyType: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select property type</option>
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="room">Room for rent</option>
            <option value="studio">Studio</option>
            <option value="dormitory">Student dormitory</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Properties
          </label>
          <select
            value={formData.propertyCount}
            onChange={(e) => setFormData(prev => ({ ...prev, propertyCount: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
            <option value="10+">10+</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Experience Level
          </label>
          <select
            value={formData.experience}
            onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select experience level</option>
            <option value="new">New to renting</option>
            <option value="some">Some experience</option>
            <option value="experienced">Experienced landlord</option>
            <option value="professional">Property management professional</option>
          </select>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
}

function PreferencesStep({ data, onUpdate, onNext, onBack }: OnboardingStepProps) {
  const [preferences, setPreferences] = useState(data.preferences || {
    notifications: true,
    marketing: false,
    dataSharing: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ preferences });
    onNext();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Communication Preferences</h3>

          <div className="space-y-4">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="notifications"
                checked={preferences.notifications}
                onChange={(e) => setPreferences(prev => ({ ...prev, notifications: e.target.checked }))}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <label htmlFor="notifications" className="text-sm font-medium text-gray-700">
                  Email notifications
                </label>
                <p className="text-sm text-gray-500">
                  Receive updates about new apartments, messages, and important account changes
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="marketing"
                checked={preferences.marketing}
                onChange={(e) => setPreferences(prev => ({ ...prev, marketing: e.target.checked }))}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <label htmlFor="marketing" className="text-sm font-medium text-gray-700">
                  Marketing communications
                </label>
                <p className="text-sm text-gray-500">
                  Receive tips, market insights, and promotional offers
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="dataSharing"
                checked={preferences.dataSharing}
                onChange={(e) => setPreferences(prev => ({ ...prev, dataSharing: e.target.checked }))}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <label htmlFor="dataSharing" className="text-sm font-medium text-gray-700">
                  Data sharing for better matches
                </label>
                <p className="text-sm text-gray-500">
                  Allow anonymous data sharing to improve apartment recommendations
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
}

interface VerificationStepProps extends OnboardingStepProps {
  isLoading?: boolean;
  error?: string | null;
}

function VerificationStep({ data, onNext, isLoading, error }: VerificationStepProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="mb-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Almost Done!</h2>
        <p className="text-gray-600 mb-6">
          To unlock all features and ensure a safe community, we need to verify your account.
          This helps protect both students and property owners.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Email verification (if not already completed)</li>
            <li>• Identity verification for {data.userType === 'student' ? 'students' : 'property owners'}</li>
            <li>• Property verification for owners</li>
            <li>• Background checks (optional but recommended)</li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800 font-medium">❌ Error: {error}</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={onNext as () => void}
          disabled={isLoading}
          className={`w-full bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium transition-colors ${
            isLoading 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-indigo-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Setting up your account...
            </span>
          ) : (
            'Complete Setup'
          )}
        </button>
        <p className="text-sm text-gray-500">
          You can start using basic features immediately and complete verification later.
        </p>
      </div>
    </div>
  );
}