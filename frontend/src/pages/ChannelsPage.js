import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ChannelsPage.css"; // Import CSS for Channel Page

function ChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [newChannelName, setNewChannelName] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("belay_token");

  // Fetch the list of channels
  useEffect(() => {
    if (!token) {
      navigate("/login"); // Redirect to login if no token
      return;
    }

    fetch("http://127.0.0.1:5000/api/channel/list", {
      headers: { "Authorization": `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setChannels(data.channels))
      .catch((error) => console.error("Error fetching channels:", error));
  }, [token, navigate]);

  const selectChannel = (channelId) => {
    navigate(`/channel/${channelId}`); // Navigate to the chat page for the selected channel
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;

    const response = await fetch("http://127.0.0.1:5000/api/channel/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newChannelName }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.id && data.name) {
        setChannels((prevChannels) => [...prevChannels, { id: data.id, name: newChannelName }]);
        setNewChannelName(""); // Clear the input field
        navigate(`/channel/${data.id}`); // Navigate to the newly created channel
      } else {
        console.error("Channel creation failed: Missing data");
      }
    } else {
      console.error("Failed to create channel");
    }
  };

  return (
    <div className="channels-page">
      {/* Sidebar with Channels */}
      <div className="sidebar">
        <h2>Channels</h2>
        <div className="channel-list">
          {channels.length > 0 ? (
            channels.map((channel) => (
              <div
                key={channel.id}
                className="channel-item"
                onClick={() => selectChannel(channel.id)}
              >
                {channel.name}
              </div>
            ))
          ) : (
            <p>No channels available.</p>
          )}
        </div>
        <div className="create-channel">
          <input
            type="text"
            placeholder="Enter new channel name"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
          />
          <button onClick={handleCreateChannel}>Create Channel</button>
        </div>
        <button className="settings-btn" onClick={() => navigate("/settings")}>
          ⚙️ Settings
        </button>
        <button
          className="logout-btn"
          onClick={() => {
            localStorage.removeItem("belay_token");
            navigate("/login");
          }}
        >
          Logout
        </button>
      </div>

      {/* Content area (could show details or other content later) */}
      <div className="chat-window">
        <h2>Select a Channel to Start Chatting</h2>
      </div>
    </div>
  );
}

export default ChannelsPage;


