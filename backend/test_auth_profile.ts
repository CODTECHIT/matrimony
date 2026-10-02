import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "yfj-matrimony-secret-key-2026";

async function main() {
  // Create token for demo (64e47f1a-f4b5-46d0-8e4d-3461627510f8)
  const token = jwt.sign(
    { id: "64e47f1a-f4b5-46d0-8e4d-3461627510f8", role: "user", plan: "gold", gender: "female" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  const res = await fetch("http://[::1]:5000/api/profiles/731b696f-7d37-4e33-a37b-356c6d38a370", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  console.log("AUTHED GET PROFILE RESPONSE:", JSON.stringify(data, null, 2));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
