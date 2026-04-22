import fs from "fs";
import csv from "csv-parser";
import { pool } from "../db/db.js";

const cleanText = (val) => {
  if (!val || val.trim() === "") return null;
  return val.trim();
};

const toNumber = (val) => {
  if (!val || val.trim() === "") return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
};

export async function getRetailers(req, res) {
  try {
    const { country, category } = req.query;
    const store_id = req.store_id;

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

  WHERE r.store_id = $3 
        AND ($1::text IS NULL OR c.name ILIKE $1)
        AND ($2::text IS NULL OR cat.name ILIKE $2)

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
      country ? `%${country}%` : null,
      category ? `%${category}%` : null,
      store_id
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export async function createRetailer(req, res){
  try {
    const store_id = req.store_id;
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

    // insert categories
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
    res.status(500).json({ error: err.message });
  }
};

export async function updateRetailer(req, res){
  try {
    const { id } = req.params;
    const store_id = req.store_id;
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

    await pool.query(
      `UPDATE retailers SET
        store_id = COALESCE($1, store_id),
        country_id = COALESCE($2, country_id),
        name = COALESCE($3, name),
        retailer_type = COALESCE($4, retailer_type),
        status = COALESCE($5, status),
        address_line1 = COALESCE($6, address_line1),
        address_line2 = COALESCE($7, address_line2),
        city = COALESCE($8, city),
        state = COALESCE($9, state),
        postal_code = COALESCE($10, postal_code),
        latitude = COALESCE($11, latitude),
        longitude = COALESCE($12, longitude),
        phone = COALESCE($13, phone),
        email = COALESCE($14, email),
        website_url = COALESCE($15, website_url),
        google_maps_link = COALESCE($16, google_maps_link),
        opening_hours = COALESCE($17, opening_hours),
        notes = COALESCE($18, notes)
      WHERE id = $19`,
      [
        store_id || null,
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

    // ✅ Update categories ONLY if provided
    if (category_ids) {
      await pool.query(
        `DELETE FROM retailer_categories WHERE retailer_id = $1`,
        [id]
      );

      for (let catId of category_ids) {
        await pool.query(
          `INSERT INTO retailer_categories (retailer_id, category_id)
           VALUES ($1, $2)`,
          [id, catId]
        );
      }
    }

    res.json({
      success: true,
      message: "Retailer updated successfully"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export async function deleteRetailer(req, res){
  try {
    const { id } = req.params;

    await pool.query(`DELETE FROM retailers WHERE id=$1`, [id]);

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export async function getRetailerById(req, res){
  try {
    const { id } = req.params;
    const store_id = req.store_id;

    if (!id) {
      return res.status(400).json({
        error: "Retailer id is required"
      });
    }

    const query = `
      SELECT 
        r.*,
        c.name AS country,
        ARRAY_AGG(DISTINCT cat.name) 
          FILTER (WHERE cat.name IS NOT NULL) AS categories,
        ARRAY_AGG(DISTINCT cat.id) 
          FILTER (WHERE cat.id IS NOT NULL) AS category_ids
      FROM retailers r
      JOIN countries c ON r.country_id = c.id
      LEFT JOIN retailer_categories rc ON r.id = rc.retailer_id
      LEFT JOIN categories cat 
        ON rc.category_id = cat.id
      WHERE r.id = $1
        AND ($2::int IS NULL OR r.store_id = $2)
      GROUP BY r.id, c.name
      LIMIT 1;
    `;

    const values = [
      id,
      store_id || null
    ];

    const result = await pool.query(query, values);

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Retailer not found"
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error"
    });
  }
};

export async function toggleRetailerStatus(req, res){
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE retailers
       SET status = CASE 
         WHEN status = 'active' THEN 'inactive'
         ELSE 'active'
       END
       WHERE id = $1
       RETURNING status`,
      [id]
    );

    res.json({
      success: true,
      status: result.rows[0].status
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export async function importRetailersCSV(req, res){
  const results = [];
  const errors = [];

  if (!req.file) {
    return res.status(400).json({ error: "CSV file required" });
  }

  try {
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", async () => {
        const client = await pool.connect();

        let successCount = 0;

        try {
          await client.query("BEGIN");

          for (let i = 0; i < results.length; i++) {
            const row = results[i];

            try {
              // ✅ 1. Validation
              if (!row.name || !row.country) {
                errors.push({ row: i + 1, error: "Missing name/country" });
                continue;
              }

              const store_id = req.store_id;

              // ✅ 2. Get country_id
              const countryRes = await client.query(
                `SELECT id FROM countries WHERE name ILIKE $1 LIMIT 1`,
                [row.country.trim()]
              );

              if (!countryRes.rows.length) {
                errors.push({ row: i + 1, error: "Invalid country" });
                continue;
              }

              const country_id = countryRes.rows[0].id;

              // ✅ 3. Insert retailer
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
                RETURNING id`,
                [
                  store_id,
                  country_id,
                  cleanText(row.name),
                  cleanText(row.retailer_type) || "offline",
                  "active",
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
                  cleanText(row.notes)
                ]
              );

              const retailer_id = retailerRes.rows[0].id;

              // ✅ 4. Handle categories (MULTI STORE SAFE)
              if (row.categories) {
                const categoryList = row.categories.split(",");

                for (let catName of categoryList) {
                  const catRes = await client.query(
                    `SELECT id FROM categories 
                     WHERE name ILIKE $1 AND store_id = $2 
                     LIMIT 1`,
                    [catName.trim(), store_id]
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

              successCount++;

            } catch (rowErr) {
              errors.push({
                row: i + 1,
                error: rowErr.message
              });
            }
          }

          await client.query("COMMIT");

        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
          fs.unlinkSync(req.file.path);
        }

        return res.json({
          success: true,
          total: results.length,
          inserted: successCount,
          failed: errors.length,
          errors
        });
      });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Import failed" });
  }
};
