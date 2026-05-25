'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function ShelfPickerModal({ onSelect, onClose }: { onSelect: (loc: string) => void, onClose: () => void }) {
  const supabase = createClientComponentClient()
  const [locations, setLocations] = useState<any[]>([])
  const [selectedShelf, setSelectedShelf] = useState('A04') // เริ่มต้นที่เชลฟ์ A04 ตามรูปบอส

  useEffect(() => {
    fetchLocations()
  }, [selectedShelf])

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from('storage_locations') // ชื่อตารางที่บอสสร้างไว้
      .select('*')
      .eq('shelf_name', selectedShelf)
      .order('layer_no', { ascending: false })
      .order('slot_no', { ascending: true })
    
    if (data) setLocations(data)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">Visual Shelf Map</h3>
            <p className="text-slate-500 text-sm">เลือกช่องว่างที่ต้องการจัดเก็บ Fixture</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors">✕</button>
        </div>

        {/* Shelf Selector */}
        <div className="p-4 bg-slate-100 flex gap-2 overflow-x-auto">
          {['A01', 'A02', 'A03', 'A04', 'B01'].map(shelf => (
            <button 
              key={shelf}
              onClick={() => setSelectedShelf(shelf)}
              className={`px-6 py-2 rounded-full font-bold transition-all ${selectedShelf === shelf ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-200'}`}
            >
              Shelf {shelf}
            </button>
          ))}
        </div>

        {/* Storage Grid */}
        <div className="p-8 overflow-y-auto flex-1 bg-slate-50">
          <div className="grid gap-8">
            {/* วนลูปวาดชั้นวาง (Layer) */}
            {Array.from(new Set(locations.map(l => l.layer_no))).map(layer => (
              <div key={layer} className="relative">
                <div className="absolute -left-12 top-1/2 -translate-y-1/2 font-bold text-slate-400 rotate-180 [writing-mode:vertical-lr]">LAYER {layer}</div>
                <div className="grid grid-cols-2 gap-6 border-b-8 border-slate-300 pb-4">
                  {locations.filter(loc => loc.layer_no === layer).map(slot => (
                    <div 
                      key={slot.id}
                      onClick={() => !slot.is_occupied && onSelect(`${slot.shelf_name}-L${slot.layer_no}-S${slot.slot_no}`)}
                      className={`relative h-48 rounded-xl border-4 transition-all cursor-pointer flex items-center justify-center
                        ${slot.is_occupied 
                          ? 'border-slate-200 bg-slate-100 cursor-not-allowed' 
                          : 'border-dashed border-blue-200 bg-white hover:border-blue-500 hover:bg-blue-50 shadow-sm hover:shadow-xl'}`}
                    >
                      {slot.is_occupied ? (
                        <div className="text-center">
                          <img src="/black-box.png" className="w-28 h-28 object-contain mx-auto drop-shadow-md" alt="Occupied" />
                          <p className="text-[10px] text-slate-400 mt-2 font-mono">{slot.fixture_name || 'OCCUPIED'}</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
                             <span className="font-bold">+</span>
                          </div>
                          <p className="text-blue-600 font-bold">ช่องว่าง</p>
                          <p className="text-[10px] text-blue-300 uppercase">Slot {slot.slot_no}</p>
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
        <div className="p-4 text-center text-slate-400 text-xs border-t">
          Maint-Intel Visual Storage System v2.0
        </div>
      </div>
    </div>
  )
}
