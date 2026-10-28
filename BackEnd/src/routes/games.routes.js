const express = require("express");
const Games = require("../models/games.model");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { asyncHandler, HttpError } = require("../middleware/errorHandler");
const { createGameSchema } = require("../schemas/game.schema");

const router = express.Router();

// Get all games
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const games = await Games.findAll();
    res.status(200).json(games);
  }),
);

// Get a single game by ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const game = await Games.findById(req.params.id);
    if (!game) throw new HttpError(404, "Game not found");
    res.status(200).json(game);
  }),
);

// Add a game (admin only, used by the app's Add Game screen)
router.post(
  "/",
  authorize("admin"),
  validate(createGameSchema),
  asyncHandler(async (req, res) => {
    const { game_name } = req.body;
    if (await Games.findByName(game_name)) {
      throw new HttpError(409, "This game already exists");
    }
    const gameId = await Games.create(game_name);
    res.status(201).json({ message: "Game created", game_id: gameId });
  }),
);

module.exports = router;
