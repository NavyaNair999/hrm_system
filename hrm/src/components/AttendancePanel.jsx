import { useState, useMemo } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";


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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  return istTime.toISOString().split("T")[0];
}

function formatTime(isoStr) {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

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

  const [checkInMut]  = useMutation(CHECK_IN,  mutationOptions);
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

  const todayRec    = attendanceMap[todayStr] ?? null;
  const isCheckedIn = !!(todayRec?.checkIn && !todayRec?.checkOut);
  const isDone      = !!(todayRec?.checkOut);

  const btnLabel = isDone ? "Done ✓" : isCheckedIn ? "Check Out" : "Check In";

  async function handleBtn() {
    if (isDone || btnLoading) return;
    setMutationError(null);
    setBtnLoading(true);
    try {
      if (isCheckedIn) {
        await checkOutMut();
      } else {
        await checkInMut();
      }
    } catch (e) {
      setMutationError(e.message);
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
      <div style={styles.loadingWrap}>
        <div style={styles.loadingSpinner} />
        <span style={styles.loadingText}>Loading attendance…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorFull}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <span>{error.message}</span>
      </div>
    );
  }

  // Derive status info for the hero card
  const statusConfig = isDone
    ? { label: "Day Completed", dot: "#22c55e", bg: "rgba(34,197,94,0.08)", icon: "✅" }
    : isCheckedIn
    ? { label: "Currently Working", dot: "#f97316", bg: "rgba(249,115,22,0.08)", icon: "🟢" }
    : { label: "Not Checked In Yet", dot: "#9ca3af", bg: "rgba(156,163,175,0.08)", icon: "⚪" };

  return (
    <div style={styles.wrapper}>

      {/* ── Page Header ── */}
      <div style={styles.pageHeader}>
        <div style={styles.pageHeaderLeft}>
          <div style={styles.pageTitle}>Attendance</div>
          <div style={styles.pageSubtitle}>Track your daily check-ins and work hours</div>
        </div>
        <div style={styles.todayChip}>
          📅 {formatDate(todayStr)}
        </div>
      </div>

      {/* ── Today's Hero Card ── */}
      <div style={styles.heroCard}>
        <div style={{ ...styles.heroBadge, background: statusConfig.bg }}>
          <span style={{ ...styles.heroDot, background: statusConfig.dot }} />
          <span style={styles.heroBadgeText}>{statusConfig.label}</span>
        </div>

        <div style={styles.heroTimeRow}>
          <div style={styles.heroTimeBlock}>
            <div style={styles.heroTimeLabel}>Check In</div>
            <div style={styles.heroTimeValue}>
              {todayRec?.checkIn ? formatTime(todayRec.checkIn) : "—"}
            </div>
          </div>
          <div style={styles.heroTimeDivider} />
          <div style={styles.heroTimeBlock}>
            <div style={styles.heroTimeLabel}>Check Out</div>
            <div style={styles.heroTimeValue}>
              {todayRec?.checkOut ? formatTime(todayRec.checkOut) : "—"}
            </div>
          </div>
          <div style={styles.heroTimeDivider} />
          <div style={styles.heroTimeBlock}>
            <div style={styles.heroTimeLabel}>Hours Worked</div>
            <div style={styles.heroTimeValue}>
              {todayRec?.hoursWorked && todayRec.hoursWorked !== "0.00"
                ? `${todayRec.hoursWorked}h`
                : "—"}
            </div>
          </div>
        </div>

        <button
          onClick={handleBtn}
          disabled={isDone || btnLoading}
          style={{
            ...styles.actionBtn,
            ...(isDone
              ? styles.actionBtnDone
              : isCheckedIn
              ? styles.actionBtnOut
              : styles.actionBtnIn),
          }}
        >
          {btnLoading ? (
            <span style={styles.btnSpinner} />
          ) : (
            btnLabel
          )}
        </button>
      </div>

      {/* ── Error message ── */}
      {mutationError && (
        <div style={styles.errorBox}>
          <span>⚠️</span> {mutationError}
        </div>
      )}

      {/* ── History Table ── */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <div style={styles.tableTitle}>Attendance History</div>
          <div style={styles.tableCount}>{sortedDates.length} records</div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["Date", "Check In", "Check Out", "Hours", "Status"].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedDates.length === 0 && (
                <tr>
                  <td colSpan={5} style={styles.emptyCell}>
                    No attendance records yet
                  </td>
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
                  <tr
                    key={date}
                    style={{
                      ...styles.tr,
                      ...(isToday ? styles.todayRow : {}),
                      ...(i % 2 === 0 && !isToday ? styles.evenRow : {}),
                    }}
                  >
                    <td style={styles.td}>
                      <div style={styles.dateCell}>
                        <span>{formatDate(date)}</span>
                        {isToday && <span style={styles.todayBadge}>Today</span>}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={rec.checkIn ? styles.timeIn : styles.timeDash}>
                        {formatTime(rec.checkIn)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={rec.checkOut ? styles.timeOut : styles.timeDash}>
                        {formatTime(rec.checkOut)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.hoursCell}>
                        {rec.hoursWorked && rec.hoursWorked !== "0.00"
                          ? `${rec.hoursWorked} hrs`
                          : "—"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusPill,
                        color: status.color,
                        background: status.bg,
                      }}>
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
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const RED = "#dc2626";
const RED_LIGHT = "rgba(220,38,38,0.08)";
const RED_BORDER = "rgba(220,38,38,0.2)";

const styles = {
  wrapper: {
    padding: "28px 32px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    maxWidth: 900,
    color: "var(--text-primary, #111)",
  },

  // ── Loading / Error ──
  loadingWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 40,
    justifyContent: "center",
    color: "#6b7280",
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: `2px solid ${RED_BORDER}`,
    borderTopColor: RED,
    animation: "spin 0.7s linear infinite",
  },
  loadingText: {
    fontSize: 14,
  },
  errorFull: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 24,
    background: "rgba(239,68,68,0.07)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 10,
    color: "#b91c1c",
    fontSize: 14,
  },

  // ── Page Header ──
  pageHeader: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  pageHeaderLeft: {},
  pageTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: "var(--text-primary, #111)",
    letterSpacing: "-0.3px",
  },
  pageSubtitle: {
    fontSize: 13,
    color: "var(--text-secondary, #6b7280)",
    marginTop: 3,
  },
  todayChip: {
    fontSize: 13,
    fontWeight: 600,
    color: RED,
    background: RED_LIGHT,
    border: `1px solid ${RED_BORDER}`,
    borderRadius: 20,
    padding: "5px 14px",
  },

  // ── Hero Card ──
  heroCard: {
    background: "var(--bg-primary, #fff)",
    border: `1px solid var(--border-color, #e5e7eb)`,
    borderRadius: 14,
    padding: "24px 28px",
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    borderLeft: `4px solid ${RED}`,
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "5px 12px",
    borderRadius: 20,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary, #374151)",
  },
  heroTimeRow: {
    display: "flex",
    alignItems: "center",
    gap: 0,
    flex: 1,
  },
  heroTimeBlock: {
    textAlign: "center",
    padding: "0 24px",
  },
  heroTimeLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--text-tertiary, #9ca3af)",
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    marginBottom: 4,
  },
  heroTimeValue: {
    fontSize: 20,
    fontWeight: 700,
    color: "var(--text-primary, #111)",
    letterSpacing: "-0.3px",
  },
  heroTimeDivider: {
    width: 1,
    height: 36,
    background: "var(--border-color, #e5e7eb)",
  },

  // ── Action Button ──
  actionBtn: {
    padding: "10px 28px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: "0.2px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "transform 0.1s, opacity 0.15s",
    flexShrink: 0,
  },
  actionBtnIn: {
    background: `linear-gradient(135deg, ${RED}, #ef4444)`,
    color: "#fff",
    boxShadow: `0 4px 12px rgba(220,38,38,0.3)`,
  },
  actionBtnOut: {
    background: "linear-gradient(135deg, #f97316, #fb923c)",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(249,115,22,0.3)",
  },
  actionBtnDone: {
    background: "#f3f4f6",
    color: "#9ca3af",
    cursor: "not-allowed",
    boxShadow: "none",
  },
  btnSpinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.4)",
    borderTopColor: "#fff",
    animation: "spin 0.7s linear infinite",
  },

  // ── Error Box ──
  errorBox: {
    background: "rgba(239,68,68,0.07)",
    color: "#b91c1c",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 8,
    padding: "10px 16px",
    marginBottom: 16,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  // ── Table Card ──
  tableCard: {
    background: "var(--bg-primary, #fff)",
    border: "1px solid var(--border-color, #e5e7eb)",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  tableHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid var(--border-color, #e5e7eb)",
    background: "var(--bg-secondary, #f9fafb)",
  },
  tableTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text-primary, #111)",
  },
  tableCount: {
    fontSize: 12,
    color: "var(--text-tertiary, #9ca3af)",
    background: "var(--bg-tertiary, #f3f4f6)",
    border: "1px solid var(--border-color, #e5e7eb)",
    borderRadius: 12,
    padding: "2px 10px",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    padding: "11px 16px",
    textAlign: "left",
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
    color: "var(--text-tertiary, #6b7280)",
    borderBottom: "1px solid var(--border-color, #e5e7eb)",
    background: "var(--bg-secondary, #f9fafb)",
    whiteSpace: "nowrap",
  },
  tr: {
    transition: "background 0.12s",
  },
  evenRow: {
    background: "var(--bg-secondary, #fafafa)",
  },
  todayRow: {
    background: RED_LIGHT,
  },
  td: {
    padding: "11px 16px",
    borderBottom: "1px solid var(--border-color, #f0f0f0)",
    verticalAlign: "middle",
    color: "var(--text-primary, #374151)",
  },
  emptyCell: {
    padding: "32px 16px",
    textAlign: "center",
    color: "var(--text-tertiary, #9ca3af)",
    fontSize: 13,
  },

  // ── Cell details ──
  dateCell: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 500,
  },
  todayBadge: {
    fontSize: 10,
    fontWeight: 700,
    background: RED,
    color: "#fff",
    borderRadius: 4,
    padding: "1px 6px",
    letterSpacing: "0.3px",
  },
  timeIn: {
    color: "#16a34a",
    fontWeight: 600,
  },
  timeOut: {
    color: "#ea580c",
    fontWeight: 600,
  },
  timeDash: {
    color: "var(--text-tertiary, #9ca3af)",
  },
  hoursCell: {
    fontWeight: 600,
    color: "var(--text-secondary, #374151)",
  },
  statusPill: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
};