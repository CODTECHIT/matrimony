import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[Supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Database calls will fail until configured.",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder-project.supabase.co",
  supabaseKey || "placeholder_service_role_key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
