/**
 * middleware/errorHandler.js
 * Tratamento centralizado de erros.
 */

function errorHandler(err, req, res, next) {
  console.error("❌", err.message);

  /* Erros do Multer */
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Arquivo muito grande. Limite: " + (process.env.MAX_FILE_MB || 10) + " MB" });
  }
  if (err.message?.includes("permitid")) {
    return res.status(415).json({ error: err.message });
  }

  /* Erros de validação (express-validator usados nas rotas) */
  if (err.type === "validation") {
    return res.status(400).json({ error: err.message, details: err.details });
  }

  /* PostgreSQL: violação de FK */
  if (err.code === "23503") {
    return res.status(400).json({ error: "Referência inválida: registro relacionado não encontrado." });
  }
  /* PostgreSQL: chave duplicada */
  if (err.code === "23505") {
    return res.status(409).json({ error: "Registro já existe." });
  }

  res.status(err.status || 500).json({
    error: err.message || "Erro interno do servidor",
  });
}

module.exports = errorHandler;
