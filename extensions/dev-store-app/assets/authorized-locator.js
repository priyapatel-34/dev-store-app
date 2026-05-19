const GOOGLE_MAPS_API_KEY = 'AIzaSyDHtyLmeYuEQGSsZQMB6FOTWe1IiGtJ7Bg';
const NEARBY_STORES_RADIUS_KM = 5;
const GOOGLE_MAP_ID = 'DEMO_MAP_ID';
const UserLocation = { latitude: null, longitude: null, accuracy: null };

function getDistanceUnit() {
  return window.DISTANCE_UNIT || 'km';
}

const App = {
  stores: [],
  map: null,  
  markers: [],  
};

let sharedInfoWindow = null;

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

let mapsBootstrapped = false;

async function bootstrapGoogleMaps() {
  if (window.google && window.google.maps) return;
  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById("googleMapsScript");
    if (existingScript) {
      existingScript.onload = resolve;
      return;
    }
    const script = document.createElement("script");
    script.id = "googleMapsScript";
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,marker&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject("Google Maps failed to load");
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
  if (App.stores.length === 0) return;
  await placeStoreMarkers(App.stores);
  fitBoundsToMarkers();
}

async function placeStoreMarkers(stores) {
  if (!App.map) return;
  const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
  stores
    .filter(s => s.latitude && s.longitude)
    .forEach((store, index) => {
      const lat = parseFloat(store.latitude);
      const lng = parseFloat(store.longitude);
      const offset = index * 0.00008;
      const position = {
        lat: lat + offset,
        lng: lng + offset,
      };
      const pinImg = document.createElement('img');
      pinImg.src = 'https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Mock_Map_Markers.svg';
      pinImg.title = store.name;
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

// async function placeStoreMarkers(stores) {
//   if (!App.map) return;

//   const { AdvancedMarkerElement } =
//     await google.maps.importLibrary('marker');

//   // Track same coordinates
//   const coordinateMap = {};

//   stores
//     .filter(s => s.latitude && s.longitude)
//     .forEach((store) => {

//       const lat = parseFloat(store.latitude);
//       const lng = parseFloat(store.longitude);

//       // unique coordinate key
//       const key = `${lat}_${lng}`;

//       // count duplicates
//       coordinateMap[key] =
//         (coordinateMap[key] || 0) + 1;

//       const duplicateIndex = coordinateMap[key] - 1;

//       // bigger spread for overlapping markers
//       const spread = 0.01;

//       // circular distribution
//       const angle =
//         duplicateIndex * (Math.PI / 4);

//       const adjustedLat =
//         lat + (Math.sin(angle) * spread);

//       const adjustedLng =
//         lng + (Math.cos(angle) * spread);

//       const position = {
//         lat: adjustedLat,
//         lng: adjustedLng,
//       };

//       // marker image
//       const pinImg = document.createElement('img');

//       pinImg.src =
//         'https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Mock_Map_Markers.svg';

//       pinImg.title = store.name;

//       pinImg.style.cssText =
//         'width:38px;height:45px;cursor:pointer;display:block';

//       const marker = new AdvancedMarkerElement({
//         map: App.map,
//         position,
//         title: store.name,
//         content: pinImg,
//       });

//       marker.addListener('click', () => {
//         sharedInfoWindow.setContent(
//           buildPopupHTML(store)
//         );

//         sharedInfoWindow.open({
//           map: App.map,
//           anchor: marker,
//         });
//       });

//       App.markers.push({
//         marker,
//         storeId: store.id,
//         position,
//       });
//     });
// }

// async function placeUserLocationMarker() {
//   if (!App.map || !UserLocation.latitude) return;

//   const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker');

//   const pin = new PinElement({
//     background: '#4285F4',
//     borderColor: '#1a73e8',
//     glyphColor: '#ffffff',
//     scale: 1.2,
//   });

//   new AdvancedMarkerElement({
//     map: App.map,
//     position: { lat: UserLocation.latitude, lng: UserLocation.longitude },
//     title: 'Your Location',
//     content: pin.element,
//   });
// }
// GLOBAL
let userLocationMarker = null;

async function placeUserLocationMarker() {

  if (!App.map || !UserLocation.latitude) return;

  const { AdvancedMarkerElement, PinElement } =
    await google.maps.importLibrary('marker');

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
    position: {
      lat: UserLocation.latitude,
      lng: UserLocation.longitude,
    },
    title: 'Your Location',
    content: pin.element,
  });
}
function fitBoundsToMarkers() {
  if (!App.map || !App.markers.length) return;
  const { LatLngBounds } = google.maps;
  const bounds = new LatLngBounds();
  App.markers.forEach(m => bounds.extend(m.position));
  App.map.fitBounds(bounds, 60);
}

// Remove all current markers from the map
// function clearMarkers() {
//   sharedInfoWindow?.close();
//   App.markers.forEach(({ marker }) => {
//     marker.map = null; // AdvancedMarkerElement: set .map = null to detach
//   });
//   App.markers = [];
// }
function clearMarkers() {

  sharedInfoWindow?.close();

  App.markers.forEach(({ marker }) => {
    marker.map = null;
  });

  App.markers = [];

  // current location marker
  if (userLocationMarker) {
    userLocationMarker.map = null;
    userLocationMarker = null;
  }
}
// Full map refresh: clear + re-add store markers (+ optional user dot)
async function reinitializeMap({
  showUserLocation = false,
  userOnly = false,
} = {}) {

  if (!App.map) return;

  clearMarkers();

  // ✅ ONLY CURRENT LOCATION
  if (userOnly) {

    await placeUserLocationMarker();

    App.map.setCenter({
      lat: UserLocation.latitude,
      lng: UserLocation.longitude,
    });

    App.map.setZoom(12);

    return;
  }

  // ✅ retailer markers
  await placeStoreMarkers(App.stores);

  // ✅ current location marker
  if (showUserLocation) {
    await placeUserLocationMarker();
  }

  fitBoundsToMarkers();
}

// ============================================================
// INFO WINDOW HTML
// ============================================================

function buildPopupHTML(store) {
  const address = [
    store.address_line1, store.address_line2,
    store.city, store.state, store.postal_code,
  ].filter(Boolean).join(', ');

  const distanceHTML = store.distance
    ? `<p style="margin:4px 0"><strong>Distance:</strong> ${formatDistance(store.distance)}</p>`
    : '';

  return `
    <div style="min-width:220px;max-width:280px;font-family:'Sennheiser Neue';font-size:12px;line-height:1.5;padding:4px 2px; color: #818183; font-weight: 500;">
      <h4 style="padding-right: 18px;margin:0 0 8px;color:#000;font-size:16px;font-weight:600;">${store.name}</h4>
      <p style="margin:4px 0; display: flex; gap: 6px;"><span style="width: 20px; min-width: 20px; display: inline-block;"><img style="height: auto;" src="https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Location.svg?v=1777545764" alt="Map location icon" /></span> ${address || 'N/A'}</p>
      ${distanceHTML}
      ${store.phone
      ? `<p style="margin:4px 0; display: flex; gap: 6px;"><span style="width: 20px; min-width: 20px; display: inline-block;"><img style="height: auto;" src="https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Call.svg?v=1777545764" alt="Map phone icon" /></span> <a href="tel:${store.phone}" style="color:inherit; display: flex;">${store.phone}</a></p>`
      : ''}
      <div class="custom-footer-block">
        ${store.website_url
      ? `<p style="margin:6px 0 0"><a href="${store.website_url}" target="_blank" rel="noopener" style="color:#037cc2">Visit Website ↗</a></p>`
      : ''}
        <a class="btn btn-primary" title="Get Direction">Get Direcion</a>
      </div>
    </div>`;
}

// ============================================================
// DISTANCE HELPERS
// ============================================================

function formatDistance(distanceKm) {
  if (getDistanceUnit() === 'miles') {
    return (distanceKm * 0.621371).toFixed(2) + ' miles';
  }
  return distanceKm.toFixed(2) + ' km';
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// RADIUS DROPDOWN
// ============================================================

function renderRadiusDropdown() {
  const dropdown = document.querySelector('#radiusDropdown .dropdown-list');
  if (!dropdown) return;
  const unit = getDistanceUnit();
  dropdown.innerHTML = [5, 10, 15, 20, 25]
    .map(v => `<div>${v} ${unit}</div>`)
    .join('');
}

// ============================================================
// GEOLOCATION
// ============================================================

async function getCurrentLocation() {
  return new Promise(async (resolve, reject) => {

    if (navigator.geolocation) {

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {

          UserLocation.latitude = coords.latitude;
          UserLocation.longitude = coords.longitude;
          UserLocation.accuracy = coords.accuracy;

          resolve({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            source: 'gps'
          });

        },

        async () => {

          // fallback to IP location
          try {

            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();

            UserLocation.latitude = data.latitude;
            UserLocation.longitude = data.longitude;
            UserLocation.accuracy = null;

            resolve({
              latitude: data.latitude,
              longitude: data.longitude,
              accuracy: null,
              source: 'ip'
            });

          } catch (err) {
            reject(err);
          }
        },

        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );

    } else {
      reject(new Error('Geolocation not supported'));
    }
  });
}

// REVERSE GEOCODING

async function reverseGeocode(lat, lng) {
  try {
    await bootstrapGoogleMaps();
    const { Geocoder } = await google.maps.importLibrary('geocoding');
    const geocoder = new Geocoder();
    return await new Promise((resolve, reject) => {
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const c = results[0].address_components;
          const city =
            getComponent(c, 'locality') ||
            getComponent(c, 'administrative_area_level_2') ||
            getComponent(c, 'administrative_area_level_1');
          resolve(city || results[0].formatted_address);
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  } catch (e) {
    console.error('Reverse geocoding error:', e);
    return null;
  }
}

function getComponent(components, type) {
  return components.find(c => c.types.includes(type))?.long_name || null;
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
  if (loader) loader.classList.add('active');
  if (inputBox) inputBox.classList.add('loading');
}

function hideLocationLoader() {
  document.getElementById('location-loader')?.classList.remove('active');
  document.querySelector('.input-box.dropdown')?.classList.remove('loading');
}

function updateLoaderMessage(message) {
  const el = document.querySelector('#location-loader .loader-text');
  if (el) el.textContent = message;
}

// NEARBY STORES

let isFetchingNearby = false;

function initCurrentLocationButton() {
  document.getElementById('current-location-btn')
    ?.addEventListener('click', loadNearbyStores);
  document.getElementById('reset-location-btn')
    ?.addEventListener('click', resetToInitialView);
  document.querySelector('input[type="text"].dropdown-btn')
    ?.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && UserLocation.latitude !== null) {
        e.preventDefault();
        resetToInitialView();
      }
    });
}

// function showToast(message, type = "success") {
//   // remove old toast if exists
//   const existingToast = document.getElementById("custom-toast");

//   if (existingToast) {
//     existingToast.remove();
//   }

//   const toast = document.createElement("div");

//   toast.id = "custom-toast";

//   toast.innerText = message;

//   toast.style.position = "fixed";
//   toast.style.bottom = "24px";
//   toast.style.right = "24px";
//   toast.style.padding = "14px 18px";
//   toast.style.borderRadius = "8px";
//   toast.style.color = "#fff";
//   toast.style.fontSize = "14px";
//   toast.style.fontWeight = "500";
//   toast.style.zIndex = "999999";
//   toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
//   toast.style.transition = "all 0.3s ease";

//   // color based on type
//   toast.style.background =
//     type === "error"
//       ? "#d82c0d"
//       : "#008060";

//   document.body.appendChild(toast);

//   setTimeout(() => {
//     toast.style.opacity = "0";

//     setTimeout(() => {
//       toast.remove();
//     }, 300);

//   }, 3000);
// }

function showToast(message, type = "success", duration = 5000) {
  // Inject styles + container once
  if (!document.getElementById("toast-styles")) {
    const style = document.createElement("style");
    style.id = "toast-styles";
    style.textContent = `...`;
    document.head.appendChild(style);
  }
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const icons = { success: "✓", error: "✕", info: "i", warning: "!" };

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || "i"}</span>
    <span class="toast-message"></span>
    <button class="toast-close" aria-label="Close">&times;</button>
    <span class="toast-progress" style="animation-duration:${duration}ms"></span>
  `;
  toast.querySelector(".toast-message").textContent = message;

  const remove = () => {
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 350);
  };
  toast.querySelector(".toast-close").addEventListener("click", remove);

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(remove, duration);
}

// Usage:
// showToast("Saved successfully");
// showToast("Something went wrong", "error");
// showToast("Heads up!", "warning", 5000);
// showToast("New update available", "info");


async function loadNearbyStores() {
  if (isFetchingNearby) return;
  isFetchingNearby = true;

  const currentBtn = document.getElementById('current-location-btn');
  const resetBtn = document.getElementById('reset-location-btn');

  if (currentBtn) currentBtn.style.display = 'none';

  try {
    showLocationLoader('Detecting location...');

    const location = await getCurrentLocation();

    UserLocation.latitude = location.latitude;
    UserLocation.longitude = location.longitude;
    UserLocation.accuracy = location.accuracy || null;

    updateLoaderMessage('Fetching address...');

    const place = await reverseGeocode(
      location.latitude,
      location.longitude
    );

    // ✅ SHOW CURRENT LOCATION IN SEARCH BAR
    updateLocationInput(place);

    const input = document.querySelector(
      'input[name="location-address"]'
    );

    if (input && place) {
      input.dataset.selectedSearch = place;
    }

    // ✅ SHOW RESET BUTTON
    if (resetBtn) {
      resetBtn.style.display = 'block';
    }

    updateLoaderMessage('Finding nearby stores...');

    if (App.stores.length === 0) {
      await loadRetailers();
    }

    const nearby = filterNearbyStores(App.stores);

    hideLocationLoader();

    // ✅ ALWAYS SHOW CURRENT LOCATION ON MAP
    App.map.setCenter({
      lat: location.latitude,
      lng: location.longitude,
    });

    App.map.setZoom(12);

    await reinitializeMap({
      showUserLocation: true,
      userOnly: true,
    });

    // ✅ IF NO RETAILERS FOUND
    if (!nearby.length) {
      showToast("No retailers found", "error");
      App.map.setCenter({
        lat: location.latitude,
        lng: location.longitude,
      });

      App.map.setZoom(12);

      App.stores = [];

      renderRetailers([]);

      updateDealerUI({ count: 0 });

      await reinitializeMap({
        showUserLocation: true,
      });

      return;
    }

    App.stores = nearby;

    renderRetailers(nearby);

    updateDealerUI({
      count: nearby.length,
    });

    await reinitializeMap({
      showUserLocation: true,
    });

  } catch (err) {

    console.error('loadNearbyStores error:', err);

    hideLocationLoader();

    showToast(
      "Unable to get your location. Please enable location services and try again.",
      "error"
    );

    if (currentBtn) currentBtn.style.display = 'block';

    if (resetBtn) resetBtn.style.display = 'none';

    UserLocation.latitude = null;
    UserLocation.longitude = null;
    UserLocation.accuracy = null;

    clearLocationInput();

  } finally {
    isFetchingNearby = false;
  }
}

// async function resetToInitialView() {
//   const currentBtn = document.getElementById('current-location-btn');
//   const resetBtn   = document.getElementById('reset-location-btn');

//   clearMarkers();
//   UserLocation.latitude = UserLocation.longitude = UserLocation.accuracy = null;
//   clearLocationInput();

//   if (currentBtn) currentBtn.style.display = 'block';
//   if (resetBtn)   resetBtn.style.display   = 'none';

//   await loadRetailers();
//   await reinitializeMap();
// }

// async function resetToInitialView() {
//   const currentBtn = document.getElementById('current-location-btn');
//   const resetBtn = document.getElementById('reset-location-btn');

//   const input = document.querySelector('input[name="location-address"]');

//   const categorySpan = document.querySelector('#categoryDropdown .dropdown-btn span');
//   const radiusSpan = document.querySelector('#radiusDropdown .dropdown-btn span');

//   const dropdown = document.querySelector('.input-box.dropdown');
//   const list = document.getElementById('locationDropdownList');

//   // Clear markers
//   clearMarkers();

//   // Reset location object
//   UserLocation.latitude = null;
//   UserLocation.longitude = null;
//   UserLocation.accuracy = null;

//   // Clear input
//   if (input) {
//     input.value = '';
//     delete input.dataset.selectedSearch;
//   }

//   // Clear dropdown suggestions
//   if (list) list.innerHTML = '';

//   // Close dropdown
//   dropdown?.classList.remove('active');

//   // Reset category dropdown
//   if (categorySpan) {
//     categorySpan.innerText = 'Select Category';
//     categorySpan.classList.add('placeholder');
//   }

//   // Reset radius dropdown
//   if (radiusSpan) {
//     radiusSpan.innerText = 'Radius';
//     radiusSpan.classList.add('placeholder');
//   }

//   // Button visibility
//   if (currentBtn) currentBtn.style.display = 'block';
//   if (resetBtn) resetBtn.style.display = 'none';

//   // Reload all retailers
//   await loadRetailers();

//   // Reset map
//   await reinitializeMap();
// }

async function resetToInitialView() {
  const currentBtn = document.getElementById('current-location-btn');
  const resetBtn = document.getElementById('reset-location-btn');

  const input = document.querySelector('input[name="location-address"]');

  const categorySpan = document.querySelector('#categoryDropdown .dropdown-btn span');
  const radiusSpan = document.querySelector('#radiusDropdown .dropdown-btn span');

  const dropdown = document.querySelector('.input-box.dropdown');
  const list = document.getElementById('locationDropdownList');

  // ✅ Clear all markers
  clearMarkers();

  // ✅ Reset user location completely
  UserLocation.latitude = null;
  UserLocation.longitude = null;
  UserLocation.accuracy = null;

  // ✅ Clear input
  if (input) {
    input.value = '';
    delete input.dataset.selectedSearch;
    delete input.dataset.selectedLat;
    delete input.dataset.selectedLng;
  }

  // ✅ Clear dropdown list
  if (list) list.innerHTML = '';

  // ✅ Close dropdown
  dropdown?.classList.remove('active');

  // ✅ Reset category
  if (categorySpan) {
    categorySpan.innerText = 'Select Category';
    categorySpan.classList.add('placeholder');
  }

  // ✅ Reset radius
  if (radiusSpan) {
    radiusSpan.innerText = 'Radius';
    radiusSpan.classList.add('placeholder');
  }

  // ✅ Reset buttons
  if (currentBtn) currentBtn.style.display = 'block';
  if (resetBtn) resetBtn.style.display = 'none';

  // ✅ Reload all retailers
  await loadRetailers();

  // ✅ IMPORTANT: remove current location marker completely
  await reinitializeMap({
    showUserLocation: false,
    userOnly: false,
  });

  // ✅ Reset map default center
  App.map.setCenter({
    lat: 20,
    lng: 78,
  });

  App.map.setZoom(5);
}
function filterNearbyStores(stores, radiusKm = NEARBY_STORES_RADIUS_KM) {
  if (!UserLocation.latitude || !UserLocation.longitude) return [];
  return stores
    .map(store => ({
      ...store,
      distance: parseFloat(
        calculateDistance(
          UserLocation.latitude, UserLocation.longitude,
          parseFloat(store.latitude), parseFloat(store.longitude),
        ).toFixed(2),
      ),
    }))
    .filter(s => s.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

// ============================================================
// API CALLS
// ============================================================
// async function showFallbackLocation(location) {
//   if (!location) return;
//   if (!App.map) await initGoogleMap();
//   if (!App.map) return;

//   clearMarkers();

//   const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');

//   const position = {
//     lat: parseFloat(location.lat),
//     lng: parseFloat(location.lng),
//   };

//   if (isNaN(position.lat) || isNaN(position.lng)) {
//     console.error('❌ Invalid fallback coordinates:', location);
//     return;
//   }

//   const pinImg = document.createElement('img');
//   pinImg.src = 'https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Mock_Map_Markers.svg';
//   pinImg.style.cssText = 'width:38px;height:45px;cursor:pointer;display:block';

//   const marker = new AdvancedMarkerElement({
//     map: App.map,
//     position,
//     title: location.capital || location.country || 'Location',
//     content: pinImg,
//   });

//   App.markers.push({ marker, storeId: 'fallback-location', position });

//   // ✅ These must fire AFTER marker is placed
//   App.map.setCenter(position);
//   App.map.setZoom(10);

//   sharedInfoWindow.setContent(`
//     <div style="padding:10px;font-size:14px;font-family:sans-serif;">
//       <strong>No retailers found.</strong><br/>
//       Showing: <strong>${location.capital || location.country}</strong>
//     </div>
//   `);

//   sharedInfoWindow.open({ map: App.map, anchor: marker });
// }
async function showFallbackLocation(location) {
  if (!location) return;
  if (!App.map) await initGoogleMap();
  if (!App.map) return;

  clearMarkers();

  const position = {
    lat: parseFloat(location.lat),
    lng: parseFloat(location.lng),
  };

  if (isNaN(position.lat) || isNaN(position.lng)) {
    console.error('❌ Invalid fallback coordinates:', location);
    return;
  }

  App.map.setCenter(position);
  App.map.setZoom(10);
}

async function loadRetailers(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category) query.append('category', params.category);
    if (params.radius) query.append('radius', params.radius);
    if (params.lat) query.append('lat', params.lat);
    if (params.lng) query.append('lng', params.lng);

    const url =
      `${window.RETAILER_API_URL || ''}/retailers?shop=${window.SHOP_DOMAIN || ''}&${query}`;
    const result = await fetch(url).then(r => r.json());

    if (result.success && result.data.length === 0 && result.fallback_location) {
      if (!App.map) await initGoogleMap();
      await showFallbackLocation(result.fallback_location);
      App.stores = [];
      renderRetailers([]);
      updateDealerUI({ count: 0 });
      return; // 🛑 STOP — don't overwrite map
    }

    const data = result.success ? (result.data || []) : [];

    App.stores = data.filter(
      s => s.latitude && s.longitude
    );

    renderRetailers(data);

    updateDealerUI({
      search: params.search,
      count: data.length,
      radius: params.radius
    });

    // ✅ IMPORTANT
    await reinitializeMap();
    // App.stores = data.filter(s => s.latitude && s.longitude);
    // renderRetailers(data);
    // updateDealerUI({ search: params.search, count: data.length, radius: params.radius });

  } catch (err) {
    showToast(
      "Something went wrong while loading retailers.",
      "error"
    );
    renderRetailers([]);
    updateDealerUI({ count: 0 });
  }
}

async function loadCategories() {
  try {
    const url = `${window.RETAILER_API_URL || ''}/categories?shop=${window.SHOP_DOMAIN || ''}`;
    const result = await fetch(url).then(r => r.json());
    if (result.success) {
      renderCategories(result.data);
    } else {
      showToast(
        "Unable to load categories",
        "error"
      );
    }
  } catch (err) {
    showToast(
      "Failed to load categories.",
      "error"
    );
  }
}

async function loadFilterSettings() {
  try {
    const url = `${window.RETAILER_API_URL || ''}/settings?shop=${window.SHOP_DOMAIN || ''}`;
    const result = await fetch(url).then(r => r.json());
    if (result.success && result.data.length > 0) {
      document.querySelector('.right-wrap')
        ?.classList.toggle('no-filters', !result.data[0].filter_enabled);
    }
  } catch (err) {
    showToast(
      "Unable to load filter settings.",
      "error"
    );
  }
}

// RENDER

function renderRetailers(data) {
  const container = document.getElementById('retailers-list');
  if (!container) return;
  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="no-retailers-found">
        <div class="empty-icon">
          <img 
            src="https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Location_2.svg?v=1778669326" 
            alt="No Results"
          />
        </div>

        <h3>No results found within 10 mi of your search point.</h3>

        <p>
          There are no authorized dealers matching your current filters.
          Try expanding your search area or adjusting the category.
        </p>
      </div>
    `;

    return;
  }
  container.innerHTML = data.map(item => {
    const address = [
      item.address_line1, item.address_line2,
      item.city, item.state, item.postal_code,
    ].filter(Boolean).join(', ');

    return `
      <div class="custom-location-card">
        <div class="content-block">
          <div class="title-block">
            <h4>${item.name || ''}</h4>
          </div>
          <ul class="icon-list">
            <li>
              <em><img src="https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Location.svg?v=1777545764" alt="Location Icon"></em>
              <span>${address || 'Address not available'}</span>
            </li>
            ${item.phone ? `
            <li>
              <em><img src="https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Call.svg?v=1777545764" alt="Phone Icon"></em>
              <a href="tel:${item.phone}">${item.phone}</a>
            </li>` : ''}
            ${item.website_url ? `
            <li>
              <em><img src="https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Website.svg?v=1777545764" alt="Web Icon"></em>
              <a href="${item.website_url}" target="_blank" rel="noopener">${cleanUrl(item.website_url)}</a>
            </li>` : ''}
          </ul>
        </div>
        <div class="btn-wrap">
          ${item.website_url
        ? `<a href="${item.website_url}" class="btn secondary-btn" target="_blank" rel="noopener">Visit website</a>`
        : ''}
          ${item.google_maps_link
        ? `<a href="${item.google_maps_link}" class="btn btn-primary" target="_blank" rel="noopener">Get Direction</a>`
        : ''}
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

  if (search) {
    if (titleEl) titleEl.innerText = `Dealers near "${search}"`;
    if (subtitleEl) subtitleEl.innerText = count > 0
      ? `Showing ${count} available dealer${count !== 1 ? 's' : ''} ${locStr}${radius ? ` within ${radius}` : ''}`
      : `No dealers found for "${search}"`;
  } else {
    if (titleEl) titleEl.innerText = 'Dealers';
    if (subtitleEl) subtitleEl.innerText = count > 0
      ? `Showing ${count} available dealer${count !== 1 ? 's' : ''}`
      : 'Showing available dealer, use filters or search to refine results.';
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
      const was = drop.classList.contains('active');
      selects.forEach(d => d.classList.remove('active'));
      if (!was) drop.classList.add('active');
    });

    drop.querySelectorAll('.dropdown-list div').forEach(opt => {
      opt.addEventListener('click', () => {
        const span = btn?.querySelector('span');
        if (span) {
          span.classList.remove('placeholder');
          span.innerText = opt.innerText;
        }
        drop.classList.remove('active');
      });
    });
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#categoryDropdown') && !e.target.closest('#radiusDropdown')) {
      selects.forEach(d => d.classList.remove('active'));
    }
  });

  document.querySelector('.search-container .btn-primary')
    ?.addEventListener('click', handleSearch);
}

// async function handleSearch() {
//   const searchInput = document.querySelector('input[name="location-address"]');
//   const categorySpan = document.querySelector('#categoryDropdown .dropdown-btn span');
//   const radiusSpan = document.querySelector('#radiusDropdown .dropdown-btn span');

//   // const searchValue   = searchInput?.value?.trim() || null;
//   const searchValue =
//     searchInput?.dataset?.selectedSearch ||
//     searchInput?.value?.trim() ||
//     null;
//   const categoryValue = categorySpan?.innerText?.includes('Select') ? null : categorySpan?.innerText;
//   const radiusValue = radiusSpan?.innerText?.includes('Radius') ? null : radiusSpan?.innerText;

//   const params = {};
//   if (searchValue) params.search = searchValue;
//   if (categoryValue) params.category = categoryValue;

//   if (radiusValue) {
//     try {
//       const num = parseFloat(radiusValue);
//       await getCurrentLocation();
//       params.lat = parseFloat(searchInput.dataset.selectedLat);
//       params.lng = parseFloat(searchInput.dataset.selectedLng);
//       params.radius = getDistanceUnit() === 'miles' ? num * 1.60934 : num;
//     } catch {
//       alert('Unable to fetch current location. Please allow location access.');
//       return;
//     }
//   }

//   await loadRetailers(params);
//   await reinitializeMap();
// }

// LOCATION SEARCH — autocomplete suggestions

async function handleSearch() {

  const searchInput = document.querySelector(
    'input[name="location-address"]'
  );

  const categorySpan = document.querySelector(
    '#categoryDropdown .dropdown-btn span'
  );

  const radiusSpan = document.querySelector(
    '#radiusDropdown .dropdown-btn span'
  );

  // ✅ typed value
  const typedValue =
    searchInput?.value?.trim() || '';

  // ✅ selected dropdown value
  const selectedValue =
    searchInput?.dataset?.selectedSearch || null;

  // ✅ VALIDATION
  if (typedValue && !selectedValue) {

    showToast(
      "Please select a location from dropdown suggestions.",
      "error"
    );

    return;
  }

  // ✅ only selected value allowed
  const searchValue = selectedValue;

  const categoryValue =
    categorySpan?.innerText?.includes('Select')
      ? null
      : categorySpan?.innerText;

  const radiusValue =
    radiusSpan?.innerText?.includes('Radius')
      ? null
      : radiusSpan?.innerText;

  const params = {};

  if (searchValue) {
    params.search = searchValue;
  }

  if (categoryValue) {
    params.category = categoryValue;
  }

  if (radiusValue) {

    try {

      const num = parseFloat(radiusValue);

      await getCurrentLocation();

      params.lat = parseFloat(
        searchInput.dataset.selectedLat
      );

      params.lng = parseFloat(
        searchInput.dataset.selectedLng
      );

      params.radius =
        getDistanceUnit() === 'miles'
          ? num * 1.60934
          : num;

    } catch {

      showToast(
        "Unable to fetch current location.",
        "error"
      );

      return;
    }
  }

  await loadRetailers(params);

  await reinitializeMap();
}

let suggestionTimer = null;

function setupLocationSearch() {
  const input = document.querySelector('input[name="location-address"]');
  if (!input) return;

  const dropdown = input.closest('.dropdown');
  const list = document.getElementById('locationDropdownList');

  input.addEventListener('input', () => {

    clearTimeout(suggestionTimer);
    const value = input.value.trim();

    const resetBtn = document.getElementById('reset-location-btn');

    // SHOW close button when input has value
    if (resetBtn) {
      resetBtn.style.display = value ? 'block' : 'none';
    }

    if (!value) {

      // remove selected search
      delete input.dataset.selectedSearch;

      // clear dropdown
      if (list) list.innerHTML = '';

      // close dropdown
      dropdown.classList.remove('active');
      return;
    }

    suggestionTimer = setTimeout(async () => {

      const results = await fetchSuggestions(value);

      if (results.length) {

        dropdown.classList.add('active');

        renderLocationDropdown(results, input, dropdown);

      } else {

        if (list) {
          list.innerHTML = '<div class="no-data">No results found</div>';
        }

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
    const url =
      `${window.RETAILER_API_URL || ''}/retailers?shop=${window.SHOP_DOMAIN || ''}&search=${encodeURIComponent(search)}`;
    const result = await fetch(url).then(r => r.json());
    if (!result.success) {
      showToast(
        "Unable to fetch suggestions",
        "error"
      );
    }
    return result.success ? (result.data || []) : [];
  } catch (err) {
    showToast(
      "Suggestion search failed.",
      "error"
    );
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
    const addr = [
      item.address_line1, item.address_line2,
      item.city, item.state, item.postal_code,
    ].filter(Boolean).join(', ');

    return `
      <div class="location-list-item" data-index="${i}">
        <h5>
          <span class="icon-wrap">
            <img src="https://cdn.shopify.com/s/files/1/0910/7075/9198/files/location-pin.svg?v=1777982203" alt="pin">
          </span>
          ${item.name}
        </h5>
        <p>${addr}</p>
      </div>`;
  }).join('');

  // list.onclick = e => {
  //   const item = e.target.closest('.location-list-item');
  //   if (!item) return;

  //   e.stopPropagation();
  //   clearTimeout(suggestionTimer);
  //   suggestionTimer = null;

  //   const selected = data[parseInt(item.dataset.index, 10)];
  //   input.value = selected.name;
  //   list.innerHTML = '';
  //   dropdown.classList.remove('active');

  //   loadRetailers({ search: selected.name }).then(() => reinitializeMap());
  // };
  list.onclick = e => {
    const item = e.target.closest('.location-list-item');
    if (!item) return;

    e.stopPropagation();
    clearTimeout(suggestionTimer);
    suggestionTimer = null;

    const selected = data[parseInt(item.dataset.index, 10)];

    // Only update input field
    input.value = selected.name;

    // Store selected retailer/location
    input.dataset.selectedSearch = selected.name;

    // Close dropdown
    list.innerHTML = '';
    dropdown.classList.remove('active');
  };
}