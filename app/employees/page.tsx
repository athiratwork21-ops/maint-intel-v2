"use client";
import React, { useState, useEffect } from 'react';
import { supabaseServiceWork } from '../../lib/supabase-servicework'; 

// 📦 Mock Data เริ่มต้น (เดี๋ยวเราค่อยต่อ API ดึงจาก Supabase)
const MOCK_EMPLOYEES = [
  { id: "1", name: "👨‍🔧 สมชาย ยอดขยัน" },
  { id: "2", name: "👩‍💼 สมหญิง รักงาน" },
  { id: "3", name: "👨‍💻 ช่างใหญ่ ไอที" },
];

// 🔄 ระบบ Toggle วนลูปกะงาน
const SHIFT_CYCLE = ["D", "N", "O"];
const SHIFT_COLORS: Record<string, string> = {
  D: "bg-emerald-500 text-white shadow-emerald-500/50",
  N: "bg-orange-500 text-white shadow-orange-500/50",
  O: "bg-slate-500 text-white shadow-slate-500/50",
  "": "bg-slate-800 hover:bg-slate-700 text-slate-600 border border-slate-700", // ช่องว่างรอจัดกะ
};

export default function MonthlyRoster() {
  // สร้าง Array วันที่ 1-31 แบบไวๆ
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  // State เก็บข้อมูลตารางที่จัด รูปแบบ: { "empId-date": "D" }
  const [schedules, setSchedules] = useState<Record<string, string>>({});

  // ⚡ ฟังก์ชันหลัก: คลิกแล้วเปลี่ยนกะทันที (No typing!)
  const toggleShift = (empId: string, day: number) => {
    const key = `${empId}-${day}`;
    const currentShift = schedules[key] || "";
    
    // หาลำดับกะถัดไป ถ้าช่องว่างอยู่ให้เริ่มที่ 'D'
    const currentIndex = SHIFT_CYCLE.indexOf(currentShift);
    const nextShift = currentIndex === -1 
      ? SHIFT_CYCLE[0] 
      : SHIFT_CYCLE[(currentIndex + 1) % SHIFT_CYCLE.length];

    // อัปเดตหน้าจอก่อนเลยให้ลื่นไหล (Optimistic UI)
    setSchedules((prev) => ({ ...prev, [key]: nextShift }));

    // 🔧 TODO: ตรงนี้เดี๋ยวเราเอาไว้ยิงโค้ด Supabase บันทึกข้อมูล
    // await supabase.from('schedules').upsert({
    //   employee_id: empId, 
    //   work_date: `2026-06-${day.toString().padStart(2, '0')}`, 
    //   shift_code: nextShift
    // });
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-4xl font-bold text-emerald-400 mb-2">🗓️ Shift Roster Pro</h1>
            <p className="text-slate-400">ระบบจัดการตารางกะพนักงาน คลิกเดียวจบ ไม่ต้องพิมพ์</p>
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2">
            <span>💾 บันทึกข้อมูล</span>
          </button>
        </div>

        {/* ตาราง Monthly View */}
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-[#1e293b] shadow-2xl custom-scrollbar">
          <table className="w-full border-collapse">
            <thead className="bg-slate-800">
              <tr>
                {/* ล็อกคอลัมน์ชื่อพนักงานไว้ซ้ายสุด */}
                <th className="sticky left-0 z-20 bg-slate-800 p-4 text-left border-b border-r border-slate-700 min-w-[250px] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)]">
                  พนักงาน (พ.ย. 2026)
                </th>
                {daysInMonth.map((day) => (
                  <th key={day} className="p-2 border-b border-slate-700 text-center min-w-[56px] text-slate-400 font-medium">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_EMPLOYEES.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-700/30 transition-colors group">
                  {/* ชื่อพนักงาน (Sticky) */}
                  <td className="sticky left-0 z-10 bg-[#1e293b] group-hover:bg-[#233147] p-4 border-b border-r border-slate-700 font-medium shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)] transition-colors">
                    {emp.name}
                  </td>
                  
                  {/* เซลล์วันที่ 1-31 */}
                  {daysInMonth.map((day) => {
                    const shift = schedules[`${emp.id}-${day}`] || "";
                    return (
                      <td key={day} className="p-1 border-b border-slate-700/50 border-dashed">
                        <button
                          onClick={() => toggleShift(emp.id, day)}
                          className={`w-full h-12 rounded-md font-bold text-sm transition-all duration-200 transform hover:scale-105 active:scale-95 ${SHIFT_COLORS[shift]}`}
                        >
                          {shift || "+"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend อธิบายสี */}
        <div className="mt-6 p-4 bg-slate-800/50 rounded-xl inline-flex gap-6 border border-slate-700">
          <span className="flex items-center gap-2 font-medium text-slate-300">
            <div className="w-5 h-5 bg-emerald-500 rounded shadow-sm shadow-emerald-500/50"></div> D = Day (เช้า)
          </span>
          <span className="flex items-center gap-2 font-medium text-slate-300">
            <div className="w-5 h-5 bg-orange-500 rounded shadow-sm shadow-orange-500/50"></div> N = Night (ดึก)
          </span>
          <span className="flex items-center gap-2 font-medium text-slate-300">
            <div className="w-5 h-5 bg-slate-500 rounded shadow-sm shadow-slate-500/50"></div> O = Off (หยุด)
          </span>
        </div>

      </div>
    </div>
  );
}
