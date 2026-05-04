import { pool } from "../../db/db.js";

export async function getCategories(req, res) {
    try {
  
        const store_id = 1;
  
      const result = await pool.query(
        `SELECT * FROM categories
         WHERE store_id = $1 AND is_active = true
         ORDER BY id DESC`,
        [store_id]
      );
  
      console.log("CATEGORIES:", result.rows);
  
      return res.json({ success: true, data: result.rows });
  
    } catch (err) {
      console.error("ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }