const db = require('../config/db.config');

const Game = {

    findAll: async () => {
        try {
            const [rows] = await db.pool.query('SELECT * FROM games');
            return rows;
        } catch (error) {
            throw error;
        }
    },

    findById: async (id) => {
        try {
            const [rows] = await db.pool.query('SELECT * FROM games WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }
};

module.exports = Game;
