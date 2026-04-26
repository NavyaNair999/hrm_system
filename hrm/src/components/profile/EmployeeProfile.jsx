// hrm/src/components/profile/EmployeeProfile.jsx
//
// Shared profile page used by both Admin and Employee.
//
// Props:
//   userId   – ID of the employee to display
//   isAdmin  – true  → full edit access + gear menu
//              false → read-only (employee viewing their own profile)
//   onBack   – optional callback for the back button
//              admin: () => setTab("userList")
//              employee: not needed (no back button shown)

import { useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GET_EMPLOYEE = gql`
  query GetEmployee($id: ID!) {
    employeeById(id: $id) {
      id
      username
      role
      employeeNumber
      designation
      department
      reportsTo
      reportsToId
      directReporting2
      joiningDate
      dateOfBirth
      scheduleType
      biometricId
      isActive
      positionHistory {
        id
        designation
        effectiveDate
        reason
      }
    }
  }
`;

const GET_ALL_USERS = gql`
  query GetAllUsersForProfile {
    allUsers {
      id
      username
      designation
    }
  }
`;

const CHANGE_POSITION = gql`
  mutation ChangePosition($userId: ID!, $newDesignation: String!, $effectiveDate: String!, $reason: String!) {
    changePosition(userId: $userId, newDesignation: $newDesignation, effectiveDate: $effectiveDate, reason: $reason)
  }
`;

const UPDATE_REPORTING = gql`
  mutation UpdateReporting($userId: ID!, $reportsToId: ID, $directReporting2Id: ID) {
    updateReporting(userId: $userId, reportsToId: $reportsToId, directReporting2Id: $directReporting2Id)
  }
`;

const RESET_PASSWORD = gql`
  mutation AdminResetPassword($userId: ID!, $newPassword: String!) {
    adminResetPassword(userId: $userId, newPassword: $newPassword)
  }
`;

const UPDATE_EMPLOYEE_DETAILS = gql`
  mutation UpdateEmployeeDetails(
    $userId: ID!
    $dateOfBirth: String
    $scheduleType: String
    $biometricId: String
    $department: String
  ) {
    updateEmployeeDetails(
      userId: $userId
      dateOfBirth: $dateOfBirth
      scheduleType: $scheduleType
      biometricId: $biometricId
      department: $department
    )
  }
`;
const GET_DEPARTMENTS = gql`
  query GetDepartmentsForEdit {
    departments {
      id
      name
    }
  }
`;
// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  if (!name) return "?";
  return name.split(/[\s._]/).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function avatarColor(name) {
  const colors = [
    { bg: "#fdecea", fg: "#c0392b" },
    { bg: "#e8f0fd", fg: "#2563eb" },
    { bg: "#f0fdf4", fg: "#16a34a" },
    { bg: "#fef9c3", fg: "#ca8a04" },
    { bg: "#f5f3ff", fg: "#7c3aed" },
  ];
  const i = (name || "").charCodeAt(0) % colors.length;
  return colors[i];
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return d;
  }
}

const REASON_OPTIONS = ["Promotion", "Lateral Move", "Re-designation", "Role Expansion", "Other"];

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: "#1a1a2e", color: "#fff", borderRadius: 10,
      padding: "12px 20px", fontSize: 13, fontWeight: 500,
      boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
      animation: "fadeSlideUp 0.25s ease",
    }}>
      {message}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-primary, #fff)", borderRadius: 14,
          padding: "28px 32px", maxWidth: 460, width: "92%",
          boxShadow: "0 12px 48px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary,#111)" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#aaa", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldRow({ label, value, highlight }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "13px 0", borderBottom: "1px solid var(--border-color, #f0f0f0)",
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 500, textAlign: "right", maxWidth: "60%",
        color: highlight ? "#c0392b" : "var(--text-primary,#111)",
      }}>
        {value || "—"}
      </span>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 12px", border: "1px solid #e5c6c6",
  borderRadius: 8, fontSize: 13, boxSizing: "border-box",
  background: "var(--bg-primary,#fff)", color: "var(--text-primary,#111)",
  marginTop: 4,
};
const labelStyle = {
  fontSize: 12, fontWeight: 600, color: "#666", display: "block", marginTop: 14,
};

// ─── Tab 1: General Information ───────────────────────────────────────────────

function GeneralInfoTab({ employee, isAdmin, onSave }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    dateOfBirth: employee.dateOfBirth || "",
    scheduleType: employee.scheduleType || "",
    biometricId: employee.biometricId || "",
    department: employee.department || "",
  });


  const { data: deptData } = useQuery(GET_DEPARTMENTS, { skip: !isAdmin });
  const [updateDetails, { loading }] = useMutation(UPDATE_EMPLOYEE_DETAILS, {
    refetchQueries: [
      { query: GET_ALL_USERS },
      { query: GET_EMPLOYEE, variables: { id: employee.id } },
    ],
    awaitRefetchQueries: true,
  });

  async function handleSave() {
    try {
      await updateDetails({ variables: { userId: employee.id, ...form } });
      setEditing(false);
      onSave("Details updated successfully");
    } catch (e) {
      onSave("Error: " + e.message);
    }
  }



  const departments = deptData?.departments || [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary,#111)" }}>
          General Information
        </h3>
        {isAdmin && !editing && (
          <button
            onClick={() => setEditing(true)}
            style={{
              padding: "6px 16px", borderRadius: 8, border: "1px solid #e5c6c6",
              background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#555",
            }}
          >
            ✏️ Edit
          </button>
        )}
        {isAdmin && editing && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                setEditing(false);
                setForm({
                  dateOfBirth: employee.dateOfBirth || "",
                  scheduleType: employee.scheduleType || "",
                  biometricId: employee.biometricId || "",
                  department: employee.department || "",
                });
              }}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 12 }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{ padding: "6px 16px", borderRadius: 8, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
        {/* Left column */}
        <div>
          <FieldRow label="Employee Number" value={employee.employeeNumber} highlight />
          <FieldRow label="Full Name" value={employee.username} />
          <FieldRow label="Designation" value={employee.designation} />

          {/* Department — editable */}
          {isAdmin && editing ? (
            <div style={{ padding: "10px 0", borderBottom: "1px solid var(--border-color,#f0f0f0)" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Department
              </label>
              <select
                style={inputStyle}
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                <option value="">Select…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <FieldRow label="Department" value={employee.department} />
          )}
        </div>

        {/* Right column — unchanged */}
        <div>
          <FieldRow label="Date of Joining (DOJ)" value={formatDate(employee.joiningDate)} />

          {isAdmin && editing ? (
            <div style={{ padding: "10px 0", borderBottom: "1px solid var(--border-color,#f0f0f0)" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Date of Birth</label>
              <input type="date" style={inputStyle} value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </div>
          ) : (
            <FieldRow label="Date of Birth (DOB)" value={formatDate(employee.dateOfBirth)} />
          )}

          {isAdmin && editing ? (
            <div style={{ padding: "10px 0", borderBottom: "1px solid var(--border-color,#f0f0f0)" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Schedule Type</label>
              <select style={inputStyle} value={form.scheduleType}
                onChange={(e) => setForm({ ...form, scheduleType: e.target.value })}>
                <option value="">Select…</option>
                <option value="Fixed">Fixed</option>
                <option value="Flexible">Flexible</option>
                <option value="Rotational">Rotational</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
          ) : (
            <FieldRow label="Schedule Type" value={employee.scheduleType} />
          )}

          {isAdmin ? (
            editing ? (
              <div style={{ padding: "10px 0", borderBottom: "1px solid var(--border-color,#f0f0f0)" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px" }}>Biometric ID</label>
                <input type="text" style={inputStyle} placeholder="e.g. BIO-1042"
                  value={form.biometricId}
                  onChange={(e) => setForm({ ...form, biometricId: e.target.value })} />
              </div>
            ) : (
              <FieldRow label="Biometric ID" value={employee.biometricId} />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: Position & Reporting ─────────────────────────────────────────────

function ReportingCard({ label, name, role, color, highlight }) {
  const av = avatarColor(name);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "12px 16px",
      background: highlight ? `${color}10` : "var(--bg-secondary,#fafafa)",
      border: `1px solid ${highlight ? `${color}30` : "#f0f0f0"}`,
      borderRadius: 10,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
        background: name ? av.bg : "#f0f0f0",
        color: name ? av.fg : "#aaa",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 700, fontSize: 13,
        border: highlight ? `2px solid ${color}` : "none",
      }}>
        {name ? initials(name) : "—"}
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: color || "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary,#111)" }}>{name || "Not assigned"}</div>
        {role && <div style={{ fontSize: 12, color: "#888" }}>{role}</div>}
      </div>
    </div>
  );
}

function PositionTab({ employee, allUsers, isAdmin, onSave, refetch }) {
  const [showChangePosition, setShowChangePosition] = useState(false);
  const [showChangeReporting, setShowChangeReporting] = useState(false);
  const [posForm, setPosForm] = useState({ newDesignation: "", effectiveDate: "", reason: "" });
  const [repForm, setRepForm] = useState({
    reportsToId: employee.reportsToId || "",
    directReporting2Id: "",
  });

  const [changePosition, { loading: cpLoading }] = useMutation(CHANGE_POSITION);
  const [updateReporting, { loading: urLoading }] = useMutation(UPDATE_REPORTING);

  const history = employee.positionHistory || [];
  const managers = (allUsers || []).filter((u) => u.id !== employee.id);

  async function handleChangePosition() {
    if (!posForm.newDesignation || !posForm.effectiveDate || !posForm.reason) {
      onSave("Please fill all fields"); return;
    }
    try {
      await changePosition({ variables: { userId: employee.id, ...posForm } });
      setShowChangePosition(false);
      setPosForm({ newDesignation: "", effectiveDate: "", reason: "" });
      await refetch();
      onSave("Position updated successfully");
    } catch (e) {
      onSave("Error: " + e.message);
    }
  }

  async function handleUpdateReporting() {
    try {
      await updateReporting({
        variables: {
          userId: employee.id,
          reportsToId: repForm.reportsToId || null,
          directReporting2Id: repForm.directReporting2Id || null,
        },
      });
      setShowChangeReporting(false);
      await refetch();
      onSave("Reporting updated successfully");
    } catch (e) {
      onSave("Error: " + e.message);
    }
  }

  // Build sorted combined timeline (DOJ entry + history)
  const timeline = [
    {
      id: "origin",
      designation: employee.designation || "Initial Role",
      effectiveDate: employee.joiningDate,
      reason: "Date of Joining",
    },
    ...history,
  ].sort((a, b) => new Date(a.effectiveDate) - new Date(b.effectiveDate));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>

      {/* ── Position Timeline ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary,#111)" }}>
            Position Timeline
          </h3>
          {isAdmin && (
            <button
              onClick={() => setShowChangePosition(true)}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "none",
                background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}
            >
              + Change Position
            </button>
          )}
        </div>

        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div style={{
            position: "absolute", left: 8, top: 8, bottom: 8,
            width: 2, background: "linear-gradient(180deg,#c0392b 0%,#e5c6c6 100%)", borderRadius: 2,
          }} />

          {timeline.map((entry, idx) => {
            const isLatest = idx === timeline.length - 1;
            return (
              <div key={entry.id} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20, position: "relative" }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                  background: isLatest ? "#c0392b" : "#e5c6c6",
                  border: `2px solid ${isLatest ? "#c0392b" : "#ddd"}`,
                  marginTop: 2, marginLeft: -3,
                  boxShadow: isLatest ? "0 0 0 3px rgba(192,57,43,0.12)" : "none",
                }} />
                <div style={{
                  background: isLatest ? "#fdecea" : "var(--bg-secondary,#fafafa)",
                  border: `1px solid ${isLatest ? "#f5c6cb" : "#f0f0f0"}`,
                  borderRadius: 10, padding: "10px 14px", flex: 1,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: isLatest ? "#c0392b" : "var(--text-primary,#111)" }}>
                    {entry.designation}
                    {isLatest && (
                      <span style={{ marginLeft: 8, fontSize: 10, background: "#c0392b", color: "#fff", borderRadius: 6, padding: "1px 7px", verticalAlign: "middle" }}>
                        CURRENT
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{formatDate(entry.effectiveDate)}</div>
                  {entry.reason && <div style={{ fontSize: 12, color: "#aaa", marginTop: 2, fontStyle: "italic" }}>{entry.reason}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Reporting Hierarchy ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-primary,#111)" }}>
            Reporting Hierarchy
          </h3>
          {isAdmin && (
            <button
              onClick={() => setShowChangeReporting(true)}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "1px solid #e5c6c6",
                background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#555",
              }}
            >
              ✏️ Edit
            </button>
          )}
        </div>

        <ReportingCard label="Reporting Manager" name={employee.reportsTo} role="Primary Supervisor" color="#2563eb" />
        <div style={{ height: 14, borderLeft: "2px dashed #ddd", marginLeft: 24 }} />
        <ReportingCard label="Direct Reporting 2" name={employee.directReporting2} role="Secondary / Functional Manager" color="#7c3aed" />
        <div style={{ height: 14, borderLeft: "2px dashed #ddd", marginLeft: 24 }} />
        <ReportingCard label="Employee" name={employee.username} role={employee.designation} color="#c0392b" highlight />
      </div>

      {/* ── Change Position Modal (admin only) ── */}
      {showChangePosition && (
        <Modal title="Change Position" onClose={() => setShowChangePosition(false)}>
          <label style={labelStyle}>New Designation *</label>
          <input type="text" style={inputStyle} placeholder="e.g. Senior Engineer"
            value={posForm.newDesignation}
            onChange={(e) => setPosForm({ ...posForm, newDesignation: e.target.value })} />

          <label style={labelStyle}>Effective Date *</label>
          <input type="date" style={inputStyle} value={posForm.effectiveDate}
            onChange={(e) => setPosForm({ ...posForm, effectiveDate: e.target.value })} />

          <label style={labelStyle}>Reason *</label>
          <select style={inputStyle} value={posForm.reason}
            onChange={(e) => setPosForm({ ...posForm, reason: e.target.value })}>
            <option value="">Select reason…</option>
            {REASON_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
            <button onClick={() => setShowChangePosition(false)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button onClick={handleChangePosition} disabled={cpLoading}
              style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {cpLoading ? "Saving…" : "Confirm Change"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Change Reporting Modal (admin only) ── */}
      {showChangeReporting && (
        <Modal title="Update Reporting Hierarchy" onClose={() => setShowChangeReporting(false)}>
          <label style={labelStyle}>Reporting Manager (Primary)</label>
          <select style={inputStyle} value={repForm.reportsToId}
            onChange={(e) => setRepForm({ ...repForm, reportsToId: e.target.value })}>
            <option value="">— None —</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.username}{m.designation ? ` (${m.designation})` : ""}</option>
            ))}
          </select>

          <label style={labelStyle}>Direct Reporting 2 (Secondary)</label>
          <select style={inputStyle} value={repForm.directReporting2Id}
            onChange={(e) => setRepForm({ ...repForm, directReporting2Id: e.target.value })}>
            <option value="">— None —</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.username}{m.designation ? ` (${m.designation})` : ""}</option>
            ))}
          </select>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
            <button onClick={() => setShowChangeReporting(false)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button onClick={handleUpdateReporting} disabled={urLoading}
              style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {urLoading ? "Saving…" : "Update"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Gear Menu (admin only) ───────────────────────────────────────────────────

function GearMenu({ employee, onToast, onClose }) {
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetPwd, { loading }] = useMutation(RESET_PASSWORD);

  async function handleReset() {
    if (!newPassword.trim()) { onToast("Password cannot be empty"); return; }
    try {
      await resetPwd({ variables: { userId: employee.id, newPassword } });
      setShowResetPwd(false);
      setNewPassword("");
      onClose();
      onToast("Password reset successfully");
    } catch (e) {
      onToast("Error: " + e.message);
    }
  }

  const menuItems = [
    { label: "📷  Change Photo", action: () => { onToast("Photo upload — coming soon"); onClose(); } },
    { label: "🔑  Reset Password", action: () => setShowResetPwd(true) },
    { label: "🛡️  Edit Permissions", action: () => { onToast("Permissions editor — coming soon"); onClose(); } },
  ];

  return (
    <>
      <div style={{
        position: "absolute", top: "100%", right: 0, marginTop: 6, zIndex: 500,
        background: "var(--bg-primary,#fff)", border: "1px solid #eee",
        borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.13)",
        minWidth: 200, overflow: "hidden",
      }}>
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            style={{
              display: "block", width: "100%", padding: "12px 18px", border: "none",
              background: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
              color: "var(--text-primary,#111)", textAlign: "left",
              borderBottom: "1px solid #f5f5f5",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#fdecea")}
            onMouseOut={(e) => (e.currentTarget.style.background = "none")}
          >
            {item.label}
          </button>
        ))}
      </div>

      {showResetPwd && (
        <Modal title="Reset Password" onClose={() => setShowResetPwd(false)}>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#555" }}>
            Set a new password for <strong>{employee.username}</strong>.
          </p>
          <input
            type="password" placeholder="New password" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid #e5c6c6", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "var(--bg-primary,#fff)", color: "var(--text-primary,#111)" }}
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={() => setShowResetPwd(false)} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button onClick={handleReset} disabled={loading}
              style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {loading ? "Resetting…" : "Reset Password"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "general", label: "General Information" },
  { id: "position", label: "Position & Reporting" },
];

export default function EmployeeProfile({ userId, isAdmin, onBack }) {
  const [activeTab, setActiveTab] = useState("general");
  const [gearOpen, setGearOpen] = useState(false);
  const [toast, setToast] = useState("");

  const { data, loading, error, refetch } = useQuery(GET_EMPLOYEE, {
    variables: { id: userId },
    fetchPolicy: "network-only",
    skip: !userId,
  });

  const { data: allUsersData } = useQuery(GET_ALL_USERS, {
    fetchPolicy: "network-only",
    skip: !isAdmin,
  });

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  if (!userId) return <div style={{ padding: 40, color: "#aaa" }}>No employee selected.</div>;
  if (loading) return <div style={{ padding: 40, color: "#aaa" }}>Loading profile…</div>;
  if (error) return <div style={{ padding: 40, color: "#c0392b" }}>Error: {error.message}</div>;

  const employee = data?.employeeById;
  if (!employee) return <div style={{ padding: 40, color: "#aaa" }}>Employee not found.</div>;

  const av = avatarColor(employee.username);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Back button — only shown to admin (employee has sidebar nav) */}
      {isAdmin && onBack && (
        <button
          onClick={onBack}
          style={{
            marginBottom: 16, background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: "#888", display: "flex", alignItems: "center", gap: 6, padding: 0,
          }}
        >
          ← Back to User List
        </button>
      )}

      {/* ══ FIXED HEADER ══════════════════════════════════════════════════════ */}
      <div style={{
        background: "var(--bg-primary,#fff)",
        border: "1px solid var(--border-color,#f0f0f0)",
        borderRadius: 14,
        padding: "24px 28px",
        marginBottom: 0,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        display: "flex", alignItems: "center", gap: 22,
        position: "relative",
      }}>
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
          background: av.bg, color: av.fg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 26,
          border: `3px solid ${av.fg}22`,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}>
          {initials(employee.username)}
        </div>

        {/* Core info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text-primary,#111)" }}>
              {employee.username}
            </h2>
            <span style={{
              display: "inline-block", padding: "2px 10px", borderRadius: 10,
              fontSize: 11, fontWeight: 700,
              background: employee.isActive ? "#e8f8ef" : "#fdf4f4",
              color: employee.isActive ? "#1a7a4a" : "#c0392b",
              border: `1px solid ${employee.isActive ? "#abebc6" : "#f5c6cb"}`,
            }}>
              {employee.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#c0392b" }}>
              {employee.employeeNumber || "—"}
            </span>
            <span style={{ fontSize: 13, color: "#555" }}>
              {employee.designation || <span style={{ color: "#bbb" }}>No designation</span>}
            </span>
            {employee.department && (
              <span style={{
                fontSize: 12, fontWeight: 600, color: "#6d28d9",
                background: "#f5f3ff", borderRadius: 6, padding: "2px 10px",
              }}>
                {employee.department}
              </span>
            )}
          </div>
        </div>

        {/* ⚙ Gear button — admin only */}
        {isAdmin && (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setGearOpen((o) => !o)}
              title="Admin actions"
              style={{
                width: 38, height: 38, borderRadius: "50%",
                border: "1px solid #e5c6c6",
                background: gearOpen ? "#fdecea" : "#fff",
                cursor: "pointer", fontSize: 18,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#c0392b",
              }}
            >
              ⚙
            </button>
            {gearOpen && (
              <>
                {/* click-outside overlay */}
                <div onClick={() => setGearOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 499 }} />
                <GearMenu employee={employee} onToast={showToast} onClose={() => setGearOpen(false)} />
              </>
            )}
          </div>
        )}
      </div>

      {/* ══ TABS ══════════════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex",
        borderBottom: "2px solid var(--border-color,#f0f0f0)",
        background: "var(--bg-primary,#fff)",
        padding: "0 28px",
        borderLeft: "1px solid var(--border-color,#f0f0f0)",
        borderRight: "1px solid var(--border-color,#f0f0f0)",
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: "14px 20px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13,
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? "#c0392b" : "#888",
              borderBottom: activeTab === t.id ? "2px solid #c0392b" : "2px solid transparent",
              marginBottom: -2,
              transition: "color 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ TAB CONTENT ═══════════════════════════════════════════════════════ */}
      <div style={{
        background: "var(--bg-primary,#fff)",
        border: "1px solid var(--border-color,#f0f0f0)",
        borderTop: "none",
        borderRadius: "0 0 14px 14px",
        padding: "28px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>
        {activeTab === "general" && (
          <GeneralInfoTab employee={employee} isAdmin={isAdmin} onSave={showToast} />
        )}
        {activeTab === "position" && (
          <PositionTab
            employee={employee}
            allUsers={allUsersData?.allUsers}
            isAdmin={isAdmin}
            onSave={showToast}
            refetch={refetch}
          />
        )}
      </div>

      <Toast message={toast} />
    </div>
  );
}
