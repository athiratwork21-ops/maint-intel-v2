import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message } = body;

    const LINE_ACCESS_TOKEN = process.env.LINE_ACCESS_TOKEN;
    const LINE_TARGET_ID = process.env.LINE_TARGET_ID; 

    if (!LINE_ACCESS_TOKEN || !LINE_TARGET_ID) {
      return NextResponse.json({ success: false, error: 'Missing LINE Credentials' }, { status: 500 });
    }

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: LINE_TARGET_ID,
        messages: [{ type: 'text', text: message }]
      })
    });

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}
