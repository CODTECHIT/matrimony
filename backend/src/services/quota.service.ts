import { db } from "../config/db.js";

export interface QuotaCheckResult {
  allowed: boolean;
  code?: string;
  message?: string;
  remaining?: number;
  total?: number;
}

export const quotaService = {
  /**
   * Tracks daily unique profile views.
   * Free = 50/day, Silver = 200/day, Gold/Platinum = Unlimited
   */
  async checkAndRecordProfileView(
    viewerId: string,
    targetProfileId: string,
    userPlan = "free"
  ): Promise<QuotaCheckResult> {
    if (viewerId === targetProfileId) return { allowed: true };

    const plan = userPlan.toLowerCase();
    if (plan === "gold" || plan === "platinum") {
      return { allowed: true, total: Infinity, remaining: Infinity };
    }

    const limit = plan === "silver" ? 200 : 50;

    // Check count of unique profile views today
    const countRes = await db.query(
      `SELECT COUNT(*) FROM daily_profile_views
       WHERE user_id = $1 AND view_date = CURRENT_DATE`,
      [viewerId]
    );
    const viewsToday = parseInt(countRes.rows[0]?.count || "0", 10);

    // Check if this specific profile was already viewed today
    const existsRes = await db.query(
      `SELECT 1 FROM daily_profile_views
       WHERE user_id = $1 AND profile_id = $2 AND view_date = CURRENT_DATE`,
      [viewerId, targetProfileId]
    );
    const alreadyViewedToday = existsRes.rows.length > 0;

    if (!alreadyViewedToday && viewsToday >= limit) {
      return {
        allowed: false,
        code: "DAILY_VIEW_QUOTA_EXCEEDED",
        message: `You have reached your daily limit of ${limit} profile views on the ${userPlan.toUpperCase()} plan. Upgrade to view more profiles.`,
        remaining: 0,
        total: limit,
      };
    }

    // Record view if not already recorded
    if (!alreadyViewedToday) {
      await db.query(
        `INSERT INTO daily_profile_views (user_id, profile_id, view_date)
         VALUES ($1, $2, CURRENT_DATE)
         ON CONFLICT (user_id, profile_id, view_date) DO NOTHING`,
        [viewerId, targetProfileId]
      );
    }

    return {
      allowed: true,
      remaining: Math.max(0, limit - (viewsToday + (alreadyViewedToday ? 0 : 1))),
      total: limit,
    };
  },

  /**
   * Checks monthly interest quota.
   * Free = 5/month, Silver = 30/month, Gold/Platinum = Unlimited
   */
  async checkInterestQuota(senderId: string, userPlan = "free"): Promise<QuotaCheckResult> {
    const plan = userPlan.toLowerCase();
    if (plan === "gold" || plan === "platinum") {
      return { allowed: true, total: Infinity, remaining: Infinity };
    }

    const limit = plan === "silver" ? 30 : 5;

    // Count interests sent in last 30 days
    const countRes = await db.query(
      `SELECT COUNT(*) FROM interests
       WHERE sender_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [senderId]
    );
    const used = parseInt(countRes.rows[0]?.count || "0", 10);

    if (used >= limit) {
      return {
        allowed: false,
        code: "MONTHLY_INTERESTS_EXCEEDED",
        message: `You have sent all ${limit} interests allowed this month on the ${userPlan.toUpperCase()} plan. Upgrade to Gold for unlimited interests.`,
        remaining: 0,
        total: limit,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, limit - used),
      total: limit,
    };
  },

  /**
   * Checks messaging permissions.
   * Free = disabled, Silver = mutual matches only, Gold/Platinum = direct instant chat
   */
  async checkMessagingPermission(
    senderId: string,
    recipientId: string,
    userPlan = "free"
  ): Promise<QuotaCheckResult> {
    const plan = userPlan.toLowerCase();

    // 1. If an interest has been accepted between both members (mutual match), chat is ALWAYS permitted!
    const matchRes = await db.query(
      `SELECT 1 FROM interests
       WHERE status = 'accepted'
         AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))`,
      [senderId, recipientId]
    );

    if (matchRes.rows.length > 0) {
      return { allowed: true };
    }

    // 2. Direct unsolicited messaging without accepted interest:
    if (plan === "free") {
      return {
        allowed: false,
        code: "MESSAGING_DISABLED_ON_FREE_PLAN",
        message: "You can chat with members once an interest is accepted, or upgrade to Gold for direct messaging.",
      };
    }

    if (plan === "silver") {
      return {
        allowed: false,
        code: "MUTUAL_MATCH_REQUIRED",
        message: "On the Silver plan, you can message members after an interest has been accepted.",
      };
    }

    return { allowed: true };
  },

  /**
   * Tracks verified contact unlocks.
   * Free = 0, Silver = 15/month, Gold = 50/month, Platinum = Unlimited
   */
  async checkAndRecordContactUnlock(
    viewerId: string,
    targetUserId: string,
    userPlan = "free"
  ): Promise<QuotaCheckResult> {
    if (viewerId === targetUserId) return { allowed: true };

    const plan = userPlan.toLowerCase();
    if (plan === "free") {
      return {
        allowed: false,
        code: "CONTACT_VIEW_RESTRICTED",
        message: "Contact numbers are locked for Free members. Upgrade to view phone numbers.",
      };
    }

    if (plan === "platinum") {
      return { allowed: true, total: Infinity, remaining: Infinity };
    }

    const limit = plan === "silver" ? 15 : 50;

    // Check count of unlocked contacts in last 30 days
    const countRes = await db.query(
      `SELECT COUNT(*) FROM contact_unlocks
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [viewerId]
    );
    const used = parseInt(countRes.rows[0]?.count || "0", 10);

    const existsRes = await db.query(
      `SELECT 1 FROM contact_unlocks
       WHERE user_id = $1 AND contact_user_id = $2`,
      [viewerId, targetUserId]
    );
    const alreadyUnlocked = existsRes.rows.length > 0;

    if (!alreadyUnlocked && used >= limit) {
      return {
        allowed: false,
        code: "CONTACT_QUOTA_EXCEEDED",
        message: `You have unlocked all ${limit} contact numbers allowed on the ${userPlan.toUpperCase()} plan. Upgrade to unlock more numbers.`,
        remaining: 0,
        total: limit,
      };
    }

    if (!alreadyUnlocked) {
      await db.query(
        `INSERT INTO contact_unlocks (user_id, contact_user_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, contact_user_id) DO NOTHING`,
        [viewerId, targetUserId]
      );
    }

    return {
      allowed: true,
      remaining: Math.max(0, limit - (used + (alreadyUnlocked ? 0 : 1))),
      total: limit,
    };
  },

  /**
   * Return quota summary for member dashboard / subscription page
   */
  async getUsageSummary(userId: string, userPlan = "free") {
    const plan = userPlan.toLowerCase();

    const [viewsRes, interestsRes, contactsRes] = await Promise.all([
      db.query(
        `SELECT COUNT(*) FROM daily_profile_views
         WHERE user_id = $1 AND view_date = CURRENT_DATE`,
        [userId]
      ),
      db.query(
        `SELECT COUNT(*) FROM interests
         WHERE sender_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
        [userId]
      ),
      db.query(
        `SELECT COUNT(*) FROM contact_unlocks
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
        [userId]
      ),
    ]);

    const dailyViewsUsed = parseInt(viewsRes.rows[0]?.count || "0", 10);
    const interestsSent30d = parseInt(interestsRes.rows[0]?.count || "0", 10);
    const contactsUnlocked30d = parseInt(contactsRes.rows[0]?.count || "0", 10);

    const isUnlimited = plan === "platinum";
    const isGold = plan === "gold" || isUnlimited;
    const isSilver = plan === "silver" || isGold;

    return {
      plan: userPlan,
      dailyViewsUsed,
      monthlyInterestsUsed: interestsSent30d,
      contactsUnlockedUsed: contactsUnlocked30d,
      dailyProfileViews: {
        used: dailyViewsUsed,
        limit: isGold ? "Unlimited" : isSilver ? 200 : 50,
      },
      monthlyInterests: {
        used: interestsSent30d,
        limit: isGold ? "Unlimited" : isSilver ? 30 : 5,
      },
      contactsUnlocked: {
        used: contactsUnlocked30d,
        limit: isUnlimited ? "Unlimited" : isGold ? 50 : isSilver ? 15 : 0,
      },
      messagingStatus: isGold ? "Unlimited Instant Chat" : isSilver ? "Mutual Matches Only" : "Disabled",
    };
  },
};
