import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, department, location } = body; 

    if (!department) {
      return NextResponse.json({ success: false, error: '[X-RAY] ระบบไม่ได้รับชื่อแผนก!' }, { status: 400 });
    }

    const cleanDeptName = department.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();

    let specificToken = '';
    let specificTargetId = '';

    // เช็คกุญแจทีละแผนกแบบ Hardcode (แก้ปัญหา Next.js มองไม่เห็นตัวแปร)
    if (cleanDeptName === 'ECBUPD18326') {
      specificToken = process.env.LINE_TOKEN_ECBUPD18326 || '';
      specificTargetId = process.env.LINE_TARGET_ECBUPD18326 || '';
    } 
    else if (cleanDeptName === 'ECBUME18326') {
      specificToken = process.env.LINE_TOKEN_ECBUME18326 || '';
      specificTargetId = process.env.LINE_TARGET_ECBUME18326 || '';
    } 
    else {
      specificToken = process.env.LINE_ACCESS_TOKEN || '';
      specificTargetId = process.env.LINE_TARGET_ID || '';
    }

    if (!specificToken || !specificTargetId) {
      return NextResponse.json({ 
        success: false, 
        error: `[X-RAY] ได้ชื่อแผนก: "${cleanDeptName}" แต่ Next.js ดึงกุญแจไม่ได้!` 
      }, { status: 400 });
    }

    // --- ส่วนเช็คเวลาส่งพิกัดตู้ ---
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: 'numeric', minute: 'numeric', hour12: false });
    const [hour, minute] = formatter.format(now).split(':').map(Number);
    const isAfterHours = (hour === 19 && minute >= 50) || (hour > 19) || (hour < 8);

    let finalMessage = message;
    if (isAfterHours && location && location !== '-') {
      finalMessage += `\n📍 พิกัดตู้: ${location}\n(Admin เลิกงานแล้ว ช่างหยิบเองได้เลยครับ)`;
    }

    // 🌟 1. ยิงไปหา LINE
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
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

    const lineData = await lineResponse.json();

    // 🚨 2. ตรวจสอบว่า LINE ยอมรับข้อความไหม? 🚨
    if (!lineResponse.ok) {
      // ถ้า LINE ด่ากลับมา (เช่น 401 Unauthorized หรือ 400 Bad Request)
      // ให้ API ของเราพ่น Error นั้นกลับไปหาหน้าเว็บด้วยสถานะเดียวกัน!
      return NextResponse.json({ 
        success: false, 
        error: `[LINE API Error] ${lineData.message || 'ส่งไม่สำเร็จ'} (Code: ${lineResponse.status})` 
      }, { status: lineResponse.status });
    }

    // ถ้าผ่านฉลุย ค่อยส่ง 200 กลับไป
    return NextResponse.json({ success: true, data: lineData });

  } catch (error) {
    console.error("Send Line Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
