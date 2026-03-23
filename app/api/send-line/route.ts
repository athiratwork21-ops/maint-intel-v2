import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, department } = body; 

    // 🌟 1. ตั้งค่า Default (ใช้ของเดิมเป็นหลักไว้ก่อน กันเหนียว)
    let lineToken = process.env.LINE_ACCESS_TOKEN;
    let lineTargetId = process.env.LINE_TARGET_ID;

    // 🌟 2. ถ้าระบบส่งชื่อแผนกมาด้วย ให้ลองไปหาห้องเฉพาะของแผนกนั้น
    if (department) {
      // แปลงชื่อแผนกให้เป็นชื่อตัวแปร (เช่น QC-DEPT -> QC_DEPT)
      const cleanDeptName = department.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();

      // ประกอบร่างชื่อตัวแปรที่จะไปหาใน Vercel
      const specificToken = process.env[`LINE_TOKEN_${cleanDeptName}`];
      const specificTargetId = process.env[`LINE_TARGET_${cleanDeptName}`];

      // ถ้าใน Vercel มีการสร้างตัวแปรของแผนกนี้ไว้ ให้เอามาทับของเดิม!
      if (specificToken && specificTargetId) {
        lineToken = specificToken;
        lineTargetId = specificTargetId;
      } else {
        console.warn(`[LINE Warning] ไม่พบ Token/Target ของแผนก ${department} -> ระบบจะส่งเข้าห้อง Default แทน`);
      }
    }

    // เช็คความปลอดภัยรอบสุดท้าย ถ้าไม่มีกุญแจเลยให้หยุดการทำงาน
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
