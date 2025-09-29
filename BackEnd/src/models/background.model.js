const db = require('../config/db.config');


const Background = {
    findAllByEventId: async (eventId) => {
        try {
            const sql = 'SELECT * FROM event_backgrounds WHERE event_id = ?';
            const [rows] = await db.pool.query(sql, [eventId]);
            return rows;
        } catch (error) {
            throw error;
        }
    },
};

module.exports = Background;
