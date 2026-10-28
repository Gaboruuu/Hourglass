const fs = require('fs');
const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

/**
 * SSL for Aiven: verify the server certificate against Aiven's project CA (ca.pem from the
 * Aiven console). On Render it's a Secret File, e.g. DB_CA_PATH=/etc/secrets/aiven-ca.pem.
 * With DB_SSL=REQUIRED and no readable CA the server refuses to start instead of connecting unverified.
 */
function getSslConfig() {
  if (process.env.DB_SSL !== 'REQUIRED') return false;

  const caPath = process.env.DB_CA_PATH;
  if (!caPath) {
    throw new Error('DB_SSL=REQUIRED needs DB_CA_PATH (path to the Aiven CA certificate)');
  }
  return { ca: fs.readFileSync(caPath, 'utf8'), rejectUnauthorized: true };
}

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
  ssl: getSslConfig()
});

// Use promise wrapper for async/await support
const promisePool = pool.promise();

// Test the database connection
const testConnection = async () => {
  try {
    await promisePool.query('SELECT 1');
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
