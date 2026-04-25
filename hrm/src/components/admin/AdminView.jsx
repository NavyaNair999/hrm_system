// //This file contains what should be rendered in the main content area of the admin dashboard based on the selected tab. 
// // It acts as a router for the different components that make up the admin interface.


// import AdminDashboard from "./AdminDashboard";
// import AttendancePanel from "../AttendancePanel";
// import AddEmployee from "./AddEmployee";
// import ManageLeaves from "./ManageLeaves";
// import EmpApplyLeave from "../employee/EmpApplyLeave";
// import AdminSettings from "./Adminsettings";
// import UserList from "./UserList";

// export default function AdminView({ tab, currentUser, setTab }) {
//   if (tab === "dashboard") {
//     return <AdminDashboard currentUser={currentUser} setTab={setTab} />;
//   }
//   if (tab === "checkin") return <AttendancePanel currentUser={currentUser} />;
//   if (tab === "addEmployee") return <AddEmployee />;
//   if (tab === "leaves") return <ManageLeaves />;
//   if (tab === "applyLeave") return <EmpApplyLeave />;
//   if (tab === "settings") return <AdminSettings />;
//   if (tab === "userList") return <UserList setTab={setTab} />;
//   return null;
// }





//changed by navya on 25/4/26 
// Admin clicks "View" on any user in UserList then AdminView will render EmployeeProfile for that user instead of UserList the state for isadmin becomes true so admin can also edit
import { useState } from "react";
import AdminDashboard  from "./AdminDashboard";
import AttendancePanel from "../AttendancePanel";
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
  if (tab === "checkin")     return <AttendancePanel currentUser={currentUser} />;
  if (tab === "attendanceApprovals") {
    return <AdminAttendanceRequests onBack={() => setTab("dashboard")} />;
  }
  if (tab === "addEmployee") return <AddEmployee />;
  if (tab === "leaves")      return <ManageLeaves />;
  if (tab === "applyLeave")  return <EmpApplyLeave />;
  if (tab === "settings")    return <AdminSettings />;

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

  return null;
}
