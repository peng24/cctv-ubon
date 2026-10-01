import React, { useEffect, useState } from 'react';
import { Video, Clock, Droplets, LayoutGrid, MapPin } from 'lucide-react';

export default function Navbar({
  totalCameras,
  filteredCount,
  activeView,
  setActiveView,
  waterData,
  onOpenWaterModal
}) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('th-TH', { hour12: false }) + ' น.');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 glass-nav px-4 py-3 border-b border-slate-800">
      <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                CCTV UBON{' '}
                <span className="text-[11px] font-normal text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/50">
                  สด 24 ชม.
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              รวมกล้องวงจรปิดสด & เฝ้าระวังระดับน้ำ เทศบาลนครอุบลราชธานี
            </p>
          </div>
        </div>

        {/* Live Water Level Pill Badge (RID M.7) */}
        {waterData ? (
          <button
            onClick={onOpenWaterModal}
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
              waterData.level >= 7
                ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                : waterData.level >= 6
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}
            title="คลิกเพื่อดูรายละเอียดระดับน้ำ"
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>
              แม่น้ำมูล M.7: <strong>{waterData.latestMsl}</strong> ม.รทก. ({waterData.latestM} ม.)
            </span>
            <span className="font-semibold">{waterData.trendText}</span>
            <span className="opacity-75">| {waterData.flagText}</span>
          </button>
        ) : (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-slate-800/80 border-slate-700 text-slate-400">
            <Droplets className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>กำลังดึงข้อมูลระดับน้ำ M.7...</span>
          </div>
        )}

        {/* Live Clock & Camera Counters & View Mode */}
        <div className="flex items-center gap-2.5">
          {/* Live Clock */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{currentTime || '--:--:-- น.'}</span>
          </div>

          {/* Camera Counter Badge */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400">
            <span className="pulse-dot"></span>
            <span>
              {filteredCount} / {totalCameras} กล้อง
            </span>
          </div>

          {/* View Switcher (Grid / Map) */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveView('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeView === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">วอลล์กล้อง</span>
            </button>

            <button
              onClick={() => setActiveView('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeView === 'map' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">แผนที่</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
