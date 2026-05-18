import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// สร้างท่อเชื่อม Supabase ภายใน API (ใช้ค่าจาก Env)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_managerfocus_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_managerfocus_ANON_KEY!
);

export async function GET(req: Request) {
  try {
    // 1. หาเวลาปัจจุบัน (เวลาไทย UTC+7)
    const now = new Date();
    const thaiTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now); // จะได้ค่าเช่น "14:00"

    console.log(`Checking tasks for time: ${thaiTime}`);

    // 2. ไปถาม Supabase ว่ามีงานไหน status = 'planned' และ start_time ตรงกับตอนนี้บ้าง
    const { data: tasks, error } = await supabase
      .from('manager_tasks')
      .select('*')
      .eq('status', 'planned')
      .eq('start_time', thaiTime);

    if (error) throw error;

    // 3. ถ้ามีงานที่ถึงเวลาแล้ว ให้ยิงแจ้งเตือนเข้า MS Teams
    if (tasks && tasks.length > 0) {
      const webhookUrl = process.env.TEAMS_WEBHOOK_URL_MF;
      
      for (const task of tasks) {
        await fetch(webhookUrl!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: `⏰ **แจ้งเตือนถึงเวลาทำงาน!**\n\n👤 **เจ้าของงาน:** ${task.owner_email}\n📌 **ชื่องาน:** ${task.title}\n⚡ **เริ่มเลยตอนนี้!** (${task.start_time})`
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
