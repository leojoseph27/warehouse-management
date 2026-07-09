-- AlterTable
ALTER TABLE "export_jobs" DROP COLUMN "resultSize",
ADD COLUMN     "blobExpiresAt" TIMESTAMP(3),
ADD COLUMN     "blobUrl" TEXT,
ADD COLUMN     "fileSize" INTEGER;

-- CreateIndex
CREATE INDEX "export_jobs_blobExpiresAt_idx" ON "export_jobs"("blobExpiresAt");

