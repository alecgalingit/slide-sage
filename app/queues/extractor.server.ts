import { Queue } from "~/utils/queue.server";
import type { User } from "~/models/user.server";
import type { Lecture } from "~/models/lecture.server";
import { fromBuffer } from "pdf2pic";
import {
  upsertSlide,
  markSlidesAsFailed,
  UploadStatusEnum,
  updateLectureStatus,
} from "~/models/lecture.server";
import { createS3Client, generateFileKey } from "~/uploads";
import { PutObjectCommand } from "@aws-sdk/client-s3";

type QueueData = {
  lectureId: Lecture["id"];
  userId: User["id"];
  pdfBuffer: string;
};

const s3 = createS3Client();

export const queue = Queue<QueueData>("extractor", async (job) => {
  console.log(`Extracting images from pdf and uploading to AWS`);
  try {
    const buffer = Buffer.from(job.data.pdfBuffer, "base64");
    const options = {
      density: 100,
      format: "png",
      width: 1200,
      height: 800,
      preserveAspectRatio: true,
    };
    const convert = fromBuffer(buffer, options);

    const allPages = await convert.bulk(-1, { responseType: "base64" });

    for (const [index, page] of allPages.entries()) {
      const slideNumber = index + 1;

      upsertSlide(job.data.lectureId, slideNumber);
      //const base64Data = page.base64.replace(/^data:image\/\w+;base64,/, "")
      const s3Key = generateFileKey(job.data.userId);

      const bucketName = process.env.AWS_IMAGES_BUCKETNAME!;

      const uploadCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: page.base64,
        ContentEncoding: "base64",
        ContentType: "image/png",
      });
      console.log("here1");

      await s3.send(uploadCommand);

      console.log("here2");

      await upsertSlide(
        job.data.lectureId,
        slideNumber,
        s3Key,
        UploadStatusEnum.READY
      );

      console.log("here3");

      // add event emitter here!!
      console.log("here4");
    }
    updateLectureStatus(job.data.lectureId, UploadStatusEnum.READY);
  } catch (error) {
    console.error("Error processing PDF:", error);

    markSlidesAsFailed(job.data.lectureId);
    updateLectureStatus(job.data.lectureId, UploadStatusEnum.FAILED);
  }

  console.log(
    `Finished for lecture ${job.data.lectureId} for user ${job.data.userId}`
  );
});
