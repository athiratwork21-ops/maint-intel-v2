"use client";
import React from 'react';

// 🌟 สร้างรายชื่อเว็บที่เราอยากทำทางลัดไว้ตรงนี้ (เพิ่มกี่เว็บก็ได้ในอนาคต)
const externalApps = [
  {
    id: 1,
    name: 'Shift Roster Pro',
    description: 'ระบบจัดการตารางกะงานพนักงาน สลับกะ และคำนวณ OT อัตโนมัติ',
    icon: 'bi-calendar3',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    url: 'https://maintintelv2.vercel.app/employees',
    status: 'Active'
  },

  {
    id: 2,
    name: 'Shift Roster Viewer',
    description: 'ระบบดูการจัดการตารางกะงานพนักงาน',
    icon: 'bi-calendar3',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    url: 'https://maintintelv2.vercel.app/Viewer',
    status: 'Active'
  },
  // 💡 ถ้าอนาคตบอสทำเว็บอื่นเพิ่ม ก็เอามาก๊อปปี้ต่อท้ายตรงนี้ได้เลยครับ!
  /*
  {
    id: 2,
    name: 'Inventory Tracker',
    description: 'ระบบจัดการคลังอะไหล่และเบิกจ่าย',
    icon: 'bi-box-seam',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    url: 'https://...',
    status: 'In Progress'
  }
  */
];

export default function PortalsPage() {
  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      
      {/* 🌟 Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <i className="bi bi-grid-1x2-fill text-blue-600"></i> App Portals
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          ศูนย์รวมทางลัดสำหรับเข้าถึงแอปพลิเคชันและเครื่องมือภายนอก
        </p>
      </div>

      {/* 🌟 Grid ของ Card ทางลัด */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {externalApps.map((app) => (
          <a 
            key={app.id} 
            href={app.url} 
            target="_blank" // 🌟 สำคัญ: สั่งให้เปิดแท็บใหม่
            rel="noopener noreferrer" // 🌟 สำคัญ: เพื่อความปลอดภัยตอนเปิดลิงก์นอก
            className="block group"
          >
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 transform group-hover:-translate-y-1">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${app.bgColor} ${app.color}`}>
                  <i className={`bi ${app.icon}`}></i>
                </div>
                {app.status === 'Active' && (
                  <span className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                    Online
                  </span>
                )}
              </div>
              
              <h2 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
                {app.name}
              </h2>
              <p className="text-sm text-slate-500 line-clamp-2">
                {app.description}
              </p>

              <div className="mt-6 flex items-center text-sm font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0">
                Launch App <i className="bi bi-arrow-right-short ml-1 text-lg"></i>
              </div>
            </div>
          </a>
        ))}
      </div>

    </div>
  );
}
