import React from 'react';

interface RequestQueueProps {
  isLoading: boolean;
  fetchAllData: () => void;
  requestGroups: any[];
  consumables: any[];
  parts: any[];
  machines: any[];
  stockData: any[];
  isProcessing: boolean;
  handleApproveGroup: (group: any) => void;
}

export default function RequestQueue(props: RequestQueueProps) {
  const {
    isLoading, fetchAllData, requestGroups, consumables, parts,
    machines, stockData, isProcessing, handleApproveGroup
  } = props;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
      <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-b border-slate-100 gap-4 flex-shrink-0">
        <h2 className="font-bold text-slate-800 text-lg tracking-tight">Request Queue</h2>
        <button onClick={fetchAllData} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white">
          <i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i>
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-6 bg-slate-50/50">
        {requestGroups.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-70">
            <i className="bi bi-inbox-fill text-6xl mb-4"></i>
            <p className="font-bold text-lg">No pending requests</p>
            <p className="text-sm">Mechanics can submit requests via mobile app</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {requestGroups.map((group: any, idx: number) => (
              <div key={idx} className="bg-white border border-blue-100 rounded-3xl p-6 shadow-lg shadow-blue-900/5 relative overflow-hidden group hover:border-blue-300 transition-colors flex flex-col h-full">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

                <div className="flex justify-between items-start mb-5 border-b border-slate-100 pb-4 shrink-0">
                  <div>
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200/50 mb-2"><i className="bi bi-hourglass-split"></i> Pending ({group.items.length} items)</span>
                    <h3 className="font-black text-slate-800 text-lg">{group.baseId}</h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium"><i className="bi bi-person-fill text-blue-500 mr-1"></i> Picker: <span className="text-slate-700 font-bold">{group.pickerName}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Request Time</p>
                    <p className="text-sm font-bold text-slate-600">{new Date(group.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6 flex-1 overflow-y-auto pr-2">
                  {group.items.map((req: any, i: number) => {
                    const isConsumable = req.PartID.startsWith('CSM-');
                    const partDetails = isConsumable ? consumables.find((c: any) => c.ItemID === req.PartID) || {} : parts.find((p: any) => p.PartID === req.PartID) || {};
                    const machineDetails = machines.find((m: any) => m.MachineID === req.MachineID) || {};
                    const stockInfo = isConsumable ? partDetails : stockData.find((s: any) => s.PartID === req.PartID) || {};

                    return (
                      <div key={i} className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex gap-4 items-center">
                        <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                          {partDetails.ImageURL ? <img src={partDetails.ImageURL} className="w-full h-full object-contain mix-blend-multiply p-1" /> : <i className="bi bi-image text-slate-300 text-2xl"></i>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-slate-800 text-sm truncate">{partDetails.PartName || partDetails.ItemName || req.PartID}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-600 font-medium bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm"><span className="text-slate-400 mr-1">ID:</span>{req.PartID}</span>
                            {(partDetails.PartModel || partDetails.ItemModel) && <span className="text-[10px] text-slate-600 font-medium bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm"><span className="text-slate-400 mr-1">Model:</span>{partDetails.PartModel || partDetails.ItemModel}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {!isConsumable && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded"><i className="bi bi-robot mr-1"></i>{machineDetails.MachineName || req.MachineID}</span>}
                            {isConsumable && <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded"><i className="bi bi-box2-heart mr-1"></i>Consumable</span>}
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded"><i className="bi bi-geo-alt-fill mr-1"></i>Loc: {stockInfo.Location || 'N/A'}</span>

                            {!isConsumable && req.Position && req.Position !== '-' && (
                              <span className="text-[10px] text-slate-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shadow-sm"><span className="text-amber-600 mr-1"><i className="bi bi-geo-alt-fill"></i> Pos:</span>{req.Position}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-center shrink-0 border-l border-slate-200 pl-4 pr-2 flex flex-col justify-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantity</p>
                          <p className="text-xl font-black text-blue-600">{req.Qty}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <button onClick={() => handleApproveGroup(group)} disabled={isProcessing} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/30 flex justify-center items-center gap-2 shrink-0">
                  {isProcessing ? <><i className="bi bi-arrow-repeat animate-spin text-lg"></i> Processing...</> : <><i className="bi bi-check-circle-fill text-lg"></i> Approve & Deduct Stock</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}