-- PM-56: Consolidate amount fields
-- Step 1: Backfill NULL values using amountCents as the source
UPDATE "Order" 
SET 
  "subtotalCents" = COALESCE("subtotalCents", "amountCents"),
  "taxCents" = COALESCE("taxCents", 0),
  "shippingCents" = COALESCE("shippingCents", 0),
  "totalCents" = COALESCE("totalCents", "amountCents")
WHERE "subtotalCents" IS NULL OR "totalCents" IS NULL;

-- Step 2: Make columns required (NOT NULL)
ALTER TABLE "Order" ALTER COLUMN "subtotalCents" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "taxCents" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "taxCents" SET DEFAULT 0;
ALTER TABLE "Order" ALTER COLUMN "shippingCents" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "shippingCents" SET DEFAULT 0;
ALTER TABLE "Order" ALTER COLUMN "totalCents" SET NOT NULL;

-- Step 3: Drop the legacy amountCents column
ALTER TABLE "Order" DROP COLUMN "amountCents";




