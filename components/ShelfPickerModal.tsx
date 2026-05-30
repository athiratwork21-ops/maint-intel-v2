'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ShelfPickerModal({ onSelect, onClose }: { onSelect: (loc: string) => void, onClose: () => void }) {
  const [locations, setLocations] = useState<any[]>([])
  const [selectedShelf, setSelectedShelf] = useState('A04')
  const [shelfList, setShelfList] = useState<any[]>([])

  useEffect(() => {
    const fetchShelves = async () => {
      const { data } = await supabase.from('shelf_master').select('shelf_name')
      if (data) setShelfList(data.map(s => s.shelf_name))
    }
    fetchShelves()
    fetchLocations()
  }, [selectedShelf])

  const fetchLocations = async () => {
    const { data } = await supabase.from('storage_locations').select('*').eq('shelf_name', selectedShelf).order('layer_no', { ascending: false }).order('slot_no', { ascending: true })
    if (data) setLocations(data)
  }

  return (
    // 🌟 เปลี่ยนจาก flex center เป็น flex justify-end (ชิดขวา)
    <div className="fixed inset-0 z-[300] flex justify-end">
      
      {/* 🌟 ฉากหลังมืดๆ (กดเพื่อปิดได้) */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* 🌟 ตัวแผงแผนที่ สไลด์จากขวา (slide-in-from-right) และสูงเต็มจอ (h-full) */}
      <div className="relative w-full max-w-2xl h-full bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.1)] flex flex-col animate-in slide-in-from-right duration-500 ease-out">
        
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">📍 Visual Shelf Map</h3>
            <p className="text-slate-500 text-sm">เลือกช่องว่างที่ต้องการจัดเก็บ Fixture</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-all active:scale-95"><i className="bi bi-x-lg"></i></button>
        </div>

        {/* Shelf Selector */}
        <div className="p-4 bg-slate-100 flex gap-2 overflow-x-auto shrink-0 shadow-inner">
          {shelfList.length > 0 ? shelfList.map(shelf => (
            <button 
              key={shelf}
              onClick={() => setSelectedShelf(shelf)}
              className={`px-6 py-2.5 rounded-full font-bold transition-all whitespace-nowrap ${selectedShelf === shelf ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-200'}`}
            >
              Shelf {shelf}
            </button>
          )) : (
            // Fallback กรณีตาราง shelf_master ยังไม่มีข้อมูล
            ['A01', 'A02', 'A03', 'A04', 'B01'].map(shelf => (
              <button key={shelf} onClick={() => setSelectedShelf(shelf)} className={`px-6 py-2.5 rounded-full font-bold transition-all whitespace-nowrap ${selectedShelf === shelf ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-200'}`}>Shelf {shelf}</button>
            ))
          )}
        </div>

        {/* Storage Grid */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          <div className="grid gap-8 max-w-xl mx-auto">
            {/* วนลูปวาดชั้นวาง (Layer) */}
            {Array.from(new Set(locations.map(l => l.layer_no))).map(layer => (
              <div key={layer} className="relative">
                <div className="absolute -left-10 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm rotate-180 [writing-mode:vertical-lr] tracking-widest">LAYER {layer}</div>
                <div className="grid grid-cols-2 gap-4 border-b-8 border-slate-300 pb-4">
                  {locations.filter(loc => loc.layer_no === layer).map(slot => (
                    <div 
                      key={slot.id}
                      onClick={() => !slot.is_occupied && onSelect(`${slot.shelf_name}-L${slot.layer_no}-S${slot.slot_no}`)}
                      className={`relative h-40 rounded-xl border-4 transition-all cursor-pointer flex items-center justify-center
                        ${slot.is_occupied 
                          ? 'border-slate-200 bg-slate-100 cursor-not-allowed' 
                          : 'border-dashed border-purple-300 bg-white hover:border-purple-500 hover:bg-purple-50 shadow-sm hover:shadow-xl group'}`}
                    >
                      {slot.is_occupied ? (
                        <div className="text-center">
                          <img src="/black-box.png" className="w-24 h-24 object-contain mx-auto drop-shadow-md opacity-80" alt="Occupied" />
                          <p className="text-[10px] text-slate-400 mt-1 font-mono font-bold">{slot.fixture_name || 'OCCUPIED'}</p>
                        </div>
                      ) : (
                        <div className="text-center group-hover:scale-110 transition-transform">
                          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-2">
                             <span className="font-bold text-xl">+</span>
                          </div>
                          <p className="text-purple-600 font-black text-sm">ว่าง</p>
                          <p className="text-[10px] text-purple-400 font-bold uppercase mt-1">Slot {slot.slot_no}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest border-t bg-white shrink-0">
          Maint-Intel Virtual Space
        </div>
      </div>
    </div>
  )
}
