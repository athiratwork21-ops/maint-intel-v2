'use client';

import React, { useState, useEffect } from 'react';
import { supabaseServiceWork } from '@/lib/supabase-servicework';

export default function SearchVideo() {
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingAI, setIsRefreshingAI] = useState(false);
  const [status, setStatus] = useState('');
  
  const [currentQuery, setCurrentQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ทั้งหมด'); // 💡 1. State สำหรับแถบหมวดหมู่

  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    try {
      if (url.includes('DUMMY_LINK')) return null;
      let videoId = '';
      if (url.includes('v=')) videoId = url.split('v=')[1]?.split('&')[0];
      else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0];
      else if (url.includes('/embed/')) videoId = url.split('/embed/')[1]?.split('?')[0];
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
    } catch {
      return null;
    }
  };

  const extractVideoId = (url: string) => {
    if (!url) return null;
    if (url.includes('DUMMY_LINK')) return 'DUMMY';
    try {
      if (url.includes('v=')) return url.split('v=')[1]?.split('&')[0];
      if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0];
      if (url.includes('/embed/')) return url.split('/embed/')[1]?.split('?')[0];
      return null;
    } catch {
      return null;
    }
  };

  // โหลดข้อมูลครั้งแรก และเมื่อเปลี่ยน Tab หมวดหมู่
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q') || '';
    setCurrentQuery(q);
    fetchVideos(q, activeTab);
  }, [activeTab]); // ทำงานใหม่ทุกครั้งที่ค่า activeTab เปลี่ยน

  // 💡 2. ฟังก์ชันดึงข้อมูล (แก้ไขให้รองรับการกรอง Category)
  const fetchVideos = async (query = '', category = 'ทั้งหมด') => {
    setIsLoading(true);
    setStatus('');
    try {
      let supabaseQuery = supabaseServiceWork
        .from('troubleshooting_guides')
        .select('*')
        .order('created_at', { ascending: false });

      // กรองด้วยคำค้นหา
      if (query) {
        supabaseQuery = supabaseQuery.or(`alarm_code.ilike.%${query}%,video_title.ilike.%${query}%`);
      }
      
      // กรองด้วยหมวดหมู่ (ถ้าไม่ได้เลือก "ทั้งหมด")
      if (category !== 'ทั้งหมด') {
        // ใช้คำแรกของ Category (เช่น "Mechanical") ในการค้นหา (ilike) 
        // เพราะในฐานข้อมูลเราเก็บเต็มๆ ว่า "Mechanical System"
        const keyword = category === 'อื่นๆ' ? 'Other' : category;
        supabaseQuery = supabaseQuery.ilike('category', `%${keyword}%`);
      }

      const { data, error } = await supabaseQuery.limit(24);
      if (error) throw error;
      setVideos(data || []);
      
      if (data && data.length === 0) {
        setStatus(`ไม่พบผลลัพธ์สำหรับ ${query ? `"${query}"` : ''} หมวดหมู่ "${category}"`);
      }
    } catch (error: any) {
      setStatus(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 💡 3. ระบบลบวิดีโอ (Delete)
  const handleDelete = async () => {
    const isConfirm = window.confirm(`คุณต้องการลบคู่มือซ่อม "${selectedVideo.alarm_code}" ใช่หรือไม่?\n(คำเตือน: ข้อมูลจะถูกลบออกจากระบบถาวร)`);
    if (!isConfirm) return;

    try {
      const response = await fetch(`http://localhost:3001/api/delete-video/${selectedVideo.id}`, { 
        method: 'DELETE' 
      });
      
      if (response.ok) {
        alert('ลบข้อมูลสำเร็จ!');
        setSelectedVideo(null); // ปิดหน้าต่างดูคลิป
        fetchVideos(currentQuery, activeTab); // รีเฟรชหน้าจอ
      } else {
        const errData = await response.json();
        alert(`ลบไม่สำเร็จ: ${errData.error}`);
      }
    } catch (error) {
      alert('ไม่สามารถติดต่อเซิร์ฟเวอร์หลังบ้านได้ (Node.js อาจจะปิดอยู่)');
    }
  };

  // 💡 4. ระบบกดดึงข้อมูล AI ล่าสุด (Refresh AI)
  const handleRefreshAI = async () => {
    if (!selectedVideo) return;
    setIsRefreshingAI(true);
    try {
      const { data, error } = await supabaseServiceWork
        .from('troubleshooting_guides')
        .select('ai_manual_text')
        .eq('id', selectedVideo.id)
        .single();
        
      if (error) throw error;
      
      if (data && data.ai_manual_text) {
        // อัปเดตข้อมูลที่โชว์บนหน้าจอ
        setSelectedVideo({ ...selectedVideo, ai_manual_text: data.ai_manual_text });
      } else {
        alert('AI ยังวิเคราะห์ไม่เสร็จครับ โปรดรอสักครู่แล้วลองใหม่');
      }
    } catch (error) {
      console.error("Refresh AI Error:", error);
    } finally {
      setIsRefreshingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f1f1f1] font-sans pb-10">
      
      {/* 🏷️ แถบตัวกรองหมวดหมู่ (Category Tabs) - เลียนแบบ YouTube แบบเป๊ะๆ */}
      {!selectedVideo && (
        <div className="border-b border-[#272727] bg-[#0f0f0f] sticky top-16 z-40">
          <div className="max-w-[1800px] mx-auto px-4 sm:px-6 flex overflow-x-auto hide-scrollbar gap-3 py-3">
            {['ทั้งหมด', 'Mechanical', 'Electrical', 'Software', 'อื่นๆ'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab 
                    ? 'bg-white text-black' 
                    : 'bg-[#272727] text-white hover:bg-[#3f3f3f]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 mt-6">
        
        {/* ======================================================= */}
        {/* โหมดดูคลิป (Detail View) */}
        {/* ======================================================= */}
        {selectedVideo ? (
          <div className="animate-fade-in-up max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              
              {/* แถบด้านบน: ปุ่มกลับ + ปุ่มลบ */}
              <div className="flex justify-between items-center mb-4">
                <button 
                  onClick={() => setSelectedVideo(null)}
                  className="flex items-center gap-2 text-sm text-[#aaaaaa] hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  Back to Directory
                </button>
                
                {/* 🗑️ ปุ่มลบวิดีโอ (สีแดง) */}
                <button 
                  onClick={handleDelete}
                  className="flex items-center gap-2 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-md transition-colors border border-red-500/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  Delete Video
                </button>
              </div>
              
              {/* ตัวเล่นวิดีโอ */}
              <div className="relative w-full rounded-xl overflow-hidden bg-black mb-4 aspect-video">
                {getEmbedUrl(selectedVideo.youtube_url) ? (
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={getEmbedUrl(selectedVideo.youtube_url)!} 
                    title={selectedVideo.video_title}
                    frameBorder="0"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center text-[#aaaaaa] bg-[#272727]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M17 3v18"/><path d="M3 7h18"/><path d="M3 17h18"/></svg>
                    <p className="text-sm">Video Unavailable (Dummy Link)</p>
                  </div>
                )}
              </div>

              {/* ข้อมูลวิดีโอ */}
              <h1 className="text-xl md:text-2xl font-bold text-white mb-3">{selectedVideo.video_title}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#272727] flex items-center justify-center font-bold text-[#aaaaaa] text-sm uppercase">
                  {selectedVideo.alarm_code.substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-semibold text-[15px]">Alarm Code: {selectedVideo.alarm_code}</h3>
                  <div className="flex items-center gap-2 mt-0.5 text-[#aaaaaa] text-xs">
                    {/* ป้าย Category เล็กๆ */}
                    {selectedVideo.category && (
                       <span className="bg-[#272727] px-1.5 py-0.5 rounded text-[10px] text-white">
                         {selectedVideo.category.split(' ')[0]}
                       </span>
                    )}
                    <span>•</span>
                    <span>Uploaded {new Date(selectedVideo.created_at).toLocaleDateString('th-TH')}</span>
                  </div>
                </div>
              </div>

              {/* 🤖 กล่อง AI Summary */}
              <div className="bg-[#272727] rounded-xl p-5 border border-[#3f3f3f] mt-2">
                
                {/* หัวข้อ AI + ปุ่ม Refresh */}
                <div className="flex items-center justify-between mb-4 border-b border-[#3f3f3f] pb-3">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#3ea6ff]"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="m9 10 2 2 4-4"/></svg>
                    <span className="font-medium text-sm text-[#3ea6ff]">AI Troubleshooting Guide</span>
                  </div>
                  
                  {/* 🔄 ปุ่ม Refresh AI */}
                  <button 
                    onClick={handleRefreshAI}
                    disabled={isRefreshingAI}
                    className="flex items-center gap-1.5 text-xs text-[#aaaaaa] hover:text-white bg-[#121212] hover:bg-black px-2.5 py-1.5 rounded-md border border-[#3f3f3f] transition-colors disabled:opacity-50"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isRefreshingAI ? "animate-spin" : ""}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                     {isRefreshingAI ? 'Refreshing...' : 'Refresh AI'}
                  </button>
                </div>

                {/* เนื้อหา AI */}
                {selectedVideo.ai_manual_text ? (
                  <div className="whitespace-pre-line text-[14px] text-[#f1f1f1] leading-relaxed">
                    {selectedVideo.ai_manual_text}
                  </div>
                ) : (
                  <div className="text-[#aaaaaa] text-sm italic">
                    AI is currently analyzing the video... Click "Refresh AI" to check the status.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (

          /* ======================================================= */
          /* โหมด Feed คลิป (พื้นที่เต็ม 100%) */
          /* ======================================================= */
          <div>
            
            {/* โชว์ข้อความว่ากำลังค้นหาอะไรอยู่ (ถ้ามีการพิมพ์หา) */}
            {currentQuery && !isLoading && (
              <div className="mb-6 text-lg font-medium text-white flex items-center gap-2">
                Search results for: <span className="text-blue-400">"{currentQuery}"</span>
                <button 
                  onClick={() => window.location.href = '/search'} 
                  className="ml-2 text-xs text-[#aaaaaa] hover:text-white underline"
                >
                   Clear search
                </button>
              </div>
            )}

            {status && <div className="text-center text-red-400 mb-6 text-sm">{status}</div>}

            {isLoading ? (
              <div className="py-20 text-center text-[#aaaaaa] text-sm flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Loading videos...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-4 gap-y-10">
                {videos.map((vid) => {
                  const yId = extractVideoId(vid.youtube_url);
                  return (
                    <div 
                      key={vid.id} 
                      onClick={() => setSelectedVideo(vid)}
                      className="cursor-pointer group flex flex-col"
                    >
                      {/* รูปปก */}
                      <div className="aspect-video bg-[#272727] rounded-xl overflow-hidden relative mb-3">
                        {yId && yId !== 'DUMMY' ? (
                           <img 
                             src={`https://img.youtube.com/vi/${yId}/hqdefault.jpg`} 
                             alt={vid.video_title}
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                           />
                        ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center text-[#aaaaaa] bg-[#222222]">
                             <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-40 mb-2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M17 3v18"/><path d="M3 7h18"/><path d="M3 17h18"/></svg>
                             <span className="text-[11px] uppercase tracking-wider font-medium opacity-50">Video Pending</span>
                           </div>
                        )}
                        {/* ป้าย AI มุมขวาล่าง */}
                        {vid.ai_manual_text && (
                           <div className="absolute bottom-1.5 right-1.5 bg-black/90 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                             AI Verified
                           </div>
                        )}
                      </div>
                      
                      {/* ข้อมูลคลิป */}
                      <div className="flex gap-3 pr-2">
                        <div className="mt-0.5 shrink-0">
                          <div className="w-9 h-9 rounded-full bg-[#272727] flex items-center justify-center text-[#aaaaaa] font-bold text-xs uppercase">
                            {vid.alarm_code.substring(0, 2)}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <h3 className="font-medium text-[15px] text-[#f1f1f1] line-clamp-2 leading-snug mb-1 group-hover:text-blue-400 transition-colors">
                            {vid.video_title}
                          </h3>
                          <p className="text-[13px] text-[#aaaaaa]">
                            Code: {vid.alarm_code}
                          </p>
                          <p className="text-[12px] text-[#aaaaaa] mt-0.5 flex items-center gap-1.5">
                            {/* แสดง Category ย่อๆ */}
                            {vid.category && <span className="bg-[#272727] px-1 rounded">{vid.category.split(' ')[0]}</span>}
                            <span>{new Date(vid.created_at).toLocaleDateString('th-TH')}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}