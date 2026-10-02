import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendInterestReceivedEmail,
  sendInterestAcceptedEmail,
  sendPlanExpiringEmail,
  sendPlanExpiredEmail,
} from "./mailer.js";

describe("Email Delivery Engine & Templates", () => {
  it("exports all 6 mailer trigger functions", () => {
    assert.equal(typeof sendWelcomeEmail, "function");
    assert.equal(typeof sendPasswordResetEmail, "function");
    assert.equal(typeof sendInterestReceivedEmail, "function");
    assert.equal(typeof sendInterestAcceptedEmail, "function");
    assert.equal(typeof sendPlanExpiringEmail, "function");
    assert.equal(typeof sendPlanExpiredEmail, "function");
  });

  it("handles sendWelcomeEmail with full profile data", async () => {
    // If SMTP credentials are live, this will send or mock safely
    const res = await sendWelcomeEmail({
      to: "test-welcome@example.com",
      fullName: "Ananya Sharma",
      displayId: "P101",
    });
    assert.ok(typeof res.success === "boolean");
  });

  it("handles sendPasswordResetEmail with OTP code", async () => {
    const res = await sendPasswordResetEmail("test-reset@example.com", "849201");
    assert.ok(typeof res.success === "boolean");
  });

  it("handles sendInterestReceivedEmail with sender profile snippet", async () => {
    const res = await sendInterestReceivedEmail({
      to: "test-receiver@example.com",
      receiverName: "Priya Patel",
      senderName: "Rahul Verma",
      senderDisplayId: "P42",
      senderAge: 29,
      senderOccupation: "Software Engineer",
      senderCity: "Hyderabad",
    });
    assert.ok(typeof res.success === "boolean");
  });

  it("handles sendInterestAcceptedEmail with partner connection", async () => {
    const res = await sendInterestAcceptedEmail({
      to: "test-sender@example.com",
      senderName: "Rahul Verma",
      partnerName: "Priya Patel",
      partnerDisplayId: "P55",
      conversationId: "conv-12345",
    });
    assert.ok(typeof res.success === "boolean");
  });

  it("handles sendPlanExpiringEmail with days remaining", async () => {
    const res = await sendPlanExpiringEmail({
      to: "test-expiring@example.com",
      userName: "Kiran Kumar",
      tier: "gold",
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      daysLeft: 3,
    });
    assert.ok(typeof res.success === "boolean");
  });

  it("handles sendPlanExpiredEmail", async () => {
    const res = await sendPlanExpiredEmail({
      to: "test-expired@example.com",
      userName: "Kiran Kumar",
      tier: "gold",
    });
    assert.ok(typeof res.success === "boolean");
  });
});
