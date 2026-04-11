import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, API_BASE, authHeaders } from "../UserDashboard";

const CATEGORIES = ["Recognition Failure", "Hardware", "AI Model", "Enrollment", "Access Control", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const PRIORITY_INFO = {
  Low: "General query, no urgency",
  Medium: "Affects work but has a workaround",
  High: "Significantly impacting work",
  Critical: "System down, immediate help needed",
};

export default function CreateTicket() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", category: "Recognition Failure", priority: "Medium" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/user/tickets`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        navigate(`/user/tickets/${data.ticket._id}`);
      } else {
        setError(data.error || "Failed to create ticket");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <PageHeader
        title="Raise a Ticket"
        subtitle="Describe your issue and we'll get back to you"
      />

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Form */}
        <div style={{ flex: 2, minWidth: 320, background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", padding: 28 }}>
          <div style={fieldGroup}>
            <label style={labelStyle}>Title *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Face not recognized at entry gate"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ ...fieldGroup, flex: 1 }}>
              <label style={labelStyle}>Category</label>
              <select name="category" value={form.category} onChange={handleChange} style={inputStyle}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ ...fieldGroup, flex: 1 }}>
              <label style={labelStyle}>Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} style={inputStyle}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 8, fontSize: 12.5, color: "#888", marginTop: -8 }}>
            {PRIORITY_INFO[form.priority]}
          </div>

          <div style={fieldGroup}>
            <label style={labelStyle}>Description *</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe your issue in detail..."
              rows={6}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          {error && (
            <div style={{ background: "#fce4ec", color: "#c62828", padding: "10px 14px", borderRadius: 8, fontSize: 13.5, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => navigate("/user/tickets")}
              style={{ flex: 1, padding: "11px 0", border: "1px solid #ddd", borderRadius: 8, background: "#fff", fontSize: 14, cursor: "pointer", color: "#555", fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 2, padding: "11px 0", border: "none", borderRadius: 8,
                background: submitting ? "#9dbcf7" : "#4f8ef7",
                color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 600,
              }}
            >
              {submitting ? "Submitting..." : "Create Ticket"}
            </button>
          </div>
        </div>

        {/* Side info */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ background: "#f8f9ff", borderRadius: 12, border: "1px solid #e0e7ff", padding: 20, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#3b5bdb", marginBottom: 12 }}>Priority Guide</div>
            {PRIORITIES.map((p) => (
              <div key={p} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>{p}</div>
                <div style={{ fontSize: 12.5, color: "#888" }}>{PRIORITY_INFO[p]}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff8e1", borderRadius: 12, border: "1px solid #ffe082", padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#e65100", marginBottom: 8 }}>Tips</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#888", lineHeight: 1.8 }}>
              <li>Be specific about when the issue occurred</li>
              <li>Mention the exact error or behavior</li>
              <li>Include location if relevant (e.g. Gate A)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const fieldGroup = { marginBottom: 20 };
const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 6 };
const inputStyle = {
  width: "100%", padding: "10px 12px", border: "1px solid #ddd",
  borderRadius: 8, fontSize: 13.5, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
  transition: "border-color 0.15s",
};