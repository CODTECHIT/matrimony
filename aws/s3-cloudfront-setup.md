# AWS S3 + CloudFront Infrastructure Setup Guide

This guide details how to configure **AWS S3** and **Amazon CloudFront** for media, photos, and video storage for **YFJ Matrimony**.

---

## 1. AWS S3 Bucket Setup

1. **Bucket Name**: e.g., `yfj-matrimony-media-prod`
2. **Region**: Choose your closest region (e.g., `ap-south-1` for Mumbai, India).
3. **Block Public Access**:
   - **Enable all "Block Public Access" checkboxes**.
   - _Security Note_: Photos and videos will be securely accessed **only through CloudFront Origin Access Control (OAC)**, not directly from public S3 URLs.

4. **CORS Configuration**:
   Go to your S3 Bucket -> **Permissions** -> **Cross-origin resource sharing (CORS)** -> Click **Edit** and paste:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT", "POST", "GET", "HEAD"],
       "AllowedOrigins": [
         "http://localhost:8080",
         "http://localhost:5173",
         "https://*.vercel.app",
         "https://yfjmatrimony.com"
       ],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

---

## 2. Amazon CloudFront CDN Distribution Setup

1. **Origin Domain**: Select your S3 bucket (`yfj-matrimony-media-prod.s3.ap-south-1.amazonaws.com`).
2. **Origin Access**:
   - Select **Origin access control settings (recommended)**.
   - Click **Create control setting** and choose your bucket.
3. **Default Cache Behavior**:
   - **Viewer Protocol Policy**: `Redirect HTTP to HTTPS`.
   - **Allowed HTTP Methods**: `GET, HEAD, OPTIONS`.
   - **Cache Policy**: `CachingOptimized`.
4. **Deploy**:
   - Click **Create Distribution**.
   - AWS will give you an S3 Bucket Policy snippet. Copy and paste that policy into your S3 Bucket's **Bucket Policy** tab to authorize CloudFront OAC.
5. **Your CloudFront Domain**:
   - AWS will assign a domain like: `https://d1234abcd56789.cloudfront.net`.
   - Save this as your `AWS_CLOUDFRONT_DOMAIN` environment variable.

---

## 3. IAM Policy for Backend (AWS App Runner)

Create an IAM User / Role for your App Runner backend with the following inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::yfj-matrimony-media-prod/*"
    }
  ]
}
```
