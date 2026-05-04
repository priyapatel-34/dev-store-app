import { pool } from "../../db/db.js";

async function getShopIdFromSession(res) {
    const session = res.locals.shopify?.session;
   
    if (!session || !session.stores) {
      throw new Error("Unauthorized");
    }
   
    const shopDomain = session.stores;
   
    const { rows } = await pool.query(
      `SELECT id FROM stores WHERE shop_domain = $1 AND is_installed = TRUE`,
      [shopDomain],
    );
   
    if (!rows.length) {
      throw new Error("Shop not registered");
    }
   
    return rows[0].id;
  }
   
  export async function getRetailers(req, res) {
    try {
      const store_id = 1;
   
      const { country, category, search, lat, lng, radius } = req.query;
   
      const radiusInKm = radius ? parseFloat(radius.replace("km", "")) : null;
   
      // ✅ Clean search (DO NOT break formatting like 111-55)
      const cleanSearch = search ? search.trim().replace(/\s+/g, " ") : null;
   
      console.log("RAW SEARCH:", search);
      console.log("CLEAN SEARCH:", cleanSearch);
   
      const query = `
        SELECT
          r.id,
          r.store_id,
          r.name,
          r.retailer_type,
          r.status,
          r.address_line1,
          r.address_line2,
          r.city,
          r.state,
          r.postal_code,
          r.latitude,
          r.longitude,
          r.phone,
          r.email,
          r.website_url,
          r.google_maps_link,
          r.opening_hours,
          r.notes,
          c.name AS country,
   
          COALESCE(
            STRING_AGG(DISTINCT cat.name, ', '),
            ''
          ) AS categories
   
        FROM retailers r
        JOIN countries c ON r.country_id = c.id
        LEFT JOIN retailer_categories rc ON r.id = rc.retailer_id
        LEFT JOIN categories cat ON rc.category_id = cat.id
   
        WHERE r.store_id = $1
   
        AND ($2::text IS NULL OR c.name ILIKE $2)
        AND ($3::text IS NULL OR cat.name ILIKE $3)
   
        -- 🔥 IMPROVED SEARCH (handles +, -, spaces, exact match)
        AND (
          $4::text IS NULL OR length(trim($4)) = 0
   
          -- ✅ Normalize + and - → space
          OR REPLACE(REPLACE(
            CONCAT_WS(' ',
              r.address_line1,
              r.address_line2,
              r.city,
              r.state,
              r.postal_code
            ),
            '+', ' '
          ), '-', ' ')
          ILIKE '%' || REPLACE(REPLACE($4, '+', ' '), '-', ' ') || '%'
   
          -- ✅ Remove + and - completely
          OR REPLACE(REPLACE(
            CONCAT_WS(' ',
              r.address_line1,
              r.address_line2,
              r.city,
              r.state,
              r.postal_code
            ),
            '+', ''
          ), '-', '')
          ILIKE '%' || REPLACE(REPLACE($4, '+', ''), '-', '') || '%'
   
          -- ✅ Exact postal code match (VERY IMPORTANT)
          OR r.postal_code ILIKE '%' || $4 || '%'
   
          -- ✅ Fallback (original string match)
          OR CONCAT_WS(' ',
            r.address_line1,
            r.address_line2,
            r.city,
            r.state,
            r.postal_code
          ) ILIKE '%' || $4 || '%'
        )
   
        -- 📍 RADIUS FILTER
        AND (
          $7::float IS NULL OR
          (
            6371 * acos(
              cos(radians($5)) * cos(radians(r.latitude)) *
              cos(radians(r.longitude) - radians($6)) +
              sin(radians($5)) * sin(radians(r.latitude))
            )
          ) <= $7
        )
   
        GROUP BY
          r.id,
          r.store_id,
          r.name,
          r.retailer_type,
          r.status,
          r.address_line1,
          r.address_line2,
          r.city,
          r.state,
          r.postal_code,
          r.latitude,
          r.longitude,
          r.phone,
          r.email,
          r.website_url,
          r.google_maps_link,
          r.opening_hours,
          r.notes,
          c.name
   
        ORDER BY r.id DESC;
      `;
   
      const values = [
        store_id,
        country ? `%${country}%` : null,
        category ? `%${category}%` : null,
        cleanSearch,
        lat ? parseFloat(lat) : null,
        lng ? parseFloat(lng) : null,
        radiusInKm || null,
      ];
   
      console.log("FINAL SEARCH USED:", cleanSearch);
   
      const result = await pool.query(query, values);
   
      return res.json({
        success: true,
        count: result.rows.length,
        data: result.rows,
      });
   
    } catch (err) {
      console.error("❌ getRetailers error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
   
   
   
   
   