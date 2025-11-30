/**
 * Email Helper Functions (PM-56)
 *
 * Functions for preparing order data for transactional emails.
 * Fetches customer/address data from Stripe when needed.
 */

import { prisma } from '@/lib/prisma';
import { getOrderAddresses, type OrderAddresses } from '@/lib/stripe-addresses';
import { formatCurrency } from '@/lib/currency';

export interface OrderEmailData {
  // Order info
  orderId: string;
  orderNumber: string; // Short display ID
  orderDate: Date;

  // Product info
  productName: string;
  productImageUrl: string | null;
  sellerName: string | null;

  // Customer info (from Stripe)
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;

  // Addresses (from Stripe)
  shippingAddress: string[] | null;
  billingAddress: string[] | null;

  // Amounts
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;

  // Formatted amounts for display
  formattedSubtotal: string;
  formattedTax: string | null;
  formattedShipping: string | null;
  formattedTotal: string;

  // Status
  status: string;
  isPaid: boolean;
}

/**
 * Format a Stripe address as display lines
 */
function formatAddressLines(
  address: OrderAddresses['shipping'] | OrderAddresses['billing'],
): string[] | null {
  if (!address) return null;

  const lines: string[] = [];
  if (address.line1) lines.push(address.line1);
  if (address.line2) lines.push(address.line2);

  const cityStateZip = [address.city, address.state, address.postal_code]
    .filter(Boolean)
    .join(', ');
  if (cityStateZip) lines.push(cityStateZip);
  if (address.country) lines.push(address.country);

  return lines.length > 0 ? lines : null;
}

/**
 * Get complete order data formatted for email templates
 */
export async function getOrderDataForEmail(orderId: string): Promise<OrderEmailData | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: true,
    },
  });

  if (!order) {
    console.error('[EmailHelpers] Order not found:', orderId);
    return null;
  }

  // Fetch addresses from Stripe
  const addresses = await getOrderAddresses(orderId);

  // Get amounts
  const subtotalCents = order.subtotalCents;
  const taxCents = order.taxCents;
  const shippingCents = order.shippingCents;
  const totalCents = order.totalCents;

  return {
    // Order info
    orderId: order.id,
    orderNumber: order.id.slice(-8).toUpperCase(),
    orderDate: order.createdAt,

    // Product info
    productName: order.snapshotListingDisplayTitle || order.description || 'Order',
    productImageUrl: order.snapshotListingImageUrl,
    sellerName: order.sellerName,

    // Customer info
    customerName: addresses?.customerName ?? null,
    customerEmail: addresses?.customerEmail ?? null,
    customerPhone: addresses?.customerPhone ?? null,

    // Addresses
    shippingAddress: formatAddressLines(addresses?.shipping ?? null),
    billingAddress: formatAddressLines(addresses?.billing ?? null),

    // Amounts
    subtotalCents,
    taxCents,
    shippingCents,
    totalCents,

    // Formatted amounts
    formattedSubtotal: formatCurrency(subtotalCents, order.currency),
    formattedTax: taxCents > 0 ? formatCurrency(taxCents, order.currency) : null,
    formattedShipping: shippingCents > 0 ? formatCurrency(shippingCents, order.currency) : null,
    formattedTotal: formatCurrency(totalCents, order.currency),

    // Status
    status: order.status,
    isPaid: order.status === 'PAID',
  };
}

/**
 * Get minimal order data for a simple notification email
 */
export async function getOrderNotificationData(orderId: string): Promise<{
  orderNumber: string;
  productName: string;
  total: string;
  customerEmail: string | null;
} | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      description: true,
      snapshotListingDisplayTitle: true,
      totalCents: true,
      currency: true,
      stripeCustomerId: true,
    },
  });

  if (!order) return null;

  const addresses = await getOrderAddresses(orderId);
  const total = order.totalCents;

  return {
    orderNumber: order.id.slice(-8).toUpperCase(),
    productName: order.snapshotListingDisplayTitle || order.description || 'Order',
    total: formatCurrency(total, order.currency),
    customerEmail: addresses?.customerEmail ?? null,
  };
}

/**
 * Placeholder for sending order confirmation email
 * Implementation will depend on email service (e.g., Resend, SendGrid)
 */
export async function sendOrderConfirmationEmail(
  orderId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailData = await getOrderDataForEmail(orderId);

    if (!emailData) {
      return { success: false, error: 'Order not found' };
    }

    if (!emailData.customerEmail) {
      return { success: false, error: 'Customer email not found' };
    }

    // TODO: Implement actual email sending when email service is configured
    // Example with Resend:
    // await resend.emails.send({
    //   from: 'Pokemon Marketplace <orders@pokemonmarketplace.com>',
    //   to: emailData.customerEmail,
    //   subject: `Order Confirmation #${emailData.orderNumber}`,
    //   react: OrderConfirmationEmail({ ...emailData }),
    // });

    console.log('[EmailHelpers] Order confirmation email would be sent to:', {
      to: emailData.customerEmail,
      orderNumber: emailData.orderNumber,
      total: emailData.formattedTotal,
    });

    return { success: true };
  } catch (error) {
    console.error('[EmailHelpers] Error sending order confirmation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Placeholder for sending shipping notification email
 */
export async function sendShippingNotificationEmail(
  orderId: string,
  trackingNumber?: string,
  carrier?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const emailData = await getOrderDataForEmail(orderId);

    if (!emailData) {
      return { success: false, error: 'Order not found' };
    }

    if (!emailData.customerEmail) {
      return { success: false, error: 'Customer email not found' };
    }

    // TODO: Implement actual email sending when email service is configured
    console.log('[EmailHelpers] Shipping notification would be sent to:', {
      to: emailData.customerEmail,
      orderNumber: emailData.orderNumber,
      trackingNumber,
      carrier,
    });

    return { success: true };
  } catch (error) {
    console.error('[EmailHelpers] Error sending shipping notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
