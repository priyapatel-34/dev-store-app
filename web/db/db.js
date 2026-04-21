
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
}

// Debug (optional)
console.log("ENV:", {
  PG_HOST: process.env.PG_HOST,
  PG_USER: process.env.PG_USER,
  PG_PASSWORD: process.env.PG_PASSWORD ? "****" : "EMPTY",
  PG_DATABASE: process.env.PG_DATABASE,
  PG_PORT: process.env.PG_PORT
});

// Create pool
export const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: process.env.PG_PORT || 5432,
  max: 10,
  ssl: false
});