import { db, pool } from "./db.js";

async function migratePreferences() {
  console.log("[Migration] Adding preferences column to users table...");
  
  await db.query(`
    ALTER TABLE users 
    ALTER COLUMN preferences SET DEFAULT '{"interests": true, "messages": true, "matches": false, "photo": false, "contact": true, "online": true}'::jsonb;
  `);

  await db.query(`
    UPDATE users 
    SET preferences = '{"interests": true, "messages": true, "matches": false, "photo": false, "contact": true, "online": true}'::jsonb;
  `);

  console.log("[Migration] Successfully updated preferences defaults.");
  await pool.end();
}

migratePreferences().catch((err) => {
  console.error("[Migration Error]", err);
  process.exit(1);
});
