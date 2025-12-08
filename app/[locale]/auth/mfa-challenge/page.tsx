'use client';

import MFAChallenge from '@/components/auth/MFAChallenge';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function MFAChallengePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get('next') || '/dashboard';

    const handleSuccess = () => {
        router.push(next);
        router.refresh();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                        Security Verification
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Please complete the security check to continue.
                    </p>
                </div>

                <MFAChallenge onSuccess={handleSuccess} />
            </div>
        </div>
    );
}
