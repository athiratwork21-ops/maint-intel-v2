"use client";
import React, { useState } from 'react';
// 🌟 เดี๋ยวเราค่อย import supabase ตัวใหม่เข้ามาตรงนี้
// import { supabaseServiceWork } from '../../lib/supabase-servicework'; 

// =====================================================================
// 📦 1. Component ย่อย: ฟอร์มจ่ายงาน (เอา export default ออก)
// =====================================================================
function ServiceDispatch() {
  // 🌟 สมมติว่าดึงข้อมูลพวกนี้มาจากตาราง Master (Basic Info) แล้ว
  const mockParts = [{ pn: 'PN-001', name: 'Sensor SICK' }, { pn: 'PN-002', name: 'Servo Motor' }];
  const mockStaff = [{ id: 'EMP01', name: 'สมชาย ซ่อมเก่ง' }, { id: 'EMP02', name: 'สายฟ้า พาเพลิน' }];
  const mockLines = ['Line-A', 'Line-B', 'Line-C'];

  return (
    <div className="max-w-4xl mx-auto py-4">
      <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
        <i className="bi bi-ticket-detailed-fill text-blue-600"></i> สร้างตั๋วจ่ายงาน (Job Dispatch)
      </h2>

      <form className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. W/O Number */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Work Order (W/O)</label>
            <input type="text" placeholder="e.g. WO-2026-9999" className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 shadow-sm" />
          </div>

          {/* 2. เลือกพนักงาน */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assign To (มอบหมายให้)</label>
            <div className="relative">
              <select className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none shadow-sm">
                <option value="">-- เลือกช่างผู้รับผิดชอบ --</option>
                {mockStaff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
              </select>
              <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
          </div>

          {/* 3. เลือกอะไหล่ */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Part Number (P/N)</label>
            <div className="relative">
              <select className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none shadow-sm">
                <option value="">-- เลือกอะไหล่ --</option>
                {mockParts.map(p => <option key={p.pn} value={p.pn}>{p.pn} - {p.name}</option>)}
              </select>
              <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
          </div>

          {/* 4. จำนวน */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Quantity (จำนวน)</label>
            <div className="flex items-center shadow-sm rounded-xl">
              <input type="number" min="1" defaultValue="1" className="flex-1 p-4 bg-white border border-slate-200 rounded-l-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-lg z-10" />
              <span className="bg-slate-100 border border-slate-200 border-l-0 p-4 rounded-r-xl font-bold text-slate-500">Pcs</span>
            </div>
          </div>

          {/* 5. เลือก Line */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Line</label>
            <div className="relative">
              <select className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none shadow-sm">
                <option value="">-- เลือก Line --</option>
                {mockLines.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
          </div>

          {/* 6. วัน-เวลาที่ต้องเข้าทำ */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Schedule Date/Time</label>
            <input type="datetime-local" className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 shadow-sm" />
          </div>

        </div>

        <div className="pt-6 border-t border-slate-200 mt-6">
          <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg py-5 rounded-xl shadow-lg shadow-blue-500/30 hover:scale-[1.01] active:scale-95 transition-all">
            <i className="bi bi-send-check-fill mr-2"></i> บันทึกและสร้างตั๋วจ่ายงาน
          </button>
        </div>

      </form>
    </div>
  );
}


// =====================================================================
// 🚀 2. Component หลัก: หน้าประตูทางเข้า (มี export default ได้แค่อันเดียว)
// =====================================================================
export default function ServiceWorkPortal() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'service-admin-123') { 
      setIsAuthenticated(true);
    } else {
      alert('รหัสผ่านไม่ถูกต้อง หรือคุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้!');
    }
  };

  // 🔒 หน้า Login
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

  // 📊 ถ้า Login ผ่าน ให้โชว์หน้า Dashboard พร้อมฟอร์มจ่ายงาน
  return (
    <div className="p-10 min-h-screen bg-slate-100 text-slate-800 font-sans">
      <header className="mb-8 border-b border-slate-300 pb-4 max-w-6xl mx-auto flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Service Work Database</h1>
          <p className="text-slate-500 mt-2 font-medium">ศูนย์รวมข้อมูลการจ่ายงานและประวัติเบิกจ่าย (Separate Database)</p>
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors border border-red-100">
          <i className="bi bi-box-arrow-right mr-2"></i>ออกจากระบบ
        </button>
      </header>
      
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 min-h-[500px] max-w-6xl mx-auto">
        
        {/* 🌟 เรียกใช้ Component ฟอร์มจ่ายงานตรงนี้! */}
        <ServiceDispatch />

      </div>
    </div>
  );
}
