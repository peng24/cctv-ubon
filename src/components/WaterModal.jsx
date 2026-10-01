import React from 'react';
import { X, Droplets, Info } from 'lucide-react';

export default function WaterModal({ isOpen, onClose, waterData }) {
  if (!isOpen || !waterData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative glass-panel bg-slate-900/95 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-400" />
            ระดับน้ำแม่น้ำมูล (สถานี M.7)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Level Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
            <div className="text-[11px] text-slate-400">ระดับน้ำปัจจุบัน</div>
            <div className="text-2xl font-bold text-cyan-400 mt-0.5">
              {waterData.latestMsl} <span className="text-xs font-normal text-slate-300">ม.รทก.</span>
            </div>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
            <div className="text-[11px] text-slate-400">ระดับน้ำเทียบตลิ่ง</div>
            <div className="text-2xl font-bold text-amber-400 mt-0.5">
              {waterData.latestM} <span className="text-xs font-normal text-slate-300">ม.</span>
            </div>
          </div>
        </div>

        {/* Warning & Trend status */}
        <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700 text-xs space-y-2 text-slate-200">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">สถานะเตือนภัย:</span>
            <span className="font-semibold text-emerald-400">{waterData.flagText}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">แนวโน้มการเปลี่ยนแปลง:</span>
            <span className="font-semibold">{waterData.trendText}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">ระดับตลิ่งวิกฤต:</span>
            <span className="font-semibold text-red-400">112.00 ม.รทก. (7.00 ม.)</span>
          </div>
        </div>

        {/* Reference Attribution */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>ข้อมูลจาก กรมชลประทาน (RID) • สะพานเสรีประชาธิปไตย อ.เมือง จ.อุบลราชธานี</span>
        </div>
      </div>
    </div>
  );
}
