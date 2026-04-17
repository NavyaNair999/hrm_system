-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  check_in TIMESTAMP,
  check_out TIMESTAMP
);

-- Create leaves table (for leave balance)
CREATE TABLE IF NOT EXISTS leaves (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  paid INTEGER DEFAULT 0,
  used INTEGER DEFAULT 0,
  casual INTEGER DEFAULT 0,
  wfh INTEGER DEFAULT 0
);

-- leave_requests is already created in resolvers.js