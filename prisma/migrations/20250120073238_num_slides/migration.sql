/*
  Warnings:

  - You are about to drop the column `status` on the `Slide` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Lecture" ADD COLUMN     "numSlides" INTEGER;

-- AlterTable
ALTER TABLE "Slide" DROP COLUMN "status";
