/*
  Warnings:

  - You are about to drop the column `buttonLabel` on the `panels` table. All the data in the column will be lost.
  - You are about to drop the column `form_id` on the `panels` table. All the data in the column will be lost.
  - Added the required column `name` to the `panels` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PanelButtonStyle" AS ENUM ('PRIMARY', 'SECONDARY', 'SUCCESS', 'DANGER');

-- DropForeignKey
ALTER TABLE "panels" DROP CONSTRAINT "panels_form_id_fkey";

-- DropIndex
DROP INDEX "panels_form_id_idx";

-- AlterTable
ALTER TABLE "panels" DROP COLUMN "buttonLabel",
DROP COLUMN "form_id",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "panel_buttons" (
    "id" TEXT NOT NULL,
    "panel_id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "style" "PanelButtonStyle" NOT NULL DEFAULT 'PRIMARY',
    "emoji" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "panel_buttons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "panel_buttons_panel_id_idx" ON "panel_buttons"("panel_id");

-- CreateIndex
CREATE INDEX "panel_buttons_form_id_idx" ON "panel_buttons"("form_id");

-- AddForeignKey
ALTER TABLE "panel_buttons" ADD CONSTRAINT "panel_buttons_panel_id_fkey" FOREIGN KEY ("panel_id") REFERENCES "panels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "panel_buttons" ADD CONSTRAINT "panel_buttons_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
