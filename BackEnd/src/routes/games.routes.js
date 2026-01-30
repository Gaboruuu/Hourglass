const express = require("express");
const Games = require("../models/games.model");

const router = express.Router();
// Get all games
router.get("/", async (req, res) => {
  try {
    const games = await Games.findAll();
    res.status(200).json(games);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single game by ID
router.get("/:id", async (req, res) => {
  try {
    const game = await Games.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }
    res.status(200).json(game);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
