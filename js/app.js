// CCTV Ubon Ratchathani - Core Application Logic
// Optimized for Cloudflare Pages (Pure Client-side, Zero Server Dependency)

const AppState = {
  cameras: [],
  filteredCameras: [],
  activeCategory: 'all',
  searchQuery: '',
  activeView: 'grid', // 'grid' | 'map'
  gridCols: 4, // 2, 3, 4, 6
  pageSize: 24,
  currentPage: 1,
  favorites: new Set(),
  activePlayers: new Map(), // cardId -> { hls, video }
  currentModalCamera: null,
  modalHls: null,
  waterData: null,
  map: null,
  markersLayer: null
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadFavorites();
  initCamerasData();
  setupUIEventListeners();
  startClock();
  fetchM7WaterLevel();
  setInterval(fetchM7WaterLevel, 300000); // refresh every 5 min
  renderApp();
});

// Load Favorites from LocalStorage
function loadFavorites() {
  try {
    const saved = localStorage.getItem('ubon_cctv_favs');
    if (saved) {
      AppState.favorites = new Set(JSON.parse(saved));
    }
  } catch (e) {
    console.warn('Failed to load favorites', e);
  }
}

function saveFavorites() {
  try {
    localStorage.setItem('ubon_cctv_favs', JSON.stringify([...AppState.favorites]));
  } catch (e) {
    console.warn('Failed to save favorites', e);
  }
}

function toggleFavorite(camId) {
  if (AppState.favorites.has(camId)) {
    AppState.favorites.delete(camId);
  } else {
    AppState.favorites.add(camId);
  }
  saveFavorites();
  if (AppState.activeCategory === 'fav') {
    applyFilters();
  } else {
    // update favorite star UI on card
    const card = document.getElementById(`card-${camId}`);
    if (card) {
      const btn = card.querySelector('.btn-fav');
      if (btn) {
        btn.classList.toggle('active-favorite', AppState.favorites.has(camId));
        btn.innerHTML = AppState.favorites.has(camId) ? '<i class="fas fa-star text-amber-400"></i>' : '<i class="far fa-star"></i>';
      }
    }
  }
  updateCounters();
}

// Load Cameras Data
function initCamerasData() {
  if (typeof UBCCCTV_CAMERAS !== 'undefined' && Array.isArray(UBCCCTV_CAMERAS)) {
    AppState.cameras = UBCCCTV_CAMERAS;
  } else {
    console.error('UBCCCTV_CAMERAS not found! Please check cameras.js');
    AppState.cameras = [];
  }
  AppState.filteredCameras = [...AppState.cameras];
  updateCounters();
}

// Clock Ticker
function startClock() {
  const clockEl = document.getElementById('live-clock');
  function tick() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour12: false });
    if (clockEl) clockEl.textContent = timeStr + ' น.';
  }
  tick();
  setInterval(tick, 1000);
}

// Fetch M.7 River Water Level from RID webservice
async function fetchM7WaterLevel() {
  const waterBar = document.getElementById('water-level-pill');
  if (!waterBar) return;

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

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
        let trendColor = 'text-amber-400';
        let badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

        if (readings.length >= 2) {
          const prev = readings[readings.length - 2];
          if (latest.level > prev.level) {
            trendText = 'เพิ่มขึ้น ▲';
            trendColor = 'text-red-400';
          } else if (latest.level < prev.level) {
            trendText = 'ลดลง ▼';
            trendColor = 'text-emerald-400';
          }
        }

        // Flag Warning Status
        // Normal < 6.00m (111.00 m.msl), Warning 6.00-7.00m, Flood > 7.00m
        let flagText = 'ปกติ (ธงเขียว)';
        if (latest.level >= 7.0) {
          flagText = 'วิกฤต (ธงแดง)';
          badgeColor = 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
        } else if (latest.level >= 6.0) {
          flagText = 'เฝ้าระวัง (ธงเหลือง)';
          badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
        }

        AppState.waterData = { latestMsl, latestM, trendText, flagText, readings };

        waterBar.className = `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition ${badgeColor}`;
        waterBar.innerHTML = `
          <i class="fas fa-water"></i>
          <span>แม่น้ำมูล M.7: <strong>${latestMsl}</strong> ม.รทก. (${latestM} ม.)</span>
          <span class="${trendColor} font-semibold">${trendText}</span>
          <span class="opacity-75">| ${flagText}</span>
        `;
      }
    }
  } catch (err) {
    console.warn('M.7 Water Level fetch failed, using fallback or retrying...', err);
  }
}

// Filter and Search logic
function applyFilters() {
  destroyAllActivePlayers();
  const query = AppState.searchQuery.trim().toLowerCase();
  const cat = AppState.activeCategory;

  AppState.filteredCameras = AppState.cameras.filter(cam => {
    // Category Match
    if (cat === 'fav' && !AppState.favorites.has(cam.id)) return false;
    if (cat === 'water' && cam.category !== 'water' && !cam.tags.includes('เฝ้าระวังน้ำท่วม')) return false;
    if (cat === 'traffic' && cam.category !== 'traffic') return false;
    if (cat === 'community' && cam.category !== 'community') return false;
    if (cat === 'public' && cam.category !== 'public') return false;

    // Search Query Match
    if (query) {
      const matchName = cam.name.toLowerCase().includes(query);
      const matchId = cam.id.toLowerCase().includes(query);
      const matchTags = cam.tags.some(t => t.toLowerCase().includes(query));
      if (!matchName && !matchId && !matchTags) return false;
    }

    return true;
  });

  AppState.currentPage = 1;
  renderApp();
  updateCounters();
}

function updateCounters() {
  const countEl = document.getElementById('camera-count-badge');
  if (countEl) {
    countEl.innerHTML = `
      <span class="pulse-dot"></span>
      <span>${AppState.filteredCameras.length} / ${AppState.cameras.length} กล้อง</span>
    `;
  }
}

// UI Event Listeners
function setupUIEventListeners() {
  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.searchQuery = e.target.value;
      applyFilters();
    });
  }

  // Clear search
  const clearBtn = document.getElementById('btn-clear-search');
  if (clearBtn && searchInput) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      AppState.searchQuery = '';
      applyFilters();
    });
  }

  // Category Tabs
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.remove('bg-blue-600', 'text-white', 'border-blue-500');
        b.classList.add('bg-slate-800/80', 'text-slate-300', 'border-slate-700/60');
      });
      btn.classList.remove('bg-slate-800/80', 'text-slate-300', 'border-slate-700/60');
      btn.classList.add('bg-blue-600', 'text-white', 'border-blue-500');

      AppState.activeCategory = btn.dataset.category;
      applyFilters();
    });
  });

  // View Switcher (Grid vs Map)
  const btnViewGrid = document.getElementById('btn-view-grid');
  const btnViewMap = document.getElementById('btn-view-map');
  const gridContainer = document.getElementById('cctv-grid-wrapper');
  const mapContainer = document.getElementById('map-view-wrapper');

  if (btnViewGrid && btnViewMap) {
    btnViewGrid.addEventListener('click', () => {
      AppState.activeView = 'grid';
      btnViewGrid.classList.add('bg-blue-600', 'text-white');
      btnViewGrid.classList.remove('text-slate-400');
      btnViewMap.classList.remove('bg-blue-600', 'text-white');
      btnViewMap.classList.add('text-slate-400');
      gridContainer.classList.remove('hidden');
      mapContainer.classList.add('hidden');
      observeVisibleCards();
    });

    btnViewMap.addEventListener('click', () => {
      AppState.activeView = 'map';
      btnViewMap.classList.add('bg-blue-600', 'text-white');
      btnViewMap.classList.remove('text-slate-400');
      btnViewGrid.classList.remove('bg-blue-600', 'text-white');
      btnViewGrid.classList.add('text-slate-400');
      gridContainer.classList.add('hidden');
      mapContainer.classList.remove('hidden');
      destroyAllActivePlayers();
      initOrUpdateMap();
    });
  }

  // Column Selectors
  document.querySelectorAll('.col-select-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.col-select-btn').forEach(b => b.classList.remove('active-col', 'text-blue-400'));
      btn.classList.add('active-col', 'text-blue-400');
      AppState.gridCols = parseInt(btn.dataset.cols, 10);
      updateGridColumns();
    });
  });

  // Page Size Selector
  const pageSizeSelect = document.getElementById('page-size-select');
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', (e) => {
      AppState.pageSize = e.target.value === 'all' ? 999 : parseInt(e.target.value, 10);
      AppState.currentPage = 1;
      renderApp();
    });
  }

  // Water Pill click opens water modal
  const waterPill = document.getElementById('water-level-pill');
  if (waterPill) {
    waterPill.addEventListener('click', () => {
      openWaterModal();
    });
  }

  // Modal Close buttons
  const modalClose = document.getElementById('modal-close-btn');
  const modalBackdrop = document.getElementById('camera-modal-backdrop');
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeWaterModal();
    }
  });
}

function updateGridColumns() {
  const grid = document.getElementById('cctv-grid');
  if (!grid) return;
  grid.className = 'grid gap-4 w-full';
  if (AppState.gridCols === 2) {
    grid.classList.add('grid-cols-1', 'sm:grid-cols-2');
  } else if (AppState.gridCols === 3) {
    grid.classList.add('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');
  } else if (AppState.gridCols === 4) {
    grid.classList.add('grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'xl:grid-cols-4');
  } else if (AppState.gridCols === 6) {
    grid.classList.add('grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4', '2xl:grid-cols-6');
  }
}

// Render Application View
function renderApp() {
  if (AppState.activeView === 'grid') {
    renderGrid();
  } else {
    initOrUpdateMap();
  }
}

// Render Video Card Grid
function renderGrid() {
  const container = document.getElementById('cctv-grid');
  if (!container) return;

  const total = AppState.filteredCameras.length;
  if (total === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400">
        <i class="fas fa-video-slash text-5xl mb-4 text-slate-600"></i>
        <h3 class="text-xl font-medium text-slate-300">ไม่พบกล้องวงจรปิดที่ตรงกับเงื่อนไข</h3>
        <p class="text-sm mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นดูนะครับ</p>
      </div>
    `;
    renderPagination(0);
    return;
  }

  // Pagination slice
  const start = (AppState.currentPage - 1) * AppState.pageSize;
  const pageCameras = AppState.filteredCameras.slice(start, start + AppState.pageSize);

  let html = '';
  pageCameras.forEach(cam => {
    const isFav = AppState.favorites.has(cam.id);
    const isWater = cam.category === 'water' || cam.tags.includes('เฝ้าระวังน้ำท่วม');

    html += `
      <div id="card-${cam.id}" class="camera-card ${isFav ? 'is-favorite' : ''}" data-stream-id="${cam.id}" data-stream-url="${cam.streamUrl}">
        <div class="video-wrapper">
          <!-- Live badge -->
          <div class="video-overlay-badge badge-live">
            <span class="pulse-dot"></span> LIVE
          </div>

          ${isWater ? `
            <div class="video-overlay-badge badge-water" style="left: auto; right: 8px;">
              <i class="fas fa-water"></i> ระดับน้ำ
            </div>
          ` : ''}

          <!-- Quick actions -->
          <div class="video-actions">
            <button class="action-btn btn-fav ${isFav ? 'active-favorite' : ''}" title="บันทึกรายการโปรด" onclick="toggleFavorite('${cam.id}')">
              ${isFav ? '<i class="fas fa-star text-amber-400"></i>' : '<i class="far fa-star"></i>'}
            </button>
            <button class="action-btn" title="ขยายดูเต็มจอ" onclick="openModal('${cam.id}')">
              <i class="fas fa-expand"></i>
            </button>
            <button class="action-btn" title="โหลดสตรีมใหม่" onclick="reloadStream('${cam.id}')">
              <i class="fas fa-redo-alt"></i>
            </button>
          </div>

          <!-- Video Element (managed by observer) -->
          <video id="video-${cam.id}" playsinline muted class="hidden"></video>

          <!-- Loading Placeholder -->
          <div id="loader-${cam.id}" class="video-loading-placeholder">
            <div class="spinner"></div>
            <span>กำลังเชื่อมต่อกล้อง...</span>
          </div>
        </div>

        <div class="camera-caption">
          <div class="camera-name" title="${cam.name}">
            <i class="fas fa-video text-slate-400 text-xs mr-1"></i> ${cam.name}
          </div>
          <button class="text-xs text-blue-400 hover:text-blue-300 ml-2 font-mono whitespace-nowrap" onclick="openModal('${cam.id}')">
            ${cam.id}
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  updateGridColumns();
  renderPagination(total);

  // Setup Lazy-Loading Video Players with IntersectionObserver
  observeVisibleCards();
}

// Render Pagination Controls
function renderPagination(total) {
  const paginationWrapper = document.getElementById('pagination-wrapper');
  if (!paginationWrapper) return;

  const totalPages = Math.ceil(total / AppState.pageSize);
  if (totalPages <= 1) {
    paginationWrapper.innerHTML = '';
    return;
  }

  let html = `<div class="flex items-center gap-1.5 text-sm">`;

  // Prev button
  html += `
    <button class="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
      ${AppState.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${AppState.currentPage - 1})">
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  // Page Numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= AppState.currentPage - 1 && i <= AppState.currentPage + 1)) {
      html += `
        <button class="px-3.5 py-1.5 rounded-lg border ${AppState.currentPage === i ? 'bg-blue-600 text-white border-blue-500' : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'}"
          onclick="changePage(${i})">${i}</button>
      `;
    } else if (i === AppState.currentPage - 2 || i === AppState.currentPage + 2) {
      html += `<span class="px-2 text-slate-500">...</span>`;
    }
  }

  // Next button
  html += `
    <button class="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
      ${AppState.currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${AppState.currentPage + 1})">
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  html += `</div>`;
  paginationWrapper.innerHTML = html;
}

function changePage(page) {
  destroyAllActivePlayers();
  AppState.currentPage = page;
  renderApp();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Intersection Observer for In-Viewport Stream Management
let cardObserver = null;

function observeVisibleCards() {
  if (cardObserver) cardObserver.disconnect();

  const options = {
    root: null,
    rootMargin: '100px', // start loading before it fully enters
    threshold: 0.1
  };

  cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const card = entry.target;
      const camId = card.dataset.streamId;
      const streamUrl = card.dataset.streamUrl;

      if (entry.isIntersecting) {
        // Mount & play HLS stream
        attachStreamToCard(camId, streamUrl);
      } else {
        // Unmount & detach to save bandwidth and GPU
        detachStreamFromCard(camId);
      }
    });
  }, options);

  document.querySelectorAll('.camera-card').forEach(card => {
    cardObserver.observe(card);
  });
}

function attachStreamToCard(camId, streamUrl) {
  if (AppState.activePlayers.has(camId)) return; // already active

  const video = document.getElementById(`video-${camId}`);
  const loader = document.getElementById(`loader-${camId}`);
  if (!video) return;

  if (Hls.isSupported()) {
    const hls = new Hls({
      debug: false,
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 30,
      maxBufferLength: 10
    });

    hls.loadSource(streamUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.classList.remove('hidden');
      if (loader) loader.style.display = 'none';
      video.play().catch(e => console.warn(`Autoplay blocked on ${camId}`, e));
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch(data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            hls.destroy();
            AppState.activePlayers.delete(camId);
            if (loader) {
              loader.innerHTML = `
                <i class="fas fa-exclamation-triangle text-amber-500 text-lg"></i>
                <span class="text-xs text-amber-400">สัญญาณขัดข้อง</span>
              `;
            }
            break;
        }
      }
    });

    AppState.activePlayers.set(camId, { hls, video });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Native Safari / iOS
    video.src = streamUrl;
    video.addEventListener('loadedmetadata', () => {
      video.classList.remove('hidden');
      if (loader) loader.style.display = 'none';
      video.play().catch(e => console.warn(e));
    });
    AppState.activePlayers.set(camId, { hls: null, video });
  }
}

function detachStreamFromCard(camId) {
  const player = AppState.activePlayers.get(camId);
  if (!player) return;

  const { hls, video } = player;
  if (hls) {
    hls.destroy();
  }
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.classList.add('hidden');
  }

  const loader = document.getElementById(`loader-${camId}`);
  if (loader) {
    loader.style.display = 'flex';
    loader.innerHTML = `
      <div class="spinner"></div>
      <span>กำลังเชื่อมต่อกล้อง...</span>
    `;
  }

  AppState.activePlayers.delete(camId);
}

function destroyAllActivePlayers() {
  AppState.activePlayers.forEach((player, camId) => {
    if (player.hls) player.hls.destroy();
    if (player.video) {
      player.video.pause();
      player.video.removeAttribute('src');
      player.video.load();
    }
  });
  AppState.activePlayers.clear();
}

function reloadStream(camId) {
  detachStreamFromCard(camId);
  const cam = AppState.cameras.find(c => c.id === camId);
  if (cam) {
    attachStreamToCard(camId, cam.streamUrl);
  }
}

// Interactive Map View (Leaflet)
function initOrUpdateMap() {
  const mapEl = document.getElementById('map-container');
  if (!mapEl) return;

  if (!AppState.map) {
    // Center of Ubon Ratchathani City
    AppState.map = L.map('map-container').setView([15.234, 104.856], 14);

    // Dark Matter tile layer for slick modern look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors & CartoDB',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(AppState.map);

    AppState.markersLayer = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 40
    });
    AppState.map.addLayer(AppState.markersLayer);
  }

  AppState.markersLayer.clearLayers();

  // Custom Neon Marker Icons
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

  AppState.filteredCameras.forEach(cam => {
    if (!cam.lat || !cam.lng) return;
    const isWater = cam.category === 'water' || cam.tags.includes('เฝ้าระวังน้ำท่วม');
    const marker = L.marker([cam.lat, cam.lng], { icon: isWater ? waterIcon : greenIcon });

    marker.bindPopup(`
      <div style="font-family: 'Prompt', sans-serif; padding: 2px;">
        <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 6px; color: #38bdf8;">
          <i class="fas fa-video"></i> ${cam.name}
        </div>
        <div style="width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
          <video id="popup-video-${cam.id}" playsinline controls autoplay muted style="width: 100%; height: 100%; object-fit: cover;"></video>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.75rem; color: #94a3b8;">พิกัด: ${cam.lat.toFixed(4)}, ${cam.lng.toFixed(4)}</span>
          <button onclick="openModal('${cam.id}')" style="background: #2563eb; color: #fff; border: none; border-radius: 4px; padding: 3px 10px; font-size: 0.75rem; cursor: pointer;">
            ดูจอใหญ่
          </button>
        </div>
      </div>
    `);

    marker.on('popupopen', () => {
      const pVid = document.getElementById(`popup-video-${cam.id}`);
      if (pVid && Hls.isSupported()) {
        const phls = new Hls({ debug: false, lowLatencyMode: true });
        phls.loadSource(cam.streamUrl);
        phls.attachMedia(pVid);
        marker._phls = phls;
      }
    });

    marker.on('popupclose', () => {
      if (marker._phls) {
        marker._phls.destroy();
        marker._phls = null;
      }
    });

    AppState.markersLayer.addLayer(marker);
  });

  setTimeout(() => {
    AppState.map.invalidateSize();
  }, 100);
}

// Fullscreen Modal Player
function openModal(camId) {
  const cam = AppState.cameras.find(c => c.id === camId);
  if (!cam) return;

  AppState.currentModalCamera = cam;
  const modal = document.getElementById('camera-modal');
  const title = document.getElementById('modal-cam-title');
  const info = document.getElementById('modal-cam-info');
  const video = document.getElementById('modal-video');
  const loader = document.getElementById('modal-loader');

  title.textContent = cam.name;
  info.innerHTML = `
    <span class="text-xs bg-slate-800 px-2.5 py-1 rounded-md text-slate-300 font-mono">${cam.id}</span>
    <span class="text-xs text-slate-400"><i class="fas fa-map-marker-alt text-red-400"></i> ${cam.lat}, ${cam.lng}</span>
    <span class="text-xs text-slate-400"><i class="fas fa-shield-alt text-blue-400"></i> ${cam.source}</span>
  `;

  if (loader) loader.style.display = 'flex';
  modal.classList.remove('hidden');

  if (AppState.modalHls) {
    AppState.modalHls.destroy();
    AppState.modalHls = null;
  }

  if (Hls.isSupported()) {
    const hls = new Hls({ debug: false, lowLatencyMode: true });
    hls.loadSource(cam.streamUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (loader) loader.style.display = 'none';
      video.play().catch(e => console.warn(e));
    });

    AppState.modalHls = hls;
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = cam.streamUrl;
    video.addEventListener('loadedmetadata', () => {
      if (loader) loader.style.display = 'none';
      video.play().catch(e => console.warn(e));
    });
  }
}

function closeModal() {
  const modal = document.getElementById('camera-modal');
  const video = document.getElementById('modal-video');
  if (AppState.modalHls) {
    AppState.modalHls.destroy();
    AppState.modalHls = null;
  }
  if (video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
  if (modal) modal.classList.add('hidden');
}

// M.7 River Water Level Details Modal
function openWaterModal() {
  const modal = document.getElementById('water-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  const content = document.getElementById('water-modal-content');
  if (AppState.waterData && content) {
    const w = AppState.waterData;
    content.innerHTML = `
      <div class="space-y-4 text-slate-200">
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <div class="text-xs text-slate-400">ระดับน้ำปัจจุบัน (ม.รทก.)</div>
            <div class="text-3xl font-bold text-cyan-400 mt-1">${w.latestMsl} <span class="text-base font-normal">ม.รทก.</span></div>
          </div>
          <div class="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <div class="text-xs text-slate-400">ระดับน้ำเทียบตลิ่ง M.7</div>
            <div class="text-3xl font-bold text-amber-400 mt-1">${w.latestM} <span class="text-base font-normal">ม.</span></div>
          </div>
        </div>

        <div class="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-2">
          <div class="flex justify-between items-center text-sm">
            <span>สถานะเตือนภัย:</span>
            <span class="font-semibold text-emerald-400">${w.flagText}</span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span>แนวโน้มการเปลี่ยนแปลง:</span>
            <span class="font-semibold">${w.trendText}</span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span>ระดับตลิ่งวิกฤต:</span>
            <span class="font-semibold text-red-400">112.00 ม.รทก. (7.00 ม.)</span>
          </div>
        </div>

        <div class="text-xs text-slate-400 pt-2 border-t border-slate-800 text-center">
          ที่มาข้อมูล: กรมชลประทาน (RID) • สถานีวัดน้ำสะพานเสรีประชาธิปไตย อ.เมือง จ.อุบลราชธานี
        </div>
      </div>
    `;
  }
}

function closeWaterModal() {
  const modal = document.getElementById('water-modal');
  if (modal) modal.classList.add('hidden');
}
