import { useState } from "react";
import { gql} from "@apollo/client";
import { useMutation } from "@apollo/client/react";

const CHANGE_PASSWORD = gql`
  mutation ChangePassword($newPassword: String!) {
    changePassword(newPassword: $newPassword)
  }
`;

export default function AdminSettings() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState({ text: "", isError: false });
  const [changePassword, { loading }] = useMutation(CHANGE_PASSWORD);

  async function handleUpdate(e) {
    e.preventDefault();
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
      setMessage({ text: "✓ Password updated successfully!", isError: false });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage({ text: "Error: " + err.message, isError: true });
    }
  }

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ marginBottom: "20px" }}>Account Settings</h2>
      <div className="card" style={{ maxWidth: "420px" }}>
        <h3 style={{ marginBottom: "18px" }}>Change Password</h3>
        <form onSubmit={handleUpdate} className="login-fields">
          <div className="field">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={6}
            />
          </div>
          <div className="field">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
          {message.text && (
            <p
              style={{
                marginTop: "12px",
                fontSize: "14px",
                color: message.isError ? "#e53e3e" : "#38a169",
              }}
            >
              {message.text}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}