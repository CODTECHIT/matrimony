-- =============================================================================
-- YFJ MATRIMONY - SEED DATA FOR AWS RDS POSTGRESQL
-- Production Seed: Membership Plans & Default Admin Account
-- (Mock/Seed candidate profiles removed for Milestone 1 live data compliance)
-- =============================================================================

-- 1. SEED MEMBERSHIP PLANS
INSERT INTO plans (id, tier, name, price_inr, duration_months, popular, features, limits)
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

-- 2. SEED ADMIN USER (Default password: Admin@YFJ2026)
INSERT INTO users (id, full_name, email, mobile, password_hash, gender, role, profile_completion, plan, profile_status)
VALUES
('00000000-0000-0000-0000-000000000001', 'YFJ Admin', 'admin@yfjmatrimony.com', '+919999900000', '$2b$10$o9lIRUrvQ9nCjFPm87Pl6ujvslQu4y2.s29Ar/Ihg6GCXuqL7nDRy', 'male', 'admin', 100, 'platinum', 'approved')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;
