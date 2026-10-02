const BASE_URL = "http://localhost:5000/api";

interface RequestResult {
  url: string;
  label: string;
  status: number;
  body: any;
  error?: string;
}

async function runTest(label: string, path: string): Promise<RequestResult> {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url);
    let body: any = null;
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { url, label, status: res.status, body };
  } catch (err: any) {
    return { url, label, status: 0, body: null, error: err.message };
  }
}

async function main() {
  console.log("=== ADVERSARIAL ROUTING & QUERY INJECTION STRESS HARNESS ===\n");

  const results: RequestResult[] = [];

  // 1. Valid Identifiers (P1, P2, UUIDs, mixed case)
  const validCases = [
    { label: "Valid Display ID: P1", path: "/profiles/P1" },
    { label: "Valid Display ID: P2", path: "/profiles/P2" },
    { label: "Valid Display ID lowercase: p1", path: "/profiles/p1" },
    { label: "Valid Display ID mixed-case: p2", path: "/profiles/p2" },
    { label: "Valid UUID: demo", path: "/profiles/64e47f1a-f4b5-46d0-8e4d-3461627510f8" },
    { label: "Valid UUID: ashok", path: "/profiles/4acf0781-6fcf-4877-94f8-936535dea66d" },
  ];

  for (const c of validCases) {
    results.push(await runTest(c.label, c.path));
  }

  // 2. Non-existent but well-formed identifiers (expect 404)
  const notFoundCases = [
    { label: "Non-existent UUID (zero-UUID)", path: "/profiles/00000000-0000-0000-0000-000000000000" },
    { label: "Non-existent Display ID: P99", path: "/profiles/P99" },
    { label: "Non-existent Display ID: PA100", path: "/profiles/PA100" },
    { label: "Non-existent Display ID: PZZ100", path: "/profiles/PZZ100" },
  ];

  for (const c of notFoundCases) {
    results.push(await runTest(c.label, c.path));
  }

  // 3. Malformed Display IDs and Invalid UUIDs (expect 400 or 404, never 500, never crash)
  const malformedCases = [
    { label: "Invalid UUID (contains Z): ...000Z", path: "/profiles/00000000-0000-0000-0000-00000000000Z" },
    { label: "Malformed Display ID: P0", path: "/profiles/P0" },
    { label: "Malformed Display ID: P", path: "/profiles/P" },
    { label: "Malformed Display ID: P-1", path: "/profiles/P-1" },
    { label: "Malformed Display ID: PA0", path: "/profiles/PA0" },
    { label: "Malformed Display ID: P101 (suffix > 100)", path: "/profiles/P101" },
    { label: "Malformed Display ID: PA101 (suffix > 100)", path: "/profiles/PA101" },
  ];

  for (const c of malformedCases) {
    results.push(await runTest(c.label, c.path));
  }

  // 4. SQL Injection Characters in :id (expect safe handling, 400/404, no 500, no SQL leak)
  const sqlInjectionCases = [
    { label: "SQL single quote in :id", path: `/profiles/${encodeURIComponent("P1'")}` },
    { label: "SQL double quote in :id", path: `/profiles/${encodeURIComponent('P1"')}` },
    { label: "SQL boolean injection in :id", path: `/profiles/${encodeURIComponent("P1 OR 1=1")}` },
    { label: "SQL stacked queries in :id", path: `/profiles/${encodeURIComponent("P1; DROP TABLE users;")}` },
    { label: "SQL UNION injection in :id", path: `/profiles/${encodeURIComponent("P1' UNION SELECT * FROM users--")}` },
    { label: "SQL comment injection in :id", path: `/profiles/${encodeURIComponent("P1--")}` },
  ];

  for (const c of sqlInjectionCases) {
    results.push(await runTest(c.label, c.path));
  }

  // 5. Wildcard pattern matching stress on :id (check if ILIKE wildcard allows enumeration)
  const wildcardCases = [
    { label: "Wildcard percentage %", path: `/profiles/${encodeURIComponent("%")}` },
    { label: "Wildcard prefix P%", path: `/profiles/${encodeURIComponent("P%")}` },
    { label: "Wildcard underscore _", path: `/profiles/${encodeURIComponent("_")}` },
    { label: "Wildcard P_", path: `/profiles/${encodeURIComponent("P_")}` },
  ];

  for (const c of wildcardCases) {
    results.push(await runTest(c.label, c.path));
  }

  // 6. Huge string payload (10,000 characters)
  const hugeString = "P" + "A".repeat(5000) + "1".repeat(5000);
  results.push(await runTest("Huge string payload (10,001 chars)", `/profiles/${encodeURIComponent(hugeString)}`));

  // 7. Query Parameter Injection in GET /api/profiles?query=...
  const queryParamCases = [
    { label: "Query param single quote", path: `/profiles?query=${encodeURIComponent("P1'")}` },
    { label: "Query param SQL injection", path: `/profiles?query=${encodeURIComponent("P1' OR '1'='1")}` },
    { label: "Query param stacked queries", path: `/profiles?query=${encodeURIComponent("P1; DROP TABLE users;")}` },
    { label: "Query param exact display ID match", path: `/profiles?query=P1` },
    { label: "Query param lowercase display ID match", path: `/profiles?query=p1` },
  ];

  for (const c of queryParamCases) {
    results.push(await runTest(c.label, c.path));
  }

  // Verify server is still alive
  const healthAfter = await runTest("Health check after stress", "/health");
  results.push(healthAfter);

  // Print results
  console.log("----------------------------------------------------------------------------------");
  console.log(String("TEST LABEL").padEnd(45) + "STATUS  RESULT");
  console.log("----------------------------------------------------------------------------------");

  let criticalFaults = 0;
  let warnings = 0;

  for (const r of results) {
    let outcome = "PASS";
    const bodyStr = typeof r.body === "string" ? r.body : JSON.stringify(r.body);
    const hasSqlError = /syntax error|pg_catalog|column .* does not exist|relation .* does not exist/i.test(bodyStr);

    if (r.status === 0 || r.error) {
      outcome = `FAIL: SERVER CONNECTION ERROR (${r.error})`;
      criticalFaults++;
    } else if (hasSqlError) {
      outcome = "FAIL: LEAKED SQL ERROR!";
      criticalFaults++;
    } else if (r.status === 500) {
      outcome = "FAIL: 500 INTERNAL SERVER ERROR";
      criticalFaults++;
    } else if (r.label.startsWith("Valid Display ID") && r.status !== 200) {
      outcome = `FAIL: Expected 200, got ${r.status}`;
      criticalFaults++;
    } else if (r.label.startsWith("Valid UUID") && r.status !== 200) {
      outcome = `FAIL: Expected 200, got ${r.status}`;
      criticalFaults++;
    } else if (r.label.startsWith("Non-existent") && r.status !== 404) {
      outcome = `FAIL: Expected 404, got ${r.status}`;
      criticalFaults++;
    } else if (r.label.startsWith("Wildcard") && r.status === 200) {
      outcome = "WARNING: Wildcard resolved to a profile (ILIKE wildcard leakage)";
      warnings++;
    }

    console.log(
      r.label.padEnd(45) +
      String(r.status).padEnd(8) +
      outcome +
      (r.status >= 400 ? ` (${JSON.stringify(r.body)})` : "")
    );
  }

  console.log("----------------------------------------------------------------------------------");
  console.log(`Summary: Total Tests=${results.length}, Critical Faults=${criticalFaults}, Warnings=${warnings}`);

  if (criticalFaults > 0) {
    console.error("STRESS TEST FAILED WITH CRITICAL FAULTS!");
    process.exit(1);
  } else {
    console.log("ALL STRESS TESTS COMPLETED WITHOUT CRITICAL FAULTS.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
