/*
  Warnings:

  - You are about to drop the column `s3Key` on the `Slide` table. All the data in the column will be lost.
  - Added the required column `base64` to the `Slide` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Slide" DROP COLUMN "s3Key",
ADD COLUMN     "base64" TEXT NOT NULL;
