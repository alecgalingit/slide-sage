/*
  Warnings:

  - You are about to drop the `SlideContent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SlideContent" DROP CONSTRAINT "SlideContent_slideId_fkey";

-- AlterTable
ALTER TABLE "Slide" ADD COLUMN     "content" TEXT[];

-- DropTable
DROP TABLE "SlideContent";

-- DropEnum
DROP TYPE "ContentType";
