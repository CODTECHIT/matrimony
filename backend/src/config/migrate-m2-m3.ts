import { pool } from "./db.js";

export async function runMigrations() {
  console.log("[Migration] Running M2 & M3 schema migrations on AWS RDS PostgreSQL...");

  // 1. Notifications table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      data JSONB DEFAULT '{}'::jsonb,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
  `);
  console.log("[Migration] Table 'notifications' verified/created.");

  // 2. Daily profile views quota tracking
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_profile_views (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      view_date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_daily_view UNIQUE(user_id, profile_id, view_date)
    );
    CREATE INDEX IF NOT EXISTS idx_daily_views_lookup ON daily_profile_views(user_id, view_date);
  `);
  console.log("[Migration] Table 'daily_profile_views' verified/created.");

  // 3. Contact unlocks quota tracking
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_unlocks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contact_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_contact_unlock UNIQUE(user_id, contact_user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_contact_unlocks_user ON contact_unlocks(user_id);
  `);
  console.log("[Migration] Table 'contact_unlocks' verified/created.");

  console.log("[Migration] All migrations completed successfully!");
}

if (process.argv[1]?.endsWith("migrate-m2-m3.ts") || process.argv[1]?.endsWith("migrate-m2-m3.js")) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error("[Migration Error]", err);
      process.exit(1);
    });
}
