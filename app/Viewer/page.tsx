"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabaseServiceWork } from '../../lib/supabase-servicework'; // เช็ก path นี้ให้ตรงกับของบอสด้วยนะครับ
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

type CellData = { shift: 'D' | 'N' | 'O'; isOT: boolean };
type ScheduleState = Record<string, CellData>;
type HolidayState = Record<number, string>;

export default function ShiftRosterViewer() {
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [employees, setEmployees] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<ScheduleState>({});
  const [holidays, setHolidays] = useState<HolidayState>({});
  const [isLoading, setIsLoading] = useState(true);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: empData, error: empErr } = await supabaseServiceWork.from('employees').select('*');
      if (empErr) throw empErr;
      
      const loadedEmps = empData || [];
      setEmployees(loadedEmps);

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
  }, [currentDate, daysInMonth]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

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

  const calculateSummary = (empId: string) => {
    let d = 0, n = 0, ot = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const cell = schedule[`${empId}_${day}`];
      if (cell) {
        if (cell.shift === 'D') d++;
        if (cell.shift === 'N') n++;
        if (cell.isOT) ot++;
      }
    }
    return { d, n, ot };
  };

  const handleExportExcel = () => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const headers = ['empid', 'name'];
    for (let day = 1; day <= daysInMonth; day++) headers.push(`${year}/${month}/${String(day).padStart(2, '0')}`);

    const excelData = [headers];
    sortedEmployees.forEach(emp => {
      const rowData = [emp.id, emp.name];
      for (let day = 1; day <= daysInMonth; day++) {
        let cellValue = '';
        if (holidays[day]) cellValue = 'H';
        else {
          const cell = schedule[`${emp.id}_${day}`];
          if (cell && cell.shift === 'O') cellValue = 'O'; 
        }
        rowData.push(cellValue);
      }
      excelData.push(rowData);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "swap"); 
    XLSX.writeFile(workbook, `SWD_Template_${year}_${month}.xlsx`); 
  };

  const handleCaptureImage = async () => {
    const tableEl = document.getElementById('roster-capture-area');
    if (!tableEl) return;
    try {
      const canvas = await html2canvas(tableEl, { backgroundColor: '#0f172a', scale: 2 });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `Roster_Capture_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}.png`;
      link.click();
    } catch (err) { alert('❌ แคปจอไม่สำเร็จครับ'); }
  };

  if (isLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-cyan-400"><i className="bi bi-arrow-repeat animate-spin text-5xl"></i></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-6 font-sans select-none flex flex-col h-screen overflow-hidden">
      
      {/* Header */}
      <div className="max-w-[1500px] w-full mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 tracking-tight text-white">
            <i className="bi bi-calendar3 text-cyan-400"></i> Roster <span className="text-cyan-400 font-light">Viewer</span>
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-slate-400 font-medium text-sm">เดือน:</p>
            <input 
              type="month" value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`} 
              onChange={(e) => { if(e.target.value) { const [y, m] = e.target.value.split('-'); setCurrentDate(new Date(parseInt(y), parseInt(m)-1, 1)); }}}
              className="bg-[#1e293b] border border-slate-700 text-white font-medium px-3 py-1.5 rounded-lg outline-none cursor-pointer shadow-inner text-sm"
            />
            <button onClick={loadInitialData} className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 transition-colors" title="รีเฟรชข้อมูลล่าสุด">
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleCaptureImage} className="bg-[#1e293b] hover:bg-cyan-900/50 text-cyan-400 border border-cyan-500/30 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2">
            <i className="bi bi-camera"></i> จับภาพหน้าจอ
          </button>
          <button onClick={handleExportExcel} className="bg-[#1e293b] hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2">
            <i className="bi bi-file-earmark-excel"></i> ดาวน์โหลด SWD
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="max-w-[1500px] w-full mx-auto bg-[#1e293b]/50 border border-slate-700/50 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl relative">
        <div className="overflow-auto custom-scrollbar flex-1 relative will-change-transform">
          <table id="roster-capture-area" className="w-full min-w-max border-separate border-spacing-0 bg-[#0f172a]">
            <thead className="sticky top-0 z-40 bg-[#0f172a]">
              <tr className="text-slate-400 text-xs shadow-sm">
                <th className="sticky left-0 top-0 z-50 w-[260px] min-w-[260px] max-w-[260px] bg-[#0f172a] p-4 text-left font-semibold border-b border-r border-slate-700 bg-clip-padding">
                  <span>รหัส & พนักงาน ({employees.length} คน)</span>
                </th>
                <th className="sticky left-[260px] top-0 z-50 w-[56px] min-w-[56px] max-w-[56px] bg-[#0f172a] p-2 border-b border-r border-slate-700 text-center text-emerald-400 font-medium bg-clip-padding">Day</th>
                <th className="sticky left-[316px] top-0 z-50 w-[56px] min-w-[56px] max-w-[56px] bg-[#0f172a] p-2 border-b border-r border-slate-700 text-center text-orange-400 font-medium bg-clip-padding">Night</th>
                <th className="sticky left-[372px] top-0 z-50 w-[56px] min-w-[56px] max-w-[56px] bg-[#0f172a] p-2 border-b border-r border-slate-700 text-center text-amber-400 font-medium bg-clip-padding border-r-amber-500/20">OT</th>

                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const { dayName, isSunday, isWeekend } = getDayDetails(day);
                  const isHoliday = !!holidays[day];
                  const borderRightClass = isSunday ? 'border-r-2 border-r-slate-600/50' : 'border-r border-slate-700/30';
                  const bgClass = isHoliday ? 'bg-rose-500/10' : (isWeekend ? 'bg-slate-800/30' : '');

                  return (
                    <th key={day} className={`p-1.5 text-center min-w-[55px] relative border-b border-slate-700 ${borderRightClass} ${bgClass} bg-clip-padding`}>
                      <div className={`font-medium mb-0.5 text-[10px] ${isHoliday ? 'text-rose-300' : 'text-slate-400'}`}>{dayName}</div>
                      <div className={`font-semibold text-sm ${isHoliday ? 'text-rose-400' : isWeekend ? 'text-slate-300' : 'text-slate-200'}`}>{day}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {sortedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 4} className="p-10 text-center text-slate-500 font-medium border-b border-slate-700">
                    ไม่มีข้อมูลพนักงาน
                  </td>
                </tr>
              ) : (
                sortedEmployees.map((emp) => {
                  const summary = calculateSummary(emp.id);

                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/50 transition-colors group">
                      
                      <td className="sticky left-0 z-20 w-[260px] min-w-[260px] max-w-[260px] bg-[#1e293b] p-3 text-xs text-slate-200 border-b border-r border-slate-700/50 bg-clip-padding">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0 shadow-sm">
                            <i className="bi bi-person-fill text-lg"></i>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 pb-0.5">
                              <span className="font-semibold text-slate-200 text-[13px] leading-normal truncate block max-w-[130px]">
                                {emp.name}
                              </span>
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
                      </td>

                      <td className="sticky left-[260px] z-20 w-[56px] min-w-[56px] max-w-[56px] bg-[#1e293b] p-2 border-b border-r border-slate-700/50 text-center font-semibold text-emerald-400 text-[13px] bg-clip-padding">{summary.d || '-'}</td>
                      <td className="sticky left-[316px] z-20 w-[56px] min-w-[56px] max-w-[56px] bg-[#1e293b] p-2 border-b border-r border-slate-700/50 text-center font-semibold text-orange-400 text-[13px] bg-clip-padding">{summary.n || '-'}</td>
                      <td className="sticky left-[372px] z-20 w-[56px] min-w-[56px] max-w-[56px] bg-[#1e293b] p-2 border-b border-r border-slate-700/50 text-center font-semibold text-amber-400 text-[13px] border-r-amber-500/20 bg-clip-padding">{summary.ot || '-'}</td>

                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                        const { isSunday, isWeekend } = getDayDetails(day);
                        const isHoliday = !!holidays[day];
                        const cell = schedule[`${emp.id}_${day}`];
                        
                        const borderRightClass = isSunday ? 'border-r-2 border-r-slate-600/50' : 'border-r border-slate-700/30';
                        const colBg = isHoliday ? 'bg-rose-500/5' : (isWeekend ? 'bg-slate-800/30' : '');

                        let cellBg = 'border-transparent';
                        let textColor = 'text-slate-300';
                        if (cell?.shift === 'D') { cellBg = 'bg-emerald-500 shadow-sm border-emerald-600'; textColor = 'text-white'; }
                        if (cell?.shift === 'N') { cellBg = 'bg-orange-500 shadow-sm border-orange-600'; textColor = 'text-white'; }
                        if (cell?.shift === 'O') { cellBg = 'bg-slate-600 shadow-sm border-slate-700'; textColor = 'text-white'; }

                        return (
                          <td key={day} className={`p-1 relative border-b border-slate-700/50 ${borderRightClass} ${colBg}`}>
                            <div className={`w-full h-[40px] rounded flex flex-col items-center justify-center border ${cellBg} relative`}>
                              {cell?.shift && <span className={`font-semibold text-sm ${textColor}`}>{cell.shift}</span>}
                              {cell?.isOT && (
                                <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 text-[7px] font-bold px-1 rounded-bl-sm shadow-sm">OT</div>
                              )}
                            </div>
                          </td>
                        );
                      })}
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
