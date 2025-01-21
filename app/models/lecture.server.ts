import { Lecture, Slide, UploadStatus } from "@prisma/client";
import type { User } from "./user.server";

import { prisma } from "~/db.server";

export type { Lecture, Slide, UploadStatus } from "@prisma/client";
export { UploadStatus as UploadStatusEnum } from "@prisma/client";

export async function getLectureById(id: Lecture["id"]) {
  return prisma.lecture.findUnique({ where: { id } });
}

export async function getSlideById(id: Slide["id"], userId: User["id"]) {
  return prisma.slide.findUnique({ where: { id, userId } });
}

export async function createSlide(
  lectureId: Slide["lectureId"],
  slideNumber: Slide["slideNumber"],
  base64: Slide["base64"]
) {
  const lecture = await prisma.lecture.findUnique({
    where: { id: lectureId },
    select: { userId: true },
  });

  if (!lecture || !lecture.userId) {
    throw new Error(
      `Lecture with ID ${lectureId} not found or has no associated user.`
    );
  }

  const userId = lecture.userId;

  return prisma.slide.create({
    data: {
      lectureId,
      slideNumber,
      base64,
      userId,
    },
  });
}
// export async function getSlideFromLecture(
//   lectureId: Slide["lectureId"],
//   slideNum: Slide["slideNumber"],
//   userId: Slide["userId"]
// ) {
//   return prisma.slide.findFirst({
//     where: {
//       lectureId,
//       slideNumber: slideNum,
//       userId,
//     },
//   });
// }

export async function getSlideFromLecture({
  lectureId,
  slideNumber,
  userId,
}: Pick<Slide, "lectureId" | "slideNumber" | "userId">) {
  return prisma.slide.findFirst({
    where: {
      lectureId,
      slideNumber: slideNumber,
      userId,
    },
  });
}

export async function deleteSlidesByLectureId(lectureId: Lecture["id"]) {
  try {
    const deletedSlides = await prisma.slide.deleteMany({
      where: {
        lectureId,
      },
    });
    console.log(
      `Deleted ${deletedSlides.count} slides for lectureId: ${lectureId}`
    );
    return deletedSlides.count;
  } catch (error) {
    console.error("Error deleting slides:", error);
    throw new Error("Failed to delete slides. Please try again.");
  }
}

export async function updateNumSlides(
  lectureId: Lecture["id"],
  numSlides: Lecture["numSlides"]
) {
  try {
    await prisma.lecture.update({
      where: {
        id: lectureId,
      },
      data: {
        numSlides,
      },
    });
    console.log(
      `Updated numSlides for lectureId: ${lectureId} to ${numSlides}`
    );
  } catch (error) {
    console.error("Error updating numSlides:", error);
    throw new Error("Failed to update numSlides. Please try again.");
  }
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
