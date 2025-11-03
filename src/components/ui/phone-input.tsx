'use client';

import * as React from 'react';
import PhoneInputWithCountry, { type Country, type Value } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  defaultCountry?: Country;
}

export function PhoneInput({
  value,
  onChange,
  onBlur,
  disabled,
  className,
  placeholder = '(555) 123-4567',
  defaultCountry = 'US',
  ...props
}: PhoneInputProps) {
  return (
    <div className={cn('relative', className)}>
      <PhoneInputWithCountry
        defaultCountry={defaultCountry}
        country={defaultCountry}
        value={value as Value | undefined}
        onChange={(val) => onChange?.(val || undefined)}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        // Don't use international prop - this makes it use national format with dashes
        // The country code will be automatically inferred from the selected country
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        )}
        numberInputProps={{
          className: cn(
            'flex h-full w-full rounded-md border-0 bg-transparent px-0 py-0 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          ),
          onBlur,
        }}
        countrySelectProps={{
          className: cn(
            'flex h-full items-center rounded-md border-0 bg-transparent px-2 text-sm ring-offset-background focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          ),
        }}
        {...props}
      />
    </div>
  );
}

