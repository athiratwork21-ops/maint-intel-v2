"use client";
import React, { useState } from 'react';
// 🌟 เดี๋ยวเราค่อย import supabase ตัวใหม่เข้ามาตรงนี้
// import { supabaseServiceWork } from '../../lib/supabase-servicework'; 

export default function ServiceWorkPortal() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'service-admin-123') { // รหัสผ่านสำหรับเข้าหน้านี้โดยเฉพาะ
      setIsAuthenticated(true);
    } else {
      alert('รหัสผ่านไม่ถูกต้อง หรือคุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้!');
    }
  };

  // 🔒 หน้า Login สำหรับทีม Service Work
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
        <form onSubmit={handleLogin} className="p-10 bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-700 w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center text-3xl">
              <i className="bi bi-hdd-network-fill"></i>
            </div>
          </div>
          <h1 className="text-2xl font-black mb-2 text-center text-white tracking-wide">Service Work Portal</h1>
          <p className="text-sm text-slate-400 text-center mb-8">Access restricted database</p>
          
          <input 
            type="password" 
            placeholder="Enter Access Key" 
            className="text-slate-800 p-4 rounded-xl w-full mb-6 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/30">
            Connect to Database
          </button>
        </form>
      </div>
    );
  }

  // 📊 ถ้า Login ผ่าน ให้โชว์หน้า Dashboard ของ Service Work
  return (
    <div className="p-10 min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="mb-8 border-b border-slate-200 pb-4">
        <h1 className="text-3xl font-black text-slate-800">Service Work Data</h1>
        <p className="text-slate-500 mt-2">ศูนย์รวมข้อมูลมหาศาล แยก Database ออกจากเว็บหลัก</p>
      </header>
      
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 min-h-[500px]">
        {/* ลูกพี่เอา Component ตารางข้อมูล หรือกราฟต่างๆ มายัดใส่ตรงนี้ได้เลยครับ */}
        <p className="text-slate-400 text-center mt-20 font-bold">รอการเชื่อมต่อข้อมูล...</p>
      </div>
    </div>
  );
}
