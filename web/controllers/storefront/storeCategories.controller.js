import { pool } from "../../db/db.js";

export async function getCategories(req, res) {
  try {
    const { shop } = req.query;

    if (!shop) {
      return res.status(400).json({
        error: "shop is required",
      });
    }

    // 🔥 Step 1: Get store_id from DB
    const storeResult = await pool.query(
      `SELECT id FROM stores WHERE shop_domain = $1`,
      [shop]
    );

    if (!storeResult.rows.length) {
      return res.status(404).json({
        error: "Store not found",
      });
    }

    const store_id = storeResult.rows[0].id;

    const result = await pool.query(
      `SELECT * FROM categories
       WHERE store_id = $1 AND is_active = true
       ORDER BY id DESC`,
      [store_id]
    );

    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}