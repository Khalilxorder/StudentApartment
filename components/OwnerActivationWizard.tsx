'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronRight, User, Phone, CreditCard, Home, Shield } from 'lucide-react';
import Link from 'next/link';

interface WizardStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    isComplete: boolean;
    href?: string;
}

interface OwnerActivationWizardProps {
    userId: string;
    completenessScore?: number;
    hasStripeAccount?: boolean;
    hasPublishedListing?: boolean;
    hasVerifiedIdentity?: boolean;
    hasContactInfo?: boolean;
    compact?: boolean;
}

/**
 * Multi-step Owner Activation Wizard
 * Guides owners through: Identity → Contact → Payout → Publish
 */
export function OwnerActivationWizard({
    userId,
    completenessScore = 0,
    hasStripeAccount = false,
    hasPublishedListing = false,
    hasVerifiedIdentity = false,
    hasContactInfo = false,
    compact = false,
}: OwnerActivationWizardProps) {
    const steps: WizardStep[] = [
        {
            id: 'identity',
            title: 'Verify Profile',
            description: 'Complete your owner profile',
            icon: <User className="h-5 w-5" />,
            isComplete: hasVerifiedIdentity || completenessScore >= 50,
            href: '/owner/profile',
        },
        {
            id: 'contact',
            title: 'Add Contact',
            description: 'Add phone and contact info',
            icon: <Phone className="h-5 w-5" />,
            isComplete: hasContactInfo || completenessScore >= 75,
            href: '/owner/profile',
        },
        {
            id: 'payout',
            title: 'Payout Setup',
            description: 'Connect Stripe for payments',
            icon: <CreditCard className="h-5 w-5" />,
            isComplete: hasStripeAccount,
            href: '/owner/profile#payout',
        },
        {
            id: 'publish',
            title: 'Publish Listing',
            description: 'Create your first listing',
            icon: <Home className="h-5 w-5" />,
            isComplete: hasPublishedListing,
            href: '/owner/listings/create',
        },
    ];

    const completedSteps = steps.filter(s => s.isComplete).length;
    const progressPercent = Math.round((completedSteps / steps.length) * 100);
    const currentStep = steps.find(s => !s.isComplete) || steps[steps.length - 1];
    const isFullyActivated = completedSteps === steps.length;

    if (compact) {
        return (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-yellow-600" />
                        <span className="font-semibold text-gray-900">Owner Activation</span>
                    </div>
                    <span className="text-sm font-bold text-yellow-600">{progressPercent}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-yellow-200 rounded-full h-2 mb-3">
                    <div
                        className="bg-yellow-500 h-2 rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>

                {/* Mini step indicators */}
                <div className="flex gap-1 mb-3">
                    {steps.map((step, idx) => (
                        <div
                            key={step.id}
                            className={`flex-1 h-1 rounded-full ${step.isComplete ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                        />
                    ))}
                </div>

                {!isFullyActivated && (
                    <Link
                        href={currentStep.href || '/owner/profile'}
                        className="block text-center py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition"
                    >
                        Continue: {currentStep.title}
                    </Link>
                )}

                {isFullyActivated && (
                    <div className="text-center text-green-600 font-medium flex items-center justify-center gap-2">
                        <Check className="h-5 w-5" />
                        Profile Fully Activated!
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Owner Activation</h2>
                        <p className="text-gray-800 text-sm mt-1">
                            Complete these steps to start earning
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-gray-900">{progressPercent}%</div>
                        <div className="text-sm text-gray-800">Complete</div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 w-full bg-white/30 rounded-full h-3">
                    <div
                        className="bg-white h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Steps */}
            <div className="divide-y divide-gray-100">
                {steps.map((step, idx) => {
                    const isActive = step.id === currentStep.id && !step.isComplete;

                    return (
                        <Link
                            key={step.id}
                            href={step.href || '#'}
                            className={`flex items-center gap-4 p-4 transition-colors ${step.isComplete
                                ? 'bg-green-50 hover:bg-green-100'
                                : isActive
                                    ? 'bg-yellow-50 hover:bg-yellow-100'
                                    : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                        >
                            {/* Step number/icon */}
                            <div
                                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${step.isComplete
                                    ? 'bg-green-500 text-white'
                                    : isActive
                                        ? 'bg-yellow-500 text-white'
                                        : 'bg-gray-300 text-gray-600'
                                    }`}
                            >
                                {step.isComplete ? (
                                    <Check className="h-5 w-5" />
                                ) : (
                                    step.icon
                                )}
                            </div>

                            {/* Step content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`font-semibold ${step.isComplete
                                            ? 'text-green-800'
                                            : isActive
                                                ? 'text-yellow-800'
                                                : 'text-gray-600'
                                            }`}
                                    >
                                        {step.title}
                                    </span>
                                    {step.isComplete && (
                                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                                            Done
                                        </span>
                                    )}
                                    {isActive && (
                                        <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded-full">
                                            Next
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 truncate">{step.description}</p>
                            </div>

                            {/* Arrow */}
                            <ChevronRight className={`h-5 w-5 flex-shrink-0 ${step.isComplete ? 'text-green-400' : 'text-gray-400'
                                }`} />
                        </Link>
                    );
                })}
            </div>

            {/* CTA */}
            {!isFullyActivated && (
                <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <Link
                        href={currentStep.href || '/owner/profile'}
                        className="block w-full text-center py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition"
                    >
                        Continue Setup: {currentStep.title} →
                    </Link>
                </div>
            )}

            {isFullyActivated && (
                <div className="p-4 bg-green-50 border-t border-green-100 text-center">
                    <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
                        <Check className="h-5 w-5" />
                        You&apos;re all set! Your profile is fully activated.
                    </div>
                    <Link
                        href="/owner/listings"
                        className="inline-block mt-2 text-sm text-green-600 hover:text-green-800 underline"
                    >
                        Manage your listings →
                    </Link>
                </div>
            )}
        </div>
    );
}

/**
 * Owner Badge component for chat header
 */
export function OwnerBadge({ isVerified = false }: { isVerified?: boolean }) {
    if (!isVerified) return null;

    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
            <Shield className="h-3 w-3" />
            Verified Owner
        </span>
    );
}
