import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://znniemcrrtlyibrjhdzu.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_sYJ7Ix-4G5TKyRecxtvV_EQ_rkG4v986";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
