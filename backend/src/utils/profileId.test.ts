import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatDisplayId,
  parseDisplayId,
  isUuid,
  isDisplayId,
} from "./profileId.js";

describe("Sequential Profile ID Engine", () => {
  it("formats base single-letter and initial series correctly", () => {
    assert.equal(formatDisplayId(1), "P1");
    assert.equal(formatDisplayId(2), "P2");
    assert.equal(formatDisplayId(99), "P99");
    assert.equal(formatDisplayId(100), "P100");
  });

  it("formats single letter alpha series (PA1 to PZ100)", () => {
    assert.equal(formatDisplayId(101), "PA1");
    assert.equal(formatDisplayId(102), "PA2");
    assert.equal(formatDisplayId(200), "PA100");
    assert.equal(formatDisplayId(201), "PB1");
    assert.equal(formatDisplayId(300), "PB100");
    assert.equal(formatDisplayId(2600), "PY100");
    assert.equal(formatDisplayId(2601), "PZ1");
    assert.equal(formatDisplayId(2700), "PZ100");
  });

  it("formats double and triple letter series (PAA1 to PZZ100 and beyond)", () => {
    assert.equal(formatDisplayId(2701), "PAA1");
    assert.equal(formatDisplayId(70200), "PZY100");
    assert.equal(formatDisplayId(70300), "PZZ100");
    assert.equal(formatDisplayId(70301), "PAAA1");
  });

  it("reversibly parses display IDs back to original sequence integers", () => {
    const numbers = [1, 2, 99, 100, 101, 102, 200, 201, 300, 2600, 2601, 2700, 2701, 70200, 70300, 70301];
    for (const num of numbers) {
      const formatted = formatDisplayId(num);
      const parsed = parseDisplayId(formatted);
      assert.equal(parsed, num, `Failed reversible parse for ${num} -> ${formatted}`);
    }
  });

  it("validates UUIDs and Display IDs correctly", () => {
    assert.equal(isUuid("64e47f1a-f4b5-46d0-8e4d-3461627510f8"), true);
    assert.equal(isUuid("00000000-0000-0000-0000-000000000001"), true);
    assert.equal(isUuid("P1"), false);
    assert.equal(isUuid("invalid-uuid"), false);

    assert.equal(isDisplayId("P1"), true);
    assert.equal(isDisplayId("p1"), true);
    assert.equal(isDisplayId("P100"), true);
    assert.equal(isDisplayId("PA1"), true);
    assert.equal(isDisplayId("PZ100"), true);
    assert.equal(isDisplayId("PAA1"), true);
    assert.equal(isDisplayId("PAAA1"), true);
    assert.equal(isDisplayId("64e47f1a-f4b5-46d0-8e4d-3461627510f8"), false);
    assert.equal(isDisplayId("XYZ"), false);
  });

  it("throws or returns null on invalid inputs", () => {
    assert.throws(() => formatDisplayId(0));
    assert.throws(() => formatDisplayId(-5));
    assert.throws(() => formatDisplayId(1.5));
    assert.equal(parseDisplayId(""), null);
    assert.equal(parseDisplayId("P0"), null);
    assert.equal(parseDisplayId("PA0"), null);
    assert.equal(parseDisplayId("PA101"), null); // Exceeds 100
  });
});
