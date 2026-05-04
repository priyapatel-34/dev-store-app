import { pool } from "../../db/db.js";

  export async function getFilters(req, res) {
    try {
  
        const store_id = 1;
  
      const result = await pool.query(
        `SELECT * FROM admin_settings
         WHERE store_id = $1
         ORDER BY id DESC`,
        [store_id]
      );
    
      return res.json({ success: true, data: result.rows });
  
    } catch (err) {
      console.error("ERROR:", err);
      return res.status(500).json({ error: err.message });
    }
  }