"use client";
import React, { useState, useEffect, MouseEvent } from 'react';

// 🌟 ตัวแปรจำลองข้อมูลพนักงาน (Mock Data)
const initialEmployees = [
  { id: 'E01', name: 'สมชาย ยอดขยัน', icon: '👨‍🔧' },
  { id: 'E02', name: 'สมหญิง รักงาน', icon: '👩‍💼' },
  { id: 'E03', name: 'ช่างใหญ่ ไอที', icon: '👨‍💻' },
];

export default function ShiftRosterPro() {
  // 🌟 State สำหรับจัดการตาราง (เดือน/ปี)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1)); // เริ่มต้นที่ มิถุนายน 2026
  const [employees, setEmployees] = useState(initialEmployees);
  
  // 🌟 State หลักสำหรับเก็บตารางงาน: format { "E01_1": "D", "E01_2": "N" }
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  
  // 🌟 State สำหรับลอจิก "ลากเมาส์เพื่อทาสี (Drag to Paint)"
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState<string | null>(null);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' });

  // ฟังก์ชันหาชื่อวันย่อ (จ., อ., พ., ...)
  const getDayName = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return date.toLocaleString('th-TH', { weekday: 'short' });
  };

  // 🌟 ลอจิกการกดปุ่มสลับกะ (Empty -> D -> N -> O -> Empty)
  const getNextShift = (currentShift: string | undefined): string | null => {
    if (!currentShift) return 'D';
    if (currentShift === 'D') return 'N';
    if (currentShift === 'N') return 'O';
    return null;
  };

  // 🖱️ Event: เมื่อเริ่มคลิกเมาส์ที่ช่อง
  const handleMouseDown = (empId: string, day: number, currentShift: string | undefined) => {
    const nextValue = getNextShift(currentShift);
    setIsDragging(true);
    setDragValue(nextValue);
    updateCell(empId, day, nextValue);
  };

  // 🖱️ Event: เมื่อลากเมาส์ผ่านช่องอื่น (ระบายสี)
  const handleMouseEnter = (empId: string, day: number) => {
    if (isDragging) {
      updateCell(empId, day, dragValue);
    }
  };

  // 🖱️ Event: เมื่อปล่อยคลิกเมาส์
  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const updateCell = (empId: string, day: number, value: string | null) => {
    const key = `${empId}_${day}`;
    setSchedule(prev => {
      const newState = { ...prev };
      if (value === null) delete newState[key];
      else newState[key] = value;
      return newState;
    });
  };

  const handleSave = () => {
    console.log("💾 บันทึกข้อมูลลง Database:", schedule);
    alert('บันทึกตารางงานเรียบร้อยแล้ว! (เช็ก Console)');
  };

  // 🎨 ฟังก์ชันคืนค่าสีของแต่ละกะ
  const getShiftStyle = (shift: string | undefined) => {
    if (shift === 'D') return 'bg-emerald-500 text-white border-emerald-600 font-black shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]';
    if (shift === 'N') return 'bg-orange-500 text-white border-orange-600 font-black shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]';
    if (shift === 'O') return 'bg-slate-500 text-white border-slate-600 font-black shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]';
    return 'bg-[#1e293b] text-slate-600 border-slate-700/50 hover:bg-[#334155] cursor-pointer';
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-6 font-sans select-none">
      
      {/* 🌟 Header Section */}
      <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight text-white">
            <i className="bi bi-calendar-month text-emerald-400"></i> Shift Roster <span className="text-emerald-400">Pro</span>
          </h1>
          <p className="text-slate-400 mt-1 font-medium">
            ตารางกะประจำเดือน: <span className="text-white font-bold">{monthName}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <input 
              type="text" 
              placeholder="ชื่อพนักงานใหม่..." 
              className="w-full md:w-64 bg-[#1e293b] border border-slate-700 text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>
          <button className="bg-[#334155] hover:bg-[#475569] text-white px-4 py-2.5 rounded-lg text-sm font-bold border border-slate-600 transition-colors flex items-center gap-2">
            <i className="bi bi-person-plus-fill"></i> เพิ่มคน
          </button>
          <button onClick={handleSave} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-black transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95">
            <i className="bi bi-save-fill"></i> บันทึกตาราง
          </button>
        </div>
      </div>

      {/* 🌟 Main Calendar Table */}
      <div className="max-w-[1400px] mx-auto bg-[#1e293b]/50 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-max border-collapse">
            
            {/* Table Header */}
            <thead>
              <tr className="bg-[#0f172a]/80 text-slate-400 text-xs border-b border-slate-700">
                <th className="sticky left-0 z-20 bg-[#0f172a] p-4 text-left font-bold min-w-[200px] border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                  พนักงาน ({employees.length} คน)
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const dayName = getDayName(day);
                  const isWeekend = dayName.includes('ส.') || dayName.includes('อา.');
                  return (
                    <th key={day} className={`p-2 text-center border-r border-slate-700/30 min-w-[50px] ${isWeekend ? 'text-rose-400 bg-rose-500/5' : ''}`}>
                      <div className="font-medium mb-1">{dayName}</div>
                      <div className={`font-black text-sm ${isWeekend ? 'text-rose-400' : 'text-slate-300'}`}>{day}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b border-slate-700/50 hover:bg-white/[0.02] transition-colors">
                  
                  {/* Sticky Column: ชื่อพนักงาน */}
                  <td className="sticky left-0 z-10 bg-[#1e293b] p-4 font-bold text-sm text-slate-200 border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-lg shadow-inner">
                      {emp.icon}
                    </div>
                    {emp.name}
                  </td>

                  {/* ลูปสร้างช่องตารางรายวัน */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const shift = schedule[`${emp.id}_${day}`];
                    
                    return (
                      <td key={day} className="p-1 border-r border-slate-700/30">
                        <div
                          onMouseDown={() => handleMouseDown(emp.id, day, shift)}
                          onMouseEnter={() => handleMouseEnter(emp.id, day)}
                          className={`w-full h-11 rounded-md flex items-center justify-center transition-all ${getShiftStyle(shift)}`}
                        >
                          {shift ? shift : <span className="opacity-20">+</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>

      {/* 🌟 Legend (คำอธิบายสี) */}
      <div className="max-w-[1400px] mx-auto mt-6 flex gap-4">
        <div className="flex items-center gap-4 bg-[#1e293b]/50 border border-slate-700/50 px-5 py-3 rounded-xl shadow-lg">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-500"></div><span className="text-sm font-bold text-slate-300">D = Day (เช้า)</span></div>
          <div className="w-px h-4 bg-slate-700"></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-orange-500"></div><span className="text-sm font-bold text-slate-300">N = Night (ดึก)</span></div>
          <div className="w-px h-4 bg-slate-700"></div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-slate-500"></div><span className="text-sm font-bold text-slate-300">O = Off (หยุด)</span></div>
        </div>
      </div>

      {/* สไตล์สำหรับ Scrollbar ให้ดูเนียนเข้ากับ Dark Mode */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 8px; border: 2px solid #0f172a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
}
