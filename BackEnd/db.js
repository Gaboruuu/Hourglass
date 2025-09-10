const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./db.sqlite", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
    
    db.run(
      `CREATE TABLE IF NOT EXISTS Users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        admin INTEGER NOT NULL DEFAULT 0 CHECK (admin IN (0, 1))
      )`
    );
    
    db.run(
      `CREATE TABLE IF NOT EXISTS Games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_name TEXT NOT NULL,
        background TEXT
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS Events (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        event_name TEXT NOT NULL,  -- Added event_name
        start_date TEXT NOT NULL,
        expire_date TEXT NOT NULL,
        daily_login INTEGER NOT NULL CHECK (daily_login IN (0,1)),
        importance TEXT NOT NULL CHECK (importance IN ('main', 'sub')),
        FOREIGN KEY (game_id) REFERENCES Games(id)
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS CompletedEvents (
        user_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, event_id),
        FOREIGN KEY (user_id) REFERENCES Users(user_id),
        FOREIGN KEY (event_id) REFERENCES Events(event_id)
      )`
    );
  }
});

module.exports = db;
