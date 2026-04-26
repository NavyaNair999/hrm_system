//This file contains the ManageLeaves component which allows admins to view, filter, and take action on employee leave requests. 
// It uses GraphQL queries and mutations to fetch leave data and update leave statuses. 
// The component also includes a simple UI for filtering leave requests by status and displaying them in a table format.


import { useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";

const GET_PENDING_LEAVES = gql`
  query GetPendingApprovals {
    pendingApprovals { 
      id
      userId
      username
      type
      startDate
      endDate
      days
      reason
      status
      managerRemark
      applicationDate
    }
  }
`;

const UPDATE_LEAVE_STATUS = gql`
  mutation UpdateLeaveStatus($leaveId: ID!, $status: String!, $remark: String) {
    updateLeaveStatus(leaveId: $leaveId, status: $status, remark: $remark)
  }
`;

function initials(name) {
  if (!name) return "?";
  return name
    .split(/[\s._]/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const FILTERS = ["All", "Pending", "Approved", "Rejected"];

function RemarkModal({ isOpen, onClose, onConfirm, actionType, remark, setRemark, updating }) {
  if (!isOpen) return null;

  const isApprove = actionType === 'approve';
  const title = isApprove ? 'Approve Leave Request' : 'Reject Leave Request';
  const buttonText = remark.trim() ? `${isApprove ? 'Approve' : 'Reject'} with Remark` : `${isApprove ? 'Approve' : 'Reject'} without Remark`;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1300,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-primary, #fff)",
          borderRadius: 16,
          padding: "24px",
          width: "90%",
          maxWidth: 400,
          boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
        }}
      >
        <h3 style={{ margin: 0, marginBottom: 16, fontSize: 18, fontWeight: 600, color: "var(--text-primary, #111)" }}>
          {title}
        </h3>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: "var(--text-primary, #111)", marginBottom: 8 }}>
            Remark 
          </label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Add a remark for this action..."
            style={{
              width: "100%",
              minHeight: 80,
              borderRadius: 8,
              border: "1px solid var(--border-color, #e0e0e0)",
              padding: "10px 12px",
              fontSize: 14,
              color: "var(--text-primary, #111)",
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontSize: 14,
              color: "#666"
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(remark); onClose(); }}
            disabled={updating}
            style={{
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              background: isApprove ? "#22c55e" : "#ef4444",
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500
            }}
          >
            {updating ? 'Processing...' : buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeaveDetailModal({ leave, onClose, onApprove, onReject, updating }) {
  if (!leave) return null;

  const statusColor = {
    Pending: { bg: "#fff8e1", color: "#b45309", border: "#fcd34d" },
    Approved: { bg: "#e8f8ef", color: "#1a7a4a", border: "#abebc6" },
    Rejected: { bg: "#fdecea", color: "#c0392b", border: "#f5c6cb" },
  }[leave.status] || { bg: "#f5f5f5", color: "#888", border: "#ddd" };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1200,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-primary, #fff)",
          borderRadius: 16,
          padding: "32px",
          width: "92%",
          maxWidth: 480,
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="hrm-avatar" style={{ width: 44, height: 44, fontSize: 15 }}>
              {initials(leave.username)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary, #111)" }}>
                {leave.username}
              </div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                Leave Request #{leave.id}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#aaa", lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>

        {/* Status badge */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            display: "inline-block",
            padding: "4px 14px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            background: statusColor.bg,
            color: statusColor.color,
            border: `1px solid ${statusColor.border}`,
          }}>
            {leave.status}
          </span>
        </div>

        {/* Details grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "0 24px",
          borderTop: "1px solid var(--border-color, #f0f0f0)",
          marginBottom: 20,
        }}>
          {[
            { label: "Leave Type", value: leave.type },
            { label: "Days", value: leave.days },
            { label: "Start Date", value: leave.startDate },
            { label: "End Date", value: leave.endDate },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: "14px 0", borderBottom: "1px solid var(--border-color, #f0f0f0)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary, #111)" }}>
                {value || "—"}
              </div>
            </div>
          ))}
        </div>

        {/* Full reason */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
            Reason
          </div>
          <div style={{
            fontSize: 13, lineHeight: 1.7,
            color: "var(--text-primary, #111)",
            background: "var(--bg-secondary, #fafafa)",
            border: "1px solid var(--border-color, #f0f0f0)",
            borderRadius: 10,
            padding: "14px 16px",
            whiteSpace: "pre-wrap",
          }}>
            {leave.reason || "No reason provided."}
          </div>
        </div>

        {/* Actions */}
        {leave.status === "Pending" ? (
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 13 }}
            >
              Close
            </button>
            <button
              className="btn-primary btn-sm btn-reject"
              onClick={() => onReject(leave.id)}
              disabled={updating}
              style={{ padding: "9px 20px", fontSize: 13 }}
            >
              Reject
            </button>
            <button
              className="btn-primary btn-sm btn-approve"
              onClick={() => onApprove(leave.id)}
              disabled={updating}
              style={{ padding: "9px 20px", fontSize: 13 }}
            >
              Approve
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 13 }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export default function ManageLeaves() {
  const [filter, setFilter] = useState("All");
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [remark, setRemark] = useState("");
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const { data, loading, refetch } = useQuery(GET_PENDING_LEAVES, {
    fetchPolicy: "network-only",
  });

  const [updateStatus, { loading: updating }] = useMutation(UPDATE_LEAVE_STATUS);
  const allLeaves = data?.pendingApprovals || [];
const filtered =
    filter === "All" ? allLeaves : allLeaves.filter((l) => l.status === filter);

  async function handleUpdate(leaveId, status, remark = null) {
    try {
      await updateStatus({ variables: { leaveId, status, remark } });
      setSelectedLeave(null);
      setRemark("");
      setShowRemarkModal(false);
      setPendingAction(null);
      refetch();
    } catch (e) {
      alert(e.message);
    }
  }

  function handleActionClick(actionType, leaveId) {
    setPendingAction({ type: actionType, leaveId });
    setRemark("");
    setShowRemarkModal(true);
  }

  function handleRemarkConfirm(remarkValue) {
    if (pendingAction) {
      const status = pendingAction.type === 'approve' ? 'Approved' : 'Rejected';
      handleUpdate(pendingAction.leaveId, status, remarkValue);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Manage Leaves</h1>
        <p>Review and action leave requests from your team</p>
      </div>


      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 18px",
              borderRadius: 20,
              border: filter === f ? "none" : "1px solid #e5c6c6",
              background: filter === f ? "#c0392b" : "#fff",
              color: filter === f ? "#fff" : "#444",
              fontWeight: filter === f ? 600 : 400,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {f}
            <span
              style={{
                marginLeft: 6,
                background: filter === f ? "rgba(255,255,255,0.25)" : "#f5e5e5",
                color: filter === f ? "#fff" : "#c0392b",
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {f === "All"
                ? allLeaves.length
                : allLeaves.filter((l) => l.status === f).length}
            </span>
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ color: "#aaa", padding: "2rem", textAlign: "center" }}>
            Loading leave requests...
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ textAlign: "center", color: "#aaa", padding: "2rem" }}
                    >
                      No leave requests found.
                    </td>
                  </tr>
                )}
                {filtered.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          className="hrm-avatar"
                          style={{ width: 28, height: 28, fontSize: 10 }}
                        >
                          {initials(req.username)}
                        </div>
                        {req.username}
                      </div>
                    </td>
                    <td>{req.type || "—"}</td>
                    <td style={{ color: "#888" }}>{req.startDate || "—"}</td>
                    <td style={{ color: "#888" }}>{req.endDate || "—"}</td>
                    <td>{req.days}</td>
                    <td
                      style={{
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "#c0392b",
                        cursor: "pointer",
                        textDecoration: "underline dotted",
                      }}
                      onClick={() => {
                        setSelectedLeave(req);
                        setRemark("");
                      }}
                      title="Click to view full reason"
                    >
                      {req.reason}
                    </td>
                    <td>
                      <span className={`badge badge-${req.status?.toLowerCase()}`}>
                        {req.status}
                      </span>
                    </td>
                    <td>
                      {req.status === "Pending" ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn-primary btn-sm btn-approve"
                            onClick={() => handleActionClick('approve', req.id)}
                            disabled={updating}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-primary btn-sm btn-reject"
                            onClick={() => handleActionClick('reject', req.id)}
                            disabled={updating}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#aaa", fontSize: 13 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <LeaveDetailModal
        leave={selectedLeave}
        onClose={() => { setSelectedLeave(null); setRemark(""); }}
        onApprove={(id) => handleActionClick('approve', id)}
        onReject={(id) => handleActionClick('reject', id)}
        updating={updating}
      />
      <RemarkModal
        isOpen={showRemarkModal}
        onClose={() => { setShowRemarkModal(false); setPendingAction(null); setRemark(""); }}
        onConfirm={handleRemarkConfirm}
        actionType={pendingAction?.type}
        remark={remark}
        setRemark={setRemark}
        updating={updating}
      />
    </div>
  );
}