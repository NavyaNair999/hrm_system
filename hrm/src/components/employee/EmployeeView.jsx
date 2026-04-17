import EmpDashboard from "./EmpDashboard";
import EmpAttendance from "./EmpAttendance";
import EmpApplyLeave from "./EmpApplyLeave";

// components/employee/EmployeeView.jsx

export default function EmployeeView({ tab, currentUser }) {
  if (tab === "dashboard") return <EmpDashboard currentUser={currentUser} />;
  // Change "checkin" to "attendance" to match Sidebar.jsx
  if (tab === "attendance") return <EmpAttendance currentUser={currentUser} />; 
  if (tab === "applyLeave") return <EmpApplyLeave />;
  return null;
}