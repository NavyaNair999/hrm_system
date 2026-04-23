// This script seeds the database with an initial admin user. It connects to the database, hashes the admin password, and inserts the admin user into the users table. Make sure to run this script after setting up your database and before starting the server to ensure you have an admin user to log in with.
const pool = require("./src/db");
const bcrypt = require("bcrypt");
require("dotenv").config();

console.log("DB URL:", process.env.DATABASE_URL);

async function createAdmin() {
  const username = "admin";
  const password = "admin123";
  const role = "admin";

  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    "INSERT INTO users (username, password, role) VALUES ($1, $2, $3)",
    [username, hash, role]
  );
  console.log("Admin user created");
  process.exit();
}

createAdmin();