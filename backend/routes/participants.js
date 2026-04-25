/**
 * routes/participants.js
 * GET  → público  |  PUT → 🔒 autenticado
 */
const express = require("express");
const { query } = require("../db/connection");
const { authenticate } = require("../middleware/authenticate");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM participants ORDER BY sort_order,name");
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM participants WHERE id=$1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Participante não encontrado" });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.put("/:id", authenticate, async (req, res, next) => {
  try {
    const { name, role, course, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Nome é obrigatório" });
    const avatar = name.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
    const safeColor = ["blue","orange"].includes(color) ? color : "blue";
    const { rows } = await query(
      `UPDATE participants SET name=$1,role=$2,course=$3,color=$4,avatar=$5 WHERE id=$6 RETURNING *`,
      [name.trim(), role||"Estudante", course||"", safeColor, avatar, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Participante não encontrado" });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
