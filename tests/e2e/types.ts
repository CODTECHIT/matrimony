export type FeatureId =
  | "F1"
  | "F2"
  | "F3"
  | "F4"
  | "F5"
  | "F6"
  | "F7"
  | "F8"
  | "F9";

export interface TestCase {
  id: string;
  feature: FeatureId | "CROSS" | "SCENARIO";
  title: string;
  tier: 1 | 2 | 3 | 4;
  run: () => Promise<void>;
}

export interface TestResult {
  id: string;
  feature: FeatureId | "CROSS" | "SCENARIO";
  title: string;
  tier: 1 | 2 | 3 | 4;
  status: "passed" | "failed" | "skipped";
  durationMs: number;
  error?: Error;
}

export interface TierSummary {
  tier: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
}

export interface RunnerOptions {
  tier?: 1 | 2 | 3 | 4 | "all";
  verbose?: boolean;
  filter?: string;
  timeoutMs?: number;
}
