import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { X, MapPin, Shield, Star, AlertTriangle } from 'lucide-react';

export default function CameraModal({ camera, isOpen, onClose, isFavorite, onToggleFavorite }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isOpen || !camera) return;

    setIsLoading(true);
    setHasError(false);

    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ debug: false, lowLatencyMode: true });
      hls.loadSource(camera.streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setIsLoading(false);
          setHasError(true);
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = camera.streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isOpen, camera]);

  if (!isOpen || !camera) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative glass-panel bg-slate-900/95 border border-slate-700/80 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl z-10">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="pulse-dot"></span>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{camera.name}</h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                <span className="bg-slate-800 px-2 py-0.5 rounded font-mono text-slate-300">{camera.id}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  {camera.lat.toFixed(4)}, {camera.lng.toFixed(4)}
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  {camera.source}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(camera.id)}
              className={`p-2 rounded-lg border transition ${
                isFavorite
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={isFavorite ? 'นำออกจากรายการโปรด' : 'บันทึกเป็นรายการโปรด'}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <video ref={videoRef} controls playsInline autoPlay className="w-full h-full object-contain" />

          {isLoading && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400 text-xs gap-2">
              <div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin"></div>
              <span>กำลังเชื่อมต่อสัญญาณสด 1080p...</span>
            </div>
          )}

          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-amber-400 text-sm gap-2">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <span>ไม่สามารถเล่นสัญญาณสดของกล้องนี้ได้ในขณะนี้</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
