import { useMemo, useState } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";

const ATTENDANCE_REQUESTS = gql`
  query GetAttendanceApprovalRequests {
    attendanceRequests {
      id
      username
      date
      requestedCheckIn
      requestedCheckOut
      reason
      status
      createdAt
    }
  }
`;

const UPDATE_ATTENDANCE_REQUEST_STATUS = gql`
  mutation UpdateAttendanceRequestStatus($requestId: ID!, $status: String!) {
    updateAttendanceRequestStatus(requestId: $requestId, status: $status)
  }
`;

function parseAttendanceTimestamp(value) {
  if (!value) return null;
  const raw = String(value).trim();

  // Backend request timestamps may arrive either as full ISO values with an
  // explicit timezone or as plain IST wall-clock strings like 2026-05-01T10:10:00.
  // If we append "Z" to the latter, the browser treats them as UTC and shifts
  // the display by +5:30 in production. Zone-less values are therefore treated
  // as IST explicitly.
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw)
    ? raw
    : raw.includes("T")
    ? `${raw}+05:30`
    : raw;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTime(value) {
  const parsed = parseAttendanceTimestamp(value);
  if (!parsed) return "--";
  return parsed.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(value) {
  if (!value) return "--";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminAttendanceRequests({ onBack }) {
  const [toast, setToast] = useState("");
  const { data, loading, refetch } = useQuery(ATTENDANCE_REQUESTS, {
    fetchPolicy: "network-only",
  });
  const [updateStatus, { loading: actionLoading }] = useMutation(
    UPDATE_ATTENDANCE_REQUEST_STATUS
  );

  const requests = useMemo(() => {
    const rows = data?.attendanceRequests ?? [];
    return [...rows].sort((left, right) => {
      if (left.status === right.status) {
        return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
      }
      if (left.status === "Pending") return -1;
      if (right.status === "Pending") return 1;
      return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
    });
  }, [data]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }

  async function handleAction(requestId, status) {
    try {
      const response = await updateStatus({
        variables: { requestId, status },
      });
      showToast(response.data?.updateAttendanceRequestStatus || `Request ${status}`);
      await refetch();
    } catch (error) {
      showToast(error.message || "Unable to update request");
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Attendance Approval Requests</h1>
        <p>Review employee correction requests and approve or reject the changes.</p>
      </div>

      <button
        type="button"
        onClick={onBack}
        style={{
          marginBottom: 16,
          background: "none",
          border: "none",
          padding: 0,
          color: "#64748b",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {"<"} Back to dashboard
      </button>

      {toast ? (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            background: "#fff7ed",
            color: "#9a3412",
            border: "1px solid #fed7aa",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {toast}
        </div>
      ) : null}

      <div className="card">
        {loading ? (
          <div style={{ color: "#aaa", padding: "2rem", textAlign: "center" }}>
            Loading attendance requests...
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Requested Check In</th>
                  <th>Requested Check Out</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", color: "#aaa", padding: "2rem" }}>
                      No attendance correction requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id}>
                      <td style={{ fontWeight: 600 }}>{request.username || "--"}</td>
                      <td>{formatDate(request.date)}</td>
                      <td>{formatTime(request.requestedCheckIn)}</td>
                      <td>{formatTime(request.requestedCheckOut)}</td>
                      <td
                        style={{
                          maxWidth: 220,
                          whiteSpace: "normal",
                          lineHeight: 1.5,
                          color: "#475569",
                        }}
                      >
                        {request.reason || "--"}
                      </td>
                      <td>
                        <span className={`badge badge-${request.status?.toLowerCase()}`}>
                          {request.status}
                        </span>
                      </td>
                      <td>
                        {request.status === "Pending" ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              className="btn-primary btn-sm btn-approve"
                              onClick={() => handleAction(request.id, "Approved")}
                              disabled={actionLoading}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn-primary btn-sm btn-reject"
                              onClick={() => handleAction(request.id, "Rejected")}
                              disabled={actionLoading}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>Closed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
