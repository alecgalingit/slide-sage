/*
  Warnings:

  - The `status` column on the `Lecture` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Lecture" DROP COLUMN "status",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'PROCESSING';

-- AlterTable
ALTER TABLE "Slide" ADD COLUMN     "generateStatus" "Status";

-- DropEnum
DROP TYPE "UploadStatus";
