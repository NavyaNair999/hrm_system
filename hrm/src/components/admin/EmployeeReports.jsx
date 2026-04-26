import { useMemo, useState } from "react";
import { gql } from "@apollo/client";
import { useLazyQuery } from "@apollo/client/react";

const EMPLOYEE_ATTENDANCE_SUMMARY = gql`
  query EmployeeAttendanceSummary($startDate: String!, $endDate: String!) {
    employeeAttendanceSummary(startDate: $startDate, endDate: $endDate) {
      userId
      employeeNumber
      employeeName
      department
      designation
      totalHoursWorked
      averageDailyWorkingHours
      totalDaysPresent
      totalDaysAbsent
      totalLeavesTaken
    }
  }
`;

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

function toCsvValue(value) {
  const safe = String(value ?? "");
  if (safe.includes(",") || safe.includes("\"") || safe.includes("\n")) {
    return `"${safe.replace(/"/g, "\"\"")}"`;
  }
  return safe;
}


export default function EmployeeReports() {
  const [filters, setFilters] = useState(getMonthRange);
  const today = new Date().toISOString().split("T")[0];
  const [runReport, { data, loading, error, called }] = useLazyQuery(EMPLOYEE_ATTENDANCE_SUMMARY, {
    fetchPolicy: "network-only",
  });

  const rows = data?.employeeAttendanceSummary || [];

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.hours += Number(row.totalHoursWorked);
        acc.present += row.totalDaysPresent;
        acc.absent += row.totalDaysAbsent;
        acc.leaves += row.totalLeavesTaken;
        return acc;
      },
      { hours: 0, present: 0, absent: 0, leaves: 0 }
    );
  }, [rows]);

 function generateReport(event) {
  event.preventDefault();
  if (filters.startDate > today || filters.endDate > today) {
    alert("Report cannot be generated for future dates.");
    return;
  }
  runReport({
    variables: {
      startDate: filters.startDate,
      endDate: filters.endDate,
    },
  });
}
  function downloadReport() {
    if (!rows.length) return;

    const header = [
      "Employee Number & Name",
      "Department & Designation",
      "Total Hours Worked",
      "Average Daily Working Hours",
      "Total Days Present",
      "Total Days Absent",
      "Total Leaves Taken",
    ];

    const csvLines = [
      header.join(","),
      ...rows.map((row) =>
        [
          `${row.employeeNumber || "-"} - ${row.employeeName}`,
          `${row.department || "-"} - ${row.designation || "-"}`,
          row.totalHoursWorked,
          row.averageDailyWorkingHours,
          row.totalDaysPresent,
          row.totalDaysAbsent,
          row.totalLeavesTaken,
        ]
          .map(toCsvValue)
          .join(",")
      ),
    ];

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `employee-attendance-report-${filters.startDate}-to-${filters.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Employee Reports</h1>
        <p>Attendance and working-hour summaries for the selected period.</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Report Filters</div>
        <div className="card-sub">
          Data columns include employee number and name, department and designation, total and average hours, present days, absent days, and leaves taken.
        </div>

        <form onSubmit={generateReport}>
          <div className="form-grid" style={{ gap: 16 }}>
            <div className="field">
              <label>Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                 max={today}  
                onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label>End Date</label>
              <input
                type="date"
                value={filters.endDate}
                  max={today}                          
                onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
                required
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate Report"}
            </button>
            <button className="btn-secondary" type="button" onClick={downloadReport} disabled={!rows.length}>
              Download CSV
            </button>
          </div>
        </form>
      </div>

      {error && <div className="alert error">{error.message}</div>}

      {called && !loading && (
        <>
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-label">Employees</div>
              <div className="stat-value">{rows.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Hours</div>
              <div className="stat-value">{totals.hours.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Present Days</div>
              <div className="stat-value green">{totals.present}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Absent Days</div>
              <div className="stat-value warning">{totals.absent}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Leaves Taken</div>
              <div className="stat-value gray">{totals.leaves}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Report Data</div>
            {!rows.length ? (
              <div className="empty-state" style={{ minHeight: 180 }}>
                <div className="empty-state-title">No report data found</div>
                <div className="empty-state-text">Try another date range to see employee attendance summaries.</div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee Number & Name</th>
                      <th>Department & Designation</th>
                      <th>Total Hours Worked</th>
                      <th>Average Daily Working Hours</th>
                      <th>Total Days Present</th>
                      <th>Total Days Absent</th>
                      <th>Total Leaves Taken</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.userId}>
                        <td>
                          <strong>{row.employeeNumber || "-"}</strong>
                          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{row.employeeName}</div>
                        </td>
                        <td>
                          <strong>{row.department || "-"}</strong>
                          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{row.designation || "-"}</div>
                        </td>
                        <td>{row.totalHoursWorked}</td>
                        <td>{row.averageDailyWorkingHours}</td>
                        <td>{row.totalDaysPresent}</td>
                        <td>{row.totalDaysAbsent}</td>
                        <td>{row.totalLeavesTaken}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
