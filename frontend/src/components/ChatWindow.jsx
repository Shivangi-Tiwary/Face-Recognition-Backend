import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import "../styles/chat.css";

export default function ChatWindow({ room, socket, onLeaveGroup }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const bottomRef = useRef();
  const typingTimeout = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    if (!room) return;
    fetchMessages();
    socket?.emit("join_room", room._id);
    socket?.emit("mark_read", { roomId: room._id });
  }, [room]);

  useEffect(() => {
    if (!socket) return;

    socket.on("new_message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on("message_deleted", ({ messageId }) => {
      setMessages(prev =>
        prev.map(m => m._id === messageId ? { ...m, deletedAt: true } : m)
      );
    });

    socket.on("user_typing", () => {
      setTyping("Someone is typing...");
    });

    socket.on("user_stop_typing", () => {
      setTyping("");
    });

    return () => {
      socket.off("new_message");
      socket.off("message_deleted");
      socket.off("user_typing");
      socket.off("user_stop_typing");
    };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data } = await api.get(`/chat/messages/${room._id}`);
      setMessages(data.messages);
    } catch (err) {}
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    if (selected.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(selected));
    } else {
      setFilePreview(null);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && !file) return;

    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("roomId", room._id);
      try {
        const { data } = await api.post("/chat/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        socket?.emit("send_message", {
          roomId: room._id,
          content: data.url,
          type: file.type.startsWith("image/") ? "image" : "file",
          fileName: file.name
        });
      } catch (err) {}
      setFile(null);
      setFilePreview(null);
      return;
    }

    socket?.emit("send_message", { roomId: room._id, content: input });
    setInput("");
    socket?.emit("stop_typing", { roomId: room._id });
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    socket?.emit("typing", { roomId: room._id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket?.emit("stop_typing", { roomId: room._id });
    }, 1500);
  };

  const handleDelete = (messageId) => {
    socket?.emit("delete_message", { messageId, roomId: room._id });
  };

const [showLeaveModal, setShowLeaveModal] = useState(false);

const handleLeave = async () => {
  try {
    await api.post(`/chat/room/${room._id}/leave`);
    setShowLeaveModal(false);
    onLeaveGroup(room._id);
  } catch (err) {}
};

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const getRoomName = () => {
    if (room.type === "group") return room.name;
    const other = room.members?.find(m => m._id !== user?._id);
    return other?.name || "Chat";
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (!room) return null;

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="avatar">
          {room.type === "group" ? "👥" : getRoomName().charAt(0)}
        </div>
        <div>
          <h3>{getRoomName()}</h3>
          <p>{room.type === "group" ? `${room.members?.length} members` : "Direct message"}</p>
        </div>
        <div className="chat-header-actions">
          {room.type === "group" && (
  <>
    <button className="leave-btn" onClick={() => setShowLeaveModal(true)}>
      Leave Group
    </button>

    {showLeaveModal && (
      <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h3>Leave Group?</h3>
          <p style={{ fontSize: "14px", color: "#555", marginBottom: "20px" }}>
            Are you sure you want to leave "{room.name}"?
          </p>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setShowLeaveModal(false)}>
              Cancel
            </button>
            <button
              onClick={handleLeave}
              style={{ flex: 1, padding: "10px", borderRadius: "10px", background: "#e53e3e", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    )}
  </>
)}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map(msg => {
          const isMine = msg.sender?._id === user?._id;
          return (
            <div
              key={msg._id}
              className={`message-row ${isMine ? "mine" : "theirs"}`}
            >
              <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                {msg.sender?.name?.charAt(0)}
              </div>
              <div>
                {!isMine && room.type === "group" && (
                  <div className="message-sender">{msg.sender?.name}</div>
                )}
                <div className="message-bubble">
                  {msg.deletedAt ? (
                    <span className="deleted-msg">🚫 Message deleted</span>
                  ) : msg.type === "image" ? (
                    <div className="media-msg">
                      <img src={msg.content} alt="sent" />
                    </div>
                  ) : msg.type === "file" ? (
                    <div className="media-msg">
                      <a href={msg.content} target="_blank" rel="noreferrer">
                        📎 {msg.fileName || "Download file"}
                      </a>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                <div className="message-meta">{formatTime(msg.createdAt)}</div>
              </div>
              {isMine && !msg.deletedAt && (
                <button className="delete-btn" onClick={() => handleDelete(msg._id)}>
                  🗑
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {typing && <div className="typing-indicator">{typing}</div>}

      {file && (
        <div className="file-preview">
          {filePreview
            ? <img src={filePreview} alt="preview" style={{ height: 48, borderRadius: 6 }} />
            : <span>📎 {file.name}</span>
          }
          <button onClick={() => { setFile(null); setFilePreview(null); }}>✕</button>
        </div>
      )}

      <div className="chat-input-area">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <button className="file-btn" onClick={() => fileInputRef.current.click()}>
          📎
        </button>
        <input
          placeholder="Type a message..."
          value={input}
          onChange={handleTyping}
          onKeyDown={handleKeyDown}
        />
        <button className="send-btn" onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}