'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';

export default function UploadVideo() {
  const [alarmCode, setAlarmCode] = useState('');
  const [category, setCategory] = useState('Mechanical'); // 💡 1. เพิ่ม State สำหรับหมวดหมู่
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | '', message: string }>({ type: '', message: '' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus({ type: '', message: '' });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setStatus({ type: '', message: '' });
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !alarmCode) {
      setStatus({ type: 'error', message: 'Please enter Alarm Code and select a video file.' });
      return;
    }

    setIsUploading(true);
    setStatus({ type: 'info', message: 'Uploading and analyzing with AI... Please wait.' });

    const formData = new FormData();
    formData.append('alarmCode', alarmCode);
    formData.append('category', category); // 💡 2. ส่งค่าหมวดหมู่ไปให้ API หลังบ้าน
    formData.append('file', file);

    try {
      // 🚀 ยิงตรงไปหาหลังบ้าน Node.js (พอร์ต 3001)
      const response = await fetch('https://maint-intel-v2.onrender.com/api/upload-video', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setStatus({ type: 'success', message: 'Video uploaded and AI analysis complete!' });
        setAlarmCode('');
        handleRemoveFile();
      } else {
        setStatus({ type: 'error', message: result.error || 'Upload failed.' });
      }
    } catch (error: any) {
      setStatus({ type: 'error', message: `System Error: ${error.message}` });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    // เปลี่ยนพื้นหลังเป็นสีดำเข้ม (#0f0f0f) แบบเดียวกับหน้า Search และ Navbar
    <div className="min-h-screen bg-[#0f0f0f] text-[#f1f1f1] font-sans pt-8 pb-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        
        {/* ========================================== */}
        {/* ปุ่มย้อนกลับ (Back Button) - มินิมอลไร้อิโมจิ */}
        {/* ========================================== */}
        <Link 
          href="/search" 
          className="inline-flex items-center gap-2 text-sm text-[#aaaaaa] hover:text-white transition-colors mb-8 group"
        >
          <div className="p-1.5 rounded-full bg-[#272727] group-hover:bg-[#3f3f3f] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </div>
          Back to Directory
        </Link>

        {/* ========================================== */}
        {/* การ์ดหลัก (Upload Form Card) - สีดำ #121212 */}
        {/* ========================================== */}
        <div className="bg-[#121212] border border-[#272727] rounded-2xl p-6 sm:p-10 shadow-2xl">
          
          <div className="mb-8 border-b border-[#272727] pb-6">
            <h1 className="text-2xl font-semibold text-white mb-2 flex items-center gap-3">
              {/* ไอคอน Upload แบบ SVG สีฟ้า */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              Upload Troubleshooting Guide
            </h1>
            <p className="text-sm text-[#aaaaaa]">Video will be saved and sent for automatic AI analysis.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* จัด Grid ใหม่ให้กรอกข้อมูลคู่กัน */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. ช่องกรอก Alarm Code */}
              <div>
                <label className="block text-sm font-medium text-[#aaaaaa] mb-2">
                  Alarm Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={alarmCode}
                  onChange={(e) => setAlarmCode(e.target.value)}
                  placeholder="e.g., ERR-01, Motor Overheat..."
                  disabled={isUploading}
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#303030] rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[#f1f1f1] transition-all disabled:opacity-50"
                />
              </div>

              {/* 💡 3. เพิ่มช่องเลือกหมวดหมู่ (Category Dropdown) */}
              <div>
                <label className="block text-sm font-medium text-[#aaaaaa] mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  disabled={isUploading}
                  className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#303030] rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-[#f1f1f1] transition-all disabled:opacity-50 appearance-none"
                >
                  <option value="Mechanical">⚙️ Mechanical System</option>
                  <option value="Electrical">⚡ Electrical System</option>
                  <option value="Software">💻 Software / Control</option>
                  <option value="Other">📦 Other / General</option>
                </select>
              </div>
            </div>

            {/* 2. โซนลากวางไฟล์ (Drag & Drop Zone) - มินิมอลไร้อิโมจิ */}
            <div>
              <label className="block text-sm font-medium text-[#aaaaaa] mb-2">
                Video File (MP4) <span className="text-red-500">*</span>
              </label>
              
              {!file ? (
                // กรณี: ยังไม่ได้เลือกไฟล์
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed border-[#303030] hover:border-blue-500 bg-[#0f0f0f] rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <input 
                    type="file" 
                    accept="video/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                  />
                  {/* ไอคอนวิดีโอแบบ SVG */}
                  <div className="w-16 h-16 bg-[#272727] rounded-full flex items-center justify-center text-[#aaaaaa] mb-4 shadow-inner">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M17 3v18"/><path d="M12 8v8"/><path d="m8 12 4-4 4 4"/></svg>
                  </div>
                  <p className="text-[#f1f1f1] font-medium text-[15px] mb-1">Drag and drop video, or click to browse</p>
                  <p className="text-xs text-[#aaaaaa]">Supported formats: MP4, MOV, AVI (Max 10 minutes)</p>
                </div>
              ) : (
                // กรณี: เลือกไฟล์แล้ว
                <div className="w-full border border-[#303030] bg-[#0f0f0f] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-12 h-12 bg-blue-900/30 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M17 3v18"/><path d="M3 7h18"/><path d="M3 17h18"/></svg>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-[#f1f1f1] truncate">{file.name}</p>
                      <p className="text-xs text-[#aaaaaa]">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  {!isUploading && (
                    <button 
                      type="button" 
                      onClick={handleRemoveFile}
                      className="p-2 text-[#aaaaaa] hover:text-red-400 hover:bg-[#272727] rounded-md transition-colors shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 3. กล่องแจ้งเตือนสถานะ - ปรับโทนสีให้ดาร์กขึ้น */}
            {status.message && (
              <div className={`p-4 rounded-lg flex items-start gap-3 border ${
                status.type === 'success' ? 'bg-green-900/20 border-green-500/30 text-green-400' :
                status.type === 'error' ? 'bg-red-900/20 border-red-500/30 text-red-400' :
                'bg-blue-900/20 border-blue-500/30 text-blue-400'
              }`}>
                {status.type === 'info' && <svg className="animate-spin h-5 w-5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                {status.type === 'success' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
                {status.type === 'error' && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                <span className="text-sm font-medium leading-relaxed">{status.message}</span>
              </div>
            )}

            {/* 4. ปุ่มกดส่งข้อมูล (Submit Button) */}
            <button
              type="submit"
              disabled={isUploading || !file || !alarmCode}
              className={`w-full py-3.5 px-4 rounded-lg font-medium text-[15px] transition-all flex items-center justify-center gap-2 ${
                isUploading || !file || !alarmCode 
                  ? 'bg-[#272727] text-[#777777] cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
              }`}
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing...
                </>
              ) : (
                <>
                  {/* ไอคอน Upload แบบ SVG ในปุ่ม */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                  Confirm Upload
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}