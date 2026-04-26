import React from "react";

export default function ToastPopup({ message, type = "success" }) {
  if (!message) return null;
  return (
    <div className="toast-overlay" role="status" aria-live="polite">
      <div className={`toast-popup ${type}`}>{message}</div>
    </div>
  );
}
