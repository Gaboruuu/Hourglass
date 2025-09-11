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
            // Check the database schema to find the correct primary key column
            // Using game_id instead of id as per error message suggestion
            const [rows] = await db.pool.query('SELECT * FROM games WHERE game_id = ?', [id]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }
};

module.exports = Game;
