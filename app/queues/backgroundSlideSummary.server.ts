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
import { singleton } from "~/singleton.server";

export type QueueData = {
  lectureId: Slide["lectureId"];
  slideNumber: Slide["slideNumber"];
};

export const slideSummaryQueueName = "slideSummaryGenerator";

const createQueueProcessor = () => {
  Queue<QueueData>(slideSummaryQueueName, async (job) => {
    const { lectureId, slideNumber } = job.data;
    try {
      console.log(`\n\nQUEUING FOR ${lectureId} and ${slideNumber}`);
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
        model: "gpt-4o-mini",
        messages,
        stream: false,
      });

      const summary = completion.choices[0]?.message?.content;
      if (!summary) {
        throw new Error("No summary generated");
      }

      await updateSlideSummary({
        identifier: { lectureId, slideNumber },
        summary,
        safe: true,
      });
    } catch (error) {
      console.error(
        `Failed to generate summary for slide ${slideNumber} of lecture ${lectureId}:`,
        error
      );
      await updateSlideGenerateStatus({
        identifier: { lectureId, slideNumber },
        status: StatusEnum.FAILED,
        safe: true,
      });
      throw error;
    }
  });
};

export const ensureSummaryQueueExists = () =>
  singleton("slide_summary_queue", createQueueProcessor);

export const numToQueue = 5;
