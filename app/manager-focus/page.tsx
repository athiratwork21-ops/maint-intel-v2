"use client";
import React, { useState, useRef, useEffect } from 'react';

// ==========================================
// 🛡️ โครงสร้างข้อมูล
// ==========================================
interface Task {
  id: string;
  title: string;
  priority: 'High' | 'Med' | 'Low';
  status: 'backlog' | 'planned' | 'done';
  dueDate?: string; 
  startTime?: string;
}

// 🗓️ ฟังก์ชันหาค่าวันที่ล่วงหน้า (YYYY-MM-DD)
const getOffsetDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 🗓️ ฟังก์ชันแปลงวันที่ให้เป็นภาษาคน (บนปุ่ม Dropdown)
const formatDisplayDate = (dateString: string) => {
  if (!dateString) return 'ไม่มีกำหนด';
  if (dateString === getOffsetDate(0)) return 'วันนี้';
  if (dateString === getOffsetDate(1)) return 'พรุ่งนี้';
  return new Date(dateString).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};

export default function ManagerFocusDashboard() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'ตรวจอนุมัติ P/O อะไหล่ประจำเดือน', priority: 'High', status: 'backlog', dueDate: getOffsetDate(0) },
    { id: '2', title: 'ประชุมทีมช่างซ่อมบำรุง (Weekly)', priority: 'Med', status: 'backlog', dueDate: getOffsetDate(2) },
    { id: '3', title: 'สั่งซื้อเครื่องจักรใหม่ Line B', priority: 'High', status: 'backlog', dueDate: getOffsetDate(-2) }, // เลยกำหนด
    { id: '4', title: 'สรุป Report แจ้งซ่อม', priority: 'High', status: 'planned', startTime: '10:00' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [startTime, setStartTime] = useState('09:00');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Med' | 'Low'>('Med');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  
  // State สำหรับคุม Custom Dropdown ทั้ง 2 ตัว
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);
  const priorityRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  // ปิด Dropdown เมื่อคลิกที่อื่น
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (priorityRef.current && !priorityRef.current.contains(event.target as Node)) setIsPriorityOpen(false);
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) setIsDateOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 📊 คำนวณ Dashboard
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const backlogTasks = tasks.filter(t => t.status === 'backlog').length;
  const plannedTasks = tasks.filter(t => t.status === 'planned').length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  // 🗓️ ฟังก์ชันคำนวณสถานะ Deadline เพื่อแสดงป้ายสี และใช้เรียงลำดับ
  const getDeadlineStatus = (dueDate?: string) => {
    if (!dueDate) return { label: 'ไม่มีกำหนด', color: 'text-slate-400 bg-slate-50 border-slate-100', level: 99 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dueDate);
    target.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'เลยกำหนด!', color: 'text-red-600 bg-red-50 border-red-200 animate-pulse', level: 1 };
    if (diffDays === 0) return { label: 'ต้องเสร็จวันนี้!', color: 'text-orange-600 bg-orange-50 border-orange-200', level: 2 };
    if (diffDays <= 2) return { label: `อีก ${diffDays} วัน`, color: 'text-amber-600 bg-amber-50 border-amber-200', level: 3 };
    return { label: `ใน ${diffDays} วัน`, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', level: 4 };
  };

  // ⚙️ ฟังก์ชันจัดการงาน
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: Task = { 
      id: Date.now().toString(), 
      title: newTaskTitle, 
      priority: newTaskPriority, 
      dueDate: newTaskDueDate || undefined,
      status: 'backlog' 
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setIsPriorityOpen(false);
    setIsDateOpen(false);
  };

  const openScheduleModal = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleScheduleTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, status: 'planned', startTime: startTime } : t));
    setIsModalOpen(false);
  };

  const markAsDone = (id: string) => { setTasks(tasks.map(t => t.id === id ? { ...t, status: 'done' } : t)); };
  const moveToBacklog = (id: string) => { setTasks(tasks.map(t => t.id === id ? { ...t, status: 'backlog', startTime: undefined } : t)); };

  // 🔀 เรียงงานใน Backlog ตาม Deadline Level (ใกล้หมดเวลาขึ้นก่อน)
  const sortedBacklog = tasks
    .filter(t => t.status === 'backlog')
    .sort((a, b) => getDeadlineStatus(a.dueDate).level - getDeadlineStatus(b.dueDate).level);

  const todaysSchedule = tasks.filter(t => t.status === 'planned').sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // ตัวแปรสำหรับ Custom Dropdown
  const priorityOptions = [
    { value: 'High', label: 'ด่วน', icon: '🔥', color: 'text-red-500 bg-red-50' },
    { value: 'Med', label: 'กลาง', icon: '⚡', color: 'text-amber-500 bg-amber-50' },
    { value: 'Low', label: 'ชิล', icon: '🧊', color: 'text-blue-500 bg-blue-50' }
  ];
  const currentPriority = priorityOptions.find(p => p.value === newTaskPriority);

  return (
    <div className="h-screen bg-[#F8FAFC] font-sans antialiased p-6 flex flex-col overflow-hidden">
      
      {/* 🌟 HEADER */}
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

      {/* 📊 DASHBOARD CARDS */}
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

      {/* 🛠️ MAIN WORKSPACE */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ซ้าย: BACKLOG */}
        <div className="lg:col-span-6 xl:col-span-5 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-6 flex flex-col h-full">
          <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2 tracking-tight"><i className="bi bi-inbox text-amber-500"></i> Brain Dump</h2>
          
          {/* ฟอร์มเพิ่มงาน */}
          <form onSubmit={handleAddTask} className="flex flex-col gap-3 mb-6 shrink-0 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
            <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="เพิ่มงานด่วน..." className="w-full bg-white border border-slate-200 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all shadow-sm" />
            
            <div className="flex gap-2 relative">
              
              {/* 📅 Custom Dropdown (วันที่/Deadline) */}
              <div className="relative flex-1" ref={dateRef}>
                <button type="button" onClick={() => setIsDateOpen(!isDateOpen)} className="w-full bg-white border border-slate-200 p-3.5 rounded-xl text-sm font-semibold flex items-center justify-between shadow-sm hover:border-slate-300 transition-all text-slate-600">
                  <span className="flex items-center gap-2">
                    <i className={`bi bi-calendar-event ${newTaskDueDate ? 'text-blue-500' : 'text-slate-400'}`}></i> 
                    {formatDisplayDate(newTaskDueDate)}
                  </span>
                  <i className="bi bi-chevron-down text-[10px] text-slate-400"></i>
                </button>
                
                {isDateOpen && (
                  <div className="absolute top-full left-0 w-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                    <button type="button" onClick={() => { setNewTaskDueDate(''); setIsDateOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-50">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs bg-slate-100 text-slate-500"><i className="bi bi-dash-lg"></i></span> ไม่มีกำหนด
                    </button>
                    <button type="button" onClick={() => { setNewTaskDueDate(getOffsetDate(0)); setIsDateOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-50">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs bg-red-50 text-red-600"><i className="bi bi-exclamation-circle"></i></span> วันนี้
                    </button>
                    <button type="button" onClick={() => { setNewTaskDueDate(getOffsetDate(1)); setIsDateOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-50">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs bg-amber-50 text-amber-600"><i className="bi bi-brightness-high"></i></span> พรุ่งนี้
                    </button>
                    <button type="button" onClick={() => { setNewTaskDueDate(getOffsetDate(7)); setIsDateOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-50">
                      <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs bg-blue-50 text-blue-600"><i className="bi bi-calendar-week"></i></span> สัปดาห์หน้า
                    </button>
                    <div className="p-2.5 bg-slate-50/50">
                       <input type="date" value={newTaskDueDate} onChange={e => { setNewTaskDueDate(e.target.value); setIsDateOpen(false); }} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-[13px] font-bold text-slate-600 outline-none focus:border-blue-500 shadow-sm cursor-pointer" />
                    </div>
                  </div>
                )}
              </div>

              {/* 🎯 Custom Dropdown (ความด่วน) */}
              <div className="relative w-[120px] shrink-0" ref={priorityRef}>
                <button type="button" onClick={() => setIsPriorityOpen(!isPriorityOpen)} className="w-full bg-white border border-slate-200 p-3.5 rounded-xl text-sm font-semibold flex items-center justify-between shadow-sm hover:border-slate-300 transition-all">
                  <span className="flex items-center gap-2">{currentPriority?.icon} {currentPriority?.label}</span>
                  <i className="bi bi-chevron-down text-[10px] text-slate-400"></i>
                </button>
                
                {isPriorityOpen && (
                  <div className="absolute top-full left-0 w-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                    {priorityOptions.map(option => (
                      <button key={option.value} type="button" onClick={() => { setNewTaskPriority(option.value as any); setIsPriorityOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 border-b border-slate-50 last:border-0">
                        <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${option.color}`}>{option.icon}</span> {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="bg-slate-900 text-white w-[52px] shrink-0 rounded-xl hover:bg-slate-800 active:scale-95 transition-all flex justify-center items-center text-lg shadow-sm"><i className="bi bi-plus-lg"></i></button>
            </div>
          </form>

          {/* List งาน (Scrollable & Sorted) */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {sortedBacklog.length === 0 && <div className="text-center text-slate-400 mt-10 font-medium text-sm">ไม่มีงานค้าง ยอดเยี่ยมมากครับ! 🎉</div>}
            
            {sortedBacklog.map(task => {
              const deadline = getDeadlineStatus(task.dueDate);
              return (
                <div key={task.id} className="group p-4 bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-2xl transition-all flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${task.priority === 'High' ? 'bg-red-100 text-red-600' : task.priority === 'Med' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{task.priority}</span>
                      
                      {/* ⏳ ป้ายบอกสถานะ Deadline */}
                      {task.dueDate && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${deadline.color}`}>
                          <i className="bi bi-clock"></i> {deadline.label}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-700 text-sm leading-snug">{task.title}</p>
                  </div>
                  <button onClick={() => openScheduleModal(task)} className="shrink-0 opacity-0 group-hover:opacity-100 bg-white border border-blue-100 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm">
                    <i className="bi bi-arrow-right-short"></i>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ขวา: TODAY'S TIMELINE */}
        <div className="lg:col-span-6 xl:col-span-7 bg-slate-900 rounded-[2rem] shadow-xl p-6 md:p-8 flex flex-col h-full relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <h2 className="text-lg font-bold text-white mb-8 flex items-center gap-2 relative z-10 tracking-tight"><i className="bi bi-calendar2-range text-blue-400"></i> Today&apos;s Schedule</h2>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative z-10">
            {todaysSchedule.length === 0 && <div className="text-center text-slate-400 mt-20 font-medium text-sm">ยังไม่ได้เลือกงานมาทำวันนี้ครับ.</div>}
            
            {todaysSchedule.map((task) => (
              <div key={task.id} className="flex gap-5 group">
                {/* ⏱️ เวลา (โชว์แค่ Start Time) */}
                <div className="w-16 text-right shrink-0 pt-4 border-r border-slate-700/50 pr-4">
                  <p className="text-white font-bold text-lg leading-none tracking-tight">{task.startTime}</p>
                </div>
                {/* กล่องงาน */}
                <div className="flex-1 bg-slate-800/80 border border-slate-700/50 p-4 rounded-2xl hover:border-blue-500/50 transition-all flex justify-between items-center group-hover:bg-slate-800 shadow-sm">
                  <div>
                    <p className="font-semibold text-slate-100 text-[14px]">{task.title}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveToBacklog(task.id)} className="w-8 h-8 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-white flex items-center justify-center transition-colors tooltip-trigger" title="ถอดออก"><i className="bi bi-arrow-counterclockwise"></i></button>
                    <button onClick={() => markAsDone(task.id)} className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors tooltip-trigger" title="เสร็จแล้ว!"><i className="bi bi-check-lg"></i></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ⏱️ MODAL: ตั้งเวลาเริ่มงาน */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-1 tracking-tight">เลือกเวลาเริ่มงาน</h3>
            <p className="text-slate-500 text-sm font-medium mb-6 truncate">{selectedTask?.title}</p>
            
            <form onSubmit={handleScheduleTask}>
              <div className="mb-8 relative">
                <i className="bi bi-clock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 pl-12 rounded-xl font-black text-xl text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center" />
              </div>
              
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl font-semibold text-slate-500 hover:bg-slate-50 transition-colors">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-md transition-all active:scale-95">จัดลงตาราง</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* สไตล์ Scrollbar & ซ่อนไอคอนปฏิทินของ Input Date */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #94a3b8; }
        
        input[type="date"]::-webkit-inner-spin-button,
        input[type="date"]::-webkit-calendar-picker-indicator {
            display: none;
            -webkit-appearance: none;
        }
      `}} />
    </div>
  );
}
