import { getNumSlides } from "~/models/lecture.server";
import type { Slide } from "~/models/lecture.server";
import {
  createSlideSummaryQueue,
  slideSummaryQueueName,
} from "~/queues/backgroundSlideSummary";
import { FlowProducer } from "bullmq";
import type { FlowJob } from "bullmq";

export async function queueSummaries(
  numToQueue: number,
  lectureId: Slide["lectureId"],
  slideNumber: Slide["slideNumber"]
) {
  const numSlides = await getNumSlides(lectureId);
  if (!numSlides) {
    throw new Error("Number of slides not found.");
  }

  if (numToQueue < 1 || slideNumber >= numSlides) {
    return;
  }
  console.log("SSS_1");

  // Initialize the slide summary queue if doesn't already exist (stored globally)
  createSlideSummaryQueue();
  console.log("SSS_2");

  const flowProducer = new FlowProducer();
  console.log("SSS_3");
  let job: FlowJob = {
    name: slideSummaryQueueName,
    data: { lectureId, slideNumber: slideNumber + 1 },
    queueName: slideSummaryQueueName,
  };
  console.log("SSS_4");

  for (let i = 2; i < numToQueue && slideNumber + i <= numSlides; i++) {
    const newSlideNumber = slideNumber + i;
    const newJob = {
      name: slideSummaryQueueName,
      data: { lectureId, slideNumber: newSlideNumber },
      queueName: slideSummaryQueueName,
      children: [job],
    };
    job = newJob;
  }

  flowProducer.add(job);
}
