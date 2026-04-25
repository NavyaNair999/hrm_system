import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation,useQuery } from "@apollo/client/react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

const CREATE_USER = gql`
  mutation CreateUser(
    $username: String!
    $password: String!
    $role: String!
    $paidLeaves: Int!
    $monday: String
    $tuesday: String
    $wednesday: String
    $thursday: String
    $friday: String
    $saturday: String
     $employeeNumber: String
    $designation: String
    $department: String
    $reportsToId: ID
    $joiningDate: String
  ) {
    createUser(
      username: $username
      password: $password
      role: $role
      paidLeaves: $paidLeaves
      monday: $monday
      tuesday: $tuesday
      wednesday: $wednesday
      thursday: $thursday
      friday: $friday
      saturday: $saturday
      employeeNumber: $employeeNumber
      designation: $designation
      department: $department
      reportsToId: $reportsToId
      joiningDate: $joiningDate
    )
  }
`;
const ALL_USERS_SIMPLE = gql`
  query AllUsersSimple {
    allUsers {
      id
      username
      role
      isActive
    }
  }
`;
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DEPARTMENTS = [
  "Tech", "Design", "Product", "Marketing",
  "Sales", "HR", "Finance", "Operations", "Legal", "Other",
];
const sectionTitle = {
  fontSize: 11,
  fontWeight: 700,
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: 10,
  marginTop: 4,
  paddingBottom: 6,
  borderBottom: "1px solid #f0e8e8",
};
export default function AddEmployee() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "employee",
    paidLeaves: 10,
    timing: "10-6",
    employeeNumber: "",
    designation:    "",
    department:     "",
    reportsToId:    "",
    joiningDate:    new Date().toISOString().split("T")[0],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState("");
  const [errors, setErrors] = useState({});

  const [createUser, { loading }] = useMutation(CREATE_USER);
const { data: usersData } = useQuery(ALL_USERS_SIMPLE);
  const managers = (usersData?.allUsers || []).filter((u) => u.isActive && (u.role === "admin" || u.role === "employee"));
  function validate() {
    const e = {};
    if (!form.username.trim()) e.username = "Required";
    if (!form.password.trim()) e.password = "Required";
     if (form.password.length > 0 && form.password.length < 6)
      e.password = "Minimum 6 characters";
    return e;
  }

async function handleSubmit(ev) {
    ev.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
 
    try {
      const dayVars = {};
      DAYS.forEach((day) => (dayVars[day] = form.timing));
 
      await createUser({
        variables: {
          username:       form.username,
          password:       form.password,
          role:           form.role,
          paidLeaves:     form.paidLeaves,
          ...dayVars,
          employeeNumber: form.employeeNumber || undefined,
          designation:    form.designation    || undefined,
          department:     form.department     || undefined,
          reportsToId:    form.reportsToId    || undefined,
          joiningDate:    form.joiningDate    || undefined,
        },
      });
 
      setSuccess(`Employee "${form.username}" added successfully!`);
      setForm({
        username: "", password: "", role: "employee", paidLeaves: 10, timing: "10-6",
        employeeNumber: "", designation: "", department: "",
        reportsToId: "", joiningDate: new Date().toISOString().split("T")[0],
      });
      setErrors({});
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setErrors({ submit: err.message });
    }
  }
  const field = (key, label, input) => (
    <div className="field">
      <label>{label}</label>
      {input}
      {errors[key] && <span style={{ fontSize: 12, color: "#c0392b" }}>{errors[key]}</span>}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="card" style={{ maxWidth: 560, width: "100%" }}>
        <div className="card-title">New Employee Details</div>
        <div className="card-sub">Fill in the details to create a new employee account</div>
 
        {success && (
          <div style={{ background: "#e8f8ef", color: "#1a7a4a", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>
            {success}
          </div>
        )}
        {errors.submit && (
          <div style={{ background: "#fdf4f4", color: "#c0392b", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>
            {errors.submit}
          </div>
        )}
 
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
 
          {/* ── Account section ── */}
          <div style={sectionTitle}>Account</div>
 
          {field("username", "Username",
            <input
              type="text"
              placeholder="e.g. john.doe"
              value={form.username}
              onChange={(ev) => setForm((s) => ({ ...s, username: ev.target.value }))}
              style={errors.username ? { borderColor: "#c0392b" } : {}}
            />
          )}
 
          {field("password", "Password",
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={form.password}
                onChange={(ev) => setForm((s) => ({ ...s, password: ev.target.value }))}
                style={{ ...(errors.password ? { borderColor: "#c0392b" } : {}), paddingRight: 40, width: "100%" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  color: "var(--text-tertiary)", fontSize: 18, display: "flex", alignItems: "center",
                }}
              >
                {showPassword ? <AiOutlineEye size={18} /> : <AiOutlineEyeInvisible size={18} />}
              </button>
            </div>
          )}
 
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div className="field">
              <label>Paid Leaves</label>
              <input
                type="number"
                value={form.paidLeaves}
                onChange={(e) => setForm((s) => ({ ...s, paidLeaves: Number(e.target.value) }))}
              />
            </div>
          </div>
 
          {/* ── Profile section ── */}
          <div style={{ ...sectionTitle, marginTop: 8 }}>Profile</div>
 
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Employee Number</label>
              <input
                placeholder="e.g. EMP0042"
                value={form.employeeNumber}
                onChange={(e) => setForm((s) => ({ ...s, employeeNumber: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Date of Joining</label>
              <input
                type="date"
                value={form.joiningDate}
                onChange={(e) => setForm((s) => ({ ...s, joiningDate: e.target.value }))}
              />
            </div>
          </div>
 
          <div className="field">
            <label>Designation</label>
            <input
              placeholder="e.g. Software Engineer"
              value={form.designation}
              onChange={(e) => setForm((s) => ({ ...s, designation: e.target.value }))}
            />
          </div>
 
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Department</label>
              <select value={form.department} onChange={(e) => setForm((s) => ({ ...s, department: e.target.value }))}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Reports To</label>
              <select value={form.reportsToId} onChange={(e) => setForm((s) => ({ ...s, reportsToId: e.target.value }))}>
                <option value="">No manager</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.username} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
 
          {/* ── Schedule section ── */}
          <div style={{ ...sectionTitle, marginTop: 8 }}>Schedule</div>
 
          <div className="field">
            <label>Timings (Mon – Sat)</label>
            <input
              placeholder="e.g. 10-6"
              value={form.timing}
              onChange={(e) => setForm((s) => ({ ...s, timing: e.target.value }))}
            />
            <span style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
              Applied uniformly to all weekdays
            </span>
          </div>
 
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ marginTop: 4 }}
          >
            {loading ? "Adding..." : "Add Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}