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
  const [isLoading, setIsLoading] = useState(true)
  const [tabs, setTabs] = useState<{ label: string, shelves: string[] }[]>([])
  const [activeTabLabel, setActiveTabLabel] = useState('')
  const [locationData, setLocationData] = useState<Record<string, boolean>>({}) // เก็บพิกัดที่มีอยู่จริงในระบบ
  const [occupiedMap, setOccupiedMap] = useState<Record<string, string>>({}) // เก็บพิกัดที่โดนใช้งานแล้ว (Location -> Item ID)

  useEffect(() => {
    fetchStorageData()
  }, [])

  const fetchStorageData = async () => {
    setIsLoading(true)

    // 1. ดึงข้อมูลพิกัดคลังสินค้าทั้งหมดที่เป็นของโซน Fixture
    const { data: locMaster } = await supabase.from('LocationMaster')
      .select('LocationName')
      .ilike('LocationName', '1-FTR-%')

    const locMap: Record<string, boolean> = {}
    const shelfSet = new Set<string>()

    locMaster?.forEach(item => {
      locMap[item.LocationName] = true
      const parts = item.LocationName.split('-')
      if (parts.length >= 3) {
        shelfSet.add(parts[2]) // ดึงรหัสตู้ออกมา เช่น 'A01', 'A02'
      }
    })
    setLocationData(locMap)

    // 2. เช็กของที่มีอยู่จริงในระบบ (Fixtures และ อะไหล่ทั่วไป) ว่ายึดช่องไหนไปแล้วบ้าง!
    const { data: fixData } = await supabase.from('Fixtures').select('FixtureNo, Location')
    const { data: stockData } = await supabase.from('Stock').select('PartID, Location').gt('Balance', 0)

    const occMap: Record<string, string> = {}

    // ยัดข้อมูล Fixture ลงแผนที่
    fixData?.forEach(f => {
      if (f.Location && f.Location !== '-') {
        f.Location.split(',').forEach((l: string) => { occMap[l.trim()] = f.FixtureNo })
      }
    })

    // ยัดข้อมูล Stock อะไหล่ ลงแผนที่
    stockData?.forEach(s => {
      if (s.Location && s.Location !== '-') {
        s.Location.split(',').forEach((l: string) => { occMap[l.trim()] = s.PartID })
      }
    })
    setOccupiedMap(occMap)

    // 3. หั่นตู้เชลฟ์ออกเป็นกลุ่ม กลุ่มละ 5 ตู้ (ตามหลัก ABC Analysis)
    const sortedShelves = Array.from(shelfSet).sort()
    const chunkedTabs = []
    for (let i = 0; i < sortedShelves.length; i += 5) {
      const chunk = sortedShelves.slice(i, i + 5)
      const label = chunk.length > 1 ? `${chunk[0]} - ${chunk[chunk.length - 1]}` : chunk[0]
      chunkedTabs.push({ label, shelves: chunk })
    }

    setTabs(chunkedTabs)
    if (chunkedTabs.length > 0) setActiveTabLabel(chunkedTabs[0].label)

    setIsLoading(false)
  }

  const activeTab = tabs.find(t => t.label === activeTabLabel)

  return (
    <div className="w-full h-full flex flex-col bg-[#e2e8f0] relative">
      
      {/* 🌟 Header */}
      <div className="p-5 border-b border-slate-300 bg-white shrink-0 shadow-sm z-10">
        <h3 className="font-black text-lg text-slate-800"><i className="bi bi-map-fill text-indigo-500 mr-2"></i> Visual Storage Map</h3>
        <p className="text-xs text-slate-500 mt-1">คลิกที่ช่องสีเขียวเพื่อเลือกพิกัดจัดเก็บ ระบบตัดกลุ่มเชลฟ์อัตโนมัติ 5 ตู้/โซน</p>
      </div>

      {/* 🌟 Tab Selector (จัดกลุ่มทีละ 5) */}
      <div className="p-3 bg-slate-100 flex gap-2 overflow-x-auto shrink-0 shadow-inner min-h-[64px] border-b border-slate-300 z-10">
        {isLoading ? (
          <span className="text-xs text-slate-400 font-bold m-auto flex items-center gap-2"><i className="bi bi-arrow-repeat animate-spin text-lg"></i> โหลดข้อมูลคลังสินค้า...</span>
        ) : (
          tabs.map(tab => (
            <button 
              key={tab.label} type="button" onClick={() => setActiveTabLabel(tab.label)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap shadow-sm border ${
                activeTabLabel === tab.label 
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-600/30' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              โซน {tab.label}
            </button>
          ))
        )}
      </div>

      {/* 🌟 พื้นที่จำลอง Shelf (เรียงตู้หน้ากระดาน) */}
      <div className="p-6 overflow-y-auto overflow-x-auto flex-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        
        {activeTab && (
          <div className="flex gap-8 pb-8 w-max mx-auto px-4">
            
            {/* วนลูปวาดตู้ (Shelf) แต่ละตู้ในกลุ่ม */}
            {activeTab.shelves.map(shelf => (
              <div key={shelf} className="flex flex-col min-w-[280px] bg-slate-300 p-3.5 rounded-[1.5rem] border-4 border-slate-400 shadow-2xl relative">
                
                {/* ป้ายชื่อตู้ */}
                <div className="text-center bg-slate-700 text-white font-black py-2 rounded-xl mb-4 shadow-inner uppercase tracking-widest text-sm">
                  ตู้ {shelf}
                </div>

                {/* โครงเหล็กของตู้ */}
                <div className="flex flex-col gap-3">
                  {[5, 4, 3, 2, 1].map(layer => (
                    <div key={layer} className="flex gap-3 bg-slate-400/30 p-2.5 rounded-2xl relative border-b-4 border-slate-400/50 shadow-inner">
                      
                      {/* ป้ายบอกชั้น (L1, L2...) */}
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-slate-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm z-10 border border-slate-700">
                        L{layer}
                      </div>

                      {/* ช่องวางของ ซ้าย-ขวา */}
                      {[1, 2].map(slot => {
                        const locCode = `1-FTR-${shelf}-L${layer}-S${slot}`;
                        const isExistInDB = locationData[locCode]; // เช็กว่าแอดมินสร้างช่องนี้ไว้ในระบบหรือเปล่า
                        const occupiedItem = occupiedMap[locCode]; // เช็กว่ามีใครเอาของมาวางทับหรือยัง
                        const isSelected = selectedLocations.includes(locCode);

                        // ถ้าฐานข้อมูลไม่มีรหัสช่องนี้ ให้แสดงเป็นช่องโหว่ (Void)
                        if (!isExistInDB) {
                          return (
                            <div key={locCode} className="flex-1 h-24 rounded-xl border-2 border-dashed border-slate-400 bg-slate-300/30 flex items-center justify-center opacity-60">
                              <span className="text-[10px] font-bold text-slate-500">-</span>
                            </div>
                          );
                        }

                        // ถ้าช่องนั้นโดนจองแล้ว (Occupied)
                        if (occupiedItem) {
                          return (
                            <div key={locCode} className="flex-1 h-24 rounded-xl border-2 border-slate-400 bg-slate-200 flex flex-col items-center justify-center opacity-80 cursor-not-allowed shadow-inner relative overflow-hidden">
                              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.05)_25%,rgba(0,0,0,0.05)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.05)_75%,rgba(0,0,0,0.05)_100%)] bg-[length:10px_10px]"></div>
                              <img src="/black-box.png" className="w-10 h-10 object-contain drop-shadow-md mb-1 relative z-10" alt="Box" />
                              <p className="text-[9px] font-black text-slate-700 bg-white/70 px-2 py-0.5 rounded backdrop-blur-sm relative z-10 truncate max-w-[90%]">{occupiedItem}</p>
                            </div>
                          );
                        }

                        // ถ้าช่องนั้นว่าง และคลิกเลือกได้
                        return (
                          <button 
                            key={locCode} type="button"
                            onClick={() => onToggleLocation(locCode)}
                            className={`flex-1 h-24 rounded-xl border-2 transition-all flex flex-col items-center justify-center shadow-md relative overflow-hidden
                              ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-500/30' : 'border-emerald-400 bg-white hover:border-emerald-600 hover:bg-emerald-50 hover:-translate-y-1 group'}`}
                          >
                            <i className={`bi ${isSelected ? 'bi-check-circle-fill text-indigo-600' : 'bi-plus-circle text-emerald-500 group-hover:scale-125 transition-transform'} text-xl mb-1`}></i>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-indigo-700' : 'text-emerald-600'}`}>{isSelected ? 'Selected' : 'Available'}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Slot {slot}</p>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="h-6 w-full mt-2 border-x-4 border-b-4 border-slate-400 rounded-b-lg opacity-50"></div> {/* ขาตู้เชลฟ์ */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
