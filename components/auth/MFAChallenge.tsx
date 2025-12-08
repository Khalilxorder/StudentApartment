'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function MFAChallenge({ onSuccess }: { onSuccess: () => void }) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/auth/mfa/challenge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: code })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Invalid code');

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-sm mx-auto shadow-lg">
            <CardHeader className="text-center">
                <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-2">
                    <ShieldCheck className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Authentication Required</CardTitle>
                <CardDescription>Enter the code from your authenticator app</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="000 000"
                            maxLength={6}
                            className="text-center text-2xl tracking-widest h-12"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-md text-sm">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verify
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
