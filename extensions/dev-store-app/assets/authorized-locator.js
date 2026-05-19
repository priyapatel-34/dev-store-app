const GOOGLE_MAPS_API_KEY = 'AIzaSyDHtyLmeYuEQGSsZQMB6FOTWe1IiGtJ7Bg';
const NEARBY_STORES_RADIUS_KM = 5;
const GOOGLE_MAP_ID = 'DEMO_MAP_ID';
const UserLocation = { latitude: null, longitude: null, accuracy: null };
const App = { stores: [], map: null, markers: [] };

let sharedInfoWindow = null;
let userLocationMarker = null;
let isFetchingNearby = false;
let suggestionTimer = null;

const getDistanceUnit = () => window.DISTANCE_UNIT || 'km';

document.addEventListener('DOMContentLoaded', async () => {
  renderRadiusDropdown();
  initDropdowns();
  setupLocationSearch();
  initCurrentLocationButton();
  await loadFilterSettings();
  await loadCategories();
  await initGoogleMap();
  await loadRetailers();
});

// GOOGLE MAPS BOOTSTRAP

async function bootstrapGoogleMaps() {
  if (window.google?.maps) return;
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('googleMapsScript');
    if (existing) { existing.onload = resolve; return; }

    const script = Object.assign(document.createElement('script'), {
      id: 'googleMapsScript',
      src: `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,marker&v=weekly`,
      async: true,
      defer: true,
      onload: resolve,
      onerror: () => reject('Google Maps failed to load'),
    });
    document.head.appendChild(script);
  });
}

async function initGoogleMap() {
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) return;

  await bootstrapGoogleMaps();
  const { Map, InfoWindow } = await google.maps.importLibrary('maps');

  sharedInfoWindow = new InfoWindow();
  App.map = new Map(mapContainer, {
    zoom: 6,
    center: { lat: 20, lng: 0 },
    mapId: GOOGLE_MAP_ID,
    mapTypeControl: true,
    fullscreenControl: true,
    zoomControl: true,
    streetViewControl: true,
  });

  if (App.stores.length) {
    await placeStoreMarkers(App.stores);
    fitBoundsToMarkers();
  }
}

// MARKERS

async function placeStoreMarkers(stores) {
  if (!App.map) return;
  const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');

  stores
    .filter(s => s.latitude && s.longitude)
    .forEach((store, index) => {
      const position = {
        lat: parseFloat(store.latitude) + index * 0.00008,
        lng: parseFloat(store.longitude) + index * 0.00008,
      };

      const pinImg = Object.assign(document.createElement('img'), {
        src: window.ASSETS.marker,
        title: store.name,
      });
      pinImg.style.cssText = 'width:38px;height:45px;cursor:pointer;display:block';

      const marker = new AdvancedMarkerElement({
        map: App.map,
        position,
        title: store.name,
        content: pinImg,
      });

      marker.addListener('click', () => {
        sharedInfoWindow.setContent(buildPopupHTML(store));
        sharedInfoWindow.open({ map: App.map, anchor: marker });
      });

      App.markers.push({ marker, storeId: store.id, position });
    });
}

async function placeUserLocationMarker() {
  if (!App.map || !UserLocation.latitude) return;
  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker');

  if (userLocationMarker) {
    userLocationMarker.map = null;
    userLocationMarker = null;
  }

  const pin = new PinElement({
    background: '#4285F4',
    borderColor: '#1a73e8',
    glyphColor: '#ffffff',
    scale: 1.2,
  });

  userLocationMarker = new AdvancedMarkerElement({
    map: App.map,
    position: { lat: UserLocation.latitude, lng: UserLocation.longitude },
    title: 'Your Location',
    content: pin.element,
  });
}

function fitBoundsToMarkers() {
  if (!App.map || !App.markers.length) return;
  const bounds = new google.maps.LatLngBounds();
  App.markers.forEach(m => bounds.extend(m.position));
  App.map.fitBounds(bounds, 60);
}

function clearMarkers() {
  sharedInfoWindow?.close();
  App.markers.forEach(({ marker }) => { marker.map = null; });
  App.markers = [];

  if (userLocationMarker) {
    userLocationMarker.map = null;
    userLocationMarker = null;
  }
}

async function reinitializeMap({ showUserLocation = false, userOnly = false } = {}) {
  if (!App.map) return;
  clearMarkers();

  if (userOnly) {
    await placeUserLocationMarker();
    App.map.setCenter({ lat: UserLocation.latitude, lng: UserLocation.longitude });
    App.map.setZoom(12);
    return;
  }

  await placeStoreMarkers(App.stores);
  if (showUserLocation) await placeUserLocationMarker();
  fitBoundsToMarkers();
}

// INFO WINDOW

function buildPopupHTML(store) {
  const address = [store.address_line1, store.address_line2, store.city, store.state, store.postal_code]
    .filter(Boolean).join(', ');

  const icon = (src, alt) =>
    `<span style="width:20px;min-width:20px;display:inline-block">
        <img style="height:auto" src="${src}" alt="${alt}"/>
      </span>`;

  return `
    <div style="min-width:220px;max-width:280px;font-family:'Sennheiser Neue';font-size:12px;line-height:1.5;padding:4px 2px;color:#818183;font-weight:500">
      <div class="upper-wrap">
        <h4 style="padding-right:18px;margin:0 0 8px;color:#000;font-size:16px;font-weight:600">${store.name}</h4>
        <p style="margin:4px 0;display:flex;gap:6px">${icon(window.ASSETS.location, 'Location')} ${address || 'N/A'}</p>
        ${store.distance ? `<p style="margin:4px 0"><strong>Distance:</strong> ${formatDistance(store.distance)}</p>` : ''}
        ${store.phone ? `<p style="margin:4px 0;display:flex;gap:6px">${icon(window.ASSETS.phone, 'Phone')} <a href="tel:${store.phone}" style="color:inherit">${store.phone}</a></p>` : ''}
      </div>
      <div class="custom-footer-block">
       <div class="icon-btn-wrap">
              ${store.website_url ? `
                <a 
                  href="${store.website_url}" 
                  class="icon-btn" 
                  title="Visit Website"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src="${window.ASSETS.websiteIcon}" alt="Website Icon">
                </a>
              ` : ''}
            <button class="icon-btn" title="Get Directions">
              ${store.google_maps_link ? `
                <a 
                  href="${store.google_maps_link}" 
                  class="icon-btn" 
                  title="Get Directions"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src="${window.ASSETS.directionsIcon}" alt="Get Directions Icon">
                </a>
              ` : ''}
            </button>
            </div>
      </div>
    </div>`;
}

// DISTANCE HELPERS

function formatDistance(distanceKm) {
  return getDistanceUnit() === 'miles'
    ? (distanceKm * 0.621371).toFixed(2) + ' miles'
    : distanceKm.toFixed(2) + ' km';
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = deg => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function filterNearbyStores(stores, radiusKm = NEARBY_STORES_RADIUS_KM) {
  if (!UserLocation.latitude || !UserLocation.longitude) return [];
  return stores
    .map(store => ({
      ...store,
      distance: parseFloat(
        calculateDistance(UserLocation.latitude, UserLocation.longitude,
          parseFloat(store.latitude), parseFloat(store.longitude)).toFixed(2)
      ),
    }))
    .filter(s => s.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

// RADIUS DROPDOWN

function renderRadiusDropdown() {
  const dropdown = document.querySelector('#radiusDropdown .dropdown-list');
  if (!dropdown) return;
  const unit = getDistanceUnit();
  dropdown.innerHTML = [5, 10, 15, 20, 25].map(v => `<div>${v} ${unit}</div>`).join('');
}

// GEOLOCATION

async function getCurrentLocation() {
  return new Promise(async (resolve, reject) => {
    const setAndResolve = ({ latitude, longitude, accuracy = null, source }) => {
      Object.assign(UserLocation, { latitude, longitude, accuracy });
      resolve({ latitude, longitude, accuracy, source });
    };

    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setAndResolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, source: 'gps' }),
      async () => {
        try {
          const data = await fetch('https://ipapi.co/json/').then(r => r.json());
          setAndResolve({ latitude: data.latitude, longitude: data.longitude, source: 'ip' });
        } catch (err) { reject(err); }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

// REVERSE GEOCODING

// async function reverseGeocode(lat, lng) {
//   try {
//     await bootstrapGoogleMaps();
//     const { Geocoder } = await google.maps.importLibrary('geocoding');
//     const geocoder = new Geocoder();

//     return await new Promise((resolve, reject) => {
//       geocoder.geocode({ location: { lat, lng } }, (results, status) => {
//         if (status !== 'OK' || !results[0]) return reject(new Error(`Geocoding failed: ${status}`));
//         const c = results[0].address_components;
//         const city = ['locality', 'administrative_area_level_2', 'administrative_area_level_1']
//           .reduce((found, type) => found || c.find(x => x.types.includes(type))?.long_name, null);
//           resolve(results[0].formatted_address);
//       });
//     });
//   } catch (e) {
//     console.error('Reverse geocoding error:', e);
//     return null;
//   }
// }
async function reverseGeocode(lat, lng) {
  try {
    await bootstrapGoogleMaps();

    const { Geocoder } = await google.maps.importLibrary('geocoding');

    const geocoder = new Geocoder();

    return await new Promise((resolve, reject) => {
      geocoder.geocode(
        { location: { lat, lng } },
        (results, status) => {

          if (status !== 'OK' || !results[0]) {
            return reject(
              new Error(`Geocoding failed: ${status}`)
            );
          }
          const components = results[0].address_components;

          const area =
            components.find(c =>
              c.types.includes('sublocality') ||
              c.types.includes('neighborhood')
            )?.long_name;

          const city =
            components.find(c =>
              c.types.includes('locality')
            )?.long_name;

          const state =
            components.find(c =>
              c.types.includes('administrative_area_level_1')
            )?.long_name;

          const shortAddress =
            area && city
              ? `${area}, ${city}`
              : city && state
                ? `${city}, ${state}`
                : results[0].formatted_address;

          resolve(shortAddress);
        }
      );
    });

  } catch (e) {
    console.error('Reverse geocoding error:', e);
    return null;
  }
}
// LOCATION INPUT HELPERS

function updateLocationInput(value) {
  const input = document.querySelector('input[name="location-address"]');
  if (input && value) input.value = value;
}

function clearLocationInput() {
  const input = document.querySelector('input[name="location-address"]');
  if (input) input.value = '';
}

// LOADER

function showLocationLoader(message = 'Detecting location...') {
  const loader = document.getElementById('location-loader');
  const inputBox = document.querySelector('.input-box.dropdown');
  const text = loader?.querySelector('.loader-text');
  if (text) text.textContent = message;
  loader?.classList.add('active');
  inputBox?.classList.add('loading');
}

function hideLocationLoader() {
  document.getElementById('location-loader')?.classList.remove('active');
  document.querySelector('.input-box.dropdown')?.classList.remove('loading');
}

function updateLoaderMessage(message) {
  const el = document.querySelector('#location-loader .loader-text');
  if (el) el.textContent = message;
}

// TOAST NOTIFICATIONS

function showToast(message, type = 'success', duration = 4000) {
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      #toast-container { position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;flex-direction:column;gap:8px; }
      .toast { display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:8px;color:#fff;font-size:14px;font-weight:500;
       box-shadow:0 4px 12px rgba(0,0,0,0.2);opacity:0;transform:translateY(8px);transition:all .3s ease;min-width:240px;max-width:360px; }
      .toast.show { opacity:1;transform:translateY(0); }
      .toast.hide { opacity:0;transform:translateY(8px); }
      .toast.success { background:#f1fffb; }
      .toast.error { background:#f3dbdb; }
      .toast-icon { font-weight:700;font-size:16px; }
      .toast-message { flex:1; }
      .toast-close { background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;padding:0;opacity:.8; }
      .toast-close:hover { opacity:1; }
      .toast-progress { position:absolute;bottom:0;left:0;height:3px;background:rgba(255,255,255,.4);
        border-radius:0 0 8px 8px;animation:toastProgress linear forwards; }
      @keyframes toastProgress { from { width:100%; } to { width:0%; } }
    `;
    document.head.appendChild(style);
  }

  let container = document.getElementById('toast-container');
  if (!container) {
    container = Object.assign(document.createElement('div'), { id: 'toast-container' });
    document.body.appendChild(container);
  }

  const icons = {
    success: '🟢',
    error: '🔴',
  };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'i'}</span>
    <span class="toast-message"></span>
    <button class="toast-close" aria-label="Close">&times;</button>
    <span class="toast-progress" style="animation-duration:${duration}ms"></span>`;
  toast.querySelector('.toast-message').textContent = message;

  const remove = () => { toast.classList.add('hide'); setTimeout(() => toast.remove(), 350); };
  toast.querySelector('.toast-close').addEventListener('click', remove);

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(remove, duration);
}

// NEARBY STORES — CURRENT LOCATION

function initCurrentLocationButton() {
  document.getElementById('current-location-btn')?.addEventListener('click', loadNearbyStores);
  document.getElementById('reset-location-btn')?.addEventListener('click', resetToInitialView);
  document.querySelector('input[type="text"].dropdown-btn')?.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && UserLocation.latitude !== null) {
      e.preventDefault();
      resetToInitialView();
    }
  });
}

async function loadNearbyStores() {
  if (isFetchingNearby) return;
  isFetchingNearby = true;

  const currentBtn = document.getElementById('current-location-btn');
  const resetBtn = document.getElementById('reset-location-btn');
  if (currentBtn) currentBtn.style.display = 'none';

  try {
    showLocationLoader('Detecting location...');
    const location = await getCurrentLocation();

    updateLoaderMessage('Fetching address...');
    const place = await reverseGeocode(location.latitude, location.longitude);

    updateLocationInput(place);
    const input = document.querySelector('input[name="location-address"]');
    if (input && place) input.dataset.selectedSearch = place;

    if (resetBtn) resetBtn.style.display = 'block';

    updateLoaderMessage('Finding nearby stores...');
    if (!App.stores.length) await loadRetailers();

    const nearby = filterNearbyStores(App.stores);
    hideLocationLoader();

    await reinitializeMap({ showUserLocation: true, userOnly: true });

    if (!nearby.length) {
      showToast('No retailers found', 'error');
      App.map.setCenter({ lat: location.latitude, lng: location.longitude });
      App.map.setZoom(12);
      App.stores = [];
      renderRetailers([]);
      updateDealerUI({ count: 0 });
      await reinitializeMap({ showUserLocation: true });
      return;
    }

    App.stores = nearby;
    renderRetailers(nearby);
    updateDealerUI({ count: nearby.length });
    await reinitializeMap({ showUserLocation: true });

  } catch (err) {
    console.error('loadNearbyStores error:', err);
    hideLocationLoader();
    showToast('Unable to get your location. Please enable location services and try again.', 'error');
    if (currentBtn) currentBtn.style.display = 'block';
    if (resetBtn) resetBtn.style.display = 'none';
    Object.assign(UserLocation, { latitude: null, longitude: null, accuracy: null });
    clearLocationInput();
  } finally {
    isFetchingNearby = false;
  }
}

async function resetToInitialView() {
  const currentBtn = document.getElementById('current-location-btn');
  const resetBtn = document.getElementById('reset-location-btn');
  const input = document.querySelector('input[name="location-address"]');
  const categorySpan = document.querySelector('#categoryDropdown .dropdown-btn span');
  const radiusSpan = document.querySelector('#radiusDropdown .dropdown-btn span');
  const dropdown = document.querySelector('.input-box.dropdown');
  const list = document.getElementById('locationDropdownList');

  clearMarkers();
  Object.assign(UserLocation, { latitude: null, longitude: null, accuracy: null });

  if (input) {
    input.value = '';
    delete input.dataset.selectedSearch;
    delete input.dataset.selectedLat;
    delete input.dataset.selectedLng;
  }

  if (list) list.innerHTML = '';
  dropdown?.classList.remove('active');

  if (categorySpan) { categorySpan.innerText = 'Select Category'; categorySpan.classList.add('placeholder'); }
  if (radiusSpan) { radiusSpan.innerText = 'Radius'; radiusSpan.classList.add('placeholder'); }
  if (currentBtn) currentBtn.style.display = 'block';
  if (resetBtn) resetBtn.style.display = 'none';

  await loadRetailers();
  await reinitializeMap({ showUserLocation: false, userOnly: false });

  App.map.setCenter({ lat: 20, lng: 78 });
  App.map.setZoom(5);
}

// API CALLS

async function showFallbackLocation(location) {
  if (!location) return;
  if (!App.map) await initGoogleMap();
  if (!App.map) return;

  clearMarkers();
  const position = { lat: parseFloat(location.lat), lng: parseFloat(location.lng) };

  if (isNaN(position.lat) || isNaN(position.lng)) {
    console.error('Invalid fallback coordinates:', location);
    return;
  }

  App.map.setCenter(position);
  App.map.setZoom(10);
}

async function loadRetailers(params = {}) {
  try {
    const query = new URLSearchParams();
    ['search', 'category', 'radius', 'lat', 'lng'].forEach(k => {
      if (params[k]) query.append(k, params[k]);
    });

    const url = `${window.RETAILER_API_URL || ''}/retailers?shop=${window.SHOP_DOMAIN || ''}&${query}`;
    const result = await fetch(url).then(r => r.json());

    if (result.success && result.data.length === 0 && result.fallback_location) {
      if (!App.map) await initGoogleMap();
      await showFallbackLocation(result.fallback_location);
      App.stores = [];
      renderRetailers([]);
      updateDealerUI({ count: 0 });
      return;
    }

    const data = result.success ? (result.data || []) : [];
    App.stores = data.filter(s => s.latitude && s.longitude);
    renderRetailers(data);
    updateDealerUI({ search: params.search, count: data.length, radius: params.radius });
    await reinitializeMap();

  } catch (err) {
    console.error('loadRetailers error:', err);
    showToast('Something went wrong while loading retailers.', 'error');
    renderRetailers([]);
    updateDealerUI({ count: 0 });
  }
}

async function loadCategories() {
  try {
    const url = `${window.RETAILER_API_URL || ''}/categories?shop=${window.SHOP_DOMAIN || ''}`;
    const result = await fetch(url).then(r => r.json());
    if (result.success) renderCategories(result.data);
    else showToast('Unable to load categories', 'error');
  } catch {
    showToast('Failed to load categories.', 'error');
  }
}

async function loadFilterSettings() {
  try {
    const url = `${window.RETAILER_API_URL || ''}/settings?shop=${window.SHOP_DOMAIN || ''}`;
    const result = await fetch(url).then(r => r.json());
    if (result.success && result.data.length > 0) {
      document.querySelector('.right-wrap')?.classList.toggle('no-filters', !result.data[0].filter_enabled);
    }
  } catch {
    showToast('Unable to load filter settings.', 'error');
  }
}

// RENDER

function renderRetailers(data) {
  const container = document.getElementById('retailers-list');
  if (!container) return;

  if (!data?.length) {
    container.innerHTML = `
      <div class="no-retailers-found">
        <div class="empty-icon">
          <img src="${window.ASSETS.location2}" alt="No Results"/>
        </div>
        <h3>No results found within 10 mi of your search point.</h3>
        <p>There are no authorized dealers matching your current filters. Try expanding your search area or adjusting the category.</p>
      </div>`;
    return;
  }

  container.innerHTML = data.map(item => {
    const address = [item.address_line1, item.address_line2, item.city, item.state, item.postal_code]
      .filter(Boolean).join(', ');

    const iconLi = (src, alt, content) =>
      `<li><em><img src="${src}" alt="${alt}"></em><span>${content}</span></li>`;

    return `
      <div class="custom-location-card">
        <div class="content-block">
          <div class="title-block">
            <h4>${item.name || ''}</h4>
            <div class="icon-btn-wrap">
              ${item.website_url ? `
                <a 
                  href="${item.website_url}" 
                  class="icon-btn" 
                  title="Visit Website"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src="${window.ASSETS.websiteIcon}" alt="Website Icon">
                </a>
              ` : ''}
            <button class="icon-btn" title="Get Directions">
              ${item.google_maps_link ? `
                <a 
                  href="${item.google_maps_link}" 
                  class="icon-btn" 
                  title="Get Directions"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src="${window.ASSETS.directionsIcon}" alt="Get Directions Icon">
                </a>
              ` : ''}
            </button>
            </div>
          </div>
          <ul class="icon-list">
            ${iconLi(window.ASSETS.location, 'Location', address || 'Address not available')}
            ${item.phone ? `<li><em><img src="${window.ASSETS.phone}" alt="Phone"></em><a href="tel:${item.phone}">${item.phone}</a></li>` : ''}
            ${item.website_url ? `<li><em><img src="${window.ASSETS.website}" alt="Website"></em><a href="${item.website_url}" target="_blank" rel="noopener">${cleanUrl(item.website_url)}</a></li>` : ''}
          </ul>
        </div>
      </div>`;
  }).join('');
}

function renderCategories(categories) {
  const dropdown = document.querySelector('#categoryDropdown .dropdown-list');
  if (!dropdown) return;

  dropdown.innerHTML = '';
  categories.forEach(cat => {
    const div = document.createElement('div');
    div.innerText = cat.name;
    div.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelector('#categoryDropdown .dropdown-btn span').innerText = cat.name;
      document.getElementById('categoryDropdown').classList.remove('active');
    });
    dropdown.appendChild(div);
  });
}

// UI HELPERS

function updateDealerUI({ search = null, count = 0, radius = null } = {}) {
  const titleEl = document.getElementById('dealer-title');
  const subtitleEl = document.getElementById('dealer-subtitle');
  const countEl = document.getElementById('dealer-count');
  const locStr = `Showing ${count} authorized location${count !== 1 ? 's' : ''}`;

  if (titleEl) titleEl.innerText = search ? `Dealers near "${search}"` : 'Dealers';

  if (subtitleEl) {
    if (search) {
      subtitleEl.innerText = count > 0
        ? `Showing ${count} available dealer${count !== 1 ? 's' : ''} ${locStr}${radius ? ` within ${radius}` : ''}`
        : `No dealers found for "${search}"`;
    } else {
      subtitleEl.innerText = count > 0
        ? `Showing ${count} available dealer${count !== 1 ? 's' : ''}`
        : 'Showing available dealer, use filters or search to refine results.';
    }
  }

  if (countEl) countEl.innerText = locStr;
}

function cleanUrl(url) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

// DROPDOWNS

function initDropdowns() {
  const selects = document.querySelectorAll('#categoryDropdown, #radiusDropdown');

  selects.forEach(drop => {
    const btn = drop.querySelector('.dropdown-btn');

    btn?.addEventListener('click', () => {
      const wasActive = drop.classList.contains('active');
      selects.forEach(d => d.classList.remove('active'));
      if (!wasActive) drop.classList.add('active');
    });

    drop.querySelectorAll('.dropdown-list div').forEach(opt => {
      opt.addEventListener('click', () => {
        const span = btn?.querySelector('span');
        if (span) { span.classList.remove('placeholder'); span.innerText = opt.innerText; }
        drop.classList.remove('active');
      });
    });
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#categoryDropdown') && !e.target.closest('#radiusDropdown')) {
      selects.forEach(d => d.classList.remove('active'));
    }
  });

  document.querySelector('.search-container .btn-primary')?.addEventListener('click', handleSearch);
}

// SEARCH HANDLER

async function handleSearch() {
  const searchInput = document.querySelector('input[name="location-address"]');
  const categorySpan = document.querySelector('#categoryDropdown .dropdown-btn span');
  const radiusSpan = document.querySelector('#radiusDropdown .dropdown-btn span');

  const typedValue = searchInput?.value?.trim() || '';
  const selectedValue = searchInput?.dataset?.selectedSearch || null;

  if (typedValue && !selectedValue) {
    showToast('Please select a location from dropdown suggestions.', 'error');
    return;
  }

  const params = {};
  if (selectedValue) params.search = selectedValue;

  const categoryValue = categorySpan?.innerText?.includes('Select') ? null : categorySpan?.innerText;
  if (categoryValue) params.category = categoryValue;

  const radiusText = radiusSpan?.innerText?.includes('Radius') ? null : radiusSpan?.innerText;
  if (radiusText && !selectedValue) {
    showToast('Please select a location to use radius filter.', 'error');
    return;
  }
  if (radiusText) {
    try {
      const num = parseFloat(radiusText);
      const location = await getCurrentLocation();

      params.lat = location.latitude;
      params.lng = location.longitude;
      params.radius = getDistanceUnit() === 'miles'
        ? num * 1.60934
        : num;
    } catch {
      showToast('Unable to fetch current location.', 'error');
      return;
    }
  }
  console.log("Selected Search:", selectedValue);
  console.log("Selected Lat:", searchInput.dataset.selectedLat);
  console.log("Selected Lng:", searchInput.dataset.selectedLng);
  console.log("Final Params:", params);
  await loadRetailers(params);
  await reinitializeMap();
}

// LOCATION AUTOCOMPLETE

function setupLocationSearch() {
  const input = document.querySelector('input[name="location-address"]');
  if (!input) return;

  const dropdown = input.closest('.dropdown');
  const list = document.getElementById('locationDropdownList');

  input.addEventListener('input', () => {
    clearTimeout(suggestionTimer);
    const value = input.value.trim();
    const resetBtn = document.getElementById('reset-location-btn');

    if (resetBtn) resetBtn.style.display = value ? 'block' : 'none';

    if (!value) {
      delete input.dataset.selectedSearch;
      if (list) list.innerHTML = '';
      dropdown.classList.remove('active');
      return;
    }

    suggestionTimer = setTimeout(async () => {
      const results = await fetchSuggestions(value);
      if (results.length) {
        dropdown.classList.add('active');
        renderLocationDropdown(results, input, dropdown);
      } else {
        if (list) list.innerHTML = '<div class="no-data">No results found</div>';
        dropdown.classList.add('active');
      }
    }, 300);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (list) list.innerHTML = '';
      dropdown.classList.remove('active');
      handleSearch();
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.input-box.dropdown')) {
      if (list) list.innerHTML = '';
      dropdown.classList.remove('active');
    }
  });
}

async function fetchSuggestions(search) {
  try {
    const url = `${window.RETAILER_API_URL || ''}/retailers?shop=${window.SHOP_DOMAIN || ''}&search=${encodeURIComponent(search)}`;
    const result = await fetch(url).then(r => r.json());
    if (!result.success) showToast('Unable to fetch suggestions', 'error');
    return result.success ? (result.data || []) : [];
  } catch {
    showToast('Suggestion search failed.', 'error');
    return [];
  }
}

function renderLocationDropdown(data, input, dropdown) {
  const list = document.getElementById('locationDropdownList');
  if (!list) return;

  if (!data.length) {
    list.innerHTML = '<div class="no-data">No results found</div>';
    return;
  }

  list.innerHTML = data.map((item, i) => {
    const addr = [item.address_line1, item.address_line2, item.city, item.state, item.postal_code]
      .filter(Boolean).join(', ');
    return `
      <div class="location-list-item" data-index="${i}">
        <h5>
          <span class="icon-wrap"><img src="${window.ASSETS.locationPin}" alt="pin"></span>
          ${item.name}
        </h5>
        <p>${addr}</p>
      </div>`;
  }).join('');

  list.onclick = e => {
    const item = e.target.closest('.location-list-item');
    if (!item) return;
    e.stopPropagation();
    clearTimeout(suggestionTimer);
    suggestionTimer = null;

    const selected = data[parseInt(item.dataset.index, 10)];
    input.value = selected.name;
    input.dataset.selectedSearch = selected.name;
    input.dataset.selectedLat = selected.latitude;
    input.dataset.selectedLng = selected.longitude;
    list.innerHTML = '';
    dropdown.classList.remove('active');
  };
}