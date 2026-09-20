import React from 'react';

// ประกาศว่า Component นี้ต้องการข้อมูลอะไรบ้าง (Props)
interface DashboardStatsCardsProps {
  isLoading: boolean;
  dashboardStats: {
    machines: number;
    parts: number;
    outOfStock: number;
    overdue: number;
  };
}

export default function DashboardStatsCards({ isLoading, dashboardStats }: DashboardStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6 flex-shrink-0">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default group">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"><i className="bi bi-robot"></i></div>
        <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Machines</p><p className="text-3xl font-black text-slate-800">{isLoading ? '-' : dashboardStats.machines}</p></div>
      </div>
      
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default group">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"><i className="bi bi-gear-fill"></i></div>
        <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Active Parts</p><p className="text-3xl font-black text-slate-800">{isLoading ? '-' : dashboardStats.parts}</p></div>
      </div>
      
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-50 flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default group">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"><i className="bi bi-exclamation-triangle-fill"></i></div>
        <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Out of Stock</p><p className="text-3xl font-black text-red-600">{isLoading ? '-' : dashboardStats.outOfStock}</p></div>
      </div>
      
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-50 flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default group">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"><i className="bi bi-x-circle-fill"></i></div>
        <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Overdue Jobs</p><p className="text-3xl font-black text-red-600">{isLoading ? '-' : dashboardStats.overdue}</p></div>
      </div>
    </div>
  );
}