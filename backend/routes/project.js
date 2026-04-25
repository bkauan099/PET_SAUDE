/**
 * routes/project.js
 * GET  → público  |  PUT → 🔒 autenticado
 */
const express = require("express");
const { query } = require("../db/connection");
const { authenticate } = require("../middleware/authenticate");
const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM project WHERE id='default'");
    res.json(rows[0] || {});
  } catch (err) { next(err); }
});

router.put("/", authenticate, async (req, res, next) => {
  try {
    const { theme, institution, supervisor, period, funding, email } = req.body;
    const { rows } = await query(
      `UPDATE project SET theme=$1,institution=$2,supervisor=$3,period=$4,funding=$5,email=$6
       WHERE id='default' RETURNING *`,
      [theme||"", institution||"", supervisor||"", period||"", funding||"", email||""]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
