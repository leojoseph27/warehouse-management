-- AlterTable
ALTER TABLE "export_jobs" DROP COLUMN "resultBlob",
ADD COLUMN     "chunkCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cursor" INTEGER,
ADD COLUMN     "downloadUrl" TEXT,
ADD COLUMN     "elapsedMs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "estimatedSizeBytes" INTEGER,
ADD COLUMN     "failedChunkCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failedImages" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "export_chunks" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "chunkNumber" INTEGER NOT NULL,
    "firstSourceRow" INTEGER,
    "lastSourceRow" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "productCount" INTEGER NOT NULL DEFAULT 0,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "imagesDownloaded" INTEGER NOT NULL DEFAULT 0,
    "productIdsJson" TEXT NOT NULL DEFAULT '[]',
    "imageManifestJson" TEXT NOT NULL DEFAULT '[]',
    "excelRowsJson" TEXT NOT NULL DEFAULT '[]',
    "dbMs" INTEGER NOT NULL DEFAULT 0,
    "driveMs" INTEGER NOT NULL DEFAULT 0,
    "excelMs" INTEGER NOT NULL DEFAULT 0,
    "totalMs" INTEGER NOT NULL DEFAULT 0,
    "memoryMb" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "export_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_logs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL DEFAULT 'info',
    "source" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL,
    "contextJson" TEXT,

    CONSTRAINT "export_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "export_chunks_jobId_chunkNumber_idx" ON "export_chunks"("jobId", "chunkNumber");

-- CreateIndex
CREATE INDEX "export_chunks_jobId_status_idx" ON "export_chunks"("jobId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "export_chunks_jobId_chunkNumber_key" ON "export_chunks"("jobId", "chunkNumber");

-- CreateIndex
CREATE INDEX "export_logs_jobId_timestamp_idx" ON "export_logs"("jobId", "timestamp");

-- CreateIndex
CREATE INDEX "export_logs_jobId_level_idx" ON "export_logs"("jobId", "level");

-- CreateIndex
CREATE INDEX "export_jobs_cursor_idx" ON "export_jobs"("cursor");

-- AddForeignKey
ALTER TABLE "export_chunks" ADD CONSTRAINT "export_chunks_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "export_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_logs" ADD CONSTRAINT "export_logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "export_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

