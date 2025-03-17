import { Lecture, Slide, Status } from "@prisma/client";
import type { User } from "./user.server";
import type { PrismaClient } from "@prisma/client/extension";

import { prisma } from "~/db.server";

export type { Lecture, Slide, Status } from "@prisma/client";
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
      content: true,
    },
  });

  if (!slide) {
    throw new Response("Slide not found", { status: 404 });
  }

  return {
    lectureId: slide.lectureId,
    slideNumber: slide.slideNumber,
    content: slide.content,
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

export async function getSlideId({
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
    select: { id: true },
  });
}

export async function getNumSlides(lectureId: Lecture["id"]) {
  const result = await prisma.lecture.findUnique({
    where: {
      id: lectureId,
    },
    select: { numSlides: true },
  });

  return result?.numSlides ?? null;
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
  newStatus: Status
) {
  return prisma.lecture.update({
    where: { id: lectureId },
    data: { status: newStatus },
  });
}

export async function getContextSlides(
  lectureId: string,
  currentSlideNumber: number,
  maxNum: number = 20
) {
  return await prisma.slide
    .findMany({
      where: {
        lectureId,
        slideNumber: { lt: currentSlideNumber },
        content: { isEmpty: false },
      },
      orderBy: { slideNumber: "desc" },
      take: maxNum,
      select: {
        content: true,
        slideNumber: true,
        base64: true,
      },
    })
    .then((slides) =>
      slides.map((slide) => ({
        summary: slide.content[0],
        slideNumber: slide.slideNumber,
        base64: slide.base64,
      }))
    );
}

export async function getSlideContent(slideId: Slide["id"]) {
  try {
    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
      select: { content: true },
    });

    if (!slide) {
      throw new Error(`Slide with ID ${slideId} not found.`);
    }

    return slide.content;
  } catch (error) {
    console.error("Error retrieving content from slide:", error);
    throw error;
  }
}

export async function appendSlideConversation(
  slideId: Slide["id"],
  query: string,
  response: string,
  tx: PrismaClient = prisma
) {
  const contentToAdd = [query, response];

  if (contentToAdd.length !== 2) {
    throw new Error("Content must be exactly two strings");
  }

  try {
    const slide = await tx.slide.findUnique({
      where: { id: slideId },
      select: { content: true },
    });

    if (!slide) {
      throw new Error(`Slide with ID ${slideId} not found.`);
    }

    const updatedContent = [...slide.content, ...contentToAdd];

    await tx.slide.update({
      where: { id: slideId },
      data: {
        content: updatedContent,
      },
    });

    console.log(`Updated content for slideId: ${slideId}`);
    return updatedContent;
  } catch (error) {
    console.error("Error updating slide content:", error);
    throw new Error("Failed to update slide content. Please try again.");
  }
}

export async function getLecturesByUserId(userId: User["id"]) {
  return prisma.lecture.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      numSlides: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateLectureTitle({
  lectureId,
  title,
}: {
  lectureId: Lecture["id"];
  title: string;
}) {
  try {
    await prisma.lecture.update({
      where: { id: lectureId },
      data: { title },
    });
    console.log(`Updated title for lectureId: ${lectureId} to "${title}"`);
  } catch (error) {
    console.error("Error updating lecture title:", error);
    throw new Error("Failed to update lecture title. Please try again.");
  }
}

type SlideIdentifier =
  | { id: Slide["id"] }
  | { lectureId: Slide["lectureId"]; slideNumber: Slide["slideNumber"] };

function createWhereClause(identifier: SlideIdentifier) {
  if ("id" in identifier) {
    return { id: identifier.id };
  }
  return {
    lectureId_slideNumber: {
      lectureId: identifier.lectureId,
      slideNumber: identifier.slideNumber,
    },
  };
}

export async function getBase64FromSlide(identifier: SlideIdentifier) {
  try {
    const slide = await prisma.slide.findUnique({
      where: createWhereClause(identifier),
      select: { base64: true },
    });

    if (!slide) {
      const errorDetails =
        "id" in identifier
          ? `Slide with ID ${identifier.id} not found.`
          : `Slide with lectureId ${identifier.lectureId} and number ${identifier.slideNumber} not found.`;
      throw new Error(errorDetails);
    }

    return slide.base64;
  } catch (error) {
    console.error("Error retrieving base64 from slide:", error);
    throw error;
  }
}

export async function updateSlideSummary({
  identifier,
  summary,
  tx = prisma,
  safe = false,
}: {
  identifier: SlideIdentifier;
  summary: string;
  tx?: PrismaClient;
  safe?: boolean;
}) {
  try {
    if (safe) {
      const where =
        "id" in identifier
          ? { id: identifier.id }
          : {
              lectureId: identifier.lectureId,
              slideNumber: identifier.slideNumber,
            };

      await tx.slide.updateMany({
        where: {
          ...where,
          generateStatus: null,
        },
        data: {
          content: [summary],
          generateStatus: Status.READY,
        },
      });
    } else {
      await tx.slide.update({
        where: createWhereClause(identifier),
        data: {
          content: [summary],
          generateStatus: Status.READY,
        },
      });
    }

    const logDetails =
      "id" in identifier
        ? `slideId: ${identifier.id}`
        : `lectureId: ${identifier.lectureId}, slideNumber: ${identifier.slideNumber}`;
    console.log(`Updated summary for ${logDetails}`);
  } catch (error) {
    console.error("Error updating slide summary:", error);
    throw new Error("Failed to update slide summary. Please try again.");
  }
}

export async function updateSlideGenerateStatus({
  identifier,
  status,
  tx = prisma,
  safe = false,
}: {
  identifier: SlideIdentifier;
  status: Status;
  tx?: PrismaClient;
  safe?: boolean;
}) {
  try {
    if (safe) {
      const where =
        "id" in identifier
          ? { id: identifier.id }
          : {
              lectureId: identifier.lectureId,
              slideNumber: identifier.slideNumber,
            };

      await tx.slide.updateMany({
        where: {
          ...where,
          content: { isEmpty: true },
          generateStatus: null,
        },
        data: {
          generateStatus: status,
        },
      });
    } else {
      await tx.slide.update({
        where: createWhereClause(identifier),
        data: {
          generateStatus: status,
        },
      });
    }

    const logDetails =
      "id" in identifier
        ? `slideId: ${identifier.id}`
        : `lectureId: ${identifier.lectureId}, slideNumber: ${identifier.slideNumber}`;
    console.log(`Updated status for ${logDetails} to ${status}`);
  } catch (error) {
    console.error("Error updating slide status:", error);
    throw new Error("Failed to update slide status. Please try again.");
  }
}

export async function getAllSlideBase64s(lectureId: Lecture["id"]) {
  try {
    const slides = await prisma.slide.findMany({
      where: {
        lectureId,
      },
      select: {
        base64: true,
        slideNumber: true,
      },
      orderBy: {
        slideNumber: "asc",
      },
    });

    return slides.map((slide) => ({
      base64: slide.base64,
      slideNumber: slide.slideNumber,
    }));
  } catch (error) {
    console.error("Error retrieving base64s for lecture:", error);
    throw error;
  }
}

export async function getSlidesByNumbers(
  lectureId: Lecture["id"],
  slideNumbers: number[]
) {
  return await prisma.slide
    .findMany({
      where: {
        lectureId,
        slideNumber: { in: slideNumbers },
        content: { isEmpty: false },
      },
      select: {
        content: true,
        slideNumber: true,
      },
    })
    .then((slides) =>
      slides.map((slide) => ({
        summary: slide.content[0],
        slideNumber: slide.slideNumber,
      }))
    );
}
