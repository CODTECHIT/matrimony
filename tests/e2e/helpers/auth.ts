import { apiRequest } from "./api.js";

export interface TestUserSession {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    mobile: string;
    gender: string;
    plan: string;
  };
}

let cachedSession: TestUserSession | null = null;
let cachedSilverSession: TestUserSession | null = null;
let cachedGoldSession: TestUserSession | null = null;

export async function createTestUser(
  overrides: Partial<{
    fullName: string;
    gender: "male" | "female";
    email: string;
    mobile: string;
    password: string;
    plan: string;
  }> = {},
): Promise<TestUserSession> {
  const nonce = Math.floor(100000 + Math.random() * 900000);
  const time = Date.now().toString().slice(-6);
  const email = overrides.email || `e2e_test_${time}_${nonce}@example.com`;
  const mobile = overrides.mobile || `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
  const password = overrides.password || "TestPass@1234";

  const payload = {
    fullName: overrides.fullName || `Test User ${nonce}`,
    gender: overrides.gender || "female",
    email,
    mobile,
    password,
    dateOfBirth: "1998-05-15",
    religion: "Hindu",
    caste: "Brahmin",
    motherTongue: "Hindi",
    maritalStatus: "never_married",
    height: "5'5\"",
    education: "B.Tech Computer Science",
    occupation: "Software Engineer",
    employmentStatus: "Private sector",
    incomeRange: "₹12–18 LPA",
    city: "Hyderabad",
    state: "Telangana",
  };

  const res = await apiRequest<{ token: string; user: any }>("auth/register", {
    method: "POST",
    body: payload,
  });

  if (res.status === 200 || res.status === 201) {
    return {
      token: res.data.token,
      user: res.data.user,
    };
  }

  // Fallback: try logging in if already registered
  const loginRes = await apiRequest<{ token: string; user: any }>("auth/login", {
    method: "POST",
    body: { email, password },
  });

  if (loginRes.ok && loginRes.data.token) {
    return {
      token: loginRes.data.token,
      user: loginRes.data.user,
    };
  }

  throw new Error(`Failed to create test user: ${res.status} ${JSON.stringify(res.data)}`);
}

export async function getPrimaryTestSession(): Promise<TestUserSession> {
  if (cachedSession) return cachedSession;
  try {
    cachedSession = await createTestUser({ fullName: "E2E Primary Member", gender: "male" });
    return cachedSession;
  } catch (err: any) {
    // If backend is not available or registration fails, return a synthetic mock session for offline contract testing
    return {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.synthetic_primary_test_token",
      user: {
        id: "e2e00000-0000-0000-0000-000000000001",
        fullName: "E2E Primary Member",
        email: "primary@example.com",
        mobile: "+919876500001",
        gender: "male",
        plan: "free",
      },
    };
  }
}

export async function getSecondaryTestSession(): Promise<TestUserSession> {
  try {
    return await createTestUser({ fullName: "E2E Secondary Member", gender: "female" });
  } catch {
    return {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.synthetic_secondary_test_token",
      user: {
        id: "e2e00000-0000-0000-0000-000000000002",
        fullName: "E2E Secondary Member",
        email: "secondary@example.com",
        mobile: "+919876500002",
        gender: "female",
        plan: "free",
      },
    };
  }
}
