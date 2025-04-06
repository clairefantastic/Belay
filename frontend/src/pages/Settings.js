import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Settings.css"; 

function Settings() {
  const [newUsername, setNewUsername] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const token = localStorage.getItem("belay_token");
  const navigate = useNavigate();

  const handleChangeUsername = async () => {
    if (!newUsername.trim()) return;

    const response = await fetch("http://127.0.0.1:5000/api/auth/profile/change-username", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ new_username: newUsername }),
    });

    const data = await response.json();
    setMessage(data.message || data.error);
  };

  const handleChangePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim()) return;

    const response = await fetch("http://127.0.0.1:5000/api/auth/profile/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });

    const data = await response.json();
    setMessage(data.message || data.error);
  };

  return (
    <div className="settings-container">
      <h2>Account Settings</h2>

      {/* Change Username */}
      <div className="settings-section">
        <h3>Change Username</h3>
        <input
          type="text"
          placeholder="New Username"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
        />
        <button onClick={handleChangeUsername}>Update Username</button>
      </div>

      {/* Change Password */}
      <div className="settings-section">
        <h3>Change Password</h3>
        <input
          type="password"
          placeholder="Current Password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button onClick={handleChangePassword}>Update Password</button>
      </div>

      {/* Display response message */}
      {message && <p className="settings-message">{message}</p>}

      <button className="back-btn" onClick={() => navigate("/chat")}>Back to Chat</button>
    </div>
  );
}

export default Settings;
