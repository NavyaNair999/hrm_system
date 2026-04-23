import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import AttendancePanel from "../AttendancePanel";

const LEAVE_BALANCE = gql`
  query LeaveBalance {
    leaveBalance {
      paid
      used
      casual
      wfh
    }
  }
`;

export default function AdminDashboard({ currentUser }) {
  const { data: leaveData, loading } = useQuery(LEAVE_BALANCE);
  const balance = leaveData?.leaveBalance;

  const totalLeaves = balance?.paid ?? 0;
  const usedLeaves = balance?.used ?? 0;
  const remainingLeaves = Math.max(0, totalLeaves - usedLeaves);

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {currentUser?.username} 👋</h1>
        <p>Here's your dashboard for today</p>
      </div>

      {/* Admin's own leave balance only */}
      {loading ? (
        <div style={{ color: "#aaa", padding: "1rem" }}>Loading leave data...</div>
      ) : (
        <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="stat-card">
            <div className="stat-label">Total Leaves</div>
            <div className="stat-value">{totalLeaves}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Used Leaves</div>
            <div className="stat-value" style={{ color: "#c0392b" }}>{usedLeaves}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Remaining Leaves</div>
            <div className="stat-value green">{remainingLeaves}</div>
          </div>
        </div>
      )}

      

    </div>
  );
}