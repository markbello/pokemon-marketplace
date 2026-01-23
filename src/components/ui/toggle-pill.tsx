'use client';

import { cn } from '@/lib/utils';

interface TogglePillProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Pill-style toggle component for switching between two options
 * Used on landing page (Browse/Marketplace) and collection page (My Collection/Friends Collection)
 */
export function TogglePill<T extends string>({
  options,
  value,
  onChange,
  className,
}: TogglePillProps<T>) {
  const activeIndex = options.indexOf(value);

  return (
    <div
      className={cn(
        'relative inline-grid grid-cols-2 rounded-full border border-muted/60 bg-muted/40 p-1',
        className,
      )}
    >
      <div
        className={cn(
          'absolute inset-y-1 w-[calc(50%-2px)] rounded-full bg-foreground shadow-sm transition-all duration-300',
          activeIndex === 0 ? 'left-1' : 'left-[calc(50%+1px)]',
        )}
      />
      {options.map((option, index) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'relative z-10 whitespace-nowrap rounded-full px-5 py-2 text-center text-sm font-medium transition',
            activeIndex === index ? 'text-background' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
