import type { User } from "~/models/user.server";
import type { Lecture } from "~/models/lecture.server";
import { fromBuffer } from "pdf2pic";
import {
  createSlide,
  deleteSlidesByLectureId,
  StatusEnum,
  updateLectureStatus,
  updateNumSlides,
} from "~/models/lecture.server";

export type extractorInput = {
  lectureId: Lecture["id"];
  userId: User["id"];
  pdfBuffer: string;
};

export const extractLecture = async ({
  lectureId,
  userId,
  pdfBuffer,
}: extractorInput) => {
  try {
    const buffer = Buffer.from(pdfBuffer, "base64");
    const options = {
      density: 100,
      format: "png",
      width: 1200,
      height: 800,
      preserveAspectRatio: true,
    };
    const convert = fromBuffer(buffer, options);

    const allPages = await convert.bulk(-1, { responseType: "base64" });
    updateNumSlides(lectureId, allPages.length);

    for (const [index, page] of allPages.entries()) {
      const slideNumber = index + 1;
      if (!page.base64) {
        throw `Error for slide ${slideNumber}`;
      }

      await createSlide(lectureId, slideNumber, page.base64);
    }
    updateLectureStatus(lectureId, StatusEnum.READY);
  } catch (error) {
    console.error("Error processing PDF:", error);

    deleteSlidesByLectureId(lectureId);
    updateLectureStatus(lectureId, StatusEnum.FAILED);
  }

  console.log(`Finished for lecture ${lectureId} for user ${userId}`);
};
