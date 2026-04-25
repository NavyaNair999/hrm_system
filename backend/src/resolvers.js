const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

//leave request table
pool.query(`
  CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(100),
    start_date DATE,
    end_date DATE,
    days INTEGER,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'Pending'
  )
`).catch(console.error);
//attendance table
pool.query(`
  CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    username VARCHAR(100),
    attendance_date DATE DEFAULT CURRENT_DATE,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, attendance_date)
  )
`).catch(console.error);
//holiday table
pool.query(`
  CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    holiday_date DATE UNIQUE NOT NULL,
    description TEXT
  )
`).catch(console.error);
//working hours table
pool.query(`
  CREATE TABLE IF NOT EXISTS working_hours (
    id SERIAL PRIMARY KEY,
    day_name VARCHAR(20) UNIQUE NOT NULL,
    hours VARCHAR(50)
  )
`).catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(120) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS designations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(120) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(console.error);
pool.query(`
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
  )
`).catch(console.error);
pool.query(`
  INSERT INTO departments (name, normalized_name)
  VALUES
    ('IT', 'it'),
    ('HR', 'hr'),
    ('Finance', 'finance'),
    ('Marketing', 'marketing'),
    ('Operations', 'operations')
  ON CONFLICT (normalized_name) DO NOTHING
`).catch(console.error);
pool.query(`
  INSERT INTO departments (name, normalized_name)
  SELECT DISTINCT department, LOWER(TRIM(department))
  FROM users
  WHERE department IS NOT NULL AND TRIM(department) <> ''
  ON CONFLICT (normalized_name) DO NOTHING
`).catch(console.error);
pool.query(`
  INSERT INTO designations (name, normalized_name)
  SELECT DISTINCT designation, LOWER(TRIM(designation))
  FROM users
  WHERE designation IS NOT NULL AND TRIM(designation) <> ''
  ON CONFLICT (normalized_name) DO NOTHING
`).catch(console.error);
pool.query(`
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS date_of_birth     DATE,
    ADD COLUMN IF NOT EXISTS schedule_type     VARCHAR(50),
    ADD COLUMN IF NOT EXISTS biometric_id      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS direct_reporting2 INTEGER REFERENCES users(id)
`).catch(console.error);
pool.query(`
  CREATE TABLE IF NOT EXISTS position_history (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
    designation    VARCHAR(200) NOT NULL,
    effective_date DATE NOT NULL,
    reason         VARCHAR(200)
  )
`).catch(console.error);
//function to calculate hours worked based on check-in and check-out times
function calcHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "0.00";
  const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60);
  return diff > 0 ? diff.toFixed(2) : "0.00";
}

function toUtcISOString(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// pg returns DATE columns as JS Date at UTC midnight.
// In IST (UTC+5:30), toISOString() shifts it to previous day.
// Fix: add IST offset before calling toISOString().
function pgDateToIST(d) {
  if (!d) return null;
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(d.getTime() + istOffset).toISOString().split("T")[0];
}
function isoOrNull(value) {
  return value ? new Date(value).toISOString() : null;
}
function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
}
function sanitizeName(name, label) {
  const clean = String(name || "").trim().replace(/\s+/g, " ");
  if (!clean) throw new Error(`${label} name is required`);
  return clean;
}
async function ensureDepartmentNotAssigned(id) {
  const departmentRes = await pool.query("SELECT name FROM departments WHERE id = $1", [id]);
  const department = departmentRes.rows[0];
  if (!department) throw new Error("Department not found");

  const usageRes = await pool.query(
    "SELECT COUNT(*)::int AS count FROM users WHERE department = $1 AND is_active = TRUE",
    [department.name]
  );
  if (usageRes.rows[0].count > 0) {
    throw new Error("Cannot delete department because it is assigned to active employees");
  }
}
async function ensureDesignationNotAssigned(id) {
  const designationRes = await pool.query("SELECT name FROM designations WHERE id = $1", [id]);
  const designation = designationRes.rows[0];
  if (!designation) throw new Error("Designation not found");

  const usageRes = await pool.query(
    "SELECT COUNT(*)::int AS count FROM users WHERE designation = $1 AND is_active = TRUE",
    [designation.name]
  );
  if (usageRes.rows[0].count > 0) {
    throw new Error("Cannot delete designation because it is assigned to active employees");
  }
}
function requireAdmin(user) {
  if (!user || user.role !== "admin") throw new Error("Only admin");
}
const VALID_WORKING_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function validateTime(value, label) {
  if (!/^\d{2}:\d{2}$/.test(String(value || ""))) {
    throw new Error(`${label} must be in HH:MM format`);
  }
}
function sanitizeWorkingDays(days) {
  const cleaned = [...new Set((days || []).map((day) => String(day).trim().toLowerCase()))];
  if (!cleaned.length) throw new Error("At least one working day is required");
  const invalidDay = cleaned.find((day) => !VALID_WORKING_DAYS.includes(day));
  if (invalidDay) throw new Error(`Invalid working day: ${invalidDay}`);
  return cleaned;
}
function sanitizeScheduleInput(args) {
  const scheduleType = String(args.scheduleType || "").trim();
  if (!["hours_based", "time_based"].includes(scheduleType)) {
    throw new Error("Schedule type must be hours_based or time_based");
  }

  const payload = {
    name: sanitizeName(args.name, "Schedule"),
    normalizedName: normalizeName(args.name),
    scheduleType,
    workingDays: sanitizeWorkingDays(args.workingDays),
    maxCheckInTime: null,
    totalDailyHours: null,
    fixedCheckInTime: null,
    bufferMinutes: null,
    fixedCheckOutTime: null,
  };

  if (scheduleType === "hours_based") {
    validateTime(args.maxCheckInTime, "Maximum check-in time");
    const totalDailyHours = String(args.totalDailyHours || "").trim();
    if (!totalDailyHours) throw new Error("Total daily hours is required");
    payload.maxCheckInTime = args.maxCheckInTime;
    payload.totalDailyHours = totalDailyHours;
  }

  if (scheduleType === "time_based") {
    validateTime(args.fixedCheckInTime, "Fixed check-in time");
    validateTime(args.fixedCheckOutTime, "Fixed check-out time");
    const totalDailyHours = String(args.totalDailyHours || "").trim();
    if (!totalDailyHours) throw new Error("Total daily hours is required");
    if (args.bufferMinutes === undefined || args.bufferMinutes === null || Number(args.bufferMinutes) < 0) {
      throw new Error("Buffer time must be 0 or more minutes");
    }
    payload.fixedCheckInTime = args.fixedCheckInTime;
    payload.fixedCheckOutTime = args.fixedCheckOutTime;
    payload.bufferMinutes = Number(args.bufferMinutes);
    payload.totalDailyHours = totalDailyHours;
  }

  return payload;
}
function mapDepartment(row) {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    createdAt: isoOrNull(row.created_at),
    updatedAt: isoOrNull(row.updated_at),
  };
}
function mapDesignation(row) {
  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    createdAt: isoOrNull(row.created_at),
    updatedAt: isoOrNull(row.updated_at),
  };
}
function mapWorkSchedule(row) {
  return {
    id: row.id,
    name: row.name,
    scheduleType: row.schedule_type,
    workingDays: row.working_days || [],
    maxCheckInTime: row.max_check_in_time || null,
    totalDailyHours: row.total_daily_hours || null,
    fixedCheckInTime: row.fixed_check_in_time || null,
    bufferMinutes: row.buffer_minutes ?? null,
    fixedCheckOutTime: row.fixed_check_out_time || null,
    isActive: row.is_active,
    createdAt: isoOrNull(row.created_at),
    updatedAt: isoOrNull(row.updated_at),
  };
}
function formatHours(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}
function parseDateOnly(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  const parsed = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }
  return parsed;
}
function dateToYmd(date) {
  return date.toISOString().split("T")[0];
}
function getWorkingDatesInRange(startDate, endDate, holidaySet) {
  const dates = [];
  const cursor = new Date(startDate.getTime());

  while (cursor <= endDate) {
    const dayOfWeek = cursor.getUTCDay();
    const dateKey = dateToYmd(cursor);
    if (dayOfWeek !== 0 && !holidaySet.has(dateKey)) {
      dates.push(dateKey);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}
// function mapUser(row) {
//   return {
//     id: row.id,
//     username: row.username,
//     role: row.role,
//     employeeNumber: row.employee_number || null,
//     designation: row.designation || null,
//     department: row.department || null,
//     reportsTo: row.manager_name || null,
//     joiningDate: row.joining_date ? pgDateToIST(row.joining_date) : null,
//     isActive: row.is_active !== undefined ? row.is_active : true,
//   };
// }



function mapUser(row) {
  return {
    id:               row.id,
    username:         row.username,
    role:             row.role,
    employeeNumber:   row.employee_number   || null,
    designation:      row.designation       || null,
    department:       row.department        || null,
    reportsTo:        row.manager_name      || null,
    reportsToId:      row.reports_to        || null,
    directReporting2: row.dr2_name          || null,
    joiningDate:      row.joining_date      ? pgDateToIST(row.joining_date)  : null,
    dateOfBirth:      row.date_of_birth     ? pgDateToIST(row.date_of_birth) : null,
    scheduleType:     row.schedule_type     || null,
    biometricId:      row.biometric_id      || null,
    isActive:         row.is_active !== undefined ? row.is_active : true,
  };
}
module.exports = {
  //queries for fetching user info, attendance records, leave balances, leave requests, holidays, working hours, and notifications
  Query: {
    me: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const res = await pool.query(
        `SELECT u.*, m.username AS manager_name
         FROM users u
         LEFT JOIN users m ON m.id = u.reports_to
         WHERE u.id = $1`,
        [user.id]
      );
      return mapUser(res.rows[0]);
    },

    attendance: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const res = await pool.query(
        `SELECT a.id, a.user_id, u.username,
                a.attendance_date, a.check_in, a.check_out,
                h.description AS holiday_desc
         FROM attendance a
         JOIN users u ON u.id = a.user_id
         LEFT JOIN holidays h ON h.holiday_date = a.attendance_date
         WHERE a.user_id = $1
         ORDER BY a.attendance_date ASC`,
        [user.id]
      );
      return res.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        username: row.username,
        date: pgDateToIST(row.attendance_date),
        checkIn: row.check_in ? row.check_in.toISOString() : null,
        checkOut: row.check_out ? row.check_out.toISOString() : null,
        hoursWorked: calcHours(row.check_in, row.check_out),
        isHoliday: !!row.holiday_desc,
      }));
    },
    
    leaveBalance: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const res = await pool.query("SELECT * FROM leaves WHERE user_id=$1", [user.id]);
      if (!res.rows[0]) return null;
      const row = res.rows[0];
      return { id: row.id, userId: row.user_id, paid: row.paid, used: row.used, casual: row.casual, wfh: row.wfh };
    },

    myLeaves: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const res = await pool.query(
        "SELECT * FROM leave_requests WHERE user_id=$1 ORDER BY id DESC", [user.id]
      );
      return res.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        type: row.type,
        startDate: row.start_date ? row.start_date.toISOString().split("T")[0] : null,
        endDate: row.end_date ? row.end_date.toISOString().split("T")[0] : null,
        days: row.days,
        reason: row.reason,
        status: row.status,
          applicationDate: row.created_at ? row.created_at.toISOString().split("T")[0] : null,
      }));
    },

    allLeaves: async (_, __, { user }) => {
      if (!user || user.role !== "admin") throw new Error("Only admin");
      const res = await pool.query(`
        SELECT lr.*, u.username FROM leave_requests lr
        JOIN users u ON u.id = lr.user_id ORDER BY lr.id DESC
      `);
      return res.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        username: row.username,
        type: row.type,
        startDate: row.start_date ? row.start_date.toISOString().split("T")[0] : null,
        endDate: row.end_date ? row.end_date.toISOString().split("T")[0] : null,
        days: row.days,
        reason: row.reason,
        status: row.status,
        applicationDate: row.created_at ? row.created_at.toISOString().split("T")[0] : null,
      }));
    },
    // allUsers: async (_, __, { user }) => {
    //   if (!user || user.role !== "admin") throw new Error("Only admin");
    //   const res = await pool.query(`
    //     SELECT u.*,
    //            m.username AS manager_name
    //     FROM users u
    //     LEFT JOIN users m ON m.id = u.reports_to
    //     ORDER BY u.id ASC
    //   `);
    //   return res.rows.map(mapUser);
    // },

    allUsers: async (_, __, { user }) => {
  if (!user || user.role !== "admin") throw new Error("Only admin");
  const res = await pool.query(`
    SELECT u.*,
           m.username AS manager_name,
           d.username AS dr2_name
    FROM users u
    LEFT JOIN users m ON m.id = u.reports_to
    LEFT JOIN users d ON d.id = u.direct_reporting2
    ORDER BY u.id ASC
  `);
  return res.rows.map(mapUser);
},
 
    
    holidays: async () => {
      const res = await pool.query("SELECT * FROM holidays ORDER BY holiday_date ASC");
      return res.rows.map((r) => ({
        date: r.holiday_date.toISOString().split("T")[0],
        description: r.description,
      }));
    },

    workingHours: async () => {
      const res = await pool.query("SELECT * FROM working_hours");
      const map = {};
      res.rows.forEach((r) => { map[r.day_name] = r.hours; });
      return {
        monday: map["monday"] || null,
        tuesday: map["tuesday"] || null,
        wednesday: map["wednesday"] || null,
        thursday: map["thursday"] || null,
        friday: map["friday"] || null,
        saturday: map["saturday"] || null,
      };
    },

    notifications: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");

      const res = await pool.query(
        "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC",
        [user.id]
      );

  return res.rows.map(n => ({
    id: n.id,
    message: n.message,
    isRead: n.is_read,
    createdAt: n.created_at.toISOString(),
  }));
    },

    departments: async (_, { includeInactive }, { user }) => {
      requireAdmin(user);
      const res = await pool.query(
        `SELECT * FROM departments
         WHERE ($1::boolean = TRUE OR is_active = TRUE)
         ORDER BY is_active DESC, name ASC`,
        [!!includeInactive]
      );
      return res.rows.map(mapDepartment);
    },

    designations: async (_, { includeInactive }, { user }) => {
      requireAdmin(user);
      const res = await pool.query(
        `SELECT * FROM designations
         WHERE ($1::boolean = TRUE OR is_active = TRUE)
         ORDER BY is_active DESC, name ASC`,
        [!!includeInactive]
      );
      return res.rows.map(mapDesignation);
    },

    workSchedules: async (_, { includeInactive }, { user }) => {
      requireAdmin(user);
      const res = await pool.query(
        `SELECT * FROM work_schedules
         WHERE ($1::boolean = TRUE OR is_active = TRUE)
         ORDER BY is_active DESC, name ASC`,
        [!!includeInactive]
      );
      return res.rows.map(mapWorkSchedule);
    },

    employeeAttendanceSummary: async (_, { startDate, endDate }, { user }) => {
      requireAdmin(user);

      const start = parseDateOnly(startDate);
      const end = parseDateOnly(endDate);
      if (start > end) throw new Error("Start date cannot be after end date");

      const [usersRes, attendanceRes, leavesRes, holidaysRes] = await Promise.all([
        pool.query(
          `SELECT id, username, employee_number, department, designation
           FROM users
           WHERE is_active = TRUE AND role <> 'admin'
           ORDER BY username ASC`
        ),
        pool.query(
          `SELECT user_id, attendance_date, check_in, check_out
           FROM attendance
           WHERE attendance_date BETWEEN $1 AND $2`,
          [startDate, endDate]
        ),
        pool.query(
          `SELECT user_id, start_date, end_date, days, status
           FROM leave_requests
           WHERE status = 'Approved'
             AND start_date <= $2
             AND end_date >= $1`,
          [startDate, endDate]
        ),
        pool.query(
          `SELECT holiday_date
           FROM holidays
           WHERE holiday_date BETWEEN $1 AND $2`,
          [startDate, endDate]
        ),
      ]);

      const holidaySet = new Set(
        holidaysRes.rows.map((row) => row.holiday_date.toISOString().split("T")[0])
      );
      const workingDates = getWorkingDatesInRange(start, end, holidaySet);
      const totalWorkingDays = workingDates.length;

      const attendanceByUser = new Map();
      attendanceRes.rows.forEach((row) => {
        const dateKey = row.attendance_date.toISOString().split("T")[0];
        if (!attendanceByUser.has(row.user_id)) {
          attendanceByUser.set(row.user_id, new Map());
        }
        const userDates = attendanceByUser.get(row.user_id);
        if (!userDates.has(dateKey)) {
          userDates.set(dateKey, {
            present: false,
            hours: 0,
          });
        }
        const existing = userDates.get(dateKey);
        existing.present = existing.present || !!row.check_in;
        existing.hours += Number(calcHours(row.check_in, row.check_out));
      });

      const approvedLeaveDatesByUser = new Map();
      leavesRes.rows.forEach((row) => {
        const leaveStart = parseDateOnly(row.start_date.toISOString().split("T")[0]);
        const leaveEnd = parseDateOnly(row.end_date.toISOString().split("T")[0]);
        const effectiveStart = leaveStart > start ? leaveStart : start;
        const effectiveEnd = leaveEnd < end ? leaveEnd : end;

        if (!approvedLeaveDatesByUser.has(row.user_id)) {
          approvedLeaveDatesByUser.set(row.user_id, new Set());
        }

        const userLeaveDates = approvedLeaveDatesByUser.get(row.user_id);
        const cursor = new Date(effectiveStart.getTime());
        while (cursor <= effectiveEnd) {
          const dateKey = dateToYmd(cursor);
          if (workingDates.includes(dateKey)) {
            userLeaveDates.add(dateKey);
          }
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
      });

      return usersRes.rows.map((employee) => {
        const userAttendance = attendanceByUser.get(employee.id) || new Map();
        const approvedLeaveDates = approvedLeaveDatesByUser.get(employee.id) || new Set();

        let totalHours = 0;
        let presentDays = 0;
        workingDates.forEach((dateKey) => {
          const attendance = userAttendance.get(dateKey);
          if (attendance?.present) {
            presentDays += 1;
            totalHours += attendance.hours;
          }
        });

        let leavesTaken = 0;
        approvedLeaveDates.forEach((dateKey) => {
          if (!userAttendance.get(dateKey)?.present) {
            leavesTaken += 1;
          }
        });

        const absentDays = Math.max(totalWorkingDays - presentDays - leavesTaken, 0);

        return {
          userId: employee.id,
          employeeNumber: employee.employee_number || null,
          employeeName: employee.username,
          department: employee.department || null,
          designation: employee.designation || null,
          totalHoursWorked: formatHours(totalHours),
          averageDailyWorkingHours: formatHours(presentDays ? totalHours / presentDays : 0),
          totalDaysPresent: presentDays,
          totalDaysAbsent: absentDays,
          totalLeavesTaken: leavesTaken,
        };
      });
    },
  
  //changed by navya on 25/04/26 for dynamic approval section(1.1)
    attendanceRequests: async (_, __, { user }) => {
  if (!user || user.role !== "admin") throw new Error("Only admin");

  const res = await pool.query(`
    SELECT ar.*, u.username
    FROM attendance_requests ar
    JOIN users u ON u.id = ar.user_id
    ORDER BY ar.created_at DESC
  `);

  return res.rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    username: r.username,
    date: r.attendance_date.toISOString().split("T")[0],
    requestedCheckIn: toUtcISOString(r.requested_check_in),
    requestedCheckOut: toUtcISOString(r.requested_check_out),
    reason: r.reason,
    status: r.status,
  }));
    },
employeeById: async (_, { id }, { user }) => {
  if (!user) throw new Error("Unauthorized");
 
  // Employees can only fetch their own profile
  if (user.role !== "admin" && String(user.id) !== String(id)) {
    throw new Error("Access denied");
  }
 
  const res = await pool.query(
    `SELECT u.*,
            m.username AS manager_name,
            d.username AS dr2_name
     FROM users u
     LEFT JOIN users m ON m.id = u.reports_to
     LEFT JOIN users d ON d.id = u.direct_reporting2
     WHERE u.id = $1`,
    [id]
  );
  if (!res.rows[0]) throw new Error("User not found");
 
  const base = mapUser(res.rows[0]);
 
  const hist = await pool.query(
    `SELECT id, designation, effective_date, reason
     FROM position_history
     WHERE user_id = $1
     ORDER BY effective_date ASC`,
      [id]
  );
  base.positionHistory = hist.rows.map((r) => ({
    id:            r.id,
    designation:   r.designation,
    effectiveDate: pgDateToIST(r.effective_date),
    reason:        r.reason || null,
  }));
 
  return base;
},




},
  Mutation: {
    //mutation for user login, creating users (admin only), checking in/out attendance, applying for leave, updating leave status (admin only), setting working hours (admin only), setting leave balances (admin only), toggling holidays (admin only), marking notifications as read, and changing password
    login: async (_, { username, password }) => {
      const res = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
      const user = res.rows[0];
      if (!user) throw new Error("User not found");
      if (user.is_active === false) throw new Error("Your account has been deactivated. Please contact your administrator.");
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error("Invalid password");
      return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);

    },

    createUser: async (
      _,
      {
        username,
        password,
        role,
        paidLeaves,
        monday,
        tuesday,
        wednesday,
        thursday,
        friday,
        saturday,
        employeeNumber,
        designation,
        department,
        reportsToId,
        joiningDate
      },
      { user }
    ) => {
      requireAdmin(user);

      const hash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO users
           (username, password, role, employee_number, designation, department, reports_to, joining_date, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE)
         RETURNING id`,
        [username, hash, role, employeeNumber || null, designation || null, department || null, reportsToId || null, joiningDate || null]
      );


      const userId = result.rows[0].id;

      //  Insert leave balance
      await pool.query(
        "INSERT INTO leaves (user_id, paid, used, casual, wfh) VALUES ($1, $2, 0, 0, 0)",
        [userId, paidLeaves]
      );

      //  Insert working hours per employee
      await pool.query(
        `INSERT INTO employee_working_hours
     (user_id, monday, tuesday, wednesday, thursday, friday, saturday)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [userId, monday, tuesday, wednesday, thursday, friday, saturday]
      );

      return "User created successfully";
    },

    checkIn: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");

      // Use IST date — CURRENT_DATE in Postgres uses UTC which gives wrong date for IST users
      const istDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

      const holiday = await pool.query(
        "SELECT id FROM holidays WHERE holiday_date = $1", [istDate]
      );
      if (holiday.rows.length > 0) {
        throw new Error("Today is a holiday");
      }

      const userRes = await pool.query(
        "SELECT username FROM users WHERE id=$1",
        [user.id]
      );
      const username = userRes.rows[0]?.username || "";

      const result = await pool.query(
        `
    INSERT INTO attendance (user_id, username, attendance_date, check_in)
    VALUES ($1, $2, $3, NOW())

    ON CONFLICT (user_id, attendance_date)
    DO UPDATE SET check_in = COALESCE(attendance.check_in, EXCLUDED.check_in)

    RETURNING 
      id,
      attendance_date,
      check_in,
      check_out
    `,
        [user.id, username, istDate]
      );

      const row = result.rows[0];

      return {
        id: row.id,
        date: pgDateToIST(row.attendance_date),
        checkIn: row.check_in ? row.check_in.toISOString() : null,
        checkOut: row.check_out ? row.check_out.toISOString() : null,
      };
    },

    checkOut: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");

      // Use IST date — same reason as checkIn
      const istDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

      const result = await pool.query(
        `
    UPDATE attendance
    SET check_out = NOW()
    WHERE user_id = $1
      AND attendance_date = $2
      AND check_in IS NOT NULL
      AND check_out IS NULL

    RETURNING 
      id,
      attendance_date,
      check_in,
      check_out
    `,
        [user.id, istDate]
      );

      if (result.rowCount === 0) {
        throw new Error("No active check-in found");
      }

      const row = result.rows[0];

      return {
        id: row.id,
        date: pgDateToIST(row.attendance_date),
        checkIn: row.check_in ? row.check_in.toISOString() : null,
        checkOut: row.check_out ? row.check_out.toISOString() : null,
      };
    },

    applyLeave: async (_, { type, startDate, endDate, days, reason }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      await pool.query(
        `INSERT INTO leave_requests (user_id, type, start_date, end_date, days, reason, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'Pending')`,
        [user.id, type, startDate, endDate, days, reason]
      );
      return "Leave applied";
    },

    updateLeaveStatus: async (_, { leaveId, status }, { user }) => {
      requireAdmin(user);
      if (!["Approved", "Rejected"].includes(status)) throw new Error("Invalid status");

      // Get existing leave
      const existing = await pool.query(
        "SELECT user_id, days, status, start_date, end_date FROM leave_requests WHERE id=$1",
        [leaveId]
      );

      const leave = existing.rows[0];
      if (!leave) throw new Error("Leave not found");

      // Update leave status
      await pool.query(
        "UPDATE leave_requests SET status=$1 WHERE id=$2",
        [status, leaveId]
      );

      // ONLY update used leaves if:
      // - new status = Approved
      // - previous status was NOT Approved
      if (status === "Approved" && leave.status !== "Approved") {
        await pool.query(
          "UPDATE leaves SET used = used + $1 WHERE user_id = $2",
          [leave.days, leave.user_id]
        );
      }

      const formatLeaveMessage = (startDate, endDate, statusText) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const startDay = start.getDate();
        const endDay = end.getDate();
        const startMonth = start.toLocaleString("en-US", { month: "long" });
        const endMonth = end.toLocaleString("en-US", { month: "long" });
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();

        if (startMonth === endMonth && startYear === endYear) {
          return `Your leave request from ${startDay}-${endDay} ${startMonth} ${startYear} has been ${statusText.toLowerCase()}.`;
        }

        return `Your leave request from ${startDay} ${startMonth} ${startYear} to ${endDay} ${endMonth} ${endYear} has been ${statusText.toLowerCase()}.`;
      };

      const msg = formatLeaveMessage(leave.start_date, leave.end_date, status);
      await pool.query(
        "INSERT INTO notifications (user_id, message) VALUES ($1, $2)",
        [leave.user_id, msg]
      );

      return `Leave ${status}`;
    },

    setWorkingHours: async (_, args, { user }) => {
      requireAdmin(user);
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      for (const day of days) {
        if (args[day] !== undefined && args[day] !== null) {
          await pool.query(
            `INSERT INTO working_hours (day_name, hours) VALUES ($1, $2)
             ON CONFLICT (day_name) DO UPDATE SET hours = $2`,
            [day, args[day]]
          );
        }
      }
      return "Working hours updated";
    },

    setLeave: async (_, { userId, paid, casual, wfh }, { user }) => {
      requireAdmin(user);
      await pool.query(
        `INSERT INTO leaves (user_id, paid, casual, wfh) VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id) DO UPDATE SET paid=$2, casual=$3, wfh=$4`,
        [userId, paid, casual, wfh]
      );
      return "Leave updated";
    },

    toggleHoliday: async (_, { date, description }, { user }) => {
      if (!user || user.role !== "admin") throw new Error("Admin only");
      const existing = await pool.query(
        "SELECT id FROM holidays WHERE holiday_date=$1", [date]
      );
      if (existing.rows.length > 0) {
        await pool.query("DELETE FROM holidays WHERE holiday_date=$1", [date]);
        return "Holiday removed";
      } else {
        await pool.query(
          "INSERT INTO holidays (holiday_date, description) VALUES ($1, $2)",
          [date, description || "Holiday"]
        );
        return "Holiday added";
      }
    },



    markNotificationRead: async (_, { id }, { user }) => {
  if (!user) throw new Error("Unauthorized");

      await pool.query(
        "UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2",
        [id, user.id]
      );

      return "Marked as read";
    },

    changePassword: async (_, { newPassword }, { user }) => {
      if (!user) throw new Error("Unauthorized");
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
      const hash = await bcrypt.hash(newPassword, 10);
      await pool.query(
        "UPDATE users SET password = $1 WHERE id = $2",
        [hash, user.id]
      );
      return "Password updated successfully";
    },

//changed by navya on 25/04/26 added mutation for user request on attendance issue(1.1)
  requestAttendanceCorrection: async (
  _,
  { date, checkIn, checkOut, reason },
  { user }
) => {
  if (!user) throw new Error("Unauthorized");

  await pool.query(
    `INSERT INTO attendance_requests 
     (user_id, attendance_date, requested_check_in, requested_check_out, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, date, checkIn, checkOut, reason]
  );

  return "Request submitted";
},


//changed by navya on 25/04/26 added mutation for admin approval/reject to show in db
updateAttendanceRequestStatus: async (
  _,
  { requestId, status },
  { user }
) => {
  if (!user || user.role !== "admin") throw new Error("Only admin");

  const existing = await pool.query(
    "SELECT * FROM attendance_requests WHERE id=$1",
    [requestId]
  );

  const req = existing.rows[0];
  if (!req) throw new Error("Request not found");

  // update status
  await pool.query(
    "UPDATE attendance_requests SET status=$1 WHERE id=$2",
    [status, requestId]
  );

  // if approved → update attendance table
  if (status === "Approved") {
    await pool.query(
      `UPDATE attendance
       SET check_in = COALESCE($1, check_in),
           check_out = COALESCE($2, check_out)
       WHERE user_id=$3 AND attendance_date=$4`,
      [
        req.requested_check_in,
        req.requested_check_out,
        req.user_id,
        req.attendance_date,
      ]
    );
  }

  return `Request ${status}`;
},


// toggle active/inactive status
    deactivateUser: async (_, { userId }, { user }) => {
      requireAdmin(user);
      if (String(userId) === String(user.id)) throw new Error("Cannot deactivate yourself");

      const res = await pool.query("SELECT is_active FROM users WHERE id=$1", [userId]);
      if (!res.rows[0]) throw new Error("User not found");

      const newStatus = !res.rows[0].is_active;
      await pool.query("UPDATE users SET is_active=$1 WHERE id=$2", [newStatus, userId]);
      return newStatus ? "User activated" : "User deactivated";
    },

    //  hard delete (with cascade cleanup)
    deleteUser: async (_, { userId }, { user }) => {
      requireAdmin(user);
      if (String(userId) === String(user.id)) throw new Error("Cannot delete yourself");

      // Clean up related data first
      await pool.query("DELETE FROM notifications WHERE user_id=$1", [userId]);
      await pool.query("DELETE FROM leave_requests WHERE user_id=$1", [userId]);
      await pool.query("DELETE FROM attendance WHERE user_id=$1", [userId]);
      await pool.query("DELETE FROM leaves WHERE user_id=$1", [userId]);
      await pool.query("DELETE FROM employee_working_hours WHERE user_id=$1", [userId]);
      await pool.query("DELETE FROM users WHERE id=$1", [userId]);

      return "User deleted successfully";
    },
    updateLeave: async (_, { leaveId, type, startDate, endDate, days, reason }, { user }) => {
  if (!user) throw new Error("Unauthorized");
  // Only allow edit if status is Pending and belongs to user
  const existing = await pool.query(
    "SELECT user_id, status FROM leave_requests WHERE id=$1",
    [leaveId]
  );
  const leave = existing.rows[0];
  if (!leave) throw new Error("Leave not found");
  if (String(leave.user_id) !== String(user.id)) throw new Error("Not authorized");
  if (leave.status !== "Pending") throw new Error("Only pending leaves can be edited");

  await pool.query(
    `UPDATE leave_requests SET type=$1, start_date=$2, end_date=$3, days=$4, reason=$5 WHERE id=$6`,
    [type, startDate, endDate, days, reason, leaveId]
  );
  return "Leave updated";
},

deleteLeave: async (_, { leaveId }, { user }) => {
  if (!user) throw new Error("Unauthorized");
  const existing = await pool.query(
    "SELECT user_id, status FROM leave_requests WHERE id=$1",
    [leaveId]
  );
  const leave = existing.rows[0];
  if (!leave) throw new Error("Leave not found");
  if (String(leave.user_id) !== String(user.id)) throw new Error("Not authorized");
  if (leave.status !== "Pending") throw new Error("Only pending leaves can be deleted");

  await pool.query("DELETE FROM leave_requests WHERE id=$1", [leaveId]);
  return "Leave deleted";
},

createDepartment: async (_, { name }, { user }) => {
  requireAdmin(user);
  const cleanName = sanitizeName(name, "Department");
  const normalizedName = normalizeName(cleanName);
  await pool.query(
    `INSERT INTO departments (name, normalized_name)
     VALUES ($1, $2)`,
    [cleanName, normalizedName]
  );
  return "Department created";
},

updateDepartment: async (_, { id, name }, { user }) => {
  requireAdmin(user);
  const cleanName = sanitizeName(name, "Department");
  const normalizedName = normalizeName(cleanName);
  const result = await pool.query(
    `UPDATE departments
     SET name = $1, normalized_name = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [cleanName, normalizedName, id]
  );
  if (!result.rowCount) throw new Error("Department not found");
  return "Department updated";
},

setDepartmentActive: async (_, { id, isActive }, { user }) => {
  requireAdmin(user);
  const result = await pool.query(
    `UPDATE departments
     SET is_active = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [isActive, id]
  );
  if (!result.rowCount) throw new Error("Department not found");
  return isActive ? "Department activated" : "Department deactivated";
},

deleteDepartment: async (_, { id }, { user }) => {
  requireAdmin(user);
  await ensureDepartmentNotAssigned(id);
  const result = await pool.query("DELETE FROM departments WHERE id = $1", [id]);
  if (!result.rowCount) throw new Error("Department not found");
  return "Department deleted";
},

createDesignation: async (_, { name }, { user }) => {
  requireAdmin(user);
  const cleanName = sanitizeName(name, "Designation");
  const normalizedName = normalizeName(cleanName);
  await pool.query(
    `INSERT INTO designations (name, normalized_name)
     VALUES ($1, $2)`,
    [cleanName, normalizedName]
  );
  return "Designation created";
},

updateDesignation: async (_, { id, name }, { user }) => {
  requireAdmin(user);
  const cleanName = sanitizeName(name, "Designation");
  const normalizedName = normalizeName(cleanName);
  const result = await pool.query(
    `UPDATE designations
     SET name = $1, normalized_name = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [cleanName, normalizedName, id]
  );
  if (!result.rowCount) throw new Error("Designation not found");
  return "Designation updated";
},

setDesignationActive: async (_, { id, isActive }, { user }) => {
  requireAdmin(user);
  const result = await pool.query(
    `UPDATE designations
     SET is_active = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [isActive, id]
  );
  if (!result.rowCount) throw new Error("Designation not found");
  return isActive ? "Designation activated" : "Designation deactivated";
},

deleteDesignation: async (_, { id }, { user }) => {
  requireAdmin(user);
  await ensureDesignationNotAssigned(id);
  const result = await pool.query("DELETE FROM designations WHERE id = $1", [id]);
  if (!result.rowCount) throw new Error("Designation not found");
  return "Designation deleted";
},

createWorkSchedule: async (_, args, { user }) => {
  requireAdmin(user);
  const schedule = sanitizeScheduleInput(args);
  await pool.query(
    `INSERT INTO work_schedules (
       name, normalized_name, schedule_type, working_days,
       max_check_in_time, total_daily_hours,
       fixed_check_in_time, buffer_minutes, fixed_check_out_time
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      schedule.name,
      schedule.normalizedName,
      schedule.scheduleType,
      schedule.workingDays,
      schedule.maxCheckInTime,
      schedule.totalDailyHours,
      schedule.fixedCheckInTime,
      schedule.bufferMinutes,
      schedule.fixedCheckOutTime,
    ]
  );
  return "Schedule created";
},

updateWorkSchedule: async (_, { id, ...args }, { user }) => {
  requireAdmin(user);
  const schedule = sanitizeScheduleInput(args);
  const result = await pool.query(
    `UPDATE work_schedules
     SET name = $1,
         normalized_name = $2,
         schedule_type = $3,
         working_days = $4,
         max_check_in_time = $5,
         total_daily_hours = $6,
         fixed_check_in_time = $7,
         buffer_minutes = $8,
         fixed_check_out_time = $9,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $10`,
    [
      schedule.name,
      schedule.normalizedName,
      schedule.scheduleType,
      schedule.workingDays,
      schedule.maxCheckInTime,
      schedule.totalDailyHours,
      schedule.fixedCheckInTime,
      schedule.bufferMinutes,
      schedule.fixedCheckOutTime,
      id,
    ]
  );
  if (!result.rowCount) throw new Error("Schedule not found");
  return "Schedule updated";
},

setWorkScheduleActive: async (_, { id, isActive }, { user }) => {
  requireAdmin(user);
  const result = await pool.query(
    `UPDATE work_schedules
     SET is_active = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [isActive, id]
  );
  if (!result.rowCount) throw new Error("Schedule not found");
  return isActive ? "Schedule activated" : "Schedule deactivated";
},

deleteWorkSchedule: async (_, { id }, { user }) => {
  requireAdmin(user);
  const result = await pool.query("DELETE FROM work_schedules WHERE id = $1", [id]);
  if (!result.rowCount) throw new Error("Schedule not found");
  return "Schedule deleted";
},

updateEmployeeDetails: async (_, { userId, dateOfBirth, scheduleType, biometricId }, { user }) => {
  requireAdmin(user);
  await pool.query(
    `UPDATE users
     SET date_of_birth = COALESCE($1::date, date_of_birth),
         schedule_type = COALESCE($2, schedule_type),
         biometric_id  = COALESCE($3, biometric_id)
     WHERE id = $4`,
    [dateOfBirth || null, scheduleType || null, biometricId || null, userId]
  );
  return "Employee details updated";
},

changePosition: async (_, { userId, newDesignation, effectiveDate, reason }, { user }) => {
  requireAdmin(user);
  await pool.query(
    `INSERT INTO position_history (user_id, designation, effective_date, reason)
     VALUES ($1, $2, $3::date, $4)`,
    [userId, newDesignation, effectiveDate, reason]
  );
  await pool.query(`UPDATE users SET designation = $1 WHERE id = $2`, [newDesignation, userId]);
  return "Position updated";
},

updateReporting: async (_, { userId, reportsToId, directReporting2Id }, { user }) => {
  requireAdmin(user);
  if (String(reportsToId) === String(userId)) throw new Error("Employee cannot report to themselves");
  await pool.query(
    `UPDATE users SET reports_to = $1, direct_reporting2 = $2 WHERE id = $3`,
    [reportsToId || null, directReporting2Id || null, userId]
  );
  return "Reporting hierarchy updated";
},

adminResetPassword: async (_, { userId, newPassword }, { user }) => {
  requireAdmin(user);
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password=$1 WHERE id=$2", [hash, userId]);
  return "Password reset successfully";
},

  },
};
  
