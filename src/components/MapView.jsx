import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Hls from 'hls.js';

export default function MapView({ cameras, onOpenModal }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const activePopupHlsRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([15.234, 104.856], 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors & CartoDB',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersGroup = L.layerGroup().addTo(map);

    const greenIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color: #10b981; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 10px #10b981;"></div>`,
      iconSize: [12, 12]
    });

    const waterIcon = L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color: #06b6d4; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 12px #06b6d4;"></div>`,
      iconSize: [14, 14]
    });

    cameras.forEach((cam) => {
      if (!cam.lat || !cam.lng) return;
      const isWater = cam.category === 'water' || cam.tags.includes('เฝ้าระวังน้ำท่วม');
      const marker = L.marker([cam.lat, cam.lng], {
        icon: isWater ? waterIcon : greenIcon
      });

      marker.bindPopup(`
        <div style="font-family: 'Prompt', sans-serif; padding: 2px;">
          <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; color: #38bdf8;">
            📹 ${cam.name}
          </div>
          <div style="width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
            <video id="map-video-${cam.id}" playsinline controls autoplay muted style="width: 100%; height: 100%; object-fit: cover;"></video>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.75rem; color: #94a3b8;">${cam.id}</span>
            <button id="map-btn-${cam.id}" style="background: #2563eb; color: #fff; border: none; border-radius: 4px; padding: 4px 10px; font-size: 0.75rem; cursor: pointer;">
              ขยายจอใหญ่
            </button>
          </div>
        </div>
      `);

      marker.on('popupopen', () => {
        const vid = document.getElementById(`map-video-${cam.id}`);
        const btn = document.getElementById(`map-btn-${cam.id}`);

        if (btn) {
          btn.onclick = () => onOpenModal(cam);
        }

        if (vid && Hls.isSupported()) {
          const hls = new Hls({ debug: false, lowLatencyMode: true });
          hls.loadSource(cam.streamUrl);
          hls.attachMedia(vid);
          activePopupHlsRef.current = hls;
        }
      });

      marker.on('popupclose', () => {
        if (activePopupHlsRef.current) {
          activePopupHlsRef.current.destroy();
          activePopupHlsRef.current = null;
        }
      });

      markersGroup.addLayer(marker);
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      markersGroup.clearLayers();
    };
  }, [cameras, onOpenModal]);

  return (
    <div className="w-full h-[calc(100vh-175px)] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
