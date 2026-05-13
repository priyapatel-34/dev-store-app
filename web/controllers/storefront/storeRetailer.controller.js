import { pool } from "../../db/db.js";

// export async function getRetailers(req, res) {
//   try {
//     const { shop } = req.query;

//     console.log("req.query", req.query);

//     if (!shop) {
//       return res.status(400).json({
//         error: "shop is required",
//       });
//     }

//     // ✅ Get store_id from DB
//     const storeResult = await pool.query(
//       `
//       SELECT id
//       FROM stores
//       WHERE shop_domain = $1
//       AND is_installed = true
//       LIMIT 1
//       `,
//       [shop]
//     );

//     if (!storeResult.rows.length) {
//       return res.status(404).json({
//         error: `No store found for domain: ${shop}`,
//       });
//     }

//     const store_id = storeResult.rows[0].id;

//     console.log("✅ store_id", store_id);
//     const { country, category, search, lat, lng, radius } = req.query;

//     const radiusInKm = radius ? parseFloat(radius.replace("km", "")) : null;

//     const cleanSearch = search ? search.trim().replace(/\s+/g, " ") : null;
//     const settingsResult = await pool.query(
//       `
//       SELECT show_global_retailers
//       FROM admin_settings
//       WHERE store_id = $1
//       LIMIT 1
//       `,
//       [store_id]
//     );

//     const showGlobalRetailers =
//       settingsResult.rows[0]?.show_global_retailers ?? false;

//     const query = `
//         SELECT
//           r.id,
//           r.store_id,
//           r.name,
//           r.retailer_type,
//           r.status,
//           r.address_line1,
//           r.address_line2,
//           r.city,
//           r.state,
//           r.postal_code,
//           r.latitude,
//           r.longitude,
//           r.phone,
//           r.email,
//           r.website_url,
//           r.google_maps_link,
//           r.opening_hours,
//           r.notes,
//           c.name AS country,
   
//           COALESCE(
//             STRING_AGG(DISTINCT cat.name, ', '),
//             ''
//           ) AS categories
   
//         FROM retailers r
//         JOIN countries c ON r.country_id = c.id
//         LEFT JOIN retailer_categories rc ON r.id = rc.retailer_id
//         LEFT JOIN categories cat ON rc.category_id = cat.id
   
//         WHERE r.store_id = $1
//         AND r.status = 'active'
   
//         AND (
//           $8::boolean = TRUE
//           OR (
//             $2::text IS NULL
//             OR c.name ILIKE $2
//           )
//         )
//         AND ($3::text IS NULL OR cat.name ILIKE $3)
   
//         -- 🔥 IMPROVED SEARCH (handles +, -, spaces, exact match)
//         AND (
//           $4::text IS NULL OR length(trim($4)) = 0
   
//           -- ✅ Normalize + and - → space
//           OR REPLACE(REPLACE(
//             CONCAT_WS(' ',
//               r.name,
//               r.address_line1,
//               r.address_line2,
//               r.city,
//               r.state,
//               r.postal_code
//             ),
//             '+', ' '
//           ), '-', ' ')
//           ILIKE '%' || REPLACE(REPLACE($4, '+', ' '), '-', ' ') || '%'
   
//           -- ✅ Remove + and - completely
//           OR REPLACE(REPLACE(
//             CONCAT_WS(' ',
//               r.name,
//               r.address_line1,
//               r.address_line2,
//               r.city,
//               r.state,
//               r.postal_code
//             ),
//             '+', ''
//           ), '-', '')
//           ILIKE '%' || REPLACE(REPLACE($4, '+', ''), '-', '') || '%'
   
//           -- ✅ Exact postal code match (VERY IMPORTANT)
//           OR r.postal_code ILIKE '%' || $4 || '%'
   
//           -- ✅ Fallback (original string match)
//           OR CONCAT_WS(' ',
//             r.name,
//             r.address_line1,
//             r.address_line2,
//             r.city,
//             r.state,
//             r.postal_code
//           ) ILIKE '%' || $4 || '%'
//         )
   
//         -- 📍 RADIUS FILTER
//         AND (
//           $7::float IS NULL OR
//           (
//             6371 * acos(
//               cos(radians($5)) * cos(radians(r.latitude)) *
//               cos(radians(r.longitude) - radians($6)) +
//               sin(radians($5)) * sin(radians(r.latitude))
//             )
//           ) <= $7
//         )
   
//         GROUP BY
//           r.id,
//           r.store_id,
//           r.name,
//           r.retailer_type,
//           r.status,
//           r.address_line1,
//           r.address_line2,
//           r.city,
//           r.state,
//           r.postal_code,
//           r.latitude,
//           r.longitude,
//           r.phone,
//           r.email,
//           r.website_url,
//           r.google_maps_link,
//           r.opening_hours,
//           r.notes,
//           c.name
   
//         ORDER BY r.id DESC;
//       `;

//     const values = [
//       store_id,
//       country ? `%${country}%` : null,
//       category ? `%${category}%` : null,
//       cleanSearch,
//       lat ? parseFloat(lat) : null,
//       lng ? parseFloat(lng) : null,
//       radiusInKm || null,
//       showGlobalRetailers
//     ];

//     const result = await pool.query(query, values);
//  // ✅ NO RETAILERS FOUND → RETURN COUNTRY CAPITAL
//  // ✅ NO RETAILERS FOUND → SHOW STORE COUNTRY CAPITAL
// if (result.rows.length === 0) {

//   // Default country
//   // You can also fetch this from settings table if needed
//   const defaultCountry = "India";

//   const fallbackCountryQuery = `
//     SELECT
//       id,
//       name,
//       code,
//       capital_name,
//       capital_latitude,
//       capital_longitude
//     FROM countries
//     WHERE LOWER(name) = LOWER($1)
//     LIMIT 1
//   `;

//   const fallbackResult = await pool.query(
//     fallbackCountryQuery,
//     [defaultCountry]
//   );

//   if (fallbackResult.rows.length > 0) {

//     const country = fallbackResult.rows[0];

//     return res.json({
//       success: true,
//       count: 0,
//       data: [],
//       fallback_location: {
//         country: country.name,
//         capital: country.capital_name,
//         lat: country.capital_latitude,
//         lng: country.capital_longitude
//       }
//     });
//   }
// }
// return res.json({
//   success: true,
//   count: result.rows.length,
//   data: result.rows,
// });
//   } catch (err) {
//     console.error("❌ getRetailers error:", err);
//     return res.status(500).json({ error: err.message });
//   }
// }

// export async function getRetailers(req, res) {
//   try {
//     /* =====================================================
//        1️⃣ GET SHOP DYNAMICALLY
//     ===================================================== */

//     const { shop } = req.query;

//     console.log("req.query", req.query);

//     if (!shop) {
//       return res.status(400).json({
//         error: "shop is required",
//       });
//     }

//     // ✅ Get store_id from DB
//     const storeResult = await pool.query(
//       `
//       SELECT
//   s.id,
//   s.country_id,
//   c.name AS country_name,
//   c.code,
//   c.capital_name,
//   c.capital_latitude,
//   c.capital_longitude
// FROM stores s
// LEFT JOIN countries c
//   ON s.country_id = c.id
// WHERE s.shop_domain = $1
// AND s.is_installed = true
// LIMIT 1
//       `,
//       [shop]
//     );

//     if (!storeResult.rows.length) {
//       return res.status(404).json({
//         error: `No store found for domain: ${shop}`,
//       });
//     }

//     const storeData = storeResult.rows[0];

// const store_id = storeData.id;

//     console.log("✅ store_id:", store_id);

//     /* =====================================================
//        3️⃣ QUERY PARAMS
//     ===================================================== */

//     const {
//       country,
//       category,
//       search,
//       lat,
//       lng,
//       radius,
//     } = req.query;

//     const radiusInKm = radius
//       ? parseFloat(radius.toString().replace("km", ""))
//       : null;

//     const cleanSearch = search
//       ? search.trim().replace(/\s+/g, " ")
//       : null;

//     /* =====================================================
//        4️⃣ ADMIN SETTINGS
//     ===================================================== */

//     const settingsResult = await pool.query(
//       `
//       SELECT show_global_retailers
//       FROM admin_settings
//       WHERE store_id = $1
//       LIMIT 1
//       `,
//       [store_id]
//     );

//     const showGlobalRetailers =
//       settingsResult.rows[0]?.show_global_retailers ?? false;

//     console.log(
//       "✅ showGlobalRetailers:",
//       showGlobalRetailers
//     );

//     /* =====================================================
//        5️⃣ MAIN RETAILER QUERY
//     ===================================================== */

//     const query = `
//   SELECT
//     r.id,
//     r.store_id,
//     r.name,
//     r.retailer_type,
//     r.status,
//     r.address_line1,
//     r.address_line2,
//     r.city,
//     r.state,
//     r.postal_code,
//     r.latitude,
//     r.longitude,
//     r.phone,
//     r.email,
//     r.website_url,
//     r.google_maps_link,
//     r.opening_hours,
//     r.notes,

//     c.id AS country_id,
//     c.name AS country,

//     COALESCE(
//       STRING_AGG(DISTINCT cat.name, ', '),
//       ''
//     ) AS categories

//   FROM retailers r

//   JOIN countries c
//     ON r.country_id = c.id

//   LEFT JOIN retailer_categories rc
//     ON r.id = rc.retailer_id

//   LEFT JOIN categories cat
//     ON rc.category_id = cat.id

//   WHERE
//   (
//     $8::boolean = TRUE
//     OR r.store_id = $1
//   )

//   AND r.status = 'active'

//   /* 🌍 COUNTRY FILTER */
//   AND (
//     $8::boolean = TRUE
//     OR (
//       $2::text IS NULL
//       OR c.name ILIKE $2
//     )
//   )

//   /* 🏷 CATEGORY FILTER */
//   AND (
//     $3::text IS NULL
//     OR cat.name ILIKE $3
//   )

//   /* 🔍 SEARCH FILTER */
//   AND (
//     $4::text IS NULL
//     OR length(trim($4)) = 0

//     OR REPLACE(REPLACE(
//       CONCAT_WS(
//         ' ',
//         r.name,
//         r.address_line1,
//         r.address_line2,
//         r.city,
//         r.state,
//         r.postal_code
//       ),
//       '+',
//       ' '
//     ), '-', ' ')
//     ILIKE '%' || REPLACE(REPLACE($4, '+', ' '), '-', ' ') || '%'

//     OR REPLACE(REPLACE(
//       CONCAT_WS(
//         ' ',
//         r.name,
//         r.address_line1,
//         r.address_line2,
//         r.city,
//         r.state,
//         r.postal_code
//       ),
//       '+',
//       ''
//     ), '-', '')
//     ILIKE '%' || REPLACE(REPLACE($4, '+', ''), '-', '') || '%'

//     OR r.postal_code ILIKE '%' || $4 || '%'

//     OR CONCAT_WS(
//       ' ',
//       r.name,
//       r.address_line1,
//       r.address_line2,
//       r.city,
//       r.state,
//       r.postal_code
//     )
//     ILIKE '%' || $4 || '%'
//   )

//   /* 📍 RADIUS FILTER */
//   AND (
//     $7::float IS NULL
//     OR (
//       6371 * acos(
//         cos(radians($5)) *
//         cos(radians(r.latitude)) *
//         cos(radians(r.longitude) - radians($6)) +
//         sin(radians($5)) *
//         sin(radians(r.latitude))
//       )
//     ) <= $7
//   )

//   GROUP BY
//     r.id,
//     r.store_id,
//     r.name,
//     r.retailer_type,
//     r.status,
//     r.address_line1,
//     r.address_line2,
//     r.city,
//     r.state,
//     r.postal_code,
//     r.latitude,
//     r.longitude,
//     r.phone,
//     r.email,
//     r.website_url,
//     r.google_maps_link,
//     r.opening_hours,
//     r.notes,
//     c.id,
//     c.name

//   ORDER BY r.id DESC
// `;

//     const values = [
//       store_id,
//       country ? `%${country}%` : null,
//       category ? `%${category}%` : null,
//       cleanSearch,
//       lat ? parseFloat(lat) : null,
//       lng ? parseFloat(lng) : null,
//       radiusInKm,
//       showGlobalRetailers,
//     ];

//     const result = await pool.query(query, values);

//     console.log("✅ retailers count:", result.rows.length);

//     /* =====================================================
//        6️⃣ RETAILERS FOUND
//     ===================================================== */

//     if (result.rows.length > 0) {
//       return res.json({
//         success: true,
//         count: result.rows.length,
//         data: result.rows,
//       });
//     }

//     /* =====================================================
//        7️⃣ FALLBACK LOCATION
//     ===================================================== */

//     let fallbackCountry =
//     storeData.country_name || null;

//     // country param exists
//     if (country) {
//       fallbackCountry = country;
//     }

//     // detect nearest country using lat/lng
//     else if (lat && lng) {
//       const nearestCountryQuery = `
//         SELECT
//           id,
//           name,
//           code,
//           capital_name,
//           capital_latitude,
//           capital_longitude,

//           (
//             6371 * acos(
//               cos(radians($1)) *
//               cos(radians(capital_latitude)) *
//               cos(radians(capital_longitude) - radians($2)) +
//               sin(radians($1)) *
//               sin(radians(capital_latitude))
//             )
//           ) AS distance

//         FROM countries

//         WHERE capital_latitude IS NOT NULL
//         AND capital_longitude IS NOT NULL

//         ORDER BY distance ASC
//         LIMIT 1
//       `;

//       const nearestCountryResult = await pool.query(
//         nearestCountryQuery,
//         [parseFloat(lat), parseFloat(lng)]
//       );

//       if (nearestCountryResult.rows.length > 0) {
//         fallbackCountry =
//           nearestCountryResult.rows[0].name;
//       }
//     }

//     /* =====================================================
//        8️⃣ GET CAPITAL FROM COUNTRIES TABLE
//     ===================================================== */

//     if (fallbackCountry) {
//       const fallbackResult = await pool.query(
//         `
//         SELECT
//           id,
//           name,
//           code,
//           capital_name,
//           capital_latitude,
//           capital_longitude
//         FROM countries
//         WHERE LOWER(name) = LOWER($1)
//         LIMIT 1
//         `,
//         [fallbackCountry]
//       );

//       if (fallbackResult.rows.length > 0) {
//         const countryRow = fallbackResult.rows[0];

//         console.log(
//           "✅ fallback country:",
//           countryRow.name
//         );

//         return res.json({
//           success: true,
//           count: 0,
//           data: [],

//           fallback_location: {
//             country: countryRow.name,
//             code: countryRow.code,
//             capital: countryRow.capital_name,
//             lat: countryRow.capital_latitude,
//             lng: countryRow.capital_longitude,
//           },
//         });
//       }
//     }

//     /* =====================================================
//        9️⃣ FINAL EMPTY RESPONSE
//     ===================================================== */

//     return res.json({
//       success: true,
//       count: 0,
//       data: [],
//       fallback_location: null,
//     });

//   } catch (err) {
//     console.error("❌ getRetailers error:", err);

//     return res.status(500).json({
//       success: false,
//       error: err.message,
//     });
//   }
// }

export async function getRetailers(req, res) {
  try {
    const { shop } = req.query;
    
        if (!shop) {
          return res.status(400).json({
            error: "shop is required",
          });
        }
    
        const storeResult = await pool.query(
          `
          SELECT
      s.id,
      s.country_id,
      c.name AS country_name,
      c.code,
      c.capital_name,
      c.capital_latitude,
      c.capital_longitude
    FROM stores s
    LEFT JOIN countries c
      ON s.country_id = c.id
    WHERE s.shop_domain = $1
    AND s.is_installed = true
    LIMIT 1
          `,
          [shop]
        );
    
        if (!storeResult.rows.length) {
          return res.status(404).json({
            error: `No store found for domain: ${shop}`,
          });
        }
    
        const storeData = storeResult.rows[0];
    
    const store_id = storeData.id;
  
    // GET STORE SETTINGS
    const settingsResult = await pool.query(
      `
      SELECT
        s.country_id,
        a.show_global_retailers
      FROM stores s
      LEFT JOIN admin_settings a
        ON a.store_id = s.id
      WHERE s.id = $1
      LIMIT 1
      `,
      [store_id]
    );

    const settings = settingsResult.rows[0];

    const storeCountryId = settings?.country_id;

    const showGlobalRetailers =
      settings?.show_global_retailers ?? false;

    const { country, category, search } = req.query;

    const cleanSearch = search
      ? search.trim().replace(/\s+/g, " ")
      : null;

    // DYNAMIC WHERE CONDITIONS
    let whereConditions = [
      `r.store_id = $1`
    ];

    let values = [store_id];

    let index = 2;

    // COUNTRY FILTER WHEN GLOBAL = FALSE
    if (!showGlobalRetailers) {
      whereConditions.push(
        `r.country_id = $${index}`
      );

      values.push(storeCountryId);

      index++;
    }

    // COUNTRY SEARCH FILTER
    if (country) {
      whereConditions.push(
        `c.name ILIKE $${index}`
      );

      values.push(`%${country}%`);

      index++;
    }

    // CATEGORY FILTER
    if (category) {
      whereConditions.push(
        `cat.name ILIKE $${index}`
      );

      values.push(`%${category}%`);

      index++;
    }

    // SEARCH FILTER
    if (cleanSearch) {
      whereConditions.push(`
        CONCAT_WS(
          ' ',
          r.name,
          r.address_line1,
          r.address_line2,
          r.city,
          r.state,
          r.postal_code
        ) ILIKE $${index}
      `);

      values.push(`%${cleanSearch}%`);

      index++;
    }

    // FINAL QUERY
    const query = `
      SELECT
        r.id,
        r.store_id,
        r.country_id,
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

      JOIN countries c
        ON r.country_id = c.id

      LEFT JOIN retailer_categories rc
        ON r.id = rc.retailer_id

      LEFT JOIN categories cat
        ON rc.category_id = cat.id

      WHERE ${whereConditions.join(" AND ")}

      GROUP BY
        r.id,
        c.name

      ORDER BY r.id DESC
    `;

    const result = await pool.query(
      query,
      values
    );

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });

  } catch (err) {
    console.error(
      "❌ getRetailers error:",
      err
    );

    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
}