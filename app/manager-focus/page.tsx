"use client";
import React, { useState, useEffect } from 'react';

// ==========================================
// 🛡️ โครงสร้างข้อมูล (ป้องกัน TS Error)
// ==========================================
interface Task {
  id: string;
  title: string;
  priority: 'High' | 'Med' | 'Low';
  status: 'backlog' | 'planned' | 'done';
  startTime?: string;
  endTime?: string;
}

export default function ManagerFocusDashboard() {
  // 🌟 ข้อมูลจำลองตั้งต้น (เดี๋ยวอนาคตเราค่อยต่อ Supabase)
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'ตรวจอนุมัติ P/O อะไหล่ประจำเดือน', priority: 'High', status: 'backlog' },
    { id: '2', title: 'ประชุมทีมช่างซ่อมบำรุง (Weekly)', priority: 'Med', status: 'backlog' },
    { id: '3', title: 'สรุป Report แจ้งซ่อมของ Line A', priority: 'High', status: 'planned', startTime: '10:00', endTime: '11:30' },
    { id: '4', title: 'เซ็นเอกสาร OT พนักงาน', priority: 'Low', status: 'done', startTime: '08:30', endTime: '09:00' },
  ]);

  // State สำหรับคุม Modal กรอกเวลา
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [timeForm, setTimeForm] = useState({ start: '09:00', end: '10:00' });

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Med' | 'Low'>('Med');

  // ==========================================
  // 📊 คำนวณ Dashboard สดๆ
  // ==========================================
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const backlogTasks = tasks.filter(t => t.status === 'backlog').length;
  const plannedTasks = tasks.filter(t => t.status === 'planned').length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  // ==========================================
  // ⚙️ ฟังก์ชันจัดการงาน
  // ==========================================
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: Task = { id: Date.now().toString(), title: newTaskTitle, priority: newTaskPriority, status: 'backlog' };
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
  };

  const openScheduleModal = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleScheduleTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, status: 'planned', startTime: timeForm.start, endTime: timeForm.end } : t));
    setIsModalOpen(false);
  };

  const markAsDone = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: 'done' } : t));
  };

  const moveToBacklog = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: 'backlog', startTime: undefined, endTime: undefined } : t));
  };

  // ดึงงานที่แพลนไว้วันนี้ มาเรียงตามเวลา
  const todaysSchedule = tasks.filter(t => t.status === 'planned').sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans p-6 md:p-8">
      
      {/* 🌟 HEADER */}
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Executive Planner</h1>
          <p className="text-slate-500 font-bold mt-1"><i className="bi bi-calendar-event mr-2"></i>{new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Daily Progress</p>
          <div className="flex items-center gap-3">
            <div className="w-48 h-3 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <span className="font-black text-emerald-600">{progressPercent}%</span>
          </div>
        </div>
      </header>

      {/* 📊 DASHBOARD CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center text-2xl"><i className="bi bi-card-list"></i></div>
          <div><p className="text-slate-400 font-bold text-xs uppercase">งานทั้งหมด</p><h3 className="text-3xl font-black text-slate-800">{totalTasks}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl"><i className="bi bi-inbox-fill"></i></div>
          <div><p className="text-amber-500 font-bold text-xs uppercase">รอจัดคิว (Backlog)</p><h3 className="text-3xl font-black text-amber-600">{backlogTasks}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-2xl"><i className="bi bi-clock-history"></i></div>
          <div><p className="text-blue-500 font-bold text-xs uppercase">แผนของวันนี้</p><h3 className="text-3xl font-black text-blue-600">{plannedTasks}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-2xl"><i className="bi bi-check-circle-fill"></i></div>
          <div><p className="text-emerald-500 font-bold text-xs uppercase">ทำเสร็จแล้ว</p><h3 className="text-3xl font-black text-emerald-600">{doneTasks}</h3></div>
        </div>
      </div>

      {/* 🛠️ MAIN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ซ้าย: BACKLOG (Brain Dump) */}
        <div className="lg:col-span-5 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col h-[700px]">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><i className="bi bi-inbox text-amber-500"></i> Brain Dump (งานที่รอทำ)</h2>
          
          {/* ฟอร์มเพิ่มงานไวๆ */}
          <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
            <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="พิมพ์งานที่แวบเข้ามาในหัว..." className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" />
            <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as any)} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-600">
              <option value="High">🔥 ด่วน</option><option value="Med">⚡ กลาง</option><option value="Low">🧊 ชิล</option>
            </select>
            <button type="submit" className="bg-slate-900 text-white w-14 rounded-2xl hover:bg-slate-800 active:scale-95 transition-all flex justify-center items-center text-xl"><i className="bi bi-plus-lg"></i></button>
          </form>

          {/* List งาน */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {tasks.filter(t => t.status === 'backlog').length === 0 && <div className="text-center text-slate-400 mt-10 font-bold">ไม่มีงานค้าง ยอดเยี่ยมมากบอส! 🎉</div>}
            {tasks.filter(t => t.status === 'backlog').map(task => (
              <div key={task.id} className="group p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-2xl transition-all shadow-sm flex items-center justify-between">
                <div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase mb-1 inline-block ${task.priority === 'High' ? 'bg-red-50 text-red-600' : task.priority === 'Med' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{task.priority}</span>
                  <p className="font-bold text-slate-700 text-sm">{task.title}</p>
                </div>
                <button onClick={() => openScheduleModal(task)} className="opacity-0 group-hover:opacity-100 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-600 hover:text-white transition-all">
                  <i className="bi bi-calendar-plus mr-1"></i> จัดลงวันนี้
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ขวา: TODAY'S TIMELINE */}
        <div className="lg:col-span-7 bg-slate-900 rounded-[2.5rem] shadow-xl p-8 flex flex-col h-[700px] relative overflow-hidden">
          {/* ลวดลาย BG ดำ */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <h2 className="text-xl font-black text-white mb-8 flex items-center gap-2 relative z-10"><i className="bi bi-calendar-check text-blue-400"></i> Today&apos;s Schedule (แผนของวันนี้)</h2>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative z-10">
            {todaysSchedule.length === 0 && <div className="text-center text-slate-500 mt-20 font-bold">ยังไม่ได้เลือกงานมาทำวันนี้ครับบอส.</div>}
            
            {/* กล่องตารางเวลา */}
            {todaysSchedule.map((task, index) => (
              <div key={task.id} className="flex gap-4 group">
                {/* เวลา */}
                <div className="w-20 text-right shrink-0 pt-3 border-r border-slate-700 pr-4">
                  <p className="text-white font-black text-lg leading-none">{task.startTime}</p>
                  <p className="text-slate-500 font-bold text-xs mt-1">{task.endTime}</p>
                </div>
                {/* กล่องงาน */}
                <div className="flex-1 bg-slate-800 border border-slate-700 p-5 rounded-2xl hover:border-blue-500 transition-colors flex justify-between items-center group-hover:bg-slate-800/80">
                  <div>
                    <p className="font-bold text-blue-100 text-[15px]">{task.title}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveToBacklog(task.id)} className="w-10 h-10 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center justify-center tooltip-trigger" title="ถอดออก"><i className="bi bi-x-lg"></i></button>
                    <button onClick={() => markAsDone(task.id)} className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center tooltip-trigger" title="งานเสร็จแล้ว!"><i className="bi bi-check-lg text-xl"></i></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ⏱️ MODAL: ตั้งเวลางาน */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-4"><i className="bi bi-clock-history"></i></div>
            <h3 className="text-xl font-black text-slate-800 mb-1">ตั้งเวลางาน</h3>
            <p className="text-slate-500 text-sm font-bold mb-6 truncate">{selectedTask?.title}</p>
            
            <form onSubmit={handleScheduleTask}>
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">เวลาเริ่ม</label>
                  <input type="time" required value={timeForm.start} onChange={e => setTimeForm({...timeForm, start: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="text-slate-300 font-black pt-6">-</div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">เวลาจบ</label>
                  <input type="time" required value={timeForm.end} onChange={e => setTimeForm({...timeForm, end: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-black bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30">จัดลงตาราง</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* สไตล์ Scrollbar ซ่อนไว้ */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
      `}} />
    </div>
  );
}
