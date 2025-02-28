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

// Create the queue processing function separately from the singleton
const createQueueProcessor = () => {
  Queue<QueueData>(slideSummaryQueueName, async (job) => {
    const { lectureId, slideNumber } = job.data;
    try {
      console.log(`\n\nFOR ${lectureId} and ${slideNumber}`);
      console.log("HERE_1");
      const slide = await getSlideFromLecture({ lectureId, slideNumber });
      console.log("HERE_2");
      if (!slide) {
        throw new Error("Slide not found.");
      }
      console.log("HERE_3");

      if (slide.content && slide.content.length > 0) {
        return;
      }
      console.log("HERE_4");

      const base64Encoding = slide.base64;
      console.log("HERE_5");
      const contextSlides = await getContextSlides(lectureId, slideNumber);
      console.log("HERE_6");
      const messages = buildSummaryQuery({ contextSlides, base64Encoding });
      console.log("HERE_7");
      const completion = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages,
        stream: false,
      });
      console.log("HERE_8");

      const summary = completion.choices[0]?.message?.content;
      if (!summary) {
        throw new Error("No summary generated");
      }
      console.log("HERE_9");
      console.log(
        `when retrieved, slide content: ${slide.content.length} and generate status: ${slide.generateStatus}`
      );

      await updateSlideSummary({
        identifier: { lectureId, slideNumber },
        summary,
        safe: true,
      });

      const failedSlide = await getSlideFromLecture({ lectureId, slideNumber });
      if (failedSlide) {
        console.log(
          `After failure - generate status: ${failedSlide.generateStatus}`
        );
      }
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
