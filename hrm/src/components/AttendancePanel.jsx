import { useState, useMemo } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import "./AttendancePanel.css";

const ATTENDANCE_QUERY = gql`
  query GetAttendance {
    attendance {
      id
      date
      checkIn
      checkOut
      hoursWorked
      isHoliday
    }
  }
`;

const CHECK_IN = gql`
  mutation CheckIn {
    checkIn {
      id
      date
      checkIn
      checkOut
    }
  }
`;

const CHECK_OUT = gql`
  mutation CheckOut {
    checkOut {
      id
      date
      checkIn
      checkOut
    }
  }
`;

function getTodayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function parseAttendanceTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatLocalTime(isoStr) {
  const parsed = parseAttendanceTimestamp(isoStr);
  if (!parsed) return "—";
  const ist = new Date(parsed.getTime() + 5.5 * 60 * 60 * 1000);
  const h = ist.getUTCHours(); const m = ist.getUTCMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

export default function AttendancePanel() {
  const todayStr = getTodayIST();

  const { data, loading, error } = useQuery(ATTENDANCE_QUERY, {
    fetchPolicy: "network-only",
    pollInterval: 30000,
  });

  const [mutationError, setMutationError] = useState(null);
  const [btnLoading, setBtnLoading] = useState(false);

  const mutationOptions = {
    refetchQueries: [{ query: ATTENDANCE_QUERY }],
    awaitRefetchQueries: true,
  };

  const [checkInMut] = useMutation(CHECK_IN, mutationOptions);
  const [checkOutMut] = useMutation(CHECK_OUT, mutationOptions);

  const attendanceMap = useMemo(() => {
    const map = {};
    (data?.attendance ?? []).forEach((rec) => {
      if (!rec.date) return;
      const key = rec.date.slice(0, 10);
      map[key] = rec;
    });
    return map;
  }, [data]);

  const todayRec = attendanceMap[todayStr] ?? null;
  const isCheckedIn = !!(todayRec?.checkIn && !todayRec?.checkOut);
  const isDone = !!(todayRec?.checkOut);

  const btnLabel = isDone ? "Done ✓" : isCheckedIn ? "Check Out" : "Check In";

  async function handleBtn() {
    if (isDone || btnLoading) return;
    setMutationError(null);
    setBtnLoading(true);

    try {
      if (isCheckedIn) {
        await checkOutMut();
      } else {
        if (!navigator.geolocation) {
          throw new Error("Geolocation is not supported by your browser.");
        }

        const position = await new Promise((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          })
        ).catch((geoErr) => {
          const messages = {
            1: "Location permission denied. Please allow location access and try again.",
            2: "Location unavailable. Check your device GPS or network.",
            3: "Location request timed out. Try again.",
          };
          throw new Error(messages[geoErr.code] || "Could not get your location.");
        });

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (typeof lat !== "number" || typeof lng !== "number") {
          throw new Error("Invalid location data received.");
        }

        await checkInMut({ variables: { lat, lng } });
      }
    } catch (e) {
      setMutationError(e.message || "Something went wrong.");
    } finally {
      setBtnLoading(false);
    }
  }

  const sortedDates = useMemo(
    () => Object.keys(attendanceMap).sort((a, b) => (a < b ? 1 : -1)),
    [attendanceMap]
  );

  if (loading && !data) {
    return (
      <div className="attendance-loading-wrap">
        <div className="attendance-loading-spinner" />
        <span className="attendance-loading-text">Loading attendance…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="attendance-error-full">
        <span style={{ fontSize: 20 }}>⚠️</span>
        <span>{error.message}</span>
      </div>
    );
  }

  const statusConfig = isDone
    ? { label: "Day Completed", dot: "#22c55e", bg: "rgba(34,197,94,0.08)", icon: "✅" }
    : isCheckedIn
      ? { label: "Currently Working", dot: "#f97316", bg: "rgba(249,115,22,0.08)", icon: "🟢" }
      : { label: "Not Checked In Yet", dot: "#9ca3af", bg: "rgba(156,163,175,0.08)", icon: "⚪" };

  return (
    <div className="attendance-wrapper">
      <div className="attendance-page-header">
        <div className="attendance-page-header-left">
          <div className="attendance-page-title">Attendance</div>
          <div className="attendance-page-subtitle">Track your daily check-ins and work hours</div>
        </div>
        <div className="attendance-today-chip">
          📅 {formatDate(todayStr)}
        </div>
      </div>

      <div className="attendance-hero-card">
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
          <div className="attendance-hero-badge" style={{ background: statusConfig.bg }}>
            <span className="attendance-hero-dot" style={{ background: statusConfig.dot }} />
            <span className="attendance-hero-badge-text">{statusConfig.label}</span>
          </div>

          <div className="attendance-hero-time-row">
            <div className="attendance-hero-time-block">
              <div className="attendance-hero-time-label">Check In</div>
              <div className="attendance-hero-time-value">
                {todayRec?.checkIn ? formatLocalTime(todayRec.checkIn) : "—"}
              </div>
            </div>
            <div className="attendance-hero-time-divider" />
            <div className="attendance-hero-time-block">
              <div className="attendance-hero-time-label">Check Out</div>
              <div className="attendance-hero-time-value">
                {todayRec?.checkOut ? formatLocalTime(todayRec.checkOut) : "—"}
              </div>
            </div>
            <div className="attendance-hero-time-divider" />
            <div className="attendance-hero-time-block">
              <div className="attendance-hero-time-label">Hours</div>
              <div className="attendance-hero-time-value">
                {todayRec?.hoursWorked && todayRec.hoursWorked !== "0.00"
                  ? `${todayRec.hoursWorked}h`
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleBtn}
          disabled={isDone || btnLoading}
          style={isDone ? styles.actionBtnDone : isCheckedIn ? styles.actionBtnOut : styles.actionBtnIn}
          className="attendance-action-btn"
        >
          {btnLoading ? <span className="btn-spinner" /> : btnLabel}
        </button>
      </div>

      {mutationError && (
        <div className="attendance-error-box">
          <span>⚠️</span> {mutationError}
        </div>
      )}

      <div className="attendance-table-card">
        <div className="attendance-table-header">
          <div className="attendance-table-title">Attendance History</div>
          <div className="attendance-table-count">{sortedDates.length} records</div>
        </div>

        <div className="attendance-table-wrap">
          <table className="attendance-table">
            <thead>
              <tr>
                {["Date", "In", "Out", "Hours", "Status"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedDates.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-cell">No records yet</td>
                </tr>
              )}

              {sortedDates.map((date, i) => {
                const rec = attendanceMap[date];
                const isToday = date === todayStr;
                const status = rec.isHoliday
                  ? { label: "Holiday", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" }
                  : rec.checkIn
                    ? rec.checkOut
                      ? { label: "Done", color: "#22c55e", bg: "rgba(34,197,94,0.1)" }
                      : { label: "Working", color: "#f97316", bg: "rgba(249,115,22,0.1)" }
                    : { label: "Absent", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };

                return (
                  <tr key={date} className={isToday ? "today-row" : i % 2 === 0 ? "even-row" : ""}>
                    <td>
                      <div className="date-cell">
                        <span>{formatDate(date)}</span>
                        {isToday && <span className="today-badge">Today</span>}
                      </div>
                    </td>
                    <td><span className={rec.checkIn ? "time-in" : "time-dash"}>{formatLocalTime(rec.checkIn)}</span></td>
                    <td><span className={rec.checkOut ? "time-out" : "time-dash"}>{formatLocalTime(rec.checkOut)}</span></td>
                    <td><span className="hours-cell">{rec.hoursWorked && rec.hoursWorked !== "0.00" ? `${rec.hoursWorked}h` : "—"}</span></td>
                    <td>
                      <span className="status-pill" style={{ color: status.color, background: status.bg }}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .attendance-loading-wrap { display: flex; align-items: center; gap: 12px; padding: 40px; justify-content: center; color: #6b7280; }
        .attendance-loading-spinner { width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(220,38,38,0.2); border-top-color: #dc2626; animation: spin 0.7s linear infinite; }
        .attendance-action-btn { padding: 12px 28px; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px; transition: transform 0.1s, opacity 0.15s; }
        .attendance-action-btn:active { transform: scale(0.98); }
        .attendance-action-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-spinner { display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; animation: spin 0.7s linear infinite; }
        
        .attendance-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .attendance-table th { padding: 12px 16px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; background: #f9fafb; }
        .attendance-table td { padding: 12px 16px; border-bottom: 1px solid #f0f0f0; }
        .today-row { background: rgba(220,38,38,0.05); }
        .even-row { background: #fafafa; }
        .date-cell { display: flex; align-items: center; gap: 8px; font-weight: 500; }
        .today-badge { font-size: 10px; font-weight: 700; background: #dc2626; color: #fff; border-radius: 4px; padding: 1px 6px; }
        .time-in { color: #16a34a; font-weight: 600; }
        .time-out { color: #ea580c; font-weight: 600; }
        .time-dash { color: #9ca3af; }
        .hours-cell { font-weight: 600; }
      `}</style>
    </div>
  );
}

const styles = {
  actionBtnIn: { background: "linear-gradient(135deg, #dc2626, #ef4444)", color: "#fff", boxShadow: "0 4px 12px rgba(220,38,38,0.3)" },
  actionBtnOut: { background: "linear-gradient(135deg, #f97316, #fb923c)", color: "#fff", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" },
  actionBtnDone: { background: "#f3f4f6", color: "#9ca3af", boxShadow: "none" },
};