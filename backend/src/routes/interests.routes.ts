import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const interestsRouter = Router();

// 1. Interests sent by current user
interestsRouter.get("/sent", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("interests")
      .select("*, receiver:users!receiver_id(id, full_name, avatar_url, profiles(*))")
      .eq("sender_id", req.user!.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    const formatted = (data || []).map((row: any) => {
      const u = row.receiver;
      const p = u?.profiles?.[0] || {};
      return {
        id: row.id,
        status: row.status,
        sentAt: row.created_at,
        profile: {
          id: u.id,
          fullName: u.full_name,
          age: p.age || 25,
          gender: p.gender || "female",
          photos: p.photos || (u.avatar_url ? [u.avatar_url] : []),
          verified: Boolean(p.verified),
          about: p.about || "",
          height: p.height || "",
          religion: p.religion || "",
          caste: p.caste || "",
          motherTongue: p.mother_tongue || "",
          maritalStatus: p.marital_status || "never_married",
          education: p.education || "",
          occupation: p.occupation || "",
          employmentStatus: p.employment_status || "",
          incomeRange: p.income_range || "",
          city: p.city || "",
          state: p.state || "",
          country: p.country || "India",
          family: {},
          lastActive: p.last_active || new Date().toISOString(),
          shortlisted: false,
          interestSent: true,
          canViewContact: false,
        },
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. Interests received by current user
interestsRouter.get("/received", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("interests")
      .select("*, sender:users!sender_id(id, full_name, avatar_url, profiles(*))")
      .eq("receiver_id", req.user!.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ message: error.message });

    const formatted = (data || []).map((row: any) => {
      const u = row.sender;
      const p = u?.profiles?.[0] || {};
      return {
        id: row.id,
        status: row.status,
        sentAt: row.created_at,
        profile: {
          id: u.id,
          fullName: u.full_name,
          age: p.age || 25,
          gender: p.gender || "male",
          photos: p.photos || (u.avatar_url ? [u.avatar_url] : []),
          verified: Boolean(p.verified),
          about: p.about || "",
          height: p.height || "",
          religion: p.religion || "",
          caste: p.caste || "",
          motherTongue: p.mother_tongue || "",
          maritalStatus: p.marital_status || "never_married",
          education: p.education || "",
          occupation: p.occupation || "",
          employmentStatus: p.employment_status || "",
          incomeRange: p.income_range || "",
          city: p.city || "",
          state: p.state || "",
          country: p.country || "India",
          family: {},
          lastActive: p.last_active || new Date().toISOString(),
          shortlisted: false,
          interestSent: false,
          canViewContact: false,
        },
      };
    });

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 3. Respond to interest (accept / decline)
interestsRouter.post("/:id/:action", requireAuth, async (req, res) => {
  try {
    const { id, action } = req.params;
    if (action !== "accept" && action !== "decline") {
      return res.status(400).json({ message: "Action must be accept or decline" });
    }

    const newStatus = action === "accept" ? "accepted" : "declined";
    const { error } = await supabase
      .from("interests")
      .update({ status: newStatus })
      .eq("id", id)
      .eq("receiver_id", req.user!.id);

    if (error) return res.status(400).json({ message: error.message });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});
