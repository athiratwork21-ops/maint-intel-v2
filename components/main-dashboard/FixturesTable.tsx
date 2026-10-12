import React, { useState, useMemo } from 'react';

interface FixturesTableProps {
  isLoading: boolean;
  fetchAllData: () => void;
  setPreviewImage: (url: string | null) => void;
  setMultiLocations: (locations: string[]) => void;
  setNewFixtureModalOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filteredFixtures: any[];
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
  setSelectedFixture: (item: any) => void;
  setFixtureActionReason: (reason: string) => void;
  setEditFixtureStockOpen: (open: boolean) => void;
  setEditFixtureInfoOpen: (open: boolean) => void;
  handleDeleteFixture: (fixtureNo: string) => void;
  setZoomedImage: (url: string | null) => void;
  fixtureHistory?: any[]; // 🌟 เพิ่ม Props สำหรับรับข้อมูลประวัติในอนาคต
}

export default function FixturesTable(props: FixturesTableProps) {
  const {
    isLoading, fetchAllData, setPreviewImage, setMultiLocations, setNewFixtureModalOpen,
    searchQuery, setSearchQuery, filteredFixtures, openDropdownId, setOpenDropdownId,
    setSelectedFixture, setFixtureActionReason, setEditFixtureStockOpen,
    setEditFixtureInfoOpen, handleDeleteFixture, setZoomedImage, fixtureHistory = []
  } = props;

  // 🌟 State สำหรับเปิด Side Panel (Master Blueprint)
  const [selectedFixtureForPanel, setSelectedFixtureForPanel] = useState<any | null>(null);

  // 🌟 ฟังก์ชันกรองประวัติเฉพาะ Fixture ที่กำลังกดดูอยู่
  const currentFixtureHistory = useMemo(() => {
    if (!selectedFixtureForPanel || !fixtureHistory.length) return [];
    return fixtureHistory
      .filter(h => h.PartID === selectedFixtureForPanel.FixtureNo)
      .sort((a, b) => new Date(b.Date || b.created_at).getTime() - new Date(a.Date || a.created_at).getTime())
      .slice(0, 5); // เอาแค่ 5 รายการล่าสุดพอ จะได้ไม่รก
  }, [selectedFixtureForPanel, fixtureHistory]);

  return (
    <div className="flex h-full relative overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-200">
      
      {/* 🟢 พื้นที่หลักฝั่งซ้าย (หดตัวเมื่อเปิด Side Panel) */}
      <div className={`flex flex-col flex-1 min-h-0 transition-all duration-300 ${selectedFixtureForPanel ? 'pr-[300px]' : ''}`}>
        
        {/* ========================================= */}
        {/* 🎯 ส่วนหัว (Toolbar) */}
        {/* ========================================= */}
        <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-b border-slate-100 gap-4 flex-shrink-0 bg-white">
          <h2 className="font-bold text-slate-800 text-lg tracking-tight flex items-center gap-2">
            <i className="bi bi-tools text-purple-500"></i> Fixtures Inventory
          </h2>
          <div className="flex flex-wrap gap-3 items-center">
            
            {/* ช่องค้นหา */}
            <div className="relative max-w-md w-[300px]">
              <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" placeholder="Search Fixture No. or Model..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 h-10 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-[13px] shadow-sm transition-all" />
            </div>

            <button onClick={fetchAllData} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white"><i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i></button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <button onClick={() => { setPreviewImage(null); setMultiLocations([]); setNewFixtureModalOpen(true); }} className="flex items-center gap-2 px-5 h-10 text-[13px] bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:scale-95 transition-all shadow-md shadow-purple-600/20 font-bold ml-2"><i className="bi bi-plus-lg"></i> Add Fixture</button>
          </div>
        </div>

        {/* --- 3. ตารางข้อมูลหลัก --- */}
        <div className="bg-white flex-1 overflow-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-white border-b border-slate-100 sticky top-0 z-10">
              <tr className="text-slate-400 text-[11px] font-semibold tracking-wider">
                <th className="py-3 px-5 text-center w-12">Action</th>
                <th className="py-3 px-5 w-48">Locations</th>
                <th className="py-3 px-5 text-center w-24">Image</th>
                <th className="py-3 px-5 w-[30%]">Fixture Details</th>
                <th className="py-3 px-5 text-center border-l border-slate-100">Total</th>
                <th className="py-3 px-5 text-center text-red-500">Broken</th>
                <th className="py-3 px-5 text-center text-blue-500">Borrowed</th>
                <th className="py-3 px-5 text-center">Available</th>
                <th className="py-3 px-5 text-center w-36">Status</th>
              </tr>
            </thead>
            <tbody className="text-[13px] font-medium text-slate-600">
              {filteredFixtures.length > 0 ? (
                filteredFixtures.map((item, idx) => {
                  const borrowedQty = parseInt(item.BorrowedQty) || 0;
                  const brokenQty = parseInt(item.BrokenQty) || 0;
                  const totalQty = parseInt(item.TotalQty) || 0;
                  const availableQty = totalQty - brokenQty - borrowedQty;

                  // 🌟 ลอจิกการคำนวณ Status ดั้งเดิม 🌟
                  let fixStatus = 'Available';
                  if (availableQty <= 0 && borrowedQty > 0) fixStatus = 'Fully Borrowed';
                  else if (availableQty <= 0 && brokenQty > 0) fixStatus = 'Needs Repair';
                  else if (borrowedQty > 0) fixStatus = 'In Use';

                  // 🌟 ลอจิกป้ายแคปซูล Available (แบบวงกลมไอคอนข้างใน ตาม Master Blueprint) 🌟
                  let availStyle = { bg: 'bg-[#e2f5ec]', text: 'text-[#0d6e38]', iconBg: 'bg-[#158848]', icon: 'bi-check-lg' }; // สีเขียว
                  if (availableQty <= 0 && brokenQty > 0) {
                    availStyle = { bg: 'bg-[#fde5e3]', text: 'text-[#d32f2f]', iconBg: 'bg-[#df383a]', icon: 'bi-exclamation-lg' }; // สีแดง (พัง)
                  } else if (availableQty <= 0 && borrowedQty > 0) {
                    availStyle = { bg: 'bg-[#fff5d6]', text: 'text-[#b96b00]', iconBg: 'bg-[#dc8000]', icon: 'bi-person-x-fill' }; // สีส้ม (คนยืมหมด)
                  }

                  // 🌟 ลอจิกป้ายแคปซูลยาว Status (ตาม Master Blueprint) 🌟
                  let statusStyle = { bg: 'bg-[#e2f5ec]', text: 'text-[#0d6e38]', label: 'AVAILABLE', icon: 'bi-check-circle-fill' };
                  if (fixStatus === 'Fully Borrowed') {
                    statusStyle = { bg: 'bg-[#f6edff]', text: 'text-[#8630db]', label: 'FULLY BORROWED', icon: 'bi-person-fill-check' };
                  } else if (fixStatus === 'Needs Repair') {
                    statusStyle = { bg: 'bg-[#fde5e3]', text: 'text-[#d32f2f]', label: 'NEEDS REPAIR', icon: 'bi-exclamation-triangle-fill' };
                  } else if (fixStatus === 'In Use') {
                    statusStyle = { bg: 'bg-[#e0f2fe]', text: 'text-[#0284c7]', label: `IN USE (${borrowedQty})`, icon: 'bi-people-fill' };
                  }

                  return (
                    <tr key={idx} 
                        onClick={() => setSelectedFixtureForPanel(item)}
                        // 🌟 ไฮไลท์แถวสีฟ้าเวลาชี้ (Master Blueprint) 🌟
                        className={`border-b border-slate-50 transition-colors duration-150 cursor-pointer ${selectedFixtureForPanel?.FixtureNo === item.FixtureNo ? 'bg-blue-50/60' : 'hover:bg-blue-50/40'}`}>
                      
                      {/* 🌟 ไอคอน Action 3 จุด (Master Blueprint) 🌟 */}
                      <td className="py-2.5 px-5 text-center align-middle relative">
                        <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === item.FixtureNo ? null : item.FixtureNo); }} className="w-7 h-7 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-800 flex items-center justify-center transition-all mx-auto"><i className="bi bi-three-dots-vertical"></i></button>
                        
                        {openDropdownId === item.FixtureNo && (
                          <div className="absolute left-10 top-2 w-52 bg-white border border-slate-100 rounded-xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => { setSelectedFixtureForPanel(item); setOpenDropdownId(null); }} className="w-full px-5 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 flex items-center gap-3 text-left font-bold transition-colors"><i className="bi bi-window-sidebar text-[15px]"></i> View Details</button>
                            <div className="h-px bg-slate-100 my-1 mx-4"></div>
                            
                            {/* ฟังก์ชันเดิมของบอสครบ 100% */}
                            <button onClick={() => { setSelectedFixture(item); setFixtureActionReason('New Receive'); setEditFixtureStockOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-2.5 text-[13px] text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors font-semibold text-left"><i className="bi bi-box-seam text-[15px]"></i> Update Stock</button>
                            <div className="h-px bg-slate-100 my-1 mx-4"></div>
                            <button onClick={() => { setSelectedFixture(item); setPreviewImage(item.ImageURL || null); setMultiLocations(item.Location && item.Location !== '-' ? item.Location.split(', ').map((l: string) => l.trim()) : []); setEditFixtureInfoOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-2.5 text-[13px] text-slate-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-3 transition-colors font-semibold text-left"><i className="bi bi-pencil-fill text-[15px]"></i> Edit Fixture Info</button>
                            <div className="h-px bg-slate-100 my-1 mx-4"></div>
                            <button onClick={() => handleDeleteFixture(item.FixtureNo)} className="w-full px-5 py-2.5 text-[13px] text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-trash3-fill text-[15px]"></i> Delete Fixture</button>
                          </div>
                        )}
                      </td>

                      {/* พิกัด (Location) แสดงแบบ Tags */}
                      <td className="py-2.5 px-5 align-middle">
                        <div className="flex flex-wrap gap-1.5 max-w-[180px]">
                          {item.Location && item.Location !== '-' ? (
                            item.Location.split(', ').map((loc: string, i: number) => (
                              <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-purple-600 bg-purple-50 border border-purple-100 text-[9px] font-black uppercase shadow-sm whitespace-nowrap">
                                <i className="bi bi-geo-alt-fill mr-1 opacity-70"></i> {loc.trim()}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs font-bold">-</span>
                          )}
                        </div>
                      </td>

                      {/* 🌟 รูปภาพไซส์ใหญ่ตาม Master Blueprint 🌟 */}
                      <td className="py-2.5 px-5 text-center align-middle">
                        {item.ImageURL ? (
                          <div 
                            className="w-16 h-12 flex items-center justify-center mx-auto bg-white rounded-md border border-slate-200 p-1 cursor-zoom-in hover:scale-110 hover:border-purple-400 transition-all shadow-sm relative z-10"
                            onClick={(e) => { e.stopPropagation(); if(setZoomedImage) setZoomedImage(item.ImageURL); }}
                          >
                            <img src={item.ImageURL} className="max-w-full max-h-full object-contain mix-blend-multiply" />
                          </div>
                        ) : (
                          <div className="w-16 h-12 flex items-center justify-center mx-auto bg-slate-50 rounded-md text-slate-300 border border-slate-100"><i className="bi bi-image text-lg"></i></div>
                        )}
                      </td>

                      <td className="py-2.5 px-5 align-middle">
                        <div className="font-bold text-slate-800 text-[13px] truncate">{item.ModelName || '-'}</div>
                        <div className="text-[10px] text-slate-400 uppercase mt-0.5 font-semibold">FIX NO: <span className="text-purple-600 font-bold">{item.FixtureNo}</span></div>
                      </td>

                      {/* 🌟 ข้อมูล Total, Broken, Borrowed 🌟 */}
                      <td className="py-2.5 px-5 border-l border-slate-100 font-black text-slate-700 text-[14px] align-middle text-center">{totalQty}</td>
                      <td className="py-2.5 px-5 font-bold text-red-500 text-[13px] align-middle text-center">{brokenQty > 0 ? brokenQty : '-'}</td>
                      <td className="py-2.5 px-5 font-bold text-blue-500 text-[13px] align-middle text-center">{borrowedQty > 0 ? borrowedQty : '-'}</td>

                      {/* 🌟 Balance (Available) ทำเป็นแคปซูลยาวสีพาสเทลวงกลมตาม Blueprint 🌟 */}
                      <td className="py-2.5 px-5 text-center align-middle">
                        <div className={`inline-flex items-center justify-center gap-2.5 px-5 py-1.5 rounded-full text-[13px] font-bold w-[90px] mx-auto ${availStyle.bg} ${availStyle.text}`}>
                          <div className={`w-[18px] h-[18px] rounded-full text-white flex items-center justify-center text-[10px] shadow-sm ${availStyle.iconBg}`}>
                            <i className={availStyle.icon}></i>
                          </div>
                          {availableQty}
                        </div>
                      </td>

                      {/* 🌟 Status ทรงแคปซูลยาวพาสเทล 🌟 */}
                      <td className="py-2.5 px-5 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                        <div className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[10.5px] font-black tracking-wide w-[140px] shadow-sm ${statusStyle.bg} ${statusStyle.text}`}>
                          <i className={`${statusStyle.icon} text-xs`}></i> {statusStyle.label}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <i className="bi bi-search text-3xl mb-3 opacity-50"></i>
                      <p className="font-semibold text-[13px] text-slate-500">No fixtures found matching your search</p>
                      <button onClick={() => setSearchQuery('')} className="mt-3 px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200 transition-colors">Clear Search</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="border-t border-slate-100 p-3 flex justify-between items-center text-[11px] font-semibold text-slate-500 shrink-0 bg-white">
          <div>Showing {filteredFixtures.length > 0 ? 1 : 0} - {filteredFixtures.length} of {filteredFixtures.length} items</div>
          <div className="flex items-center gap-1.5">
            <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100"><i className="bi bi-chevron-left"></i></button>
            <button className="w-6 h-6 flex items-center justify-center rounded bg-purple-500 text-white shadow-sm">1</button>
            <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100"><i className="bi bi-chevron-right"></i></button>
          </div>
        </div>
      </div>

      {/* 🟢 SIDE PANEL (แผงขวาโชว์ข้อมูลละเอียด ตาม Master Blueprint) 🟢 */}
      <div className={`absolute top-0 right-0 h-full w-[300px] bg-white border-l border-slate-200 flex flex-col z-20 transform transition-transform duration-300 ease-out shadow-2xl ${selectedFixtureForPanel ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-800 text-sm">Fixture Details</h3>
          <button onClick={() => setSelectedFixtureForPanel(null)} className="text-slate-400 hover:text-slate-700 transition-colors"><i className="bi bi-x-lg text-sm"></i></button>
        </div>
        
        {selectedFixtureForPanel && (
          <div className="flex-1 overflow-y-auto px-5 py-4 bg-white">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-16 h-12 bg-white border border-slate-200 rounded-md flex items-center justify-center shrink-0 p-1">
                {selectedFixtureForPanel.ImageURL ? <img src={selectedFixtureForPanel.ImageURL} className="max-w-full max-h-full object-contain mix-blend-multiply" /> : <i className="bi bi-image text-slate-300 text-xl"></i>}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-800 text-xs leading-tight break-words">{selectedFixtureForPanel.ModelName || '-'}</h2>
                <div className="mt-2 inline-flex px-2 py-0.5 bg-purple-50 text-purple-600 border border-purple-100 rounded text-[9px] font-black uppercase tracking-wider shadow-sm">FIX: {selectedFixtureForPanel.FixtureNo}</div>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-800 flex items-center gap-1.5 mb-2"><i className="bi bi-geo-alt text-slate-400"></i> Locations</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedFixtureForPanel.Location && selectedFixtureForPanel.Location !== '-' ? (
                  selectedFixtureForPanel.Location.split(', ').map((loc: string, i: number) => (
                    <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[10px] font-black uppercase shadow-sm">
                      <i className="bi bi-geo-alt-fill mr-1 opacity-70"></i> {loc.trim()}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500 italic pl-1">Not Assigned</span>
                )}
              </div>
            </div>
            <div className="h-px bg-slate-100 mb-4"></div>

            <div className="mb-4">
              <h4 className="font-bold text-slate-800 text-[10px] mb-2.5">Stock Breakdown</h4>
              <div className="space-y-2.5 pl-1">
                <div className="flex justify-between items-center text-[11px]"><span className="text-slate-500">Total Registered</span><span className="font-bold text-slate-800">{selectedFixtureForPanel.TotalQty || 0}</span></div>
                <div className="flex justify-between items-center text-[11px]"><span className="text-slate-500">Currently Borrowed</span><span className="font-bold text-blue-500">{selectedFixtureForPanel.BorrowedQty || 0}</span></div>
                <div className="flex justify-between items-center text-[11px]"><span className="text-slate-500">Needs Repair / Broken</span><span className="font-bold text-red-500">{selectedFixtureForPanel.BrokenQty || 0}</span></div>
                <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-50 mt-1">
                  <span className="text-slate-800 font-bold">Ready to Use</span>
                  <span className={`font-black ${(selectedFixtureForPanel.TotalQty - selectedFixtureForPanel.BrokenQty - selectedFixtureForPanel.BorrowedQty) <= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {(selectedFixtureForPanel.TotalQty || 0) - (selectedFixtureForPanel.BrokenQty || 0) - (selectedFixtureForPanel.BorrowedQty || 0)}
                  </span>
                </div>
              </div>
            </div>
            <div className="h-px bg-slate-100 mb-4"></div>

            <div>
              <div className="flex justify-between items-center mb-2.5">
                <h4 className="font-bold text-slate-800 text-[10px]">Recent Transactions</h4>
                <span className="text-[9px] text-purple-500 font-bold cursor-pointer hover:underline">View All</span>
              </div>
              <div className="space-y-2 pl-1">
                {currentFixtureHistory && currentFixtureHistory.length > 0 ? (
                  currentFixtureHistory.map((historyItem: any, i: number) => (
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

    </div>
  );
}