import React, { useState, useMemo } from 'react';

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
  handleMarkAsOrdered: (id: string, type: 'part' | 'consumable', prNumber?: string) => void; 
  // 🌟 เพิ่ม Props สำหรับรับข้อมูลประวัติการทำรายการจริง 🌟
  partHistory?: any[]; 
}

export default function CurrentStockTable(props: CurrentStockTableProps) {
  const {
    isLoading, fetchAllData, handleExportCSV, handleImportCSV, openNewPartModal,
    searchQuery, setSearchQuery, filteredStockData, stockAllocations, parts,
    pendingRequests, openDropdownId, setOpenDropdownId, openActionModal, setZoomedImage,
    openMoveCategory, handleDeletePart, handleMarkAsOrdered, partHistory = [] // รับค่าประวัติมาใช้
  } = props;

  const [selectedPartForPanel, setSelectedPartForPanel] = useState<any | null>(null);

  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [targetOrder, setTargetOrder] = useState<{id: string, type: 'part' | 'consumable'} | null>(null);
  const [prNumberInput, setPrNumberInput] = useState('');

  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  const uniqueLocations = useMemo(() => {
    const locs = filteredStockData.map(item => item.Location).filter(Boolean);
    return Array.from(new Set(locs)).sort();
  }, [filteredStockData]);

  const kpiStats = useMemo(() => {
    let total = 0, inStock = 0, lowStock = 0, outOfStock = 0, reservedCount = 0;
    filteredStockData.forEach(row => {
      total++;
      const alloc = stockAllocations[row.PartID] || { physical: row.Balance || 0, reserved: 0, available: row.Balance || 0 };
      const reqs = pendingRequests.filter(r => r.PartID === row.PartID);
      const mechanicReqQty = reqs.reduce((sum, r) => sum + (r.Qty || 0), 0);
      const totalReserved = alloc.reserved + mechanicReqQty;
      const finalAvailable = alloc.available - mechanicReqQty;
      // 🌟 ดึง MinStock ของจริงมาคำนวณ KPI
      const partDetails = parts.find(p => p.PartID === row.PartID) || {};
      const minStock = partDetails.MinStock !== undefined ? partDetails.MinStock : 5; 

      if (totalReserved > 0) reservedCount++;
      if (finalAvailable <= 0) outOfStock++;
      else if (finalAvailable <= minStock) lowStock++;
      else inStock++;
    });
    return { total, inStock, lowStock, outOfStock, reservedCount };
  }, [filteredStockData, stockAllocations, pendingRequests, parts]);

  const finalDisplayedData = useMemo(() => {
    return filteredStockData.filter(row => {
      if (selectedLocation !== 'All Locations' && row.Location !== selectedLocation) return false;
      if (selectedStatus !== 'All Status') {
        const alloc = stockAllocations[row.PartID] || { available: row.Balance || 0 };
        const reqs = pendingRequests.filter(r => r.PartID === row.PartID);
        const mechanicReqQty = reqs.reduce((sum, r) => sum + (r.Qty || 0), 0);
        const finalAvailable = alloc.available - mechanicReqQty;
        const partDetails = parts.find(p => p.PartID === row.PartID) || {};
        const minStock = partDetails.MinStock !== undefined ? partDetails.MinStock : 5;

        let currentStatus = 'In Stock';
        if (finalAvailable <= 0) currentStatus = 'Out of Stock';
        else if (finalAvailable <= minStock) currentStatus = 'Low Stock';
        if (partDetails.PendingOrder) currentStatus = 'Ordered';

        if (selectedStatus === 'In Stock' && currentStatus !== 'In Stock') return false;
        if (selectedStatus === 'Low Stock' && currentStatus !== 'Low Stock') return false;
        if (selectedStatus === 'Out of Stock' && currentStatus !== 'Out of Stock') return false;
        if (selectedStatus === 'Ordered' && currentStatus !== 'Ordered') return false;
      }
      return true;
    });
  }, [filteredStockData, selectedLocation, selectedStatus, stockAllocations, pendingRequests, parts]);

  // 🌟 ฟังก์ชันกรองประวัติเฉพาะอะไหล่ที่กำลังกดดูอยู่ 🌟
  const currentPartHistory = useMemo(() => {
    if (!selectedPartForPanel || !partHistory.length) return [];
    return partHistory
      .filter(h => h.PartID === selectedPartForPanel.PartID)
      .sort((a, b) => new Date(b.Date || b.created_at).getTime() - new Date(a.Date || a.created_at).getTime())
      .slice(0, 5); // เอาแค่ 5 รายการล่าสุดพอ จะได้ไม่รก
  }, [selectedPartForPanel, partHistory]);


  return (
    <div className="flex h-full relative overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200" onClick={() => { setIsLocationOpen(false); setIsStatusOpen(false); }}>
      
      {/* 🟢 พื้นที่หลักฝั่งซ้าย */}
      <div className={`flex flex-col flex-1 min-h-0 transition-all duration-300 ${selectedPartForPanel ? 'pr-[300px]' : ''}`}>
        
        {/* ========================================= */}
        {/* 🎯 ส่วนหัว (Toolbar + KPI) */}
        {/* ========================================= */}
        <div className="flex flex-col px-5 py-5 border-b border-slate-200 shrink-0 bg-white">
          <div className="flex flex-wrap xl:flex-nowrap justify-between items-center gap-4 mb-6">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative w-full max-w-[340px]">
                <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input type="text" placeholder="Search part name, model..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 h-10 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-[13px] transition-all shadow-sm" />
              </div>
              <div className="relative hidden lg:block" onClick={(e) => e.stopPropagation()}>
                <div onClick={() => { setIsLocationOpen(!isLocationOpen); setIsStatusOpen(false); }} className={`flex items-center justify-between px-3 h-10 bg-white border ${isLocationOpen ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-200'} rounded-lg cursor-pointer hover:bg-slate-50 min-w-[160px] shadow-sm transition-all`}>
                  <div className="flex items-center gap-2.5"><i className="bi bi-geo-alt-fill text-blue-500"></i><div className="flex flex-col justify-center"><span className="text-[9px] text-slate-400 font-bold leading-none mb-0.5">Location</span><span className="text-[12px] font-semibold text-slate-700 leading-none truncate max-w-[90px]">{selectedLocation}</span></div></div><i className={`bi bi-chevron-down text-slate-400 text-[10px] transition-transform ${isLocationOpen ? 'rotate-180' : ''}`}></i>
                </div>
                {isLocationOpen && (
                  <div className="absolute top-12 left-0 w-full min-w-[180px] bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-2 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                    <div onClick={() => { setSelectedLocation('All Locations'); setIsLocationOpen(false); }} className={`px-4 py-2 text-xs font-semibold cursor-pointer flex items-center justify-between ${selectedLocation === 'All Locations' ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'}`}>All Locations {selectedLocation === 'All Locations' && <i className="bi bi-check2"></i>}</div>
                    <div className="h-px bg-slate-100 my-1 mx-3"></div>
                    {uniqueLocations.map(loc => (
                      <div key={loc as string} onClick={() => { setSelectedLocation(loc as string); setIsLocationOpen(false); }} className={`px-4 py-2 text-xs font-semibold cursor-pointer flex items-center justify-between ${selectedLocation === loc ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'}`}>{loc as string} {selectedLocation === loc && <i className="bi bi-check2"></i>}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative hidden lg:block" onClick={(e) => e.stopPropagation()}>
                <div onClick={() => { setIsStatusOpen(!isStatusOpen); setIsLocationOpen(false); }} className={`flex items-center justify-between px-3 h-10 bg-white border ${isStatusOpen ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-200'} rounded-lg cursor-pointer hover:bg-slate-50 min-w-[160px] shadow-sm transition-all`}>
                  <div className="flex items-center gap-2.5"><i className="bi bi-box-seam text-blue-500"></i><div className="flex flex-col justify-center"><span className="text-[9px] text-slate-400 font-bold leading-none mb-0.5">Stock Status</span><span className="text-[12px] font-semibold text-slate-700 leading-none">{selectedStatus}</span></div></div><i className={`bi bi-chevron-down text-slate-400 text-[10px] transition-transform ${isStatusOpen ? 'rotate-180' : ''}`}></i>
                </div>
                {isStatusOpen && (
                  <div className="absolute top-12 left-0 w-full min-w-[160px] bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                    {['All Status', 'In Stock', 'Low Stock', 'Out of Stock', 'Ordered'].map(status => (
                      <div key={status} onClick={() => { setSelectedStatus(status); setIsStatusOpen(false); }} className={`px-4 py-2 text-xs font-semibold cursor-pointer flex items-center justify-between ${selectedStatus === status ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-2">
                          {status === 'In Stock' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
                          {status === 'Low Stock' && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                          {status === 'Out of Stock' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                          {status === 'Ordered' && <span className="w-2 h-2 rounded-full bg-purple-500"></span>}
                          {status}
                        </div>
                        {selectedStatus === status && <i className="bi bi-check2 text-blue-600"></i>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button onClick={fetchAllData} className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-lg bg-white hover:text-blue-600 hover:bg-slate-50 transition-all shadow-sm"><i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i></button>
              <button onClick={handleExportCSV} className="px-4 h-10 text-[13px] font-bold border border-slate-200 text-slate-600 rounded-lg bg-white hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all"><i className="bi bi-download"></i> Export</button>
              <input type="file" accept=".csv" id="csv-upload" className="hidden" onChange={handleImportCSV} />
              <label htmlFor="csv-upload" className="px-4 h-10 text-[13px] font-bold border border-slate-200 text-slate-600 rounded-lg bg-white hover:bg-slate-50 flex items-center gap-2 cursor-pointer m-0 shadow-sm transition-all"><i className="bi bi-upload"></i> Import PR</label>
              <button onClick={openNewPartModal} className="px-5 h-10 text-[13px] font-bold bg-[#0f172a] text-white rounded-lg hover:bg-slate-800 flex items-center gap-2 ml-1 shadow-md transition-all"><i className="bi bi-plus-lg"></i> New Part</button>
            </div>
          </div>
          <div className="flex flex-wrap xl:flex-nowrap items-center justify-between px-2 gap-4">
            <div className="flex-1 flex items-center gap-3.5"><div className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20"><i className="bi bi-box-seam text-lg"></i></div><div className="flex flex-col"><span className="text-[11px] text-slate-400 font-semibold tracking-wide mb-1">Total Parts</span><span className="text-[22px] font-black text-slate-800 leading-none">{kpiStats.total}</span></div></div>
            <div className="flex-1 flex items-center gap-3.5"><div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20"><i className="bi bi-check-lg text-xl"></i></div><div className="flex flex-col"><span className="text-[11px] text-slate-400 font-semibold tracking-wide mb-1">In Stock</span><span className="text-[22px] font-black text-emerald-500 leading-none">{kpiStats.inStock}</span></div></div>
            <div className="flex-1 flex items-center gap-3.5"><div className="w-11 h-11 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20"><i className="bi bi-exclamation-triangle-fill text-lg"></i></div><div className="flex flex-col"><span className="text-[11px] text-slate-400 font-semibold tracking-wide mb-1">Low Stock</span><span className="text-[22px] font-black text-amber-500 leading-none">{kpiStats.lowStock}</span></div></div>
            <div className="flex-1 flex items-center gap-3.5"><div className="w-11 h-11 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/20"><i className="bi bi-exclamation-lg text-xl"></i></div><div className="flex flex-col"><span className="text-[11px] text-slate-400 font-semibold tracking-wide mb-1">Out of Stock</span><span className="text-[22px] font-black text-red-500 leading-none">{kpiStats.outOfStock}</span></div></div>
            <div className="flex-1 flex items-center gap-3.5"><div className="w-11 h-11 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20"><i className="bi bi-clock-history text-lg"></i></div><div className="flex flex-col"><span className="text-[11px] text-slate-400 font-semibold tracking-wide mb-1">Reserved</span><span className="text-[22px] font-black text-slate-800 leading-none">{kpiStats.reservedCount}</span></div></div>
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
                <th className="py-3 px-5 w-[30%]">Part Details</th>
                <th className="py-3 px-5 text-center">Physical</th>
                <th className="py-3 px-5 text-center">Reserved</th>
                <th className="py-3 px-5 text-center">Available</th>
                <th className="py-3 px-5 text-center w-36">Order Status</th>
                <th className="py-3 px-5 text-blue-500 text-center w-24">P/N</th>
              </tr>
            </thead>
            <tbody className="text-[13px] font-medium text-slate-600">
              {finalDisplayedData.length > 0 ? (
                finalDisplayedData.map((row, idx) => {
                  const alloc = stockAllocations[row.PartID] || { physical: row.Balance, reserved: 0, available: row.Balance, machines: [] };
                  const partDetails = parts.find(p => p.PartID === row.PartID) || {};
                  const reqs = pendingRequests.filter(r => r.PartID === row.PartID);
                  const mechanicReqQty = reqs.reduce((sum, r) => sum + (r.Qty || 0), 0);
                  const totalReserved = alloc.reserved + mechanicReqQty;
                  const finalAvailable = alloc.available - mechanicReqQty;
                  
                  // 🌟 ดึง MinStock ของจริง
                  const minStock = partDetails.MinStock !== undefined ? partDetails.MinStock : 5;

                  let availStyle = { bg: 'bg-[#e2f5ec]', text: 'text-[#0d6e38]', iconBg: 'bg-[#158848]', icon: 'bi-check-lg' };
                  let orderStyle = { bg: 'bg-[#e2f5ec]', text: 'text-[#0d6e38]', label: 'In Stock' };

                  if (finalAvailable <= 0) {
                    availStyle = { bg: 'bg-[#fde5e3]', text: 'text-[#d32f2f]', iconBg: 'bg-[#df383a]', icon: 'bi-exclamation-lg' };
                    orderStyle = { bg: 'bg-[#fde5e3]', text: 'text-[#d32f2f]', label: 'Out of Stock' };
                  } else if (finalAvailable <= minStock) {
                    availStyle = { bg: 'bg-[#fff5d6]', text: 'text-[#b96b00]', iconBg: 'bg-[#dc8000]', icon: 'bi-exclamation-triangle-fill' };
                    orderStyle = { bg: 'bg-[#fff5d6]', text: 'text-[#b96b00]', label: 'Low Stock' };
                  }

                  const fullPartData = { ...row, ...partDetails, totalReserved, finalAvailable, physical: alloc.physical, MinStock: minStock };

                  return (
                    <tr key={idx} 
                        onClick={() => setSelectedPartForPanel(fullPartData)}
                        className={`border-b border-slate-50 transition-colors duration-150 cursor-pointer ${selectedPartForPanel?.PartID === row.PartID ? 'bg-blue-50/60' : 'hover:bg-blue-50/40'}`}>
                      
                      <td className="py-2.5 px-5 text-center align-middle relative">
                        <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === row.PartID ? null : row.PartID); }} className="w-7 h-7 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-all mx-auto"><i className="bi bi-three-dots-vertical"></i></button>
                        {openDropdownId === row.PartID && (
                          <div className="absolute left-10 top-2 w-56 bg-white border border-slate-100 rounded-xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => { setSelectedPartForPanel(fullPartData); setOpenDropdownId(null); }} className="w-full px-5 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 flex items-center gap-3 text-left font-bold transition-colors"><i className="bi bi-window-sidebar text-[15px]"></i> View Details</button>
                            <div className="h-px bg-slate-100 my-1 mx-4"></div>
                            <button onClick={() => { openActionModal('receive', row.PartID, partDetails.PartName || row.PartName); setOpenDropdownId(null); }} className="w-full px-5 py-2.5 text-[13px] text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 text-left font-semibold transition-colors"><i className="bi bi-box-arrow-in-down-right text-[15px]"></i> Receive Stock</button>
                            <button onClick={() => { openActionModal('reduce', row.PartID, partDetails.PartName || row.PartName); setOpenDropdownId(null); }} className="w-full px-5 py-2.5 text-[13px] text-slate-700 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-3 text-left font-semibold transition-colors"><i className="bi bi-box-arrow-up-right text-[15px]"></i> Adjust Stock</button>
                            <button onClick={() => { openActionModal('leadTime', row.PartID, partDetails.PartName || row.PartName); setOpenDropdownId(null); }} className="w-full px-5 py-2.5 text-[13px] text-slate-700 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-3 text-left font-semibold transition-colors"><i className="bi bi-clock-history text-[15px]"></i> Update Lead Time</button>
                            <div className="h-px bg-slate-100 my-1 mx-4"></div>
                            <button onClick={() => { openActionModal('edit', row.PartID, partDetails.PartName || row.PartName); setOpenDropdownId(null); }} className="w-full px-5 py-2.5 text-[13px] text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-3 text-left font-semibold transition-colors"><i className="bi bi-pencil-square text-[15px]"></i> Edit Part Info</button>
                            <div className="h-px bg-slate-100 my-1 mx-4"></div>
                            <button onClick={() => { openMoveCategory('part', row.PartID); setOpenDropdownId(null); }} className="w-full px-5 py-2.5 text-[13px] text-purple-600 hover:bg-purple-50 flex items-center gap-3 text-left font-bold transition-colors"><i className="bi bi-arrow-left-right text-[15px]"></i> Move to Consumables</button>
                            <div className="h-px bg-slate-100 my-1 mx-4"></div>
                            <button onClick={() => { handleDeletePart(row.PartID, partDetails.PartName || row.PartName); setOpenDropdownId(null); }} className="w-full px-5 py-2.5 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-3 text-left font-bold transition-colors"><i className="bi bi-trash3 text-[15px]"></i> Delete Part</button>
                          </div>
                        )}
                      </td>
                      
                      <td className="py-2.5 px-5 align-middle">
                        <div className="text-[12.5px] font-bold text-slate-700 flex items-start gap-1.5"><i className="bi bi-geo-alt-fill text-blue-500"></i> {row.Location ? row.Location.replace(' ', '\n') : '-'}</div>
                      </td>
                      
                      <td className="py-2.5 px-5 text-center align-middle">
                        {partDetails.ImageURL ? (
                          <div 
                            className="w-16 h-12 flex items-center justify-center mx-auto bg-white rounded-md border border-slate-200 p-1 cursor-zoom-in hover:scale-110 hover:border-blue-400 transition-all shadow-sm relative z-10"
                            onClick={(e) => { e.stopPropagation(); if(setZoomedImage) setZoomedImage(partDetails.ImageURL); }}
                          >
                            <img src={partDetails.ImageURL} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                          </div>
                        ) : (
                          <div className="w-16 h-12 flex items-center justify-center mx-auto bg-slate-50 rounded-md text-slate-300 border border-slate-100"><i className="bi bi-image text-lg"></i></div>
                        )}
                      </td>
                      
                      <td className="py-2.5 px-5 align-middle">
                        <div className="font-bold text-slate-800 text-[13px]">{partDetails.PartName || row.PartName}</div>
                        <div className="text-[10px] text-slate-400 uppercase mt-0.5 font-semibold">Model: {partDetails.PartModel || '-'}</div>
                      </td>
                      
                      <td className="py-2.5 px-5 text-center align-middle font-bold text-slate-700">{alloc.physical}</td>
                      <td className="py-2.5 px-5 text-center align-middle font-bold text-slate-700">{totalReserved}</td>
                      
                      <td className="py-2.5 px-5 text-center align-middle">
                        <div className={`inline-flex items-center justify-center gap-2.5 px-5 py-1.5 rounded-full text-[13px] font-bold w-[90px] mx-auto ${availStyle.bg} ${availStyle.text}`}>
                          <div className={`w-[18px] h-[18px] rounded-full text-white flex items-center justify-center text-[10px] shadow-sm ${availStyle.iconBg}`}>
                            <i className={availStyle.icon}></i>
                          </div>
                          {finalAvailable}
                        </div>
                      </td>
                      
                      <td className="py-2.5 px-5 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                        {partDetails.PendingOrder ? (
                          <div className="inline-flex items-center justify-center px-4 py-2 rounded-full text-[11.5px] font-black tracking-wide bg-[#f6edff] text-[#8630db] w-[120px]">
                            ORDERED
                          </div>
                        ) : (finalAvailable <= minStock) ? (
                          <button 
                            onClick={() => { setTargetOrder({id: row.PartID, type: 'part'}); setIsPrModalOpen(true); }}
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

                      <td className="py-2.5 px-5 text-center align-middle text-slate-400 text-xs">{partDetails.PartNumber || '-'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <i className="bi bi-search text-3xl mb-3 opacity-50"></i>
                      <p className="font-semibold text-[13px] text-slate-500">No parts found matching your filter</p>
                      <button onClick={() => { setSelectedLocation('All Locations'); setSelectedStatus('All Status'); }} className="mt-3 px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200 transition-colors">Clear Filters</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="border-t border-slate-100 p-3 flex justify-between items-center text-[11px] font-semibold text-slate-500 shrink-0 bg-white">
          <div>Showing {finalDisplayedData.length > 0 ? 1 : 0} - {finalDisplayedData.length} of {finalDisplayedData.length} parts</div>
          <div className="flex items-center gap-1.5">
            <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100"><i className="bi bi-chevron-left"></i></button>
            <button className="w-6 h-6 flex items-center justify-center rounded bg-blue-500 text-white shadow-sm">1</button>
            <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100"><i className="bi bi-chevron-right"></i></button>
          </div>
        </div>
      </div>

      {/* 🟢 SIDE PANEL (ข้อมูลจริงทั้งหมด) 🟢 */}
      <div className={`absolute top-0 right-0 h-full w-[300px] bg-white border-l border-slate-200 flex flex-col z-20 transform transition-transform duration-300 ease-out shadow-2xl ${selectedPartForPanel ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm">Part Details</h3>
          <button onClick={() => setSelectedPartForPanel(null)} className="text-slate-400 hover:text-slate-700 transition-colors"><i className="bi bi-x-lg text-sm"></i></button>
        </div>
        {selectedPartForPanel && (
          <div className="flex-1 overflow-y-auto px-5 py-4 bg-white">
            
            <div className="flex items-start gap-3 mb-5">
              <div className="w-14 h-14 bg-white border border-slate-200 rounded flex items-center justify-center shrink-0 p-1">
                {selectedPartForPanel.ImageURL ? <img src={selectedPartForPanel.ImageURL} className="max-w-full max-h-full object-contain mix-blend-multiply" /> : <i className="bi bi-image text-slate-300 text-xl"></i>}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-800 text-xs leading-tight break-words">{selectedPartForPanel.PartName}</h2>
                <p className="text-[9px] text-slate-400 uppercase mt-1 tracking-wide">MODEL: {selectedPartForPanel.PartModel || '-'}</p>
                <div className="mt-1.5 inline-flex px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold">P/N {selectedPartForPanel.PartNumber || '-'}</div>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-800 flex items-center gap-1.5"><i className="bi bi-geo-alt text-slate-400"></i> Location</p>
              <div className="flex justify-between items-center mt-1.5 pl-5 cursor-pointer group">
                <span className="text-[11px] font-semibold text-slate-600">{selectedPartForPanel.Location || 'Not Assigned'}</span>
                <i className="bi bi-chevron-right text-slate-300 text-[9px] group-hover:text-blue-500"></i>
              </div>
            </div>
            <div className="h-px bg-slate-100 mb-4"></div>

            <div className="mb-4">
              <h4 className="font-bold text-slate-800 text-[10px] mb-2.5">Stock Breakdown</h4>
              <div className="space-y-2.5 pl-1">
                <div className="flex justify-between items-center text-[11px]"><span className="text-slate-500">Physical</span><span className="font-bold text-slate-800">{selectedPartForPanel.physical}</span></div>
                <div className="flex justify-between items-center text-[11px]"><span className="text-slate-500">Reserved</span><span className="font-bold text-slate-800">{selectedPartForPanel.totalReserved}</span></div>
                <div className="flex justify-between items-center text-[11px]"><span className="text-emerald-500">Available</span><span className="font-black text-emerald-500">{selectedPartForPanel.finalAvailable}</span></div>
                
                {/* 🌟 Min Stock ของจริง 🌟 */}
                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="text-slate-500 flex items-center gap-1.5">Minimum Stock <i className="bi bi-info-circle text-[9px] text-slate-300"></i></span>
                  <span className="font-bold text-slate-800">{selectedPartForPanel.MinStock}</span>
                </div>
              </div>
            </div>
            <div className="h-px bg-slate-100 mb-4"></div>

            <div className="space-y-3 mb-5">
              
              {/* 🌟 Lead Time ของจริง 🌟 */}
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-800 font-bold flex items-center gap-1.5"><i className="bi bi-clock text-slate-400"></i> Lead Time</span>
                <span className="font-semibold text-slate-600">{selectedPartForPanel.LeadTime ? `${selectedPartForPanel.LeadTime} days` : 'Not Set'}</span>
              </div>
              
              {/* 🌟 PR Status ของจริง (โชว์เลข PR ด้วย) 🌟 */}
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-800 font-bold flex items-center gap-1.5"><i className="bi bi-file-earmark-text text-slate-400"></i> PR Status</span>
                {selectedPartForPanel.PendingOrder ? (
                  // 🌟 ถ้ามีเลข PR โชว์เลข ถ้าไม่มีโชว์แค่คำว่า Ordered
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 shadow-sm">
                    <i className="bi bi-truck"></i> {selectedPartForPanel.PendingPRNumber || 'ORDERED'}
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
                <span className="text-[9px] text-blue-500 font-bold cursor-pointer hover:underline">View All</span>
              </div>
              <div className="space-y-2 pl-1">
                {/* 🌟 ดึงประวัติจริงจาก partHistory 🌟 */}
                {currentPartHistory && currentPartHistory.length > 0 ? (
                  currentPartHistory.map((historyItem: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 w-14">
                        {new Date(historyItem.Date || historyItem.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-slate-600 flex-1 truncate pr-2">{historyItem.Action || historyItem.type}</span>
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
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0"><i className="bi bi-cart-check-fill"></i></div>
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
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
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
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
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