"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseServiceWork } from '../../lib/supabase-servicework';
import * as XLSX from 'xlsx';

const initialEmployees = [
  { id: '86125806', name: 'Example#1', icon: '👨‍🔧' },
  { id: '86129121', name: 'Example#3', icon: '👩‍💼' },
  { id: '86130049', name: 'Example#5', icon: '👨‍💻' },
];

type CellData = { shift: 'D' | 'N' | 'O'; isOT: boolean };
type ScheduleState = Record<string, CellData>;
type HolidayState = Record<number, string>;

// =========================================================================
// 🚀 TURBO UPGRADE: แยกแถวพนักงานออกมาแล้วครอบด้วย React.memo 
// =========================================================================
const EmployeeRow = React.memo(({
  emp, schedule, monthDaysDetails, holidays, isEditMode,
  isSelected, isViolating,
  handleToggleSelectEmp, handleDeleteEmployee, handleMouseDown, handleMouseEnter
}: any) => {

  // คำนวณยอดสรุป (ทำสดๆ เฉพาะในแถวของตัวเอง ประหยัดพลังงานมาก)
  let d = 0, n = 0, ot = 0, off = 0;
  monthDaysDetails.forEach(({ day }: any) => {
    const cell = schedule[`${emp.id}_${day}`];
    if (cell) {
      if (cell.shift === 'D') d++;
      if (cell.shift === 'N') n++;
      if (cell.shift === 'O') off++;
      if (cell.isOT) ot++;
    }
  });

  return (
    <tr className={`border-b border-slate-700/50 hover:bg-white/[0.02] transition-colors group ${isViolating ? 'bg-red-500/5' : ''}`}>
      {/* 📌 ชื่อพนักงาน */}
      <td className="sticky left-0 z-20 bg-[#1e293b] p-3 text-xs text-slate-200 border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              checked={isSelected} 
              onChange={() => handleToggleSelectEmp(emp.id)} 
              className="w-4 h-4 rounded cursor-pointer accent-emerald-500 shrink-0" 
            />
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-lg shadow-inner shrink-0">{emp.icon || '👷'}</div>
            <div className="min-w-0">
              <div className="font-black text-slate-200 text-sm truncate flex items-center gap-1.5">
                {emp.name}
                {isViolating && <i className="bi bi-exclamation-triangle-fill text-red-500 animate-pulse" title="เตือน: ทำงานต่อเนื่องเกิน 6 วัน!"></i>}
              </div>
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

      {/* 📌 ยอดสรุป */}
      <td className="sticky left-[280px] z-20 bg-slate-800 p-2 border-r border-slate-700 text-center font-black text-emerald-400 text-sm shadow-[2px_0_5px_rgba(0,0,0,0.1)]">{d || '-'}</td>
      <td className="sticky left-[336px] z-20 bg-slate-800 p-2 border-r border-slate-700 text-center font-black text-orange-400 text-sm shadow-[2px_0_5px_rgba(0,0,0,0.1)]">{n || '-'}</td>
      <td className="sticky left-[392px] z-20 bg-slate-800 p-2 border-r border-slate-700 text-center font-black text-amber-400 text-sm shadow-[4px_0_5px_rgba(0,0,0,0.2)] bg-amber-500/5 border-r-2 border-r-amber-500/20">{ot || '-'}</td>

      {/* 📌 ช่องตารางรายวัน (30/31 ช่อง) */}
      {monthDaysDetails.map(({ day, isSunday, isWeekend }: any) => {
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
                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-900 text-[8px] font-black px-1.5 py-0.5 rounded-tl-md border-t border-l border-amber-300">+OT</div>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}, (prev: any, next: any) => {
  // 🧠 สมองกล: เช็กว่าข้อมูลแถวนี้เปลี่ยนไหม ถ้าไม่เปลี่ยน สั่ง React "ข้ามการ Render!" (นี่คือท่าแก้หน่วง 100%)
  if (prev.isEditMode !== next.isEditMode) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isViolating !== next.isViolating) return false;
  if (prev.holidays !== next.holidays) return false;

  const empId = prev.emp.id;
  for (let i = 0; i < prev.monthDaysDetails.length; i++) {
    const day = prev.monthDaysDetails[i].day;
    const key = `${empId}_${day}`;
    if (prev.schedule[key]?.shift !== next.schedule[key]?.shift) return false;
    if (prev.schedule[key]?.isOT !== next.schedule[key]?.isOT) return false;
  }
  return true;
});

// =========================================================================
// คอมโพเนนต์หลัก (Main Component)
// =========================================================================
export default function ShiftRosterPro() {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }); 

  const [employees, setEmployees] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<ScheduleState>({});
  const [holidays, setHolidays] = useState<HolidayState>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [activeTool, setActiveTool] = useState<'D' | 'N' | 'O' | 'OT' | 'ERASE'>('D');
  const [isDragging, setIsDragging] = useState(false);
  
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');

  const [selectedForExport, setSelectedForExport] = useState<string[]>([]);
  const [violations, setViolations] = useState<string[]>([]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' });

  // 🧠 Cache ปฏิทินไว้ (ไม่ต้องสร้าง Date() ใหม่เป็นพันๆ รอบตอนขยับเมาส์)
  const monthDaysDetails = useMemo(() => {
    const details = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      details.push({
        day,
        dayName: date.toLocaleString('th-TH', { weekday: 'short' }),
        isSunday: date.getDay() === 0,
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      });
    }
    return details;
  }, [currentDate, daysInMonth]);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const { data: empData, error: empErr } = await supabaseServiceWork.from('employees').select('*').order('id');
        if (empErr) throw empErr;
        const loadedEmps = empData || [];
        setEmployees(loadedEmps);
        setSelectedForExport(loadedEmps.map(e => e.id)); 

        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-${daysInMonth}`;

        const { data: schedData, error: schedErr } = await supabaseServiceWork
          .from('schedules').select('*').gte('work_date', startDate).lte('work_date', endDate);

        if (schedErr) throw schedErr;

        const loadedSchedule: ScheduleState = {};
        if (schedData) {
          schedData.forEach(row => {
            const day = parseInt(row.work_date.split('-')[2], 10);
            loadedSchedule[`${row.employee_id}_${day}`] = { shift: row.shift_code as 'D'|'N'|'O', isOT: row.is_ot };
          });
        }
        setSchedule(loadedSchedule);
      } catch (error: any) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [currentDate, daysInMonth]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [year, month] = e.target.value.split('-');
    if (isEditMode && Object.keys(schedule).length > 0) {
      if (!confirm('ยืนยันที่จะเปลี่ยนเดือนหรือไม่? (ข้อมูลที่ยังไม่เซฟอาจสูญหาย)')) return;
    }
    setCurrentDate(new Date(parseInt(year), parseInt(month) - 1, 1));
    setViolations([]);
    setHolidays({});
  };

  const applyToolToCell = useCallback((empId: string, day: number) => {
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
  }, [isEditMode, activeTool]);

  const handleMouseDown = useCallback((empId: string, day: number) => {
    if (!isEditMode) return;
    setIsDragging(true);
    applyToolToCell(empId, day);
  }, [isEditMode, applyToolToCell]);

  const handleMouseEnter = useCallback((empId: string, day: number) => {
    if (isDragging && isEditMode) applyToolToCell(empId, day);
  }, [isDragging, isEditMode, applyToolToCell]);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // 🌟 ถอด Alert ออก เปลี่ยนเป็นคำนวณเงียบๆ (ไม่กระตุกตอนลากเมาส์)
  useEffect(() => {
    const newViolations: string[] = [];
    employees.forEach(emp => {
      let consecutiveWorkDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const cell = schedule[`${emp.id}_${day}`];
        if (cell && (cell.shift === 'D' || cell.shift === 'N')) {
          consecutiveWorkDays++;
          if (consecutiveWorkDays > 6 && !newViolations.includes(emp.id)) newViolations.push(emp.id);
        } else {
          consecutiveWorkDays = 0;
        }
      }
    });
    setViolations(newViolations);
  }, [schedule, employees, daysInMonth]);

  const handleAddEmployee = async () => {
    if (!newEmpId.trim() || !newEmpName.trim()) return alert('กรุณากรอกรหัสและชื่อพนักงานให้ครบ');
    if (employees.some(e => e.id === newEmpId.trim())) return alert('รหัสพนักงานนี้มีในระบบแล้ว');

    try {
      const { error } = await supabaseServiceWork.from('employees').insert({
        id: newEmpId.trim(), name: newEmpName.trim(), role: 'Staff'
      });
      if (error) throw error;

      const newEmp = { id: newEmpId.trim(), name: newEmpName.trim() };
      setEmployees([...employees, newEmp]);
      setSelectedForExport(prev => [...prev, newEmp.id]);
      setNewEmpId(''); setNewEmpName('');
    } catch (err: any) { alert(`❌ เพิ่มพนักงานพัง: ${err.message}`); }
  };

  const handleDeleteEmployee = useCallback(async (empId: string, empName: string) => {
    if (!isEditMode) return;
    if (confirm(`⚠️ ยืนยันการลบพนักงาน "${empName}" (${empId}) ออกจากระบบถาวร?\n(ข้อมูลกะทั้งหมดจะถูกลบด้วย)`)) {
      try {
        const { error } = await supabaseServiceWork.from('employees').delete().eq('id', empId);
        if (error) throw error;

        setEmployees(prev => prev.filter(e => e.id !== empId));
        setSelectedForExport(prev => prev.filter(id => id !== empId));
        setSchedule(prev => {
          const newState = { ...prev };
          Object.keys(newState).forEach(key => { if (key.startsWith(`${empId}_`)) delete newState[key]; });
          return newState;
        });
      } catch (err: any) { alert(`❌ ลบพนักงานไม่สำเร็จ: ${err.message}`); }
    }
  }, [isEditMode]);

  const handleToggleHoliday = (day: number) => {
    if (!isEditMode) return;
    const currentName = holidays[day] || '';
    const newHolidayName = prompt(`ตั้งชื่อวันหยุดพิเศษ สำหรับวันที่ ${day} ${monthName}:\n(ลบข้อความออกและกด OK เพื่อยกเลิก)`, currentName);
    if (newHolidayName !== null) {
      setHolidays(prev => {
        const newState = { ...prev };
        if (newHolidayName.trim() === '') delete newState[day];
        else newState[day] = newHolidayName.trim();
        return newState;
      });
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedForExport.length === employees.length) setSelectedForExport([]);
    else setSelectedForExport(employees.map(e => e.id));
  };

  const handleToggleSelectEmp = useCallback((empId: string) => {
    setSelectedForExport(prev => prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]);
  }, []);

  const handleSaveToSupabase = async () => {
    if (Object.keys(schedule).length === 0) return alert('ไม่มีข้อมูลตารางงานให้บันทึกครับบอส');
    setIsSaving(true);
    try {
      const upsertData = Object.entries(schedule).map(([key, value]) => {
        const [empId, dayStr] = key.split('_');
        const day = parseInt(dayStr);
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        return {
          employee_id: empId,
          work_date: `${year}-${month}-${String(day).padStart(2, '0')}`,
          shift_code: value.shift,
          is_ot: value.isOT
        };
      });

      const { error } = await supabaseServiceWork.from('schedules').upsert(upsertData, { onConflict: 'employee_id, work_date' });
      if (error) throw error;

      alert('💾 บันทึกตารางงานลงระบบฐานข้อมูล Supabase สำเร็จเรียบร้อยครับบอส! 🔥');
      setIsEditMode(false); 
    } catch (error: any) {
      console.error(error); alert(`❌ บันทึกไม่สำเร็จ: ${error.message}`);
    } finally { setIsSaving(false); }
  };

  const handleExportExcel = () => {
    if (selectedForExport.length === 0) return alert('กรุณาเลือกพนักงานอย่างน้อย 1 คนเพื่อส่งออกครับบอส!');
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    
    const headers = ['empid', 'name'];
    for (let day = 1; day <= daysInMonth; day++) headers.push(`${year}/${month}/${String(day).padStart(2, '0')}`);
    
    const excelData = [headers];
    employees.filter(emp => selectedForExport.includes(emp.id)).forEach(emp => {
      const rowData = [emp.id, emp.name];
      for (let day = 1; day <= daysInMonth; day++) {
        let cellValue = '';
        if (holidays[day]) { cellValue = 'H'; } 
        else {
          const cell = schedule[`${emp.id}_${day}`];
          if (cell && cell.shift === 'O') cellValue = 'O'; 
          else if (cell) cellValue = cell.shift + (cell.isOT ? ' (OT)' : '');
        }
        rowData.push(cellValue);
      }
      excelData.push(rowData);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Roster");
    XLSX.writeFile(workbook, `HR_Roster_${year}_${month}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-emerald-400">
        <i className="bi bi-arrow-repeat animate-spin text-5xl"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-6 font-sans select-none flex flex-col h-screen overflow-hidden">
      
      {/* 🌟 Header Section */}
      <div className="max-w-[1500px] w-full mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight text-white">
            <i className="bi bi-calendar3 text-emerald-400"></i> Roster <span className="text-emerald-400">Pro</span>
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-slate-400 font-medium text-sm">จัดการตารางของเดือน:</p>
            <input 
              type="month" value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`} onChange={handleMonthChange}
              className="bg-[#1e293b] border border-slate-700 text-white font-black px-3 py-1.5 rounded-lg outline-none focus:border-emerald-500 cursor-pointer shadow-inner text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-[#1e293b] p-1.5 rounded-xl border border-slate-700 shadow-inner">
            <button onClick={() => setIsEditMode(false)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${!isEditMode ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
              <i className="bi bi-eye-fill"></i> โหมดดูข้อมูล
            </button>
            <button onClick={() => setIsEditMode(true)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isEditMode ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
              <i className="bi bi-pencil-square"></i> โหมดแก้ไข
            </button>
          </div>

          <div className="w-px h-8 bg-slate-700 hidden md:block"></div>

          {isEditMode && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <input type="text" value={newEmpId} onChange={e => setNewEmpId(e.target.value)} placeholder="รหัส..." className="w-24 bg-[#1e293b] border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 transition-all font-bold" />
              <input type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="ชื่อ-นามสกุล..." className="w-40 bg-[#1e293b] border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 transition-all font-bold" />
              <button onClick={handleAddEmployee} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-xs font-bold border border-slate-600 transition-colors flex items-center gap-1">
                <i className="bi bi-person-plus-fill"></i> เพิ่มคน
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button onClick={handleExportExcel} className="bg-[#1e293b] hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95">
              <i className="bi bi-file-earmark-excel-fill text-lg"></i> ส่งออก Excel
            </button>
            <button onClick={handleSaveToSupabase} disabled={!isEditMode || isSaving} className={`px-6 py-2.5 rounded-lg text-sm font-black transition-colors shadow-lg flex items-center gap-2 ${isEditMode && !isSaving ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 active:scale-95' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}>
              {isSaving ? <><i className="bi bi-arrow-repeat animate-spin"></i> กำลังบันทึก...</> : <><i className="bi bi-cloud-arrow-up-fill"></i> บันทึกตาราง</>}
            </button>
          </div>
        </div>
      </div>

      <div className={`max-w-[1500px] w-full mx-auto flex items-center gap-3 shrink-0 bg-[#1e293b]/50 p-2 rounded-xl border border-slate-700/50 transition-all duration-300 overflow-hidden ${isEditMode ? 'mb-4 opacity-100 max-h-20' : 'mb-0 opacity-0 max-h-0 border-transparent py-0'}`}>
        <span className="text-xs font-bold text-slate-400 px-3 uppercase tracking-widest flex items-center gap-2"><i className="bi bi-brush-fill"></i> เลือกพู่กัน:</span>
        <button onClick={() => setActiveTool('D')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all ${activeTool === 'D' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 hover:text-emerald-400'}`}><div className="w-3 h-3 rounded-sm bg-emerald-400"></div> เช้า (D)</button>
        <button onClick={() => setActiveTool('N')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all ${activeTool === 'N' ? 'bg-orange-500 text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 hover:text-orange-400'}`}><div className="w-3 h-3 rounded-sm bg-orange-400"></div> ดึก (N)</button>
        <button onClick={() => setActiveTool('O')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all ${activeTool === 'O' ? 'bg-slate-500 text-white shadow-lg' : 'bg-[#0f172a] text-slate-400 hover:text-white'}`}><div className="w-3 h-3 rounded-sm bg-slate-400"></div> หยุด (O)</button>
        <div className="w-px h-6 bg-slate-700 mx-2"></div>
        <button onClick={() => setActiveTool('OT')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all border ${activeTool === 'OT' ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-400/50'}`}><i className="bi bi-clock-history"></i> ป้าย OT (+OT)</button>
        <button onClick={() => setActiveTool('ERASE')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-black transition-all border ${activeTool === 'ERASE' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:text-red-400'}`}><i className="bi bi-eraser-fill"></i> ยางลบ</button>
      </div>

      <div className="max-w-[1500px] w-full mx-auto bg-[#1e293b]/50 border border-slate-700/50 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl relative">
        <div className="overflow-auto custom-scrollbar flex-1 relative">
          <table className="w-full min-w-max border-collapse border-spacing-0">
            <thead className="sticky top-0 z-30">
              <tr className="bg-[#0f172a]/95 backdrop-blur-md text-slate-400 text-xs border-b border-slate-700 shadow-sm">
                <th className="sticky left-0 z-40 bg-[#0f172a]/95 backdrop-blur-md p-4 text-left font-bold min-w-[280px] border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" title="เลือกทั้งหมด" checked={selectedForExport.length === employees.length && employees.length > 0} onChange={handleToggleSelectAll} className="w-4 h-4 rounded cursor-pointer accent-emerald-500" />
                    <span>รหัส & พนักงาน ({employees.length} คน)</span>
                  </div>
                </th>
                <th className="sticky left-[280px] z-40 bg-slate-900/95 backdrop-blur-md p-2 border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)] text-center w-14 text-emerald-400">Day</th>
                <th className="sticky left-[336px] z-40 bg-slate-900/95 backdrop-blur-md p-2 border-r border-slate-700 shadow-[2px_0_5px_rgba(0,0,0,0.1)] text-center w-14 text-orange-400">Night</th>
                <th className="sticky left-[392px] z-40 bg-slate-900/95 backdrop-blur-md p-2 border-r border-slate-700 shadow-[4px_0_5px_rgba(0,0,0,0.2)] text-center w-14 text-amber-400 border-r-2 border-r-amber-500/20">OT</th>

                {monthDaysDetails.map(({ day, dayName, isSunday, isWeekend }: any) => {
                  const holidayName = holidays[day];
                  const isHoliday = !!holidayName;
                  const borderRightClass = isSunday ? 'border-r-4 border-r-slate-600/60' : 'border-r border-slate-700/30';
                  const bgClass = isHoliday ? 'bg-rose-500/20' : (isWeekend ? 'bg-slate-800/40' : '');

                  return (
                    <th key={day} onClick={() => handleToggleHoliday(day)} className={`p-1.5 text-center min-w-[60px] relative transition-colors ${borderRightClass} ${bgClass} ${isEditMode ? 'cursor-pointer hover:bg-white/10' : ''}`}>
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
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 4} className="p-10 text-center text-slate-500 font-bold">
                    <i className="bi bi-people-fill text-4xl mb-3 block opacity-50"></i>
                    ยังไม่มีพนักงานในระบบ กรุณากดโหมดแก้ไขและเพิ่มพนักงาน
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <EmployeeRow 
                    key={emp.id} 
                    emp={emp} 
                    schedule={schedule} 
                    monthDaysDetails={monthDaysDetails} 
                    holidays={holidays} 
                    isEditMode={isEditMode}
                    isSelected={selectedForExport.includes(emp.id)}
                    isViolating={violations.includes(emp.id)}
                    handleToggleSelectEmp={handleToggleSelectEmp}
                    handleDeleteEmployee={handleDeleteEmployee}
                    handleMouseDown={handleMouseDown}
                    handleMouseEnter={handleMouseEnter}
                  />
                ))
              )}
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
