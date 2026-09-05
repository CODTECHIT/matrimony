import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { createPresignedUploadUrl } from "../config/aws.js";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware.js";

export const profilesRouter = Router();

function mapProfileRow(
  row: any,
  currentUserId?: string,
  shortlists?: Set<string>,
  interests?: Set<string>,
  matchScore?: number,
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
    matchScore: matchScore !== undefined ? matchScore : undefined,
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

interface ScoredProfileCandidate {
  row: any;
  score: number;
}

function calculateCompatibilityScore(
  userProfile: {
    age?: number;
    gender?: string;
    religion?: string;
    caste?: string;
    mother_tongue?: string;
    marital_status?: string;
    city?: string;
    state?: string;
    country?: string;
  },
  candidateRow: any,
): number {
  let score = 40; // Base baseline score

  const candAge = candidateRow.age;
  const candRel = candidateRow.religion;
  const candCaste = candidateRow.caste;
  const candLang = candidateRow.mother_tongue;
  const candMarital = candidateRow.marital_status;
  const candCity = candidateRow.city;
  const candState = candidateRow.state;
  const isVerified = Boolean(candidateRow.verified);

  // 1. Religion & Caste compatibility (up to 25 pts)
  if (userProfile.religion && candRel) {
    if (userProfile.religion.toLowerCase() === candRel.toLowerCase()) {
      score += 15;
      if (
        userProfile.caste &&
        candCaste &&
        userProfile.caste.toLowerCase() === candCaste.toLowerCase()
      ) {
        score += 10;
      } else if (!userProfile.caste || !candCaste) {
        score += 5;
      }
    }
  } else {
    score += 10;
  }

  // 2. Linguistic compatibility (up to 10 pts)
  if (userProfile.mother_tongue && candLang) {
    if (userProfile.mother_tongue.toLowerCase() === candLang.toLowerCase()) {
      score += 10;
    }
  } else {
    score += 5;
  }

  // 3. Age alignment (up to 15 pts)
  if (userProfile.age && candAge) {
    const diff = candAge - userProfile.age;
    const isMaleUser = (userProfile.gender || "").toLowerCase() === "male";
    if (isMaleUser) {
      if (diff <= 1 && diff >= -4) score += 15;
      else if (diff <= 3 && diff >= -7) score += 10;
      else score += 5;
    } else {
      if (diff >= -1 && diff <= 4) score += 15;
      else if (diff >= -3 && diff <= 7) score += 10;
      else score += 5;
    }
  } else {
    score += 10;
  }

  // 4. Location proximity (up to 10 pts)
  if (userProfile.city && candCity && userProfile.city.toLowerCase() === candCity.toLowerCase()) {
    score += 10;
  } else if (
    userProfile.state &&
    candState &&
    userProfile.state.toLowerCase() === candState.toLowerCase()
  ) {
    score += 7;
  } else {
    score += 3;
  }

  // 5. Marital status alignment (up to 5 pts)
  if (userProfile.marital_status && candMarital && userProfile.marital_status === candMarital) {
    score += 5;
  }

  // 6. Trust & Verification boost (up to 5 pts)
  if (isVerified) score += 5;

  // Scale score between 68% and 98% for realistic matrimonial match presentation
  return Math.min(98, Math.max(68, Math.round(score)));
}

// 2. Recommended profiles with intelligent matchmaking
profilesRouter.get("/recommended", optionalAuth, async (req, res) => {
  try {
    const currentUserId = req.user?.id;

    // A. Authenticated user: personalized matchmaking
    if (currentUserId) {
      // Fetch current user details & profile
      const [userRes, profileRes] = await Promise.all([
        supabase.from("users").select("gender").eq("id", currentUserId).single(),
        supabase
          .from("profiles")
          .select("age, religion, caste, mother_tongue, marital_status, city, state, country")
          .eq("id", currentUserId)
          .single(),
      ]);

      const myGender = userRes.data?.gender;
      const targetGender =
        myGender === "female" ? "male" : myGender === "male" ? "female" : undefined;
      const userCriteria = {
        gender: myGender,
        age: profileRes.data?.age,
        religion: profileRes.data?.religion,
        caste: profileRes.data?.caste,
        mother_tongue: profileRes.data?.mother_tongue,
        marital_status: profileRes.data?.marital_status,
        city: profileRes.data?.city,
        state: profileRes.data?.state,
        country: profileRes.data?.country,
      };

      // Fetch shortlists & interests for current user to preserve card state
      const [sRes, iRes] = await Promise.all([
        supabase.from("shortlists").select("target_profile_id").eq("user_id", currentUserId),
        supabase.from("interests").select("receiver_id").eq("sender_id", currentUserId),
      ]);
      const shortlists = new Set<string>((sRes.data || []).map((s) => s.target_profile_id));
      const interests = new Set<string>((iRes.data || []).map((i) => i.receiver_id));

      // Query candidate profiles excluding current user
      let query = supabase
        .from("profiles")
        .select("*, users!inner(full_name, gender, mobile, avatar_url, plan)")
        .neq("id", currentUserId);

      if (targetGender) {
        query = query.eq("users.gender", targetGender);
      }

      const { data, error } = await query.limit(40);
      if (error) return res.status(400).json({ message: error.message });

      const candidateRows = data || [];

      // Calculate rule-based compatibility score for each candidate
      const scored: ScoredProfileCandidate[] = candidateRows.map((row) => ({
        row,
        score: calculateCompatibilityScore(userCriteria, row),
      }));

      // Sort descending by matchScore
      scored.sort((a, b) => b.score - a.score);
      const topMatches = scored.slice(0, 6);

      return res.json(
        topMatches.map(({ row, score }) =>
          mapProfileRow(row, currentUserId, shortlists, interests, score),
        ),
      );
    }

    // B. Unauthenticated guest: return top verified, complete profiles
    const { data, error } = await supabase
      .from("profiles")
      .select("*, users!inner(full_name, gender, mobile, avatar_url, plan)")
      .order("verified", { ascending: false })
      .limit(6);

    if (error) return res.status(400).json({ message: error.message });
    return res.json((data || []).map((r) => mapProfileRow(r, undefined, undefined, undefined, 88)));
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
