/*
  Warnings:

  - Added the required column `lecture_userId` to the `Slide` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Slide" ADD COLUMN     "lecture_userId" TEXT NOT NULL;
