/**
 * db/connection.js
 * Pool de conexões com o PostgreSQL.
 * Suporta DATABASE_URL (produção) ou variáveis individuais (local).
 */

require("dotenv").config();
const { Pool } = require("pg");

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "false"
      ? false
      : { rejectUnauthorized: false },   // necessário em Render / Railway / Neon
  };
} else {
  poolConfig = {
    host:     process.env.DB_HOST     || "localhost",
    port:     parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME     || "pet_saude",
    user:     process.env.DB_USER     || "postgres",
    password: process.env.DB_PASSWORD || "",
    ssl:      process.env.DB_SSL === "true",
  };
}

const pool = new Pool(poolConfig);

pool.on("error", (err) => {
  console.error("❌ Erro inesperado no pool PostgreSQL:", err.message);
});

pool.on("connect", () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("✅ Conectado ao PostgreSQL");
  }
});

/**
 * Helper para queries com parâmetros.
 * Uso: const { rows } = await query("SELECT * FROM activities WHERE id=$1", [id])
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    if (process.env.NODE_ENV === "development") {
      console.log(`🔍 Query (${Date.now() - start}ms):`, text.slice(0, 80));
    }
    return res;
  } catch (err) {
    console.error("❌ Erro na query:", text);
    console.error("   Params:", params);
    console.error("   Erro:", err.message);
    throw err;
  }
}

module.exports = { pool, query };
