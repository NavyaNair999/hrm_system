import { useEffect, useMemo, useState } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import "./DashboardAttendanceAction.css";

const ATTENDANCE_QUERY = gql`
  query DashboardAttendance {
    attendance {
      id
      date
      checkIn
      checkOut
      hoursWorked
    }
  }
`;

const CHECK_IN = gql`
  mutation DashboardCheckIn {
    checkIn {
      id
      date
      checkIn
      checkOut
    }
  }
`;

const CHECK_OUT = gql`
  mutation DashboardCheckOut {
    checkOut {
      id
      date
      checkIn
      checkOut
    }
  }
`;

function getTodayIST() {
  // Pure UTC offset math — reliable on ALL OS/browser/locale combos.
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function formatDisplayDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function parseAttendanceTimestamp(value) {
  if (!value) return null;
  // Backend always returns full ISO strings — new Date() handles them correctly.
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTime(isoStr) {
  const parsed = parseAttendanceTimestamp(isoStr);
  if (!parsed) return "—";
  // Manual IST offset — toLocaleTimeString is broken on Windows machines
  const ist = new Date(parsed.getTime() + 5.5 * 60 * 60 * 1000);
  const h = ist.getUTCHours(); const m = ist.getUTCMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}

function formatHoursLabel(todayRec, nowTick) {
  if (!todayRec?.checkIn) return "0h 00m";

  const parsedCheckIn = parseAttendanceTimestamp(todayRec.checkIn);
  if (!parsedCheckIn) return "0h 00m";

  if (todayRec.checkIn && !todayRec.checkOut) {
    const diffMs = Math.max(0, nowTick - parsedCheckIn.getTime());
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  const numericHours = Number(todayRec.hoursWorked ?? 0);
  if (!Number.isFinite(numericHours) || numericHours <= 0) return "0h 00m";

  const totalMinutes = Math.round(numericHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export default function DashboardAttendanceAction({ title = "Attendance Action" }) {
  const todayStr = getTodayIST();
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [actionError, setActionError] = useState("");

  const { data, loading } = useQuery(ATTENDANCE_QUERY, {
    fetchPolicy: "network-only",
    pollInterval: 30000,
  });

  const mutationOptions = {
    refetchQueries: [{ query: ATTENDANCE_QUERY }],
    awaitRefetchQueries: true,
  };

  const [checkInMut, { loading: checkInLoading }] = useMutation(CHECK_IN, mutationOptions);
  const [checkOutMut, { loading: checkOutLoading }] = useMutation(CHECK_OUT, mutationOptions);

  const attendanceMap = useMemo(() => {
    const map = {};
    (data?.attendance ?? []).forEach((rec) => {
      if (rec.date) map[rec.date.slice(0, 10)] = rec;
    });
    return map;
  }, [data]);

  const todayRec = attendanceMap[todayStr] ?? null;
  const isCheckedIn = !!(todayRec?.checkIn && !todayRec?.checkOut);
  const isDone = !!todayRec?.checkOut;
  const actionLoading = checkInLoading || checkOutLoading;

  useEffect(() => {
    if (!isCheckedIn) return undefined;

    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isCheckedIn]);

  const hoursWorkedLabel = formatHoursLabel(todayRec, nowTick);
  const buttonLabel = isDone ? "Done for Today" : isCheckedIn ? "Web Check-Out" : "Web Check-In";
  const statusLabel = isDone ? "Completed" : isCheckedIn ? "Working" : "Ready to start";

  async function handleAttendanceAction() {
    if (isDone || actionLoading) return;

    setActionError("");

    try {
      if (isCheckedIn) {
        await checkOutMut();
      } else {
        await checkInMut();
      }
    } catch (error) {
      setActionError(error.message || "Unable to update attendance right now.");
    }
  }

  return (
    <section className="dash-attendance">
      <div className="dash-attendance__header">
        <div>
          <span className="dash-attendance__eyebrow">{title}</span>
          <h2>Daily attendance action</h2>
          <p>The primary interaction point for today&apos;s attendance tracking.</p>
        </div>
        <div className="dash-attendance__date">{formatDisplayDate(todayStr)}</div>
      </div>

      <div className="dash-attendance__grid">
        <div className="dash-attendance__metric accent-red">
          <span>Today&apos;s Date</span>
          <strong>{formatDisplayDate(todayStr)}</strong>
        </div>
        <div className="dash-attendance__metric accent-blue">
          <span>Web Check-In / Check-Out</span>
          <strong>{statusLabel}</strong>
          <small>
            {todayRec?.checkIn
              ? `In ${formatTime(todayRec.checkIn)}`
              : "Not checked in yet"}
            {todayRec?.checkOut ? ` • Out ${formatTime(todayRec.checkOut)}` : ""}
          </small>
        </div>
        <div className="dash-attendance__metric accent-green">
          <span>Hours Worked</span>
          <strong>{hoursWorkedLabel}</strong>
          <small>{isCheckedIn ? "Live counter running" : "Updates after check-in"}</small>
        </div>
      </div>

      <div className="dash-attendance__footer">
        <button
          type="button"
          className={`dash-attendance__button${isCheckedIn ? " is-checkout" : ""}`}
          onClick={handleAttendanceAction}
          disabled={isDone || actionLoading}
        >
          {actionLoading ? "Updating..." : buttonLabel}
        </button>

        {loading ? <span className="dash-attendance__helper">Refreshing attendance...</span> : null}
        {actionError ? <span className="dash-attendance__error">{actionError}</span> : null}
      </div>
    </section>
  );
}