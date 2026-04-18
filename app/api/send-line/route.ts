import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, department } = body; 

    // 🌟 1. ตั้งค่า Default
    let lineToken = process.env.LINE_ACCESS_TOKEN;
    let lineTargetId = process.env.LINE_TARGET_ID;

    // 🌟 2. ถ้าระบบส่งชื่อแผนกมาด้วย
    if (department) {
      // แปลงชื่อแผนกให้เป็นชื่อตัวแปร
      const cleanDeptName = department.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();

      // ประกอบร่างชื่อตัวแปรที่จะไปหาใน Vercel
      const specificToken = process.env[`LINE_TOKEN_${cleanDeptName}`];
      const specificTargetId = process.env[`LINE_TARGET_${cleanDeptName}`];

      // ถ้าเจอครบ เอามาทับของเดิม
      if (specificToken && specificTargetId) {
        lineToken = specificToken;
        lineTargetId = specificTargetId;
      } else {
        // 🚨 สับสวิตช์ X-RAY: บังคับให้มันแจ้ง Error ออกหน้าเว็บเลย ห้ามแอบใช้ของ Default! 🚨
        return NextResponse.json({ 
          success: false, 
          error: `[X-RAY Debug]\nระบบพยายามหาตัวแปรชื่อ:\n1. LINE_TOKEN_${cleanDeptName}\n2. LINE_TARGET_${cleanDeptName}\n\nสรุปผล: Token=${specificToken ? '✅เจอ' : '❌ไม่เจอ'} | Target=${specificTargetId ? '✅เจอ' : '❌ไม่เจอ'}` 
        }, { status: 400 });
      }
    }

    // เช็คความปลอดภัยรอบสุดท้าย
    if (!lineToken || !lineTargetId) {
      return NextResponse.json({ success: false, error: 'Missing LINE Credentials' }, { status: 500 });
    }

    // 🌟 3. ยิงข้อความเข้า LINE
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineToken}`
      },
      body: JSON.stringify({
        to: lineTargetId,
        messages: [{ type: 'text', text: message }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Send Line Error:", error);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}
