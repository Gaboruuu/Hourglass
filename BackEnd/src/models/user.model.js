const db = require('../config/db.config');
const bcrypt = require('bcryptjs');

const BCRYPT_COST = 12;

// Column names can't be query parameters, so only these are ever put into the SQL text
const UPDATABLE_COLUMNS = ['username', 'email', 'password', 'role'];

const User = {
  BCRYPT_COST,

  // Create a new user
  create: async (user) => {
    const hashedPassword = await bcrypt.hash(user.password, BCRYPT_COST);

    const [result] = await db.pool.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [user.username, user.email, hashedPassword, user.role || 'user']
    );

    return { id: result.insertId };
  },

  // Find a user by ID (without the password hash)
  findById: async (id) => {
    const [rows] = await db.pool.query(
      'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  // Find a user by username (includes the password hash, for login)
  findByUsername: async (username) => {
    const [rows] = await db.pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0];
  },

  // Find a user by email
  findByEmail: async (email) => {
    const [rows] = await db.pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  },

  // Update user information. Unknown keys throw instead of being turned into SQL.
  update: async (id, userData) => {
    const unknown = Object.keys(userData).filter((key) => !UPDATABLE_COLUMNS.includes(key));
    if (unknown.length > 0) {
      throw new Error(`User.update: unknown column(s) ${unknown.join(', ')}`);
    }

    const updateFields = [];
    const queryParams = [];

    for (const key of UPDATABLE_COLUMNS) {
      if (userData[key] === undefined) continue;
      updateFields.push(`${key} = ?`);
      queryParams.push(key === 'password' ? await bcrypt.hash(userData.password, BCRYPT_COST) : userData[key]);
    }

    if (updateFields.length === 0) return false;

    // No need to manually update 'updated_at' as MySQL handles it with ON UPDATE CURRENT_TIMESTAMP
    queryParams.push(id);

    const [result] = await db.pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      queryParams
    );

    return result.affectedRows > 0;
  }
};

module.exports = User;
