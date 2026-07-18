"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabaseServiceWork } from '../../lib/supabase-servicework';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas'; //  เพิ่มไลบรารีสำหรับถ่ายรูป

type CellData = { shift: 'D' | 'N' | 'O'; isOT: boolean; is6S?: boolean }; //  เพิ่ม is6S
type ScheduleState = Record<string, CellData>;
type HolidayState = Record<string, string>; // เปลี่ยนเป็น string เพื่อรองรับวันที่แบบ YYYY-MM-DD

// ฟังก์ชันช่วยเหลือแปลงวันที่เป็น YYYY-MM-DD
const formatDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function ShiftRosterPro() {
// 🌟 1. ตั้งค่าเริ่มต้นเป็น "วันแรก" ถึง "วันสุดท้าย" ของเดือนปัจจุบัน
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return formatDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return formatDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  });
  // 🌟 1. State จำแผนกของแอดมิน
  const [adminDept, setAdminDept] = useState('');

  useEffect(() => {
    // 🌟 1. ล้วงกระเป๋าเอาแผนกที่ล็อคอินมาใช้แบบเพียวๆ (ไม่บังคับเป็น ME แล้ว)
    const dept = localStorage.getItem('activeDepartment');
    
    if (dept) {
      setAdminDept(dept); // ถ้ามีแผนก ก็เซฟลงระบบแล้วโหลดข้อมูลลูกน้อง
    } else {
      // 🚨 2. ระบบป้องกันคนแอบเข้า: ถ้าไม่มีแผนก (แอบพิมพ์ URL เข้ามาตรงๆ โดยไม่ล็อคอิน) 
      alert("ไม่พบข้อมูลแผนก กรุณาล็อคอินเข้าสู่ระบบก่อนครับ!");
      // window.location.href = '/'; // บอสสามารถเอาคอมเมนต์ (//) ข้างหน้าออก เพื่อสั่งให้มันเด้งเตะกลับไปหน้า Login ได้เลยครับ
    }
  }, []);
  const [employees, setEmployees] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<ScheduleState>({});
  const [backupSchedule, setBackupSchedule] = useState<ScheduleState>({});
  const [holidays, setHolidays] = useState<HolidayState>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [activeTool, setActiveTool] = useState<'D' | 'N' | 'O' | 'OT' | '6S' | 'ERASE'>('D'); //  เพิ่ม '6S' เข้าไปในเครื่องมือ
  const [isDragging, setIsDragging] = useState(false);
  
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpShift, setNewEmpShift] = useState(''); 
  const [newEmpGroup, setNewEmpGroup] = useState(''); 

  const [selectedForExport, setSelectedForExport] = useState<string[]>([]);
  const [violations, setViolations] = useState<string[]>([]);

  // 🌟 คำนวณวันที่ทั้งหมดในช่่วงที่เลือก
  const dateList = useMemo(() => {
    const list: Date[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      list.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return list;
  }, [startDate, endDate]);

const loadInitialData = useCallback(async () => {
    if (!adminDept) return; // ถ้าระบบยังไม่รู้ว่าแอดมินแผนกไหน ให้เบรกไว้ก่อน

    setIsLoading(true);
    try {
      // 🌟 1. ดึงพนักงาน "เฉพาะที่ DepartmentID ตรงกับแอดมิน"
      const { data: empData, error: empErr } = await supabaseServiceWork
        .from('employees')
        .select('*')
        .eq('DepartmentID', adminDept); // กรองแผนกตรงนี้!
        
      if (empErr) throw empErr;
      
      const loadedEmps = empData || [];
      setEmployees(loadedEmps);
      setSelectedForExport(loadedEmps.map(e => e.id));

      const empIds = loadedEmps.map(e => e.id);
      
      if (empIds.length === 0) {
        setSchedule({});
        setBackupSchedule({});
        setIsLoading(false);
        return;
      }

      // 🌟 2. ดึงตารางงาน เฉพาะพนักงานแก๊งนี้
      const { data: schedData, error: schedErr } = await supabaseServiceWork
        .from('schedules')
        .select('*')
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .in('employee_id', empIds);

      if (schedErr) throw schedErr;

      const loadedSchedule: ScheduleState = {};
      if (schedData) {
        schedData.forEach(row => {
          loadedSchedule[`${row.employee_id}_${row.work_date}`] = {
            shift: row.shift_code as 'D'|'N'|'O',
            isOT: row.is_ot,
            is6S: row.is_6s || false //  ดึงค่า 6S มาแสดงผล
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
  }, [startDate, endDate, adminDept]); // 🌟 ใส่ adminDept ในวงเล็บด้วย

  useEffect(() => {
    // 🌟 โหลดข้อมูลตารางทันที ที่แอดมินล็อคอินและดึงแผนกสำเร็จ
    if (adminDept) {
      loadInitialData();
    }
  }, [loadInitialData, adminDept]);

  const sortedEmployees = [...employees].sort((a, b) => {
    // 1. เงื่อนไขที่ 1: เรียงตามตัวอักษรกะ (Shift)
    const shiftOrder: Record<string, number> = { '': 0, 'A': 1, 'B': 2 };
    const orderA = shiftOrder[a.shift_team || ''] ?? 99;
    const orderB = shiftOrder[b.shift_team || ''] ?? 99;
    
    if (orderA !== orderB) return orderA - orderB;

    // 2. เงื่อนไขที่ 2: เรียงตามเลขกรุ๊ป (Group Number)
    // 🚨 ข้อควรระวัง: บอสต้องเปลี่ยนคำว่า 'shift_group' ให้ตรงกับชื่อ Field จริงใน Database ของบอสนะครับ
    // เช่น ถ้าในดาต้าใช้คำว่า group_no ก็เปลี่ยนเป็น a.group_no
    const groupA = Number(a.group_team) || 0;
    const groupB = Number(b.group_team) || 0;

    if (groupA !== groupB) return groupA - groupB;

    // 3. เงื่อนไขที่ 3: ถ้ากะเดียวกัน และเลขกรุ๊ปเดียวกัน ค่อยเรียงตามชื่อตัวอักษร
    return a.name.localeCompare(b.name);
  });

  const getDayDetails = (date: Date) => {
    return {
      dayName: date.toLocaleString('th-TH', { weekday: 'short' }),
      dayNum: date.getDate(),
      isSunday: date.getDay() === 0,
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    };
  };

  // 🌟 ฟังก์ชันจัดการการเปลี่ยนวันที่ และดักไม่ให้เกิน 31 วัน
  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    if (!value) return;
    if (isEditMode) {
      if (!confirm('ข้อมูลยังไม่ได้บันทึก ยืนยันที่จะเปลี่ยนช่วงเวลาหรือไม่?')) return;
    }
    
    let newStart = field === 'start' ? value : startDate;
    let newEnd = field === 'end' ? value : endDate;

    const sDate = new Date(newStart);
    const eDate = new Date(newEnd);
    const diffDays = Math.floor((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return alert('⚠️ วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้นครับ');
    if (diffDays > 30) {
      alert('⚠️ เลือกระยะเวลาได้สูงสุด 31 วันครับ (ระบบปรับให้อัตโนมัติ)');
      eDate.setTime(sDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      newEnd = formatDateStr(eDate);
    }
    
    setStartDate(newStart);
    setEndDate(newEnd);
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

  const applyToolToCell = (empId: string, dateStr: string) => {
    if (!isEditMode) return; 
    const key = `${empId}_${dateStr}`;
    setSchedule(prev => {
      const currentCell = prev[key];
      if (activeTool === 'ERASE' && !currentCell) return prev;
      if (activeTool === 'OT' && currentCell?.isOT === true) return prev;
      if (activeTool === '6S' && currentCell?.is6S === true) return prev; //  ดักไม่ให้ทา 6S ซ้ำถ้ามีอยู่แล้ว

      const newState = { ...prev };
      if (activeTool === 'ERASE') {
        delete newState[key];
      } else if (activeTool === 'OT') {
        if (currentCell && (currentCell.shift === 'D' || currentCell.shift === 'N')) {
          newState[key] = { ...currentCell, isOT: true }; 
        }
      } else if (activeTool === '6S') {
        if (currentCell) { //  แปะป้าย 6S ได้ถ้าวันนั้นมีกะงานอยู่แล้ว
          newState[key] = { ...currentCell, is6S: true }; 
        }
      } else {
        //  เปลี่ยนกะหลัก แต่ยังคงรักษาสถานะ 6S ไว้ (ไม่ลบหายไป)
        newState[key] = { 
          shift: activeTool as 'D'|'N'|'O', 
          isOT: activeTool === 'O' ? false : (currentCell?.isOT || false),
          is6S: currentCell?.is6S || false 
        };
      }
      return newState;
    });
  };

  const handleMouseDown = (empId: string, dateStr: string) => {
    if (!isEditMode) return;
    setIsDragging(true);
    applyToolToCell(empId, dateStr);
  };

  const handleMouseEnter = (empId: string, dateStr: string) => {
    if (isDragging && isEditMode) applyToolToCell(empId, dateStr);
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
      dateList.forEach(date => {
        const dateStr = formatDateStr(date);
        const cell = schedule[`${emp.id}_${dateStr}`];
        if (cell && (cell.shift === 'D' || cell.shift === 'N')) {
          consecutiveWorkDays++;
          if (consecutiveWorkDays > 6 && !newViolations.includes(emp.id)) newViolations.push(emp.id);
        } else {
          consecutiveWorkDays = 0;
        }
      });
    });
    setViolations(newViolations);
  }, [schedule, employees, dateList]);

  const handleAddEmployee = async () => {
    if (!newEmpId.trim() || !newEmpName.trim()) return alert('กรุณากรอกรหัสและชื่อพนักงานให้ครบ');
    if (employees.some(e => e.id === newEmpId.trim())) return alert('รหัสพนักงานนี้มีในระบบแล้ว');

    try {
      const { error } = await supabaseServiceWork.from('employees').insert({
        id: newEmpId.trim(),
        name: newEmpName.trim(),
        role: 'Staff',
        shift_team: newEmpShift,
        group_team: newEmpGroup,
        DepartmentID: adminDept //  ประทับตราแผนกให้พนักงานคนนี้อัตโนมัติ! แอดมินไม่ต้องพิมพ์เอง
      });
      if (error) throw error;

      alert('เพิ่มพนักงานสำเร็จ!');
      setNewEmpId(''); setNewEmpName(''); setNewEmpShift(''); setNewEmpGroup('');
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

  const handleToggleHoliday = (date: Date) => {
    if (!isEditMode) return;
    const dateStr = formatDateStr(date);
    const displayDate = date.toLocaleString('th-TH', { day: 'numeric', month: 'short' });
    const currentName = holidays[dateStr] || '';
    const newHolidayName = prompt(`ตั้งชื่อวันหยุดพิเศษ สำหรับวันที่ ${displayDate}:\n(ลบข้อความออกและกด OK เพื่อยกเลิก)`, currentName);
    if (newHolidayName !== null) {
      setHolidays(prev => {
        const newState = { ...prev };
        if (newHolidayName.trim() === '') delete newState[dateStr];
        else newState[dateStr] = newHolidayName.trim();
        return newState;
      });
    }
  };

  const calculateSummary = (empId: string) => {
    let d = 0, n = 0, ot = 0, off = 0;
    dateList.forEach(date => {
      const dateStr = formatDateStr(date);
      const cell = schedule[`${empId}_${dateStr}`];
      if (cell) {
        if (cell.shift === 'D') d++;
        if (cell.shift === 'N') n++;
        if (cell.shift === 'O') off++;
        if (cell.isOT) ot++;
      }
    });
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
    if (Object.keys(schedule).length === 0 && Object.keys(backupSchedule).length === 0) return alert('ไม่มีข้อมูลให้บันทึกครับ');
    setIsSaving(true);
    try {
      const keysToDelete = Object.keys(backupSchedule).filter(k => !schedule[k]);
      for (const key of keysToDelete) {
        const [empId, dateStr] = key.split('_');
        await supabaseServiceWork.from('schedules').delete().match({ employee_id: empId, work_date: dateStr });
      }

      const upsertData = Object.entries(schedule).map(([key, value]) => {
        const [empId, dateStr] = key.split('_');
        return { employee_id: empId, work_date: dateStr, shift_code: value.shift, is_ot: value.isOT, is_6s: value.is6S || false };
      });

      if (upsertData.length > 0) {
        const { error } = await supabaseServiceWork.from('schedules').upsert(upsertData, { onConflict: 'employee_id, work_date' });
        if (error) throw error;
      }

      alert('💾 บันทึกสำเร็จเรียบร้อยครับ!');
      setIsEditMode(false);
      loadInitialData(); 
    } catch (error: any) { alert(`❌ บันทึกไม่สำเร็จ: ${error.message}`); } 
    finally { setIsSaving(false); }
  };

  const handleExportExcel = () => {
    if (selectedForExport.length === 0) return alert('กรุณาเลือกพนักงานเพื่อส่งออกครับ!');

    const headers = ['empid', 'name'];
    dateList.forEach(date => headers.push(formatDateStr(date).replace(/-/g, '/')));

    const excelData = [headers];

    sortedEmployees.filter(emp => selectedForExport.includes(emp.id)).forEach(emp => {
      const rowData = [emp.id, emp.name];
      dateList.forEach(date => {
        const dateStr = formatDateStr(date);
        let cellValue = '';
        if (holidays[dateStr]) cellValue = 'H';
        else {
          const cell = schedule[`${emp.id}_${dateStr}`];
          if (cell && cell.shift === 'O') cellValue = 'O'; 
        }
        rowData.push(cellValue);
      });
      excelData.push(rowData);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "swap"); 
    XLSX.writeFile(workbook, `SWD_Template.xlsx`); 
  };

  const handleCaptureImage = async () => {
    const tableEl = document.getElementById('roster-capture-area');
    if (!tableEl) return;
    
    try {
      const canvas = await html2canvas(tableEl, {
        backgroundColor: '#0f172a',
        scale: 2 
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `Roster_Capture_${startDate}.png`;
      link.click();
    } catch (err) {
      console.error(err);
      alert('❌ แคปจอไม่สำเร็จครับ ลองอีกครั้ง');
    }
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
          {/* 🌟 แยกช่องเลือกวันที่เริ่มต้น - สิ้นสุดให้ชัดเจน */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium text-sm">เริ่มต้น:</span>
              <input 
                type="date" value={startDate} onChange={(e) => handleDateRangeChange('start', e.target.value)}
                className="bg-[#1e293b] border border-slate-700 text-white text-sm px-3 py-1.5 rounded-lg shadow-inner outline-none focus:border-emerald-500 [&::-webkit-calendar-picker-indicator]:filter-[invert(1)] cursor-pointer"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium text-sm">สิ้นสุด:</span>
              <input 
                type="date" value={endDate} onChange={(e) => handleDateRangeChange('end', e.target.value)}
                className="bg-[#1e293b] border border-slate-700 text-white text-sm px-3 py-1.5 rounded-lg shadow-inner outline-none focus:border-emerald-500 [&::-webkit-calendar-picker-indicator]:filter-[invert(1)] cursor-pointer"
              />
            </div>
            <button onClick={loadInitialData} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 transition-colors" title="รีเฟรชข้อมูลล่าสุด">
              <i className="bi bi-arrow-clockwise"></i>
            </button>
            <span className="text-xs text-emerald-500/70 ml-1 font-medium bg-emerald-500/10 px-2 py-1 rounded-md">
              (รวม {dateList.length} วัน)
            </span>
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
              <input type="text" value={newEmpId} onChange={e => setNewEmpId(e.target.value)} placeholder="รหัส..." className="w-20 bg-[#1e293b] border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 font-medium" />
              <input type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="ชื่อ-สกุล..." className="w-32 bg-[#1e293b] border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 font-medium" />
              <select value={newEmpShift} onChange={e => setNewEmpShift(e.target.value)} className="w-20 bg-[#1e293b] border border-slate-700 text-white text-xs rounded-lg px-2 py-2.5 outline-none focus:border-emerald-500 font-medium appearance-none">
                <option value="">ไม่มีกะ</option>
                <option value="A">Shift A</option>
                <option value="B">Shift B</option>
              </select>
              <input type="text" value={newEmpGroup} onChange={e => setNewEmpGroup(e.target.value)} placeholder="กรุ๊ป (เช่น G1)" className="w-24 bg-[#1e293b] border border-slate-700 text-white text-xs rounded-lg px-3 py-2.5 outline-none focus:border-emerald-500 font-medium" />
              <button onClick={handleAddEmployee} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2.5 rounded-lg text-xs font-medium border border-slate-600 transition-colors flex items-center gap-1">
                <i className="bi bi-person-plus"></i> เพิ่ม
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button onClick={handleCaptureImage} className="bg-[#1e293b] hover:bg-cyan-900/50 text-cyan-400 border border-cyan-500/30 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2 active:scale-95">
              <i className="bi bi-camera"></i> จับภาพหน้าจอ
            </button>
            <button onClick={handleExportExcel} className="bg-[#1e293b] hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2 active:scale-95">
              <i className="bi bi-file-earmark-excel"></i> ส่งออก SWD
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
        <button onClick={() => setActiveTool('6S')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${activeTool === '6S' ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-inner' : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:text-blue-400'}`}><i className="bi bi-stars"></i> ป้าย 6S (+6S)</button>
        <button onClick={() => setActiveTool('ERASE')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${activeTool === 'ERASE' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-[#0f172a] border-slate-700 text-slate-400 hover:text-red-400'}`}><i className="bi bi-eraser"></i> ยางลบ</button>
      </div>

      <div className="max-w-[1500px] w-full mx-auto bg-[#1e293b]/50 border border-slate-700/50 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl relative">
        <div className="overflow-auto custom-scrollbar flex-1 relative will-change-transform">
          {/* 🌟 2. เปลี่ยนจาก w-full เป็น w-max เพื่อให้ตารางกว้างพอดีกับข้อมูลที่มี ไม่ยืดจนเกิดขอบดำ */}
          <table id="roster-capture-area" className="w-max min-w-max border-separate border-spacing-0 bg-[#0f172a]">
            <thead className="sticky top-0 z-40 bg-[#0f172a]">
              <tr className="text-slate-400 text-xs shadow-sm">
                
                <th className="sticky left-0 top-0 z-50 w-[280px] min-w-[280px] max-w-[280px] bg-[#0f172a] p-4 text-left font-semibold border-b border-r border-slate-700 bg-clip-padding">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" title="เลือกทั้งหมด" checked={selectedForExport.length === employees.length && employees.length > 0} onChange={handleToggleSelectAll} className="w-4 h-4 rounded cursor-pointer accent-emerald-500" />
                    <span>รหัส & พนักงาน ({employees.length} คน)</span>
                  </div>
                </th>
                <th className="sticky left-[280px] top-0 z-50 w-[56px] min-w-[56px] max-w-[56px] bg-[#0f172a] p-2 border-b border-r border-slate-700 text-center text-emerald-400 font-medium bg-clip-padding">Day</th>
                <th className="sticky left-[336px] top-0 z-50 w-[56px] min-w-[56px] max-w-[56px] bg-[#0f172a] p-2 border-b border-r border-slate-700 text-center text-orange-400 font-medium bg-clip-padding">Night</th>
                <th className="sticky left-[392px] top-0 z-50 w-[56px] min-w-[56px] max-w-[56px] bg-[#0f172a] p-2 border-b border-r border-slate-700 text-center text-amber-400 font-medium bg-clip-padding border-r-amber-500/20">OT</th>

                {/* 🌟 บังคับขนาดช่องหัวตาราง 55px เท่าของเดิมเป๊ะ */}
                {dateList.map((date, index) => {
                  const { dayName, dayNum, isSunday, isWeekend } = getDayDetails(date);
                  const dateStr = formatDateStr(date);
                  const holidayName = holidays[dateStr];
                  const isHoliday = !!holidayName;
                  
                  const isEndOfMonth = dateList[index + 1] && dateList[index + 1].getDate() === 1;
                  const borderRightClass = isEndOfMonth ? 'border-r-2 border-r-emerald-500/40' : (isSunday ? 'border-r-2 border-r-slate-600/50' : 'border-r border-slate-700/30');
                  const bgClass = isHoliday ? 'bg-rose-500/10' : (isWeekend ? 'bg-slate-800/30' : '');

                  return (
                    <th key={dateStr} onClick={() => handleToggleHoliday(date)} className={`p-1.5 text-center w-[55px] min-w-[55px] max-w-[55px] relative transition-colors border-b border-slate-700 ${borderRightClass} ${bgClass} ${isEditMode ? 'cursor-pointer hover:bg-white/5' : ''} bg-clip-padding`}>
                      <div className={`font-medium mb-0.5 text-[10px] ${isHoliday ? 'text-rose-300' : 'text-slate-400'}`}>{dayName}</div>
                      <div className={`font-semibold text-sm ${isHoliday ? 'text-rose-400' : isWeekend ? 'text-slate-300' : 'text-slate-200'}`}>{dayNum}</div>
                      {isHoliday && (
                        <div className="mt-1 flex flex-col items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mb-0.5"></div>
                          <div className="text-[8px] font-medium text-rose-300 bg-rose-900/40 px-1 py-0.5 rounded truncate max-w-[45px] leading-none">{holidayName}</div>
                        </div>
                      )}
                    </th>
                  );
                })}
                {/* 🌟 3. ลบช่องล่องหนทิ้งไปแล้ว ตารางจะสุดแค่วันที่เลือกพอดีเป๊ะ! */}
              </tr>
            </thead>

            <tbody>
              {sortedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={dateList.length + 5} className="p-10 text-center text-slate-500 font-medium border-b border-slate-700">
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
                      
                      <td className="sticky left-0 z-20 w-[280px] min-w-[280px] max-w-[280px] bg-[#1e293b] p-3 text-xs text-slate-200 border-b border-r border-slate-700/50 bg-clip-padding">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={selectedForExport.includes(emp.id)} onChange={() => handleToggleSelectEmp(emp.id)} className="w-4 h-4 rounded cursor-pointer accent-emerald-500 shrink-0" />
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                              <i className="bi bi-person-fill text-lg"></i>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 pb-0.5">
                                <span className="font-semibold text-slate-200 text-[13px] whitespace-nowrap">
                                  {emp.name && emp.name.length > 22 ? emp.name.substring(0, 22) + '...' : emp.name}
                                </span>
                                {isViolating && <i className="bi bi-exclamation-triangle-fill text-red-500 animate-pulse text-[10px] shrink-0" title="เตือน: ทำงานเกิน 6 วัน!"></i>}
                              </div>
                              
                              <div className="font-mono text-slate-400 font-medium text-[10px] tracking-wider mt-0.5 flex items-center gap-2">
                                <span className="shrink-0">{emp.id}</span>
                                {emp.shift_team && (
                                  <span className={`font-bold tracking-widest shrink-0 ${emp.shift_team === 'A' ? 'text-blue-400' : 'text-purple-400'}`}>
                                    Shift {emp.shift_team}
                                  </span>
                                )}
                                {emp.group_team && (
                                  <span className="font-bold tracking-widest shrink-0 text-emerald-400">
                                    {emp.group_team}
                                  </span>
                                )}
                              </div>
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

                      {/* 🌟 บังคับขนาดช่องข้อมูลตารางให้เท่าเดิมเป๊ะ */}
                      {dateList.map((date, index) => {
                        const dateStr = formatDateStr(date);
                        const isSunday = date.getDay() === 0;
                        const isWeekend = isSunday || date.getDay() === 6;
                        const isHoliday = !!holidays[dateStr];
                        const cell = schedule[`${emp.id}_${dateStr}`];
                        
                        const isEndOfMonth = dateList[index + 1] && dateList[index + 1].getDate() === 1;
                        const borderRightClass = isEndOfMonth ? 'border-r-2 border-r-emerald-500/40' : (isSunday ? 'border-r-2 border-r-slate-600/50' : 'border-r border-slate-700/30');
                        const colBg = isHoliday ? 'bg-rose-500/5' : (isWeekend ? 'bg-slate-800/30' : '');

                        let cellBg = 'border-transparent';
                        let textColor = 'text-slate-300';
                        if (isEditMode) cellBg += ' hover:bg-slate-700/50 border-slate-600/30 border-dashed'; 
                        if (cell?.shift === 'D') { cellBg = 'bg-emerald-500 shadow-sm border-emerald-600'; textColor = 'text-white'; }
                        if (cell?.shift === 'N') { cellBg = 'bg-orange-500 shadow-sm border-orange-600'; textColor = 'text-white'; }
                        if (cell?.shift === 'O') { cellBg = 'bg-slate-600 shadow-sm border-slate-700'; textColor = 'text-white'; }

                        return (
                          <td key={dateStr} className={`p-1 w-[55px] min-w-[55px] max-w-[55px] relative border-b border-slate-700/50 ${borderRightClass} ${colBg}`}>
                            <div
                              onMouseDown={() => handleMouseDown(emp.id, dateStr)}
                              onMouseEnter={() => handleMouseEnter(emp.id, dateStr)}
                              className={`w-full h-[40px] rounded flex flex-col items-center justify-center border ${cellBg} relative transition-all ${isEditMode ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              {cell?.shift ? <span className={`font-semibold text-sm ${textColor}`}>{cell.shift}</span> : (isEditMode && <span className="opacity-0 group-hover:opacity-20 text-xs text-slate-400">+</span>)}
                              {cell?.isOT && (
                                <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 text-[7px] font-bold px-1 rounded-bl-sm shadow-sm">
                                  OT
                                </div>
                              )}
                              {/*  ป้าย 6S มุมซ้ายล่าง (ของใหม่) */}
                              {cell?.is6S && (
                                <div className="absolute bottom-0 left-0 bg-blue-500 text-white text-[7px] font-bold px-1 rounded-tr-sm shadow-sm">
                                  6S
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      {/* 🌟 4. ลบช่องล่องหนทิ้งไปแล้วเช่นกัน */}
                    </tr>
                  );
                })
              )}
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
