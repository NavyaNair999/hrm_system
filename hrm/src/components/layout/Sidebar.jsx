const ADMIN_ITEMS = [
  { id: "dashboard", icon: "⊞", label: "Dashboard" },
  { id: "checkin", icon: "⏱", label: "Check In / Out" },
  { id: "applyLeave", icon: "✉", label: "Apply Leave" },
  { id: "addEmployee", icon: "＋", label: "Add Employee" },
  { id: "leaves", icon: "📋", label: "Manage Leaves" },
  // { id: "holidaymanagaer", icon: "🌴", label: "Holiday Manager" },
  { id: "settings", icon: "⚙", label: "Settings" },
  { id: "userList", icon: "👥", label: "User List" },
];

const EMPLOYEE_ITEMS = [
  { id: "dashboard", icon: "⊞", label: "Dashboard" },
  { id: "attendance", icon: "📅", label: "Attendance" },
  { id: "applyLeave", icon: "✉", label: "Apply Leave" },
  { id: "notifications", icon: "🔔", label: "Notifications" },
];

export default function Sidebar({ tab, setTab, isAdmin, open }) {
  const items = isAdmin ? ADMIN_ITEMS : EMPLOYEE_ITEMS;

  return (
    <aside className={`hrm-sidebar${open ? " mobile-open" : ""}`}>
      {items.map((item) => (
        <button
          key={item.id}
          className={`sidebar-item${tab === item.id ? " active" : ""}`}
          onClick={() => setTab(item.id)}
        >
          <span className="sidebar-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </aside>
  );
}