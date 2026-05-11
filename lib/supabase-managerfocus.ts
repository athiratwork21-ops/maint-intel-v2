import { createClient } from '@supabase/supabase-js';

// ต้องมี process.env. นำหน้าชื่อตัวแปรนะครับบอส
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_managerfocus_URL || 'https://npericsunhazkcutarxu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_managerfocus_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZXJpY3N1bmhhemtjdXRhcnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTAzNzMsImV4cCI6MjA5MzcyNjM3M30.z73em6T-9GF__oOFPQ9UwcRhJPIQZDzsfUwCqE3oktA';

export const supabase = createClient(supabaseUrl, supabaseKey);
