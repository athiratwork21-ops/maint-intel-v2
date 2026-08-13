const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');

console.log('🔑 เช็ครหัส Refresh Token:', process.env.REFRESH_TOKEN ? 'มีข้อมูล' : 'ว่างเปล่า!');

// ==========================================
// 🚨 1. ตั้งค่า Supabase (ระบบฐานข้อมูล)
// ==========================================
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || 'https://npericsunhazkcutarxu.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZXJpY3N1bmhhemtjdXRhcnh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNTAzNzMsImV4cCI6MjA5MzcyNjM3M30.z73em6T-9GF__oOFPQ9UwcRhJPIQZDzsfUwCqE3oktA';
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 🚨 2. ตั้งค่า Google Gemini AI (สมองกล)
// ==========================================
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); // ตัวหน่วงเวลารอ AI

// ฟังก์ชันสั่ง AI ดูคลิปและเขียนสรุป
async function generateTroubleshootingSummary(videoFilePath, alarmCode) {
  try {
    if (!GEMINI_API_KEY) {
      console.log('⚠️ [AI] ไม่มี API Key ข้ามการใช้ AI');
      return null;
    }

    console.log(`🚀 [AI] กำลังอัปโหลดวิดีโอ ${alarmCode} ให้ Gemini ดู...`);
    const uploadResult = await fileManager.uploadFile(videoFilePath, {
      mimeType: "video/mp4",
      displayName: `Troubleshoot-${alarmCode}`,
    });
    
    let file = await fileManager.getFile(uploadResult.file.name);
    
    console.log(`⏳ [AI] กำลังประมวลผลวิดีโอ... (รอสักครู่)`);
    while (file.state === "PROCESSING") {
      process.stdout.write("."); 
      await delay(5000); 
      file = await fileManager.getFile(uploadResult.file.name);
    }

    if (file.state === "FAILED") {
      throw new Error("AI ประมวลผลวิดีโอไม่สำเร็จ (ไฟล์อาจมีปัญหา)");
    }

    console.log("\n🧠 [AI] วิดีโอพร้อมแล้ว! กำลังวิเคราะห์และเขียนสรุป...");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      คุณคือวิศวกรซ่อมบำรุงระดับซีเนียร์ หน้าที่ของคุณคือดูคลิปวิดีโอนี้
      แล้วสรุปขั้นตอนการซ่อมแซม (Troubleshooting) ออกมาเป็นข้อๆ (1. 2. 3. ...)
      เขียนด้วยภาษาไทยที่กระชับ เข้าใจง่าย เพื่อให้ช่างหน้างานอ่านแล้วทำตามได้ทันที
      ไม่ต้องเกริ่นนำหรือสรุปปิดท้าย ขอแค่ขั้นตอนเนื้อๆ
    `;

    const result = await model.generateContent([
      { fileData: { mimeType: file.mimeType, fileUri: file.uri } }, 
      prompt
    ]);
    
    console.log("✅ [AI] เขียนสรุปเสร็จเรียบร้อย!");
    return result.response.text();

  } catch (error) {
    console.error("\n❌ [AI] ทำงานล้มเหลว:", error.message || error);
    return null; 
  }
}

// ==========================================
// 🚨 3. ตั้งค่า Express & YouTube API
// ==========================================
const app = express();
// แก้ไขเพื่อให้รองรับการรับค่า JSON จากหน้าเว็บได้ด้วย (จำเป็นสำหรับการลบ)
app.use(express.json()); 
app.use(cors());
const upload = multer({ dest: 'uploads/' });

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

// ==========================================
// 🚨 4. เส้นทาง API หลัก (เวอร์ชันอัปโหลดเข้า YouTube จริง + Category)
// ==========================================
app.post('/api/upload-video', upload.single('file'), async (req, res) => {
  try {
    // 💡 ดึงค่า category ที่ส่งมาจากหน้าเว็บด้วย
    const { alarmCode, category } = req.body; 
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'ไม่พบไฟล์วิดีโอ' });
    console.log(`\n=================================`);
    console.log(`📤 เริ่มอัปโหลด หมวดหมู่: [${category || 'ไม่ได้ระบุ'}] รหัส: ${alarmCode}`);
    
    // 4.1 🎬 อัปโหลดขึ้น YouTube ของจริง!
    console.log(`⏳ [YouTube] กำลังอัปโหลดวิดีโอ... (อาจใช้เวลาสักครู่ตามขนาดไฟล์)`);
    const youtubeResponse = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: `คู่มือแก้ปัญหา: ${alarmCode}`,
          // 💡 แนบชื่อหมวดหมู่ไปใน Description ของ YouTube ด้วย
          description: `หมวดหมู่: ${category || 'อื่นๆ'}\nรหัสอาการเสีย: ${alarmCode}\nอัปโหลดผ่านระบบ Service Work Portal`,
          categoryId: '22', 
        },
        status: {
          privacyStatus: 'unlisted', 
        },
      },
      media: {
        body: fs.createReadStream(file.path),
      },
    });

    const youtubeLink = `https://www.youtube.com/watch?v=${youtubeResponse.data.id}`;
    console.log(`✅ [YouTube] อัปโหลดสำเร็จ! ลิงก์: ${youtubeLink}`);

    // 4.2 บันทึกข้อมูลลง Supabase (ใส่ Category ด้วย!)
    const { error: dbError } = await supabase
      .from('troubleshooting_guides')
      .insert([{ 
        alarm_code: alarmCode, 
        category: category || 'อื่นๆ', // 💡 บันทึกหมวดหมู่ลงตาราง
        youtube_url: youtubeLink,
        video_title: `คู่มือแก้ปัญหา: ${alarmCode}`
      }]);

    if (dbError) {
      console.error("❌ [Supabase] บันทึกพัง:", dbError);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(500).json({ success: false, error: 'บันทึกฐานข้อมูลพัง' });
    }

    console.log(`✅ [Supabase] บันทึกข้อมูลเริ่มต้นสำเร็จ!`);

    res.status(200).json({ 
      success: true, 
      youtubeLink: youtubeLink, 
      message: 'อัปโหลดสำเร็จ! AI กำลังประมวลผลสรุปอยู่เบื้องหลัง...' 
    });

    // 4.4 โซนทำงานเบื้องหลัง: สั่ง AI ดูคลิป 🧠
    console.log(`🚀 [AI] กำลังส่งวิดีโอให้ Gemini วิเคราะห์...`);
    generateTroubleshootingSummary(file.path, alarmCode)
      .then(async (aiText) => {
        if (aiText) {
          const { error: updateError } = await supabase
            .from('troubleshooting_guides')
            .update({ ai_manual_text: aiText })
            .eq('alarm_code', alarmCode);
          
          if (!updateError) {
             console.log(`🎉 [System] อัปเดตบทสรุป AI ของ ${alarmCode} ลงฐานข้อมูลเสร็จสมบูรณ์!`);
          } else {
             console.error(`❌ [System] อัปเดตบทสรุป AI พัง:`, updateError);
          }
        }
        
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path); 
          console.log(`🧹 [System] ลบไฟล์ชั่วคราวทิ้งเรียบร้อย`);
        }
      });

  } catch (error) {
    console.error('❌ [System] เกิดข้อผิดพลาดร้ายแรง:', error.message);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// ==========================================
// 🗑️ 5. API สำหรับลบวิดีโอออกจากฐานข้อมูล
// ==========================================
app.delete('/api/delete-video/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // สั่งลบข้อมูลออกจาก Supabase โดยใช้ ID
    const { error } = await supabase
      .from('troubleshooting_guides')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    console.log(`🗑️ [System] ลบวิดีโอ ID: ${id} ออกจากระบบเรียบร้อยแล้ว`);
    res.status(200).json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
  } catch (error) {
    console.error('❌ [System] เกิดข้อผิดพลาดตอนลบวิดีโอ:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Backend เปิดประตูรับไฟล์พร้อมใช้งานที่พอร์ต ${PORT}`);
});