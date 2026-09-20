import React from 'react';

// ประกาศว่ารับ Props อะไรบ้าง
interface AIPredictiveInsightsProps {
  mlInsights: any[];
  isMlExpanded: boolean;
  setIsMlExpanded: (expanded: boolean) => void;
}

export default function AIPredictiveInsights({ mlInsights, isMlExpanded, setIsMlExpanded }: AIPredictiveInsightsProps) {
  // ถ้าไม่มีข้อมูล ให้ซ่อนกล่องไปเลย
  if (mlInsights.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-[#0f172a] rounded-2xl shadow-xl mb-6 border border-cyan-500/30 flex-shrink-0 relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[50px] rounded-full pointer-events-none"></div>

      {/* แถบหัวข้อ (คลิกเพื่อพับ/กาง) */}
      <div
        className="flex items-center justify-between p-5 relative z-10 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsMlExpanded(!isMlExpanded)}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-black text-xl text-white flex items-center gap-3">
            <i className={`bi bi-cpu-fill text-cyan-400 ${isMlExpanded ? 'animate-pulse' : ''}`}></i>
            ML Predictive Insights
          </h3>
          {/* แจ้งเตือนเล็กๆ เวลาพับกล่อง แล้วมีอะไหล่สีแดง */}
          {!isMlExpanded && mlInsights.some(i => i.trend === 'Degrading') && (
            <span className="bg-rose-500/20 text-rose-400 text-[10px] px-2 py-1 rounded-md font-bold border border-rose-500/30 animate-pulse">
              ⚠️ พบอะไหล่เสี่ยงสูง
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/30 uppercase tracking-widest hidden sm:block">AI Active</span>
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
            <i className={`bi bi-chevron-${isMlExpanded ? 'up' : 'down'} text-slate-400`}></i>
          </div>
        </div>
      </div>

      {/* เนื้อหาการ์ด (จะโชว์ก็ต่อเมื่อ isMlExpanded เป็น true) */}
      {isMlExpanded && (
        <div className="px-5 pb-5 pt-1 relative z-10">
          <div className="flex overflow-x-auto gap-4 pb-2 snap-x" style={{ scrollbarWidth: 'thin' }}>
            {mlInsights.map((insight, idx) => (
              <div key={idx} className="bg-slate-800/50 backdrop-blur-md border border-slate-700 p-4 rounded-xl flex items-center gap-4 hover:border-cyan-400/50 transition-colors min-w-[320px] shrink-0 snap-start">
                <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                  {insight.image ? <img src={insight.image} className="w-full h-full object-contain" /> : <i className="bi bi-gear text-slate-400 text-xl"></i>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-200 text-sm truncate">{insight.partName}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    <i className="bi bi-geo-alt-fill text-cyan-500/70 mr-1"></i> เครื่อง: {insight.machines}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs font-bold">
                    <span className="text-slate-400" title="ค่าเฉลี่ยแบบเก่า">MTBF: {insight.mtbf}d</span>
                    <span className="text-slate-600">|</span>
                    <span className={`${insight.trend === 'Degrading' ? 'text-rose-400' : 'text-emerald-400'}`} title="AI ทำนายล่วงหน้า">
                      <i className={`bi ${insight.trend === 'Degrading' ? 'bi-graph-down-arrow' : 'bi-graph-up-arrow'} mr-1`}></i>
                      Predict: {insight.mlPrediction}d
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}