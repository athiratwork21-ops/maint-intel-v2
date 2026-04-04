import { supabase } from './supabase';

export interface DashboardReport { 
  machineId: string; 
  machine: string; 
  line: string; 
  partId: string; 
  partName: string; 
  reqQty: number; 
  orderDate: string; 
  dueDate: string; 
  status: string; 
  alertLevel: number; 
  mtbfDays: number; 
}

export async function getSmartMaintenanceData(activeDepartment?: string | null) {
  try {
    let partsQuery = supabase.from('Part').select('*');
    let stockQuery = supabase.from('Stock').select('*');
    let machinesQuery = supabase.from('Machine').select('*');
    let historyQuery = supabase.from('ChangeHistory').select('*').order('ChangeDate', { ascending: true });
    // 🌟 ดึงข้อมูลตาราง LeadTime มาด้วยเรียงจากใหม่ไปเก่า
    let leadTimeQuery = supabase.from('LeadTime').select('*').order('RecordDate', { ascending: false });

    if (activeDepartment) {
      partsQuery = partsQuery.eq('DepartmentID', activeDepartment);
      stockQuery = stockQuery.eq('DepartmentID', activeDepartment);
      machinesQuery = machinesQuery.eq('DepartmentID', activeDepartment);
      historyQuery = historyQuery.eq('DepartmentID', activeDepartment);
      leadTimeQuery = leadTimeQuery.eq('DepartmentID', activeDepartment);
    }

    const [
      { data: partsData },
      { data: stockData },
      { data: machinesData },
      { data: historyData },
      { data: leadTimeData } // 🌟 รับข้อมูล LeadTime
    ] = await Promise.all([partsQuery, stockQuery, machinesQuery, historyQuery, leadTimeQuery]);

    const rawParts = partsData || [];
    const rawStock = stockData || [];
    const rawMachines = machinesData || [];
    const rawHistory = historyData || [];
    const rawLeadTimes = leadTimeData || []; 
    
    const rawLines = Array.from(new Set(rawMachines.map(m => m.LineName).filter(Boolean)));

    // ==========================================
    // 1. คำนวณ MTBF แยกตามจุดติดตั้ง (Position)
    // ==========================================
    const failureSpans: { [machine_part_pos: string]: number[] } = {};
    const lastChangeDates: { [machine_part_pos: string]: string } = {};

    rawHistory.forEach(record => {
      const pos = record.Position || '-';
      const key = `${record.MachineID}_${record.PartID}_${pos}`; 
      const changeDate = new Date(record.ChangeDate);

      if (!failureSpans[key]) failureSpans[key] = [];

      // 🌟 FIX BUG ประเด็นที่ 1: คิด MTBF เฉพาะ Normal Wear
      if (record.ReasonType === 'Normal Wear') {
        if (lastChangeDates[key]) {
          const previousDate = new Date(lastChangeDates[key]);
          const diffTime = Math.abs(changeDate.getTime() - previousDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            failureSpans[key].push(diffDays);
          }
        }
      }

      // 🌟 FIX BUG ประเด็นที่ 1: แต่ "วันเปลี่ยนล่าสุด" ต้องรีเซ็ตเสมอ ไม่ว่าจะเปลี่ยนด้วยเหตุผลอะไร!
      lastChangeDates[key] = record.ChangeDate;
    });

    const mtbfData: { [machine_part_pos: string]: number } = {};
    Object.keys(failureSpans).forEach(key => {
      const spans = failureSpans[key];
      if (spans.length > 0) {
        const avg = spans.reduce((a, b) => a + b, 0) / spans.length;
        mtbfData[key] = Math.round(avg);
      }
    });

    // ==========================================
    // 2. คำนวณ AI Predictions (นำ Lead Time มาใช้)
    // ==========================================
    const predictions: any[] = [];
    Object.keys(lastChangeDates).forEach(key => {
      const [machineId, partId, pos] = key.split('_');
      const partInfo = rawParts.find(p => p.PartID === partId);
      if (!partInfo) return;

      const mtbf = mtbfData[key] || 180; 
      
      // 🌟 FIX BUG ประเด็นที่ 2: หา Lead Time ของอะไหล่ชิ้นนี้ (ถ้าไม่มีให้เป็น 0)
      const partLeadTimeRecord = rawLeadTimes.find(lt => lt.PartID === partId);
      const leadTimeDays = partLeadTimeRecord ? (partLeadTimeRecord.LeadTimeDays || 0) : 0;
      
      const bufferDays = partInfo.SafetyBufferDays || 7;
      
      // รวมจำนวนวันที่ต้องสั่งล่วงหน้าทั้งหมด = (รอของส่ง + เผื่อเวลาปลอดภัย)
      const totalAdvanceDays = leadTimeDays + bufferDays;

      const lastDate = new Date(lastChangeDates[key]);
      
      // คำนวณวันคาดว่าจะพัง
      const predictedFailDate = new Date(lastDate);
      predictedFailDate.setDate(predictedFailDate.getDate() + mtbf);
      
      // 🌟 คำนวณวันสั่งซื้อใหม่ ถอยหลังไปตาม totalAdvanceDays
      const orderDate = new Date(predictedFailDate);
      orderDate.setDate(orderDate.getDate() - totalAdvanceDays);

      predictions.push({
        machineId,
        partId,
        position: pos,
        mtbfDays: mtbf,
        predictedFailDate: predictedFailDate.toISOString().split('T')[0],
        orderDate: orderDate.toISOString().split('T')[0],
        reqQty: 1 
      });
    });

    // ==========================================
    // 3. รวม Stock จริงจากหน้าตู้
    // ==========================================
    const totalStock: { [partId: string]: number } = {};
    rawStock.forEach(s => {
      totalStock[s.PartID] = (totalStock[s.PartID] || 0) + (s.Balance || 0);
    });

    const allocations: { [partId: string]: { physical: number, reserved: number, available: number, machines: string[] } } = {};
    
    rawParts.forEach(p => {
      allocations[p.PartID] = {
        physical: totalStock[p.PartID] || 0,
        reserved: 0,
        available: totalStock[p.PartID] || 0,
        machines: []
      };
    });

    // ==========================================
    // 4. สร้าง Dashboard Report & หักยอดจองล่วงหน้า
    // ==========================================
    const scheduleData: DashboardReport[] = [];
    const today = new Date();
    // ตัดเวลาทิ้งให้เทียบแค่วันที่ (เพื่อให้การจัดสถานะแม่นยำขึ้น)
    today.setHours(0,0,0,0);

    predictions.forEach(pred => {
      const mInfo = rawMachines.find(m => m.MachineID === pred.machineId);
      const pInfo = rawParts.find(p => p.PartID === pred.partId);
      if (!mInfo || !pInfo) return;

      const pOrderDate = new Date(pred.orderDate);
      pOrderDate.setHours(0,0,0,0);
      
      const diffDays = Math.ceil((pOrderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let status = 'NORMAL';
      let alertLevel = 0;

      // ถ้าเข้าสู่ช่วงสั่งของแล้ว (<= 0 หมายถึงถึงวันสั่งแล้ว หรือเลยมาแล้ว)
      // หรือเหลือเวลาอีกไม่เกิน 7 วันจะถึงวันสั่งซื้อ (สั่งล่วงหน้าได้)
      if (diffDays <= 7 && diffDays >= 0) {
        status = 'ORDER NOW'; alertLevel = 2;
        allocations[pred.partId].reserved += pred.reqQty;
        allocations[pred.partId].available -= pred.reqQty;
        const displayMachine = pred.position !== '-' ? `${mInfo.MachineName}(${pred.position})` : mInfo.MachineName;
        allocations[pred.partId].machines.push(displayMachine);
      } else if (diffDays < 0) {
        status = 'OVERDUE'; alertLevel = 3;
        allocations[pred.partId].reserved += pred.reqQty;
        allocations[pred.partId].available -= pred.reqQty;
        const displayMachine = pred.position !== '-' ? `${mInfo.MachineName}(${pred.position})` : mInfo.MachineName;
        allocations[pred.partId].machines.push(displayMachine);
      } else if (allocations[pred.partId].available > 0) {
        status = 'IN STOCK'; alertLevel = 1;
      }

      scheduleData.push({
        machineId: pred.machineId,
        machine: mInfo.MachineName,
        line: mInfo.LineName,
        partId: pred.partId,
        partName: pInfo.PartName + (pred.position !== '-' ? ` [จุด: ${pred.position}]` : ''), 
        reqQty: pred.reqQty,
        orderDate: pred.orderDate,
        dueDate: pred.predictedFailDate,
        status,
        alertLevel,
        mtbfDays: pred.mtbfDays
      });
    });

    let outOfStockCount = 0;
    let overdueCount = 0;
    scheduleData.forEach(s => {
      if (s.status === 'OVERDUE') overdueCount++;
      const available = allocations[s.partId]?.available || 0;
      if ((s.status === 'ORDER NOW' || s.status === 'OVERDUE') && available <= 0) {
        outOfStockCount++;
      }
    });

    scheduleData.sort((a, b) => b.alertLevel - a.alertLevel);

    return {
      rawParts, rawStock, rawMachines, rawLines, rawHistory,
      scheduleData, allocations,
      stats: { machines: rawMachines.length, parts: rawParts.length, outOfStock: outOfStockCount, overdue: overdueCount }
    };
  } catch (error) {
    console.error("Logic Error:", error);
    throw error;
  }
}
