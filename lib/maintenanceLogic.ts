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

// 🌟 ตัวช่วยแปลงวันที่เป็น Local Time (ป้องกันปัญหา Timezone เลื่อน 1 วัน)
const toLocalDateString = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
};

export async function getSmartMaintenanceData(activeDepartment?: string | null) {
  try {
    // 🚨 เพิ่ม .limit(10000) ป้องกัน Supabase ตัดข้อมูลแค่ 1,000 แถว
    let partsQuery = supabase.from('Part').select('*').limit(5000);
    let stockQuery = supabase.from('Stock').select('*').limit(10000);
    let machinesQuery = supabase.from('Machine').select('*').limit(2000);
    let historyQuery = supabase.from('ChangeHistory').select('*').order('ChangeDate', { ascending: true }).limit(20000);
    let leadTimeQuery = supabase.from('LeadTime').select('*').order('RecordDate', { ascending: false }).limit(5000);

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
      { data: leadTimeData }
    ] = await Promise.all([partsQuery, stockQuery, machinesQuery, historyQuery, leadTimeQuery]);

    const rawParts = partsData || [];
    const rawStock = stockData || [];
    const rawMachines = machinesData || [];
    const rawHistory = historyData || [];
    const rawLeadTimes = leadTimeData || []; 
    
    const rawLines = Array.from(new Set(rawMachines.map(m => m.LineName).filter(Boolean)));

    // ==========================================
    // 🚀 0. สร้าง Hash Maps (Lookup Tables) เพื่อตัดปัญหา O(n^2)
    // ==========================================
    const partMap = new Map(rawParts.map(p => [p.PartID, p]));
    const machineMap = new Map(rawMachines.map(m => [m.MachineID, m]));
    
    // ดึง Lead Time ล่าสุดของแต่ละอะไหล่มาเก็บไว้
    const leadTimeMap = new Map();
    rawLeadTimes.forEach(lt => {
      // เนื่องจากเรา order จากใหม่ไปเก่าข้างบนแล้ว ตัวแรกที่เจอคือล่าสุด
      if (!leadTimeMap.has(lt.PartID)) {
        leadTimeMap.set(lt.PartID, lt.LeadTimeDays || 0);
      }
    });

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
      lastChangeDates[key] = record.ChangeDate;
    });

    const mtbfData: { [machine_part_pos: string]: number } = {};
    Object.keys(failureSpans).forEach(key => {
      const spans = failureSpans[key];
      if (spans.length > 0) {
        mtbfData[key] = Math.round(spans.reduce((a, b) => a + b, 0) / spans.length);
      }
    });

    // ==========================================
    // 2. คำนวณ AI Predictions
    // ==========================================
    const predictions: any[] = [];
    Object.keys(lastChangeDates).forEach(key => {
      const [machineId, partId, pos] = key.split('_');
      
      // 🚀 ใช้ Map เร็วกว่า Array.find() มหาศาล
      const partInfo = partMap.get(partId);
      if (!partInfo) return;

      const mtbf = mtbfData[key] || 180; 
      const leadTimeDays = leadTimeMap.get(partId) || 0;
      const bufferDays = partInfo.SafetyBufferDays || 7;
      const totalAdvanceDays = leadTimeDays + bufferDays;

      const lastDate = new Date(lastChangeDates[key]);
      
      const predictedFailDate = new Date(lastDate);
      predictedFailDate.setDate(predictedFailDate.getDate() + mtbf);
      
      const orderDate = new Date(predictedFailDate);
      orderDate.setDate(orderDate.getDate() - totalAdvanceDays);

      predictions.push({
        machineId,
        partId,
        position: pos,
        mtbfDays: mtbf,
        // 🌟 ใช้ตัวแก้ Timezone
        predictedFailDate: toLocalDateString(predictedFailDate),
        orderDate: toLocalDateString(orderDate),
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
    today.setHours(0,0,0,0);

    predictions.forEach(pred => {
      // 🚀 ใช้ Map ดึงข้อมูล ทะลวงความเร็ว
      const mInfo = machineMap.get(pred.machineId);
      const pInfo = partMap.get(pred.partId);
      
      if (!mInfo || !pInfo) return;

      const pOrderDate = new Date(pred.orderDate);
      pOrderDate.setHours(0,0,0,0);
      
      const diffDays = Math.ceil((pOrderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let status = 'NORMAL';
      let alertLevel = 0;

      if (diffDays <= 7 && diffDays >= 0) {
        status = 'ORDER NOW'; alertLevel = 2;
        allocations[pred.partId].reserved += pred.reqQty;
        allocations[pred.partId].available -= pred.reqQty;
        allocations[pred.partId].machines.push(pred.position !== '-' ? `${mInfo.MachineName}(${pred.position})` : mInfo.MachineName);
      } else if (diffDays < 0) {
        status = 'OVERDUE'; alertLevel = 3;
        allocations[pred.partId].reserved += pred.reqQty;
        allocations[pred.partId].available -= pred.reqQty;
        allocations[pred.partId].machines.push(pred.position !== '-' ? `${mInfo.MachineName}(${pred.position})` : mInfo.MachineName);
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