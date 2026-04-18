import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, department, location } = body; 

    // 🚨 1. ด่านตรวจคนเข้าเมือง: บังคับเลยว่า "ต้องมีชื่อแผนกเท่านั้น" 🚨
    if (!department) {
      return NextResponse.json({ 
        success: false, 
        error: `[X-RAY] ระบบไม่ได้รับชื่อแผนก!\n(แปลว่าโค้ดหน้าเว็บยังเป็นเวอร์ชันเก่า หรือ Vercel ยังอัปเดตไม่เสร็จครับ)` 
      }, { status: 400 });
    }

    // 🌟 2. แปลงชื่อแผนกให้เป็นชื่อตัวแปร
    const cleanDeptName = department.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();

    // ประกอบร่างชื่อตัวแปรที่จะไปหาใน Vercel
    const specificToken = process.env[`LINE_TOKEN_${cleanDeptName}`];
    const specificTargetId = process.env[`LINE_TARGET_${cleanDeptName}`];

    // 🚨 3. ด่านตรวจตู้เซฟ: หากุญแจไม่เจอ ฟ้องเลย!
    if (!specificToken || !specificTargetId) {
      return NextResponse.json({ 
        success: false, 
        error: `[X-RAY Debug]\nได้ชื่อแผนกมาคือ "${department}"\nแต่หากุญแจใน Vercel ไม่เจอ!\nลองเช็กชื่อ: LINE_TOKEN_${cleanDeptName}` 
      }, { status: 400 });
    }

    // --- 🕒 4. เช็คเวลา (Thailand Time) สำหรับพิกัดตู้ ---
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: 'numeric', minute: 'numeric', hour12: false });
    const [hour, minute] = formatter.format(now).split(':').map(Number);
    
    // เงื่อนไข: หลัง 19.50 น. (19:50-23:59) หรือก่อน 08.00 น. (00:00-07:59)
    const isAfterHours = (hour === 19 && minute >= 50) || (hour > 19) || (hour < 8);

    let finalMessage = message;
    if (isAfterHours && location && location !== '-') {
      finalMessage += `\n📍 พิกัดตู้: ${location}\n(ช่วง Admin เลิกงาน ช่างสามารถไปหยิบเองได้เลยครับ)`;
    }
    // ------------------------------------

    // 🌟 5. ยิงข้อความเข้า LINE
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
