// backend/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

let pool;

/**
 * Returns a singleton MySQL pool instance.
 * Works both locally and on Dokploy.
 */
async function getPool() {
  if (pool) return pool;

  // Dokploy fix: '127.0.0.1' doesn't work inside container
  // so fallback to hostname 'db' when deployed.
  const dbHost = process.env.DB_HOST || 'db';
  const dbPort = Number(process.env.DB_PORT || 3306);
  const dbUser = process.env.DB_USER || 'root';
  const dbPass = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'plantsdb';

  console.log('⛓️ Connecting to MySQL ->', { dbHost, dbPort, dbUser, dbName });

  try {
    pool = await mysql.createPool({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPass,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // ✅ Ensure table exists (safe even if already created)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plants (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL DEFAULT 'guest@example.com',
        name VARCHAR(255),
        scientific_name VARCHAR(255),
        plantType VARCHAR(100),
        sunlight VARCHAR(100),
        watering VARCHAR(100),
        soil VARCHAR(255),
        fertilizer VARCHAR(100),
        seasonality VARCHAR(100),
        seasonalMonths JSON,
        uses_notes LONGTEXT,
        image_url LONGTEXT,
        qr_code LONGTEXT,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ MySQL pool connected and ensured table.');
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message || err);
    throw err; // Let caller handle it (index.js keeps app alive)
  }

  return pool;
}

module.exports = { getPool };