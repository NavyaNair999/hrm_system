import { useEffect, useMemo, useState } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";

const EMPLOYEE_BY_ID = gql`
  query EmployeeById($id: ID!) {
    employeeById(id: $id) {
      id
      username
      employeeNumber
      designation
      department
      scheduleName
      scheduleType
      maxCheckInTime
      totalDailyHours
      fixedCheckInTime
      bufferMinutes
      fixedCheckOutTime
    }
  }
`;

const ATTENDANCE_BY_USER = gql`
  query AttendanceByUser($userId: ID!) {
    attendanceByUser(userId: $userId) {
      id
      date
      checkIn
      checkOut
      hoursWorked
      isHoliday
    }
  }
`;

const LEAVES_BY_USER = gql`
  query LeaveRequestsByUser($userId: ID!) {
    leaveRequestsByUser(userId: $userId) {
      id
      type
      startDate
      endDate
      status
    }
  }
`;

const HOLIDAYS = gql`
  query Holidays {
    holidays {
      date
      description
    }
  }
`;

const TEAM_MEMBERS = gql`
  query TeamMembers {
    teamMembers {
      id
      username
      employeeNumber
      designation
      department
      scheduleName
      scheduleType
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

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];


const formatLocalTime = (utcString) => {
  if (!utcString || utcString === "--:--") return "--:--";
  // The 'Z' ensures the browser treats it as UTC and converts to your local IST
  const date = new Date(utcString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};


function parseAttendanceTimestamp(value) {
  if (!value) return null;
  // Backend always returns full ISO strings — new Date() handles them correctly.
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTime(iso) {
  const parsed = parseAttendanceTimestamp(iso);
  if (!parsed) return "--";
  // Manual IST offset — toLocaleTimeString is broken on Windows machines
  const ist = new Date(parsed.getTime() + 5.5 * 60 * 60 * 1000);
  const h = ist.getUTCHours(); const m = ist.getUTCMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}

function toTimeInputValue(iso) {
  const parsed = parseAttendanceTimestamp(iso);
  if (!parsed) return "";
  // Manual IST offset — toLocaleTimeString("en-GB") broken on Windows
  const ist = new Date(parsed.getTime() + 5.5 * 60 * 60 * 1000);
  const h = String(ist.getUTCHours()).padStart(2, "0");
  const m = String(ist.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function getTodayIST() {
  // Pure UTC offset math — reliable on ALL OS/browser/locale combos.
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function getDayName(date) {
  return date.toLocaleDateString("en-IN", { weekday: "long" });
}

function parseTimeToMinutes(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(String(value))) return null;
  const [hours, minutes] = String(value).split(":").map(Number);
  return (hours * 60) + minutes;
}

function parseHoursValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getIstMinutesFromIso(iso) {
  const parsed = parseAttendanceTimestamp(iso);
  if (!parsed) return null;
  const ist = new Date(parsed.getTime() + 5.5 * 60 * 60 * 1000);
  return (ist.getUTCHours() * 60) + ist.getUTCMinutes();
}

function getExpectedHours(employee) {
  const totalDailyHours = parseHoursValue(employee?.totalDailyHours);
  if (totalDailyHours !== null) return totalDailyHours;

  const fixedStart = parseTimeToMinutes(employee?.fixedCheckInTime);
  const fixedEnd = parseTimeToMinutes(employee?.fixedCheckOutTime);
  if (fixedStart !== null && fixedEnd !== null && fixedEnd > fixedStart) {
    return (fixedEnd - fixedStart) / 60;
  }

  return null;
}

function getRowAttendanceState(row, employee) {
  const scheduleType = employee?.scheduleType;
  const expectedHours = getExpectedHours(employee);
  const checkInMinutes = getIstMinutesFromIso(row.checkIn);
  const fixedCheckInMinutes = parseTimeToMinutes(employee?.fixedCheckInTime);
  const totalHours = parseHoursValue(row.totalHours);
  const isFinishedDay = !!row.checkOut || row.dateKey < getTodayIST();

  const isLateForTimeBased =
    scheduleType === "time_based" &&
    checkInMinutes !== null &&
    fixedCheckInMinutes !== null &&
    checkInMinutes > fixedCheckInMinutes;

  const isUnderHours =
    expectedHours !== null &&
    totalHours !== null &&
    isFinishedDay &&
    totalHours < expectedHours;

  const isOnTimeForTimeBased =
    scheduleType === "time_based" &&
    checkInMinutes !== null &&
    fixedCheckInMinutes !== null &&
    checkInMinutes <= fixedCheckInMinutes;

  const isCompletedHours =
    expectedHours !== null &&
    totalHours !== null &&
    isFinishedDay &&
    totalHours >= expectedHours;

  return {
    isOnTimeForTimeBased,
    isLateForTimeBased,
    isCompletedHours,
    isUnderHours,
  };
}

function buildMonthRows(year, monthIndex, attendanceRecords, leaveRequests, holidays, employee) {
  const holidayMap = new Map((holidays || []).map((holiday) => [holiday.date, holiday.description || "Holiday"]));
  const attendanceMap = new Map((attendanceRecords || []).map((record) => [record.date, record]));
  const approvedLeaves = (leaveRequests || []).filter((leave) => leave.status === "Approved");
  const rows = [];
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, monthIndex, day);
    // Use UTC offset math — toLocaleDateString("en-CA") is broken on Windows
    const dateKey = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    const attendance = attendanceMap.get(dateKey) || null;
    const holidayRemark = holidayMap.get(dateKey) || null;
    const leave = approvedLeaves.find(
      (item) => item.startDate <= dateKey && item.endDate >= dateKey
    );
    const isSunday = date.getDay() === 0;
    const isFuture = dateKey > getTodayIST();
    const totalHours = attendance?.hoursWorked && attendance.hoursWorked !== "0.00"
      ? attendance.hoursWorked
      : "0.00";

    let remarks = "";
    if (holidayRemark) remarks = holidayRemark;
    else if (leave) remarks = leave.type;
    else if (attendance?.checkIn) remarks = "Present";
    else if (isSunday) remarks = "Weekly Off";
    else if (!isFuture) remarks = "Absent";

    const attendanceState = getRowAttendanceState(
      {
        dateKey,
        checkIn: attendance?.checkIn || null,
        checkOut: attendance?.checkOut || null,
        totalHours,
      },
      employee
    );

    rows.push({
      dateKey,
      dayName: getDayName(date),
      checkIn: attendance?.checkIn || null,
      checkOut: attendance?.checkOut || null,
      totalHours,
      remarks,
      hasAttendance: !!attendance?.checkIn,
      hasApprovedLeave: !!leave,
      isHoliday: !!holidayRemark,
      isSunday,
      isFuture,
      ...attendanceState,
    });
  }

  return rows;
}

function buildSummary(rows) {
  return rows.reduce(
    (acc, row) => {
      if (row.hasAttendance) acc.present += 1;
      else if (row.hasApprovedLeave) acc.leave += 1;
      else if (!row.isHoliday && !row.isSunday && !row.isFuture) acc.absent += 1;
      acc.totalHours += Number(row.totalHours || 0);
      return acc;
    },
    { present: 0, absent: 0, leave: 0, totalHours: 0 }
  );
}

function CorrectionModal({ record, onClose, onSubmit, loading }) {
  const [checkIn, setCheckIn] = useState(() => toTimeInputValue(record?.checkIn));
  const [checkOut, setCheckOut] = useState(() => toTimeInputValue(record?.checkOut));
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    const submitted = await onSubmit({ checkIn, checkOut, reason });
    if (submitted !== false) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Attendance Adjustment Request</div>
          <button className="modal-close" type="button" onClick={onClose}>x</button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Update the check-in or check-out time for {record.dateKey}. The request will be sent for approval first.
          </div>
          <div className="form-grid" style={{ gap: 14 }}>
            <div className="field">
              <label>Check In</label>
              <input type="time" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} />
            </div>
            <div className="field">
              <label>Check Out</label>
              <input type="time" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Reason</label>
            <textarea
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why the attendance needs adjustment"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            type="button"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AttendanceLog({
  rows,
  canRaiseAdjustment,
  onAdjust,
}) {
  const passStyle = { color: "#16a34a", fontWeight: 700 };
  const failStyle = { color: "#c0392b", fontWeight: 700 };

  return (
    <div className="card">
      <div className="card-title">Attendance Log</div>
      <div className="data-table" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: "center" }}>Date</th>
              <th style={{ textAlign: "center" }}>Day</th>
              <th style={{ textAlign: "center" }}>Check In</th>
              <th style={{ textAlign: "center" }}>Check Out</th>
              <th style={{ textAlign: "center" }}>Total Hours</th>
              <th style={{ textAlign: "center" }}>Remarks</th>
              <th style={{ textAlign: "center" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.dateKey}>
                <td style={{ textAlign: "center" }}>{row.dateKey}</td>
                <td style={{ textAlign: "center" }}>{row.dayName}</td>
                <td style={{ textAlign: "center", ...(row.isLateForTimeBased ? failStyle : row.isOnTimeForTimeBased ? passStyle : {}) }}>{formatLocalTime(row.checkIn)}</td>
                <td style={{ textAlign: "center" }}>{formatLocalTime(row.checkOut)}</td>
                <td style={{ textAlign: "center", ...(row.isUnderHours ? failStyle : row.isCompletedHours ? passStyle : {}) }}>{Number(row.totalHours).toFixed(2)}</td>
                <td style={{ textAlign: "center" }}>{row.remarks || "--"}</td>
                <td style={{ textAlign: "center" }}>
                  {canRaiseAdjustment && !row.isFuture && !row.isHoliday ? (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => onAdjust(row)}
                    >
                      Edit
                    </button>
                  ) : (
                    <span style={{ color: "var(--text-tertiary)" }}>--</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AttendanceView({
  employee,
  rows,
  month,
  year,
  setMonth,
  setYear,
  canRaiseAdjustment,
  onAdjust,
  isSelf,
}) {
  const summary = useMemo(() => buildSummary(rows), [rows]);
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => currentYear - index);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="card">
        <div className="card-title">Employee Context</div>
        <div className="form-grid" style={{ gap: 16 }}>
          <div className="field"><label>Employee Number</label><input value={employee?.employeeNumber || "--"} disabled style={{ color: "var(--text-primary)" }} /></div>
          <div className="field"><label>Name</label><input value={employee?.username || "--"} disabled style={{ color: "var(--text-primary)" }} /></div>
          <div className="field"><label>Designation</label><input value={employee?.designation || "--"} disabled style={{ color: "var(--text-primary)" }} /></div>
          <div className="field"><label>Department</label><input value={employee?.department || "--"} disabled style={{ color: "var(--text-primary)" }} /></div>
          <div className="field"><label>Schedule Type</label><input value={employee?.scheduleName || "Custom timing"} disabled style={{ color: "var(--text-primary)" }} /></div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Monthly Selection & Summary</div>
        <div className="form-grid" style={{ gap: 16, marginBottom: 18 }}>
          <div className="field">
            <label>Month</label>
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {MONTHS.map((label, index) => (
                <option key={label} value={index}>{label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Year</label>
            <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {years.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="stats-grid" style={{ marginBottom: 0 }}>
          <div className="stat-card">
            <div className="stat-label">Present</div>
            <div className="stat-value green">{summary.present}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Absent</div>
            <div className="stat-value warning">{summary.absent}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Leave</div>
            <div className="stat-value gray">{summary.leave}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Hours</div>
            <div className="stat-value">{summary.totalHours.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <AttendanceLog rows={rows} canRaiseAdjustment={canRaiseAdjustment} onAdjust={onAdjust} />
    </div>
  );
}

export default function EmpAttendance({ currentUser }) {
  const todayStr = getTodayIST();
  const now = new Date();
  const [activeTab, setActiveTab] = useState("my");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedTeamUserId, setSelectedTeamUserId] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [toast, setToast] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { data: selfData } = useQuery(EMPLOYEE_BY_ID, {
    variables: { id: currentUser.id },
    skip: !currentUser?.id,
    fetchPolicy: "network-only",
  });
  const { data: selfAttendanceData, refetch: refetchSelfAttendance } = useQuery(ATTENDANCE_BY_USER, {
    variables: { userId: currentUser.id },
    skip: !currentUser?.id,
    fetchPolicy: "network-only",
  });
  const { data: selfLeaveData } = useQuery(LEAVES_BY_USER, {
    variables: { userId: currentUser.id },
    skip: !currentUser?.id,
    fetchPolicy: "network-only",
  });
  const { data: holidayData } = useQuery(HOLIDAYS, { fetchPolicy: "cache-first" });
  const { data: teamData } = useQuery(TEAM_MEMBERS, {
    fetchPolicy: "network-only",
    skip: !currentUser?.id,
  });
  const { data: teamEmployeeData } = useQuery(EMPLOYEE_BY_ID, {
    variables: { id: selectedTeamUserId },
    skip: !selectedTeamUserId,
    fetchPolicy: "network-only",
  });
  const { data: teamAttendanceData } = useQuery(ATTENDANCE_BY_USER, {
    variables: { userId: selectedTeamUserId },
    skip: !selectedTeamUserId,
    fetchPolicy: "network-only",
  });
  const { data: teamLeaveData } = useQuery(LEAVES_BY_USER, {
    variables: { userId: selectedTeamUserId },
    skip: !selectedTeamUserId,
    fetchPolicy: "network-only",
  });

  const [checkInMut, { loading: checkInLoading }] = useMutation(CHECK_IN);
  const [checkOutMut, { loading: checkOutLoading }] = useMutation(CHECK_OUT);
  const [requestCorrection, { loading: requestLoading }] = useMutation(REQUEST_ATTENDANCE_CORRECTION, {
    onCompleted: () => {
      setSelectedRecord(null);
    },
  });

  const teamMembers = teamData?.teamMembers || [];
  const filteredTeamMembers = useMemo(() => {
    const query = teamSearch.trim().toLowerCase();
    if (!query) return teamMembers;
    return teamMembers.filter((member) =>
      member.username?.toLowerCase().includes(query) ||
      member.employeeNumber?.toLowerCase().includes(query) ||
      member.department?.toLowerCase().includes(query)
    );
  }, [teamMembers, teamSearch]);

  useEffect(() => {
    if (!selectedTeamUserId && teamMembers.length) {
      setSelectedTeamUserId(String(teamMembers[0].id));
    }
  }, [teamMembers, selectedTeamUserId]);

  const selfRows = useMemo(
    () =>
      buildMonthRows(
        selectedYear,
        selectedMonth,
        selfAttendanceData?.attendanceByUser || [],
        selfLeaveData?.leaveRequestsByUser || [],
        holidayData?.holidays || [],
        selfData?.employeeById || null
      ),
    [selectedYear, selectedMonth, selfAttendanceData, selfLeaveData, holidayData, selfData]
  );

  const teamRows = useMemo(
    () =>
      buildMonthRows(
        selectedYear,
        selectedMonth,
        teamAttendanceData?.attendanceByUser || [],
        teamLeaveData?.leaveRequestsByUser || [],
        holidayData?.holidays || [],
        teamEmployeeData?.employeeById || null
      ),
    [selectedYear, selectedMonth, teamAttendanceData, teamLeaveData, holidayData, teamEmployeeData]
  );

  const todayRecord = (selfAttendanceData?.attendanceByUser || []).find((item) => item.date === todayStr);
  const isCheckedIn = !!(todayRecord?.checkIn && !todayRecord?.checkOut);
  const actionLoading = checkInLoading || checkOutLoading;

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  }


// to handle the lat and lang for check-in by omkar on 4/27/26
  async function handleCheckIn() {
  try {
    const position = await new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      })
    );
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    await checkInMut({ variables: { lat, lng } });
    await refetchSelfAttendance();
    showToast("Checked in successfully.");
  } catch (error) {
    showToast(error.message || "Unable to check in.");
  }
}

  async function handleCheckOut() {
    try {
      await checkOutMut();
      await refetchSelfAttendance();
      showToast("Checked out successfully.");
    } catch (error) {
      showToast(error.message || "Unable to check out.");
    }
  }

  async function submitCorrection({ checkIn, checkOut, reason }) {
    if (!reason.trim()) {
      showToast("Please add a reason for the adjustment request.");
      return false;
    }

    const toIso = (date, time) => (time ? `${date}T${time}:00+05:30` : null);

    try {
      await requestCorrection({
        variables: {
          date: selectedRecord.dateKey,
          checkIn: toIso(selectedRecord.dateKey, checkIn),
          checkOut: toIso(selectedRecord.dateKey, checkOut),
          reason,
        },
      });
      setSelectedRecord(null);
      showToast("Attendance adjustment request submitted.");
      return true;
    } catch (error) {
      showToast(error.message || "Unable to submit the request.");
      return false;
    }
  }

  const canViewTeamAttendance = teamMembers.length > 0 || String(currentUser?.role || "").toLowerCase() === "admin";

  return (
    <div>
      <div className="page-header">
        <h1>Attendance</h1>
        <p>Track your own logs, review monthly performance, and raise adjustment requests when needed.</p>
      </div>

      {toast ? <div className="alert info">{toast}</div> : null}

      <div className="tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`tab-button${activeTab === "my" ? " active" : ""}`}
          onClick={() => setActiveTab("my")}
        >
          My Attendance
        </button>
        {canViewTeamAttendance ? (
          <button
            type="button"
            className={`tab-button${activeTab === "team" ? " active" : ""}`}
            onClick={() => setActiveTab("team")}
          >
            Team Attendance
          </button>
        ) : null}
      </div>

      {activeTab === "my" ? (
        <AttendanceView
          employee={selfData?.employeeById}
          rows={selfRows}
          month={selectedMonth}
          year={selectedYear}
          setMonth={setSelectedMonth}
          setYear={setSelectedYear}
          canRaiseAdjustment={true}
          onAdjust={setSelectedRecord}
          isSelf={true}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div className="card-title">Team Attendance</div>
            <div className="card-sub">Search and select an employee to review the same attendance view and monthly summary.</div>
            <div className="form-grid" style={{ gap: 16 }}>
              <div className="field">
                <label>Employee Search</label>
                <input
                  value={teamSearch}
                  onChange={(event) => setTeamSearch(event.target.value)}
                  placeholder="Search by employee name, number, or department"
                />
              </div>
              <div className="field">
                <label>Select Employee</label>
                <select
                  value={selectedTeamUserId}
                  onChange={(event) => setSelectedTeamUserId(event.target.value)}
                >
                  <option value="">Select team member</option>
                  {filteredTeamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.employeeNumber ? `${member.employeeNumber} - ` : ""}{member.username}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {selectedTeamUserId ? (
            <AttendanceView
              employee={teamEmployeeData?.employeeById}
              rows={teamRows}
              month={selectedMonth}
              year={selectedYear}
              setMonth={setSelectedMonth}
              setYear={setSelectedYear}
              canRaiseAdjustment={false}
              onAdjust={() => { }}
              isSelf={false}
            />
          ) : (
            <div className="card">
              <div className="empty-state" style={{ minHeight: 220 }}>
                <div className="empty-state-title">Select an employee</div>
                <div className="empty-state-text">Choose a team member to load their monthly attendance summary and log.</div>
              </div>
            </div>
          )}
        </div>
      )}

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
