import React from 'react';
import { Search, X, Layers, Droplets, TrafficCone, Store, Building2, Star } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'ทั้งหมด', icon: Layers },
  { id: 'water', label: 'ริมแม่น้ำมูล / เฝ้าระวังน้ำท่วม', icon: Droplets, color: 'text-cyan-400' },
  { id: 'traffic', label: 'สี่แยก / ถนนสายหลัก', icon: TrafficCone, color: 'text-amber-400' },
  { id: 'community', label: 'ชุมชน / ตลาด / สวน', icon: Store, color: 'text-emerald-400' },
  { id: 'public', label: 'สถานที่ราชการ', icon: Building2, color: 'text-indigo-400' },
  { id: 'fav', label: 'รายการโปรด', icon: Star, color: 'text-amber-400' },
];

export default function Toolbar({
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
  gridCols,
  setGridCols,
  pageSize,
  setPageSize
}) {
  return (
    <section className="glass-panel border-b border-slate-800/80 px-4 py-2.5 sticky top-[65px] z-20">
      <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition whitespace-nowrap border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${cat.color || ''}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input & Grid Controls */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาถนน, สี่แยก, ชุมชน..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-900/90 border border-slate-700/80 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Grid Layout Switcher (Desktop) */}
          <div className="hidden xl:flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-xs">
            {[2, 3, 4, 6].map((cols) => (
              <button
                key={cols}
                onClick={() => setGridCols(cols)}
                className={`px-2 py-1 rounded transition ${
                  gridCols === cols ? 'text-blue-400 font-bold bg-slate-800' : 'text-slate-400 hover:text-white'
                }`}
                title={`${cols} จอ`}
              >
                {cols}x
              </button>
            ))}
          </div>

          {/* Page Size Dropdown */}
          <select
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value === 'all' ? 999 : Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="12">12 จอ</option>
            <option value="24">24 จอ</option>
            <option value="48">48 จอ</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>
      </div>
    </section>
  );
}
