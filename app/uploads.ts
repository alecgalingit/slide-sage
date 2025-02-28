import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Slide } from "@prisma/client";
import type { User } from "~/models/user.server";
import { singleton } from "./singleton.server";
import { Readable } from "stream";

export const getBucketPathPrefix = (userId: User["id"]) =>
  `user/${userId}/uploads/`;

export const generateFileKey = (userId: string) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  return `${getBucketPathPrefix(userId)}${timestamp}-${randomString}`;
};

export function createS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export const globalS3Client = singleton("S3Client", () => createS3Client());

export const generatePresignedUrl = async (
  key: Slide["s3Key"],
  expiresIn: number = 3600
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_IMAGES_BUCKETNAME!,
    Key: key,
  });

  try {
    const presignedUrl = await getSignedUrl(globalS3Client, command, {
      expiresIn,
    });
    return presignedUrl;
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    throw error;
  }
};

export const MAX_FILE_SIZE = 2 * 1024;
export const ALLOWED_FILE_TYPES = ["text/plain"];

export async function getBase64FromS3(s3Key: string) {
  const getCommand = new GetObjectCommand({
    Bucket: process.env.AWS_IMAGES_BUCKETNAME!,
    Key: s3Key,
  });

  const response = await globalS3Client.send(getCommand);

  const bodyStream = response.Body;
  if (!bodyStream || !(bodyStream instanceof Readable)) {
    throw new Error("No valid body stream found in S3 response");
  }

  // Read the stream and collect chunks
  const chunks: Buffer[] = [];
  for await (const chunk of bodyStream) {
    chunks.push(Buffer.from(chunk));
  }

  // Concatenate all chunks into a single Buffer
  const buffer = Buffer.concat(chunks);

  // Convert the Buffer into a Base64 string
  return buffer.toString("base64");
}
