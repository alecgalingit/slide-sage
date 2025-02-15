import { Queue } from "~/utils/queue.server";
import {
  updateSlideSummary,
  updateSlideGenerateStatus,
  StatusEnum,
  getContextSlides,
  getSlideFromLecture,
} from "~/models/lecture.server";
import { openaiClient, buildSummaryQuery } from "~/utils/openai.server";
import type { Slide } from "~/models/lecture.server";

type QueueData = {
  lectureId: Slide["lectureId"];
  slideNumber: Slide["slideNumber"];
};
export const slideSummaryQueueName = "slideSummaryGenerator";

export const createSlideSummaryQueue = () => {
  return Queue<QueueData>(slideSummaryQueueName, async (job) => {
    const { lectureId, slideNumber } = job.data;
    try {
      const slide = await getSlideFromLecture({ lectureId, slideNumber });
      if (!slide) {
        throw new Error("Slide not found.");
      }

      if (slide.content && slide.content.length > 0) {
        return;
      }

      const base64Encoding = slide.base64;
      const contextSlides = await getContextSlides(lectureId, slideNumber);
      const messages = buildSummaryQuery({ contextSlides, base64Encoding });
      const completion = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages,
        stream: false,
      });

      const summary = completion.choices[0]?.message?.content;
      if (!summary) {
        throw new Error("No summary generated");
      }

      console.log(
        `trying update slide summary with ${lectureId} and ${slideNumber}`
      );
      await updateSlideSummary({
        identifier: { lectureId, slideNumber },
        summary,
      });

      console.log(
        `trying update slide STATUS with ${lectureId} and ${slideNumber}`
      );
      await updateSlideGenerateStatus({
        identifier: { lectureId, slideNumber },
        status: StatusEnum.READY,
      });

      console.log("got past?");

      console.log(
        `Successfully generated summary for slide ${slideNumber} of lecture ${lectureId}`
      );
    } catch (error) {
      console.error(
        `Failed to generate summary for slide ${slideNumber} of lecture ${lectureId}:`,
        error
      );
      await updateSlideGenerateStatus({
        identifier: { lectureId, slideNumber },
        status: StatusEnum.FAILED,
      });
      throw error;
    }
  });
};
