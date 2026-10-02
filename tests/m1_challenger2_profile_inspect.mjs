import { pool } from '../backend/dist/config/db.js';

async function checkProfiles() {
  const { rows } = await pool.query(`
    SELECT p.*, u.full_name, u.mobile, u.email, u.display_id, u.avatar_url
    FROM profiles p
    JOIN users u ON p.id = u.id
    WHERE u.role != 'admin'
  `);
  console.log(JSON.stringify(rows, null, 2));
  await pool.end();
}

checkProfiles().catch(console.error);
