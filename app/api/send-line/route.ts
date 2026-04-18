import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, department, location } = body; 

    if (!department) {
      return NextResponse.json({ success: false, error: '[X-RAY] ระบบไม่ได้รับชื่อแผนก!' }, { status: 400 });
    }

    const cleanDeptName = department.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();

    // 🚨 ทางแก้จุดตาย Next.js: ต้องระบุชื่อตัวแปรตรงๆ ห้ามใช้การประกอบร่างคำ 🚨
    let specificToken = '';
    let specificTargetId = '';

    if (cleanDeptName === 'ECBUPD18326') {
      specificToken = process.env.LINE_TOKEN_ECBUPD18326 || '';
      specificTargetId = process.env.LINE_TARGET_ECBUPD18326 || '';
    } 
    else if (cleanDeptName === 'ECBUME18326') {
      specificToken = process.env.LINE_TOKEN_ECBUME18326 || '';
      specificTargetId = process.env.LINE_TARGET_ECBUME18326 || '';
    } 
    else {
      // แผนก Default หรืออื่นๆ
      specificToken = process.env.LINE_ACCESS_TOKEN || '';
      specificTargetId = process.env.LINE_TARGET_ID || '';
    }

    // เช็กความปลอดภัยรอบสุดท้าย
    if (!specificToken || !specificTargetId) {
      return NextResponse.json({ 
        success: false, 
        error: `[X-RAY Debug]\nได้ชื่อแผนก: "${cleanDeptName}"\nแต่ Next.js ดึงกุญแจไม่ได้!` 
      }, { status: 400 });
    }

    // --- 🕒 ส่วนเช็คเวลาสำหรับแจ้งพิกัดตู้ ---
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: 'numeric', minute: 'numeric', hour12: false });
    const [hour, minute] = formatter.format(now).split(':').map(Number);
    const isAfterHours = (hour === 19 && minute >= 50) || (hour > 19) || (hour < 8);

    let finalMessage = message;
    if (isAfterHours && location && location !== '-') {
      finalMessage += `\n📍 พิกัดตู้: ${location}\n(ช่วง Admin เลิกงาน ช่างสามารถไปหยิบเองได้เลยครับ)`;
    }

    // 🌟 ยิงข้อความเข้า LINE
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${specificToken}`
      },
      body: JSON.stringify({
        to: specificTargetId,
        messages: [{ type: 'text', text: finalMessage }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Send Line Error:", error);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}
