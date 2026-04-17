export default function LoginPage({ form, setForm, onLogin, error }) {
  function handleKeyDown(e) {
    if (e.key === "Enter") onLogin(e);
  }

  return (
    <div className="login-card">
      <div className="login-logo">HR</div>
      <h1 className="login-title">HRM Portal</h1>
      <p className="login-sub">Sign in to access your dashboard</p>
      <div className="login-fields">
        <div className="field">
          <label>Username</label>
          <input
            value={form.username}
            onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
            placeholder="Enter username"
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            placeholder="Enter password"
            onKeyDown={handleKeyDown}
          />
        </div>
        <button className="btn-primary login-btn" onClick={onLogin}>
          Sign In
        </button>
      </div>
      {error && <div className="login-error">{error}</div>}
    </div>
  );
}