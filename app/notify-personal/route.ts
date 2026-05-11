import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, email } = await req.json();
    const webhookUrl = process.env.POWER_AUTOMATE_WEBHOOK;

    if (!webhookUrl) throw new Error('Missing Power Automate Webhook URL');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, email }),
    });

    return NextResponse.json({ success: response.ok });
  } catch (error) {
    console.error('Notify Error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
