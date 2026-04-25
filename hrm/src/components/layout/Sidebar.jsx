const ADMIN_ITEMS = [
  { id: "dashboard", icon: "D", label: "Dashboard" },
  { id: "checkin", icon: "A", label: "Attendance" },
  { id: "applyLeave", icon: "L", label: "Apply Leave" },
  { id: "addEmployee", icon: "+", label: "Add Employee" },
  { id: "leaves", icon: "M", label: "Manage Leaves" },
  { id: "settings", icon: "S", label: "Settings" },
  { id: "userList", icon: "U", label: "User List" },
];

const EMPLOYEE_ITEMS = [
  { id: "dashboard", icon: "D", label: "Dashboard" },
  { id: "attendance", icon: "A", label: "Attendance" },
  { id: "applyLeave", icon: "L", label: "Apply Leave" },
  { id: "notifications", icon: "N", label: "Notifications" },
  { id: "myProfile", icon: "P", label: "My Profile" },
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
