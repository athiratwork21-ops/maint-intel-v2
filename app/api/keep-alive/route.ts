import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// 🌟 บังคับให้ Vercel รันโค้ดนี้ใหม่ทุกครั้ง (ห้ามจำค่าเดิม)
export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    // 🌟 สั่งให้ดึงข้อมูลแค่ 1 แถวจากตาราง Departments เพื่อสะกิดฐานข้อมูลเบาๆ
    const { data, error } = await supabase.from('Departments').select('*').limit(1);

    if (error) throw error;

    console.log("⏰ [Cron Job] Supabase is successfully awakened at:", new Date().toISOString());

    return NextResponse.json({ 
      success: true, 
      message: 'Supabase is wide awake!', 
      time: new Date().toISOString() 
    }, { status: 200 });

  } catch (error) {
    console.error("Wake Up Error:", error);
    return NextResponse.json({ success: false, error: 'Failed to wake up Supabase' }, { status: 500 });
  }
}
