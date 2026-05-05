// Store user's current location
const UserLocation = {
  latitude: null,
  longitude: null,
  accuracy: null
};
// RADIUS_KM: Distance in kilometers to filter nearby stores
const NEARBY_STORES_RADIUS_KM = 5000; // Adjust this value as needed
// ============================================================
// MAP PROVIDER CONFIGURATION
// ============================================================
const MAP_PROVIDERS = {
  GOOGLE: 'google',
  LEAFLET: 'leaflet'
};
const DEFAULT_PROVIDER = MAP_PROVIDERS.LEAFLET;//MAP_PROVIDERS.GOOGLE;
// ============================================================
// DETECT WHICH PROVIDER TO USE
// ============================================================
function detectMapProvider() {
  return DEFAULT_PROVIDER;
}
// Global state
const App = {
  stores: [],
  map: null,
  markers: [],
  mapProvider: detectMapProvider() // replaces 'google'
  //mapType: 'google' // 'leaflet' or 'google'
};

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll(".dropdown").forEach(drop => {
    const btn = drop.querySelector(".dropdown-btn");
 
    btn.addEventListener("click", () => {
      const isActive = drop.classList.contains("active");
          document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("active"));
      if (!isActive) {
        drop.classList.add("active");
      }
    });
 
      drop.querySelectorAll(".dropdown-list div").forEach(option => {
        option.addEventListener("click", () => {
          btn.querySelector("span").classList.remove("placeholder");
          btn.querySelector("span").innerText = option.innerText;
          drop.classList.remove("active");
        });
      });
  });
 
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown")) {
          document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("active"));
    }
  });
 
  const searchBtn = document.querySelector(".search-container .btn-primary");
  if (searchBtn) {
   searchBtn.addEventListener("click", async () => {
     const searchInput = document.querySelector(".input-box input");
     const categoryText = document.querySelector(
       "#categoryDropdown .dropdown-btn span",
     );
     const radiusText = document.querySelector(
       "#radiusDropdown .dropdown-btn span",
     );
     const searchValue = searchInput?.value?.trim();
     const categoryValue = categoryText?.innerText?.includes("Select")
       ? null
       : categoryText.innerText;
     const radiusValue = radiusText?.innerText?.includes("Radius")
       ? null
       : radiusText.innerText;
     const params = {};
     if (searchValue) params.search = searchValue;
     if (categoryValue) params.category = categoryValue;
     // ✅ If radius selected → get current location
     if (radiusValue) {
       try {
         const position = await getCurrentLocation();
         params.lat = position.lat;
         params.lng = position.lng;
         params.radius = radiusValue.replace(" ", ""); // 5 km → 5km
         console.log("📍 Current Location:", position);
       } catch (err) {
         console.error("Location error:", err);
         alert(
           "Unable to fetch current location. Please allow location access.",
         );
         return;
       }
     }
     console.log("Search Params:", params);
     await loadRetailers(params);
   });
  }

  await loadRetailers();
  await loadFilterSettings();
  setupDropdowns();   // 👈 extract your dropdown logic (see below)
  loadCategories();
  setupLocationSearch();
  // Load stores then initialize map
  initCurrentLocationButton();
  initApp();
});



async function initApp() {
  console.log("Map provider detected:", App.mapProvider);

  //await loadRetailers();  // ✅ wait for data first
  
  switch (App.mapProvider) {
    case MAP_PROVIDERS.GOOGLE:
      await loadGoogleMapsAndInitMap();
      break;
    default:
      await loadLeafletAndInitMap();
      break;
  }
}

/***** START current user location code  */
async function reverseGeocode(lat, lng) {
  if (App.mapProvider === MAP_PROVIDERS.GOOGLE && typeof google !== 'undefined') {
    return await reverseGeocodeGoogle(lat, lng);
  } else {
    return await reverseGeocodeLeaflet(lat, lng);
  }
}

async function reverseGeocodeGoogle(lat, lng) {
  try {
    const geocoder = new google.maps.Geocoder();
    return await new Promise((resolve, reject) => {
      geocoder.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === 'OK' && results[0]) {
            // Try to extract city/locality from address components
            const components = results[0].address_components;
            const city =
              getAddressComponent(components, 'locality') ||
              getAddressComponent(components, 'administrative_area_level_2') ||
              getAddressComponent(components, 'administrative_area_level_1');
            resolve(city || results[0].formatted_address);
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        }
      );
    });
  } catch (error) {
    console.error('Google reverse geocoding failed:', error);
    return null;
  }
}

function getAddressComponent(components, type) {
  const match = components.find(c => c.types.includes(type));
  return match ? match.long_name : null;
}

/**
 * Reverse Geocoding (Used for Leaflet)
 */
async function reverseGeocodeLeaflet(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'AuthorizedLocator/1.0'
        }
      }
    );
    if (!response.ok) throw new Error('Geocode Leaflet request failed');
    const data = await response.json();
    const addr = data.address;
    console.log('Nominatim reverse geocode result:', addr); 
    // Return most specific available location name
    return (
      addr.state_district+", "+ addr.state
    );
  } catch (error) {
    console.error('Nominatim reverse geocoding failed:', error);
    return null;
  }
}

function updateLocationInput(placeName) {
  const locationInput = document.querySelector('.input-box.dropdown .dropdown-btn');
  if (!locationInput) return;
  if (placeName) {
    locationInput.value = placeName;
    locationInput.placeholder = placeName;
  }
}


function clearLocationInput() {
  const locationInput = document.querySelector('.input-box.dropdown .dropdown-btn');
  if (!locationInput) return;
  locationInput.value = '';
  locationInput.placeholder = 'Search City, Postal Code, Address'; // your default placeholder
}
/** End Current user address from lat and long ****/

/**
 * Show loader with optional custom message
 */
function showLocationLoader(message = 'Detecting location...') {
  const loader = document.getElementById('location-loader');
  const inputBox = document.querySelector('.input-box.dropdown');
  const loaderText = document.querySelector('#location-loader .loader-text');

  if (loader) {
    if (loaderText) loaderText.textContent = message;
    loader.classList.add('active');
  }
  if (inputBox) inputBox.classList.add('loading');
}

/**
 * Hide loader and restore input
 */
function hideLocationLoader() {
  const loader = document.getElementById('location-loader');
  const inputBox = document.querySelector('.input-box.dropdown');

  if (loader) loader.classList.remove('active');
  if (inputBox) inputBox.classList.remove('loading');
}

/**
 * Update loader message dynamically
 */
function updateLoaderMessage(message) {
  const loaderText = document.querySelector('#location-loader .loader-text');
  if (loaderText) loaderText.textContent = message;
}

async function initCurrentLocationButton() {
  const currentLocationBtn = document.getElementById('current-location-btn');
  const resetLocationBtn = document.getElementById('reset-location-btn');
  const inputField = document.querySelector('input[type="text"].dropdown-btn');
  
  if (currentLocationBtn && resetLocationBtn) {
    console.log("current-location-btn element found");
    console.log("reset-location-btn element found");
    currentLocationBtn.addEventListener('click', loadNearbyStores);
    resetLocationBtn.addEventListener('click', resetiInitApp);
  } else {
    console.log('Button elements not found');
  }

  // Add backspace key listener to reset location (only if location is set)
  if (inputField) {
    inputField.addEventListener('keydown', (event) => {
      if ((event.key === 'Backspace' || event.keyCode === 8) && 
          UserLocation.latitude !== null && UserLocation.longitude !== null) {
        event.preventDefault(); // Prevent default backspace behavior
        resetiInitApp();
      }
    });
  }
}

async function resetiInitApp() {
  try {
    console.log("Resetting to initial store list and map view...");
    const currentLocationBtn = document.getElementById('current-location-btn');
    const resetLocationBtn = document.getElementById('reset-location-btn');
    
    // Clear all markers from map
    if (App.markers.length > 0) {
      App.markers.forEach(m => {
        if (m.marker) {
          if (m.marker.remove) {
            m.marker.remove(); // Leaflet
          } else if (m.marker.setMap) {
            m.marker.setMap(null); // Google Maps
          }
        }
      });
      App.markers = [];
    }

    // Reset user location
    UserLocation.latitude = null;
    UserLocation.longitude = null;
    UserLocation.accuracy = null;

    clearLocationInput();

    // Update button visibility
    if (currentLocationBtn && resetLocationBtn) {
      currentLocationBtn.style.display = 'block';
      resetLocationBtn.style.display = 'none';
    }

    // Reload all retailers
    await loadRetailers();
    updateRetailerCount(App.stores.length);
  
    // Reinitialize map with all retailers
    if (App.mapProvider === MAP_PROVIDERS.GOOGLE) {
      await reinitializeGoogleMap();
    } else {
      await reinitializeLeafletMap();
    }
    
    console.log("Reset complete. Showing all retailers:", App.stores.length);
  } catch (error) {
    console.error('Error resetting to initial view:', error); 
  }
}

/**
 * Load and display nearby stores based on user's current location
 */
async function loadNearbyStores() {
  try {
    console.log("loadNearbyStores");
    const currentLocationBtn = document.getElementById('current-location-btn');
    const resetLocationBtn = document.getElementById('reset-location-btn');
    
    if (currentLocationBtn && resetLocationBtn) {
      currentLocationBtn.style.display = 'none';
      // resetLocationBtn.style.display = 'block';
    }

    // ✅ Step 1: Show loader - detecting GPS
    showLocationLoader('Detecting location...');

    // Get user's current location
    await getCurrentUserLocation();

    // ✅ Step 2: Update message - fetching address
    updateLoaderMessage('Fetching address...');

    // ✅ Reverse geocode and update input
    const placeName = await reverseGeocode(UserLocation.latitude, UserLocation.longitude);
    updateLocationInput(placeName);

    // ✅ Step 3: Update message - finding stores
    updateLoaderMessage('Finding nearby stores...');

    // Filter stores by proximity
    const nearbyStores = filterNearbyStores(App.stores, NEARBY_STORES_RADIUS_KM);
    console.log("Nearby stores:", nearbyStores);

     // ✅ Hide loader before any alert or render
    hideLocationLoader();

    if (nearbyStores.length === 0) {
      alert(`No stores found within ${NEARBY_STORES_RADIUS_KM}km of your location.`);
      if (currentLocationBtn) {
        currentLocationBtn.style.display = 'block';
        resetLocationBtn.style.display = 'none';
      }
      clearLocationInput();
      return;
    }

    // Update app state with nearby stores
    const previousStores = App.stores;
    App.stores = nearbyStores;

    // Clear existing markers
    if (App.map && App.markers.length > 0) {
      App.markers.forEach(m => {
        if (m.marker) {
          m.marker.remove ? m.marker.remove() : m.marker.setMap(null);
        }
      });
      App.markers = [];
    }

    // Re-render with nearby stores
    renderRetailers(nearbyStores);
    updateRetailerCount(nearbyStores.length);

    // Reinitialize map with nearby stores
    if (App.map) {
      if (App.mapProvider === MAP_PROVIDERS.GOOGLE) {
        await reinitializeGoogleMap();
      } else {
        await reinitializeLeafletMap();
      }
    }

    console.log(`Found ${nearbyStores.length} nearby stores`);

  } catch (error) {
    console.error('Error loading nearby stores:', error);

    hideLocationLoader();

    alert('Unable to get your location. Please enable location services and try again.');
    
    const currentLocationBtn = document.getElementById('current-location-btn');
    if (currentLocationBtn) {
      currentLocationBtn.disabled = false;
      currentLocationBtn.innerText = 'Current Location';
    }
    clearLocationInput();
  }
}

/**
 * Get user's current location using browser Geolocation API
 */
function getCurrentUserLocation() {
  console.log("getCurrentUserLocation");
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        UserLocation.latitude = position.coords.latitude;
        UserLocation.longitude = position.coords.longitude;
        UserLocation.accuracy = position.coords.accuracy;
        console.log('User location:', {
          lat: UserLocation.latitude,
          lng: UserLocation.longitude,
          accuracy: UserLocation.accuracy
        });
        resolve(UserLocation);
      },
      (error) => {
        console.error('Geolocation error:', error);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

function filterNearbyStores(stores, radiusKm = NEARBY_STORES_RADIUS_KM) {
  console.log("filterNearbyStores with radiusKm:", radiusKm);
  if (!UserLocation.latitude || !UserLocation.longitude) {
    console.warn('User location not available');
    return [];
  }

  const nearbyStores = stores
    .map(store => {
      const distance = calculateDistance(
        UserLocation.latitude,
        UserLocation.longitude,
        parseFloat(store.latitude),
        parseFloat(store.longitude)
      );
      return {
        ...store,
        distance: parseFloat(distance.toFixed(2))
      };
    })
    .filter(store => store.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

  return nearbyStores;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

/**
 * Reinitialize Google map with current markers
 */
async function reinitializeGoogleMap() {
  if (!google || !App.map) return;

  // Clear existing markers from map
  App.markers.forEach(m => {
    if (m.marker && m.marker.setMap) {
      m.marker.setMap(null);
    }
  });
  App.markers = [];

  const validStores = App.stores.filter(s => s.latitude && s.longitude);
  const bounds = new google.maps.LatLngBounds();

  validStores.forEach(store => {
    const lat = parseFloat(store.latitude);
    const lng = parseFloat(store.longitude);
    const position = { lat, lng };

    bounds.extend(position);

    const address = [
      store.address_line1,
      store.address_line2,
      store.city,
      store.state,
      store.postal_code
    ].filter(Boolean).join(', ');

    const distance = store.distance ? `<p style="margin:4px 0;"><strong>Distance:</strong> ${store.distance} km</p>` : '';

    const infoWindowContent = `
      <div style="min-width:250px; font-family:Arial,sans-serif; font-size:13px; padding: 8px;">
        <h3 style="margin:0 0 8px;color:#0066cc;">${store.name}</h3>
        <p style="margin:4px 0;"><strong>Address:</strong> ${address}</p>
        ${distance}
        ${store.phone ? `<p style="margin:4px 0;"><strong>Phone:</strong> <a href="tel:${store.phone}">${store.phone}</a></p>` : ''}
        ${store.email ? `<p style="margin:4px 0;"><strong>Email:</strong> <a href="mailto:${store.email}">${store.email}</a></p>` : ''}
        ${store.opening_hours ? `<p style="margin:4px 0;"><strong>Hours:</strong> ${store.opening_hours}</p>` : ''}
        <p style="margin:4px 0;"><strong>Status:</strong> <span style="color:${store.status === 'active' ? 'green' : 'red'}">${store.status.toUpperCase()}</span></p>
        ${store.website_url ? `<p style="margin:4px 0;"><a href="${store.website_url}" target="_blank" style="color:#0066cc;">Visit Website ↗</a></p>` : ''}
      </div>
    `;

    const infoWindow = new google.maps.InfoWindow({
      content: infoWindowContent
    });

    const marker = new google.maps.Marker({
      position: position,
      map: App.map,
      title: store.name,
      icon: 'https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Mock_Map_Markers.svg'
    });

    marker.addListener('click', () => {
      App.markers.forEach(m => {
        if (m.infoWindow) {
          m.infoWindow.close();
        }
      });
      infoWindow.open(App.map, marker);
    });

    App.markers.push({
      marker,
      storeId: store.id,
      infoWindow
    });
  });

  App.map.fitBounds(bounds);

  // Add user location marker if available
  if (UserLocation.latitude && UserLocation.longitude) {
    new google.maps.Marker({
      position: { lat: UserLocation.latitude, lng: UserLocation.longitude },
      map: App.map,
      title: 'Your Location',
      icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
    });
  }
}

/**
 * Reinitialize Leaflet map with current markers
 */
async function reinitializeLeafletMap() {
  if (!L || !App.map) return;

  // Clear existing markers from map
  App.markers.forEach(m => {
    if (m.marker && m.marker.remove) {
      m.marker.remove();
    }
  });
  App.markers = [];

  const validStores = App.stores.filter(s => s.latitude && s.longitude);
  
  // Add markers
  validStores.forEach(store => {
    const lat = parseFloat(store.latitude);
    const lng = parseFloat(store.longitude);

    const customIcon = L.icon({
      iconUrl: 'https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Mock_Map_Markers.svg',
      iconSize: [38, 45],
      iconAnchor: [19, 45],
      popupAnchor: [0, -45],
    });

    const marker = L.marker([lat, lng], {
      icon: customIcon,
      title: store.name
    }).addTo(App.map);

    const address = [
      store.address_line1,
      store.address_line2,
      store.city,
      store.state,
      store.postal_code
    ].filter(Boolean).join(', ');

    const distance = store.distance ? `<p style="margin:4px 0;"><strong>Distance:</strong> ${store.distance} km</p>` : '';

    marker.bindPopup(`
      <div style="min-width:220px; font-family:Arial,sans-serif; font-size:13px;">
        <h3 style="margin:0 0 8px;color:#0066cc;">${store.name}</h3>
        <p style="margin:4px 0;"><strong>Address:</strong> ${address}</p>
        ${distance}
        ${store.phone ? `<p style="margin:4px 0;"><strong>Phone:</strong> <a href="tel:${store.phone}">${store.phone}</a></p>` : ''}
        ${store.email ? `<p style="margin:4px 0;"><strong>Email:</strong> <a href="mailto:${store.email}">${store.email}</a></p>` : ''}
        ${store.opening_hours ? `<p style="margin:4px 0;"><strong>Hours:</strong> ${store.opening_hours}</p>` : ''}
        <p style="margin:4px 0;"><strong>Status:</strong> <span style="color:${store.status === 'active' ? 'green' : 'red'}">${store.status.toUpperCase()}</span></p>
        ${store.website_url ? `<a href="${store.website_url}" target="_blank" style="color:#0066cc;">Visit Website ↗</a>` : ''}
      </div>
    `);

    App.markers.push({ marker, storeId: store.id });
  });

  // Fit map bounds
  if (App.markers.length > 0) {
    const group = L.featureGroup(App.markers.map(m => m.marker));
    App.map.fitBounds(group.getBounds(), { padding: [50, 50] });
  }
}

/***** end current user location code  */

   
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("Geolocation not supported");
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error.message);
      },
    );
  });
}

async function loadRetailers(params = {}) {
  try {
    const baseUrl = window.RETAILER_API_URL || "";
    const query = new URLSearchParams();

    if (params.search) query.append("search", params.search);
    if (params.category) query.append("category", params.category);
    if (params.radius) query.append("radius", params.radius);
    if (params.lat) query.append("lat", params.lat);
    if (params.lng) query.append("lng", params.lng);

    const url = `${baseUrl}/retailers?${query.toString()}`;
    console.log("API URL:", url);

    const response = await fetch(url);
    const result = await response.json();

    if (result.success) {
      const data = result.data || []; // ✅ FIX

      App.stores = data.filter(store =>
        store.latitude && store.longitude
      );

      renderRetailers(data);

      updateRetailerCount(data.length); // ✅ FIX (count)

      updateDealerHeader({
        search: params.search || null,
        count: data.length, // ✅ FIX
        radius: params.radius || null,
      }); // ✅ FIX (closing bracket)
    } else {
      renderRetailers([]);

      updateDealerHeader({
        search: params.search || null,
        count: 0,
        radius: params.radius || null,
      });
    }

  } catch (error) {
    console.error("Error:", error);

    renderRetailers([]);

    updateDealerHeader({
      search: params.search || null,
      count: 0,
      radius: params.radius || null,
    });
  }
}

  async function loadLeafletAndInitMap() {
  console.log("Initializing Leaflet Map with stores:", App.stores); 
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) return;

  if (App.stores.length === 0) {
    mapContainer.innerHTML = '<p style="padding: 20px;">No store locations available</p>';
    return;
  }

  // Load Leaflet CSS
  const leafletLink = document.createElement('link');
  leafletLink.rel = 'stylesheet';
  leafletLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(leafletLink);

  // Load Leaflet JS and wait for it
  await new Promise((resolve, reject) => {
    const leafletScript = document.createElement('script');
    leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletScript.onload = resolve;
    leafletScript.onerror = reject;
    document.head.appendChild(leafletScript);
  });

  // Calculate center
  const validStores = App.stores.filter(s => s.latitude && s.longitude);
  //const avgLat = validStores.reduce((sum, s) => sum + parseFloat(s.latitude), 0) / validStores.length;
  //const avgLng = validStores.reduce((sum, s) => sum + parseFloat(s.longitude), 0) / validStores.length;

  // ✅ Initialize map
  //App.map = L.map(mapContainer).setView([avgLat, avgLng], 5);
console.log("validStores ",validStores);
  App.map = L.map(mapContainer);

  // ✅ Tile layer enabled (this was commented out before!)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(App.map);

  // Add markers
  App.stores.forEach(store => {
    const lat = parseFloat(store.latitude);
    const lng = parseFloat(store.longitude);

    /*const marker = L.marker([lat, lng], {
      title: store.name,
      alt: store.name
    }).addTo(App.map);*/
  
    // ✅ After (custom icon)
    const customIcon = L.icon({
      iconUrl: 'https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Mock_Map_Markers.svg',
      iconSize: [38, 45],
      iconAnchor: [19, 45],
      popupAnchor: [0, -45],
    });

    const marker = L.marker([lat, lng], {
      icon: customIcon,
      title: store.name
    }).addTo(App.map);
    

    const address = [
      store.address_line1,
      store.address_line2,
      store.city,
      store.state,
      store.postal_code
    ].filter(Boolean).join(', ');

    marker.bindPopup(`
      <div style="min-width:220px; font-family:Arial,sans-serif; font-size:13px;">
        <h3 style="margin:0 0 8px;color:#0066cc;">${store.name}</h3>
        <p style="margin:4px 0;"><strong>Address:</strong> ${address}</p>
        ${store.phone ? `<p style="margin:4px 0;"><strong>Phone:</strong> <a href="tel:${store.phone}">${store.phone}</a></p>` : ''}
        ${store.website_url ? `<a href="${store.website_url}" target="_blank" style="color:#0066cc;">Visit Website ↗</a>` : ''}
      </div>
    `);

    App.markers.push({ marker, storeId: store.id });
    
  });
  console.log("Markers added to map:", App.markers.length);
  // Auto-fit map to show all markers
  if (App.markers.length > 0) {
    const group = L.featureGroup(App.markers.map(m => m.marker));
    App.map.fitBounds(group.getBounds(), { padding: [50, 50] });
  }
}

async function loadGoogleMapsAndInitMap() {
  console.log("Initializing Google Map with stores:", App.stores);
  const mapContainer = document.getElementById('map-container');
  if (!mapContainer) return;

  if (App.stores.length === 0) {
    mapContainer.innerHTML = '<p style="padding: 20px;">No store locations available</p>';
    return;
  }

  // Load Google Maps API and wait for it
  await new Promise((resolve, reject) => {
    const googleMapsScript = document.createElement('script');
    
    googleMapsScript.src = 'https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY';
    googleMapsScript.async = true;
    googleMapsScript.defer = true;
    googleMapsScript.onload = resolve;
    googleMapsScript.onerror = reject;
    document.head.appendChild(googleMapsScript);
  });

  // Calculate center from all store locations
  const validStores = App.stores.filter(s => s.latitude && s.longitude);
  const avgLat = validStores.reduce((sum, s) => sum + parseFloat(s.latitude), 0) / validStores.length;
  const avgLng = validStores.reduce((sum, s) => sum + parseFloat(s.longitude), 0) / validStores.length;

  // Initialize Google Map
  App.map = new google.maps.Map(mapContainer, {
    zoom: 5,
    center: { lat: avgLat, lng: avgLng },
    mapTypeControl: true,
    fullscreenControl: true,
    zoomControl: true,
    streetViewControl: true,
  });

  // Create bounds to fit all markers
  const bounds = new google.maps.LatLngBounds();

  // Add markers for each store
  App.stores.forEach(store => {
    const lat = parseFloat(store.latitude);
    const lng = parseFloat(store.longitude);
    const position = { lat, lng };

    // Extend bounds to include this marker
    bounds.extend(position);

    const address = [
      store.address_line1,
      store.address_line2,
      store.city,
      store.state,
      store.postal_code
    ].filter(Boolean).join(', ');

    // Create InfoWindow content
    const infoWindowContent = `
      <div style="min-width:250px; font-family:Arial,sans-serif; font-size:13px; padding: 8px;">
        <h3 style="margin:0 0 8px;color:#0066cc;">${store.name}</h3>
        <p style="margin:4px 0;"><strong>Address:</strong> ${address}</p>
        ${store.phone ? `<p style="margin:4px 0;"><strong>Phone:</strong> <a href="tel:${store.phone}">${store.phone}</a></p>` : ''}
        ${store.email ? `<p style="margin:4px 0;"><strong>Email:</strong> <a href="mailto:${store.email}">${store.email}</a></p>` : ''}
        ${store.opening_hours ? `<p style="margin:4px 0;"><strong>Hours:</strong> ${store.opening_hours}</p>` : ''}
        <p style="margin:4px 0;"><strong>Status:</strong> <span style="color:${store.status === 'active' ? 'green' : 'red'}">${store.status.toUpperCase()}</span></p>
        ${store.website_url ? `<p style="margin:4px 0;"><a href="${store.website_url}" target="_blank" style="color:#0066cc;">Visit Website ↗</a></p>` : ''}
      </div>
    `;

    // Create InfoWindow
    const infoWindow = new google.maps.InfoWindow({
      content: infoWindowContent
    });

    // Create marker with custom icon
    const marker = new google.maps.Marker({
      position: position,
      map: App.map,
      title: store.name,
      icon: 'https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Mock_Map_Markers.svg'
    });

    // Add click listener to open InfoWindow
    marker.addListener('click', () => {
      // Close all other InfoWindows
      App.markers.forEach(m => {
        if (m.infoWindow) {
          m.infoWindow.close();
        }
      });
      infoWindow.open(App.map, marker);
    });

    App.markers.push({ 
      marker, 
      storeId: store.id, 
      infoWindow 
    });
  });

  // Fit map to show all markers
  if (App.markers.length > 0) {
    App.map.fitBounds(bounds);
  }
}
  /* ===========================
     NEW CONTENT ADDED BELOW
  =========================== */
   
  function renderRetailers(data) {
    const container = document.getElementById("retailers-list");
   
    if (!container) return;
   
    container.innerHTML = "";
   
    data.forEach((item) => {
      const address = [
        item.address_line1,
        item.address_line2,
        item.city,
        item.state,
        item.postal_code,
      ]
        .filter(Boolean)
        .join(", ");
   
      container.innerHTML += `
        <div class="custom-location-card">
          <div class="content-block">
   
            <div class="title-block">
              <h4>${item.name || ""}</h4>
              <span>${item.country || ""}</span>
            </div>
   
            <ul class="icon-list">
   
              <li>
                <em>
                  <img src="https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Location.svg?v=1777545764" alt="Location Icon">
                </em>
                <span>${address || "Address not available"}</span>
              </li>
   
              ${
                item.phone
                  ? `
                <li>
                  <em>
                    <img src="https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Call.svg?v=1777545764" alt="Phone Icon">
                  </em>
                  <a href="tel:${item.phone}">${item.phone}</a>
                </li>
              `
                  : ""
              }
   
              ${
                item.website_url
                  ? `
                <li>
                  <em>
                    <img src="https://cdn.shopify.com/s/files/1/0910/7075/9198/files/Website.svg?v=1777545764" alt="Web Icon">
                  </em>
                  <a href="${item.website_url}" target="_blank">
                    ${cleanUrl(item.website_url)}
                  </a>
                </li>
              `
                  : ""
              }
   
            </ul>
          </div>
   
          <div class="btn-wrap">
   
            ${
              item.website_url
                ? `
              <a href="${item.website_url}"
                 class="btn secondary-btn"
                 target="_blank">
                 Visit website
              </a>
            `
                : ""
            }
   
            ${
              item.google_maps_link
                ? `
              <a href="${item.google_maps_link}"
                 class="btn btn-primary"
                 target="_blank">
                 Get Direction
              </a>
            `
                : ""
            }
   
          </div>
        </div>
      `;
    });
  }
   
  function updateRetailerCount(count) {
    const el = document.getElementById("dealer-count");
   
    if (el) {
      el.innerText = `Showing ${count} authorized location${
        count !== 1 ? "s" : ""
      }`;
    }
  }
   
  function cleanUrl(url) {
    return url.replace("https://", "").replace("http://", "").replace("/", "");
  }

  async function loadCategories() {
    try {
      const baseUrl = window.RETAILER_API_URL || "";
      const storeId = window.STORE_ID;
  
      const response = await fetch(`${baseUrl}/categories`);
  
      if (!response.ok) {
        throw new Error("API failed");
      }
  
      const result = await response.json();
  
      if (result.success) {
        renderCategories(result.data);
      }
      console.log("FRONTEND DATA:", result.data);
    } catch (error) {
      console.error("Category load failed:", error);
    }
  }

  function renderCategories(categories) {
    const dropdown = document.querySelector("#categoryDropdown .dropdown-list");
  
    if (!dropdown) return;
  
    dropdown.innerHTML = "";
  
    categories.forEach((cat) => {
      const div = document.createElement("div");
      div.innerText = cat.name;
  
      div.addEventListener("click", (e) => {
        e.stopPropagation();
        const btn = document.querySelector("#categoryDropdown .dropdown-btn span");
        btn.classList.remove("placeholder");
        btn.innerText = cat.name;
  
        document.getElementById("categoryDropdown").classList.remove("active");
      });
  
      dropdown.appendChild(div);
    });
  }

  function setupDropdowns() {
  }

  function setupLocationSearch() {
    const input = document.querySelector('input[name="location-address"]');
    const dropdown = input.closest(".dropdown");
    const list = dropdown.querySelector(".dropdown-list");
   
    let debounceTimer;
   
    input.addEventListener("input", () => {
      const value = input.value.trim();
   
      // clear previous timer
      clearTimeout(debounceTimer);
   
      // small debounce (300ms)
      debounceTimer = setTimeout(async () => {
        if (!value) {
          list.innerHTML = "";
          dropdown.classList.remove("active");
          return;
        }
   
        // open dropdown
        dropdown.classList.add("active");
   
        // call API
        const results = await searchRetailers(value);
   
        renderLocationDropdown(results, list, input, dropdown);
      }, 300);
    });
  }
   
  async function searchRetailers(search) {
    try {
      const baseUrl = window.RETAILER_API_URL || "";
   
      const query = new URLSearchParams();
      query.append("search", search);
   
      const url = `${baseUrl}/retailers?${query.toString()}`;
   
      const res = await fetch(url);
      const result = await res.json();
   
      if (result.success) {
        return result.data;
      }
   
      return [];
    } catch (err) {
      console.error("Search API error:", err);
      return [];
    }
  }
   
  function renderLocationDropdown(data, list, input, dropdown) {
    list.innerHTML = "";
   
    if (!data.length) {
      list.innerHTML = `<div class="no-data">No results found</div>`;
      return;
    }
   
    data.forEach((item) => {
      const div = document.createElement("div");
   
      // show name + city (better UX)
      div.innerText = `${item.name} (${item.city})`;
   
      div.addEventListener("click", () => {
        input.value = item.name;
        dropdown.classList.remove("active");
      });
   
      list.appendChild(div);
    });
  }

  async function loadFilterSettings() {
    try {
      const baseUrl = window.RETAILER_API_URL || "";
  
      const res = await fetch(`${baseUrl}/filters`);
      const result = await res.json();
  
      if (result.success && result.data.length > 0) {
        const filterEnabled = result.data[0].filter_enabled;
  
        console.log("FILTER ENABLED:", filterEnabled);
  
        const filterBlock = document.querySelector(".right-wrap");
  
        if (filterBlock) {
          filterBlock.style.display = filterEnabled ? "block" : "none";
        }
      }
  
    } catch (err) {
      console.error("Filter API error:", err);
    }
  }

  function updateDealerHeader({ search, count, radius }) {
    const titleEl = document.getElementById("dealer-title");
    const subtitleEl = document.getElementById("dealer-subtitle");
  
    // ✅ Case 1: Search applied
    if (search) {
      titleEl.innerText = `Dealers near "${search}"`;
  
      subtitleEl.innerText =
        count > 0
          ? `Showing ${count} authorized location${count !== 1 ? "s" : ""}${
              radius ? ` within ${radius}` : ""
            }`
          : `No dealers found for "${search}"`;
    }
  
    // ✅ Case 2: No search (default state)
    else {
      titleEl.innerText = "Dealers";
  
      subtitleEl.innerText =
        count > 0
          ? `Showing ${count} available dealer${count !== 1 ? "s" : ""}`
          : `No dealers available. Try using filters or search.`;
    }
  }