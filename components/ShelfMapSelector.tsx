'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ShelfMapSelector({ 
  selectedLocations, 
  onToggleLocation 
}: { 
  selectedLocations: string[], 
  onToggleLocation: (loc: string) => void 
}) {
  const [locations, setLocations] = useState<any[]>([])
  const [selectedShelf, setSelectedShelf] = useState('A04')
  const [shelfList, setShelfList] = useState<string[]>([])

  useEffect(() => {
    const fetchShelves = async () => {
      const { data } = await supabase.from('shelf_master').select('shelf_name')
      if (data) setShelfList(data.map(s => s.shelf_name))
    }
    fetchShelves()
    fetchLocations()
  }, [selectedShelf])

  const fetchLocations = async () => {
    const { data } = await supabase.from('storage_locations')
      .select('*')
      .eq('shelf_name', selectedShelf)
      .order('layer_no', { ascending: false })
      .order('slot_no', { ascending: true })
    if (data) setLocations(data)
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-50/50">
      {/* Header ของแผนที่ */}
      <div className="p-5 border-b border-slate-200 bg-white shrink-0">
        <h3 className="font-black text-lg text-slate-800"><i className="bi bi-map-fill text-blue-500 mr-2"></i> Visual Storage Map</h3>
        <p className="text-xs text-slate-500 mt-1">คลิกที่ช่องสีเขียวเพื่อเลือกพิกัดจัดเก็บให้ Fixture นี้</p>
      </div>

      {/* ปุ่มเลือก Shelf */}
      <div className="p-3 bg-slate-100 flex gap-2 overflow-x-auto shrink-0 shadow-inner">
        {shelfList.length > 0 ? shelfList.map(shelf => (
          <button 
            key={shelf} type="button" onClick={() => setSelectedShelf(shelf)}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedShelf === shelf ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'}`}
          >
            Shelf {shelf}
          </button>
        )) : (
          ['A01', 'A02', 'A03', 'A04'].map(shelf => (
            <button key={shelf} type="button" onClick={() => setSelectedShelf(shelf)} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedShelf === shelf ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'}`}>Shelf {shelf}</button>
          ))
        )}
      </div>

      {/* พื้นที่จำลอง Shelf (Grid) */}
      <div className="p-6 overflow-y-auto flex-1">
        <div className="grid gap-6 max-w-lg mx-auto">
          {Array.from(new Set(locations.map(l => l.layer_no))).map(layer => (
            <div key={layer} className="relative flex items-center">
              <div className="w-16 font-black text-slate-300 text-xs tracking-widest shrink-0">L{layer}</div>
              <div className="flex-1 grid grid-cols-2 gap-4 border-b-4 border-slate-300 pb-3">
                {locations.filter(loc => loc.layer_no === layer).map(slot => {
                  const locationCode = `${slot.shelf_name}-L${slot.layer_no}-S${slot.slot_no}`;
                  const isSelected = selectedLocations.includes(locationCode);
                  
                  return (
                    <button 
                      key={slot.id} type="button"
                      disabled={slot.is_occupied}
                      onClick={() => onToggleLocation(locationCode)}
                      className={`relative h-28 rounded-xl border-2 transition-all flex flex-col items-center justify-center
                        ${slot.is_occupied ? 'border-slate-200 bg-slate-100 cursor-not-allowed opacity-70' : 
                          isSelected ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/20 shadow-md' : 
                          'border-dashed border-emerald-300 bg-white hover:border-emerald-500 hover:bg-emerald-50 shadow-sm group'}`}
                    >
                      {slot.is_occupied ? (
                        <>
                          <img src="/black-box.png" className="w-12 h-12 object-contain opacity-60 mb-1" alt="Occupied" />
                          <p className="text-[9px] text-slate-500 font-bold">{slot.fixture_name || 'OCCUPIED'}</p>
                        </>
                      ) : (
                        <>
                          <i className={`bi ${isSelected ? 'bi-check-circle-fill text-blue-600' : 'bi-plus-circle text-emerald-500 group-hover:scale-110 transition-transform'} text-xl mb-1`}></i>
                          <p className={`text-[10px] font-black uppercase ${isSelected ? 'text-blue-700' : 'text-emerald-600'}`}>{isSelected ? 'Selected' : 'Available'}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">S{slot.slot_no}</p>
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
