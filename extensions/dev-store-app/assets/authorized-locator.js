document.addEventListener("DOMContentLoaded", () => {
    // document.querySelectorAll(".dropdown").forEach(drop => {
    //   const btn = drop.querySelector(".dropdown-btn");
   
    //   btn.addEventListener("click", () => {
    //     const isActive = drop.classList.contains("active");
    //         document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("active"));
    //     if (!isActive) {
    //       drop.classList.add("active");
    //     }
    //   });
   
    //     drop.querySelectorAll(".dropdown-list div").forEach(option => {
    //     option.addEventListener("click", () => {
    //       btn.querySelector("span").classList.remove("placeholder");
    //       btn.querySelector("span").innerText = option.innerText;
    //       drop.classList.remove("active");
    //     });
    //   });
    // });
   
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
     loadRetailers(params);
   });
 }
 
    loadRetailers();
    setupDropdowns();   // 👈 extract your dropdown logic (see below)
  loadCategories();
  });
   
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
       renderRetailers(result.data);
       updateRetailerCount(result.count);
     }
   } catch (error) {
     console.error("Error:", error);
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
    document.querySelectorAll(".dropdown").forEach(drop => {
      const btn = drop.querySelector(".dropdown-btn");
  
      // skip input-based dropdown
      if (!btn || btn.tagName === "INPUT") return;
  
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
  
        const isActive = drop.classList.contains("active");
  
        document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("active"));
  
        if (!isActive) {
          drop.classList.add("active");
        }
      });
    });
  
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".dropdown")) {
        document.querySelectorAll(".dropdown").forEach(d => d.classList.remove("active"));
      }
    });
  }