/**
 * Stripe Address Utilities (PM-56)
 *
 * Functions for fetching customer and address data from Stripe.
 * Stripe is the source of truth for PII (addresses, names, etc.)
 * to maintain privacy-by-design architecture.
 */

import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export interface StripeAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

export interface OrderAddresses {
  shipping: StripeAddress | null;
  billing: StripeAddress | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
}

/**
 * Fetch addresses for an order from Stripe
 * Tries checkout session first (most accurate for specific order), then falls back to customer
 */
export async function getOrderAddresses(orderId: string): Promise<OrderAddresses | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      stripeCustomerId: true,
      stripeSessionId: true,
    },
  });

  if (!order) {
    console.error('[StripeAddresses] Order not found:', orderId);
    return null;
  }

  let addresses: OrderAddresses = {
    shipping: null,
    billing: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
  };

  // Try session first (most recent/accurate for this specific order)
  if (order.stripeSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);

      // shipping_details is available on completed sessions but TypeScript types may not include it
      // Cast to access the property that exists at runtime
      const sessionWithShipping = session as Stripe.Checkout.Session & {
        shipping_details?: {
          address?: Stripe.Address;
          name?: string;
        } | null;
      };
      const shippingDetails = sessionWithShipping.shipping_details;

      if (shippingDetails?.address) {
        addresses.shipping = {
          line1: shippingDetails.address.line1 ?? null,
          line2: shippingDetails.address.line2 ?? null,
          city: shippingDetails.address.city ?? null,
          state: shippingDetails.address.state ?? null,
          postal_code: shippingDetails.address.postal_code ?? null,
          country: shippingDetails.address.country ?? null,
        };
        addresses.customerName = shippingDetails.name || null;
      }

      if (session.customer_details) {
        addresses.customerEmail = session.customer_details.email;
        addresses.customerPhone = session.customer_details.phone;

        if (session.customer_details.address) {
          addresses.billing = {
            line1: session.customer_details.address.line1 ?? null,
            line2: session.customer_details.address.line2 ?? null,
            city: session.customer_details.address.city ?? null,
            state: session.customer_details.address.state ?? null,
            postal_code: session.customer_details.address.postal_code ?? null,
            country: session.customer_details.address.country ?? null,
          };
        }

        if (!addresses.customerName && session.customer_details.name) {
          addresses.customerName = session.customer_details.name;
        }
      }
    } catch (err) {
      console.error('[StripeAddresses] Error fetching checkout session:', err);
      // Fall through to customer lookup
    }
  }

  // Fallback to customer if session doesn't have addresses
  if (!addresses.shipping && order.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(order.stripeCustomerId);

      if (customer.deleted) {
        console.warn('[StripeAddresses] Customer has been deleted:', order.stripeCustomerId);
        return addresses;
      }

      if (customer.shipping?.address) {
        addresses.shipping = {
          line1: customer.shipping.address.line1,
          line2: customer.shipping.address.line2,
          city: customer.shipping.address.city,
          state: customer.shipping.address.state,
          postal_code: customer.shipping.address.postal_code,
          country: customer.shipping.address.country,
        };
        addresses.customerName = customer.shipping.name || customer.name || null;
      }

      if (customer.address) {
        addresses.billing = {
          line1: customer.address.line1,
          line2: customer.address.line2,
          city: customer.address.city,
          state: customer.address.state,
          postal_code: customer.address.postal_code,
          country: customer.address.country,
        };
      }

      if (!addresses.customerName) {
        addresses.customerName = customer.name ?? null;
      }
      if (!addresses.customerEmail) {
        addresses.customerEmail = customer.email ?? null;
      }
      if (!addresses.customerPhone) {
        addresses.customerPhone = customer.phone ?? null;
      }
    } catch (err) {
      console.error('[StripeAddresses] Error fetching customer:', err);
    }
  }

  return addresses;
}

/**
 * Get customer info from Stripe for an order
 */
export async function getCustomerForOrder(orderId: string): Promise<{
  name: string | null;
  email: string | null;
  phone: string | null;
} | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { stripeCustomerId: true },
  });

  if (!order?.stripeCustomerId) return null;

  try {
    const customer = await stripe.customers.retrieve(order.stripeCustomerId);

    if (customer.deleted) {
      return null;
    }

    return {
      name: customer.name ?? null,
      email: customer.email ?? null,
      phone: customer.phone ?? null,
    };
  } catch (err) {
    console.error('[StripeAddresses] Error fetching customer:', err);
    return null;
  }
}

/**
 * Format a Stripe address for display
 */
export function formatAddress(address: StripeAddress | null): string[] {
  if (!address) return [];

  const lines: string[] = [];

  if (address.line1) lines.push(address.line1);
  if (address.line2) lines.push(address.line2);

  const cityStateZip = [address.city, address.state, address.postal_code]
    .filter(Boolean)
    .join(', ');

  if (cityStateZip) lines.push(cityStateZip);
  if (address.country) lines.push(address.country);

  return lines;
}

/**
 * Get tax breakdown from a completed checkout session
 */
export async function getSessionTaxInfo(sessionId: string): Promise<{
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
} | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['total_details.breakdown'],
    });

    const subtotal = session.amount_subtotal || 0;
    const total = session.amount_total || 0;
    const shipping = session.total_details?.amount_shipping || 0;
    const tax = session.total_details?.amount_tax || 0;

    return {
      subtotalCents: subtotal,
      taxCents: tax,
      shippingCents: shipping,
      totalCents: total,
    };
  } catch (err) {
    console.error('[StripeAddresses] Error fetching session tax info:', err);
    return null;
  }
}
