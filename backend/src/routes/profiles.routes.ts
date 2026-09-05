import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { createPresignedUploadUrl } from "../config/aws.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const profilesRouter = Router();

function mapProfileRow(
  row: any,
  currentUserId?: string,
  shortlists?: Set<string>,
  interests?: Set<string>,
) {
  const user = row.users || {};
  return {
    id: row.id,
    fullName: user.full_name || "",
    age: row.age || 25,
    gender: user.gender || "male",
    photos: row.photos || (user.avatar_url ? [user.avatar_url] : []),
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
    shortlisted: shortlists ? shortlists.has(row.id) : false,
    interestSent: interests ? interests.has(row.id) : false,
    canViewContact: false,
    contact: row.whatsapp ? { mobile: user.mobile, whatsapp: row.whatsapp } : undefined,
  };
}

// 1. List profiles with filtering
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

    let dbQuery = supabase
      .from("profiles")
      .select("*, users!inner(full_name, gender, mobile, avatar_url, plan)", { count: "exact" });

    if (gender) {
      dbQuery = dbQuery.eq("users.gender", gender.toLowerCase());
    }
    if (ageMin) {
      dbQuery = dbQuery.gte("age", parseInt(ageMin, 10));
    }
    if (ageMax) {
      dbQuery = dbQuery.lte("age", parseInt(ageMax, 10));
    }
    if (religion) {
      dbQuery = dbQuery.ilike("religion", `%${religion}%`);
    }
    if (caste) {
      dbQuery = dbQuery.ilike("caste", `%${caste}%`);
    }
    if (maritalStatus) {
      dbQuery = dbQuery.eq("marital_status", maritalStatus);
    }
    if (city) {
      dbQuery = dbQuery.ilike("city", `%${city}%`);
    }
    if (query) {
      dbQuery = dbQuery.or(`users.full_name.ilike.%${query}%,city.ilike.%${query}%`);
    }

    if (sort === "age_asc") {
      dbQuery = dbQuery.order("age", { ascending: true });
    } else if (sort === "age_desc") {
      dbQuery = dbQuery.order("age", { ascending: false });
    } else {
      dbQuery = dbQuery.order("last_active", { ascending: false });
    }

    dbQuery = dbQuery.range(offset, offset + size - 1);

    const { data, error, count } = await dbQuery;

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const items = (data || []).map((r) => mapProfileRow(r));
    return res.json({
      items,
      page: p,
      pageSize: size,
      total: count || 0,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. Recommended profiles
profilesRouter.get("/recommended", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, users!inner(full_name, gender, mobile, avatar_url, plan)")
      .limit(6);

    if (error) return res.status(400).json({ message: error.message });
    return res.json((data || []).map((r) => mapProfileRow(r)));
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. Shortlisted profiles
profilesRouter.get("/shortlisted", requireAuth, async (req, res) => {
  try {
    const { data: shortlists, error: sErr } = await supabase
      .from("shortlists")
      .select("target_profile_id")
      .eq("user_id", req.user!.id);

    if (sErr) return res.status(400).json({ message: sErr.message });
    const targetIds = (shortlists || []).map((s) => s.target_profile_id);

    if (targetIds.length === 0) return res.json([]);

    const { data, error } = await supabase
      .from("profiles")
      .select("*, users!inner(full_name, gender, mobile, avatar_url, plan)")
      .in("id", targetIds);

    if (error) return res.status(400).json({ message: error.message });
    return res.json((data || []).map((r) => mapProfileRow(r)));
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 4. Current user's profile
profilesRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, users!inner(full_name, gender, mobile, avatar_url, plan)")
      .eq("id", req.user!.id)
      .single();

    if (error || !data) return res.status(404).json({ message: "Profile not found" });
    return res.json(mapProfileRow(data, req.user!.id));
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 5. Update current user's profile
profilesRouter.patch("/me", requireAuth, async (req, res) => {
  try {
    const updates = req.body;
    const profileFields: Record<string, any> = {};

    if (updates.about !== undefined) profileFields.about = updates.about;
    if (updates.religion !== undefined) profileFields.religion = updates.religion;
    if (updates.caste !== undefined) profileFields.caste = updates.caste;
    if (updates.motherTongue !== undefined) profileFields.mother_tongue = updates.motherTongue;
    if (updates.education !== undefined) profileFields.education = updates.education;
    if (updates.occupation !== undefined) profileFields.occupation = updates.occupation;
    if (updates.incomeRange !== undefined) profileFields.income_range = updates.incomeRange;
    if (updates.city !== undefined) profileFields.city = updates.city;
    if (updates.state !== undefined) profileFields.state = updates.state;
    if (updates.photos !== undefined) profileFields.photos = updates.photos;

    const { data, error } = await supabase
      .from("profiles")
      .update(profileFields)
      .eq("id", req.user!.id)
      .select("*, users!inner(full_name, gender, mobile, avatar_url, plan)")
      .single();

    if (error) return res.status(400).json({ message: error.message });
    return res.json(mapProfileRow(data, req.user!.id));
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 6. Request Presigned S3 Upload URL (Direct S3 + CloudFront upload)
profilesRouter.post("/me/photos/presign", requireAuth, async (req, res) => {
  try {
    const { fileName, contentType } = req.body;
    if (!fileName || !contentType) {
      return res.status(400).json({ message: "fileName and contentType are required" });
    }

    const { uploadUrl, fileUrl, key } = await createPresignedUploadUrl(
      req.user!.id,
      fileName,
      contentType,
    );

    return res.json({ uploadUrl, fileUrl, key });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to create S3 presigned URL" });
  }
});

// 7. Save uploaded photo to user profile
profilesRouter.post("/me/photos", requireAuth, async (req, res) => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl) return res.status(400).json({ message: "photoUrl required" });

    // Fetch existing photos
    const { data: prof } = await supabase
      .from("profiles")
      .select("photos")
      .eq("id", req.user!.id)
      .single();

    const existing = prof?.photos || [];
    const updated = [...existing, photoUrl];

    await supabase.from("profiles").update({ photos: updated }).eq("id", req.user!.id);

    return res.json({ url: photoUrl });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 8. Toggle shortlist
profilesRouter.post("/:id/shortlist", requireAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.user!.id;

    const { data: existing } = await supabase
      .from("shortlists")
      .select("id")
      .eq("user_id", userId)
      .eq("target_profile_id", targetId)
      .single();

    if (existing) {
      await supabase.from("shortlists").delete().eq("id", existing.id);
      return res.json({ shortlisted: false });
    } else {
      await supabase.from("shortlists").insert({ user_id: userId, target_profile_id: targetId });
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

    await supabase
      .from("interests")
      .upsert(
        { sender_id: senderId, receiver_id: receiverId, status: "pending" },
        { onConflict: "sender_id,receiver_id" },
      );

    return res.json({ sent: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 10. Get single profile by ID
profilesRouter.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, users!inner(full_name, gender, mobile, avatar_url, plan)")
      .eq("id", req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ message: "Profile not found" });
    return res.json(mapProfileRow(data));
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});
