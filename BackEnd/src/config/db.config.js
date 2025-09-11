const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Create a connection pool to the MySQL database
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'REQUIRED' ? {rejectUnauthorized: false} : false
});

// Use promise wrapper for async/await support
const promisePool = pool.promise();

// Test the database connection
const testConnection = async () => {
  try {
    const [rows] = await promisePool.query('SELECT 1');
    console.log('MySQL database connection established successfully');
    return true;
  } catch (error) {
    console.error('Error connecting to MySQL database:', error);
    return false;
  }
};

module.exports = {
  pool: promisePool,
  testConnection
};
