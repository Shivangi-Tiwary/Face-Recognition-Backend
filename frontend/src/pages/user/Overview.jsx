import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, StatCard, StatusBadge, API_BASE, authHeaders } from "../UserDashboard";

export default function Overview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/user/dashboard`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen />;

  const { user, today, monthStats, recentAttendance } = data || {};
  const pct = parseFloat(monthStats?.attendancePercentage || 0);

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] || "User"} 👋`}
        subtitle={new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        action={
          <button
            onClick={() => navigate("/user/tickets/new")}
            style={{
              background: "#4f8ef7", color: "#fff", border: "none",
              padding: "10px 20px", borderRadius: 8, fontSize: 13.5,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            + Raise a Ticket
          </button>
        }
      />

      {/* Today's Status Banner */}
      <TodayBanner today={today} />

      {/* Monthly Stats */}
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "#555", margin: "28px 0 12px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        This Month
      </h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <StatCard label="Working Days" value={monthStats?.workingDays ?? "—"} />
        <StatCard label="Present" value={monthStats?.presentDays ?? "—"} color="#22c55e" />
        <StatCard label="Absent" value={monthStats?.absentDays ?? "—"} color="#ef4444" />
        <StatCard label="On Time" value={monthStats?.onTime ?? "—"} color="#4f8ef7" />
        <StatCard label="Late" value={monthStats?.late ?? "—"} color="#f59e0b" />
      </div>

      {/* Attendance Percentage Bar */}
      <AttendanceBar pct={pct} />

      {/* Recent Attendance Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", marginTop: 28 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#0f1117" }}>Recent Attendance</span>
          <button
            onClick={() => navigate("/user/attendance")}
            style={{ background: "none", border: "none", color: "#4f8ef7", fontSize: 13, cursor: "pointer", fontWeight: 500 }}
          >
            View All →
          </button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              {["Date", "Check In", "Check Out", "Duration", "Status"].map((h) => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, color: "#888", fontWeight: 600, borderBottom: "1px solid #f0f0f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(recentAttendance || []).map((row, i) => {
              const dur = row.checkOut
                ? calcDuration(row.checkIn, row.checkOut)
                : "—";
              return (
                <tr key={i} style={{ borderBottom: "1px solid #f8f8f8" }}>
                  <td style={td}>{formatDate(row.date)}</td>
                  <td style={td}>{row.checkIn ? formatTime(row.checkIn) : "—"}</td>
                  <td style={td}>{row.checkOut ? formatTime(row.checkOut) : "—"}</td>
                  <td style={td}>{dur}</td>
                  <td style={td}><AttendanceStatusBadge status={row.status} /></td>
                </tr>
              );
            })}
            {(!recentAttendance || recentAttendance.length === 0) && (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#aaa", fontSize: 13 }}>No attendance records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Face Enrollment Card */}
      {!user?.faceEnrolled && (
        <div style={{
          background: "#fff8e1", border: "1px solid #ffe082", borderRadius: 12,
          padding: "16px 20px", marginTop: 20, display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#e65100" }}>Face not enrolled</div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>Contact admin to enroll your face for attendance tracking.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function TodayBanner({ today }) {
  if (!today) {
    return (
      <div style={{
        background: "#f8f9ff", border: "1px dashed #c7d3f0", borderRadius: 12,
        padding: "18px 24px", display: "flex", alignItems: "center", gap: 14,
      }}>
        <span style={{ fontSize: 28 }}>🕐</span>
        <div>
          <div style={{ fontWeight: 600, color: "#444", fontSize: 15 }}>Not checked in yet today</div>
          <div style={{ color: "#888", fontSize: 13, marginTop: 2 }}>Head to the attendance kiosk to check in.</div>
        </div>
      </div>
    );
  }

  const statusColors = { "on-time": "#22c55e", "late": "#f59e0b", "half-day": "#8b5cf6", "absent": "#ef4444" };
  const statusEmoji = { "on-time": "✅", "late": "⏰", "half-day": "⚡", "absent": "❌" };

  return (
    <div style={{
      background: "#fff", border: "1px solid #e8eaed", borderRadius: 12,
      padding: "18px 24px", display: "flex", gap: 32, flexWrap: "wrap",
      borderLeft: `4px solid ${statusColors[today.status] || "#4f8ef7"}`,
    }}>
      <div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>TODAY'S STATUS</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>{statusEmoji[today.status]}</span>
          <span style={{ fontWeight: 700, fontSize: 16, color: statusColors[today.status] }}>
            {today.status?.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>CHECK IN</div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{today.checkIn ? formatTime(today.checkIn) : "—"}</div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>CHECK OUT</div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{today.checkOut ? formatTime(today.checkOut) : "Pending"}</div>
      </div>
      {today.checkIn && today.checkOut && (
        <div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>DURATION</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{calcDuration(today.checkIn, today.checkOut)}</div>
        </div>
      )}
      {today.confidence !== undefined && (
        <div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>FACE CONFIDENCE</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{(today.confidence * 100).toFixed(1)}%</div>
        </div>
      )}
    </div>
  );
}

function AttendanceBar({ pct }) {
  const color = pct >= 90 ? "#22c55e" : pct >= 75 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0f1117" }}>Attendance Rate</span>
        <span style={{ fontSize: 18, fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ background: "#f0f0f0", borderRadius: 8, height: 10, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%",
          background: color, borderRadius: 8,
          transition: "width 0.8s ease",
        }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
        {[
          { label: "Excellent", range: "≥90%", active: pct >= 90 },
          { label: "Good", range: "75–89%", active: pct >= 75 && pct < 90 },
          { label: "Needs Improvement", range: "<75%", active: pct < 75 },
        ].map((item) => (
          <div key={item.label} style={{ fontSize: 11.5, color: item.active ? color : "#ccc", fontWeight: item.active ? 600 : 400 }}>
            {item.label} ({item.range})
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendanceStatusBadge({ status }) {
  const map = {
    "on-time": { bg: "#e8f5e9", color: "#2e7d32", label: "On Time" },
    "late": { bg: "#fff8e1", color: "#f57f17", label: "Late" },
    "half-day": { bg: "#f3e5f5", color: "#6a1b9a", label: "Half Day" },
    "absent": { bg: "#fce4ec", color: "#c62828", label: "Absent" },
  };
  const s = map[status] || { bg: "#f5f5f5", color: "#555", label: status };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
      {s.label}
    </span>
  );
}

function LoadingScreen() {
  return (
    <div style={{ padding: 32 }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ background: "#f0f0f0", borderRadius: 12, height: 80, marginBottom: 16, animation: "pulse 1.5s infinite" }} />
      ))}
    </div>
  );
}

const td = { padding: "12px 16px", fontSize: 13.5, color: "#333" };

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function calcDuration(checkIn, checkOut) {
  const diff = (new Date(checkOut) - new Date(checkIn)) / 1000 / 60;
  const h = Math.floor(diff / 60);
  const m = Math.round(diff % 60);
  return `${h}h ${m}m`;
}