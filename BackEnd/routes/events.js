const express = require("express");
const db = require("../db");

const router = express.Router();

// Add a new event
router.post("/", (req, res) => {
  const { game_id, event_name, start_date, expire_date, daily_login, importance } = req.body;

  if (!game_id || !event_name || !start_date || !expire_date || !importance) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = `INSERT INTO Events (game_id, event_name, start_date, expire_date, daily_login, importance) VALUES (?, ?, ?, ?, ?, ?)`;
  db.run(sql, [game_id, event_name, start_date, expire_date, daily_login, importance], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ event_id: this.lastID, game_id, event_name, start_date, expire_date, daily_login, importance });
  });
});

// Get all events with game details
router.get("/", (req, res) => {
  const sql = `
    SELECT Events.event_id, Events.event_name, Events.start_date, Events.expire_date, 
           Events.daily_login, Events.importance, Games.game_name, Games.background 
    FROM Events
    JOIN Games ON Events.game_id = Games.id
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

module.exports = router;
