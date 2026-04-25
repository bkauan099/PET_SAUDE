/**
 * db/init.js
 * Executa o schema.sql no banco.
 * Uso: npm run db:init
 */

require("dotenv").config();
const fs   = require("fs");
const path = require("path");
const { pool } = require("./connection");

async function init() {
  console.log("🔄 Inicializando banco de dados…");
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  try {
    await pool.query(sql);
    console.log("✅ Schema criado com sucesso!");
    console.log("✅ Dados iniciais (participantes e KPIs) inseridos.");
  } catch (err) {
    console.error("❌ Erro ao inicializar o banco:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

init();
