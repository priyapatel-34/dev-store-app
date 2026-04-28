const pool = require("../config/db");

export async function getCategories(req, res){
    try {
      const store_id = req.store_id;
  
      if (!store_id) {
        return res.status(400).json({ error: "Store not found in session" });
      }
  
      const result = await pool.query(
        `SELECT * FROM categories
         WHERE store_id = $1 AND is_active = true
         ORDER BY id DESC`,
        [store_id]
      );
  
      res.json({ success: true, data: result.rows });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  };

  exports.createCategories = async (req, res) => {
    try {
      const { name } = req.body;
      const store_id = req.store_id;
  
      if (!name) {
        return res.status(400).json({ error: "Name required" });
      }
  
      const result = await pool.query(
        `INSERT INTO categories (name, store_id, is_active)
         VALUES ($1, $2, true)
         RETURNING *`,
        [name.trim(), store_id] // ✅ FIXED ORDER
      );
  
      res.json({
        success: true,
        data: result.rows[0]
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  };

  exports.updateCategories = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, is_active } = req.body;
  
      const result = await pool.query(
        `UPDATE categories
         SET 
           name = COALESCE($1, name),
           is_active = COALESCE($2, is_active)
         WHERE id = $3
         RETURNING *`,
        [
          name ? name.trim() : null,
          typeof is_active === "boolean" ? is_active : null,
          id
        ]
      );
  
      if (!result.rows.length) {
        return res.status(404).json({ error: "Category not found" });
      }
  
      res.json({
        success: true,
        data: result.rows[0]
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  };

exports.deleteCategories = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            `UPDATE categories
         SET is_active = false
         WHERE id = $1`,
            [id]
        );

        res.json({ success: true, message: "Category disabled" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
