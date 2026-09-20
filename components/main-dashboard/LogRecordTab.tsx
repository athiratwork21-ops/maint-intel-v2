import React from 'react';

interface LogRecordTabProps {
  handleLogRecord: (e: React.FormEvent<HTMLFormElement>) => void;
  machines: any[];
  parts: any[];
}

export default function LogRecordTab(props: LogRecordTabProps) {
  const { handleLogRecord, machines, parts } = props;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-10 flex flex-col">
      <h3 className="text-2xl font-black text-slate-800 mb-8 border-b border-slate-100 pb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <i className="bi bi-tools"></i>
        </div> 
        Manual Record Replacement
      </h3>
      <form className="space-y-8" onSubmit={handleLogRecord}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">1. Machine</label>
            <div className="relative">
              <input type="text" name="machineId" list="machine-list" required placeholder="-- Type to search machine --" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm transition-all focus:bg-white" />
              <i className="bi bi-search absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
            <datalist id="machine-list">
              {machines.map((m: any) => <option key={m.MachineID} value={`${m.MachineID} - ${m.MachineName}`} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">2. Part Name</label>
            <div className="relative">
              <input type="text" name="partId" list="part-list" required placeholder="-- Type to search part --" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm transition-all focus:bg-white" />
              <i className="bi bi-search absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            </div>
            <datalist id="part-list">
              {parts.map((p: any) => <option key={p.PartID} value={`${p.PartID} - ${p.PartName} ${p.PartModel ? `(${p.PartModel})` : ''}`} />)}
            </datalist>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div><label className="block text-xs font-bold text-slate-600 mb-2 uppercase">3. Request Qty</label><input type="number" name="qty" min="1" required defaultValue="1" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm transition-all focus:bg-white" /></div>
          <div><label className="block text-xs font-bold text-slate-600 mb-2 uppercase">4. Picker Name</label><input type="text" name="picker" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm transition-all focus:bg-white" /></div>
          <div><label className="block text-xs font-bold text-slate-600 mb-2 uppercase">5. Change Date</label><input type="date" name="date" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 font-medium transition-colors focus:bg-white" /></div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">6. Reason for Replacement</label>
          <div className="relative">
            <select name="reason" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm transition-all focus:bg-white appearance-none">
              <option value="Normal Wear">Normal Wear - Track lifespan</option>
              <option value="Accident">Accident - Reset without averaging</option>
              <option value="Improvement">Improvement - Reset lifespan</option>
            </select>
            <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          </div>
        </div>
        <button type="submit" className="w-full mt-4 bg-blue-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all text-lg"><i className="bi bi-save2 mr-2"></i>Save & Deduct Stock</button>
      </form>
    </div>
  );
}