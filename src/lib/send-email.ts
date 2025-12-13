import { Resend } from 'resend';

import OrderConfirmationEmail from '../emails/OrderConfirmation';
import SellerOrderNotificationEmail from '../emails/SellerOrderNotification';
import { logAuditEvent } from '@/lib/audit';
import { getOrderDataForEmail } from '@/lib/email-helpers';
import { getBaseUrl } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import { getOrCreateUser, getPreferredEmail } from '@/lib/user';

export const EMAIL_ADDRESSES = {
  orders: 'orders@mail.kado.io',
  shipping: 'shipping@mail.kado.io',
  support: 'support@mail.kado.io',
  noreply: 'noreply@mail.kado.io',
} as const;

type SendEmailOptions = {
  ipAddress?: string;
  userAgent?: string;
};

type SendResult = {
  success: boolean;
  error?: string;
  id?: string;
};

const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

async function logEmailAudit(params: {
  orderId: string;
  action: 'EMAIL_SENT' | 'EMAIL_FAILED';
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
}) {
  try {
    await logAuditEvent({
      entityType: 'Order',
      entityId: params.orderId,
      action: params.action,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
    });
  } catch (err) {
    console.error('[Email] Failed to log audit event', err);
  }
}

export async function sendOrderConfirmationEmail(
  orderId: string,
  options: SendEmailOptions = {},
): Promise<SendResult> {
  const { ipAddress, userAgent } = options;

  if (!resendClient) {
    const error = 'Resend API key not configured';
    await logEmailAudit({
      orderId,
      action: 'EMAIL_FAILED',
      ipAddress,
      userAgent,
      metadata: {
        emailType: 'ORDER_CONFIRMATION',
        reason: 'missing_resend_api_key',
      },
    });
    return { success: false, error };
  }

  try {
    const emailData = await getOrderDataForEmail(orderId);

    if (!emailData) {
      const error = 'Order not found';
      await logEmailAudit({
        orderId,
        action: 'EMAIL_FAILED',
        ipAddress,
        userAgent,
        metadata: {
          emailType: 'ORDER_CONFIRMATION',
          reason: 'order_not_found',
        },
      });
      return { success: false, error };
    }

    if (!emailData.customerEmail) {
      const error = 'Customer email not available';
      await logEmailAudit({
        orderId,
        action: 'EMAIL_FAILED',
        ipAddress,
        userAgent,
        metadata: {
          emailType: 'ORDER_CONFIRMATION',
          reason: 'missing_customer_email',
        },
      });
      return { success: false, error };
    }

    const baseUrl = await getBaseUrl();
    const orderUrl = `${baseUrl}/orders/${orderId}`;
    const logoUrl = `${baseUrl}/kado-logo.jpg`;
    const fallbackImage = `${baseUrl}/kado-placeholder.jpg`;

    const { data, error } = await resendClient.emails.send({
      from: `Kado.io <${EMAIL_ADDRESSES.orders}>`,
      to: [emailData.customerEmail],
      replyTo: EMAIL_ADDRESSES.support,
      subject: `Order Confirmation - #${emailData.orderNumber}`,
      react: OrderConfirmationEmail({
        customerName: emailData.customerName ?? 'there',
        orderNumber: emailData.orderNumber,
        orderDate: emailData.orderDate,
        items: [
          {
            name: emailData.productName,
            image: emailData.productImageUrl || fallbackImage,
            condition: 'See order details for condition',
            price: emailData.formattedSubtotal,
            quantity: 1,
          },
        ],
        subtotal: emailData.formattedSubtotal,
        tax: emailData.formattedTax,
        shipping: emailData.formattedShipping,
        total: emailData.formattedTotal,
        shippingAddress: emailData.shippingAddress,
        billingAddress: emailData.billingAddress,
        ctaUrl: orderUrl,
        supportEmail: EMAIL_ADDRESSES.support,
        logoUrl,
      }),
    });

    if (error) {
      const message = error instanceof Error ? error.message : 'Failed to send email';
      await logEmailAudit({
        orderId,
        action: 'EMAIL_FAILED',
        ipAddress,
        userAgent,
        metadata: {
          emailType: 'ORDER_CONFIRMATION',
          reason: 'resend_error',
          message,
        },
      });
      return { success: false, error: message };
    }

    await logEmailAudit({
      orderId,
      action: 'EMAIL_SENT',
      ipAddress,
      userAgent,
      metadata: {
        emailType: 'ORDER_CONFIRMATION',
        resendId: data?.id,
        to: emailData.customerEmail,
      },
    });

    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logEmailAudit({
      orderId,
      action: 'EMAIL_FAILED',
      ipAddress,
      userAgent,
      metadata: {
        emailType: 'ORDER_CONFIRMATION',
        reason: 'unexpected_error',
        message,
      },
    });
    console.error('[Email] Error sending order confirmation', err);
    return { success: false, error: message };
  }
}

export async function sendTestEmail(toEmail: string): Promise<SendResult> {
  if (!resendClient) {
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    const baseUrl = await getBaseUrl();
    const orderDate = new Date();
    const { data, error } = await resendClient.emails.send({
      from: `Kado.io <${EMAIL_ADDRESSES.orders}>`,
      to: [toEmail],
      replyTo: EMAIL_ADDRESSES.support,
      subject: 'Test Order Confirmation (sample)',
      react: OrderConfirmationEmail({
        customerName: 'Test User',
        orderNumber: 'TEST-1234',
        orderDate,
        items: [
          {
            name: 'Sample Pokemon Card',
            image: `${baseUrl}/kado-placeholder.jpg`,
            condition: 'Near Mint',
            price: '$12.00',
            quantity: 1,
          },
        ],
        subtotal: '$12.00',
        tax: '$1.08',
        shipping: 'Free',
        total: '$13.08',
        shippingAddress: ['123 Test St', 'Test City, TS 12345', 'USA'],
        billingAddress: ['123 Test St', 'Test City, TS 12345', 'USA'],
        ctaUrl: baseUrl,
        supportEmail: EMAIL_ADDRESSES.support,
        logoUrl: `${baseUrl}/kado-logo.jpg`,
      }),
    });

    if (error) {
      const message = error instanceof Error ? error.message : 'Failed to send test email';
      return { success: false, error: message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Email] Error sending test email', err);
    return { success: false, error: message };
  }
}

export async function sendSellerOrderNotificationEmail(
  orderId: string,
  options: SendEmailOptions = {},
): Promise<SendResult> {
  const { ipAddress, userAgent } = options;

  if (!resendClient) {
    return { success: false, error: 'Resend API key not configured' };
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        sellerId: true,
        sellerName: true,
        buyerId: true,
        snapshotListingDisplayTitle: true,
        snapshotListingImageUrl: true,
        subtotalCents: true,
        taxCents: true,
        shippingCents: true,
        totalCents: true,
        currency: true,
      },
    });

    if (!order?.sellerId) {
      return { success: false, error: 'Seller not found for order' };
    }

    const seller = await getOrCreateUser(order.sellerId);
    const sellerEmail = getPreferredEmail(seller);

    if (!sellerEmail) {
      await logEmailAudit({
        orderId,
        action: 'EMAIL_FAILED',
        ipAddress,
        userAgent,
        metadata: {
          emailType: 'SELLER_NOTIFICATION',
          reason: 'missing_seller_email',
        },
      });
      return { success: false, error: 'Seller email not available' };
    }

    const emailData = await getOrderDataForEmail(orderId);

    if (!emailData) {
      return { success: false, error: 'Order data unavailable' };
    }

    const baseUrl = await getBaseUrl();
    const orderUrl = `${baseUrl}/orders/${orderId}`;
    const logoUrl = `${baseUrl}/kado-logo.jpg`;
    const fallbackImage = `${baseUrl}/kado-placeholder.jpg`;

    const { data, error } = await resendClient.emails.send({
      from: `Kado.io <${EMAIL_ADDRESSES.orders}>`,
      to: [sellerEmail],
      replyTo: EMAIL_ADDRESSES.support,
      subject: `New Order Received - #${emailData.orderNumber}`,
      react: SellerOrderNotificationEmail({
        sellerName: order.sellerName || seller?.user_metadata?.displayName || 'Seller',
        orderNumber: emailData.orderNumber,
        orderDate: emailData.orderDate,
        productName: emailData.productName,
        productImageUrl: emailData.productImageUrl || fallbackImage,
        totalFormatted: emailData.formattedTotal,
        shippingAddress: emailData.shippingAddress,
        billingAddress: emailData.billingAddress,
        ctaUrl: orderUrl,
        logoUrl,
      }),
    });

    if (error) {
      const message = error instanceof Error ? error.message : 'Failed to send seller email';
      await logEmailAudit({
        orderId,
        action: 'EMAIL_FAILED',
        ipAddress,
        userAgent,
        metadata: {
          emailType: 'SELLER_NOTIFICATION',
          reason: 'resend_error',
          message,
        },
      });
      return { success: false, error: message };
    }

    await logEmailAudit({
      orderId,
      action: 'EMAIL_SENT',
      ipAddress,
      userAgent,
      metadata: {
        emailType: 'SELLER_NOTIFICATION',
        resendId: data?.id,
        to: sellerEmail,
      },
    });

    return { success: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logEmailAudit({
      orderId,
      action: 'EMAIL_FAILED',
      ipAddress,
      userAgent,
      metadata: {
        emailType: 'SELLER_NOTIFICATION',
        reason: 'unexpected_error',
        message,
      },
    });
    console.error('[Email] Error sending seller notification', err);
    return { success: false, error: message };
  }
}
