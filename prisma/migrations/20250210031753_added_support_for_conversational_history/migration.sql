/*
  Warnings:

  - You are about to drop the column `summary` on the `Slide` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('ASSISTANT', 'USER');

-- AlterTable
ALTER TABLE "Slide" DROP COLUMN "summary";

-- CreateTable
CREATE TABLE "SlideContent" (
    "id" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "content" TEXT NOT NULL,
    "slideId" TEXT NOT NULL,

    CONSTRAINT "SlideContent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SlideContent" ADD CONSTRAINT "SlideContent_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "Slide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
