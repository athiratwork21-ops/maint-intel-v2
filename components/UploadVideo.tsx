'use client'; 

import React, { useState, useRef } from 'react';
// ใช้ท่าไม้ตาย @/ ชี้ตรงไปที่โฟลเดอร์ lib เลย ชัวร์ที่สุดครับ!
import { supabaseServiceWork } from '@/lib/supabase-servicework'; 

export default function UploadVideo() {
  const [file, setFile] = useState<File | null>(null);
  const [alarmCode, setAlarmCode] = useState('');
  const [status, setStatus] = useState('');
  const [youtubeLink, setYoutubeLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // สร้าง State สำหรับทำ Effect ลากไฟล์มาวาง
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ฟังก์ชันจัดการการลากวางไฟล์ (Drag & Drop) ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };
  // ----------------------------------------

  const handleUpload = async () => {
    if (!file || !alarmCode) {
      setStatus('⚠️ กรุณากรอกรหัส Alarm และเลือกไฟล์ก่อนครับ');
      return;
    }

    setIsLoading(true);
    setStatus('⏳ กำลังอัปโหลดวิดีโอขึ้น YouTube... (ห้ามปิดหน้านี้นะครับ)');
    setYoutubeLink(null);

    const formData = new FormData();
    formData.append('alarmCode', alarmCode);
    formData.append('file', file);

    try {
      // 🚀 ยิงตรงไปหาหลังบ้าน Node.js (พอร์ต 3001)
      const response = await fetch('https://maint-intel-v2.onrender.com/api/upload-video', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setStatus('🎉 อัปโหลดเข้า YouTube สำเร็จ! กำลังบันทึกลงฐานข้อมูล...');
        setYoutubeLink(data.youtubeLink);
        
        // 🚨 ยิงเข้า Supabase
        const { error } = await supabaseServiceWork
          .from('troubleshooting_guides')
          .insert([
            { 
              alarm_code: alarmCode, 
              youtube_url: data.youtubeLink,
              video_title: `วิดีโอแก้ปัญหา ${alarmCode}` // 👈 เติมบรรทัดนี้เข้าไปครับ!
            }
          ]);

        if (error) {
          console.error("Supabase Error:", error);
          setStatus(`❌ วิดีโอขึ้น YouTube แล้ว แต่เซฟลงฐานข้อมูลพัง: ${error.message}`);
        } else {
          setStatus('🎉 สมบูรณ์แบบ! อัปโหลดและบันทึกข้อมูลพร้อมใช้งาน 100%!');
          // เคลียร์ช่องกรอกข้อมูลเผื่ออัปโหลดคลิปต่อไป
          setFile(null);
          setAlarmCode('');
        }
        
      } else {
        setStatus(`❌ พังครับ: ${data.error}`);
      }
    } catch (error) {
      setStatus(`❌ หาหลังบ้านไม่เจอ (ลืมเปิด Node.js หรือเปล่า?): ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 text-slate-200 font-sans">
      {/* ส่วนหัว */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-2">📤 แนบวิดีโอคู่มือแก้ Alarm</h2>
        <p className="text-slate-400">อัปโหลดคลิปแก้ปัญหาเข้าสู่ระบบ Service Work Portal</p>
      </div>

      {/* ช่องกรอกรหัส Alarm */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          รหัส Alarm / ชื่ออาการเสีย <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          placeholder="เช่น ERR-502, มอเตอร์ไหม้, หรือรหัสเครื่องจักร"
          value={alarmCode}
          onChange={(e) => setAlarmCode(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-slate-500 text-white"
        />
      </div>

      {/* โซนอัปโหลดไฟล์ (Drag & Drop) */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          ไฟล์วิดีโอ (MP4) <span className="text-red-400">*</span>
        </label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'
          }`}
        >
          <input
            type="file"
            accept="video/*"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          
          {file ? (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 mb-3 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <p className="text-white font-medium text-lg">{file.name}</p>
              <p className="text-slate-400 text-sm mt-1">ขนาด: {(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              <p className="text-blue-400 text-sm mt-3 hover:underline">คลิกเพื่อเปลี่ยนไฟล์</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 mb-3 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center shadow-inner">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              </div>
              <p className="text-slate-300 font-medium text-lg">คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวางที่นี่</p>
              <p className="text-slate-500 text-sm mt-2">รองรับไฟล์วิดีโอทุกสกุล (แนะนำ .mp4)</p>
            </div>
          )}
        </div>
      </div>

      {/* ปุ่มกดอัปโหลด */}
      <button
        onClick={handleUpload}
        disabled={isLoading || !file || !alarmCode}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex justify-center items-center gap-2 ${
          isLoading || !file || !alarmCode
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30'
        }`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            กำลังส่งไฟล์เข้าคลังแสง...
          </>
        ) : (
          '🚀 ยืนยันการอัปโหลด'
        )}
      </button>

      {/* กล่องแสดงสถานะ / แจ้งเตือน */}
      {status && (
        <div className={`mt-6 p-5 rounded-xl border ${
          youtubeLink ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
          status.includes('❌') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
          'bg-blue-500/10 border-blue-500/20 text-blue-400'
        }`}>
          <p className="text-center font-medium text-lg">{status}</p>
          
          {/* โชว์ลิงก์ YouTube แบบหล่อๆ ถ้าอัปโหลดเสร็จ */}
          {youtubeLink && (
            <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-green-500/30 flex items-center justify-between">
              <span className="text-sm truncate mr-4 text-slate-400">{youtubeLink}</span>
              <a 
                href={youtubeLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-5 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shadow-md"
              >
                ▶️ ดูวิดีโอ
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}