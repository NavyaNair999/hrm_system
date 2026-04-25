-- Active: 1777099591592@@aws-1-ap-northeast-1.pooler.supabase.com@5432@postgres
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



CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_working_hours (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  monday VARCHAR(50),
  tuesday VARCHAR(50),
  wednesday VARCHAR(50),
  thursday VARCHAR(50),
  friday VARCHAR(50),
  saturday VARCHAR(50)
);



--25/04/26
--for attendance correction requests
CREATE TABLE IF NOT EXISTS attendance_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  attendance_date DATE NOT NULL,
  requested_check_in TIMESTAMP,
  requested_check_out TIMESTAMP,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT NOW()
);
-- changes made by prachi in users table to add user list module
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS employee_number VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS designation     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS department      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS reports_to      INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS joining_date    DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN DEFAULT TRUE;

  -- Backfill is_active = true for all existing users
UPDATE users SET is_active = TRUE WHERE is_active IS NULL;

--  auto-generate employee numbers for existing users
UPDATE users
SET employee_number = CONCAT('EMP', LPAD(id::TEXT, 4, '0'))
WHERE employee_number IS NULL;

UPDATE users
SET department = 'Tech'
WHERE username IN ('Prachi Suryawanshi', 'Navya Nair');

ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;


--  tables for departments, designations and work schedules by omkar on 25/4/26
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  normalized_name VARCHAR(120) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS designations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  normalized_name VARCHAR(120) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS work_schedules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  normalized_name VARCHAR(180) UNIQUE NOT NULL,
  schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('hours_based', 'time_based')),
  working_days TEXT[] NOT NULL DEFAULT '{}',
  max_check_in_time VARCHAR(5),
  total_daily_hours VARCHAR(20),
  fixed_check_in_time VARCHAR(5),
  buffer_minutes INTEGER,
  fixed_check_out_time VARCHAR(5),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO departments (name, normalized_name)
VALUES
  ('IT', 'it'),
  ('HR', 'hr'),
  ('Finance', 'finance'),
  ('Marketing', 'marketing'),
  ('Operations', 'operations')
ON CONFLICT (normalized_name) DO NOTHING;

INSERT INTO departments (name, normalized_name)
SELECT DISTINCT department, LOWER(TRIM(department))
FROM users
WHERE department IS NOT NULL AND TRIM(department) <> ''
ON CONFLICT (normalized_name) DO NOTHING;

INSERT INTO designations (name, normalized_name)
SELECT DISTINCT designation, LOWER(TRIM(designation))
FROM users
WHERE designation IS NOT NULL AND TRIM(designation) <> ''
ON CONFLICT (normalized_name) DO NOTHING;
