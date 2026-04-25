import { useState, useEffect } from "react";
import {
  ApolloClient,
  InMemoryCache,
  gql,
} from "@apollo/client";
import { ApolloProvider, useMutation, useQuery } from "@apollo/client/react";
import { createHttpLink } from "@apollo/client/link/http";
import { setContext } from "@apollo/client/link/context";
import "./App.css";

import LoginPage from "./components/layout/LoginPage";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import AdminView from "./components/admin/AdminView";
import EmployeeView from "./components/employee/EmployeeView";

// Apollo Client Setup 
// const httpLink = createHttpLink({
//   uri: "https://hrm-system-20o3.onrender.com/graphql", // Deployed server address
// });


const httpLink = createHttpLink({
  uri: "http://localhost:4000/graphql", // Local server address
});


const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem("hrm_token");
  return {
    headers: {
      ...headers,
      authorization: token || "",
    },
  };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

// ─── GraphQL Operations ──────────────────────────────────────────────────────
const LOGIN = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password)
  }
`;

const ME = gql`
  query Me {
    me {
      id
      username
      role
    }
  }
`;

// ─── Inner App (inside ApolloProvider) ──────────────────────────────────────
function AppInner() {
  const [token, setToken] = useState(() => localStorage.getItem("hrm_token") || "");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    const saved = localStorage.getItem("hrm_theme");
    return saved ? saved === "dark" : false;
  });

  const [loginMutation] = useMutation(LOGIN);

  const { data: meData, loading: meLoading, refetch: refetchMe } = useQuery(ME, {
    skip: !token,
    fetchPolicy: "network-only",
  });

  const currentUser = meData?.me || null;
  const isAdmin = currentUser?.role === "admin";

  // Persist token
  useEffect(() => {
    if (token) localStorage.setItem("hrm_token", token);
    else localStorage.removeItem("hrm_token");
  }, [token]);

  // Persist theme preference
  useEffect(() => {
    localStorage.setItem("hrm_theme", isDarkTheme ? "dark" : "light");
  }, [isDarkTheme]);

  const toggleTheme = () => {
    setIsDarkTheme((prev) => !prev);
  };

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    try {
      const { data } = await loginMutation({
        variables: {
          username: loginForm.username,
          password: loginForm.password,
        },
      });
      const newToken = data.login;
      localStorage.setItem("hrm_token", newToken);
      setToken(newToken);
      setTab("dashboard");
      // Refetch me after token is stored
      setTimeout(() => refetchMe(), 100);
    } catch (err) {
      setLoginError(err.message || "Invalid username or password.");
    }
  }

  function handleLogout() {
    localStorage.removeItem("hrm_token"); 
    setToken("");
    setLoginForm({ username: "", password: "" });
    client.clearStore();
    window.location.reload();
  }

  // Loading state while checking existing session
  if (token && meLoading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          color: "#888",
        }}
      >
        Loading...
      </div>
    );
  }

  // Login screen
  if (!currentUser) {
    return (
      <div className="login-screen">
        <LoginPage
          form={loginForm}
          setForm={setLoginForm}
          onSubmit={handleLogin}
          error={loginError}
          isDarkTheme={isDarkTheme}
          onThemeToggle={toggleTheme}
        />
      </div>
    );
  }

  return (
    <div className={`hrm-root ${isDarkTheme ? "dark-theme" : ""}`}>
      <Header
        user={{ ...currentUser, name: currentUser.username }}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        onHamburger={() => setSidebarOpen((o) => !o)}
        onThemeToggle={toggleTheme}
        isDarkTheme={isDarkTheme}
      />
      <div className="hrm-layout">
        <Sidebar
          tab={tab}
          setTab={(t) => {
            setTab(t);
            setSidebarOpen(false);
          }}
          isAdmin={isAdmin}
          open={sidebarOpen}
        />
        <main className="hrm-main">
          {isAdmin ? (
            <AdminView
              tab={tab}
              currentUser={currentUser}
              setTab={setTab}
            />
          ) : (
            <EmployeeView
              tab={tab}
              currentUser={currentUser}
              setTab={setTab}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Root App with ApolloProvider ────────────────────────────────────────────
export default function App() {
  return (
    <ApolloProvider client={client}>
      <AppInner />
    </ApolloProvider>
  );
}
