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
      scheduleType
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

function getDayName(date) {
  return date.toLocaleDateString("en-IN", { weekday: "long" });
}

function buildMonthRows(year, monthIndex, attendanceRecords, leaveRequests, holidays) {
  const holidayMap = new Map((holidays || []).map((holiday) => [holiday.date, holiday.description || "Holiday"]));
  const attendanceMap = new Map((attendanceRecords || []).map((record) => [record.date, record]));
  const approvedLeaves = (leaveRequests || []).filter((leave) => leave.status === "Approved");
  const rows = [];
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, monthIndex, day);
    const dateKey = date.toLocaleDateString("en-CA");
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
            onClick={() => onSubmit({ checkIn, checkOut, reason })}
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
  return (
    <div className="card">
      <div className="card-title">Attendance Log</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Day</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Total Hours</th>
              <th>Remarks</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.dateKey}>
                <td>{row.dateKey}</td>
                <td>{row.dayName}</td>
                <td>{formatTime(row.checkIn)}</td>
                <td>{formatTime(row.checkOut)}</td>
                <td>{Number(row.totalHours).toFixed(2)}</td>
                <td>{row.remarks || "--"}</td>
                <td>
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
  isCheckedIn,
  onCheckIn,
  onCheckOut,
  actionLoading,
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
          <div className="field"><label>Employee Number</label><input value={employee?.employeeNumber || "--"} disabled /></div>
          <div className="field"><label>Name</label><input value={employee?.username || "--"} disabled /></div>
          <div className="field"><label>Designation</label><input value={employee?.designation || "--"} disabled /></div>
          <div className="field"><label>Department</label><input value={employee?.department || "--"} disabled /></div>
          <div className="field"><label>Schedule Type</label><input value={employee?.scheduleType || "--"} disabled /></div>
        </div>
      </div>

      {isSelf ? (
        <div className="check-status-bar">
          <div className={`cstatus-dot ${isCheckedIn ? "active" : ""}`} />
          <div className="cstatus-text">{isCheckedIn ? "Checked In" : "Not Checked In Yet"}</div>
          <div className="cstatus-spacer" />
          {!isCheckedIn ? (
            <button className="btn-primary" type="button" onClick={onCheckIn} disabled={actionLoading}>
              {actionLoading ? "Updating..." : "Check In"}
            </button>
          ) : (
            <button className="btn-primary" type="button" onClick={onCheckOut} disabled={actionLoading}>
              {actionLoading ? "Updating..." : "Check Out"}
            </button>
          )}
        </div>
      ) : null}

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
  const [requestCorrection, { loading: requestLoading }] = useMutation(REQUEST_ATTENDANCE_CORRECTION);

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
        holidayData?.holidays || []
      ),
    [selectedYear, selectedMonth, selfAttendanceData, selfLeaveData, holidayData]
  );

  const teamRows = useMemo(
    () =>
      buildMonthRows(
        selectedYear,
        selectedMonth,
        teamAttendanceData?.attendanceByUser || [],
        teamLeaveData?.leaveRequestsByUser || [],
        holidayData?.holidays || []
      ),
    [selectedYear, selectedMonth, teamAttendanceData, teamLeaveData, holidayData]
  );

  const todayRecord = (selfAttendanceData?.attendanceByUser || []).find((item) => item.date === todayStr);
  const isCheckedIn = !!(todayRecord?.checkIn && !todayRecord?.checkOut);
  const actionLoading = checkInLoading || checkOutLoading;

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleCheckIn() {
    try {
      await checkInMut();
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
      return;
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
    } catch (error) {
      showToast(error.message || "Unable to submit the request.");
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
          isCheckedIn={isCheckedIn}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
          actionLoading={actionLoading}
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
              onAdjust={() => {}}
              isSelf={false}
              isCheckedIn={false}
              onCheckIn={() => {}}
              onCheckOut={() => {}}
              actionLoading={false}
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
