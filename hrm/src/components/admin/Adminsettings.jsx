import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

const CHANGE_PASSWORD = gql`
  mutation ChangePassword($newPassword: String!) {
    changePassword(newPassword: $newPassword)
  }
`;

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

export default function AdminSettings() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
            <div style={{ position: "relative" }}>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength={6}
                style={{ paddingRight: 40, width: "100%" }}
              />
              <button type="button" style={eyeBtnStyle} onClick={() => setShowNew((v) => !v)}>
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
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                style={{ paddingRight: 40, width: "100%" }}
              />
              <button type="button" style={eyeBtnStyle} onClick={() => setShowConfirm((v) => !v)}>
                {showConfirm ? <AiOutlineEye size={18} /> : <AiOutlineEyeInvisible size={18} />}
              </button>
            </div>
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