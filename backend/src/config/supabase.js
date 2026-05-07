import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

const supabaseUrl =
  env.SUPABASE_URL || process.env.SUPABASE_URL;

const supabaseKey =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or Supabase key in backend .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey);