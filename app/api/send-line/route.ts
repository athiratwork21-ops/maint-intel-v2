import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, department, location } = body; 

    if (!department) {
      return NextResponse.json({ success: false, error: 'ระบบไม่ได้รับชื่อแผนก!' }, { status: 400 });
    }

    const cleanDeptName = department.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    let teamsWebhookUrl = '';

    // 🚨 ดักแผนก เลือก URL ของ Teams ให้ถูกต้อง
    if (cleanDeptName === 'ECBUPD18326' || cleanDeptName === 'ECBU_PD') {
      teamsWebhookUrl = process.env.TEAMS_WEBHOOK_URL_PD || '';
    } 
    else if (cleanDeptName === 'ECBUME18326' || cleanDeptName === 'ECBU_ME') {
      teamsWebhookUrl = process.env.TEAMS_WEBHOOK_URL_ME || '';
    }

    if (!teamsWebhookUrl) {
      return NextResponse.json({ 
        success: false, 
        error: `ไม่ได้ตั้งค่า URL สำหรับส่งเข้า Teams แผนก: "${cleanDeptName}"` 
      }, { status: 400 });
    }

    // --- เช็คเวลา ---
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: 'numeric', minute: 'numeric', hour12: false });
    const [hour, minute] = formatter.format(now).split(':').map(Number);
    const isAfterHours = (hour === 19 && minute >= 50) || (hour > 19) || (hour < 8);

    let finalMessage = message;
    if (isAfterHours && location && location !== '-') {
      finalMessage += `\n📍 พิกัดตู้: ${location}\n(ผู้ดูแลเลิกงานแล้ว ผู้เบิกหยิบเองได้เลยครับ)`;
    }

    // 🌟 ยิงไปหา MS Teams (ง่ายกว่า LINE เยอะ!)
    const teamsResponse = await fetch(teamsWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // ฟอร์แมตเบสิกของ Teams ใช้ตัวแปร text
        text: finalMessage.replace(/\n/g, '<br>') // Teams ต้องใช้ <br> ขึ้นบรรทัดใหม่
      })
    });

    if (!teamsResponse.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `[Teams API Error] ส่งไม่สำเร็จ (Code: ${teamsResponse.status})` 
      }, { status: teamsResponse.status });
    }

    return NextResponse.json({ success: true, message: 'ส่ง Teams สำเร็จ!' });

  } catch (error) {
    console.error("Send Teams Error:", error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
