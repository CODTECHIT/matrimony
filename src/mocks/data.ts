import type {
  AdminStats,
  AdminUserRow,
  AuthUser,
  Conversation,
  Interest,
  Message,
  PaymentRow,
  Plan,
  Profile,
  ReportRow,
  Subscription,
} from "@/types";
import photo1 from "@/assets/profile-1.jpg";
import photo2 from "@/assets/profile-2.jpg";
import photo3 from "@/assets/profile-3.jpg";
import photo4 from "@/assets/profile-4.jpg";

/**
 * Demo data used only while VITE_USE_MOCK_API is enabled.
 * Nothing outside src/mocks/ imports this file.
 */

const photos = [photo1, photo2, photo3, photo4];

export const mockUser: AuthUser = {
  id: "u-1001",
  fullName: "Ananya Sharma",
  email: "ananya@example.com",
  mobile: "+91 98XXX XXXXX",
  gender: "female",
  role: "user",
  avatarUrl: photo1,
  profileCompletion: 75,
  plan: "gold",
};

export const mockAdmin: AuthUser = {
  ...mockUser,
  id: "u-0001",
  fullName: "YFJ Admin",
  role: "admin",
};

const base = {
  religion: "Hindu",
  motherTongue: "Hindi",
  country: "India",
  maritalStatus: "never_married" as const,
  employmentStatus: "Private sector",
  verified: true,
  shortlisted: false,
  interestSent: false,
  canViewContact: false,
  family: {
    fatherOccupation: "Retired banker",
    motherOccupation: "Homemaker",
    siblings: "1 younger sister",
    familyType: "Nuclear",
    familyValues: "Moderate",
  },
};

const seeds: Array<Partial<Profile> & Pick<Profile, "id" | "fullName" | "age" | "gender">> = [
  {
    id: "p-1",
    fullName: "Ananya Iyer",
    age: 26,
    gender: "female",
    photos: [photos[0]!, photos[2]!],
    about:
      "I am a simple, caring and family oriented person. Looking for a life partner who respects relationships and values.",
    height: "5'4\"",
    caste: "Brahmin",
    education: "B.Tech, Computer Science",
    occupation: "Software Engineer",
    incomeRange: "₹12–18 LPA",
    city: "Bengaluru",
    state: "Karnataka",
  },
  {
    id: "p-2",
    fullName: "Rohan Deshpande",
    age: 29,
    gender: "male",
    photos: [photos[1]!],
    about:
      "Product manager by profession, marathon runner by weekend. I value honesty, humour and a close-knit family life.",
    height: "5'11\"",
    caste: "Maratha",
    education: "MBA, Finance",
    occupation: "Product Manager",
    incomeRange: "₹18–25 LPA",
    city: "Pune",
    state: "Maharashtra",
  },
  {
    id: "p-3",
    fullName: "Meera Nair",
    age: 27,
    gender: "female",
    photos: [photos[2]!, photos[0]!],
    about:
      "Architect who loves quiet mornings, old cinema and travelling with family. Seeking a kind and grounded partner.",
    height: "5'5\"",
    caste: "Nair",
    motherTongue: "Malayalam",
    education: "M.Arch",
    occupation: "Architect",
    incomeRange: "₹9–12 LPA",
    city: "Kochi",
    state: "Kerala",
  },
  {
    id: "p-4",
    fullName: "Aditya Verma",
    age: 31,
    gender: "male",
    photos: [photos[3]!],
    about:
      "Doctor working with a city hospital. Family means everything to me. Looking for a caring, independent partner.",
    height: "6'0\"",
    caste: "Agarwal",
    education: "MBBS, MD",
    occupation: "Physician",
    incomeRange: "₹25 LPA+",
    city: "New Delhi",
    state: "Delhi",
  },
  {
    id: "p-5",
    fullName: "Sneha Reddy",
    age: 25,
    gender: "female",
    photos: [photos[0]!],
    about: "Chartered accountant, classical dancer and an incurable optimist.",
    height: "5'3\"",
    caste: "Reddy",
    motherTongue: "Telugu",
    education: "CA",
    occupation: "Chartered Accountant",
    incomeRange: "₹12–18 LPA",
    city: "Hyderabad",
    state: "Telangana",
  },
  {
    id: "p-6",
    fullName: "Karthik Menon",
    age: 30,
    gender: "male",
    photos: [photos[1]!],
    about: "Data scientist, cricket enthusiast, and a serious cook on Sundays.",
    height: "5'9\"",
    caste: "Menon",
    motherTongue: "Malayalam",
    education: "M.Tech, AI",
    occupation: "Data Scientist",
    incomeRange: "₹18–25 LPA",
    city: "Chennai",
    state: "Tamil Nadu",
  },
  {
    id: "p-7",
    fullName: "Ishita Kapoor",
    age: 28,
    gender: "female",
    photos: [photos[2]!],
    about: "Corporate lawyer with a soft spot for poetry and long family lunches.",
    height: "5'6\"",
    caste: "Khatri",
    education: "LLB",
    occupation: "Corporate Lawyer",
    incomeRange: "₹18–25 LPA",
    city: "Mumbai",
    state: "Maharashtra",
  },
  {
    id: "p-8",
    fullName: "Vikram Singh",
    age: 32,
    gender: "male",
    photos: [photos[3]!],
    about: "Civil engineer running a family construction business in Jaipur.",
    height: "5'10\"",
    caste: "Rajput",
    education: "B.E, Civil",
    occupation: "Business Owner",
    employmentStatus: "Self employed",
    incomeRange: "₹25 LPA+",
    city: "Jaipur",
    state: "Rajasthan",
  },
];

export const mockProfiles: Profile[] = seeds.map((seed, index) => ({
  ...base,
  photos: [photos[index % photos.length]],
  about: "",
  height: "5'6\"",
  caste: "—",
  education: "—",
  occupation: "—",
  incomeRange: "—",
  city: "—",
  state: "—",
  lastActive: index % 3 === 0 ? "Online now" : `Active ${index + 1} days ago`,
  ...seed,
})) as Profile[];

export const mockPlans: Plan[] = [
  {
    id: "plan-free",
    tier: "free",
    name: "Free",
    priceInr: 0,
    durationMonths: 0,
    features: ["Create your profile", "Browse limited profiles", "Receive interests"],
    limits: {
      profileViews: "10 / day",
      interests: "3 / month",
      messaging: "Not included",
      contacts: "Hidden",
    },
  },
  {
    id: "plan-silver",
    tier: "silver",
    name: "Silver",
    priceInr: 999,
    durationMonths: 3,
    features: ["View limited profiles", "Send interest", "Basic filters"],
    limits: {
      profileViews: "50 / day",
      interests: "25 / month",
      messaging: "Not included",
      contacts: "Hidden",
    },
  },
  {
    id: "plan-gold",
    tier: "gold",
    name: "Gold",
    priceInr: 1999,
    durationMonths: 6,
    popular: true,
    features: [
      "View full profiles",
      "Message your matches",
      "View contact (limited)",
      "Advanced filters",
    ],
    limits: {
      profileViews: "Unlimited",
      interests: "Unlimited",
      messaging: "Matched members",
      contacts: "25 / month",
    },
  },
  {
    id: "plan-platinum",
    tier: "platinum",
    name: "Platinum",
    priceInr: 3499,
    durationMonths: 12,
    features: [
      "All Gold features",
      "View contact details",
      "Priority support",
      "Profile highlight",
    ],
    limits: {
      profileViews: "Unlimited",
      interests: "Unlimited",
      messaging: "Everyone",
      contacts: "Unlimited",
    },
  },
];

export const mockSubscription: Subscription = {
  planId: "plan-gold",
  tier: "gold",
  status: "active",
  startedAt: "2026-05-14",
  expiresAt: "2026-11-14",
  autoRenew: true,
  permissions: {
    canMessage: true,
    canViewContacts: true,
    canUseAdvancedFilters: true,
    profileHighlight: false,
  },
};

export const mockInterestsSent: Interest[] = [
  { id: "i-1", profile: mockProfiles[1]!, status: "pending", sentAt: "2026-08-28" },
  { id: "i-2", profile: mockProfiles[5]!, status: "accepted", sentAt: "2026-08-21" },
];

export const mockInterestsReceived: Interest[] = [
  { id: "i-3", profile: mockProfiles[3]!, status: "pending", sentAt: "2026-08-30" },
  { id: "i-4", profile: mockProfiles[7]!, status: "declined", sentAt: "2026-08-12" },
];

export const mockConversations: Conversation[] = [
  {
    id: "c-1",
    participant: {
      id: mockProfiles[1]!.id,
      fullName: mockProfiles[1]!.fullName,
      photos: mockProfiles[1]!.photos,
    },
    lastMessage: "That sounds lovely. Shall we speak this weekend?",
    lastMessageAt: "2026-09-01T18:20:00Z",
    unreadCount: 2,
  },
  {
    id: "c-2",
    participant: {
      id: mockProfiles[5]!.id,
      fullName: mockProfiles[5]!.fullName,
      photos: mockProfiles[5]!.photos,
    },
    lastMessage: "Thank you for accepting my interest.",
    lastMessageAt: "2026-08-30T09:05:00Z",
    unreadCount: 0,
  },
];

export const mockMessages: Record<string, Message[]> = {
  "c-1": [
    {
      id: "m-1",
      conversationId: "c-1",
      senderId: mockProfiles[1]!.id,
      body: "Hello Ananya, thank you for accepting my interest.",
      sentAt: "2026-09-01T17:40:00Z",
      status: "read",
    },
    {
      id: "m-2",
      conversationId: "c-1",
      senderId: mockUser.id,
      body: "Hi Rohan, happy to connect. Your profile was lovely to read.",
      sentAt: "2026-09-01T17:52:00Z",
      status: "read",
    },
    {
      id: "m-3",
      conversationId: "c-1",
      senderId: mockProfiles[1]!.id,
      body: "That sounds lovely. Shall we speak this weekend?",
      sentAt: "2026-09-01T18:20:00Z",
      status: "delivered",
    },
  ],
  "c-2": [
    {
      id: "m-4",
      conversationId: "c-2",
      senderId: mockProfiles[5]!.id,
      body: "Thank you for accepting my interest.",
      sentAt: "2026-08-30T09:05:00Z",
      status: "read",
    },
  ],
};

export const mockAdminStats: AdminStats = {
  totalUsers: 18420,
  activeUsers: 6234,
  activeSubscriptions: 2871,
  revenueInr: 4820500,
  newRegistrations: 328,
  pendingApprovals: 47,
  revenueSeries: [
    { month: "Mar", revenue: 512000 },
    { month: "Apr", revenue: 604000 },
    { month: "May", revenue: 578000 },
    { month: "Jun", revenue: 712000 },
    { month: "Jul", revenue: 806000 },
    { month: "Aug", revenue: 921000 },
  ],
};

export const mockAdminUsers: AdminUserRow[] = mockProfiles.map((profile, index) => ({
  id: profile.id,
  fullName: profile.fullName,
  mobile: `+91 9${(800000000 + index * 111111).toString()}`,
  gender: profile.gender,
  city: profile.city,
  plan: (["free", "silver", "gold", "platinum"] as const)[index % 4]!,
  profileStatus: (["approved", "pending", "approved", "blocked"] as const)[index % 4]!,
  joinedAt: `2026-0${(index % 8) + 1}-1${index % 9}`,
}));

export const mockPayments: PaymentRow[] = mockAdminUsers.slice(0, 6).map((user, index) => ({
  id: `pay-${1000 + index}`,
  user: user.fullName,
  plan: mockPlans[(index % 3) + 1]!.name,
  amountInr: mockPlans[(index % 3) + 1]!.priceInr,
  status: (["success", "success", "failed", "refunded"] as const)[index % 4]!,
  createdAt: `2026-08-${10 + index}`,
  gatewayRef: `pay_R${index}9X72KDL`,
}));

export const mockReports: ReportRow[] = [
  {
    id: "r-1",
    reportedUser: "Vikram Singh",
    reportedBy: "Meera Nair",
    reason: "Inappropriate messages",
    createdAt: "2026-08-29",
    status: "open",
  },
  {
    id: "r-2",
    reportedUser: "Aditya Verma",
    reportedBy: "Sneha Reddy",
    reason: "Suspected fake photos",
    createdAt: "2026-08-24",
    status: "reviewing",
  },
  {
    id: "r-3",
    reportedUser: "Karthik Menon",
    reportedBy: "Ishita Kapoor",
    reason: "Misleading profile information",
    createdAt: "2026-08-18",
    status: "resolved",
  },
];
