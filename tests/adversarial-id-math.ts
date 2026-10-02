import {
  formatDisplayId,
  parseDisplayId,
  isDisplayId,
  isUuid,
  DISPLAY_ID_REGEX,
  UUID_REGEX,
} from "../backend/src/utils/profileId.js";

interface TestCase {
  n: number;
  expectedPrefix?: string;
  expectedSuffix?: number;
  expectedId?: string;
}

const testCases: TestCase[] = [
  { n: 1, expectedId: "P1" },
  { n: 2, expectedId: "P2" },
  { n: 99, expectedId: "P99" },
  { n: 100, expectedId: "P100" },
  { n: 101, expectedId: "PA1" },
  { n: 199, expectedId: "PA99" },
  { n: 200, expectedId: "PA100" },
  { n: 201, expectedId: "PB1" },
  { n: 2599, expectedId: "PY99" },
  { n: 2600, expectedId: "PY100" },
  { n: 2601, expectedId: "PZ1" },
  { n: 2699, expectedId: "PZ99" },
  { n: 2700, expectedId: "PZ100" },
  { n: 2701, expectedId: "PAA1" },
  { n: 70200, expectedId: "PZY100" },
  { n: 70201, expectedId: "PZZ1" },
  { n: 70300, expectedId: "PZZ100" },
  { n: 70301, expectedId: "PAAA1" },
  { n: 1000000 },
];

console.log("=== ADVERSARIAL SEQUENTIAL ID MATHEMATICAL TEST ===");
let allPassed = true;

for (const tc of testCases) {
  try {
    const formatted = formatDisplayId(tc.n);
    const parsed = parseDisplayId(formatted);
    const isValid = isDisplayId(formatted);

    let matchExpected = true;
    if (tc.expectedId && formatted !== tc.expectedId) {
      matchExpected = false;
      allPassed = false;
      console.error(
        `FAIL: n=${tc.n} formatted="${formatted}" != expected "${tc.expectedId}"`,
      );
    }

    if (parsed !== tc.n) {
      allPassed = false;
      console.error(
        `FAIL: n=${tc.n} formatted="${formatted}" -> parsed=${parsed} (mismatch!)`,
      );
    }

    if (!isValid) {
      allPassed = false;
      console.error(
        `FAIL: isDisplayId("${formatted}") returned false for valid formatted ID!`,
      );
    }

    console.log(
      `PASS [n=${tc.n}]: formatted="${formatted}", parsed=${parsed}, isValid=${isValid}`,
    );
  } catch (err: any) {
    allPassed = false;
    console.error(`ERROR: n=${tc.n} threw exception:`, err.message);
  }
}

// Exhaustive range test: test all values 1 to 10,000 for roundtrip bijection
console.log("\n=== EXHAUSTIVE ROUND-TRIP TEST (1 to 20,000) ===");
let roundTripFails = 0;
for (let i = 1; i <= 20000; i++) {
  const f = formatDisplayId(i);
  const p = parseDisplayId(f);
  if (p !== i) {
    roundTripFails++;
    if (roundTripFails <= 5) {
      console.error(`Roundtrip FAIL at ${i}: formatted="${f}", parsed=${p}`);
    }
  }
}
if (roundTripFails === 0) {
  console.log("SUCCESS: 20,000 consecutive integers round-tripped with 100% bijection!");
} else {
  allPassed = false;
  console.error(`TOTAL ROUNDTRIP FAILURES: ${roundTripFails}`);
}

// Test around 70300 boundary exhaustive
console.log("\n=== BOUNDARY ROUND-TRIP TEST (70250 to 70350) ===");
let boundaryFails = 0;
for (let i = 70250; i <= 70350; i++) {
  const f = formatDisplayId(i);
  const p = parseDisplayId(f);
  if (p !== i) {
    boundaryFails++;
    console.error(`Boundary FAIL at ${i}: formatted="${f}", parsed=${p}`);
  }
}
if (boundaryFails === 0) {
  console.log("SUCCESS: 101 boundary values around 70300 round-tripped with 100% bijection!");
} else {
  allPassed = false;
  console.error(`TOTAL BOUNDARY FAILURES: ${boundaryFails}`);
}

// Error handling test for formatDisplayId
console.log("\n=== ERROR HANDLING: formatDisplayId ===");
const invalidFormatInputs: any[] = [
  0,
  -1,
  -100,
  NaN,
  Infinity,
  -Infinity,
  1.5,
  0.1,
  null,
  undefined,
  "1",
  {},
  [],
];

let errorHandlingPass = true;
for (const input of invalidFormatInputs) {
  try {
    const res = formatDisplayId(input);
    console.error(`FAIL: formatDisplayId(${input}) should have thrown but returned: ${res}`);
    errorHandlingPass = false;
    allPassed = false;
  } catch (err: any) {
    console.log(`PASS: formatDisplayId(${JSON.stringify(input)}) correctly threw: ${err.message}`);
  }
}

// Error handling test for parseDisplayId and isDisplayId
console.log("\n=== ERROR HANDLING: parseDisplayId & isDisplayId ===");
const invalidParseInputs: any[] = [
  "",
  "   ",
  "P",
  "P0",
  "P-1",
  "P101",
  "P1000",
  "PA0",
  "PA101",
  "PA",
  "PZ0",
  "PZ101",
  "PAA0",
  "PAA101",
  "P1'",
  "P1\"",
  "P1; DROP TABLE users;",
  "00000000-0000-0000-0000-000000000000",
  "not_an_id",
  null,
  undefined,
  123 as any,
  {} as any,
];

for (const input of invalidParseInputs) {
  const parsed = parseDisplayId(input);
  const isValid = isDisplayId(input);
  if (parsed !== null || isValid !== false) {
    console.error(
      `FAIL: input=${JSON.stringify(input)} expected null/false, got parsed=${parsed}, isValid=${isValid}`,
    );
    allPassed = false;
  } else {
    console.log(`PASS: input=${JSON.stringify(input)} -> parsed=null, isDisplayId=false`);
  }
}

// Mixed-case display ID test
console.log("\n=== CASE-INSENSITIVITY TEST: parseDisplayId & isDisplayId ===");
const mixedCaseTests = [
  { input: "p1", expected: 1 },
  { input: "pa1", expected: 101 },
  { input: "Pa100", expected: 200 },
  { input: "pB1", expected: 201 },
  { input: "pAa1", expected: 2701 },
];

for (const tc of mixedCaseTests) {
  const parsed = parseDisplayId(tc.input);
  const isValid = isDisplayId(tc.input);
  if (parsed === tc.expected && isValid === true) {
    console.log(`PASS: input="${tc.input}" -> parsed=${parsed}, isValid=true`);
  } else {
    console.error(
      `FAIL: input="${tc.input}" -> expected ${tc.expected}, got parsed=${parsed}, isValid=${isValid}`,
    );
    allPassed = false;
  }
}

// UUID validation test
console.log("\n=== UUID VALIDATION TEST ===");
const uuidTests = [
  { id: "64e47f1a-f4b5-46d0-8e4d-3461627510f8", valid: true },
  { id: "4acf0781-6fcf-4877-94f8-936535dea66d", valid: true },
  { id: "00000000-0000-0000-0000-000000000000", valid: true },
  { id: "00000000-0000-0000-0000-00000000000Z", valid: false }, // invalid hex 'Z'
  { id: "64e47f1a-f4b5-46d0-8e4d-3461627510f", valid: false }, // too short (35 chars)
  { id: "64e47f1a-f4b5-46d0-8e4d-3461627510f88", valid: false }, // too long (37 chars)
  { id: "64e47f1a_f4b5_46d0_8e4d_3461627510f8", valid: false }, // underscores
  { id: "P1", valid: false },
  { id: "", valid: false },
  { id: null as any, valid: false },
];

for (const ut of uuidTests) {
  const res = isUuid(ut.id);
  if (res === ut.valid) {
    console.log(`PASS: isUuid("${ut.id}") === ${res}`);
  } else {
    console.error(`FAIL: isUuid("${ut.id}") expected ${ut.valid}, got ${res}`);
    allPassed = false;
  }
}

console.log("\n=== OVERALL MATHEMATICAL HARNESS RESULT ===");
if (allPassed) {
  console.log("ALL MATHEMATICAL AND PARSING TESTS PASSED PERFECTLY!");
  process.exit(0);
} else {
  console.error("FAILURES DETECTED IN MATHEMATICAL OR PARSING LOGIC!");
  process.exit(1);
}
