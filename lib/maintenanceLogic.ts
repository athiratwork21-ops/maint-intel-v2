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
    let leadTimeQuery = supabase.from('LeadTime').select('*'); // 🌟 ดึงข้อมูล Lead Time จริงมาคำนวณ

    // 🌟 ระบบแยกแผนก
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
    const rawLeadTime = leadTimeData || [];
    
    const rawLines = Array.from(new Set(rawMachines.map(m => m.LineName).filter(Boolean)));

    // 🌟 1. คำนวณระยะเวลารอของเฉลี่ย (Average Lead Time) จากประวัติจริง
    const avgLeadTimeData: { [partId: string]: number } = {};
    const leadTimeSpans: { [partId: string]: number[] } = {};
    rawLeadTime.forEach(lt => {
      if (!leadTimeSpans[lt.PartID]) leadTimeSpans[lt.PartID] = [];
      leadTimeSpans[lt.PartID].push(lt.LeadTimeDays);
    });
    Object.keys(leadTimeSpans).forEach(pId => {
      const spans = leadTimeSpans[pId];
      if (spans.length > 0) {
        avgLeadTimeData[pId] = Math.ceil(spans.reduce((a, b) => a + b, 0) / spans.length);
      }
    });

    // 🌟 2. คำนวณ MTBF แยกตาม "จุดติดตั้ง (Position)"
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

    // 🌟 3. คำนวณ AI Predictions (แยกตาม Position + ใช้ Lead Time จริง)
    const predictions: any[] = [];
    Object.keys(lastChangeDates).forEach(key => {
      const [machineId, partId, pos] = key.split('_');
      const partInfo = rawParts.find(p => p.PartID === partId);
      if (!partInfo) return;

      const mtbf = mtbfData[key] || 180; 
      
      // 🌟 ใช้ Lead Time เฉลี่ยจากสถิติจริง ถ้าไม่มีให้ใช้ SafetyBufferDays ที่ตั้งไว้ตอนแรก
      const actualLeadTime = avgLeadTimeData[partId] || partInfo.SafetyBufferDays || 7;
      
      const lastDate = new Date(lastChangeDates[key]);
      const predictedFailDate = new Date(lastDate);
      predictedFailDate.setDate(predictedFailDate.getDate() + mtbf);
      
      const orderDate = new Date(predictedFailDate);
      orderDate.setDate(orderDate.getDate() - actualLeadTime); // 👈 คำนวณวันสั่งของตรงนี้

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

    // 4. รวม Stock
    const totalStock: { [partId: string]: number } = {};
    rawStock.forEach(s => {
      totalStock[s.PartID] = (totalStock[s.PartID] || 0) + (s.Balance || 0);
    });

    // 5. สร้าง Dashboard Report
    const scheduleData: DashboardReport[] = [];
    const allocations: { [partId: string]: { physical: number, reserved: number, available: number, machines: string[] } } = {};
    const today = new Date();

    predictions.forEach(pred => {
      const mInfo = rawMachines.find(m => m.MachineID === pred.machineId);
      const pInfo = rawParts.find(p => p.PartID === pred.partId);
      if (!mInfo || !pInfo) return;

      if (!allocations[pred.partId]) {
        allocations[pred.partId] = {
          physical: totalStock[pred.partId] || 0,
          reserved: 0,
          available: totalStock[pred.partId] || 0,
          machines: []
        };
      }

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