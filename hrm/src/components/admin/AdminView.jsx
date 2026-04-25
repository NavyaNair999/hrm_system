//This file contains what should be rendered in the main content area of the admin dashboard based on the selected tab. 
// It acts as a router for the different components that make up the admin interface.


import AdminDashboard from "./AdminDashboard";
import AttendancePanel from "../AttendancePanel";
import AddEmployee from "./AddEmployee";
import ManageLeaves from "./ManageLeaves";
import EmpApplyLeave from "../employee/EmpApplyLeave";
import AdminSettings from "./Adminsettings";
import UserList from "./UserList";

export default function AdminView({ tab, currentUser, setTab }) {
  if (tab === "dashboard") return <AdminDashboard currentUser={currentUser} />;
  if (tab === "checkin") return <AttendancePanel currentUser={currentUser} />;
  if (tab === "addEmployee") return <AddEmployee />;
  if (tab === "leaves") return <ManageLeaves />;
  if (tab === "applyLeave") return <EmpApplyLeave />;
  if (tab === "settings") return <AdminSettings />;
  if (tab === "userList") return <UserList setTab={setTab} />;
  return null;
}