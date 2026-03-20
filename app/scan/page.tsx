"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getSmartMaintenanceData } from '../../lib/maintenanceLogic';

const searchDictionary: Record<string, string[]> = {
  'สายพาน': ['belt', 'band'],
  'มอเตอร์': ['motor', 'drive'],
  'ลูกปืน': ['bearing'],
  'เซนเซอร์': ['sensor', 'prox', 'photo'],
  'น็อต': ['bolt', 'nut', 'screw'],
  'วาล์ว': ['valve'],
  'ปั๊ม': ['pump'],
  'ใบมีด': ['blade', 'cutter'],
  'สวิตช์': ['switch'],
  'ถุงมือ': ['glove'],
  'หน้ากาก': ['mask'],
};

export default function RequestPartShoppingPage() {
  // 🌟 State สำหรับ Setup (เลือกแผนกและชื่อ)
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [activeDept, setActiveDept] = useState('');
  const [pickerName, setPickerName] = useState('');

  // 🌟 State ข้อมูลหลัก
  const [parts, setParts] = useState<any[]>([]);
  const [consumables, setConsumables] = useState<any[]>([]); 
  const [machines, setMachines] = useState<any[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [stockAllocations, setStockAllocations] = useState<any>({}); 
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [historicalPositions, setHistoricalPositions] = useState<Record<string, string[]>>({}); // 🌟 เก็บประวัติ Position
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeCategory, setActiveCategory] = useState<'parts' | 'consumables'>('parts');
  const [cart, setCart] = useState<{ [itemId: string]: { qty: number, type: 'part' | 'consumable', position?: string } }>({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [selectedLine, setSelectedLine] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [reason, setReason] = useState('Normal Wear');

  const [toast, setToast] = useState<{message: string, type: 'success' | 'warning' | 'info' | 'error'} | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  // 🌟 โหลดข้อมูล Setup เริ่มต้น
  useEffect(() => {
    const d = localStorage.getItem('mechanicDept');
    const n = localStorage.getItem('mechanicName');
    
    if (d && n) {
      setActiveDept(d);
      setPickerName(n);
      setIsSetupComplete(true);
      fetchInitialData(d);
    } else {
      fetchDepartmentsForSetup();
    }
  }, []);

  const fetchDepartmentsForSetup = async () => {
    const { data } = await supabase.from('Departments').select('*');
    if (data) setDepartments(data);
    setIsLoading(false);
  };

  const handleSetupComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDept || !pickerName.trim()) return showToast('กรุณากรอกข้อมูลให้ครบ', 'warning');
    localStorage.setItem('mechanicDept', activeDept);
    localStorage.setItem('mechanicName', pickerName);
    setIsSetupComplete(true);
    fetchInitialData(activeDept);
  };

  const handleChangeProfile = () => {
    setIsSetupComplete(false);
    fetchDepartmentsForSetup();
  };

  // 🌟 ดึงข้อมูลตามแผนก (Department Isolation)
  const fetchInitialData = async (dept: string) => {
    setIsLoading(true);
    try {
      // 1. ดึงข้อมูลหลักจาก Logic
      const data = await getSmartMaintenanceData(dept);
      setMachines(data.rawMachines.filter(m => m.Active !== false));
      setLines(data.rawLines);
      setParts(data.rawParts);
      setStockAllocations(data.allocations);

      // 2. ดึงตั๋วที่รอจ่ายของแผนกตัวเอง
      const { data: reqData } = await supabase.from('PartRequests').select('*').eq('Status', 'Pending').eq('DepartmentID', dept);
      setPendingRequests(reqData || []);

      // 3. ดึงของสิ้นเปลืองเฉพาะแผนก
      const { data: consData } = await supabase.from('Consumable').select('*').eq('DepartmentID', dept);
      setConsumables(consData || []);

      // 🌟 4. ดึงประวัติ Position ของอะไหล่แต่ละตัวมาทำเป็น Dropdown แนะนำ
      const { data: historyData } = await supabase.from('ChangeHistory').select('PartID, Position').eq('DepartmentID', dept);
      const posMap: Record<string, Set<string>> = {};
      historyData?.forEach(h => {
        if (!posMap[h.PartID]) posMap[h.PartID] = new Set();
        if (h.Position && h.Position !== '-') posMap[h.PartID].add(h.Position);
      });
      const formattedMap: Record<string, string[]> = {};
      Object.keys(posMap).forEach(k => formattedMap[k] = Array.from(posMap[k]));
      setHistoricalPositions(formattedMap);

    } catch (error) { console.error(error); showToast('โหลดข้อมูลล้มเหลว', 'error'); } finally { setIsLoading(false); }
  };

  const getRealAvailableQty = (itemId: string, type: 'part' | 'consumable') => {
    const otherMechanicsPendingQty = pendingRequests.filter(r => r.PartID === itemId).reduce((s, r) => s + (r.Qty || 0), 0);
    const currentCartQty = cart[itemId]?.qty || 0;

    if (type === 'part') {
      const alloc = stockAllocations[itemId] || { available: 0 };
      return alloc.available - otherMechanicsPendingQty - currentCartQty;
    } else {
      const cons = consumables.find(c => c.ItemID === itemId);
      const balance = cons ? cons.Balance : 0;
      return balance - otherMechanicsPendingQty - currentCartQty;
    }
  };

  const handleUpdateCart = (itemId: string, type: 'part' | 'consumable', delta: number) => {
    const realAvailable = getRealAvailableQty(itemId, type);
    const currentQty = cart[itemId]?.qty || 0;
    const newQty = currentQty + delta;

    if (delta > 0 && realAvailable <= 0) {
      return showToast('ของในคลังหมด หรือมีคนเบิกไปแล้วครับ!', 'error');
    }

    if (newQty <= 0) {
      const newCart = { ...cart };
      delete newCart[itemId];
      setCart(newCart);
    } else {
      setCart({ ...cart, [itemId]: { qty: newQty, type, position: cart[itemId]?.position || '' } });
    }
  };

  const getSearchTerms = (query: string) => {
    const lowerQuery = query.toLowerCase();
    let terms = [lowerQuery];
    Object.keys(searchDictionary).forEach(thaiWord => {
      if (thaiWord.includes(lowerQuery) || lowerQuery.includes(thaiWord)) { terms = [...terms, ...searchDictionary[thaiWord]]; }
    });
    return terms;
  };

  const searchTerms = getSearchTerms(searchQuery);
  const filteredParts = parts.filter(p => {
    if (!searchQuery) return true;
    const matchString = `${p.PartName} ${p.PartModel} ${p.PartID}`.toLowerCase();
    return searchTerms.some(term => matchString.includes(term));
  });
  const filteredConsumables = consumables.filter(c => {
    if (!searchQuery) return true;
    const matchString = `${c.ItemName} ${c.ItemModel || ''} ${c.ItemID}`.toLowerCase();
    return searchTerms.some(term => matchString.includes(term));
  });

  const cartItemsCount = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  const hasSparePartsInCart = Object.values(cart).some(item => item.type === 'part');

  // 🌟 ฟังก์ชันส่งใบเบิก (ป้องกัน Race Condition ของหมดกระทันหัน)
  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSparePartsInCart && !selectedMachine) return showToast('กรุณาเลือกเครื่องจักรสำหรับอะไหล่', 'warning');
    
    // เช็คว่ากรอก Position ครบไหมสำหรับอะไหล่
    const missingPos = Object.keys(cart).find(id => cart[id].type === 'part' && !cart[id].position?.trim());
    if (missingPos) return showToast('กรุณาระบุ "จุดที่ติดตั้ง" ให้ครบทุกรายการ', 'warning');

    setIsSubmitting(true);

    try {
      // 🌟 1. ดับเบิ้ลเช็คสต๊อกแบบ Real-time (Race Condition Defense)
      const { data: freshReqs } = await supabase.from('PartRequests').select('PartID, Qty').eq('Status', 'Pending').eq('DepartmentID', activeDept);
      const { data: freshStocks } = await supabase.from('Stock').select('PartID, Balance').eq('DepartmentID', activeDept);
      const { data: freshCons } = await supabase.from('Consumable').select('ItemID, Balance').eq('DepartmentID', activeDept);

      for (const itemId of Object.keys(cart)) {
        const item = cart[itemId];
        const pendingQty = freshReqs?.filter(r => r.PartID === itemId).reduce((sum, r) => sum + (r.Qty || 0), 0) || 0;
        
        let available = 0;
        if (item.type === 'part') {
           const stockBal = freshStocks?.filter(s => s.PartID === itemId).reduce((sum, s) => sum + (s.Balance || 0), 0) || 0;
           available = stockBal - pendingQty;
        } else {
           const cons = freshCons?.find(c => c.ItemID === itemId);
           available = (cons?.Balance || 0) - pendingQty;
        }

        if (available < item.qty) {
           const name = item.type === 'part' ? parts.find(p=>p.PartID === itemId)?.PartName : consumables.find(c=>c.ItemID === itemId)?.ItemName;
           throw new Error(`ของไม่พอ! มีคนเบิก "${name}" ตัดหน้าไปแล้วครับ (เหลือ ${Math.max(0, available)} ชิ้น)`);
        }
      }

      // 🌟 2. ถ้าสต๊อกผ่านหมด ก็บันทึกได้เลย!
      const baseId = Date.now(); 
      const insertData = Object.keys(cart).map((itemId, idx) => ({
        RequestID: `REQ-${baseId}-${idx + 1}`, 
        MachineID: cart[itemId].type === 'part' ? selectedMachine : 'GENERAL',
        PartID: itemId,
        Qty: cart[itemId].qty,
        Position: cart[itemId].type === 'part' ? cart[itemId].position : '-', // 🌟 บันทึก Position
        Reason: cart[itemId].type === 'part' ? reason : 'Consumable',
        PickerName: pickerName,
        Status: 'Pending',
        DepartmentID: activeDept // 🌟 บันทึกแผนก
      }));

      const { error } = await supabase.from('PartRequests').insert(insertData);
      if (error) throw error;

      // =========================================================
      // 🌟 เพิ่มโค้ดส่งแจ้งเตือนเข้า LINE ตรงนี้ (LINE API) 🌟
      // =========================================================
      try {
        const itemNames = Object.keys(cart).map(itemId => {
          const isPart = cart[itemId].type === 'part';
          return isPart ? parts.find(p => p.PartID === itemId)?.PartName : consumables.find(c => c.ItemID === itemId)?.ItemName;
        }).join(', ');
        
        const lineMsg = `🚨 ใบเบิกใหม่! (แผนก: ${activeDept})\n👨‍🔧 ช่าง: ${pickerName}\n📦 รายการ: ${itemNames}\n🔢 จำนวนรวม: ${Object.keys(cart).length} รายการ\n👉 ผู้ดูแลโปรดตรวจสอบในระบบครับ`;
        
        await fetch('/api/send-line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: lineMsg })
        });
      } catch (err) {
        console.error('Line Notify Error:', err);
      }
      // =========================================================

      showToast('ส่งคำขอสำเร็จ! รอรับของที่ Center', 'success');
      setCart({}); 
      setIsCheckoutOpen(false);
      setSelectedLine(''); setSelectedMachine('');
      fetchInitialData(activeDept); 
    } catch (error: any) { 
      showToast(error.message, 'error'); 
      fetchInitialData(activeDept); // รีเฟรชหน้าจอใหม่ให้เห็นสต๊อกจริง
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const filteredMachines = machines.filter(m => m.LineName === selectedLine);

  // 🌟 หน้าจอ Setup ถ้ายังไม่ได้เลือกแผนก
  if (!isSetupComplete && !isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-900 p-6 font-sans">
        <div className="w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner"><i className="bi bi-tools"></i></div>
          <h1 className="text-2xl font-black text-center text-slate-800 tracking-tight mb-2">Request Parts</h1>
          <p className="text-center text-slate-500 text-xs mb-6 font-medium">กรุณาตั้งค่าโปรไฟล์ก่อนเริ่มใช้งาน</p>
          <form onSubmit={handleSetupComplete} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">1. แผนกของคุณ (Department)</label>
              <div className="relative">
                <select value={activeDept} onChange={e => setActiveDept(e.target.value)} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm appearance-none">
                  <option value="" disabled>-- เลือกแผนก --</option>
                  {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>)}
                </select>
                <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">2. ชื่อช่างผู้เบิก (Your Name)</label>
              <div className="relative">
                <i className="bi bi-person-fill absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                <input type="text" value={pickerName} onChange={e => setPickerName(e.target.value)} required placeholder="เช่น ช่างสมชาย" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm" />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all text-[15px] mt-4">เข้าสู่ระบบเบิกของ <i className="bi bi-arrow-right ml-1"></i></button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50"><i className="bi bi-arrow-repeat animate-spin text-4xl text-[#0f172a]"></i></div>;

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 font-sans text-slate-800 overflow-hidden relative">
      
      {toast && ( <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[300] animate-in slide-in-from-top-5 fade-in duration-300"> <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border-l-4 bg-white/95 backdrop-blur-sm ${toast.type === 'success' ? 'border-emerald-500' : toast.type === 'error' ? 'border-red-500' : 'border-blue-500'}`}> <span className="font-bold text-slate-700 text-sm flex-1">{toast.message}</span> <button type="button" onClick={() => setToast(null)} className="ml-auto text-slate-400"><i className="bi bi-x-lg text-xs"></i></button> </div> </div> )}

      <header className="bg-[#0f172a] text-white px-5 pt-8 pb-5 shrink-0 z-20 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2"><i className="bi bi-tools text-blue-400"></i> Request Parts</h1>
            <p className="text-blue-200 text-[10px] mt-0.5 font-bold uppercase tracking-wider"><i className="bi bi-building"></i> {activeDept} Department</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchInitialData(activeDept)} className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors active:scale-95 shadow-sm"><i className="bi bi-arrow-clockwise text-lg"></i></button>
            <button onClick={handleChangeProfile} className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 p-1.5 pr-3 rounded-full border border-slate-700 transition-colors">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] shrink-0"><i className="bi bi-person-fill"></i></div>
              <span className="text-white text-[11px] font-bold truncate max-w-[60px]">{pickerName}</span>
            </button>
          </div>
        </div>

        <div className="relative mb-4">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหา (มอเตอร์, ถุงมือ)..." className="w-full pl-11 pr-4 py-3.5 bg-white text-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/30 font-bold text-sm shadow-inner transition-all" />
          <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><i className="bi bi-x-circle-fill"></i></button>}
        </div>

        <div className="flex p-1 bg-slate-800 rounded-xl">
          <button onClick={() => setActiveCategory('parts')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeCategory === 'parts' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><i className="bi bi-gear-wide-connected"></i> อะไหล่</button>
          <button onClick={() => setActiveCategory('consumables')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeCategory === 'consumables' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><i className="bi bi-box2-heart"></i> ของสิ้นเปลือง</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 z-10 pb-28 bg-[#f8fafc]">
        <div className="grid grid-cols-2 gap-3 pb-8">
          
          {activeCategory === 'parts' && filteredParts.map(part => {
            const alloc = stockAllocations[part.PartID] || { available: 0, physical: 0, reserved: 0, machines: [] };
            const otherPendingQty = pendingRequests.filter(r => r.PartID === part.PartID).reduce((s, r) => s + (r.Qty || 0), 0);
            const showAvailableQty = alloc.available - otherPendingQty;
            const inCartQty = cart[part.PartID]?.qty || 0;
            const isOutOfStock = showAvailableQty <= 0 && inCartQty === 0;

            return (
              <div key={part.PartID} className={`bg-white rounded-2xl shadow-sm border ${inCartQty > 0 ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-100'} p-3 flex flex-col relative overflow-hidden transition-all duration-200`}>
                <div className="w-full aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center p-2 relative">
                  {part.ImageURL ? ( <img src={part.ImageURL} alt={part.PartName} className={`w-full h-full object-contain mix-blend-multiply ${isOutOfStock ? 'grayscale opacity-50' : ''}`} /> ) : ( <i className={`bi bi-image text-4xl ${isOutOfStock ? 'text-slate-200' : 'text-slate-300'}`}></i> )}
                  {isOutOfStock && <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]"><span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-md rotate-[-12deg] uppercase tracking-widest shadow-md">ของหมด</span></div>}
                </div>
                <div className="flex-1 flex flex-col">
                  <p className={`text-[10px] font-bold text-slate-400 mb-0.5 ${isOutOfStock && 'opacity-60'}`}>{part.PartID}</p>
                  <h3 className={`font-black text-xs leading-tight mb-1 ${isOutOfStock ? 'text-slate-400' : 'text-slate-800'} line-clamp-2`}>{part.PartName}</h3>
                  <p className={`text-[10px] font-medium text-slate-500 mb-2 truncate ${isOutOfStock && 'opacity-60'}`}>{part.PartModel || '-'}</p>
                  <div className="mt-auto pt-2 border-t border-slate-50 flex flex-col gap-1">
                    <span className={`text-[10px] font-bold ${isOutOfStock ? 'text-red-400' : 'text-emerald-600'}`}>เหลือ {showAvailableQty} ชิ้น</span>
                    {otherPendingQty > 0 && <span className="text-[9px] font-bold text-amber-500 leading-tight">(มีช่างรอเบิก {otherPendingQty} ชิ้น)</span>}
                  </div>
                </div>
                <div className="mt-3">
                  {inCartQty > 0 ? (
                    <div className="flex items-center justify-between bg-blue-50 rounded-xl p-1 border border-blue-100">
                      <button onClick={() => handleUpdateCart(part.PartID, 'part', -1)} className="w-8 h-8 flex items-center justify-center text-blue-600 font-black rounded-lg active:bg-blue-100 transition-colors"><i className="bi bi-dash-lg"></i></button>
                      <span className="font-black text-blue-800 text-sm">{inCartQty}</span>
                      <button onClick={() => handleUpdateCart(part.PartID, 'part', 1)} disabled={showAvailableQty <= 0} className="w-8 h-8 flex items-center justify-center text-blue-600 font-black rounded-lg active:bg-blue-100 disabled:opacity-30 transition-colors"><i className="bi bi-plus-lg"></i></button>
                    </div>
                  ) : (
                    <button onClick={() => handleUpdateCart(part.PartID, 'part', 1)} disabled={isOutOfStock} className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 bg-slate-900 text-white hover:bg-slate-800 active:scale-95"><i className="bi bi-cart-plus"></i> เพิ่มลงรายการ</button>
                  )}
                </div>
              </div>
            );
          })}

          {activeCategory === 'consumables' && filteredConsumables.map(cons => {
            const otherPendingQty = pendingRequests.filter(r => r.PartID === cons.ItemID).reduce((s, r) => s + (r.Qty || 0), 0);
            const showAvailableQty = cons.Balance - otherPendingQty;
            const inCartQty = cart[cons.ItemID]?.qty || 0;
            const isOutOfStock = showAvailableQty <= 0 && inCartQty === 0;

            return (
              <div key={cons.ItemID} className={`bg-white rounded-2xl shadow-sm border ${inCartQty > 0 ? 'border-pink-500 ring-1 ring-pink-500/20' : 'border-slate-100'} p-3 flex flex-col relative overflow-hidden transition-all duration-200`}>
                <div className="w-full aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center p-2 relative">
                  {cons.ImageURL ? ( <img src={cons.ImageURL} alt={cons.ItemName} className={`w-full h-full object-contain mix-blend-multiply ${isOutOfStock ? 'grayscale opacity-50' : ''}`} /> ) : ( <i className={`bi bi-image text-4xl ${isOutOfStock ? 'text-slate-200' : 'text-slate-300'}`}></i> )}
                  {isOutOfStock && <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]"><span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-md rotate-[-12deg] uppercase tracking-widest shadow-md">ของหมด</span></div>}
                </div>
                <div className="flex-1 flex flex-col">
                  <p className={`text-[10px] font-bold text-slate-400 mb-0.5 ${isOutOfStock && 'opacity-60'}`}>{cons.ItemID}</p>
                  <h3 className={`font-black text-xs leading-tight mb-1 ${isOutOfStock ? 'text-slate-400' : 'text-slate-800'} line-clamp-2`}>{cons.ItemName}</h3>
                  <p className={`text-[10px] font-medium text-slate-500 mb-2 truncate ${isOutOfStock && 'opacity-60'}`}>{cons.ItemModel || '-'}</p>
                  <div className="mt-auto pt-2 border-t border-slate-50 flex flex-col gap-1">
                    <span className={`text-[10px] font-bold ${isOutOfStock ? 'text-red-400' : 'text-emerald-600'}`}>เหลือ {showAvailableQty} ชิ้น</span>
                    {otherPendingQty > 0 && <span className="text-[9px] font-bold text-amber-500 leading-tight">(มีคนรอเบิก {otherPendingQty} ชิ้น)</span>}
                  </div>
                </div>
                <div className="mt-3">
                  {inCartQty > 0 ? (
                    <div className="flex items-center justify-between bg-pink-50 rounded-xl p-1 border border-pink-100">
                      <button onClick={() => handleUpdateCart(cons.ItemID, 'consumable', -1)} className="w-8 h-8 flex items-center justify-center text-pink-600 font-black rounded-lg active:bg-pink-100 transition-colors"><i className="bi bi-dash-lg"></i></button>
                      <span className="font-black text-pink-800 text-sm">{inCartQty}</span>
                      <button onClick={() => handleUpdateCart(cons.ItemID, 'consumable', 1)} disabled={showAvailableQty <= 0} className="w-8 h-8 flex items-center justify-center text-pink-600 font-black rounded-lg active:bg-pink-100 disabled:opacity-30 transition-colors"><i className="bi bi-plus-lg"></i></button>
                    </div>
                  ) : (
                    <button onClick={() => handleUpdateCart(cons.ItemID, 'consumable', 1)} disabled={isOutOfStock} className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 bg-pink-600 text-white hover:bg-pink-700 active:scale-95"><i className="bi bi-cart-plus"></i> หยิบใส่ตะกร้า</button>
                  )}
                </div>
              </div>
            );
          })}
          
          {(activeCategory === 'parts' ? filteredParts : filteredConsumables).length === 0 && (
            <div className="col-span-2 py-10 flex flex-col items-center justify-center text-slate-400">
              <i className="bi bi-search text-4xl mb-3 opacity-30"></i>
              <p className="font-bold text-sm">ไม่พบรายการที่ค้นหา</p>
            </div>
          )}
        </div>
      </main>

      <div className={`absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 pb-safe shadow-[0_-15px_30px_rgba(15,23,42,0.08)] z-30 transition-transform duration-300 ${cartItemsCount > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-[#0f172a] text-white rounded-full flex items-center justify-center text-xl shadow-lg"><i className="bi bi-cart3"></i></div>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{cartItemsCount}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">รายการที่เลือก</p>
              <p className="font-black text-slate-800 text-lg leading-none">{Object.keys(cart).length} <span className="text-sm font-bold text-slate-500">ชิ้น</span></p>
            </div>
          </div>
          <button onClick={() => setIsCheckoutOpen(true)} className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-black text-sm shadow-xl shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2">
            ดำเนินการเบิก <i className="bi bi-arrow-right"></i>
          </button>
        </div>
      </div>

      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-end sm:items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><i className="bi bi-card-checklist text-blue-600"></i> ยืนยันการขอเบิก</h3>
              <button onClick={() => setIsCheckoutOpen(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"><i className="bi bi-x-lg text-sm"></i></button>
            </div>

            <form onSubmit={handleConfirmSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">รายการในตะกร้า ({Object.keys(cart).length})</h4>
                <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                  {Object.keys(cart).map(itemId => {
                    const isPart = cart[itemId].type === 'part';
                    const name = isPart ? parts.find(p => p.PartID === itemId)?.PartName : consumables.find(c => c.ItemID === itemId)?.ItemName;
                    return (
                      <div key={itemId} className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start text-sm">
                          <span className="font-bold text-slate-700 leading-tight pr-4">
                            <i className={`bi ${isPart ? 'bi-gear-wide-connected text-blue-500' : 'bi-box2-heart text-pink-500'} mr-2`}></i>{name}
                          </span>
                          <span className={`font-black px-2 py-0.5 rounded-md ${isPart ? 'text-blue-600 bg-blue-50' : 'text-pink-600 bg-pink-50'}`}>x{cart[itemId].qty}</span>
                        </div>
                        {/* 🌟 จุดติดตั้ง (Position) + Datalist คำแนะนำ */}
                        {isPart && (
                          <div className="mt-1 relative">
                            <input 
                              type="text" 
                              list={`pos-${itemId}`}
                              required
                              placeholder="ระบุจุดที่ติดตั้ง (เช่น ซ้าย, ขวา)" 
                              value={cart[itemId].position || ''}
                              onChange={(e) => setCart(prev => ({ ...prev, [itemId]: { ...prev[itemId], position: e.target.value } }))}
                              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700" 
                            />
                            <datalist id={`pos-${itemId}`}>
                              {historicalPositions[itemId]?.map(pos => <option key={pos} value={pos} />)}
                            </datalist>
                            <i className="bi bi-geo-alt absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-4">
                {hasSparePartsInCart && (
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-4">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1"><i className="bi bi-info-circle-fill"></i> ข้อมูลสำหรับเบิกอะไหล่</p>
                    <div><label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">ไลน์ผลิต (Line)</label><div className="relative"><select required value={selectedLine} onChange={(e) => { setSelectedLine(e.target.value); setSelectedMachine(''); }} className="w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-bold text-slate-800 text-sm"><option value="">-- เลือกไลน์ผลิต --</option>{lines.map(line => <option key={line} value={line}>{line}</option>)}</select><i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i></div></div>
                    <div><label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">เครื่องจักร (Machine)</label><div className="relative"><select required disabled={!selectedLine} value={selectedMachine} onChange={(e) => setSelectedMachine(e.target.value)} className="w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:opacity-50 font-bold text-slate-800 text-sm"><option value="">{selectedLine ? '-- เลือกเครื่องจักร --' : '-'}</option>{filteredMachines.map(m => <option key={m.MachineID} value={m.MachineID}>{m.MachineName}</option>)}</select><i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i></div></div>
                    <div><label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">สาเหตุที่เปลี่ยน</label><div className="relative"><select required value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-bold text-slate-800 text-sm"><option value="Normal Wear">ปกติ (Wear)</option><option value="Accident">อุบัติเหตุ (Accident)</option><option value="Improvement">ปรับปรุง</option></select><i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i></div></div>
                  </div>
                )}
              </div>

              <div className="pt-2 mt-auto">
                <button type="submit" disabled={isSubmitting} className="w-full bg-[#0f172a] text-white font-black py-4.5 rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-black active:scale-95 transition-all text-lg flex items-center justify-center gap-2">
                  {isSubmitting ? <><i className="bi bi-arrow-repeat animate-spin"></i> กำลังประมวลผล...</> : <><i className="bi bi-send-fill"></i> ยืนยันส่งใบเบิก</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
