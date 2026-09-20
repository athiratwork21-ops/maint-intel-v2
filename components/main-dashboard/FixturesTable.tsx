import React from 'react';

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
}

export default function FixturesTable(props: FixturesTableProps) {
  const {
    isLoading, fetchAllData, setPreviewImage, setMultiLocations, setNewFixtureModalOpen,
    searchQuery, setSearchQuery, filteredFixtures, openDropdownId, setOpenDropdownId,
    setSelectedFixture, setFixtureActionReason, setEditFixtureStockOpen,
    setEditFixtureInfoOpen, handleDeleteFixture, setZoomedImage
  } = props;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-b border-slate-100 gap-4 flex-shrink-0">
        <h2 className="font-bold text-slate-800 text-lg tracking-tight">Fixtures Inventory</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={fetchAllData} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white"><i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i></button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          <button onClick={() => { setPreviewImage(null); setMultiLocations([]); setNewFixtureModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 active:scale-95 transition-all shadow-md shadow-purple-600/20 font-bold ml-2"><i className="bi bi-plus-lg"></i> Add Fixture</button>
        </div>
      </div>
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
        <div className="relative max-w-md">
          <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" placeholder="Search Fixture No. or Model..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm shadow-sm transition-all" />
        </div>
      </div>

      <div className="overflow-auto flex-1 relative pb-12 rounded-b-2xl">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md shadow-sm">
            <tr className="text-slate-500 text-xs uppercase font-extrabold tracking-wider">
              <th className="py-5 px-4 text-center w-16">Action</th>
              <th className="py-5 px-6">Location</th>
              <th className="py-5 px-6 text-center w-24">Image</th>
              <th className="py-5 px-6 w-[30%]">Fixture Details</th>
              <th className="py-5 px-6 border-l border-slate-200/50 bg-slate-100/50 text-center">Total</th>
              <th className="py-5 px-6 bg-red-50/30 text-red-700 text-center">Broken</th>
              <th className="py-5 px-6 bg-blue-50/30 text-blue-700 text-center">Borrowed</th>
              <th className="py-5 px-6 bg-emerald-50/30 text-emerald-700 text-center">Available</th>
              <th className="py-5 px-6 text-center w-32">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredFixtures.map((item, idx) => {
              const borrowedQty = item.BorrowedQty || 0;
              const availableQty = (item.TotalQty || 0) - (item.BrokenQty || 0) - borrowedQty;

              let fixStatus = 'Available';
              if (availableQty <= 0 && borrowedQty > 0) fixStatus = 'Fully Borrowed';
              else if (availableQty <= 0 && (item.BrokenQty || 0) > 0) fixStatus = 'Needs Repair';
              else if (borrowedQty > 0) fixStatus = 'In Use';

              return (
                <tr key={idx} className="border-b border-slate-50 hover:bg-purple-50/40 transition-colors duration-200 group">
                  <td className="py-4 px-4 text-center align-middle relative border-r border-slate-50">
                    <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === item.FixtureNo ? null : item.FixtureNo); }} className="w-9 h-9 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-purple-600 flex items-center justify-center transition-all active:scale-95 mx-auto"><i className="bi bi-list text-2xl"></i></button>
                    {openDropdownId === item.FixtureNo && (
                      <div className="absolute left-14 top-2 w-52 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-left ring-1 ring-slate-900/5">
                        <button onClick={() => { setSelectedFixture(item); setFixtureActionReason('New Receive'); setEditFixtureStockOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-box-seam text-lg"></i> Update Stock</button>
                        <div className="h-px bg-slate-100 my-1 mx-4"></div>
                        <button onClick={() => { setSelectedFixture(item); setPreviewImage(item.ImageURL || null); setMultiLocations(item.Location && item.Location !== '-' ? item.Location.split(', ').map((l: string) => l.trim()) : []); setEditFixtureInfoOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-pencil-fill text-lg"></i> Edit Fixture Info</button>
                        <div className="h-px bg-slate-100 my-1 mx-4"></div>
                        <button onClick={() => handleDeleteFixture(item.FixtureNo)} className="w-full px-5 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-trash3-fill text-lg"></i> Delete Fixture</button>
                      </div>
                    )}
                  </td>

                  <td className="py-4 px-6 align-middle">
                    <div className="flex flex-wrap gap-1.5 max-w-[150px]">
                      {item.Location && item.Location !== '-' ? (
                        item.Location.split(', ').map((loc: string, i: number) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-100 text-[10px] font-black uppercase shadow-sm whitespace-nowrap">
                            <i className="bi bi-geo-alt-fill mr-1"></i> {loc.trim()}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 text-xs font-bold">-</span>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-6 text-center align-middle">
                    {item.ImageURL ? (
                      <div className="w-16 h-12 flex items-center justify-center mx-auto cursor-zoom-in hover:scale-110 transition-transform" onClick={() => setZoomedImage(item.ImageURL)}>
                        <img src={item.ImageURL} className="w-full h-full object-contain mix-blend-multiply" />
                      </div>
                    ) : (
                      <div className="w-16 h-12 flex items-center justify-center mx-auto text-slate-300"><i className="bi bi-image text-xl"></i></div>
                    )}
                  </td>

                  <td className="py-4 px-6 align-middle">
                    <div className="font-bold text-slate-800 text-[14px] truncate">{item.ModelName || '-'}</div>
                    <div className="text-[12px] text-slate-500 mt-0.5"><span className="uppercase tracking-wider mr-1 text-[10px]">FIX NO:</span> <span className="text-purple-600 font-bold">{item.FixtureNo}</span></div>
                  </td>

                  <td className="py-4 px-6 border-l border-slate-100 bg-slate-50/20 font-black text-slate-800 text-[15px] align-middle text-center">{item.TotalQty}</td>
                  <td className="py-4 px-6 bg-red-50/10 font-bold text-red-600 text-[15px] align-middle text-center">{item.BrokenQty > 0 ? item.BrokenQty : '-'}</td>
                  <td className="py-4 px-6 bg-blue-50/10 font-bold text-blue-600 text-[15px] align-middle text-center">{borrowedQty > 0 ? borrowedQty : '-'}</td>
                  <td className="py-4 px-6 bg-emerald-50/10 font-black text-emerald-600 text-[15px] align-middle text-center">{availableQty}</td>

                  <td className="py-4 px-6 align-middle text-center">
                    {fixStatus === 'Fully Borrowed' ? <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold w-max shadow-sm bg-purple-50 text-purple-700 border border-purple-200"><i className="bi bi-person-fill-check"></i> FULLY BORROWED</span> :
                      fixStatus === 'Needs Repair' ? <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold w-max shadow-sm bg-red-50 text-red-700 border border-red-200"><i className="bi bi-exclamation-triangle-fill"></i> NEEDS REPAIR</span> :
                        fixStatus === 'In Use' ? <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold w-max shadow-sm bg-blue-50 text-blue-700 border border-blue-200"><i className="bi bi-people-fill"></i> IN USE ({borrowedQty})</span> :
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold w-max shadow-sm bg-emerald-50 text-emerald-700 border border-emerald-100"><i className="bi bi-check-circle-fill"></i> AVAILABLE</span>
                    }
                  </td>
                </tr>
              );
            })}
            {filteredFixtures.length === 0 && (<tr><td colSpan={9} className="py-10 text-center text-slate-400 font-bold">No fixtures data available</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}