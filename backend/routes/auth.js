/**
 * routes/auth.js
 *
 * POST  /api/auth/login           → autentica e retorna JWT
 * GET   /api/auth/me              → dados do usuário logado  [autenticado]
 * POST  /api/auth/logout          → invalida no cliente (stateless)
 *
 * ── Gestão de usuários (admin only) ──
 * GET   /api/auth/users           → lista todos os usuários
 * POST  /api/auth/users           → cria novo usuário
 * PUT   /api/auth/users/:id       → edita nome / role / active
 * DELETE /api/auth/users/:id      → remove usuário
 *
 * ── Próprio usuário ──
 * PUT   /api/auth/password        → troca a própria senha  [autenticado]
 */

require("dotenv").config();
const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const { query }= require("../db/connection");
const { authenticate, requireAdmin } = require("../middleware/authenticate");

const router  = express.Router();
const SECRET  = process.env.JWT_SECRET;
const EXPIRES = process.env.JWT_EXPIRES_IN || "8h";
const ROUNDS  = parseInt(process.env.BCRYPT_ROUNDS || "10");

/* ── helper: gera token ── */
function makeToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    SECRET,
    { expiresIn: EXPIRES }
  );
}

/* ════════════════════════════════════════
   POST /api/auth/login
════════════════════════════════════════ */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "E-mail e senha são obrigatórios." });

    const { rows } = await query(
      "SELECT * FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );
    const user = rows[0];

    if (!user || !user.active)
      return res.status(401).json({ error: "Credenciais inválidas ou usuário inativo." });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: "Credenciais inválidas." });

    const token = makeToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      expiresIn: EXPIRES,
    });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════
   GET /api/auth/me
════════════════════════════════════════ */
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, name, email, role, active, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════
   POST /api/auth/logout  (stateless — apenas confirma no cliente)
════════════════════════════════════════ */
router.post("/logout", (req, res) => {
  res.json({ ok: true, message: "Logout realizado. Descarte o token no cliente." });
});

/* ════════════════════════════════════════
   PUT /api/auth/password  (próprio usuário)
════════════════════════════════════════ */
router.put("/password", authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias." });
    if (newPassword.length < 6)
      return res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres." });

    const { rows } = await query("SELECT * FROM users WHERE id = $1", [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: "Usuário não encontrado." });

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(401).json({ error: "Senha atual incorreta." });

    const hash = await bcrypt.hash(newPassword, ROUNDS);
    await query("UPDATE users SET password = $1 WHERE id = $2", [hash, req.user.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ════════════════════════════════════════
   GESTÃO DE USUÁRIOS  (admin only)
════════════════════════════════════════ */

/* GET /api/auth/users */
router.get("/users", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at"
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* POST /api/auth/users — cria usuário */
router.post("/users", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Nome, e-mail e senha são obrigatórios." });
    if (password.length < 6)
      return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });

    const validRoles = ["admin", "editor"];
    const hash = await bcrypt.hash(password, ROUNDS);
    const { rows } = await query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, active, created_at`,
      [name.trim(), email.trim().toLowerCase(), hash, validRoles.includes(role) ? role : "editor"]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "E-mail já cadastrado." });
    next(err);
  }
});

/* PUT /api/auth/users/:id — edita nome / role / active */
router.put("/users/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, role, active } = req.body;
    const validRoles = ["admin", "editor"];
    const { rows } = await query(
      `UPDATE users
       SET name=$1, role=$2, active=$3
       WHERE id=$4
       RETURNING id, name, email, role, active, created_at`,
      [
        name?.trim() || "",
        validRoles.includes(role) ? role : "editor",
        active !== false,
        req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

/* DELETE /api/auth/users/:id */
router.delete("/users/:id", authenticate, requireAdmin, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: "Você não pode excluir sua própria conta." });
    const { rows } = await query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* PUT /api/auth/users/:id/password  (admin reseta senha de outro usuário) */
router.put("/users/:id/password", authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres." });
    const hash = await bcrypt.hash(newPassword, ROUNDS);
    const { rows } = await query(
      "UPDATE users SET password=$1 WHERE id=$2 RETURNING id",
      [hash, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Usuário não encontrado." });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
