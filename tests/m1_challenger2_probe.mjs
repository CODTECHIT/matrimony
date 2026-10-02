import { pool } from '../backend/dist/config/db.js';

async function probe() {
  const users = await pool.query('SELECT id, email, mobile, display_id, full_name, role FROM users');
  console.log('=== USERS ===');
  console.log(JSON.stringify(users.rows, null, 2));

  const profileCols = await pool.query(`
    SELECT column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    ORDER BY ordinal_position
  `);
  console.log('=== PROFILES COLUMNS ===');
  console.log(JSON.stringify(profileCols.rows, null, 2));

  await pool.end();
}

probe().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
