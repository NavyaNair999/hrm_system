function initials(name) {
  if (!name) return "?";
  return name
    .split(/[\s._]/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Header({ user, onLogout, isAdmin, onHamburger, onThemeToggle, isDarkTheme }) {
  const displayName = user?.username || user?.name || "User";

  return (
    <header className="hrm-header">
      <div className="hrm-brand">
        <button className="hamburger" onClick={onHamburger}>
          ☰
        </button>
        <div className="hrm-brand-logo">IV</div>
        <div>
          <div className="hrm-brand-name">INFIDHI VENTURES PVT. LTD.</div>
          <div className="hrm-brand-sub">
            {isAdmin ? "Admin Dashboard" : "Employee Dashboard"}
          </div>
        </div>
      </div>
      <div className="hrm-header-right">
        {onThemeToggle && (
          <button 
            className="theme-toggle" 
            onClick={onThemeToggle}
            title={isDarkTheme ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkTheme ? "☀️" : "🌙"}
          </button>
        )}
        <div className="hrm-user-pill">
          <div className="hrm-avatar">{initials(displayName)}</div>
          {displayName}
        </div>
        <button className="btn-logout" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}