import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Auth.css"; 

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    const response = await fetch("http://127.0.0.1:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("belay_token", data.access_token);
      navigate("/chat");
    } else {
      alert("Login failed: " + data.error);
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Login</button>

      <p>Don't have an account?</p>
      <button className="signup-btn" onClick={() => navigate("/signup")}>
        Sign Up
      </button>
    </div>
  );
}

export default Login;
