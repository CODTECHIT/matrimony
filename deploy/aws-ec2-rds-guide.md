# Production Deployment Guide: AWS EC2 + AWS RDS (PostgreSQL) + AWS S3

This guide covers setting up your infrastructure on AWS:

1. **AWS RDS (PostgreSQL)** for the relational database.
2. **AWS EC2** for hosting the Node.js / Express REST API.
3. **AWS S3** for media, photos, and video reels storage.

---

## 1. AWS RDS PostgreSQL Database Setup

### Step 1.1: Create Security Group for RDS

1. In AWS Console, go to **VPC** -> **Security Groups** -> **Create Security Group**.
2. **Name**: `yfj-rds-sg`
3. **VPC**: Select your default VPC (or custom VPC).
4. **Inbound Rules**:
   - **Type**: `PostgreSQL` (Port 5432)
   - **Source**: Select `Custom` and choose your EC2 Security Group (`yfj-ec2-sg`) once created.
     _(This ensures nobody on the public internet can reach your database directly)._

### Step 1.2: Launch RDS PostgreSQL Instance

1. Go to **AWS RDS** -> **Databases** -> **Create database**.
2. **Engine**: `PostgreSQL` (Version 16.x or 15.x recommended).
3. **Template**: `Production` (or `Free Tier` for testing).
4. **DB Instance Identifier**: `yfj-matrimony-db`
5. **Master Username**: `postgres`
6. **Master Password**: Choose a strong password and save it securely.
7. **Instance Configuration**: `db.t4g.micro` or `db.t4g.small` (burstable, cost-effective).
8. **Connectivity**:
   - **VPC**: Same VPC as your EC2 instance.
   - **Public Access**: `No` (for security; only EC2 inside the VPC can connect).
   - **VPC Security Group**: Select `yfj-rds-sg`.
9. **Additional Configuration**:
   - **Initial Database Name**: `yfj_matrimony`
10. Click **Create Database**.

### Step 1.3: Run Schema & Seeds on RDS

Connect from your local machine (if public access is temporarily enabled or via EC2 bastion / SSH tunnel):

```bash
# Connect using psql:
psql -h <your-rds-endpoint>.ap-south-1.rds.amazonaws.com -U postgres -d yfj_matrimony

# Run schema and seeds:
\i db/schema.sql
\i db/seed.sql
```

---

## 2. AWS S3 Bucket Setup (Photos & Videos)

1. Go to **Amazon S3** -> **Create bucket**.
2. **Bucket Name**: e.g., `yfj-matrimony-media-prod`
3. **Region**: `ap-south-1` (Mumbai) or your chosen region.
4. **Block Public Access**: Keep all enabled (S3 presigned URLs will handle secure upload and access).
5. **CORS Configuration**:
   Bucket -> **Permissions** -> **Cross-origin resource sharing (CORS)** -> Paste:
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

## 3. AWS EC2 Instance Setup (Backend API)

### Step 3.1: Create EC2 Security Group

1. Go to **EC2** -> **Security Groups** -> **Create Security Group**.
2. **Name**: `yfj-ec2-sg`
3. **Inbound Rules**:
   - **SSH** (Port 22): My IP
   - **HTTP** (Port 80): `0.0.0.0/0`
   - **HTTPS** (Port 443): `0.0.0.0/0`
   - _(Optional: Custom TCP 5000 for direct testing)_

### Step 3.2: Create IAM Role for EC2 (S3 Access)

1. Go to **IAM** -> **Roles** -> **Create role**.
2. **Trusted Entity**: `AWS Service` -> `EC2`.
3. **Permissions**: Create policy with S3 permissions:
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
4. **Role Name**: `yfj-ec2-s3-role`.

### Step 3.3: Launch EC2 Instance

1. Go to **EC2** -> **Launch Instance**.
2. **Name**: `yfj-matrimony-backend`
3. **AMI**: `Ubuntu Server 24.04 LTS` (64-bit x86 or ARM).
4. **Instance Type**: `t3.small` or `t4g.small` (2 vCPU, 2 GB RAM).
5. **Key Pair**: Select or create an SSH key pair (`.pem`).
6. **Network Settings**:
   - Select the same VPC as RDS.
   - **Security Group**: Select `yfj-ec2-sg`.
7. **Advanced Details**:
   - **IAM Instance Profile**: Select `yfj-ec2-s3-role`.
8. Click **Launch Instance**.

### Step 3.4: Allocate Elastic IP

1. **EC2** -> **Network & Security** -> **Elastic IPs** -> **Allocate Elastic IP**.
2. Actions -> **Associate Elastic IP** -> Choose your newly launched EC2 instance.
3. Point your domain's DNS `A` record (e.g., `api.yfjmatrimony.com`) to this Elastic IP.

---

## 4. Deploying Backend to EC2

### Step 4.1: SSH into EC2

```bash
ssh -i "your-key.pem" ubuntu@<your-ec2-elastic-ip>
```

### Step 4.2: Run Bootstrap Script

```bash
# Download and run the automated setup script
curl -fsSL https://raw.githubusercontent.com/your-username/matrimony/master/deploy/ec2-setup.sh -o ec2-setup.sh
bash ec2-setup.sh
```

### Step 4.3: Clone Repository and Configure

```bash
git clone <your-repo-url> matrimony
cd matrimony/backend

# Create production .env
cp .env.example .env
nano .env
```

In `.env`, configure:

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=your_production_secret_key_32_characters_long
CORS_ORIGIN=https://yfjmatrimony.com,https://your-app.vercel.app

DATABASE_URL=postgresql://postgres:<your-password>@<your-rds-endpoint>.ap-south-1.rds.amazonaws.com:5432/yfj_matrimony?sslmode=require

AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=yfj-matrimony-media-prod
```

_(Notice: AWS credentials can be left blank because EC2 has the `yfj-ec2-s3-role` IAM profile attached!)_

### Step 4.4: Build and Start API with PM2

```bash
npm install
npm run build

# Start cluster mode using PM2
pm2 start ecosystem.config.cjs
pm2 save
```

### Step 4.5: Setup Nginx and Free SSL (Certbot)

```bash
# Copy Nginx config
sudo cp ../deploy/nginx.conf /etc/nginx/sites-available/yfj
sudo ln -s /etc/nginx/sites-available/yfj /etc/nginx/sites-enabled/

# Test and reload Nginx
sudo nginx -t
sudo systemctl restart nginx

# Obtain free automatic SSL certificate via Let's Encrypt
sudo certbot --nginx -d api.yfjmatrimony.com
```

### Step 4.6: Verify Health Check

Open your browser or run:

```bash
curl https://api.yfjmatrimony.com/health
# Returns: {"status":"healthy","timestamp":"2026-..."}
```

---

## 5. Connecting Frontend (Vercel) to EC2 Backend

In your Vercel project settings:

- **Environment Variables**:
  - `VITE_API_BASE_URL`: `https://api.yfjmatrimony.com/api`
  - `VITE_USE_MOCK_API`: `false`
- Redeploy frontend on Vercel. Your full application is now live on **AWS EC2 + AWS RDS + AWS S3 + Vercel**!
