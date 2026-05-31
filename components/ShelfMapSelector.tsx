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
  
  // 🌟 ใช้ Dictionary เพื่อความเร็วแบบ O(1) (แก้ปัญหาเว็บหน่วง)
  const [shelfData, setShelfData] = useState<Record<string, Record<number, Record<number, { code: string, occupiedBy: string | null }>>>>({})

  useEffect(() => {
    fetchStorageData()
  }, [])

  const fetchStorageData = async () => {
    setIsLoading(true)

    // 1. ดึงข้อมูลพิกัดคลังสินค้าทั้งหมดที่เป็นของโซน Fixture
    const { data: locMaster } = await supabase.from('LocationMaster').select('LocationName').ilike('LocationName', '1-FTR-%')
    
    // 2. ดึงข้อมูลของที่ใช้งานอยู่ (Fixtures & Stock)
    const { data: fixData } = await supabase.from('Fixtures').select('FixtureNo, Location')
    const { data: stockData } = await supabase.from('Stock').select('PartID, Location').gt('Balance', 0)

    const occMap: Record<string, string> = {}
    fixData?.forEach(f => { if (f.Location && f.Location !== '-') f.Location.split(',').forEach((l: string) => { occMap[l.trim()] = f.FixtureNo }) })
    stockData?.forEach(s => { if (s.Location && s.Location !== '-') s.Location.split(',').forEach((l: string) => { occMap[l.trim()] = s.PartID }) })

    // 3. ประกอบร่าง Dictionary (จัดเรียง Shelf -> Layer -> Slot)
    const sData: Record<string, Record<number, Record<number, { code: string, occupiedBy: string | null }>>> = {}
    const shelfSet = new Set<string>()

    locMaster?.forEach(item => {
      const locCode = item.LocationName
      const parts = locCode.split('-') // ['1', 'FTR', 'A01', 'L5', 'S1']
      if (parts.length >= 5) {
        const shelf = parts[2]
        const layer = parseInt(parts[3].replace('L', ''))
        const slot = parseInt(parts[4].replace('S', ''))

        if (!sData[shelf]) sData[shelf] = {}
        if (!sData[shelf][layer]) sData[shelf][layer] = {}

        sData[shelf][layer][slot] = {
          code: locCode,
          occupiedBy: occMap[locCode] || null
        }
        shelfSet.add(shelf)
      }
    })
    setShelfData(sData)

    // 4. จัดกลุ่มตู้ (ห้าม A ปน B) และตัดแบ่งทีละ 5 ตู้
    const sortedShelves = Array.from(shelfSet).sort()
    const groupedByZone: Record<string, string[]> = {}

    // แยกกลุ่มตามตัวอักษรนำหน้า (A, B, C)
    sortedShelves.forEach(shelf => {
      const zone = shelf.charAt(0)
      if (!groupedByZone[zone]) groupedByZone[zone] = []
      groupedByZone[zone].push(shelf)
    })

    const chunkedTabs: { label: string, shelves: string[] }[] = []

    // ตัดกลุ่มละ 5 ตู้ ของแต่ละ Zone
    Object.keys(groupedByZone).sort().forEach(zone => {
      const shelvesInZone = groupedByZone[zone]
      for (let i = 0; i < shelvesInZone.length; i += 5) {
        const chunk = shelvesInZone.slice(i, i + 5)
        const label = chunk.length > 1 
          ? `โซน ${zone} (${chunk[0]} - ${chunk[chunk.length - 1]})` 
          : `โซน ${zone} (${chunk[0]})`
        chunkedTabs.push({ label, shelves: chunk })
      }
    })

    setTabs(chunkedTabs)
    if (chunkedTabs.length > 0) setActiveTabLabel(chunkedTabs[0].label)
    setIsLoading(false)
  }

  const activeTab = tabs.find(t => t.label === activeTabLabel)

  return (
    <div className="w-full h-full flex flex-col bg-slate-100">
      
      {/* 🌟 Header */}
      <div className="p-4 border-b border-slate-200 bg-white shrink-0 z-10 flex justify-between items-center">
        <div>
          <h3 className="font-black text-base text-slate-800"><i className="bi bi-diagram-3-fill text-indigo-500 mr-2"></i> Visual Storage Map</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">แบ่งโซนคลังสินค้าอัตโนมัติ (A, B, C แยกจากกัน)</p>
        </div>
      </div>

      {/* 🌟 Tab Selector */}
      <div className="p-3 bg-white flex gap-2 overflow-x-auto shrink-0 shadow-sm border-b border-slate-200 z-10 scrollbar-hide">
        {isLoading ? (
          <span className="text-[11px] text-slate-400 font-bold m-auto flex items-center gap-2"><i className="bi bi-arrow-repeat animate-spin text-sm"></i> กำลังโหลดโครงสร้างคลัง...</span>
        ) : (
          tabs.map(tab => (
            <button 
              key={tab.label} type="button" onClick={() => setActiveTabLabel(tab.label)}
              className={`px-5 py-2 rounded-lg text-[11px] font-black transition-all whitespace-nowrap shadow-sm border ${
                activeTabLabel === tab.label 
                  ? 'bg-indigo-600 text-white border-indigo-700' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))
        )}
      </div>

      {/* 🌟 พื้นที่จำลอง Shelf */}
      <div className="p-6 overflow-y-auto overflow-x-auto flex-1 bg-slate-100/50">
        {activeTab && (
          <div className="flex gap-6 pb-8 w-max mx-auto px-2">
            {activeTab.shelves.map(shelf => (
              <div key={shelf} className="flex flex-col min-w-[200px] bg-white p-2.5 rounded-2xl border border-slate-200 shadow-lg relative">
                
                <div className="text-center bg-slate-800 text-white font-black py-1.5 rounded-xl mb-3 shadow-inner text-xs tracking-wider">
                  {shelf}
                </div>

                <div className="flex flex-col gap-2">
                  {[5, 4, 3, 2, 1].map(layer => (
                    <div key={layer} className="flex gap-2 relative border-b-2 border-slate-100 pb-2">
                      <div className="w-5 flex items-center justify-center bg-slate-50 rounded text-[9px] font-black text-slate-400 border border-slate-100">
                        L{layer}
                      </div>

                      <div className="flex-1 grid grid-cols-2 gap-2">
                        {[1, 2].map(slot => {
                          const slotData = shelfData[shelf]?.[layer]?.[slot];

                          // 🔴 ถ้าไม่ได้แอดพิกัดไว้ใน Database ปล่อยช่องให้ล่องหนไปเลย จะได้ไม่รกตา
                          if (!slotData) {
                            return <div key={`empty-${slot}`} className="h-14 rounded-lg bg-transparent border border-dashed border-slate-200/50"></div>;
                          }

                          const isSelected = selectedLocations.includes(slotData.code);

                          // 🔴 ถ้าของเต็มแล้ว (Occupied)
                          if (slotData.occupiedBy) {
                            return (
                              <div key={slotData.code} className="h-14 rounded-lg border border-slate-300 bg-slate-100 flex flex-col items-center justify-center opacity-80 cursor-not-allowed shadow-inner">
                                <i className="bi bi-box-seam-fill text-slate-400 text-sm mb-0.5"></i>
                                <span className="text-[8px] font-bold text-slate-500 truncate max-w-[80%]">{slotData.occupiedBy}</span>
                              </div>
                            );
                          }

                          // 🟢 ถ้าว่างและคลิกได้ (Available)
                          return (
    <div className="w-full h-full flex flex-col bg-slate-100 relative">
      
      {/* 🌟 Header */}
      <div className="p-4 border-b border-slate-200 bg-white shrink-0 z-10 flex justify-between items-center shadow-sm">
        <div>
          <h3 className="font-black text-base text-slate-800"><i className="bi bi-diagram-3-fill text-indigo-500 mr-2"></i> Visual Storage Map</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">แบ่งโซนคลังสินค้าอัตโนมัติ (A, B, C แยกจากกัน)</p>
        </div>
      </div>

      {/* 🌟 Tab Selector */}
      <div className="p-3 bg-white flex gap-2 overflow-x-auto shrink-0 border-b border-slate-200 z-10 scrollbar-hide shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]">
        {isLoading ? (
          <span className="text-[11px] text-slate-400 font-bold m-auto flex items-center gap-2"><i className="bi bi-arrow-repeat animate-spin text-sm"></i> กำลังโหลดโครงสร้างคลัง...</span>
        ) : (
          tabs.map(tab => (
            <button 
              key={tab.label} type="button" onClick={() => setActiveTabLabel(tab.label)}
              className={`px-5 py-2 rounded-lg text-[11px] font-black transition-colors whitespace-nowrap border ${
                activeTabLabel === tab.label 
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))
        )}
      </div>

      {/* 🌟 พื้นที่จำลอง Shelf (แก้ความหน่วง + แก้บั๊กภาพหลุด) */}
      {/* ใช้ CSS เปล่าๆ ทำลายจุดแทนรูปภาพ และเปิด transform-gpu เพื่อให้ลื่นขึ้น */}
      <div className="p-6 overflow-y-auto overflow-x-auto flex-1 bg-slate-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] transform-gpu">
        {activeTab && (
          <div className="flex gap-5 pb-8 w-max mx-auto px-2 will-change-transform">
            {activeTab.shelves.map(shelf => (
              
              {/* 🚨 แก้บั๊กตรงนี้: ใส่ w-[220px] shrink-0 ล็อกขนาดตายตัว และใส่ overflow-hidden ตัดส่วนที่ล้น */}
              <div key={shelf} className="flex flex-col w-[220px] shrink-0 bg-white p-3 rounded-2xl border border-slate-200 shadow-md relative overflow-hidden contain-paint">
                
                <div className="text-center bg-slate-800 text-white font-black py-1.5 rounded-xl mb-3 shadow-inner text-xs tracking-wider">
                  {shelf}
                </div>

                <div className="flex flex-col gap-2">
                  {[5, 4, 3, 2, 1].map(layer => (
                    <div key={layer} className="flex gap-2 relative border-b-2 border-slate-50 pb-2">
                      <div className="w-6 flex items-center justify-center bg-slate-100/50 rounded-lg text-[10px] font-black text-slate-400 border border-slate-100">
                        L{layer}
                      </div>

                      <div className="flex-1 grid grid-cols-2 gap-2">
                        {[1, 2].map(slot => {
                          const slotData = shelfData[shelf]?.[layer]?.[slot];

                          if (!slotData) {
                            return <div key={`empty-${slot}`} className="h-14 rounded-lg bg-transparent border border-dashed border-slate-200/50"></div>;
                          }

                          const isSelected = selectedLocations.includes(slotData.code);

                          if (slotData.occupiedBy) {
                            return (
                              <div key={slotData.code} className="h-14 rounded-lg border border-slate-200 bg-slate-100 flex flex-col items-center justify-center opacity-80 cursor-not-allowed shadow-inner overflow-hidden">
                                <i className="bi bi-box-seam-fill text-slate-400 text-sm mb-0.5"></i>
                                <span className="text-[8px] font-bold text-slate-500 w-full text-center px-1 truncate">{slotData.occupiedBy}</span>
                              </div>
                            );
                          }

                          return (
                            <button 
                              key={slotData.code} type="button"
                              onClick={() => onToggleLocation(slotData.code)}
                              // 🚨 ลดภาระเครื่องโดยเปลี่ยน transition-all เป็น transition-colors
                              className={`h-14 rounded-lg border-2 transition-colors flex flex-col items-center justify-center group
                                ${isSelected 
                                  ? 'border-indigo-500 bg-indigo-50 shadow-sm' 
                                  : 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-500 hover:bg-emerald-100'}`}
                            >
                              {isSelected ? (
                                <i className="bi bi-check-circle-fill text-indigo-600 text-lg"></i>
                              ) : (
                                <>
                                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">ว่าง</span>
                                  <span className="text-[8px] font-bold text-emerald-400 mt-0.5">S{slot}</span>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
