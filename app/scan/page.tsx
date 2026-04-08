"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getSmartMaintenanceData } from '../../lib/maintenanceLogic';

export default function RequestPartShoppingPage() {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [activeDept, setActiveDept] = useState('');
  const [pickerName, setPickerName] = useState('');

  const [parts, setParts] = useState<any[]>([]);
  const [consumables, setConsumables] = useState<any[]>([]); 
  const [fixtures, setFixtures] = useState<any[]>([]); 
  
  const [machines, setMachines] = useState<any[]>([]);
  const [lines, setLines] = useState<string[]>([]);
  const [stockAllocations, setStockAllocations] = useState<any>({}); 
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  
  const [dictionary, setDictionary] = useState<any[]>([]);
  const [historicalPositions, setHistoricalPositions] = useState<Record<string, string[]>>({}); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeCategory, setActiveCategory] = useState<'parts' | 'consumables' | 'fixtures'>('parts');
  const [fixtureTab, setFixtureTab] = useState<'list' | 'borrowed'>('list'); 
  
  const [cart, setCart] = useState<{ [itemId: string]: { qty: number, type: 'part' | 'consumable' | 'fixture', position?: string } }>({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [selectedLine, setSelectedLine] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [reason, setReason] = useState('Normal Wear');

  const [toast, setToast] = useState<{message: string, type: 'success' | 'warning' | 'info' | 'error'} | null>(null);
  const showToast = (message: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };

  const [batchReturnState, setBatchReturnState] = useState<{
    [baseReqId: string]: { selected: boolean; items: { [reqId: string]: { returnQty: number; brokenQty: number; maxQty: number; } } }
  }>({});

  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void, isDanger?: boolean } | null>(null);

  const [reservationModal, setReservationModal] = useState<{
    isOpen: boolean; partName: string; totalReserved: number; machineInfo: string; onConfirm: (() => void) | null;
  }>({ isOpen: false, partName: '', totalReserved: 0, machineInfo: '', onConfirm: null });

  const [isReturnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedReturnReq, setSelectedReturnReq] = useState<any>(null);

  // 🌟 State ใหม่สำหรับ ป๊อปอัพเลือกจุดติดตั้ง 🌟
  const [positionModal, setPositionModal] = useState<{ isOpen: boolean, itemId: string, itemName: string } | null>(null);
  const [tempPositionSearch, setTempPositionSearch] = useState('');

  useEffect(() => {
    const d = localStorage.getItem('mechanicDept');
    const n = localStorage.getItem('mechanicName');
    if (d && n) { setActiveDept(d); setPickerName(n); setIsSetupComplete(true); fetchInitialData(d); } 
    else { fetchDepartmentsForSetup(); }
  }, []);

  const fetchDepartmentsForSetup = async () => { const { data } = await supabase.from('Departments').select('*'); if (data) setDepartments(data); setIsLoading(false); };

  const handleSetupComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDept || !pickerName.trim()) return showToast('กรุณากรอกข้อมูลให้ครบ', 'warning');
    localStorage.setItem('mechanicDept', activeDept); localStorage.setItem('mechanicName', pickerName);
    setIsSetupComplete(true); fetchInitialData(activeDept);
  };

  const handleChangeProfile = () => { setIsSetupComplete(false); fetchDepartmentsForSetup(); };

  const fetchInitialData = async (dept: string) => {
    setIsLoading(true);
    try {
      const data = await getSmartMaintenanceData(dept);
      setMachines(data.rawMachines.filter(m => m.Active !== false)); setLines(data.rawLines); setParts(data.rawParts); setStockAllocations(data.allocations);
      const { data: reqData } = await supabase.from('PartRequests').select('*').in('Status', ['Pending', 'Approved']).eq('DepartmentID', dept); setPendingRequests(reqData || []);
      const { data: consData } = await supabase.from('Consumable').select('*').eq('DepartmentID', dept); setConsumables(consData || []);
      const { data: fixData } = await supabase.from('Fixtures').select('*').eq('DepartmentID', dept); setFixtures(fixData || []);
      const { data: dictData } = await supabase.from('Dictionary').select('*'); setDictionary(dictData || []);

      const { data: historyData } = await supabase.from('ChangeHistory').select('MachineID, PartID, Position').eq('DepartmentID', dept);
      const posMap: Record<string, Set<string>> = {};
      historyData?.forEach(h => {
        if (!h.MachineID || !h.PartID) return;
        const key = `${h.MachineID}_${h.PartID}`;
        if (!posMap[key]) posMap[key] = new Set();
        if (h.Position && h.Position !== '-') posMap[key].add(h.Position);
      });
      const formattedMap: Record<string, string[]> = {};
      Object.keys(posMap).forEach(k => formattedMap[k] = Array.from(posMap[k]));
      setHistoricalPositions(formattedMap);
    } catch (error) { console.error(error); showToast('โหลดข้อมูลล้มเหลว', 'error'); } finally { setIsLoading(false); }
  };

  const handleUpdateCart = (itemId: string, type: 'part' | 'consumable' | 'fixture', deltaOrExact: number, isExact: boolean = false) => {
    const currentQty = cart[itemId]?.qty || 0;
    let newQty = isExact ? deltaOrExact : currentQty + deltaOrExact;
    if (isNaN(newQty) || newQty < 0) newQty = 0;

    const otherMechanicsPendingQty = pendingRequests.filter(r => r.PartID === itemId && r.Status === 'Pending').reduce((s, r) => s + (r.Qty || 0), 0);
    let maxAvailable = 0;
    
    if (type === 'part') { maxAvailable = (stockAllocations[itemId]?.physical || 0) - otherMechanicsPendingQty; } 
    else if (type === 'consumable') { maxAvailable = (consumables.find(c => c.ItemID === itemId)?.Balance || 0) - otherMechanicsPendingQty; } 
    else {
      const fix = fixtures.find(f => f.FixtureNo === itemId);
      if (fix) maxAvailable = (fix.TotalQty || 0) - (fix.BrokenQty || 0) - (fix.BorrowedQty || 0) - otherMechanicsPendingQty;
    }

    if (newQty > maxAvailable) { showToast(`จำนวนเกินสต๊อก! หยิบได้สูงสุด ${maxAvailable} ชิ้น`, 'warning'); newQty = maxAvailable; }

    if (newQty <= 0) { const newCart = { ...cart }; delete newCart[itemId]; setCart(newCart); return; }

    if (type === 'part' && newQty > currentQty) {
      const alloc = stockAllocations[itemId] || { available: 0, reserved: 0, machines: [] };
      const safeAvailable = (alloc.available || 0) - otherMechanicsPendingQty;

      if (newQty > safeAvailable) {
        const partName = parts.find(p => p.PartID === itemId)?.PartName || itemId;
        const totalReserved = (alloc.reserved || 0) + otherMechanicsPendingQty;
        let reservedDetailsList: string[] = [];
        alloc.machines.forEach((macId: string) => {
          const m = machines.find(x => x.MachineID === macId || (x.MachineName && macId.includes(x.MachineName)));
          if (m) reservedDetailsList.push(`${macId === m.MachineID ? m.MachineName : macId} (ไลน์: ${m.LineName})`); else reservedDetailsList.push(macId);
        });
        pendingRequests.filter(r => r.PartID === itemId && r.Status === 'Pending').forEach(r => {
          const m = machines.find(x => x.MachineID === r.MachineID);
          if (m) { const posInfo = r.Position && r.Position !== '-' ? ` [จุด: ${r.Position}]` : ''; reservedDetailsList.push(`${m.MachineName} (${m.LineName})${posInfo}`); }
        });

        const formattedReservedInfo = Array.from(new Set(reservedDetailsList)).join('\n🔸 ');
        const proceedWithAdding = () => { setCart({ ...cart, [itemId]: { qty: newQty, type, position: cart[itemId]?.position || '' } }); setReservationModal(prev => ({ ...prev, isOpen: false })); };

        setReservationModal({ isOpen: true, partName: partName, totalReserved: totalReserved, machineInfo: formattedReservedInfo || 'ไม่ระบุ', onConfirm: proceedWithAdding });
        return; 
      }
    }
    setCart({ ...cart, [itemId]: { qty: newQty, type, position: cart[itemId]?.position || '' } });
  };

  const getSearchTerms = (query: string) => {
    if (!query) return [];
    const lowerQuery = query.toLowerCase().trim(); let terms = lowerQuery.split(' '); 
    dictionary.forEach(word => {
      const thaiWord = (word.ThaiWord || '').toLowerCase(); const engWord = (word.EngWord || '').toLowerCase();
      if (thaiWord && engWord && (lowerQuery.includes(thaiWord) || thaiWord.includes(lowerQuery))) {
        const engTerms = engWord.split(/[, ]+/).filter(Boolean); terms = [...terms, ...engTerms];
      }
    });
    return terms;
  };

  const searchTerms = getSearchTerms(searchQuery);
  const filteredParts = parts.filter(p => { if (!searchQuery) return true; return searchTerms.some(term => `${p.PartName} ${p.PartModel} ${p.PartID}`.toLowerCase().includes(term)); });
  const filteredConsumables = consumables.filter(c => { if (!searchQuery) return true; return searchTerms.some(term => `${c.ItemName} ${c.ItemModel || ''} ${c.ItemID}`.toLowerCase().includes(term)); });
  const filteredFixtures = fixtures.filter(f => { if (!searchQuery) return true; return searchTerms.some(term => `${f.ModelName} ${f.FixtureNo}`.toLowerCase().includes(term)); });

  const rawMyFixtureRequests = pendingRequests.filter(r => r.PickerName === pickerName && fixtures.some(f => f.FixtureNo === r.PartID));
  const groupedFixtureRequests: any[] = Object.values(
    rawMyFixtureRequests.reduce((acc: any, req: any) => {
      const reqParts = req.RequestID.split('-');
      const baseId = reqParts.length >= 3 ? `${reqParts[0]}-${reqParts[1]}` : req.RequestID; 
      if (!acc[baseId]) { acc[baseId] = { baseId, createdAt: req.CreatedAt, status: req.Status, items: [] }; }
      acc[baseId].items.push(req);
      return acc;
    }, {})
  ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const cartItemsCount = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
  const hasSparePartsInCart = Object.values(cart).some(item => item.type === 'part');

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasSparePartsInCart && !selectedMachine) return showToast('กรุณาเลือกเครื่องจักรสำหรับอะไหล่', 'warning');
    const missingPos = Object.keys(cart).find(id => cart[id].type === 'part' && !cart[id].position?.trim());
    if (missingPos) return showToast('กรุณาระบุ "จุดที่ติดตั้ง" ให้ครบทุกรายการ', 'warning');

    let hasReservationWarning = false;
    let warningMessage = '⚠️ แจ้งเตือน: มีอะไหล่ที่คุณกำลังจะเบิก "ติดจอง" อยู่ในระบบ!\n\n';

    for (const itemId of Object.keys(cart)) {
      if (cart[itemId].type === 'part') {
        const alloc = stockAllocations[itemId] || { reserved: 0, machines: [] };
        const reqs = pendingRequests.filter(r => r.PartID === itemId && r.Status === 'Pending');
        const mechanicReqQty = reqs.reduce((sum, r) => sum + (r.Qty || 0), 0);
        const totalReserved = alloc.reserved + mechanicReqQty;

        if (totalReserved > 0) {
          hasReservationWarning = true;
          const partName = parts.find(p => p.PartID === itemId)?.PartName || itemId;
          let reservedInfo: string[] = [];
          
          alloc.machines.forEach((macId: string) => {
            const m = machines.find(x => x.MachineID === macId || (x.MachineName && macId.includes(x.MachineName)));
            if (m) reservedInfo.push(`${macId === m.MachineID ? m.MachineName : macId} (ไลน์: ${m.LineName})`); else reservedInfo.push(macId);
          });
          
          reqs.forEach(r => {
            const m = machines.find(x => x.MachineID === r.MachineID);
            if(m) reservedInfo.push(`${m.MachineName} (${m.LineName}) [มีคนกำลังเบิก]`);
          });

          const uniqueMachines = Array.from(new Set(reservedInfo)).join('\n- ');
          warningMessage += `🔸 ${partName}\nมียอดติดจอง: ${totalReserved} ชิ้น\nสำหรับเครื่อง:\n- ${uniqueMachines || 'ไม่ระบุ'}\n\n`;
        }
      }
    }

    const processCheckout = async () => {
      setIsSubmitting(true);
      try {
        const { data: freshReqs } = await supabase.from('PartRequests').select('PartID, Qty').eq('Status', 'Pending').eq('DepartmentID', activeDept);
        const { data: freshStocks } = await supabase.from('Stock').select('PartID, Balance').eq('DepartmentID', activeDept);
        const { data: freshCons } = await supabase.from('Consumable').select('ItemID, Balance').eq('DepartmentID', activeDept);
        const { data: freshFixs } = await supabase.from('Fixtures').select('*').eq('DepartmentID', activeDept);

        for (const itemId of Object.keys(cart)) {
          const item = cart[itemId];
          const pendingQty = freshReqs?.filter(r => r.PartID === itemId).reduce((sum, r) => sum + (r.Qty || 0), 0) || 0;
          let available = 0; let name = '';
          if (item.type === 'part') {
             available = (freshStocks?.filter(s => s.PartID === itemId).reduce((sum, s) => sum + (s.Balance || 0), 0) || 0) - pendingQty;
             name = parts.find(p=>p.PartID === itemId)?.PartName || itemId;
          } else if (item.type === 'consumable') {
             available = (freshCons?.find(c => c.ItemID === itemId)?.Balance || 0) - pendingQty;
             name = consumables.find(c=>c.ItemID === itemId)?.ItemName || itemId;
          } else {
             const fix = freshFixs?.find(f => f.FixtureNo === itemId);
             available = (fix?.TotalQty || 0) - (fix?.BrokenQty || 0) - (fix?.BorrowedQty || 0) - pendingQty;
             name = fix?.ModelName || itemId;
          }
          if (available < item.qty) throw new Error(`ของไม่พอ! มีคนเบิก/ยืม "${name}" ตัดหน้าไปแล้วครับ (เหลือ ${Math.max(0, available)} ชิ้น)`);
        }

        const baseId = Date.now(); 
        const insertData = Object.keys(cart).map((itemId, idx) => ({
          RequestID: `REQ-${baseId}-${idx + 1}`, 
          MachineID: cart[itemId].type === 'part' ? selectedMachine : (selectedMachine || 'GENERAL'),
          PartID: itemId, Qty: cart[itemId].qty,
          Position: cart[itemId].type === 'part' ? cart[itemId].position : '-',
          Reason: cart[itemId].type === 'part' ? reason : cart[itemId].type === 'consumable' ? 'Consumable' : 'Borrow', 
          PickerName: pickerName, Status: 'Pending', DepartmentID: activeDept
        }));

        const { error } = await supabase.from('PartRequests').insert(insertData);
        if (error) throw error;

        try {
          const itemNames = Object.keys(cart).map(itemId => {
            if(cart[itemId].type === 'part') return parts.find(p => p.PartID === itemId)?.PartName;
            if(cart[itemId].type === 'consumable') return consumables.find(c => c.ItemID === itemId)?.ItemName;
            return fixtures.find(f => f.FixtureNo === itemId)?.ModelName;
          }).join(', ');
          const lineMsg = `🚨 ใบเบิกใหม่! (แผนก: ${activeDept})\n👨‍🔧 ช่าง: ${pickerName}\n📦 รายการ: ${itemNames}\n🔢 จำนวนรวม: ${Object.keys(cart).length} รายการ\n👉 ผู้ดูแลโปรดตรวจสอบในระบบครับ`;
          await fetch('/api/send-line', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: lineMsg }) });
        } catch (err) { console.error('Line Notify Error:', err); }

        showToast('ส่งคำขอสำเร็จ! รอรับของที่ Center', 'success'); setCart({}); setIsCheckoutOpen(false); setSelectedLine(''); setSelectedMachine(''); fetchInitialData(activeDept); 
      } catch (error: any) { showToast(error.message, 'error'); fetchInitialData(activeDept); 
      } finally { setIsSubmitting(false); }
    };

    if (hasReservationWarning) {
      setConfirmDialog({
        isOpen: true, title: 'ยืนยันการเบิกอะไหล่ติดจอง', isDanger: true,
        message: warningMessage + 'คุณแน่ใจหรือไม่ที่จะยืนยันเบิกอะไหล่เหล่านี้?\n(อาจเป็นการดึงอะไหล่ตัดหน้าคิวอื่น)',
        onConfirm: () => { setConfirmDialog(null); processCheckout(); }
      });
    } else {
      processCheckout();
    }
  };

  const handleToggleGroupSelect = (group: any) => {
    setBatchReturnState(prev => {
      const isSelected = !prev[group.baseId]?.selected;
      if (!isSelected) { const newState = { ...prev }; delete newState[group.baseId]; return newState; }
      
      const groupItemsState: any = {};
      group.items.forEach((req: any) => { groupItemsState[req.RequestID] = { returnQty: req.Qty, brokenQty: 0, maxQty: req.Qty }; });
      return { ...prev, [group.baseId]: { selected: true, items: groupItemsState } };
    });
  };

  const handleGroupReturnChange = (baseId: string, reqId: string, field: 'returnQty' | 'brokenQty', val: number) => {
    setBatchReturnState(prev => {
        if (!prev[baseId]) return prev;
        const maxQty = prev[baseId].items[reqId].maxQty;
        let validVal = val; if (isNaN(validVal) || validVal < 0) validVal = 0;
        if (field === 'returnQty' && validVal > maxQty) validVal = maxQty;
        const currentReturnQty = field === 'returnQty' ? validVal : prev[baseId].items[reqId].returnQty;
        if (field === 'brokenQty' && validVal > currentReturnQty) validVal = currentReturnQty;

        return { ...prev, [baseId]: { ...prev[baseId], items: { ...prev[baseId].items, [reqId]: { ...prev[baseId].items[reqId], [field]: validVal } } } };
    });
  };

  const handleBatchReturnSubmit = async () => {
    const selectedGroups = Object.entries(batchReturnState).filter(([_, state]) => state.selected);
    if (selectedGroups.length === 0) return showToast('กรุณาเลือกรายการอย่างน้อย 1 รายการ', 'warning');
    
    let totalItemsToProcess = 0; let hasCancel = false; let hasReturn = false;
    selectedGroups.forEach(([baseId, _]) => {
        const group: any = groupedFixtureRequests.find((g: any) => g.baseId === baseId);
        if (group) {
            totalItemsToProcess += group.items.length;
            if (group.status === 'Pending') hasCancel = true; else hasReturn = true;
        }
    });

    let actionText = '';
    if (hasCancel && hasReturn) actionText = 'ยกเลิกคำขอ และ คืนเครื่องมือ';
    else if (hasCancel) actionText = 'ยกเลิกคำขอ'; else actionText = 'คืนเครื่องมือ';

    setConfirmDialog({
      isOpen: true, title: 'ยืนยันการทำรายการ', isDanger: false,
      message: `คุณกำลังจะดำเนินการ ${actionText}\nจำนวนรวม ${totalItemsToProcess} รายการ\nแน่ใจหรือไม่?`, 
      onConfirm: async () => {
        setConfirmDialog(null); setIsSubmitting(true);
        try {
          for (const [baseId, state] of selectedGroups) {
            const group: any = groupedFixtureRequests.find((g: any) => g.baseId === baseId);
            if (!group) continue;

            if (group.status === 'Pending') {
              const reqIds = group.items.map((i: any) => i.RequestID);
              await supabase.from('PartRequests').delete().in('RequestID', reqIds);
            } 
            else {
                for (const req of group.items) {
                    const itemState = state.items[req.RequestID];
                    if (!itemState || itemState.returnQty <= 0) continue;

                    const rQty = itemState.returnQty; const bQty = itemState.brokenQty;
                    if (rQty > req.Qty) throw new Error(`จำนวนคืนของ ${req.PartID} ไม่ถูกต้อง`);
                    if (bQty > rQty) throw new Error(`ของเสียต้องไม่เกินของที่คืน (${req.PartID})`);

                    const { data: fix } = await supabase.from('Fixtures').select('*').eq('FixtureNo', req.PartID).single();
                    if (fix) {
                        const newBorrowed = Math.max(0, (fix.BorrowedQty || 0) - rQty);
                        const newBroken = (fix.BrokenQty || 0) + bQty;
                        await supabase.from('Fixtures').update({ BorrowedQty: newBorrowed, BrokenQty: newBroken }).eq('FixtureNo', fix.FixtureNo);
                    }
                    if (rQty >= req.Qty) { await supabase.from('PartRequests').update({ Status: 'Returned' }).eq('RequestID', req.RequestID); } 
                    else { await supabase.from('PartRequests').update({ Qty: req.Qty - rQty }).eq('RequestID', req.RequestID); }
                }
            }
          }
          showToast('ทำรายการสำเร็จเรียบร้อย!', 'success'); setBatchReturnState({}); fetchInitialData(activeDept);
        } catch (error: any) { showToast(`Error: ${error.message}`, 'error'); } 
        finally { setIsSubmitting(false); }
      }
    });
  };

  const handleReturnSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const returnQty = parseInt(formData.get('returnQty') as string) || 0;
    const brokenQty = parseInt(formData.get('brokenQty') as string) || 0;

    if (returnQty <= 0 || returnQty > selectedReturnReq.Qty) { showToast('จำนวนที่คืนไม่ถูกต้อง (ต้องมากกว่า 0 และไม่เกินจำนวนที่ยืม)', 'error'); setIsSubmitting(false); return; }
    if (brokenQty > returnQty) { showToast('จำนวนที่พังต้องไม่เกินจำนวนที่กดคืน', 'error'); setIsSubmitting(false); return; }

    try {
      const { data: fix } = await supabase.from('Fixtures').select('*').eq('FixtureNo', selectedReturnReq.PartID).single();
      if (!fix) throw new Error('ไม่พบข้อมูล Fixture ในระบบ (อาจถูกลบไปแล้ว)');

      const newBorrowed = Math.max(0, (fix.BorrowedQty || 0) - returnQty);
      const newBroken = (fix.BrokenQty || 0) + brokenQty;
      const { error: fixErr } = await supabase.from('Fixtures').update({ BorrowedQty: newBorrowed, BrokenQty: newBroken }).eq('FixtureNo', fix.FixtureNo);
      if (fixErr) throw fixErr;

      if (returnQty >= selectedReturnReq.Qty) { await supabase.from('PartRequests').update({ Status: 'Returned' }).eq('RequestID', selectedReturnReq.RequestID); } 
      else { await supabase.from('PartRequests').update({ Qty: selectedReturnReq.Qty - returnQty }).eq('RequestID', selectedReturnReq.RequestID); }

      showToast('ทำรายการคืน Fixture สำเร็จ!', 'success'); setReturnModalOpen(false); fetchInitialData(activeDept);
    } catch (error: any) { showToast(`Error: ${error.message}`, 'error'); } 
    finally { setIsSubmitting(false); }
  };

  const filteredMachines = machines.filter(m => m.LineName === selectedLine);

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
      
      {/* 🌟 Custom Confirm Dialog สุดโมเดิร์น 🌟 */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 ease-out border border-white">
            <div className="p-8 pb-6 text-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-5 shadow-inner border-4 ${confirmDialog.isDanger ? 'bg-red-50 text-red-500 border-red-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
                <i className={`bi ${confirmDialog.isDanger ? 'bi-exclamation-triangle-fill' : 'bi-question-circle-fill'}`}></i>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">{confirmDialog.title}</h3>
              <p className="text-slate-500 text-sm whitespace-pre-line leading-relaxed font-medium">{confirmDialog.message}</p>
            </div>
            <div className="flex p-4 gap-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 active:scale-95 transition-all shadow-sm">ยกเลิก</button>
              <button onClick={confirmDialog.onConfirm} className={`flex-1 py-3.5 rounded-xl font-bold text-white active:scale-95 transition-all shadow-md ${confirmDialog.isDanger ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-[#0f172a] hover:bg-black shadow-slate-900/20'}`}>ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {toast && ( <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[300] animate-in slide-in-from-top-5 fade-in duration-300"> <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border-l-4 bg-white/95 backdrop-blur-sm ${toast.type === 'success' ? 'border-emerald-500' : toast.type === 'error' ? 'border-red-500' : 'border-blue-500'}`}> <span className="font-bold text-slate-700 text-sm flex-1">{toast.message}</span> <button type="button" onClick={() => setToast(null)} className="ml-auto text-slate-400"><i className="bi bi-x-lg text-xs"></i></button> </div> </div> )}

      {/* 🌟 Modal: เลือกจุดที่ติดตั้ง (Position Selection) 🌟 */}
      {positionModal && positionModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2"><i className="bi bi-geo-alt-fill text-blue-500"></i> ระบุจุดที่ติดตั้ง</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium truncate max-w-[250px]">{positionModal.itemName}</p>
              </div>
              <button type="button" onClick={() => setPositionModal(null)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"><i className="bi bi-x-lg text-sm"></i></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 bg-slate-50/50">
              <div className="relative">
                <input
                  type="text"
                  placeholder="พิมพ์จุดติดตั้งใหม่ หรือค้นหาประวัติ..."
                  value={tempPositionSearch}
                  onChange={(e) => setTempPositionSearch(e.target.value)}
                  className="w-full p-4 pl-11 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm shadow-sm"
                  autoFocus
                />
                <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                {tempPositionSearch && (
                  <button type="button" onClick={() => setTempPositionSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><i className="bi bi-x-circle-fill"></i></button>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">ประวัติจุดที่เคยติดตั้งเครื่องนี้</p>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-h-60 overflow-y-auto">
                  {(() => {
                    const positions = selectedMachine ? (historicalPositions[`${selectedMachine}_${positionModal.itemId}`] || []) : [];
                    const filteredPositions = positions.filter(p => p.toLowerCase().includes(tempPositionSearch.toLowerCase()));

                    if (positions.length === 0) {
                      return <div className="p-6 text-center text-slate-400 text-xs font-bold bg-slate-50"><i className="bi bi-info-circle mb-1 block text-lg"></i>ยังไม่มีประวัติการติดตั้งอะไหล่นี้ในเครื่องนี้</div>;
                    }

                    if (filteredPositions.length === 0 && tempPositionSearch) {
                      return <div className="p-4 text-center text-slate-400 text-xs font-bold">ไม่พบประวัติ &quot;{tempPositionSearch}&quot;<br/><span className="text-blue-500">กดปุ่มยืนยันด้านล่างเพื่อใช้คำนี้ได้เลย</span></div>;
                    }

                    return filteredPositions.map(pos => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => {
                          setCart(prev => ({ ...prev, [positionModal.itemId]: { ...prev[positionModal.itemId], position: pos } }));
                          setPositionModal(null);
                        }}
                        className="w-full text-left p-4 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-b border-slate-50 last:border-0 transition-colors flex items-center justify-between group"
                      >
                        <span className="flex items-center gap-2"><i className="bi bi-clock-history text-slate-300 group-hover:text-blue-400"></i> {pos}</span>
                        <i className="bi bi-check2 text-blue-500 opacity-0 group-hover:opacity-100"></i>
                      </button>
                    ));
                  })()}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCart(prev => ({ ...prev, [positionModal.itemId]: { ...prev[positionModal.itemId], position: tempPositionSearch.trim() } }));
                  setPositionModal(null);
                }}
                disabled={!tempPositionSearch.trim()}
                className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 active:scale-95 transition-all text-[15px] disabled:opacity-50 disabled:shadow-none flex justify-center items-center gap-2"
              >
                <i className="bi bi-check2-circle text-lg"></i> ใช้จุดติดตั้งนี้
              </button>
            </div>
          </div>
        </div>
      )}

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
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหา (มอเตอร์, ถุงมือ, จิ๊ก)..." className="w-full pl-11 pr-4 py-3.5 bg-white text-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/30 font-bold text-sm shadow-inner transition-all" />
          <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><i className="bi bi-x-circle-fill"></i></button>}
        </div>

        <div className="flex p-1 bg-slate-800 rounded-xl gap-1">
          <button onClick={() => setActiveCategory('parts')} className={`flex-1 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${activeCategory === 'parts' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><i className="bi bi-gear-wide-connected"></i> อะไหล่</button>
          <button onClick={() => setActiveCategory('consumables')} className={`flex-1 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${activeCategory === 'consumables' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><i className="bi bi-box2-heart"></i> สิ้นเปลือง</button>
          <button onClick={() => setActiveCategory('fixtures')} className={`flex-1 py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${activeCategory === 'fixtures' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}><i className="bi bi-tools"></i> Fixture</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 z-10 pb-28 bg-[#f8fafc]">
        {activeCategory === 'fixtures' && (
          <div className="flex gap-2 mb-4">
            <button onClick={() => setFixtureTab('list')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm flex items-center justify-center gap-2 ${fixtureTab === 'list' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              <i className="bi bi-list-ul text-sm"></i> รายการ Fixture
            </button>
            <button onClick={() => setFixtureTab('borrowed')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border shadow-sm flex items-center justify-center gap-2 relative ${fixtureTab === 'borrowed' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              <i className="bi bi-person-badge text-sm"></i> Fixture ที่ฉันยืม
              {rawMyFixtureRequests.length > 0 && <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
            </button>
          </div>
        )}

        <div className={`grid ${activeCategory === 'fixtures' && fixtureTab === 'borrowed' ? 'grid-cols-1' : 'grid-cols-2'} gap-3 pb-8`}>
          
          {/* SPARE PARTS */}
          {activeCategory === 'parts' && filteredParts.map(part => {
            const alloc = stockAllocations[part.PartID] || { available: 0, physical: 0, reserved: 0, machines: [] };
            const otherPendingQty = pendingRequests.filter(r => r.PartID === part.PartID && r.Status === 'Pending').reduce((s, r) => s + (r.Qty || 0), 0);
            const realPhysicalQty = alloc.physical - otherPendingQty; const aiAvailableQty = alloc.available - otherPendingQty; const inCartQty = cart[part.PartID]?.qty || 0;
            const isOutOfStock = realPhysicalQty <= 0 && inCartQty === 0; const isEatingReserved = realPhysicalQty > 0 && aiAvailableQty <= 0;

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
                    <span className={`text-[10px] font-bold ${isOutOfStock ? 'text-red-400' : isEatingReserved ? 'text-amber-500' : 'text-emerald-600'}`}>เหลือ {realPhysicalQty} ชิ้น {isEatingReserved && '(มียอดจอง)'}</span>
                    {otherPendingQty > 0 && <span className="text-[9px] font-bold text-amber-500 leading-tight">(มีช่างรอเบิก {otherPendingQty} ชิ้น)</span>}
                  </div>
                </div>
                <div className="mt-3">
                  {inCartQty > 0 ? (
                    <div className="flex items-center justify-between bg-blue-50 rounded-xl p-1 border border-blue-100">
                      <button onClick={() => handleUpdateCart(part.PartID, 'part', -1)} className="w-8 h-8 flex items-center justify-center text-blue-600 font-black rounded-lg active:bg-blue-100 transition-colors"><i className="bi bi-dash-lg"></i></button>
                      <input type="number" min="0" value={inCartQty} onChange={(e) => handleUpdateCart(part.PartID, 'part', parseInt(e.target.value) || 0, true)} className="w-10 text-center font-black text-blue-800 text-sm bg-transparent outline-none appearance-none" style={{ MozAppearance: 'textfield' }} />
                      <button onClick={() => handleUpdateCart(part.PartID, 'part', 1)} disabled={realPhysicalQty <= 0} className="w-8 h-8 flex items-center justify-center text-blue-600 font-black rounded-lg active:bg-blue-100 disabled:opacity-30 transition-colors"><i className="bi bi-plus-lg"></i></button>
                    </div>
                  ) : (
                    <button onClick={() => handleUpdateCart(part.PartID, 'part', 1)} disabled={isOutOfStock} className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 bg-slate-900 text-white hover:bg-slate-800 active:scale-95"><i className="bi bi-cart-plus"></i> เพิ่มลงรายการ</button>
                  )}
                </div>
              </div>
            );
          })}

          {/* CONSUMABLES */}
          {activeCategory === 'consumables' && filteredConsumables.map(cons => {
            const otherPendingQty = pendingRequests.filter(r => r.PartID === cons.ItemID && r.Status === 'Pending').reduce((s, r) => s + (r.Qty || 0), 0);
            const showAvailableQty = cons.Balance - otherPendingQty; const inCartQty = cart[cons.ItemID]?.qty || 0; const isOutOfStock = showAvailableQty <= 0 && inCartQty === 0;

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
                      <input type="number" min="0" value={inCartQty} onChange={(e) => handleUpdateCart(cons.ItemID, 'consumable', parseInt(e.target.value) || 0, true)} className="w-10 text-center font-black text-pink-800 text-sm bg-transparent outline-none appearance-none" style={{ MozAppearance: 'textfield' }} />
                      <button onClick={() => handleUpdateCart(cons.ItemID, 'consumable', 1)} disabled={showAvailableQty <= 0} className="w-8 h-8 flex items-center justify-center text-pink-600 font-black rounded-lg active:bg-pink-100 disabled:opacity-30 transition-colors"><i className="bi bi-plus-lg"></i></button>
                    </div>
                  ) : (
                    <button onClick={() => handleUpdateCart(cons.ItemID, 'consumable', 1)} disabled={isOutOfStock} className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 bg-pink-600 text-white hover:bg-pink-700 active:scale-95"><i className="bi bi-cart-plus"></i> หยิบใส่ตะกร้า</button>
                  )}
                </div>
              </div>
            );
          })}

          {/* FIXTURES (รายการปกติ) */}
          {activeCategory === 'fixtures' && fixtureTab === 'list' && filteredFixtures.map(fix => {
            const otherPendingQty = pendingRequests.filter(r => r.PartID === fix.FixtureNo && r.Status === 'Pending').reduce((s, r) => s + (r.Qty || 0), 0);
            const totalAvailable = (fix.TotalQty || 0) - (fix.BrokenQty || 0) - (fix.BorrowedQty || 0); const showAvailableQty = totalAvailable - otherPendingQty;
            const inCartQty = cart[fix.FixtureNo]?.qty || 0; const isOutOfStock = showAvailableQty <= 0 && inCartQty === 0;

            return (
              <div key={fix.FixtureNo} className={`bg-white rounded-2xl shadow-sm border ${inCartQty > 0 ? 'border-purple-500 ring-1 ring-purple-500/20' : 'border-slate-100'} p-3 flex flex-col relative overflow-hidden transition-all duration-200`}>
                <div className="w-full aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center p-2 relative">
                  {fix.ImageURL ? ( <img src={fix.ImageURL} alt={fix.ModelName} className={`w-full h-full object-contain mix-blend-multiply ${isOutOfStock ? 'grayscale opacity-50' : ''}`} /> ) : ( <i className={`bi bi-image text-4xl ${isOutOfStock ? 'text-slate-200' : 'text-slate-300'}`}></i> )}
                  {isOutOfStock && <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]"><span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-md rotate-[-12deg] uppercase tracking-widest shadow-md">ถูกยืมหมด</span></div>}
                </div>
                <div className="flex-1 flex flex-col">
                  <p className={`text-[10px] font-bold text-slate-400 mb-0.5 ${isOutOfStock && 'opacity-60'}`}>{fix.FixtureNo}</p>
                  <h3 className={`font-black text-xs leading-tight mb-1 ${isOutOfStock ? 'text-slate-400' : 'text-slate-800'} line-clamp-2`}>{fix.ModelName}</h3>
                  <div className="mt-auto pt-2 border-t border-slate-50 flex flex-col gap-1">
                    <span className={`text-[10px] font-bold ${isOutOfStock ? 'text-red-400' : 'text-emerald-600'}`}>พร้อมยืม {showAvailableQty} ชิ้น</span>
                    {otherPendingQty > 0 && <span className="text-[9px] font-bold text-amber-500 leading-tight">(รออนุมัติอยู่ {otherPendingQty} ชิ้น)</span>}
                  </div>
                </div>
                <div className="mt-3">
                  {inCartQty > 0 ? (
                    <div className="flex items-center justify-between bg-purple-50 rounded-xl p-1 border border-purple-100">
                      <button onClick={() => handleUpdateCart(fix.FixtureNo, 'fixture', -1)} className="w-8 h-8 flex items-center justify-center text-purple-600 font-black rounded-lg active:bg-purple-100 transition-colors"><i className="bi bi-dash-lg"></i></button>
                      <input type="number" min="0" value={inCartQty} onChange={(e) => handleUpdateCart(fix.FixtureNo, 'fixture', parseInt(e.target.value) || 0, true)} className="w-10 text-center font-black text-purple-800 text-sm bg-transparent outline-none appearance-none" style={{ MozAppearance: 'textfield' }} />
                      <button onClick={() => handleUpdateCart(fix.FixtureNo, 'fixture', 1)} disabled={showAvailableQty <= 0} className="w-8 h-8 flex items-center justify-center text-purple-600 font-black rounded-lg active:bg-purple-100 disabled:opacity-30 transition-colors"><i className="bi bi-plus-lg"></i></button>
                    </div>
                  ) : (
                    <button onClick={() => handleUpdateCart(fix.FixtureNo, 'fixture', 1)} disabled={isOutOfStock} className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 bg-purple-600 text-white hover:bg-purple-700 active:scale-95"><i className="bi bi-box-arrow-right"></i> ขอยืมใช้งาน</button>
                  )}
                </div>
              </div>
            );
          })}

          {/* 🌟 FIXTURES (รายการที่กำลังยืม/รอดำเนินการ แบบใหม่ จัดกลุ่ม!) 🌟 */}
          {activeCategory === 'fixtures' && fixtureTab === 'borrowed' && groupedFixtureRequests.map(group => {
            const bState = batchReturnState[group.baseId] || { selected: false, items: {} };
            const isPending = group.status === 'Pending';

            return (
              <div key={group.baseId} className={`bg-white rounded-[1.5rem] shadow-sm border ${bState.selected ? 'border-[#0f172a] shadow-lg shadow-slate-900/5' : 'border-slate-200'} flex flex-col transition-all duration-300 overflow-hidden`}>
                
                {/* ส่วนหัวของบิล */}
                <div className={`p-4 flex justify-between items-center cursor-pointer select-none transition-colors ${bState.selected ? 'bg-slate-50' : 'hover:bg-slate-50'}`} onClick={() => handleToggleGroupSelect(group)}>
                  <div className="flex items-center gap-3.5">
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${bState.selected ? 'bg-[#0f172a] border-[#0f172a] text-white' : 'border-slate-300 bg-white'}`}>
                      {bState.selected && <i className="bi bi-check-lg text-sm font-black"></i>}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm tracking-tight">{group.baseId}</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(group.createdAt).toLocaleDateString('en-GB')} • {new Date(group.createdAt).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isPending ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                    {isPending ? 'รออนุมัติ' : 'กำลังใช้งาน'}
                  </span>
                </div>

                {/* รายการในบิล */}
                <div className={`flex flex-col ${bState.selected ? 'border-t border-slate-100' : ''}`}>
                  {group.items.map((req: any, index: number) => {
                    const fix = fixtures.find(f => f.FixtureNo === req.PartID) || {};
                    const itemState = bState.items[req.RequestID] || { returnQty: req.Qty, brokenQty: 0 };
                    const isLast = index === group.items.length - 1;

                    return (
                      <div key={req.RequestID} className={`p-4 bg-white ${!isLast ? 'border-b border-slate-50' : ''} ${!bState.selected && 'opacity-60 grayscale-[50%]'}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                            {fix.ImageURL ? <img src={fix.ImageURL} className="w-full h-full object-contain p-1 mix-blend-multiply" /> : <i className="bi bi-image text-slate-300 text-lg"></i>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-slate-700 text-xs leading-tight truncate">{fix.ModelName || req.PartID}</h3>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-bold">จำนวนเบิก: <span className="text-blue-600">{req.Qty}</span> ชิ้น</p>
                          </div>
                        </div>

                        {/* 🌟 ช่องใส่จำนวน (โผล่มาเฉพาะบิลที่ถูกเลือก และบิลนั้นถูกอนุมัติแล้ว) */}
                        {bState.selected && !isPending && (
                          <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">จำนวนที่คืน (ชิ้น)</label>
                              <input 
                                type="number" min="0" max={req.Qty} value={itemState.returnQty === 0 ? '' : itemState.returnQty} 
                                onChange={(e) => handleGroupReturnChange(group.baseId, req.RequestID, 'returnQty', parseInt(e.target.value)||0)} 
                                placeholder="0"
                                className="w-full p-2.5 text-center text-sm font-black text-[#0f172a] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#0f172a] focus:bg-white transition-colors" 
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-red-400 mb-1 uppercase tracking-widest">เสีย/พัง (ถ้ามี)</label>
                              <input 
                                type="number" min="0" max={itemState.returnQty} value={itemState.brokenQty === 0 ? '' : itemState.brokenQty} 
                                onChange={(e) => handleGroupReturnChange(group.baseId, req.RequestID, 'brokenQty', parseInt(e.target.value)||0)} 
                                placeholder="0"
                                className="w-full p-2.5 text-center text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg outline-none focus:border-red-500 focus:bg-white transition-colors" 
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
          
          {/* Fallback no data */}
          {((activeCategory === 'parts' && filteredParts.length === 0) || 
            (activeCategory === 'consumables' && filteredConsumables.length === 0) || 
            (activeCategory === 'fixtures' && fixtureTab === 'list' && filteredFixtures.length === 0)) && (
            <div className="col-span-2 py-10 flex flex-col items-center justify-center text-slate-400">
              <i className="bi bi-search text-4xl mb-3 opacity-30"></i>
              <p className="font-bold text-sm">ไม่พบรายการที่ค้นหา</p>
            </div>
          )}

          {activeCategory === 'fixtures' && fixtureTab === 'borrowed' && groupedFixtureRequests.length === 0 && (
             <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">
               <i className="bi bi-box-seam text-5xl mb-3 opacity-30"></i>
               <p className="font-bold text-sm">คุณไม่มีรายการที่กำลังยืม</p>
             </div>
          )}
        </div>
      </main>

      {/* แถบกดยืนยันคืน/ยกเลิกเครื่องมือรวดเดียว */}
      {activeCategory === 'fixtures' && fixtureTab === 'borrowed' && Object.values(batchReturnState).some(s => s.selected) && (
        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 pb-safe shadow-[0_-15px_30px_rgba(15,23,42,0.08)] z-30 animate-in slide-in-from-bottom-10">
          <button onClick={handleBatchReturnSubmit} disabled={isSubmitting} className="w-full bg-[#0f172a] text-white font-black py-4 rounded-xl shadow-xl shadow-slate-900/20 hover:bg-black active:scale-95 transition-all text-[15px] flex items-center justify-center gap-2">
            {isSubmitting ? <><i className="bi bi-arrow-repeat animate-spin"></i> กำลังดำเนินการ...</> : <><i className="bi bi-check-all text-xl"></i> ยืนยันการทำรายการที่เลือก</>}
          </button>
        </div>
      )}

      {/* แถบตะกร้าสินค้าปกติ */}
      <div className={`absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 pb-safe shadow-[0_-15px_30px_rgba(15,23,42,0.08)] z-30 transition-transform duration-300 ${(activeCategory !== 'fixtures' || fixtureTab !== 'borrowed') && cartItemsCount > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
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

            <form onSubmit={handleConfirmSubmit} className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              
              {hasSparePartsInCart && (
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-4">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1"><i className="bi bi-info-circle-fill"></i> ข้อมูลสำหรับเบิกอะไหล่</p>
                  <div><label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">ไลน์ผลิต (Line)</label><div className="relative"><select required value={selectedLine} onChange={(e) => { setSelectedLine(e.target.value); setSelectedMachine(''); }} className="w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-bold text-slate-800 text-sm"><option value="">-- เลือกไลน์ผลิต --</option>{lines.map(line => <option key={line} value={line}>{line}</option>)}</select><i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i></div></div>
                  <div><label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">เครื่องจักร (Machine)</label><div className="relative"><select required disabled={!selectedLine} value={selectedMachine} onChange={(e) => setSelectedMachine(e.target.value)} className="w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:opacity-50 font-bold text-slate-800 text-sm"><option value="">{selectedLine ? '-- เลือกเครื่องจักร --' : '-'}</option>{filteredMachines.map(m => <option key={m.MachineID} value={m.MachineID}>{m.MachineName}</option>)}</select><i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i></div></div>
                  <div><label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">สาเหตุที่เปลี่ยน</label><div className="relative"><select required value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-bold text-slate-800 text-sm"><option value="Normal Wear">ปกติ (Wear)</option><option value="Accident">อุบัติเหตุ (Accident)</option><option value="Improvement">ปรับปรุง</option></select><i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i></div></div>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">รายการในตะกร้า ({Object.keys(cart).length})</h4>
                <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                  {Object.keys(cart).map(itemId => {
                    const isPart = cart[itemId].type === 'part';
                    const isFix = cart[itemId].type === 'fixture';
                    let name = '';
                    if(isPart) name = parts.find(p => p.PartID === itemId)?.PartName;
                    else if (isFix) name = fixtures.find(f => f.FixtureNo === itemId)?.ModelName;
                    else name = consumables.find(c => c.ItemID === itemId)?.ItemName;

                    return (
                      <div key={itemId} className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start text-sm">
                          <span className="font-bold text-slate-700 leading-tight pr-4">
                            <i className={`bi ${isPart ? 'bi-gear-wide-connected text-blue-500' : isFix ? 'bi-tools text-purple-500' : 'bi-box2-heart text-pink-500'} mr-2`}></i>{name || itemId}
                          </span>
                          <span className={`font-black px-2 py-0.5 rounded-md ${isPart ? 'text-blue-600 bg-blue-50' : isFix ? 'text-purple-600 bg-purple-50' : 'text-pink-600 bg-pink-50'}`}>x{cart[itemId].qty}</span>
                        </div>
                        
                        {/* 🌟 อัปเกรดปุ่มระบุจุดติดตั้งเป็นป๊อปอัพ (Modal) แทนการพิมพ์ 🌟 */}
                        {isPart && (
                          <div className="mt-2">
                            <button 
                              type="button" 
                              disabled={!selectedMachine}
                              onClick={() => {
                                setPositionModal({ isOpen: true, itemId: itemId, itemName: name || itemId });
                                setTempPositionSearch(cart[itemId].position || '');
                              }}
                              className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                                !selectedMachine ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' :
                                cart[itemId].position ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <i className="bi bi-geo-alt-fill"></i>
                                <span className="font-bold text-xs">
                                  {!selectedMachine ? 'โปรดเลือกเครื่องจักรด้านบนก่อน' : 
                                   cart[itemId].position ? `จุด: ${cart[itemId].position}` : 'ระบุจุดที่ติดตั้ง (คลิก)'}
                                </span>
                              </div>
                              {selectedMachine && <i className="bi bi-chevron-right text-xs"></i>}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2 mt-auto">
                <button type="submit" disabled={isSubmitting} className="w-full bg-[#0f172a] text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-900/20 hover:bg-black active:scale-95 transition-all text-lg flex items-center justify-center gap-2">
                  {isSubmitting ? <><i className="bi bi-arrow-repeat animate-spin"></i> กำลังประมวลผล...</> : <><i className="bi bi-send-fill"></i> ยืนยันคำขอ</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 แจ้งเตือนของติดจอง 🌟 */}
      {reservationModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[500] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col gap-6">
            <div className="flex flex-col gap-2 items-center text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl shadow-inner border border-blue-100"><i className="bi bi-info-circle-fill"></i></div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight mt-2">แจ้งเตือน: อะไหล่ติดจอง!</h3>
              <p className="text-xs text-slate-500 font-medium">คุณกำลังหยิบอะไหล่ที่อาจเป็นการดึงตัดหน้าคิวอื่น</p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-slate-700 space-y-3.5">
              <div className="flex items-start gap-3"><i className="bi bi-gear-wide-connected text-blue-500 text-base"></i><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ชื่ออะไหล่</p><p className="font-bold text-sm tracking-tight">{reservationModal.partName}</p></div></div>
              <div className="flex items-start gap-3"><i className="bi bi-bar-chart-fill text-amber-500 text-base"></i><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">มียอดจองรวม</p><p className="font-bold text-sm tracking-tight">{reservationModal.totalReserved} <span className="text-slate-500 text-[11px]">ชิ้น</span></p></div></div>
              <div className="flex items-start gap-3"><i className="bi bi-geo-alt-fill text-emerald-500 text-base"></i><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">สำหรับเครื่อง (ไลน์) [จุด]</p><p className="font-bold text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">🔸 {reservationModal.machineInfo}</p></div></div>
            </div>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => setReservationModal(prev => ({ ...prev, isOpen: false }))} className="w-full bg-slate-50 text-slate-500 py-3.5 rounded-2xl font-black text-sm transition-all hover:bg-slate-100 active:scale-95">ยกเลิก (ไม่หยิบ)</button>
              <button type="button" onClick={() => { reservationModal.onConfirm && reservationModal.onConfirm(); }} className="w-full bg-[#0f172a] text-white py-4.5 rounded-2xl font-black text-base shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2">แน่ใจที่จะหยิบใส่ตะกร้า <i className="bi bi-arrow-right"></i></button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
