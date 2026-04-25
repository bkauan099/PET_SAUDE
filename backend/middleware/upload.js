/**
 * middleware/upload.js
 * Configuração do Multer para upload de fotos e documentos.
 * Os arquivos são salvos em disco local (pasta /uploads).
 * Em produção no Render, o disco é efêmero — considere migrar para
 * Cloudinary, Supabase Storage ou AWS S3 futuramente.
 */

require("dotenv").config();
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const { v4: uuidv4 } = require("uuid");

const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || "uploads");

/* Garante que as subpastas existam */
["photos", "documents"].forEach(sub => {
  const dir = path.join(UPLOADS_DIR, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ── Armazenamento em disco ── */
function diskStorage(subfolder) {
  return multer.diskStorage({
    destination(req, file, cb) {
      cb(null, path.join(UPLOADS_DIR, subfolder));
    },
    filename(req, file, cb) {
      const ext  = path.extname(file.originalname).toLowerCase();
      const name = `${uuidv4()}${ext}`;
      cb(null, name);
    },
  });
}

/* ── Filtros MIME ── */
const imageFilter = (req, file, cb) => {
  const allowed = ["image/jpeg","image/png","image/gif","image/webp","image/svg+xml"];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Somente imagens são permitidas (JPEG, PNG, GIF, WebP, SVG)"), false);
};

const docFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed",
    "image/jpeg","image/png","image/gif","image/webp",
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Tipo de arquivo não permitido"), false);
};

const MAX_MB = parseInt(process.env.MAX_FILE_MB || "10");

/* ── Exporta instâncias ── */
const uploadPhoto = multer({
  storage: diskStorage("photos"),
  fileFilter: imageFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

const uploadDoc = multer({
  storage: diskStorage("documents"),
  fileFilter: docFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

module.exports = { uploadPhoto, uploadDoc, UPLOADS_DIR };
