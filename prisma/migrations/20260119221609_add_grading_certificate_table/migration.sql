-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "gradingCertificateId" TEXT;

-- AlterTable
ALTER TABLE "SalesData" ADD COLUMN     "gradingCertificateId" TEXT;

-- CreateTable
CREATE TABLE "GradingCertificate" (
    "id" TEXT NOT NULL,
    "gradingCompany" TEXT NOT NULL,
    "certNumber" TEXT NOT NULL,
    "grade" DOUBLE PRECISION,
    "gradeLabel" TEXT,
    "psaSpecId" INTEGER,
    "frontImageUrl" TEXT,
    "backImageUrl" TEXT,
    "cardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAtDb" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradingCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradingCertificate_certNumber_idx" ON "GradingCertificate"("certNumber");

-- CreateIndex
CREATE INDEX "GradingCertificate_gradingCompany_idx" ON "GradingCertificate"("gradingCompany");

-- CreateIndex
CREATE INDEX "GradingCertificate_psaSpecId_idx" ON "GradingCertificate"("psaSpecId");

-- CreateIndex
CREATE INDEX "GradingCertificate_cardId_idx" ON "GradingCertificate"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "GradingCertificate_gradingCompany_certNumber_key" ON "GradingCertificate"("gradingCompany", "certNumber");

-- CreateIndex
CREATE INDEX "Listing_gradingCertificateId_idx" ON "Listing"("gradingCertificateId");

-- CreateIndex
CREATE INDEX "SalesData_gradingCertificateId_idx" ON "SalesData"("gradingCertificateId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_gradingCertificateId_fkey" FOREIGN KEY ("gradingCertificateId") REFERENCES "GradingCertificate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingCertificate" ADD CONSTRAINT "GradingCertificate_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesData" ADD CONSTRAINT "SalesData_gradingCertificateId_fkey" FOREIGN KEY ("gradingCertificateId") REFERENCES "GradingCertificate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
