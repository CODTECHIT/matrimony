/** Shared domain types. These mirror the contracts the backend must expose. */

export type Gender = "male" | "female";
export type MaritalStatus = "never_married" | "divorced" | "widowed" | "awaiting_divorce";
export type PlanTier = "free" | "silver" | "gold" | "platinum";
export type InterestStatus = "pending" | "accepted" | "declined";

export interface ApiListResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email?: string;
  mobile?: string;
  gender: Gender;
  role: "user" | "admin";
  avatarUrl?: string;
  profileCompletion: number;
  plan: PlanTier;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface FamilyDetails {
  fatherOccupation?: string;
  motherOccupation?: string;
  siblings?: string;
  familyType?: string;
  familyValues?: string;
}

export interface Profile {
  id: string;
  fullName: string;
  age: number;
  gender: Gender;
  dateOfBirth?: string;
  photos: string[];
  verified: boolean;
  about: string;
  height: string;
  religion: string;
  caste: string;
  motherTongue: string;
  maritalStatus: MaritalStatus;
  education: string;
  occupation: string;
  employmentStatus: string;
  incomeRange: string;
  city: string;
  state: string;
  country: string;
  family: FamilyDetails;
  lastActive: string;
  shortlisted: boolean;
  interestSent: boolean;
  /** Backend-controlled. The UI must never infer contact access itself. */
  canViewContact: boolean;
  contact?: { mobile: string; whatsapp?: string };
  /** Rule-based compatibility score (0-100%) computed for recommended matches. */
  matchScore?: number;
  /** Percentage of profile completed (0-100%) */
  profileCompletion?: number;
}

export interface ProfileFilters {
  query?: string | undefined;
  gender?: Gender | undefined;
  ageMin?: number | undefined;
  ageMax?: number | undefined;
  religion?: string | undefined;
  caste?: string | undefined;
  motherTongue?: string | undefined;
  maritalStatus?: MaritalStatus | undefined;
  education?: string | undefined;
  occupation?: string | undefined;
  incomeRange?: string | undefined;
  city?: string | undefined;
  sort?: "recent" | "relevance" | "age_asc" | "age_desc" | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export interface Interest {
  id: string;
  profile: Profile;
  status: InterestStatus;
  sentAt: string;
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  priceInr: number;
  durationMonths: number;
  popular?: boolean;
  features: string[];
  limits: { profileViews: string; interests: string; messaging: string; contacts: string };
  permissions?: {
    canMessage: boolean;
    canViewContacts: boolean;
    canUseAdvancedFilters: boolean;
    profileHighlight: boolean;
  };
}

export interface Subscription {
  planId: string;
  tier: PlanTier;
  status: "active" | "expired" | "none";
  startedAt?: string;
  expiresAt?: string;
  autoRenew: boolean;
  permissions: {
    canMessage: boolean;
    canViewContacts: boolean;
    canUseAdvancedFilters: boolean;
    profileHighlight: boolean;
  };
}

export interface Conversation {
  id: string;
  participant: Pick<Profile, "id" | "fullName" | "photos">;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  sentAt: string;
  status: "sending" | "sent" | "delivered" | "read" | "failed";
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  activeSubscriptions: number;
  revenueInr: number;
  newRegistrations: number;
  pendingApprovals: number;
  revenueSeries: { month: string; revenue: number }[];
}

export interface AdminUserRow {
  id: string;
  fullName: string;
  mobile: string;
  gender: Gender;
  city: string;
  plan: PlanTier;
  profileStatus: "pending" | "approved" | "blocked";
  joinedAt: string;
}

export interface PaymentRow {
  id: string;
  user: string;
  plan: string;
  amountInr: number;
  status: "success" | "failed" | "refunded";
  createdAt: string;
  gatewayRef: string;
}

export interface ReportRow {
  id: string;
  reportedUser: string;
  reportedBy: string;
  reason: string;
  createdAt: string;
  status: "open" | "reviewing" | "resolved";
}
