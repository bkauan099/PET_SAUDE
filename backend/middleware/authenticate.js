/**
 * middleware/authenticate.js
 * Verifica o JWT enviado no header Authorization: Bearer <token>
 * Injeta req.user com { id, name, email, role } se válido.
 */

require("dotenv").config();
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;

if (!SECRET || SECRET === "troque_por_uma_chave_secreta_longa_e_aleatoria") {
  console.warn("⚠️  JWT_SECRET não configurado! Defina no arquivo .env antes de colocar em produção.");
}

function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Acesso negado. Faça login para continuar." });
  }

  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;   // { id, name, email, role, iat, exp }
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Sessão expirada. Faça login novamente.", expired: true });
    }
    return res.status(401).json({ error: "Token inválido." });
  }
}

/** Middleware extra para exigir role admin */
function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Permissão insuficiente. Somente administradores." });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
