import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

export const region = process.env.AWS_REGION || "ap-south-1";
export const bucketName = process.env.AWS_S3_BUCKET_NAME || "yfj-matrimony-media-prod";
export const cloudFrontDomain = (process.env.AWS_CLOUDFRONT_DOMAIN || "").replace(/\/$/, "");

// If running on EC2 with IAM Instance Profile, AWS credentials are automatically resolved.
// Otherwise, AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY from .env are used.
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

export type MediaType = "photo" | "video";

export async function createPresignedUploadUrl(
  userId: string,
  fileName: string,
  contentType: string,
  mediaType: MediaType = "photo",
): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
  // Validate MIME type
  const allowedPhotos = ["image/jpeg", "image/png", "image/webp", "image/heic"];
  const allowedVideos = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];

  if (mediaType === "photo" && !allowedPhotos.includes(contentType)) {
    throw new Error(`Unsupported photo format: ${contentType}. Allowed: JPEG, PNG, WEBP.`);
  }

  if (mediaType === "video" && !allowedVideos.includes(contentType)) {
    throw new Error(`Unsupported video format: ${contentType}. Allowed: MP4, WEBM, MOV.`);
  }

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const folder = mediaType === "video" ? "videos" : "photos";
  const key = `profiles/${userId}/${folder}/${Date.now()}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  // Videos get 30 min presigned expiration for larger upload sizes; photos get 10 mins
  const expiresIn = mediaType === "video" ? 1800 : 600;
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  // If CloudFront is configured, use CDN URL; otherwise deliver directly from S3
  const fileUrl = cloudFrontDomain
    ? `${cloudFrontDomain}/${key}`
    : `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

  return { uploadUrl, fileUrl, key };
}
