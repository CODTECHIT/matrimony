import { db } from "./src/config/db.js";

async function main() {
  const r = await db.query(
    `SELECT u.id, u.full_name, u.mobile, u.email, u.display_id, u.profile_number, u.preferences
     FROM users u
     WHERE u.id = '731b696f-7d37-4e33-a37b-356c6d38a370'`
  );
  console.log("DEMO2 DETAILS:", r.rows[0]);

  const convs = await db.query(
    "SELECT * FROM conversations WHERE user1_id = '731b696f-7d37-4e33-a37b-356c6d38a370' OR user2_id = '731b696f-7d37-4e33-a37b-356c6d38a370'"
  );
  console.log("CONVERSATIONS:", convs.rows);

  const ints = await db.query(
    "SELECT * FROM interests WHERE sender_id = '731b696f-7d37-4e33-a37b-356c6d38a370' OR receiver_id = '731b696f-7d37-4e33-a37b-356c6d38a370'"
  );
  console.log("INTERESTS:", ints.rows);

  const subs = await db.query(
    "SELECT * FROM subscriptions WHERE user_id = '64e47f1a-f4b5-46d0-8e4d-3461627510f8'"
  );
  console.log("DEMO SUBSCRIPTIONS:", subs.rows);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
