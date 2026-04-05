import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import "../styles/chat.css";

let socket;

export default function Chat() {
  const { token } = useAuth();
  const [activeRoom, setActiveRoom] = useState(null);

  useEffect(() => {
    socket = io("http://localhost:5000", {
      auth: { token }
    });

    socket.on("connect", () => {
      console.log("🟢 Socket connected");
    });

    socket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const handleLeaveGroup = (roomId) => {
    if (activeRoom?._id === roomId) setActiveRoom(null);
  };

  return (
    <div className="chat-layout">
      <Sidebar
        onSelectRoom={setActiveRoom}
        activeRoomId={activeRoom?._id}
        socket={socket}
      />
      {activeRoom
        ? (
          <ChatWindow
            room={activeRoom}
            socket={socket}
            onLeaveGroup={handleLeaveGroup}
          />
        )
        : (
          <div className="no-chat">
            <h3>👈 Select a chat to start messaging</h3>
            <p>Choose a user or group from the sidebar</p>
          </div>
        )
      }
    </div>
  );
}