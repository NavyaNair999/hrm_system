// components/ManageLeaves.jsx
import { useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";

const ALL_LEAVES = gql`
  query AllLeaves {
    allLeaves {
      id
      userId
      username
      type
      startDate
      endDate
      days
      reason
      status
    }
  }
`;

const UPDATE_LEAVE_STATUS = gql`
  mutation UpdateLeaveStatus($leaveId: ID!, $status: String!) {
    updateLeaveStatus(leaveId: $leaveId, status: $status)
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

export default function ManageLeaves() {
  const [filter, setFilter] = useState("All");

  const { data, loading, refetch } = useQuery(ALL_LEAVES, {
    fetchPolicy: "network-only",
  });

  const [updateStatus, { loading: updating }] = useMutation(UPDATE_LEAVE_STATUS);

  const allLeaves = data?.allLeaves || [];
  const filtered =
    filter === "All" ? allLeaves : allLeaves.filter((l) => l.status === filter);

  async function handleUpdate(leaveId, status) {
    try {
      await updateStatus({ variables: { leaveId, status } });
      refetch();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Manage Leaves</h1>
        <p>Review and action leave requests from your team</p>
      </div>

      {/* Simple filter tabs */}
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
                      }}
                      title={req.reason}
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
                            onClick={() => handleUpdate(req.id, "Approved")}
                            disabled={updating}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-primary btn-sm btn-reject"
                            onClick={() => handleUpdate(req.id, "Rejected")}
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
    </div>
  );
}