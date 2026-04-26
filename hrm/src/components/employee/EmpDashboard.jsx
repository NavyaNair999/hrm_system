import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import DashboardAttendanceAction from "../DashboardAttendanceAction";
import "./EmpDashboard.css";

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

export default function EmpDashboard({ currentUser, setTab }) {
  const { data: balanceData, loading } = useQuery(LEAVE_BALANCE);
  const balance = balanceData?.leaveBalance;

  const totalLeaves = balance?.paid ?? 0;
  const usedLeaves = balance?.used ?? 0;
  const earnedRemaining = Math.max(0, totalLeaves - usedLeaves);
  const sickLeaves = balance?.casual ?? 0;
  const chartTotal = Math.max(earnedRemaining + sickLeaves, 1);
  const earnedPercent = (earnedRemaining / chartTotal) * 100;
  const sickPercent = (sickLeaves / chartTotal) * 100;
  const pieBackground =
    sickLeaves > 0 && earnedRemaining > 0
      ? `conic-gradient(#2563eb 0% ${earnedPercent}%, #f97316 ${earnedPercent}% 100%)`
      : earnedRemaining > 0
      ? "#2563eb"
      : sickLeaves > 0
      ? "#f97316"
      : "#e2e8f0";

  return (
    <div className="emp-dashboard">
      <div className="page-header">
        <h1>Welcome back, {currentUser?.username} 👋</h1>
        <p>Here&apos;s a summary of your work status</p>
      </div>

      {loading ? (
        <div style={{ color: "#aaa", padding: "1rem" }}>Loading leave data...</div>
      ) : (
        <section className="leave-visual-section">
          <article className="leave-chart-card">
            <div className="leave-card-header">
              <div>
                <span className="leave-eyebrow">Leave summary</span>
                <h2>Leave balance overview</h2>
                <p>Track your remaining earned and sick leaves at a glance.</p>
              </div>
            </div>

            <div className="leave-chart-wrap">
              <div className="leave-chart-shell">
                <div
                  className="leave-chart"
                  role="img"
                  aria-label="Pie chart showing earned leave in blue and sick leave in orange"
                  style={{ background: pieBackground }}
                >
                  <div className="leave-chart-core" />
                </div>

                <div className="leave-chart-center">
                  <strong>{earnedRemaining + sickLeaves}</strong>
                  <span>days left</span>
                </div>
              </div>

              <div className="leave-chart-legend">
                <div className="leave-legend-item">
                  <span className="legend-dot earned" />
                  <div>
                    <strong>Earned Leave</strong>
                    <small>{earnedRemaining} remaining</small>
                  </div>
                </div>
                <div className="leave-legend-item">
                  <span className="legend-dot sick" />
                  <div>
                    <strong>Sick Leave</strong>
                    <small>{sickLeaves} available</small>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <aside className="leave-quick-apply">
            <span className="leave-eyebrow">Quick apply</span>
            <h3>Need time off?</h3>
            <p>
              Open the leave application form directly and submit a new request
              in one step.
            </p>
            <button
              type="button"
              className="leave-apply-button"
              onClick={() => setTab("applyLeave")}
            >
              Apply for Leave
            </button>
          </aside>
        </section>
      )}

      <DashboardAttendanceAction title="Attendance action" />
    </div>
  );
}
