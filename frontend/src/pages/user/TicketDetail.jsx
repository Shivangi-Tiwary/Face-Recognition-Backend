import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader, StatusBadge, PriorityBadge, API_BASE, authHeaders } from "../UserDashboard";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchTicket(); }, [id]);

  const fetchTicket = () => {
    setLoading(true);
    fetch(`${API_BASE}/user/tickets/${id}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setTicket(d.ticket); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/user/tickets/${id}/comment`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ text: comment }),
      });
      const data = await res.json();
      if (data.success) { setTicket(data.ticket); setComment(""); }
      else setError(data.error || "Failed to post comment");
    } catch { setError("Something went wrong"); }
    finally { setPosting(false); }
  };

  if (loading) return <div style={{ padding: 32, color: "#888" }}>Loading ticket...</div>;
  if (!ticket) return <div style={{ padding: 32, color: "#888" }}>Ticket not found.</div>;

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <button
        onClick={() => navigate("/user/tickets")}
        style={{ background: "none", border: "none", color: "#4f8ef7", fontSize: 13.5, cursor: "pointer", marginBottom: 16, padding: 0, fontWeight: 500 }}
      >
        ← Back to Tickets
      </button>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Main ticket card */}
        <div style={{ flex: 2, minWidth: 320 }}>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", padding: 28, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "#4f8ef7", fontWeight: 700, marginBottom: 4 }}>{ticket.ticketId}</div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f1117" }}>{ticket.title}</h2>
              </div>
              <StatusBadge status={ticket.status} />
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
              <MetaItem label="Category" value={ticket.category} />
              <MetaItem label="Priority" value={<PriorityBadge priority={ticket.priority} />} />
              <MetaItem label="Agent" value={ticket.assignedTo} />
              <MetaItem label="Created" value={formatDate(ticket.createdAt)} />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Description</div>
              <p style={{ margin: 0, fontSize: 14, color: "#333", lineHeight: 1.7, background: "#fafafa", padding: "14px 16px", borderRadius: 8, border: "1px solid #f0f0f0" }}>
                {ticket.description}
              </p>
            </div>
          </div>

          {/* Comments */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", padding: 28 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#0f1117", marginBottom: 20 }}>Comments</div>

            {ticket.comments.length === 0 && (
              <p style={{ color: "#aaa", fontSize: 13.5, textAlign: "center", margin: "16px 0 24px" }}>No comments yet</p>
            )}

            <div style={{ marginBottom: 20 }}>
              {ticket.comments.map((c, i) => (
                <div key={i} style={{
                  display: "flex", gap: 12, marginBottom: 16,
                  justifyContent: c.author === "Admin" ? "flex-start" : "flex-end",
                }}>
                  {c.author === "Admin" && (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#4f8ef7", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>A</div>
                  )}
                  <div style={{
                    maxWidth: "75%", background: c.author === "Admin" ? "#f0f4ff" : "#e8f5e9",
                    borderRadius: c.author === "Admin" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                    padding: "10px 14px",
                  }}>
                    <div style={{ fontSize: 11.5, color: "#888", marginBottom: 4, fontWeight: 600 }}>
                      {c.author} · {formatTime(c.createdAt)}
                    </div>
                    <div style={{ fontSize: 13.5, color: "#333", lineHeight: 1.6 }}>{c.text}</div>
                  </div>
                  {c.author !== "Admin" && (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>Y</div>
                  )}
                </div>
              ))}
            </div>

            {ticket.status !== "Resolved" && (
              <div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment or update..."
                  rows={3}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13.5, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                />
                {error && <div style={{ color: "#c62828", fontSize: 12.5, marginTop: 4 }}>{error}</div>}
                <button
                  onClick={handleComment}
                  disabled={posting || !comment.trim()}
                  style={{
                    marginTop: 10, padding: "9px 20px", background: posting || !comment.trim() ? "#c7d9f7" : "#4f8ef7",
                    color: "#fff", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {posting ? "Posting..." : "Post Comment"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Activity Log Sidebar */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#0f1117", marginBottom: 16 }}>Activity Log</div>
            <div style={{ position: "relative" }}>
              {(ticket.activityLog || []).map((log, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4f8ef7", marginTop: 4, flexShrink: 0 }} />
                    {i < (ticket.activityLog.length - 1) && (
                      <div style={{ width: 1, flex: 1, background: "#e8eaed", marginTop: 4 }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: 4 }}>
                    <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>{log.action}</div>
                    <div style={{ fontSize: 11.5, color: "#aaa", marginTop: 2 }}>{formatTime(log.at)}</div>
                  </div>
                </div>
              ))}
              {(!ticket.activityLog || ticket.activityLog.length === 0) && (
                <p style={{ color: "#aaa", fontSize: 13 }}>No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: "#333" }}>{value}</div>
    </div>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}