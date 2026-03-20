import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// ❌ ลบ import ของ Google ออกไปเลย เราไม่ใช้แล้ว!

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.events && body.events.length > 0) {
      const event = body.events[0];
      
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;

        const { data: parts } = await supabase.from('Part').select('PartID, PartName, PartModel');
        const { data: stocks } = await supabase.from('Stock').select('PartID, Balance, Location');
        const { data: consumables } = await supabase.from('Consumable').select('ItemID, ItemName, Balance, Location');

        const dbContext = JSON.stringify({
          spareParts: parts?.map(p => ({
            ...p, 
            stock: stocks?.find(s => s.PartID === p.PartID)?.Balance || 0,
            location: stocks?.find(s => s.PartID === p.PartID)?.Location || '-'
          })),
          consumables: consumables
        });

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

        // =================================================================
        // 🌟 ท่าไม้ตาย: ยิง HTTP Request ไปหา Gemini API ตรงๆ โดยไม่ใช้ Package
        // =================================================================
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`;
        
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        const geminiData = await geminiResponse.json();
        
        // แกะข้อความตอบกลับของ AI ออกมา
        let aiReply = "ขออภัยครับ ระบบ AI ขัดข้องชั่วคราว";
        if (geminiData.candidates && geminiData.candidates.length > 0) {
            aiReply = geminiData.candidates[0].content.parts[0].text;
        } else {
            console.error("Gemini Error:", geminiData); // ถ้าพัง จะได้เห็นใน Logs ชัดๆ
        }
        // =================================================================

        // ส่งคำตอบกลับไปหาช่างใน LINE
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
