import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";

const CHECK_IN = gql`
  mutation CheckIn {
    checkIn
  }
`;

const CHECK_OUT = gql`
  mutation CheckOut {
    checkOut
  }
`;

const ATTENDANCE_QUERY = gql`
  query Attendance {
    attendance {
      id
      checkIn
      checkOut
    }
  }
`;

function formatTime(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmt(date) {
  return date.toISOString().split("T")[0];
}

export default function CheckInAdmin({ currentUser }) {
  const today = fmt(new Date());

  const { data, loading, refetch } = useQuery(ATTENDANCE_QUERY, {
    fetchPolicy: "network-only",
  });

  const [checkInMut, { loading: checkingIn }] = useMutation(CHECK_IN);
  const [checkOutMut, { loading: checkingOut }] = useMutation(CHECK_OUT);

  // Build today's record
  const records = data?.attendance || [];
  const todayRecords = records.filter((r) => r.checkIn?.startsWith(today));
  const lastRecord = todayRecords[todayRecords.length - 1];
  const isCheckedIn = !!(lastRecord?.checkIn && !lastRecord?.checkOut);

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

  return (
    <div>
      <div className="page-header">
        <h1>Check In / Out</h1>
        <p>Manage your personal attendance</p>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <div className="card-title">Your Attendance — Today</div>
        <div className="card-sub">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>

        {loading ? (
          <div style={{ color: "#aaa", marginTop: 16 }}>Loading...</div>
        ) : (
          <>
            <div className="check-status-bar" style={{ marginTop: 16 }}>
              <div className={`cstatus-dot${isCheckedIn ? " active" : ""}`} />
              <div>
                <div className="cstatus-text">
                  {isCheckedIn ? "Currently Working" : "Not Working"}
                </div>
                <div className="cstatus-sub">
                  {lastRecord?.checkIn
                    ? `In: ${formatTime(lastRecord.checkIn)}${
                        lastRecord.checkOut ? ` · Out: ${formatTime(lastRecord.checkOut)}` : " · Still active"
                      }`
                    : "No check-in yet today"}
                </div>
              </div>
              <div className="cstatus-spacer" />
              {!isCheckedIn ? (
                <button
                  className="btn-primary"
                  onClick={handleCheckIn}
                  disabled={checkingIn || !!lastRecord?.checkOut}
                >
                  {checkingIn ? "Checking In..." : lastRecord?.checkOut ? "Done for today" : "Check In"}
                </button>
              ) : (
                <button
                  className="btn-primary"
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                >
                  {checkingOut ? "Checking Out..." : "Check Out"}
                </button>
              )}
            </div>

            {todayRecords.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 8 }}>
                  Today's Sessions
                </div>
                {todayRecords.map((rec, i) => (
                  <div
                    key={rec.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      fontSize: 13,
                      color: "#666",
                      padding: "6px 0",
                      borderBottom: "1px solid #f5e5e5",
                    }}
                  >
                    <span style={{ color: "#888" }}>Session {i + 1}</span>
                    <span style={{ color: "#1a7a4a" }}>In: {formatTime(rec.checkIn)}</span>
                    {rec.checkOut && (
                      <span style={{ color: "#c0392b" }}>Out: {formatTime(rec.checkOut)}</span>
                    )}
                    {!rec.checkOut && (
                      <span style={{ color: "#e67e22" }}>● Active</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}