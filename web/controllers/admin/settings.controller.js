import { pool } from "../../db/db.js";

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

export async function getFilterSettings(req, res) {

    try {

        const store_id = await getShopIdFromSession(res);

        const result = await pool.query(
            `
            SELECT
                filter_enabled,
                show_global_retailers
            FROM admin_settings
            WHERE store_id = $1
            LIMIT 1
            `,
            [store_id]
        );

        return res.json({
            success: true,
            data: result.rows[0] || {
                filter_enabled: false,
                show_global_retailers: false
            }
        });

    } catch (err) {

        console.error(err);

        if (err.message === "Unauthorized") {
            return res.status(401).json({
                success: false,
                error: err.message
            });
        }

        if (err.message === "Shop not registered") {
            return res.status(404).json({
                success: false,
                error: err.message
            });
        }

        return res.status(500).json({
            success: false,
            error: err.message || "Internal Server Error"
        });

    }
}

export async function updateFilterSettings(req, res) {

    try {

        const store_id = await getShopIdFromSession(res);

        const {
            filter_enabled,
            show_global_retailers
        } = req.body;

        const result = await pool.query(
            `
            INSERT INTO admin_settings (
                store_id,
                filter_enabled,
                show_global_retailers
            )
            VALUES ($1, $2, $3)

            ON CONFLICT (store_id)

            DO UPDATE SET
                filter_enabled = EXCLUDED.filter_enabled,
                show_global_retailers = EXCLUDED.show_global_retailers

            RETURNING *
            `,
            [
                store_id,
                filter_enabled,
                show_global_retailers
            ]
        );

        return res.json({
            success: true,
            message: "Settings updated successfully",
            data: result.rows[0]
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            error: err.message || "Internal Server Error"
        });

    }
}