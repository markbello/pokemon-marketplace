/**
 * Currency helper functions
 * All amounts stored in cents to match Stripe's format
 */

/**
 * Convert cents to display string (e.g., 100 -> "1.00")
 */
export function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Convert dollars to cents (e.g., 1.00 -> 100)
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Format cents as currency string (e.g., 100 -> "$1.00")
 */
export function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(cents / 100);
}

