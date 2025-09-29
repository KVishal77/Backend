// db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

let pool;

async function getPool() {
  if (pool) return pool;

  pool = await mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // ✅ Table create/upgrade (simple & safe)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS plants (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      scientific_name VARCHAR(255),
      plantType VARCHAR(100),
      sunlight VARCHAR(100),
      watering VARCHAR(100),
      soil VARCHAR(255),
      fertilizer VARCHAR(100),
      seasonality VARCHAR(100),
      seasonalMonths JSON,
      uses_notes TEXT,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  return pool;
}

module.exports = { getPool };