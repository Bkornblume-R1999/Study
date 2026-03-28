import { Api, getFareConfig, invalidateFareCache } from './api.js';

// ─── STATE ─────────────────────────────────────────────────────────────────────
const state = {
  map: null,
  currentMode: 'trike',
  discountType: 'none',
  regularPassengers: 1,
  discountedPassengers: 0,
  liveLocationWatchId: null,
  liveMarker: null,
  trike: {
    startMarker: null,
    endMarker: null,
    primaryRouteLayer: null,
    altRouteLayers: [],
    activeRouteIndex: 0,
    routes: [],   // raw OSRM route objects
  },
  busjeep: {
    routeControl: null,
    markers: [],
    selectedRoute: null,
    userMarker: null
  }
};

// ─── BUS/JEEP ROUTES ──────────────────────────────────────────────────────────
const ROUTES = {
  'uhaw': {
    name: 'Uhaw Route',
    color: '#10b981',
    stops: [
      [6.05770, 125.10150],[6.066884922625555, 125.1434596999282],[6.077595973054012, 125.14630932006035],
      [6.103867375918512, 125.15131957789644],[6.118545877545823, 125.16105536621555],[6.113102709883002, 125.1641208727235],
      [6.112729529261363, 125.17019837345096],[6.107332339041174, 125.17169075356206],[6.10715133832164, 125.17841548474036],
      [6.11504792768598, 125.1810033808399],[6.117269670385729, 125.18593755106797],[6.12161, 125.19026]
    ],
    labels: ["Airport","Kanto Uhaw Station","Jollibee","GenSan May Logistics","7-Eleven Bulaong","Husky Terminal","RD Plaza","Pioneer Avenue","Palengke","SM","KCC","Robinsons"]
  },
  'calumpang': {
    name: 'Calumpang Route',
    color: '#f59e0b',
    stops: [
      [6.078873108385696, 125.13528401472598],[6.077396262058303, 125.14070464684552],[6.077595973054012, 125.14630932006035],
      [6.107364931098272, 125.17185909281004],[6.1094378291354685, 125.17859477710057],[6.117269670385729, 125.18593755106797],
      [6.118803421745483, 125.19375059719822],[6.127613973270192, 125.19631931002468]
    ],
    labels: ["Lado Transco Terminal","GenSan National High","Western Oil","Pioneer Ave","Magsaysay UNITOP","KCC","Brigada Pharmacy","Lagao Public Market"]
  },
  'mabuhay': {
    name: 'Mabuhay Route',
    color: '#ffffff',
    stops: [
      [6.11752, 125.18612],[6.11658, 125.18520],[6.11514, 125.18107],[6.10745, 125.17857],[6.10721, 125.17180],
      [6.11263, 125.17029],[6.11733, 125.17319],[6.12117, 125.17136],[6.15283, 125.16705],[6.15466, 125.16342]
    ],
    labels: ["KCC Mall of Gensan","Gaisano Mall of Gensan","SM Mall of Gensan","Public Market","Pioneer","RD Plaza","Marist Street","711 Malakas","NLSA Road","MGTC Terminal"]
  }
};

// ─── PLACES DATABASE ──────────────────────────────────────────────────────────
const GENSAN_PLACES = [
  { name: 'SM Mall of GenSan', lat: 6.11615, lng: 125.18107, tags: ['mall', 'shopping', 'arcade', 'restaurants'] },
  { name: 'KCC Mall of GenSan', lat: 6.11605, lng: 125.18691, tags: ['mall', 'shopping', 'arcade', 'restaurants'] },
  { name: 'Robinsons Mall of GenSan', lat: 6.12099, lng: 125.19069, tags: ['mall', 'shopping', 'arcade', 'restaurants'] },
  { name: 'Gaisano Mall of GenSan', lat: 6.11727, lng: 125.18437, tags: ['mall', 'shopping', 'restaurants'] },
  { name: 'Fit Mart Mall of GenSan', lat: 6.11237, lng: 125.16923, tags: ['mall', 'shopping'] },
  { name: 'Veranza Mall', lat: 6.11600, lng: 125.18852, tags: ['mall', 'arcade', 'restaurants'] },
  { name: 'St.Elizabeth Hospital', lat: 6.11821, lng: 125.17995, tags: ['hospital', 'clinic'] },
  { name: 'GenSan Doctors Hospital', lat: 6.12011, lng: 125.17839, tags: ['hospital', 'clinic'] },
  { name: 'Mindanao Medical Center', lat: 6.12801, lng: 125.15985, tags: ['hospital', 'clinic'] },
  { name: 'Dadiangas Medical Center', lat: 6.12465, lng: 125.17772, tags: ['hospital', 'clinic'] },
  { name: 'Dr. Jorge P. Royeca Hospital', lat: 6.12568, lng: 125.18583, tags: ['hospital', 'clinic'] },
  { name: 'Socsargen County Hospital', lat: 6.11827, lng: 125.18984, tags: ['hospital', 'clinic'] },
  { name: 'Gensan Medical Center', lat: 6.08247, lng: 125.14768, tags: ['hospital', 'clinic'] },
  { name: 'Notre Dame of Dadiangas University', lat: 6.11748, lng: 125.17165, tags: ['nddu', 'university', 'school'] },
  { name: 'Mindanao State University - General Santos', lat: 6.11652, lng: 125.17171, tags: ['msu', 'university', 'school'] },
  { name: 'STI College, GenSan', lat: 6.11471, lng: 125.18297, tags: ['school', 'college'] },
  { name: 'Holy Trinity College', lat: 6.11334, lng: 125.16877, tags: ['school', 'college'] },
  { name: 'Goldenstate College, Acharon Boulevard', lat: 6.10716, lng: 125.17251, tags: ['glc', 'school', 'college'] },
  { name: 'New Era University', lat: 6.13672, lng: 125.17091, tags: ['school', 'university'] },
  { name: 'Lagao National High School', lat: 6.13483, lng: 125.17133, tags: ['school'] },
  { name: 'Bulaong Terminal', lat: 6.11335, lng: 125.16237, tags: ['bus', 'van', 'terminal'] },
  { name: 'Husky Terminal', lat: 6.11326, lng: 125.16428, tags: ['bus', 'transport', 'terminal'] },
  { name: 'Yellow Bus Terminal, Gensan', lat: 6.11950, lng: 125.17742, tags: ['bus', 'terminal'] },
  { name: 'Lagao Public Terminal', lat: 6.12740, lng: 125.19633, tags: ['van', 'bus', 'jeep', 'terminal'] },
  { name: 'International Airport, GenSan', lat: 6.05762, lng: 125.10083, tags: ['airport', 'plane'] },
  { name: 'Port of General Santos', lat: 6.09277, lng: 125.15536, tags: ['port', 'boat', 'ferry'] },
  { name: 'City Hall of GenSan', lat: 6.11302, lng: 125.17173, tags: ['government', 'city hall'] },
  { name: 'GenSan Public Market', lat: 6.10790, lng: 125.17848, tags: ['market', 'public market'] },
  { name: 'Lagao Public Market', lat: 6.12732, lng: 125.19660, tags: ['market', 'lagao'] },
  { name: 'Carlos P. Garcia Freedom Park', lat: 6.11538, lng: 125.17177, tags: ['park', 'plaza'] },
  { name: 'Plaza Heneral Santos', lat: 6.11214, lng: 125.17179, tags: ['park', 'plaza'] },
  { name: 'Queen Tuna Park', lat: 6.10678, lng: 125.17574, tags: ['park', 'beach'] },
  { name: 'Pacman Mansion 2', lat: 6.12767, lng: 125.16759, tags: ['landmark'] },
  { name: 'Pacman Mansion', lat: 6.13345, lng: 125.18503, tags: ['landmark'] },
  { name: 'Green Leaf Hotel', lat: 6.11470, lng: 125.18220, tags: ['hotel', 'pool', 'restaurant'] },
  { name: 'Grand Imperial Hotel', lat: 6.11970, lng: 125.18958, tags: ['hotel', 'pool', 'casino'] },
  { name: 'T Boli Hotel', lat: 6.11903, lng: 125.17770, tags: ['hotel'] },
  { name: 'Sun City Suites', lat: 6.11906, lng: 125.18320, tags: ['hotel', 'suites'] },
  { name: 'McDonalds, Digos-Makar Road', lat: 6.11912, lng: 125.17981, tags: ['restaurant', 'fastfood', 'mcdo'] },
  { name: 'Jollibee, Digos-Makar Road', lat: 6.11854, lng: 125.17887, tags: ['restaurant', 'fastfood', 'jollibee'] },
  { name: 'Starbucks - GenSan Highway', lat: 6.11924, lng: 125.18453, tags: ['restaurant', 'cafe', 'coffee', 'starbucks'] },
  { name: 'Burger King, Digos-Makar Road', lat: 6.11906, lng: 125.18049, tags: ['restaurant', 'fastfood'] },
  { name: 'Jollibee, Pendatun Avenue', lat: 6.11265, lng: 125.17032, tags: ['restaurant', 'fastfood', 'jollibee'] },
  { name: 'SM Savemore Market, Nuñez', lat: 6.13831, lng: 125.17002, tags: ['market', 'savemore', 'grocery'] },
  { name: 'SM Savemore Market, Calumpang', lat: 6.07740, lng: 125.14651, tags: ['market', 'savemore', 'grocery'] },
  { name: 'Philippine Statistics Authority, Gensan', lat: 6.11384, lng: 125.18006, tags: ['psa', 'government'] },
  { name: 'Hall of Justice, Gensan', lat: 6.12657, lng: 125.19856, tags: ['government', 'justice'] },
  { name: 'PacMan Wildcard Gym', lat: 6.11494, lng: 125.18192, tags: ['gym', 'fitness'] },
  { name: 'Amandare Cove', lat: 6.12274, lng: 125.15678, tags: ['pool', 'resort'] },
  { name: 'La Cassandra Subdivision', lat: 6.14048, lng: 125.12893, tags: [] },
  { name: 'Camella Homes', lat: 6.14260, lng: 125.17993, tags: ['subdivision', 'homes'] },
  { name: 'Bria Homes', lat: 6.15314, lng: 125.18770, tags: ['subdivision', 'homes'] },
  { name: 'Lessandra Homes', lat: 6.14608, lng: 125.18869, tags: ['subdivision', 'homes'] },
];

// ─── SEARCH HISTORY ────────────────────────────────────────────────────────────
const MAX_HISTORY = 4;
function getSearchHistory() {
  try { return JSON.parse(localStorage.getItem('geoGensan_searchHistory') || '[]'); }
  catch { return []; }
}
function addToSearchHistory(place) {
  let h = getSearchHistory().filter(x => x.name !== place.name);
  h.unshift({ name: place.name, lat: place.lat, lng: place.lng });
  if (h.length > MAX_HISTORY) h = h.slice(0, MAX_HISTORY);
  localStorage.setItem('geoGensan_searchHistory', JSON.stringify(h));
}

// ─── AUTOCOMPLETE ──────────────────────────────────────────────────────────────
function searchLocalPlaces(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const scored = GENSAN_PLACES.map(p => {
    const n = p.name.toLowerCase();
    let score = 0;
    if (n.startsWith(q)) score = 100;
    else if (n.includes(q)) score = 70;
    else if (p.tags.some(t => t.includes(q))) score = 50;
    else if (p.tags.some(t => q.includes(t))) score = 30;
    return { ...p, score };
  }).filter(p => p.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, 3); // top 3
}

let _activeAutocompleteInput = null;
function closeAllAutocompletes() {
  document.querySelectorAll('.autocomplete-dropdown').forEach(d => d.remove());
  _activeAutocompleteInput = null;
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.autocomplete-dropdown') || e.target.closest('.input-content')) return;
  closeAllAutocompletes();
}, true);

function createAutocompleteDropdown(inputEl, onSelect) {
  document.querySelectorAll('.autocomplete-dropdown').forEach(d => {
    const w = inputEl.closest('.input-content') || inputEl.parentElement;
    if (!w.contains(d)) d.remove();
  });
  const wrapper = inputEl.closest('.input-content') || inputEl.parentElement;
  const old = wrapper.querySelector('.autocomplete-dropdown');
  if (old) old.remove();
  _activeAutocompleteInput = inputEl;

  const query = inputEl.value.trim();
  const history = getSearchHistory();
  let results = query ? searchLocalPlaces(query) : history.map(h => ({ ...h, isHistory: true }));
  if (!results.length) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';
  if (!query && results.length) {
    const header = document.createElement('div');
    header.className = 'autocomplete-header';
    header.textContent = '🕐 Recent Searches';
    dropdown.appendChild(header);
  }
  results.forEach(place => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.innerHTML = `<span class="autocomplete-icon">${place.isHistory ? '🕐' : '📍'}</span><span class="autocomplete-name">${place.name}</span>`;
    const pick = (e) => { e.preventDefault(); onSelect(place); closeAllAutocompletes(); };
    item.addEventListener('mousedown', pick);
    item.addEventListener('touchend', pick);
    dropdown.appendChild(item);
  });
  wrapper.style.position = 'relative';
  wrapper.appendChild(dropdown);
}

function removeAutocomplete(inputEl) {
  const w = inputEl.closest('.input-content') || inputEl.parentElement;
  const d = w.querySelector('.autocomplete-dropdown');
  if (d) d.remove();
  if (_activeAutocompleteInput === inputEl) _activeAutocompleteInput = null;
}

// ─── GEOCODING ────────────────────────────────────────────────────────────────
const REGION12_VIEWBOX = '124.55,5.85,125.45,6.55';
function isWithinRegion12(lat, lng) {
  return lat >= 5.85 && lat <= 6.55 && lng >= 124.55 && lng <= 125.45;
}

async function reverseGeocode(latlng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    const addr = data.address || {};
    const name = data.name || '';
    const road = addr.road || addr.pedestrian || addr.footway || '';
    const suburb = addr.suburb || addr.village || addr.neighbourhood || addr.quarter || '';
    const parts = [];
    if (name && name !== road) parts.push(name);
    if (road) parts.push(road);
    if (suburb) parts.push(suburb);
    if (parts.length) return parts.slice(0, 2).join(', ');
    if (data.display_name) return data.display_name.split(',').map(s => s.trim()).filter(Boolean).slice(0, 2).join(', ');
    return `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
  } catch { return `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`; }
}

async function geocodeWithNominatim(query) {
  try {
    const url1 = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', South Cotabato, Philippines')}&viewbox=${REGION12_VIEWBOX}&bounded=1&limit=5&addressdetails=1`;
    const r1 = await fetch(url1, { headers: { 'Accept-Language': 'en' } });
    const d1 = await r1.json();
    const v1 = d1.filter(r => isWithinRegion12(parseFloat(r.lat), parseFloat(r.lon)));
    if (v1.length) return { lat: parseFloat(v1[0].lat), lng: parseFloat(v1[0].lon), name: v1[0].display_name.split(',')[0] };
    const url2 = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${REGION12_VIEWBOX}&bounded=1&limit=5`;
    const r2 = await fetch(url2, { headers: { 'Accept-Language': 'en' } });
    const d2 = await r2.json();
    const v2 = d2.filter(r => isWithinRegion12(parseFloat(r.lat), parseFloat(r.lon)));
    if (v2.length) return { lat: parseFloat(v2[0].lat), lng: parseFloat(v2[0].lon), name: v2[0].display_name.split(',')[0] };
    return null;
  } catch { return null; }
}

async function geocode(query) {
  const local = searchLocalPlaces(query);
  if (local.length && local[0].score >= 70) {
    addToSearchHistory(local[0]);
    return L.latLng(local[0].lat, local[0].lng);
  }
  const result = await geocodeWithNominatim(query);
  if (result) {
    addToSearchHistory({ name: result.name || query, lat: result.lat, lng: result.lng });
    return L.latLng(result.lat, result.lng);
  }
  showToast('❌ Location not found');
  return null;
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), duration);
}
function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

function createMarkerIcon(label, color) {
  return L.divIcon({
    html: `<div style="width:32px;height:32px;background:${color};border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:white;box-shadow:0 4px 12px rgba(0,0,0,0.3);">${label}</div>`,
    className: '', iconSize: [32, 32], iconAnchor: [16, 16]
  });
}

function createLiveMarkerIcon() {
  return L.divIcon({
    html: `<div style="width:20px;height:20px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(37,99,235,0.25);animation:live-pulse 2s ease-in-out infinite;"></div>`,
    className: '', iconSize: [20, 20], iconAnchor: [10, 10]
  });
}

// Speed assumptions for ETA
const AVG_SPEED = { trike: 25, bus: 35, jeep: 30 }; // km/h

function estimateETA(distanceKm, mode) {
  const speed = AVG_SPEED[mode] || 25;
  const minutes = (distanceKm / speed) * 60;
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

// ─── FIREBASE ─────────────────────────────────────────────────────────────────
const FIREBASE_DB_URL = 'https://gentrike-75c7c-default-rtdb.asia-southeast1.firebasedatabase.app';
const IMGBB_API_KEY   = '7416acef89ebb625100b3bf7a580770a';
const LAST_REPORT_KEY = 'geoGensan_lastReportTime';
const MAX_REPORTS     = 100;
const COOLDOWN_MS     = 2 * 60 * 60 * 1000;

async function uploadToImgBB(base64DataUrl) {
  const base64 = base64DataUrl.split(',')[1];
  const fd = new FormData();
  fd.append('image', base64); fd.append('key', IMGBB_API_KEY);
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (data.success) return data.data.url;
  throw new Error('ImgBB upload failed');
}

async function fbPush(path, value) {
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
  if (!res.ok) throw new Error('Firebase write failed');
  return res.json();
}

async function fbGetAll(path) {
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json`);
  if (!res.ok) throw new Error('Firebase read failed');
  const data = await res.json();
  if (!data) return [];
  return Object.entries(data).map(([key, val]) => ({ _key: key, ...val })).sort((a, b) => b.timestamp - a.timestamp);
}

async function fbDelete(path) {
  const res = await fetch(`${FIREBASE_DB_URL}/${path}.json`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Firebase delete failed');
}

async function enforceReportCap() {
  const res = await fetch(`${FIREBASE_DB_URL}/reports.json`);
  if (!res.ok) return;
  const data = await res.json();
  if (!data) return;
  const entries = Object.entries(data).sort((a, b) => a[1].timestamp - b[1].timestamp);
  if (entries.length > MAX_REPORTS) {
    await Promise.all(entries.slice(0, entries.length - MAX_REPORTS).map(([key]) => fbDelete(`reports/${key}`)));
  }
}

function canSubmitReport() {
  return Date.now() - parseInt(localStorage.getItem(LAST_REPORT_KEY) || '0') >= COOLDOWN_MS;
}
function getRemainingCooldown() {
  return Math.max(0, COOLDOWN_MS - (Date.now() - parseInt(localStorage.getItem(LAST_REPORT_KEY) || '0')));
}
function formatCooldown(ms) {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`; if (m > 0) return `${m}m ${s}s`; return `${s}s`;
}

// ─── MAP INIT ─────────────────────────────────────────────────────────────────
function initMap() {
  const map = L.map('map', { zoomControl: true, minZoom: 8, maxZoom: 19 }).setView([6.116, 125.171], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  map.createPane('darkOverlayPane'); map.getPane('darkOverlayPane').style.zIndex = 250; map.getPane('darkOverlayPane').style.pointerEvents = 'none';
  map.createPane('busRoutePane'); map.getPane('busRoutePane').style.zIndex = 420; map.getPane('busRoutePane').style.pointerEvents = 'none';
  map.createPane('busMarkerPane'); map.getPane('busMarkerPane').style.zIndex = 440;
  map.createPane('altRoutePane'); map.getPane('altRoutePane').style.zIndex = 380; map.getPane('altRoutePane').style.pointerEvents = 'none';
  state.map = map;
  map.on('click', handleMapClick);
  setTimeout(() => map.invalidateSize(), 100);
  return map;
}

// ─── LIVE LOCATION ────────────────────────────────────────────────────────────
function startLiveLocation() {
  if (!navigator.geolocation) { showToast('❌ Geolocation not supported'); return; }
  if (state.liveLocationWatchId) { stopLiveLocation(); return; }

  showToast('📡 Live location active');
  const btn = document.getElementById('use-location');
  if (btn) btn.classList.add('live-active');

  state.liveLocationWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const latlng = L.latLng(lat, lng);

      if (!state.liveMarker) {
        state.liveMarker = L.marker(latlng, { icon: createLiveMarkerIcon(), zIndexOffset: 1000 }).addTo(state.map);
        state.liveMarker.bindTooltip('You are here', { permanent: false, direction: 'top' });
      } else {
        state.liveMarker.setLatLng(latlng);
      }

      // If trike mode and start marker not manually set, update it
      if (state.currentMode === 'trike' && !state.trike._startManuallySet) {
        if (!state.trike.startMarker) {
          state.trike.startMarker = L.marker(latlng, { draggable: true, icon: createMarkerIcon('A', '#10b981') }).addTo(state.map);
          state.trike.startMarker.on('dragend', () => { state.trike._startManuallySet = true; updateTrikeRoute(); });
        } else {
          state.trike.startMarker.setLatLng(latlng);
        }
        updateTrikeRoute();
      }

      state.map.setView(latlng, state.map.getZoom() < 15 ? 15 : state.map.getZoom());
    },
    (err) => { showToast('❌ Could not get live location'); console.error(err); },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );
}

function stopLiveLocation() {
  if (state.liveLocationWatchId) {
    navigator.geolocation.clearWatch(state.liveLocationWatchId);
    state.liveLocationWatchId = null;
  }
  if (state.liveMarker) { state.liveMarker.remove(); state.liveMarker = null; }
  const btn = document.getElementById('use-location');
  if (btn) btn.classList.remove('live-active');
  showToast('📍 Live location stopped');
}

// ─── MAP CLICK ────────────────────────────────────────────────────────────────
function handleMapClick(e) {
  if (state.currentMode !== 'trike') return;
  const { startMarker, endMarker } = state.trike;
  if (!startMarker) {
    state.trike.startMarker = L.marker(e.latlng, { draggable: true, icon: createMarkerIcon('A', '#10b981') }).addTo(state.map);
    state.trike.startMarker.on('dragend', updateTrikeRoute);
    state.trike._startManuallySet = true;
    showToast('📍 Start point set');
  } else if (!endMarker) {
    state.trike.endMarker = L.marker(e.latlng, { draggable: true, icon: createMarkerIcon('B', '#ef4444') }).addTo(state.map);
    state.trike.endMarker.on('dragend', updateTrikeRoute);
    showToast('🎯 Calculating routes...');
  } else {
    state.trike.startMarker.setLatLng(state.trike.endMarker.getLatLng());
    state.trike.endMarker.setLatLng(e.latlng);
    showToast('🔄 Route updated');
  }
  updateTrikeRoute();
}

// ─── TRIKE ROUTE (multi-route) ───────────────────────────────────────────────
function clearTrikeRoutes() {
  if (state.trike.primaryRouteLayer) { state.trike.primaryRouteLayer.remove(); state.trike.primaryRouteLayer = null; }
  state.trike.altRouteLayers.forEach(l => l.remove());
  state.trike.altRouteLayers = [];
  state.trike.routes = [];
  state.trike.activeRouteIndex = 0;
}

async function updateTrikeRoute() {
  const { startMarker, endMarker } = state.trike;
  const startEl = document.getElementById('start-display');
  const endEl = document.getElementById('end-display');

  if (startMarker) {
    const addr = await reverseGeocode(startMarker.getLatLng());
    if (startEl) { startEl.textContent = addr; startEl.classList.remove('is-placeholder'); }
  }
  if (endMarker) {
    const addr = await reverseGeocode(endMarker.getLatLng());
    if (endEl) { endEl.textContent = addr; endEl.classList.remove('is-placeholder'); }
  }

  if (!startMarker || !endMarker) return;

  clearTrikeRoutes();
  showLoading();

  const start = startMarker.getLatLng();
  const end = endMarker.getLatLng();

  try {
    // Fetch up to 3 alternative routes from OSRM
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?alternatives=3&overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    hideLoading();

    if (!data.routes || !data.routes.length) {
      showToast('❌ No routes found');
      return;
    }

    state.trike.routes = data.routes;

    // Draw alt routes (broken dashed lines) first
    data.routes.slice(1).forEach((route, idx) => {
      const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const layer = L.polyline(coords, {
        color: '#94a3b8',
        weight: 4,
        opacity: 0.6,
        dashArray: '8, 8',
        pane: 'altRoutePane'
      }).addTo(state.map);
      layer.on('click', () => selectAlternativeRoute(idx + 1));
      layer.bindTooltip(`Alternative Route ${idx + 2} (${(route.distance / 1000).toFixed(1)} km)`, { sticky: true });
      state.trike.altRouteLayers.push(layer);
    });

    // Draw primary (shortest) route
    const primary = data.routes[0];
    const primaryCoords = primary.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    state.trike.primaryRouteLayer = L.polyline(primaryCoords, {
      color: '#2563eb',
      weight: 6,
      opacity: 0.9,
      pane: 'busRoutePane'
    }).addTo(state.map);

    // Fit bounds
    const allCoords = data.routes.flatMap(r => r.geometry.coordinates.map(([lng, lat]) => [lat, lng]));
    state.map.fitBounds(L.latLngBounds(allCoords), { padding: [50, 50] });

    const distanceKm = primary.distance / 1000;
    document.getElementById('distance-display').textContent = `${distanceKm.toFixed(2)} km`;

    const eta = estimateETA(distanceKm, 'trike');
    const etaEl = document.getElementById('eta-display');
    if (etaEl) etaEl.textContent = eta;

    const fareData = await Api.computeFare({
      mode: 'trike',
      distanceKm,
      discountType: state.discountType,
      regularPassengers: state.regularPassengers,
      discountedPassengers: state.discountedPassengers
    });
    displayFare(fareData);
    expandPanelOnMobile();

    if (data.routes.length > 1) {
      showToast(`🛣️ ${data.routes.length} routes found — tap dashed line for alternatives`, 3500);
    }
  } catch (err) {
    hideLoading();
    console.error(err);
    showToast('❌ Could not calculate route');
  }
}

function selectAlternativeRoute(index) {
  if (!state.trike.routes[index]) return;
  state.trike.activeRouteIndex = index;

  // Remove old layers
  if (state.trike.primaryRouteLayer) { state.trike.primaryRouteLayer.remove(); }
  state.trike.altRouteLayers.forEach(l => l.remove());
  state.trike.altRouteLayers = [];

  const routes = state.trike.routes;

  // Redraw all routes with new primary
  routes.forEach((route, i) => {
    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    if (i === index) {
      state.trike.primaryRouteLayer = L.polyline(coords, { color: '#2563eb', weight: 6, opacity: 0.9, pane: 'busRoutePane' }).addTo(state.map);
    } else {
      const layer = L.polyline(coords, { color: '#94a3b8', weight: 4, opacity: 0.6, dashArray: '8, 8', pane: 'altRoutePane' }).addTo(state.map);
      layer.on('click', () => selectAlternativeRoute(i));
      layer.bindTooltip(`Route ${i + 1} (${(route.distance / 1000).toFixed(1)} km)`, { sticky: true });
      state.trike.altRouteLayers.push(layer);
    }
  });

  const selected = routes[index];
  const distanceKm = selected.distance / 1000;
  document.getElementById('distance-display').textContent = `${distanceKm.toFixed(2)} km`;
  const etaEl = document.getElementById('eta-display');
  if (etaEl) etaEl.textContent = estimateETA(distanceKm, 'trike');

  Api.computeFare({
    mode: 'trike',
    distanceKm,
    discountType: state.discountType,
    regularPassengers: state.regularPassengers,
    discountedPassengers: state.discountedPassengers
  }).then(displayFare);

  showToast(`✅ Route ${index + 1} selected (${distanceKm.toFixed(1)} km)`);
}

function expandPanelOnMobile() {
  if (window.innerWidth < 1024) {
    const panel = document.getElementById('control-panel');
    panel.classList.remove('minimized');
    panel.classList.add('expanded');
  }
}

function displayFare(fareData) {
  const fareDisplay = document.getElementById('fare-display');
  const fareBreakdown = document.getElementById('fare-breakdown');
  const fareFormulaEl = document.getElementById('fare-formula');

  fareDisplay.textContent = `₱${fareData.totalFare}`;

  const hasPassengers = fareData.regularPassengers > 1 || fareData.discountedPassengers > 0;
  const hasDiscount = fareData.discountedPassengers > 0;

  if (hasPassengers || hasDiscount) {
    fareBreakdown.style.display = 'flex';
    fareBreakdown.innerHTML = '';

    const rows = [];
    if (fareData.regularPassengers > 0) {
      rows.push(`<div class="breakdown-row"><span>Regular ×${fareData.regularPassengers} (₱${fareData.baseFarePerPerson} each):</span><span>₱${fareData.regularTotal}</span></div>`);
    }
    if (fareData.discountedPassengers > 0) {
      rows.push(`<div class="breakdown-row discount-applied"><span>Special ×${fareData.discountedPassengers} (₱${fareData.discountedFarePerPerson} each, ${Math.round(fareData.discountRate * 100)}% off):</span><span>₱${fareData.discountedTotal}</span></div>`);
    }
    fareBreakdown.innerHTML = rows.join('');
  } else {
    fareBreakdown.style.display = 'none';
  }

  if (fareFormulaEl) {
    const config = fareData.config && fareData.config.trike;
    if (config) {
      fareFormulaEl.textContent = `₱${config.baseFare} base (${config.baseKm}km) + ₱${config.perKmRate}/km`;
    } else {
      fareFormulaEl.textContent = '₱15 base (4km) + ₱1/km';
    }
  }
}

function clearTrikeRoute() { clearTrikeRoutes(); }

function clearTrikeMarkers() {
  if (state.trike.startMarker) { state.trike.startMarker.remove(); state.trike.startMarker = null; }
  if (state.trike.endMarker) { state.trike.endMarker.remove(); state.trike.endMarker = null; }
  state.trike._startManuallySet = false;
  clearTrikeRoutes();

  ['search-start', 'search-end'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['start-display', 'end-display'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = 'Tap map or search'; el.classList.add('is-placeholder'); }
  });
  document.getElementById('distance-display').textContent = '—';
  document.getElementById('fare-display').textContent = '₱—';
  const etaEl = document.getElementById('eta-display');
  if (etaEl) etaEl.textContent = '—';
  const fb = document.getElementById('fare-breakdown');
  if (fb) { fb.style.display = 'none'; fb.innerHTML = ''; }
  const panel = document.getElementById('control-panel');
  panel.classList.remove('expanded');
}

// ─── BUS/JEEP ROUTES ─────────────────────────────────────────────────────────
function showRoute(routeKey) {
  clearBusJeepRoute();
  const route = ROUTES[routeKey];
  if (!route) return;
  state.busjeep.selectedRoute = routeKey;
  const isWhite = route.color === '#ffffff';

  route.stops.forEach((coords, idx) => {
    const marker = L.circleMarker(coords, {
      radius: 10, color: '#000000', fillColor: isWhite ? '#ffffff' : route.color,
      fillOpacity: 1, weight: 2.5, pane: 'busMarkerPane'
    }).addTo(state.map);
    marker.bindTooltip(route.labels[idx], { permanent: false, direction: 'top' });
    state.busjeep.markers.push(marker);
  });

  const waypoints = route.stops.map(([lat, lng]) => L.latLng(lat, lng));
  const lineStyles = isWhite
    ? [{ color: '#000000', weight: 9, opacity: 0.25 }, { color: '#000000', weight: 7, opacity: 0.35 }, { color: '#ffffff', weight: 5, opacity: 1 }]
    : [{ color: '#000000', weight: 9, opacity: 0.35 }, { color: route.color, weight: 6, opacity: 1 }];
  const busRenderer = L.svg({ pane: 'busRoutePane' });

  state.busjeep.routeControl = L.Routing.control({
    waypoints,
    lineOptions: { styles: lineStyles, addWaypoints: false, renderer: busRenderer },
    router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
    createMarker: () => null, addWaypoints: false, draggableWaypoints: false, fitSelectedRoutes: true, show: false
  }).addTo(state.map);

  // ETA for bus
  state.busjeep.routeControl.on('routesfound', (e) => {
    const dist = e.routes[0].summary.totalDistance / 1000;
    const etaEl = document.getElementById('bus-eta-display');
    if (etaEl) etaEl.textContent = estimateETA(dist, 'bus');
    const distEl = document.getElementById('bus-dist-display');
    if (distEl) distEl.textContent = `${dist.toFixed(1)} km`;
  });

  const bounds = L.latLngBounds(waypoints);
  state.map.flyToBounds(bounds, { padding: [40, 40], duration: 1.2 });
  showRouteDetail(route);
  showToast(`🚌 ${route.name} selected`);
}

function showRouteDetail(route) {
  const detailEl = document.getElementById('route-detail');
  const nameEl = document.getElementById('route-detail-name');
  const stopsEl = document.getElementById('stops-list');
  nameEl.textContent = route.name;
  stopsEl.innerHTML = route.labels.map((label, idx) => `
    <div class="stop-item clickable-stop" data-idx="${idx}" style="cursor:pointer;">
      <div class="stop-number">${idx + 1}</div>
      <div>${label}</div>
    </div>
  `).join('');
  stopsEl.querySelectorAll('.clickable-stop').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.idx);
      const coords = route.stops[idx];
      if (coords) {
        state.map.flyTo([coords[0], coords[1]], 17, { duration: 0.8 });
        const marker = state.busjeep.markers[idx];
        if (marker) marker.openTooltip();
      }
    });
  });
  detailEl.style.display = 'block';
}

function clearBusJeepRoute() {
  if (state.busjeep.routeControl) { state.busjeep.routeControl.remove(); state.busjeep.routeControl = null; }
  state.busjeep.markers.forEach(m => m.remove());
  state.busjeep.markers = [];
  state.busjeep.selectedRoute = null;
  document.getElementById('route-detail').style.display = 'none';
}

// ─── MODE SWITCH ──────────────────────────────────────────────────────────────
function switchMode(mode) {
  if (state.currentMode === mode) return;
  state.currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    const a = btn.dataset.mode === mode;
    btn.classList.toggle('active', a);
    btn.setAttribute('aria-selected', a);
  });
  document.querySelectorAll('.panel-view').forEach(view => {
    view.classList.toggle('active', view.dataset.view === mode);
  });
  if (mode !== 'trike') clearTrikeMarkers();
  if (mode !== 'busjeep') {
    clearBusJeepRoute();
    const overlay = document.getElementById('map-dark-overlay');
    if (overlay) overlay.style.display = 'none';
    if (state.busjeep.userMarker) { state.busjeep.userMarker.remove(); state.busjeep.userMarker = null; }
  } else {
    let overlay = document.getElementById('map-dark-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'map-dark-overlay';
      overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;background:rgba(0,0,0,0.55);pointer-events:none;z-index:300;transition:opacity 0.3s';
      document.getElementById('map').appendChild(overlay);
    }
    overlay.style.display = 'block';
    setTimeout(() => {
      document.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
      const uhawCard = document.querySelector('.route-card[data-route="uhaw"]');
      if (uhawCard) uhawCard.classList.add('selected');
      showRoute('uhaw');
    }, 100);
  }
  document.getElementById('control-panel').classList.remove('expanded');
  setTimeout(() => state.map.invalidateSize(), 100);
}

// ─── PASSENGERS ──────────────────────────────────────────────────────────────
function updatePassengerCount(type, delta) {
  if (type === 'regular') {
    const newVal = state.regularPassengers + delta;
    if (newVal < 1 || newVal > 6) return;
    state.regularPassengers = newVal;
    document.getElementById('regular-count').textContent = newVal;
  } else {
    const newVal = state.discountedPassengers + delta;
    const total = state.regularPassengers + newVal;
    if (newVal < 0 || total > 6) return;
    state.discountedPassengers = newVal;
    document.getElementById('discounted-count').textContent = newVal;
  }
  document.getElementById('total-pax-display').textContent = `${state.regularPassengers + state.discountedPassengers} passenger${state.regularPassengers + state.discountedPassengers !== 1 ? 's' : ''}`;
  if (state.trike.startMarker && state.trike.endMarker) {
    const dist = parseFloat(document.getElementById('distance-display').textContent);
    if (!isNaN(dist)) {
      Api.computeFare({ mode: 'trike', distanceKm: dist, discountType: state.discountType, regularPassengers: state.regularPassengers, discountedPassengers: state.discountedPassengers }).then(displayFare);
    }
  }
}

// ─── DISCOUNT ────────────────────────────────────────────────────────────────
function selectDiscount(discountType) {
  state.discountType = discountType;
  document.querySelectorAll('.discount-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.discount === discountType));

  // Show/hide discounted pax row
  const discPaxRow = document.getElementById('discounted-pax-row');
  if (discPaxRow) discPaxRow.style.display = discountType === 'special' ? 'flex' : 'none';

  if (state.trike.startMarker && state.trike.endMarker) {
    const dist = parseFloat(document.getElementById('distance-display').textContent);
    if (!isNaN(dist)) {
      Api.computeFare({ mode: 'trike', distanceKm: dist, discountType, regularPassengers: state.regularPassengers, discountedPassengers: state.discountedPassengers }).then(displayFare);
    }
  }
  showToast(discountType === 'special' ? '💳 Special discount applied' : '👤 Regular fare');
}

// ─── DARK MODE ────────────────────────────────────────────────────────────────
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
  const lbl = document.getElementById('dark-mode-label');
  if (lbl) lbl.textContent = isDark ? 'Light' : 'Dark';
  showToast(isDark ? '🌙 Dark mode on' : '☀️ Light mode on');
}

// ─── COMPLAINT SYSTEM ─────────────────────────────────────────────────────────
let cooldownInterval = null;
let pendingImageData = null;
let pendingImageFile = null;

function initComplaintModal() {
  const openBtn = document.getElementById('open-complaint');
  const modal = document.getElementById('complaint-modal');
  const closeBtn = document.getElementById('close-complaint');
  const submitBtn = document.getElementById('submit-complaint');
  const descTextarea = document.getElementById('complaint-desc');
  const descCount = document.getElementById('desc-count');
  const dropZone = document.getElementById('image-drop-zone');
  const fileInput = document.getElementById('complaint-image-input');
  const dropIdle = document.getElementById('drop-zone-idle');
  const dropPreview = document.getElementById('drop-zone-preview');
  const imgPreview = document.getElementById('complaint-img-preview');
  const removeBtn = document.getElementById('drop-remove-img');

  function resetImageState() {
    pendingImageData = null; pendingImageFile = null;
    if (dropIdle) dropIdle.style.display = 'flex';
    if (dropPreview) dropPreview.style.display = 'none';
    if (imgPreview) imgPreview.src = '';
    if (fileInput) fileInput.value = '';
  }

  function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) { showToast('❌ Invalid image'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('❌ Image must be under 5MB'); return; }
    pendingImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      pendingImageData = e.target.result;
      imgPreview.src = pendingImageData;
      dropIdle.style.display = 'none';
      dropPreview.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  }

  if (dropZone) {
    dropIdle.addEventListener('click', () => fileInput && fileInput.click());
    fileInput && fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleImageFile(e.target.files[0]); });
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]); });
  }
  if (removeBtn) removeBtn.addEventListener('click', (e) => { e.stopPropagation(); resetImageState(); });
  if (openBtn) openBtn.addEventListener('click', () => { modal.style.display = 'flex'; updateCooldownUI(); });
  if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; clearInterval(cooldownInterval); });
  modal.addEventListener('click', (e) => { if (e.target === modal) { modal.style.display = 'none'; clearInterval(cooldownInterval); } });
  if (descTextarea) descTextarea.addEventListener('input', () => { descCount.textContent = descTextarea.value.length; });

  if (submitBtn) submitBtn.addEventListener('click', async () => {
    const plate = document.getElementById('complaint-plate').value.trim();
    const type = document.getElementById('complaint-type').value;
    const desc = document.getElementById('complaint-desc').value.trim();
    if (!plate && !pendingImageData) { showToast('❌ Enter a plate number or attach a photo'); return; }
    if (!type) { showToast('❌ Please select a report type'); return; }
    if (!desc) { showToast('❌ Please enter a description'); return; }
    if (!canSubmitReport()) { showToast('⏳ Please wait before submitting again'); return; }
    submitBtn.disabled = true; submitBtn.textContent = '⏳ Submitting...';
    try {
      let imageUrl = null;
      if (pendingImageData) { showToast('📤 Uploading photo...', 10000); imageUrl = await uploadToImgBB(pendingImageData); }
      await fbPush('reports', {
        plate: plate.toUpperCase() || '(photo only)', type, description: desc,
        imageUrl: imageUrl || null, timestamp: Date.now(),
        date: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
      });
      enforceReportCap();
      localStorage.setItem(LAST_REPORT_KEY, Date.now().toString());
      document.getElementById('complaint-plate').value = '';
      document.getElementById('complaint-type').value = '';
      document.getElementById('complaint-desc').value = '';
      descCount.textContent = '0';
      resetImageState();
      modal.style.display = 'none';
      showToast('✅ Report submitted!', 3000);
    } catch (err) {
      console.error(err); showToast('❌ Submission failed');
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = 'Submit Report';
    }
  });
}

function updateCooldownUI() {
  const notice = document.getElementById('complaint-cooldown-notice');
  const timerEl = document.getElementById('cooldown-timer');
  const submitBtn = document.getElementById('submit-complaint');
  clearInterval(cooldownInterval);
  if (!canSubmitReport()) {
    notice.style.display = 'flex'; submitBtn.disabled = true; submitBtn.style.opacity = '0.5';
    const tick = () => {
      const rem = getRemainingCooldown();
      if (rem <= 0) { clearInterval(cooldownInterval); notice.style.display = 'none'; submitBtn.disabled = false; submitBtn.style.opacity = '1'; return; }
      timerEl.textContent = formatCooldown(rem);
    };
    tick(); cooldownInterval = setInterval(tick, 1000);
  } else {
    notice.style.display = 'none'; submitBtn.disabled = false; submitBtn.style.opacity = '1';
  }
}

// ─── PANEL DRAG ───────────────────────────────────────────────────────────────
function initPanelDrag() {
  const panel = document.getElementById('control-panel');
  const handle = document.querySelector('.panel-handle');
  if (!handle || window.innerWidth >= 1024) return;
  let startY = 0, currentY = 0, isDragging = false;
  const handleStart = (e) => { const t = e.type === 'touchstart' ? e.touches[0] : e; startY = t.clientY; isDragging = true; panel.style.transition = 'none'; };
  const handleMove = (e) => {
    if (!isDragging) return;
    const t = e.type === 'touchmove' ? e.touches[0] : e;
    currentY = t.clientY;
    const dY = currentY - startY;
    if (dY > 0 && !panel.classList.contains('minimized')) panel.style.transform = `translateY(${dY}px)`;
    else if (dY < 0 && panel.classList.contains('minimized')) panel.style.transform = `translateY(calc(100% - 60px + ${dY}px))`;
  };
  const handleEnd = () => {
    if (!isDragging) return;
    isDragging = false; panel.style.transition = ''; panel.style.transform = '';
    const dY = currentY - startY;
    if (Math.abs(dY) > 50) {
      if (dY > 0) { panel.classList.add('minimized'); panel.classList.remove('expanded'); }
      else panel.classList.remove('minimized');
    }
  };
  handle.addEventListener('touchstart', handleStart, { passive: true });
  document.addEventListener('touchmove', handleMove, { passive: true });
  document.addEventListener('touchend', handleEnd);
  handle.addEventListener('mousedown', handleStart);
  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleEnd);
  handle.addEventListener('click', (e) => { if (e.detail === 1) { panel.classList.toggle('minimized'); panel.classList.remove('expanded'); } });
}

// ─── MATRIX TABS ─────────────────────────────────────────────────────────────
function initMatrixTabs() {
  document.querySelectorAll('.matrix-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const cluster = tab.dataset.cluster;
      document.querySelectorAll('.matrix-tab').forEach(t => t.classList.toggle('active', t.dataset.cluster === cluster));
      document.querySelectorAll('.matrix-view').forEach(v => v.classList.toggle('active', v.dataset.cluster === cluster));
    });
  });
}

// ─── SEARCH SETUP ────────────────────────────────────────────────────────────
function setupSearchField(inputId, labelId) {
  const inp = document.getElementById(inputId);
  const lbl = document.getElementById(labelId);
  if (!inp || !lbl) return;
  lbl.addEventListener('click', () => { lbl.style.display = 'none'; inp.classList.add('is-active'); inp.focus(); inp.value = ''; });
  const wrapper = inp.closest && inp.closest('.input-wrapper');
  if (wrapper) wrapper.addEventListener('click', () => { lbl.style.display = 'none'; inp.classList.add('is-active'); inp.focus(); });
  inp.addEventListener('blur', () => { inp.classList.remove('is-active'); lbl.style.display = ''; inp.value = ''; });
}

// ─── EVENT LISTENERS ─────────────────────────────────────────────────────────
function initEventListeners() {
  document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', () => switchMode(btn.dataset.mode)));
  document.querySelectorAll('.discount-btn').forEach(btn => btn.addEventListener('click', () => selectDiscount(btn.dataset.discount)));
  const dmToggle = document.getElementById('dark-mode-toggle');
  if (dmToggle) dmToggle.addEventListener('click', toggleDarkMode);
  document.getElementById('reset-trike').addEventListener('click', () => { clearTrikeMarkers(); showToast('🔄 Reset'); });

  // Live location toggle
  document.getElementById('use-location').addEventListener('click', () => {
    if (state.liveLocationWatchId) stopLiveLocation(); else startLiveLocation();
  });

  setupSearchField('search-start', 'start-display');
  setupSearchField('search-end', 'end-display');

  function selectStartPlace(place) {
    const latlng = L.latLng(place.lat, place.lng);
    addToSearchHistory(place);
    if (state.trike.startMarker) state.trike.startMarker.setLatLng(latlng);
    else {
      state.trike.startMarker = L.marker(latlng, { draggable: true, icon: createMarkerIcon('A', '#10b981') }).addTo(state.map);
      state.trike.startMarker.on('dragend', updateTrikeRoute);
    }
    state.trike._startManuallySet = true;
    state.map.setView(latlng, 15);
    updateTrikeRoute();
    document.getElementById('search-start').blur();
  }

  function selectEndPlace(place) {
    const latlng = L.latLng(place.lat, place.lng);
    addToSearchHistory(place);
    if (state.trike.endMarker) state.trike.endMarker.setLatLng(latlng);
    else {
      state.trike.endMarker = L.marker(latlng, { draggable: true, icon: createMarkerIcon('B', '#ef4444') }).addTo(state.map);
      state.trike.endMarker.on('dragend', updateTrikeRoute);
    }
    state.map.setView(latlng, 15);
    updateTrikeRoute();
    document.getElementById('search-end').blur();
  }

  const searchStart = document.getElementById('search-start');
  const searchEnd = document.getElementById('search-end');

  searchStart.addEventListener('focus', () => { removeAutocomplete(searchEnd); createAutocompleteDropdown(searchStart, selectStartPlace); });
  searchStart.addEventListener('input', () => createAutocompleteDropdown(searchStart, selectStartPlace));
  searchStart.addEventListener('keypress', async (e) => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim(); if (!q) return;
    closeAllAutocompletes();
    const latlng = await geocode(q);
    if (latlng) {
      if (state.trike.startMarker) state.trike.startMarker.setLatLng(latlng);
      else { state.trike.startMarker = L.marker(latlng, { draggable: true, icon: createMarkerIcon('A', '#10b981') }).addTo(state.map); state.trike.startMarker.on('dragend', updateTrikeRoute); }
      state.trike._startManuallySet = true;
      state.map.setView(latlng, 15); updateTrikeRoute(); e.target.blur();
    }
  });

  searchEnd.addEventListener('focus', () => { removeAutocomplete(searchStart); createAutocompleteDropdown(searchEnd, selectEndPlace); });
  searchEnd.addEventListener('input', () => createAutocompleteDropdown(searchEnd, selectEndPlace));
  searchEnd.addEventListener('keypress', async (e) => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim(); if (!q) return;
    closeAllAutocompletes();
    const latlng = await geocode(q);
    if (latlng) {
      if (state.trike.endMarker) state.trike.endMarker.setLatLng(latlng);
      else { state.trike.endMarker = L.marker(latlng, { draggable: true, icon: createMarkerIcon('B', '#ef4444') }).addTo(state.map); state.trike.endMarker.on('dragend', updateTrikeRoute); }
      state.map.setView(latlng, 15); updateTrikeRoute(); e.target.blur();
    }
  });

  document.querySelectorAll('.route-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      showRoute(card.dataset.route);
    });
  });

  document.getElementById('clear-route').addEventListener('click', () => {
    clearBusJeepRoute();
    document.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
    showToast('Route cleared');
  });

  // Passenger controls
  ['regular', 'discounted'].forEach(type => {
    const minusBtn = document.getElementById(`${type}-minus`);
    const plusBtn = document.getElementById(`${type}-plus`);
    if (minusBtn) minusBtn.addEventListener('click', () => updatePassengerCount(type, -1));
    if (plusBtn) plusBtn.addEventListener('click', () => updatePassengerCount(type, 1));
  });
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
function init() {
  initMap();
  ['start-display', 'end-display'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('is-placeholder');
  });
  initEventListeners();
  initPanelDrag();
  initMatrixTabs();
  initComplaintModal();

  const darkMode = localStorage.getItem('darkMode');
  if (darkMode === 'enabled') {
    document.body.classList.add('dark-mode');
    const lbl = document.getElementById('dark-mode-label');
    if (lbl) lbl.textContent = 'Light';
  }

  // Init discounted pax row visibility
  const discPaxRow = document.getElementById('discounted-pax-row');
  if (discPaxRow) discPaxRow.style.display = 'none';

  // Init passenger display
  const totalEl = document.getElementById('total-pax-display');
  if (totalEl) totalEl.textContent = '1 passenger';

  setTimeout(() => showToast('👋 Welcome to GeoGensan!', 3000), 500);
}

document.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', () => { if (state.map) state.map.invalidateSize(); });
