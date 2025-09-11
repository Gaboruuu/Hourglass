const db = require('../config/db.config');
const bcrypt = require('bcryptjs');

const User = {
  // Create a new user
  create: async (user) => {
    try {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      
      const [result] = await db.pool.query(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [user.username, user.email, hashedPassword, user.role || 'user']
      );
      
      return { id: result.insertId };
    } catch (error) {
      throw error;
    }
  },

  // Find a user by ID
  findById: async (id) => {
    try {
      const [rows] = await db.pool.query(
        'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?', 
        [id]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Find a user by username
  findByUsername: async (username) => {
    try {
      const [rows] = await db.pool.query(
        'SELECT * FROM users WHERE username = ?', 
        [username]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Find a user by email
  findByEmail: async (email) => {
    try {
      const [rows] = await db.pool.query(
        'SELECT * FROM users WHERE email = ?', 
        [email]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Update user information
  update: async (id, userData) => {
    try {
      const updateFields = [];
      const queryParams = [];
      
      for (const key in userData) {
        if (key !== 'id' && key !== 'password') {
          updateFields.push(`${key} = ?`);
          queryParams.push(userData[key]);
        }
      }
      
      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);
        updateFields.push('password = ?');
        queryParams.push(hashedPassword);
      }

      // No need to manually update 'updated_at' as MySQL handles it with ON UPDATE CURRENT_TIMESTAMP
      
      queryParams.push(id);
      
      const [result] = await db.pool.query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        queryParams
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
};

module.exports = User;
