import React from 'react';

interface BasicInfoTabProps {
  setBasicInfoModal: (modal: { isOpen: boolean, type: 'line' | 'location' | 'cabinet' }) => void;
  locationsMaster: any[];
  cabinetsMaster: any[];
  linesMaster: any[];
  handleDeleteBasicInfo: (type: 'line' | 'location' | 'cabinet', id: any) => void;
}

export default function BasicInfoTab(props: BasicInfoTabProps) {
  const {
    setBasicInfoModal, locationsMaster, cabinetsMaster,
    linesMaster, handleDeleteBasicInfo
  } = props;

  return (
    <>
      <div className="mb-6 shrink-0">
        <h2 className="text-2xl font-black text-slate-800">Basic Information</h2>
        <p className="text-slate-500 mt-1">Manage master data for fixture locations, smart cabinets, and production lines.</p>
      </div>
      
      {/* ปรับ grid เป็นรองรับ 3 คอลัมน์บนหน้าจอใหญ่ */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-4">
        
        {/* 📦 กล่องที่ 1: Fixture Location */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-0 overflow-hidden">
          <div className="bg-[#6366f1] text-white p-5 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-lg"><i className="bi bi-tools mr-2"></i> Fixture Location</h3>
            <button onClick={() => setBasicInfoModal({ isOpen: true, type: 'location' })} className="text-sm font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"><i className="bi bi-plus-lg mr-1"></i> Add New</button>
          </div>
          <div className="overflow-y-auto flex-1 bg-slate-50/30">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr className="text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                  <th className="py-4 px-6 w-16">No.</th>
                  <th className="py-4 px-6">Location Name</th>
                  <th className="py-4 px-6 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {locationsMaster.map((loc, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-white transition-colors">
                    <td className="py-4 px-6 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-4 px-6 font-bold text-slate-700">{loc.LocationName}</td>
                    <td className="py-4 px-6 text-center">
                      <button onClick={() => handleDeleteBasicInfo('location', loc.LocationName)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><i className="bi bi-trash-fill"></i></button>
                    </td>
                  </tr>
                ))}
                {locationsMaster.length === 0 && (<tr><td colSpan={3} className="py-8 text-center text-slate-400">No data available</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🔒 กล่องที่ 2: Smart Cabinet */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-0 overflow-hidden">
          <div className="bg-[#10b981] text-white p-5 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-lg"><i className="bi bi-safe2-fill mr-2"></i> Smart Cabinet</h3>
            <button onClick={() => setBasicInfoModal({ isOpen: true, type: 'cabinet' })} className="text-sm font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"><i className="bi bi-plus-lg mr-1"></i> Add New</button>
          </div>
          <div className="overflow-y-auto flex-1 bg-slate-50/30">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr className="text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                  <th className="py-4 px-6 w-16">No.</th>
                  <th className="py-4 px-6">Cabinet Name</th>
                  <th className="py-4 px-6 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {cabinetsMaster.map((cab, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-white transition-colors">
                    <td className="py-4 px-6 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-4 px-6 font-bold text-slate-700">{cab.CabinetName}</td>
                    <td className="py-4 px-6 text-center">
                      <button onClick={() => handleDeleteBasicInfo('cabinet', cab.CabinetName)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><i className="bi bi-trash-fill"></i></button>
                    </td>
                  </tr>
                ))}
                {cabinetsMaster.length === 0 && (<tr><td colSpan={3} className="py-8 text-center text-slate-400">No data available</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

        {/* ⚙️ กล่องที่ 3: Production Line */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-0 overflow-hidden">
          <div className="bg-[#0ea5e9] text-white p-5 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-lg"><i className="bi bi-diagram-3-fill mr-2"></i> Production Line</h3>
            <button onClick={() => setBasicInfoModal({ isOpen: true, type: 'line' })} className="text-sm font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"><i className="bi bi-plus-lg mr-1"></i> Add New</button>
          </div>
          <div className="overflow-y-auto flex-1 bg-slate-50/30">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr className="text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                  <th className="py-4 px-6 w-16">No.</th>
                  <th className="py-4 px-6">Line Name</th>
                  <th className="py-4 px-6 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {linesMaster.map((line, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-white transition-colors">
                    <td className="py-4 px-6 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-4 px-6 font-bold text-slate-700">{line.LineName}</td>
                    <td className="py-4 px-6 text-center">
                      <button onClick={() => handleDeleteBasicInfo('line', line.LineName)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><i className="bi bi-trash-fill"></i></button>
                    </td>
                  </tr>
                ))}
                {linesMaster.length === 0 && (<tr><td colSpan={3} className="py-8 text-center text-slate-400">No data available</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}