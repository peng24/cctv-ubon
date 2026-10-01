import React from 'react';
import CameraCard from './CameraCard';
import { VideoOff, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CameraGrid({
  cameras,
  favorites,
  onToggleFavorite,
  onOpenModal,
  gridCols,
  currentPage,
  setCurrentPage,
  pageSize
}) {
  if (cameras.length === 0) {
    return (
      <div className="py-20 text-center text-slate-400">
        <VideoOff className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <h3 className="text-lg font-medium text-slate-300">ไม่พบกล้องวงจรปิดที่ตรงกับเงื่อนไข</h3>
        <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นดูนะครับ</p>
      </div>
    );
  }

  // Column class calculator
  let colClass = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4';
  if (gridCols === 2) colClass = 'grid-cols-1 sm:grid-cols-2';
  else if (gridCols === 3) colClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  else if (gridCols === 6) colClass = 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-6';

  // Pagination calculation
  const totalPages = Math.ceil(cameras.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const currentBatch = cameras.slice(startIdx, startIdx + pageSize);

  return (
    <div className="space-y-6">
      {/* Video Cards Grid */}
      <div className={`grid gap-4 w-full ${colClass}`}>
        {currentBatch.map((camera) => (
          <CameraCard
            key={camera.id}
            camera={camera}
            isFavorite={favorites.has(camera.id)}
            onToggleFavorite={onToggleFavorite}
            onOpenModal={onOpenModal}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1.5 pt-4 text-xs">
          <button
            onClick={() => {
              setCurrentPage((prev) => Math.max(prev - 1, 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((page, idx, arr) => {
              const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;

              return (
                <React.Fragment key={page}>
                  {showEllipsisBefore && <span className="px-1 text-slate-600">...</span>}
                  <button
                    onClick={() => {
                      setCurrentPage(page);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`px-3 py-1.5 rounded-lg border transition ${
                      currentPage === page
                        ? 'bg-blue-600 text-white border-blue-500 font-semibold'
                        : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}

          <button
            onClick={() => {
              setCurrentPage((prev) => Math.min(prev + 1, totalPages));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
