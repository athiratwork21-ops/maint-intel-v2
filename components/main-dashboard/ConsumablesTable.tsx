import React from 'react';

interface ConsumablesTableProps {
  isLoading: boolean;
  fetchAllData: () => void;
  setNewConsumableModalOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filteredConsumables: any[];
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
  setSelectedConsumable: (item: any) => void;
  setReceiveConsumableOpen: (open: boolean) => void;
  setReduceConsumableOpen: (open: boolean) => void;
  setEditingConsumableData: (item: any) => void;
  setPreviewImage: (url: string | null) => void;
  setEditConsumableOpen: (open: boolean) => void;
  openMoveCategory: (source: 'part' | 'consumable', itemId: string) => void;
  handleDeleteConsumable: (itemId: string, itemName: string) => void;
  setZoomedImage: (url: string | null) => void;
  handleMarkAsOrdered: (id: string, type: 'part' | 'consumable') => void;
}

export default function ConsumablesTable(props: ConsumablesTableProps) {
  const {
    isLoading, fetchAllData, setNewConsumableModalOpen, searchQuery, setSearchQuery,
    filteredConsumables, openDropdownId, setOpenDropdownId, setSelectedConsumable,
    setReceiveConsumableOpen, setReduceConsumableOpen, setEditingConsumableData,
    setPreviewImage, setEditConsumableOpen, openMoveCategory, handleDeleteConsumable,
    setZoomedImage, handleMarkAsOrdered
  } = props;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-b border-slate-100 gap-4 flex-shrink-0">
        <h2 className="font-bold text-slate-800 text-lg tracking-tight">Consumables Inventory</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={fetchAllData} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white"><i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i></button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          <button onClick={() => setNewConsumableModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm bg-pink-600 text-white rounded-xl hover:bg-pink-700 active:scale-95 transition-all shadow-md shadow-pink-600/20 font-bold ml-2"><i className="bi bi-plus-lg"></i> Add Item</button>
        </div>
      </div>
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
        <div className="relative max-w-md">
          <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" placeholder="Search item name, P/N, or location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-sm shadow-sm transition-all" />
        </div>
      </div>

      <div className="overflow-auto flex-1 relative pb-12 rounded-b-2xl">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md shadow-sm">
            <tr className="text-slate-500 text-[11px] uppercase font-extrabold tracking-wider">
              <th className="py-4 px-4 text-center w-16">Action</th>
              <th className="py-4 px-6">Location</th>
              <th className="py-4 px-6 text-center w-20">Image</th>
              <th className="py-4 pl-6 pr-2">Item Name</th>
              <th className="py-4 px-2">Model</th>
              <th className="py-4 px-4 text-center">Min (ROP)</th>
              <th className="py-4 px-4 text-center">Safety</th>
              <th className="py-4 px-4 text-center">Max</th>
              <th className="py-4 px-6 border-l border-slate-200/50 bg-slate-100/50 text-center">Current Balance</th>
              <th className="py-4 px-6 text-center">Status</th>
              <th className="py-4 px-6 text-center text-blue-600 w-24">P/N</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredConsumables.map((item, idx) => {
              const safety = item.SafetyStock || 0;
              const min = item.MinQty || 0;
              const rop = min + safety;

              const isCritical = item.Balance <= safety;
              const isReorder = item.Balance <= rop && !isCritical;

              return (
                <tr key={idx} className="border-b border-slate-50 hover:bg-pink-50/40 transition-colors duration-200 group">
                  <td className="py-3 px-4 text-center align-middle relative border-r border-slate-50">
                    <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === item.ItemID ? null : item.ItemID); }} className="w-9 h-9 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-pink-600 flex items-center justify-center transition-all active:scale-95 mx-auto"><i className="bi bi-list text-2xl"></i></button>
                    {openDropdownId === item.ItemID && (
                      <div className="absolute left-14 top-2 w-48 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-left ring-1 ring-slate-900/5">
                        <button onClick={() => { setSelectedConsumable(item); setReceiveConsumableOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-box-arrow-in-down-right text-lg"></i> Receive Stock</button>
                        <button onClick={() => { setSelectedConsumable(item); setReduceConsumableOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-pencil-square text-lg"></i> Adjust Stock</button>
                        <div className="h-px bg-slate-100 my-1 mx-4"></div>
                        <button onClick={() => { setSelectedConsumable(item); setEditingConsumableData(item); setPreviewImage(item.ImageURL || null); setEditConsumableOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-pink-50 hover:text-pink-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-pencil-fill text-lg"></i> Edit Item Info</button>
                        <div className="h-px bg-slate-100 my-1 mx-4"></div>
                        <button onClick={() => openMoveCategory('consumable', item.ItemID)} className="w-full px-5 py-3 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-arrow-left-right text-lg"></i> Move to Spare Parts</button>
                        <div className="h-px bg-slate-100 my-1 mx-4"></div>
                        <button onClick={() => handleDeleteConsumable(item.ItemID, item.ItemName)} className="w-full px-5 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-trash3-fill text-lg"></i> Delete Item</button>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-6 font-bold text-slate-800 align-middle"><i className="bi bi-geo-alt-fill text-pink-500 mr-2 opacity-80"></i>{item.Location}</td>
                  <td className="py-3 px-6 text-center align-middle">
                    {item.ImageURL ? (
                      <div className="w-14 h-10 flex items-center justify-center mx-auto cursor-zoom-in hover:scale-110 transition-transform" onClick={() => setZoomedImage(item.ImageURL)}>
                        <img src={item.ImageURL} alt={item.ItemName} className="w-full h-full object-contain mix-blend-multiply" />
                      </div>
                    ) : (
                      <div className="w-14 h-10 flex items-center justify-center mx-auto text-slate-300"><i className="bi bi-image text-xl"></i></div>
                    )}
                  </td>

                  <td className="py-3 pl-6 pr-2 font-bold text-slate-800 text-[14px] align-middle">{item.ItemName}</td>
                  <td className="py-3 px-2 text-[13px] font-bold text-slate-500 align-middle">{item.ItemModel || '-'}</td>

                  <td className="py-3 px-4 text-center align-middle"><span className="text-[13px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-md border border-slate-200">{min}</span></td>
                  <td className="py-3 px-4 text-center align-middle"><span className="text-[13px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-md border border-orange-200">{safety}</span></td>
                  <td className="py-3 px-4 text-center align-middle"><span className="text-[13px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-200">{item.MaxQty}</span></td>

                  <td className="py-3 px-6 border-l border-slate-100 bg-slate-50/20 font-black text-slate-800 text-lg align-middle text-center">
                    {item.Balance !== null ? item.Balance : 0} <span className="text-xs font-bold text-slate-500 ml-1">Pcs</span>
                  </td>

                  <td className="py-3 px-6 align-middle text-center">
                    {item.PendingOrder ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold w-max shadow-sm bg-purple-50 text-purple-700 border border-purple-200"><i className="bi bi-truck"></i> ORDERED</span>
                    ) : isCritical ? (
                      <div className="flex flex-col gap-2 items-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold w-max shadow-sm bg-red-50 text-red-700 border border-red-200"><i className="bi bi-exclamation-triangle-fill"></i> Critical</span>
                        <button onClick={() => handleMarkAsOrdered(item.ItemID, 'consumable')} className="text-[10px] font-bold bg-white border border-red-300 text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors active:scale-95 shadow-sm"><i className="bi bi-cart-check"></i> Mark Ordered</button>
                      </div>
                    ) : isReorder ? (
                      <div className="flex flex-col gap-2 items-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold w-max shadow-sm bg-amber-50 text-amber-700 border border-amber-200"><i className="bi bi-cart-plus-fill"></i> ROP</span>
                        <button onClick={() => handleMarkAsOrdered(item.ItemID, 'consumable')} className="text-[10px] font-bold bg-white border border-amber-300 text-amber-600 px-2 py-1 rounded hover:bg-amber-50 transition-colors active:scale-95 shadow-sm"><i className="bi bi-cart-check"></i> Mark Ordered</button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold w-max shadow-sm bg-emerald-50 text-emerald-700 border border-emerald-100"><i className="bi bi-check-circle-fill"></i> Normal</span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-[13px] font-black text-blue-600 align-middle text-center tracking-wider border-l border-slate-100 bg-blue-50/30">{item.PartNumber || '-'}</td>
                </tr>
              );
            })}
            {filteredConsumables.length === 0 && (<tr><td colSpan={11} className="py-10 text-center text-slate-400 font-bold">No consumables data available</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}