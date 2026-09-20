import React from 'react';
import CustomDropdown from '../CustomDropdown'; // อย่าลืมเช็ค Path ให้ตรงกับโฟลเดอร์ของ CustomDropdown นะครับ

interface MachinesTableProps {
  isLoading: boolean;
  fetchAllData: () => void;
  setNewMachineModalOpen: (open: boolean) => void;
  filterLine: string;
  setFilterLine: (val: string) => void;
  linesMaster: any[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filteredMachines: any[];
  openDropdownId: string | null;
  setOpenDropdownId: (id: string | null) => void;
  setEditingMachineData: (item: any) => void;
  setPreviewImage: (url: string | null) => void;
  setEditMachineModalOpen: (open: boolean) => void;
  handleDeleteMachine: (machineId: string, machineName: string) => void;
  setZoomedImage: (url: string | null) => void;
}

export default function MachinesTable(props: MachinesTableProps) {
  const {
    isLoading, fetchAllData, setNewMachineModalOpen, filterLine, setFilterLine,
    linesMaster, searchQuery, setSearchQuery, filteredMachines, openDropdownId,
    setOpenDropdownId, setEditingMachineData, setPreviewImage, setEditMachineModalOpen,
    handleDeleteMachine, setZoomedImage
  } = props;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0">
      <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-b border-slate-100 gap-4 flex-shrink-0">
        <h2 className="font-bold text-slate-800 text-lg tracking-tight">Machine Master List</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={fetchAllData} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white"><i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i></button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          <button onClick={() => setNewMachineModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/20 font-bold ml-2"><i className="bi bi-plus-lg"></i> Add Machine</button>
        </div>
      </div>
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
          <input type="text" placeholder="Search Machine ID or Name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all" />
        </div>
        <div className="w-48">
          <CustomDropdown
            value={filterLine}
            onChange={setFilterLine}
            options={[{ value: '', label: 'All Lines' }, ...linesMaster.map(l => ({ value: l.LineName, label: l.LineName }))]}
            placeholder="Filter by Line"
            iconClass="bi bi-funnel"
          />
        </div>
      </div>

      <div className="overflow-auto flex-1 relative pb-12 rounded-b-2xl">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md shadow-sm">
            <tr className="text-slate-500 text-xs uppercase font-extrabold tracking-wider">
              <th className="py-5 px-4 text-center w-16">Action</th>
              <th className="py-5 px-6 text-center w-24">Image</th>
              <th className="py-5 px-6 w-[20%] text-blue-600">Machine ID</th>
              <th className="py-5 px-6 w-[30%]">Machine Name</th>
              <th className="py-5 px-6">Line</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredMachines.map((m, idx) => (
              <tr key={idx} className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors duration-200 group">
                <td className="py-4 px-4 text-center align-middle relative border-r border-slate-50">
                  <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === m.MachineID ? null : m.MachineID); }} className="w-9 h-9 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-all active:scale-95 mx-auto"><i className="bi bi-list text-2xl"></i></button>
                  {openDropdownId === m.MachineID && (
                    <div className="absolute left-14 top-2 w-48 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-left ring-1 ring-slate-900/5">
                      <button onClick={() => { setEditingMachineData(m); setPreviewImage(m.ImageURL || null); setEditMachineModalOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-pencil-fill text-lg"></i> Edit Machine</button>
                      <div className="h-px bg-slate-100 my-1 mx-4"></div>
                      <button onClick={() => handleDeleteMachine(m.MachineID, m.MachineName)} className="w-full px-5 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-trash3-fill text-lg"></i> Delete</button>
                    </div>
                  )}
                </td>
                <td className="py-4 px-6 text-center align-middle">
                  {m.ImageURL ? (
                    <div className="w-16 h-12 flex items-center justify-center mx-auto cursor-zoom-in hover:scale-110 transition-transform" onClick={() => setZoomedImage(m.ImageURL)}>
                      <img src={m.ImageURL} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                  ) : (
                    <div className="w-16 h-12 flex items-center justify-center mx-auto text-slate-300"><i className="bi bi-image text-xl"></i></div>
                  )}
                </td>
                <td className="py-4 px-6 align-middle font-black text-blue-600 text-[15px]">{m.MachineID}</td>
                <td className="py-4 px-6 align-middle font-bold text-slate-800">{m.MachineName}</td>
                <td className="py-4 px-6 align-middle"><span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200"><i className="bi bi-geo-alt-fill text-blue-400 mr-1.5"></i> {m.LineName}</span></td>
              </tr>
            ))}
            {filteredMachines.length === 0 && (<tr><td colSpan={5} className="py-10 text-center text-slate-400 font-bold">No machine data available</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}