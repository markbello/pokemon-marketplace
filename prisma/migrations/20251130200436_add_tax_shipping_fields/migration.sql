-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingCents" INTEGER,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "subtotalCents" INTEGER,
ADD COLUMN     "taxCents" INTEGER,
ADD COLUMN     "totalCents" INTEGER;

-- CreateIndex
CREATE INDEX "Order_stripeCustomerId_idx" ON "Order"("stripeCustomerId");
