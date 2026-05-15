import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const webhookUrl = process.env.TEAMS_WEBHOOK_URL_MF;

    if (!webhookUrl) throw new Error('Missing Teams Webhook URL');

    // MS Teams Webhook คลาสสิก จะรับข้อมูลในรูปแบบ JSON ที่มี key ชื่อว่า "text"
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }), 
    });

    return NextResponse.json({ success: response.ok });
  } catch (error) {
    console.error('Teams Notify Error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
