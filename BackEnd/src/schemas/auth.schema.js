const { z } = require("zod");

// Only shape checks here: the password rules are enforced when accounts are created (scripts/create-user.js)
const loginSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(128),
});

module.exports = { loginSchema };
