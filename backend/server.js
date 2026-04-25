/**
 * server.js — Ponto de entrada do servidor PET-Saúde Digital
 *
 * Inicie com:
 * npm start        (produção)
 * npm run dev      (desenvolvimento com nodemon)
 * npm run db:init  (cria tabelas e seed no banco)
 */

require("dotenv").config();

const express      = require("express");
const cors         = require("cors");
const path         = require("path");
const fs           = require("fs");
const errorHandler = require("./middleware/errorHandler");

/* ── Rotas ── */
const authRouter         = require("./routes/auth");
const projectRouter      = require("./routes/project");
const participantsRouter = require("./routes/participants");
const activitiesRouter   = require("./routes/activities");
const kpisRouter         = require("./routes/kpis");

const app  = express();
const PORT = process.env.PORT || 3001;

/* ── Garante pasta de uploads ── */
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || "uploads");
["photos","documents"].forEach(sub => {
  const dir = path.join(UPLOADS_DIR, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ══════════════════════════════════════
   MIDDLEWARES GLOBAIS
══════════════════════════════════════ */

/* CORS — aceita o frontend Vercel e localhost em dev */
app.use(cors({
    origin: [
      'https://pet-saude-delta.vercel.app', // URL anterior
      'https://pet-saude-flax.vercel.app',  // <--- SUA NOVA URL ADICIONADA AQUI!
      process.env.FRONTEND_URL,             
      'http://localhost:3000',              
      'http://localhost:5500',
      'http://127.0.0.1:5500'
    ].filter(Boolean), 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

/* Serve arquivos de upload como estáticos */
app.use("/uploads", express.static(UPLOADS_DIR));

/* ══════════════════════════════════════
   HEALTH CHECK
══════════════════════════════════════ */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* ══════════════════════════════════════
   ROTAS DA API
══════════════════════════════════════ */
app.use("/api/auth",         authRouter);
app.use("/api/project",      projectRouter);
app.use("/api/participants",  participantsRouter);
app.use("/api/activities",    activitiesRouter);
app.use("/api/kpis",          kpisRouter);

/* 404 para rotas desconhecidas */
app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.path}` });
});

/* Tratador de erros centralizado */
app.use(errorHandler);

/* ══════════════════════════════════════
   INICIA SERVIDOR
══════════════════════════════════════ */
app.listen(PORT, () => {
  console.log(`\n🚀 PET-Saúde API rodando em http://localhost:${PORT}`);
  console.log(`   Ambiente  : ${process.env.NODE_ENV || "development"}`);
  console.log(`   Banco     : ${process.env.DATABASE_URL ? "DATABASE_URL ✅" : `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`}`);
  console.log(`   Uploads   : ${UPLOADS_DIR}`);
  console.log(`   CORS ok   : Vercel e Localhost liberados\n`);
});

module.exports = app;