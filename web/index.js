// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import { pool } from "./db/db.js";
import shopify from "./shopify.js";
import PrivacyWebhookHandlers from "./privacy.js";
import retailersRoutes from "./routes/retailers.routes.js";

const PORT = parseInt(process.env.PORT || "3000", 10);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

app.use(express.json());

app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (req, res) => {
    try {
      const session = res.locals.shopify.session;

      if (!session) {
        return res.status(500).send("No session found");
      }

      await pool.query(
        `
        INSERT INTO stores (shop_domain, access_token, is_installed, installed_at)
        VALUES ($1, $2, TRUE, NOW())
        ON CONFLICT (shop_domain)
        DO UPDATE SET
          access_token = EXCLUDED.access_token,
          is_installed = TRUE,
          uninstalled_at = NULL;
        `,
        [session.shop, session.accessToken]
      );

      console.log("✅ App installed:", session.shop);

      return shopify.redirectToShopifyOrAppRoot();

    } catch (err) {
      console.error("Auth error:", err);
      res.status(500).send("Auth failed");
    }
  }
);

/* ---------------- WEBHOOKS ---------------- */

app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

/* ---------------- AUTH MIDDLEWARE ---------------- */

app.use("/api/*", shopify.validateAuthenticatedSession());

/* ---------------- SAMPLE API ---------------- */

app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const data = await client.request(`
    query {
      productsCount {
        count
      }
    }
  `);

  res.json({ count: data.data.productsCount.count });
});

/* ---------------- RETAILER API ---------------- */

app.use("/api/retailers", retailersRoutes);

/* ---------------- STATIC ---------------- */

app.use(shopify.cspHeaders());

app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), (req, res) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});