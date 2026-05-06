import { pool } from "../../db/db.js";

export async function getCountries(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name FROM countries ORDER BY name ASC`
    );

    return res.json({
      success: true,
      data: result.rows
    });

  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}