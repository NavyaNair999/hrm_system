import { useMemo, useState } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { FiBarChart2, FiBriefcase, FiClock, FiKey, FiTag } from "react-icons/fi";
import EmployeeReports from "./EmployeeReports";

// query for settings data by omkar on 25/4/26 
const SETTINGS_DATA = gql`
  query SettingsData {
    departments(includeInactive: true) {
      id
      name
      isActive
    }
    designations(includeInactive: true) {
      id
      name
      isActive
    }
    workSchedules(includeInactive: true) {
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

const CHANGE_PASSWORD = gql`
  mutation ChangePassword($newPassword: String!) {
    changePassword(newPassword: $newPassword)
  }
`;
// mutations fro dept and designation management by omkar on 25/4/26
const CREATE_DEPARTMENT = gql`
  mutation CreateDepartment($name: String!) {
    createDepartment(name: $name)
  }
`;

const UPDATE_DEPARTMENT = gql`
  mutation UpdateDepartment($id: ID!, $name: String!) {
    updateDepartment(id: $id, name: $name)
  }
`;

const SET_DEPARTMENT_ACTIVE = gql`
  mutation SetDepartmentActive($id: ID!, $isActive: Boolean!) {
    setDepartmentActive(id: $id, isActive: $isActive)
  }
`;

const DELETE_DEPARTMENT = gql`
  mutation DeleteDepartment($id: ID!) {
    deleteDepartment(id: $id)
  }
`;

const CREATE_DESIGNATION = gql`
  mutation CreateDesignation($name: String!) {
    createDesignation(name: $name)
  }
`;

const UPDATE_DESIGNATION = gql`
  mutation UpdateDesignation($id: ID!, $name: String!) {
    updateDesignation(id: $id, name: $name)
  }
`;

const SET_DESIGNATION_ACTIVE = gql`
  mutation SetDesignationActive($id: ID!, $isActive: Boolean!) {
    setDesignationActive(id: $id, isActive: $isActive)
  }
`;

const DELETE_DESIGNATION = gql`
  mutation DeleteDesignation($id: ID!) {
    deleteDesignation(id: $id)
  }
`;

const CREATE_WORK_SCHEDULE = gql`
  mutation CreateWorkSchedule(
    $name: String!
    $scheduleType: String!
    $workingDays: [String!]!
    $maxCheckInTime: String
    $totalDailyHours: String
    $fixedCheckInTime: String
    $bufferMinutes: Int
    $fixedCheckOutTime: String
  ) {
    createWorkSchedule(
      name: $name
      scheduleType: $scheduleType
      workingDays: $workingDays
      maxCheckInTime: $maxCheckInTime
      totalDailyHours: $totalDailyHours
      fixedCheckInTime: $fixedCheckInTime
      bufferMinutes: $bufferMinutes
      fixedCheckOutTime: $fixedCheckOutTime
    )
  }
`;

const UPDATE_WORK_SCHEDULE = gql`
  mutation UpdateWorkSchedule(
    $id: ID!
    $name: String!
    $scheduleType: String!
    $workingDays: [String!]!
    $maxCheckInTime: String
    $totalDailyHours: String
    $fixedCheckInTime: String
    $bufferMinutes: Int
    $fixedCheckOutTime: String
  ) {
    updateWorkSchedule(
      id: $id
      name: $name
      scheduleType: $scheduleType
      workingDays: $workingDays
      maxCheckInTime: $maxCheckInTime
      totalDailyHours: $totalDailyHours
      fixedCheckInTime: $fixedCheckInTime
      bufferMinutes: $bufferMinutes
      fixedCheckOutTime: $fixedCheckOutTime
    )
  }
`;

const SET_WORK_SCHEDULE_ACTIVE = gql`
  mutation SetWorkScheduleActive($id: ID!, $isActive: Boolean!) {
    setWorkScheduleActive(id: $id, isActive: $isActive)
  }
`;

const DELETE_WORK_SCHEDULE = gql`
  mutation DeleteWorkSchedule($id: ID!) {
    deleteWorkSchedule(id: $id)
  }
`;

const DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
];

const eyeBtnStyle = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  color: "var(--text-tertiary)",
  display: "flex",
  alignItems: "center",
};

const pageTitleStyle = {
  fontSize: 28,
  fontWeight: 800,
  color: "var(--text-primary)",
  marginBottom: 8,
};

const pageSubStyle = {
  color: "var(--text-secondary)",
  fontSize: 14,
  marginBottom: 24,
};

const tileGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const tileStyle = {
  textAlign: "left",
  cursor: "pointer",
  minHeight: 160,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const tileIconStyle = {
  width: 44,
  height: 44,
  borderRadius: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(220, 38, 38, 0.08)",
  color: "var(--color-primary)",
  marginBottom: 16,
  fontSize: 18,
};

function statusPillStyle(isActive) {
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 700,
    background: isActive ? "rgba(16, 185, 129, 0.12)" : "rgba(107, 114, 128, 0.12)",
    color: isActive ? "var(--color-success)" : "var(--text-secondary)",
  };
}

function getScheduleSummary(schedule) {
  if (schedule.scheduleType === "time_based") {
    return `${schedule.fixedCheckInTime} - ${schedule.fixedCheckOutTime} | ${schedule.totalDailyHours} hrs | ${schedule.bufferMinutes || 0} min buffer`;
  }
  return `Flexible | Max in ${schedule.maxCheckInTime} | ${schedule.totalDailyHours} hrs/day`;
}

function createEmptyScheduleForm() {
  return {
    id: "",
    name: "",
    scheduleType: "hours_based",
    workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    maxCheckInTime: "",
    totalDailyHours: "",
    fixedCheckInTime: "",
    bufferMinutes: 0,
    fixedCheckOutTime: "",
  };
}

function ItemManager({
  title,
  description,
  items,
  createPlaceholder,
  singularLabel,
  onCreate,
  onUpdate,
  onToggleActive,
  onDelete,
}) {
  const [draftName, setDraftName] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [busyId, setBusyId] = useState("");
  const [feedback, setFeedback] = useState({ text: "", type: "" });
  const [deleteItem, setDeleteItem] = useState(null);

  async function handleCreate() {
    const nextName = draftName.trim();
    if (!nextName) {
      setFeedback({ text: `${singularLabel} name is required.`, type: "error" });
      return;
    }

    try {
      setBusyId("create");
      await onCreate(nextName);
      setDraftName("");
      setFeedback({ text: `${singularLabel} created successfully.`, type: "success" });
    } catch (error) {
      setFeedback({ text: error.message, type: "error" });
    } finally {
      setBusyId("");
    }
  }

  async function handleUpdate() {
    const nextName = editingName.trim();
    if (!editingItem || !nextName) {
      setFeedback({ text: `${singularLabel} name is required.`, type: "error" });
      return;
    }

    try {
      setBusyId(`edit-${editingItem.id}`);
      await onUpdate(editingItem.id, nextName);
      setEditingItem(null);
      setEditingName("");
      setFeedback({ text: `${singularLabel} updated successfully.`, type: "success" });
    } catch (error) {
      setFeedback({ text: error.message, type: "error" });
    } finally {
      setBusyId("");
    }
  }

  async function handleToggle(item) {
    try {
      setBusyId(`toggle-${item.id}`);
      await onToggleActive(item.id, !item.isActive);
      setFeedback({
        text: `${singularLabel} ${item.isActive ? "deactivated" : "activated"} successfully.`,
        type: "success",
      });
    } catch (error) {
      setFeedback({ text: error.message, type: "error" });
    } finally {
      setBusyId("");
    }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    try {
      setBusyId(`delete-${deleteItem.id}`);
      await onDelete(deleteItem.id);
      setDeleteItem(null);
      setFeedback({ text: `${singularLabel} deleted successfully.`, type: "success" });
    } catch (error) {
      setFeedback({ text: error.message, type: "error" });
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-sub">{description}</div>

      {feedback.text && <div className={`alert ${feedback.type}`}>{feedback.text}</div>}

      <div className="grid-2" style={{ marginBottom: 18, gridTemplateColumns: "1fr auto" }}>
        <input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder={createPlaceholder}
        />
        <button className="btn-primary" type="button" onClick={handleCreate} disabled={busyId === "create"}>
          {busyId === "create" ? "Saving..." : "Add"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((item) => (
          <div
            key={item.id}
            className="grid-2"
            style={{
              border: "1px solid var(--border-color)",
              borderRadius: 14,
              padding: 14,
              alignItems: "center",
              gridTemplateColumns: "1fr auto"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <strong style={{ color: "var(--text-primary)" }}>{item.name}</strong>
              <span style={statusPillStyle(item.isActive)}>{item.isActive ? "Active" : "Inactive"}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => {
                  setEditingItem(item);
                  setEditingName(item.name);
                }}
              >
                Rename
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => handleToggle(item)}
                disabled={busyId === `toggle-${item.id}`}
              >
                {busyId === `toggle-${item.id}` ? "Saving..." : item.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => setDeleteItem(item)}
                disabled={busyId === `delete-${item.id}`}
                style={{ color: "#c0392b" }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {!items.length && (
          <div className="empty-state" style={{ minHeight: 180 }}>
            <div className="empty-state-title">No {title.toLowerCase()} yet</div>
            <div className="empty-state-text">Create the first {singularLabel.toLowerCase()} to start managing it here.</div>
          </div>
        )}
      </div>

      {editingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">Rename {singularLabel}</div>
              <button className="modal-close" type="button" onClick={() => setEditingItem(null)}>x</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>{singularLabel} Name</label>
                <input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" type="button" onClick={() => setEditingItem(null)}>Cancel</button>
              <button className="btn-primary" type="button" onClick={handleUpdate} disabled={busyId === `edit-${editingItem.id}`}>
                {busyId === `edit-${editingItem.id}` ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">Delete {singularLabel}</div>
              <button className="modal-close" type="button" onClick={() => setDeleteItem(null)}>x</button>
            </div>
            <div className="modal-body">
              <div style={{ color: "var(--text-secondary)" }}>
                Delete <strong style={{ color: "var(--text-primary)" }}>{deleteItem.name}</strong>? This action cannot be undone.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" type="button" onClick={() => setDeleteItem(null)}>Cancel</button>
              <button
                className="btn-primary"
                type="button"
                onClick={handleDelete}
                disabled={busyId === `delete-${deleteItem.id}`}
                style={{ background: "linear-gradient(135deg, #b91c1c, #dc2626)" }}
              >
                {busyId === `delete-${deleteItem.id}` ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleModal({ form, setForm, onClose, onSave, loading }) {
  function toggleDay(day) {
    setForm((current) => {
      const exists = current.workingDays.includes(day);
      return {
        ...current,
        workingDays: exists
          ? current.workingDays.filter((item) => item !== day)
          : [...current.workingDays, day],
      };
    });
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 700, width: "90%" }}>
        <div className="modal-header">
          <div className="modal-title">{form.id ? "Edit Schedule" : "Create Schedule"}</div>
          <button className="modal-close" type="button" onClick={onClose}>x</button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-grid" style={{ gap: 16 }}>
            <div className="field">
              <label>Schedule Name</label>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="e.g. General Shift"
              />
            </div>

            <div className="field">
              <label>Schedule Type</label>
              <select
                value={form.scheduleType}
                onChange={(event) => setForm((current) => ({ ...current, scheduleType: event.target.value }))}
              >
                <option value="hours_based">Hours-Based Schedule</option>
                <option value="time_based">Time-Based Schedule</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Assigned Working Days</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {DAYS.map((day) => {
                const selected = form.workingDays.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    className={selected ? "btn-primary" : "btn-secondary"}
                    onClick={() => toggleDay(day.key)}
                    style={{ minWidth: 64 }}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {form.scheduleType === "hours_based" ? (
            <div className="form-grid" style={{ gap: 16 }}>
              <div className="field">
                <label>Maximum Check-In Time</label>
                <input
                  type="time"
                  value={form.maxCheckInTime}
                  onChange={(event) => setForm((current) => ({ ...current, maxCheckInTime: event.target.value }))}
                />
              </div>
              <div className="field">
                <label>Total Daily Hours Required</label>
                <input
                  value={form.totalDailyHours}
                  onChange={(event) => setForm((current) => ({ ...current, totalDailyHours: event.target.value }))}
                  placeholder="e.g. 8"
                />
              </div>
            </div>
          ) : (
            <div className="form-grid" style={{ gap: 16 }}>
              <div className="field">
                <label>Fixed Check-In Time</label>
                <input
                  type="time"
                  value={form.fixedCheckInTime}
                  onChange={(event) => setForm((current) => ({ ...current, fixedCheckInTime: event.target.value }))}
                />
              </div>
              <div className="field">
                <label>Buffer Time (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  value={form.bufferMinutes}
                  onChange={(event) => setForm((current) => ({ ...current, bufferMinutes: Number(event.target.value) }))}
                />
              </div>
              <div className="field">
                <label>Fixed Check-Out Time</label>
                <input
                  type="time"
                  value={form.fixedCheckOutTime}
                  onChange={(event) => setForm((current) => ({ ...current, fixedCheckOutTime: event.target.value }))}
                />
              </div>
              <div className="field">
                <label>Total Daily Hours</label>
                <input
                  value={form.totalDailyHours}
                  onChange={(event) => setForm((current) => ({ ...current, totalDailyHours: event.target.value }))}
                  placeholder="e.g. 9"
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="btn-primary" type="button" onClick={onSave} disabled={loading}>
            {loading ? "Saving..." : form.id ? "Update Schedule" : "Create Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PasswordCard() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState({ text: "", isError: false });
  const [changePassword, { loading }] = useMutation(CHANGE_PASSWORD);

  async function handleUpdate(event) {
    event.preventDefault();
    setMessage({ text: "", isError: false });

    if (newPassword.length < 6) {
      setMessage({ text: "Password must be at least 6 characters.", isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", isError: true });
      return;
    }

    try {
      await changePassword({ variables: { newPassword } });
      setMessage({ text: "Password updated successfully.", isError: false });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage({ text: error.message, isError: true });
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <div className="card-title">Account Security</div>
      <div className="card-sub">Update the admin password from the same settings workspace.</div>

      <form onSubmit={handleUpdate} className="login-fields">
        <div className="field">
          <label>New Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
              required
              minLength={6}
              style={{ paddingRight: 40, width: "100%" }}
            />
            <button type="button" style={eyeBtnStyle} onClick={() => setShowNew((value) => !value)}>
              {showNew ? <AiOutlineEye size={18} /> : <AiOutlineEyeInvisible size={18} />}
            </button>
          </div>
        </div>

        <div className="field">
          <label>Confirm Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter new password"
              required
              style={{ paddingRight: 40, width: "100%" }}
            />
            <button type="button" style={eyeBtnStyle} onClick={() => setShowConfirm((value) => !value)}>
              {showConfirm ? <AiOutlineEye size={18} /> : <AiOutlineEyeInvisible size={18} />}
            </button>
          </div>
        </div>

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>

        {message.text && <div className={`alert ${message.isError ? "error" : "success"}`}>{message.text}</div>}
      </form>
    </div>
  );
}

export default function AdminSettings({ currentUser }) {
  const [activeView, setActiveView] = useState("overview");
  const [scheduleForm, setScheduleForm] = useState(null);
  const [scheduleFeedback, setScheduleFeedback] = useState({ text: "", type: "" });
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const normalizedRole = String(currentUser?.role || "").toLowerCase();

  const { data, loading, error, refetch } = useQuery(SETTINGS_DATA, {
    fetchPolicy: "network-only",
  });

  const [createDepartment] = useMutation(CREATE_DEPARTMENT);
  const [updateDepartment] = useMutation(UPDATE_DEPARTMENT);
  const [setDepartmentActive] = useMutation(SET_DEPARTMENT_ACTIVE);
  const [deleteDepartment] = useMutation(DELETE_DEPARTMENT);
  const [createDesignation] = useMutation(CREATE_DESIGNATION);
  const [updateDesignation] = useMutation(UPDATE_DESIGNATION);
  const [setDesignationActive] = useMutation(SET_DESIGNATION_ACTIVE);
  const [deleteDesignation] = useMutation(DELETE_DESIGNATION);
  const [createWorkSchedule, { loading: createScheduleLoading }] = useMutation(CREATE_WORK_SCHEDULE);
  const [updateWorkSchedule, { loading: updateScheduleLoading }] = useMutation(UPDATE_WORK_SCHEDULE);
  const [setWorkScheduleActive] = useMutation(SET_WORK_SCHEDULE_ACTIVE);
  const [deleteWorkSchedule, { loading: deleteScheduleLoading }] = useMutation(DELETE_WORK_SCHEDULE);

  const departments = data?.departments || [];
  const designations = data?.designations || [];
  const workSchedules = data?.workSchedules || [];

  const tiles = useMemo(
    () => [
      {
        key: "schedules",
        icon: <FiClock />,
        title: "Schedule Creator",
        subtitle: "Create flexible and fixed working models for staff.",
        meta: `${workSchedules.length} configured`,
      },
      {
        key: "departments",
        icon: <FiBriefcase />,
        title: "Departments",
        subtitle: "Add, rename, activate, or deactivate departments.",
        meta: `${departments.filter((item) => item.isActive).length} active`,
      },
      {
        key: "designations",
        icon: <FiTag />,
        title: "Designations",
        subtitle: "Maintain the approved designation library.",
        meta: `${designations.filter((item) => item.isActive).length} active`,
      },
      {
        key: "password",
        icon: <FiKey />,
        title: "Password",
        subtitle: "Manage admin account security in the same module.",
        meta: "Admin only",
      },
      {
        key: "reports",
        icon: <FiBarChart2 />,
        title: "Reports Module",
        subtitle: "Attendance export hub for CSV or Excel-style analysis.",
        // meta: "Settings only",
      },
    ],
    [departments, designations, workSchedules]
  );

  if (currentUser && normalizedRole && normalizedRole !== "admin") {
    return (
      <div style={{ padding: 24 }}>
        <div className="alert error">Only admin can access and control settings.</div>
      </div>
    );
  }

  async function refreshData() {
    await refetch();
  }

  async function handleScheduleSave() {
    const variables = {
      name: scheduleForm.name.trim(),
      scheduleType: scheduleForm.scheduleType,
      workingDays: scheduleForm.workingDays,
      maxCheckInTime: scheduleForm.scheduleType === "hours_based" ? scheduleForm.maxCheckInTime : undefined,
      totalDailyHours: scheduleForm.totalDailyHours || undefined,
      fixedCheckInTime: scheduleForm.scheduleType === "time_based" ? scheduleForm.fixedCheckInTime : undefined,
      bufferMinutes: scheduleForm.scheduleType === "time_based" ? Number(scheduleForm.bufferMinutes) : undefined,
      fixedCheckOutTime: scheduleForm.scheduleType === "time_based" ? scheduleForm.fixedCheckOutTime : undefined,
    };

    try {
      if (scheduleForm.id) {
        await updateWorkSchedule({ variables: { id: scheduleForm.id, ...variables } });
        setScheduleFeedback({ text: "Schedule updated successfully.", type: "success" });
      } else {
        await createWorkSchedule({ variables });
        setScheduleFeedback({ text: "Schedule created successfully.", type: "success" });
      }
      setScheduleForm(null);
      await refreshData();
    } catch (mutationError) {
      setScheduleFeedback({ text: mutationError.message, type: "error" });
    }
  }

  async function handleScheduleToggle(schedule) {
    try {
      await setWorkScheduleActive({
        variables: { id: schedule.id, isActive: !schedule.isActive },
      });
      setScheduleFeedback({
        text: `Schedule ${schedule.isActive ? "deactivated" : "activated"} successfully.`,
        type: "success",
      });
      await refreshData();
    } catch (mutationError) {
      setScheduleFeedback({ text: mutationError.message, type: "error" });
    }
  }

  async function handleScheduleDelete() {
    if (!scheduleToDelete) return;
    try {
      await deleteWorkSchedule({ variables: { id: scheduleToDelete.id } });
      setScheduleFeedback({ text: "Schedule deleted successfully.", type: "success" });
      setScheduleToDelete(null);
      await refreshData();
    } catch (mutationError) {
      setScheduleFeedback({ text: mutationError.message, type: "error" });
    }
  }

  function renderOverview() {
    return (
      <>
        <div style={tileGridStyle}>
          {tiles.map((tile) => (
            <button
              key={tile.key}
              type="button"
              className="card"
              style={tileStyle}
              onClick={() => setActiveView(tile.key)}
            >
              <div>
                <div style={tileIconStyle}>{tile.icon}</div>
                <div className="card-title">{tile.title}</div>
                <div className="card-sub" style={{ marginBottom: 0 }}>{tile.subtitle}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary)" }}>{tile.meta}</div>
            </button>
          ))}
        </div>
      </>
    );
  }

  function renderSchedules() {
    return (
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div className="card-title">Schedule Creator</div>
            <div className="card-sub" style={{ marginBottom: 0 }}>
              Manage flexible hours-based schedules and fixed time-based shifts from one place.
            </div>
          </div>
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              setScheduleFeedback({ text: "", type: "" });
              setScheduleForm(createEmptyScheduleForm());
            }}
          >
            Add Schedule
          </button>
        </div>

        {scheduleFeedback.text && <div className={`alert ${scheduleFeedback.type}`} style={{ marginTop: 18 }}>{scheduleFeedback.text}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
          {workSchedules.map((schedule) => (
            <div
              key={schedule.id}
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: 14,
                padding: 16,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                  <strong style={{ color: "var(--text-primary)" }}>{schedule.name}</strong>
                  <span style={statusPillStyle(schedule.isActive)}>{schedule.isActive ? "Active" : "Inactive"}</span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {schedule.scheduleType === "time_based" ? "Time-Based" : "Hours-Based"}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6 }}>{getScheduleSummary(schedule)}</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  Working days: {schedule.workingDays.map((day) => day.slice(0, 3)).join(", ")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => {
                    setScheduleFeedback({ text: "", type: "" });
                    setScheduleForm({
                      id: schedule.id,
                      name: schedule.name,
                      scheduleType: schedule.scheduleType,
                      workingDays: [...schedule.workingDays],
                      maxCheckInTime: schedule.maxCheckInTime || "",
                      totalDailyHours: schedule.totalDailyHours || "",
                      fixedCheckInTime: schedule.fixedCheckInTime || "",
                      bufferMinutes: schedule.bufferMinutes || 0,
                      fixedCheckOutTime: schedule.fixedCheckOutTime || "",
                    });
                  }}
                >
                  Edit
                </button>
                <button className="btn-secondary" type="button" onClick={() => handleScheduleToggle(schedule)}>
                  {schedule.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => setScheduleToDelete(schedule)}
                  style={{ color: "#c0392b" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {!workSchedules.length && (
            <div className="empty-state" style={{ minHeight: 220 }}>
              <div className="empty-state-title">No schedules configured yet</div>
              <div className="empty-state-text">Create an hours-based or time-based schedule to standardize employee setup.</div>
            </div>
          )}
        </div>

        {scheduleForm && (
          <ScheduleModal
            form={scheduleForm}
            setForm={setScheduleForm}
            onClose={() => setScheduleForm(null)}
            onSave={handleScheduleSave}
            loading={createScheduleLoading || updateScheduleLoading}
          />
        )}

        {scheduleToDelete && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <div className="modal-title">Delete Schedule</div>
                <button className="modal-close" type="button" onClick={() => setScheduleToDelete(null)}>x</button>
              </div>
              <div className="modal-body">
                <div style={{ color: "var(--text-secondary)" }}>
                  Delete <strong style={{ color: "var(--text-primary)" }}>{scheduleToDelete.name}</strong>? This action cannot be undone.
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" type="button" onClick={() => setScheduleToDelete(null)}>Cancel</button>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={handleScheduleDelete}
                  disabled={deleteScheduleLoading}
                  style={{ background: "linear-gradient(135deg, #b91c1c, #dc2626)" }}
                >
                  {deleteScheduleLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div className="spinner-center"><span className="spinner spinner-lg" /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div className="alert error">{error.message}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={pageTitleStyle}>Settings</div>
      <div style={pageSubStyle}>
        Admin controls the complete settings workspace, including schedules, departments, designations, and reports.
      </div>

      {activeView !== "overview" && (
        <div className="breadcrumb">
          <span className="breadcrumb-item">
            <button
              type="button"
              onClick={() => setActiveView("overview")}
              style={{ background: "none", border: "none", color: "var(--color-primary)", cursor: "pointer", padding: 0 }}
            >
              Settings Home
            </button>
          </span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item active">{tiles.find((tile) => tile.key === activeView)?.title || "Settings"}</span>
        </div>
      )}

      {activeView === "overview" && renderOverview()}
      {activeView === "departments" && (
        <ItemManager
          title="Departments"
          description="Admin can add, rename, activate, or deactivate departments like IT, Finance, HR, and Marketing."
          items={departments}
          createPlaceholder="Add a new department"
          singularLabel="Department"
          onCreate={async (name) => {
            await createDepartment({ variables: { name } });
            await refreshData();
          }}
          onUpdate={async (id, name) => {
            await updateDepartment({ variables: { id, name } });
            await refreshData();
          }}
          onToggleActive={async (id, isActive) => {
            await setDepartmentActive({ variables: { id, isActive } });
            await refreshData();
          }}
          onDelete={async (id) => {
            await deleteDepartment({ variables: { id } });
            await refreshData();
          }}
        />
      )}
      {activeView === "designations" && (
        <ItemManager
          title="Designations"
          description="Admin can maintain the approved title library used while creating and managing employees."
          items={designations}
          createPlaceholder="Add a new designation"
          singularLabel="Designation"
          onCreate={async (name) => {
            await createDesignation({ variables: { name } });
            await refreshData();
          }}
          onUpdate={async (id, name) => {
            await updateDesignation({ variables: { id, name } });
            await refreshData();
          }}
          onToggleActive={async (id, isActive) => {
            await setDesignationActive({ variables: { id, isActive } });
            await refreshData();
          }}
          onDelete={async (id) => {
            await deleteDesignation({ variables: { id } });
            await refreshData();
          }}
        />
      )}
      {activeView === "schedules" && renderSchedules()}
      {activeView === "reports" && <EmployeeReports />}
      {activeView === "password" && <PasswordCard />}
    </div>
  );
}
