import { createClient } from '@supabase/supabase-js';

// 🚨 ใส่ URL และ Key ของ Supabase โปรเจกต์ที่ 2 (โปรเจกต์ใหม่)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_SERVICEWORK_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICEWORK_ANON_KEY || '';

export const supabaseServiceWork = createClient(supabaseUrl, supabaseKey);
