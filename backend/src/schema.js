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
    checkIn: String
    checkOut: String
  }
 type LeaveBalance {
    id: ID!
    userId: ID!
    paid: Int
    used: Int
    casual: Int
    wfh: Int
  }

  type Query {
    me: User
    attendance: [Attendance]
    leaveBalance: LeaveBalance
  }
   type Mutation {
    login(username: String!, password: String!): String
    createUser(username: String!, password: String!, role: String!): String

    checkIn: String
    checkOut: String

    setWorkingHours(start: String!, end: String!): String
    setLeave(userId: ID!, paid: Int, casual: Int, wfh: Int): String
  }
`;