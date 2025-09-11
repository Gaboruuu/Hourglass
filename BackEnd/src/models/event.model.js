const db = require('../config/db.config');
const { post } = require('../routes/auth.routes');

const Event = {
  
  findAll: async () => {
    try {
      const sql = 'SELECT events.*, game_title FROM events LEFT JOIN games ON events.game_id = games.game_id';
      const [rows] = await db.pool.query(sql);
      return rows;
    } catch (error) {
      throw error;
    }
  },
  findAllByGameId: async (gameId) => {
    try {
      const sql = 'SELECT events.*, game_title FROM events LEFT JOIN games ON events.game_id = games.game_id WHERE events.game_id = ?';
      const [rows] = await db.pool.query(sql, [gameId]);
      return rows;
    } catch (error) {
      throw error;
    }
  },

  findAllByImportance: async (importance) => {
    try {
      const sql = 'SELECT events.*, game_title FROM events LEFT JOIN games ON events.game_id = games.game_id WHERE events.importance = ?';
      const [rows] = await db.pool.query(sql, [importance]);
      return rows;
    } catch (error) {
      throw error;
    }
  },

  findAllByGameIdAndImportance: async (gameId, importance) => {
    try {
      const sql = 'SELECT events.*, game_title FROM events LEFT JOIN games ON events.game_id = games.game_id WHERE events.game_id = ? AND events.importance = ?';
      const [rows] = await db.pool.query(sql, [gameId, importance]);
      return rows;
    } catch (error) {
      throw error;
    }
  },

  postEvent: async (event) => {
    try {
      const [result] = await db.pool.query(
        'INSERT INTO events (game_id, event_name, start_date, expire_date, daily_login, importance) VALUES (?, ?, ?, ?, ?, ?)',
        [event.game_id, event.event_name, event.start_date, event.expire_date, event.daily_login, event.importance]
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  },

};

module.exports = Event;
