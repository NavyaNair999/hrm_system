//changed by navya
// This file sets up the Express server and Apollo Server for handling GraphQL requests. It includes a function to extract the user from the JWT token in the request headers and adds it to the GraphQL context for use in resolvers.
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
 server.applyMiddleware({ 
    app, 
    cors: {
      origin: ["https://extraordinary-blancmange-4e4736.netlify.app"],
      //origin: ["http://localhost:5173"],
      credentials: true
    }
  });

  app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
  });
}

startServer();
