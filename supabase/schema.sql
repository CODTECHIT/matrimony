-- =============================================================================
-- YFJ MATRIMONY - SUPABASE POSTGRESQL SCHEMA
-- Compatible with Supabase Postgres and AWS RDS PostgreSQL
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
-- Handles authentication, roles, account tier, and approval status
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE,
    mobile VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    avatar_url TEXT,
    profile_completion INTEGER NOT NULL DEFAULT 20 CHECK (profile_completion BETWEEN 0 AND 100),
    plan VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'silver', 'gold', 'platinum')),
    profile_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (profile_status IN ('pending', 'approved', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PROFILES TABLE
-- Extended matrimonial profile details matching form fields and discovery filters
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    age INTEGER CHECK (age >= 18 AND age <= 80),
    date_of_birth DATE,
    about TEXT,
    height VARCHAR(20),
    religion VARCHAR(50),
    caste VARCHAR(80),
    mother_tongue VARCHAR(50),
    marital_status VARCHAR(30) DEFAULT 'never_married' CHECK (marital_status IN ('never_married', 'divorced', 'widowed', 'awaiting_divorce')),
    education VARCHAR(120),
    occupation VARCHAR(120),
    employment_status VARCHAR(50),
    income_range VARCHAR(50),
    city VARCHAR(80),
    state VARCHAR(80),
    country VARCHAR(80) DEFAULT 'India',
    photos TEXT[] DEFAULT '{}',
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    father_occupation VARCHAR(100),
    mother_occupation VARCHAR(100),
    siblings VARCHAR(100),
    family_type VARCHAR(30),
    family_values VARCHAR(30),
    whatsapp VARCHAR(20),
    last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SHORTLISTS TABLE
-- Bookmarked profiles
CREATE TABLE IF NOT EXISTS public.shortlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    target_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_shortlist UNIQUE (user_id, target_profile_id)
);

-- 4. INTERESTS TABLE
-- Matchmaking express interest requests
CREATE TABLE IF NOT EXISTS public.interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_sender_receiver UNIQUE (sender_id, receiver_id)
);

-- 5. CONVERSATIONS TABLE
-- 1-on-1 direct chat threads between members
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_message TEXT DEFAULT '',
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_conversation_pair UNIQUE (user1_id, user2_id)
);

-- 6. MESSAGES TABLE
-- Individual messages inside a conversation
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. MEMBERSHIP PLANS TABLE
CREATE TABLE IF NOT EXISTS public.plans (
    id VARCHAR(30) PRIMARY KEY,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'silver', 'gold', 'platinum')),
    name VARCHAR(60) NOT NULL,
    price_inr INTEGER NOT NULL DEFAULT 0,
    duration_months INTEGER NOT NULL DEFAULT 1,
    popular BOOLEAN NOT NULL DEFAULT FALSE,
    features TEXT[] NOT NULL DEFAULT '{}',
    limits JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. USER SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id VARCHAR(30) NOT NULL REFERENCES public.plans(id),
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'silver', 'gold', 'platinum')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'none')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. PAYMENT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_id VARCHAR(30) NOT NULL REFERENCES public.plans(id),
    amount_inr INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'refunded')),
    gateway_ref VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. USER ABUSE REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reported_by_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR FAST MATCHMAKING AND FILTERING
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_users_mobile ON public.users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.users(gender);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON public.profiles(age);
CREATE INDEX IF NOT EXISTS idx_profiles_religion ON public.profiles(religion);
CREATE INDEX IF NOT EXISTS idx_profiles_caste ON public.profiles(caste);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_income_range ON public.profiles(income_range);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON public.profiles(verified);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active DESC);

CREATE INDEX IF NOT EXISTS idx_interests_sender ON public.interests(sender_id);
CREATE INDEX IF NOT EXISTS idx_interests_receiver ON public.interests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_shortlists_user ON public.shortlists(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);

-- =============================================================================
-- AUTO UPDATE TIMESTAMPS TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_users ON public.users;
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_profiles ON public.profiles;
CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_interests ON public.interests;
CREATE TRIGGER set_timestamp_interests
BEFORE UPDATE ON public.interests
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- 1. Enable RLS on all sensitive tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 2. USERS policies
DROP POLICY IF EXISTS "Users can view active/approved profiles and own record" ON public.users;
CREATE POLICY "Users can view active/approved profiles and own record" ON public.users
  FOR SELECT USING (profile_status != 'blocked' OR id = auth.uid());

DROP POLICY IF EXISTS "Users can update own record" ON public.users;
CREATE POLICY "Users can update own record" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- 3. PROFILES policies
DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- 4. SHORTLISTS policies
DROP POLICY IF EXISTS "Users manage own shortlists" ON public.shortlists;
CREATE POLICY "Users manage own shortlists" ON public.shortlists
  FOR ALL USING (user_id = auth.uid());

-- 5. INTERESTS policies
DROP POLICY IF EXISTS "Participants can view interests" ON public.interests;
CREATE POLICY "Participants can view interests" ON public.interests
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "Users can send interests" ON public.interests;
CREATE POLICY "Users can send interests" ON public.interests
  FOR INSERT WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Receivers can update interest status" ON public.interests;
CREATE POLICY "Receivers can update interest status" ON public.interests
  FOR UPDATE USING (receiver_id = auth.uid());

-- 6. CONVERSATIONS policies
DROP POLICY IF EXISTS "Participants can view and access conversations" ON public.conversations;
CREATE POLICY "Participants can view and access conversations" ON public.conversations
  FOR ALL USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- 7. MESSAGES policies
DROP POLICY IF EXISTS "Conversation participants can read messages" ON public.messages;
CREATE POLICY "Conversation participants can read messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Senders can insert their own messages" ON public.messages;
CREATE POLICY "Senders can insert their own messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- 8. PLANS policies
DROP POLICY IF EXISTS "Plans are publicly readable" ON public.plans;
CREATE POLICY "Plans are publicly readable" ON public.plans
  FOR SELECT USING (true);

-- 9. SUBSCRIPTIONS & PAYMENTS policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (user_id = auth.uid());

-- 10. REPORTS policies
DROP POLICY IF EXISTS "Users can create abuse reports" ON public.reports;
CREATE POLICY "Users can create abuse reports" ON public.reports
  FOR INSERT WITH CHECK (reported_by_id = auth.uid());
