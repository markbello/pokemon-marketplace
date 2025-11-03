'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: readonly string[];
}

export function ProgressIndicator({
  currentStep,
  totalSteps,
  stepLabels,
}: ProgressIndicatorProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        {stepLabels.map((label, index) => (
          <div
            key={index}
            className={cn(
              'flex flex-col items-center space-y-2 flex-1',
              index < stepLabels.length - 1 && 'mr-4',
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                index < currentStep
                  ? 'border-primary bg-primary text-primary-foreground'
                  : index === currentStep
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted bg-background text-muted-foreground',
              )}
            >
              {index < currentStep ? '✓' : index + 1}
            </div>
            <span
              className={cn(
                'text-xs text-center max-w-[100px]',
                index <= currentStep ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}

