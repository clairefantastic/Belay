import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import ChannelsPage from "./pages/ChannelsPage"; // Import the new ChannelsPage
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Settings from "./pages/Settings";

function App() {
  const token = localStorage.getItem("belay_token");

  return (
    <Router>
      <Routes>
        {/* Redirect the user to /channels if they are logged in, else to login */}
        <Route path="/" element={token ? <Navigate to="/channels" /> : <Navigate to="/login" />} />

        {/* Login & Signup Routes */}
        <Route path="/login" element={token ? <Navigate to="/channels" /> : <Login />} />
        <Route path="/signup" element={token ? <Navigate to="/channels" /> : <Signup />} />

        {/* Channel List Page */}
        <Route path="/channels" element={token ? <ChannelsPage /> : <Navigate to="/login" />} />

        {/* Chat Page for a specific channel */}
        <Route path="/channel/:channelId" element={token ? <Chat /> : <Navigate to="/login" />} />
        <Route path="/channel/:channelId/thread/:messageId" element={token ? <Chat /> : <Navigate to="/login" />} />

        {/* Settings Page */}
        <Route path="/settings" element={token ? <Settings /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
