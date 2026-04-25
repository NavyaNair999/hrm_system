import { useMemo, useState } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";

const ATTENDANCE_QUERY = gql`
  query Attendance {
    attendance {
      id
      checkIn
      checkOut
      date
    }
  }
`;

const CHECK_IN = gql`
  mutation CheckIn {
    checkIn {
      id
    }
  }
`;

const CHECK_OUT = gql`
  mutation CheckOut {
    checkOut {
      id
    }
  }
`;

const REQUEST_ATTENDANCE_CORRECTION = gql`
  mutation RequestAttendanceCorrection(
    $date: String!
    $checkIn: String
    $checkOut: String
    $reason: String
  ) {
    requestAttendanceCorrection(
      date: $date
      checkIn: $checkIn
      checkOut: $checkOut
      reason: $reason
    )
  }
`;

function parseAttendanceTimestamp(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const normalized =
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(raw) || !raw.includes("T") ? raw : `${raw}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTime(iso) {
  const parsed = parseAttendanceTimestamp(iso);
  if (!parsed) return "--";
  return parsed.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function toTimeInputValue(iso) {
  const parsed = parseAttendanceTimestamp(iso);
  if (!parsed) return "";
  return parsed.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getTodayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function CorrectionModal({ record, onClose, onSubmit, loading }) {
  const [checkIn, setCheckIn] = useState(() => toTimeInputValue(record?.checkIn));
  const [checkOut, setCheckOut] = useState(() => toTimeInputValue(record?.checkOut));
  const [reason, setReason] = useState("");

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.42)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(92vw, 460px)",
          background: "var(--bg-primary, #fff)",
          borderRadius: 18,
          padding: 24,
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.22)",
        }}
      >
        <h3 style={{ margin: 0, color: "#0f172a" }}>Request attendance correction</h3>
        <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
          Edit the check-in and check-out time for {record.date}. The change will
          only be applied after admin approval.
        </p>

        <label
          style={{
            display: "block",
            marginBottom: 12,
            fontSize: 13,
            fontWeight: 600,
            color: "#334155",
          }}
        >
          Check In
          <input
            type="time"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #dbe2ea",
              boxSizing: "border-box",
            }}
          />
        </label>

        <label
          style={{
            display: "block",
            marginBottom: 12,
            fontSize: 13,
            fontWeight: 600,
            color: "#334155",
          }}
        >
          Check Out
          <input
            type="time"
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            style={{
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #dbe2ea",
              boxSizing: "border-box",
            }}
          />
        </label>

        <label
          style={{
            display: "block",
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
            color: "#334155",
          }}
        >
          Reason
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            placeholder="Explain why the timing needs correction"
            style={{
              width: "100%",
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #dbe2ea",
              boxSizing: "border-box",
              resize: "vertical",
            }}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onSubmit({ checkIn, checkOut, reason })}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmpAttendance() {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [toast, setToast] = useState("");

  const { data, refetch } = useQuery(ATTENDANCE_QUERY, {
    fetchPolicy: "network-only",
  });
  const [checkInMut] = useMutation(CHECK_IN);
  const [checkOutMut] = useMutation(CHECK_OUT);
  const [requestCorrection, { loading: requestLoading }] = useMutation(
    REQUEST_ATTENDANCE_CORRECTION
  );

  const attendanceMap = useMemo(() => {
    const map = {};
    data?.attendance?.forEach((record) => {
      map[record.date] = record;
    });
    return map;
  }, [data]);

  const changeMonth = (offset) => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    const now = new Date();
    if (next > new Date(now.getFullYear(), now.getMonth() + 1, 0)) return;
    setViewDate(next);
  };

  const getDaysInMonth = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(year, month, index + 1);
      return {
        dateStr: date.toISOString().split("T")[0],
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        isSunday: date.getDay() === 0,
        isFuture: date > new Date(),
      };
    });
  };

  const todayStr = getTodayIST();
  const todayRec = attendanceMap[todayStr];
  const isCheckedIn = !!(todayRec?.checkIn && !todayRec?.checkOut);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  }

  async function submitCorrection({ checkIn, checkOut, reason }) {
    if (!reason.trim()) {
      showToast("Please add a reason for the correction request.");
      return;
    }

    const toIso = (date, time) => (time ? `${date}T${time}:00+05:30` : null);

    try {
      await requestCorrection({
        variables: {
          date: selectedRecord.date,
          checkIn: toIso(selectedRecord.date, checkIn),
          checkOut: toIso(selectedRecord.date, checkOut),
          reason,
        },
      });
      setSelectedRecord(null);
      showToast("Attendance correction request submitted.");
    } catch (error) {
      showToast(error.message || "Unable to submit request.");
    }
  }

  async function handleCheckIn() {
    try {
      await checkInMut();
      await refetch();
    } catch (error) {
      showToast(error.message || "Unable to check in.");
    }
  }

  async function handleCheckOut() {
    try {
      await checkOutMut();
      await refetch();
    } catch (error) {
      showToast(error.message || "Unable to check out.");
    }
  }

  return (
    <div className="attendance-container">
      <div className="page-header">
        <h1>My Attendance</h1>
        <p>Use the edit icon to request a correction. Changes apply only after admin approval.</p>
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginTop: "10px" }}>
          <button className="btn-secondary btn-sm" onClick={() => changeMonth(-1)}>
            {"<"}
          </button>
          <h2 style={{ margin: 0 }}>
            {viewDate.toLocaleString("default", { month: "long" })} {viewDate.getFullYear()}
          </h2>
          <button className="btn-secondary btn-sm" onClick={() => changeMonth(1)}>
            {">"}
          </button>
        </div>
      </div>

      {toast ? (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            background: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {toast}
        </div>
      ) : null}

      <div className="check-status-bar">
        <div className={`cstatus-dot ${isCheckedIn ? "active" : ""}`} />
        <div className="cstatus-text">{isCheckedIn ? "Working" : "Not Active"}</div>
        <div className="cstatus-spacer" />
        {!isCheckedIn ? (
          <button
            className="btn-primary"
            onClick={handleCheckIn}
            disabled={!!todayRec?.checkOut}
          >
            {todayRec?.checkOut ? "Done for Today" : "Check In"}
          </button>
        ) : (
          <button className="btn-primary" onClick={handleCheckOut}>
            Check Out
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Status</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {getDaysInMonth().map((day) => {
                const record = attendanceMap[day.dateStr];
                const isToday = day.dateStr === todayStr;

                let status = <span className="badge badge-rejected">Absent</span>;
                if (record?.checkIn) status = <span className="badge badge-approved">Present</span>;
                if (day.isSunday) status = <span style={{ color: "#aaa" }}>Weekly Off</span>;
                if (day.isFuture) status = <span style={{ color: "#eee" }}>--</span>;

                const canEdit = !day.isSunday && !day.isFuture;

                return (
                  <tr key={day.dateStr} style={isToday ? { backgroundColor: "#fff5f5" } : {}}>
                    <td>{day.dateStr}</td>
                    <td>{day.dayName}</td>
                    <td>{formatTime(record?.checkIn)}</td>
                    <td>{formatTime(record?.checkOut)}</td>
                    <td>{status}</td>
                    <td>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRecord({
                              date: day.dateStr,
                              checkIn: record?.checkIn ?? null,
                              checkOut: record?.checkOut ?? null,
                            })
                          }
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            cursor: "pointer",
                            fontSize: 15,
                          }}
                          title="Request attendance correction"
                        >
                          &#9998;
                        </button>
                      ) : (
                        <span style={{ color: "#cbd5e1" }}>--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRecord ? (
        <CorrectionModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSubmit={submitCorrection}
          loading={requestLoading}
        />
      ) : null}
    </div>
  );
}
