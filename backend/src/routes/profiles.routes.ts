import { Router } from "express";
import { db } from "../config/db.js";
import { createPresignedUploadUrl } from "../config/aws.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const profilesRouter = Router();

function mapProfileRow(row: any, isShortlisted = false, isInterestSent = false) {
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
    canViewContact: false,
    contact: row.whatsapp ? { mobile: row.mobile, whatsapp: row.whatsapp } : undefined,
  };
}

// 1. List profiles with dynamic filters
profilesRouter.get("/", async (req, res) => {
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

    if (gender) {
      conditions.push(`u.gender = $${paramIndex++}`);
      params.push(gender.toLowerCase());
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

    return res.json({
      items: rows.map((r) => mapProfileRow(r)),
      page: p,
      pageSize: size,
      total,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. Recommended profiles
profilesRouter.get("/recommended", async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan
       FROM profiles pr
       JOIN users u ON pr.id = u.id
       WHERE u.profile_status != 'blocked'
       ORDER BY pr.last_active DESC
       LIMIT 6`,
    );
    return res.json(rows.map((r) => mapProfileRow(r)));
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
    return res.json(rows.map((r) => mapProfileRow(r, true)));
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 4. Current user's profile
profilesRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan
       FROM profiles pr
       JOIN users u ON pr.id = u.id
       WHERE pr.id = $1`,
      [req.user!.id],
    );

    if (rows.length === 0) return res.status(404).json({ message: "Profile not found" });
    return res.json(mapProfileRow(rows[0]));
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
      "religion",
      "caste",
      "motherTongue",
      "education",
      "occupation",
      "incomeRange",
      "city",
      "state",
      "photos",
      "videos",
    ];

    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const columnMap: Record<string, string> = {
      about: "about",
      religion: "religion",
      caste: "caste",
      motherTongue: "mother_tongue",
      education: "education",
      occupation: "occupation",
      incomeRange: "income_range",
      city: "city",
      state: "state",
      photos: "photos",
      videos: "videos",
    };

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        setClauses.push(`${columnMap[key]} = $${paramIndex++}`);
        params.push(updates[key]);
      }
    }

    if (setClauses.length > 0) {
      params.push(req.user!.id);
      await db.query(
        `UPDATE profiles SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`,
        params,
      );
    }

    const { rows } = await db.query(
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan
       FROM profiles pr
       JOIN users u ON pr.id = u.id
       WHERE pr.id = $1`,
      [req.user!.id],
    );

    return res.json(mapProfileRow(rows[0]));
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

// 7. Save uploaded photo / video to user profile
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

// 10. Get single profile by ID
profilesRouter.get("/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pr.*, u.full_name, u.gender, u.mobile, u.avatar_url, u.plan
       FROM profiles pr
       JOIN users u ON pr.id = u.id
       WHERE pr.id = $1`,
      [req.params.id],
    );

    if (rows.length === 0) return res.status(404).json({ message: "Profile not found" });
    return res.json(mapProfileRow(rows[0]));
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});
