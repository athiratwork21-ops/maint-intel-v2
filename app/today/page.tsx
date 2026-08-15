"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseServiceWork } from '../../lib/supabase-servicework';

// ฟังก์ชันแปลงวันที่
const formatDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

function TodayRosterContent() {
  const searchParams = useSearchParams();
  const deptParam = searchParams.get('dept') || ''; 
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);

  const [currentWorkDate, setCurrentWorkDate] = useState('');
  const [targetShift, setTargetShift] = useState<'D' | 'N'>('D');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // 🌟 ลอจิกคำนวณเวลาอัจฉริยะ ตามที่บอสสั่ง!
    const updateTimeLogic = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      setCurrentTime(timeStr);

      let workDateObj = new Date(now);
      let activeShift: 'D' | 'N' = 'D';

      if (timeStr >= '07:10' && timeStr < '19:10') {
        activeShift = 'D'; // กะเช้าของวันนี้
      } else if (timeStr >= '19:10') {
        activeShift = 'N'; // กะดึกของวันนี้
      } else {
        // ช่วงหลังเที่ยงคืนถึง 07:09 น. -> คือกะดึกที่ลากยาวมาจากเมื่อวาน
        activeShift = 'N';
        workDateObj.setDate(workDateObj.getDate() - 1); 
      }

      setTargetShift(activeShift);
      setCurrentWorkDate(formatDateStr(workDateObj));
    };

    updateTimeLogic();
    const timer = setInterval(updateTimeLogic, 60000); // อัปเดตนาฬิกาทุก 1 นาที
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!deptParam || !currentWorkDate) return;
      setIsLoading(true);

      try {
        // 1. ดึงพนักงานในแผนก
        const { data: empData, error: empErr } = await supabaseServiceWork
          .from('employees')
          .select('*')
          .eq('DepartmentID', deptParam);
        
        if (empErr) throw empErr;
        
        // 2. ดึงตารางงานของ "วันที่คำนวณได้"
        const { data: schedData, error: schedErr } = await supabaseServiceWork
          .from('schedules')
          .select('*')
          .eq('work_date', currentWorkDate)
          .in('employee_id', (empData || []).map(e => e.id));

        if (schedErr) throw schedErr;

        // 3. กรองเอาเฉพาะคนที่เข้ากะ (D, N) ในวันนี้
        let workingToday = (empData || []).map(emp => {
          const sched = (schedData || []).find(s => s.employee_id === emp.id);
          if (!sched || (sched.shift_code !== 'D' && sched.shift_code !== 'N')) return null;
          return { ...emp, shift: sched.shift_code, isOT: sched.is_ot, is6S: sched.is_6s };
        }).filter(Boolean); // ตัดคนหยุดออก

        // 4. จัดเรียง: กะปัจจุบัน -> มีกรุ๊ป -> เรียงตามชื่อกรุ๊ป -> เรียงตามชื่อคน
        workingToday.sort((a: any, b: any) => {
          // กฎข้อ 1: เอากะปัจจุบัน (targetShift) ขึ้นบนสุดก่อน
          if (a.shift === targetShift && b.shift !== targetShift) return -1;
          if (a.shift !== targetShift && b.shift === targetShift) return 1;
          
          // ดึงข้อมูลกรุ๊ปมาเช็ค (ถ้าเป็น null ให้มองเป็นข้อความว่าง '')
          const groupA = a.group_team?.trim() || '';
          const groupB = b.group_team?.trim() || '';

          // กฎข้อ 2: คนมีกรุ๊ปให้อยู่บน คนไม่มีกรุ๊ปให้ไปอยู่ล่าง
          if (groupA && !groupB) return -1; // A มี B ไม่มี -> A ขึ้นก่อน
          if (!groupA && groupB) return 1;  // A ไม่มี B มี -> B ขึ้นก่อน

          // กฎข้อ 3: ถ้ามีกรุ๊ปทั้งคู่ ให้เรียงตามชื่อกรุ๊ป (G1 มาก่อน G2)
          if (groupA && groupB) {
            // ใช้ localeCompare แบบ numeric เพื่อให้เลข 2 มาก่อน 10
            const groupCompare = groupA.localeCompare(groupB, 'th', { numeric: true });
            if (groupCompare !== 0) return groupCompare;
          }

          // กฎข้อ 4: ถ้าไม่มีกรุ๊ปทั้งคู่ หรืออยู่กรุ๊ปเดียวกันเป๊ะ ให้เรียงตามชื่อ ก-ฮ
          return a.name.localeCompare(b.name, 'th');
        });

        setEmployees(workingToday);
      } catch (error) {
        console.error("Error loading today roster:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [deptParam, currentWorkDate, targetShift]);

  // ฟังก์ชันช่วยทำวันที่ภาษาไทย
  const displayDateStr = () => {
    if (!currentWorkDate) return '';
    const d = new Date(currentWorkDate);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (!deptParam) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center">
        <i className="bi bi-qr-code-scan text-5xl text-slate-500 mb-4"></i>
        <h2 className="text-xl font-bold text-white mb-2">QR Code ไม่สมบูรณ์</h2>
        <p className="text-slate-400 text-sm">กรุณาสแกน QR Code จากระบบ Maint-Intel อีกครั้งครับ</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-10">
      
      {/* Header สไตล์ Mobile App */}
      <div className="bg-[#1e293b] pt-8 pb-6 px-6 rounded-b-3xl shadow-lg border-b border-slate-700/50 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <i className="bi bi-people-fill text-blue-400"></i> รายชื่อปฏิบัติงาน
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">{displayDateStr()}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-white font-mono tracking-wider">{currentTime}</div>
            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${targetShift === 'D' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
              <i className={`bi ${targetShift === 'D' ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`}></i> กะปัจจุบัน: {targetShift === 'D' ? 'เช้า' : 'ดึก'}
            </div>
          </div>
        </div>
        
        {/* สรุปยอดคนเข้ากะ */}
        <div className="flex gap-2">
          <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2 flex items-center justify-center gap-2">
            <span className="text-emerald-400 font-bold text-sm">กะเช้า (D):</span>
            <span className="text-white font-black">{employees.filter(e => e.shift === 'D').length} คน</span>
          </div>
          <div className="flex-1 bg-orange-500/10 border border-orange-500/30 rounded-xl p-2 flex items-center justify-center gap-2">
            <span className="text-orange-400 font-bold text-sm">กะดึก (N):</span>
            <span className="text-white font-black">{employees.filter(e => e.shift === 'N').length} คน</span>
          </div>
        </div>
      </div>

      {/* รายชื่อพนักงาน */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-blue-400">
            <i className="bi bi-arrow-repeat animate-spin text-4xl mb-4"></i>
            <p className="text-sm font-medium animate-pulse">กำลังโหลดข้อมูล...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-20 bg-[#1e293b]/50 rounded-2xl border border-slate-700 border-dashed">
            <i className="bi bi-emoji-frown text-4xl text-slate-500 mb-3 block"></i>
            <p className="text-slate-400 text-sm">ไม่มีพนักงานเข้ากะในวันนี้ครับ</p>
          </div>
        ) : (
          employees.map((emp, idx) => (
            <div 
              key={idx} 
              onClick={() => setSelectedEmp(emp)}
              className={`bg-[#1e293b] p-3 rounded-2xl border flex items-center gap-4 shadow-sm active:scale-95 transition-all cursor-pointer ${emp.shift === targetShift ? (emp.shift === 'D' ? 'border-emerald-500/40 bg-emerald-900/10' : 'border-orange-500/40 bg-orange-900/10') : 'border-slate-700'}`}
            >
              {/* รูปพนักงานแบบวงกลม */}
              <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {emp.photo_url ? (
                  <img src={emp.photo_url} alt={emp.name} className="w-full h-full object-cover" />
                ) : (
                  <i className="bi bi-person-fill text-2xl text-slate-500"></i>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm truncate">{emp.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-slate-400">{emp.id}</span>
                  {emp.group_team && <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-bold">{emp.group_team}</span>}
                </div>
              </div>

              {/* ป้ายกะการทำงาน */}
              <div className="flex flex-col gap-1 items-end shrink-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-sm ${emp.shift === 'D' ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'}`}>
                  {emp.shift}
                </div>
                {emp.isOT && <span className="text-[9px] bg-amber-500 text-amber-900 font-bold px-1.5 py-0.5 rounded-sm">OT</span>}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 🌟 Pop-up แสดงข้อมูลติดต่อ (เบอร์ / ไลน์) */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4 pb-0">
          <div className="bg-[#1e293b] w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-300">
            
            <button onClick={() => setSelectedEmp(null)} className="absolute top-4 right-5 text-slate-400 hover:text-white bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center">
              <i className="bi bi-x-lg text-sm"></i>
            </button>

            <div className="flex flex-col items-center mb-6 mt-2">
              <div className="w-24 h-24 rounded-full border-4 border-slate-700 bg-slate-800 flex items-center justify-center overflow-hidden shadow-lg mb-4">
                {selectedEmp.photo_url ? (
                  <img src={selectedEmp.photo_url} alt={selectedEmp.name} className="w-full h-full object-cover" />
                ) : (
                  <i className="bi bi-person-fill text-5xl text-slate-500"></i>
                )}
              </div>
              <h2 className="text-xl font-bold text-white text-center leading-tight">{selectedEmp.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">{selectedEmp.id}</span>
                <span className={`text-sm font-bold px-2 py-1 rounded-md text-white ${selectedEmp.shift === 'D' ? 'bg-emerald-500' : 'bg-orange-500'}`}>กะ {selectedEmp.shift === 'D' ? 'เช้า (D)' : 'ดึก (N)'}</span>
              </div>
            </div>

            <div className="space-y-3">
              <a href={`tel:${selectedEmp.phone || ''}`} className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-sm transition-transform active:scale-95 ${selectedEmp.phone ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 pointer-events-none'}`}>
                <i className="bi bi-telephone-fill text-lg"></i>
                {selectedEmp.phone ? `โทรออก: ${selectedEmp.phone}` : 'ไม่มีข้อมูลเบอร์โทร'}
              </a>

              <div className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl font-bold text-sm bg-[#00B900]/10 border border-[#00B900]/30 text-[#00B900]">
                <i className="bi bi-line text-xl"></i>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[10px] text-[#00B900]/70 uppercase tracking-wide leading-none">LINE NAME</p>
                  <p className="truncate text-base mt-0.5">{selectedEmp.line_name || 'ไม่มีข้อมูลไลน์'}</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// หุ้มด้วย Suspense ตามกฎของ Next.js App Router
export default function TodayMobilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">กำลังโหลด...</div>}>
      <TodayRosterContent />
    </Suspense>
  );
}