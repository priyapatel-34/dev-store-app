// @ts-check
import { join } from "path";
import cors from "cors";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import { pool } from "./db/db.js";
import shopify from "./shopify.js";
import { initDb } from "./db/initDb.js";
import PrivacyWebhookHandlers from "./privacy.js";
import retailersRoutes from "./routes/admin/retailers.routes.js";
import categoriesRoutes from "./routes/admin/categories.routes.js";
import settingsRoutes from "./routes/admin/settings.routes.js";
import countriesRoutes from "./routes/admin/countries.routes.js";
import storeRetailersRoutes from "./routes/storefront/retailer.routes.js";
import storeCategoriesRoutes from "./routes/storefront/categories.routes.js";
import storeSettingsRoutes from "./routes/storefront/settings.routes.js";

const PORT = parseInt(process.env.PORT || "3000", 10);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

    const app = express();
    app.use(cors());
await initDb();
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
        INSERT INTO stores (shop_domain, access_token, is_installed)
        VALUES ($1, $2, true)
        ON CONFLICT (shop_domain)
        DO UPDATE SET
          access_token = EXCLUDED.access_token,
          is_installed = true
        `,
        [session.stores, session.accessToken,session.scope]
      );

      console.log("✅ App installed:", session.stores);

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

await initDb();

app.use("/app/retailers", shopify.validateAuthenticatedSession(), retailersRoutes);
app.use("/app/categories", shopify.validateAuthenticatedSession(), categoriesRoutes);
app.use("/app/settings", shopify.validateAuthenticatedSession(), settingsRoutes);
app.use("/app/countries", shopify.validateAuthenticatedSession(), countriesRoutes);

app.use("/retailers", storeRetailersRoutes);
app.use("/categories", storeCategoriesRoutes);
app.use("/settings", storeSettingsRoutes);
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

/* ---------------- STATIC ---------------- */

app.use(shopify.cspHeaders());

app.use(serveStatic(STATIC_PATH, { index: false }));

console.log("ENV CHECK:");
console.log("API KEY:", process.env.SHOPIFY_API_KEY);
console.log("API SECRET:", process.env.SHOPIFY_API_SECRET);
console.log("port:", process.env.PORT);

console.log("HOST:", process.env.HOST);
console.log("SCOPES:", process.env.SCOPES);

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