import React from 'react';

interface PrTrackingTableProps {
  handleImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fetchPrTrackingData: () => void;
  prLastUpdated: string | null;
  prSearchQuery: string;
  setPrSearchQuery: (val: string) => void;
  filteredPrData: any[];
}

export default function PrTrackingTable(props: PrTrackingTableProps) {
  const {
    handleImportCSV, fetchPrTrackingData, prLastUpdated,
    prSearchQuery, setPrSearchQuery, filteredPrData
  } = props;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Header ของหน้า Tracking */}
      <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-b border-slate-100 gap-4 flex-shrink-0">
        <div>
          <h2 className="font-bold text-slate-800 text-lg tracking-tight">Purchase Requisition Tracking</h2>
          <p className="text-xs text-slate-500 mt-1">อัปเดตและติดตามสถานะการสั่งซื้ออะไหล่จากระบบ ERP</p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-3">
            <input type="file" accept=".csv" id="csv-import-pr" className="hidden" onChange={handleImportCSV} />
            <label htmlFor="csv-import-pr" className="flex items-center gap-2 px-5 py-2.5 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-md shadow-emerald-900/20 font-bold cursor-pointer">
              <i className="bi bi-file-earmark-arrow-up"></i> Import ERP Status
            </label>
            <button onClick={fetchPrTrackingData} className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 active:scale-95 bg-white transition-colors">
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
          {/* 🌟 โชว์เวลาอัปเดตล่าสุด */}
          {prLastUpdated && (
            <div className="text-[10px] text-slate-400 font-bold mr-14 flex items-center gap-1">
              <i className="bi bi-clock-history"></i> Last updated: {prLastUpdated}
            </div>
          )}
        </div>
      </div>

      {/* ช่องค้นหา */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
        <div className="relative max-w-md">
          <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input
            type="text"
            placeholder="Search PR No. or Item Name..."
            value={prSearchQuery}
            onChange={(e) => setPrSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm shadow-sm transition-all"
          />
        </div>
      </div>

      {/* ตารางแสดงผล */}
      <div className="overflow-auto flex-1 relative rounded-b-2xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md">
            <tr className="text-slate-500 text-[11px] uppercase font-extrabold tracking-wider">
              <th className="py-4 px-6 w-36">PR Number</th>
              <th className="py-4 px-6 w-48">Requester</th>
              <th className="py-4 px-6 w-auto">Item Description</th>
              <th className="py-4 px-4 text-center w-24">Qty</th>
              <th className="py-4 px-4 w-72">Status</th>
              <th className="py-4 px-6 w-36">Delivery Date</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredPrData.map((pr, idx) => (
              <tr key={idx} className="border-b border-slate-50 hover:bg-emerald-50/30 transition-colors duration-200">
                <td className="py-4 px-6 font-black text-slate-700">{pr.PRNo}</td>
                <td className="py-4 px-6 text-slate-500 font-bold">{pr.IniEmpName || '-'}</td>
                <td className="py-4 px-6">
                  <div className="font-bold text-slate-800 leading-tight">{pr.PRContent}</div>
                  <div className="text-[10px] text-blue-500 mt-1 font-black uppercase tracking-widest">PO: {pr.PONo || 'AWAITING PO'}</div>
                </td>
                <td className="py-4 px-4 text-center font-black text-slate-700">
                  {pr.PRQty} <span className="text-[10px] text-slate-400 font-normal">{pr.UnitName}</span>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${pr.PRItemStatus?.includes('Complete') ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    pr.PRItemStatus?.includes('Ordered') || pr.PONo ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                    {pr.PRItemStatus || 'In Progress'}
                  </span>
                </td>
                <td className="py-4 px-6 font-bold text-slate-600">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <i className="bi bi-calendar-check text-emerald-500"></i>
                    {pr.FinalDeliveryDate || 'TBD'}
                  </div>
                </td>
              </tr>
            ))}
            {filteredPrData.length === 0 && (
              <tr><td colSpan={6} className="py-20 text-center text-slate-400 font-bold bg-slate-50/20">ยังไม่มีข้อมูลการสั่งซื้อ หรือค้นหาไม่พบ</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}