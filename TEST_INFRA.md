# YFJ Matrimony — End-to-End (E2E) Test Infrastructure Documentation

## 1. Overview & Testing Philosophy

The YFJ Matrimony E2E Test Suite provides an independent, opaque-box, contract-driven verification harness covering all 9 core functional features defined in `PROJECT.md` and `ORIGINAL_REQUEST.md`. 

The test suite operates from the perspective of an external client (HTTP REST API caller, WebSocket client, and DOM/static code invariant inspector). Tests strictly adhere to documented interface contracts rather than internal implementation details, ensuring that refactoring or backend restructuring does not invalidate test integrity.

### Core Principles
1. **Opaque-Box Verification**: The harness interacts only with publicly observable contracts: HTTP request/response payloads, status codes, WebSocket wire protocols, and frontend build artifacts.
2. **Progressive Testability**: Tests are partitioned into 4 distinct tiers, allowing independent verification of baseline features, edge/boundary cases, cross-feature couplings, and complete real-world user journeys.
3. **Explicit Oracle Derivation**: Every test assertion derives its expected values from documented mathematical models, database schemas, or protocol specifications in `PROJECT.md`.
4. **Self-Contained & Isolated**: Tests generate their own transient test fixtures or utilize deterministic identities without cross-test state leakage.
5. **Fail-Fast with Rich Diagnostics**: All network interactions enforce strict timeouts (2000ms–5000ms), preventing test runner hangs, and emit structured diagnostic reports detailing request/response state upon failure.

---

## 2. Feature Coverage Matrix (F1 – F9)

| Feature ID | Feature Name | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Scenario) | Total Tests |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **F1** | Mock/Seed Data Purge & Live-Only Filtering | 5 | 5 | Coupled (F1+F2+F9) | Scenario 2 | ≥ 10 |
| **F2** | Sequential Profile ID Scheme (`P1`..`P100`, `PA1`..) | 5 | 5 | Coupled (F2+F8, F2+F5, F3+F2) | Scenario 1 | ≥ 10 |
| **F3** | Complete 6-Section Profile Field Editing & Persistence | 5 | 5 | Coupled (F3+F2) | Scenario 1 | ≥ 10 |
| **F4** | Real-Time WebSocket Messaging & Live Chat Delivery | 5 | 5 | Coupled (F4+F6+F8, F5+F4+F6) | Scenario 3 | ≥ 10 |
| **F5** | Real-Time Interest Request & Acceptance State Sync | 5 | 5 | Coupled (F5+F4+F6, F2+F5, F5+F9+F4) | Scenario 2 | ≥ 10 |
| **F6** | Persistent Real-Time Notification Dispatch System | 5 | 5 | Coupled (F5+F4+F6, F4+F6+F8) | Scenario 3 | ≥ 10 |
| **F7** | UI Layout Shift Stabilization & Scroll Restoration | 5 | 5 | Independent Invariant Checks | Scenario 2 | ≥ 10 |
| **F8** | Settings Privacy Toggle Backend Enforcement | 5 | 5 | Coupled (F2+F8, F8+F9, F4+F6+F8) | Scenario 4 | ≥ 10 |
| **F9** | Programmatic Pricing Quota Gating & Usage Enforcement | 5 | 5 | Coupled (F9+F5, F8+F9, F1+F2+F9, F5+F9+F4) | Scenario 5 | ≥ 10 |
| **Total** | **All 9 Features** | **45** | **45** | **9** | **5** | **104** |

---

## 3. 4-Tier Test Suite Architecture

```
tests/e2e/
├── runner.ts                 # CLI test runner entry point (tier filters, color reporter)
├── types.ts                  # Shared TypeScript interfaces for tests, results, suites
├── tier1-features.ts         # Tier 1: 45 isolated feature coverage tests (5 per feature)
├── tier2-boundaries.ts       # Tier 2: 45 boundary, limit, and corner case tests (5 per feature)
├── tier3-combinations.ts     # Tier 3: 9 cross-feature interaction & coupling tests
├── tier4-scenarios.ts        # Tier 4: 5 full lifecycle end-to-end user scenarios
└── helpers/
    ├── assertions.ts         # Expectation library (toBe, toEqual, toMatch, throws, etc.)
    ├── contracts.ts          # Mathematical oracles (Profile ID formula, schemas, plan limits)
    ├── api.ts                # HTTP request wrapper with timeout & JSON parsing
    ├── ws.ts                 # WebSocket client wrapper with event queue & timeouts
    └── auth.ts               # Test authentication & ephemeral user provisioning
```

### Tier Definitions
- **Tier 1 — Feature Coverage (45 tests)**:
  Verifies that every single feature operates according to its specification in the happy path. Checks HTTP status 200/201, valid response JSON, correct field types, and baseline WebSocket event emissions.
- **Tier 2 — Boundary & Corner Cases (45 tests)**:
  Exercises edge conditions: empty inputs, extreme string lengths (2000+ chars), mathematical transitions ($N=100 \to 101$, $N=200 \to 201$, $N=2600 \to 2601$), missing tokens, duplicate requests, negative IDs, and exact quota boundaries ($Q$ vs $Q+1$).
- **Tier 3 — Cross-Feature Combinations (9 tests)**:
  Tests the pairwise coupling between different features (e.g., Sequential ID lookup with privacy masking; Interest acceptance initializing WebSocket chat and unread notifications; Quota gating rejecting interest creation during real-time flow).
- **Tier 4 — Real-World Scenarios (5 tests)**:
  Full multi-step user journeys simulating actual human workflows across registration, profile completion, discovery, interest matching, real-time messaging, and privacy/quota upgrades.

---

## 4. Execution Guide

### Prerequisites
- Node.js v20+ (Node.js v24 recommended, built-in global `fetch` and `WebSocket`)
- TypeScript execution via `tsx`
- Backend server running on `http://localhost:5000` (optional for invariant-only tests, required for live API tests)

### Running Tests

#### Run Entire Suite (All 104 Tests)
```bash
npx tsx tests/e2e/runner.ts
# or explicitly
npx tsx tests/e2e/runner.ts --all
```

#### Run Specific Tiers
```bash
# Tier 1 only (Feature Coverage - 45 tests)
npx tsx tests/e2e/runner.ts --tier=1

# Tier 2 only (Boundary & Corner Cases - 45 tests)
npx tests/e2e/runner.ts --tier=2

# Tier 3 only (Cross-Feature Combinations - 9 tests)
npx tsx tests/e2e/runner.ts --tier=3

# Tier 4 only (Real-World Scenarios - 5 tests)
npx tsx tests/e2e/runner.ts --tier=4
```

#### Environment Variables
| Variable | Default Value | Description |
|---|---|---|
| `TEST_API_URL` | `http://localhost:5000/api` | Base URL for REST API calls |
| `TEST_WS_URL` | `ws://localhost:5000/ws` | Base URL for WebSocket server |
| `TEST_TIMEOUT_MS` | `5000` | Per-test timeout in milliseconds |
| `VERBOSE` | `false` | Enable detailed request/response logs |

---

## 5. Mathematical & Protocol Oracles

### Profile ID Mathematical Formula
Documented in `PROJECT.md § 1`:
$$\text{For } 1 \le N \le 100 \implies \text{P}N$$
$$\text{For } N > 100 \implies Q = \lfloor (N - 101) / 100 \rfloor,\ R = (N - 101) \pmod{100} + 1 \implies \text{P} + \text{String.fromCharCode}(65 + Q) + R$$

Verified Reference Table:
- $N = 1 \implies \text{P1}$
- $N = 100 \implies \text{P100}$
- $N = 101 \implies \text{PA1}$
- $N = 200 \implies \text{PA100}$
- $N = 201 \implies \text{PB1}$
- $N = 300 \implies \text{PB100}$
- $N = 2600 \implies \text{PZ100}$

### Quota Gating Error Codes
- Daily Profile Views Exceeded: HTTP 403 `{ code: "DAILY_VIEW_QUOTA_EXCEEDED" }`
- Monthly Interests Exceeded: HTTP 403 `{ code: "MONTHLY_INTERESTS_EXCEEDED" }`
- Messaging Disabled on Free Plan: HTTP 403 `{ code: "MESSAGING_DISABLED_ON_FREE_PLAN" }`
- Contact Quota Exceeded: HTTP 403 `{ code: "CONTACT_QUOTA_EXCEEDED" }`

---

## 6. Diagnostic & Error Analysis

When a test fails, the runner displays:
1. Exact Test ID and Title
2. Feature attribution (`F1` through `F9`)
3. Expected vs. Actual values
4. Server response body / status code (if HTTP failure)
5. Execution duration in milliseconds
6. Stack trace pinpointing the failing assertion

This enables immediate escalation to the implementing agent responsible for the corresponding milestone.
