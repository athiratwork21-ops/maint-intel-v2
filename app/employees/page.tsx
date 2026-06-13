"use client";
import React, { useState, useEffect } from 'react';
import { supabaseServiceWork } from '../../lib/supabase-servicework'; // 🌟 เปลี่ยนมาใช้ Instance ของ Service Work ตามสั่งครับ!

// ตัวแปรจำลองข้อมูลพนักงานเริ่มต้น (เพิ่มรหัสพนักงานเข้าไปด้วย)
const initialEmployees = [
  { id: 'EMP-001', name: 'สมชาย ยอดขยัน', icon: '👨‍🔧' },
  { id: 'EMP-002', name: 'สมหญิง รักงาน', icon: '👩‍💼' },
  { id: 'EMP-003', name: 'ช่างใหญ่ ไอที', icon: '👨‍💻' },
];

type CellData = { shift: 'D' | 'N' | 'O'; isOT: boolean };
type ScheduleState = Record<string, CellData>;
type HolidayState = Record<number, string>; 

export default function ShiftRosterPro() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1)); // มิถุนายน 2026
  const [employees, setEmployees] = useState(initialEmployees);
  const [schedule, setSchedule] = useState<ScheduleState>({});
  const [holidays, setHolidays] = useState<HolidayState>({ 15: 'วันหยุดโรงงาน' });
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // แถบเครื่องมือพู่กันทาสี
  const [activeTool, setActiveTool] = useState<'D' | 'N' | 'O' | 'OT' | 'ERASE'>('D');
  const [isDragging, setIsDragging] = useState(false);
  
  // ฟิลด์รับข้อมูลรหัสพนักงาน และชื่อ
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' });

  const getDayDetails = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayName = date.toLocaleString('th-TH', { weekday: 'short' });
    const isSunday = date.getDay() === 0; 
    const isWeekend = isSunday || date.getDay() === 6; 
    return { dayName, isSunday, isWeekend };
  };

  // ลอจิกการระบายสีแบบรีด Performance (ไม่ Re-render ซ้ำซ้อน)
  const applyToolToCell = (empId: string, day: number) => {
    if (!isEditMode) return; 

    const key = `${empId}_${day}`;
    setSchedule(prev => {
      const currentCell = prev[key];

      if (activeTool === 'ERASE' && !currentCell) return prev;
      if (activeTool === 'OT' && currentCell?.isOT === true) return prev;
      if (activeTool !== 'ERASE' && activeTool !== 'OT' && currentCell?.shift === activeTool && currentCell?.isOT === false) return prev;

      const newState = { ...prev };

      if (activeTool === 'ERASE') {
        delete newState[key];
      } else if (activeTool === 'OT') {
        if (currentCell && (currentCell.shift === 'D' || currentCell.shift === 'N')) {
          newState[key] = { ...currentCell, isOT: true }; 
        }
      } else {
        newState[key] = { shift: activeTool as 'D'|'N'|'O', isOT: currentCell?.isOT || false };
        if (activeTool === 'O') newState[key].isOT = false; 
      }
      return newState;
    });
  };

  const handleMouseDown = (empId: string, day: number) => {
    if (!isEditMode) return;
    setIsDragging(true);
    applyToolToCell(empId, day);
  };

  const handleMouseEnter = (empId: string, day: number) => {
    if (isDragging && isEditMode) {
      applyToolToCell(empId, day);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // ฟังก์ชันเพิ่มพนักงานพร้อมรหัสพนักงาน
  const handleAddEmployee = () => {
    if (!newEmpId.trim() || !newEmpName.trim()) return alert('กรุณากรอกรหัสและชื่อพนักงานให้ครบถ้วนครับบอส');
    
    if (employees.some(e => e.id === newEmpId.trim())) return alert('รหัสพนักงานนี้มีในระบบแล้วครับบอส');

    const newEmp = { id: newEmpId.trim().toUpperCase(), name: newEmpName.trim(), icon: '👷' };
    setEmployees([...employees, newEmp]);
    setNewEmpId('');
    setNewEmpName('');
  };

  const handleDeleteEmployee = (empId: string, empName: string) => {
    if (!isEditMode) return;
    if (confirm(`⚠️ ยืนยันการลบพนักงาน "${empName}" (${empId}) ออกจากตาราง?`)) {
      setEmployees(employees.filter(e => e.id !== empId));
      setSchedule(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(key => { if (key.startsWith(`${empId}_`)) delete newState[key]; });
        return newState;
      });
    }
  };

  // ตั้งค่าวันหยุดโรงงาน
  const handleToggleHoliday = (day: number) => {
    if (!isEditMode) return;
    const currentName = holidays[day] || '';
    const newHolidayName = prompt(`ตั้งชื่อวันหยุดพิเศษ สำหรับวันที่ ${day} ${monthName}:`, currentName);
    
    if (newHolidayName !== null) {
      setHolidays(prev => {
        const newState = { ...prev };
        if (newHolidayName.trim() === '') delete newState[day];
        else newState[day] = newHolidayName.trim();
        return newState;
      });
    }
  };

  // คำนวณสรุปยอดรายเดือน
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

  // 🌟 ระบบบันทึกข้อมูลยิงตรงเข้าตารางฐานข้อมูล Supabase (Service Work)
  const handleSaveToSupabase = async () => {
    if (Object.keys(schedule).length === 0) return alert('ไม่มีข้อมูลตารางงานให้บันทึกครับบอส');
    
    setIsSaving(true);
    try {
      const mechanicDept = localStorage.getItem('mechanicDept') || 'GENERAL';

      const upsertData = Object.entries(schedule).map(([key, value]) => {
        const [empId, dayStr] = key.split('_');
        const day = parseInt(dayStr);
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
        
        return {
          EmployeeID: empId,
          Date: dateStr,
          Shift: value.shift,
          IsOT: value.isOT,
          DepartmentID: mechanicDept
        };
      });

      // 🌟 เปลี่ยนคำสั่งชี้ไปที่ตัวแปร supabaseServiceWork ตามที่บอสต้องการ
      const { error } = await supabaseServiceWork.from('Schedules').upsert(upsertData, { onConflict: 'EmployeeID,Date' });
      if (error) throw error;

      alert('💾 บันทึกตารางงานลงระบบฐานข้อมูล Supabase สำเร็จเรียบร้อยครับบอส! 🔥');
    } catch (error: any) {
      console.error(error);
      alert(`❌ บันทึกไม่สำเร็จ: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
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

        <div className="flex flex-wrap items-center gap-4">
          
          {/* สวิตช์สลับโหมด ดู/แก้ไข */}
          <div className="flex items-center bg-[#1e293b] p-1.5 rounded-xl border border-slate-700 shadow-inner">
            <button onClick={() => setIsEditMode(false)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${!isEditMode ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
              <i className="bi bi-eye-fill"></i> โหมดดูข้อมูล
            </button>
            <button onClick={() => setIsEditMode(true)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isEditMode ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
              <i className="bi bi-pencil-square"></i> โหมดแก้ไข
            </button>
          </div>

          <div className="w-px h-8 bg-slate-700 hidden md:block"></div>

          {/* ฟอร์มเพิ่มคนพร้อมรหัสพนักงาน (โชว์เฉพาะโหมดแก้ไข) */}
          {isEditMode && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <input 
                type="text" value={newEmpId} onChange={e => setNewEmpId(e.target.value)}
                placeholder="รหัสพนักงาน (เช่น EMP-004)" 
                className="w-44 bg-[#1e293b] border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 transition-all font-bold"
              />
              <input 
                type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)}
                placeholder="ชื่อ-นามสกุล..." 
                className="w-40 bg-[#1e293b] border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 transition-all font-bold"
              />
              <button onClick={handleAddEmployee} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-xs font-bold border border-slate-600 transition-colors flex items-center gap-1">
                <i className="bi bi-person-plus-fill"></i> เพิ่มคน
              </button>
            </div>
          )}

          {/* ปุ่มบันทึกข้อมูล */}
          <button 
            onClick={handleSaveToSupabase} 
            disabled={!isEditMode || isSaving} 
            className={`px-6 py-2.5 rounded-lg text-sm font-black transition-colors shadow-lg flex items-center gap-2 ${isEditMode && !isSaving ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 active:scale-95' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
          >
            {isSaving ? <><i className="bi bi-arrow-repeat animate-spin"></i> กำลังบันทึก...</> : <><i className="bi bi-cloud-arrow-up-fill"></i> บันทึกตารางงาน</>}
          </button>
        </div>
      </div>

      {/* 🌟 Paint Brush Toolbar (ซ่อนอัตโนมัติถ้าไม่ใช่โหมดแก้ไข) */}
      <div className={`max-w-[1500px] w-full mx-auto flex items-center gap-3 shrink-0 bg-[#1e293b]/50 p-2 rounded-xl border border-slate-700/50 transition-all duration-300 overflow-hidden ${isEditMode ? 'mb-4 opacity-100 max-h-20' : 'mb-0 opacity-0 max-h-0 border-transparent py-0'}`}>
        <span className="text-xs font-bold text-slate-400 px-3 uppercase tracking-widest flex items-center gap-2"><i className="bi bi-brush-fill"></i> เลือกพู่กัน:</span>
        <button onClick={() => setActiveTool('D')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all ${activeTool === 'D' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 hover:text-emerald-400'}`}><div className="w-3 h-3 rounded-sm bg-emerald-400"></div> เช้า (D)</button>
        <button onClick={() => setActiveTool('N')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all ${activeTool === 'N' ? 'bg-orange-500 text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 hover:text-orange-400'}`}><div className="w-3 h-3 rounded-sm bg-orange-400"></div> ดึก (N)</button>
        <button onClick={() => setActiveTool('O')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all ${activeTool === 'O' ? 'bg-slate-500 text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 hover:text-white'}`}><div className="w-3 h-3 rounded-sm bg-slate-400"></div> หยุด (O)</button>
        <div className="w-px h-6 bg-slate-700 mx-2"></div>
        <button onClick={() => setActiveTool('OT')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all border ${activeTool === 'OT' ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-400/50'}`}><i className="bi bi-clock-history"></i> ป้าย OT (+OT)</button>
        <button onClick={() => setActiveTool('ERASE')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all border ${activeTool === 'ERASE' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:text-red-400'}`}><i className="bi bi-eraser-fill"></i> ยางลบ</button>
      </div>

      {/* 🌟 Main Calendar Table */}
      <div className="max-w-[1500px] w-full mx-auto bg-[#1e293b]/50 border border-slate-700/50 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl relative">
        <div className="overflow-auto custom-scrollbar flex-1 relative">
          <table className="w-full min-w-max border-collapse border-spacing-0">
            
            <thead className="sticky top-0 z-30">
              <tr className="bg-[#0f172a]/95 backdrop-blur-md text-slate-400 text-xs border-b border-slate-700 shadow-sm">
                <th className="sticky left-0 z-40 bg-[#0f172a]/95 backdrop-blur-md p-4 text-left font-bold min-w-[260px] border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                  รหัส & พนักงาน ({employees.length} คน)
                </th>
                <th className="sticky left-[260px] z-40 bg-slate-900/95 backdrop-blur-md p-2 border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)] text-center w-14 text-emerald-400">Day</th>
                <th className="sticky left-[316px] z-40 bg-slate-900/95 backdrop-blur-md p-2 border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)] text-center w-14 text-orange-400">Night</th>
                <th className="sticky left-[372px] z-40 bg-slate-900/95 backdrop-blur-md p-2 border-r border-slate-700 shadow-[4px_0_5px_rgba(0,0,0,0.2)] text-center w-14 text-amber-400 border-r-2 border-r-amber-500/20">OT</th>

                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const { dayName, isSunday, isWeekend } = getDayDetails(day);
                  const holidayName = holidays[day];
                  const isHoliday = !!holidayName;
                  
                  const borderRightClass = isSunday ? 'border-r-4 border-r-slate-600/60' : 'border-r border-slate-700/30';
                  const bgClass = isHoliday ? 'bg-rose-500/20' : (isWeekend ? 'bg-slate-800/40' : '');

                  return (
                    <th 
                      key={day} 
                      onClick={() => handleToggleHoliday(day)}
                      className={`p-1.5 text-center min-w-[60px] relative transition-colors ${borderRightClass} ${bgClass} ${isEditMode ? 'cursor-pointer hover:bg-white/10' : ''}`}
                    >
                      <div className={`font-medium mb-0.5 text-[11px] ${isHoliday ? 'text-rose-300' : 'text-slate-400'}`}>{dayName}</div>
                      <div className={`font-black text-sm ${isHoliday ? 'text-rose-400' : isWeekend ? 'text-slate-300' : 'text-white'}`}>{day}</div>
                      {isHoliday && (
                        <div className="mt-1 flex flex-col items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mb-0.5"></div>
                          <div className="text-[8px] font-black text-rose-300 bg-rose-900/50 px-1 py-0.5 rounded truncate max-w-[50px] leading-none border border-rose-500/30">{holidayName}</div>
                        </div>
                      )}
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
                    
                    {/* ข้อมูลพนักงาน (โชว์รหัสพนักงานเด่นชัดด้านล่างชื่อ) */}
                    <td className="sticky left-0 z-20 bg-[#1e293b] p-3 text-xs text-slate-200 border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-lg shadow-inner shrink-0">{emp.icon}</div>
                          <div className="min-w-0">
                            <div className="font-black text-slate-200 text-sm truncate">{emp.name}</div>
                            <div className="font-mono text-cyan-400 font-bold text-[10px] tracking-wider mt-0.5">{emp.id}</div>
                          </div>
                        </div>
                        {isEditMode && (
                          <button onClick={() => handleDeleteEmployee(emp.id, emp.name)} className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 w-7 h-7 rounded-md flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* สรุปยอดสะสมรายเดือน */}
                    <td className="sticky left-[260px] z-20 bg-slate-800 p-2 border-r border-slate-700 text-center font-black text-emerald-400 text-sm shadow-[2px_0_5px_rgba(0,0,0,0.1)]">{summary.d || '-'}</td>
                    <td className="sticky left-[316px] z-20 bg-slate-800 p-2 border-r border-slate-700 text-center font-black text-orange-400 text-sm shadow-[2px_0_5px_rgba(0,0,0,0.1)]">{summary.n || '-'}</td>
                    <td className="sticky left-[372px] z-20 bg-slate-800 p-2 border-r border-slate-700 text-center font-black text-amber-400 text-sm shadow-[4px_0_5px_rgba(0,0,0,0.2)] bg-amber-500/5 border-r-2 border-r-amber-500/20">{summary.ot || '-'}</td>

                    {/* ตารางปฏิทินกะรายวัน */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const { isSunday, isWeekend } = getDayDetails(day);
                      const isHoliday = !!holidays[day];
                      const cell = schedule[`${emp.id}_${day}`];
                      
                      const borderRightClass = isSunday ? 'border-r-4 border-r-slate-600/60' : 'border-r border-slate-700/30';
                      const colBg = isHoliday ? 'bg-rose-500/5' : (isWeekend ? 'bg-white/[0.01]' : '');

                      let cellBg = 'bg-[#1e293b] border-slate-700/50';
                      if (isEditMode) cellBg += ' hover:bg-[#334155]'; 
                      if (cell?.shift === 'D') cellBg = 'bg-emerald-500 border-emerald-600 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)] text-white';
                      if (cell?.shift === 'N') cellBg = 'bg-orange-500 border-orange-600 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)] text-white';
                      if (cell?.shift === 'O') cellBg = 'bg-slate-500 border-slate-600 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)] text-white';

                      return (
                        <td key={day} className={`p-1 relative ${borderRightClass} ${colBg}`}>
                          <div
                            onMouseDown={() => handleMouseDown(emp.id, day)}
                            onMouseEnter={() => handleMouseEnter(emp.id, day)}
                            className={`w-full h-11 rounded-md flex flex-col items-center justify-center border ${cellBg} relative overflow-hidden ${isEditMode ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            {cell?.shift ? <span className="font-black text-sm">{cell.shift}</span> : (isEditMode && <span className="opacity-0 group-hover:opacity-10 text-xs">+</span>)}
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
