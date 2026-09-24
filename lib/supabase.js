import { createClient } from "@supabase/supabase-js";

// แอปนี้ใช้ฐานข้อมูล Supabase โปรเจกต์นี้โดยตรง
// ใช้ publishable key ซึ่งเปิดเผยฝั่ง browser ได้ตามการออกแบบของ Supabase
const SUPABASE_URL = "https://znniemcrrtlyibrjhdzu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sYJ7Ix-4G5TKyRecxtVvEQ_rkG4v986";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
