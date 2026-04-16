const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const typeDefs = require("./schema");
const resolvers = require("./resolvers");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

const getUser = (req) => {
  const token = req.headers.authorization || "";
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
};

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ user: getUser(req) }),
  });
await server.start();
  server.applyMiddleware({ app });

  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
}

startServer();