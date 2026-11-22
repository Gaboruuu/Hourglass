const db = require("../config/db.config");

const UPDATABLE_COLUMNS = [
  "game_id",
  "event_name",
  "start_date",
  "expiry_date",
  "daily_login",
  "event_type",
  "background_url",
];

/**
 * Event dates as "YYYY-MM-DD". The pool returns DATE columns as strings already (dateStrings in
 * db.config.js); a Date object is still accepted (e.g. a mocked pool) and read in UTC.
 */
const toDateString = (value) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === "string" ? value.slice(0, 10) : value;
};

const formatDates = (rows) =>
  rows.map((row) => ({ ...row, start_date: toDateString(row.start_date), expiry_date: toDateString(row.expiry_date) }));

const Event = {
  findAll: async () => {
    const sql =
      "SELECT events.*, game_name FROM events LEFT JOIN games ON events.game_id = games.game_id";
    const [rows] = await db.pool.query(sql);
    return formatDates(rows);
  },

  findById: async (eventId) => {
    const sql =
      "SELECT events.*, game_name FROM events LEFT JOIN games ON events.game_id = games.game_id WHERE event_id = ?";
    const [rows] = await db.pool.query(sql, [eventId]);
    return formatDates(rows)[0] || null;
  },

  findAllByGameId: async (gameId) => {
    const sql =
      "SELECT events.*, game_name FROM events LEFT JOIN games ON events.game_id = games.game_id WHERE events.game_id = ?";
    const [rows] = await db.pool.query(sql, [gameId]);
    return formatDates(rows);
  },

  findAllByGameType: async (event_type) => {
    const sql =
      "SELECT events.*, game_name FROM events LEFT JOIN games ON events.game_id = games.game_id WHERE events.event_type = ?";
    const [rows] = await db.pool.query(sql, [event_type]);
    return formatDates(rows);
  },

  findAllByGameIdAndGameType: async (gameId, event_type) => {
    const sql =
      "SELECT events.*, game_name FROM events LEFT JOIN games ON events.game_id = games.game_id WHERE events.game_id = ? AND events.event_type = ?";
    const [rows] = await db.pool.query(sql, [gameId, event_type]);
    return formatDates(rows);
  },

  findByNameAndStartDate: async (event_name, start_date) => {
    const sql =
      "SELECT * FROM events WHERE event_name = ? AND start_date = ?";
    const [rows] = await db.pool.query(sql, [event_name, start_date]);
    return formatDates(rows)[0] || null;
  },

  batchCheckEvents: async (events) => {
    if (!events || events.length === 0) {
      return [];
    }

    // One (game, name, start) condition per event: the same dedup key as the route
    const conditions = events.map(() => "(game_id = ? AND event_name = ? AND start_date = ?)").join(" OR ");
    const sql = `SELECT game_id, event_name, start_date FROM events WHERE ${conditions}`;
    const params = events.flatMap((e) => [e.game_id, e.event_name, e.start_date]);

    const [rows] = await db.pool.query(sql, params);
    return formatDates(rows);
  },

  postEvent: async (event) => {
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
  },

  // Only these columns can be updated; keys come from validated input but are still whitelisted here
  updateEvent: async (eventId, fields) => {
    const columns = UPDATABLE_COLUMNS.filter((column) => fields[column] !== undefined);
    if (columns.length === 0) return false;

    const sql = `UPDATE events SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE event_id = ?`;
    const params = [...columns.map((column) => fields[column]), eventId];
    const [result] = await db.pool.query(sql, params);
    return result.affectedRows > 0;
  },

  deleteEvent: async (eventId) => {
    const [result] = await db.pool.query("DELETE FROM events WHERE event_id = ?", [eventId]);
    return result.affectedRows > 0;
  },
};

module.exports = Event;
