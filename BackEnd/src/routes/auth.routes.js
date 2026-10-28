const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { asyncHandler, HttpError } = require("../middleware/errorHandler");
const { loginSchema } = require("../schemas/auth.schema");
const { JWT_ALGORITHM, getJwtSecret, getJwtExpiration } = require("../config/auth.config");

// Compared against when the username doesn't exist, so a wrong username takes as long as a
// wrong password and response time doesn't reveal which usernames exist
const DUMMY_HASH = bcrypt.hashSync("hourglass-dummy-password", User.BCRYPT_COST);

/**
 * Accounts are only created with `npm run create-user` (there is no public registration).
 * @param {{ login?: import("express").RequestHandler }} limiters
 */
function createAuthRouter(limiters = {}) {
  const router = express.Router();
  const loginLimiter = limiters.login || ((req, res, next) => next());

  router.post(
    "/login",
    loginLimiter,
    validate(loginSchema),
    asyncHandler(async (req, res) => {
      const { username, password } = req.body;
      const user = await User.findByUsername(username);
      const passwordIsValid = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

      // One answer for every failure: a wrong username and a wrong password look the same
      if (!user || !passwordIsValid) {
        throw new HttpError(401, "Invalid username or password");
      }

      const accessToken = jwt.sign({ id: user.id }, getJwtSecret(), {
        algorithm: JWT_ALGORITHM,
        expiresIn: getJwtExpiration(),
      });
      const { exp } = jwt.decode(accessToken);

      res.status(200).json({
        id: user.id,
        username: user.username,
        role: user.role,
        accessToken,
        expiresAt: exp * 1000, // epoch milliseconds, so the app can drop the session when it ends
      });
    }),
  );

  // Who am I: the app calls this on startup to check its token and get the role from the server
  router.get(
    "/me",
    authorize("admin"),
    asyncHandler(async (req, res) => {
      // authorize("admin") always enforces here; this is only a safety net
      if (!req.auth.userId) throw new HttpError(401, "Authentication required");
      const user = await User.findById(req.auth.userId);
      if (!user) throw new HttpError(401, "Authentication required");
      res.status(200).json({ id: user.id, username: user.username, role: user.role });
    }),
  );

  return router;
}

module.exports = createAuthRouter;
