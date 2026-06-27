"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { supabaseServiceWork } from '../../lib/supabase-servicework';

type CellData = { shift: 'D' | 'N' | 'O'; isOT: boolean };
type ScheduleState = Record<string, CellData>;

export default function MobileEmployeeRoster() {
  // 🌟 State สำหรับการเข้าสู่ระบบ
  const [empIdInput, setEmpIdInput] = useState('');
  const [currentEmp, setCurrentEmp] = useState<any>(null);
  const [authError, setAuthError] = useState('');

  // 🌟 State สำหรับปฏิทิน
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [schedule, setSchedule] = useState<ScheduleState>({});
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 🌟 State สำหรับป๊อปอัปลางาน
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'ลากิจ', reason: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 📅 คำนวณวันในปฏิทิน
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)

  // ==========================================
  // 1. ระบบ Login ด้วยรหัสพนักงาน
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');
    try {
      const { data, error } = await supabaseServiceWork
        .from('employees')
        .select('*')
        .eq('id', empIdInput.trim())
        .single();

      if (error || !data) throw new Error('ไม่พบข้อมูลรหัสพนักงานนี้');
      setCurrentEmp(data);
    } catch (err) {
      setAuthError('รหัสพนักงานไม่ถูกต้อง กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentEmp(null);
    setEmpIdInput('');
    setSchedule({});
  };

  // ==========================================
  // 2. ดึงข้อมูลตารางงานและการลาของพนักงานคนนั้น
  // ==========================================
  const loadScheduleData = useCallback(async () => {
    if (!currentEmp) return;
    setIsLoading(true);
    try {
      const monthStr = String(month + 1).padStart(2, '0');
      const startDate = `${year}-${monthStr}-01`;
      const endDate = `${year}-${monthStr}-${daysInMonth}`;

      // ดึงกะงาน
      const { data: schedData } = await supabaseServiceWork
        .from('schedules')
        .select('*')
        .eq('employee_id', currentEmp.id)
        .gte('work_date', startDate)
        .lte('work_date', endDate);

      const loadedSchedule: ScheduleState = {};
      if (schedData) {
        schedData.forEach(row => {
          const day = parseInt(row.work_date.split('-')[2], 10);
          loadedSchedule[day] = { shift: row.shift_code as 'D' | 'N' | 'O', isOT: row.is_ot };
        });
      }
      setSchedule(loadedSchedule);

      // ดึงประวัติการลา (เผื่อมาแสดงในปฏิทิน)
      const { data: leaveData } = await supabaseServiceWork
        .from('leave_requests')
        .select('*')
        .eq('employee_id', currentEmp.id)
        .gte('leave_date', startDate)
        .lte('leave_date', endDate);
      
      setLeaveRequests(leaveData || []);

    } catch (error) {
      console.error("Error loading schedule:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentEmp, currentDate, year, month, daysInMonth]);

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  // ==========================================
  // 3. ระบบส่งคำขอลางาน
  // ==========================================
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || !currentEmp) return;
    setIsSubmitting(true);
    try {
      const leaveDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
      
      const { error } = await supabaseServiceWork.from('leave_requests').insert({
        employee_id: currentEmp.id,
        leave_date: leaveDate,
        leave_type: leaveForm.type,
        reason: leaveForm.reason
      });

      if (error) throw error;
      
      alert('✅ ส่งคำขอลางานสำเร็จ');
      setIsLeaveModalOpen(false);
      setLeaveForm({ type: 'ลากิจ', reason: '' });
      loadScheduleData(); // รีเฟรชข้อมูล
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาดในการส่งข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // หน้าจอ 1: Login Screen
  // ==========================================
  if (!currentEmp) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 font-sans">
        <div className="bg-[#1e293b] p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-700 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-inner">
            <i className="bi bi-person-badge"></i>
          </div>
          <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Roster Portal</h1>
          <p className="text-slate-400 text-sm mb-8">กรุณากรอกรหัสพนักงานเพื่อดูตารางงานของคุณ</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="relative">
                <i className="bi bi-person-fill absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input 
                  type="text" 
                  value={empIdInput} 
                  onChange={(e) => setEmpIdInput(e.target.value)}
                  placeholder="รหัสพนักงาน..." 
                  required
                  className="w-full pl-11 pr-4 py-3.5 bg-[#0f172a] border border-slate-600 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white font-bold tracking-wider transition-all"
                />
              </div>
              {authError && <p className="text-red-400 text-xs mt-2 font-medium bg-red-400/10 p-2 rounded-lg"><i className="bi bi-exclamation-circle-fill mr-1"></i>{authError}</p>}
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2">
              {isLoading ? <i className="bi bi-arrow-repeat animate-spin text-lg"></i> : <i className="bi bi-box-arrow-in-right text-lg"></i>}
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // หน้าจอ 2: Mobile Calendar View
  // ==========================================
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-10">
      
      {/* 🌟 Header App */}
      <div className="bg-[#1e293b] pt-12 pb-6 px-6 rounded-b-3xl shadow-lg border-b border-slate-700/50 sticky top-0 z-10">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-xl text-slate-300 shadow-inner">
              <i className="bi bi-person-fill"></i>
            </div>
            <div>
              <h2 className="font-bold text-white leading-tight">{currentEmp.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-slate-400">{currentEmp.id}</span>
                {currentEmp.shift_team && <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">กะ {currentEmp.shift_team}</span>}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center hover:bg-rose-500/20 active:scale-95 transition-all">
            <i className="bi bi-power text-lg"></i>
          </button>
        </div>
      </div>

      {/* 🌟 Calendar Area */}
      <div className="px-4 mt-6 max-w-md mx-auto">
        
        {/* Month Navigation */}
        <div className="flex justify-between items-center bg-[#1e293b] p-2 rounded-2xl border border-slate-700/50 mb-4">
          <button 
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="w-10 h-10 rounded-xl hover:bg-slate-700 flex items-center justify-center active:scale-95 transition-all"
          >
            <i className="bi bi-chevron-left text-slate-300"></i>
          </button>
          <h3 className="font-bold text-lg text-white">
            {currentDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' })}
          </h3>
          <button 
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="w-10 h-10 rounded-xl hover:bg-slate-700 flex items-center justify-center active:scale-95 transition-all"
          >
            <i className="bi bi-chevron-right text-slate-300"></i>
          </button>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((day, i) => (
            <div key={day} className={`text-xs font-bold ${i === 0 ? 'text-rose-400' : 'text-slate-400'}`}>{day}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* ช่องว่างก่อนวันที่ 1 */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square rounded-xl bg-slate-800/20"></div>
          ))}

          {/* วันที่จริง */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const cellData = schedule[day];
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            const dateObj = new Date(year, month, day);
            const isSunday = dateObj.getDay() === 0;

            // เช็กสถานะการลา
            const leaveInfo = leaveRequests.find(l => new Date(l.leave_date).getDate() === day);

            // สีของกะงาน
            let bgClass = 'bg-[#1e293b] border-slate-700/50 hover:bg-slate-700';
            let shiftText = '';
            
            if (cellData?.shift === 'D') { bgClass = 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'; shiftText = 'D'; }
            if (cellData?.shift === 'N') { bgClass = 'bg-orange-500/20 border-orange-500/30 text-orange-400'; shiftText = 'N'; }
            if (cellData?.shift === 'O') { bgClass = 'bg-slate-700/50 border-slate-600/50 text-slate-400'; shiftText = 'O'; }

            // ถ้ามีลางาน ให้สีเด่นขึ้น
            if (leaveInfo) {
              bgClass = leaveInfo.status === 'Pending' 
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                : 'bg-rose-500/20 border-rose-500/50 text-rose-400';
            }

            return (
              <div 
                key={day} 
                onClick={() => { setSelectedDay(day); setIsLeaveModalOpen(true); }}
                className={`aspect-square rounded-xl border flex flex-col items-center justify-center relative cursor-pointer active:scale-95 transition-all shadow-sm ${bgClass} ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0f172a]' : ''}`}
              >
                <span className={`text-[13px] font-black ${isSunday && !cellData ? 'text-rose-400/70' : ''}`}>{day}</span>
                
                {leaveInfo ? (
                  <span className="text-[9px] font-bold mt-0.5">ลา</span>
                ) : (
                  shiftText && <span className="text-[10px] font-bold mt-0.5 opacity-90">{shiftText}</span>
                )}

                {/* จุดไข่ปลาบอกว่ามี OT */}
                {cellData?.isOT && !leaveInfo && (
                  <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-400 rounded-full shadow-[0_0_5px_#fbbf24]"></div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-4 text-[10px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-500/40"></div> กะเช้า (D)</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-orange-500/40"></div> กะดึก (N)</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-slate-700"></div> วันหยุด (O)</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-amber-500/40"></div> รออนุมัติลา</div>
        </div>

      </div>

      {/* ========================================== */}
      {/* 🌟 Modal สำหรับส่งคำขอลางาน (Bottom Sheet) */}
      {/* ========================================== */}
      {isLeaveModalOpen && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1e293b] w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 pb-8 border border-slate-700 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="bi bi-calendar2-plus text-blue-400"></i> แจ้งลางาน
              </h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="w-8 h-8 bg-slate-800 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-700 hover:text-white transition-all">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-700/50 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center text-xl font-black shrink-0">
                {selectedDay}
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">วันที่เลือก</p>
                <p className="text-sm font-bold text-white">{selectedDay} {currentDate.toLocaleString('th-TH', { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            {leaveRequests.find(l => new Date(l.leave_date).getDate() === selectedDay) ? (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-center">
                <i className="bi bi-hourglass-split text-2xl text-amber-400 mb-2 block"></i>
                <p className="text-sm font-bold text-amber-400 mb-1">คุณส่งคำขอลางานไปแล้ว</p>
                <p className="text-xs text-slate-400">อยู่ระหว่างรอหัวหน้างานอนุมัติในระบบ</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitLeave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">ประเภทการลา</label>
                  <div className="relative">
                    <select 
                      value={leaveForm.type}
                      onChange={(e) => setLeaveForm({...leaveForm, type: e.target.value})}
                      className="w-full p-3.5 bg-[#0f172a] border border-slate-600 rounded-xl outline-none focus:border-blue-500 text-white font-bold appearance-none"
                    >
                      <option value="ลา">ลา</option>
                    </select>
                    <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">เหตุผล (ระบุให้ชัดเจน)</label>
                  <textarea 
                    rows={3} 
                    required
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                    placeholder="เช่น ไปทำธุระติดต่อราชการ..." 
                    className="w-full p-3.5 bg-[#0f172a] border border-slate-600 rounded-xl outline-none focus:border-blue-500 text-white text-sm resize-none"
                  ></textarea>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mt-2 transition-colors active:scale-95 shadow-lg shadow-blue-600/20">
                  {isSubmitting ? <><i className="bi bi-arrow-repeat animate-spin mr-2"></i>กำลังส่งคำขอ...</> : <><i className="bi bi-send-fill mr-2"></i>ยืนยันการลางาน</>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}