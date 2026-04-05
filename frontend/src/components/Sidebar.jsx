import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import "../styles/sidebar.css";

export default function Sidebar({ onSelectRoom, activeRoomId, socket }) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchRooms();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("online_users", (userIds) => {
      setOnlineUsers(userIds);
    });

    socket.on("new_message", (msg) => {
      if (msg.roomId !== activeRoomId) {
        setUnreadCounts(prev => ({
          ...prev,
          [msg.roomId]: (prev[msg.roomId] || 0) + 1
        }));
      }
      fetchRooms();
    });

    return () => {
      socket.off("online_users");
      socket.off("new_message");
    };
  }, [socket, activeRoomId]);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/chat/users");
      setUsers(data.users);
    } catch (err) {}
  };

  const fetchRooms = async () => {
    try {
      const { data } = await api.get("/chat/rooms");
      setRooms(data.rooms);
    } catch (err) {}
  };

  const handleUserClick = async (userId) => {
    try {
      const { data } = await api.get(`/chat/dm/${userId}`);
      onSelectRoom(data.room);
      setUnreadCounts(prev => ({ ...prev, [data.room._id]: 0 }));
      fetchRooms();
    } catch (err) {}
  };

  const handleRoomClick = (room) => {
    onSelectRoom(room);
    setUnreadCounts(prev => ({ ...prev, [room._id]: 0 }));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    try {
      const { data } = await api.post("/chat/group", {
        name: groupName,
        memberIds: selectedMembers
      });
      onSelectRoom(data.room);
      setShowModal(false);
      setGroupName("");
      setSelectedMembers([]);
      fetchRooms();
    } catch (err) {}
  };

  const toggleMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getInitial = (name) => name?.charAt(0).toUpperCase();

  const getRoomName = (room) => {
    if (room.type === "group") return room.name;
    const other = room.members?.find(m => m._id !== user?._id);
    return other?.name || "Unknown";
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRooms = rooms.filter(r =>
    getRoomName(r).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div>
          <h2>💬 Chat</h2>
          <p style={{ fontSize: "12px", color: "#888" }}>Hi, {user?.name}</p>
        </div>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>

      <div className="sidebar-search">
        <input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="sidebar-tabs">
        <button
          className={tab === "users" ? "active" : ""}
          onClick={() => setTab("users")}
        >
          Users
        </button>
        <button
          className={tab === "rooms" ? "active" : ""}
          onClick={() => setTab("rooms")}
        >
          Chats
        </button>
      </div>

      <div className="sidebar-list">
        {tab === "users" && filteredUsers.map(u => (
          <div
            key={u._id}
            className="sidebar-item"
            onClick={() => handleUserClick(u._id)}
          >
            <div className="avatar">
              {u.faceImageUrl
                ? <img src={u.faceImageUrl} alt={u.name} />
                : getInitial(u.name)
              }
              {onlineUsers.includes(u._id) && <span className="online-dot" />}
            </div>
            <div className="sidebar-item-info">
              <h4>{u.name}</h4>
              <p>{u.email}</p>
            </div>
          </div>
        ))}

        {tab === "rooms" && filteredRooms.map(r => (
          <div
            key={r._id}
            className={`sidebar-item ${activeRoomId === r._id ? "active" : ""}`}
            onClick={() => handleRoomClick(r)}
          >
            <div className="avatar">
              {r.type === "group" ? "👥" : getInitial(getRoomName(r))}
            </div>
            <div className="sidebar-item-info">
              <h4>{getRoomName(r)}</h4>
              <p>{r.type === "group" ? "Group chat" : "Direct message"}</p>
            </div>
            {unreadCounts[r._id] > 0 && (
              <span className="unread-badge">{unreadCounts[r._id]}</span>
            )}
          </div>
        ))}
      </div>

      <button className="create-group-btn" onClick={() => setShowModal(true)}>
        + Create Group
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create Group</h3>
            <input
              placeholder="Group name"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "8px" }}>
              Select members:
            </p>
            {users.map(u => (
              <div
                key={u._id}
                onClick={() => toggleMember(u._id)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: selectedMembers.includes(u._id) ? "#f0eeff" : "transparent",
                  marginBottom: "4px",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <span>{selectedMembers.includes(u._id) ? "✅" : "⬜"}</span>
                {u.name}
              </div>
            ))}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-create" onClick={handleCreateGroup}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}