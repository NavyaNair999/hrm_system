// components/employee/EmpAttendance.jsx
import { useState, useMemo } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";

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

const CHECK_IN = gql` mutation CheckIn { checkIn } `;
const CHECK_OUT = gql` mutation CheckOut { checkOut } `;

export default function EmpAttendance() {
  const [viewDate, setViewDate] = useState(new Date());
  const { data, refetch } = useQuery(ATTENDANCE_QUERY, { fetchPolicy: "network-only" });
  const [checkInMut] = useMutation(CHECK_IN);
  const [checkOutMut] = useMutation(CHECK_OUT);

  const attendanceMap = useMemo(() => {
    const map = {};
    data?.attendance?.forEach(rec => {
      map[rec.date] = rec;
    });
    return map;
  }, [data]);

  // Navigation Logic
  const changeMonth = (offset) => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    const now = new Date();
    // Prevent going to future months
    if (next > new Date(now.getFullYear(), now.getMonth() + 1, 0)) return;
    setViewDate(next);
  };

  const getDaysInMonth = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return {
        dateStr: d.toISOString().split('T')[0],
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        isSunday: d.getDay() === 0,
        isFuture: d > new Date()
      };
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRec = attendanceMap[todayStr];
  const isCheckedIn = !!(todayRec?.checkIn && !todayRec?.checkOut);

  const formatTime = (iso) => iso ? iso.split('T')[1].substring(0, 5) : "—";

  return (
    <div className="attendance-container">
      <div className="page-header">
        <h1>My Attendance</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
          <button className="btn-secondary btn-sm" onClick={() => changeMonth(-1)}>←</button>
          <h2 style={{ margin: 0 }}>
            {viewDate.toLocaleString('default', { month: 'long' })} {viewDate.getFullYear()}
          </h2>
          <button className="btn-secondary btn-sm" onClick={() => changeMonth(1)}>→</button>
        </div>
      </div>

      <div className="check-status-bar">
        <div className={`cstatus-dot ${isCheckedIn ? 'active' : ''}`} />
        <div className="cstatus-text">{isCheckedIn ? "Working" : "Not Active"}</div>
        <div className="cstatus-spacer" />
        {!isCheckedIn ? (
          <button className="btn-primary" onClick={async () => { await checkInMut(); refetch(); }} disabled={!!todayRec?.checkOut}>
            {todayRec?.checkOut ? "Done for Today" : "Check In"}
          </button>
        ) : (
          <button className="btn-primary" onClick={async () => { await checkOutMut(); refetch(); }}>Check Out</button>
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
              </tr>
            </thead>
            <tbody>
              {getDaysInMonth().map(day => {
                const rec = attendanceMap[day.dateStr];
                const isToday = day.dateStr === todayStr;
                
                let status = <span className="badge badge-rejected">Absent</span>;
                if (rec?.checkIn) status = <span className="badge badge-approved">Present</span>;
                if (day.isSunday) status = <span style={{color: '#aaa'}}>Weekly Off</span>;
                if (day.isFuture) status = <span style={{color: '#eee'}}>—</span>;

                return (
                  <tr key={day.dateStr} style={isToday ? { backgroundColor: '#fff5f5' } : {}}>
                    <td>{day.dateStr}</td>
                    <td>{day.dayName}</td>
                    <td>{formatTime(rec?.checkIn)}</td>
                    <td>{formatTime(rec?.checkOut)}</td>
                    <td>{status}</td>
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