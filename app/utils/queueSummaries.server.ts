import { getNumSlides } from "~/models/lecture.server";
import type { Slide } from "~/models/lecture.server";
import {
  //initializeSlideSummaryQueue,
  ensureSummaryQueueExists,
  slideSummaryQueueName,
  numToQueue,
} from "~/queues/backgroundSlideSummary.server";
import { FlowProducer } from "bullmq";
import type { FlowJob } from "bullmq";

function createJobId(
  lectureId: Slide["lectureId"],
  slideNumber: Slide["slideNumber"]
) {
  return `${lectureId}-${slideNumber}`;
}

slideSummaryQueueName;

function createSlideFlowJob({
  queueName,
  lectureId,
  slideNumber,
  children,
}: {
  queueName: string;
  lectureId: Slide["lectureId"];
  slideNumber: Slide["slideNumber"];
  children?: FlowJob[];
}): FlowJob {
  return {
    name: queueName,
    data: { lectureId, slideNumber },
    queueName: queueName,
    opts: {
      failParentOnFailure: true,
      jobId: createJobId(lectureId, slideNumber),
    },
    children,
  };
}

export async function queueSummaries(
  lectureId: Slide["lectureId"],
  slideNumber: Slide["slideNumber"]
) {
  console.log("RUNNING_ABC");
  const numSlides = await getNumSlides(lectureId);
  if (!numSlides) {
    throw new Error("Number of slides not found.");
  }

  if (slideNumber >= numSlides) {
    return;
  }
  console.log("SSS_1");

  // Initialize the slide summary queue if doesn't already exist (stored globally)
  ensureSummaryQueueExists();
  console.log("SSS_2");

  const flowProducer = new FlowProducer();
  console.log("SSS_3");

  let job = createSlideFlowJob({
    queueName: slideSummaryQueueName,
    lectureId: lectureId,
    slideNumber: slideNumber + 1,
  });

  for (let i = 2; i < numToQueue && slideNumber + i <= numSlides; i++) {
    const newSlideNumber = slideNumber + i;
    const newJob = createSlideFlowJob({
      queueName: slideSummaryQueueName,
      lectureId,
      slideNumber: newSlideNumber,
      children: [job],
    });

    job = newJob;
  }

  flowProducer.add(job);
}
