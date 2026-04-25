import { useMemo, useState } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
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
// defined query for fetching settings options by omkar on 25/4/26
const SETTINGS_OPTIONS = gql`
  query SettingsOptions {
    departments {
      id
      name
      isActive
    }
    designations {
      id
      name
      isActive
    }
    workSchedules {
      id
      name
      scheduleType
      workingDays
      maxCheckInTime
      totalDailyHours
      fixedCheckInTime
      bufferMinutes
      fixedCheckOutTime
      isActive
    }
  }
`;

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const FALLBACK_DEPARTMENTS = [
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
// scheduler and department/designation management links added by omkar on 25/4/26
function buildDayVarsFromSchedule(schedule) {
  const workingDays = new Set((schedule?.workingDays || []).map((day) => day.toLowerCase()));
  const scheduleValue =
    schedule?.scheduleType === "time_based"
      ? `${schedule.fixedCheckInTime} - ${schedule.fixedCheckOutTime} (+${schedule.bufferMinutes || 0}m buffer)`
      : `Flexible | Max in ${schedule.maxCheckInTime} | ${schedule.totalDailyHours} hrs`;

  return DAYS.reduce((acc, day) => {
    acc[day] = workingDays.has(day) ? scheduleValue : "Off";
    return acc;
  }, {});
}

export default function AddEmployee() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "employee",
    paidLeaves: 10,
    timing: "10-6",
    employeeNumber: "",
    designation: "",
    department: "",
    reportsToId: "",
    joiningDate: new Date().toISOString().split("T")[0],
    scheduleId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState("");
  const [errors, setErrors] = useState({});

  const [createUser, { loading }] = useMutation(CREATE_USER);
  const { data: usersData } = useQuery(ALL_USERS_SIMPLE);
  const { data: settingsData } = useQuery(SETTINGS_OPTIONS);

  const managers = (usersData?.allUsers || []).filter(
    (user) => user.isActive && (user.role === "admin" || user.role === "employee")
  );
  const scheduleOptions = useMemo(
    () => (settingsData?.workSchedules || []).filter((schedule) => schedule.isActive),
    [settingsData]
  );
  const departmentOptions = useMemo(() => {
    const configuredDepartments = (settingsData?.departments || [])
      .filter((department) => department.isActive)
      .map((department) => department.name);
    return configuredDepartments.length ? configuredDepartments : FALLBACK_DEPARTMENTS;
  }, [settingsData]);
  const designationOptions = useMemo(
    () => (settingsData?.designations || [])
      .filter((designation) => designation.isActive)
      .map((designation) => designation.name),
    [settingsData]
  );
  const selectedSchedule = scheduleOptions.find((schedule) => String(schedule.id) === String(form.scheduleId));

  function validate() {
    const nextErrors = {};
    if (!form.username.trim()) nextErrors.username = "Required";
    if (!form.password.trim()) nextErrors.password = "Required";
    if (form.password.length > 0 && form.password.length < 6) {
      nextErrors.password = "Minimum 6 characters";
    }
    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      const dayVars = selectedSchedule
        ? buildDayVarsFromSchedule(selectedSchedule)
        : DAYS.reduce((acc, day) => {
            acc[day] = form.timing;
            return acc;
          }, {});

      await createUser({
        variables: {
          username: form.username,
          password: form.password,
          role: form.role,
          paidLeaves: form.paidLeaves,
          ...dayVars,
          employeeNumber: form.employeeNumber || undefined,
          designation: form.designation || undefined,
          department: form.department || undefined,
          reportsToId: form.reportsToId || undefined,
          joiningDate: form.joiningDate || undefined,
        },
      });

      setSuccess(`Employee "${form.username}" added successfully!`);
      setForm({
        username: "",
        password: "",
        role: "employee",
        paidLeaves: 10,
        timing: "10-6",
        employeeNumber: "",
        designation: "",
        department: "",
        reportsToId: "",
        joiningDate: new Date().toISOString().split("T")[0],
        scheduleId: "",
      });
      setErrors({});
      setTimeout(() => setSuccess(""), 3500);
    } catch (error) {
      setErrors({ submit: error.message });
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
          <div style={sectionTitle}>Account</div>

          {field(
            "username",
            "Username",
            <input
              type="text"
              placeholder="e.g. john.doe"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              style={errors.username ? { borderColor: "#c0392b" } : {}}
            />
          )}

          {field(
            "password",
            "Password",
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                style={{ ...(errors.password ? { borderColor: "#c0392b" } : {}), paddingRight: 40, width: "100%" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
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
                {showPassword ? <AiOutlineEye size={18} /> : <AiOutlineEyeInvisible size={18} />}
              </button>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Role</label>
              <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
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
                onChange={(event) => setForm((current) => ({ ...current, paidLeaves: Number(event.target.value) }))}
              />
            </div>
          </div>

          <div style={{ ...sectionTitle, marginTop: 8 }}>Profile</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Employee Number</label>
              <input
                placeholder="e.g. EMP0042"
                value={form.employeeNumber}
                onChange={(event) => setForm((current) => ({ ...current, employeeNumber: event.target.value }))}
              />
            </div>
            <div className="field">
              <label>Date of Joining</label>
              <input
                type="date"
                value={form.joiningDate}
                onChange={(event) => setForm((current) => ({ ...current, joiningDate: event.target.value }))}
              />
            </div>
          </div>

          <div className="field">
            <label>Designation</label>
            <select value={form.designation} onChange={(event) => setForm((current) => ({ ...current, designation: event.target.value }))}>
              <option value="">{designationOptions.length ? "Select designation" : "No designation configured"}</option>
              {designationOptions.map((designation) => (
                <option key={designation} value={designation}>
                  {designation}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>Department</label>
              <select value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}>
                <option value="">Select department</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Reports To</label>
              <select value={form.reportsToId} onChange={(event) => setForm((current) => ({ ...current, reportsToId: event.target.value }))}>
                <option value="">No manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.username} ({manager.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ ...sectionTitle, marginTop: 8 }}>Schedule</div>

          <div className="field">
            <label>Managed Schedule</label>
            <select value={form.scheduleId} onChange={(event) => setForm((current) => ({ ...current, scheduleId: event.target.value }))}>
              <option value="">Custom timing</option>
              {scheduleOptions.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.name}
                </option>
              ))}
            </select>
            {selectedSchedule && (
              <span style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                {selectedSchedule.scheduleType === "time_based"
                  ? `${selectedSchedule.fixedCheckInTime} to ${selectedSchedule.fixedCheckOutTime} with ${selectedSchedule.bufferMinutes || 0} min buffer`
                  : `Flexible schedule with max check-in ${selectedSchedule.maxCheckInTime} and ${selectedSchedule.totalDailyHours} hrs/day`}
              </span>
            )}
          </div>

          <div className="field">
            <label>Timings (Mon - Sat)</label>
            <input
              placeholder="e.g. 10-6"
              value={form.timing}
              onChange={(event) => setForm((current) => ({ ...current, timing: event.target.value }))}
              disabled={!!selectedSchedule}
            />
            <span style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
              {selectedSchedule ? "Managed schedule will be applied to the selected working days" : "Applied uniformly to all weekdays"}
            </span>
          </div>

          <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "Adding..." : "Add Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}
