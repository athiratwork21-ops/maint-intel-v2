import React from 'react';

interface CurrentStockTableProps {
  isLoading: boolean;
  fetchAllData: () => void;
  handleExportCSV: () => void;
  handleImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  openNewPartModal: () => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filteredStockData: any[];
  stockAllocations: any;
  parts: any[];
  pendingRequests: any[];
  machines: any[];
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
  openActionModal: (type: 'receive' | 'reduce' | 'leadTime' | 'edit', partId: string, partName: string) => void;
  openMoveCategory: (source: 'part' | 'consumable', itemId: string) => void;
  handleDeletePart: (partId: string, partName: string) => void;
  setZoomedImage: (url: string | null) => void;
  handleMarkAsOrdered: (id: string, type: 'part' | 'consumable') => void;
}

export default function CurrentStockTable(props: CurrentStockTableProps) {
  const {
    isLoading, fetchAllData, handleExportCSV, handleImportCSV, openNewPartModal,
    searchQuery, setSearchQuery, filteredStockData, stockAllocations, parts,
    pendingRequests, machines, openDropdownId, setOpenDropdownId, openActionModal,
    openMoveCategory, handleDeletePart, setZoomedImage, handleMarkAsOrdered
  } = props;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-b border-slate-100 gap-4 flex-shrink-0">
        <h2 className="font-bold text-slate-800 text-lg tracking-tight">Real-time Stock Allocations</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={fetchAllData} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white"><i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i></button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 text-sm border border-emerald-500 text-emerald-600 rounded-xl hover:bg-emerald-50 active:scale-95 transition-all shadow-sm font-bold bg-white"><i className="bi bi-file-earmark-excel"></i> Export CSV</button>
          <input type="file" accept=".csv" id="csv-upload" className="hidden" onChange={handleImportCSV} />
          <label htmlFor="csv-upload" className="flex items-center gap-2 px-4 py-2.5 text-sm border border-emerald-500 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 active:scale-95 transition-all shadow-sm font-bold cursor-pointer ml-2">
            <i className="bi bi-cloud-arrow-up-fill"></i> Import PR Status
          </label>
          <button onClick={openNewPartModal} className="flex items-center gap-2 px-5 py-2.5 text-sm bg-slate-900 text-white rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-md shadow-slate-900/20 font-bold ml-2"><i className="bi bi-plus-lg"></i> New Part</button>
        </div>
      </div>
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
        <div className="relative max-w-md">
          <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" placeholder="Search part name, model, or location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all" />
        </div>
      </div>

      <div className="overflow-auto flex-1 relative pb-12 rounded-b-2xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md shadow-sm">
            <tr className="text-slate-500 text-xs uppercase font-extrabold tracking-wider">
              <th className="py-5 px-4 text-center w-16">Action</th>
              <th className="py-5 px-6">Location</th>
              <th className="py-5 px-6 text-center w-24">Image</th>
              <th className="py-5 px-6 w-[30%]">Part Details</th>
              <th className="py-5 px-6 border-l border-slate-200/50 bg-slate-100/50">Physical</th>
              <th className="py-5 px-6 bg-red-50/30 text-red-700">Reserved</th>
              <th className="py-5 px-6 bg-emerald-50/30 text-emerald-700">Available</th>
              <th className="py-5 px-6 text-center w-32">Order Status</th>
              <th className="py-5 px-6 text-center text-blue-600 w-24">P/N</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredStockData.map((row, idx) => {
              const alloc = stockAllocations[row.PartID] || { physical: row.Balance, reserved: 0, available: row.Balance, machines: [] };
              const partDetails = parts.find(p => p.PartID === row.PartID) || {};

              const reqs = pendingRequests.filter(r => r.PartID === row.PartID);
              const mechanicReqQty = reqs.reduce((sum, r) => sum + (r.Qty || 0), 0);
              const totalReserved = alloc.reserved + mechanicReqQty;
              const finalAvailable = alloc.available - mechanicReqQty;

              const reservedMachineNames = alloc.machines.map((mId: string) => {
                const m = machines.find(x => x.MachineID === mId);
                return m ? `${m.MachineName} (${m.LineName})` : mId;
              });

              return (
                <tr key={idx} className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors duration-200 group">
                  <td className="py-4 px-4 text-center relative border-r border-slate-50">
                    <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === row.PartID ? null : row.PartID); }} className="w-9 h-9 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-all active:scale-95 mx-auto"><i className="bi bi-list text-2xl"></i></button>
                    {openDropdownId === row.PartID && (
                      <div className="absolute left-14 top-2 w-56 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-left ring-1 ring-slate-900/5">
                        <button onClick={() => openActionModal('receive', row.PartID, partDetails.PartName || row.PartName)} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-box-arrow-in-down-right text-lg"></i> Receive Stock</button>
                        <button onClick={() => openActionModal('reduce', row.PartID, partDetails.PartName || row.PartName)} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-box-arrow-up-right text-lg"></i> Adjust Stock</button>
                        <button onClick={() => openActionModal('leadTime', row.PartID, partDetails.PartName || row.PartName)} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-clock-history text-lg"></i> Update Lead Time</button>
                        <div className="h-px bg-slate-100 my-1 mx-4"></div>
                        <button onClick={() => openActionModal('edit', row.PartID, partDetails.PartName || row.PartName)} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-pencil-square text-lg"></i> Edit Part Info</button>

                        <div className="h-px bg-slate-100 my-1 mx-4"></div>
                        <button onClick={() => openMoveCategory('part', row.PartID)} className="w-full px-5 py-3 text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-arrow-left-right text-lg"></i> Move to Consumables</button>

                        <div className="h-px bg-slate-100 my-1 mx-4"></div>
                        <button onClick={() => handleDeletePart(row.PartID, partDetails.PartName || row.PartName)} className="w-full px-5 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-trash3-fill text-lg"></i> Delete Part</button>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 font-bold text-slate-800"><i className="bi bi-geo-alt-fill text-blue-500 mr-2 opacity-80"></i>{row.Location || '-'}</td>
                  <td className="py-4 px-6 text-center">
                    {partDetails.ImageURL ? (
                      <div className="w-16 h-12 flex items-center justify-center mx-auto cursor-zoom-in hover:scale-110 transition-transform" onClick={() => setZoomedImage(partDetails.ImageURL)}>
                        <img src={partDetails.ImageURL} alt={partDetails.PartName} className="w-full h-full object-contain mix-blend-multiply" />
                      </div>
                    ) : (
                      <div className="w-16 h-12 flex items-center justify-center mx-auto text-slate-300">
                        <i className="bi bi-image text-xl"></i>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-800 text-[14px]">{partDetails.PartName || row.PartName}</div>
                    <div className="text-[12px] text-slate-500 mt-0.5"><span className="uppercase tracking-wider mr-1 text-[10px]">Model:</span> {partDetails.PartModel || '-'}</div>
                  </td>
                  <td className="py-4 px-6 border-l border-slate-100 bg-slate-50/20 font-bold text-slate-700 text-[13px] align-top pt-5">{row.Balance !== null ? row.Balance : 0} Pcs</td>

                  <td className="py-4 px-6 bg-red-50/10 align-top pt-4">
                    <span className={`px-2.5 py-1 rounded-md text-[13px] font-bold block w-max mb-2 ${totalReserved > 0 ? 'bg-red-100 text-red-600' : 'text-slate-400'}`}>
                      {totalReserved} Pcs
                    </span>
                    {reservedMachineNames.length > 0 && (
                      <div className="text-[10px] text-red-500 font-bold leading-tight">
                        <i className="bi bi-robot mr-1"></i>Reserved for: {reservedMachineNames.join(', ')}
                      </div>
                    )}
                    {reqs.length > 0 && (
                      <div className="text-[10px] text-amber-600 font-bold mt-1 leading-tight">
                        <i className="bi bi-person-fill mr-1"></i>Pending requests: {mechanicReqQty} Pcs
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 bg-emerald-50/10 align-top pt-5"><span className={`px-3 py-1.5 rounded-full text-[13px] font-bold shadow-sm ${finalAvailable <= 0 ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}>{finalAvailable} Pcs</span></td>
                  <td className="py-4 px-6 align-top pt-4 text-center border-l border-slate-50">
                    {partDetails.PendingOrder ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-sm w-full justify-center">
                        <i className="bi bi-truck"></i> ORDERED
                      </span>
                    ) : (
                      <button onClick={() => handleMarkAsOrdered(row.PartID, 'part')} className="inline-flex items-center justify-center w-full gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold bg-white text-slate-500 border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-all shadow-sm active:scale-95">
                        <i className="bi bi-cart-plus"></i> Mark Order
                      </button>
                    )}
                  </td>
                  <td className="py-4 px-6 text-[13px] font-black text-blue-600 align-top pt-5 text-center tracking-wider border-l border-slate-100 bg-blue-50/30">
                    {partDetails.PartNumber || '-'}
                  </td>
                </tr>
              );
            })}
            {filteredStockData.length === 0 && (<tr><td colSpan={9} className="py-10 text-center text-slate-400 font-bold">No data available</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}