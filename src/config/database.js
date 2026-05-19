const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const dotenvResult = require('dotenv').config({ path: envPath });
  if (dotenvResult.error) {
    console.warn(`⚠️ .env load warning: ${dotenvResult.error.message}`);
  } else {
    console.log(`✅ Loaded .env from ${envPath}`);
  }
} else {
  console.log(`⚠️ .env not found at ${envPath}. Using process.env for production configuration.`);
}

console.log("🔍 DB CONFIG CHECK:");
console.log("HOST:", process.env.DB_HOST);
console.log("PORT:", process.env.DB_PORT);
console.log("DB:", process.env.DB_NAME);
console.log("USER:", process.env.DB_USER);
console.log("PASSWORD:", process.env.DB_PASSWORD ? "✅ Loaded" : "❌ Missing");

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '6543'), // ✅ Supabase pooler port
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    };

const pool = new Pool({
  ...poolConfig,
});

pool.on('connect', () => {
  console.log('✅ New DB connection established');
});

pool.on('error', (err) => {
  console.error('❌ Pool error:', err.message);
});

// ✅ Helper query function (important fix)
const query = (text, params) => pool.query(text, params);

// ✅ Get a client from the pool (for transactions)
const getClient = async () => {
  return await pool.connect();
};

// ✅ Test connection
const testConnection = async () => {
  try {
    console.log("⏳ Testing DB connection...");
    const res = await pool.query('SELECT NOW(), current_database();');
    console.log('✅ PostgreSQL connected:', res.rows[0]);
  } catch (err) {
    console.error('❌ Connection failed FULL ERROR:\n', err);
  }
};

module.exports = {
  pool,
  query,          // 🔥 IMPORTANT (tumhara error yahin tha)
  getClient,      // 🔥 For transactions
  testConnection
};