import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Chat.css";

function Chat() {
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [reactions, setReactions] = useState({});
  const [replies, setReplies] = useState([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [replyText, setReplyText] = useState(""); // New state for separate reply input
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState('channels'); // 'channels', 'messages', or 'thread'
  const navigate = useNavigate();
  const token = localStorage.getItem("belay_token");
  
  // Reference to track window resizing
  const windowSize = useRef([window.innerWidth, window.innerHeight]);

  const { channelId, messageId } = useParams(); // Capture the channelId and messageId from URL params

  // Redirect to login if no token is found
  useEffect(() => {
    if (!token) {
      navigate("/login");
    } 
  }, [token, navigate]);

  // Fetch channels on page load
  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/channel/list", {
      headers: { "Authorization": `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setChannels(data.channels));
  }, [token]);

  useEffect(() => {
    if (channelId) {
      setSelectedChannel(channelId);
    }
    if (messageId) {
      setSelectedMessage(messageId);
    }
  }, [channelId, messageId]);

  const fetchUnreadCounts = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/channel/unread_counts", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await response.json();
      setUnreadCounts(data.unread_counts);
    } catch (error) {
      console.error("Error fetching unread counts:", error);
    }
  };

  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch messages for selected channel every 500ms
  useEffect(() => {
    if (!selectedChannel) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:5000/api/message/channel/${selectedChannel}/messages`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        setMessages(data.messages);

        if (data.messages.length > 0) {
          const lastMessageId = data.messages[data.messages.length - 1].id;

          // Update last seen message
          await fetch("http://127.0.0.1:5000/api/message/update_last_read", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ channel_id: selectedChannel, last_seen_message_id: lastMessageId }),
          });

          // Fetch unread counts again
          fetchUnreadCounts();
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 500);
    return () => clearInterval(interval);
  }, [selectedChannel, token]);

  const selectChannel = (channelId) => {
    setSelectedChannel(channelId);
    setSelectedMessage(null);
    navigate(`/channel/${channelId}`); // Navigate to the selected channel
    if (isMobile) {
      setMobileView('messages');
    }
  };

  const sendMessage = async () => {
    if (!selectedChannel || !messageText.trim()) return;

    const response = await fetch("http://127.0.0.1:5000/api/message/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ channel_id: selectedChannel, text: messageText, replies_to: null }),
    });

    if (response.ok) {
      setMessageText("");
    }
  };

  const sendReply = async () => {
    if (!selectedChannel || !selectedMessage || !replyText.trim()) return;

    try {
      const response = await fetch("http://127.0.0.1:5000/api/message/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          channel_id: selectedChannel, 
          text: replyText, 
          replies_to: selectedMessage 
        }),
      });

      if (response.ok) {
        setReplyText("");
        // Wait a brief moment to ensure the server has processed the new reply
        setTimeout(() => {
          fetchReplies(selectedMessage);
        }, 100);
      } else {
        console.error("Failed to send reply:", await response.text());
      }
    } catch (error) {
      console.error("Error sending reply:", error);
    }
  };

  const fetchReplies = async (messageId) => {
    const response = await fetch(`http://127.0.0.1:5000/api/message/replies/${messageId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    const data = await response.json();
    setReplies(data.replies);
  };

  useEffect(() => {
    if (selectedMessage) {
      fetchReplies(selectedMessage);
    }
  }, [selectedMessage]);

  const handleReplyClick = (messageId) => {
    setSelectedMessage(messageId);
    navigate(`/channel/${selectedChannel}/thread/${messageId}`); // Navigate to the reply thread
    if (isMobile) {
      setMobileView('thread');
    }
  };

  const closeThread = () => {
    setSelectedMessage(null);
    navigate(`/channel/${selectedChannel}`);
    if (isMobile) {
      setMobileView('messages');
    }
  };

  const extractImageURL = (text) => {
    const imageMatch = text.match(/\bhttps?:\/\/\S+\.(png|jpg|jpeg|gif|webp)\b/i);
    return imageMatch ? imageMatch[0] : null;
  };

  const addReaction = async (messageId, emoji) => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/message/react", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ message_id: messageId, emoji }),
      });

      if (response.ok) {
        fetchReactions(messageId);  // Refresh reactions after adding one
      }
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const fetchReactions = async (messageId) => {
    const response = await fetch(`http://127.0.0.1:5000/api/message/reactions/${messageId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    const data = await response.json();
    setReactions((prev) => ({ ...prev, [messageId]: data }));
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

      // Check if the data contains the expected channel object
      if (data.id && data.name) {
        // Update the channel list and navigate to the new channel's page
        setChannels((prevChannels) => [...prevChannels, { id: data.id, name: newChannelName }]);
        setNewChannelName(""); // Clear the input field

        // Navigate to the newly created channel page
        navigate(`/channel/${data.id}`);
      } else {
        console.error("Channel creation failed: Missing data");
      }
    } else {
      console.error("Failed to create channel");
    }
  };

  // Find the original message that the thread is replying to
  const findOriginalMessage = () => {
    return messages.find(msg => msg.id === selectedMessage);
  };
  
  // Check for mobile view and update state accordingly
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Update mobile view based on navigation
  useEffect(() => {
    if (isMobile) {
      if (selectedMessage) {
        setMobileView('thread');
      } else if (selectedChannel) {
        setMobileView('messages');
      } else {
        setMobileView('channels');
      }
    }
  }, [isMobile, selectedChannel, selectedMessage]);
  
  const navigateToChannelList = () => {
    setSelectedChannel(null);
    setSelectedMessage(null);
    navigate('/');
    setMobileView('channels');
  };
  
  const navigateToChannel = (channelId) => {
    selectChannel(channelId);
    if (isMobile) {
      setMobileView('messages');
    }
  };

  return (
    <div className="chat-container">
      {/* Sidebar with Channels */}
      <div className={`sidebar ${isMobile && mobileView !== 'channels' ? 'hidden' : ''}`}>
        <h2>Channels</h2>
        <div className="channel-list">
          {channels.map((channel) => (
            <div 
              key={channel.id} 
              className={`channel ${channel.id === selectedChannel ? 'selected' : ''}`} 
              onClick={() => navigateToChannel(channel.id)}
            >
              {channel.name}
              {unreadCounts[channel.id] > 0 && <span className="unread-badge">{unreadCounts[channel.id]}</span>}
            </div>
          ))}
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
        <button className="settings-btn" onClick={() => navigate("/settings")}>⚙️ Settings</button>
        <button className="logout-btn" onClick={() => { localStorage.removeItem("belay_token"); navigate("/login"); }}>
          Logout
        </button>
      </div>

      {/* Chat Window */}
      <div className={`chat-window ${selectedMessage && !isMobile ? 'with-thread' : ''} ${isMobile && mobileView === 'messages' ? 'visible' : ''}`}>
        {isMobile && (
          <button className="back-button" onClick={navigateToChannelList}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Channels
          </button>
        )}
        
        <h2>{selectedChannel ? `Channel ${selectedChannel}` : "Select a Channel"}</h2>
        <div className="messages-container">
          {messages.map((msg, index) => {
            const imageUrl = extractImageURL(msg.text);
            const textWithoutImage = imageUrl ? msg.text.replace(imageUrl, "").trim() : msg.text;

            return (
              <div key={index} className="message-bubble">
                <strong>{msg.username}:</strong> {textWithoutImage}

                {/* Display Image If Found */}
                {imageUrl && <img src={imageUrl} alt="sent image" className="chat-image" />}

                {/* Reply Button */}
                <button onClick={() => handleReplyClick(msg.id)}>Reply</button>

                {/* Display Reply Count */}
                {msg.reply_count > 0 && 
                  <div className="reply-count" onClick={() => handleReplyClick(msg.id)}>
                    💬 {msg.reply_count} replies
                  </div>
                }
                
                {/* Display Reactions */}
                <div className="reaction-container">
                  {reactions[msg.id] &&
                    Object.entries(reactions[msg.id]).map(([emoji, users]) => (
                      <span key={emoji} title={users.join(", ")} className="reaction">
                        {emoji} {users.length}
                      </span>
                    ))}
                  <button onClick={() => addReaction(msg.id, "👍")}>👍</button>
                  <button onClick={() => addReaction(msg.id, "😂")}>😂</button>
                  <button onClick={() => addReaction(msg.id, "🔥")}>🔥</button>
                  <button onClick={() => addReaction(msg.id, "❤️")}>❤️</button>
                  <button onClick={() => addReaction(msg.id, "😲")}>😲</button>
                  <button onClick={() => addReaction(msg.id, "😢")}>😢</button>
                  <button onClick={() => addReaction(msg.id, "👏")}>👏</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Field */}
        <div className="input-container">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>

      {/* Reply Thread as Third Column */}
      {selectedMessage && (
        <div className={`reply-pane ${isMobile && mobileView === 'thread' ? 'visible' : ''}`}>
          {/* Close button for desktop */}
          <button className="close-thread-btn" onClick={closeThread}>✕</button>
          
          {/* Back button for mobile */}
          {isMobile && (
            <button className="back-button" onClick={closeThread}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Channel
            </button>
          )}
          
          <h3>Thread</h3>
          
          {/* Original message */}
          {findOriginalMessage() && (
            <div className="message-bubble" style={{ backgroundColor: '#4a4d55', maxWidth: '100%' }}>
              <strong>Original: {findOriginalMessage().username}</strong>
              <p>{findOriginalMessage().text}</p>
              {extractImageURL(findOriginalMessage().text) && (
                <img src={extractImageURL(findOriginalMessage().text)} alt="original image" className="chat-image" />
              )}
            </div>
          )}
          
          <h4>Replies</h4>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {replies.length === 0 ? (
              <p>No replies yet</p>
            ) : (
              replies.map((reply, index) => (
                <div key={index} className="reply-bubble">
                  <strong>{reply.username}:</strong> {reply.text}
                  {extractImageURL(reply.text) && (
                    <img src={extractImageURL(reply.text)} alt="reply image" className="chat-image" />
                  )}
                </div>
              ))
            )}
          </div>
          
          {/* Reply input field */}
          <div className="input-container" style={{ marginTop: '10px' }}>
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to thread..."
            />
            <button onClick={sendReply}>Reply</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;