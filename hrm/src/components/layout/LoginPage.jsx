import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function LoginPage({ form, setForm, onSubmit, error }) {
  const [showPassword, setShowPassword] = useState(false);

  function handleKeyDown(e) {
    if (e.key === "Enter") onSubmit(e);
  }

  return (
    <div className="login-card">
      <div className="login-logo">HR</div>
      <h1 className="login-title">HRM Portal</h1>
      <p className="login-sub">Sign in to access your dashboard</p>

      <div className="login-fields">
        {/* Username */}
        <div className="field">
          <label>Username</label>
          <input
            value={form.username}
            onChange={(e) =>
              setForm((s) => ({ ...s, username: e.target.value }))
            }
            placeholder="Enter your username"
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        {/* Password */}
        <div className="field">
          <label>Password</label>

          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) =>
                setForm((s) => ({ ...s, password: e.target.value }))
              }
              placeholder="Enter your password"
              onKeyDown={handleKeyDown}
              style={{
                paddingRight: "38px",
                width: "100%",
              }}
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label="Toggle password visibility"
              style={{
                position: "absolute",
                right: "12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                color: "var(--text-secondary)",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => e.target.style.color = "var(--color-primary)"}
              onMouseLeave={(e) => e.target.style.color = "var(--text-secondary)"}
            >
              {showPassword ? <FaEye size={16} /> : <FaEyeSlash size={16} />}
            </button>
          </div>
        </div>

        {/* Button */}
        <button className="btn-primary login-btn" onClick={onSubmit}>
          Sign In
        </button>
      </div>

      {/* Error */}
      {error && <div className="login-error">{error}</div>}
    </div>
  );
}