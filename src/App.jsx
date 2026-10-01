import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import Toolbar from './components/Toolbar';
import CameraGrid from './components/CameraGrid';
import MapView from './components/MapView';
import CameraModal from './components/CameraModal';
import WaterModal from './components/WaterModal';
import { CAMERAS } from './data/cameras';

export default function App() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('grid');
  const [gridCols, setGridCols] = useState(4);
  const [pageSize, setPageSize] = useState(24);
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('ubon_cctv_favs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [waterData, setWaterData] = useState(null);

  // Save favorites to localStorage
  const toggleFavorite = (camId) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(camId)) next.delete(camId);
      else next.add(camId);
      try {
        localStorage.setItem('ubon_cctv_favs', JSON.stringify([...next]));
      } catch {}
      return next;
    });
  };

  // Fetch RID M.7 Water level data
  useEffect(() => {
    const fetchWater = async () => {
      try {
        const formData = new URLSearchParams();
        formData.append('nd', Date.now());
        formData.append('_search', 'false');
        formData.append('rows', '100');
        formData.append('page', '1');
        formData.append('sidx', 'indexhourly');
        formData.append('sord', 'asc');

        const res = await fetch('https://hyd-app.rid.go.th/webservice/getHourlyWaterLevelReport.ashx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData
        });

        if (!res.ok) return;
        const data = await res.json();
        if (data && data.rows && data.rows.length > 0) {
          const readings = [];
          for (const row of data.rows) {
            const val = row.wlvalues;
            if (val !== null && val !== '' && val !== '***' && !isNaN(parseFloat(val))) {
              readings.push({
                level: Math.round(parseFloat(val) * 100) / 100,
                time: row.hourlytime || ''
              });
            }
          }

          if (readings.length > 0) {
            const latest = readings[readings.length - 1];
            const latestMsl = (latest.level + 105).toFixed(2);
            const latestM = latest.level.toFixed(2);

            let trendText = 'คงที่ ●';
            if (readings.length >= 2) {
              const prev = readings[readings.length - 2];
              if (latest.level > prev.level) trendText = 'เพิ่มขึ้น ▲';
              else if (latest.level < prev.level) trendText = 'ลดลง ▼';
            }

            let flagText = 'ปกติ (ธงเขียว)';
            if (latest.level >= 7.0) flagText = 'วิกฤต (ธงแดง)';
            else if (latest.level >= 6.0) flagText = 'เฝ้าระวัง (ธงเหลือง)';

            setWaterData({
              level: latest.level,
              latestMsl,
              latestM,
              trendText,
              flagText,
              readings
            });
          }
        }
      } catch (e) {
        console.warn('M.7 fetch error:', e);
      }
    };

    fetchWater();
    const timer = setInterval(fetchWater, 300000);
    return () => clearInterval(timer);
  }, []);

  // Filter cameras
  const filteredCameras = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return CAMERAS.filter((cam) => {
      // Category filter
      if (activeCategory === 'fav' && !favorites.has(cam.id)) return false;
      if (activeCategory === 'water' && cam.category !== 'water' && !cam.tags.includes('เฝ้าระวังน้ำท่วม')) return false;
      if (activeCategory === 'traffic' && cam.category !== 'traffic') return false;
      if (activeCategory === 'community' && cam.category !== 'community') return false;
      if (activeCategory === 'public' && cam.category !== 'public') return false;

      // Search query filter
      if (q) {
        const matchName = cam.name.toLowerCase().includes(q);
        const matchId = cam.id.toLowerCase().includes(q);
        const matchTags = cam.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchId && !matchTags) return false;
      }

      return true;
    });
  }, [searchQuery, activeCategory, favorites]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory]);

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100">
      {/* Top Navbar */}
      <Navbar
        totalCameras={CAMERAS.length}
        filteredCount={filteredCameras.length}
        activeView={activeView}
        setActiveView={setActiveView}
        waterData={waterData}
        onOpenWaterModal={() => setIsWaterModalOpen(true)}
      />

      {/* Toolbar Controls */}
      <Toolbar
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        gridCols={gridCols}
        setGridCols={setGridCols}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-4">
        {activeView === 'grid' ? (
          <CameraGrid
            cameras={filteredCameras}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onOpenModal={(cam) => setSelectedCamera(cam)}
            gridCols={gridCols}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
          />
        ) : (
          <MapView cameras={filteredCameras} onOpenModal={(cam) => setSelectedCamera(cam)} />
        )}
      </main>

      {/* Fullscreen Video Modal */}
      <CameraModal
        camera={selectedCamera}
        isOpen={!!selectedCamera}
        onClose={() => setSelectedCamera(null)}
        isFavorite={selectedCamera ? favorites.has(selectedCamera.id) : false}
        onToggleFavorite={toggleFavorite}
      />

      {/* M.7 River Water Metrics Modal */}
      <WaterModal
        isOpen={isWaterModalOpen}
        onClose={() => setIsWaterModalOpen(false)}
        waterData={waterData}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/80 text-slate-400 text-xs py-4 px-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>สงวนลิขสิทธิ์ข้อมูลกล้อง &copy; 2026 สำนักงานเทศบาลนครอุบลราชธานี & กรมชลประทาน</span>
          <div className="flex items-center gap-4 text-slate-500">
            <span>React + Vite SPA</span>
            <span>Cloudflare Pages</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
