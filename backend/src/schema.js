// // This file defines the GraphQL schema for the HRM system, including types for users, attendance records, leave balances, leave requests, holidays, working hours, and notifications. It also defines the queries and mutations that can be performed on these types.
// const { gql } = require("apollo-server-express");

// module.exports = gql`
//   type User {
//     id: ID!
//     username: String!
//     role: String!
//      employeeNumber: String
//   designation: String
//   department: String
//   reportsTo: String     
//   joiningDate: String
//   isActive: Boolean
//   }

// type Attendance {
//   id: ID!
//   userId: ID
//   username: String
//   date: String
//   checkIn: String
//   checkOut: String
//   hoursWorked: String
//   isHoliday: Boolean
// }


//   type LeaveBalance {
//     id: ID!
//     userId: ID!
//     paid: Int
//     used: Int
//     casual: Int
//     wfh: Int
//   }

//   type LeaveRequest {
//     id: ID!
//     userId: ID!
//     username: String
//     type: String
//     startDate: String
//     endDate: String
//     days: Int
//     reason: String
//     status: String
//     applicationDate: String  
//   }

//   type Holiday {
//     date: String!
//     description: String
//   }

//   type WorkingHours {
//     monday: String
//     tuesday: String
//     wednesday: String
//     thursday: String
//     friday: String
//     saturday: String
//   }

//   type Notification {
//   id: ID!
//   message: String
//   isRead: Boolean
//   createdAt: String
// }

// type AttendanceRequest {
//   id: ID
//   userId: Int
//   username: String
//   date: String
//   requestedCheckIn: String
//   requestedCheckOut: String
//   reason: String
//   status: String
// }

//   type Query {
//   allUsers: [User] 
//     me: User
//     attendance: [Attendance]
//     leaveBalance: LeaveBalance
//     myLeaves: [LeaveRequest]
//     allLeaves: [LeaveRequest]
//     holidays: [Holiday]
//     workingHours: WorkingHours
//     notifications: [Notification]
//     attendanceRequests: [AttendanceRequest]

//     }

//   type Mutation {
//     login(username: String!, password: String!): String

//     createUser(
//   username: String!
//   password: String!
//   role: String!
//   paidLeaves: Int!
//   monday: String
//   tuesday: String
//   wednesday: String
//   thursday: String
//   friday: String
//   saturday: String
//   employeeNumber: String,
//   designation: String,
//   department: String,
//   reportsToId: ID,
//   joiningDate: String

// ): String

//     checkIn: Attendance
//     checkOut: Attendance

//     applyLeave(type: String!, startDate: String!, endDate: String!, days: Int!, reason: String!): String
//     updateLeaveStatus(leaveId: ID!, status: String!): String

//     setWorkingHours(monday: String, tuesday: String, wednesday: String, thursday: String, friday: String, saturday: String): String
//     setLeave(userId: ID!, paid: Int, casual: Int, wfh: Int): String

//     toggleHoliday(date: String!, description: String): String

//     markNotificationRead(id: ID!): String
//     changePassword(newPassword: String!): String

//      requestAttendanceCorrection(
//     date: String!
//     checkIn: String
//     checkOut: String
//     reason: String
//   ): String

//   updateAttendanceRequestStatus(
//     requestId: ID!
//     status: String!
//   ): String
//      deactivateUser(userId: ID!): String   
//     deleteUser(userId: ID!): String     
    
//     updateLeave(leaveId: ID!, type: String!, startDate: String!, endDate: String!, days: Int!, reason: String!): String
// deleteLeave(leaveId: ID!): String
//   }
// `;






// backend/src/schema.js — REPLACE ENTIRELY
const { gql } = require("apollo-server-express");

module.exports = gql`
  type PositionHistory {
    id: ID!
    designation: String!
    effectiveDate: String!
    reason: String
  }

  type User {
    id: ID!
    username: String!
    role: String!
    employeeNumber: String
    designation: String
    department: String
    reportsTo: String
    reportsToId: ID
    directReporting2: String
    joiningDate: String
    isActive: Boolean
    dateOfBirth: String
    scheduleType: String
    biometricId: String
    positionHistory: [PositionHistory]
  }

  type Attendance {
    id: ID!
    userId: ID
    username: String
    date: String
    checkIn: String
    checkOut: String
    hoursWorked: String
    isHoliday: Boolean
  }

  type LeaveBalance {
    id: ID!
    userId: ID!
    paid: Int
    used: Int
    casual: Int
    wfh: Int
  }

  type LeaveRequest {
    id: ID!
    userId: ID!
    username: String
    type: String
    startDate: String
    endDate: String
    days: Int
    reason: String
    status: String
    applicationDate: String
  }

  type Holiday {
    date: String!
    description: String
  }

  type WorkingHours {
    monday: String
    tuesday: String
    wednesday: String
    thursday: String
    friday: String
    saturday: String
  }

  type Notification {
  id: ID!
  message: String
  isRead: Boolean
  createdAt: String
}

  type AttendanceRequest {
    id: ID
    userId: Int
    username: String
    date: String
    requestedCheckIn: String
    requestedCheckOut: String
    reason: String
    status: String
    createdAt: String
  }

  type Department {
    id: ID!
    name: String!
    isActive: Boolean!
    createdAt: String
    updatedAt: String
  }

  type Designation {
    id: ID!
    name: String!
    isActive: Boolean!
    createdAt: String
    updatedAt: String
  }

  type WorkSchedule {
    id: ID!
    name: String!
    scheduleType: String!
    workingDays: [String!]!
    maxCheckInTime: String
    totalDailyHours: String
    fixedCheckInTime: String
    bufferMinutes: Int
    fixedCheckOutTime: String
    isActive: Boolean!
    createdAt: String
    updatedAt: String
  }

  type EmployeeAttendanceSummary {
    userId: ID!
    employeeNumber: String
    employeeName: String!
    department: String
    designation: String
    totalHoursWorked: String!
    averageDailyWorkingHours: String!
    totalDaysPresent: Int!
    totalDaysAbsent: Int!
    totalLeavesTaken: Int!
  }
  type Query {
    allUsers: [User]
    me: User
    employeeById(id: ID!): User
    attendance: [Attendance]
    attendanceByUser(userId: ID!): [Attendance]
    leaveBalance: LeaveBalance
    myLeaves: [LeaveRequest]
    leaveRequestsByUser(userId: ID!): [LeaveRequest]
    allLeaves: [LeaveRequest]
    holidays: [Holiday]
    workingHours: WorkingHours
    # defined tpes for notification designations and departments by omkar on 25/4/26
    notifications: [Notification]
    departments(includeInactive: Boolean): [Department!]!
    designations(includeInactive: Boolean): [Designation!]!
    workSchedules(includeInactive: Boolean): [WorkSchedule!]!
    employeeAttendanceSummary(startDate: String!, endDate: String!): [EmployeeAttendanceSummary!]!
    teamMembers: [User!]!
    attendanceRequests: [AttendanceRequest]
    }

  type Mutation {
    login(username: String!, password: String!): String

    createUser(
      username: String!
      password: String!
      role: String!
      paidLeaves: Int!
      monday: String
      tuesday: String
      wednesday: String
      thursday: String
      friday: String
      saturday: String
      employeeNumber: String
      designation: String
      department: String
      reportsToId: ID
      joiningDate: String
    ): String

    checkIn: Attendance
    checkOut: Attendance

    applyLeave(type: String!, startDate: String!, endDate: String!, days: Int!, reason: String!): String
    updateLeaveStatus(leaveId: ID!, status: String!): String

    setWorkingHours(monday: String, tuesday: String, wednesday: String, thursday: String, friday: String, saturday: String): String
    setLeave(userId: ID!, paid: Int, casual: Int, wfh: Int): String

    toggleHoliday(date: String!, description: String): String

    markNotificationRead(id: ID!): String
    changePassword(newPassword: String!): String

    requestAttendanceCorrection(
      date: String!
      checkIn: String
      checkOut: String
      reason: String
    ): String

    updateAttendanceRequestStatus(requestId: ID!, status: String!): String

    deactivateUser(userId: ID!): String
    deleteUser(userId: ID!): String

    updateLeave(leaveId: ID!, type: String!, startDate: String!, endDate: String!, days: Int!, reason: String!): String
deleteLeave(leaveId: ID!): String

    createDepartment(name: String!): String
    updateDepartment(id: ID!, name: String!): String
    setDepartmentActive(id: ID!, isActive: Boolean!): String
    deleteDepartment(id: ID!): String

    createDesignation(name: String!): String
    updateDesignation(id: ID!, name: String!): String
    setDesignationActive(id: ID!, isActive: Boolean!): String
    deleteDesignation(id: ID!): String

    updateEmployeeDetails(userId: ID!, dateOfBirth: String, scheduleType: String, biometricId: String): String
    changePosition(userId: ID!, newDesignation: String!, effectiveDate: String!, reason: String!): String
    updateReporting(userId: ID!, reportsToId: ID, directReporting2Id: ID): String
    adminResetPassword(userId: ID!, newPassword: String!): String

    createWorkSchedule(
      name: String!
      scheduleType: String!
      workingDays: [String!]!
      maxCheckInTime: String
      totalDailyHours: String
      fixedCheckInTime: String
      bufferMinutes: Int
      fixedCheckOutTime: String
    ): String

    updateWorkSchedule(
      id: ID!
      name: String!
      scheduleType: String!
      workingDays: [String!]!
      maxCheckInTime: String
      totalDailyHours: String
      fixedCheckInTime: String
      bufferMinutes: Int
      fixedCheckOutTime: String
    ): String

    setWorkScheduleActive(id: ID!, isActive: Boolean!): String
    deleteWorkSchedule(id: ID!): String
  }
`;
