import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { User } from "~/models/user.server";

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

export const MAX_FILE_SIZE = 1 * 1024;
export const ALLOWED_FILE_TYPES = ["text/plain"];
