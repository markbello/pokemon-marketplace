'use client';

import { useMemo } from 'react';

interface FormattedDateProps {
  date: Date | string;
  purchaseTimezone?: string | null;
}

/**
 * Client-side date formatter that shows both purchase timezone and current viewing timezone
 */
export function FormattedDate({ date, purchaseTimezone }: FormattedDateProps) {
  const formatted = useMemo(() => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Format in current viewing timezone
    const formattedInCurrent = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(dateObj);
    
    // If purchase timezone exists and is different from current, show both
    if (purchaseTimezone && purchaseTimezone !== currentTimezone) {
      const formattedInPurchase = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone: purchaseTimezone,
      }).format(dateObj);
      
      return `${formattedInCurrent} (purchased at ${formattedInPurchase})`;
    }
    
    return formattedInCurrent;
  }, [date, purchaseTimezone]);

  return <span>{formatted}</span>;
}

