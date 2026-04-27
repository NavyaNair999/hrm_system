import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import ToastPopup from "../ui/ToastPopup";
import { useEffect } from "react";

const LEAVE_BALANCE = gql`
  query LeaveBalance {
    leaveBalance {
      paid
      used
      casual
      wfh
    }
  }
`;

const MY_LEAVES = gql`
  query MyLeaves {
    myLeaves {
      id
      type
      startDate
      endDate
      days
      reason
      status
      applicationDate
    }
  }
`;

const APPLY_LEAVE = gql`
  mutation ApplyLeave(
    $type: String!
    $startDate: String!
    $endDate: String!
    $days: Int!
    $reason: String!
  ) {
    applyLeave(type: $type, startDate: $startDate, endDate: $endDate, days: $days, reason: $reason)
  }
`;

const UPDATE_LEAVE = gql`
  mutation UpdateLeave(
    $leaveId: ID!
    $type: String!
    $startDate: String!
    $endDate: String!
    $days: Int!
    $reason: String!
  ) {
    updateLeave(leaveId: $leaveId, type: $type, startDate: $startDate, endDate: $endDate, days: $days, reason: $reason)
  }
`;

const DELETE_LEAVE = gql`
  mutation DeleteLeave($leaveId: ID!) {
    deleteLeave(leaveId: $leaveId)
  }
`;

// ── Constants ────────────────────────────────────────────────────────────────

const LEAVE_TYPES = [
  "Sick Leave",
  "Casual Leave",
  "Earned Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Unpaid Leave",
];

const EMPTY_FORM = { type: "Sick Leave", startDate: "", endDate: "", reason: "" };

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcDays(s, e) {
  if (!s || !e) return 0;
  const diff = (new Date(e) - new Date(s)) / (1000 * 60 * 60 * 24) + 1;
  return diff > 0 ? diff : 0;
}

function statusColor(status) {
  if (status === "Approved") return { color: "#15803d", bg: "rgba(21,128,61,0.1)", border: "rgba(21,128,61,0.2)" };
  if (status === "Rejected") return { color: "#dc2626", bg: "rgba(220,38,38,0.1)", border: "rgba(220,38,38,0.2)" };
  return { color: "#d97706", bg: "rgba(217,119,6,0.1)", border: "rgba(217,119,6,0.2)" };
}

// ── Leave Balance Cards ───────────────────────────────────────────────────────

function LeaveBalanceCards({ balance, leaves }) {
  if (!balance) return null;

  const earned = (balance.paid ?? 0) - (balance.used ?? 0);
  const sick = balance.casual ?? 0;
  const casual = balance.wfh ?? 0;

  const approvedByType = {};
  (leaves || []).forEach((l) => {
    if (l.status === "Approved") {
      approvedByType[l.type] = (approvedByType[l.type] || 0) + (l.days || 0);
    }
  });

  const cards = [
    {
      label: "Earned Leave", abbr: "EL",
      total: balance.paid ?? 0,
      used: balance.used ?? 0,
      remaining: earned,
      color: earned < 0 ? "#dc2626" : earned === 0 ? "#f97316" : "#3b82f6",
      lightBg: earned < 0 ? "#fff1f2" : earned === 0 ? "#fff7ed" : "#eff6ff",
      icon: earned < 0 ? "⚠️" : "🏖️",
    },
    {
      label: "Sick Leave", abbr: "SL",
      total: sick,
      used: approvedByType["Sick Leave"] || 0,
      remaining: Math.max(0, sick - (approvedByType["Sick Leave"] || 0)),
      color: "#8b5cf6",
      lightBg: "#f5f3ff",
      icon: "🤒",
    },
    {
      label: "Casual Leave", abbr: "CL",
      total: casual,
      used: approvedByType["Casual Leave"] || 0,
      remaining: Math.max(0, casual - (approvedByType["Casual Leave"] || 0)),
      color: "#f59e0b",
      lightBg: "#fffbeb",
      icon: "☀️",
    },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 16,
      marginBottom: 32,
    }}>
      {cards.map((c) => {
        const pct = c.total > 0 ? Math.min(100, (Math.max(0, c.remaining) / c.total) * 100) : 0;
        return (
          <div key={c.label} style={{
            background: "var(--bg-primary, #fff)",
            border: "1px solid var(--border-color, #e5e7eb)",
            borderRadius: 16,
            padding: "20px 24px",
            borderLeft: `4px solid ${c.color}`,
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            transition: "box-shadow 0.2s",
          }}>
            {/* Top row: label + icon */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "#6b7280",
                  textTransform: "uppercase", letterSpacing: "0.7px",
                }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{c.abbr}</div>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: c.lightBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>
                {c.icon}
              </div>
            </div>

            {/* Big remaining count */}

            {/* handle negative and zero remaining cases by omkar on 26/4/26 */}
            <div style={{
                  fontSize: 40, fontWeight: 800, color: c.color,
                  lineHeight: 1, marginBottom: 2,
                }}>
                {c.remaining < 0 ? `-${Math.abs(c.remaining)}` : c.remaining}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 14 }}>
                {c.remaining < 0
                ? `exceeded by ${Math.abs(c.remaining)}`
                : c.remaining === 0
                ? "no days left"
                : "days remaining"}
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, background: "#f3f4f6", borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
              <div style={{
                height: "100%",
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${c.color}99, ${c.color})`,
                borderRadius: 99,
                transition: "width 0.5s ease",
              }} />
            </div>

            {/* Used / Total */}
            <div style={{ display: "flex", gap: 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary,#111)" }}>{c.used}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>Used</div>
              </div>
              <div style={{ width: 1, background: "#f0f0f0", margin: "0 12px" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary,#111)" }}>{c.total}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>Total</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
const PillBtn = ({ label, active, activeBg = "#dc2626", onClick }) => (
    <button
      onClick={onClick}
      style={{
        padding: "6px 16px",
        borderRadius: 999,
        border: `1px solid ${active ? activeBg : "#e5e7eb"}`,
        background: active ? activeBg : "var(--bg-primary,#fff)",
        color: active ? "#fff" : "#374151",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
// ── Main Component ────────────────────────────────────────────────────────────

export default function EmpApplyLeave() {
  const [activeTab, setActiveTab] = useState("request");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [success, setSuccess] = useState("");
  const [errors, setErrors] = useState({});
  const [filterType, setFilterType] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: balanceData } = useQuery(LEAVE_BALANCE);
  const { data: leavesData, refetch } = useQuery(MY_LEAVES, { fetchPolicy: "network-only" });

  const [applyLeave, { loading: applying }] = useMutation(APPLY_LEAVE);
  const [updateLeave, { loading: updating }] = useMutation(UPDATE_LEAVE);
  const [deleteLeave, { loading: deleting }] = useMutation(DELETE_LEAVE);

  const leaves = leavesData?.myLeaves || [];
  const sickTotal = balanceData?.leaveBalance?.casual ?? 0;
  const days = calcDays(form.startDate, form.endDate);
// useEffect to clear success and error messages after 3 seconds by omkar on 26/4/26
  useEffect(() => {
  if (success || errors.submit) {
    const timer = setTimeout(() => {
      setSuccess("");
      setErrors((prev) => ({ ...prev, submit: "" }));
    }, 3000);

    return () => clearTimeout(timer);
  }
}, [success, errors.submit]);

  function validate() {
    const e = {};
    if (!form.startDate) e.startDate = "Required";
    if (!form.endDate) e.endDate = "Required";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = "End date must be after start date";
    if (!form.reason.trim()) e.reason = "Required";
    return e;
  }
// prevent applying for sick leave if no balance left by omkar on 26/4/26 
  async function handleSubmit() {
  const e2 = validate();
  if (Object.keys(e2).length) { 
    setErrors(e2); 
    return; 
  }

  // BLOCK if no sick leave left
  if (form.type === "Sick Leave" && remainingSick <= 0) {
    setErrors({ submit: "No Sick Leave balance remaining" });
    return;
  }

  const d = calcDays(form.startDate, form.endDate);

  try {
    if (editingId) {
      await updateLeave({
        variables: {
          leaveId: editingId,
          type: form.type,
          startDate: form.startDate,
          endDate: form.endDate,
          days: d,
          reason: form.reason
        }
      });
      setSuccess("Leave request updated successfully!");
      setEditingId(null);
    } else {
      await applyLeave({
        variables: {
          type: form.type,
          startDate: form.startDate,
          endDate: form.endDate,
          days: d,
          reason: form.reason
        }
      });
      setSuccess("Leave request submitted successfully!");
    }

    setForm(EMPTY_FORM);
    setErrors({});
    refetch();
    setTimeout(() => setSuccess(""), 3500);

  } catch (err) {
    setErrors({ submit: err.message });
    setTimeout(() => setErrors((c) => ({ ...c, submit: "" })), 3500);
  }
}

  function handleEdit(leave) {
    setForm({ type: leave.type, startDate: leave.startDate, endDate: leave.endDate, reason: leave.reason });
    setEditingId(leave.id);
    setActiveTab("request");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setErrors({});
  }

  async function handleDelete(leaveId) {
    try {
      await deleteLeave({ variables: { leaveId } });
      refetch();
      setConfirmDelete(null);
    } catch (err) {
      alert(err.message);
    }
  }

  const filteredLeaves = leaves.filter((l) => {
    const matchType = filterType.length === 0 || filterType.includes(l.type);
    const matchStatus = filterStatus.length === 0 || filterStatus.includes(l.status);
    return matchType && matchStatus;
  });

  const pendingCount = leaves.filter((l) => l.status === "Pending").length;

  // ── Pill button helper ──
  

  const inputStyle = (hasError) => ({
    width: "100%",
    padding: "10px 14px",
    border: `1px solid ${hasError ? "#dc2626" : "var(--border-color,#e5e7eb)"}`,
    borderRadius: 10,
    fontSize: 14,
    background: "var(--bg-primary,#fff)",
    color: "var(--text-primary,#111)",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  });

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-secondary,#374151)",
    marginBottom: 6,
  };

  const approvedSickUsed = (leaves || [])
  .filter(l => l.status === "Approved" && l.type === "Sick Leave")
  .reduce((sum, l) => sum + (l.days || 0), 0);

const remainingSick = Math.max(0, sickTotal - approvedSickUsed);

  return (
    <div style={{ padding: "0 0 40px" }}>
      <ToastPopup
        message={success || errors.submit}
        type={success ? "success" : "error"}
      />

      {/* ── Page Header ── */}
      <div className="page-header">
        <h1>Leave Management</h1>
        <p>Apply for leave and track your requests</p>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{
        display: "flex",
        borderBottom: "2px solid var(--border-color, #e5e7eb)",
        marginBottom: 28,
        gap: 0,
      }}>
        {[
          { id: "request", label: "📝 Leave Request" },
          { id: "list", label: "📋 Leave List" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); if (t.id === "request") handleCancelEdit(); }}
            style={{
              padding: "12px 24px",
              border: "none",
              borderBottom: activeTab === t.id ? "2px solid #dc2626" : "2px solid transparent",
              marginBottom: -2,
              background: "none",
              cursor: "pointer",
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? "#dc2626" : "#6b7280",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.15s",
            }}
          >
            {t.label}
            {t.id === "list" && pendingCount > 0 && (
              <span style={{
                background: "#dc2626", color: "#fff",
                borderRadius: 999, padding: "1px 8px",
                fontSize: 11, fontWeight: 700, minWidth: 20,
                textAlign: "center",
              }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════ TAB 1: LEAVE REQUEST ══════════════════ */}
      {activeTab === "request" && (
        <div>
          {/* Balance Cards — full width */}
          <LeaveBalanceCards balance={balanceData?.leaveBalance} leaves={leaves} />

          {/* Form — full width, but max-width capped nicely */}
          <div style={{
            background: "var(--bg-primary,#fff)",
            border: "1px solid var(--border-color,#e5e7eb)",
            borderRadius: 16,
            padding: "28px 32px",
            boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
            maxWidth: 700,
          }}>
            {/* Form header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary,#111)" }}>
                {editingId ? "✏️ Edit Leave Request" : "New Leave Request"}
              </div>
              {!editingId && (
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  Fill in the details below to submit a leave request
                </div>
              )}
            </div>

              {/* ui msg for sick leave by omkar on 26/4/26 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Leave Type */}
              <div>
                <label style={labelStyle}>Leave Type</label>

                <select
                  value={form.type}
                  onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
                  style={{ ...inputStyle(false), cursor: "pointer" }}
                >
                  {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>

                {/* Warning message */}
                {form.type === "Sick Leave" && remainingSick <= 0 && (
                  <div style={{
                    background: "#fff1f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "10px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    marginTop: 8
                  }}>
                    ⚠️ You don’t have any Sick Leave remaining.
                  </div>
                )}
              </div>

              {/* Date Range — side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Leave From</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
                    style={inputStyle(!!errors.startDate)}
                  />
                  {errors.startDate && (
                    <span style={{ fontSize: 12, color: "#dc2626", marginTop: 4, display: "block" }}>
                      {errors.startDate}
                    </span>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Leave To</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))}
                    style={inputStyle(!!errors.endDate)}
                  />
                  {errors.endDate && (
                    <span style={{ fontSize: 12, color: "#dc2626", marginTop: 4, display: "block" }}>
                      {errors.endDate}
                    </span>
                  )}
                </div>
              </div>

              {/* Auto-calculated days */}
              {days > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderRadius: 10, padding: "10px 16px",
                }}>
                  <span style={{ fontSize: 18 }}>📆</span>
                  <span style={{ fontSize: 14, color: "#92400e" }}>
                    Total Duration: <strong style={{ color: "#c2410c" }}>{days} day{days !== 1 ? "s" : ""}</strong>
                  </span>
                </div>
              )}

              {/* Reason */}
              <div>
                <label style={labelStyle}>Reason for Leave</label>
                <textarea
                  placeholder="Briefly describe why you need leave..."
                  value={form.reason}
                  onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
                  rows={4}
                  style={{
                    ...inputStyle(!!errors.reason),
                    resize: "vertical",
                    minHeight: 100,
                  }}
                />
                {errors.reason && (
                  <span style={{ fontSize: 12, color: "#dc2626", marginTop: 4, display: "block" }}>
                    {errors.reason}
                  </span>
                )}
              </div>

              {/* Submit row */}
              <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={applying || updating}
                  style={{ minWidth: 140 }}
                >
                  {applying || updating
                    ? "Submitting…"
                    : editingId
                    ? "Update Request"
                    : "Submit Request"}
                </button>
                {editingId && (
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      padding: "9px 20px",
                      border: "1px solid var(--border-color,#e5e7eb)",
                      borderRadius: 8,
                      background: "var(--bg-primary,#fff)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#374151",
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ TAB 2: LEAVE LIST ══════════════════ */}
      {activeTab === "list" && (
        <div>
          {/* ── Filter Panel ── */}
          <div style={{
            background: "var(--bg-primary,#fff)",
            border: "1px solid var(--border-color,#e5e7eb)",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 16,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            {/* Leave Type row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: "#9ca3af",
                textTransform: "uppercase", letterSpacing: "0.6px",
                width: 80, flexShrink: 0,
              }}>
                Leave Type
              </span>
              <PillBtn
                label="All"
                active={filterType.length === 0}
                onClick={() => setFilterType([])}
              />
              {LEAVE_TYPES.map((type) => (
                <PillBtn
                  key={type}
                  label={type}
                  active={filterType.includes(type)}
                  onClick={() => setFilterType(filterType.includes(type) ? [] : [type])}
                />
              ))}
            </div>

            {/* Status row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: "#9ca3af",
                textTransform: "uppercase", letterSpacing: "0.6px",
                width: 80, flexShrink: 0,
              }}>
                Status
              </span>
              <PillBtn
                label="All"
                active={filterStatus.length === 0}
                onClick={() => setFilterStatus([])}
              />
              {[
                { label: "Pending",  bg: "#d97706" },
                { label: "Approved", bg: "#15803d" },
                { label: "Rejected", bg: "#dc2626" },
              ].map(({ label, bg }) => (
                <PillBtn
                  key={label}
                  label={label}
                  active={filterStatus.includes(label)}
                  activeBg={bg}
                  onClick={() => setFilterStatus(filterStatus.includes(label) ? [] : [label])}
                />
              ))}

              {/* Clear + count on same row, pushed right */}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                {(filterType.length > 0 || filterStatus.length > 0) && (
                  <button
                    onClick={() => { setFilterType([]); setFilterStatus([]); }}
                    style={{
                      fontSize: 12, color: "#dc2626", background: "none",
                      border: "none", cursor: "pointer", fontWeight: 600,
                      textDecoration: "underline", padding: 0,
                    }}
                  >
                    Clear Filters
                  </button>
                )}
                <span style={{
                  fontSize: 12, color: "#6b7280",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: 999, padding: "4px 12px", fontWeight: 600,
                }}>
                  {filteredLeaves.length} record{filteredLeaves.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {/* ── Table ── */}
          <div style={{
            background: "var(--bg-primary,#fff)",
            border: "1px solid var(--border-color,#e5e7eb)",
            borderRadius: 14,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--bg-secondary,#f9fafb)" }}>
                    {[
                      { label: "Leave Type",       width: "18%" },
                      { label: "Application Date", width: "15%" },
                      { label: "Leave From",        width: "14%" },
                      { label: "Leave To",          width: "14%" },
                      { label: "Days",              width: "8%"  },
                      { label: "Status",            width: "13%" },
                      { label: "Action",            width: "18%" },
                    ].map(({ label, width }) => (
                      <th key={label} style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.6px",
                        color: "#6b7280",
                        borderBottom: "1px solid var(--border-color,#e5e7eb)",
                        whiteSpace: "nowrap",
                        width,
                      }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{
                        textAlign: "center", padding: "48px 16px",
                        color: "#9ca3af", fontSize: 14,
                      }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                        No leave requests found.
                      </td>
                    </tr>
                  )}

                  {filteredLeaves.map((leave, i) => {
                    const sc = statusColor(leave.status);
                    const isPending = leave.status === "Pending";
                    return (
                      <tr
                        key={leave.id}
                        style={{
                          background: i % 2 === 0
                            ? "var(--bg-primary,#fff)"
                            : "var(--bg-secondary,#fafafa)",
                          borderBottom: "1px solid var(--border-color,#f0f0f0)",
                          transition: "background 0.1s",
                        }}
                      >
                        {/* Leave Type */}
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            background: "#f3f4f6",
                            color: "#374151",
                          }}>
                            {leave.type}
                          </span>
                        </td>

                        {/* Application Date */}
                        <td style={{ padding: "13px 16px", color: "#6b7280", fontSize: 13 }}>
                          {leave.applicationDate || "—"}
                        </td>

                        {/* Leave From */}
                        <td style={{ padding: "13px 16px", color: "#374151", fontSize: 13, fontWeight: 500 }}>
                          {leave.startDate || "—"}
                        </td>

                        {/* Leave To */}
                        <td style={{ padding: "13px 16px", color: "#374151", fontSize: 13, fontWeight: 500 }}>
                          {leave.endDate || "—"}
                        </td>

                        {/* Days */}
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{
                            display: "inline-block",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            borderRadius: 8,
                            padding: "3px 10px",
                            fontSize: 13,
                            fontWeight: 700,
                          }}>
                            {leave.days}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ padding: "13px 16px" }}>
                          <span style={{
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            color: sc.color,
                            background: sc.bg,
                            border: `1px solid ${sc.border}`,
                          }}>
                            {leave.status}
                          </span>
                        </td>

                        {/* Action */}
                        <td style={{ padding: "13px 16px" }}>
                          {isPending ? (
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => handleEdit(leave)}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: 7,
                                  border: "1px solid #e5e7eb",
                                  background: "#fff",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "#374151",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  transition: "border-color 0.15s",
                                }}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => setConfirmDelete(leave.id)}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: 7,
                                  border: "1px solid #fca5a5",
                                  background: "#fff5f5",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: "#dc2626",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                🗑 Delete
                              </button>
                            </div>
                          ) : (
                            <span
                              title="Locked — cannot edit approved/rejected requests"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 5,
                                color: "#9ca3af",
                                fontSize: 12,
                                fontWeight: 500,
                              }}
                            >
                              🔒 Locked
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Dialog ── */}
      {confirmDelete && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            style={{
              background: "var(--bg-primary,#fff)",
              borderRadius: 16,
              padding: "28px 32px",
              maxWidth: 400, width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary,#111)", marginBottom: 8 }}>
              Delete Leave Request?
            </div>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
              This action cannot be undone. The leave request will be permanently removed.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: "9px 20px",
                  border: "1px solid var(--border-color,#e5e7eb)",
                  borderRadius: 9,
                  background: "var(--bg-primary,#fff)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#374151",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting}
                style={{
                  padding: "9px 20px",
                  border: "none",
                  borderRadius: 9,
                  background: "#dc2626",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}