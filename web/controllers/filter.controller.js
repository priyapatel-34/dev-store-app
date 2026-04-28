const pool = require("../config/db");

export async function getStorefrontRetailers(req, res) {
    try {
      const { lat, lng, radius, category, country } = req.query;
  
      let filters = [];
      let values = [];
      let index = 1;
  
      // Base query with distance calculation
      let query = `
        SELECT 
          r.id,
          r.name,
          r.address_line1,
          r.city,
          r.state,
          r.latitude,
          r.longitude,
          r.phone,
          r.website_url,
          c.name AS country,
  
          COALESCE(STRING_AGG(DISTINCT cat.name, ', '), '') AS categories,
  
          ${
            lat && lng
              ? `6371 * acos(
                  cos(radians($${index})) *
                  cos(radians(r.latitude)) *
                  cos(radians(r.longitude) - radians($${index + 1})) +
                  sin(radians($${index})) *
                  sin(radians(r.latitude))
                )`
              : `NULL`
          } AS distance
  
        FROM retailers r
        JOIN countries c ON r.country_id = c.id
        LEFT JOIN retailer_categories rc ON r.id = rc.retailer_id
        LEFT JOIN categories cat ON rc.category_id = cat.id
      `;
  
      // Add lat/lng values if present
      if (lat && lng) {
        values.push(lat, lng);
        index += 2;
      }
  
      // WHERE conditions
      query += ` WHERE r.status = 'active' `;
  
      if (country) {
        query += ` AND c.name ILIKE $${index}`;
        values.push(`%${country}%`);
        index++;
      }
  
      if (category) {
        query += ` AND cat.name ILIKE $${index}`;
        values.push(`%${category}%`);
        index++;
      }
  
      query += `
        GROUP BY r.id, c.name
      `;
  
      // HAVING for radius filter
      if (lat && lng && radius) {
        query += `
          HAVING 
            6371 * acos(
              cos(radians($1)) *
              cos(radians(r.latitude)) *
              cos(radians(r.longitude) - radians($2)) +
              sin(radians($1)) *
              sin(radians(r.latitude))
            ) <= $${index}
        `;
        values.push(radius);
        index++;
      }
  
      // Order by distance if exists
      query += `
        ORDER BY ${lat && lng ? "distance ASC" : "r.id DESC"}
      `;
  
      const result = await pool.query(query, values);
  
      return res.json({
        success: true,
        count: result.rows.length,
        data: result.rows,
      });
  
    } catch (err) {
      console.error("❌ Storefront API error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }