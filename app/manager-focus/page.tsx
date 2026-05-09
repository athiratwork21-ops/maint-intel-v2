"use client";
import React, { useState } from 'react';

// ==========================================
// 🛡️ โครงสร้างข้อมูล
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
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'ตรวจอนุมัติ P/O อะไหล่ประจำเดือน', priority: 'High', status: 'backlog' },
    { id: '2', title: 'ประชุมทีมช่างซ่อมบำรุง (Weekly)', priority: 'Med', status: 'backlog' },
    { id: '3', title: 'สรุป Report แจ้งซ่อมของ Line A', priority: 'High', status: 'planned', startTime: '10:00', endTime: '11:30' },
    { id: '4', title: 'เซ็นเอกสาร OT พนักงาน', priority: 'Low', status: 'done', startTime: '08:30', endTime: '09:00' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [timeForm, setTimeForm] = useState({ start: '09:00', end: '10:00' });

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Med' | 'Low'>('Med');

  // 📊 คำนวณ Dashboard
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const backlogTasks = tasks.filter(t => t.status === 'backlog').length;
  const plannedTasks = tasks.filter(t => t.status === 'planned').length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  // ⚙️ ฟังก์ชันจัดการงาน
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

  const markAsDone = (id: string) => { setTasks(tasks.map(t => t.id === id ? { ...t, status: 'done' } : t)); };
  const moveToBacklog = (id: string) => { setTasks(tasks.map(t => t.id === id ? { ...t, status: 'backlog', startTime: undefined, endTime: undefined } : t)); };

  const todaysSchedule = tasks.filter(t => t.status === 'planned').sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  return (
    // 🔒 ล็อคหน้าจอด้วย h-screen และ overflow-hidden + antialiased ให้ฟอนต์เนียน
    <div className="h-screen bg-[#F8FAFC] font-sans antialiased p-6 flex flex-col overflow-hidden">
      
      {/* 🌟 HEADER (shrink-0 ป้องกันการโดนบีบ) */}
      <header className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Executive Planner</h1>
          <p className="text-slate-500 font-medium mt-1"><i className="bi bi-calendar-event mr-2"></i>{new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Daily Progress</p>
          <div className="flex items-center gap-3">
            <div className="w-48 h-2.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <span className="font-bold text-slate-700">{progressPercent}%</span>
          </div>
        </div>
      </header>

      {/* 📊 DASHBOARD CARDS (shrink-0) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center text-xl border border-slate-100"><i className="bi bi-card-list"></i></div>
          <div><p className="text-slate-400 font-semibold text-[10px] tracking-wider uppercase">All Tasks</p><h3 className="text-2xl font-bold text-slate-800 leading-none mt-1">{totalTasks}</h3></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-xl border border-amber-100/50"><i className="bi bi-inbox-fill"></i></div>
          <div><p className="text-amber-500 font-semibold text-[10px] tracking-wider uppercase">Backlog</p><h3 className="text-2xl font-bold text-amber-600 leading-none mt-1">{backlogTasks}</h3></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center text-xl border border-blue-100/50"><i className="bi bi-clock-history"></i></div>
          <div><p className="text-blue-500 font-semibold text-[10px] tracking-wider uppercase">Planned</p><h3 className="text-2xl font-bold text-blue-600 leading-none mt-1">{plannedTasks}</h3></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-xl border border-emerald-100/50"><i className="bi bi-check-circle-fill"></i></div>
          <div><p className="text-emerald-500 font-semibold text-[10px] tracking-wider uppercase">Completed</p><h3 className="text-2xl font-bold text-emerald-600 leading-none mt-1">{doneTasks}</h3></div>
        </div>
      </div>

      {/* 🛠️ MAIN WORKSPACE (flex-1 min-h-0 ให้พื้นที่ที่เหลือขยายเต็ม และ Scroll ได้) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ซ้าย: BACKLOG */}
        <div className="lg:col-span-5 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-6 flex flex-col h-full">
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2 tracking-tight"><i className="bi bi-inbox text-amber-500"></i> Brain Dump</h2>
          
          {/* ฟอร์มเพิ่มงาน */}
          <form onSubmit={handleAddTask} className="flex gap-2 mb-6 shrink-0">
            <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="เพิ่มงานด่วน..." className="flex-1 bg-white border border-slate-200 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all shadow-sm" />
            
            {/* 🎯 Dropdown แบบ Premium */}
            <div className="relative shrink-0">
              <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as any)} className="appearance-none bg-white border border-slate-200 p-3.5 pr-10 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-slate-600 cursor-pointer shadow-sm transition-all h-full">
                <option value="High">🔥 ด่วน</option><option value="Med">⚡ กลาง</option><option value="Low">🧊 ชิล</option>
              </select>
              <i className="bi bi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs font-bold"></i>
            </div>

            <button type="submit" className="bg-slate-900 text-white w-12 rounded-xl hover:bg-slate-800 active:scale-95 transition-all flex justify-center items-center text-lg shadow-sm"><i className="bi bi-plus-lg"></i></button>
          </form>

          {/* List งาน (Scrollable) */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {tasks.filter(t => t.status === 'backlog').length === 0 && <div className="text-center text-slate-400 mt-10 font-medium text-sm">ไม่มีงานค้าง ยอดเยี่ยมมากครับ! 🎉</div>}
            {tasks.filter(t => t.status === 'backlog').map(task => (
              <div key={task.id} className="group p-4 bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-blue-200 hover:shadow-sm rounded-xl transition-all flex items-center justify-between">
                <div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mb-1.5 inline-block ${task.priority === 'High' ? 'bg-red-100 text-red-600' : task.priority === 'Med' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-600'}`}>{task.priority}</span>
                  <p className="font-semibold text-slate-700 text-sm">{task.title}</p>
                </div>
                <button onClick={() => openScheduleModal(task)} className="opacity-0 group-hover:opacity-100 bg-white border border-blue-100 text-blue-600 px-3 py-1.5 rounded-lg font-semibold text-xs hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm">
                  <i className="bi bi-arrow-right-short text-lg leading-none"></i>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ขวา: TODAY'S TIMELINE */}
        <div className="lg:col-span-7 bg-slate-900 rounded-[2rem] shadow-xl p-6 md:p-8 flex flex-col h-full relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 relative z-10 tracking-tight"><i className="bi bi-calendar2-range text-blue-400"></i> Today&apos;s Schedule</h2>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative z-10">
            {todaysSchedule.length === 0 && <div className="text-center text-slate-400 mt-20 font-medium text-sm">ยังไม่ได้เลือกงานมาทำวันนี้ครับ.</div>}
            
            {todaysSchedule.map((task) => (
              <div key={task.id} className="flex gap-5 group">
                {/* เวลา */}
                <div className="w-20 text-right shrink-0 pt-3 border-r border-slate-700/50 pr-5">
                  <p className="text-white font-bold text-lg leading-none tracking-tight">{task.startTime}</p>
                  <p className="text-slate-400 font-medium text-[11px] mt-1">{task.endTime}</p>
                </div>
                {/* กล่องงาน */}
                <div className="flex-1 bg-slate-800/80 border border-slate-700/50 p-4 rounded-2xl hover:border-blue-500/50 transition-all flex justify-between items-center group-hover:bg-slate-800">
                  <div>
                    <p className="font-semibold text-slate-100 text-[14px]">{task.title}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveToBacklog(task.id)} className="w-8 h-8 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-white flex items-center justify-center transition-colors"><i className="bi bi-arrow-counterclockwise"></i></button>
                    <button onClick={() => markAsDone(task.id)} className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors"><i className="bi bi-check-lg"></i></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ⏱️ MODAL: ตั้งเวลางาน (คลีนๆ) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">กำหนดเวลา</h3>
            <p className="text-slate-500 text-sm font-medium mb-6 truncate">{selectedTask?.title}</p>
            
            <form onSubmit={handleScheduleTask}>
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Start Time</label>
                  <input type="time" required value={timeForm.start} onChange={e => setTimeForm({...timeForm, start: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
                <div className="text-slate-300 font-black pt-6">-</div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">End Time</label>
                  <input type="time" required value={timeForm.end} onChange={e => setTimeForm({...timeForm, end: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
                </div>
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-semibold text-slate-500 hover:bg-slate-50 transition-colors">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all active:scale-95">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* สไตล์ Scrollbar ซ่อนไว้ (เนียนๆ) */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
      `}} />
    </div>
  );
}
