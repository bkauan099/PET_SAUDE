/**
 * db/createAdmin.js
 * Cria o primeiro usuário administrador interativamente.
 *
 * Uso: npm run create-admin
 *
 * Ou passe os dados como variáveis de ambiente (para CI/deploy):
 *   ADMIN_NAME="Meu Nome" ADMIN_EMAIL="admin@email.com" ADMIN_PASSWORD="senha123" npm run create-admin
 */

require("dotenv").config();
const bcrypt   = require("bcryptjs");
const readline = require("readline");
const { pool, query } = require("./connection");

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10");

/* ── Se as variáveis de ambiente estiverem definidas, usa direto ── */
async function createFromEnv() {
  const name     = process.env.ADMIN_NAME;
  const email    = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!name || !email || !password) return false;

  await insertUser(name, email, password);
  return true;
}

/* ── Criação interativa via terminal ── */
async function createInteractive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(res => rl.question(q, res));

  console.log("\n👤  Criar usuário administrador\n");

  const name     = (await ask("  Nome completo : ")).trim();
  const email    = (await ask("  E-mail        : ")).trim().toLowerCase();
  const password = (await ask("  Senha (mín. 6 caracteres): ")).trim();

  rl.close();

  if (!name || !email || !password) {
    console.error("\n❌ Todos os campos são obrigatórios.");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("\n❌ A senha deve ter pelo menos 6 caracteres.");
    process.exit(1);
  }

  await insertUser(name, email, password);
}

async function insertUser(name, email, password) {
  const hash = await bcrypt.hash(password, ROUNDS);
  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email)
       DO UPDATE SET name=$1, password=$3, role='admin', active=true
       RETURNING id, name, email, role`,
      [name, email, hash]
    );
    console.log("\n✅ Administrador criado com sucesso!");
    console.log(`   ID    : ${rows[0].id}`);
    console.log(`   Nome  : ${rows[0].name}`);
    console.log(`   E-mail: ${rows[0].email}`);
    console.log(`   Role  : ${rows[0].role}\n`);
  } catch (err) {
    console.error("\n❌ Erro ao criar administrador:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

(async () => {
  const done = await createFromEnv();
  if (!done) await createInteractive();
})();
