import React from 'react';
import CustomDropdown from '../CustomDropdown';
import { DashboardReport } from '../../app/page'; // ดึง Type มาใช้

interface MaintenanceScheduleTableProps {
  isLoading: boolean;
  fetchAllData: () => void;
  linesMaster: any[];
  machines: any[];
  filterLine: string;
  setFilterLine: (val: string) => void;
  filterMachine: string;
  setFilterMachine: (val: string) => void;
  filteredScheduleData: DashboardReport[];
  handleMarkAsOrdered: (id: string, type: 'part' | 'consumable') => void;
  handleDismissAlert: (machineId: string, partId: string, partName: string) => void;
}

export default function MaintenanceScheduleTable({
  isLoading,
  fetchAllData,
  linesMaster,
  machines,
  filterLine,
  setFilterLine,
  filterMachine,
  setFilterMachine,
  filteredScheduleData,
  handleMarkAsOrdered,
  handleDismissAlert
}: MaintenanceScheduleTableProps) {

  // ย้ายฟังก์ชันสร้างป้ายสีๆ มาไว้ในนี้ด้วยเลย ไฟล์หลักจะได้โล่งๆ
  const renderStatusBadge = (report: DashboardReport) => {
    let badgeClass = ''; let icon = ''; let actionBtn = null;
    switch (report.status) {
      case 'NORMAL': badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'; icon = 'bi-check-circle-fill'; break;
      case 'IN STOCK': badgeClass = 'bg-blue-50 text-blue-700 border border-blue-200/50'; icon = 'bi-box-seam-fill'; break;
      case 'MONITORING': badgeClass = 'bg-slate-100 text-slate-600 border border-slate-200'; icon = 'bi-eye-fill'; break;
      case 'ORDER NOW': badgeClass = 'bg-amber-50 text-amber-700 border border-amber-300'; icon = 'bi-exclamation-circle-fill'; actionBtn = (<div className="flex gap-2 mt-2"> <button onClick={() => handleMarkAsOrdered(report.partId, 'part')} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 active:scale-95 transition-all shadow-sm w-max"><i className="bi bi-cart-check"></i> Mark as Ordered</button> <button onClick={() => handleDismissAlert(report.machineId, report.partId, report.partName)} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 active:scale-95 transition-all shadow-sm w-max"><i className="bi bi-eye-slash"></i> Monitor Only</button> </div>); break;
      case 'ORDERED': badgeClass = 'bg-purple-50 text-purple-700 border border-purple-300 shadow-sm'; icon = 'bi-truck'; actionBtn = (<div className="flex gap-2 mt-2"> <span className="text-[10px] font-bold text-purple-600 bg-white px-2 py-1 rounded border border-purple-100">Awaiting Delivery...</span></div>); break;
      case 'OVERDUE': badgeClass = 'bg-red-50 text-red-700 border border-red-300'; icon = 'bi-x-circle-fill'; actionBtn = (<div className="flex gap-2 mt-2"> <button onClick={() => handleMarkAsOrdered(report.partId, 'part')} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 active:scale-95 transition-all shadow-sm w-max"><i className="bi bi-cart-check"></i> Mark as Ordered (Urgent)</button> <button onClick={() => handleDismissAlert(report.machineId, report.partId, report.partName)} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 active:scale-95 transition-all shadow-sm w-max"><i className="bi bi-eye-slash"></i> Monitor Only</button> </div>); break;
      default: badgeClass = 'bg-slate-100 text-slate-800'; icon = 'bi-info-circle-fill';
    }
    return (<div className="flex flex-col"><span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold w-max shadow-sm ${badgeClass}`}><i className={`bi ${icon} text-sm`}></i> {report.status}</span>{actionBtn}</div>);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center p-6 border-b border-slate-100 bg-white gap-4 flex-shrink-0">
        <h2 className="font-bold text-slate-800 text-lg tracking-tight">Maintenance Schedule</h2>

        <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto">
          <div className="relative flex-1 xl:flex-none min-w-[150px]">
            <CustomDropdown
              value={filterLine}
              onChange={(val) => { setFilterLine(val); setFilterMachine(''); }}
              options={[
                { value: '', label: 'All Lines' },
                ...linesMaster.map(line => ({ value: line.LineName, label: line.LineName }))
              ]}
              placeholder="All Lines"
              iconClass="bi bi-funnel"
            />
          </div>
          <div className="relative flex-1 xl:flex-none min-w-[150px]">
            <CustomDropdown
              value={filterMachine}
              onChange={setFilterMachine}
              options={[
                { value: '', label: 'All Machines' },
                ...machines.filter(m => m.LineName === filterLine).map(m => ({ value: m.MachineID, label: m.MachineName }))
              ]}
              placeholder="All Machines"
              iconClass="bi bi-robot"
            />
          </div>
          <button onClick={fetchAllData} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white shrink-0">
            <i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i>
          </button>
        </div>
      </div>
      <div className="overflow-auto flex-1 relative rounded-b-2xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md shadow-sm">
            <tr className="text-slate-500 text-xs uppercase font-extrabold tracking-wider">
              <th className="py-5 px-6">Machine & Line</th>
              <th className="py-5 px-6">Part Info (MTBF)</th>
              <th className="py-5 px-6">Order Date</th>
              <th className="py-5 px-6">Due Date</th>
              <th className="py-5 px-6">Status & Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredScheduleData.map((row, idx) => (
              <tr key={idx} className={`border-b border-slate-50 hover:bg-blue-50/40 transition-colors duration-200 ${row.status === 'MONITORING' ? 'opacity-60 bg-slate-50/50 hover:bg-slate-100' : ''}`}>
                <td className="py-5 px-6 align-top">
                  <div className="font-bold text-slate-800 text-[15px]">{row.machine}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5"><i className="bi bi-geo-alt-fill text-blue-400"></i> {row.line}</div>
                </td>
                <td className="py-5 px-6 align-top">
                  <div className="font-bold text-slate-700">{row.partName}</div>
                  <div className="text-xs text-slate-400 mt-1.5">Req: <span className="text-blue-600 font-black">{row.reqQty}</span> pcs <span className="mx-1 opacity-30">|</span> MTBF: <span className="text-emerald-600 font-black">{row.mtbfDays}</span> d</div>
                </td>
                <td className="py-5 px-6 align-top font-bold text-blue-600">{row.orderDate}</td>
                <td className="py-5 px-6 align-top font-bold text-red-500">{row.dueDate}</td>
                <td className="py-5 px-6 align-top">{renderStatusBadge(row)}</td>
              </tr>
            ))}
            {filteredScheduleData.length === 0 && (<tr><td colSpan={5} className="py-10 text-center text-slate-400 font-bold">No schedule data available</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}