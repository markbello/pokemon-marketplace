-- PM-64: Shipping and Fulfillment Tracking
-- This migration adds shipping, tracking, and order event functionality
-- Made idempotent to handle partial application from previous failed migration

-- CreateEnum: FulfillmentStatus (skip if exists)
DO $$ BEGIN
    CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: OrderEventType (skip if exists)
DO $$ BEGIN
    CREATE TYPE "OrderEventType" AS ENUM ('ORDER_CREATED', 'PAYMENT_RECEIVED', 'ORDER_SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_EXCEPTION', 'ORDER_CANCELLED', 'ORDER_REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Add shipping and fulfillment tracking fields to Order (skip if exists)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingCarrier" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable: OrderEvent (skip if exists)
CREATE TABLE IF NOT EXISTS "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "OrderEventType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "userId" TEXT,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: OrderEvent indexes (skip if exists)
CREATE INDEX IF NOT EXISTS "OrderEvent_orderId_timestamp_idx" ON "OrderEvent"("orderId", "timestamp");
CREATE INDEX IF NOT EXISTS "OrderEvent_type_timestamp_idx" ON "OrderEvent"("type", "timestamp");

-- AddForeignKey: OrderEvent references Order with cascade delete (skip if exists)
DO $$ BEGIN
    ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
