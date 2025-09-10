const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
require("dotenv").config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const authenticateToken = require("../middleware/auth");

router.get("/me", authenticateToken, (req, res) => {
  res.json({ user_id: req.user.user_id, username: req.user.username });
});


// **Înregistrare utilizator**
router.post("/register", (req, res) => {
  const { username, password, admin = false } = req.body;
  const passwordHash = bcrypt.hashSync(password, 10);
  db.run(
    "INSERT INTO Users (username, password_hash, admin) VALUES (?, ?, ?)",
    [username, passwordHash, admin ? 1 : 0],
    function (err) {
      if (err) {
        return res.status(400).json({ message: "User already exists" });
      }
      res.json({ message: "User registered successfully" });
    }
  );
});

// **Autentificare utilizator**
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  db.get("SELECT * FROM Users WHERE username = ?", [username], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ user_id: user.user_id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { user_id: user.user_id, username: user.username, admin: user.admin } });
  });
});

//Get all users
router.get("/users", (req, res) => {
  db.all("SELECT user_id, username, admin FROM Users", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving users" });
    }
    res.json(rows);
  });
});

// Get Admin for user
router.get("/admin", (req, res) => {
  const { username } = req.query; // Use query parameters for GET requests
  if (!username) {
    return res.status(400).json({ message: "Username is required." });
  }

  db.get("SELECT admin FROM Users WHERE username = ?", [username], (err, row) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving admin status." });
    }
    if (!row) {
      return res.status(404).json({ message: "User not found." });
    }
    res.json({ admin: row.admin === 1 });
  });
});

module.exports = router;
