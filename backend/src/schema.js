const { gql } = require("apollo-server-express");

module.exports = gql`
  type User {
    id: ID!
    username: String!
    role: String!
  }

  type Attendance {
    id: ID!
    userId: ID!
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

  type Query {
    me: User
    attendance: [Attendance]
    leaveBalance: LeaveBalance
    myLeaves: [LeaveRequest]
    allLeaves: [LeaveRequest]
    holidays: [Holiday]
    workingHours: WorkingHours
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
): String

    checkIn: String
    checkOut: String

    applyLeave(type: String!, startDate: String!, endDate: String!, days: Int!, reason: String!): String
    updateLeaveStatus(leaveId: ID!, status: String!): String

    setWorkingHours(monday: String, tuesday: String, wednesday: String, thursday: String, friday: String, saturday: String): String
    setLeave(userId: ID!, paid: Int, casual: Int, wfh: Int): String

    toggleHoliday(date: String!, description: String): String
  }
`;