const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const res = await pool.query("SELECT id, username, role FROM users WHERE id=$1", [user.id]);
      return res.rows[0];
    },

    attendance: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const res = await pool.query("SELECT * FROM attendance WHERE user_id=$1", [user.id]);
      return res.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    checkIn: row.check_in,
    checkOut: row.check_out
  }));
    },
leaveBalance: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");
      const res = await pool.query("SELECT * FROM leaves WHERE user_id=$1", [user.id]);
      if (!res.rows[0]) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        paid: row.paid,
        used: row.used,
        casual: row.casual,
        wfh: row.wfh
      };
    },
  },

  Mutation: {
    login: async (_, { username, password }) => {
      const res = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
      const user = res.rows[0];
      if (!user) throw new Error("User not found");

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error("Invalid password");
       return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
    },

    createUser: async (_, { username, password, role }, { user }) => {
      if (!user || user.role !== "admin") throw new Error("Only admin");

      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        "INSERT INTO users (username, password, role) VALUES ($1,$2,$3)",
        [username, hash, role]
      );

      return "User created";
    },
 checkIn: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");

      await pool.query(
        "INSERT INTO attendance (user_id, check_in) VALUES ($1, NOW())",
        [user.id]
      );

      return "Checked in";
    },
    checkOut: async (_, __, { user }) => {
      if (!user) throw new Error("Unauthorized");

      await pool.query(
        "UPDATE attendance SET check_out=NOW() WHERE user_id=$1 AND check_out IS NULL",
        [user.id]
      );

      return "Checked out";
    },

    setWorkingHours: async (_, { start, end }, { user }) => {
      if (!user || user.role !== "admin") throw new Error("Only admin");

      await pool.query("INSERT INTO settings (start_time, end_time) VALUES ($1,$2)", [start, end]);
      return "Working hours set";
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
  },
};