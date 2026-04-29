document.addEventListener("DOMContentLoaded", () => {
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
   
    loadRetailers();
  });
   
  async function loadRetailers() {
    try {
    const baseUrl = window.RETAILER_API_URL || "";
    const response = await fetch(`${baseUrl}/retailers`);
    const result = await response.json();
   
      console.log(result);
   
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
                  <img src="/cdn/shop/files/location-icon.svg" alt="Location Icon">
                </em>
                <span>${address || "Address not available"}</span>
              </li>
   
              ${
                item.phone
                  ? `
                <li>
                  <em>
                    <img src="/cdn/shop/files/phone-icon.svg" alt="Phone Icon">
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
                    <img src="/cdn/shop/files/web-icon.svg" alt="Web Icon">
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