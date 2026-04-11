import { useState, useEffect } from "react";
import { PageHeader, API_BASE, authHeaders } from "../UserDashboard";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));

    fetch(`${API_BASE}/user/dashboard`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setUser(d.user); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 32, color: "#888" }}>Loading profile...</div>;

  const initials = user?.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <div style={{ padding: "32px 32px 48px" }}>
      <PageHeader title="Profile" subtitle="Your account information" />

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Profile Card */}
        <div style={{ flex: 1, minWidth: 280, maxWidth: 360 }}>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", padding: 28, textAlign: "center" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%", background: "#4f8ef7",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 24, margin: "0 auto 16px",
            }}>
              {initials}
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#0f1117" }}>{user?.name}</div>
            <div style={{ color: "#888", fontSize: 13.5, marginTop: 4 }}>{user?.email}</div>
            <div style={{
              display: "inline-block", marginTop: 12,
              background: "#e8f5e9", color: "#2e7d32",
              fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20,
            }}>
              {user?.role || "User"}
            </div>
          </div>

          {/* Face Enrollment Status */}
          <div style={{
            background: "#fff", borderRadius: 12, border: "1px solid #e8eaed",
            padding: 20, marginTop: 16,
          }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#0f1117", marginBottom: 16 }}>Face Recognition</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: user?.faceEnrolled ? "#e8f5e9" : "#fce4ec",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
              }}>
                {user?.faceEnrolled ? "✅" : "❌"}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: user?.faceEnrolled ? "#2e7d32" : "#c62828" }}>
                  {user?.faceEnrolled ? "Enrolled" : "Not Enrolled"}
                </div>
                {user?.enrolledAt && (
                  <div style={{ fontSize: 12, color: "#888" }}>
                    Since {new Date(user.enrolledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                )}
              </div>
            </div>
            {!user?.faceEnrolled && (
              <div style={{ marginTop: 12, fontSize: 12.5, color: "#888", background: "#fff8e1", padding: "10px 12px", borderRadius: 8, border: "1px solid #ffe082" }}>
                Contact your admin to enroll your face for attendance tracking.
              </div>
            )}
          </div>
        </div>

        {/* Account Details */}
        <div style={{ flex: 2, minWidth: 300 }}>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", padding: 28 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#0f1117", marginBottom: 20 }}>Account Details</div>
            {[
              { label: "Full Name", value: user?.name },
              { label: "Email Address", value: user?.email },
              { label: "Role", value: user?.role || "User" },
              { label: "Face Enrolled", value: user?.faceEnrolled ? "Yes" : "No" },
              { label: "Enrolled At", value: user?.enrolledAt ? new Date(user.enrolledAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", padding: "12px 0", borderBottom: "1px solid #f8f8f8" }}>
                <div style={{ width: 160, fontSize: 13, color: "#888", fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 13.5, color: "#333", fontWeight: 500 }}>{value || "—"}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#f8f9ff", borderRadius: 12, border: "1px solid #e0e7ff", padding: 20, marginTop: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#3b5bdb", marginBottom: 8 }}>Need to update your info?</div>
            <p style={{ margin: 0, fontSize: 13, color: "#555", lineHeight: 1.6 }}>
              To update your name, email, or re-enroll your face, please contact the admin or raise a support ticket.
            </p>
            <button
              onClick={() => window.location.href = "/user/tickets/new"}
              style={{ marginTop: 12, padding: "8px 16px", background: "#4f8ef7", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Raise a Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}