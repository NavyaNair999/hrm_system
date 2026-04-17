const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// ── Table bootstrap ──────────────────────────────────────────────────────────

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

pool.query(`
  CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    username VARCHAR(100),
    attendance_date DATE DEFAULT CURRENT_DATE,
    check_in TIME,
    check_out TIME,
    UNIQUE(user_id, attendance_date)
  )
`).catch(console.error);

pool.query(`
  CREATE TABLE IF NOT EXISTS holidays (
    id SERIAL PRIMARY KEY,
    holiday_date DATE UNIQUE NOT NULL,
    description TEXT
  )
`).catch(console.error);

pool.query(`
  CREATE TABLE IF NOT EXISTS working_hours (
    id SERIAL PRIMARY KEY,
    day_name VARCHAR(20) UNIQUE NOT NULL,
    hours VARCHAR(50)
  )
`).catch(console.error);

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return "0.00";
  // checkIn / checkOut are "HH:MM:SS" strings from Postgres TIME column
  const [inH, inM, inS = 0] = checkIn.split(":").map(Number);
  const [outH, outM, outS = 0] = checkOut.split(":").map(Number);
  const inSecs = inH * 3600 + inM * 60 + inS;
  const outSecs = outH * 3600 + outM * 60 + outS;
  const diff = (outSecs - inSecs) / 3600;
  return diff > 0 ? diff.toFixed(2) : "0.00";
}

// ── Resolvers ────────────────────────────────────────────────────────────────

module.exports = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const res = await pool.query(
        "SELECT id, username, role FROM users WHERE id=$1",
        [user.id]
      );
      return res.rows[0];
    },

    // Returns attendance records from 2026-04-17 onwards for the logged-in user
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
           AND a.attendance_date >= '2026-04-17'
         ORDER BY a.attendance_date ASC`,
        [user.id]
      );

      return res.rows.map((row) => {
        const dateStr = row.attendance_date
          ? row.attendance_date.toISOString().split("T")[0]
          : null;

        return {
          id: row.id,
          userId: row.user_id,
          username: row.username,
          date: dateStr,
          // Store raw time strings – frontend formats them
          checkIn: row.check_in || null,
          checkOut: row.check_out || null,
          hoursWorked: calcHours(row.check_in, row.check_out),
          isHoliday: !!row.holiday_desc,
        };
      });
    },

    leaveBalance: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const res = await pool.query(
        "SELECT * FROM leaves WHERE user_id=$1",
        [user.id]
      );
      if (!res.rows[0]) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        paid: row.paid,
        used: row.used,
        casual: row.casual,
        wfh: row.wfh,
      };
    },

    myLeaves: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const res = await pool.query(
        "SELECT * FROM leave_requests WHERE user_id=$1 ORDER BY id DESC",
        [user.id]
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
      }));
    },

    allLeaves: async (_, __, { user }) => {
      if (!user || user.role !== "admin") throw new Error("Only admin");
      const res = await pool.query(`
        SELECT lr.*, u.username
        FROM leave_requests lr
        JOIN users u ON u.id = lr.user_id
        ORDER BY lr.id DESC
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
      }));
    },

    holidays: async () => {
      const res = await pool.query(
        "SELECT * FROM holidays ORDER BY holiday_date ASC"
      );
      return res.rows.map((r) => ({
        date: r.holiday_date.toISOString().split("T")[0],
        description: r.description,
      }));
    },

    workingHours: async () => {
      const res = await pool.query("SELECT * FROM working_hours");
      const map = {};
      res.rows.forEach((r) => {
        map[r.day_name] = r.hours;
      });
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
  },

  Mutation: {
    login: async (_, { username, password }) => {
      const res = await pool.query(
        "SELECT * FROM users WHERE username=$1",
        [username]
      );
      const user = res.rows[0];
      if (!user) throw new Error("User not found");
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
  },
  { user }
) => {
  if (!user || user.role !== "admin") throw new Error("Only admin");

  const hash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    "INSERT INTO users (username, password, role) VALUES ($1,$2,$3) RETURNING id",
    [username, hash, role]
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

      // Block check-in on holidays
      const holiday = await pool.query(
        "SELECT id FROM holidays WHERE holiday_date = CURRENT_DATE"
      );
      if (holiday.rows.length > 0) {
        throw new Error("Today is a holiday. Check-in is not allowed.");
      }

      const userRes = await pool.query(
        "SELECT username FROM users WHERE id=$1",
        [user.id]
      );
      const username = userRes.rows[0]?.username || "";

      await pool.query(
        `INSERT INTO attendance (user_id, username, attendance_date, check_in)
         VALUES ($1, $2, CURRENT_DATE, CURRENT_TIME)
         ON CONFLICT (user_id, attendance_date) DO NOTHING`,
        [user.id, username]
      );
      return "Checked in";
    },

    checkOut: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const result = await pool.query(
        `UPDATE attendance
         SET check_out = CURRENT_TIME
         WHERE user_id=$1 AND attendance_date=CURRENT_DATE
         RETURNING id`,
        [user.id]
      );
      if (result.rowCount === 0) throw new Error("No check-in found for today");
      return "Checked out";
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
  if (!user || user.role !== "admin") throw new Error("Only admin");
  if (!["Approved", "Rejected"].includes(status)) throw new Error("Invalid status");

  // Get existing leave
  const existing = await pool.query(
    "SELECT user_id, days, status FROM leave_requests WHERE id=$1",
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

  if (status === "Approved" && leave.status !== "Approved") {
  await pool.query(
    "UPDATE leaves SET used = used + $1 WHERE user_id = $2",
    [leave.days, leave.user_id]
  );
}

//  Create notification
const msg = `Your leave request has been ${status}`;
await pool.query(
  "INSERT INTO notifications (user_id, message) VALUES ($1, $2)",
  [leave.user_id, msg]
);

  return `Leave ${status}`;
},

    // Per-day working hours for Mon–Sat
    setWorkingHours: async (_, args, { user }) => {
      if (!user || user.role !== "admin") throw new Error("Only admin");
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      for (const day of days) {
        if (args[day] !== undefined && args[day] !== null) {
          await pool.query(
            `INSERT INTO working_hours (day_name, hours)
             VALUES ($1, $2)
             ON CONFLICT (day_name) DO UPDATE SET hours = $2`,
            [day, args[day]]
          );
        }
      }
      return "Working hours updated";
    },

    setLeave: async (_, { userId, paid, casual, wfh }, { user }) => {
      if (!user || user.role !== "admin") throw new Error("Only admin");
      await pool.query(
        `INSERT INTO leaves (user_id, paid, casual, wfh)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id)
         DO UPDATE SET paid=$2, casual=$3, wfh=$4`,
        [userId, paid, casual, wfh]
      );
      return "Leave updated";
    },

    // Toggle a holiday on/off for a given date
    toggleHoliday: async (_, { date, description }, { user }) => {
      if (!user || user.role !== "admin") throw new Error("Admin only");

      const existing = await pool.query(
        "SELECT id FROM holidays WHERE holiday_date=$1",
        [date]
      );

      if (existing.rows.length > 0) {
        // Already a holiday → remove it
        await pool.query("DELETE FROM holidays WHERE holiday_date=$1", [date]);
        return "Holiday removed";
      } else {
        // Not a holiday → add it
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
}
  },
};