"use client";
import React, { useState } from 'react';

// =====================================================================
// 📦 1. Component: แท็บจัดการข้อมูลพื้นฐาน (Master Data)
// =====================================================================
function MasterDataTab({ parts, setParts, staff, setStaff, lines, setLines }: any) {
  const handleAddPart = (e: any) => { e.preventDefault(); const pn = e.target.pn.value; const name = e.target.name.value; setParts([...parts, { pn, name }]); e.target.reset(); alert('เพิ่มวัตถุดิบสำเร็จ!'); };
  const handleAddStaff = (e: any) => { e.preventDefault(); const id = e.target.empId.value; const name = e.target.name.value; setStaff([...staff, { id, name }]); e.target.reset(); alert('เพิ่มพนักงานสำเร็จ!'); };
  const handleAddLine = (e: any) => { e.preventDefault(); const line = e.target.line.value; setLines([...lines, line]); e.target.reset(); alert('เพิ่ม Line สำเร็จ!'); };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-black text-slate-800 mb-4 border-b pb-2"><i className="bi bi-database-add text-blue-600 mr-2"></i> 1. ตั้งค่าวัตถุดิบ (Raw Materials)</h2>
        <form onSubmit={handleAddPart} className="flex gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Part Number (P/N)</label><input type="text" name="pn" required className="w-full p-3 rounded-lg border outline-none focus:border-blue-500 font-bold text-sm" placeholder="e.g. RAW-001" /></div>
          <div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">ชื่อวัตถุดิบ</label><input type="text" name="name" required className="w-full p-3 rounded-lg border outline-none focus:border-blue-500 font-bold text-sm" placeholder="e.g. พลาสติกเม็ดสีแดง" /></div>
          <button type="submit" className="bg-blue-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-blue-700 active:scale-95"><i className="bi bi-plus-lg"></i> เพิ่ม</button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-black text-slate-800 mb-4 border-b pb-2"><i className="bi bi-people-fill text-indigo-600 mr-2"></i> 2. ตั้งค่าพนักงานจ่ายของ (Material Handlers)</h2>
        <form onSubmit={handleAddStaff} className="flex gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">รหัสพนักงาน</label><input type="text" name="empId" required className="w-full p-3 rounded-lg border outline-none focus:border-indigo-500 font-bold text-sm" placeholder="e.g. WH-001" /></div>
          <div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">ชื่อ-นามสกุล</label><input type="text" name="name" required className="w-full p-3 rounded-lg border outline-none focus:border-indigo-500 font-bold text-sm" placeholder="e.g. สมหมาย จ่ายไว" /></div>
          <button type="submit" className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-indigo-700 active:scale-95"><i className="bi bi-plus-lg"></i> เพิ่ม</button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-black text-slate-800 mb-4 border-b pb-2"><i className="bi bi-diagram-3-fill text-emerald-600 mr-2"></i> 3. ตั้งค่าจุดส่งของ (Production Lines)</h2>
        <form onSubmit={handleAddLine} className="flex gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200 w-1/2">
          <div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">ชื่อ Line / เครื่องจักร</label><input type="text" name="line" required className="w-full p-3 rounded-lg border outline-none focus:border-emerald-500 font-bold text-sm" placeholder="e.g. Line-A1" /></div>
          <button type="submit" className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-emerald-700 active:scale-95"><i className="bi bi-plus-lg"></i> เพิ่ม</button>
        </form>
      </div>
    </div>
  );
}

// =====================================================================
// 🎫 2. Component: แท็บสร้างตั๋วจ่ายงาน (ใช้ข้อมูลจาก Master Data มาทำ Dropdown)
// =====================================================================
function DispatchTab({ parts, staff, lines }: any) {
  const handleDispatchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const timestamp = new Date().toISOString(); 
    
    // โชว์แจ้งเตือนว่าบันทึกเวลาไหน
    const displayTime = new Date(timestamp).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'medium' });
    alert(`✅ สั่งงานสำเร็จ!\nตั๋วถูกส่งให้ผู้จ่ายของแล้ว\nเวลาที่บันทึก: ${displayTime}`);
    e.currentTarget.reset();
  };

  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
        <i className="bi bi-send-check-fill text-blue-600"></i> สั่งจ่ายวัตถุดิบเข้าไลน์ (Create Ticket)
      </h2>

      <form onSubmit={handleDispatchSubmit} className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Work Order (W/O)</label>
            <input type="text" name="woNumber" required placeholder="e.g. WO-2026-9999" className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 shadow-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Assign To (พนักงานจ่ายของ)</label>
            <div className="relative">
              <select name="assignTo" required className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none shadow-sm">
                <option value="">-- เลือกพนักงาน --</option>
                {staff.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
              </select>
              <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Line (จุดส่งของ)</label>
            <div className="relative">
              <select name="targetLine" required className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none shadow-sm">
                <option value="">-- เลือก Line --</option>
                {lines.map((l: any) => <option key={l} value={l}>{l}</option>)}
              </select>
              <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Part Number (วัตถุดิบ)</label>
            <div className="relative">
              <select name="partNumber" required className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none shadow-sm">
                <option value="">-- เลือกวัตถุดิบ --</option>
                {parts.map((p: any) => <option key={p.pn} value={p.pn}>{p.pn} - {p.name}</option>)}
              </select>
              <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Quantity (จำนวน)</label>
            <div className="flex items-center shadow-sm rounded-xl">
              <input type="number" name="quantity" min="1" defaultValue="1" required className="flex-1 p-4 bg-white border border-slate-200 rounded-l-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-lg z-10" />
              <span className="bg-slate-100 border border-slate-200 border-l-0 p-4 rounded-r-xl font-bold text-slate-500">Units</span>
            </div>
          </div>
          
        </div>

        <div className="pt-6 border-t border-slate-200 mt-6">
          <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-lg py-5 rounded-xl shadow-lg shadow-blue-500/30 hover:scale-[1.01] active:scale-95 transition-all flex justify-center items-center gap-2">
            <i className="bi bi-ticket-perforated-fill"></i> ออกตั๋วจ่ายงาน
          </button>
          <p className="text-center text-[11px] text-slate-400 mt-3 font-bold">
            <i className="bi bi-clock-history mr-1"></i> วันและเวลาจะถูกบันทึกอัตโนมัติ (Auto-Timestamp)
          </p>
        </div>
      </form>
    </div>
  );
}


// =====================================================================
// 🚀 3. Component หลัก: ควบคุม Login และระบบสลับหน้า (Tabs)
// =====================================================================
export default function ServiceWorkPortal() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dispatch');

  // 🌟 จำลองข้อมูล Master Data ตั้งต้น (เชื่อมโยงกันทั้งระบบ)
  const [parts, setParts] = useState([{ pn: 'RAW-001', name: 'เม็ดพลาสติก สีดำ' }]);
  const [staff, setStaff] = useState([{ id: 'WH-01', name: 'สมหมาย ส่งไว' }]);
  const [lines, setLines] = useState(['Line-A']);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') { // รหัสผ่านเทสระบบ พิมพ์แค่ admin
      setIsAuthenticated(true);
    } else {
      alert('รหัสผ่านไม่ถูกต้อง!');
    }
  };

  // 🔒 หน้า Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-sans">
        <form onSubmit={handleLogin} className="p-10 bg-slate-800/80 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-700 w-full max-w-sm">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center text-3xl">
              <i className="bi bi-box-seam-fill"></i>
            </div>
          </div>
          <h1 className="text-2xl font-black mb-2 text-center text-white tracking-wide">Material Portal</h1>
          <p className="text-sm text-slate-400 text-center mb-8">ระบบคลังและจ่ายวัตถุดิบ</p>
          <input type="password" placeholder="พิมพ์คำว่า admin เพื่อเทส" className="text-slate-800 p-4 rounded-xl w-full mb-6 outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/30">เข้าสู่ระบบ</button>
        </form>
      </div>
    );
  }

  // 📊 หน้า Dashboard หลัก (มีระบบ Tabs)
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      
      {/* Navbar ด้านบน */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <i className="bi bi-box-seam-fill text-emerald-600"></i> Material Distribution System
          </h1>
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors border border-red-100 shadow-sm active:scale-95">
          ออกจากระบบ
        </button>
      </header>
      
      <div className="flex-1 flex max-w-7xl mx-auto w-full py-8 gap-8">
        
        {/* เมนูด้านซ้าย (Sidebar Tabs) */}
        <div className="w-64 shrink-0 space-y-2">
          <button onClick={() => setActiveTab('dispatch')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'dispatch' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
            <i className="bi bi-send-check-fill text-lg"></i> สั่งจ่ายงาน
          </button>
          <button onClick={() => setActiveTab('board')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'board' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
            <i className="bi bi-kanban-fill text-lg"></i> กระดานตั๋วงาน
          </button>
          <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'inventory' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
            <i className="bi bi-box-seam text-lg"></i> สต๊อกคงเหลือ
          </button>
          <div className="h-px bg-slate-200 my-4 mx-4"></div>
          <button onClick={() => setActiveTab('master')} className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold transition-all ${activeTab === 'master' ? 'bg-slate-800 text-white shadow-lg shadow-slate-800/30' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'}`}>
            <i className="bi bi-database-fill-gear text-lg"></i> ตั้งค่า Master Data
          </button>
        </div>

        {/* พื้นที่แสดงเนื้อหาตรงกลาง */}
        <div className="flex-1 bg-white p-8 rounded-3xl shadow-sm border border-slate-200 min-h-[600px]">
          {activeTab === 'dispatch' && <DispatchTab parts={parts} staff={staff} lines={lines} />}
          {activeTab === 'master' && <MasterDataTab parts={parts} setParts={setParts} staff={staff} setStaff={setStaff} lines={lines} setLines={setLines} />}
          
          {/* Placeholder สำหรับหน้าอื่นๆ ในอนาคต */}
          {activeTab === 'board' && <div className="text-center text-slate-400 mt-20 font-bold"><i className="bi bi-tools text-4xl block mb-4"></i>รอการพัฒนา: กระดานแสดงสถานะตั๋ว (Pending / Delivered)</div>}
          {activeTab === 'inventory' && <div className="text-center text-slate-400 mt-20 font-bold"><i className="bi bi-tools text-4xl block mb-4"></i>รอการพัฒนา: ตารางแสดงยอดสต๊อกวัตถุดิบและประวัติ Log</div>}
        </div>

      </div>
    </div>
  );
}
