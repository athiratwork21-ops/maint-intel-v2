"use client";
import React, { useState, useEffect } from 'react';
import { supabaseServiceWork } from '../../lib/supabase-servicework'; 

// =====================================================================
// 📦 1. Component: Master Data (จัดการข้อมูลพื้นฐาน)
// =====================================================================
function MasterDataTab({ fetchData }: any) {
  const [isProcessing, setIsProcessing] = useState(false);
  const handleAdd = async (e: any, table: string, data: any) => {
    e.preventDefault(); setIsProcessing(true);
    const { error } = await supabaseServiceWork.from(table).insert([data]);
    if (error) alert(error.message); else { e.target.reset(); fetchData(); }
    setIsProcessing(false);
  };
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h2 className="text-lg font-black mb-4 flex items-center gap-2"><i className="bi bi-box-seam text-blue-600"></i> เพิ่มวัตถุดิบ (Parts)</h2>
        <form onSubmit={(e:any) => handleAdd(e, 'master_parts', { part_no: e.target.pn.value, part_name: e.target.name.value })} className="flex gap-4">
          <input name="pn" placeholder="P/N" required className="flex-1 p-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" />
          <input name="name" placeholder="ชื่อวัตถุดิบ" required className="flex-1 p-3 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm" />
          <button type="submit" disabled={isProcessing} className="bg-blue-600 text-white font-bold px-6 rounded-xl hover:bg-blue-700 active:scale-95 transition-all">เพิ่ม</button>
        </form>
      </div>
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h2 className="text-lg font-black mb-4 flex items-center gap-2"><i className="bi bi-people text-indigo-600"></i> เพิ่มพนักงาน (Staff)</h2>
        <form onSubmit={(e:any) => handleAdd(e, 'master_staff', { emp_id: e.target.id.value, emp_name: e.target.name.value })} className="flex gap-4">
          <input name="id" placeholder="รหัสพนักงาน" required className="flex-1 p-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" />
          <input name="name" placeholder="ชื่อ-สกุล" required className="flex-1 p-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm" />
          <button type="submit" disabled={isProcessing} className="bg-indigo-600 text-white font-bold px-6 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all">เพิ่ม</button>
        </form>
      </div>
    </div>
  );
}

// =====================================================================
// 🎫 2. Component: Dispatch Tab (สร้างตั๋วจ่ายงาน)
// =====================================================================
function DispatchTab({ parts, staff, lines, onTicketCreated }: any) {
  const [isProcessing, setIsProcessing] = useState(false);
  const handleDispatchSubmit = async (e: any) => {
    e.preventDefault(); setIsProcessing(true);
    const formData = new FormData(e.currentTarget);
    const ticket_no = `TK-${Date.now()}`;
    const { error } = await supabaseServiceWork.from('job_tickets').insert([{
      ticket_no, wo_number: formData.get('wo'), assign_to: formData.get('staff'),
      target_line: formData.get('line'), part_no: formData.get('part'),
      quantity: parseInt(formData.get('qty') as string), status: 'Pending'
    }]);
    if (error) alert(error.message); else { alert('สร้างตั๋วสำเร็จ!'); e.target.reset(); onTicketCreated(); }
    setIsProcessing(false);
  };
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
      <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2"><i className="bi bi-plus-circle-fill text-blue-600"></i> ออกตั๋วจ่ายวัตถุดิบ</h2>
      <form onSubmit={handleDispatchSubmit} className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">Work Order (W/O)</label><input name="wo" required className="w-full p-4 rounded-xl border outline-none focus:ring-2 focus:ring-blue-500 font-bold" /></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">จ่ายงานให้ใคร</label><select name="staff" required className="w-full p-4 rounded-xl border appearance-none font-bold"><option value="">-- เลือกพนักงาน --</option>{staff.map((s:any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">ส่งที่ไหน (Line)</label><select name="line" required className="w-full p-4 rounded-xl border appearance-none font-bold"><option value="">-- เลือก Line --</option>{lines.map((l:any) => <option key={l} value={l}>{l}</option>)}</select></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">วัตถุดิบ</label><select name="part" required className="w-full p-4 rounded-xl border appearance-none font-bold"><option value="">-- เลือก P/N --</option>{parts.map((p:any) => <option key={p.pn} value={p.pn}>{p.pn} - {p.name}</option>)}</select></div>
          <div><label className="block text-xs font-bold text-slate-500 mb-1">จำนวน</label><input type="number" name="qty" min="1" defaultValue="1" required className="w-full p-4 rounded-xl border outline-none font-bold text-lg text-blue-600" /></div>
        </div>
        <button type="submit" disabled={isProcessing} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50">บันทึกและออกตั๋วงาน</button>
      </form>
    </div>
  );
}

// =====================================================================
// 📋 3. Component: Job Board (กระดานคุมงาน)
// =====================================================================
function JobBoard({ tickets, fetchAll }: any) {
  const handleComplete = async (ticket: any) => {
    if(!confirm(`ยืนยันการจ่ายของตั๋ว ${ticket.ticket_no}?`)) return;
    // 1. อัปเดตสถานะตั๋ว
    await supabaseServiceWork.from('job_tickets').update({ status: 'Completed', completed_at: new Date().toISOString() }).eq('ticket_no', ticket.ticket_no);
    // 2. หักสต๊อก (ดึงยอดเก่ามาหัก)
    const { data: inv } = await supabaseServiceWork.from('inventory').select('balance').eq('part_no', ticket.part_no).single();
    const newBal = (inv?.balance || 0) - ticket.quantity;
    await supabaseServiceWork.from('inventory').upsert({ part_no: ticket.part_no, balance: newBal, last_updated: new Date().toISOString() });
    // 3. บันทึก Log บรรลัย
    await supabaseServiceWork.from('transaction_log').insert({ action_type: 'DISPATCH_OUT', part_no: ticket.part_no, quantity: ticket.quantity, emp_id: ticket.assign_to, ref_ticket_no: ticket.ticket_no });
    alert('จ่ายของและหักสต๊อกเรียบร้อย!'); fetchAll();
  };

  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-2xl font-black text-slate-800 mb-6">กระดานติดตามงาน (Live)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tickets.map((t: any) => (
          <div key={t.ticket_no} className={`p-5 rounded-3xl border shadow-sm ${t.status === 'Completed' ? 'bg-emerald-50/50 border-emerald-100 opacity-70' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-start mb-3">
              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${t.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{t.status}</span>
              <span className="text-[10px] text-slate-400 font-bold">{new Date(t.created_at).toLocaleTimeString()}</span>
            </div>
            <h3 className="font-black text-slate-800">{t.ticket_no}</h3>
            <p className="text-xs text-slate-500 font-bold mt-1">W/O: {t.wo_number}</p>
            <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1">
              <p className="text-xs font-bold text-slate-700"><i className="bi bi-box-seam mr-2"></i>{t.part_no}</p>
              <p className="text-xl font-black text-blue-600">{t.quantity} <span className="text-xs text-slate-400 uppercase">Units</span></p>
            </div>
            <p className="text-xs font-bold text-slate-600 mt-4"><i className="bi bi-person-fill text-indigo-500 mr-2"></i>จ่ายให้: {t.assign_to}</p>
            <p className="text-xs font-bold text-slate-600 mt-1"><i className="bi bi-geo-alt-fill text-red-500 mr-2"></i>ไลน์: {t.target_line}</p>
            {t.status === 'Pending' && (
              <button onClick={() => handleComplete(t)} className="w-full mt-5 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 active:scale-95 transition-all">จ่ายของเสร็จสิ้น</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
// 🌪️ 4. Component: Inventory & Log (สต๊อกและประวัติความบรรลัย)
// =====================================================================
function InventoryTab({ inventory, logs, fetchData }: any) {
  const [subTab, setSubTab] = useState('stock');
  const handleReceive = async () => {
    const pn = prompt("ระบุ P/N ที่ต้องการรับเข้า:"); if(!pn) return;
    const qty = prompt("จำนวนที่รับเข้า:"); if(!qty) return;
    // 1. เพิ่มสต๊อก
    const { data: inv } = await supabaseServiceWork.from('inventory').select('balance').eq('part_no', pn).single();
    const newBal = (inv?.balance || 0) + parseInt(qty);
    await supabaseServiceWork.from('inventory').upsert({ part_no: pn, balance: newBal, last_updated: new Date().toISOString() });
    // 2. บันทึก Log
    await supabaseServiceWork.from('transaction_log').insert({ action_type: 'RECEIVE_IN', part_no: pn, quantity: parseInt(qty), notes: 'รับของเข้าคลัง' });
    fetchData(); alert('รับของเข้าสำเร็จ!');
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex gap-4 mb-8">
        <button onClick={() => setSubTab('stock')} className={`px-6 py-2 rounded-full font-bold transition-all ${subTab === 'stock' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>คงเหลือปัจจุบัน</button>
        <button onClick={() => setSubTab('log')} className={`px-6 py-2 rounded-full font-bold transition-all ${subTab === 'log' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>ประวัติ Log บรรลัย</button>
        <button onClick={handleReceive} className="ml-auto bg-emerald-600 text-white font-bold px-6 py-2 rounded-full hover:bg-emerald-700 active:scale-95 transition-all">+ รับของเข้า (In)</button>
      </div>

      {subTab === 'stock' ? (
        <div className="overflow-hidden border rounded-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black">
              <tr><th className="p-4">P/N</th><th className="p-4 text-center">ยอดคงเหลือ</th><th className="p-4 text-right">อัปเดตล่าสุด</th></tr>
            </thead>
            <tbody className="text-sm font-bold">
              {inventory.map((i:any) => (
                <tr key={i.part_no} className="border-t"><td className="p-4">{i.part_no}</td><td className="p-4 text-center text-blue-600 text-lg">{i.balance}</td><td className="p-4 text-right text-slate-400 font-normal">{new Date(i.last_updated).toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden border rounded-2xl h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white text-[10px] uppercase font-black sticky top-0">
              <tr><th className="p-4">เวลา</th><th className="p-4">รายการ</th><th className="p-4">Action</th><th className="p-4 text-center">จำนวน</th><th className="p-4">พนักงาน/อ้างอิง</th></tr>
            </thead>
            <tbody className="text-sm">
              {logs.map((l:any) => (
                <tr key={l.log_id} className="border-t hover:bg-slate-50">
                  <td className="p-4 text-[11px] text-slate-400">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="p-4 font-black">{l.part_no}</td>
                  <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-black ${l.action_type === 'RECEIVE_IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{l.action_type}</span></td>
                  <td className="p-4 text-center font-black">{l.quantity}</td>
                  <td className="p-4 text-[11px] font-bold text-slate-500">{l.emp_id || l.ref_ticket_no || l.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// 🚀 5. MAIN PORTAL COMPONENT
// =====================================================================
export default function ServiceWorkPortal() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('board');
  const [data, setData] = useState({ parts: [], staff: [], lines: [], tickets: [], inventory: [], logs: [] });
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const { data: parts } = await supabaseServiceWork.from('master_parts').select('*');
    const { data: staff } = await supabaseServiceWork.from('master_staff').select('*');
    const { data: lines } = await supabaseServiceWork.from('master_lines').select('*');
    const { data: tickets } = await supabaseServiceWork.from('job_tickets').select('*').order('created_at', { ascending: false });
    const { data: inv } = await supabaseServiceWork.from('inventory').select('*').order('balance', { ascending: true });
    const { data: logs } = await supabaseServiceWork.from('transaction_log').select('*').order('timestamp', { ascending: false }).limit(200);
    
    setData({
      parts: parts?.map(p => ({ pn: p.part_no, name: p.part_name })) || [],
      staff: staff?.map(s => ({ id: s.emp_id, name: s.emp_name })) || [],
      lines: lines?.map(l => l.line_name) || [],
      tickets: tickets || [],
      inventory: inv || [],
      logs: logs || []
    });
    setLoading(false);
  };

  useEffect(() => { if (isAuthenticated) fetchAll(); }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <form onSubmit={(e:any) => { e.preventDefault(); if(password === 'admin') setIsAuthenticated(true); else alert('Wrong!'); }} className="bg-white/10 p-10 rounded-3xl backdrop-blur-xl border border-white/20 text-center">
          <div className="w-20 h-20 bg-blue-500 rounded-2xl mx-auto mb-6 flex items-center justify-center text-4xl text-white shadow-xl shadow-blue-500/20"><i className="bi bi-hdd-network"></i></div>
          <h1 className="text-white text-2xl font-black mb-6">Service Work Portal</h1>
          <input type="password" placeholder="Passcode" className="w-full p-4 rounded-xl mb-4 text-center font-black outline-none focus:ring-2 focus:ring-blue-500" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all">ACCESS DATABASE</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col">
      <header className="bg-white border-b p-4 px-8 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <h1 className="text-xl font-black flex items-center gap-3"><i className="bi bi-box-seam-fill text-blue-600"></i> MATERIAL SERVICE WORK</h1>
        <div className="flex gap-4">
            <button onClick={fetchAll} className="p-2 px-4 rounded-xl bg-slate-50 border font-bold text-slate-500 hover:bg-white active:scale-90 transition-all">RELOAD</button>
            <button onClick={() => setIsAuthenticated(false)} className="p-2 px-4 rounded-xl bg-red-50 border-red-100 text-red-600 font-bold active:scale-90 transition-all">EXIT</button>
        </div>
      </header>
      <div className="flex-1 flex max-w-[1600px] mx-auto w-full p-8 gap-8">
        <div className="w-64 shrink-0 space-y-2">
          {['board', 'dispatch', 'inventory', 'master'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full text-left px-6 py-4 rounded-2xl font-black transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'}`}>
                {tab === 'board' && <><i className="bi bi-kanban mr-3"></i>JOB BOARD</>}
                {tab === 'dispatch' && <><i className="bi bi-plus-circle mr-3"></i>CREATE TICKET</>}
                {tab === 'inventory' && <><i className="bi bi-box-seam mr-3"></i>STOCK & LOG</>}
                {tab === 'master' && <><i className="bi bi-gear mr-3"></i>SETTING</>}
            </button>
          ))}
        </div>
        <div className="flex-1 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 min-h-[700px] relative overflow-hidden">
          {loading && <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-[100] flex items-center justify-center font-black text-blue-600 animate-pulse">CONNECTING DATA...</div>}
          {activeTab === 'board' && <JobBoard tickets={data.tickets} fetchAll={fetchAll} />}
          {activeTab === 'dispatch' && <DispatchTab parts={data.parts} staff={data.staff} lines={data.lines} onTicketCreated={() => { setActiveTab('board'); fetchAll(); }} />}
          {activeTab === 'inventory' && <InventoryTab inventory={data.inventory} logs={data.logs} fetchData={fetchAll} />}
          {activeTab === 'master' && <MasterDataTab fetchData={fetchAll} />}
        </div>
      </div>
    </div>
  );
}
