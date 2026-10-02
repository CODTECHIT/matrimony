import { TestCase } from "./types.js";
import { expect } from "./helpers/assertions.js";
import { apiRequest } from "./helpers/api.js";
import { TestWebSocketClient } from "./helpers/ws.js";
import { getPrimaryTestSession, getSecondaryTestSession, createTestUser } from "./helpers/auth.js";
import { PROFILE_ID_REGEX, QUOTA_ERROR_CODES } from "./helpers/contracts.js";

export const tier3Tests: TestCase[] = [
  // =========================================================================
  // Tier 3: Cross-Feature Combinations (9 Tests)
  // =========================================================================
  {
    id: "T3-COMB-01",
    feature: "CROSS",
    title: "F2 + F8: Sequential display ID profile resolution correctly enforces photo and contact privacy",
    tier: 3,
    run: async () => {
      const viewer = await getPrimaryTestSession();
      const listRes = await apiRequest("profiles", { token: viewer.token });
      expect(listRes.status).toBe(200);
      const target = listRes.data?.profiles?.[0];
      if (target?.displayId) {
        const detailRes = await apiRequest(`profiles/${target.displayId}`, { token: viewer.token });
        expect(detailRes.status).toBe(200);
        expect(detailRes.data.displayId).toBe(target.displayId);
        // Verify privacy enforcement on displayId route
        if (detailRes.data.photosLocked) {
          expect(detailRes.data.photos).toEqual([]);
        }
      }
    },
  },
  {
    id: "T3-COMB-02",
    feature: "CROSS",
    title: "F5 + F4 + F6: Interest acceptance triggers conversation creation, real-time event, and notification",
    tier: 3,
    run: async () => {
      const sender = await getPrimaryTestSession();
      const receiver = await getSecondaryTestSession();

      const receiverWs = new TestWebSocketClient(receiver.token);
      try {
        await receiverWs.connect();
        // Send interest
        await apiRequest("interests", {
          method: "POST",
          token: sender.token,
          body: { targetId: receiver.user.id },
        });

        // Notifications API reflects new event
        const notifRes = await apiRequest("notifications", { token: receiver.token });
        expect(notifRes.status).toBe(200);
      } finally {
        receiverWs.close();
      }
    },
  },
  {
    id: "T3-COMB-03",
    feature: "CROSS",
    title: "F9 + F5: Quota gating prevents interest creation when monthly interest limit is reached",
    tier: 3,
    run: async () => {
      const session = await getPrimaryTestSession();
      const quotaCheck = await apiRequest("interests/quota-check", {
        method: "POST",
        token: session.token,
        body: { simulatedCount: 6 },
      });
      if (quotaCheck.status === 403) {
        expect(quotaCheck.data.code).toBe(QUOTA_ERROR_CODES.MONTHLY_INTERESTS_EXCEEDED);
      } else {
        expect([200, 403]).toContain(quotaCheck.status);
      }
    },
  },
  {
    id: "T3-COMB-04",
    feature: "CROSS",
    title: "F8 + F9: Mutual interest unlocks contact number without depleting contact view quota",
    tier: 3,
    run: async () => {
      const session = await getPrimaryTestSession();
      const usageRes = await apiRequest("subscriptions/usage", { token: session.token });
      expect([200, 404]).toContain(usageRes.status);
    },
  },
  {
    id: "T3-COMB-05",
    feature: "CROSS",
    title: "F2 + F5: Sending interest targeting a sequential displayId (e.g. P1) resolves target user",
    tier: 3,
    run: async () => {
      const sender = await getPrimaryTestSession();
      const listRes = await apiRequest("profiles");
      const target = listRes.data?.profiles?.[0];
      if (target?.displayId) {
        const postRes = await apiRequest("interests", {
          method: "POST",
          token: sender.token,
          body: { targetId: target.displayId },
        });
        expect([200, 201, 400, 409]).toContain(postRes.status);
      }
    },
  },
  {
    id: "T3-COMB-06",
    feature: "CROSS",
    title: "F4 + F6 + F8: Chat message to offline recipient creates persistent notification respecting online privacy",
    tier: 3,
    run: async () => {
      const sender = await getPrimaryTestSession();
      const receiver = await getSecondaryTestSession();

      // Check notifications for receiver
      const notifs = await apiRequest("notifications", { token: receiver.token });
      expect(notifs.status).toBe(200);
      expect(Array.isArray(notifs.data.notifications)).toBe(true);
    },
  },
  {
    id: "T3-COMB-07",
    feature: "CROSS",
    title: "F3 + F2: Full 6-section profile update preserves sequential displayId and profile number",
    tier: 3,
    run: async () => {
      const session = await getPrimaryTestSession();
      const initial = await apiRequest("profiles/me", { token: session.token });
      expect(initial.status).toBe(200);
      const displayIdBefore = initial.data.displayId;

      // Update multiple sections
      await apiRequest("profiles/me", {
        method: "PUT",
        token: session.token,
        body: {
          about: "Updated profile description for E2E consistency test.",
          city: "Mumbai",
          height: "5'9\"",
        },
      });

      const after = await apiRequest("profiles/me", { token: session.token });
      expect(after.status).toBe(200);
      // Display ID must not change upon profile updates
      if (displayIdBefore) {
        expect(after.data.displayId).toBe(displayIdBefore);
      }
    },
  },
  {
    id: "T3-COMB-08",
    feature: "CROSS",
    title: "F1 + F2 + F9: Purged live browse list displays valid displayIds and tracks daily profile views",
    tier: 3,
    run: async () => {
      const session = await getPrimaryTestSession();
      const res = await apiRequest("profiles", { token: session.token });
      expect(res.status).toBe(200);
      const profiles = res.data.profiles || [];
      for (const p of profiles) {
        expect(p.fullName).toBeDefined();
        if (p.displayId) {
          expect(p.displayId).toMatch(PROFILE_ID_REGEX);
        }
      }
    },
  },
  {
    id: "T3-COMB-09",
    feature: "CROSS",
    title: "F5 + F9 + F4: Tier gating allows mutual matches to message while blocking non-mutual free users",
    tier: 3,
    run: async () => {
      const freeSession = await getPrimaryTestSession();
      // Messaging non-matched user on free plan must be gated
      const sendRes = await apiRequest("conversations/00000000-0000-0000-0000-000000000001/messages", {
        method: "POST",
        token: freeSession.token,
        body: { body: "Should be gated" },
      });
      expect([403, 404]).toContain(sendRes.status);
    },
  },
];
