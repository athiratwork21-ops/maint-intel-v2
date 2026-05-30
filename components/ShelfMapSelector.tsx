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
  const [selectedShelf, setSelectedShelf] = useState('')
  const [shelfList, setShelfList] = useState<string[]>([])

  // 1. ดึงรายชื่อเชลฟ์ (Tab) ออกมาจากตาราง LocationMaster แบบอัตโนมัติ
  useEffect(() => {
    const fetchShelves = async () => {
      const { data } = await supabase.from('LocationMaster')
        .select('LocationName')
        .ilike('LocationName', '1-FTR-%'); // ดึงเฉพาะโซน Fixture

      if (data) {
        const shelves = new Set<string>();
        data.forEach(item => {
          const parts = item.LocationName.split('-');
          if (parts.length >= 3) shelves.add(parts[2]); // ดึง 'A01', 'A02' ออกมาจากชื่อ
        });
        const shelfArr = Array.from(shelves).sort();
        setShelfList(shelfArr);
        if (shelfArr.length > 0 && !selectedShelf) {
          setSelectedShelf(shelfArr[0]); // ตั้งค่า Tab แรกเป็นค่าเริ่มต้น
        }
      }
    }
    fetchShelves()
  }, [])

  // 2. ดึงพิกัดเฉพาะเชลฟ์ที่เลือก และ หั่นคำ (Parse) เพื่อวาด Grid
  useEffect(() => {
    if (!selectedShelf) return;

    const fetchLocations = async () => {
      const { data } = await supabase.from('LocationMaster')
        .select('*')
        .ilike('LocationName', `%-${selectedShelf}-%`);

      if (data) {
        // หั่น '1-FTR-A01-L4-S1' ให้กลายเป็น Object เพื่อเอาไปวาดตาราง
        const parsed = data.map(item => {
          const parts = item.LocationName.split('-');
          const layerStr = parts.find((p: string) => p.startsWith('L')); // หาคำว่า 'L4'
          const slotStr = parts.find((p: string) => p.startsWith('S'));  // หาคำว่า 'S1'

          return {
            id: item.LocationName,
            location_code: item.LocationName,
            layer_no: layerStr ? parseInt(layerStr.replace('L', '')) : 0,
            slot_no: slotStr ? parseInt(slotStr.replace('S', '')) : 0,
            is_occupied: item.is_occupied || false // 👈 ตรงนี้จะเช็คจากคอลัมน์ที่บอสเพิ่มใน DB
          }
        }).filter(loc => loc.layer_no > 0 && loc.slot_no > 0); // กรองเอาเฉพาะอันที่ตัดคำสำเร็จ

        setLocations(parsed);
      }
    }
    fetchLocations()
  }, [selectedShelf])

  return (
    <div className="w-full h-full flex flex-col bg-slate-50/50">
      {/* Header ของแผนที่ */}
      <div className="p-5 border-b border-slate-200 bg-white shrink-0">
        <h3 className="font-black text-lg text-slate-800"><i className="bi bi-map-fill text-blue-500 mr-2"></i> Visual Storage Map</h3>
        <p className="text-xs text-slate-500 mt-1">คลิกที่ช่องสีเขียวเพื่อเลือกพิกัดจัดเก็บให้ Fixture นี้</p>
      </div>

      {/* ปุ่มเลือก Shelf (Auto-generated) */}
      <div className="p-3 bg-slate-100 flex gap-2 overflow-x-auto shrink-0 shadow-inner min-h-[60px]">
        {shelfList.map(shelf => (
          <button 
            key={shelf} type="button" onClick={() => setSelectedShelf(shelf)}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedShelf === shelf ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'}`}
          >
            Shelf {shelf}
          </button>
        ))}
        {shelfList.length === 0 && <span className="text-xs text-slate-400 font-bold m-auto">กำลังโหลดพิกัด...</span>}
      </div>

      {/* พื้นที่จำลอง Shelf (Grid) */}
      <div className="p-6 overflow-y-auto flex-1">
        <div className="grid gap-6 max-w-lg mx-auto">
          {/* วนลูปวาดชั้นจากบนลงล่าง */}
          {Array.from(new Set(locations.map(l => l.layer_no))).sort((a,b) => b - a).map(layer => (
            <div key={layer} className="relative flex items-center">
              <div className="w-16 font-black text-slate-300 text-xs tracking-widest shrink-0">L{layer}</div>
              <div className="flex-1 grid grid-cols-2 gap-4 border-b-4 border-slate-300 pb-3">
                
                {/* วนลูปวาดกล่องซ้าย-ขวา */}
                {[1, 2].map(slotNum => {
                  const slot = locations.find(l => l.layer_no === layer && l.slot_no === slotNum);
                  
                  // ถ้า Database บอสลืมใส่ S1 หรือ S2 ช่องนั้นจะโบ๋ ให้โชว์กล่องเปล่าๆ ไว้ก่อน
                  if (!slot) return <div key={`empty-${slotNum}`} className="h-28 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 opacity-50 flex items-center justify-center text-[10px] text-slate-400 font-bold">ไม่มีข้อมูล S{slotNum} ใน DB</div>;

                  const isSelected = selectedLocations.includes(slot.location_code);
                  
                  return (
                    <button 
                      key={slot.id} type="button"
                      disabled={slot.is_occupied}
                      onClick={() => onToggleLocation(slot.location_code)}
                      className={`relative h-28 rounded-xl border-2 transition-all flex flex-col items-center justify-center
                        ${slot.is_occupied ? 'border-slate-200 bg-slate-100 cursor-not-allowed opacity-70' : 
                          isSelected ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/20 shadow-md' : 
                          'border-dashed border-emerald-300 bg-white hover:border-emerald-500 hover:bg-emerald-50 shadow-sm group'}`}
                    >
                      {slot.is_occupied ? (
                        <>
                          <img src="/black-box.png" className="w-12 h-12 object-contain opacity-60 mb-1" alt="Occupied" />
                          <p className="text-[9px] text-slate-500 font-bold">เต็มแล้ว (OCCUPIED)</p>
                        </>
                      ) : (
                        <>
                          <i className={`bi ${isSelected ? 'bi-check-circle-fill text-blue-600' : 'bi-plus-circle text-emerald-500 group-hover:scale-110 transition-transform'} text-xl mb-1`}></i>
                          <p className={`text-[10px] font-black uppercase ${isSelected ? 'text-blue-700' : 'text-emerald-600'}`}>{isSelected ? 'Selected' : 'Available'}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5 font-mono">{slot.location_code}</p>
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
