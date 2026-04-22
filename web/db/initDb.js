import { pool } from "./db.js";

export async function initDb() {
  try {
    console.log("🔧 Initializing PostgreSQL DB...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS stores (
        id SERIAL PRIMARY KEY,
        shop_domain TEXT UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        country_code TEXT,
        is_installed BOOLEAN DEFAULT TRUE,
        installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        uninstalled_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS countries (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code VARCHAR(10) UNIQUE NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        store_id INT REFERENCES stores(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS retailers (
        id SERIAL PRIMARY KEY,
        store_id INT REFERENCES stores(id) ON DELETE CASCADE,
        country_id INT REFERENCES countries(id),

        name TEXT NOT NULL,
        retailer_type VARCHAR(20) 
          CHECK (retailer_type IN ('offline','online','hybrid')) DEFAULT 'offline',

        status VARCHAR(20) DEFAULT 'active',

        address_line1 TEXT,
        address_line2 TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,

        latitude DECIMAL,
        longitude DECIMAL,

        phone TEXT,
        email TEXT,
        website_url TEXT,
        google_maps_link TEXT,

        opening_hours TEXT,
        notes TEXT,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS retailer_categories (
        id SERIAL PRIMARY KEY,
        retailer_id INT REFERENCES retailers(id) ON DELETE CASCADE,
        category_id INT REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE (retailer_id, category_id)
      );
    `);

    // ⚡ INDEXES (VERY IMPORTANT FOR 10k+)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_retailers_store ON retailers(store_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_retailers_country ON retailers(country_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_categories_store ON categories(store_id);`);

    console.log("✅ DB Initialized Successfully");

  } catch (err) {
    console.error("❌ DB Init Error:", err);
  }
}

// import { pool } from "./db.js";

// export async function initDb() {
//   try {
//     console.log("🔧 Initializing PostgreSQL DB...");

//     // 1️⃣ STORES (Shopify shops)
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS stores (
//         id SERIAL PRIMARY KEY,
//         shop_domain TEXT UNIQUE NOT NULL,
//         access_token TEXT NOT NULL,
//         country_code TEXT, -- optional mapping

//         is_installed BOOLEAN DEFAULT TRUE,
//         installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         uninstalled_at TIMESTAMP NULL,

//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     // 2️⃣ COUNTRIES
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS countries (
//         id SERIAL PRIMARY KEY,
//         name TEXT NOT NULL,
//         code VARCHAR(10) UNIQUE NOT NULL
//       );
//     `);

//     // 3️⃣ CATEGORIES (per store)
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS categories (
//         id SERIAL PRIMARY KEY,
//         store_id INT REFERENCES stores(id) ON DELETE CASCADE,
//         name TEXT NOT NULL,
//         is_active BOOLEAN DEFAULT TRUE
//       );
//     `);

//     // 4️⃣ RETAILERS (main table)
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS retailers (
//         id SERIAL PRIMARY KEY,

//         store_id INT REFERENCES stores(id) ON DELETE CASCADE,
//         country_id INT REFERENCES countries(id),

//         name TEXT NOT NULL,
//         retailer_type VARCHAR(20) CHECK (retailer_type IN ('offline','online','hybrid')),
//         status VARCHAR(20) DEFAULT 'active',

//         address_line1 TEXT,
//         address_line2 TEXT,
//         city TEXT,
//         state TEXT,
//         postal_code TEXT,

//         latitude DECIMAL,
//         longitude DECIMAL,

//         phone TEXT,
//         email TEXT,
//         website_url TEXT,
//         google_maps_link TEXT,

//         opening_hours TEXT,
//         notes TEXT,

//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     // 5️⃣ RETAILER ↔ CATEGORY (many-to-many)
//     await pool.query(`
//       CREATE TABLE IF NOT EXISTS retailer_categories (
//         id SERIAL PRIMARY KEY,
//         retailer_id INT REFERENCES retailers(id) ON DELETE CASCADE,
//         category_id INT REFERENCES categories(id) ON DELETE CASCADE
//       );
//     `);

//     console.log("✅ DB Initialized Successfully");

//   } catch (err) {
//     console.error("❌ DB Init Error:", err);
//   }
// }