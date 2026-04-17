import { useState } from "react";

export default function EmployeeReports({ employeeUsers }) {
  const [form, setForm] = useState({ name: "", position: "" });
  const [report, setReport] = useState(null);

  function generateReport(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.position.trim()) return;
    const user = employeeUsers.find((u) =>
      u.name.toLowerCase().includes(form.name.toLowerCase())
    );
    setReport({
      name: form.name,
      position: form.position,
      employee: user || null,
      generatedAt: new Date().toLocaleString(),
    });
  }

  function downloadReport() {
    if (!report) return;
    const content = `
HRM PORTAL — EMPLOYEE REPORT
Generated: ${report.generatedAt}
${"─".repeat(40)}
Employee Name  : ${report.name}
Position       : ${report.position}
Schedule       : ${report.employee?.schedule || "N/A"}
Check-In Status: ${report.employee?.isCheckedIn ? "Checked In" : "Checked Out"}
Last Action    : ${report.employee?.lastCheck || "N/A"}
Leave Requests : ${report.employee?.leaveRequests?.length ?? 0}
Pending Leaves : ${report.employee?.leaveRequests?.filter((l) => l.status === "Pending")?.length ?? 0}
Approved Leaves: ${report.employee?.leaveRequests?.filter((l) => l.status === "Approved")?.length ?? 0}
${"─".repeat(40)}
    `.trim();
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.name.replace(/\s+/, "_")}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const REPORT_ROWS = report
    ? [
        ["Schedule", report.employee?.schedule || "N/A"],
        ["Status", report.employee ? (report.employee.isCheckedIn ? "Checked In" : "Checked Out") : "N/A"],
        ["Last Action", report.employee?.lastCheck || "N/A"],
        ["Total Leaves", report.employee?.leaveRequests?.length ?? 0],
        ["Pending", report.employee?.leaveRequests?.filter((l) => l.status === "Pending")?.length ?? 0],
        ["Approved", report.employee?.leaveRequests?.filter((l) => l.status === "Approved")?.length ?? 0],
        ["Generated", report.generatedAt],
      ]
    : [];

  return (
    <div>
      <div className="page-header">
        <h1>Employee Reports</h1>
        <p>Generate and download individual employee reports</p>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Generate Report</div>
          <div className="card-sub">Enter employee details to create a report</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="field">
              <label>Employee Name</label>
              <input
                placeholder="e.g. Jane Smith"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Position / Role</label>
              <input
                placeholder="e.g. Software Engineer"
                value={form.position}
                onChange={(e) => setForm((s) => ({ ...s, position: e.target.value }))}
              />
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={generateReport}>
                Generate Report
              </button>
              {report && (
                <button className="btn-secondary" onClick={downloadReport}>
                  ⬇ Download
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Report Preview</div>
          {!report ? (
            <div className="report-preview">
              <div style={{ fontSize: 32 }}>📄</div>
              <div>Fill in the form to generate a report</div>
            </div>
          ) : (
            <div className="report-preview has-data">
              <div className="report-name">{report.name}</div>
              <div className="report-pos">{report.position}</div>
              <hr className="divider" />
              {REPORT_ROWS.map(([k, v]) => (
                <div className="report-row" key={k}>
                  <span style={{ color: "#888", fontWeight: 500 }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}