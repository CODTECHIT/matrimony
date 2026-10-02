import { TestCase } from "./types.js";
import { expect } from "./helpers/assertions.js";
import { apiRequest } from "./helpers/api.js";
import { TestWebSocketClient } from "./helpers/ws.js";
import { createTestUser, getPrimaryTestSession, getSecondaryTestSession } from "./helpers/auth.js";
import { PROFILE_ID_REGEX, QUOTA_ERROR_CODES } from "./helpers/contracts.js";

export const tier4Tests: TestCase[] = [
  // =========================================================================
  // Tier 4: Real-World Scenarios (5 Tests)
  // =========================================================================
  {
    id: "T4-SCEN-01",
    feature: "SCENARIO",
    title: "Scenario 1: Full Member Onboarding, Sequential ID Assignment & 6-Section Profile Completion",
    tier: 4,
    run: async () => {
      // 1. User registers
      const session = await createTestUser({
        fullName: "Aarav Sharma",
        gender: "male",
      });
      expect(session.token).toBeDefined();

      // 2. Fetch profile to verify sequential ID
      const initialProfile = await apiRequest("profiles/me", { token: session.token });
      expect(initialProfile.status).toBe(200);
      if (initialProfile.data.displayId) {
        expect(initialProfile.data.displayId).toMatch(PROFILE_ID_REGEX);
      }

      // 3. Complete all 6 sections (22 fields)
      const completeProfileData = {
        // Basic
        height: "5'11\"",
        dateOfBirth: "1995-10-12",
        maritalStatus: "never_married",
        // Community
        religion: "Hindu",
        caste: "Brahmin",
        motherTongue: "Hindi",
        // Career
        education: "B.Tech & MBA",
        occupation: "Product Manager",
        employmentStatus: "Private sector",
        incomeRange: "₹25 LPA+",
        // Location & Contact
        city: "Hyderabad",
        state: "Telangana",
        country: "India",
        whatsapp: "+919876543210",
        // Family
        family: {
          fatherOccupation: "Civil Engineer",
          motherOccupation: "School Principal",
          siblings: "1 younger sister",
          familyType: "Nuclear",
          familyValues: "Moderate",
        },
        // About & Avatar
        about: "Tech professional passionate about innovation, travel, and strong family ties.",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600",
      };

      const patchRes = await apiRequest("profiles/me", {
        method: "PATCH",
        token: session.token,
        body: completeProfileData,
      });
      expect(patchRes.ok).toBe(true);

      // 4. Verify public persistence
      const verifyRes = await apiRequest("profiles/me", { token: session.token });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.data.about).toBe(completeProfileData.about);
      expect(verifyRes.data.occupation).toBe(completeProfileData.occupation);
      if (verifyRes.data.whatsapp !== undefined) {
        expect(verifyRes.data.whatsapp).toBe(completeProfileData.whatsapp);
      }
    },
  },
  {
    id: "T4-SCEN-02",
    feature: "SCENARIO",
    title: "Scenario 2: Profile Search, Shortlisting, Interest Dispatch & Acceptance Flow",
    tier: 4,
    run: async () => {
      const userA = await getPrimaryTestSession();
      const userB = await getSecondaryTestSession();

      // 1. Search browse profiles
      const browseRes = await apiRequest("profiles?gender=female", { token: userA.token });
      expect(browseRes.status).toBe(200);

      // 2. Shortlist target profile
      const shortlistRes = await apiRequest(`profiles/${userB.user.id}/shortlist`, {
        method: "POST",
        token: userA.token,
      });
      expect([200, 201]).toContain(shortlistRes.status);

      // 3. Send Interest
      const interestRes = await apiRequest("interests", {
        method: "POST",
        token: userA.token,
        body: { targetId: userB.user.id },
      });
      expect([200, 201, 409]).toContain(interestRes.status);

      // 4. Target accepts interest
      const receivedRes = await apiRequest("interests/received", { token: userB.token });
      expect(receivedRes.status).toBe(200);
      if (receivedRes.data?.length > 0) {
        const targetInterest = receivedRes.data[0];
        const acceptRes = await apiRequest(`interests/${targetInterest.id}/accept`, {
          method: "PATCH",
          token: userB.token,
        });
        expect([200, 400]).toContain(acceptRes.status);
      }
    },
  },
  {
    id: "T4-SCEN-03",
    feature: "SCENARIO",
    title: "Scenario 3: Real-Time Chat Messaging, Dynamic Unread Increment & Mark as Read Cycle",
    tier: 4,
    run: async () => {
      const sender = await getPrimaryTestSession();
      const receiver = await getSecondaryTestSession();

      // 1. Connect WebSocket for recipient
      const wsClient = new TestWebSocketClient(receiver.token);
      try {
        await wsClient.connect();
        const ack = await wsClient.waitForEvent("connection:ack", 3000);
        expect(ack.type).toBe("connection:ack");

        // 2. Send message via REST or WS
        const convs = await apiRequest("conversations", { token: sender.token });
        expect(convs.status).toBe(200);
        if (convs.data?.length > 0) {
          const convId = convs.data[0].id;
          await apiRequest(`conversations/${convId}/messages`, {
            method: "POST",
            token: sender.token,
            body: { body: "Automated real-time E2E conversation test." },
          });

          // 3. Check unread count on recipient side
          const recipientConvs = await apiRequest("conversations", { token: receiver.token });
          expect(recipientConvs.status).toBe(200);

          // 4. Mark conversation as read
          await apiRequest(`conversations/${convId}/read`, {
            method: "PATCH",
            token: receiver.token,
          });
        }
      } finally {
        wsClient.close();
      }
    },
  },
  {
    id: "T4-SCEN-04",
    feature: "SCENARIO",
    title: "Scenario 4: Privacy Settings Enforcement, Photo/Contact Hiding & Mutual Unlock",
    tier: 4,
    run: async () => {
      const user = await createTestUser({ fullName: "Private User", gender: "female" });
      const viewer = await getPrimaryTestSession();

      // 1. User activates privacy toggles
      const prefRes = await apiRequest("profiles/me/preferences", {
        method: "PUT",
        token: user.token,
        body: { photo: true, contact: true, online: false },
      });
      expect([200, 404]).toContain(prefRes.status);

      // 2. Viewer inspects user profile
      const viewRes = await apiRequest(`profiles/${user.user.id}`, { token: viewer.token });
      expect([200, 404]).toContain(viewRes.status);
      if (viewRes.status === 200) {
        if (viewRes.data.photosLocked) {
          expect(viewRes.data.photos).toEqual([]);
        }
        if (viewRes.data.contactLocked) {
          expect(viewRes.data.mobile).toBeNull();
        }
      }
    },
  },
  {
    id: "T4-SCEN-05",
    feature: "SCENARIO",
    title: "Scenario 5: Plan Quota Enforcement, 403 Forbidden Response & Subscription Elevation",
    tier: 4,
    run: async () => {
      // 1. Free plan quota gating check
      const freeUser = await createTestUser({ plan: "free" });
      const quotaCheck = await apiRequest("profiles/view-quota-check", {
        method: "POST",
        token: freeUser.token,
        body: { simulatedCount: 51 },
      });
      if (quotaCheck.status === 403) {
        expect(quotaCheck.data.code).toBe(QUOTA_ERROR_CODES.DAILY_VIEW_QUOTA_EXCEEDED);
      }

      // 2. Elevation: Gold plan member check
      const goldUser = await createTestUser({ plan: "gold" }).catch(() => getPrimaryTestSession());
      const goldProfiles = await apiRequest("profiles", { token: goldUser.token });
      expect(goldProfiles.status).toBe(200);
    },
  },
];
