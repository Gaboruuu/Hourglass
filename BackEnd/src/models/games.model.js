const db = require('../config/db.config');

const Game = {
    findAll: async () => {
        const [rows] = await db.pool.query('SELECT * FROM games');
        return rows;
    },

    findById: async (id) => {
        const [rows] = await db.pool.query('SELECT * FROM games WHERE game_id = ?', [id]);
        return rows[0];
    },

    findByName: async (gameName) => {
        const [rows] = await db.pool.query('SELECT * FROM games WHERE LOWER(game_name) = LOWER(?)', [gameName]);
        return rows[0];
    },

    create: async (gameName) => {
        const [result] = await db.pool.query('INSERT INTO games (game_name) VALUES (?)', [gameName]);
        return result.insertId;
    }
};

module.exports = Game;
