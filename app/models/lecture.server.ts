import { Lecture, Slide, Status } from "@prisma/client";
import type { User } from "./user.server";

import { prisma } from "~/db.server";

export type { Lecture, Slide, Status } from "@prisma/client";
// export status with normal export as well so can access values
export { Status as StatusEnum } from "@prisma/client";

export async function getLectureById(id: Lecture["id"]) {
  return await prisma.lecture.findUnique({ where: { id } });
}

export async function getSlideInfo(slideId: Slide["id"]) {
  const slide = await prisma.slide.findUnique({
    where: {
      id: slideId,
    },
    select: {
      lectureId: true,
      slideNumber: true,
    },
  });

  if (!slide) {
    throw new Response("Slide not found", { status: 404 });
  }

  return {
    lectureId: slide.lectureId,
    slideNumber: slide.slideNumber,
  };
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
}: Pick<Slide, "lectureId" | "slideNumber">) {
  return prisma.slide.findUnique({
    where: {
      lectureId_slideNumber: {
        lectureId,
        slideNumber,
      },
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

export async function updateSlideGenerateStatus(
  slideId: Slide["id"],
  status: Status
) {
  try {
    await prisma.slide.update({
      where: {
        id: slideId,
      },
      data: {
        generateStatus: status,
      },
    });
    console.log(`Updated status for slideId: ${slideId} to ${status}`);
  } catch (error) {
    console.error("Error updating slide status:", error);
    throw new Error("Failed to update slide status. Please try again.");
  }
}

export async function updateSlideSummary(
  slideId: Slide["id"],
  summary: Slide["summary"]
) {
  try {
    await prisma.slide.update({
      where: {
        id: slideId,
      },
      data: {
        summary,
        generateStatus: Status.READY,
      },
    });
    console.log(`Updated summary for slideId: ${slideId}`);
  } catch (error) {
    console.error("Error updating slide summary:", error);
    throw new Error("Failed to update slide summary. Please try again.");
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
  newStatus: Status
) {
  return prisma.lecture.update({
    where: { id: lectureId },
    data: { status: newStatus },
  });
}

export async function getBase64FromSlide(slideId: Slide["id"]) {
  try {
    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
      select: { base64: true },
    });

    if (!slide) {
      throw new Error(`Slide with ID ${slideId} not found.`);
    }

    return slide.base64;
  } catch (error) {
    console.error("Error retrieving base64 from slide:", error);
    throw error;
  }
}

export async function getContextSlides(
  lectureId: string,
  currentSlideNumber: number
) {
  return await prisma.slide.findMany({
    where: {
      lectureId,
      slideNumber: { lt: currentSlideNumber },
    },
    orderBy: { slideNumber: "desc" },
    take: 5,
    select: { summary: true },
  });
}
