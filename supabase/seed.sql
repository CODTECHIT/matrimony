-- =============================================================================
-- YFJ MATRIMONY - SEED DATA FOR SUPABASE / POSTGRESQL
-- =============================================================================

-- 1. SEED MEMBERSHIP PLANS
INSERT INTO public.plans (id, tier, name, price_inr, duration_months, popular, features, limits)
VALUES
('plan-free', 'free', 'Basic Free', 0, 12, FALSE, 
 ARRAY['Browse verified profiles', 'Send up to 5 interests / month', 'Standard search filters'], 
 '{"profileViews": "50 / day", "interests": "5 / month", "messaging": "Disabled", "contacts": "0"}'::jsonb),

('plan-silver', 'silver', 'Silver Connect', 1499, 3, FALSE, 
 ARRAY['Send up to 30 interests', 'Direct messaging with mutual matches', 'Unlock 15 verified phone numbers', 'Priority search placement'], 
 '{"profileViews": "200 / day", "interests": "30 / month", "messaging": "Mutual matches", "contacts": "15"}'::jsonb),

('plan-gold', 'gold', 'Gold Advantage', 2999, 6, TRUE, 
 ARRAY['Unlimited interest requests', 'Direct instant chat & voice notes', 'Unlock 50 verified contact numbers', 'Highlighted profile badge', 'Dedicated relationship advisor assistance'], 
 '{"profileViews": "Unlimited", "interests": "Unlimited", "messaging": "Unlimited", "contacts": "50"}'::jsonb),

('plan-platinum', 'platinum', 'Platinum VIP', 5499, 12, FALSE, 
 ARRAY['Unlimited contacts & messages', 'VIP profile spotlight on homepage', 'Dedicated relationship manager', 'Horoscope compatibility matching', 'Background verification badge'], 
 '{"profileViews": "Unlimited", "interests": "Unlimited", "messaging": "Unlimited", "contacts": "Unlimited"}'::jsonb)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, price_inr = EXCLUDED.price_inr, features = EXCLUDED.features, limits = EXCLUDED.limits;

-- 2. SEED ADMIN USER
-- Default login password: Admin@YFJ2026 (hashed with bcrypt)
INSERT INTO public.users (id, full_name, email, mobile, password_hash, gender, role, profile_completion, plan, profile_status)
VALUES
('00000000-0000-0000-0000-000000000001', 'YFJ Admin', 'admin@yfjmatrimony.com', '+919999900000', '$2b$10$o9lIRUrvQ9nCjFPm87Pl6ujvslQu4y2.s29Ar/Ihg6GCXuqL7nDRy', 'male', 'admin', 100, 'platinum', 'approved')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 3. SEED INITIAL SAMPLE USERS & PROFILES (Default password: Password@123)
INSERT INTO public.users (id, full_name, email, mobile, password_hash, gender, role, avatar_url, profile_completion, plan, profile_status)
VALUES
('11111111-1111-1111-1111-111111111111', 'Ananya Iyer', 'ananya.iyer@example.com', '+919876543210', '$2b$10$Mofl0vVVFVKXwgxXnVr9H.KROHNvn0LgaAbFMvHiIBT1fgpt1NIE6', 'female', 'user', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80', 85, 'gold', 'approved'),
('22222222-2222-2222-2222-222222222222', 'Rohan Deshpande', 'rohan.d@example.com', '+919876543211', '$2b$10$Mofl0vVVFVKXwgxXnVr9H.KROHNvn0LgaAbFMvHiIBT1fgpt1NIE6', 'male', 'user', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80', 90, 'silver', 'approved'),
('33333333-3333-3333-3333-333333333333', 'Meera Nair', 'meera.nair@example.com', '+919876543212', '$2b$10$Mofl0vVVFVKXwgxXnVr9H.KROHNvn0LgaAbFMvHiIBT1fgpt1NIE6', 'female', 'user', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80', 80, 'free', 'approved'),
('44444444-4444-4444-4444-444444444444', 'Aditya Verma', 'aditya.v@example.com', '+919876543213', '$2b$10$Mofl0vVVFVKXwgxXnVr9H.KROHNvn0LgaAbFMvHiIBT1fgpt1NIE6', 'male', 'user', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80', 95, 'platinum', 'approved')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO public.profiles (id, age, date_of_birth, about, height, religion, caste, mother_tongue, marital_status, education, occupation, employment_status, income_range, city, state, country, photos, verified, father_occupation, mother_occupation, siblings, family_type, family_values, whatsapp)
VALUES
('11111111-1111-1111-1111-111111111111', 26, '1998-04-12', 'I am a simple, caring and family-oriented person. Looking for a life partner who respects relationships and modern values.', '5''4"', 'Hindu', 'Brahmin', 'Tamil', 'never_married', 'B.Tech, Computer Science', 'Software Engineer', 'Private sector', '₹12–18 LPA', 'Bengaluru', 'Karnataka', 'India', ARRAY['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80'], TRUE, 'Retired bank officer', 'School teacher', '1 younger brother', 'Nuclear', 'Moderate', '+919876543210'),

('22222222-2222-2222-2222-222222222222', 29, '1995-09-20', 'Product manager by profession, runner by weekend. I value honesty, humor and close-knit family life.', '5''11"', 'Hindu', 'Maratha', 'Marathi', 'never_married', 'MBA, Finance', 'Product Manager', 'Private sector', '₹18–25 LPA', 'Pune', 'Maharashtra', 'India', ARRAY['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80'], TRUE, 'Civil Engineer', 'Homemaker', '1 elder sister (married)', 'Nuclear', 'Moderate', '+919876543211'),

('33333333-3333-3333-3333-333333333333', 27, '1997-02-14', 'Architect who loves quiet mornings, old cinema, design and travel. Seeking a kind, progressive partner.', '5''5"', 'Hindu', 'Nair', 'Malayalam', 'never_married', 'M.Arch', 'Architect', 'Self employed', '₹9–12 LPA', 'Kochi', 'Kerala', 'India', ARRAY['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80'], TRUE, 'Professor', 'Homemaker', 'None', 'Nuclear', 'Liberal', '+919876543212'),

('44444444-4444-4444-4444-444444444444', 31, '1993-11-05', 'Doctor working at a superspecialty hospital. Seeking a warm and understanding life partner.', '6''0"', 'Hindu', 'Agarwal', 'Hindi', 'never_married', 'MBBS, MD', 'Physician', 'Private sector', '₹25 LPA+', 'New Delhi', 'Delhi', 'India', ARRAY['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80'], TRUE, 'Senior Advocate', 'Doctor', '1 brother', 'Joint', 'Moderate', '+919876543213')
ON CONFLICT (id) DO NOTHING;
