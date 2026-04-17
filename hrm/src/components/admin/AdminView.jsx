import AdminDashboard from "./AdminDashboard";
import AttendancePanel from "../AttendancePanel";
import AddEmployee from "./AddEmployee";
import ManageLeaves from "./ManageLeaves";
import EmpApplyLeave from "../employee/EmpApplyLeave";
import HolidayManager from "./HolidayManager";

export default function AdminView({ tab, currentUser }) {
  if (tab === "dashboard") return <AdminDashboard currentUser={currentUser} />;
  if (tab === "checkin") return <AttendancePanel currentUser={currentUser} />;
  if (tab === "addEmployee") return <AddEmployee />;
  if (tab === "leaves") return <ManageLeaves />;
  if (tab === "applyLeave") return <EmpApplyLeave />;
  if(tab=="holidaymanagaer") return <HolidayManager />
  return null;
}