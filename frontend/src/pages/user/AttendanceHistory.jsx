import { useState, useEffect, useRef } from "react";
import { PageHeader, StatCard, API_BASE, authHeaders } from "../UserDashboard";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function AttendanceHistory() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("table"); // table | chart | calendar

  useEffect(() => { fetchHistory(); }, [month, year]);

  const fetchHistory = () => {
    setLoading(true);
    fetch(`${API_BASE}/user/attendance/history?month=${month}&year=${year}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setAttendance(d.attendance); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const stats = calcStats(attendance);

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <PageHeader title="Attendance History" subtitle="Your attendance analytics and records" />

      {/* Month/Year Picker */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
        <select value={month} onChange={(e) => setMonth(e.target.value)} style={selectStyle}>
          {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(e.target.value)} style={selectStyle}>
          {[2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {["table", "chart", "calendar"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "1px solid #ddd", cursor: "pointer",
                background: view === v ? "#4f8ef7" : "#fff",
                color: view === v ? "#fff" : "#555",
              }}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Total Days" value={stats.total} />
        <StatCard label="On Time" value={stats.onTime} color="#22c55e" />
        <StatCard label="Late" value={stats.late} color="#f59e0b" />
        <StatCard label="Absent" value={stats.absent} color="#ef4444" sub={`out of ${stats.workingDays} working days`} />
        <StatCard label="Avg Duration" value={stats.avgDuration} color="#4f8ef7" />
        <StatCard label="Attendance %" value={`${stats.pct}%`} color={stats.pct >= 90 ? "#22c55e" : stats.pct >= 75 ? "#f59e0b" : "#ef4444"} />
      </div>

      {/* Weekly Summary */}
      <WeeklySummary attendance={attendance} />

      {/* View: Table */}
      {view === "table" && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", marginTop: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["Date", "Day", "Check In", "Check Out", "Duration", "Status"].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 12, color: "#888", fontWeight: 600, borderBottom: "1px solid #f0f0f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#aaa" }}>Loading...</td></tr>
              ) : attendance.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#aaa" }}>No records for this period</td></tr>
              ) : attendance.map((row, i) => {
                const dur = row.checkIn && row.checkOut ? calcDuration(row.checkIn, row.checkOut) : "—";
                const dayName = new Date(row.date).toLocaleDateString("en-IN", { weekday: "short" });
                return (
                  <tr key={i} style={{ borderBottom: "1px solid #f8f8f8" }}>
                    <td style={td}>{formatDate(row.date)}</td>
                    <td style={{ ...td, color: "#888" }}>{dayName}</td>
                    <td style={td}>{row.checkIn ? formatTime(row.checkIn) : "—"}</td>
                    <td style={td}>{row.checkOut ? formatTime(row.checkOut) : "—"}</td>
                    <td style={td}>{dur}</td>
                    <td style={td}><AttStatusBadge status={row.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View: Chart */}
      {view === "chart" && <AttendanceChart attendance={attendance} month={month} year={year} />}

      {/* View: Calendar */}
      {view === "calendar" && <CalendarView attendance={attendance} month={month} year={year} />}
    </div>
  );
}

/* ─── Weekly Summary ─── */
function WeeklySummary({ attendance }) {
  const weeks = {};
  attendance.forEach((a) => {
    const d = new Date(a.date);
    const weekNum = getWeekNumber(d);
    if (!weeks[weekNum]) weeks[weekNum] = { present: 0, late: 0, total: 0 };
    weeks[weekNum].total++;
    if (a.status === "on-time") weeks[weekNum].present++;
    if (a.status === "late") weeks[weekNum].late++;
  });

  const entries = Object.entries(weeks).slice(-4);
  if (entries.length === 0) return null;

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", padding: 20, marginBottom: 4 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: "#0f1117", marginBottom: 14 }}>Weekly Breakdown</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {entries.map(([week, data], i) => (
          <div key={week} style={{ flex: 1, minWidth: 140, background: "#fafafa", borderRadius: 8, padding: "12px 16px", border: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Week {i + 1}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f1117" }}>{data.total} days</div>
            <div style={{ fontSize: 12, color: "#22c55e", marginTop: 2 }}>{data.present} on time</div>
            {data.late > 0 && <div style={{ fontSize: 12, color: "#f59e0b" }}>{data.late} late</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Bar Chart ─── */
function AttendanceChart({ attendance, month, year }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayMap = {};
  attendance.forEach((a) => {
    const day = parseInt(a.date.split("-")[2]);
    dayMap[day] = a.status;
  });

  const bars = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const status = dayMap[day];
    return { day, status };
  });

  const colorMap = { "on-time": "#22c55e", "late": "#f59e0b", "half-day": "#8b5cf6", absent: "#e8eaed" };
  const labelMap = { "on-time": "On Time", "late": "Late", "half-day": "Half Day", absent: "Absent / Holiday" };

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", padding: 24, marginTop: 20 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#0f1117" }}>Daily Attendance — {MONTHS[parseInt(month) - 1]} {year}</div>
      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", overflowX: "auto", paddingBottom: 8 }}>
        {bars.map(({ day, status }) => (
          <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: "0 0 auto" }}>
            <div
              title={status ? labelMap[status] : "No record"}
              style={{
                width: 16, height: status ? 48 : 20,
                background: colorMap[status] || "#f0f0f0",
                borderRadius: 4, transition: "height 0.3s",
                cursor: "default",
              }}
            />
            <span style={{ fontSize: 10, color: "#aaa" }}>{day}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
        {Object.entries(labelMap).map(([key, label]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#666" }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: colorMap[key] }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Calendar View ─── */
function CalendarView({ attendance, month, year }) {
  const m = parseInt(month);
  const y = parseInt(year);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDay = new Date(y, m - 1, 1).getDay();

  const dayMap = {};
  attendance.forEach((a) => {
    const day = parseInt(a.date.split("-")[2]);
    dayMap[day] = a.status;
  });

  const colorMap = { "on-time": "#22c55e", "late": "#f59e0b", "half-day": "#8b5cf6" };
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", padding: 24, marginTop: 20 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, color: "#0f1117" }}>{MONTHS[m - 1]} {y}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#aaa", fontWeight: 600, paddingBottom: 4 }}>{d}</div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8, fontSize: 13, fontWeight: day ? 500 : 400,
              background: day ? (colorMap[dayMap[day]] ? colorMap[dayMap[day]] + "20" : "#fafafa") : "transparent",
              border: day ? "1px solid " + (colorMap[dayMap[day]] || "#e8eaed") : "none",
              color: day ? (colorMap[dayMap[day]] || "#555") : "transparent",
            }}
          >
            {day || ""}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Helpers ─── */
function calcStats(attendance) {
  const total = attendance.length;
  const onTime = attendance.filter((a) => a.status === "on-time").length;
  const late = attendance.filter((a) => a.status === "late").length;
  const durations = attendance.filter((a) => a.checkIn && a.checkOut)
    .map((a) => (new Date(a.checkOut) - new Date(a.checkIn)) / 1000 / 60 / 60);
  const avgH = durations.length > 0 ? durations.reduce((s, d) => s + d, 0) / durations.length : 0;
  const avgDur = avgH > 0 ? `${Math.floor(avgH)}h ${Math.round((avgH % 1) * 60)}m` : "—";

  const now = new Date();
  let workingDays = 0;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), d).getDay();
    if (day !== 0 && day !== 6) workingDays++;
  }
  const absent = Math.max(0, workingDays - total);
  const pct = workingDays > 0 ? Math.round((total / workingDays) * 100) : 0;

  return { total, onTime, late, absent, avgDuration: avgDur, pct, workingDays };
}

function getWeekNumber(d) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  return Math.ceil((d.getDate() + start.getDay()) / 7);
}

function AttStatusBadge({ status }) {
  const map = {
    "on-time": { bg: "#e8f5e9", color: "#2e7d32", label: "On Time" },
    "late": { bg: "#fff8e1", color: "#f57f17", label: "Late" },
    "half-day": { bg: "#f3e5f5", color: "#6a1b9a", label: "Half Day" },
    "absent": { bg: "#fce4ec", color: "#c62828", label: "Absent" },
  };
  const s = map[status] || { bg: "#f5f5f5", color: "#555", label: status };
  return <span style={{ background: s.bg, color: s.color, fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{s.label}</span>;
}

const td = { padding: "12px 16px", fontSize: 13.5, color: "#333" };
const selectStyle = { padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13.5, background: "#fff", outline: "none", cursor: "pointer" };

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function calcDuration(checkIn, checkOut) {
  const diff = (new Date(checkOut) - new Date(checkIn)) / 1000 / 60;
  return `${Math.floor(diff / 60)}h ${Math.round(diff % 60)}m`;
}