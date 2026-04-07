"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getSmartMaintenanceData } from '../lib/maintenanceLogic';

export interface DashboardReport { machineId: string; machine: string; line: string; partId: string; partName: string; reqQty: number; orderDate: string; dueDate: string; status: string; alertLevel: number; mtbfDays: number; }

export default function MaintenanceDashboard() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [activeDeptName, setActiveDeptName] = useState('');

  const [filterLine, setFilterLine] = useState('');
  const [filterMachine, setFilterMachine] = useState('');

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data } = await supabase.from('Departments').select('*');
      if (data) setDepartments(data);
    };
    fetchDepartments();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const activeDept = localStorage.getItem('activeDepartment');
      if (session && activeDept) fetchDeptName(activeDept);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const fetchDeptName = async (deptId: string | null) => {
    if(!deptId) return;
    const { data } = await supabase.from('Departments').select('DepartmentName').eq('DepartmentID', deptId).single();
    if(data) setActiveDeptName(data.DepartmentName);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) { showToast('Please select a department before signing in.', 'warning'); return; }
    setIsLoggingIn(true);
    
    const { data: roleData, error: roleError } = await supabase.from('UserRoles').select('*').eq('Email', email).single();
    if (roleError || !roleData || roleData.Role !== 'Admin') {
      showToast('Access Denied. Administrator privileges required.', 'error'); setIsLoggingIn(false); return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { showToast(error.message === 'Invalid login credentials' ? 'Invalid email or password' : error.message, 'error');
    } else {
      localStorage.setItem('activeDepartment', selectedDept); fetchDeptName(selectedDept); showToast('Signed in successfully!', 'success');
    }
    setIsLoggingIn(false);
  };
  
  const handleLogout = async () => { 
    await supabase.auth.signOut(); localStorage.removeItem('activeDepartment'); setActiveDeptName(''); showToast('Signed out successfully', 'info'); 
  };

  const [activeTab, setActiveTab] = useState('dashboard'); 
  // 🌟 อัปเกรดจัดกลุ่ม Sidebar เป็น 4 หมวด
  const [expandedGroups, setExpandedGroups] = useState({ Workspace: true, Inventory: true, Operations: true, Settings: true });
  
  const [isReceiveStockModalOpen, setReceiveStockModalOpen] = useState(false);
  const [isReduceStockModalOpen, setReduceStockModalOpen] = useState(false);
  const [isLeadTimeModalOpen, setLeadTimeModalOpen] = useState(false);
  const [isNewPartModalOpen, setNewPartModalOpen] = useState(false);
  const [isEditPartModalOpen, setEditPartModalOpen] = useState(false); 
  const [isNewMachineModalOpen, setNewMachineModalOpen] = useState(false);
  const [isEditMachineModalOpen, setEditMachineModalOpen] = useState(false);
  const [editingMachineData, setEditingMachineData] = useState<any>(null);
  const [editingPartData, setEditingPartData] = useState<any>(null); 
  const [basicInfoModal, setBasicInfoModal] = useState<{ isOpen: boolean, type: 'line' | 'location' }>({ isOpen: false, type: 'line' });

  const [consumables, setConsumables] = useState<any[]>([]);
  const [isNewConsumableModalOpen, setNewConsumableModalOpen] = useState(false);
  const [isReceiveConsumableOpen, setReceiveConsumableOpen] = useState(false);
  const [isReduceConsumableOpen, setReduceConsumableOpen] = useState(false);
  const [isEditConsumableOpen, setEditConsumableOpen] = useState(false);
  const [editingConsumableData, setEditingConsumableData] = useState<any>(null);
  const [selectedConsumable, setSelectedConsumable] = useState<any>(null);

  const [fixtures, setFixtures] = useState<any[]>([]);
  const [isNewFixtureModalOpen, setNewFixtureModalOpen] = useState(false);
  const [isEditFixtureStockOpen, setEditFixtureStockOpen] = useState(false);
  const [isEditFixtureInfoOpen, setEditFixtureInfoOpen] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<any>(null);
  const [fixtureActionReason, setFixtureActionReason] = useState('New Receive'); 
  const [isFixtureReasonDropdownOpen, setIsFixtureReasonDropdownOpen] = useState(false); 

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [selectedActionPart, setSelectedActionPart] = useState<{ id: string, name: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void, isDanger?: boolean } | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'warning' | 'info' | 'error'} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const [changeHistoryData, setChangeHistoryData] = useState<any[]>([]);
  const [historyMonthFilter, setHistoryMonthFilter] = useState(new Date().toISOString().slice(0, 7));

  const [moveCategoryModal, setMoveCategoryModal] = useState<{ isOpen: boolean; source: 'part' | 'consumable'; itemData: any; stockBalance: number; location: string; } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };
  const toggleGroup = (group: keyof typeof expandedGroups) => setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));

  const [stockData, setStockData] = useState<any[]>([]);
  const [stockAllocations, setStockAllocations] = useState<{ [partId: string]: { physical: number, reserved: number, available: number, machines: string[] } }>({});
  const [machines, setMachines] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState({ machines: 0, parts: 0, outOfStock: 0, overdue: 0 });
  const [scheduleData, setScheduleData] = useState<DashboardReport[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [linesMaster, setLinesMaster] = useState<any[]>([]);
  const [locationsMaster, setLocationsMaster] = useState<any[]>([]);

  useEffect(() => { if (session) fetchAllData(); }, [session]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const activeDept = localStorage.getItem('activeDepartment');
      if (!activeDept) { setIsLoading(false); return; }

      const data = await getSmartMaintenanceData(activeDept);
      
      const { data: partData } = await supabase.from('Part').select('PartID, PendingOrder').eq('DepartmentID', activeDept);
      const updatedSchedule = data.scheduleData.map(row => {
        const pInfo = partData?.find(p => p.PartID === row.partId);
        if (pInfo?.PendingOrder && (row.status === 'ORDER NOW' || row.status === 'OVERDUE')) {
          return { ...row, status: 'ORDERED', alertLevel: 3 }; 
        }
        return row;
      });
      updatedSchedule.sort((a, b) => b.alertLevel - a.alertLevel);

      const sortedStock = [...data.rawStock].sort((a, b) => (a.Balance || 0) - (b.Balance || 0));

      setStockData(sortedStock); 
      setMachines(data.rawMachines); 
      setParts(data.rawParts);
      setStockAllocations(data.allocations); 
      setScheduleData(updatedSchedule); 
      setDashboardStats(data.stats);

      const { data: reqData } = await supabase.from('PartRequests').select('*').eq('Status', 'Pending').eq('DepartmentID', activeDept).order('CreatedAt', { ascending: true });
      setPendingRequests(reqData || []);

      const { data: lData } = await supabase.from('LineMaster').select('*').eq('DepartmentID', activeDept);
      const { data: locData } = await supabase.from('LocationMaster').select('*').eq('DepartmentID', activeDept);
      setLinesMaster(lData || []);
      setLocationsMaster(locData || []);

      const { data: consData } = await supabase.from('Consumable').select('*').eq('DepartmentID', activeDept);
      setConsumables(consData || []);

      const { data: fixData } = await supabase.from('Fixtures').select('*').eq('DepartmentID', activeDept);
      setFixtures(fixData || []);

      fetchHistoryData(activeDept);

    } catch (error) { showToast('Error loading data', 'warning'); } finally { setIsLoading(false); }
  };

  const fetchHistoryData = async (dept: string) => {
    const [year, month] = historyMonthFilter.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

    const { data: history } = await supabase.from('ChangeHistory').select('*').eq('DepartmentID', dept).gte('ChangeDate', startDate).lte('ChangeDate', endDate).order('ChangeDate', { ascending: false });
    setChangeHistoryData(history || []);
  };

  useEffect(() => {
    const activeDept = localStorage.getItem('activeDepartment');
    if (activeDept) fetchHistoryData(activeDept);
  }, [historyMonthFilter]);

  const handleUndoTransaction = (record: any) => {
    const partName = parts.find(p => p.PartID === record.PartID)?.PartName || record.PartID;
    const qty = parseInt(record['Required Qty']) || 0; 
    setConfirmDialog({
      isOpen: true, title: 'Undo Transaction & Return Stock', isDanger: true,
      message: `คุณกำลังจะยกเลิกการเบิกของ:\n- ${partName} (${qty} ชิ้น)\n\nระบบจะลบประวัตินี้ออกและคืนยอดกลับเข้าสต๊อก เสมือนว่าไม่เคยมีการเบิกชิ้นนี้ไป คุณแน่ใจหรือไม่?`,
      onConfirm: async () => {
        setConfirmDialog(null); setIsProcessing(true);
        try {
          const activeDept = localStorage.getItem('activeDepartment');
          const { data: pl } = await supabase.from('PickLog').select('Location').eq('RecordID', record.RecordID).single();
          const targetLocation = pl?.Location || '-';
          const { data: stockRecords } = await supabase.from('Stock').select('*').eq('PartID', record.PartID).eq('DepartmentID', activeDept);

          if (stockRecords && stockRecords.length > 0) {
            const targetStock = stockRecords.find(s => s.Location === targetLocation) || stockRecords[0];
            const newBalance = (parseInt(targetStock.Balance) || 0) + qty;
            await supabase.from('Stock').update({ Balance: newBalance, LastUpdated: new Date().toISOString() }).eq('PartID', targetStock.PartID).eq('Location', targetStock.Location).eq('DepartmentID', activeDept);
          } else {
            await supabase.from('Stock').insert({ PartID: record.PartID, PartName: partName, Location: targetLocation, Balance: qty, LastUpdated: new Date().toISOString(), DepartmentID: activeDept });
          }
          await supabase.from('ChangeHistory').delete().eq('RecordID', record.RecordID);
          await supabase.from('PickLog').delete().eq('RecordID', record.RecordID);
          showToast('ทำรายการคืนของและลบประวัติสำเร็จ!', 'success'); fetchAllData();
        } catch (error: any) { showToast(`Error: ${error.message}`, 'error'); } finally { setIsProcessing(false); }
      }
    });
  };

  const handleChangeReason = async (recordId: string, newReason: string) => {
    const { error } = await supabase.from('ChangeHistory').update({ ReasonType: newReason }).eq('RecordID', recordId);
    if (!error) { showToast('เปลี่ยนสาเหตุสำเร็จ ระบบจะคำนวณ MTBF ใหม่', 'success'); fetchAllData(); } 
    else { showToast(`Error: ${error.message}`, 'error'); }
  };

  // 🌟 อัปเกรดให้รับ Type
  const handleMarkAsOrdered = async (id: string, type: 'part' | 'consumable' = 'part') => {
    const table = type === 'part' ? 'Part' : 'Consumable';
    const idField = type === 'part' ? 'PartID' : 'ItemID';
    const { error } = await supabase.from(table).update({ PendingOrder: true }).eq(idField, id);
    if (!error) { showToast('Status updated to "ORDERED" successfully!', 'success'); fetchAllData(); } 
    else { showToast(`Error: ${error.message}`, 'error'); }
  };

  const handleDismissAlert = (machineId: string, partId: string, partName: string) => {
    setConfirmDialog({
      isOpen: true, title: 'Confirm Inspection', message: `Confirm that you have inspected part "${partName}" and it is functioning normally?`,
      onConfirm: async () => {
        setConfirmDialog(null); const activeDept = localStorage.getItem('activeDepartment');
        const { error } = await supabase.from('ChangeHistory').insert({ RecordID: Date.now().toString(), MachineID: machineId, PartID: partId, ChangeDate: new Date().toISOString().split('T')[0], ReasonType: 'Inspection-OK', "Required Qty": 0, DepartmentID: activeDept, Position: '-' });
        if (error) showToast(`Error: ${error.message}`, 'error'); else { showToast('Acknowledged! Status changed to MONITORING.', 'success'); fetchAllData(); }
      }
    });
  };

  const openActionModal = (type: 'receive' | 'reduce' | 'leadTime' | 'edit', partId: string, partName: string) => {
    setSelectedActionPart({ id: partId, name: partName }); setOpenDropdownId(null);
    if (type === 'receive') setReceiveStockModalOpen(true);
    if (type === 'reduce') setReduceStockModalOpen(true);
    if (type === 'leadTime') setLeadTimeModalOpen(true);
    if (type === 'edit') {
      const partInfo = parts.find(p => p.PartID === partId);
      const stockInfo = stockData.find(s => s.PartID === partId); 
      setEditingPartData({ ...(partInfo || { PartID: partId, PartName: partName }), Location: stockInfo?.Location || '' });
      setPreviewImage(partInfo?.ImageURL || null); 
      setEditPartModalOpen(true);
    }
  };

  const handleDeletePart = (partId: string, partName: string) => {
    setOpenDropdownId(null);
    setConfirmDialog({
      isOpen: true, title: 'Delete Part Permanently', isDanger: true,
      message: `Are you sure you want to delete "${partName}" (ID: ${partId})?\n\n⚠️ This action will remove the part from both Part details and Stock. This cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null); setIsProcessing(true);
        try {
          await supabase.from('Stock').delete().eq('PartID', partId);
          const { error } = await supabase.from('Part').delete().eq('PartID', partId);
          if (error) throw error; showToast(`Part "${partName}" has been deleted.`, 'success'); fetchAllData();
        } catch (error: any) { showToast(`Error deleting part: ${error.message}`, 'error'); } finally { setIsProcessing(false); }
      }
    });
  };

  const openMoveCategory = (source: 'part' | 'consumable', itemId: string) => {
    setOpenDropdownId(null); const reqs = pendingRequests.filter(r => r.PartID === itemId);
    if (reqs.length > 0) return showToast('ไม่สามารถย้ายหมวดหมู่ได้ เนื่องจากมีใบเบิกค้างอยู่ในระบบ กรุณาจ่ายของให้เสร็จสิ้นก่อน', 'error');
    if (source === 'part') {
      const p = parts.find(x => x.PartID === itemId); const stocks = stockData.filter(s => s.PartID === itemId);
      const totalBal = stocks.reduce((sum, s) => sum + (parseInt(s.Balance) || 0), 0);
      const loc = stocks.length > 0 ? stocks[0].Location : '-';
      setMoveCategoryModal({ isOpen: true, source, itemData: p, stockBalance: totalBal, location: loc });
    } else {
      const c = consumables.find(x => x.ItemID === itemId);
      setMoveCategoryModal({ isOpen: true, source, itemData: c, stockBalance: parseInt(c.Balance) || 0, location: c.Location || '-' });
    }
  };

  const handleMoveCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!moveCategoryModal) return; setIsProcessing(true);
    const formData = new FormData(e.currentTarget); const activeDept = localStorage.getItem('activeDepartment');
    try {
      const oldId = moveCategoryModal.source === 'part' ? moveCategoryModal.itemData.PartID : moveCategoryModal.itemData.ItemID;
      if (moveCategoryModal.source === 'part') {
        const newId = `CSM-${Date.now()}`;
        const min = parseInt(formData.get('min') as string); const safety = parseInt(formData.get('safety') as string); const max = parseInt(formData.get('max') as string);
        const { error: insErr } = await supabase.from('Consumable').insert({ ItemID: newId, ItemName: moveCategoryModal.itemData.PartName, ItemModel: moveCategoryModal.itemData.PartModel || '', Location: moveCategoryModal.location, ImageURL: moveCategoryModal.itemData.ImageURL || '', Balance: moveCategoryModal.stockBalance, MinQty: min, MaxQty: max, SafetyStock: safety, DepartmentID: activeDept });
        if (insErr) throw insErr;
        await supabase.from('ChangeHistory').update({ PartID: newId }).eq('PartID', oldId); await supabase.from('PickLog').update({ PartID: newId }).eq('PartID', oldId); await supabase.from('Stock').delete().eq('PartID', oldId); await supabase.from('Part').delete().eq('PartID', oldId);
      } else {
        const newId = `P-${Date.now()}`; const buffer = parseInt(formData.get('buffer') as string);
        const { error: partErr } = await supabase.from('Part').insert({ PartID: newId, PartName: moveCategoryModal.itemData.ItemName, PartModel: moveCategoryModal.itemData.ItemModel || '', ImageURL: moveCategoryModal.itemData.ImageURL || '', SafetyBufferDays: buffer, DepartmentID: activeDept });
        if (partErr) throw partErr;
        const { error: stkErr } = await supabase.from('Stock').insert({ PartID: newId, PartName: moveCategoryModal.itemData.ItemName, Location: moveCategoryModal.location, Balance: moveCategoryModal.stockBalance, LastUpdated: new Date().toISOString(), DepartmentID: activeDept });
        if (stkErr) throw stkErr;
        await supabase.from('ChangeHistory').update({ PartID: newId }).eq('PartID', oldId); await supabase.from('PickLog').update({ PartID: newId }).eq('PartID', oldId); await supabase.from('Consumable').delete().eq('ItemID', oldId);
      }
      showToast('ย้ายหมวดหมู่สำเร็จ! ประวัติและการเบิกยังอยู่ครบ', 'success'); setMoveCategoryModal(null); fetchAllData();
    } catch (error: any) { showToast(`Error: ${error.message}`, 'error'); } finally { setIsProcessing(false); }
  };
  
  const openNewPartModal = () => { setPreviewImage(null); setNewPartModalOpen(true); };
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { setPreviewImage(URL.createObjectURL(file)); } };

  const handleNewPartSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsProcessing(true); const formData = new FormData(e.currentTarget); const activeDept = localStorage.getItem('activeDepartment'); 
    let finalImageUrl = ''; const imageFile = formData.get('imageFile') as File; const locationVal = formData.get('location') as string; 
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop(); const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('part-images').upload(fileName, imageFile);
      if (uploadError) { showToast(`Image upload failed`, 'error'); setIsProcessing(false); return; }
      const { data } = supabase.storage.from('part-images').getPublicUrl(fileName); finalImageUrl = data.publicUrl;
    }
    const generatedPartID = `P-${Date.now()}`;
    const { error: partErr } = await supabase.from('Part').insert({ PartID: generatedPartID, PartNumber: formData.get('partNumber') as string, PartName: formData.get('name'), PartModel: formData.get('model'), ImageURL: finalImageUrl, SafetyBufferDays: parseInt(formData.get('buffer') as string), DepartmentID: activeDept });
    if (partErr) { showToast(`Error: ${partErr.message}`, 'error'); setIsProcessing(false); return; }
    if (locationVal) { await supabase.from('Stock').insert({ Location: locationVal, PartID: generatedPartID, PartName: formData.get('name'), Balance: 0, LastUpdated: new Date().toISOString(), DepartmentID: activeDept }); }
    showToast('Part registered successfully!', 'success'); setNewPartModalOpen(false); fetchAllData(); setIsProcessing(false);
  };

  const handleEditPartSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsProcessing(true); const formData = new FormData(e.currentTarget);
    let finalImageUrl = editingPartData?.ImageURL || ''; const imageFile = formData.get('imageFile') as File; const locationVal = formData.get('location') as string; const activeDept = localStorage.getItem('activeDepartment');
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop(); const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('part-images').upload(fileName, imageFile);
      if (uploadError) { showToast(`Image upload failed`, 'error'); setIsProcessing(false); return; }
      const { data } = supabase.storage.from('part-images').getPublicUrl(fileName); finalImageUrl = data.publicUrl; 
    }
    const { error: partErr } = await supabase.from('Part').update({ PartNumber: formData.get('partNumber') as string, PartName: formData.get('name'), PartModel: formData.get('model'), ImageURL: finalImageUrl, SafetyBufferDays: parseInt(formData.get('buffer') as string) }).eq('PartID', editingPartData.PartID);
    if (partErr) { showToast(`Error: ${partErr.message}`, 'error'); setIsProcessing(false); return; }
    if (locationVal) {
      const { data: exStock } = await supabase.from('Stock').select('*').eq('PartID', editingPartData.PartID).single();
      if (exStock) { await supabase.from('Stock').update({ Location: locationVal, PartName: formData.get('name') }).eq('PartID', editingPartData.PartID); } 
      else { await supabase.from('Stock').insert({ Location: locationVal, PartID: editingPartData.PartID, PartName: formData.get('name'), Balance: 0, LastUpdated: new Date().toISOString(), DepartmentID: activeDept }); }
    }
    showToast('Part updated successfully!', 'success'); setEditPartModalOpen(false); fetchAllData(); setIsProcessing(false);
  };

  const handleReceiveStock = async (e: React.FormEvent<HTMLFormElement>) => { 
    e.preventDefault(); const formData = new FormData(e.currentTarget); const pId = selectedActionPart?.id || ''; const qty = parseInt(formData.get('qty') as string); const existingStock = stockData.find(s => s.PartID === pId); const loc = existingStock?.Location || '-'; const activeDept = localStorage.getItem('activeDepartment');
    if (existingStock) { await supabase.from('Stock').update({ Balance: (parseInt(existingStock.Balance) || 0) + qty, LastUpdated: new Date().toISOString() }).eq('PartID', pId).eq('Location', loc); } 
    else { await supabase.from('Stock').insert({ Location: loc, PartID: pId, PartName: selectedActionPart?.name || '', Balance: qty, LastUpdated: new Date().toISOString(), DepartmentID: activeDept }); } 
    await supabase.from('Part').update({ PendingOrder: false }).eq('PartID', pId);
    showToast('Stock received successfully!', 'success'); setReceiveStockModalOpen(false); fetchAllData(); 
  };

  const handleReduceStock = async (e: React.FormEvent<HTMLFormElement>) => { 
    e.preventDefault(); const formData = new FormData(e.currentTarget); const pId = selectedActionPart?.id || ''; const qty = parseInt(formData.get('qty') as string); 
    const existingStock = stockData.find(s => s.PartID === pId); const loc = existingStock?.Location || '-'; const activeDept = localStorage.getItem('activeDepartment');
    if (existingStock) { 
      const newBalance = Math.max(0, qty); 
      await supabase.from('Stock').update({ Balance: newBalance, LastUpdated: new Date().toISOString() }).eq('PartID', pId).eq('Location', loc); 
      await supabase.from('PickLog').insert({ RecordID: Date.now().toString(), Timestamp: new Date().toISOString(), Location: loc, PartID: pId, MachineID: 'MANUAL', Qty: Math.abs(existingStock.Balance - newBalance), PickerName: 'Admin Adjustment', LineUserID: session?.user?.email, DepartmentID: activeDept });
      showToast('Stock adjusted successfully!', 'success'); setReduceStockModalOpen(false); fetchAllData(); 
    } else { showToast('Stock data not found for this item', 'error'); }
  };

  const handleNewConsumableSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsProcessing(true); const formData = new FormData(e.currentTarget); const activeDept = localStorage.getItem('activeDepartment'); 
    let finalImageUrl = ''; const imageFile = formData.get('imageFile') as File;
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop(); const fileName = `CSM_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('part-images').upload(fileName, imageFile);
      if (uploadError) { showToast(`Image upload failed`, 'error'); setIsProcessing(false); return; }
      const { data } = supabase.storage.from('part-images').getPublicUrl(fileName); finalImageUrl = data.publicUrl;
    }
    const itemId = `CSM-${Date.now()}`;
    const minVal = parseInt(formData.get('min') as string); const maxVal = parseInt(formData.get('max') as string); const safetyVal = parseInt(formData.get('safety') as string); const balVal = parseInt(formData.get('balance') as string);
    const { error } = await supabase.from('Consumable').insert({
      ItemID: itemId, PartNumber: formData.get('partNumber') as string, ItemName: formData.get('name'), ItemModel: formData.get('model') as string, Location: formData.get('location') || '-', ImageURL: finalImageUrl,
      Balance: isNaN(balVal) ? 0 : balVal, MinQty: isNaN(minVal) ? 10 : minVal, MaxQty: isNaN(maxVal) ? 100 : maxVal, SafetyStock: isNaN(safetyVal) ? 5 : safetyVal, DepartmentID: activeDept 
    });
    if (error) showToast(`Error: ${error.message}`, 'error'); else { showToast('Consumable added successfully!', 'success'); setNewConsumableModalOpen(false); fetchAllData(); }
    setIsProcessing(false);
  };

  const handleEditConsumableSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsProcessing(true); const formData = new FormData(e.currentTarget);
    let finalImageUrl = editingConsumableData?.ImageURL || ''; const imageFile = formData.get('imageFile') as File;
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop(); const fileName = `CSM_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('part-images').upload(fileName, imageFile);
      if (uploadError) { showToast(`Image upload failed`, 'error'); setIsProcessing(false); return; }
      const { data } = supabase.storage.from('part-images').getPublicUrl(fileName); finalImageUrl = data.publicUrl;
    }
    const minVal = parseInt(formData.get('min') as string); const maxVal = parseInt(formData.get('max') as string); const safetyVal = parseInt(formData.get('safety') as string);
    const { error } = await supabase.from('Consumable').update({
      PartNumber: formData.get('partNumber') as string, ItemName: formData.get('name'), ItemModel: formData.get('model') as string, Location: formData.get('location') || '-', ImageURL: finalImageUrl,
      MinQty: isNaN(minVal) ? 10 : minVal, MaxQty: isNaN(maxVal) ? 100 : maxVal, SafetyStock: isNaN(safetyVal) ? 5 : safetyVal
    }).eq('ItemID', editingConsumableData.ItemID);
    if (error) showToast(`Error: ${error.message}`, 'error'); else { showToast('Item info updated successfully!', 'success'); setEditConsumableOpen(false); fetchAllData(); }
    setIsProcessing(false);
  };

  // 🌟 อัปเกรดปลดล็อคสถานะ Ordered อัตโนมัติ
  const handleConsumableAction = async (e: React.FormEvent<HTMLFormElement>, actionType: 'receive' | 'adjust') => {
    e.preventDefault(); const formData = new FormData(e.currentTarget); const qty = parseInt(formData.get('qty') as string); const currentBalance = parseInt(selectedConsumable.Balance) || 0;
    const newBalance = actionType === 'receive' ? currentBalance + qty : qty;
    const updateData: any = { Balance: newBalance };
    if (actionType === 'receive') updateData.PendingOrder = false; 

    const { error } = await supabase.from('Consumable').update(updateData).eq('ItemID', selectedConsumable.ItemID);
    if (!error) { showToast(`${actionType === 'receive' ? 'Stock received' : 'Stock adjusted'} successfully!`, 'success'); setReceiveConsumableOpen(false); setReduceConsumableOpen(false); fetchAllData(); } 
    else { showToast(`Error: ${error.message}`, 'error'); }
  };

  const handleDeleteConsumable = (itemId: string, itemName: string) => {
    setOpenDropdownId(null);
    setConfirmDialog({ isOpen: true, title: 'Delete Consumable', isDanger: true, message: `Are you sure you want to delete "${itemName}"?\nThis cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(null); setIsProcessing(true);
        const { error } = await supabase.from('Consumable').delete().eq('ItemID', itemId);
        if (!error) { showToast(`Consumable "${itemName}" deleted successfully.`, 'success'); fetchAllData(); } else { showToast(`Error: ${error.message}`, 'error'); }
        setIsProcessing(false);
      }
    });
  };

  // 🌟 Fixtures Functions (Upgraded with Borrow/Return logic)
  const handleNewFixtureSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsProcessing(true); const formData = new FormData(e.currentTarget); const activeDept = localStorage.getItem('activeDepartment'); const fNo = formData.get('fixtureNo') as string;
    const ex = fixtures.find(f => f.FixtureNo === fNo); if (ex) { showToast('This Fixture No. already exists!', 'error'); setIsProcessing(false); return; }
    let finalImageUrl = ''; const imageFile = formData.get('imageFile') as File;
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop(); const fileName = `FIX_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('part-images').upload(fileName, imageFile);
      if (uploadError) { showToast(`Image upload failed`, 'error'); setIsProcessing(false); return; }
      const { data } = supabase.storage.from('part-images').getPublicUrl(fileName); finalImageUrl = data.publicUrl;
    }
    const { error } = await supabase.from('Fixtures').insert({ FixtureNo: fNo, ModelName: formData.get('modelName'), ImageURL: finalImageUrl, TotalQty: parseInt(formData.get('totalQty') as string) || 0, BrokenQty: 0, BorrowedQty: 0, DepartmentID: activeDept });
    if (error) showToast(`Error: ${error.message}`, 'error'); else { showToast('Added new fixture successfully!', 'success'); setNewFixtureModalOpen(false); fetchAllData(); }
    setIsProcessing(false);
  };

  const handleEditFixtureInfoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsProcessing(true); const formData = new FormData(e.currentTarget);
    let finalImageUrl = selectedFixture?.ImageURL || ''; const imageFile = formData.get('imageFile') as File;
    if (imageFile && imageFile.size > 0) {
      const fileExt = imageFile.name.split('.').pop(); const fileName = `FIX_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('part-images').upload(fileName, imageFile);
      if (uploadError) { showToast(`Image upload failed`, 'error'); setIsProcessing(false); return; }
      const { data } = supabase.storage.from('part-images').getPublicUrl(fileName); finalImageUrl = data.publicUrl;
    }
    const { error } = await supabase.from('Fixtures').update({ ModelName: formData.get('modelName'), ImageURL: finalImageUrl }).eq('FixtureNo', selectedFixture.FixtureNo);
    if (error) showToast(`Error: ${error.message}`, 'error'); else { showToast('Fixture info updated!', 'success'); setEditFixtureInfoOpen(false); fetchAllData(); }
    setIsProcessing(false);
  };

  const handleEditFixtureStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsProcessing(true); const formData = new FormData(e.currentTarget); const reason = fixtureActionReason; const qty = parseInt(formData.get('qty') as string) || 0;
    let newTotal = selectedFixture.TotalQty || 0; let newBroken = selectedFixture.BrokenQty || 0;
    
    if (reason === 'New Receive') { newTotal += qty; } 
    else if (reason === 'Repair') { if (qty > newBroken) { showToast('Cannot repair more than broken qty!', 'error'); setIsProcessing(false); return; } newBroken -= qty; } 
    else if (reason === 'Scrap') { if (qty > newBroken) { showToast('Cannot scrap more than broken qty!', 'error'); setIsProcessing(false); return; } newTotal -= qty; newBroken -= qty; }

    const { error } = await supabase.from('Fixtures').update({ TotalQty: newTotal, BrokenQty: newBroken }).eq('FixtureNo', selectedFixture.FixtureNo);
    if (error) showToast(`Error: ${error.message}`, 'error'); else { showToast('Stock updated successfully!', 'success'); setEditFixtureStockOpen(false); fetchAllData(); }
    setIsProcessing(false);
  };

  const handleDeleteFixture = (fixtureNo: string) => {
    setOpenDropdownId(null); setConfirmDialog({ isOpen: true, title: 'Delete Fixture', isDanger: true, message: `Are you sure you want to delete Fixture No: ${fixtureNo}?\nThis cannot be undone.`, onConfirm: async () => { setConfirmDialog(null); setIsProcessing(true); const { error } = await supabase.from('Fixtures').delete().eq('FixtureNo', fixtureNo); if (!error) { showToast(`Fixture deleted successfully.`, 'success'); fetchAllData(); } else showToast(`Error: ${error.message}`, 'error'); setIsProcessing(false); } });
  };

  const handleUpdateLeadTime = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const formData = new FormData(e.currentTarget); const activeDept = localStorage.getItem('activeDepartment'); const { error } = await supabase.from('LeadTime').insert({ RecordID: Date.now().toString(), PartID: selectedActionPart?.id || '', LeadTimeDays: parseInt(formData.get('days') as string), RecordDate: new Date().toISOString(), DepartmentID: activeDept }); if (!error) { showToast('Lead time updated successfully!', 'success'); setLeadTimeModalOpen(false); fetchAllData(); } };
  const handleNewMachineSubmit = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); setIsProcessing(true); const formData = new FormData(e.currentTarget); const activeDept = localStorage.getItem('activeDepartment'); const { error } = await supabase.from('Machine').insert({ MachineID: formData.get('id'), MachineName: formData.get('name'), LineName: formData.get('line'), Active: true, DepartmentID: activeDept }); if (!error) { showToast('Machine registered successfully!', 'success'); setNewMachineModalOpen(false); fetchAllData(); } else showToast(`Error: ${error.message}`, 'error'); setIsProcessing(false); };
  const handleEditMachineSubmit = async (e: React.FormEvent<HTMLFormElement>) => { 
    e.preventDefault(); setIsProcessing(true); const formData = new FormData(e.currentTarget); 
    const { error } = await supabase.from('Machine').update({ MachineName: formData.get('name'), LineName: formData.get('line') }).eq('MachineID', editingMachineData.MachineID); 
    if (!error) { showToast('อัปเดตข้อมูลเครื่องจักรสำเร็จ!', 'success'); setEditMachineModalOpen(false); fetchAllData(); } 
    else showToast(`Error: ${error.message}`, 'error'); setIsProcessing(false); 
  };
  const handleToggleMachineStatus = async (machineId: string, currentStatus: boolean) => { const newStatus = currentStatus === false ? true : false; const { error } = await supabase.from('Machine').update({ Active: newStatus }).eq('MachineID', machineId); if (!error) { showToast(`Machine status changed successfully`, 'success'); fetchAllData(); } };
  
  const handleBasicInfoSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsProcessing(true); const formData = new FormData(e.currentTarget); const value = formData.get('value') as string; let error; const activeDept = localStorage.getItem('activeDepartment');
    if (basicInfoModal.type === 'line') { const res = await supabase.from('LineMaster').insert({ LineName: value, DepartmentID: activeDept }); error = res.error; } 
    else { const res = await supabase.from('LocationMaster').insert({ LocationName: value, DepartmentID: activeDept }); error = res.error; }
    if (error) showToast(`Error: ${error.message}`, 'error'); else { showToast(`Information added successfully!`, 'success'); setBasicInfoModal({ isOpen: false, type: 'line' }); fetchAllData(); }
    setIsProcessing(false);
  };

  const handleDeleteBasicInfo = async (type: 'line'|'location', id: any) => {
    if(!confirm('Are you sure you want to delete this data?')) return;
    const table = type === 'line' ? 'LineMaster' : 'LocationMaster';
    const { error } = await supabase.from(table).delete().eq(type === 'line' ? 'LineName' : 'LocationName', id);
    if (!error) { showToast('Deleted successfully!', 'success'); fetchAllData(); } else showToast(`Error: ${error.message}`, 'error');
  };
  
  const requestGroups = Object.values( pendingRequests.reduce((acc: any, req: any) => { const parts = req.RequestID.split('-'); const baseId = parts.length >= 3 ? `${parts[0]}-${parts[1]}` : req.RequestID; if (!acc[baseId]) { acc[baseId] = { baseId, pickerName: req.PickerName, createdAt: req.CreatedAt, items: [] }; } acc[baseId].items.push(req); return acc; }, {}) ).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handleApproveGroup = async (group: any) => {
    setConfirmDialog({
      isOpen: true, title: 'Confirm Disbursement', message: `You are about to disburse ${group.items.length} items\nto ${group.pickerName}\n\nConfirm to deduct stock and save history.`,
      onConfirm: async () => {
        setConfirmDialog(null); setIsProcessing(true); const activeDept = localStorage.getItem('activeDepartment');
        try {
          for (let i = 0; i < group.items.length; i++) {
            const req = group.items[i]; 
            const reqIdText = req.RequestID; 
            const numericRecordId = `${Date.now()}${i}`; 
            const pId = req.PartID; 
            const mId = req.MachineID; 
            const qty = req.Qty; 
            const reason = req.Reason; // 🌟 ใช้ Reason เป็นตัวแยกประเภทของ

            // 1️⃣ ถ้าเป็นของสิ้นเปลือง
            if (reason === 'Consumable' || pId.startsWith('CSM-')) {
              const cons = consumables.find(c => c.ItemID === pId);
              if (cons) { 
                const newBal = Math.max(0, (parseInt(cons.Balance)||0) - qty); 
                const { error: updErr } = await supabase.from('Consumable').update({ Balance: newBal }).eq('ItemID', pId); 
                if (updErr) throw updErr;
              }
            } 
            // 2️⃣ ถ้าเป็นการยืมเครื่องมือ (Fixtures) 🌟 ลอจิกใหม่!
            else if (reason === 'Borrow') {
              const fix = fixtures.find(f => f.FixtureNo === pId);
              if (fix) {
                const newBorrowed = (parseInt(fix.BorrowedQty)||0) + qty;
                const { error: updErr } = await supabase.from('Fixtures').update({ BorrowedQty: newBorrowed }).eq('FixtureNo', pId);
                if (updErr) throw updErr;
              }
            } 
            // 3️⃣ ถ้าเป็นอะไหล่ (Spare Parts) 
            else {
              const pos = req.Position || '-'; 
              
              // บันทึกลงประวัติ ChangeHistory (คิด MTBF)
              const { error: chErr } = await supabase.from('ChangeHistory').insert({ RecordID: numericRecordId, MachineID: mId, PartID: pId, ChangeDate: new Date().toISOString().split('T')[0], ReasonType: reason, "Required Qty": qty, DepartmentID: activeDept, Position: pos }); 
              if (chErr) throw chErr;
              
              // บันทึกลง Log เบิกของ
              const { error: plErr } = await supabase.from('PickLog').insert({ RecordID: numericRecordId, Timestamp: new Date().toISOString(), Location: 'A01', PartID: pId, MachineID: mId, Qty: qty, PickerName: req.PickerName, LineUserID: session?.user?.email || 'AdminWeb', DepartmentID: activeDept }); 
              if (plErr) throw plErr;
              
              // ตัดสต๊อกอะไหล่
              const { data: stk } = await supabase.from('Stock').select('*').eq('PartID', pId).gt('Balance', 0); 
              if (stk && stk.length > 0) { 
                const tStk = stk[0]; 
                await supabase.from('Stock').update({ Balance: Math.max(0, (parseInt(tStk.Balance)||0) - qty), LastUpdated: new Date().toISOString() }).eq('Location', tStk.Location).eq('PartID', pId); 
              }
            }

            // อัปเดตสถานะใบเบิกเป็น Approved
            const { error: reqErr } = await supabase.from('PartRequests').update({ Status: 'Approved' }).eq('RequestID', reqIdText); 
            if (reqErr) throw reqErr;
          }
          showToast('อนุมัติจ่ายของและตัดสต๊อกสำเร็จ!', 'success'); fetchAllData(); 
        } catch (error: any) { 
          showToast(`Error: ${error.message}`, 'error'); 
        } finally { 
          setIsProcessing(false); 
        }
      }
    });
  };
  
  const handleLogRecord = async (e: React.FormEvent<HTMLFormElement>) => { 
    e.preventDefault(); const formData = new FormData(e.currentTarget); const mIdStr = formData.get('machineId') as string; const mId = mIdStr.split(' - ')[0]; const pIdStr = formData.get('partId') as string; const pId = pIdStr.split(' - ')[0]; const qty = parseInt(formData.get('qty') as string); const numericRecordId = Date.now().toString(); const activeDept = localStorage.getItem('activeDepartment');
    if (!machines.find(m => m.MachineID === mId)) return showToast('Machine ID not found', 'warning'); if (!parts.find(p => p.PartID === pId)) return showToast('Part ID not found', 'warning');
    const { error: chErr } = await supabase.from('ChangeHistory').insert({ RecordID: numericRecordId, MachineID: mId, PartID: pId, ChangeDate: formData.get('date'), ReasonType: formData.get('reason'), "Required Qty": qty, DepartmentID: activeDept, Position: '-' }); if (chErr) { showToast(`Error: ${chErr.message}`, 'error'); return; } 
    const { error: plErr } = await supabase.from('PickLog').insert({ RecordID: numericRecordId, Timestamp: new Date().toISOString(), Location: 'A01', PartID: pId, MachineID: mId, Qty: qty, PickerName: formData.get('picker'), LineUserID: session?.user?.email || 'AdminWeb', DepartmentID: activeDept }); if (plErr) { showToast(`Error: ${plErr.message}`, 'error'); return; } 
    const { data: stk } = await supabase.from('Stock').select('*').eq('PartID', pId).gt('Balance', 0); if (stk && stk.length > 0) { const tStk = stk[0]; await supabase.from('Stock').update({ Balance: parseInt(tStk.Balance) >= qty ? parseInt(tStk.Balance) - qty : 0, LastUpdated: new Date().toISOString() }).eq('Location', tStk.Location).eq('PartID', pId); } 
    showToast('Manual record saved successfully!', 'success'); fetchAllData(); (e.target as HTMLFormElement).reset(); 
  };

  const handleExportCSV = () => { if (stockData.length === 0) { showToast('No data available', 'warning'); return; } const headers = ['Location', 'Part ID', 'Part Name', 'Physical (On-Hand)', 'Reserved', 'Available Balance', 'Last Updated']; const csvRows = stockData.map(row => { const alloc = stockAllocations[row.PartID] || { physical: row.Balance, reserved: 0, available: row.Balance, machines: [] }; const pDetails = parts.find(p => p.PartID === row.PartID) || {}; return [ row.Location || '-', row.PartID || '-', pDetails.PartName || row.PartName || '-', alloc.physical, alloc.reserved, alloc.available, row.LastUpdated ? new Date(row.LastUpdated).toLocaleString('en-US') : '-' ]; }); const csvContent = [headers.join(','), ...csvRows.map(e => e.join(','))].join('\n'); const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Stock_Report_${new Date().toISOString().split('T')[0]}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); showToast('Excel downloaded successfully!', 'success'); };

  const filteredScheduleData = scheduleData.filter(row => { return (!filterLine || row.line === filterLine) && (!filterMachine || row.machineId === filterMachine); });
  const filteredStockData = stockData.filter(row => { const q = searchQuery.toLowerCase(); const p = parts.find(p => p.PartID === row.PartID); return ((p?.PartName && p.PartName.toLowerCase().includes(q)) || (p?.PartModel && p.PartModel.toLowerCase().includes(q)) || (p?.PartNumber && p.PartNumber.toLowerCase().includes(q)) || (row.Location && row.Location.toLowerCase().includes(q))); });
  
  // 🌟 อัปเกรดระบบจัดเรียง และค้นหาด้วย P/N
  const filteredConsumables = consumables.filter(c => !searchQuery || c.ItemName?.toLowerCase().includes(searchQuery.toLowerCase()) || c.PartNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || c.Location?.toLowerCase().includes(searchQuery.toLowerCase()) || c.ItemModel?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const getPriority = (item: any) => {
        const safety = item.SafetyStock || 0; const min = item.MinQty || 0; const rop = min + safety;
        if (item.Balance <= safety) return 3;
        if (item.Balance <= rop) return 2;
        return 1;
      };
      return getPriority(b) - getPriority(a);
    });

  const filteredFixtures = fixtures.filter(f => !searchQuery || f.FixtureNo?.toLowerCase().includes(searchQuery.toLowerCase()) || f.ModelName?.toLowerCase().includes(searchQuery.toLowerCase()));

  const activeMachinesCount = machines.filter(m => m.Active !== false).length;
  const inactiveMachinesCount = machines.filter(m => m.Active === false).length;
  const uniqueLinesCount = new Set(machines.map(m => m.LineName).filter(Boolean)).size;

  const renderStatusBadge = (report: DashboardReport) => {
    let badgeClass = ''; let icon = ''; let actionBtn = null;
    switch (report.status) {
      case 'NORMAL': badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'; icon = 'bi-check-circle-fill'; break; 
      case 'IN STOCK': badgeClass = 'bg-blue-50 text-blue-700 border border-blue-200/50'; icon = 'bi-box-seam-fill'; break; 
      case 'MONITORING': badgeClass = 'bg-slate-100 text-slate-600 border border-slate-200'; icon = 'bi-eye-fill'; break;
      case 'ORDER NOW': badgeClass = 'bg-amber-50 text-amber-700 border border-amber-300'; icon = 'bi-exclamation-circle-fill'; actionBtn = ( <div className="flex gap-2 mt-2"> <button onClick={() => handleMarkAsOrdered(report.partId, 'part')} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 active:scale-95 transition-all shadow-sm w-max"><i className="bi bi-cart-check"></i> Mark as Ordered</button> <button onClick={() => handleDismissAlert(report.machineId, report.partId, report.partName)} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 active:scale-95 transition-all shadow-sm w-max"><i className="bi bi-eye-slash"></i> Monitor Only</button> </div> ); break;
      case 'ORDERED': badgeClass = 'bg-purple-50 text-purple-700 border border-purple-300 shadow-sm'; icon = 'bi-truck'; actionBtn = ( <div className="flex gap-2 mt-2"> <span className="text-[10px] font-bold text-purple-600 bg-white px-2 py-1 rounded border border-purple-100">Awaiting Delivery...</span></div> ); break;
      case 'OVERDUE': badgeClass = 'bg-red-50 text-red-700 border border-red-300'; icon = 'bi-x-circle-fill'; actionBtn = ( <div className="flex gap-2 mt-2"> <button onClick={() => handleMarkAsOrdered(report.partId, 'part')} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 active:scale-95 transition-all shadow-sm w-max"><i className="bi bi-cart-check"></i> Mark as Ordered (Urgent)</button> <button onClick={() => handleDismissAlert(report.machineId, report.partId, report.partName)} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 active:scale-95 transition-all shadow-sm w-max"><i className="bi bi-eye-slash"></i> Monitor Only</button> </div> ); break;
      default: badgeClass = 'bg-slate-100 text-slate-800'; icon = 'bi-info-circle-fill';
    }
    return (<div className="flex flex-col"><span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold w-max shadow-sm ${badgeClass}`}><i className={`bi ${icon} text-sm`}></i> {report.status}</span>{actionBtn}</div>);
  };

  const activeActionPartDetails = parts.find(p => p.PartID === selectedActionPart?.id) || {};

  if (!session) { 
    return ( 
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-[#e0e7ff] to-blue-50 relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-400/30 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-pulse"></div><div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-400/20 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-pulse"></div>
        <form onSubmit={handleLogin} className="bg-white/80 backdrop-blur-2xl p-10 rounded-[2rem] shadow-2xl border border-white/50 w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-500 ease-out"> 
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-blue-500/30 transform hover:rotate-12 transition-transform duration-300"><i className="bi bi-tools"></i></div> 
          <h1 className="text-3xl font-extrabold mb-2 text-center text-slate-800 tracking-tight">Maint. Intel</h1> 
          <p className="text-center text-slate-500 text-sm mb-8 font-medium">Sign in to manage inventory and maintenance</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1 uppercase tracking-wider">Department</label>
              <div className="relative">
                <i className="bi bi-building absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
                <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} required className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm font-bold text-slate-700 shadow-sm hover:border-blue-300 appearance-none">
                  <option value="" disabled>-- Select your department --</option>
                  {departments.map(d => <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>)}
                </select>
                <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm"></i>
              </div>
            </div>
            <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1 uppercase tracking-wider">Email Address</label><div className="relative"><i className="bi bi-envelope-fill absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 shadow-sm hover:border-blue-300" placeholder="admin@example.com" /> </div></div>
            <div><label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1 uppercase tracking-wider">Password</label><div className="relative"><i className="bi bi-lock-fill absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 shadow-sm hover:border-blue-300" placeholder="••••••••" /> </div></div>
          </div>
          <button type="submit" disabled={isLoggingIn} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 shadow-lg shadow-blue-500/30 mt-8 flex justify-center items-center gap-2 text-[15px]">{isLoggingIn ? <><i className="bi bi-arrow-repeat animate-spin text-xl"></i> Authenticating...</> : 'Sign In'}</button> 
        </form> 
      </div> 
    ); 
  }

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-700 overflow-hidden relative selection:bg-blue-100 selection:text-blue-900">
      {zoomedImage && ( <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out" onClick={() => setZoomedImage(null)}> <div className="relative w-full max-w-4xl h-[80vh] flex flex-col items-center justify-center"> <button className="absolute -top-12 right-0 text-white hover:text-red-400 text-3xl transition-colors active:scale-90" onClick={() => setZoomedImage(null)}><i className="bi bi-x-lg"></i></button> <img src={zoomedImage} alt="Zoomed Part" className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-xl animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()} /> </div> </div> )}
      {toast && ( <div className="fixed top-8 right-8 z-[9999] animate-in slide-in-from-top-5 fade-in duration-300 ease-out"> <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border bg-white/95 backdrop-blur-md min-w-[280px] ${toast.type === 'success' ? 'border-emerald-500/50 shadow-emerald-500/10' : toast.type === 'error' ? 'border-red-500/50 shadow-red-500/10' : toast.type === 'warning' ? 'border-amber-500/50 shadow-amber-500/10' : 'border-blue-500/50 shadow-blue-500/10'}`}> <span className="font-bold text-slate-700 text-sm flex-1">{toast.message}</span> <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-1.5 rounded-full"><i className="bi bi-x-lg text-xs"></i></button> </div> </div> )}
      {confirmDialog && confirmDialog.isOpen && ( <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"> <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 ease-out"> <div className="p-8 pb-6 text-center"> <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner border ${confirmDialog.isDanger ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100/50'}`}><i className={`bi ${confirmDialog.isDanger ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'}`}></i></div> <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmDialog.title}</h3> <p className="text-slate-500 text-sm whitespace-pre-line leading-relaxed">{confirmDialog.message}</p> </div> <div className="flex p-4 gap-3 border-t border-slate-100 bg-slate-50/50"> <button onClick={() => setConfirmDialog(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all shadow-sm">Cancel</button> <button onClick={confirmDialog.onConfirm} className={`flex-1 py-3 rounded-xl font-bold text-white active:scale-95 transition-all shadow-sm ${confirmDialog.isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}>Confirm</button> </div> </div> </div> )}
      
      {/* Modals Data Processing */}
      {basicInfoModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 border-t-blue-500 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><i className="bi bi-plus-circle-fill text-blue-500 bg-blue-50 p-2 rounded-lg"></i> Add {basicInfoModal.type === 'line' ? 'Production Line' : 'Cabinet Location'}</h3>
              <button onClick={() => setBasicInfoModal({ isOpen: false, type: 'line' })} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button>
            </div>
            <form className="p-8 space-y-5 bg-slate-50/30" onSubmit={handleBasicInfoSubmit}>
              <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">{basicInfoModal.type === 'line' ? 'Line' : 'Location'} Name</label><input type="text" name="value" required placeholder={`e.g. ${basicInfoModal.type === 'line' ? 'EC01' : 'A01'}`} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-slate-800 text-sm shadow-sm" /></div>
              <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-4 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 text-[15px]">{isProcessing ? <><i className="bi bi-arrow-repeat animate-spin mr-2"></i>Saving...</> : <><i className="bi bi-check-lg mr-2"></i>Save Data</>}</button>
            </form>
          </div>
        </div>
      )}

      {isNewConsumableModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 border-t-pink-500 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><i className="bi bi-plus-circle-fill text-pink-500 bg-pink-50 p-2 rounded-lg"></i> Add Consumable Item</h3>
              <button onClick={() => setNewConsumableModalOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button>
            </div>
            <form className="flex flex-col md:flex-row flex-1 overflow-y-auto bg-slate-50/30" onSubmit={handleNewConsumableSubmit}>
              <div className="w-full md:w-1/2 p-8 border-r border-slate-100 flex flex-col justify-center">
                <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider text-center">Upload Image</label>
                <div className="relative w-full h-64 bg-slate-100 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center overflow-hidden group transition-colors hover:border-pink-400 shadow-inner">
                  {previewImage ? ( <img src={previewImage} alt="Preview" className="w-full h-full object-contain drop-shadow-md mix-blend-multiply" /> ) : ( <div className="text-slate-400 flex flex-col items-center opacity-70 group-hover:opacity-100 transition-opacity"> <i className="bi bi-image text-5xl mb-3"></i> <span className="font-extrabold text-sm tracking-wide">NO IMAGE</span> </div> )}
                  <label className="absolute bottom-4 left-4 bg-pink-600/90 backdrop-blur-md text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-pink-700 cursor-pointer flex items-center gap-2 font-bold text-sm active:scale-95 transition-all"> <i className="bi bi-cloud-arrow-up-fill text-lg"></i> Upload <input type="file" name="imageFile" accept="image/*" className="hidden" onChange={handleImageChange} /> </label>
                </div>
              </div>
              <div className="w-full md:w-1/2 p-8 space-y-5 flex flex-col justify-center bg-white">
                <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase text-blue-600">Part Number (P/N)</label><input type="text" name="partNumber" placeholder="e.g. PN-12345" className="w-full p-4 bg-blue-50/50 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 transition-all focus:bg-white font-bold text-sm text-slate-700" /></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Item Name *</label><input type="text" name="name" required placeholder="e.g. Rubber Gloves, N95 Mask" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 transition-all focus:bg-white font-bold text-sm text-slate-700" /></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Model</label><input type="text" name="model" placeholder="e.g. 3M" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 transition-all focus:bg-white font-bold text-sm text-slate-700" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Location</label><div className="relative"><select name="location" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 transition-all focus:bg-white font-bold text-sm text-slate-700 appearance-none uppercase"><option value="">-- Not specified --</option>{locationsMaster.map(loc => <option key={loc.LocationName} value={loc.LocationName}>{loc.LocationName}</option>)}</select><i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i></div></div>
                  <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Initial Balance</label><input type="number" name="balance" min="0" defaultValue={0} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 transition-all focus:bg-white font-bold text-sm text-slate-700" /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase text-red-500">Min (ROP)</label><input type="number" name="min" min="0" defaultValue={10} required className="w-full p-4 bg-slate-50 border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 transition-all focus:bg-white font-bold text-sm text-red-700 text-center px-2" /></div>
                  <div><label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase text-orange-500">Safety</label><input type="number" name="safety" min="0" defaultValue={5} required className="w-full p-4 bg-slate-50 border border-orange-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all focus:bg-white font-bold text-sm text-orange-700 text-center px-2" /></div>
                  <div><label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase text-emerald-500">Max</label><input type="number" name="max" min="1" defaultValue={100} required className="w-full p-4 bg-slate-50 border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all focus:bg-white font-bold text-sm text-emerald-700 text-center px-2" /></div>
                </div>
                <button type="submit" disabled={isProcessing} className="w-full bg-pink-600 text-white font-bold py-4 rounded-xl mt-2 hover:bg-pink-700 active:scale-95 transition-all shadow-lg shadow-pink-600/20 disabled:opacity-50 text-[15px]">
                  {isProcessing ? <><i className="bi bi-arrow-repeat animate-spin mr-2"></i>Saving...</> : <><i className="bi bi-check-lg mr-2"></i>Create Item</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditConsumableOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 border-t-indigo-500 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><i className="bi bi-pencil-square text-indigo-500 bg-indigo-50 p-2 rounded-lg"></i> Edit Item Info</h3>
              <button onClick={() => setEditConsumableOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button>
            </div>
            <form className="flex flex-col md:flex-row flex-1 overflow-y-auto bg-slate-50/30" onSubmit={handleEditConsumableSubmit}>
              <div className="w-full md:w-1/2 p-8 border-r border-slate-100 flex flex-col justify-center">
                <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider text-center">Part Image</label>
                <div className="relative w-full h-64 bg-slate-100 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center overflow-hidden group transition-colors hover:border-indigo-400 shadow-inner">
                  {previewImage ? ( <img src={previewImage} alt="Preview" className="w-full h-full object-contain drop-shadow-md mix-blend-multiply" /> ) : ( <div className="text-slate-400 flex flex-col items-center opacity-70 group-hover:opacity-100 transition-opacity"> <i className="bi bi-image text-5xl mb-3"></i> <span className="font-extrabold text-sm tracking-wide">NO IMAGE</span> </div> )}
                  <label className="absolute bottom-4 left-4 bg-indigo-600/90 backdrop-blur-md text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-indigo-700 cursor-pointer flex items-center gap-2 font-bold text-sm active:scale-95 transition-all"> <i className="bi bi-cloud-arrow-up-fill text-lg"></i> Change <input type="file" name="imageFile" accept="image/*" className="hidden" onChange={handleImageChange} /> </label>
                </div>
              </div>
              <div className="w-full md:w-1/2 p-8 space-y-5 flex flex-col justify-center bg-white">
                <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase text-blue-600">Part Number (P/N)</label><input type="text" name="partNumber" defaultValue={editingConsumableData?.PartNumber} placeholder="e.g. PN-12345" className="w-full p-4 bg-blue-50/50 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 transition-all focus:bg-white font-bold text-sm text-slate-700" /></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Item Name *</label><input type="text" name="name" required defaultValue={editingConsumableData?.ItemName} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:bg-white font-bold text-sm text-slate-700" /></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Model</label><input type="text" name="model" defaultValue={editingConsumableData?.ItemModel} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:bg-white font-bold text-sm text-slate-700" /></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Location</label><div className="relative"><select name="location" defaultValue={editingConsumableData?.Location} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all focus:bg-white font-bold text-sm text-slate-700 appearance-none uppercase"><option value="">-- Not specified --</option>{locationsMaster.map(loc => <option key={loc.LocationName} value={loc.LocationName}>{loc.LocationName}</option>)}</select><i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i></div></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase text-red-500">Min (ROP)</label><input type="number" name="min" required defaultValue={editingConsumableData?.MinQty} className="w-full p-4 bg-slate-50 border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 transition-all focus:bg-white font-bold text-sm text-red-700 text-center px-2" /></div>
                  <div><label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase text-orange-500">Safety</label><input type="number" name="safety" required defaultValue={editingConsumableData?.SafetyStock} className="w-full p-4 bg-slate-50 border border-orange-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all focus:bg-white font-bold text-sm text-orange-700 text-center px-2" /></div>
                  <div><label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase text-emerald-500">Max</label><input type="number" name="max" required defaultValue={editingConsumableData?.MaxQty} className="w-full p-4 bg-slate-50 border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all focus:bg-white font-bold text-sm text-emerald-700 text-center px-2" /></div>
                </div>
                <button type="submit" disabled={isProcessing} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl mt-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 text-[15px]">{isProcessing ? <><i className="bi bi-arrow-repeat animate-spin mr-2"></i>Saving...</> : <><i className="bi bi-save mr-2"></i>Save Changes</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(isReceiveConsumableOpen || isReduceConsumableOpen) && selectedConsumable && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 ${isReceiveConsumableOpen ? 'border-t-emerald-500' : 'border-t-indigo-500'}`}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><i className={`bi ${isReceiveConsumableOpen ? 'bi-box-arrow-in-down-right text-emerald-500 bg-emerald-50' : 'bi-pencil-square text-indigo-500 bg-indigo-50'} p-2 rounded-lg`}></i>{isReceiveConsumableOpen ? 'Receive Stock' : 'Adjust Stock'}</h3>
              <button onClick={() => { setReceiveConsumableOpen(false); setReduceConsumableOpen(false); }} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button>
            </div>
            <form className="p-8 space-y-6 bg-slate-50/30" onSubmit={(e) => handleConsumableAction(e, isReceiveConsumableOpen ? 'receive' : 'adjust')}>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Target Item</label>
                <div className="flex items-center gap-4 w-full p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <div className="w-14 h-14 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">{selectedConsumable.ImageURL ? <img src={selectedConsumable.ImageURL} className="w-full h-full object-contain mix-blend-multiply" /> : <i className="bi bi-image text-slate-300 text-xl"></i>}</div>
                  <div><div className="font-bold text-slate-800 text-[14px] leading-tight">{selectedConsumable.ItemName}</div><div className="text-[10px] text-slate-500 mt-1 uppercase font-bold"><span className="mr-1">Current in location:</span><span className="text-blue-600">{selectedConsumable.Balance} Pcs</span></div></div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">{isReceiveConsumableOpen ? 'Receive Quantity' : 'Correct Balance'}</label>
                <div className="flex items-center shadow-sm rounded-xl">
                  <input type="number" name="qty" min="0" required className={`flex-1 p-4 bg-white border border-slate-200 rounded-l-xl outline-none focus:ring-2 transition-shadow z-10 text-lg font-bold ${isReceiveConsumableOpen ? 'focus:ring-emerald-500 hover:border-emerald-300 text-emerald-700' : 'focus:ring-indigo-500 hover:border-indigo-300 text-indigo-700'}`} />
                  <span className="bg-slate-100 border border-slate-200 border-l-0 p-4 rounded-r-xl font-bold text-slate-500">Pcs</span>
                </div>
                {!isReceiveConsumableOpen && <p className="text-xs text-slate-500 mt-2">Enter the exact new balance to overwrite existing data</p>}
              </div>
              <button type="submit" className={`w-full text-white font-bold py-4 rounded-xl mt-4 active:scale-95 transition-all shadow-lg ${isReceiveConsumableOpen ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'}`}><i className={`bi ${isReceiveConsumableOpen ? 'bi-plus-circle' : 'bi-check-circle'} mr-2`}></i>{isReceiveConsumableOpen ? 'Add Stock' : 'Update Stock'}</button>
            </form>
          </div>
        </div>
      )}
      
      {isNewPartModalOpen && ( <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"> <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 border-t-blue-500 flex flex-col max-h-[90vh]"> <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0"> <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><i className="bi bi-plus-circle-fill text-blue-500 bg-blue-50 p-2 rounded-lg"></i> Register New Part</h3> <button onClick={() => setNewPartModalOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button> </div> <form className="flex flex-col md:flex-row flex-1 overflow-y-auto bg-slate-50/30" onSubmit={handleNewPartSubmit}> <div className="w-full md:w-1/2 p-8 border-r border-slate-100 flex flex-col justify-center"> <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider text-center">Part Image</label> <div className="relative w-full h-64 bg-slate-100 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center overflow-hidden group transition-colors hover:border-blue-400 shadow-inner"> {previewImage ? ( <img src={previewImage} alt="Preview" className="w-full h-full object-contain drop-shadow-md mix-blend-multiply" /> ) : ( <div className="text-slate-400 flex flex-col items-center opacity-70 group-hover:opacity-100 transition-opacity"> <i className="bi bi-image text-5xl mb-3"></i> <span className="font-extrabold text-sm tracking-wide">NO IMAGE</span> </div> )} <label className="absolute bottom-4 left-4 bg-blue-600/90 backdrop-blur-md text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-blue-700 cursor-pointer flex items-center gap-2 font-bold text-sm active:scale-95 transition-all"> <i className="bi bi-cloud-arrow-up-fill text-lg"></i> Upload <input type="file" name="imageFile" accept="image/*" className="hidden" onChange={handleImageChange} /> </label> </div> </div> <div className="w-full md:w-1/2 p-8 space-y-5 flex flex-col justify-center bg-white"><div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase text-blue-600">Part Number (P/N)</label><input type="text" name="partNumber" placeholder="e.g. PN-12345" className="w-full p-4 bg-blue-50/50 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-slate-700 shadow-sm focus:bg-white" /></div> <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Part Name *</label><input type="text" name="name" required placeholder="Part Name" className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-slate-700 shadow-sm" /></div> <div className="grid grid-cols-2 gap-4"> <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Model</label><input type="text" name="model" placeholder="e.g. V2.0" className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-slate-700 shadow-sm" /></div> <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Location</label><div className="relative"><select name="location" className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-slate-700 appearance-none uppercase shadow-sm"><option value="">-- Not specified --</option>{locationsMaster.map(loc => <option key={loc.LocationName} value={loc.LocationName}>{loc.LocationName}</option>)}</select><i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i></div></div> </div> <div> <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Safety Buffer (Days) *</label> <div className="flex items-center shadow-sm rounded-xl"> <input type="number" name="buffer" required defaultValue={7} className="flex-1 p-4 bg-white border border-slate-200 rounded-l-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-slate-700 z-10" /> <span className="bg-slate-100 border border-slate-200 border-l-0 p-4 rounded-r-xl font-bold text-slate-500">Days</span> </div> </div> <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl mt-2 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 text-[15px]"> {isProcessing ? <><i className="bi bi-arrow-repeat animate-spin mr-2"></i>Uploading...</> : <><i className="bi bi-check-lg mr-2"></i>Create Part</>} </button> </div> </form> </div> </div> )}
      {isEditPartModalOpen && ( <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"> <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 border-t-indigo-500 flex flex-col max-h-[90vh]"> <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0"> <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><i className="bi bi-pencil-square text-indigo-500 bg-indigo-50 p-2 rounded-lg"></i> Edit Part Details</h3> <button onClick={() => setEditPartModalOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button> </div> <form className="flex flex-col md:flex-row flex-1 overflow-y-auto bg-slate-50/30" onSubmit={handleEditPartSubmit}> <div className="w-full md:w-1/2 p-8 border-r border-slate-100 flex flex-col justify-center"> <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider text-center">Part Image</label> <div className="relative w-full h-64 bg-slate-100 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center overflow-hidden group transition-colors hover:border-indigo-400 shadow-inner"> {previewImage ? ( <img src={previewImage} alt="Preview" className="w-full h-full object-contain drop-shadow-md mix-blend-multiply" /> ) : ( <div className="text-slate-400 flex flex-col items-center opacity-70 group-hover:opacity-100 transition-opacity"> <i className="bi bi-image text-5xl mb-3"></i> <span className="font-extrabold text-sm tracking-wide">NO IMAGE</span> </div> )} <label className="absolute bottom-4 left-4 bg-indigo-600/90 backdrop-blur-md text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-indigo-700 cursor-pointer flex items-center gap-2 font-bold text-sm active:scale-95 transition-all"> <i className="bi bi-cloud-arrow-up-fill text-lg"></i> Change <input type="file" name="imageFile" accept="image/*" className="hidden" onChange={handleImageChange} /> </label> </div> </div> <div className="w-full md:w-1/2 p-8 space-y-5 flex flex-col justify-center bg-white"> <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase"><div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase text-blue-600">Part Number (P/N)</label><input type="text" name="partNumber" defaultValue={editingPartData?.PartNumber} placeholder="e.g. PN-12345" className="w-full p-4 bg-blue-50/50 border border-blue-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-slate-700 shadow-sm focus:bg-white" /></div>Part Name *</label><input type="text" name="name" required defaultValue={editingPartData?.PartName} className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm text-slate-700 shadow-sm" /></div> <div className="grid grid-cols-2 gap-4"> <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Model</label><input type="text" name="model" defaultValue={editingPartData?.PartModel} placeholder="e.g. V2.0" className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm text-slate-700 shadow-sm" /></div> <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Location</label><div className="relative"><select name="location" defaultValue={editingPartData?.Location} className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm text-slate-700 appearance-none uppercase shadow-sm"><option value="">-- Not specified --</option>{locationsMaster.map(loc => <option key={loc.LocationName} value={loc.LocationName}>{loc.LocationName}</option>)}</select><i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i></div></div> </div> <div> <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Safety Buffer (Days) *</label> <div className="flex items-center shadow-sm rounded-xl"> <input type="number" name="buffer" required defaultValue={editingPartData?.SafetyBufferDays || 7} className="flex-1 p-4 bg-white border border-slate-200 rounded-l-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-sm text-slate-700 z-10" /> <span className="bg-slate-100 border border-slate-200 border-l-0 p-3.5 rounded-r-xl font-bold text-slate-500">Days</span> </div> </div> <button type="submit" disabled={isProcessing} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl mt-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 text-[15px]"> {isProcessing ? <><i className="bi bi-arrow-repeat animate-spin mr-2"></i>Saving...</> : <><i className="bi bi-save mr-2"></i>Save Changes</>} </button> </div> </form> </div> </div> )}
      {isReceiveStockModalOpen && ( <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"> <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 border-t-emerald-500"> <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white"> <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><i className="bi bi-box-arrow-in-down-right text-emerald-500 bg-emerald-50 p-2 rounded-lg"></i> Receive Stock</h3> <button onClick={() => setReceiveStockModalOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button> </div> <form className="p-8 space-y-6 bg-slate-50/30" onSubmit={handleReceiveStock}> <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Target Part</label> <div className="flex items-center gap-4 w-full p-4 bg-white border border-slate-200 rounded-xl shadow-sm"> <div className="w-14 h-14 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0"> {activeActionPartDetails.ImageURL ? <img src={activeActionPartDetails.ImageURL} className="w-full h-full object-contain mix-blend-multiply" /> : <i className="bi bi-image text-slate-300 text-xl"></i>} </div> <div> <div className="font-bold text-slate-800 text-[14px]">{activeActionPartDetails.PartName || selectedActionPart?.name}</div> <div className="text-[12px] text-slate-500 mt-0.5"><span className="uppercase tracking-wider mr-1 text-[10px]">Model:</span>{activeActionPartDetails.PartModel || '-'}</div> </div> </div> </div> <div> <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Receive Qty</label> <div className="flex items-center shadow-sm rounded-xl"> <input type="number" name="qty" min="1" required className="flex-1 p-4 bg-white border border-slate-200 rounded-l-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow hover:border-emerald-300 z-10 text-lg font-bold" /> <span className="bg-slate-100 border border-slate-200 border-l-0 p-4 rounded-r-xl font-bold text-slate-500">Pcs</span> </div> </div> <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl mt-4 hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-600/20"><i className="bi bi-plus-circle mr-2"></i>Update Stock</button> </form> </div> </div> )}
      {isReduceStockModalOpen && ( <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"> <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 border-t-indigo-500"> <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white"> <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><i className="bi bi-pencil-square text-indigo-500 bg-indigo-50 p-2 rounded-lg"></i> Adjust Stock</h3> <button onClick={() => setReduceStockModalOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button> </div> <form className="p-8 space-y-6 bg-slate-50/30" onSubmit={handleReduceStock}> <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Target Part</label> <div className="flex items-center gap-4 w-full p-4 bg-white border border-slate-200 rounded-xl shadow-sm"> <div className="w-14 h-14 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0"> {activeActionPartDetails.ImageURL ? <img src={activeActionPartDetails.ImageURL} className="w-full h-full object-contain mix-blend-multiply" /> : <i className="bi bi-image text-slate-300 text-xl"></i>} </div> <div> <div className="font-bold text-slate-800 text-[14px]">{activeActionPartDetails.PartName || selectedActionPart?.name}</div> <div className="text-[12px] text-slate-500 mt-0.5"><span className="uppercase tracking-wider mr-1 text-[10px]">Model:</span>{activeActionPartDetails.PartModel || '-'}</div> </div> </div> </div> <div> <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Correct Balance</label> <div className="flex items-center shadow-sm rounded-xl"> <input type="number" name="qty" min="0" required className="flex-1 p-4 bg-white border border-slate-200 rounded-l-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow hover:border-indigo-300 z-10 text-lg font-bold text-indigo-600" /> <span className="bg-slate-100 border border-slate-200 border-l-0 p-4 rounded-r-xl font-bold text-slate-500">Pcs</span> </div> <p className="text-xs text-slate-500 mt-2">Enter the exact new balance to overwrite existing data</p> </div> <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl mt-4 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-600/20"><i className="bi bi-check-circle mr-2"></i>Update Stock</button> </form> </div> </div> )}
      {isLeadTimeModalOpen && ( <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"> <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 border-t-amber-500"> <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white"> <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><i className="bi bi-clock-history text-amber-500 bg-amber-50 p-2 rounded-lg"></i> Update Lead Time</h3> <button onClick={() => setLeadTimeModalOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button> </div> <form className="p-8 space-y-6 bg-slate-50/30" onSubmit={handleUpdateLeadTime}> <p className="text-sm text-slate-500 mb-2 leading-relaxed">Update supplier lead time to improve AI prediction accuracy.</p> <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Target Part</label> <div className="flex items-center gap-4 w-full p-4 bg-white border border-slate-200 rounded-xl shadow-sm"> <div className="w-14 h-14 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0"> {activeActionPartDetails.ImageURL ? <img src={activeActionPartDetails.ImageURL} className="w-full h-full object-contain mix-blend-multiply" /> : <i className="bi bi-image text-slate-300 text-xl"></i>} </div> <div> <div className="font-bold text-slate-800 text-[14px]">{activeActionPartDetails.PartName || selectedActionPart?.name}</div> <div className="text-[12px] text-slate-500 mt-0.5"><span className="uppercase tracking-wider mr-1 text-[10px]">Model:</span>{activeActionPartDetails.PartModel || '-'}</div> </div> </div> </div> <div> <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">New Lead Time</label> <div className="flex items-center shadow-sm rounded-xl"> <input type="number" name="days" placeholder="e.g. 30" required className="flex-1 p-4 bg-white border border-slate-200 rounded-l-xl outline-none focus:ring-2 focus:ring-amber-500 transition-shadow hover:border-amber-300 z-10 text-lg font-bold" /> <span className="bg-slate-100 border border-slate-200 border-l-0 p-4 rounded-r-xl font-bold text-slate-500">Days</span> </div> </div> <button type="submit" className="w-full bg-amber-500 text-white font-bold py-4 rounded-xl mt-4 hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-500/20"><i className="bi bi-check-circle mr-2"></i>Save Lead Time</button> </form> </div> </div> )}
      {isNewMachineModalOpen && ( <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"> <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 border-t-blue-500 flex flex-col max-h-[90vh]"> <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0"> <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><i className="bi bi-robot text-blue-500 bg-blue-50 p-2 rounded-lg"></i> Register New Machine</h3> <button onClick={() => setNewMachineModalOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button> </div> <form className="p-8 space-y-5 bg-slate-50/30 overflow-y-auto" onSubmit={handleNewMachineSubmit}> <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Machine ID</label><input type="text" name="id" required placeholder="e.g. M1001" className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 uppercase font-bold text-sm text-slate-800 shadow-sm transition-all" /></div> <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Machine Name</label><input type="text" name="name" required className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 shadow-sm transition-all" /></div> <div> <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Production Line</label> <div className="relative"><select name="line" required className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 appearance-none shadow-sm transition-all"><option value="">-- Select Line --</option>{linesMaster.map(line => <option key={line.LineName} value={line.LineName}>{line.LineName}</option>)}</select><i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i></div> </div> <button type="submit" disabled={isProcessing} className="w-full mt-4 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all text-[15px]"><i className="bi bi-plus-lg mr-2"></i>Create Machine</button> </form> </div> </div> )}
      {isEditMachineModalOpen && editingMachineData && ( 
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200"> 
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 border-t-blue-500 flex flex-col max-h-[90vh]"> 
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0"> 
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><i className="bi bi-pencil-square text-blue-500 bg-blue-50 p-2 rounded-lg"></i> Edit Machine</h3> 
              <button onClick={() => setEditMachineModalOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button> 
            </div> 
            <form className="p-8 space-y-5 bg-slate-50/30 overflow-y-auto" onSubmit={handleEditMachineSubmit}> 
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Machine ID</label>
                <input type="text" disabled defaultValue={editingMachineData.MachineID} className="w-full p-4 bg-slate-100 border border-slate-200 rounded-xl font-bold text-sm text-slate-500 cursor-not-allowed" />
                <p className="text-[10px] text-slate-400 mt-1">Machine ID cannot be changed.</p>
              </div> 
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Machine Name</label>
                <input type="text" name="name" required defaultValue={editingMachineData.MachineName} className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 shadow-sm transition-all" />
              </div> 
              <div> 
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Production Line (Current: {editingMachineData.LineName || '-'})</label> 
                <div className="relative">
                  <select name="line" required defaultValue={editingMachineData.LineName} className="w-full p-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 appearance-none shadow-sm transition-all">
                    <option value="">-- Select Line --</option>
                    {linesMaster.map(line => <option key={line.LineName} value={line.LineName}>{line.LineName}</option>)}
                  </select>
                  <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                </div> 
              </div> 
              <button type="submit" disabled={isProcessing} className="w-full mt-4 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all text-[15px]">
                {isProcessing ? <><i className="bi bi-arrow-repeat animate-spin mr-2"></i>Saving...</> : <><i className="bi bi-save mr-2"></i>Save Changes</>}
              </button> 
            </form> 
          </div> 
        </div> 
      )}
      {openDropdownId && ( <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenDropdownId(null)}></div> )}

      {/* 🌟 Modal: โยกย้ายหมวดหมู่ (Move Category) 🌟 */}
      {moveCategoryModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 ${moveCategoryModal.source === 'part' ? 'border-t-pink-500' : 'border-t-blue-500'} flex flex-col max-h-[90vh]`}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${moveCategoryModal.source === 'part' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                  <i className="bi bi-arrow-left-right"></i>
                </div>
                {moveCategoryModal.source === 'part' ? 'ย้ายไปหมวดสิ้นเปลือง' : 'ย้ายไปหมวดอะไหล่'}
              </h3>
              <button onClick={() => setMoveCategoryModal(null)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button>
            </div>
            
            <form className="p-8 space-y-6 bg-slate-50/30 overflow-y-auto" onSubmit={handleMoveCategorySubmit}>
              <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="w-14 h-14 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                  {moveCategoryModal.itemData.ImageURL ? <img src={moveCategoryModal.itemData.ImageURL} className="w-full h-full object-contain mix-blend-multiply" /> : <i className="bi bi-image text-slate-300 text-xl"></i>}
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-[14px] leading-tight line-clamp-2">{moveCategoryModal.itemData.PartName || moveCategoryModal.itemData.ItemName}</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-bold">พิกัดเดิม: <span className="text-emerald-600">{moveCategoryModal.location}</span> | ยอดเดิม: <span className="text-blue-600">{moveCategoryModal.stockBalance}</span> Pcs</div>
                </div>
              </div>

              <div className="text-sm text-slate-500 bg-slate-100 p-3 rounded-lg border border-slate-200">
                <i className="bi bi-info-circle-fill mr-1"></i> ประวัติการเบิกและยอดสต๊อกเดิมจะถูกโอนย้ายไปให้อัตโนมัติ กรุณาระบุข้อมูลเพิ่มเติมสำหรับหมวดหมู่ใหม่:
              </div>

              {moveCategoryModal.source === 'part' ? (
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase text-red-500">Min (ROP)</label><input type="number" name="min" required defaultValue={10} className="w-full p-4 bg-white border border-red-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold text-sm text-red-700 text-center px-2" /></div>
                  <div><label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase text-orange-500">Safety</label><input type="number" name="safety" required defaultValue={5} className="w-full p-4 bg-white border border-orange-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold text-sm text-orange-700 text-center px-2" /></div>
                  <div><label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase text-emerald-500">Max</label><input type="number" name="max" required defaultValue={100} className="w-full p-4 bg-white border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm text-emerald-700 text-center px-2" /></div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Safety Buffer (Days) *</label>
                  <div className="flex items-center shadow-sm rounded-xl">
                    <input type="number" name="buffer" required defaultValue={7} className="flex-1 p-4 bg-white border border-slate-200 rounded-l-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm text-slate-700 z-10" />
                    <span className="bg-slate-100 border border-slate-200 border-l-0 p-4 rounded-r-xl font-bold text-slate-500">Days</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">ระยะเวลาเผื่อสั่งซื้อล่วงหน้า สำหรับให้ AI คำนวณความเสี่ยง</p>
                </div>
              )}

              <button type="submit" disabled={isProcessing} className={`w-full text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all text-[15px] flex items-center justify-center gap-2 ${moveCategoryModal.source === 'part' ? 'bg-pink-600 hover:bg-pink-700 shadow-pink-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}>
                {isProcessing ? <><i className="bi bi-arrow-repeat animate-spin"></i> กำลังโอนย้ายข้อมูล...</> : <><i className="bi bi-check2-circle"></i> ยืนยันการย้ายหมวดหมู่</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 Modal: New Fixture (พร้อมอัปโหลดรูป) 🌟 */}
      {isNewFixtureModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 border-t-purple-500 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><i className="bi bi-tools text-purple-500 bg-purple-50 p-2 rounded-lg"></i> Add New Fixture</h3>
              <button onClick={() => setNewFixtureModalOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button>
            </div>
            <form className="flex flex-col md:flex-row flex-1 overflow-y-auto bg-slate-50/30" onSubmit={handleNewFixtureSubmit}>
              <div className="w-full md:w-1/2 p-8 border-r border-slate-100 flex flex-col justify-center">
                <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider text-center">Fixture Image</label>
                <div className="relative w-full h-64 bg-slate-100 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center overflow-hidden group transition-colors hover:border-purple-400 shadow-inner">
                  {previewImage ? ( <img src={previewImage} className="w-full h-full object-contain drop-shadow-md mix-blend-multiply" /> ) : ( <div className="text-slate-400 flex flex-col items-center opacity-70 group-hover:opacity-100 transition-opacity"> <i className="bi bi-image text-5xl mb-3"></i> <span className="font-extrabold text-sm tracking-wide">NO IMAGE</span> </div> )}
                  <label className="absolute bottom-4 left-4 bg-purple-600/90 backdrop-blur-md text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-purple-700 cursor-pointer flex items-center gap-2 font-bold text-sm active:scale-95 transition-all"> <i className="bi bi-cloud-arrow-up-fill text-lg"></i> Upload <input type="file" name="imageFile" accept="image/*" className="hidden" onChange={handleImageChange} /> </label>
                </div>
              </div>
              <div className="w-full md:w-1/2 p-8 space-y-5 flex flex-col justify-center bg-white">
                <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Fixture No. *</label><input type="text" name="fixtureNo" required placeholder="e.g. FIX-001" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-slate-800 text-sm shadow-sm focus:bg-white" /></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Model Name *</label><input type="text" name="modelName" required placeholder="Model name" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-slate-800 text-sm shadow-sm focus:bg-white" /></div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Initial Total Qty</label><input type="number" name="totalQty" min="1" defaultValue={1} required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-slate-800 text-sm shadow-sm focus:bg-white" /></div>
                <button type="submit" disabled={isProcessing} className="w-full bg-purple-600 text-white font-bold py-4 rounded-xl mt-2 hover:bg-purple-700 active:scale-95 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 text-[15px]"><i className="bi bi-check-lg mr-2"></i>Create Fixture</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 Modal: Edit Fixture Info (แก้รูปและชื่อ) 🌟 */}
      {isEditFixtureInfoOpen && selectedFixture && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 border-t-indigo-500 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><i className="bi bi-pencil-fill text-indigo-500 bg-indigo-50 p-2 rounded-lg"></i> Edit Fixture Info</h3>
              <button onClick={() => setEditFixtureInfoOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button>
            </div>
            <form className="flex flex-col md:flex-row flex-1 overflow-y-auto bg-slate-50/30" onSubmit={handleEditFixtureInfoSubmit}>
              <div className="w-full md:w-1/2 p-8 border-r border-slate-100 flex flex-col justify-center">
                <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider text-center">Fixture Image</label>
                <div className="relative w-full h-64 bg-slate-100 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center overflow-hidden group transition-colors hover:border-indigo-400 shadow-inner">
                  {previewImage ? ( <img src={previewImage} className="w-full h-full object-contain drop-shadow-md mix-blend-multiply" /> ) : ( <div className="text-slate-400 flex flex-col items-center opacity-70 group-hover:opacity-100 transition-opacity"> <i className="bi bi-image text-5xl mb-3"></i> <span className="font-extrabold text-sm tracking-wide">NO IMAGE</span> </div> )}
                  <label className="absolute bottom-4 left-4 bg-indigo-600/90 backdrop-blur-md text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-indigo-700 cursor-pointer flex items-center gap-2 font-bold text-sm active:scale-95 transition-all"> <i className="bi bi-cloud-arrow-up-fill text-lg"></i> Change <input type="file" name="imageFile" accept="image/*" className="hidden" onChange={handleImageChange} /> </label>
                </div>
              </div>
              <div className="w-full md:w-1/2 p-8 space-y-5 flex flex-col justify-center bg-white">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Fixture No.</label>
                  <div className="w-full p-4 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-500 text-sm cursor-not-allowed">{selectedFixture.FixtureNo}</div>
                  <p className="text-[10px] text-slate-400 mt-1">Fixture ID cannot be changed.</p>
                </div>
                <div><label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Model Name *</label><input type="text" name="modelName" required defaultValue={selectedFixture.ModelName} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-800 text-sm shadow-sm focus:bg-white" /></div>
                <button type="submit" disabled={isProcessing} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl mt-4 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 text-[15px]"><i className="bi bi-save mr-2"></i>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 Modal: Edit Fixture Stock (ล้ำๆ ด้วย Custom Dropdown) 🌟 */}
      {isEditFixtureStockOpen && selectedFixture && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 ease-out border-t-4 border-t-indigo-500">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><i className="bi bi-box-seam text-indigo-500 bg-indigo-50 p-2 rounded-lg"></i> Update Stock</h3>
              <button onClick={() => setEditFixtureStockOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all active:scale-95"><i className="bi bi-x-lg"></i></button>
            </div>
            <form className="p-8 space-y-6 bg-slate-50/30" onSubmit={handleEditFixtureStock}>
              
              {/* Card แสดงของที่กำลังทำรายการ */}
              <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                  {selectedFixture.ImageURL ? <img src={selectedFixture.ImageURL} className="w-full h-full object-contain mix-blend-multiply p-1" /> : <i className="bi bi-image text-indigo-300 text-lg"></i>}
                </div>
                <div>
                  <div className="font-black text-slate-800 text-[14px] leading-tight">{selectedFixture.FixtureNo}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-bold truncate max-w-[200px]">{selectedFixture.ModelName}</div>
                </div>
              </div>
              
              {/* 🌟 Custom Dropdown ล้ำๆ 🌟 */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">Select Action Reason</label>
                <div className="relative">
                  <div onClick={() => setIsFixtureReasonDropdownOpen(!isFixtureReasonDropdownOpen)} className={`w-full p-4 bg-white border rounded-xl flex justify-between items-center cursor-pointer transition-all shadow-sm ${isFixtureReasonDropdownOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-indigo-400'}`}>
                    <span className="font-extrabold text-sm text-slate-700">
                      {fixtureActionReason === 'New Receive' ? <><span className="text-emerald-500 mr-2 text-lg">📦</span> New Receive <span className="text-slate-400 ml-1 font-normal">(รับเข้าใหม่)</span></> : 
                       fixtureActionReason === 'Repair' ? <><span className="text-blue-500 mr-2 text-lg">🔧</span> Repair <span className="text-slate-400 ml-1 font-normal">(ซ่อมสำเร็จ)</span></> : 
                       <><span className="text-red-500 mr-2 text-lg">🗑️</span> Scrap <span className="text-slate-400 ml-1 font-normal">(ทิ้ง/แทงจำหน่าย)</span></>}
                    </span>
                    <i className={`bi bi-chevron-down text-slate-400 transition-transform duration-300 ${isFixtureReasonDropdownOpen ? 'rotate-180 text-indigo-500' : ''}`}></i>
                  </div>

                  {/* Menu Options (มี Animation) */}
                  {isFixtureReasonDropdownOpen && (
                    <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-100 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 py-2 ring-1 ring-slate-900/5">
                      {['New Receive', 'Repair', 'Scrap'].map(reason => (
                        <div key={reason} onClick={() => { setFixtureActionReason(reason); setIsFixtureReasonDropdownOpen(false); }} className={`px-5 py-3.5 cursor-pointer font-bold text-sm transition-all flex items-center gap-3 ${fixtureActionReason === reason ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-500' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'}`}>
                          {reason === 'New Receive' ? <><span className="text-emerald-500 text-lg">📦</span> New Receive <span className="text-slate-400 font-normal ml-auto text-xs">รับเข้าใหม่</span></> : 
                           reason === 'Repair' ? <><span className="text-blue-500 text-lg">🔧</span> Repair <span className="text-slate-400 font-normal ml-auto text-xs">ซ่อมสำเร็จ</span></> : 
                           <><span className="text-red-500 text-lg">🗑️</span> Scrap <span className="text-slate-400 font-normal ml-auto text-xs">แทงจำหน่าย</span></>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">Quantity</label>
                <div className="flex items-center shadow-sm rounded-xl">
                  <input type="number" name="qty" min="1" defaultValue={1} required className="flex-1 p-4 bg-white border border-slate-200 rounded-l-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow z-10 text-xl font-black text-indigo-600" />
                  <span className="bg-slate-100 border border-slate-200 border-l-0 p-4 rounded-r-xl font-bold text-slate-500">Pcs</span>
                </div>
                {fixtureActionReason !== 'New Receive' && (
                  <p className="text-[11px] font-bold text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100"><i className="bi bi-info-circle-fill mr-1"></i> จะนำไปหักลบออกจากยอดของพัง (Broken) อัตโนมัติ</p>
                )}
              </div>

              <button type="submit" disabled={isProcessing} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl mt-4 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-600/20"><i className="bi bi-check-circle mr-2"></i>Confirm Update</button>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================= */}

      {/* 🌟 Sidebar 🌟 */}
      <nav className="fixed md:relative top-0 left-0 h-full w-[76px] hover:w-[260px] bg-[#0f172a] text-[#cbd5e1] transition-all duration-300 ease-in-out z-50 overflow-hidden group shadow-2xl flex-shrink-0 border-r border-slate-800 flex flex-col"> 
        <div className="flex items-center h-[76px] border-b border-[#1e293b] shrink-0 px-6">
          <i className="bi bi-tools text-2xl text-blue-500 filter drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] min-w-[24px] text-center"></i>
          <span className="ml-5 font-bold text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap tracking-wide">Maint. Intel</span>
        </div> 

        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-6 space-y-2"> 
          
          {/* GROUP 1: WORKSPACE */}
          <div>
            <button onClick={() => toggleGroup('Workspace')} className="flex items-center justify-between w-full px-6 py-3 text-[10px] font-black tracking-widest text-left text-[#64748b] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:text-white whitespace-nowrap">
              <span>Workspace</span><i className={`bi bi-chevron-down transition-transform duration-300 ${expandedGroups.Workspace ? 'rotate-180' : ''}`}></i>
            </button> 
            <div className={`overflow-hidden transition-all duration-300 flex flex-col ${expandedGroups.Workspace ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}> 
              <a onClick={() => setActiveTab('dashboard')} className={`relative flex items-center h-12 cursor-pointer transition-colors border-l-[3px] pl-[22px] ${activeTab === 'dashboard' ? 'border-blue-500 bg-[#1e293b] text-white' : 'border-transparent hover:bg-[#1e293b] hover:text-white'}`}>
                <i className="bi bi-grid-1x2 text-[18px] min-w-[24px] text-center"></i>
                <span className="ml-5 font-bold text-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">Dashboard</span>
              </a> 
            </div>
          </div>

          {/* GROUP 2: INVENTORY (รวมมิตรของทั้งหมด) */}
          <div>
            <button onClick={() => toggleGroup('Inventory')} className="flex items-center justify-between w-full px-6 py-3 text-[10px] font-black tracking-widest text-left text-[#64748b] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-2 hover:text-white whitespace-nowrap">
              <span>Inventory</span><i className={`bi bi-chevron-down transition-transform duration-300 ${expandedGroups.Inventory ? 'rotate-180' : ''}`}></i>
            </button> 
            <div className={`overflow-hidden transition-all duration-300 flex flex-col ${expandedGroups.Inventory ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}> 
              <a onClick={() => setActiveTab('stock')} className={`relative flex items-center h-12 cursor-pointer transition-colors border-l-[3px] pl-[22px] ${activeTab === 'stock' ? 'border-blue-500 bg-[#1e293b] text-white' : 'border-transparent hover:bg-[#1e293b] hover:text-white'}`}>
                <i className="bi bi-box-seam text-[18px] min-w-[24px] text-center"></i>
                <span className="ml-5 font-bold text-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">Spare Parts</span>
              </a> 
              <a onClick={() => setActiveTab('consumables')} className={`relative flex items-center h-12 cursor-pointer transition-colors border-l-[3px] pl-[22px] ${activeTab === 'consumables' ? 'border-pink-500 bg-[#1e293b] text-white' : 'border-transparent hover:bg-[#1e293b] hover:text-white'}`}>
                <i className="bi bi-box2-heart text-[18px] min-w-[24px] text-center"></i>
                <span className="ml-5 font-bold text-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">Consumables</span>
              </a> 
              <a onClick={() => setActiveTab('fixtures')} className={`relative flex items-center h-12 cursor-pointer transition-colors border-l-[3px] pl-[22px] ${activeTab === 'fixtures' ? 'border-purple-500 bg-[#1e293b] text-white' : 'border-transparent hover:bg-[#1e293b] hover:text-white'}`}>
                <i className="bi bi-tools text-[18px] min-w-[24px] text-center"></i>
                <span className="ml-5 font-bold text-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">Fixtures</span>
              </a> 
            </div>
          </div>
          
          {/* GROUP 3: OPERATIONS */}
          <div>
            <button onClick={() => toggleGroup('Operations')} className="flex items-center justify-between w-full px-6 py-3 text-[10px] font-black tracking-widest text-left text-[#64748b] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-2 hover:text-white whitespace-nowrap">
              <span>Operations</span><i className={`bi bi-chevron-down transition-transform duration-300 ${expandedGroups.Operations ? 'rotate-180' : ''}`}></i>
            </button> 
            <div className={`overflow-hidden transition-all duration-300 flex flex-col ${expandedGroups.Operations ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}> 
              <a onClick={() => setActiveTab('requests')} className={`relative flex items-center h-12 cursor-pointer transition-colors border-l-[3px] pl-[22px] ${activeTab === 'requests' ? 'border-blue-500 bg-[#1e293b] text-white' : 'border-transparent hover:bg-[#1e293b] hover:text-white'}`}>
                <i className="bi bi-ticket-detailed text-[18px] min-w-[24px] text-center"></i>
                <span className="ml-5 font-bold text-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">Request Queue</span>
              </a> 
              <a onClick={() => setActiveTab('log-record')} className={`relative flex items-center h-12 cursor-pointer transition-colors border-l-[3px] pl-[22px] ${activeTab === 'log-record' ? 'border-blue-500 bg-[#1e293b] text-white' : 'border-transparent hover:bg-[#1e293b] hover:text-white'}`}>
                <i className="bi bi-wrench-adjustable text-[18px] min-w-[24px] text-center"></i>
                <span className="ml-5 font-bold text-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">Manual Log</span>
              </a>
              <a onClick={() => setActiveTab('history')} className={`relative flex items-center h-12 cursor-pointer transition-colors border-l-[3px] pl-[22px] ${activeTab === 'history' ? 'border-blue-500 bg-[#1e293b] text-white' : 'border-transparent hover:bg-[#1e293b] hover:text-white'}`}>
                <i className="bi bi-clock-history text-[18px] min-w-[24px] text-center"></i>
                <span className="ml-5 font-bold text-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">History & Undo</span>
              </a> 
            </div>
          </div>
          
          {/* GROUP 4: SETTINGS */}
          <div>
            <button onClick={() => toggleGroup('Settings')} className="flex items-center justify-between w-full px-6 py-3 text-[10px] font-black tracking-widest text-left text-[#64748b] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-2 hover:text-white whitespace-nowrap">
              <span>Settings</span><i className={`bi bi-chevron-down transition-transform duration-300 ${expandedGroups.Settings ? 'rotate-180' : ''}`}></i>
            </button> 
            <div className={`overflow-hidden transition-all duration-300 flex flex-col ${expandedGroups.Settings ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}> 
              <a onClick={() => setActiveTab('machines')} className={`relative flex items-center h-12 cursor-pointer transition-colors border-l-[3px] pl-[22px] ${activeTab === 'machines' ? 'border-blue-500 bg-[#1e293b] text-white' : 'border-transparent hover:bg-[#1e293b] hover:text-white'}`}>
                <i className="bi bi-robot text-[18px] min-w-[24px] text-center"></i>
                <span className="ml-5 font-bold text-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">Machines</span>
              </a> 
              <a onClick={() => setActiveTab('basic-info')} className={`relative flex items-center h-12 cursor-pointer transition-colors border-l-[3px] pl-[22px] ${activeTab === 'basic-info' ? 'border-blue-500 bg-[#1e293b] text-white' : 'border-transparent hover:bg-[#1e293b] hover:text-white'}`}>
                <i className="bi bi-list-columns-reverse text-[18px] min-w-[24px] text-center"></i>
                <span className="ml-5 font-bold text-sm opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity duration-300">Basic Info</span>
              </a> 
            </div>
          </div>

        </div> 
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
        
        <header className="h-[76px] bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 flex items-center justify-between shadow-sm flex-shrink-0 z-30 relative"> 
          <div><h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-3 tracking-tight"><div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${activeTab === 'consumables' ? 'bg-pink-50 text-pink-600 border-pink-100' : activeTab === 'fixtures' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}><i className={`bi ${activeTab === 'dashboard' ? 'bi-grid-1x2-fill' : activeTab === 'stock' ? 'bi-box-seam-fill' : activeTab === 'consumables' ? 'bi-box2-heart-fill' : activeTab === 'fixtures' ? 'bi-tools' : activeTab === 'machines' ? 'bi-robot' : activeTab === 'requests' ? 'bi-ticket-detailed-fill' : activeTab === 'basic-info' ? 'bi-list-columns-reverse' : activeTab === 'history' ? 'bi-clock-history' : 'bi-tools'}`}></i></div> {activeTab === 'dashboard' ? 'Maintenance Intelligence' : activeTab === 'stock' ? 'Current Stock' : activeTab === 'consumables' ? 'Consumables Inventory' : activeTab === 'fixtures' ? 'Fixtures & Jigs' : activeTab === 'machines' ? 'Machine Management' : activeTab === 'requests' ? 'Request Queue' : activeTab === 'basic-info' ? 'Basic Information' : activeTab === 'history' ? 'History & Correction' : 'Manual Log Record'}</h1></div> 
          <div className="flex items-center gap-5">
            <span className="text-xs font-black text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm"><i className="bi bi-building text-blue-500 mr-1.5"></i>{activeDeptName || localStorage.getItem('activeDepartment')}</span>
            <span className="text-sm font-bold text-slate-500 hidden sm:block bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">{session?.user?.email}</span>
            <button onClick={handleLogout} className="h-10 px-5 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold border border-red-100 hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-sm"><i className="bi bi-box-arrow-right mr-2"></i> Sign out</button>
          </div> 
        </header>

        {/* 🌟 Injected Sub-Tabs (โผล่มาเฉพาะตอนอยู่หน้า Inventory) 🌟 */}
        {['stock', 'consumables', 'fixtures'].includes(activeTab) && (
           <div className="bg-white border-b border-slate-200 px-10 flex gap-8 shrink-0 relative z-20">
               <button onClick={() => setActiveTab('stock')} className={`py-4 text-[13px] font-extrabold border-b-[3px] transition-all ${activeTab === 'stock' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><i className="bi bi-box-seam mr-2"></i>Spare Parts</button>
               <button onClick={() => setActiveTab('consumables')} className={`py-4 text-[13px] font-extrabold border-b-[3px] transition-all ${activeTab === 'consumables' ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><i className="bi bi-box2-heart mr-2"></i>Consumables</button>
               <button onClick={() => setActiveTab('fixtures')} className={`py-4 text-[13px] font-extrabold border-b-[3px] transition-all ${activeTab === 'fixtures' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><i className="bi bi-tools mr-2"></i>Fixtures & Jigs</button>
           </div>
        )}

        <div className="flex-1 relative overflow-hidden">
          
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && ( 
            <div className="absolute inset-0 p-6 md:p-10 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500"> 
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6 flex-shrink-0"> 
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default group"><div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"><i className="bi bi-robot"></i></div><div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Machines</p><p className="text-3xl font-black text-slate-800">{isLoading ? '-' : dashboardStats.machines}</p></div></div> <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default group"><div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"><i className="bi bi-gear-fill"></i></div><div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Active Parts</p><p className="text-3xl font-black text-slate-800">{isLoading ? '-' : dashboardStats.parts}</p></div></div> <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-50 flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default group"><div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"><i className="bi bi-exclamation-triangle-fill"></i></div><div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Out of Stock</p><p className="text-3xl font-black text-red-600">{isLoading ? '-' : dashboardStats.outOfStock}</p></div></div> <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-50 flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-default group"><div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform"><i className="bi bi-x-circle-fill"></i></div><div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Overdue Jobs</p><p className="text-3xl font-black text-red-600">{isLoading ? '-' : dashboardStats.overdue}</p></div></div> 
              </div> 
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0"> 
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center p-6 border-b border-slate-100 bg-white gap-4 flex-shrink-0">
                  <h2 className="font-bold text-slate-800 text-lg tracking-tight">Maintenance Schedule</h2>
                  
                  <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto">
                    <div className="relative flex-1 xl:flex-none min-w-[150px]">
                      <select value={filterLine} onChange={(e) => { setFilterLine(e.target.value); setFilterMachine(''); }} className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-700 shadow-sm appearance-none hover:bg-white transition-all">
                        <option value="">All Lines</option>
                        {linesMaster.map(line => <option key={line.LineName} value={line.LineName}>{line.LineName}</option>)}
                      </select>
                      <i className="bi bi-funnel absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                    </div>
                    <div className="relative flex-1 xl:flex-none min-w-[150px]">
                      <select value={filterMachine} onChange={(e) => setFilterMachine(e.target.value)} disabled={!filterLine} className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-700 shadow-sm appearance-none disabled:opacity-50 hover:bg-white transition-all">
                        <option value="">All Machines</option>
                        {machines.filter(m => m.LineName === filterLine).map(m => <option key={m.MachineID} value={m.MachineID}>{m.MachineName}</option>)}
                      </select>
                      <i className="bi bi-robot absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                    </div>
                    <button onClick={fetchAllData} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white shrink-0"><i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i></button>
                  </div>
                </div> 
                <div className="overflow-auto flex-1 relative rounded-b-2xl"> 
                  <table className="w-full text-left border-collapse"> 
                    <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                      <tr className="text-slate-500 text-xs uppercase font-extrabold tracking-wider">
                        <th className="py-5 px-6">Machine & Line</th>
                        <th className="py-5 px-6">Part Info (MTBF)</th>
                        <th className="py-5 px-6">Order Date</th>
                        <th className="py-5 px-6">Due Date</th>
                        <th className="py-5 px-6">Status & Action</th>
                      </tr>
                    </thead> 
                    <tbody className="text-sm"> 
                      {filteredScheduleData.map((row, idx) => ( 
                        <tr key={idx} className={`border-b border-slate-50 hover:bg-blue-50/40 transition-colors duration-200 ${row.status === 'MONITORING' ? 'opacity-60 bg-slate-50/50 hover:bg-slate-100' : ''}`}>
                          <td className="py-5 px-6 align-top">
                            <div className="font-bold text-slate-800 text-[15px]">{row.machine}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5"><i className="bi bi-geo-alt-fill text-blue-400"></i> {row.line}</div>
                          </td>
                          <td className="py-5 px-6 align-top">
                            <div className="font-bold text-slate-700">{row.partName}</div>
                            <div className="text-xs text-slate-400 mt-1.5">Req: <span className="text-blue-600 font-black">{row.reqQty}</span> pcs <span className="mx-1 opacity-30">|</span> MTBF: <span className="text-emerald-600 font-black">{row.mtbfDays}</span> d</div>
                          </td>
                          <td className="py-5 px-6 align-top font-bold text-blue-600">{row.orderDate}</td>
                          <td className="py-5 px-6 align-top font-bold text-red-500">{row.dueDate}</td>
                          <td className="py-5 px-6 align-top">{renderStatusBadge(row)}</td>
                        </tr> 
                      ))} 
                      {filteredScheduleData.length === 0 && (<tr><td colSpan={5} className="py-10 text-center text-slate-400 font-bold">No schedule data available</td></tr>)}
                    </tbody> 
                  </table> 
                </div> 
              </div> 
            </div> 
          )}
          
          {/* TAB: CURRENT STOCK */}
          {activeTab === 'stock' && ( 
            <div className="absolute inset-0 p-6 md:p-10 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500"> 
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0"> 
                <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-b border-slate-100 gap-4 flex-shrink-0"> 
                  <h2 className="font-bold text-slate-800 text-lg tracking-tight">Real-time Stock Allocations</h2> 
                  <div className="flex flex-wrap gap-3 items-center">
                    <button onClick={fetchAllData} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white"><i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i></button>
                    <div className="h-6 w-px bg-slate-200 hidden sm:block"></div> 
                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 text-sm border border-emerald-500 text-emerald-600 rounded-xl hover:bg-emerald-50 active:scale-95 transition-all shadow-sm font-bold bg-white"><i className="bi bi-file-earmark-excel"></i> Export CSV</button>
                    <button onClick={openNewPartModal} className="flex items-center gap-2 px-5 py-2.5 text-sm bg-slate-900 text-white rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-md shadow-slate-900/20 font-bold ml-2"><i className="bi bi-plus-lg"></i> New Part</button>
                  </div> 
                </div> 
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0"><div className="relative max-w-md"><i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i><input type="text" placeholder="Search part name, model, or location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all" /></div></div> 
                
                <div className="overflow-auto flex-1 relative pb-12 rounded-b-2xl"> 
                  <table className="w-full text-left border-collapse"> 
                    <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                      <tr className="text-slate-500 text-xs uppercase font-extrabold tracking-wider">
                        <th className="py-5 px-4 text-center w-16">Action</th>
                        <th className="py-5 px-6">Location</th>
                        <th className="py-5 px-6 text-center w-24">Image</th>
                        <th className="py-5 px-6 w-[30%]">Part Details</th>
                        <th className="py-5 px-6 border-l border-slate-200/50 bg-slate-100/50">Physical</th>
                        <th className="py-5 px-6 bg-red-50/30 text-red-700">Reserved</th>
                        <th className="py-5 px-6 bg-emerald-50/30 text-emerald-700">Available</th>
                        <th className="py-5 px-6 text-center w-32">Order Status</th>
                        <th className="py-5 px-6 text-center text-blue-600 w-24">P/N</th>
                      </tr>
                    </thead> 
                    <tbody className="text-sm"> 
                      {filteredStockData.map((row, idx) => { 
                        const alloc = stockAllocations[row.PartID] || { physical: row.Balance, reserved: 0, available: row.Balance, machines: [] }; 
                        const partDetails = parts.find(p => p.PartID === row.PartID) || {}; 

                        const reqs = pendingRequests.filter(r => r.PartID === row.PartID);
                        const mechanicReqQty = reqs.reduce((sum, r) => sum + (r.Qty || 0), 0);
                        const totalReserved = alloc.reserved + mechanicReqQty;
                        const finalAvailable = alloc.available - mechanicReqQty;

                        const reservedMachineNames = alloc.machines.map((mId: string) => {
                          const m = machines.find(x => x.MachineID === mId);
                          return m ? `${m.MachineName} (${m.LineName})` : mId;
                        });

                        return ( 
                          <tr key={idx} className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors duration-200 group"> 
                            <td className="py-4 px-4 text-center relative border-r border-slate-50">
                              <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === row.PartID ? null : row.PartID); }} className="w-9 h-9 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-all active:scale-95 mx-auto"><i className="bi bi-list text-2xl"></i></button>
                              {openDropdownId === row.PartID && (
                                <div className="absolute left-14 top-2 w-56 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-left ring-1 ring-slate-900/5">
                                  <button onClick={() => openActionModal('receive', row.PartID, partDetails.PartName || row.PartName)} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-box-arrow-in-down-right text-lg"></i> Receive Stock</button>
                                  <button onClick={() => openActionModal('reduce', row.PartID, partDetails.PartName || row.PartName)} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-box-arrow-up-right text-lg"></i> Adjust Stock</button>
                                  <button onClick={() => openActionModal('leadTime', row.PartID, partDetails.PartName || row.PartName)} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-clock-history text-lg"></i> Update Lead Time</button>
                                  <div className="h-px bg-slate-100 my-1 mx-4"></div>
                                  <button onClick={() => openActionModal('edit', row.PartID, partDetails.PartName || row.PartName)} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-pencil-square text-lg"></i> Edit Part Info</button>
                                  
                                  <div className="h-px bg-slate-100 my-1 mx-4"></div>
                                  <button onClick={() => openMoveCategory('part', row.PartID)} className="w-full px-5 py-3 text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-arrow-left-right text-lg"></i> Move to Consumables</button>

                                  <div className="h-px bg-slate-100 my-1 mx-4"></div>
                                  <button onClick={() => handleDeletePart(row.PartID, partDetails.PartName || row.PartName)} className="w-full px-5 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-trash3-fill text-lg"></i> Delete Part</button>
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6 font-bold text-slate-800"><i className="bi bi-geo-alt-fill text-blue-500 mr-2 opacity-80"></i>{row.Location || '-'}</td> 
                            <td className="py-4 px-6 text-center">
                              {partDetails.ImageURL ? ( 
                                <div className="w-16 h-12 flex items-center justify-center mx-auto cursor-zoom-in hover:scale-110 transition-transform" onClick={() => setZoomedImage(partDetails.ImageURL)}>
                                  <img src={partDetails.ImageURL} alt={partDetails.PartName} className="w-full h-full object-contain mix-blend-multiply" /> 
                                </div>
                              ) : ( 
                                <div className="w-16 h-12 flex items-center justify-center mx-auto text-slate-300">
                                  <i className="bi bi-image text-xl"></i> 
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-800 text-[14px]">{partDetails.PartName || row.PartName}</div>
                              <div className="text-[12px] text-slate-500 mt-0.5"><span className="uppercase tracking-wider mr-1 text-[10px]">Model:</span> {partDetails.PartModel || '-'}</div>
                            </td> 
                            <td className="py-4 px-6 border-l border-slate-100 bg-slate-50/20 font-bold text-slate-700 text-[13px] align-top pt-5">{row.Balance !== null ? row.Balance : 0} Pcs</td> 
                            
                            <td className="py-4 px-6 bg-red-50/10 align-top pt-4">
                              <span className={`px-2.5 py-1 rounded-md text-[13px] font-bold block w-max mb-2 ${totalReserved > 0 ? 'bg-red-100 text-red-600' : 'text-slate-400'}`}>
                                {totalReserved} Pcs
                              </span>
                              {reservedMachineNames.length > 0 && (
                                <div className="text-[10px] text-red-500 font-bold leading-tight">
                                  <i className="bi bi-robot mr-1"></i>Reserved for: {reservedMachineNames.join(', ')}
                                </div>
                              )}
                              {reqs.length > 0 && (
                                <div className="text-[10px] text-amber-600 font-bold mt-1 leading-tight">
                                  <i className="bi bi-person-fill mr-1"></i>Pending requests: {mechanicReqQty} Pcs
                                </div>
                              )}
                            </td> 
                            <td className="py-4 px-6 bg-emerald-50/10 align-top pt-5"><span className={`px-3 py-1.5 rounded-full text-[13px] font-bold shadow-sm ${finalAvailable <= 0 ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}>{finalAvailable} Pcs</span></td> 
                            <td className="py-4 px-6 align-top pt-4 text-center border-l border-slate-50">
                              {partDetails.PendingOrder ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-sm w-full justify-center">
                                  <i className="bi bi-truck"></i> ORDERED
                                </span>
                              ) : (
                                <button onClick={() => handleMarkAsOrdered(row.PartID, 'part')} className="inline-flex items-center justify-center w-full gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold bg-white text-slate-500 border border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 transition-all shadow-sm active:scale-95">
                                  <i className="bi bi-cart-plus"></i> Mark Order
                                </button>
                              )}
                            </td>
                            <td className="py-4 px-6 text-[13px] font-black text-blue-600 align-top pt-5 text-center tracking-wider border-l border-slate-100 bg-blue-50/30">
                              {partDetails.PartNumber || '-'}
                            </td>
                          </tr> 
                        ); 
                      })} 
                      {filteredStockData.length === 0 && (<tr><td colSpan={8} className="py-10 text-center text-slate-400 font-bold">No data available</td></tr>)}
                    </tbody> 
                  </table> 
                </div> 
              </div> 
            </div> 
          )}

          {/* 🌟 TAB: CONSUMABLES */}
          {activeTab === 'consumables' && (
            <div className="absolute inset-0 p-6 md:p-10 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500"> 
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0"> 
                <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-b border-slate-100 gap-4 flex-shrink-0"> 
                  <h2 className="font-bold text-slate-800 text-lg tracking-tight">Consumables Inventory</h2> 
                  <div className="flex flex-wrap gap-3 items-center">
                    <button onClick={fetchAllData} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white"><i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i></button>
                    <div className="h-6 w-px bg-slate-200 hidden sm:block"></div> 
                    <button onClick={() => setNewConsumableModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm bg-pink-600 text-white rounded-xl hover:bg-pink-700 active:scale-95 transition-all shadow-md shadow-pink-600/20 font-bold ml-2"><i className="bi bi-plus-lg"></i> Add Item</button>
                  </div> 
                </div> 
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0"><div className="relative max-w-md"><i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i><input type="text" placeholder="Search item name, P/N, or location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 text-sm shadow-sm transition-all" /></div></div> 
                
                <div className="overflow-auto flex-1 relative pb-12 rounded-b-2xl"> 
                  <table className="w-full text-left border-collapse whitespace-nowrap"> 
                    <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                      <tr className="text-slate-500 text-[11px] uppercase font-extrabold tracking-wider">
                        <th className="py-4 px-4 text-center w-16">Action</th>
                        <th className="py-4 px-6">Location</th>
                        <th className="py-4 px-6 text-center w-20">Image</th>
                        <th className="py-4 pl-6 pr-2">Item Name</th>
                        <th className="py-4 px-2">Model</th>
                        <th className="py-4 px-4 text-center">Min (ROP)</th>
                        <th className="py-4 px-4 text-center">Safety</th>
                        <th className="py-4 px-4 text-center">Max</th>
                        <th className="py-4 px-6 border-l border-slate-200/50 bg-slate-100/50 text-center">Current Balance</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-center text-blue-600 w-24">P/N</th>
                      </tr>
                    </thead> 
                    <tbody className="text-sm"> 
                      {filteredConsumables.map((item, idx) => { 
                        const safety = item.SafetyStock || 0;
                        const min = item.MinQty || 0;
                        const rop = min + safety; 
                        
                        const isCritical = item.Balance <= safety;
                        const isReorder = item.Balance <= rop && !isCritical;

                        return ( 
                          <tr key={idx} className="border-b border-slate-50 hover:bg-pink-50/40 transition-colors duration-200 group"> 
                            <td className="py-3 px-4 text-center align-middle relative border-r border-slate-50">
                              <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === item.ItemID ? null : item.ItemID); }} className="w-9 h-9 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-pink-600 flex items-center justify-center transition-all active:scale-95 mx-auto"><i className="bi bi-list text-2xl"></i></button>
                              {openDropdownId === item.ItemID && (
                                <div className="absolute left-14 top-2 w-48 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-left ring-1 ring-slate-900/5">
                                  <button onClick={() => { setSelectedConsumable(item); setReceiveConsumableOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-box-arrow-in-down-right text-lg"></i> Receive Stock</button>
                                  <button onClick={() => { setSelectedConsumable(item); setReduceConsumableOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-pencil-square text-lg"></i> Adjust Stock</button>
                                  <div className="h-px bg-slate-100 my-1 mx-4"></div>
                                  <button onClick={() => { setSelectedConsumable(item); setEditingConsumableData(item); setPreviewImage(item.ImageURL || null); setEditConsumableOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-pink-50 hover:text-pink-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-pencil-fill text-lg"></i> Edit Item Info</button>
                                  <div className="h-px bg-slate-100 my-1 mx-4"></div>
                                  <button onClick={() => openMoveCategory('consumable', item.ItemID)} className="w-full px-5 py-3 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-arrow-left-right text-lg"></i> Move to Spare Parts</button>
                                  <div className="h-px bg-slate-100 my-1 mx-4"></div>
                                  <button onClick={() => handleDeleteConsumable(item.ItemID, item.ItemName)} className="w-full px-5 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-trash3-fill text-lg"></i> Delete Item</button>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-6 font-bold text-slate-800 align-middle"><i className="bi bi-geo-alt-fill text-pink-500 mr-2 opacity-80"></i>{item.Location}</td> 
                            <td className="py-3 px-6 text-center align-middle">
                              {item.ImageURL ? ( 
                                <div className="w-14 h-10 flex items-center justify-center mx-auto cursor-zoom-in hover:scale-110 transition-transform" onClick={() => setZoomedImage(item.ImageURL)}>
                                  <img src={item.ImageURL} alt={item.ItemName} className="w-full h-full object-contain mix-blend-multiply" /> 
                                </div>
                              ) : ( 
                                <div className="w-14 h-10 flex items-center justify-center mx-auto text-slate-300"><i className="bi bi-image text-xl"></i></div>
                              )}
                            </td>
                            
                            <td className="py-3 pl-6 pr-2 font-bold text-slate-800 text-[14px] align-middle">{item.ItemName}</td> 
                            <td className="py-3 px-2 text-[13px] font-bold text-slate-500 align-middle">{item.ItemModel || '-'}</td>
                            
                            <td className="py-3 px-4 text-center align-middle"><span className="text-[13px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-md border border-slate-200">{min}</span></td>
                            <td className="py-3 px-4 text-center align-middle"><span className="text-[13px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-md border border-orange-200">{safety}</span></td>
                            <td className="py-3 px-4 text-center align-middle"><span className="text-[13px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-200">{item.MaxQty}</span></td>

                            <td className="py-3 px-6 border-l border-slate-100 bg-slate-50/20 font-black text-slate-800 text-lg align-middle text-center">
                              {item.Balance !== null ? item.Balance : 0} <span className="text-xs font-bold text-slate-500 ml-1">Pcs</span>
                            </td> 
                            
                            <td className="py-3 px-6 align-middle text-center">
                              {item.PendingOrder ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold w-max shadow-sm bg-purple-50 text-purple-700 border border-purple-200"><i className="bi bi-truck"></i> ORDERED</span>
                              ) : isCritical ? (
                                <div className="flex flex-col gap-2 items-center">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold w-max shadow-sm bg-red-50 text-red-700 border border-red-200"><i className="bi bi-exclamation-triangle-fill"></i> Critical</span>
                                  <button onClick={() => handleMarkAsOrdered(item.ItemID, 'consumable')} className="text-[10px] font-bold bg-white border border-red-300 text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors active:scale-95 shadow-sm"><i className="bi bi-cart-check"></i> Mark Ordered</button>
                                </div>
                              ) : isReorder ? (
                                <div className="flex flex-col gap-2 items-center">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold w-max shadow-sm bg-amber-50 text-amber-700 border border-amber-200"><i className="bi bi-cart-plus-fill"></i> ROP</span>
                                  <button onClick={() => handleMarkAsOrdered(item.ItemID, 'consumable')} className="text-[10px] font-bold bg-white border border-amber-300 text-amber-600 px-2 py-1 rounded hover:bg-amber-50 transition-colors active:scale-95 shadow-sm"><i className="bi bi-cart-check"></i> Mark Ordered</button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold w-max shadow-sm bg-emerald-50 text-emerald-700 border border-emerald-100"><i className="bi bi-check-circle-fill"></i> Normal</span>
                              )}
                            </td> 
                            <td className="py-3 px-6 text-[13px] font-black text-blue-600 align-middle text-center tracking-wider border-l border-slate-100 bg-blue-50/30">{item.PartNumber || '-'}</td>
                          </tr> 
                        ); 
                      })} 
                      {filteredConsumables.length === 0 && (<tr><td colSpan={11} className="py-10 text-center text-slate-400 font-bold">No consumables data available</td></tr>)}
                    </tbody> 
                  </table> 
                </div> 
              </div> 
            </div> 
          )}

          {/* 🌟 TAB: FIXTURES */}
          {activeTab === 'fixtures' && (
            <div className="absolute inset-0 p-6 md:p-10 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500"> 
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0"> 
                <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-b border-slate-100 gap-4 flex-shrink-0"> 
                  <h2 className="font-bold text-slate-800 text-lg tracking-tight">Fixtures Inventory</h2> 
                  <div className="flex flex-wrap gap-3 items-center">
                    <button onClick={fetchAllData} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white"><i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i></button>
                    <div className="h-6 w-px bg-slate-200 hidden sm:block"></div> 
                    <button onClick={() => setNewFixtureModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm bg-purple-600 text-white rounded-xl hover:bg-purple-700 active:scale-95 transition-all shadow-md shadow-purple-600/20 font-bold ml-2"><i className="bi bi-plus-lg"></i> Add Fixture</button>
                  </div> 
                </div> 
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0"><div className="relative max-w-md"><i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i><input type="text" placeholder="Search Fixture No. or Model..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm shadow-sm transition-all" /></div></div> 
                
                <div className="overflow-auto flex-1 relative pb-12 rounded-b-2xl"> 
                  <table className="w-full text-left border-collapse whitespace-nowrap"> 
                    <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                      <tr className="text-slate-500 text-[11px] uppercase font-extrabold tracking-wider">
                        <th className="py-4 px-4 text-center w-16">Action</th>
                        <th className="py-4 px-6 text-center w-20">Image</th>
                        <th className="py-4 px-6 text-purple-600">Fixture No.</th>
                        <th className="py-4 px-6 w-[25%]">Model Name</th>
                        <th className="py-4 px-4 text-center border-l border-slate-200 bg-slate-100/50">Total</th>
                        <th className="py-4 px-4 text-center bg-red-50/30 text-red-700">Broken</th>
                        <th className="py-4 px-4 text-center bg-blue-50/30 text-blue-700">Borrowed</th>
                        <th className="py-4 px-4 text-center bg-emerald-50/30 text-emerald-700">Available</th>
                        <th className="py-4 px-6 text-center w-32">Status</th>
                      </tr>
                    </thead> 
                    <tbody className="text-sm"> 
                      {filteredFixtures.map((item, idx) => { 
                        const borrowedQty = item.BorrowedQty || 0;
                        const availableQty = (item.TotalQty || 0) - (item.BrokenQty || 0) - borrowedQty;
                        
                        let fixStatus = 'Available';
                        if (availableQty <= 0 && borrowedQty > 0) fixStatus = 'Fully Borrowed';
                        else if (availableQty <= 0 && (item.BrokenQty || 0) > 0) fixStatus = 'Needs Repair';
                        else if (borrowedQty > 0) fixStatus = 'In Use';

                        return ( 
                          <tr key={idx} className="border-b border-slate-50 hover:bg-purple-50/40 transition-colors duration-200 group"> 
                            <td className="py-3 px-4 text-center align-middle relative border-r border-slate-50">
                              <button onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === item.FixtureNo ? null : item.FixtureNo); }} className="w-9 h-9 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-purple-600 flex items-center justify-center transition-all active:scale-95 mx-auto"><i className="bi bi-list text-2xl"></i></button>
                              {openDropdownId === item.FixtureNo && (
                                <div className="absolute left-14 top-2 w-52 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-left ring-1 ring-slate-900/5">
                                  <button onClick={() => { setSelectedFixture(item); setFixtureActionReason('New Receive'); setEditFixtureStockOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-box-seam text-lg"></i> Update Stock</button>
                                  <div className="h-px bg-slate-100 my-1 mx-4"></div>
                                  <button onClick={() => { setSelectedFixture(item); setPreviewImage(item.ImageURL || null); setEditFixtureInfoOpen(true); setOpenDropdownId(null); }} className="w-full px-5 py-3 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-600 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-pencil-fill text-lg"></i> Edit Fixture Info</button>
                                  <div className="h-px bg-slate-100 my-1 mx-4"></div>
                                  <button onClick={() => handleDeleteFixture(item.FixtureNo)} className="w-full px-5 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-bold text-left"><i className="bi bi-trash3-fill text-lg"></i> Delete Fixture</button>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-6 text-center align-middle">
                              {item.ImageURL ? ( 
                                <div className="w-14 h-10 flex items-center justify-center mx-auto cursor-zoom-in hover:scale-110 transition-transform" onClick={() => setZoomedImage(item.ImageURL)}>
                                  <img src={item.ImageURL} className="w-full h-full object-contain mix-blend-multiply" /> 
                                </div>
                              ) : ( 
                                <div className="w-14 h-10 flex items-center justify-center mx-auto text-slate-300"><i className="bi bi-image text-xl"></i></div>
                              )}
                            </td>
                            <td className="py-3 px-6 text-[14px] font-black text-purple-600 align-middle tracking-wider">{item.FixtureNo}</td>
                            <td className="py-3 px-6 font-bold text-slate-800 text-[14px] align-middle">{item.ModelName || '-'}</td> 
                            
                            <td className="py-3 px-4 border-l border-slate-100 bg-slate-50/20 font-black text-slate-800 text-base align-middle text-center">{item.TotalQty}</td> 
                            <td className="py-3 px-4 bg-red-50/10 font-bold text-red-600 text-base align-middle text-center">{item.BrokenQty > 0 ? item.BrokenQty : '-'}</td> 
                            <td className="py-3 px-4 bg-blue-50/10 font-bold text-blue-600 text-base align-middle text-center">{borrowedQty > 0 ? borrowedQty : '-'}</td> 
                            <td className="py-3 px-4 bg-emerald-50/10 font-black text-emerald-600 text-lg align-middle text-center">{availableQty}</td> 
                            
                            <td className="py-3 px-6 align-middle text-center">
                              {fixStatus === 'Fully Borrowed' ? <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold w-max shadow-sm bg-purple-50 text-purple-700 border border-purple-200"><i className="bi bi-person-fill-check"></i> FULLY BORROWED</span> :
                               fixStatus === 'Needs Repair' ? <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold w-max shadow-sm bg-red-50 text-red-700 border border-red-200"><i className="bi bi-exclamation-triangle-fill"></i> NEEDS REPAIR</span> :
                               fixStatus === 'In Use' ? <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold w-max shadow-sm bg-blue-50 text-blue-700 border border-blue-200"><i className="bi bi-people-fill"></i> IN USE ({borrowedQty})</span> :
                               <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold w-max shadow-sm bg-emerald-50 text-emerald-700 border border-emerald-100"><i className="bi bi-check-circle-fill"></i> AVAILABLE</span>
                              }
                            </td>
                          </tr> 
                        ); 
                      })} 
                      {filteredFixtures.length === 0 && (<tr><td colSpan={9} className="py-10 text-center text-slate-400 font-bold">No fixtures data available</td></tr>)}
                    </tbody> 
                  </table> 
                </div> 
              </div> 
            </div> 
          )}

          {/* TAB: MACHINES */}
          {activeTab === 'machines' && ( 
            <div className="absolute inset-0 p-6 md:p-10 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500"> 
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6 flex-shrink-0"> 
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl"><i className="bi bi-robot"></i></div>
                  <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Active Machines</p><p className="text-3xl font-black text-blue-600">{activeMachinesCount}</p></div>
                </div> 
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center text-2xl"><i className="bi bi-pause-circle-fill"></i></div>
                  <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Inactive (Paused)</p><p className="text-3xl font-black text-slate-700">{inactiveMachinesCount}</p></div>
                </div> 
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-2xl"><i className="bi bi-diagram-3-fill"></i></div>
                  <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Lines</p><p className="text-3xl font-black text-indigo-600">{uniqueLinesCount}</p></div>
                </div> 
              </div> 

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0"> 
                <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-b border-slate-100 gap-4 flex-shrink-0"> 
                  <h2 className="font-bold text-slate-800 text-lg tracking-tight">Machine Directory</h2> 
                  <div className="flex flex-wrap gap-3 items-center">
                    <button onClick={fetchAllData} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white"><i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i></button>
                    <div className="h-6 w-px bg-slate-200 hidden sm:block"></div> 
                    <button onClick={() => setNewMachineModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm bg-slate-900 text-white rounded-xl hover:bg-slate-800 active:scale-95 transition-all shadow-md shadow-slate-900/20 font-bold"><i className="bi bi-plus-lg"></i> New Machine</button>
                  </div> 
                </div> 
                
                <div className="overflow-auto flex-1 relative rounded-b-2xl"> 
                  <table className="w-full text-left border-collapse"> 
                    <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                      <tr className="text-slate-500 text-xs uppercase font-extrabold tracking-wider">
                        <th className="py-5 px-6">Machine ID</th>
                        <th className="py-5 px-6">Machine Name</th>
                        <th className="py-5 px-6">Production Line</th>
                        <th className="py-5 px-6 text-center w-40">Actions</th>
                      </tr>
                    </thead> 
                    <tbody className="text-sm"> 
                      {machines.map((m, idx) => ( 
                        <tr key={idx} className={`border-b border-slate-50 hover:bg-blue-50/40 transition-colors duration-200 ${m.Active === false ? 'opacity-60 bg-slate-50/50' : ''}`}> 
                          <td className="py-4 px-6 font-extrabold text-slate-700">{m.MachineID}</td> 
                          <td className="py-4 px-6 font-bold text-slate-800">{m.MachineName}</td> 
                          <td className="py-4 px-6"><span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md text-xs font-bold border border-indigo-100">{m.LineName || '-'}</span></td> 
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-3">
                              <button onClick={() => { setEditingMachineData(m); setEditMachineModalOpen(true); }} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex items-center justify-center shadow-sm active:scale-95" title="Edit Machine">
                                <i className="bi bi-pencil-fill"></i>
                              </button>
                              <button onClick={() => handleToggleMachineStatus(m.MachineID, m.Active)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none shadow-inner ${m.Active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`} title="Toggle Active Status">
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-300 shadow-sm ${m.Active !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                              </button>
                            </div>
                          </td>
                        </tr> 
                      ))} 
                      {machines.length === 0 && (<tr><td colSpan={4} className="py-10 text-center text-slate-400 font-bold">No data available</td></tr>)}
                    </tbody> 
                  </table> 
                </div> 
              </div> 
            </div> 
          )}

          {/* TAB: REQUEST QUEUE */}
          {activeTab === 'requests' && ( 
            <div className="absolute inset-0 p-6 md:p-10 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
                <div className="flex flex-col sm:flex-row justify-between items-center p-6 border-b border-slate-100 gap-4 flex-shrink-0"> 
                  <h2 className="font-bold text-slate-800 text-lg tracking-tight">Request Queue</h2> 
                  <button onClick={fetchAllData} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white"><i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i></button>
                </div>
                
                <div className="overflow-y-auto flex-1 p-6 bg-slate-50/50">
                  {requestGroups.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-70">
                      <i className="bi bi-inbox-fill text-6xl mb-4"></i>
                      <p className="font-bold text-lg">No pending requests</p>
                      <p className="text-sm">Mechanics can submit requests via mobile app</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {requestGroups.map((group: any, idx: number) => (
                        <div key={idx} className="bg-white border border-blue-100 rounded-3xl p-6 shadow-lg shadow-blue-900/5 relative overflow-hidden group hover:border-blue-300 transition-colors flex flex-col h-full">
                          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                          
                          <div className="flex justify-between items-start mb-5 border-b border-slate-100 pb-4 shrink-0">
                            <div>
                              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200/50 mb-2"><i className="bi bi-hourglass-split"></i> Pending ({group.items.length} items)</span>
                              <h3 className="font-black text-slate-800 text-lg">{group.baseId}</h3>
                              <p className="text-xs text-slate-500 mt-1 font-medium"><i className="bi bi-person-fill text-blue-500 mr-1"></i> Picker: <span className="text-slate-700 font-bold">{group.pickerName}</span></p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Request Time</p>
                              <p className="text-sm font-bold text-slate-600">{new Date(group.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>

                          <div className="space-y-4 mb-6 flex-1 overflow-y-auto pr-2">
                            {group.items.map((req: any, i: number) => {
                              const isConsumable = req.PartID.startsWith('CSM-');
                              const partDetails = isConsumable ? consumables.find(c => c.ItemID === req.PartID) || {} : parts.find(p => p.PartID === req.PartID) || {};
                              const machineDetails = machines.find(m => m.MachineID === req.MachineID) || {};
                              const stockInfo = isConsumable ? partDetails : stockData.find(s => s.PartID === req.PartID) || {};
                              
                              return (
                                <div key={i} className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex gap-4 items-center">
                                  <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                                    {partDetails.ImageURL ? <img src={partDetails.ImageURL} className="w-full h-full object-contain mix-blend-multiply p-1" /> : <i className="bi bi-image text-slate-300 text-2xl"></i>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-extrabold text-slate-800 text-sm truncate">{partDetails.PartName || partDetails.ItemName || req.PartID}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <span className="text-[10px] text-slate-600 font-medium bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm"><span className="text-slate-400 mr-1">ID:</span>{req.PartID}</span>
                                      {(partDetails.PartModel || partDetails.ItemModel) && <span className="text-[10px] text-slate-600 font-medium bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm"><span className="text-slate-400 mr-1">Model:</span>{partDetails.PartModel || partDetails.ItemModel}</span>}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                      {!isConsumable && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded"><i className="bi bi-robot mr-1"></i>{machineDetails.MachineName || req.MachineID}</span>}
                                      {isConsumable && <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded"><i className="bi bi-box2-heart mr-1"></i>Consumable</span>}
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded"><i className="bi bi-geo-alt-fill mr-1"></i>Loc: {stockInfo.Location || 'N/A'}</span>
                                      
                                      {!isConsumable && req.Position && req.Position !== '-' && (
                                        <span className="text-[10px] text-slate-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shadow-sm"><span className="text-amber-600 mr-1"><i className="bi bi-geo-alt-fill"></i> Pos:</span>{req.Position}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-center shrink-0 border-l border-slate-200 pl-4 pr-2 flex flex-col justify-center">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantity</p>
                                    <p className="text-xl font-black text-blue-600">{req.Qty}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <button onClick={() => handleApproveGroup(group)} disabled={isProcessing} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/30 flex justify-center items-center gap-2 shrink-0">
                            {isProcessing ? <><i className="bi bi-arrow-repeat animate-spin text-lg"></i> Processing...</> : <><i className="bi bi-check-circle-fill text-lg"></i> Approve & Deduct Stock</>}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div> 
          )}
          
          {/* TAB: HISTORY & CORRECTION */}
          {activeTab === 'history' && (
            <div className="absolute inset-0 p-6 md:p-10 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 border-b border-slate-100 gap-4 flex-shrink-0"> 
                  <div>
                    <h2 className="font-bold text-slate-800 text-lg tracking-tight">History & Reversal</h2> 
                    <p className="text-xs text-slate-500 mt-1">ตรวจสอบประวัติ และแก้ไขสาเหตุเพื่อไม่ให้กระทบ MTBF</p>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
                    <div className="relative">
                      <input type="month" value={historyMonthFilter} onChange={(e) => setHistoryMonthFilter(e.target.value)} className="pl-4 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-700 shadow-sm" />
                    </div>
                    <button onClick={() => fetchHistoryData(localStorage.getItem('activeDepartment') || '')} title="Refresh Data" className="w-10 h-10 flex items-center justify-center border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-blue-600 active:scale-95 transition-all shadow-sm bg-white shrink-0"><i className={`bi bi-arrow-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i></button>
                  </div>
                </div>
                
                <div className="overflow-auto flex-1 relative rounded-b-2xl bg-slate-50/30">
                  <table className="w-full text-left border-collapse"> 
                    <thead className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                      <tr className="text-slate-500 text-[11px] uppercase font-extrabold tracking-wider">
                        <th className="py-4 px-6 w-32">Date</th>
                        <th className="py-4 px-6">Machine Details</th>
                        <th className="py-4 px-6">Part Details</th>
                        <th className="py-4 px-4 text-center">Qty</th>
                        <th className="py-4 px-6 w-48">Change Reason</th>
                        <th className="py-4 px-6 text-center w-32">Actions</th>
                      </tr>
                    </thead> 
                    <tbody className="text-sm bg-white"> 
                      {changeHistoryData.map((row, idx) => {
                        const isConsumable = row.PartID.startsWith('CSM-');
                        const pName = isConsumable ? consumables.find(c => c.ItemID === row.PartID)?.ItemName || row.PartID : parts.find(p => p.PartID === row.PartID)?.PartName || row.PartID;
                        const mName = machines.find(m => m.MachineID === row.MachineID)?.MachineName || row.MachineID;
                        
                        return (
                          <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors duration-200">
                            <td className="py-4 px-6 font-bold text-slate-600">{row.ChangeDate}</td>
                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-800">{mName}</div>
                              <div className="text-[11px] text-slate-500 font-medium">ID: {row.MachineID}</div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-bold text-blue-700">{pName}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">Pos: {row.Position || '-'}</div>
                            </td>
                            <td className="py-4 px-4 text-center font-black text-slate-800">{row['Required Qty'] || 0}</td>
                            <td className="py-4 px-6">
                              <div className="relative">
                                <select 
                                  value={row.ReasonType} 
                                  onChange={(e) => handleChangeReason(row.RecordID, e.target.value)}
                                  className={`w-full p-2 rounded-lg text-xs font-bold border outline-none appearance-none cursor-pointer transition-colors ${row.ReasonType === 'Normal Wear' ? 'bg-red-50 text-red-700 border-red-200' : row.ReasonType === 'Accident' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                                >
                                  <option value="Normal Wear">Normal Wear</option>
                                  <option value="Accident">Accident</option>
                                  <option value="Improvement">Improvement</option>
                                  <option value="Inspection-OK">Inspection-OK</option>
                                  <option value="Consumable">Consumable (สิ้นเปลือง)</option>
                                </select>
                                <i className="bi bi-pencil-fill absolute right-3 top-1/2 -translate-y-1/2 text-opacity-50 text-[10px] pointer-events-none"></i>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button onClick={() => handleUndoTransaction(row)} className="text-xs font-bold px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 mx-auto">
                                <i className="bi bi-arrow-counterclockwise"></i> Undo
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {changeHistoryData.length === 0 && (
                        <tr><td colSpan={6} className="py-12 text-center text-slate-400 font-bold bg-slate-50/30">No history found for this month</td></tr>
                      )}
                    </tbody> 
                  </table> 
                </div>
              </div>
            </div>
          )}

          {/* TAB: BASIC INFO */}
          {activeTab === 'basic-info' && ( 
            <div className="absolute inset-0 p-6 md:p-10 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-800">Basic Information</h2>
                <p className="text-slate-500 mt-1">Manage master data for cabinet locations and production lines.</p>
              </div>
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-0 overflow-hidden">
                  <div className="bg-[#0ea5e9] text-white p-5 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg"><i className="bi bi-box-seam-fill mr-2"></i> Cabinet Location</h3>
                    <button onClick={() => setBasicInfoModal({ isOpen: true, type: 'location' })} className="text-sm font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"><i className="bi bi-plus-lg mr-1"></i> Add New</button>
                  </div>
                  <div className="overflow-y-auto flex-1 bg-slate-50/30">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr className="text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                          <th className="py-4 px-6 w-16">No.</th>
                          <th className="py-4 px-6">Location Name</th>
                          <th className="py-4 px-6 text-center w-24">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {locationsMaster.map((loc, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-white transition-colors">
                            <td className="py-4 px-6 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-4 px-6 font-bold text-slate-700">{loc.LocationName}</td>
                            <td className="py-4 px-6 text-center">
                              <button onClick={() => handleDeleteBasicInfo('location', loc.LocationName)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><i className="bi bi-trash-fill"></i></button>
                            </td>
                          </tr>
                        ))}
                        {locationsMaster.length === 0 && (<tr><td colSpan={3} className="py-8 text-center text-slate-400">No data available</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-0 overflow-hidden">
                  <div className="bg-[#0ea5e9] text-white p-5 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg"><i className="bi bi-diagram-3-fill mr-2"></i> Production Line</h3>
                    <button onClick={() => setBasicInfoModal({ isOpen: true, type: 'line' })} className="text-sm font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"><i className="bi bi-plus-lg mr-1"></i> Add New</button>
                  </div>
                  <div className="overflow-y-auto flex-1 bg-slate-50/30">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr className="text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                          <th className="py-4 px-6 w-16">No.</th>
                          <th className="py-4 px-6">Line Name</th>
                          <th className="py-4 px-6 text-center w-24">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {linesMaster.map((line, idx) => (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-white transition-colors">
                            <td className="py-4 px-6 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-4 px-6 font-bold text-slate-700">{line.LineName}</td>
                            <td className="py-4 px-6 text-center">
                              <button onClick={() => handleDeleteBasicInfo('line', line.LineName)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><i className="bi bi-trash-fill"></i></button>
                            </td>
                          </tr>
                        ))}
                        {linesMaster.length === 0 && (<tr><td colSpan={3} className="py-8 text-center text-slate-400">No data available</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LOG RECORD */}
          {activeTab === 'log-record' && ( 
            <div className="absolute inset-0 p-6 md:p-10 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-10 flex flex-col">
                <h3 className="text-2xl font-black text-slate-800 mb-8 border-b border-slate-100 pb-6 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><i className="bi bi-tools"></i></div> Manual Record Replacement</h3>
                <form className="space-y-8" onSubmit={handleLogRecord}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">1. Machine</label>
                      <div className="relative">
                        <input type="text" name="machineId" list="machine-list" required placeholder="-- Type to search machine --" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm transition-all focus:bg-white" />
                        <i className="bi bi-search absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                      </div>
                      <datalist id="machine-list">
                        {machines.map(m => <option key={m.MachineID} value={`${m.MachineID} - ${m.MachineName}`} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">2. Part Name</label>
                      <div className="relative">
                        <input type="text" name="partId" list="part-list" required placeholder="-- Type to search part --" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm transition-all focus:bg-white" />
                        <i className="bi bi-search absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                      </div>
                      <datalist id="part-list">
                        {parts.map(p => <option key={p.PartID} value={`${p.PartID} - ${p.PartName} ${p.PartModel ? `(${p.PartModel})` : ''}`} />)}
                      </datalist>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div><label className="block text-xs font-bold text-slate-600 mb-2 uppercase">3. Request Qty</label><input type="number" name="qty" min="1" required defaultValue="1" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm transition-all focus:bg-white" /></div>
                    <div><label className="block text-xs font-bold text-slate-600 mb-2 uppercase">4. Picker Name</label><input type="text" name="picker" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm transition-all focus:bg-white" /></div>
                    <div><label className="block text-xs font-bold text-slate-600 mb-2 uppercase">5. Change Date</label><input type="date" name="date" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 font-medium transition-colors focus:bg-white" /></div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">6. Reason for Replacement</label>
                    <div className="relative">
                      <select name="reason" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-sm transition-all focus:bg-white appearance-none">
                        <option value="Normal Wear">Normal Wear - Track lifespan</option>
                        <option value="Accident">Accident - Reset without averaging</option>
                        <option value="Improvement">Improvement - Reset lifespan</option>
                      </select>
                      <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    </div>
                  </div>
                  <button type="submit" className="w-full mt-4 bg-blue-600 text-white font-bold py-5 rounded-2xl shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all text-lg"><i className="bi bi-save2 mr-2"></i>Save & Deduct Stock</button>
                </form>
              </div>
            </div> 
          )}
        </div>
      </main>
    </div>
  );
}
