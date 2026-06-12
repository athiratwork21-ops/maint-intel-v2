"use client";
import { useState } from "react";

// 🔄 ระบบ Toggle วนลูปกะงาน
const SHIFT_CYCLE = ["D", "N", "O"];
const SHIFT_COLORS: Record<string, string> = {
  D: "bg-emerald-500 text-white shadow-emerald-500/50",
  N: "bg-orange-500 text-white shadow-orange-500/50",
  O: "bg-slate-500 text-white shadow-slate-500/50",
  "": "bg-slate-800 hover:bg-slate-700 text-slate-600 border border-slate-700", // ช่องว่าง
};

// ชื่อวันภาษาไทย (ตัวย่อ)
const DAY_NAMES = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export default function MonthlyRoster() {
  // 🗓️ ตั้งค่าเดือน/ปี ปัจจุบัน (เช่น มิถุนายน 2026)
  const currentYear = 2026;
  const currentMonth = 5; // 0 = ม.ค., 5 = มิ.ย.
  const daysInMonthCount = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInMonth = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);

  // 📦 State เก็บข้อมูล
  const [employees, setEmployees] = useState([
    { id: "1", name: "👨‍🔧 สมชาย ยอดขยัน" },
    { id: "2", name: "👩‍💼 สมหญิง รักงาน" },
    { id: "3", name: "👨‍💻 ช่างใหญ่ ไอที" },
  ]);
  const [newEmpName, setNewEmpName] = useState("");
  const [schedules, setSchedules] = useState<Record<string, string>>({});

  // ⚡ ฟังก์ชันเปลี่ยนกะ
  const toggleShift = (empId: string, day: number) => {
    const key = `${empId}-${day}`;
    const currentShift = schedules[key] || "";
    const currentIndex = SHIFT_CYCLE.indexOf(currentShift);
    const nextShift = currentIndex === -1 
      ? SHIFT_CYCLE[0] 
      : SHIFT_CYCLE[(currentIndex + 1) % SHIFT_CYCLE.length];

    setSchedules((prev) => ({ ...prev, [key]: nextShift }));
  };

  // ➕ ฟังก์ชันเพิ่มพนักงาน
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;
    setEmployees([...employees, { id: Date.now().toString(), name: `👤 ${newEmpName}` }]);
    setNewEmpName("");
  };

  // 🗑️ ฟังก์ชันลบพนักงาน
  const handleRemoveEmployee = (id: string, name: string) => {
    if (window.confirm(`บอสแน่ใจนะว่าจะลบ "${name}" ออกจากตาราง?`)) {
      setEmployees(employees.filter(emp => emp.id !== id));
      setSchedules(prev => {
        const newSchedules = { ...prev };
        Object.keys(newSchedules).forEach(key => {
          if (key.startsWith(`${id}-`)) delete newSchedules[key];
        });
        return newSchedules;
      });
    }
  };

  // 🎨 ฟังก์ชันดึงชื่อวันและเช็คว่าเป็นวันหยุดเสาร์-อาทิตย์ไหม
  const getDayInfo = (day: number) => {
    const dateObj = new Date(currentYear, currentMonth, day);
    const dayOfWeek = dateObj.getDay(); // 0 = วันอาทิตย์, 6 = วันเสาร์
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    return {
      name: DAY_NAMES[dayOfWeek],
      isWeekend,
      // ถ้าเป็นเสาร์-อาทิตย์ ให้สีพื้นหลังเข้มขึ้นนิดนึงเพื่อแยกโซน
      bgClass: isWeekend ? "bg-slate-700/40" : "bg-transparent",
      // ไฮไลท์สีตัวหนังสือวันเสาร์(สีฟ้า) อาทิตย์(สีแดง) เพื่อความชัดเจน
      textClass: dayOfWeek === 0 ? "text-red-400" : dayOfWeek === 6 ? "text-sky-400" : "text-slate-400"
    };
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-8 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-emerald-400 mb-2">🗓️ Shift Roster Pro</h1>
            <p className="text-slate-400">
              ตารางกะประจำเดือน: <strong className="text-slate-200">มิถุนายน 2026</strong>
            </p>
          </div>
          
          <div className="flex gap-4">
            <form onSubmit={handleAddEmployee} className="flex gap-2 bg-slate-800/50 p-2 rounded-lg border border-slate-700">
              <input 
                type="text" 
                placeholder="ชื่อพนักงานใหม่..." 
                value={newEmpName}
                onChange={(e) => setNewEmpName(e.target.value)}
                className="bg-[#0f172a] text-sm text-slate-200 px-3 py-2 rounded border border-slate-600 focus:outline-none focus:border-emerald-500 w-48"
              />
              <button type="submit" className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-1">
                ➕ เพิ่มคน
              </button>
            </form>
            <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20">
              💾 บันทึกตาราง
            </button>
          </div>
        </div>

        {/* ตาราง Monthly View */}
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-[#1e293b] shadow-2xl custom-scrollbar">
          <table className="w-full border-collapse">
            <thead className="bg-slate-800">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-800 p-4 text-left border-b border-r border-slate-700 min-w-[280px] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)]">
                  พนักงาน ({employees.length} คน)
                </th>
                {daysInMonth.map((day) => {
                  const { name, bgClass, textClass } = getDayInfo(day);
                  return (
                    <th key={day} className={`p-2 border-b border-slate-700 text-center min-w-[56px] ${bgClass}`}>
                      <div className="flex flex-col items-center justify-center">
                        {/* แสดงชื่อวัน (จ., อ., พ.) */}
                        <span className={`text-xs font-bold mb-1 ${textClass}`}>{name}</span>
                        {/* แสดงวันที่ (1, 2, 3) */}
                        <span className="text-sm font-medium text-slate-200">{day}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonthCount + 1} className="text-center p-8 text-slate-500">
                    ยังไม่มีพนักงานในระบบ บอสเพิ่มคนใหม่ได้ที่มุมขวาบนเลยครับ ☝️
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-700/30 transition-colors group border-b border-slate-700/50">
                    <td className="sticky left-0 z-10 bg-[#1e293b] group-hover:bg-[#233147] p-3 border-r border-slate-700 font-medium shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)] transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="truncate">{emp.name}</span>
                        <button 
                          onClick={() => handleRemoveEmployee(emp.id, emp.name)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 hover:bg-red-400/10 p-1.5 rounded transition-all"
                          title="ลบพนักงาน"
                        >
                          ❌
                        </button>
                      </div>
                    </td>
                    
                    {daysInMonth.map((day) => {
                      const shift = schedules[`${emp.id}-${day}`] || "";
                      const { bgClass } = getDayInfo(day);
                      return (
                        <td key={day} className={`p-1 border-dashed border-slate-700/30 border-r ${bgClass}`}>
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
                ))
              )}
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
