/**
 * routes/kpis.js
 * GET  → público  |  PUT → 🔒 autenticado
 */
const express = require("express");
const { query } = require("../db/connection");
const { authenticate } = require("../middleware/authenticate");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM kpis ORDER BY sort_order");
    res.json(rows);
  } catch (err) { next(err); }
});

router.put("/:id", authenticate, async (req, res, next) => {
  try {
    const { icon, label, value, sub, trend } = req.body;
    const { rows } = await query(
      `UPDATE kpis
       SET icon=COALESCE($1,icon), label=COALESCE($2,label), value=$3, sub=$4, trend=$5
       WHERE id=$6 RETURNING *`,
      [icon||null, label||null, value??"0", sub??"", ["info","up"].includes(trend)?trend:"info", req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "KPI não encontrado" });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
