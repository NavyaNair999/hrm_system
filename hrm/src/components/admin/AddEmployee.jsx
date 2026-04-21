import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
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
    )
  }
`;

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function AddEmployee() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "employee",
    paidLeaves: 10,
    timing: "10-6",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState("");
  const [errors, setErrors] = useState({});

  const [createUser, { loading }] = useMutation(CREATE_USER);

  function validate() {
    const e = {};
    if (!form.username.trim()) e.username = "Required";
    if (!form.password.trim()) e.password = "Required";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) {
      setErrors(e2);
      return;
    }
    try {
      // Apply same timing to all days
      const dayVars = {};
      DAYS.forEach((day) => (dayVars[day] = form.timing));

      await createUser({
        variables: {
          username: form.username,
          password: form.password,
          role: form.role,
          paidLeaves: form.paidLeaves,
          ...dayVars,
        },
      });
      setSuccess(`Employee "${form.username}" added successfully!`);
      setForm({ username: "", password: "", role: "employee", paidLeaves: 10, timing: "10-6" });
      setErrors({});
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setErrors({ submit: err.message });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>

      <div className="card" style={{ maxWidth: 480, width: "100%" }}>
        <div className="card-title">New Employee Details</div>
        <div className="card-sub">Fill in the details to create a new employee account</div>

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
            <label>Username</label>
            <input
              type="text"
              placeholder="e.g. john.doe"
              value={form.username}
              onChange={(ev) => setForm((s) => ({ ...s, username: ev.target.value }))}
              style={errors.username ? { borderColor: "#c0392b" } : {}}
            />
            {errors.username && (
              <span style={{ fontSize: 12, color: "#c0392b" }}>{errors.username}</span>
            )}
          </div>

          <div className="field">
            <label>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={form.password}
                onChange={(ev) => setForm((s) => ({ ...s, password: ev.target.value }))}
                style={{
                  ...(errors.password ? { borderColor: "#c0392b" } : {}),
                  paddingRight: 40,
                  width: "100%",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: "var(--text-tertiary)",
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? (
                  <AiOutlineEye size={18} />
                ) : (
                  <AiOutlineEyeInvisible size={18} />
                )}
              </button>
            </div>
            {errors.password && (
              <span style={{ fontSize: 12, color: "#c0392b" }}>{errors.password}</span>
            )}
          </div>

          <div className="field">
            <label>Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
            >
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
              onChange={(e) =>
                setForm((s) => ({ ...s, paidLeaves: Number(e.target.value) }))
              }
            />
          </div>

          <div className="field">
            <label>Timings (Mon – Sat)</label>
            <input
              placeholder="e.g. 10-6"
              value={form.timing}
              onChange={(e) => setForm((s) => ({ ...s, timing: e.target.value }))}
            />
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