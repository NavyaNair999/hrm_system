import { useEffect, useMemo, useState } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import "./DashboardAttendanceAction.css";
import { getDistance } from "geolib";
import ToastPopup from "../../src/components/ui/ToastPopup";

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
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isCheckedIn) return undefined;

    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isCheckedIn]);

  useEffect(() => {
  if (success || error) {
    const timer = setTimeout(() => {
      setSuccess("");
      setError("");
    }, 3000);

    return () => clearTimeout(timer);
  }
}, [success, error]);

  const hoursWorkedLabel = formatHoursLabel(todayRec, nowTick);
  const buttonLabel = isDone ? "Done for Today" : isCheckedIn ? "Web Check-Out" : "Web Check-In";
  const statusLabel = isDone ? "Completed" : isCheckedIn ? "Working" : "Ready to start";


// geotagging check-in logic by omkar on 4/27/26
async function handleGeoCheckIn() {
  const geoSupported = "geolocation" in navigator;
  if (!geoSupported) {
    setError("Geolocation is not supported by your browser.");
    return;
  }

  const workLocation = { lat: 19.042135336140667, lng: 73.0227908031799 };
  const maxDistanceMeters = 100;

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;

          // if (accuracy > 100) {
          //   setError("Location accuracy is too low. Try again.");
          //   return reject(new Error("Low accuracy"));
          // }

          const distance = getDistance(
            workLocation,
            { lat: latitude, lng: longitude }
          );

          if (distance > maxDistanceMeters) {
            setError("You are not within the allowed radius.");
            return reject(new Error("Outside radius"));
          }

          await checkInMut({
            variables: {
              lat: latitude,
              lng: longitude,
            },
          });

          setSuccess("Checked in successfully ");
          resolve();
        } catch (err) {
          setError("Check-in failed");
          reject(err);
        }
      },
      () => {
        setError("Unable to retrieve your location.");
        reject(new Error("Location error"));
      }
    );
  });
}
async function handleAttendanceAction() {
  if (isDone || actionLoading) return;

  setError("");
  setSuccess("");

  try {
    if (isCheckedIn) {
      await checkOutMut();
      setSuccess("Checked out successfully ");
    } else {
      await handleGeoCheckIn();
    }
  } catch (error) {
    setError(error.message || "Something went wrong");
  }
}
  return (
    <section className="dash-attendance">
      <ToastPopup
      message={success || error}
      type={success ? "success" : "error"}
    />
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
        {error ? <span className="dash-attendance__error">{error}</span> : null}
      </div>
    </section>
  );
}