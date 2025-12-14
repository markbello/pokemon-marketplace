'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles } from 'lucide-react';
import { z } from 'zod';

const invitationCodeSchema = z.object({
  code: z.string().min(1, 'Please enter an invitation code').trim().toUpperCase(),
});

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useUser();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  // If user is already authenticated, redirect to onboarding or home
  if (user) {
    router.push('/onboarding');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidating(true);

    try {
      // Validate input
      const { code: validatedCode } = invitationCodeSchema.parse({ code });

      // Validate the invitation code
      const response = await fetch('/api/invitation-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: validatedCode }),
      });

      const data = await response.json();

      if (!data.valid) {
        setError(data.error || 'Invalid invitation code');
        setValidating(false);
        return;
      }

      // Store the validated code in sessionStorage for later redemption
      sessionStorage.setItem('invitation_code', validatedCode);

      // Redirect to Auth0 signup with screen_hint=signup
      const returnTo = searchParams.get('returnTo') || '/onboarding';
      const loginUrl = new URL('/api/auth/login', window.location.origin);
      loginUrl.searchParams.set('returnTo', returnTo);
      loginUrl.searchParams.set('screen_hint', 'signup');

      window.location.assign(loginUrl.toString());
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message || 'Invalid invitation code');
      } else {
        setError('Failed to validate invitation code. Please try again.');
      }
      setValidating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="bg-primary/10 mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full">
            <Sparkles className="text-primary h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Welcome to Kado.io</CardTitle>
          <CardDescription>Enter your invitation code to create an account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Invitation Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="CHARIZARD-A1B2"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={validating}
                className="font-mono text-lg uppercase"
                autoComplete="off"
                autoFocus
              />
              <p className="text-muted-foreground text-xs">
                Enter the Pokemon-themed code you received
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={validating || !code.trim()}>
              {validating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                'Continue to Sign Up'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link href="/api/auth/login" className="text-primary hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
