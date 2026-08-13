import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 💡 ย้ายเข้ามาสร้างในนี้! และใส่ || 'https://dummy.supabase.co' กันเหนียวไว้
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_managerfocus_URL || 'https://dummy.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_managerfocus_ANON_KEY || 'dummy-key';
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const thaiTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);

    console.log(`Checking tasks for time: ${thaiTime}`);

    const { data: tasks, error } = await supabase
      .from('manager_tasks')
      .select('*')
      .eq('status', 'planned')
      .eq('start_time', thaiTime);

    if (error) throw error;

    if (tasks && tasks.length > 0) {
      // 💡 อย่าลืมเช็คชื่อตัวแปรตรงนี้ให้ตรงกับใน Vercel นะครับบอส (_MF)
      const webhookUrl = process.env.TEAMS_WEBHOOK_URL_MF; 
      
      for (const task of tasks) {
        await fetch(webhookUrl!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: `⏰ **แจ้งเตือนถึงเวลาทำงาน!**\n\n👤 **ผู้รับผิดชอบ:** ${task.owner_email}\n\n📌 **ชื่องาน:** ${task.title}\n\n⚡ **เริ่มเลยตอนนี้!** (${task.start_time})`
          }),
        });
      }
    }

    return NextResponse.json({ message: `Checked at ${thaiTime}, found ${tasks?.length} tasks.` });
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
