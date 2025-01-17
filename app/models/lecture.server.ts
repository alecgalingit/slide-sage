import { Lecture, Slide, UploadStatus } from "@prisma/client";
import type { User } from "./user.server";

import { prisma } from "~/db.server";

export type { Lecture, Slide, UploadStatus } from "@prisma/client";
export { UploadStatus as UploadStatusEnum } from "@prisma/client";

export async function getLectureById(id: Lecture["id"]) {
  return prisma.lecture.findUnique({ where: { id } });
}

export async function getSlideById(id: Slide["id"]) {
  return prisma.lecture.findUnique({ where: { id } });
}

export async function upsertSlide(
  lectureId: Slide["lectureId"],
  slideNumber: Slide["slideNumber"],
  s3Key: Slide["s3Key"] = "",
  status: UploadStatus = UploadStatus.PROCESSING
) {
  return prisma.slide.upsert({
    where: {
      lectureId_slideNumber: { lectureId, slideNumber },
    },
    update: {
      s3Key,
      status,
    },
    create: {
      lectureId,
      slideNumber,
      s3Key,
      status,
    },
  });
}

export async function markSlidesAsFailed(lectureId: Slide["lectureId"]) {
  return prisma.slide.updateMany({
    where: {
      lectureId,
      status: UploadStatus.PROCESSING,
    },
    data: {
      status: UploadStatus.FAILED,
    },
  });
}

export async function createLecture(
  userId: User["id"],
  title: string,
  description?: string
) {
  return prisma.lecture.create({
    data: {
      userId,
      title,
      description,
    },
  });
}

export async function updateLectureStatus(
  lectureId: Lecture["id"],
  newStatus: UploadStatus
) {
  return prisma.lecture.update({
    where: { id: lectureId },
    data: { status: newStatus },
  });
}
