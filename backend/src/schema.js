// This file defines the GraphQL schema for the HRM system, including types for users, attendance records, leave balances, leave requests, holidays, working hours, and notifications. It also defines the queries and mutations that can be performed on these types.
const { gql } = require("apollo-server-express");

module.exports = gql`
  type User {
    id: ID!
    username: String!
    role: String!
     employeeNumber: String
  designation: String
  department: String
  reportsTo: String     
  joiningDate: String
  isActive: Boolean
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

  type Query {
  allUsers: [User] 
    me: User
    attendance: [Attendance]
    leaveBalance: LeaveBalance
    myLeaves: [LeaveRequest]
    allLeaves: [LeaveRequest]
    holidays: [Holiday]
    workingHours: WorkingHours
    notifications: [Notification]
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
  employeeNumber: String,
  designation: String,
  department: String,
  reportsToId: ID,
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
     deactivateUser(userId: ID!): String   
    deleteUser(userId: ID!): String     
    
    updateLeave(leaveId: ID!, type: String!, startDate: String!, endDate: String!, days: Int!, reason: String!): String
deleteLeave(leaveId: ID!): String
  }
`;