// User List module:
// - Search by name
// - Filter by department & status
// - Sort by any column
// - View Profile (inline expand)
// - Deactivate/Activate toggle with confirmation
// - Delete with confirmation

import { useState, useMemo } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";

const ALL_USERS = gql`
  query AllUsers {
    allUsers {
      id
      username
      role
      employeeNumber
      designation
      department
      reportsTo
      joiningDate
      isActive
    }
  }
`;

const DEACTIVATE_USER = gql`
  mutation DeactivateUser($userId: ID!) {
    deactivateUser(userId: $userId)
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($userId: ID!) {
    deleteUser(userId: $userId)
  }
`;

function initials(name) {
  if (!name) return "?";
  return name.split(/[\s._]/).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = "Confirm", danger = false }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "var(--bg-primary, #fff)", borderRadius: 12, padding: "28px 32px",
          maxWidth: 420, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 15, color: "var(--text-primary, #111)", marginBottom: 20, lineHeight: 1.5 }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 20px", border: "1px solid #e5c6c6", borderRadius: 8,
              background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "8px 20px", border: "none", borderRadius: 8,
              background: danger ? "#c0392b" : "#2d6a4f", color: "#fff",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileDrawer({ user, onClose }) {
  if (!user) return null;
  const fields = [
    ["Employee Number", user.employeeNumber || "—"],
    ["Username",        user.username],
    ["Role",            user.role],
    ["Designation",     user.designation || "—"],
    ["Department",      user.department  || "—"],
    ["Reports To",      user.reportsTo   || "—"],
    ["Date of Joining", user.joiningDate || "—"],
    ["Status",          user.isActive ? "Active" : "Inactive"],
  ];

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
        display: "flex", justifyContent: "flex-end", zIndex: 900,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 360, height: "100%", background: "var(--bg-primary, #fff)",
          padding: "32px 28px", overflowY: "auto",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          animation: "slideIn 0.22s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
              <div
                className="hrm-avatar"
                style={{ width: 52, height: 52, fontSize: 18, background: "#fdecea", color: "#c0392b", flexShrink: 0 }}
              >
                {initials(user.username)}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary, #111)" }}>{user.username}</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{user.designation || user.role}</div>
              </div>
            </div>
            <span
              style={{
                display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                background: user.isActive ? "#e8f8ef" : "#fdf4f4",
                color: user.isActive ? "#1a7a4a" : "#c0392b",
                border: `1px solid ${user.isActive ? "#abebc6" : "#f5c6cb"}`,
              }}
            >
              {user.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer", fontSize: 20,
              color: "#aaa", lineHeight: 1, padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {fields.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0", borderBottom: "1px solid #f0f0f0",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                {label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary, #111)", textAlign: "right", maxWidth: "60%" }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const SORT_FIELDS = {
  employeeNumber: "Emp #",
  username:       "Name",
  designation:    "Designation",
  department:     "Department",
  reportsTo:      "Reports To",
  joiningDate:    "Joining Date",
};

export default function UserList({ setTab, setProfileUserId }) {
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortField, setSortField] = useState("employeeNumber");
  const [sortDir, setSortDir] = useState("asc");
  const [profileUser, setProfileUser] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type: "deactivate"|"delete", user }
  const [toast, setToast] = useState("");

  const { data, loading, refetch } = useQuery(ALL_USERS, { fetchPolicy: "network-only" });
  const [deactivateUser, { loading: deactivating }] = useMutation(DEACTIVATE_USER);
  const [deleteUser, { loading: deleting }] = useMutation(DELETE_USER);

  const allUsers = data?.allUsers || [];

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set(allUsers.map((u) => u.department).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [allUsers]);

  // Filter + search + sort
  const filtered = useMemo(() => {
    let list = allUsers.filter((u) => {
      const matchSearch =
        !search ||
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.employeeNumber?.toLowerCase().includes(search.toLowerCase()) ||
        u.designation?.toLowerCase().includes(search.toLowerCase()) ||
        u.department?.toLowerCase().includes(search.toLowerCase());

      const matchDept = filterDept === "All" || u.department === filterDept;

      const matchStatus =
        filterStatus === "All" ||
        (filterStatus === "Active" && u.isActive) ||
        (filterStatus === "Inactive" && !u.isActive);

      return matchSearch && matchDept && matchStatus;
    });

    list = [...list].sort((a, b) => {
      const av = (a[sortField] || "").toString().toLowerCase();
      const bv = (b[sortField] || "").toString().toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1  : -1;
      return 0;
    });

    return list;
  }, [allUsers, search, filterDept, filterStatus, sortField, sortDir]);

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleDeactivate() {
    try {
      const res = await deactivateUser({ variables: { userId: confirm.user.id } });
      await refetch();
      showToast(res.data.deactivateUser);
    } catch (e) {
      showToast("Error: " + e.message);
    } finally {
      setConfirm(null);
    }
  }

  async function handleDelete() {
    try {
      await deleteUser({ variables: { userId: confirm.user.id } });
      await refetch();
      showToast(`"${confirm.user.username}" deleted successfully`);
    } catch (e) {
      showToast("Error: " + e.message);
    } finally {
      setConfirm(null);
      setProfileUser(null);
    }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: "#c0392b" }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>User List</h1>
        <p>Manage all employees and interns in the system</p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 2000,
            background: "#2d0a0a", color: "#fff", borderRadius: 10,
            padding: "12px 20px", fontSize: 13, fontWeight: 500,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          {toast}
        </div>
      )}

      {/* Search + Filters */}
      <div
        style={{
          display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <span
            style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              fontSize: 14, color: "#aaa", pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by name, ID, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "8px 10px 8px 32px",
              border: "1px solid #e5c6c6", borderRadius: 8,
              fontSize: 13, boxSizing: "border-box",
              background: "var(--bg-primary, #fff)",
              color: "var(--text-primary, #111)",
            }}
          />
        </div>

        {/* Department filter */}
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          style={{
            padding: "8px 12px", border: "1px solid #e5c6c6", borderRadius: 8,
            fontSize: 13, cursor: "pointer", background: "var(--bg-primary, #fff)",
            color: "var(--text-primary, #111)",
          }}
        >
          {departments.map((d) => (
            <option key={d} value={d}>
              {d === "All" ? "All Departments" : d}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: "8px 12px", border: "1px solid #e5c6c6", borderRadius: 8,
            fontSize: 13, cursor: "pointer", background: "var(--bg-primary, #fff)",
            color: "var(--text-primary, #111)",
          }}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        {/* Count badge */}
        <span
          style={{
            marginLeft: "auto", fontSize: 12, color: "#888",
            background: "#f5e5e5", borderRadius: 10, padding: "4px 12px",
            border: "1px solid #e5c6c6",
          }}
        >
          {filtered.length} {filtered.length === 1 ? "user" : "users"}
        </span>
         <button
          className="btn-primary"
          onClick={() => setTab("addEmployee")}
          style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span>
          Add New Employee
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ color: "#aaa", padding: "3rem", textAlign: "center" }}>
            Loading users...
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {Object.entries(SORT_FIELDS).map(([field, label]) => (
                    <th
                      key={field}
                      onClick={() => toggleSort(field)}
                      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                    >
                      {label}
                      <SortIcon field={field} />
                    </th>
                  ))}
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "#aaa", padding: "3rem" }}>
                      No users found.
                    </td>
                  </tr>
                )}
                {filtered.map((u) => (
                  <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.55 }}>
                    <td style={{ fontWeight: 600, color: "#c0392b", fontSize: 12 }}>
                      {u.employeeNumber || "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          className="hrm-avatar"
                          style={{
                            width: 28, height: 28, fontSize: 10,
                            background: u.isActive ? "#fdecea" : "#f0f0f0",
                            color: u.isActive ? "#c0392b" : "#aaa",
                          }}
                        >
                          {initials(u.username)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{u.username}</span>
                      </div>
                    </td>
                    <td style={{ color: "#555" }}>{u.designation || "—"}</td>
                    <td>
                      {u.department ? (
                        <span
                          style={{
                            background: "#f5f0ff", color: "#6d28d9",
                            borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600,
                          }}
                        >
                          {u.department}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ color: "#555" }}>{u.reportsTo || "—"}</td>
                    <td style={{ color: "#888", fontSize: 12 }}>{u.joiningDate || "—"}</td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                          background: u.isActive ? "#e8f8ef" : "#fdf4f4",
                          color: u.isActive ? "#1a7a4a" : "#c0392b",
                          border: `1px solid ${u.isActive ? "#abebc6" : "#f5c6cb"}`,
                        }}
                      >
                        <span
                          style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: u.isActive ? "#1a7a4a" : "#c0392b",
                            display: "inline-block",
                          }}
                        />
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {/* View Profile */}
                        {/* <button
                          onClick={() => setProfileUser(u)}
                          style={{
                            padding: "4px 10px", borderRadius: 6, border: "1px solid #e5c6c6",
                            background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500,
                            color: "#444",
                          }}
                        >
                          View
                        </button> */}
                        <button
                        onClick={() => { setProfileUserId(u.id); setTab("employeeProfile"); }}
                        style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e5c6c6",
                        background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#444" }}> View
                        </button>

                        {/* Deactivate / Activate toggle */}
                        <button
                          onClick={() =>
                            setConfirm({
                              type: "deactivate",
                              user: u,
                              message: u.isActive
                                ? `Deactivate "${u.username}"? They will no longer be able to log in.`
                                : `Re-activate "${u.username}"? They will regain access to the portal.`,
                              confirmLabel: u.isActive ? "Deactivate" : "Activate",
                              danger: u.isActive,
                            })
                          }
                          disabled={deactivating}
                          style={{
                            padding: "4px 10px", borderRadius: 6,
                            border: `1px solid ${u.isActive ? "#f5c6cb" : "#abebc6"}`,
                            background: u.isActive ? "#fdf4f4" : "#e8f8ef",
                            color: u.isActive ? "#c0392b" : "#1a7a4a",
                            cursor: "pointer", fontSize: 12, fontWeight: 500,
                          }}
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() =>
                            setConfirm({
                              type: "delete",
                              user: u,
                              message: `Permanently delete "${u.username}"? This will remove all their data including attendance and leave records. This cannot be undone.`,
                              confirmLabel: "Delete",
                              danger: true,
                            })
                          }
                          disabled={deleting}
                          style={{
                            padding: "4px 10px", borderRadius: 6,
                            border: "1px solid #e5e5e5", background: "#fafafa",
                            color: "#c0392b", cursor: "pointer", fontSize: 12, fontWeight: 500,
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Profile drawer */}
      {profileUser && (
        <ProfileDrawer
          user={profileUser}
          onClose={() => setProfileUser(null)}
        />
      )}

      {/* Confirmation dialog */}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.type === "delete" ? handleDelete : handleDeactivate}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}