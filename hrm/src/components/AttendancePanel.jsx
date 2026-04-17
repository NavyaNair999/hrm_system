// import { useState, useMemo, useEffect } from "react";
// import { gql } from "@apollo/client";
// import { useMutation, useQuery } from "@apollo/client/react";

// const ATTENDANCE_QUERY = gql`
//   query GetAttendance {
//     attendance {
//       id
//       date
//       checkIn
//       checkOut
//       hoursWorked
//       isHoliday
//     }
//   }
// `;

// const CHECK_IN = gql`
//   mutation {
//     checkIn {
//       date
//       checkIn
//       checkOut
//     }
//   }
// `;

// const CHECK_OUT = gql`
//   mutation {
//     checkOut {
//       date
//       checkIn
//       checkOut
//     }
//   }
// `;

// function formatTime(val) {
//   if (!val) return "—";
//   return new Date(val).toLocaleTimeString("en-IN", {
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// }

// function formatDate(dateStr) {
//   const [y, m, d] = dateStr.split("-").map(Number);
//   const months = [
//     "Jan","Feb","Mar","Apr","May","Jun",
//     "Jul","Aug","Sep","Oct","Nov","Dec"
//   ];
//   return `${d} ${months[m - 1]} ${y}`;
// }

// export default function AttendancePanel() {
//   const todayStr = new Date().toLocaleDateString("en-CA", {
//     timeZone: "Asia/Kolkata",
//   });

//   const { data, loading } = useQuery(ATTENDANCE_QUERY);
//   const [checkInMut] = useMutation(CHECK_IN);
//   const [checkOutMut] = useMutation(CHECK_OUT);

//   const [localToday, setLocalToday] = useState(null);

//   // ✅ RESET STATE WHEN DAY CHANGES
//   useEffect(() => {
//     setLocalToday(null);
//   }, [todayStr]);

// const attendanceMap = useMemo(() => {
//   const map = {};
//   data?.attendance?.forEach((rec) => {
//     if (rec.date) {
//       const parsed = new Date(rec.date);
//       if (!isNaN(parsed)) {
//         const d = parsed.toLocaleDateString("en-CA", {
//           timeZone: "Asia/Kolkata",
//         });
//         map[d] = rec;
//       }
//     }
//   });
//   return map;
// }, [data]);

//   // ✅ TODAY RECORD
//   const todayRec =
//     localToday !== null ? localToday : attendanceMap[todayStr];

//   const isCheckedIn = todayRec?.checkIn && !todayRec?.checkOut;
//   const isDone = !!todayRec?.checkOut;

//   const btnLabel = isDone
//     ? "Done"
//     : isCheckedIn
//     ? "Check Out"
//     : "Check In";

//   // ✅ MERGE LOCAL + DB DATA (for instant table update)
//   const mergedMap = {
//     ...attendanceMap,
//     ...(todayRec ? { [todayStr]: todayRec } : {}),
//   };

//   // ✅ HANDLE BUTTON
//   async function handleBtn() {
//     try {
//       if (isCheckedIn) {
//         const res = await checkOutMut();
//         setLocalToday(res.data.checkOut);
//       } else {
//         const res = await checkInMut();
//         setLocalToday(res.data.checkIn);
//       }
//     } catch (e) {
//       alert(e.message);
//     }
//   }

//   // ✅ SORT DATES (LATEST FIRST)
//   const sortedDates = Object.keys(mergedMap).sort(
//     (a, b) => new Date(b) - new Date(a)
//   );

//   return (
//     <div style={{ padding: 20 }}>
//       {/* STATUS */}
//       <div style={{
//         display: "flex",
//         justifyContent: "space-between",
//         border: "1px solid #ddd",
//         padding: 15,
//         borderRadius: 10,
//         marginBottom: 20
//       }}>
//         <div>
//           <div>
//             {isDone
//               ? "Completed"
//               : isCheckedIn
//               ? "Working"
//               : "Not checked in"}
//           </div>

//           <div style={{ marginTop: 5 }}>
//             {todayRec?.checkIn && (
//               <span>In: {formatTime(todayRec.checkIn)} </span>
//             )}
//             {todayRec?.checkOut && (
//               <span> | Out: {formatTime(todayRec.checkOut)}</span>
//             )}
//           </div>
//         </div>

//         <button onClick={handleBtn} disabled={isDone}>
//           {btnLabel}
//         </button>
//       </div>

//       {/* TABLE */}
//       <table border="1" width="100%" cellPadding="10">
//         <thead>
//           <tr>
//             <th>Date</th>
//             <th>In</th>
//             <th>Out</th>
//             <th>Status</th>
//           </tr>
//         </thead>

//         <tbody>
//           {loading && (
//             <tr>
//               <td colSpan={4}>Loading...</td>
//             </tr>
//           )}

//           {!loading &&
//             sortedDates.map((date) => {
//               const rec = mergedMap[date];

//               return (
//                 <tr key={date}>
//                   <td>{formatDate(date)}</td>
//                   <td>{formatTime(rec.checkIn)}</td>
//                   <td>{formatTime(rec.checkOut)}</td>
//                   <td>
//                     {rec.checkIn
//                       ? rec.checkOut
//                         ? "Done"
//                         : "Working"
//                       : "Absent"}
//                   </td>
//                 </tr>
//               );
//             })}
//         </tbody>
//       </table>
//     </div>
//   );
// }




import { useState, useEffect, useMemo } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

const ME_QUERY = gql`
  query {
    me {
      username
    }
  }
`;

function formatTime(val) {
  if (!val) return "—";
  return new Date(val).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

export default function AttendancePanel() {
  const todayStr = new Date().toLocaleDateString("en-CA");

  // ✅ GET USER FROM BACKEND
  const { data } = useQuery(ME_QUERY);

  // ✅ STORE USERNAME LOCALLY (VERY IMPORTANT)
  const [username, setUsername] = useState(() => {
    return localStorage.getItem("loggedUser") || null;
  });

  // ✅ UPDATE WHEN API RETURNS
  useEffect(() => {
    if (data?.me?.username) {
      setUsername(data.me.username);
      localStorage.setItem("loggedUser", data.me.username);
    }
  }, [data]);

  const storageKey = username ? `attendance_${username}` : null;

  // ✅ LOAD DATA ONLY AFTER USER EXISTS
  const [attendance, setAttendance] = useState({});

  useEffect(() => {
    if (!storageKey) return;

    const stored = localStorage.getItem(storageKey);
    setAttendance(stored ? JSON.parse(stored) : {});
  }, [storageKey]);

  // ✅ SAVE DATA
  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(attendance));
  }, [attendance, storageKey]);

  if (!username) {
    return <div>Loading user...</div>;
  }

  const todayRec = attendance[todayStr] || {};

  const isCheckedIn = todayRec.checkIn && !todayRec.checkOut;
  const isDone = !!todayRec.checkOut;

  const btnLabel = isDone
    ? "Done"
    : isCheckedIn
    ? "Check Out"
    : "Check In";

  function handleBtn() {
    const now = new Date().toISOString();

    setAttendance((prev) => {
      const existing = prev[todayStr] || {};

      // CHECK OUT
      if (existing.checkIn && !existing.checkOut) {
        return {
          ...prev,
          [todayStr]: {
            ...existing,
            checkOut: now,
          },
        };
      }

      // CHECK IN
      return {
        ...prev,
        [todayStr]: {
          date: todayStr,
          checkIn: now,
          checkOut: null,
        },
      };
    });
  }

  const sortedDates = useMemo(() => {
    return Object.keys(attendance).sort((a, b) =>
      b.localeCompare(a)
    );
  }, [attendance]);

  return (
    <div style={{ padding: 20 }}>
      {/* STATUS */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        border: "1px solid #ddd",
        padding: 15,
        borderRadius: 10,
        marginBottom: 20
      }}>
        <div>
          <div>
            {isDone
              ? "Completed"
              : isCheckedIn
              ? "Working"
              : "Not checked in"}
          </div>

          <div style={{ marginTop: 5 }}>
            {todayRec.checkIn && (
              <span>In: {formatTime(todayRec.checkIn)} </span>
            )}
            {todayRec.checkOut && (
              <span> | Out: {formatTime(todayRec.checkOut)}</span>
            )}
          </div>
        </div>

        <button onClick={handleBtn} disabled={isDone}>
          {btnLabel}
        </button>
      </div>

      {/* TABLE */}
      <table border="1" width="100%" cellPadding="10">
        <thead>
          <tr>
            <th>Date</th>
            <th>In</th>
            <th>Out</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {sortedDates.length === 0 && (
            <tr>
              <td colSpan={4}>No records yet</td>
            </tr>
          )}

          {sortedDates.map((date) => {
            const rec = attendance[date];

            return (
              <tr key={date}>
                <td>{formatDate(date)}</td>
                <td>{formatTime(rec.checkIn)}</td>
                <td>{formatTime(rec.checkOut)}</td>
                <td>
                  {rec.checkIn
                    ? rec.checkOut
                      ? "Done"
                      : "Working"
                    : "Absent"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}