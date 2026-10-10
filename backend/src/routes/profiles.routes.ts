import { Router } from "express";
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
import { isUuid, isDisplayId, resolveUserId } from "../utils/profileId.js";
import { realtimeService } from "../services/realtime.service.js";
import { notificationsService } from "../services/notifications.service.js";
import { quotaService } from "../services/quota.service.js";
import { sendInterestReceivedEmail } from "../config/mailer.js";

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
  viewer?: { id: string; role?: string; plan?: string },
  isConnected = false,
  conversationId?: string,
) {
  const completion = typeof row.profile_completion === "number" && row.profile_completion > 0
    ? row.profile_completion
    : computeProfileCompletion(row);

  const isSelf = viewer && viewer.id === row.id;
  const isAdmin = viewer && viewer.role === "admin";
  const viewerPlan = (viewer?.plan || "free").toLowerCase();
  const isPremiumViewer = viewerPlan === "silver" || viewerPlan === "gold" || viewerPlan === "platinum";

  // Privacy rule 1: Photo visibility (Show photos to premium members only)
  const rawPhotos = row.photos && row.photos.length > 0 ? row.photos : row.avatar_url ? [row.avatar_url] : [];
  let photos = rawPhotos;
  let photosLocked = false;
  if (row.preferences?.photo === true && !isSelf && !isAdmin && !isPremiumViewer) {
    photos = [];
    photosLocked = true;
  }

  // Privacy rule 2: Contact privacy (Hide number until accepted mutual interest)
  let contact = undefined;
  if (canViewContact && (row.mobile || row.whatsapp)) {
    if (row.preferences?.contact === true && !isSelf && !isAdmin && !row.hasMutualInterest) {
      contact = undefined;
    } else {
      contact = { mobile: row.mobile, whatsapp: row.whatsapp || row.mobile };
    }
  }

  // Privacy rule 3: Online status
  let lastActive = row.last_active;
  if (row.preferences?.online === false && !isSelf && !isAdmin) {
    lastActive = undefined;
  }

  return {
    id: row.id,
    displayId: row.display_id || undefined,
    fullName: row.full_name || "",
    age: row.age || 25,
    gender: row.gender || "male",
    photos,
    photosLocked,
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
    whatsapp: row.whatsapp || undefined,
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
    lastActive,
    shortlisted: isShortlisted,
    interestSent: isInterestSent,
    isConnected,
    conversationId,
    canViewContact: Boolean(contact),
    contact,
    profileCompletion: completion,
  };
}

async function attachShortlistAndInterest(
  userId: string | undefined,
  rows: any[],
  viewer?: { id: string; role?: string; plan?: string },
) {
  if (!userId || rows.length === 0) {
    return rows.map((r) => mapProfileRow(r, false, false, false, viewer, false, undefined));
  }

  const profileIds = rows.map((r) => r.id);
  const [shortRes, intRes, mutualRes, convRes] = await Promise.all([
    db.query(
      `SELECT target_profile_id FROM shortlists WHERE user_id = $1 AND target_profile_id = ANY($2)`,
      [userId, profileIds],
    ),
    db.query(
      `SELECT receiver_id FROM interests WHERE sender_id = $1 AND receiver_id = ANY($2)`,
      [userId, profileIds],
    ),
    db.query(
      `SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as other_id 
       FROM interests 
       WHERE status = 'accepted' AND ((sender_id = $1 AND receiver_id = ANY($2)) OR (receiver_id = $1 AND sender_id = ANY($2)))`,
      [userId, profileIds],
    ),
    db.query(
      `SELECT id, CASE WHEN user1_id = $1 THEN user2_id ELSE user1_id END as other_id 
       FROM conversations 
       WHERE (user1_id = $1 AND user2_id = ANY($2)) OR (user2_id = $1 AND user1_id = ANY($2))`,
      [userId, profileIds],
    ),
  ]);

  const shortlistedIds = new Set(shortRes.rows.map((x: any) => x.target_profile_id));
  const interestSentIds = new Set(intRes.rows.map((x: any) => x.receiver_id));
  const mutualIds = new Set(mutualRes.rows.map((x: any) => x.other_id));
  const convMap = new Map<string, string>(convRes.rows.map((x: any) => [x.other_id, x.id]));

  return rows.map((r) => {
    const isConn = mutualIds.has(r.id) || convMap.has(r.id);
    const convId = convMap.get(r.id);
    return mapProfileRow(
      r,
      shortlistedIds.has(r.id),
      interestSentIds.has(r.id),
      false,
      viewer,
      isConn,
      convId,
    );
  });
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

    const conditions: string[] = ["u.profile_status = 'approved'", "u.role != 'admin'"];
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
      const cleanQ = query.trim();
      conditions.push(`(u.full_name ILIKE $${paramIndex} OR pr.city ILIKE $${paramIndex} OR u.display_id ILIKE $${paramIndex})`);
      params.push(`%${cleanQ}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    let orderBy = "ORDER BY pr.last_active DESC";
    if (query && isDisplayId(query.trim())) {
      orderBy = `ORDER BY CASE WHEN u.display_id ILIKE '${query.trim()}' THEN 0 ELSE 1 END, pr.last_active DESC`;
    } else if (sort === "age_asc") {
      orderBy = "ORDER BY pr.age ASC";
    } else if (sort === "age_desc") {
      orderBy = "ORDER BY pr.age DESC";
    }

    // Count total query
    const countSql = `SELECT COUNT(*) FROM profiles pr JOIN users u ON pr.id = u.id ${whereClause}`;
    const countRes = await db.query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Fetch paginated records
    const listSql = `
      SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan, u.display_id, u.preferences
      FROM profiles pr
      JOIN users u ON pr.id = u.id
      ${whereClause}
      ${orderBy}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(size, offset);

    const { rows } = await db.query(listSql, params);

    const items = await attachShortlistAndInterest(req.user?.id, rows, req.user);
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
    const conditions: string[] = ["u.profile_status = 'approved'", "u.role != 'admin'"];
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
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan, u.display_id, u.preferences
       FROM profiles pr
       JOIN users u ON pr.id = u.id
       ${whereClause}
       ORDER BY pr.last_active DESC
       LIMIT 6`,
      params,
    );
    const items = await attachShortlistAndInterest(req.user?.id, rows, req.user);
    return res.json(items);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. Shortlisted profiles
profilesRouter.get("/shortlisted", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan, u.display_id, u.preferences
       FROM shortlists s
       JOIN profiles pr ON s.target_profile_id = pr.id
       JOIN users u ON pr.id = u.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [req.user!.id],
    );

    const items = await attachShortlistAndInterest(req.user!.id, rows, req.user);
    return res.json(items);
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
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan, u.profile_completion, u.display_id, u.preferences
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

    return res.json(mapProfileRow(rows[0], false, false, true, req.user));
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
      "whatsapp",
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
      whatsapp: "whatsapp",
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
            if (isNaN(birthDate.getTime())) {
              return res.status(400).json({ message: "Invalid date of birth format" });
            }
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

    // Sync users.avatar_url with the first photo in the photos array
    if (updates.photos !== undefined && Array.isArray(updates.photos)) {
      const primaryAvatar = updates.photos.length > 0 ? updates.photos[0] : null;
      await db.query(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [
        primaryAvatar,
        req.user!.id,
      ]);
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
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan, u.profile_completion, u.display_id, u.preferences
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

    return res.json(mapProfileRow(r, false, false, true, req.user));
  } catch (err: any) {
    if (err.code === "23505" && err.constraint?.includes("mobile")) {
      return res.status(400).json({ message: "This mobile number is already in use by another account" });
    }
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

    // Fallback: Save as a portable Data URI so it renders instantly on Vercel / serverless / any host without 404s
    if (!photoUrl) {
      photoUrl = `data:${contentType};base64,${cleanBase64}`;
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

// 8. Toggle shortlist (supports UUID and display ID)
profilesRouter.post("/:id/shortlist", requireAuth, async (req, res) => {
  try {
    const targetIdentifier = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id || "");
    const userId = req.user!.id;

    const targetUserId = await resolveUserId(targetIdentifier);
    if (!targetUserId) {
      return res.status(404).json({ message: "Target profile not found" });
    }
    if (targetUserId === userId) {
      return res.status(400).json({ message: "Cannot shortlist your own profile" });
    }

    const existing = await db.query(
      "SELECT id FROM shortlists WHERE user_id = $1 AND target_profile_id = $2",
      [userId, targetUserId],
    );

    if (existing.rows.length > 0) {
      await db.query("DELETE FROM shortlists WHERE id = $1", [existing.rows[0].id]);
      return res.json({ shortlisted: false });
    } else {
      await db.query("INSERT INTO shortlists (user_id, target_profile_id) VALUES ($1, $2)", [
        userId,
        targetUserId,
      ]);
      return res.json({ shortlisted: true });
    }
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 8b. Simulated view quota check for testing boundaries
profilesRouter.post("/view-quota-check", requireAuth, async (req, res) => {
  const simulatedCount = Number(req.body?.simulatedCount) || 0;
  const userPlan = (req.user!.plan || "free").toLowerCase();
  const limit = userPlan === "gold" || userPlan === "platinum" ? Infinity : userPlan === "silver" ? 200 : 50;
  if (simulatedCount > limit) {
    return res.status(403).json({
      code: "DAILY_VIEW_QUOTA_EXCEEDED",
      message: `Daily profile view limit of ${limit} exceeded on ${userPlan} plan`,
    });
  }
  return res.json({ allowed: true, limit, count: simulatedCount });
});

// 8c. Update preferences alias via PUT /me/preferences
profilesRouter.put("/me/preferences", requireAuth, async (req, res) => {
  const updates = req.body || {};
  const { rows: currentRows } = await db.query("SELECT preferences FROM users WHERE id = $1", [req.user!.id]);
  if (currentRows.length === 0) return res.status(404).json({ message: "User not found" });

  const currentPrefs = currentRows[0].preferences || {
    interests: true,
    messages: true,
    matches: false,
    photo: false,
    contact: true,
    online: true,
  };

  const allowedKeys = ["interests", "messages", "matches", "photo", "contact", "online"];
  const merged = { ...currentPrefs };
  for (const key of allowedKeys) {
    if (typeof updates[key] === "boolean") {
      merged[key] = updates[key];
    }
  }

  const { rows } = await db.query(
    "UPDATE users SET preferences = $1, updated_at = NOW() WHERE id = $2 RETURNING preferences",
    [JSON.stringify(merged), req.user!.id]
  );
  return res.json(rows[0]?.preferences || merged);
});

// 9. Send interest (supports UUID and display ID)
profilesRouter.post("/:id/interest", requireAuth, async (req, res) => {
  try {
    const receiverIdentifier = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id || "");
    const senderId = req.user!.id;
    const userPlan = req.user!.plan || "free";

    const receiverId = await resolveUserId(receiverIdentifier);
    if (!receiverId) {
      return res.status(404).json({ message: "Target profile not found" });
    }
    if (receiverId === senderId) {
      return res.status(400).json({ message: "Cannot send interest to yourself" });
    }

    // Check duplicate
    const existing = await db.query(
      "SELECT id FROM interests WHERE sender_id = $1 AND receiver_id = $2",
      [senderId, receiverId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Interest already sent to this member" });
    }

    // Check monthly interest quota
    const quotaCheck = await quotaService.checkInterestQuota(senderId, userPlan);
    if (!quotaCheck.allowed) {
      return res.status(403).json({
        code: quotaCheck.code,
        message: quotaCheck.message,
      });
    }

    await db.query(
      `INSERT INTO interests (sender_id, receiver_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (sender_id, receiver_id) DO UPDATE SET status = 'pending', updated_at = NOW()`,
      [senderId, receiverId],
    );

    // Emit real-time notification to receiver & send email
    void (async () => {
      try {
        const [senderRes, receiverRes] = await Promise.all([
          db.query(
            `SELECT u.full_name, u.display_id, u.avatar_url, pr.age, pr.occupation, pr.city
             FROM users u
             LEFT JOIN profiles pr ON u.id = pr.id
             WHERE u.id = $1`,
            [senderId]
          ),
          db.query(
            "SELECT full_name, email, preferences FROM users WHERE id = $1",
            [receiverId]
          ),
        ]);

        const sender = senderRes.rows[0];
        const senderName = sender?.full_name || "A member";
        const receiver = receiverRes.rows[0];

        realtimeService.broadcastInterestReceived(receiverId, {
          interestId: `int-${Date.now()}`,
          sender: {
            id: senderId,
            displayId: sender?.display_id,
            name: senderName,
            avatar: sender?.avatar_url,
          },
        });

        await notificationsService.create({
          userId: receiverId,
          type: "interest_received",
          title: "New Interest Request 💖",
          body: `${senderName} (${sender?.display_id || ""}) sent you an interest request.`,
          data: { senderId, displayId: sender?.display_id },
        });

        // Send email to receiver if email exists and user allows interest emails
        if (receiver && receiver.email) {
          const prefs = receiver.preferences || {};
          if (prefs.interests !== false) {
            await sendInterestReceivedEmail({
              to: receiver.email,
              receiverName: receiver.full_name || "Member",
              senderName,
              senderDisplayId: sender?.display_id || undefined,
              senderAge: sender?.age ? Number(sender.age) : undefined,
              senderOccupation: sender?.occupation || undefined,
              senderCity: sender?.city || undefined,
            });
          }
        }
      } catch (err: any) {
        console.warn("[Interest Notification Warning]", err.message);
      }
    })();

    return res.json({ sent: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 10. Get single profile by ID with authorized contact unlocking (supports UUID and display ID like 'P1', 'PA1')
profilesRouter.get("/:id", optionalAuth, async (req, res) => {
  try {
    const rawId = (Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id || "")).trim();
    if (!rawId) return res.status(400).json({ message: "Profile identifier is required" });

    const isTargetUuid = isUuid(rawId);

    const { rows } = await db.query(
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan, u.display_id, u.preferences
       FROM profiles pr
       JOIN users u ON pr.id = u.id
       WHERE ${isTargetUuid ? "pr.id = $1" : "u.display_id ILIKE $1"}
       LIMIT 1`,
      [rawId],
    );

    if (rows.length === 0) return res.status(404).json({ message: "Profile not found" });

    const targetUser = rows[0];
    const targetId = targetUser.id; // Canonical UUID

    let canViewContact = false;
    let isShortlisted = false;
    let isInterestSent = false;

    if (req.user) {
      const viewerId = req.user.id;
      const viewerPlan = req.user.plan || "free";

      // Enforce daily profile view quota if viewing another member
      if (viewerId !== targetId && req.user.role !== "admin") {
        const viewQuota = await quotaService.checkAndRecordProfileView(viewerId, targetId, viewerPlan);
        if (!viewQuota.allowed) {
          return res.status(403).json({
            code: viewQuota.code,
            message: viewQuota.message,
          });
        }
      }

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

        // Enforce monthly contact unlock quota
        if (canViewContact) {
          const contactQuota = await quotaService.checkAndRecordContactUnlock(viewerId, targetId, viewerPlan);
          if (!contactQuota.allowed) {
            canViewContact = false;
          }
        }
      }

      // Check shortlist, interest, mutual accepted interest status, and active conversation
      const [shortRes, intRes, mutualRes, convRes] = await Promise.all([
        db.query(
          "SELECT id FROM shortlists WHERE user_id = $1 AND target_profile_id = $2 LIMIT 1",
          [viewerId, targetId],
        ),
        db.query("SELECT id FROM interests WHERE sender_id = $1 AND receiver_id = $2 LIMIT 1", [
          viewerId,
          targetId,
        ]),
        db.query(
          `SELECT 1 FROM interests
           WHERE status = 'accepted' AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
           LIMIT 1`,
          [viewerId, targetId],
        ),
        db.query(
          `SELECT id FROM conversations
           WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
           LIMIT 1`,
          [viewerId, targetId],
        ),
      ]);

      isShortlisted = shortRes.rows.length > 0;
      isInterestSent = intRes.rows.length > 0;
      targetUser.hasMutualInterest = mutualRes.rows.length > 0;
      const isConnected = mutualRes.rows.length > 0 || convRes.rows.length > 0;
      const conversationId = convRes.rows[0]?.id;

      const viewer = req.user ? { id: req.user.id, role: req.user.role, plan: req.user.plan } : undefined;
      return res.json(
        mapProfileRow(
          targetUser,
          isShortlisted,
          isInterestSent,
          canViewContact,
          viewer,
          isConnected,
          conversationId,
        ),
      );
    }

    return res.json(
      mapProfileRow(
        targetUser,
        false,
        false,
        false,
        undefined,
        false,
        undefined,
      ),
    );
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 11. Report a profile (requires authentication)
profilesRouter.post("/:id/report", requireAuth, async (req, res) => {
  try {
    const rawId = (Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id || "")).trim();
    const { reason, description } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Reason for report is required" });
    }

    const isTargetUuid = isUuid(rawId);
    const userRes = await db.query(
      `SELECT id FROM users WHERE ${isTargetUuid ? "id = $1" : "display_id ILIKE $1"} LIMIT 1`,
      [rawId],
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: "Target profile not found" });
    }

    const reportedUserId = userRes.rows[0].id;
    const reportedById = req.user!.id;

    if (reportedUserId === reportedById) {
      return res.status(400).json({ message: "You cannot report your own profile" });
    }

    const reportText = description && description.trim() ? `${reason.trim()} — ${description.trim()}` : reason.trim();
    const { rows } = await db.query(
      `INSERT INTO reports (reported_user_id, reported_by_id, reason, status, created_at)
       VALUES ($1, $2, $3, 'open', NOW())
       RETURNING *`,
      [reportedUserId, reportedById, reportText],
    );

    return res.json({
      ok: true,
      reportId: rows[0].id,
      message: "Report submitted to moderation. Our safety team will review it promptly.",
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 18. Member ID Verification Submission
profilesRouter.post("/me/verify-id", requireAuth, async (req, res) => {
  try {
    const {
      documentType = "aadhaar",
      documentNumber = "",
      documentFrontUrl,
      documentBackUrl,
      selfieUrl,
    } = req.body;

    if (!documentFrontUrl) {
      return res.status(400).json({ message: "Front photo of your Government ID is required." });
    }

    const { rows } = await db.query(
      `INSERT INTO id_verifications (user_id, document_type, document_number, document_front_url, document_back_url, selfie_url, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
       RETURNING *`,
      [
        req.user!.id,
        documentType,
        documentNumber ? documentNumber.trim() : null,
        documentFrontUrl,
        documentBackUrl || null,
        selfieUrl || null,
      ],
    );

    return res.json({
      ok: true,
      verification: rows[0],
      message: "ID submitted successfully! Our trust & safety team will review it within 24 hours.",
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

profilesRouter.get("/me/verification-status", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, user_id, document_type, document_number, document_front_url, document_back_url, selfie_url, status, rejection_reason, reviewed_at, created_at
       FROM id_verifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user!.id],
    );

    return res.json({ verification: rows[0] || null });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});


