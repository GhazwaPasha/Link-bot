-- AlterTable
ALTER TABLE "panels" ADD COLUMN "failed_at" TIMESTAMP(3),
ADD COLUMN "last_error" TEXT;
