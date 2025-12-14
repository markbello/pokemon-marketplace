import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FormattedDate } from '@/components/FormattedDate';
import {
  Package,
  CreditCard,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShoppingCart,
} from 'lucide-react';
import type { Order, OrderEvent as PrismaOrderEvent, OrderEventType } from '@prisma/client';

interface OrderHistoryProps {
  order: Order & {
    events: PrismaOrderEvent[];
  };
}

type HistoryEvent = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  timestamp: Date;
};

function getEventDisplay(event: PrismaOrderEvent): {
  icon: React.ReactNode;
  title: string;
  description: string;
} {
  const metadata = event.metadata as any;

  switch (event.type) {
    case 'ORDER_CREATED':
      return {
        icon: <ShoppingCart className="h-4 w-4" />,
        title: 'Order Created',
        description: 'Order was placed',
      };

    case 'PAYMENT_RECEIVED':
      return {
        icon: <CreditCard className="h-4 w-4" />,
        title: 'Payment Received',
        description: 'Payment was successfully processed',
      };

    case 'ORDER_SHIPPED':
      return {
        icon: <Truck className="h-4 w-4" />,
        title: 'Order Shipped',
        description:
          metadata?.carrier && metadata?.trackingNumber
            ? `Shipped via ${metadata.carrier.toUpperCase()} - Tracking: ${metadata.trackingNumber}`
            : 'Order has been shipped',
      };

    case 'IN_TRANSIT':
      return {
        icon: <Package className="h-4 w-4" />,
        title: 'In Transit',
        description: metadata?.status || 'Package is on its way to the destination',
      };

    case 'OUT_FOR_DELIVERY':
      return {
        icon: <Package className="h-4 w-4" />,
        title: 'Out for Delivery',
        description: 'Package is out for delivery today',
      };

    case 'DELIVERED':
      return {
        icon: <CheckCircle2 className="h-4 w-4" />,
        title: 'Delivered',
        description: metadata?.message || 'Package was successfully delivered',
      };

    case 'DELIVERY_EXCEPTION':
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        title: 'Delivery Exception',
        description: metadata?.reason || 'There was an issue with delivery',
      };

    case 'ORDER_CANCELLED':
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        title: 'Order Cancelled',
        description: 'Order was cancelled',
      };

    case 'ORDER_REFUNDED':
      return {
        icon: <AlertCircle className="h-4 w-4" />,
        title: 'Order Refunded',
        description: 'Payment was refunded',
      };

    default:
      return {
        icon: <Clock className="h-4 w-4" />,
        title: String(event.type).replace(/_/g, ' '),
        description: 'Order event',
      };
  }
}

export function OrderHistory({ order }: OrderHistoryProps) {
  const events: HistoryEvent[] = order.events.map((event) => {
    const display = getEventDisplay(event);
    return {
      id: event.id,
      icon: display.icon,
      title: display.title,
      description: display.description,
      timestamp: event.timestamp,
    };
  });

  // Fallback for orders created before events system (backward compatibility)
  if (events.length === 0) {
    // Create synthetic ORDER_CREATED event
    events.push({
      id: 'legacy-created',
      icon: <ShoppingCart className="h-4 w-4" />,
      title: 'Order Created',
      description: 'Order was placed',
      timestamp: order.createdAt,
    });

    // Create synthetic PAYMENT_RECEIVED event if paid
    if (order.status === 'PAID') {
      events.push({
        id: 'legacy-paid',
        icon: <CreditCard className="h-4 w-4" />,
        title: 'Payment Received',
        description: 'Payment was successfully processed',
        timestamp: order.createdAt,
      });
    }

    // Create synthetic ORDER_SHIPPED event if shipped
    if (order.shippedAt) {
      events.push({
        id: 'legacy-shipped',
        icon: <Truck className="h-4 w-4" />,
        title: 'Order Shipped',
        description:
          order.shippingCarrier && order.trackingNumber
            ? `Shipped via ${order.shippingCarrier.toUpperCase()} - Tracking: ${order.trackingNumber}`
            : 'Order has been shipped',
        timestamp: order.shippedAt,
      });
    }

    // Create synthetic DELIVERED event if delivered
    if (order.deliveredAt) {
      events.push({
        id: 'legacy-delivered',
        icon: <CheckCircle2 className="h-4 w-4" />,
        title: 'Delivered',
        description: 'Package was successfully delivered',
        timestamp: order.deliveredAt,
      });
    }
  }

  // Sort by timestamp, chronological order (oldest first)
  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Order History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Timeline line */}
          <div className="bg-border absolute top-6 left-4 h-[calc(100%-3rem)] w-px" />

          {events.map((event, index) => (
            <div key={event.id} className="relative flex gap-4">
              {/* Timeline dot */}
              <div className="bg-background border-border relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2">
                {event.icon}
              </div>

              {/* Event content */}
              <div className="min-w-0 flex-1 pb-4">
                <h4 className="font-semibold">{event.title}</h4>
                <p className="text-muted-foreground text-sm">{event.description}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  <FormattedDate date={event.timestamp} purchaseTimezone={order.purchaseTimezone} />
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
