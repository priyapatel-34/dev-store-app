import { pool } from "../db/db.js";

export async function attachStore(req, res, next) {
  try {
    const shop = res.locals.shopify.session.shop;

    const result = await pool.query(
      `SELECT id FROM stores WHERE shop_domain = $1 LIMIT 1`,
      [shop]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "Store not found" });
    }

    req.store_id = result.rows[0].id;

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Store middleware failed" });
  }
}