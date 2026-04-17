const pool = require("./src/db");
const bcrypt = require("bcrypt");

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