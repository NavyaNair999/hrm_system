// const { Pool } = require("pg");

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: false, // ✅ FIXED
// });

// module.exports = pool;
const { Pool } = require("pg");

const pool = new Pool({
  host: "aws-1-ap-northeast-1.pooler.supabase.com",
  port: 6543,
  user: "postgres.bgqhhwtkwjvhkzaivkts",
  password: "infidhi2026",
  database: "postgres",
  ssl: false,
});

module.exports = pool;