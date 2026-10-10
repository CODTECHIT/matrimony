import { db } from "../config/db.js";

export async function runAdminMigrations() {
  console.log("[Migration] Running admin schema migrations...");

  // 1. audit_logs
  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id VARCHAR(100) NOT NULL,
      admin_name VARCHAR(120),
      action VARCHAR(100) NOT NULL,
      target_type VARCHAR(50) NOT NULL,
      target_id VARCHAR(100),
      metadata JSONB DEFAULT '{}'::jsonb,
      ip_address VARCHAR(50),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
  `);

  // 2. id_verifications
  await db.query(`
    CREATE TABLE IF NOT EXISTS id_verifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_type VARCHAR(50) NOT NULL DEFAULT 'aadhaar',
      document_number VARCHAR(100),
      document_front_url TEXT NOT NULL,
      document_back_url TEXT,
      selfie_url TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      rejection_reason TEXT,
      reviewed_by VARCHAR(100),
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_id_verifications_status ON id_verifications(status);
    CREATE INDEX IF NOT EXISTS idx_id_verifications_user ON id_verifications(user_id);
  `);

  // 3. coupons
  await db.query(`
    CREATE TABLE IF NOT EXISTS coupons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) UNIQUE NOT NULL,
      discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
      discount_value NUMERIC(10, 2) NOT NULL,
      min_amount NUMERIC(10, 2) DEFAULT 0,
      max_discount NUMERIC(10, 2),
      usage_limit INTEGER DEFAULT 100,
      used_count INTEGER DEFAULT 0,
      expires_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
  `);

  // 4. support_tickets and ticket_replies
  await db.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_number VARCHAR(20) UNIQUE NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      user_name VARCHAR(120),
      user_email VARCHAR(255),
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
      assigned_to VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

    CREATE TABLE IF NOT EXISTS ticket_replies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('admin', 'user')),
      sender_name VARCHAR(120),
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 5. banners
  await db.query(`
    CREATE TABLE IF NOT EXISTS banners (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(150) NOT NULL,
      description TEXT,
      image_url TEXT NOT NULL,
      button_text VARCHAR(50),
      button_link VARCHAR(255),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 6. success_stories
  await db.query(`
    CREATE TABLE IF NOT EXISTS success_stories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      couple_name VARCHAR(150) NOT NULL,
      marriage_date DATE,
      story TEXT NOT NULL,
      photo_url TEXT,
      is_published BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 7. site_content
  await db.query(`
    CREATE TABLE IF NOT EXISTS site_content (
      key VARCHAR(100) PRIMARY KEY,
      title VARCHAR(200),
      content JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_by VARCHAR(100),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // 8. system_settings
  await db.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("[Migration] Admin schema migrations completed successfully!");
}

if (process.argv[1]?.endsWith("migrate_admin.ts")) {
  runAdminMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Migration Error]", err);
      process.exit(1);
    });
}
