import React from 'react';

interface HistoryTableProps {
  historyMonthFilter: string;
  setHistoryMonthFilter: (val: string) => void;
  fetchHistoryData: (dept: string) => void;
  isLoading: boolean;
  changeHistoryData: any[];
  consumables: any[];
  parts: any[];
  machines: any[];
  handleChangeReason: (recordId: string, newReason: string) => void;
  handleUndoTransaction: (record: any) => void;
}

export default function HistoryTable(props: HistoryTableProps) {
  const {
    historyMonthFilter, setHistoryMonthFilter, fetchHistoryData, isLoading,
    changeHistoryData, consumables, parts, machines, handleChangeReason, handleUndoTransaction
  } = props;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-slate-100 gap-4 flex-shrink-0">
        <div>
          <h2 className="font-bold text-slate-800 text-lg tracking-tight">History & Reversal</h2>
          <p className="text-xs text-slate-500 mt-1">ตรวจสอบประวัติ และแก้ไขสาเหตุเพื่อไม่ให้กระทบ MTBF</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
          <div className="relative">
            <input type="month" value={historyMonthFilter} onChange={(e) => setHistoryMonthFilter(e.target.value)} className="pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-700 shadow-sm" />
          </div>
          <button onClick={() => fetchHistoryData(localStorage.getItem('activeDepartment') || '')} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white shrink-0">
            <i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i>
          </button>
        </div>
      </div>

      <div className="overflow-auto flex-1 relative rounded-b-2xl bg-slate-50/30">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
            <tr className="text-slate-500 text-[11px] uppercase font-extrabold tracking-wider">
              <th className="py-4 px-6 w-32">Date</th>
              <th className="py-4 px-6">Machine Details</th>
              <th className="py-4 px-6">Part Details</th>
              <th className="py-4 px-4 text-center">Qty</th>
              <th className="py-4 px-6 w-48">Change Reason</th>
              <th className="py-4 px-6 text-center w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm bg-white">
            {changeHistoryData.map((row, idx) => {
              const isConsumable = row.PartID.startsWith('CSM-');
              const pName = isConsumable ? consumables.find(c => c.ItemID === row.PartID)?.ItemName || row.PartID : parts.find(p => p.PartID === row.PartID)?.PartName || row.PartID;
              const mName = machines.find(m => m.MachineID === row.MachineID)?.MachineName || row.MachineID;

              return (
                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors duration-200">
                  <td className="py-4 px-6 font-bold text-slate-600">{row.ChangeDate}</td>
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-800">{mName}</div>
                    <div className="text-[11px] text-slate-500 font-medium">ID: {row.MachineID}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-bold text-blue-700">{pName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Pos: {row.Position || '-'}</div>
                  </td>
                  <td className="py-4 px-4 text-center font-black text-slate-800">{row['Required Qty'] || 0}</td>
                  <td className="py-4 px-6">
                    <div className="relative">
                      <select
                        value={row.ReasonType}
                        onChange={(e) => handleChangeReason(row.RecordID, e.target.value)}
                        className={`w-full p-2 rounded-lg text-xs font-bold border outline-none appearance-none cursor-pointer transition-colors ${row.ReasonType === 'Normal Wear' ? 'bg-red-50 text-red-700 border-red-200' : row.ReasonType === 'Accident' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                      >
                        <option value="Normal Wear">Normal Wear</option>
                        <option value="Accident">Accident</option>
                        <option value="Improvement">Improvement</option>
                        <option value="Inspection-OK">Inspection-OK</option>
                        <option value="Consumable">Consumable (สิ้นเปลือง)</option>
                      </select>
                      <i className="bi bi-pencil-fill absolute right-3 top-1/2 -translate-y-1/2 text-opacity-50 text-[10px] pointer-events-none"></i>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button onClick={() => handleUndoTransaction(row)} className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 mx-auto">
                      <i className="bi bi-arrow-counterclockwise"></i> Undo
                    </button>
                  </td>
                </tr>
              );
            })}
            {changeHistoryData.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-slate-400 font-bold bg-slate-50/30">No history found for this month</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}