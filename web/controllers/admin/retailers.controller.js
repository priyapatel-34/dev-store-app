import fs from "fs";
import csv from "csv-parser";
import { pool } from "../../db/db.js";

const cleanText = (val) => {
  if (val === undefined || val === null) return null;
  const trimmed = String(val).trim();
  return trimmed === "" ? null : trimmed;
};

const toNumber = (val) => {
  if (val === undefined || val === null) return null;

  const cleaned = String(val)
    .trim()
    .replace(/^,+|,+$/g, "");

  if (cleaned === "") return null;

  const n = Number(cleaned);

  return isNaN(n) ? null : n;
};

const safeUnlink = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {
  }
};

const ALLOWED_RETAILER_TYPES = ["online", "offline"];

const RETAILER_TYPE_ALIASES = {
  online: "online",
  offline: "offline",
};

async function getShopIdFromSession(res) {
  const session = res.locals.shopify?.session;

  if (!session || !session.shop) {
    throw new Error("Unauthorized");
  }

  const shopDomain = session.shop;
  const { rows } = await pool.query(
    `SELECT id FROM stores WHERE shop_domain = $1 AND is_installed = TRUE`,
    [shopDomain]
  );

  if (!rows.length) {
    throw new Error("Shop not registered");
  }

  return rows[0].id;
}

export async function getRetailers(req, res) {
  try {
    const store_id = await getShopIdFromSession(res);
    const { country, category, search, lat, lng, radius } = req.query;
    const cleanSearch = search
      ? search.trim().replace(/\s+/g, " ")
      : null;
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
      AND (
        $4::text IS NULL
        OR length(trim($4)) = 0

        -- Normalize + and - to spaces
        OR REPLACE(REPLACE(
          CONCAT_WS(' ',
            r.name,
            r.address_line1,
            r.address_line2,
            r.city,
            r.state,
            r.postal_code
          ),
          '+', ' '
        ), '-', ' ')
        ILIKE '%' || REPLACE(REPLACE($4, '+', ' '), '-', ' ') || '%'

        -- Remove + and - completely
        OR REPLACE(REPLACE(
          CONCAT_WS(' ',
            r.name,
            r.address_line1,
            r.address_line2,
            r.city,
            r.state,
            r.postal_code
          ),
          '+', ''
        ), '-', '')
        ILIKE '%' || REPLACE(REPLACE($4, '+', ''), '-', '') || '%'

        -- Postal code exact/partial match
        OR r.postal_code ILIKE '%' || $4 || '%'

        -- Fallback search
        OR CONCAT_WS(' ',
          r.name,
          r.address_line1,
          r.address_line2,
          r.city,
          r.state,
          r.postal_code
        ) ILIKE '%' || $4 || '%'
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
    ];  

    const result = await pool.query(query, values);
    let retailers = result.rows;

    if (lat && lng && radius) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusKm = parseFloat(radius);
    
      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
    
        const toRad = (deg) => deg * (Math.PI / 180);
    
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
    
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
    
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      };
      retailers = retailers
      .filter(
        (retailer) =>
          retailer.latitude &&
          retailer.longitude
      )
      .map((retailer) => {
          const distance = calculateDistance(
            userLat,
            userLng,
            parseFloat(retailer.latitude),
            parseFloat(retailer.longitude)
          );
    
          return {
            ...retailer,
            distance: Number(distance.toFixed(2)),
          };
        })
        .filter((retailer) => retailer.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);
    }
    return res.json({
      success: true,
      count: retailers.length,
      data: retailers,
    });

  } catch (err) {
    console.error("❌ getRetailers error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function createRetailer(req, res) {
  try {
    const store_id = await getShopIdFromSession(res);

    const {
      country,
      name,
      retailer_type,
      status,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      latitude,
      longitude,
      phone,
      email,
      website_url,
      google_maps_link,
      opening_hours,
      notes,
      category_ids
    } = req.body;

    let country_id = null;

    if (country) {
      const countryResult = await pool.query(
        `SELECT id FROM countries WHERE name ILIKE $1 LIMIT 1`,
        [country.trim()]
      );

      if (countryResult.rows.length) {
        country_id = countryResult.rows[0].id;
      }
    }

    const result = await pool.query(
      `INSERT INTO retailers (
        store_id, country_id, name, retailer_type, status,
        address_line1, address_line2, city, state, postal_code,
        latitude, longitude, phone, email,
        website_url, google_maps_link, opening_hours, notes
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        $11,$12,$13,$14,
        $15,$16,$17,$18
      )
      RETURNING *`,
      [
        store_id,
        country_id,
        name,
        retailer_type,
        status,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        latitude,
        longitude,
        phone,
        email,
        website_url,
        google_maps_link,
        opening_hours,
        notes
      ]
    );

    const retailer = result.rows[0];

    if (category_ids?.length) {
      for (let catId of category_ids) {
        await pool.query(
          `INSERT INTO retailer_categories (retailer_id, category_id)
           VALUES ($1, $2)`,
          [retailer.id, catId]
        );
      }
    }

    res.json({ success: true, data: retailer });

  } catch (err) {
    console.error(err);
    res.status(err.message === "Unauthorized" ? 401 : 500).json({
      error: err.message
    });
  }
}

export async function updateRetailer(req, res) {
  try {
    const store_id = await getShopIdFromSession(res);
    const { id } = req.params;

    const {
      country_id,
      name,
      retailer_type,
      status,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      latitude,
      longitude,
      phone,
      email,
      website_url,
      google_maps_link,
      opening_hours,
      notes,
      category_ids
    } = req.body;

    const check = await pool.query(
      `SELECT id FROM retailers WHERE id = $1 AND store_id = $2`,
      [id, store_id]
    );

    if (!check.rows.length) {
      return res.status(403).json({ error: "Unauthorized retailer access" });
    }

    await pool.query(
      `UPDATE retailers SET
        country_id = COALESCE($1, country_id),
        name = COALESCE($2, name),
        retailer_type = COALESCE($3, retailer_type),
        status = COALESCE($4, status),
        address_line1 = COALESCE($5, address_line1),
        address_line2 = COALESCE($6, address_line2),
        city = COALESCE($7, city),
        state = COALESCE($8, state),
        postal_code = COALESCE($9, postal_code),
        latitude = COALESCE($10, latitude),
        longitude = COALESCE($11, longitude),
        phone = COALESCE($12, phone),
        email = COALESCE($13, email),
        website_url = COALESCE($14, website_url),
        google_maps_link = COALESCE($15, google_maps_link),
        opening_hours = COALESCE($16, opening_hours),
        notes = COALESCE($17, notes)
      WHERE id = $18`,
      [
        country_id || null,
        name || null,
        retailer_type || null,
        status || null,
        address_line1 || null,
        address_line2 || null,
        city || null,
        state || null,
        postal_code || null,
        latitude || null,
        longitude || null,
        phone || null,
        email || null,
        website_url || null,
        google_maps_link || null,
        opening_hours || null,
        notes || null,
        id
      ]
    );

    if (category_ids) {
      await pool.query(`DELETE FROM retailer_categories WHERE retailer_id = $1`, [id]);

      for (let catId of category_ids) {
        await pool.query(
          `INSERT INTO retailer_categories (retailer_id, category_id)
           VALUES ($1, $2)`,
          [id, catId]
        );
      }
    }

    res.json({ success: true, message: "Retailer updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(err.message === "Unauthorized" ? 401 : 500).json({
      error: err.message
    });
  }
}

export async function deleteRetailer(req, res) {
  try {
    const store_id = await getShopIdFromSession(res);
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE retailers
       SET status = 'inactive'
       WHERE id = $1 AND store_id = $2
       RETURNING id`,
      [id, store_id]
    );

    if (!result.rows.length) {
      return res.status(403).json({
        error: "Unauthorized or retailer not found"
      });
    }

    res.json({
      success: true,
      message: "Retailer marked as inactive"
    });

  } catch (err) {
    console.error(err);
    res.status(err.message === "Unauthorized" ? 401 : 500).json({
      error: err.message
    });
  }
}

export async function getRetailerById(req, res) {
  try {
    const store_id = await getShopIdFromSession(res);
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT 
        r.*,
        c.name AS country,
        ARRAY_AGG(DISTINCT cat.name) FILTER (WHERE cat.name IS NOT NULL) AS categories,
        ARRAY_AGG(DISTINCT cat.id) FILTER (WHERE cat.id IS NOT NULL) AS category_ids
      FROM retailers r
      JOIN countries c ON r.country_id = c.id
      LEFT JOIN retailer_categories rc ON r.id = rc.retailer_id
      LEFT JOIN categories cat ON rc.category_id = cat.id
      WHERE r.id = $1 AND r.store_id = $2
      GROUP BY r.id, c.name
      LIMIT 1
      `,
      [id, store_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Retailer not found" });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(err.message === "Unauthorized" ? 401 : 500).json({
      error: err.message
    });
  }
}

const normalizeRetailerType = (val) => {
  if (!val || String(val).trim() === "") return "offline";
  const key = String(val).trim().toLowerCase();
  return RETAILER_TYPE_ALIASES[key] ?? null;
};

const validateRetailerRow = (row) => {
  const errors = [];

  // Name
  if (!cleanText(row.name)) {
    errors.push("Missing required field: name");
  }

  // Country
  if (!cleanText(row.country)) {
    errors.push("Missing required field: country");
  }

  // Email validation
  const email = cleanText(row.email)
    ?.replace(/\s+/g, "")
    ?.trim();

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.push(`Invalid email: "${row.email}"`);
  }

  // Website URL validation
  if (
    cleanText(row.website_url)
    && !/^https?:\/\/.+/i.test(row.website_url)
  ) {
    errors.push(`Invalid website_url: "${row.website_url}"`);
  }

  // Google Maps URL validation
  if (
    cleanText(row.google_maps_link) &&
    !/^(https?:\/\/)?(www\.)?(google\.)?.+/i.test(
      row.google_maps_link.trim()
    )
  ) {
    errors.push(`Invalid google_maps_link: "${row.google_maps_link}"`);
  }

  // Phone validation
  if (
    cleanText(row.phone)
    && !/^[0-9+\-\s()]{6,20}$/.test(row.phone)
  ) {
    errors.push(`Invalid phone: "${row.phone}"`);
  }

  // Postal code validation
  if (
    cleanText(row.postal_code)
    && String(row.postal_code).length > 20
  ) {
    errors.push(`Invalid postal_code: "${row.postal_code}"`);
  }

  // Latitude validation
  if (cleanText(row.latitude)) {
    const latitude = toNumber(row.latitude);

    if (
      latitude === null ||
      latitude < -90 ||
      latitude > 90
    ) {
      errors.push(`Invalid latitude: "${row.latitude}"`);
    }
  }

  if (cleanText(row.longitude)) {
    const longitude = toNumber(row.longitude);

    if (
      longitude === null ||
      longitude < -180 ||
      longitude > 180
    ) {
      errors.push(`Invalid longitude: "${row.longitude}"`);
    }
  }

  return errors;
};

export async function importRetailersCSV(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "CSV file is required." });
  }

  const filePath = req.file.path;
  const results = [];
  const errors = [];
  let successCount = 0;

  try {
    // 2. Parse the CSV into memory first, then process
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .on("error", reject) // ← handle unreadable file
        .pipe(csv())
        .on("data", (row) => results.push(row))
        .on("error", reject) // ← handle malformed CSV
        .on("end", resolve);
    });
  } catch (parseErr) {
    safeUnlink(filePath);
    return res.status(400).json({
      success: false,
      error: "Failed to parse CSV file. Ensure it is a valid CSV.",
    });
  }

  if (results.length === 0) {
    safeUnlink(filePath);
    return res.status(400).json({ success: false, error: "CSV file is empty." });
  }

  const store_id = await getShopIdFromSession(res);

  for (let i = 0; i < results.length; i++) {
    const row = results[i];
    const rowNum = i + 2;

    const validationErrors = validateRetailerRow(row);

    if (validationErrors.length) {
      validationErrors.forEach((err) => {
        errors.push({
          row: rowNum,
          error: err,
        });
      });

      continue;
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const countryRes = await client.query(
        `SELECT id FROM countries WHERE name ILIKE $1 LIMIT 1`,
        [row.country.trim()]
      );

      if (!countryRes.rows.length) {
        errors.push({ row: rowNum, error: `Country not found: "${row.country}"` });
        await client.query("ROLLBACK");
        continue;
      }
      const country_id = countryRes.rows[0].id;

      const retailerType = normalizeRetailerType(row.retailer_type);
      if (retailerType === null) {
        errors.push({
          row: rowNum,
          error: `Invalid retailer_type: "${row.retailer_type}". Allowed values: ${ALLOWED_RETAILER_TYPES.join(", ")}. Common aliases like "physical" and "store" are also accepted.`,
        });
        await client.query("ROLLBACK");
        continue;
      }
      const duplicateRetailer = await client.query(
        `
        SELECT id
        FROM retailers
        WHERE store_id = $1
          AND LOWER(TRIM(name)) = LOWER(TRIM($2))
          AND LOWER(TRIM(COALESCE(address_line1, ''))) = LOWER(TRIM(COALESCE($3, '')))
          AND LOWER(TRIM(COALESCE(city, ''))) = LOWER(TRIM(COALESCE($4, '')))
          AND LOWER(TRIM(COALESCE(state, ''))) = LOWER(TRIM(COALESCE($5, '')))
          AND country_id = $6
          AND COALESCE(latitude, 0::numeric) = COALESCE($7::numeric, 0::numeric)
          AND COALESCE(longitude, 0::numeric) = COALESCE($8::numeric, 0::numeric)
          AND LOWER(TRIM(COALESCE(opening_hours, ''))) = LOWER(TRIM(COALESCE($9, '')))
          AND LOWER(TRIM(COALESCE(postal_code, ''))) = LOWER(TRIM(COALESCE($10, '')))
          AND LOWER(TRIM(COALESCE(phone, ''))) = LOWER(TRIM(COALESCE($11, '')))
        LIMIT 1
        `,
        [
          store_id,
          cleanText(row.name),
          cleanText(row.address_line1),
          cleanText(row.city),
          cleanText(row.state),
          country_id,
          toNumber(row.latitude),
          toNumber(row.longitude),
          cleanText(row.opening_hours),
          cleanText(row.postal_code),
          cleanText(row.phone),
        ]
      );

      if (duplicateRetailer.rows.length) {
        errors.push({
          row: rowNum,
          error: `Retailer already exists with same details`,
        });

        await client.query("ROLLBACK");
        continue;
      }

      const rawStatus = cleanText(row.status)?.toLowerCase();
      const retailerStatus = rawStatus === "inactive" ? "inactive" : "active";

      const retailerRes = await client.query(
        `INSERT INTO retailers (
          store_id, country_id, name, retailer_type, status,
          address_line1, address_line2, city, state, postal_code,
          latitude, longitude, phone, email,
          website_url, google_maps_link, opening_hours, notes
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13,$14,
          $15,$16,$17,$18
        )
        ON CONFLICT DO NOTHING
        RETURNING id`,
        [
          store_id,
          country_id,
          cleanText(row.name),
          retailerType,
          retailerStatus,
          cleanText(row.address_line1),
          cleanText(row.address_line2),
          cleanText(row.city),
          cleanText(row.state),
          cleanText(row.postal_code),
          toNumber(row.latitude),
          toNumber(row.longitude),
          cleanText(row.phone),
          cleanText(row.email),
          cleanText(row.website_url),
          cleanText(row.google_maps_link),
          cleanText(row.opening_hours),
          cleanText(row.notes),
        ]
      );

      if (!retailerRes.rows.length) {
        errors.push({ row: rowNum, error: `Duplicate retailer skipped: "${row.name}"` });
        await client.query("ROLLBACK");
        continue;
      }

      const retailer_id = retailerRes.rows[0].id;

      if (cleanText(row.categories)) {
        const categoryList = row.categories.split(",").map((c) => c.trim()).filter(Boolean);

        for (const catName of categoryList) {
          const catRes = await client.query(
            `SELECT id FROM categories WHERE name ILIKE $1 AND store_id = $2 LIMIT 1`,
            [catName, store_id]
          );

          if (catRes.rows.length) {
            await client.query(
              `INSERT INTO retailer_categories (retailer_id, category_id)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [retailer_id, catRes.rows[0].id]
            );
          }
        }
      }

      await client.query("COMMIT");
      successCount++;
    } catch (rowErr) {
      await client.query("ROLLBACK");
      console.error(`Row ${rowNum} failed:`, rowErr.message);
      errors.push({ row: rowNum, error: rowErr.message });
    } finally {
      client.release();
    }
  }

  safeUnlink(filePath);

  return res.json({
    success: true,
    total: results.length,
    inserted: successCount,
    skipped: results.length - successCount - errors.filter(e => e.error.startsWith("Duplicate")).length,
    failed: errors.length,
    errors,
  });
}
