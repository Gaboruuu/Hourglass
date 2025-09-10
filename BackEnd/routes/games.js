const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
    const sql = `SELECT * FROM Games`;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
        return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});


// Add a new game
router.post("/", (req, res) => {
  const { game_name, background } = req.body;

  if (!game_name) {
    return res.status(400).json({ error: "Game name is required" });
  }

  const sql = `INSERT INTO Games (game_name, background) VALUES (?, ?)`;
  db.run(sql, [game_name, background], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, game_name, background });
  });
});

module.exports = router;
