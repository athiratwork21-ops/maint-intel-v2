"use client";
import React, { useState, useEffect } from 'react';

// 🌟 ตัวแปรจำลองข้อมูลพนักงาน
const initialEmployees = [
  { id: 'E01', name: 'สมชาย ยอดขยัน', icon: '👨‍🔧' },
  { id: 'E02', name: 'สมหญิง รักงาน', icon: '👩‍💼' },
  { id: 'E03', name: 'ช่างใหญ่ ไอที', icon: '👨‍💻' },
];

// โครงสร้างข้อมูลตารางแบบใหม่ (เก็บกะ และ สถานะ OT แยกกัน)
type CellData = { shift: 'D' | 'N' | 'O'; isOT: boolean };
type ScheduleState = Record<string, CellData>;

export default function ShiftRosterPro() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1)); // มิถุนายน 2026
  const [employees, setEmployees] = useState(initialEmployees);
  const [schedule, setSchedule] = useState<ScheduleState>({});
  
  // 🌟 ฟีเจอร์ใหม่: แถบเครื่องมือ "พู่กันทาสี" (D, N, O, OT, ERASE)
  const [activeTool, setActiveTool] = useState<'D' | 'N' | 'O' | 'OT' | 'ERASE'>('D');
  const [isDragging, setIsDragging] = useState(false);

  // State สำหรับจัดการพนักงานใหม่
  const [newEmpName, setNewEmpName] = useState('');

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' });

  const getDayName = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return date.toLocaleString('th-TH', { weekday: 'short' });
  };

  // 🖱️ ลอจิกการใช้ "พู่กัน" ระบายลงช่อง
  const applyToolToCell = (empId: string, day: number) => {
    const key = `${empId}_${day}`;
    setSchedule(prev => {
      const newState = { ...prev };
      const currentCell = newState[key];

      if (activeTool === 'ERASE') {
        delete newState[key];
      } else if (activeTool === 'OT') {
        // ให้บวก OT ได้เฉพาะกะ D หรือ N เท่านั้น (วันหยุด O ห้ามทำ OT)
        if (currentCell && (currentCell.shift === 'D' || currentCell.shift === 'N')) {
          newState[key] = { ...currentCell, isOT: true }; // ถ้าลากซ้ำก็ให้ OT ค้างไว้
        }
      } else {
        // ถ้าทาสี D, N, O ปกติ (เก็บค่า OT เดิมไว้ถ้ามี)
        newState[key] = { shift: activeTool as 'D'|'N'|'O', isOT: currentCell?.isOT || false };
        if (activeTool === 'O') newState[key].isOT = false; // วันหยุดตัด OT ทิ้ง
      }
      return newState;
    });
  };

  // Event: คลิกเมาส์
  const handleMouseDown = (empId: string, day: number) => {
    setIsDragging(true);
    applyToolToCell(empId, day);
  };

  // Event: ลากผ่าน
  const handleMouseEnter = (empId: string, day: number) => {
    if (isDragging) {
      applyToolToCell(empId, day);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // 👥 ฟังก์ชันเพิ่มพนักงาน
  const handleAddEmployee = () => {
    if (!newEmpName.trim()) return alert('กรุณากรอกชื่อพนักงาน');
    const newEmp = { id: `E0${Date.now()}`, name: newEmpName, icon: '👷' };
    setEmployees([...employees, newEmp]);
    setNewEmpName('');
  };

  // 👥 ฟังก์ชันลบพนักงาน
  const handleDeleteEmployee = (empId: string, empName: string) => {
    if (confirm(`⚠️ ยืนยันการลบพนักงาน "${empName}" ออกจากตาราง?\n(ข้อมูลกะของเดือนนี้จะหายไปด้วย)`)) {
      setEmployees(employees.filter(e => e.id !== empId));
      // ล้างข้อมูลกะของคนนี้ทิ้ง
      setSchedule(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(key => { if (key.startsWith(`${empId}_`)) delete newState[key]; });
        return newState;
      });
    }
  };

  // 📊 ฟังก์ชันคำนวณสรุปยอดรายเดือน
  const calculateSummary = (empId: string) => {
    let d = 0, n = 0, ot = 0, off = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const cell = schedule[`${empId}_${day}`];
      if (cell) {
        if (cell.shift === 'D') d++;
        if (cell.shift === 'N') n++;
        if (cell.shift === 'O') off++;
        if (cell.isOT) ot++;
      }
    }
    return { d, n, off, ot };
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-6 font-sans select-none flex flex-col h-screen overflow-hidden">
      
      {/* 🌟 Header Section */}
      <div className="max-w-[1500px] w-full mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight text-white">
            <i className="bi bi-calendar3 text-emerald-400"></i> Roster <span className="text-emerald-400">Pro</span>
          </h1>
          <p className="text-slate-400 mt-1 font-medium">ตารางประจำเดือน: <span className="text-white font-bold">{monthName}</span></p>
        </div>

        {/* ฟอร์มเพิ่มพนักงาน */}
        <div className="flex items-center gap-2">
          <input 
            type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)}
            placeholder="พิมพ์ชื่อพนักงานใหม่..." 
            className="w-48 bg-[#1e293b] border border-slate-700 text-white text-sm rounded-lg px-4 py-2.5 outline-none focus:border-emerald-500 transition-all"
          />
          <button onClick={handleAddEmployee} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold border border-slate-600 transition-colors flex items-center gap-2">
            <i className="bi bi-person-plus-fill"></i> เพิ่มคน
          </button>
          <div className="w-px h-8 bg-slate-700 mx-2"></div>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-black transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2">
            <i className="bi bi-cloud-arrow-up-fill"></i> บันทึก
          </button>
        </div>
      </div>

      {/* 🌟 Paint Brush Toolbar (แถบเครื่องมือทาสี) */}
      <div className="max-w-[1500px] w-full mx-auto mb-4 flex items-center gap-3 shrink-0 bg-[#1e293b]/50 p-2 rounded-xl border border-slate-700/50">
        <span className="text-xs font-bold text-slate-400 px-3 uppercase tracking-widest flex items-center gap-2"><i className="bi bi-brush-fill"></i> เลือกพู่กัน:</span>
        <button onClick={() => setActiveTool('D')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all ${activeTool === 'D' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 hover:text-emerald-400'}`}><div className="w-3 h-3 rounded-sm bg-emerald-400"></div> เช้า (D)</button>
        <button onClick={() => setActiveTool('N')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all ${activeTool === 'N' ? 'bg-orange-500 text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 hover:text-orange-400'}`}><div className="w-3 h-3 rounded-sm bg-orange-400"></div> ดึก (N)</button>
        <button onClick={() => setActiveTool('O')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all ${activeTool === 'O' ? 'bg-slate-500 text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 hover:text-white'}`}><div className="w-3 h-3 rounded-sm bg-slate-400"></div> หยุด (O)</button>
        
        <div className="w-px h-6 bg-slate-700 mx-2"></div>
        
        <button onClick={() => setActiveTool('OT')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all border ${activeTool === 'OT' ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-400/50'}`}>
          <i className="bi bi-clock-history"></i> ป้าย OT (+OT)
        </button>
        <button onClick={() => setActiveTool('ERASE')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all border ${activeTool === 'ERASE' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:text-red-400'}`}>
          <i className="bi bi-eraser-fill"></i> ยางลบ
        </button>
      </div>

      {/* 🌟 Main Calendar Table */}
      <div className="max-w-[1500px] w-full mx-auto bg-[#1e293b]/50 border border-slate-700/50 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl relative">
        <div className="overflow-auto custom-scrollbar flex-1 relative">
          <table className="w-full min-w-max border-collapse border-spacing-0">
            
            <thead className="sticky top-0 z-30">
              <tr className="bg-[#0f172a]/95 backdrop-blur-md text-slate-400 text-xs border-b border-slate-700 shadow-sm">
                <th className="sticky left-0 z-40 bg-[#0f172a]/95 backdrop-blur-md p-4 text-left font-bold min-w-[220px] border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                  พนักงาน ({employees.length} คน)
                </th>
                {/* 🌟 คอลัมน์สรุปยอด (Sticky ติดชื่อพนักงาน) */}
                <th className="sticky left-[220px] z-40 bg-slate-900/95 backdrop-blur-md p-2 border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)] text-center w-16 text-emerald-400">Day</th>
                <th className="sticky left-[284px] z-40 bg-slate-900/95 backdrop-blur-md p-2 border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)] text-center w-16 text-orange-400">Night</th>
                <th className="sticky left-[348px] z-40 bg-slate-900/95 backdrop-blur-md p-2 border-r border-slate-700 shadow-[4px_0_5px_rgba(0,0,0,0.2)] text-center w-16 text-amber-400 border-r-2 border-r-amber-500/20">OT</th>

                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const dayName = getDayName(day);
                  const isWeekend = dayName.includes('ส.') || dayName.includes('อา.');
                  return (
                    <th key={day} className={`p-2 text-center border-r border-slate-700/30 min-w-[55px] ${isWeekend ? 'bg-rose-500/5' : ''}`}>
                      <div className="font-medium mb-1">{dayName}</div>
                      <div className={`font-black text-sm ${isWeekend ? 'text-rose-400' : 'text-slate-300'}`}>{day}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {employees.map((emp) => {
                const summary = calculateSummary(emp.id);

                return (
                  <tr key={emp.id} className="border-b border-slate-700/50 hover:bg-white/[0.02] transition-colors group">
                    
                    {/* ชื่อพนักงาน + ปุ่มลบ */}
                    <td className="sticky left-0 z-20 bg-[#1e293b] p-3 text-sm text-slate-200 border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 font-bold">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-lg shadow-inner">{emp.icon}</div>
                          <span className="truncate max-w-[120px]">{emp.name}</span>
                        </div>
                        <button onClick={() => handleDeleteEmployee(emp.id, emp.name)} className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 w-7 h-7 rounded-md flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </div>
                    </td>

                    {/* 🌟 ข้อมูลสรุปยอด */}
                    <td className="sticky left-[220px] z-20 bg-slate-800 p-2 border-r border-slate-700 text-center font-black text-emerald-400 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">{summary.d || '-'}</td>
                    <td className="sticky left-[284px] z-20 bg-slate-800 p-2 border-r border-slate-700 text-center font-black text-orange-400 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">{summary.n || '-'}</td>
                    <td className="sticky left-[348px] z-20 bg-slate-800 p-2 border-r border-slate-700 text-center font-black text-amber-400 shadow-[4px_0_5px_rgba(0,0,0,0.2)] bg-amber-500/5 border-r-2 border-r-amber-500/20">{summary.ot || '-'}</td>

                    {/* ช่องตาราง */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const cell = schedule[`${emp.id}_${day}`];
                      
                      let baseBg = 'bg-[#1e293b] border-slate-700/50 hover:bg-[#334155]';
                      if (cell?.shift === 'D') baseBg = 'bg-emerald-500 border-emerald-600 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)] text-white';
                      if (cell?.shift === 'N') baseBg = 'bg-orange-500 border-orange-600 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)] text-white';
                      if (cell?.shift === 'O') baseBg = 'bg-slate-500 border-slate-600 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)] text-white';

                      return (
                        <td key={day} className="p-1 border-r border-slate-700/30 relative">
                          <div
                            onMouseDown={() => handleMouseDown(emp.id, day)}
                            onMouseEnter={() => handleMouseEnter(emp.id, day)}
                            className={`w-full h-11 rounded-md flex flex-col items-center justify-center transition-all cursor-pointer border ${baseBg} relative overflow-hidden`}
                          >
                            {/* ตัวอักษร D, N, O */}
                            {cell?.shift ? <span className="font-black text-sm">{cell.shift}</span> : <span className="opacity-0 group-hover:opacity-10 text-xs">+</span>}
                            
                            {/* 🌟 Badge แสดง OT (ถ้ามี) */}
                            {cell?.isOT && (
                              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-900 text-[8px] font-black px-1.5 py-0.5 rounded-tl-md border-t border-l border-amber-300">
                                +OT
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              
              {/* แถวว่างเผื่อ Scroll */}
              <tr className="h-10"></tr>
            </tbody>
          </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 12px; width: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 8px; border: 3px solid #0f172a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
}
