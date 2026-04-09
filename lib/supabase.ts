import { createClient } from '@supabase/supabase-js'

// เอา URL ที่ก๊อปมา วางแทนที่ข้อความด้านล่างนี้ (อย่าลบเครื่องหมายคำพูด ' ' ออกนะครับ)
const supabaseUrl = 'https://yiqltqonrtfgtwwbumkv.supabase.co'

// เอา Key ยาวๆ ที่ก๊อปมา วางแทนที่ข้อความด้านล่างนี้ (อย่าลบเครื่องหมายคำพูด ' ' ออกนะครับ)
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpcWx0cW9ucnRmZ3R3d2J1bWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjkyMzksImV4cCI6MjA4ODcwNTIzOX0.WmMUedBgqOzrLkpo0PZ37t-calQNlYfPwW7zV3yMeJA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
  auth: {
      // 🌟 บังคับให้ใช้ Session Storage (ความจำระยะสั้น ปิดแท็บ = ลืม) 🌟
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
