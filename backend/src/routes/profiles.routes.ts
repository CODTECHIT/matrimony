import { Router } from "express";
import fs from "fs";
import path from "path";
import { db } from "../config/db.js";
import {
  createPresignedUploadUrl,
  s3Client,
  bucketName,
  cloudFrontDomain,
  region,
} from "../config/aws.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware.js";

export const profilesRouter = Router();

export function computeProfileCompletion(row: any): number {
  let score = 0;
  // Basic info (name, gender, age/dob, marital status): 20%
  if (row.full_name && (row.age || row.date_of_birth) && row.marital_status) {
    score += 20;
  }
  // Photos (at least 1 photo): 20%
  if ((row.photos && row.photos.length > 0) || row.avatar_url) {
    score += 20;
  }
  // Education & Career: 20%
  if (row.education || row.occupation) {
    score += 20;
  }
  // Community / Religion: 15%
  if (row.religion || row.caste || row.mother_tongue) {
    score += 15;
  }
  // Location: 10%
  if (row.city || row.state) {
    score += 10;
  }
  // Family: 10%
  if (
    row.family_type ||
    row.father_occupation ||
    row.mother_occupation ||
    row.siblings
  ) {
    score += 10;
  }
  // About bio: 5%
  if (row.about && typeof row.about === "string" && row.about.trim().length > 0) {
    score += 5;
  }
  return Math.min(100, Math.max(score, 20));
}

function mapProfileRow(
  row: any,
  isShortlisted = false,
  isInterestSent = false,
  canViewContact = false,
) {
  const completion = typeof row.profile_completion === "number" && row.profile_completion > 0
    ? row.profile_completion
    : computeProfileCompletion(row);

  return {
    id: row.id,
    fullName: row.full_name || "",
    age: row.age || 25,
    gender: row.gender || "male",
    photos:
      row.photos && row.photos.length > 0 ? row.photos : row.avatar_url ? [row.avatar_url] : [],
    videos: row.videos || [],
    verified: Boolean(row.verified),
    about: row.about || "",
    height: row.height || "",
    religion: row.religion || "",
    caste: row.caste || "",
    motherTongue: row.mother_tongue || "",
    maritalStatus: row.marital_status || "never_married",
    education: row.education || "",
    occupation: row.occupation || "",
    employmentStatus: row.employment_status || "",
    incomeRange: row.income_range || "",
    city: row.city || "",
    state: row.state || "",
    country: row.country || "India",
    dateOfBirth: row.date_of_birth
      ? (typeof row.date_of_birth === "string"
          ? row.date_of_birth
          : row.date_of_birth.toISOString()
        ).split("T")[0]
      : undefined,
    family: {
      fatherOccupation: row.father_occupation,
      motherOccupation: row.mother_occupation,
      siblings: row.siblings,
      familyType: row.family_type,
      familyValues: row.family_values,
    },
    lastActive: row.last_active,
    shortlisted: isShortlisted,
    interestSent: isInterestSent,
    canViewContact,
    profileCompletion: completion,
    contact:
      canViewContact && (row.mobile || row.whatsapp)
        ? { mobile: row.mobile, whatsapp: row.whatsapp || row.mobile }
        : undefined,
  };
}

async function attachShortlistAndInterest(userId: string | undefined, rows: any[]) {
  if (!userId || rows.length === 0) {
    return rows.map((r) => mapProfileRow(r, false, false, false));
  }

  const profileIds = rows.map((r) => r.id);
  const [shortRes, intRes] = await Promise.all([
    db.query(
      `SELECT target_profile_id FROM shortlists WHERE user_id = $1 AND target_profile_id = ANY($2)`,
      [userId, profileIds],
    ),
    db.query(
      `SELECT receiver_id FROM interests WHERE sender_id = $1 AND receiver_id = ANY($2)`,
      [userId, profileIds],
    ),
  ]);

  const shortlistedIds = new Set(shortRes.rows.map((x: any) => x.target_profile_id));
  const interestSentIds = new Set(intRes.rows.map((x: any) => x.receiver_id));

  return rows.map((r) =>
    mapProfileRow(r, shortlistedIds.has(r.id), interestSentIds.has(r.id), false),
  );
}

// 1. List profiles with dynamic filters (excludes own profile, prioritizes matches)
profilesRouter.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      query,
      gender,
      ageMin,
      ageMax,
      religion,
      caste,
      maritalStatus,
      city,
      sort,
      page = "1",
      pageSize = "12",
    } = req.query as Record<string, string>;

    const p = Math.max(1, parseInt(page, 10));
    const size = Math.max(1, parseInt(pageSize, 10));
    const offset = (p - 1) * size;

    const conditions: string[] = ["u.profile_status != 'blocked'"];
    const params: any[] = [];
    let paramIndex = 1;

    // Never show the current logged-in user in matrimonial match browse
    if (req.user?.id) {
      conditions.push(`pr.id != $${paramIndex++}`);
      params.push(req.user.id);
    }

    // Filter by requested gender or default to opposite gender for the logged-in member
    const targetGender = gender
      ? gender.toLowerCase()
      : req.user?.gender
        ? req.user.gender.toLowerCase() === "male"
          ? "female"
          : "male"
        : undefined;

    if (targetGender) {
      conditions.push(`u.gender = $${paramIndex++}`);
      params.push(targetGender);
    }
    if (ageMin) {
      conditions.push(`pr.age >= $${paramIndex++}`);
      params.push(parseInt(ageMin, 10));
    }
    if (ageMax) {
      conditions.push(`pr.age <= $${paramIndex++}`);
      params.push(parseInt(ageMax, 10));
    }
    if (religion) {
      conditions.push(`pr.religion ILIKE $${paramIndex++}`);
      params.push(`%${religion}%`);
    }
    if (caste) {
      conditions.push(`pr.caste ILIKE $${paramIndex++}`);
      params.push(`%${caste}%`);
    }
    if (maritalStatus) {
      conditions.push(`pr.marital_status = $${paramIndex++}`);
      params.push(maritalStatus);
    }
    if (city) {
      conditions.push(`pr.city ILIKE $${paramIndex++}`);
      params.push(`%${city}%`);
    }
    if (query) {
      conditions.push(`(u.full_name ILIKE $${paramIndex} OR pr.city ILIKE $${paramIndex})`);
      params.push(`%${query}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    let orderBy = "ORDER BY pr.last_active DESC";
    if (sort === "age_asc") orderBy = "ORDER BY pr.age ASC";
    if (sort === "age_desc") orderBy = "ORDER BY pr.age DESC";

    // Count total query
    const countSql = `SELECT COUNT(*) FROM profiles pr JOIN users u ON pr.id = u.id ${whereClause}`;
    const countRes = await db.query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Fetch paginated records
    const listSql = `
      SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan
      FROM profiles pr
      JOIN users u ON pr.id = u.id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(size, offset);

    const { rows } = await db.query(listSql, params);

    const items = await attachShortlistAndInterest(req.user?.id, rows);
    return res.json({
      items,
      page: p,
      pageSize: size,
      total,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. Recommended profiles (excludes own profile, prioritizes matching gender)
profilesRouter.get("/recommended", optionalAuth, async (req, res) => {
  try {
    const conditions: string[] = ["u.profile_status != 'blocked'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (req.user?.id) {
      conditions.push(`pr.id != $${paramIndex++}`);
      params.push(req.user.id);
    }

    if (req.user?.gender) {
      const targetGender = req.user.gender.toLowerCase() === "male" ? "female" : "male";
      conditions.push(`u.gender = $${paramIndex++}`);
      params.push(targetGender);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const { rows } = await db.query(
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan
       FROM profiles pr
       JOIN users u ON pr.id = u.id
       ${whereClause}
       ORDER BY pr.last_active DESC
       LIMIT 6`,
      params,
    );
    const items = await attachShortlistAndInterest(req.user?.id, rows);
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. Shortlisted profiles
profilesRouter.get("/shortlisted", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan
       FROM shortlists s
       JOIN profiles pr ON s.target_profile_id = pr.id
       JOIN users u ON pr.id = u.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user!.id],
    );

    const profileIds = rows.map((r) => r.id);
    let interestSentIds = new Set<string>();
    if (profileIds.length > 0) {
      const intRes = await db.query(
        `SELECT receiver_id FROM interests WHERE sender_id = $1 AND receiver_id = ANY($2)`,
        [req.user!.id, profileIds],
      );
      interestSentIds = new Set(intRes.rows.map((x: any) => x.receiver_id));
    }
    return res.json(
      rows.map((r) => mapProfileRow(r, true, interestSentIds.has(r.id), false)),
    );
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 4. Current user's profile
profilesRouter.get("/me", requireAuth, async (req, res) => {
  try {
    // Ensure profile row exists
    await db.query(
      `INSERT INTO profiles (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`,
      [req.user!.id],
    );

    const { rows } = await db.query(
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan, u.profile_completion
       FROM profiles pr
       JOIN users u ON pr.id = u.id
       WHERE pr.id = $1`,
      [req.user!.id],
    );

    if (rows.length === 0) return res.status(404).json({ message: "Profile not found" });

    const completion = computeProfileCompletion(rows[0]);
    if (rows[0].profile_completion !== completion) {
      await db.query(`UPDATE users SET profile_completion = $1 WHERE id = $2`, [
        completion,
        req.user!.id,
      ]);
      rows[0].profile_completion = completion;
    }

    return res.json(mapProfileRow(rows[0], false, false, true));
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 5. Update current user's profile
profilesRouter.patch("/me", requireAuth, async (req, res) => {
  try {
    const updates = req.body;
    const allowedFields = [
      "about",
      "height",
      "religion",
      "caste",
      "motherTongue",
      "maritalStatus",
      "dateOfBirth",
      "education",
      "occupation",
      "employmentStatus",
      "incomeRange",
      "city",
      "state",
      "country",
      "fatherOccupation",
      "motherOccupation",
      "siblings",
      "familyType",
      "familyValues",
      "photos",
      "videos",
    ];

    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const columnMap: Record<string, string> = {
      about: "about",
      height: "height",
      religion: "religion",
      caste: "caste",
      motherTongue: "mother_tongue",
      maritalStatus: "marital_status",
      dateOfBirth: "date_of_birth",
      education: "education",
      occupation: "occupation",
      employmentStatus: "employment_status",
      incomeRange: "income_range",
      city: "city",
      state: "state",
      country: "country",
      fatherOccupation: "father_occupation",
      motherOccupation: "mother_occupation",
      siblings: "siblings",
      familyType: "family_type",
      familyValues: "family_values",
      photos: "photos",
      videos: "videos",
    };

    // Ensure profiles record exists for this user
    await db.query(`INSERT INTO profiles (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, [
      req.user!.id,
    ]);

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        let val = updates[key];

        // Format marital status to match database check constraint (e.g. "Never married" -> "never_married")
        if (key === "maritalStatus" && typeof val === "string") {
          val = val.toLowerCase().replace(/\s+/g, "_");
        }

        // Handle date_of_birth and auto-calculate age
        if (key === "dateOfBirth") {
          if (!val || val === "") {
            val = null;
          } else {
            const birthDate = new Date(val);
            if (!isNaN(birthDate.getTime())) {
              const today = new Date();
              let calculatedAge = today.getFullYear() - birthDate.getFullYear();
              const m = today.getMonth() - birthDate.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--;
              }
              if (calculatedAge >= 18 && calculatedAge <= 80) {
                setClauses.push(`age = $${paramIndex++}`);
                params.push(calculatedAge);
              }
            }
          }
        }

        setClauses.push(`${columnMap[key]} = $${paramIndex++}`);
        params.push(val);
      }
    }

    if (setClauses.length > 0) {
      params.push(req.user!.id);
      await db.query(
        `UPDATE profiles SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`,
        params,
      );
    }

    // Update full_name on users table if provided
    if (updates.fullName && typeof updates.fullName === "string") {
      await db.query(`UPDATE users SET full_name = $1 WHERE id = $2`, [
        updates.fullName.trim(),
        req.user!.id,
      ]);
    }

    // Update gender on users table if provided
    if (updates.gender && typeof updates.gender === "string") {
      await db.query(`UPDATE users SET gender = $1 WHERE id = $2`, [
        updates.gender.trim().toLowerCase(),
        req.user!.id,
      ]);
    }

    // Update mobile on users table if provided
    if (updates.mobile && typeof updates.mobile === "string" && updates.mobile.trim()) {
      await db.query(`UPDATE users SET mobile = $1 WHERE id = $2`, [
        updates.mobile.trim(),
        req.user!.id,
      ]);
    }

    // Fetch updated profile
    const { rows } = await db.query(
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan, u.profile_completion
       FROM profiles pr
       JOIN users u ON pr.id = u.id
       WHERE pr.id = $1`,
      [req.user!.id],
    );

    const r = rows[0];
    const finalCompletion = computeProfileCompletion(r);

    await db.query(`UPDATE users SET profile_completion = $1 WHERE id = $2`, [
      finalCompletion,
      req.user!.id,
    ]);
    r.profile_completion = finalCompletion;

    return res.json(mapProfileRow(r, false, false, true));
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 6. Request Presigned S3 Upload URL (Photos & Videos)
profilesRouter.post("/me/photos/presign", requireAuth, async (req, res) => {
  try {
    const { fileName, contentType } = req.body;
    if (!fileName || !contentType) {
      return res.status(400).json({ message: "fileName and contentType are required" });
    }

    const result = await createPresignedUploadUrl(req.user!.id, fileName, contentType, "photo");

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to create S3 presigned URL" });
  }
});

profilesRouter.post("/me/media/presign", requireAuth, async (req, res) => {
  try {
    const { fileName, contentType, mediaType = "photo" } = req.body;
    if (!fileName || !contentType) {
      return res.status(400).json({ message: "fileName and contentType are required" });
    }

    const result = await createPresignedUploadUrl(
      req.user!.id,
      fileName,
      contentType,
      mediaType === "video" ? "video" : "photo",
    );

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to create S3 presigned URL" });
  }
});

// 7. Direct photo upload (supports S3 with automatic fallback to local persistent disk storage)
profilesRouter.post("/me/photos/upload", requireAuth, async (req, res) => {
  try {
    const { fileName, contentType = "image/jpeg", base64 } = req.body;
    if (!base64) {
      return res.status(400).json({ message: "Photo data (base64) is required" });
    }

    // Strip data URI header if present
    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ message: "Photo size exceeds the 10MB limit." });
    }

    const sanitizedFileName = (fileName || "photo.jpg").replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `profiles/${req.user!.id}/photos/${Date.now()}-${sanitizedFileName}`;
    let photoUrl = "";

    // Attempt direct S3 upload if credentials exist
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: contentType,
          }),
        );
        photoUrl = cloudFrontDomain
          ? `${cloudFrontDomain}/${key}`
          : `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
      } catch (s3Err: any) {
        console.warn(
          "[Photo Upload Warning] S3 upload failed:",
          s3Err.message,
          "Falling back to local disk storage.",
        );
      }
    }

    // Fallback: Save to local uploads/ directory served statically by Express
    if (!photoUrl) {
      const uploadDir = path.join(process.cwd(), "uploads", "photos");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const localFileName = `${Date.now()}-${sanitizedFileName}`;
      const localFilePath = path.join(uploadDir, localFileName);
      fs.writeFileSync(localFilePath, buffer);
      photoUrl = `/uploads/photos/${localFileName}`;
    }

    // Update profiles table: append photo to array
    await db.query(`UPDATE profiles SET photos = array_append(photos, $1) WHERE id = $2`, [
      photoUrl,
      req.user!.id,
    ]);

    // Also update users.avatar_url if none exists yet
    await db.query(`UPDATE users SET avatar_url = COALESCE(avatar_url, $1) WHERE id = $2`, [
      photoUrl,
      req.user!.id,
    ]);

    return res.json({ url: photoUrl });
  } catch (err: any) {
    console.error("[Photo Upload Error]", err);
    return res.status(500).json({ message: err.message || "Failed to process photo upload" });
  }
});

// Delete photo from profile
profilesRouter.delete("/me/photos", requireAuth, async (req, res) => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl) return res.status(400).json({ message: "photoUrl required" });

    await db.query(`UPDATE profiles SET photos = array_remove(photos, $1) WHERE id = $2`, [
      photoUrl,
      req.user!.id,
    ]);

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 8. Save uploaded photo / video to user profile (URL registration)
profilesRouter.post("/me/photos", requireAuth, async (req, res) => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl) return res.status(400).json({ message: "photoUrl required" });

    await db.query(`UPDATE profiles SET photos = array_append(photos, $1) WHERE id = $2`, [
      photoUrl,
      req.user!.id,
    ]);

    return res.json({ url: photoUrl });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

profilesRouter.post("/me/videos", requireAuth, async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) return res.status(400).json({ message: "videoUrl required" });

    await db.query(`UPDATE profiles SET videos = array_append(videos, $1) WHERE id = $2`, [
      videoUrl,
      req.user!.id,
    ]);

    return res.json({ url: videoUrl });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 8. Toggle shortlist
profilesRouter.post("/:id/shortlist", requireAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.user!.id;

    const existing = await db.query(
      "SELECT id FROM shortlists WHERE user_id = $1 AND target_profile_id = $2",
      [userId, targetId],
    );

    if (existing.rows.length > 0) {
      await db.query("DELETE FROM shortlists WHERE id = $1", [existing.rows[0].id]);
      return res.json({ shortlisted: false });
    } else {
      await db.query("INSERT INTO shortlists (user_id, target_profile_id) VALUES ($1, $2)", [
        userId,
        targetId,
      ]);
      return res.json({ shortlisted: true });
    }
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 9. Send interest
profilesRouter.post("/:id/interest", requireAuth, async (req, res) => {
  try {
    const receiverId = req.params.id;
    const senderId = req.user!.id;

    await db.query(
      `INSERT INTO interests (sender_id, receiver_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (sender_id, receiver_id) DO UPDATE SET status = 'pending', updated_at = NOW()`,
      [senderId, receiverId],
    );

    return res.json({ sent: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 10. Get single profile by ID with authorized contact unlocking
profilesRouter.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan
       FROM profiles pr
       JOIN users u ON pr.id = u.id
       WHERE pr.id = $1`,
      [req.params.id],
    );

    if (rows.length === 0) return res.status(404).json({ message: "Profile not found" });

    let canViewContact = false;
    let isShortlisted = false;
    let isInterestSent = false;

    if (req.user) {
      const viewerId = req.user.id;
      const targetId = req.params.id;

      // 1. Viewing own profile or admin viewer
      if (viewerId === targetId || req.user.role === "admin") {
        canViewContact = true;
      } else {
        // 2. Check active subscription with contact view permissions
        const subRes = await db.query(
          `SELECT permissions FROM subscriptions
           WHERE user_id = $1 AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
           ORDER BY created_at DESC LIMIT 1`,
          [viewerId],
        );

        if (subRes.rows.length > 0) {
          const perms = subRes.rows[0].permissions;
          if (perms && (perms.canViewContacts === true || perms.canViewContacts === "true")) {
            canViewContact = true;
          }
        }
      }

      // Check shortlist and interest status
      const [shortRes, intRes] = await Promise.all([
        db.query(
          "SELECT id FROM shortlists WHERE user_id = $1 AND target_profile_id = $2 LIMIT 1",
          [viewerId, targetId],
        ),
        db.query("SELECT id FROM interests WHERE sender_id = $1 AND receiver_id = $2 LIMIT 1", [
          viewerId,
          targetId,
        ]),
      ]);

      isShortlisted = shortRes.rows.length > 0;
      isInterestSent = intRes.rows.length > 0;
    }

    return res.json(mapProfileRow(rows[0], isShortlisted, isInterestSent, canViewContact));
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});
