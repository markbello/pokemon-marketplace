import { Suspense } from 'react';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Loader2 } from 'lucide-react';

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OnboardingWizard />
    </Suspense>
  );
}

