import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Star, Maximize2, RotateCcw, Droplets, Video, AlertTriangle } from 'lucide-react';

export default function CameraCard({ camera, isFavorite, onToggleFavorite, onOpenModal }) {
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const hlsRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);

  // Lazy loading observer: only play when visible on screen
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { rootMargin: '100px', threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // HLS stream attach/detach based on visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isIntersecting) {
      // Clean up player when offscreen to save bandwidth & GPU
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute('src');
      video.load();
      setIsLoading(true);
      return;
    }

    // When intersecting, start streaming
    setIsLoading(true);
    setHasError(false);

    let retryCount = 0;

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 10
      });

      hls.loadSource(camera.streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setHasError(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        // Immediate check for 404 or manifest not found
        const is404 = data.response?.code === 404 || 
                      data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || 
                      data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT;

        if (is404) {
          hls.destroy();
          hlsRef.current = null;
          setIsLoading(false);
          setHasError('offline');
          return;
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              retryCount += 1;
              if (retryCount <= 1) {
                hls.startLoad();
              } else {
                hls.destroy();
                hlsRef.current = null;
                setIsLoading(false);
                setHasError('offline');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              hlsRef.current = null;
              setIsLoading(false);
              setHasError('error');
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari
      const handleMetadata = () => {
        setIsLoading(false);
        setHasError(false);
        video.play().catch(() => {});
      };
      const handleError = () => {
        setIsLoading(false);
        setHasError('offline');
      };

      video.addEventListener('loadedmetadata', handleMetadata);
      video.addEventListener('error', handleError);
      video.src = camera.streamUrl;

      return () => {
        video.removeEventListener('loadedmetadata', handleMetadata);
        video.removeEventListener('error', handleError);
      };
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isIntersecting, camera.streamUrl]);

  const handleReload = (e) => {
    e.stopPropagation();
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setIsLoading(true);
    setHasError(false);
    setIsIntersecting(false);
    setTimeout(() => setIsIntersecting(true), 50);
  };

  const isWater = camera.category === 'water' || camera.tags.includes('เฝ้าระวังน้ำท่วม');

  return (
    <div
      ref={cardRef}
      className={`group relative rounded-xl overflow-hidden bg-slate-900/80 border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/30 ${
        isFavorite ? 'border-amber-500/40' : 'border-slate-800 hover:border-blue-500/40'
      }`}
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto none auto 240px' }}
    >
      {/* 16:9 Video Area */}
      <div className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center">
        {/* Live or Offline Badge */}
        {hasError ? (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider bg-slate-900/90 text-amber-400 border border-amber-500/30 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            OFFLINE
          </div>
        ) : (
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE
          </div>
        )}

        {/* Water Level Badge */}
        {isWater && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 backdrop-blur-md">
            <Droplets className="w-3 h-3 text-cyan-300" />
            <span>ระดับน้ำ</span>
          </div>
        )}

        {/* Action Controls on Hover */}
        <div className="absolute top-8 right-2 z-10 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(camera.id);
            }}
            title={isFavorite ? 'นำออกจากรายการโปรด' : 'บันทึกเป็นรายการโปรด'}
            className={`w-7 h-7 rounded-lg flex items-center justify-center backdrop-blur-md border text-xs transition ${
              isFavorite
                ? 'bg-amber-500/30 border-amber-500/50 text-amber-400'
                : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-blue-600 hover:border-blue-500 hover:text-white'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal(camera);
            }}
            title="ดูจอใหญ่"
            className="w-7 h-7 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:bg-blue-600 hover:border-blue-500 hover:text-white flex items-center justify-center text-xs backdrop-blur-md transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleReload}
            title="รีโหลดสัญญาณ"
            className="w-7 h-7 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:bg-blue-600 hover:border-blue-500 hover:text-white flex items-center justify-center text-xs backdrop-blur-md transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${isLoading || hasError ? 'hidden' : 'block'}`}
        />

        {/* Loading Spinner */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-slate-400 text-xs gap-2">
            <div className="w-6 h-6 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin"></div>
            <span className="text-[11px]">กำลังเชื่อมต่อสัญญาณ...</span>
          </div>
        )}

        {/* Error / Offline State */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/92 text-slate-300 text-xs gap-1.5 p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <span className="font-medium text-amber-300">
              {hasError === 'offline' ? 'กล้องออฟไลน์ชั่วคราว' : 'สัญญาณขัดข้องชั่วคราว'}
            </span>
            <span className="text-[10px] text-slate-500">
              {hasError === 'offline' ? 'ต้นทางเทศบาลยังไม่เปิดสัญญาณ (404)' : 'กำลังรอเชื่อมต่อใหม่'}
            </span>
            <button
              onClick={handleReload}
              className="mt-1 px-2.5 py-1 text-[11px] rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        )}
      </div>

      {/* Card Caption Footer */}
      <div className="px-3 py-2 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs font-medium text-slate-200 truncate" title={camera.name}>
            {camera.name}
          </span>
        </div>
        <button
          onClick={() => onOpenModal(camera)}
          className="text-[10px] text-blue-400 hover:text-blue-300 font-mono shrink-0 px-1.5 py-0.5 rounded bg-blue-950/50 border border-blue-800/40"
        >
          {camera.id}
        </button>
      </div>
    </div>
  );
}
