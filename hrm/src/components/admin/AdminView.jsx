//changed by navya on 25/4/26 
// Admin clicks "View" on any user in UserList then AdminView will render EmployeeProfile for that user instead of UserList the state for isadmin becomes true so admin can also edit
import { useState } from "react";
import AdminDashboard  from "./AdminDashboard";
import EmpAttendance   from "../employee/EmpAttendance";
import AddEmployee     from "./AddEmployee";
import ManageLeaves    from "./ManageLeaves";
import EmpApplyLeave   from "../employee/EmpApplyLeave";
import AdminSettings   from "./Adminsettings";
import AdminAttendanceRequests from "./AdminAttendanceRequests";
import UserList        from "./UserList";
import EmployeeProfile from "../profile/EmployeeProfile"; // ← shared component

export default function AdminView({ tab, currentUser, setTab }) {
  const [profileUserId, setProfileUserId] = useState(null);

  if (tab === "dashboard")   return <AdminDashboard currentUser={currentUser} setTab={setTab} />;
  if (tab === "checkin")     return <EmpAttendance currentUser={currentUser} />;
  if (tab === "attendanceApprovals") {
    return <AdminAttendanceRequests onBack={() => setTab("dashboard")} />;
  }
  if (tab === "addEmployee") return <AddEmployee />;
  if (tab === "leaves")      return <ManageLeaves />;
  if (tab === "applyLeave")  return <EmpApplyLeave />;
  if (tab === "settings")    return <AdminSettings currentUser={currentUser} />;

  if (tab === "userList") {
    return (
      <UserList
        setTab={setTab}
        setProfileUserId={setProfileUserId}
      />
    );
  }

  if (tab === "employeeProfile") {
    return (
      <EmployeeProfile
        userId={profileUserId}
        isAdmin={true}
        onBack={() => setTab("userList")}
      />
    );
  }

  if (tab === "leaves")       return <ManageLeaves />;

  return null;
}
