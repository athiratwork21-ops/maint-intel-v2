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
  const [shelfData, setShelfData] = useState<Record<string, Record<number, Record<number, { code: string, occupiedBy: string | null }>>>>({})

  useEffect(() => {
    fetchStorageData()
  }, [])

  const fetchStorageData = async () => {
    setIsLoading(true)

    const { data: locMaster } = await supabase.from('LocationMaster').select('LocationName').ilike('LocationName', '1-FTR-%')
    
    const { data: fixData } = await supabase.from('Fixtures').select('FixtureNo, Location')
    const { data: stockData } = await supabase.from('Stock').select('PartID, Location').gt('Balance', 0)

    const occMap: Record<string, string> = {}
    fixData?.forEach(f => { if (f.Location && f.Location !== '-') f.Location.split(',').forEach((l: string) => { occMap[l.trim()] = f.FixtureNo }) })
    stockData?.forEach(s => { if (s.Location && s.Location !== '-') s.Location.split(',').forEach((l: string) => { occMap[l.trim()] = s.PartID }) })

    const sData: Record<string, Record<number, Record<number, { code: string, occupiedBy: string | null }>>> = {}
    const shelfSet = new Set<string>()

    locMaster?.forEach(item => {
      const locCode = item.LocationName
      const parts = locCode.split('-') 
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

    const sortedShelves = Array.from(shelfSet).sort()
    const groupedByZone: Record<string, string[]> = {}

    sortedShelves.forEach(shelf => {
      const zone = shelf.charAt(0)
      if (!groupedByZone[zone]) groupedByZone[zone] = []
      groupedByZone[zone].push(shelf)
    })

    const chunkedTabs: { label: string, shelves: string[] }[] = []

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
    <div className="w-full h-full flex flex-col bg-slate-100 relative">
      
      <div className="p-4 border-b border-slate-200 bg-white shrink-0 z-10 flex justify-between items-center shadow-sm">
        <div>
          <h3 className="font-black text-base text-slate-800"><i className="bi bi-diagram-3-fill text-indigo-500 mr-2"></i> Visual Storage Map</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">แบ่งโซนคลังสินค้าอัตโนมัติ (A, B, C แยกจากกัน)</p>
        </div>
      </div>

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

      <div className="p-6 overflow-y-auto overflow-x-auto flex-1 bg-slate-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] transform-gpu">
        {activeTab && (
          <div className="flex gap-5 pb-8 w-max mx-auto px-2 will-change-transform">
            {activeTab.shelves.map(shelf => (
              
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
