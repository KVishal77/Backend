// backend/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

let pool;

async function getPool() {
  if (pool) return pool;

  pool = await mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'plantsdb',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Ensure table
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

  return pool;
}

module.exports = { getPool };