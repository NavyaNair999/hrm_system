// import EmpDashboard from "./EmpDashboard";
// import AttendancePanel from "../AttendancePanel";
// import EmpApplyLeave from "./EmpApplyLeave";
// import EmpNotifications from "./EmpNotifications";

// // components/employee/EmployeeView.jsx

// export default function EmployeeView({ tab, currentUser, setTab }) {
//   if (tab === "dashboard") {
//     return <EmpDashboard currentUser={currentUser} setTab={setTab} />;
//   }
//   if (tab === "attendance") return <AttendancePanel currentUser={currentUser} />; 
//   if (tab === "applyLeave") return <EmpApplyLeave />;
//   if (tab === "notifications") return <EmpNotifications />;
//   return null;
// }






import EmpDashboard    from "./EmpDashboard";
import AttendancePanel from "../AttendancePanel";
import EmpApplyLeave   from "./EmpApplyLeave";
import EmpNotifications from "./EmpNotifications";
import EmployeeProfile from "../profile/EmployeeProfile"; 

export default function EmployeeView({ tab, currentUser, setTab }) {
  if (tab === "dashboard")     return <EmpDashboard currentUser={currentUser} setTab={setTab} />;
  if (tab === "attendance")    return <AttendancePanel currentUser={currentUser} />;
  if (tab === "applyLeave")    return <EmpApplyLeave />;
  if (tab === "notifications") return <EmpNotifications />;

  // Employee views their own profile — read-only, no back button needed
  if (tab === "myProfile") {
    return (
      <EmployeeProfile
        userId={currentUser.id}
        isAdmin={false}           // read-only mode
      />
    );
  }

  return null;
}