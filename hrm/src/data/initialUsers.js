export const INITIAL_USERS = [
  {
    id: 1, name: "Admin User", username: "admin", password: "admin123",
    role: "admin", schedule: "9:00 AM – 6:00 PM", isCheckedIn: false,
    lastCheck: "—", leaveRequests: [], attendance: {},
  },
  {
    id: 2, name: "Jane Smith", username: "jane", password: "jane123",
    role: "employee", schedule: "9:00 AM – 5:00 PM", isCheckedIn: true,
    lastCheck: "9:02 AM",
    leaveRequests: [
      { id: 101, type: "Sick Leave", days: 2, reason: "Fever", status: "Pending", startDate: "2026-04-17", endDate: "2026-04-18" },
      { id: 102, type: "Casual Leave", days: 1, reason: "Personal work", status: "Approved", startDate: "2026-04-10", endDate: "2026-04-10" },
    ],
    attendance: {
      "2026-04-14": { in: "9:01 AM", out: "5:03 PM" },
      "2026-04-15": { in: "8:58 AM", out: "5:10 PM" },
      "2026-04-16": { in: "9:02 AM", out: null },
    },
  },
  {
    id: 3, name: "Sam Wilson", username: "sam", password: "sam123",
    role: "employee", schedule: "10:00 AM – 7:00 PM", isCheckedIn: false,
    lastCheck: "7:04 PM",
    leaveRequests: [
      { id: 201, type: "Earned Leave", days: 3, reason: "Family vacation", status: "Pending", startDate: "2026-04-22", endDate: "2026-04-24" },
    ],
    attendance: {
      "2026-04-14": { in: "10:05 AM", out: "7:08 PM" },
      "2026-04-15": { in: "10:02 AM", out: "7:04 PM" },
    },
  },
];