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
  displayId?: string;
  fullName: string;
  email?: string;
  mobile?: string;
  gender: Gender;
  role: "user" | "admin";
  avatarUrl?: string;
  profileCompletion: number;
  plan: PlanTier;
  /** Set by backend/admin. "pending" = waiting for admin approval; "blocked" = suspended. */
  profileStatus?: "pending" | "approved" | "blocked";
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
  displayId?: string;
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
  /** True when the interest has been mutually accepted — i.e. they are connected/friends. */
  isConnected: boolean;
  /** Present when isConnected is true — links to the shared conversation. */
  conversationId?: string;
  /** Backend-controlled. The UI must never infer contact access itself. */
  canViewContact: boolean;
  contact?: { mobile: string; whatsapp?: string };
  /** Rule-based compatibility score (0-100%) computed for recommended matches. */
  matchScore?: number;
  /** Percentage of profile completed (0-100%) */
  profileCompletion?: number;
  /** Admin-controlled approval state. Only "approved" profiles appear in browse. */
  profileStatus?: "pending" | "approved" | "blocked";
  /** True if the profile owner has profileHighlight/VIP permission on their subscription. */
  isVip?: boolean;
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
  conversationId?: string;
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
  limits?: { profileViews: string; interests: string; messaging: string; contacts: string };
  permissions: {
    canMessage: boolean;
    canViewContacts: boolean;
    canUseAdvancedFilters: boolean;
    profileHighlight: boolean;
  };
}

export interface Conversation {
  id: string;
  participant: Pick<Profile, "id" | "displayId" | "fullName" | "photos">;
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
  verifiedProfiles?: number;
  pendingVerifications?: number;
  openReports?: number;
  openTickets?: number;
  totalMatches?: number;
  revenueSeries: { month: string; revenue: number }[];
}

export interface AdminUserRow {
  id: string;
  displayId?: string;
  fullName: string;
  mobile: string;
  gender: Gender;
  city: string;
  religion?: string;
  age?: number | null;
  plan: PlanTier;
  profileStatus: "pending" | "approved" | "blocked";
  verified?: boolean;
  photosCount?: number;
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
  reportedUserId?: string;
  reportedById?: string;
  reportedUser: string;
  reportedBy: string;
  reason: string;
  createdAt: string;
  status: "open" | "reviewing" | "resolved";
}

export interface VerificationItem {
  id: string;
  user_id: string;
  document_type: string;
  document_number?: string;
  document_front_url: string;
  document_back_url?: string;
  selfie_url?: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  user_name: string;
  user_mobile: string;
  display_id?: string;
  avatar_url?: string;
  city?: string;
  photos?: string[];
}

export interface AuditLogRow {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface AdminFullProfile {
  id: string;
  full_name: string;
  email?: string;
  mobile: string;
  gender: Gender;
  role: string;
  plan: PlanTier;
  profile_status: "pending" | "approved" | "blocked";
  profile_completion: number;
  display_id?: string;
  joined_at: string;
  age?: number;
  date_of_birth?: string;
  about?: string;
  height?: string;
  religion?: string;
  caste?: string;
  mother_tongue?: string;
  marital_status?: string;
  education?: string;
  occupation?: string;
  employment_status?: string;
  income_range?: string;
  city?: string;
  state?: string;
  country?: string;
  photos?: string[];
  videos?: string[];
  verified?: boolean;
  father_occupation?: string;
  mother_occupation?: string;
  siblings?: string;
  family_type?: string;
  family_values?: string;
  whatsapp?: string;
  last_active?: string;
}

export interface SupportTicketRow {
  id: string;
  ticket_number: string;
  user_id?: string;
  user_name: string;
  user_email?: string;
  subject: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  replies_count?: number;
  replies?: TicketReply[];
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  sender_type: "admin" | "user";
  sender_name: string;
  message: string;
  created_at: string;
}

export interface MatchOverviewData {
  metrics: {
    totalInterests: number;
    acceptedInterests: number;
    declinedInterests: number;
    pendingInterests: number;
    acceptanceRate: number;
    totalShortlists: number;
    totalConversations: number;
  };
  recentActivity: Array<{
    id: string;
    status: string;
    created_at: string;
    sender_name: string;
    sender_display_id?: string;
    sender_gender: string;
    receiver_name: string;
    receiver_display_id?: string;
    receiver_gender: string;
  }>;
}

export interface CouponRow {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_amount: number;
  max_discount?: number | null | undefined;
  usage_limit: number;
  used_count: number;
  expires_at?: string | null | undefined;
  valid_until?: string | null | undefined;
  is_active: boolean;
  created_at: string;
}

export interface BannerRow {
  id: string;
  title: string;
  description?: string | undefined;
  image_url: string;
  button_text?: string | undefined;
  button_link?: string | undefined;
  link_url?: string | null | undefined;
  position?: number | undefined;
  target_audience?: string | undefined;
  is_active: boolean;
  start_date?: string | null | undefined;
  end_date?: string | null | undefined;
  created_at: string;
}

export interface SuccessStoryRow {
  id: string;
  couple_name: string;
  marriage_date?: string | null;
  story: string;
  photo_url?: string | null;
  is_published: boolean;
  created_at: string;
}

export interface SiteContentRow {
  key: string;
  title: string;
  content: {
    body?: string;
    lastUpdated?: string;
    [key: string]: unknown;
  };
  updated_by?: string;
  updated_at: string;
}

export interface SystemSettings {
  maintenance_mode: boolean;
  allow_registrations: boolean;
  require_verification_to_chat: boolean;
  free_interests_per_day: number;
  contact_email: string;
  helpline_phone: string;
  payment_gateway_mode: "sandbox" | "live";
  auto_approve_profiles: boolean;
  [key: string]: unknown;
}

export interface StaffMemberRow {
  id: string;
  full_name: string;
  email: string;
  mobile?: string;
  role: "admin" | "moderator" | "support" | "user";
  avatar_url?: string;
  created_at: string;
}

export interface AdminAnalyticsData {
  registrationTrend: Array<{ day: string; count: number }>;
  genderBreakdown: Array<{ gender: string; count: number }>;
  planBreakdown: Array<{ plan: string; count: number }>;
  ticketStats: Array<{ status: string; count: number }>;
  verificationStats: Array<{ status: string; count: number }>;
}



