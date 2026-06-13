"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabaseServiceWork } from '../../lib/supabase-servicework';
import * as XLSX from 'xlsx';

type CellData = { shift: 'D' | 'N' | 'O'; isOT: boolean };
type ScheduleState = Record<string, CellData>;
type HolidayState = Record<number, string>;

export default function ShiftRosterPro() {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [employees, setEmployees] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<ScheduleState>({});
  const [backupSchedule, setBackupSchedule] = useState<ScheduleState>({});
  const [holidays, setHolidays] = useState<HolidayState>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [activeTool, setActiveTool] = useState<'D' | 'N' | 'O' | 'OT' | 'ERASE'>('D');
  const [isDragging, setIsDragging] = useState(false);
  
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpShift, setNewEmpShift] = useState(''); 

  const [selectedForExport, setSelectedForExport] = useState<string[]>([]);
  const [violations, setViolations] = useState<string[]>([]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' });

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: empData, error: empErr } = await supabaseServiceWork.from('employees').select('*');
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
          loadedSchedule[`${row.employee_id}_${day}`] = {
            shift: row.shift_code as 'D'|'N'|'O',
            isOT: row.is_ot
          };
        });
      }
      setSchedule(loadedSchedule);
      setBackupSchedule(loadedSchedule);
    } catch (error: any) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, daysInMonth]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const sortedEmployees = [...employees].sort((a, b) => {
    const shiftOrder: Record<string, number> = { '': 0, 'A': 1, 'B': 2 };
    const orderA = shiftOrder[a.shift_team || ''] ?? 99;
    const orderB = shiftOrder[b.shift_team || ''] ?? 99;
    
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });

  const getDayDetails = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return {
      dayName: date.toLocaleString('th-TH', { weekday: 'short' }),
      isSunday: date.getDay() === 0,
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    };
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [year, month] = e.target.value.split('-');
    if (isEditMode) {
      if (!confirm('ข้อมูลยังไม่ได้บันทึก ยืนยันที่จะเปลี่ยนเดือนหรือไม่?')) return;
    }
    setCurrentDate(new Date(parseInt(year), parseInt(month) - 1, 1));
    setIsEditMode(false);
    setViolations([]);
    setHolidays({});
  };

  const toggleEditMode = (mode: boolean) => {
    if (!mode && isEditMode) {
      const hasChanges = JSON.stringify(schedule) !== JSON.stringify(backupSchedule);
      if (hasChanges) {
        if (!confirm('ข้อมูลยังไม่ได้บันทึก หากออกจากโหมดแก้ไข ข้อมูลที่เปลี่ยนจะถูกยกเลิก แน่ใจหรือไม่?')) return;
        setSchedule(backupSchedule);
      }
    }
    setIsEditMode(mode);
  };

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
    if (isDragging && isEditMode) applyToolToCell(empId, day);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

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
        id: newEmpId.trim(),
        name: newEmpName.trim(),
        role: 'Staff',
        shift_team: newEmpShift 
      });
      if (error) throw error;

      alert('เพิ่มพนักงานสำเร็จ!');
      setNewEmpId(''); setNewEmpName(''); setNewEmpShift('');
      loadInitialData(); 
    } catch (err: any) { alert(`❌ เพิ่มพนักงานพัง: ${err.message}`); }
  };

  const handleDeleteEmployee = async (empId: string, empName: string) => {
    if (!isEditMode) return;
    if (confirm(`⚠️ ยืนยันการลบพนักงาน "${empName}" ออกจากระบบถาวร?`)) {
      try {
        const { error } = await supabaseServiceWork.from('employees').delete().eq('id', empId);
        if (error) throw error;
        loadInitialData();
      } catch (err: any) { alert(`❌ ลบพนักงานไม่สำเร็จ: ${err.message}`); }
    }
  };

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

  const handleToggleSelectAll = () => {
    if (selectedForExport.length === employees.length) setSelectedForExport([]);
    else setSelectedForExport(employees.map(e => e.id));
  };

  const handleToggleSelectEmp = (empId: string) => {
    setSelectedForExport(prev => prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]);
  };

  const handleSaveToSupabase = async () => {
    if (Object.keys(schedule).length === 0) return alert('ไม่มีข้อมูลให้บันทึกครับบอส');
    setIsSaving(true);
    try {
      const upsertData = Object.entries(schedule).map(([key, value]) => {
        const [empId, dayStr] = key.split('_');
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(parseInt(dayStr)).padStart(2, '0')}`;
        return { employee_id: empId, work_date: dateStr, shift_code: value.shift, is_ot: value.isOT };
      });

      const { error } = await supabaseServiceWork.from('schedules').upsert(upsertData, { onConflict: 'employee_id, work_date' });
      if (error) throw error;

      alert('💾 บันทึกสำเร็จเรียบร้อยครับบอส!');
      setIsEditMode(false);
      loadInitialData(); 
    } catch (error: any) { alert(`❌ บันทึกไม่สำเร็จ: ${error.message}`); } 
    finally { setIsSaving(false); }
  };

  const handleExportExcel = () => {
    if (selectedForExport.length === 0) return alert('กรุณาเลือกพนักงานเพื่อส่งออกครับ!');

    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    
    const headers = ['empid', 'name', 'shift'];
    for (let day = 1; day <= daysInMonth; day++) headers.push(`${year}/${month}/${String(day).padStart(2, '0')}`);

    const excelData = [headers];

    sortedEmployees.filter(emp => selectedForExport.includes(emp.id)).forEach(emp => {
      const rowData = [emp.id, emp.name, emp.shift_team || ''];
      for (let day = 1; day <= daysInMonth; day++) {
        let cellValue = '';
        if (holidays[day]) cellValue = 'H';
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "swap"); 
    XLSX.writeFile(workbook, `SWD_Template.xlsx`); 
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-emerald-400"><i className="bi bi-arrow-repeat animate-spin text-5xl"></i></div>;
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-6 font-sans select-none flex flex-col h-screen overflow-hidden">
      
      {/* 🌟 Header Section */}
      <div className="max-w-[1500px] w-full mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 tracking-tight text-white">
            <i className="bi bi-calendar3 text-emerald-400"></i> Roster <span className="text-emerald-400 font-light">Pro</span>
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-slate-400 font-medium text-sm">เดือน:</p>
            <input 
              type="month" value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`} onChange={handleMonthChange}
              className="bg-[#1e293b] border border-slate-700 text-white font-medium px-3 py-1.5 rounded-lg outline-none focus:border-emerald-500 cursor-pointer shadow-inner text-sm transition-all hover:bg-slate-800"
            />
            <button onClick={loadInitialData} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 transition-colors" title="รีเฟรชข้อมูลล่าสุด">
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-[#1e293b] p-1.5 rounded-xl border border-slate-700 shadow-inner">
            <button onClick={() => toggleEditMode(false)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${!isEditMode ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
              <i className="bi bi-eye"></i> ดูข้อมูล
            </button>
            <button onClick={() => toggleEditMode(true)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${isEditMode ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>
              <i className="bi bi-pencil"></i> แก้ไข
            </button>
          </div>

          <div className="w-px h-8 bg-slate-700 hidden md:block"></div>

          {isEditMode && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <input type="text" value={newEmpId} onChange={e => setNewEmpId(e.target.value)} placeholder="รหัส..." className="w-24 bg-[#1e293b] border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 font-medium" />
              <input type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="ชื่อ-นามสกุล..." className="w-36 bg-[#1e293b] border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 font-medium" />
              <select value={newEmpShift} onChange={e => setNewEmpShift(e.target.value)} className="w-24 bg-[#1e293b] border border-slate-700 text-white text-xs rounded-lg px-2 py-2.5 outline-none focus:border-emerald-500 font-medium appearance-none">
                <option value="">ไม่มีกะ</option>
                <option value="A">Shift A</option>
                <option value="B">Shift B</option>
              </select>
              <button onClick={handleAddEmployee} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2.5 rounded-lg text-xs font-medium border border-slate-600 transition-colors flex items-center gap-1">
                <i className="bi bi-person-plus"></i> เพิ่ม
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button onClick={handleExportExcel} className="bg-[#1e293b] hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2 active:scale-95">
              <i className="bi bi-file-earmark-excel"></i> Export (SWD)
            </button>
            <button onClick={handleSaveToSupabase} disabled={!isEditMode || isSaving} className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-lg flex items-center gap-2 ${isEditMode && !isSaving ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20 active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}>
              {isSaving ? <><i className="bi bi-arrow-repeat animate-spin"></i> บันทึก...</> : <><i className="bi bi-cloud-arrow-up"></i> บันทึกตาราง</>}
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar เครื่องมือทาสี */}
      <div className={`max-w-[1500px] w-full mx-auto flex items-center gap-3 shrink-0 bg-[#1e293b]/50 p-2 rounded-xl border border-slate-700/50 transition-all duration-300 overflow-hidden ${isEditMode ? 'mb-4 opacity-100 max-h-20' : 'mb-0 opacity-0 max-h-0 border-transparent py-0'}`}>
        <span className="text-xs font-semibold text-slate-400 px-3 uppercase tracking-widest flex items-center gap-2"><i className="bi bi-brush"></i> พู่กัน:</span>
        <button onClick={() => setActiveTool('D')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTool === 'D' ? 'bg-emerald-500 text-white shadow-md' : 'bg-[#0f172a] text-slate-400 hover:text-emerald-400'}`}><div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div> เช้า (D)</button>
        <button onClick={() => setActiveTool('N')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTool === 'N' ? 'bg-orange-500 text-white shadow-md' : 'bg-[#0f172a] text-slate-400 hover:text-orange-400'}`}><div className="w-2.5 h-2.5 rounded-full bg-orange-400"></div> ดึก (N)</button>
        <button onClick={() => setActiveTool('O')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTool === 'O' ? 'bg-slate-600 text-white shadow-md' : 'bg-[#0f172a] text-slate-400 hover:text-white'}`}><div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div> หยุด (O)</button>
        <div className="w-px h-6 bg-slate-700 mx-2"></div>
        <button onClick={() => setActiveTool('OT')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${activeTool === 'OT' ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-inner' : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:text-amber-400'}`}><i className="bi bi-clock-history"></i> ป้าย OT (+OT)</button>
        <button onClick={() => setActiveTool('ERASE')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${activeTool === 'ERASE' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:text-red-400'}`}><i className="bi bi-eraser"></i> ยางลบ</button>
      </div>

      {/* 🌟 1. เร่งความลื่นด้วย will-change-transform */}
      <div className="max-w-[1500px] w-full mx-auto bg-[#1e293b]/50 border border-slate-700/50 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl relative">
        <div className="overflow-auto custom-scrollbar flex-1 relative will-change-transform">
          {/* 🌟 2. เปลี่ยนเป็น border-separate เพื่อแก้บั๊กขอบเหลื่อมตอน Scroll */}
          <table className="w-full min-w-max border-separate border-spacing-0">
            <thead className="sticky top-0 z-40 bg-[#0f172a]">
              <tr className="text-slate-400 text-xs shadow-sm">
                
                {/* 🌟 3. ล็อกความกว้างแบบ Pixel-Perfect ด้วย w-[...px] min-w-[...px] max-w-[...px] */}
                <th className="sticky left-0 top-0 z-50 w-[280px] min-w-[280px] max-w-[280px] bg-[#0f172a] p-4 text-left font-semibold border-b border-r border-slate-700 bg-clip-padding">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" title="เลือกทั้งหมด" checked={selectedForExport.length === employees.length && employees.length > 0} onChange={handleToggleSelectAll} className="w-4 h-4 rounded cursor-pointer accent-emerald-500" />
                    <span>รหัส & พนักงาน ({employees.length} คน)</span>
                  </div>
                </th>
                <th className="sticky left-[280px] top-0 z-50 w-[56px] min-w-[56px] max-w-[56px] bg-[#0f172a] p-2 border-b border-r border-slate-700 text-center text-emerald-400 font-medium bg-clip-padding">Day</th>
                <th className="sticky left-[336px] top-0 z-50 w-[56px] min-w-[56px] max-w-[56px] bg-[#0f172a] p-2 border-b border-r border-slate-700 text-center text-orange-400 font-medium bg-clip-padding">Night</th>
                <th className="sticky left-[392px] top-0 z-50 w-[56px] min-w-[56px] max-w-[56px] bg-[#0f172a] p-2 border-b border-r border-slate-700 text-center text-amber-400 font-medium bg-clip-padding border-r-amber-500/20">OT</th>

                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const { dayName, isSunday, isWeekend } = getDayDetails(day);
                  const holidayName = holidays[day];
                  const isHoliday = !!holidayName;
                  const borderRightClass = isSunday ? 'border-r-2 border-r-slate-600/50' : 'border-r border-slate-700/30';
                  const bgClass = isHoliday ? 'bg-rose-500/10' : (isWeekend ? 'bg-slate-800/30' : '');

                  return (
                    <th key={day} onClick={() => handleToggleHoliday(day)} className={`p-1.5 text-center min-w-[55px] relative transition-colors border-b border-slate-700 ${borderRightClass} ${bgClass} ${isEditMode ? 'cursor-pointer hover:bg-white/5' : ''} bg-clip-padding`}>
                      <div className={`font-medium mb-0.5 text-[10px] ${isHoliday ? 'text-rose-300' : 'text-slate-400'}`}>{dayName}</div>
                      <div className={`font-semibold text-sm ${isHoliday ? 'text-rose-400' : isWeekend ? 'text-slate-300' : 'text-slate-200'}`}>{day}</div>
                      {isHoliday && (
                        <div className="mt-1 flex flex-col items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mb-0.5"></div>
                          <div className="text-[8px] font-medium text-rose-300 bg-rose-900/40 px-1 py-0.5 rounded truncate max-w-[45px] leading-none">{holidayName}</div>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {sortedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 4} className="p-10 text-center text-slate-500 font-medium border-b border-slate-700">
                    <i className="bi bi-people text-4xl mb-3 block opacity-40"></i>
                    ยังไม่มีพนักงานในระบบ กรุณากดโหมดแก้ไขเพื่อเพิ่มคน
                  </td>
                </tr>
              ) : (
                sortedEmployees.map((emp) => {
                  const summary = calculateSummary(emp.id);
                  const isViolating = violations.includes(emp.id);

                  return (
                    <tr key={emp.id} className={`hover:bg-slate-800/50 transition-colors group ${isViolating ? 'bg-red-500/5' : ''}`}>
                      
                      {/* 🌟 4. ถอดความโปร่งใสออก ใช้ bg-[#1e293b] ทึบๆ เพื่อกันตารางทะลุ */}
                      <td className="sticky left-0 z-20 w-[280px] min-w-[280px] max-w-[280px] bg-[#1e293b] p-3 text-xs text-slate-200 border-b border-r border-slate-700/50 bg-clip-padding">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={selectedForExport.includes(emp.id)} onChange={() => handleToggleSelectEmp(emp.id)} className="w-4 h-4 rounded cursor-pointer accent-emerald-500 shrink-0" />
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                              <i className="bi bi-person-fill text-lg"></i>
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-200 text-[13px] truncate flex items-center gap-1.5">
                                {emp.name}
                                {emp.shift_team && (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest ${emp.shift_team === 'A' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                                    {emp.shift_team}
                                  </span>
                                )}
                                {isViolating && <i className="bi bi-exclamation-triangle-fill text-red-500 animate-pulse text-[10px]" title="เตือน: ทำงานเกิน 6 วัน!"></i>}
                              </div>
                              <div className="font-mono text-slate-400 font-medium text-[10px] tracking-wider mt-0.5">{emp.id}</div>
                            </div>
                          </div>
                          {isEditMode && (
                            <button onClick={() => handleDeleteEmployee(emp.id, emp.name)} className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 w-7 h-7 rounded-md flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="sticky left-[280px] z-20 w-[56px] min-w-[56px] max-w-[56px] bg-[#1e293b] p-2 border-b border-r border-slate-700/50 text-center font-semibold text-emerald-400 text-[13px] bg-clip-padding">{summary.d || '-'}</td>
                      <td className="sticky left-[336px] z-20 w-[56px] min-w-[56px] max-w-[56px] bg-[#1e293b] p-2 border-b border-r border-slate-700/50 text-center font-semibold text-orange-400 text-[13px] bg-clip-padding">{summary.n || '-'}</td>
                      <td className="sticky left-[392px] z-20 w-[56px] min-w-[56px] max-w-[56px] bg-[#1e293b] p-2 border-b border-r border-slate-700/50 text-center font-semibold text-amber-400 text-[13px] border-r-amber-500/20 bg-clip-padding">{summary.ot || '-'}</td>

                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const { isSunday, isWeekend } = getDayDetails(day);
                        const isHoliday = !!holidays[day];
                        const cell = schedule[`${emp.id}_${day}`];
                        
                        const borderRightClass = isSunday ? 'border-r-2 border-r-slate-600/50' : 'border-r border-slate-700/30';
                        const colBg = isHoliday ? 'bg-rose-500/5' : (isWeekend ? 'bg-slate-800/30' : '');

                        let cellBg = 'border-transparent';
                        let textColor = 'text-slate-300';
                        if (isEditMode) cellBg += ' hover:bg-slate-700/50 border-slate-600/30 border-dashed'; 
                        if (cell?.shift === 'D') { cellBg = 'bg-emerald-500 shadow-sm border-emerald-600'; textColor = 'text-white'; }
                        if (cell?.shift === 'N') { cellBg = 'bg-orange-500 shadow-sm border-orange-600'; textColor = 'text-white'; }
                        if (cell?.shift === 'O') { cellBg = 'bg-slate-600 shadow-sm border-slate-700'; textColor = 'text-white'; }

                        return (
                          <td key={day} className={`p-1 relative border-b border-slate-700/50 ${borderRightClass} ${colBg}`}>
                            <div
                              onMouseDown={() => handleMouseDown(emp.id, day)}
                              onMouseEnter={() => handleMouseEnter(emp.id, day)}
                              className={`w-full h-[40px] rounded flex flex-col items-center justify-center border ${cellBg} relative transition-all ${isEditMode ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              {cell?.shift ? <span className={`font-semibold text-sm ${textColor}`}>{cell.shift}</span> : (isEditMode && <span className="opacity-0 group-hover:opacity-20 text-xs text-slate-400">+</span>)}
                              {cell?.isOT && (
                                <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 text-[7px] font-bold px-1 rounded-bl-sm shadow-sm">
                                  OT
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
              <tr className="h-20"></tr>
            </tbody>
          </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { height: 10px; width: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 8px; border: 2px solid #0f172a; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}} />
    </div>
  );
}
