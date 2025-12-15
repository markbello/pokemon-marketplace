-- PM-64: Shipping and Fulfillment Tracking
-- This migration adds shipping, tracking, and order event functionality

-- CreateEnum: FulfillmentStatus for tracking order fulfillment state
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'CANCELLED');

-- CreateEnum: OrderEventType for order history event sourcing
CREATE TYPE "OrderEventType" AS ENUM ('ORDER_CREATED', 'PAYMENT_RECEIVED', 'ORDER_SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_EXCEPTION', 'ORDER_CANCELLED', 'ORDER_REFUNDED');

-- AlterTable: Add shipping and fulfillment tracking fields to Order
ALTER TABLE "Order" ADD COLUMN "shippingCarrier" TEXT,
ADD COLUMN "trackingNumber" TEXT,
ADD COLUMN "trackingId" TEXT,
ADD COLUMN "shippedAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable: OrderEvent for tracking order lifecycle events
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "OrderEventType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "userId" TEXT,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: OrderEvent indexes for efficient querying
CREATE INDEX "OrderEvent_orderId_timestamp_idx" ON "OrderEvent"("orderId", "timestamp");
CREATE INDEX "OrderEvent_type_timestamp_idx" ON "OrderEvent"("type", "timestamp");

-- AddForeignKey: OrderEvent references Order with cascade delete
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
