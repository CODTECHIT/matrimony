export class AssertionError extends Error {
  actual: any;
  expected: any;

  constructor(message: string, actual?: any, expected?: any) {
    super(message);
    this.name = "AssertionError";
    this.actual = actual;
    this.expected = expected;
  }
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

export function expect(actual: any) {
  const matchers = (isNot = false) => ({
    toBe(expected: any) {
      const pass = actual === expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${JSON.stringify(actual)} ${isNot ? "NOT to be" : "to be"} ${JSON.stringify(expected)}`,
          actual,
          expected,
        );
      }
    },

    toEqual(expected: any) {
      const pass = deepEqual(actual, expected);
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${JSON.stringify(actual)} ${isNot ? "NOT to equal" : "to equal"} ${JSON.stringify(expected)}`,
          actual,
          expected,
        );
      }
    },

    toBeDefined() {
      const pass = actual !== undefined;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected value ${isNot ? "to be undefined" : "to be defined"}, but got ${actual}`,
          actual,
        );
      }
    },

    toBeUndefined() {
      const pass = actual === undefined;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected value ${isNot ? "NOT to be undefined" : "to be undefined"}, but got ${actual}`,
          actual,
        );
      }
    },

    toBeNull() {
      const pass = actual === null;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected value ${isNot ? "NOT to be null" : "to be null"}, but got ${actual}`,
          actual,
        );
      }
    },

    toBeTruthy() {
      const pass = Boolean(actual);
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${JSON.stringify(actual)} ${isNot ? "NOT to be truthy" : "to be truthy"}`,
          actual,
        );
      }
    },

    toBeFalsy() {
      const pass = !actual;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${JSON.stringify(actual)} ${isNot ? "NOT to be falsy" : "to be falsy"}`,
          actual,
        );
      }
    },

    toContain(item: any) {
      let pass = false;
      if (typeof actual === "string") {
        pass = actual.includes(item);
      } else if (Array.isArray(actual)) {
        pass = actual.some((el) => deepEqual(el, item));
      }
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${JSON.stringify(actual)} ${isNot ? "NOT to contain" : "to contain"} ${JSON.stringify(item)}`,
          actual,
          item,
        );
      }
    },

    toMatch(pattern: RegExp) {
      const pass = typeof actual === "string" && pattern.test(actual);
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected "${actual}" ${isNot ? "NOT to match" : "to match"} pattern ${pattern}`,
          actual,
          pattern.toString(),
        );
      }
    },

    toBeGreaterThan(expected: number) {
      const pass = typeof actual === "number" && actual > expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${actual} ${isNot ? "NOT to be greater than" : "to be greater than"} ${expected}`,
          actual,
          expected,
        );
      }
    },

    toBeGreaterThanOrEqual(expected: number) {
      const pass = typeof actual === "number" && actual >= expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${actual} ${isNot ? "NOT to be >= " : "to be >= "} ${expected}`,
          actual,
          expected,
        );
      }
    },

    toBeLessThan(expected: number) {
      const pass = typeof actual === "number" && actual < expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${actual} ${isNot ? "NOT to be less than" : "to be less than"} ${expected}`,
          actual,
          expected,
        );
      }
    },

    toBeLessThanOrEqual(expected: number) {
      const pass = typeof actual === "number" && actual <= expected;
      if (isNot ? pass : !pass) {
        throw new AssertionError(
          `Expected ${actual} ${isNot ? "NOT to be <= " : "to be <= "} ${expected}`,
          actual,
          expected,
        );
      }
    },

    toHaveLength(expected: number) {
      const pass = (Array.isArray(actual) || typeof actual === "string") && actual.length === expected;
      if (isNot ? pass : !pass) {
        const actualLength = actual?.length;
        throw new AssertionError(
          `Expected length ${isNot ? "NOT to be" : "to be"} ${expected}, but got ${actualLength}`,
          actualLength,
          expected,
        );
      }
    },
  });

  return {
    ...matchers(false),
    not: matchers(true),
  };
}
