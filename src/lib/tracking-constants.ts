/**
 * Tracking Service Constants
 * These are safe to import in both client and server components
 */

/**
 * Supported shipping carriers
 */
export const SUPPORTED_CARRIERS = [
  { value: 'usps', label: 'USPS' },
  { value: 'ups', label: 'UPS' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'dhl_express', label: 'DHL Express' },
] as const;

/**
 * Test scenarios for development/staging environment
 * Note: Only use Shippo's documented test tracking numbers
 */
export const TEST_SCENARIOS = [
  { value: 'test-delivered', label: '📦 Test: Delivered Package' },
  { value: 'test-in-transit', label: '🚚 Test: In Transit' },
  { value: 'test-returned', label: '↩️ Test: Package Returned' },
] as const;

/**
 * Shippo test tracking numbers for development
 * These are the only valid test tracking numbers supported by Shippo
 * See: https://goshippo.com/docs/tracking
 */
export const TEST_TRACKING_NUMBERS = {
  'test-delivered': 'SHIPPO_DELIVERED',
  'test-in-transit': 'SHIPPO_TRANSIT',
  'test-returned': 'SHIPPO_RETURNED',
} as const;

export type TestScenario = keyof typeof TEST_TRACKING_NUMBERS;
