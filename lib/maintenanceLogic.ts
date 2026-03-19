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

    if (activeDepartment) {
      partsQuery = partsQuery.eq('DepartmentID', activeDepartment);
      stockQuery = stockQuery.eq('DepartmentID', activeDepartment);
      machinesQuery = machinesQuery.eq('DepartmentID', activeDepartment);
      historyQuery = historyQuery.eq('DepartmentID', activeDepartment);
    }

    const [
      { data: partsData },
      { data: stockData },
      { data: machinesData },
      { data: historyData }
    ] = await Promise.all([partsQuery, stockQuery, machinesQuery, historyQuery]);

    const rawParts = partsData || [];
    const rawStock = stockData || [];
    const rawMachines = machinesData || [];
    const rawHistory = historyData || [];
    
    const rawLines = Array.from(new Set(rawMachines.map(m => m.LineName).filter(Boolean)));

    // 1. คำนวณ MTBF แยกตามจุดติดตั้ง (Position)
    const failureSpans: { [machine_part_pos: string]: number[] } = {};
    const lastChangeDates: { [machine_part_pos: string]: string } = {};

    rawHistory.forEach(record => {
      if (record.ReasonType === 'Accident' || record.ReasonType === 'Improvement') return;

      const pos = record.Position || '-';
      const key = `${record.MachineID}_${record.PartID}_${pos}`; 
      const changeDate = new Date(record.ChangeDate);

      if (!failureSpans[key]) failureSpans[key] = [];

      if (lastChangeDates[key]) {
        const previousDate = new Date(lastChangeDates[key]);
        const diffTime = Math.abs(changeDate.getTime() - previousDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          failureSpans[key].push(diffDays);
        }
      }
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

    // 2. คำนวณ AI Predictions
    const predictions: any[] = [];
    Object.keys(lastChangeDates).forEach(key => {
      const [machineId, partId, pos] = key.split('_');
      const partInfo = rawParts.find(p => p.PartID === partId);
      if (!partInfo) return;

      const mtbf = mtbfData[key] || 180; 
      const bufferDays = partInfo.SafetyBufferDays || 7;
      const lastDate = new Date(lastChangeDates[key]);
      
      const predictedFailDate = new Date(lastDate);
      predictedFailDate.setDate(predictedFailDate.getDate() + mtbf);
      
      const orderDate = new Date(predictedFailDate);
      orderDate.setDate(orderDate.getDate() - bufferDays);

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

    // 3. รวม Stock จริงจากหน้าตู้
    const totalStock: { [partId: string]: number } = {};
    rawStock.forEach(s => {
      totalStock[s.PartID] = (totalStock[s.PartID] || 0) + (s.Balance || 0);
    });

    // 🌟 🌟 🌟 FIX BUG: ใส่ยอดสต๊อกให้ "อะไหล่ทุกชิ้น" (แม้จะเพิ่งแอดใหม่และไม่เคยเสีย) 
    const allocations: { [partId: string]: { physical: number, reserved: number, available: number, machines: string[] } } = {};
    
    rawParts.forEach(p => {
      allocations[p.PartID] = {
        physical: totalStock[p.PartID] || 0,
        reserved: 0,
        available: totalStock[p.PartID] || 0,
        machines: []
      };
    });

    // 4. สร้าง Dashboard Report & หักยอดจองล่วงหน้า
    const scheduleData: DashboardReport[] = [];
    const today = new Date();

    predictions.forEach(pred => {
      const mInfo = rawMachines.find(m => m.MachineID === pred.machineId);
      const pInfo = rawParts.find(p => p.PartID === pred.partId);
      if (!mInfo || !pInfo) return;

      const pOrderDate = new Date(pred.orderDate);
      const diffDays = Math.ceil((pOrderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let status = 'NORMAL';
      let alertLevel = 0;

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
