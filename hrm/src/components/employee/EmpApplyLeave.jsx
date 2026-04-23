//This file contains the EmpApplyLeave component which provides a form for employees to submit leave requests.
// It uses a GraphQL mutation to send the leave request data to the server and includes client-side validation for the form fields.

import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";

const APPLY_LEAVE = gql`
  mutation ApplyLeave(
    $type: String!
    $startDate: String!
    $endDate: String!
    $days: Int!
    $reason: String!
  ) {
    applyLeave(
      type: $type
      startDate: $startDate
      endDate: $endDate
      days: $days
      reason: $reason
    )
  }
`;

const LEAVE_TYPES = [
  "Sick Leave",
  "Casual Leave",
  "Earned Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Unpaid Leave",
];


//Function to calculate the leave days based on the start and end date of leave selected
function calcDays(s, e) {
  if (!s || !e) return 0;
  const diff = (new Date(e) - new Date(s)) / (1000 * 60 * 60 * 24) + 1;
  return diff > 0 ? diff : 0;
}

export default function EmpApplyLeave() {
  const [form, setForm] = useState({
    type: "Sick Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const [success, setSuccess] = useState("");
  const [errors, setErrors] = useState({});
  const [applyLeave, { loading }] = useMutation(APPLY_LEAVE);


  function validate() {
    const e = {};
    if (!form.startDate) e.startDate = "Required";
    if (!form.endDate) e.endDate = "Required";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = "End must be after start";
    if (!form.reason.trim()) e.reason = "Required";
    return e;
  }


  
  async function handleSubmit(e) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) {
      setErrors(e2);
      return;
    }
    const days = calcDays(form.startDate, form.endDate);
    try {
      await applyLeave({
        variables: {
          type: form.type,
          startDate: form.startDate,
          endDate: form.endDate,
          days,
          reason: form.reason,
        },
      });
      setSuccess("Leave request submitted successfully!");
      setForm({ type: "Sick Leave", startDate: "", endDate: "", reason: "" });
      setErrors({});
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setErrors({ submit: err.message });
    }
  }

  const days = calcDays(form.startDate, form.endDate);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="page-header" style={{ textAlign: "center", width: "100%" }}>
        <h1>Apply for Leave</h1>
        <p>Submit a leave request for approval</p>
      </div>

      <div className="card" style={{ maxWidth: 520, width: "100%" }}>
        <div className="card-title">Leave Request Form</div>

        {success && (
          <div
            style={{
              background: "#e8f8ef",
              color: "#1a7a4a",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {success}
          </div>
        )}

        {errors.submit && (
          <div
            style={{
              background: "#fdf4f4",
              color: "#c0392b",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {errors.submit}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label>Type of Leave</label>
            <select
              value={form.type}
              onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
                style={errors.startDate ? { borderColor: "#c0392b" } : {}}
              />
              {errors.startDate && (
                <span style={{ fontSize: 12, color: "#c0392b" }}>{errors.startDate}</span>
              )}
            </div>
            <div className="field">
              <label>End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))}
                style={errors.endDate ? { borderColor: "#c0392b" } : {}}
              />
              {errors.endDate && (
                <span style={{ fontSize: 12, color: "#c0392b" }}>{errors.endDate}</span>
              )}
            </div>
          </div>

          {days > 0 && (
            <div
              style={{
                background: "#fdf4f4",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 13,
                color: "#c0392b",
                fontWeight: 600,
              }}
            >
              Duration: {days} day{days !== 1 ? "s" : ""}
            </div>
          )}

          <div className="field">
            <label>Reason</label>
            <textarea
              placeholder="Briefly describe why you need leave..."
              value={form.reason}
              onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
              style={errors.reason ? { borderColor: "#c0392b" } : {}}
            />
            {errors.reason && (
              <span style={{ fontSize: 12, color: "#c0392b" }}>{errors.reason}</span>
            )}
          </div>

          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}