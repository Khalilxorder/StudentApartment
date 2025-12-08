'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabaseClient';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';

export default function MFASetup({ onComplete }: { onComplete?: () => void }) {
    const [step, setStep] = useState<'init' | 'scan' | 'verify' | 'success'>('init');
    const [secret, setSecret] = useState<string>('');
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [verificationCode, setVerificationCode] = useState<string>('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    const initializeMFA = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Generate Secret (Server-side call)
            const res = await fetch('/api/auth/mfa/generate', { method: 'POST' });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to generate MFA secret');

            setSecret(data.secret);

            // 2. Generate QR Code
            const otpAuthUrl = `otpauth://totp/StudentApartments:${data.userEmail}?secret=${data.secret}&issuer=StudentApartments`;
            const url = await QRCode.toDataURL(otpAuthUrl);
            setQrCodeUrl(url);

            setStep('scan');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const verifyAndEnable = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/auth/mfa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret, token: verificationCode })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Invalid code');

            setBackupCodes(data.backupCodes);
            setStep('success');
            if (onComplete) onComplete();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Secure your account with 2FA.</CardDescription>
            </CardHeader>
            <CardContent>
                {step === 'init' && (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-sm text-gray-500 text-center">
                            Add an extra layer of security to your account by enabling two-factor authentication.
                        </p>
                        <Button onClick={initializeMFA} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Setup 2FA
                        </Button>
                    </div>
                )}

                {step === 'scan' && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="border p-2 rounded-lg bg-white">
                            {qrCodeUrl && <Image src={qrCodeUrl} alt="MFA QR Code" width={200} height={200} />}
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-sm font-medium">Scan this QR code</p>
                            <p className="text-xs text-gray-500">
                                Use an authenticator app like Google Authenticator or Authy.
                            </p>
                            <p className="text-xs text-mono bg-gray-100 p-2 rounded break-all">
                                Secret: {secret}
                            </p>
                        </div>
                        <div className="w-full space-y-2">
                            <Input
                                placeholder="Enter 6-digit code"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                maxLength={6}
                                className="text-center tracking-widest text-lg"
                            />
                            <Button className="w-full" onClick={verifyAndEnable} disabled={loading || verificationCode.length !== 6}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Verify & Enable
                            </Button>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="text-green-500 mb-2">
                            <CheckCircle className="h-12 w-12" />
                        </div>
                        <h3 className="font-semibold text-lg">2FA Enabled!</h3>
                        <div className="w-full bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                            <p className="text-sm font-medium text-yellow-800 mb-2">Save these backup codes!</p>
                            <p className="text-xs text-yellow-700 mb-2">
                                If you lose your device, these are the only way to recover your account.
                            </p>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {backupCodes.map((code, i) => (
                                    <code key={i} className="bg-white px-2 py-1 rounded border text-xs">{code}</code>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 mt-4 text-red-600 bg-red-50 p-3 rounded-md text-sm">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
