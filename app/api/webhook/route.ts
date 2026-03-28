import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.events && body.events.length > 0) {
      const event = body.events[0];
      
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;
        const sourceType = event.source?.type; // เช็คว่ามาจากแชทส่วนตัว หรือ กลุ่ม

        // =================================================================
        // 🌟 ด่านตรวจ (Gatekeeper): ใส่ที่ครอบปากบอทเมื่ออยู่ในกลุ่ม
        // =================================================================
        const triggerWords = ['@Main.Intel', 'บักบอท', '@bot', 'bot', 'น้องบอท']; // 👈 อยากให้เรียกชื่อไหนเพิ่มในวงเล็บนี้ได้เลยครับ
        let shouldReply = false;
        let cleanMessage = userMessage; // ข้อความที่จะส่งให้ AI หลังจากลบชื่อบอทออกแล้ว

        if (sourceType === 'user') {
          // ถ้าเป็นแชทส่วนตัว 1-on-1 -> ให้ตอบทุกข้อความ
          shouldReply = true;
        } else if (sourceType === 'group' || sourceType === 'room') {
          // ถ้าอยู่ในกลุ่ม -> เช็คว่ามีคำเรียกชื่อบอทไหม
          const lowerMessage = userMessage.toLowerCase();
          const triggeredWord = triggerWords.find(word => lowerMessage.includes(word.toLowerCase()));

          if (triggeredWord) {
            shouldReply = true;
            // ลบคำเรียกชื่อบอทออก เพื่อไม่ให้ AI งงเวลาเอาไปวิเคราะห์ (เช่น "@บอท มีน็อตไหม" -> "มีน็อตไหม")
            cleanMessage = userMessage.replace(new RegExp(triggeredWord, 'ig'), '').trim();
          }
        }

        // ถ้าไม่มีใครเรียกมันในกลุ่ม ให้จบการทำงานตรงนี้เลยทันที! (เซฟโควต้า API)
        if (!shouldReply) {
          return NextResponse.json({ success: true, message: 'Ignored: Not mentioned in group' }, { status: 200 });
        }
        // =================================================================

        // =================================================================
        // 🌟 ทริคลับ: พิมพ์ขอ Group ID จากบอท (โค้ดที่เพิ่มเข้ามาใหม่)
        // =================================================================
        if (cleanMessage.includes('ขอไอดีกลุ่ม')) {
          const groupId = event.source?.groupId || event.source?.roomId || 'ไม่พบไอดีกลุ่ม (คุณอาจจะทักแชทส่วนตัวอยู่)';
          
          await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.LINE_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
              replyToken: replyToken,
              messages: [{ type: 'text', text: `ไอดีของกลุ่ม/ห้องนี้คือ:\n${groupId}\n\n👉 ก๊อปปี้รหัสนี้ไปใส่ใน Vercel ช่อง LINE_TARGET_ID ได้เลยครับ!` }]
            })
          });
          return NextResponse.json({ success: true }, { status: 200 });
        }
        // =================================================================

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

        // 💡 สังเกตว่าเราเปลี่ยนไปใช้ cleanMessage แทน userMessage แล้ว
        const prompt = `
          คุณคือผู้ช่วยแอดมินแผนกซ่อมบำรุง (Maintenance Assistant) ที่เชี่ยวชาญและเป็นกันเอง
          ช่างซ่อมบำรุงถามมาว่า: "${cleanMessage}"

          นี่คือฐานข้อมูลอะไหล่และสต๊อกปัจจุบันของเรา (JSON):
          ${dbContext}

          กฎการทำงานของคุณ (ทำตามอย่างเคร่งครัด):
          1. แจ้งสถานะ: วิเคราะห์คำถามว่าช่างหาอะไหล่ตัวไหน บอกจำนวนที่เหลือและตู้เก็บ (Location)
          2. การเทียบสเปคอัจฉริยะ (กรณีของหมด หรือหาชื่อไม่เจอตรงๆ):
             - ให้ใช้ความรู้ทางวิศวกรรมของคุณ วิเคราะห์ว่าอะไหล่ที่ช่างถามหา มีหน้าที่การทำงานและสเปคพื้นฐานคืออะไร
             - ค้นหาในฐานข้อมูล JSON ว่ามีอะไหล่ตัวไหนที่มี "ฟังก์ชันการทำงานเทียบเท่าหรือใกล้เคียงกันที่สุด" ที่สามารถใช้แก้ขัดได้
             - ถ้านำเสนอตัวแทน **ต้องอธิบายสั้นๆ ด้วยว่าทำไมถึงใช้แทนกันได้** (เช่น "เป็นเซนเซอร์ PNP 24V เหมือนกัน แต่คนละยี่ห้อ")
          3. ความปลอดภัย: หากมีการแนะนำอะไหล่ทดแทน ให้ใส่คำเตือนสั้นๆ ท้ายข้อความเสมอว่า "⚠️ ข้อควรระวัง: กรุณาตรวจสอบสเปคสายไฟหรือขนาดหน้าแปลนก่อนติดตั้ง"
          4. หากฟังก์ชันต่างกันเกินไป ห้ามแนะนำเด็ดขาด ให้ตอบว่า "ขออภัยครับ อะไหล่ตัวนี้หมด และในระบบไม่มีอะไหล่ที่มีฟังก์ชันใกล้เคียงกันที่จะใช้แทนได้เลยครับ"
          5. ตอบให้สั้น กระชับ เป็นมิตร สรุปเป็นข้อๆ ให้อ่านง่ายบนมือถือ
        `;

        // =================================================================
        // 🌟 ท่าไม้ตาย: ยิง HTTP Request ไปหา Gemini API ตรงๆ โดยไม่ใช้ Package
        // =================================================================
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
        
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
