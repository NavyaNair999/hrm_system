import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import DashboardAttendanceAction from "../DashboardAttendanceAction";
import "./AdminDashboard.css";

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

const PENDING_APPROVALS = gql`
  query GetPendingApprovals {
    pendingApprovals {
      id
      status
    }
  }
`;

const ATTENDANCE_REQUESTS = gql`
  query GetAttendanceRequests {
    attendanceRequests {
      id
      status
    }
  }
`;

export default function AdminDashboard({ currentUser, setTab }) {
  const { data: leaveData, loading: leaveLoading } = useQuery(LEAVE_BALANCE);
  const { data: allLeavesData, loading: approvalLoading } = useQuery(PENDING_APPROVALS);
  const { data: attendanceData } = useQuery(ATTENDANCE_REQUESTS);

  const balance = leaveData?.leaveBalance;
  const totalLeaves = balance?.paid ?? 0;
  const usedLeaves = balance?.used ?? 0;
  const remainingLeaves = Math.max(0, totalLeaves - usedLeaves);

  const pendingLeaveCount =
    allLeavesData?.pendingApprovals?.filter((leave) => leave.status === "Pending").length ?? 0;
  const pendingAttendanceCount =
    attendanceData?.attendanceRequests?.filter((request) => request.status === "Pending")
      .length ?? 0;

  const totalApprovals = pendingLeaveCount + pendingAttendanceCount;
  const approvalMessage =
    totalApprovals > 0
      ? `${totalApprovals} items are waiting for your attention today.`
      : "Everything is up to date. No pending approvals right now.";

  return (
    <div className="admin-dashboard">
      <section className="admin-hero">
        <div className="admin-hero-copy">
          <span className="admin-eyebrow">Admin control center</span>
          <h1>Welcome back, {currentUser?.username}</h1>
          <p>
            Keep approvals moving, track your leave balance, and jump into the
            tasks your team needs most.
          </p>
        </div>

      </section>

      <section className="admin-summary-grid">
        <article className="admin-summary-card accent-gold">
          <span className="summary-label">Total Leaves</span>
          <strong className="summary-value">{totalLeaves}</strong>
          <span className="summary-footnote">Allocated to your account</span>
        </article>

        <article className="admin-summary-card accent-coral">
          <span className="summary-label">Used Leaves</span>
          <strong className="summary-value">{usedLeaves}</strong>
          <span className="summary-footnote">Already consumed this cycle</span>
        </article>

        <article className="admin-summary-card accent-green">
          <span className="summary-label">Remaining Leaves</span>
          <strong className="summary-value">{remainingLeaves}</strong>
          <span className="summary-footnote">Available for future requests</span>
        </article>


      </section>

      <DashboardAttendanceAction title="Attendance action" />

      <section className="admin-panel">
        <div className="panel-header">
          <div>
            <h2>Pending approvals</h2>
            <p>{approvalMessage}</p>
          </div>
          {!approvalLoading && totalApprovals > 0 ? (
            <span className="panel-badge">Needs review</span>
          ) : null}
        </div>

        {approvalLoading ? (
          <div className="panel-empty-state">Loading approval queue...</div>
        ) : (
          <div className="approval-grid">
            <button
              type="button"
              className="approval-card leave"
              onClick={() => setTab("leaves")}
            >
              <div className="approval-icon" aria-hidden="true">
                LV
              </div>
              <div className="approval-info">
                <div className="approval-title">Leave requests</div>
                <div className="approval-count">{pendingLeaveCount}</div>
                <div className="approval-meta">Open the leave queue</div>
              </div>
            </button>

            <button
              type="button"
              className="approval-card attendance"
              onClick={() => setTab("attendanceApprovals")}
            >
              <div className="approval-icon" aria-hidden="true">
                AT
              </div>
              <div className="approval-info">
                <div className="approval-title">Attendance adjustments</div>
                <div className="approval-count">{pendingAttendanceCount}</div>
                <div className="approval-meta">
                  {pendingAttendanceCount === 0
                    ? "No employee adjustment requests yet"
                    : "Review attendance activity"}
                </div>
              </div>
            </button>
          </div>
        )}
      </section>

      {leaveLoading ? (
        <div className="admin-inline-note">Refreshing your leave balance...</div>
      ) : null}
    </div>
  );
}