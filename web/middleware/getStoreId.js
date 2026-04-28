import { pool } from "../db/db.js";

export const attachStore = async (req, res, next) => {
  try {
    const session = res.locals.shopify?.session;

    if (!session?.shop) {
      return res.status(401).json({ error: "No shop session" });
    }

    const shop = session.shop;

    const result = await pool.query(
      `SELECT id FROM stores WHERE shop_domain = $1 LIMIT 1`,
      [shop]
    );

    if (!result.rows.length) {
      console.error("❌ Store not found. App not installed properly");

      return res.status(401).json({
        error: "Store not registered. Please reinstall app."
      });
    }

    req.store_id = result.rows[0].id;

    next();

  } catch (err) {
    console.error("Store middleware error:", err);
    res.status(500).json({
      error: "Store middleware failed",
      details: err.message
    });
  }
};