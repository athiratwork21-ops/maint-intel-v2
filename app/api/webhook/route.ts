import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ฟังก์ชันนี้จำเป็นเพื่อให้ Vercel รู้ว่านี่คือ API สำหรับรับ Webhook
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. เช็คว่าเป็นข้อความที่ส่งมาจาก LINE หรือไม่
    if (body.events && body.events.length > 0) {
      const event = body.events[0];
      
      // ถ้ามีคนส่งข้อความแบบ Text เข้ามา
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;

        // 2. ไปค้นหาข้อมูลอะไหล่และสต๊อกใน Supabase มารอไว้ (ค้นหาคำที่ตรงกับที่ช่างพิมพ์มาบางส่วน)
        // หมายเหตุ: เบื้องต้นเราดึงมาทั้งหมดก่อนเพื่อให้ AI ช่วยหาว่าชิ้นไหนเกี่ยวข้องกัน
        const { data: parts } = await supabase.from('Part').select('PartID, PartName, PartModel');
        const { data: stocks } = await supabase.from('Stock').select('PartID, Balance, Location');
        const { data: consumables } = await supabase.from('Consumable').select('ItemID, ItemName, Balance, Location');

        // รวมข้อมูลให้อ่านง่ายๆ สำหรับ AI
        const dbContext = JSON.stringify({
          spareParts: parts?.map(p => ({
            ...p, 
            stock: stocks?.find(s => s.PartID === p.PartID)?.Balance || 0,
            location: stocks?.find(s => s.PartID === p.PartID)?.Location || '-'
          })),
          consumables: consumables
        });

        // 3. ปลุกสมอง AI (Gemini)
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 4. สั่งงาน AI (Prompt Engineering) **จุดนี้คือหัวใจสำคัญ**
        const prompt = `
          คุณคือผู้ช่วยแอดมินแผนกซ่อมบำรุง (Maintenance Assistant) ที่เชี่ยวชาญและเป็นกันเอง
          ช่างซ่อมบำรุงถามมาว่า: "${userMessage}"

          นี่คือฐานข้อมูลอะไหล่และสต๊อกปัจจุบันของเรา (JSON):
          ${dbContext}

          หน้าที่ของคุณ:
          1. วิเคราะห์คำถามช่างว่าหาอะไหล่ตัวไหน ถ้าของหมดให้ลองแนะนำอะไหล่ที่มีชื่อหรือ Model ใกล้เคียงกัน (ใช้แทนกันได้)
          2. บอกจำนวนที่เหลือ และบอกตู้เก็บ (Location) เสมอ
          3. ตอบให้สั้น กระชับ อ่านง่ายบนจอมือถือ ไม่ต้องอธิบายยืดเยื้อ
          4. ถ้าหาไม่เจอจริงๆ ให้ตอบว่า "ขออภัยครับ ไม่พบข้อมูลอะไหล่นี้ในระบบ แนะนำให้ติดต่อ Center โดยตรงครับ"
        `;

        const result = await model.generateContent(prompt);
        const aiReply = result.response.text();

        // 5. ส่งคำตอบของ AI กลับไปที่ LINE (ใช้ Reply API)
        await fetch('https://api.line.me/v2/bot/message/reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LINE_ACCESS_TOKEN}`
          },
          body: JSON.stringify({
            replyToken: replyToken,
            messages: [{ type: 'text', text: aiReply }]
          })
        });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
