-- CreateEnum
CREATE TYPE "SlabCondition" AS ENUM ('MINT', 'NEAR_MINT', 'GOOD', 'DAMAGED');

-- CreateEnum
CREATE TYPE "RemovalReason" AS ENUM ('SOLD', 'LOST', 'GIFTED', 'OTHER');

-- CreateTable
CREATE TABLE "CollectionItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "gradingCertificateId" TEXT NOT NULL,
    "purchasePriceCents" INTEGER,
    "slabCondition" "SlabCondition",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),
    "removalReason" "RemovalReason",

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionItem_userId_removedAt_idx" ON "CollectionItem"("userId", "removedAt");

-- CreateIndex
CREATE INDEX "CollectionItem_gradingCertificateId_removedAt_idx" ON "CollectionItem"("gradingCertificateId", "removedAt");

-- CreateIndex
CREATE INDEX "CollectionItem_cardId_idx" ON "CollectionItem"("cardId");

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_gradingCertificateId_fkey" FOREIGN KEY ("gradingCertificateId") REFERENCES "GradingCertificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
