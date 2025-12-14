import { Shippo } from 'shippo';
import { getShippoToken, detectRuntimeEnvironment } from './env';
import { prisma } from './prisma';
import {
  TEST_TRACKING_NUMBERS,
  SUPPORTED_CARRIERS as CARRIERS,
  TEST_SCENARIOS as SCENARIOS,
  type TestScenario,
} from './tracking-constants';

// Re-export for backward compatibility
export type { TestScenario } from './tracking-constants';
export const SUPPORTED_CARRIERS = CARRIERS;
export const TEST_SCENARIOS = SCENARIOS;

export class TrackingService {
  private shippo: Shippo | null = null;

  private async getShippoClient(): Promise<Shippo> {
    if (!this.shippo) {
      const token = await getShippoToken();
      this.shippo = new Shippo({ apiKeyHeader: token });
    }
    return this.shippo;
  }

  /**
   * Resolves tracking number for environment.
   * In staging: maps test scenarios to Shippo test tracking numbers
   * In prod: uses actual tracking numbers
   */
  private async resolveTrackingNumber(input: string): Promise<string> {
    const env = await detectRuntimeEnvironment();

    if (env === 'prod') {
      return input; // Use actual tracking number in production
    }

    // In staging, map test scenarios to Shippo test numbers
    if (input in TEST_TRACKING_NUMBERS) {
      return TEST_TRACKING_NUMBERS[input as TestScenario];
    }

    return input;
  }

  /**
   * Starts tracking for an order.
   * Creates Shippo tracking and updates order status to SHIPPED.
   */
  async startTracking(orderId: string, carrier: string, trackingNumber: string) {
    const shippo = await this.getShippoClient();
    const env = await detectRuntimeEnvironment();
    const actualTrackingNumber = await this.resolveTrackingNumber(trackingNumber);

    // For test tracking numbers, Shippo requires carrier to be "shippo"
    const isTestTracking = trackingNumber in TEST_TRACKING_NUMBERS;
    const shippoCarrier = isTestTracking ? 'shippo' : carrier;

    // Create Shippo tracking
    const tracking = await shippo.trackingStatus.create({
      carrier: shippoCarrier,
      trackingNumber: actualTrackingNumber,
      metadata: JSON.stringify({
        environment: env,
        orderId: orderId,
        isTest: env !== 'prod',
        originalTrackingNumber: trackingNumber,
        originalCarrier: carrier,
      }),
    });

    // Update order in database - store the user-selected carrier, not "shippo"
    const shippedTime = new Date();
    const order = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          shippingCarrier: carrier,
          trackingNumber: actualTrackingNumber,
          trackingId: tracking.trackingNumber, // Shippo uses trackingNumber as ID
          fulfillmentStatus: 'SHIPPED',
          shippedAt: shippedTime,
        },
      });

      // Create ORDER_SHIPPED event
      await tx.orderEvent.create({
        data: {
          orderId,
          type: 'ORDER_SHIPPED',
          timestamp: shippedTime,
          metadata: {
            carrier,
            trackingNumber: actualTrackingNumber,
            shippoTrackingId: tracking.trackingNumber,
          },
        },
      });

      return updatedOrder;
    });

    console.log(
      `[${env}] Order ${orderId.slice(-8)} marked as shipped - Carrier: ${carrier}, Tracking: ${actualTrackingNumber} (Shippo carrier: ${shippoCarrier})`,
    );

    return { tracking, order };
  }

  /**
   * Gets current tracking status from Shippo.
   */
  async getTrackingStatus(carrier: string, trackingNumber: string) {
    const shippo = await this.getShippoClient();
    return await shippo.trackingStatus.get(trackingNumber, carrier);
  }

  /**
   * Registers a webhook for tracking updates.
   * Should be called once during setup.
   */
  async registerWebhook(webhookUrl: string) {
    const shippo = await this.getShippoClient();

    // Check if webhook already exists
    const existingWebhooks = await shippo.webhooks.listWebhooks();
    const existing = existingWebhooks.results?.find((w: any) => w.url === webhookUrl);

    if (existing) {
      console.log(`Webhook already registered: ${webhookUrl}`);
      return existing;
    }

    // Create new webhook
    const webhook = await shippo.webhooks.createWebhook({
      url: webhookUrl,
      event: 'track_updated' as any, // Type assertion for enum
      active: true,
    });

    console.log(`Webhook registered: ${webhookUrl}`);
    return webhook;
  }
}

// Singleton instance
export const trackingService = new TrackingService();

/**
 * Maps Shippo tracking status to our FulfillmentStatus enum.
 */
export function mapShippoStatusToFulfillment(shippoStatus: string): string | null {
  const statusMap: Record<string, string> = {
    DELIVERED: 'DELIVERED',
    TRANSIT: 'IN_TRANSIT',
    OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    RETURNED: 'EXCEPTION',
    FAILURE: 'EXCEPTION',
    UNKNOWN: 'EXCEPTION',
    PRE_TRANSIT: 'PROCESSING',
  };

  return statusMap[shippoStatus] || null;
}
