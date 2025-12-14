/**
 * PM-65: Signup page that requires invitation code
 */

import { Suspense } from 'react';
import { SignupForm } from '@/components/auth/SignupForm';
import { Loader2 } from 'lucide-react';

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignupForm />
    </Suspense>
  );
}
