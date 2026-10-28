const { z } = require("zod");

const createGameSchema = z
  .object({
    game_name: z.string().trim().min(1).max(100),
  })
  .strict();

module.exports = { createGameSchema };
