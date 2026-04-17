import EmpDashboard from "./EmpDashboard";
import AttendancePanel from "../AttendancePanel";
import EmpApplyLeave from "./EmpApplyLeave";
import EmpNotifications from "./EmpNotifications";

// components/employee/EmployeeView.jsx

export default function EmployeeView({ tab, currentUser }) {
  if (tab === "dashboard") return <EmpDashboard currentUser={currentUser} />;
  if (tab === "attendance") return <AttendancePanel currentUser={currentUser} />; 
  if (tab === "applyLeave") return <EmpApplyLeave />;
  if (tab === "notifications") return <EmpNotifications />;
  return null;
}