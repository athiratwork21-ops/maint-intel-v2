import React, { useState, useMemo } from 'react';

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
  handleMarkAsOrdered: (id: string, type: 'part' | 'consumable', prNumber?: string) => void;
  partHistory?: any[]; // 🌟 รับค่าประวัติเพื่อมาโชว์ใน Side Panel
}

export default function ConsumablesTable(props: ConsumablesTableProps) {
  const {
    isLoading, fetchAllData, setNewConsumableModalOpen, searchQuery, setSearchQuery,
    filteredConsumables, openDropdownId, setOpenDropdownId, setSelectedConsumable,
    setReceiveConsumableOpen, setReduceConsumableOpen, setEditingConsumableData,
    setPreviewImage, setEditConsumableOpen, openMoveCategory, handleDeleteConsumable,
    setZoomedImage, handleMarkAsOrdered, partHistory = []
  } = props;

  // 🌟 State สำหรับเปิด Side Panel
  const [selectedItemForPanel, setSelectedItemForPanel] = useState<any | null>(null);

  // 🌟 State สำหรับ Popup PR
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [targetOrder, setTargetOrder] = useState<{id: string, type: 'part' | 'consumable'} | null>(null);
  const [prNumberInput, setPrNumberInput] = useState('');

  // 🌟 State สำหรับระบบ Filter
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  // ดึงรายชื่อ Location ที่ไม่ซ้ำ
  const uniqueLocations = useMemo(() => {
    const locs = filteredConsumables.map(item => item.Location).filter(Boolean);
    return Array.from(new Set(locs)).sort();
  }, [filteredConsumables]);

  // 🌟 คำนวณ KPI อัตโนมัติ 🌟
  const kpiStats = useMemo(() => {
    let total = 0, inStock = 0, lowStock = 0, critical = 0;
    filteredConsumables.forEach(item => {
      total++;
      const safety = item.SafetyStock || 0;
      const min = item.MinQty || 0;
      const rop = min + safety;
      const balance = item.Balance !== null ? item.Balance : 0;

      if (balance <= safety) critical++;
      else if (balance <= rop) lowStock++;
      else inStock++;
    });
    return { total, inStock, lowStock, critical };
  }, [filteredConsumables]);

  // 🌟 ฟังก์ชันตัวกรองข้อมูลขั้นสุดท้าย
  const finalDisplayedData = useMemo(() => {
    return filteredConsumables.filter(item => {
      if (selectedLocation !== 'All Locations' && item.Location !== selectedLocation) return false;
      if (selectedStatus !== 'All Status') {
        const safety = item.SafetyStock || 0;
        const min = item.MinQty || 0;
        const rop = min + safety;
        const balance = item.Balance !== null ? item.Balance : 0;

        let currentStatus = 'In Stock';
        if (balance <= safety) currentStatus = 'Critical';
        else if (balance <= rop) currentStatus = 'Low Stock';
        if (item.PendingOrder) currentStatus = 'Ordered';

        if (selectedStatus === 'In Stock' && currentStatus !== 'In Stock') return false;
        if (selectedStatus === 'Low Stock' && currentStatus !== 'Low Stock') return false;
        if (selectedStatus === 'Critical' && currentStatus !== 'Critical') return false;
        if (selectedStatus === 'Ordered' && currentStatus !== 'Ordered') return false;
      }
      return true;
    });
  }, [filteredConsumables, selectedLocation, selectedStatus]);

  // ฟังก์ชันดึงประวัติมาโชว์ใน Side Panel
  const currentItemHistory = useMemo(() => {
    if (!selectedItemForPanel || !partHistory.length) return [];
    return partHistory
      .filter(h => h.PartID === selectedItemForPanel.ItemID)
      .sort((a, b) => new Date(b.Date || b.created_at).getTime() - new Date(a.Date || a.created_at).getTime())
      .slice(0, 5);
  }, [selectedItemForPanel, partHistory]);


  return (
    <div className="flex h-full relative overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200" onClick={() => { setIsLocationOpen(false); setIsStatusOpen(false); }}>
      
      {/* 🟢 พื้นที่หลักฝั่งซ้าย */}
      <div className={`flex flex-col flex-1 min-h-0 transition-all duration-300 ${selectedItemForPanel ? 'pr-[300px]' : ''}`}>
        
        {/* ========================================= */}
        {/* 🎯 ส่วนหัว (Toolbar + KPI - โคลนมาจากหน้าแรกเป๊ะ) */}
        {/* ========================================= */}
        <div className="flex flex-col px-5 py-5 border-b border-slate-200 shrink-0 bg-white">
          <div className="flex flex-wrap xl:flex-nowrap justify-between items-center gap-4 mb-6">
            <div className="flex flex-1 items-center gap-3">
              
              <div className="relative w-full max-w-[340px]">
                <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" placeholder="Search item name, P/N..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 h-10 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-[13px] transition-all shadow-sm" />
              </div>
              
              {/* Location Dropdown */}
              <div className="relative hidden lg:block" onClick={(e) => e.stopPropagation()}>
                <div onClick={() => { setIsLocationOpen(!isLocationOpen); setIsStatusOpen(false); }} className={`flex items-center justify-between px-3 h-10 bg-white border ${isLocationOpen ? 'border-pink-500 ring-2 ring-pink-50' : 'border-slate-200'} rounded-lg cursor-pointer hover:bg-slate-50 min-w-[160px] shadow-sm transition-all`}>
                  <div className="flex items-center gap-2.5"><i className="bi bi-geo-alt-fill text-pink-500"></i><div className="flex flex-col justify-center"><span className="text-[9px] text-slate-400 font-bold leading-none mb-0.5">Location</span><span className="text-[12px] font-semibold text-slate-700 leading-none truncate max-w-[90px]">{selectedLocation}</span></div></div><i className={`bi bi-chevron-down text-slate-400 text-[10px] transition-transform ${isLocationOpen ? 'rotate-180' : ''}`}></i>
                </div>
                {isLocationOpen && (
                  <div className="absolute top-12 left-0 w-full min-w-[180px] bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-2 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                    <div onClick={() => { setSelectedLocation('All Locations'); setIsLocationOpen(false); }} className={`px-4 py-2 text-xs font-semibold cursor-pointer flex items-center justify-between ${selectedLocation === 'All Locations' ? 'text-pink-600 bg-pink-50' : 'text-slate-700 hover:bg-slate-50'}`}>All Locations {selectedLocation === 'All Locations' && <i className="bi bi-check2"></i>}</div>
                    <div className="h-px bg-slate-100 my-1 mx-3"></div>
                    {uniqueLocations.map(loc => (
                      <div key={loc as string} onClick={() => { setSelectedLocation(loc as string); setIsLocationOpen(false); }} className={`px-4 py-2 text-xs font-semibold cursor-pointer flex items-center justify-between ${selectedLocation === loc ? 'text-pink-600 bg-pink-50' : 'text-slate-700 hover:bg-slate-50'}`}>{loc as string} {selectedLocation === loc && <i className="bi bi-check2"></i>}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Stock Status Dropdown */}
              <div className="relative hidden lg:block" onClick={(e) => e.stopPropagation()}>
                <div onClick={() => { setIsStatusOpen(!isStatusOpen); setIsLocationOpen(false); }} className={`flex items-center justify-between px-3 h-10 bg-white border ${isStatusOpen ? 'border-pink-500 ring-2 ring-pink-50' : 'border-slate-200'} rounded-lg cursor-pointer hover:bg-slate-50 min-w-[160px] shadow-sm transition-all`}>
                  <div className="flex items-center gap-2.5"><i className="bi bi-box-seam text-pink-500"></i><div className="flex flex-col justify-center"><span className="text-[9px] text-slate-400 font-bold leading-none mb-0.5">Stock Status</span><span className="text-[12px] font-semibold text-slate-700 leading-none">{selectedStatus}</span></div></div><i className={`bi bi-chevron-down text-slate-400 text-[10px] transition-transform ${isStatusOpen ? 'rotate-180' : ''}`}></i>
                </div>
                {isStatusOpen && (
                  <div className="absolute top-12 left-0 w-full min-w-[160px] bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                    {['All Status', 'In Stock', 'Low Stock', 'Critical', 'Ordered'].map(status => (
                      <div key={status} onClick={() => { setSelectedStatus(status); setIsStatusOpen(false); }} className={`px-4 py-2 text-xs font-semibold cursor-pointer flex items-center justify-between ${selectedStatus === status ? 'text-pink-600 bg-pink-50' : 'text-slate-700 hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-2">
                          {status === 'In Stock' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                          {status === 'Low Stock' && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                          {status === 'Critical' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                          {status === 'Ordered' && <span className="w-2 h-2 rounded-full bg-purple-500"></span>}
                          {status}
                        </div>
                        {selectedStatus === status && <i className="bi bi-check2 text-pink-600"></i>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button onClick={fetchAllData} className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-lg bg-white hover:text-pink-600 hover:bg-slate-50 transition-all shadow-sm"><i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i></button>
              <button onClick={() => setNewConsumableModalOpen(true)} className="px-5 h-10 text-[13px] font-bold bg-pink-600 text-white rounded-lg hover:bg-pink-700 active:scale-95 transition-all shadow-md shadow-pink-600/20 ml-1"><i className="bi bi-plus-lg mr-2"></i> Add Item</button>
            </div>
          </div>

          {/* 🌟 KPI Cards (หน้า Consumables มี 4 กล่อง) 🌟 */}
          <div className="flex flex-wrap xl:flex-nowrap items-center justify-between px-2 gap-4">
            <div className="flex-1 flex items-center gap-3.5"><div className="w-11 h-11 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-500/20"><i className="bi bi-box2-heart text-lg"></i></div><div className="flex flex-col"><span className="text-[11px] text-slate-400 font-semibold tracking-wide mb-1">Total Items</span><span className="text-[22px] font-black text-slate-800 leading-none">{kpiStats.total}</span></div></div>
            <div className="flex-1 flex items-center gap-3.5"><div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20"><i className="bi bi-check-lg text-xl"></i></div><div className="flex flex-col"><span className="text-[11px] text-slate-400 font-semibold tracking-wide mb-1">In Stock</span><span className="text-[22px] font-black text-emerald-500 leading-none">{kpiStats.inStock}</span></div></div>
            <div className="flex-1 flex items-center gap-3.5"><div className="w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20"><i className="bi bi-exclamation-triangle-fill text-lg"></i></div><div className="flex flex-col"><span className="text-[11px] text-slate-400 font-semibold tracking-wide mb-1">Low Stock (ROP)</span><span className="text-[22px] font-black text-amber-500 leading-none">{kpiStats.lowStock}</span></div></div>
            <div className="flex-1 flex items-center gap-3.5"><div className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/20"><i className="bi bi-exclamation-lg text-xl"></i></div><div className="flex flex-col"><span className="text-[11px] text-slate-400 font-semibold tracking-wide mb-1">Critical</span><span className="text-[22px] font-black text-red-500 leading-none">{kpiStats.critical}</span></div></div>
          </div>
        </div>

        {/* --- 3. ตารางข้อมูลหลัก --- */}
        <div className="bg-white flex-1 overflow-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-white border-b border-slate-100 sticky top-0 z-10">
              <tr className="text-slate-400 text-[11px] font-semibold tracking-wider">
                <th className="py-3 px-5 text-center w-12">Action</th>
                <th className="py-3 px-5">Location</th>
                <th className="py-3 px-5 text-center w-24">Image</th>
                <th className="py-3 px-5 w-[30%]">Item Details</th>
                <th className="py-3 px-5 text-center">Min (ROP)</th>
                <th className="py-3 px-5 text-center">Safety</th>
                <th className="py-3 px-5 text-center">Max</th>
                <th className="py-3 px-5 text-center">Balance</th>
                <th className="py-3 px-5 text-center w-36">Status</th>
                <th className="py-3 px-5 text-blue-500 text-center w-24">P/N</th>
              </tr>
            </thead>
            <tbody className="text-[13px] font-medium text-slate-600">
              {finalDisplayedData.length > 0 ? (
                finalDisplayedData.map((item, idx) => {
                  const safety = item.SafetyStock || 0;
                  const min = item.MinQty || 0;
                  const rop = min + safety;
                  const balance = item.Balance !== null ? item.Balance : 0;

                  const isCritical = balance <= safety;
                  const isReorder = balance <= rop && !isCritical;

                  // 🌟 ลอจิกป้ายพาสเทลไร้ขอบ (Master Blueprint) 🌟
                  let availStyle = { bg: 'bg-[#e2f5ec]', text: 'text-[#0d6e38]', iconBg: 'bg-[#158848]', icon: 'bi-check-lg' };
                  let orderStyle = { bg: 'bg-[#e2f5ec]', text: 'text-[#0d6e38]', label: 'In Stock' };

                  if (isCritical) {
                    availStyle = { bg: 'bg-[#fde5e3]', text: 'text-[#d32f2f]', iconBg: 'bg-[#df383a]', icon: 'bi-exclamation-lg' };
                    orderStyle = { bg: 'bg-[#fde5e3]', text: 'text-[#d32f2f]', label: 'Order Now' };
                  } else if (isReorder) {
                    availStyle = { bg: 'bg-[#fff5d6]', text: 'text-[#b96b00]', iconBg: 'bg-[#dc8000]', icon: 'bi-exclamation-triangle-fill' };
                    orderStyle = { bg: 'bg-[#fff5d6]', text: 'text-[#b96b00]', label: 'Low Stock' };
                  }

                  return (
                    <tr key={idx} 
                        onClick={() => setSelectedItemForPanel(item)}
                        // 🌟 ไฮไลท์แถวสีฟ้าตาม Blueprint 🌟
                        className={`border-b border-slate-50 transition-colors duration-150 cursor-pointer ${selectedItemForPanel?.ItemID === item.ItemID ? 'bg-blue-50/60' : 'hover:bg-blue-50/40'}`}>
                      
                      {/* 🌟 ไอคอน Action กลับมาเป็น 3 จุดแล้ว 🌟 */}
                      <td className="py-2.5 px-5 text-center align-middle relative">
                        <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === item.ItemID ? null : item.ItemID); }} className="w-7 h-7 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-all mx-auto"><i className="bi bi-three-dots-vertical"></i></button>
                        
                        {openDropdownId === item.ItemID && (
                          <div className="absolute left-10 top-2 w-56 bg-white border border-slate-100 rounded-xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => { setSelectedItemForPanel(item); setOpenDropdownId(null); }} className="w-full px-5 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 flex items-center gap-3 text-left font-bold transition-colors"><i className="bi bi-window-sidebar text-[15px]"></i> View Details</button>
                            <div className="h-px bg-slate-100 my-1 mx-4"></div>
                            <button onClick={() => { setSelectedConsumable(item); setReceiveConsumableOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-2.5 text-[13px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors font-semibold text-left"><i className="bi bi-box-arrow-in-down-right text-[15px]"></i> Receive Stock</button>
                            <button onClick={() => { setSelectedConsumable(item); setReduceConsumableOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-2.5 text-[13px] text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-3 transition-colors font-semibold text-left"><i className="bi bi-pencil-square text-[15px]"></i> Adjust Stock</button>
                            <div className="h-px bg-slate-100 my-1 mx-4"></div>
                            <button onClick={() => { setSelectedConsumable(item); setEditingConsumableData(item); setPreviewImage(item.ImageURL || null); setEditConsumableOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-2.5 text-[13px] text-slate-700 hover:bg-pink-50 hover:text-pink-700 flex items-center gap-3 transition-colors font-semibold text-left"><i className="bi bi-pencil-fill text-[15px]"></i> Edit Item Info</button>
                            <div className="h-px bg-slate-100 my-1 mx-4"></div>
                            <button onClick={() => openMoveCategory('consumable', item.ItemID)} className="w-full px-5 py-2.5 text-[13px] text-blue-600 hover:bg-blue-50 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-arrow-left-right text-[15px]"></i> Move to Spare Parts</button>
                            <div className="h-px bg-slate-100 my-1 mx-4"></div>
                            <button onClick={() => handleDeleteConsumable(item.ItemID, item.ItemName)} className="w-full px-5 py-2.5 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-trash3-fill text-[15px]"></i> Delete Item</button>
                          </div>
                        )}
                      </td>
                      
                      <td className="py-2.5 px-5 align-middle">
                        <div className="text-[12.5px] font-bold text-slate-700 flex items-start gap-1.5"><i className="bi bi-geo-alt-fill text-pink-500"></i> {item.Location || '-'}</div>
                      </td>
                      
                      {/* 🌟 รูปภาพไซส์ใหญ่ตาม Blueprint 🌟 */}
                      <td className="py-2.5 px-5 text-center align-middle">
                        {item.ImageURL ? (
                          <div 
                            className="w-16 h-12 flex items-center justify-center mx-auto bg-white rounded-md border border-slate-200 p-1 cursor-zoom-in hover:scale-110 hover:border-pink-400 transition-all shadow-sm relative z-10"
                            onClick={(e) => { e.stopPropagation(); if(setZoomedImage) setZoomedImage(item.ImageURL); }}
                          >
                            <img src={item.ImageURL} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                          </div>
                        ) : (
                          <div className="w-16 h-12 flex items-center justify-center mx-auto bg-slate-50 rounded-md text-slate-300 border border-slate-100"><i className="bi bi-image text-lg"></i></div>
                        )}
                      </td>

                      <td className="py-2.5 px-5 align-middle">
                        <div className="font-bold text-slate-800 text-[13px]">{item.ItemName}</div>
                        <div className="text-[10px] text-slate-400 uppercase mt-0.5 font-semibold">Model: {item.ItemModel || '-'}</div>
                      </td>

                      <td className="py-2.5 px-5 text-center align-middle font-bold text-slate-700">{min}</td>
                      <td className="py-2.5 px-5 text-center align-middle font-bold text-orange-500">{safety}</td>
                      <td className="py-2.5 px-5 text-center align-middle font-bold text-slate-700">{item.MaxQty}</td>

                      {/* 🌟 Balance ทำเป็นแคปซูลยาวสีพาสเทลตาม Blueprint 🌟 */}
                      <td className="py-2.5 px-5 text-center align-middle">
                        <div className={`inline-flex items-center justify-center gap-2.5 px-5 py-1.5 rounded-full text-[13px] font-bold w-[90px] mx-auto ${availStyle.bg} ${availStyle.text}`}>
                          <div className={`w-[18px] h-[18px] rounded-full text-white flex items-center justify-center text-[10px] shadow-sm ${availStyle.iconBg}`}>
                            <i className={availStyle.icon}></i>
                          </div>
                          {balance}
                        </div>
                      </td>

                      {/* 🌟 Order Status 🌟 */}
                      <td className="py-2.5 px-5 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                        {item.PendingOrder ? (
                          <div className="inline-flex items-center justify-center px-4 py-2 rounded-full text-[11.5px] font-black tracking-wide bg-[#f6edff] text-[#8630db] w-[120px]">
                            ORDERED
                          </div>
                        ) : (isCritical || isReorder) ? (
                          <button 
                            onClick={() => { setTargetOrder({id: item.ItemID, type: 'consumable'}); setIsPrModalOpen(true); }}
                            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[11.5px] font-bold ${orderStyle.bg} ${orderStyle.text} hover:opacity-80 transition-all active:scale-95 w-[120px]`}
                          >
                            <i className="bi bi-cart-plus text-[13px]"></i> {orderStyle.label}
                          </button>
                        ) : (
                          <div className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-[11.5px] font-bold ${orderStyle.bg} ${orderStyle.text} w-[120px]`}>
                            {orderStyle.label}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-5 text-center align-middle text-slate-400 text-xs">{item.PartNumber || '-'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <i className="bi bi-search text-3xl mb-3 opacity-50"></i>
                      <p className="font-semibold text-[13px] text-slate-500">No items found matching your filters</p>
                      <button onClick={() => { setSelectedLocation('All Locations'); setSelectedStatus('All Status'); setSearchQuery(''); }} className="mt-3 px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200 transition-colors">Clear Filters</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="border-t border-slate-100 p-3 flex justify-between items-center text-[11px] font-semibold text-slate-500 shrink-0 bg-white">
          <div>Showing {finalDisplayedData.length > 0 ? 1 : 0} - {finalDisplayedData.length} of {finalDisplayedData.length} items</div>
          <div className="flex items-center gap-1.5">
            <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100"><i className="bi bi-chevron-left"></i></button>
            <button className="w-6 h-6 flex items-center justify-center rounded bg-pink-500 text-white shadow-sm">1</button>
            <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100"><i className="bi bi-chevron-right"></i></button>
          </div>
        </div>
      </div>

      {/* 🟢 SIDE PANEL (แผงขวา) 🟢 */}
      <div className={`absolute top-0 right-0 h-full w-[300px] bg-white border-l border-slate-200 flex flex-col z-20 transform transition-transform duration-300 ease-out shadow-2xl ${selectedItemForPanel ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm">Item Details</h3>
          <button onClick={() => setSelectedItemForPanel(null)} className="text-slate-400 hover:text-slate-700 transition-colors"><i className="bi bi-x-lg text-sm"></i></button>
        </div>
        
        {selectedItemForPanel && (
          <div className="flex-1 overflow-y-auto px-5 py-4 bg-white">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-16 h-12 bg-white border border-slate-200 rounded-md flex items-center justify-center shrink-0 p-1">
                {selectedItemForPanel.ImageURL ? <img src={selectedItemForPanel.ImageURL} className="max-w-full max-h-full object-contain mix-blend-multiply" /> : <i className="bi bi-image text-slate-300 text-xl"></i>}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-800 text-xs leading-tight break-words">{selectedItemForPanel.ItemName}</h2>
                <p className="text-[9px] text-slate-400 uppercase mt-1 tracking-wide">MODEL: {selectedItemForPanel.ItemModel || '-'}</p>
                <div className="mt-1.5 inline-flex px-1.5 py-0.5 bg-pink-50 text-pink-600 rounded text-[9px] font-bold">P/N {selectedItemForPanel.PartNumber || '-'}</div>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-800 flex items-center gap-1.5"><i className="bi bi-geo-alt text-slate-400"></i> Location</p>
              <div className="flex justify-between items-center mt-1.5 pl-5 cursor-pointer group">
                <span className="text-[11px] font-semibold text-slate-600">{selectedItemForPanel.Location || 'Not Assigned'}</span>
                <i className="bi bi-chevron-right text-slate-300 text-[9px] group-hover:text-pink-500"></i>
              </div>
            </div>
            <div className="h-px bg-slate-100 mb-4"></div>

            <div className="mb-4">
              <h4 className="font-bold text-slate-800 text-[10px] mb-2.5">Stock Rule</h4>
              <div className="space-y-2.5 pl-1">
                <div className="flex justify-between items-center text-[11px]"><span className="text-slate-500">Min (ROP)</span><span className="font-bold text-slate-800">{selectedItemForPanel.MinQty}</span></div>
                <div className="flex justify-between items-center text-[11px]"><span className="text-slate-500">Safety Stock</span><span className="font-bold text-orange-500">{selectedItemForPanel.SafetyStock}</span></div>
                <div className="flex justify-between items-center text-[11px]"><span className="text-slate-500">Max Limit</span><span className="font-bold text-slate-800">{selectedItemForPanel.MaxQty}</span></div>
                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-50 mt-1">
                  <span className="text-slate-800 font-bold">Current Balance</span>
                  <span className={`font-black ${selectedItemForPanel.Balance <= selectedItemForPanel.SafetyStock ? 'text-red-500' : 'text-emerald-500'}`}>{selectedItemForPanel.Balance}</span>
                </div>
              </div>
            </div>
            <div className="h-px bg-slate-100 mb-4"></div>

            <div className="space-y-3 mb-5">
              {/* 🌟 โชว์เลข PR เวลาสั่งของไปแล้ว 🌟 */}
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-800 font-bold flex items-center gap-1.5"><i className="bi bi-file-earmark-text text-slate-400"></i> PR Status</span>
                {selectedItemForPanel.PendingOrder ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 shadow-sm">
                    <i className="bi bi-truck"></i> {selectedItemForPanel.PendingPRNumber || 'ORDERED'}
                  </span>
                ) : (
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-200">Not Requested</span>
                )}
              </div>
            </div>
            <div className="h-px bg-slate-100 mb-4"></div>

            <div>
              <div className="flex justify-between items-center mb-2.5">
                <h4 className="font-bold text-slate-800 text-[10px]">Recent Transactions</h4>
                <span className="text-[9px] text-pink-500 font-bold cursor-pointer hover:underline">View All</span>
              </div>
              <div className="space-y-2 pl-1">
                {currentItemHistory && currentItemHistory.length > 0 ? (
                  currentItemHistory.map((historyItem: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 w-14">
                        {new Date(historyItem.Date || historyItem.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-slate-600 flex-1 truncate pr-2">{historyItem.Action || historyItem.type || historyItem.ReasonType || '-'}</span>
                      <span className={`font-bold ${historyItem.Qty > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {historyItem.Qty > 0 ? `+${historyItem.Qty}` : historyItem.Qty}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-slate-400 text-center py-2 italic">No recent transactions</div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 🔴 POPUP บังคับใส่เลข PR 🔴 */}
      {isPrModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setIsPrModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center text-xl shrink-0"><i className="bi bi-cart-check-fill"></i></div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Confirm Order</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Please enter the Purchase Request (PR) number.</p>
              </div>
            </div>
            <div className="p-5">
              <label className="block text-xs font-bold text-slate-700 mb-2">PR Number <span className="text-rose-500">*</span></label>
              <input 
                type="text" 
                value={prNumberInput}
                onChange={(e) => setPrNumberInput(e.target.value)}
                placeholder="e.g. PR-2026-0123"
                autoFocus
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition-all"
              />
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => { setIsPrModalOpen(false); setPrNumberInput(''); }} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-800 rounded-lg transition-colors">Cancel</button>
              <button 
                onClick={() => {
                  if (!prNumberInput.trim()) return;
                  if (targetOrder) handleMarkAsOrdered(targetOrder.id, targetOrder.type, prNumberInput);
                  setIsPrModalOpen(false);
                  setPrNumberInput('');
                }} 
                disabled={!prNumberInput.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:bg-slate-400 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
              >
                Submit Order
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}