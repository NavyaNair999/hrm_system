const ADMIN_ITEMS = [
  { id: "dashboard", icon: "D", label: "Dashboard" },
  { id: "checkin", icon: "A", label: "Attendance" },
  { id: "applyLeave", icon: "L", label: "Apply Leave" },
  { id: "addEmployee", icon: "+", label: "Add Employee" },
  { id: "leaves", icon: "M", label: "Manage Leaves" },
  { id: "settings", icon: "S", label: "Settings" },
  { id: "userList", icon: "U", label: "User List" },
  { id: "myProfile", icon: "P", label: "My Profile" },

];

const EMPLOYEE_ITEMS = [
  { id: "dashboard", icon: "D", label: "Dashboard" },
  { id: "attendance", icon: "A", label: "Attendance" },
  { id: "applyLeave", icon: "L", label: "Apply Leave" },
  { id: "notifications", icon: "N", label: "Notifications" },
  { id: "myProfile", icon: "P", label: "My Profile" },
];

// Added the "Manage Leaves" item specifically for managers by neha on 25/4/26
const MANAGER_EXTRA_ITEM = { id: "leaves", icon: "M", label: "Manage Leaves" };

export default function Sidebar({ tab, setTab, isAdmin, user, open }) {
  // 1. Start with the base items for the role
  let items = isAdmin ? [...ADMIN_ITEMS] : [...EMPLOYEE_ITEMS];

  // 2. If the user is NOT an admin but IS a manager, add "Manage Leaves" to their list
  if (!isAdmin && user?.isReportingManager) {
    // Insert it before "Notifications" or at a specific index
    items.splice(3, 0, MANAGER_EXTRA_ITEM); 
  }

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