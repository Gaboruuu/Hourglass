const db = require("../config/db.config");
const { post } = require("../routes/auth.routes");
const { findById } = require("./user.model");

// Helper function to format dates
const formatDates = (rows) => {
  return rows.map((row) => {
    if (row.start_date) {
      row.start_date = row.start_date.toISOString().split("T")[0];
    }
    if (row.expiry_date) {
      row.expiry_date = row.expiry_date.toISOString().split("T")[0];
    }
    return row;
  });
};

const Event = {
  findAll: async () => {
    try {
      const sql =
        "SELECT events.*, game_name FROM events LEFT JOIN games ON events.game_id = games.game_id";
      const [rows] = await db.pool.query(sql);
      return formatDates(rows);
    } catch (error) {
      throw error;
    }
  },

  findById: async (eventId) => {
    try {
      const sql =
        "SELECT events.*, game_name FROM events LEFT JOIN games ON events.game_id = games.game_id WHERE event_id = ?";
      const [rows] = await db.pool.query(sql, [eventId]);
      return formatDates(rows)[0] || null;
    } catch (error) {
      throw error;
    }
  },

  findAllByGameId: async (gameId) => {
    try {
      const sql =
        "SELECT events.*, game_name FROM events LEFT JOIN games ON events.game_id = games.game_id WHERE events.game_id = ?";
      const [rows] = await db.pool.query(sql, [gameId]);
      return formatDates(rows);
    } catch (error) {
      throw error;
    }
  },

  findAllByGameType: async (event_type) => {
    try {
      const sql =
        "SELECT events.*, game_name FROM events LEFT JOIN games ON events.game_id = games.game_id WHERE events.event_type = ?";
      const [rows] = await db.pool.query(sql, [event_type]);
      return formatDates(rows);
    } catch (error) {
      throw error;
    }
  },

  findAllByGameIdAndGameType: async (gameId, event_type) => {
    try {
      const sql =
        "SELECT events.*, game_name FROM events LEFT JOIN games ON events.game_id = games.game_id WHERE events.game_id = ? AND events.event_type = ?";
      const [rows] = await db.pool.query(sql, [gameId, event_type]);
      return formatDates(rows);
    } catch (error) {
      throw error;
    }
  },

  postEvent: async (event) => {
    try {
      const [result] = await db.pool.query(
        "INSERT INTO events (game_id, event_name, start_date, expiry_date, daily_login, event_type, background_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          event.game_id,
          event.event_name,
          event.start_date,
          event.expiry_date,
          event.daily_login,
          event.event_type,
          event.background_url || null,
        ],
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  },
};

module.exports = Event;
