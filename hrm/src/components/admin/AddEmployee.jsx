import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";

// const CREATE_USER = gql`
//   mutation CreateUser($username: String!, $password: String!, $role: String!) {
//     createUser(username: $username, password: $password, role: $role)
//   }
// `;

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

const FIELDS = [
  { key: "username", label: "Username", placeholder: "e.g. john.doe", type: "text" },
  { key: "password", label: "Password", placeholder: "Create a password", type: "password" },
];

export default function AddEmployee() {
  // const [form, setForm] = useState({ username: "", password: "", role: "employee" });
  const [form, setForm] = useState({
  username: "",
  password: "",
  role: "employee",
  paidLeaves: 10,
  monday: "10-6",
  tuesday: "10-6",
  wednesday: "10-6",
  thursday: "10-6",
  friday: "10-6",
  saturday: "10-2",
});
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
      await createUser({
        variables: {
          username: form.username,
          password: form.password,
          role: form.role,
          paidLeaves: form.paidLeaves,
          monday: form.monday,
          tuesday: form.tuesday,
          wednesday: form.wednesday,
          thursday: form.thursday,
          friday: form.friday,
          saturday: form.saturday,
        },
      });
      setSuccess(`Employee "${form.username}" added successfully!`);
      setForm({ username: "", password: "", role: "employee" });
      setErrors({});
      setTimeout(() => setSuccess(""), 3500);
    } catch (err) {
      setErrors({ submit: err.message });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div className="page-header" style={{ textAlign: "center", width: "100%" }}>
        <h1>Add Employee</h1>
        <p>Create a new employee account</p>
      </div>

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
          {FIELDS.map((f) => (
            <div key={f.key} className="field">
              <label>{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={(ev) =>
                  setForm((s) => ({ ...s, [f.key]: ev.target.value }))
                }
                style={errors[f.key] ? { borderColor: "#c0392b" } : {}}
              />
              {errors[f.key] && (
                <span style={{ fontSize: 12, color: "#c0392b" }}>{errors[f.key]}</span>
              )}
            </div>
          ))}

          <div className="field">
            <label>Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
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
          {["monday","tuesday","wednesday","thursday","friday","saturday"].map(day => (
  <div className="field" key={day}>
    <label>{day.charAt(0).toUpperCase() + day.slice(1)}</label>
    <input
      placeholder="e.g. 10-6"
      value={form[day]}
      onChange={(e) =>
        setForm((s) => ({ ...s, [day]: e.target.value }))
      }
    />
  </div>
))}

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