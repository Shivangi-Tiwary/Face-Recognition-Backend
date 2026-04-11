import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, StatCard, StatusBadge, PriorityBadge, API_BASE, authHeaders } from "../UserDashboard";

const CATEGORIES = ["All", "Recognition Failure", "Hardware", "AI Model", "Enrollment", "Access Control", "Other"];
const STATUSES = ["All", "Open", "In Progress", "Resolved", "Pending"];

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => { fetchTickets(); }, [statusFilter, categoryFilter]);

  const fetchTickets = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "All") params.set("status", statusFilter);
    if (categoryFilter !== "All") params.set("category", categoryFilter);

    fetch(`${API_BASE}/user/tickets?${params}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setTickets(d.tickets); setSummary(d.summary); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const filtered = tickets.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.ticketId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <PageHeader
        title="My Tickets"
        subtitle="Track all your support requests"
        action={
          <button
            onClick={() => navigate("/user/tickets/new")}
            style={{ background: "#4f8ef7", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
          >
            + New Ticket
          </button>
        }
      />

      {/* Summary Cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Total" value={summary.total ?? 0} />
        <StatCard label="Open" value={summary.open ?? 0} color="#e65100" />
        <StatCard label="In Progress" value={summary.inProgress ?? 0} color="#1565c0" />
        <StatCard label="Resolved" value={summary.resolved ?? 0} color="#22c55e" />
        <StatCard label="Pending" value={summary.pending ?? 0} color="#7b1fa2" />
      </div>

      {/* Filters */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search by title or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13.5, outline: "none" }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectStyle}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Tickets Table */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              {["Ticket ID", "Title", "Category", "Priority", "Status", "Created"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#888", fontWeight: 600, borderBottom: "1px solid #f0f0f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#aaa" }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#aaa", fontSize: 13 }}>No tickets found</td></tr>
            ) : filtered.map((t) => (
              <tr
                key={t._id}
                onClick={() => navigate(`/user/tickets/${t._id}`)}
                style={{ borderBottom: "1px solid #f8f8f8", cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#fafcff"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ ...td, color: "#4f8ef7", fontWeight: 600 }}>{t.ticketId}</td>
                <td style={{ ...td, maxWidth: 220 }}>
                  <div style={{ fontWeight: 500, color: "#0f1117", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{t.title}</div>
                </td>
                <td style={td}><span style={{ fontSize: 12, background: "#f0f4ff", color: "#3b5bdb", padding: "3px 8px", borderRadius: 6, fontWeight: 500 }}>{t.category}</span></td>
                <td style={td}><PriorityBadge priority={t.priority} /></td>
                <td style={td}><StatusBadge status={t.status} /></td>
                <td style={{ ...td, color: "#888", fontSize: 12.5 }}>{formatDate(t.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const td = { padding: "13px 16px", fontSize: 13.5, color: "#333" };
const selectStyle = { padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13.5, background: "#fff", outline: "none", cursor: "pointer" };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}