/**
 * routes/activities.js  —  CRUD protegido por JWT
 * GET  (leitura) → público
 * POST / PUT / DELETE / uploads → 🔒 autenticado
 */

const express   = require("express");
const path      = require("path");
const fs        = require("fs");
const { query } = require("../db/connection");
const { authenticate } = require("../middleware/authenticate");
const { uploadPhoto, uploadDoc, UPLOADS_DIR } = require("../middleware/upload");

const router = express.Router();

async function fetchActivity(id) {
  const actRes = await query("SELECT * FROM activities WHERE id=$1", [id]);
  if (!actRes.rows.length) return null;
  const act = actRes.rows[0];
  const [membersRes, photosRes, docsRes] = await Promise.all([
    query(`SELECT p.* FROM participants p JOIN activity_members am ON am.participant_id=p.id WHERE am.activity_id=$1 ORDER BY p.sort_order`, [id]),
    query("SELECT * FROM photos    WHERE activity_id=$1 ORDER BY sort_order,created_at", [id]),
    query("SELECT * FROM documents WHERE activity_id=$1 ORDER BY sort_order,created_at", [id]),
  ]);
  return { ...act, members: membersRes.rows, photos: photosRes.rows, documents: docsRes.rows };
}

/* ── LEITURA pública ── */
router.get("/", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM activities ORDER BY sort_order,created_at");
    res.json(await Promise.all(rows.map(a => fetchActivity(a.id))));
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const act = await fetchActivity(req.params.id);
    if (!act) return res.status(404).json({ error: "Atividade não encontrada" });
    res.json(act);
  } catch (err) { next(err); }
});

/* ── CRIAÇÃO 🔒 ── */
router.post("/", authenticate, async (req, res, next) => {
  try {
    const { icon, icon_color, tag, title, description, status, members } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Título é obrigatório" });
    const { rows } = await query(
      `INSERT INTO activities (icon,icon_color,tag,title,description,status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [icon||"📋", ["blue","orange"].includes(icon_color)?icon_color:"blue", tag||"Outro", title.trim(), description||"", ["done","prog","plan"].includes(status)?status:"plan"]
    );
    const actId = rows[0].id;
    if (Array.isArray(members) && members.length) {
      const vals = members.map((_,i)=>`($1,$${i+2})`).join(",");
      await query(`INSERT INTO activity_members (activity_id,participant_id) VALUES ${vals} ON CONFLICT DO NOTHING`, [actId,...members]);
    }
    res.status(201).json(await fetchActivity(actId));
  } catch (err) { next(err); }
});

/* ── ATUALIZAÇÃO 🔒 ── */
router.put("/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { icon, icon_color, tag, title, description, status, members } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Título é obrigatório" });
    await query(
      `UPDATE activities SET icon=$1,icon_color=$2,tag=$3,title=$4,description=$5,status=$6 WHERE id=$7`,
      [icon||"📋", ["blue","orange"].includes(icon_color)?icon_color:"blue", tag||"Outro", title.trim(), description||"", ["done","prog","plan"].includes(status)?status:"plan", id]
    );
    await query("DELETE FROM activity_members WHERE activity_id=$1", [id]);
    if (Array.isArray(members) && members.length) {
      const vals = members.map((_,i)=>`($1,$${i+2})`).join(",");
      await query(`INSERT INTO activity_members (activity_id,participant_id) VALUES ${vals} ON CONFLICT DO NOTHING`, [id,...members]);
    }
    const act = await fetchActivity(id);
    if (!act) return res.status(404).json({ error: "Atividade não encontrada" });
    res.json(act);
  } catch (err) { next(err); }
});

/* ── EXCLUSÃO 🔒 ── */
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const [photos, docs] = await Promise.all([
      query("SELECT filename FROM photos    WHERE activity_id=$1", [id]),
      query("SELECT filename FROM documents WHERE activity_id=$1", [id]),
    ]);
    photos.rows.forEach(p => { const fp=path.join(UPLOADS_DIR,"photos",p.filename);    if(fs.existsSync(fp))fs.unlinkSync(fp); });
    docs.rows.forEach  (d => { const fp=path.join(UPLOADS_DIR,"documents",d.filename); if(fs.existsSync(fp))fs.unlinkSync(fp); });
    await query("DELETE FROM activities WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── FOTOS 🔒 ── */
router.post("/:id/photos", authenticate, uploadPhoto.array("photos",20), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.files?.length) return res.status(400).json({ error: "Nenhum arquivo enviado" });
    const base = `${req.protocol}://${req.get("host")}`;
    const inserted = [];
    for (const file of req.files) {
      const { rows } = await query(
        `INSERT INTO photos (activity_id,filename,original_name,mime_type,size_bytes,url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [id, file.filename, file.originalname, file.mimetype, file.size, `${base}/uploads/photos/${file.filename}`]
      );
      inserted.push(rows[0]);
    }
    res.status(201).json(inserted);
  } catch (err) { next(err); }
});

router.patch("/:id/photos/:photoId", authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      "UPDATE photos SET caption=$1 WHERE id=$2 AND activity_id=$3 RETURNING *",
      [req.body.caption||"", req.params.photoId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Foto não encontrada" });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete("/:id/photos/:photoId", authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      "DELETE FROM photos WHERE id=$1 AND activity_id=$2 RETURNING filename",
      [req.params.photoId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Foto não encontrada" });
    const fp = path.join(UPLOADS_DIR,"photos",rows[0].filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/* ── DOCUMENTOS 🔒 ── */
router.post("/:id/documents", authenticate, uploadDoc.single("document"), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });
    const ext  = path.extname(req.file.originalname).replace(".","").toLowerCase();
    const base = `${req.protocol}://${req.get("host")}`;
    const { rows } = await query(
      `INSERT INTO documents (activity_id,filename,original_name,ext,mime_type,size_bytes,url) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, req.file.filename, req.file.originalname, ext, req.file.mimetype, req.file.size, `${base}/uploads/documents/${req.file.filename}`]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.delete("/:id/documents/:docId", authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      "DELETE FROM documents WHERE id=$1 AND activity_id=$2 RETURNING filename",
      [req.params.docId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Documento não encontrado" });
    const fp = path.join(UPLOADS_DIR,"documents",rows[0].filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
