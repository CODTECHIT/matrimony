import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

const region = process.env.AWS_REGION || "ap-south-1";
const bucketName = process.env.AWS_S3_BUCKET_NAME || "yfj-matrimony-media-prod";
const cloudFrontDomain = (process.env.AWS_CLOUDFRONT_DOMAIN || "").replace(/\/$/, "");

export const s3Client = new S3Client({
  region,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export async function createPresignedUploadUrl(
  userId: string,
  fileName: string,
  contentType: string,
): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `profiles/${userId}/${Date.now()}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  // Presigned URL valid for 10 minutes
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });

  // If CloudFront is configured, deliver through CloudFront CDN; otherwise fallback to S3 URL
  const fileUrl = cloudFrontDomain
    ? `${cloudFrontDomain}/${key}`
    : `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl, key };
}
