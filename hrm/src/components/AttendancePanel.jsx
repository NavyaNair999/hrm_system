// components/AttendancePanel.jsx
// Shared by both Admin and Employee – same UI, same logic
import { useState, useMemo } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";

const ATTENDANCE_QUERY = gql`
  query Attendance {
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

const HOLIDAYS_QUERY = gql`
  query Holidays {
    holidays {
      date
      description
    }
  }
`;

const CHECK_IN = gql`mutation CheckIn { checkIn }`;
const CHECK_OUT = gql`mutation CheckOut { checkOut }`;

// Format "HH:MM:SS" → "10:30 AM"
function formatTime(timeStr) {
  if (!timeStr) return "—";
  // If it looks like a full ISO string, extract time part
  const t = timeStr.includes("T") ? timeStr.split("T")[1] : timeStr;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Format date string "2026-04-17" → "17 April 2026"
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

const START_DATE = "2026-04-17";

export default function AttendancePanel() {
  const todayStr = new Date().toISOString().split("T")[0];

  // viewMonth tracks which month we're viewing (YYYY-MM)
  const startMonthDate = new Date(2026, 3, 1); // April 2026
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(3); // 0-indexed → April

  const { data, loading, refetch } = useQuery(ATTENDANCE_QUERY, {
    fetchPolicy: "network-only",
  });
  const { data: holidayData } = useQuery(HOLIDAYS_QUERY);

  const [checkInMut, { loading: checkingIn }] = useMutation(CHECK_IN);
  const [checkOutMut, { loading: checkingOut }] = useMutation(CHECK_OUT);

  // Build a map: dateStr → attendance record
  const attendanceMap = useMemo(() => {
    const map = {};
    data?.attendance?.forEach((rec) => {
      if (rec.date) map[rec.date] = rec;
    });
    return map;
  }, [data]);

  // Build a set of holiday dates
  const holidaySet = useMemo(() => {
    const s = new Set();
    holidayData?.holidays?.forEach((h) => s.add(h.date));
    return s;
  }, [holidayData]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const nowDate = new Date();
  const nowYear = nowDate.getFullYear();
  const nowMonth = nowDate.getMonth(); // 0-indexed

  function prevMonth() {
    // Can't go before April 2026
    if (viewYear === 2026 && viewMonth === 3) return;
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    // Can't go beyond current month
    if (viewYear === nowYear && viewMonth === nowMonth) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const canGoPrev = !(viewYear === 2026 && viewMonth === 3);
  const canGoNext = !(viewYear === nowYear && viewMonth === nowMonth);

  // ── Build rows for the current viewed month ─────────────────────────────────
  const rows = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const result = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      // Skip dates before our start date
      if (dateStr < START_DATE) continue;

      const dayOfWeek = new Date(viewYear, viewMonth, d).getDay(); // 0=Sun
      const isSunday = dayOfWeek === 0;
      const isHoliday = holidaySet.has(dateStr);
      const isFuture = dateStr > todayStr;
      const isToday = dateStr === todayStr;
      const rec = attendanceMap[dateStr];

      result.push({ dateStr, isSunday, isHoliday, isFuture, isToday, rec });
    }
    return result;
  }, [viewYear, viewMonth, attendanceMap, holidaySet, todayStr]);

  // ── Today's check-in state ──────────────────────────────────────────────────
  const todayRec = attendanceMap[todayStr];
  const isTodayHoliday = holidaySet.has(todayStr);
  const isTodaySunday = new Date().getDay() === 0;
  const isCheckedIn = !!(todayRec?.checkIn && !todayRec?.checkOut);
  const isDone = !!todayRec?.checkOut;

  async function handleCheckIn() {
    try {
      await checkInMut();
      refetch();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleCheckOut() {
    try {
      await checkOutMut();
      refetch();
    } catch (e) {
      alert(e.message);
    }
  }

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString("default", {
    month: "long",
  });

  // Button label + disabled logic
  let btnLabel = "Check In";
  let btnDisabled = checkingIn || checkingOut || isTodayHoliday || isTodaySunday;
  if (isDone) { btnLabel = "Done for Today"; btnDisabled = true; }
  else if (isCheckedIn) { btnLabel = checkingOut ? "Checking Out..." : "Check Out"; }
  else if (checkingIn) { btnLabel = "Checking In..."; }

  function handleBtn() {
    if (isCheckedIn) handleCheckOut();
    else handleCheckIn();
  }

  return (
    <div>
      {/* ── Top Check-In Bar ── */}
      <div
        className="check-status-bar"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "#fff",
          border: "1px solid #f0dada",
          borderRadius: 10,
          padding: "14px 20px",
          marginBottom: 20,
        }}
      >
        <div
          className={`cstatus-dot${isCheckedIn ? " active" : ""}`}
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: isCheckedIn ? "#1a7a4a" : isDone ? "#888" : "#c0392b",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>
            {isTodayHoliday
              ? "Today is a Holiday"
              : isTodaySunday
              ? "Today is Sunday (Weekly Off)"
              : isDone
              ? "Attendance marked for today"
              : isCheckedIn
              ? "Currently Working"
              : "Not Checked In"}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            {todayRec?.checkIn && `In: ${formatTime(todayRec.checkIn)}`}
            {todayRec?.checkOut && `  ·  Out: ${formatTime(todayRec.checkOut)}`}
            {todayRec?.hoursWorked && todayRec.hoursWorked !== "0.00" && (
              <span style={{ marginLeft: 8, color: "#1a7a4a" }}>
                ({todayRec.hoursWorked} hrs)
              </span>
            )}
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={handleBtn}
          disabled={btnDisabled}
          style={{ minWidth: 120, opacity: btnDisabled ? 0.6 : 1 }}
        >
          {btnLabel}
        </button>
      </div>

      {/* ── Month Navigation ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 14,
        }}
      >
        <button
          className="btn-secondary btn-sm"
          onClick={prevMonth}
          disabled={!canGoPrev}
          style={{ opacity: canGoPrev ? 1 : 0.3 }}
        >
          ← Prev
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#2d0a0a" }}>
          {monthName} {viewYear}
        </span>
        <button
          className="btn-secondary btn-sm"
          onClick={nextMonth}
          disabled={!canGoNext}
          style={{ opacity: canGoNext ? 1 : 0.3 }}
        >
          Next →
        </button>
      </div>

      {/* ── Attendance Table ── */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours Worked</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#aaa", padding: "2rem" }}>
                    Loading attendance...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#aaa", padding: "2rem" }}>
                    No records for this month.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map(({ dateStr, isSunday, isHoliday, isFuture, isToday, rec }) => {
                  let statusEl;
                  if (isHoliday) {
                    statusEl = (
                      <span
                        style={{
                          background: "#fdf0e0",
                          color: "#c07000",
                          borderRadius: 6,
                          padding: "2px 10px",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Holiday
                      </span>
                    );
                  } else if (isSunday) {
                    statusEl = <span style={{ color: "#aaa", fontSize: 13 }}>Weekly Off</span>;
                  } else if (isFuture) {
                    statusEl = <span style={{ color: "#ddd", fontSize: 13 }}>—</span>;
                  } else if (rec?.checkIn) {
                    statusEl = (
                      <span className="badge badge-approved">Present</span>
                    );
                  } else {
                    statusEl = <span className="badge badge-rejected">Absent</span>;
                  }

                  return (
                    <tr
                      key={dateStr}
                      style={
                        isToday
                          ? { background: "#fff8f8", fontWeight: 600 }
                          : isHoliday
                          ? { background: "#fffbf0" }
                          : {}
                      }
                    >
                      <td style={{ whiteSpace: "nowrap" }}>{formatDate(dateStr)}</td>
                      <td>
                        {isHoliday
                          ? "—"
                          : isSunday
                          ? "—"
                          : formatTime(rec?.checkIn)}
                      </td>
                      <td>
                        {isHoliday
                          ? "—"
                          : isSunday
                          ? "—"
                          : formatTime(rec?.checkOut)}
                      </td>
                      <td>
                        {rec?.hoursWorked && rec.hoursWorked !== "0.00"
                          ? `${rec.hoursWorked} hrs`
                          : "—"}
                      </td>
                      <td>{statusEl}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}