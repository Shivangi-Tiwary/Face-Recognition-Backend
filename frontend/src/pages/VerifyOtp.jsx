import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const pendingToken = localStorage.getItem("pendingToken");
      const { data } = await api.post("/auth/verify-otp", { pendingToken, otp });
      localStorage.removeItem("pendingToken");
      login(data.token, data.user);
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const pendingToken = localStorage.getItem("pendingToken");
      const { data } = await api.post("/auth/resend-otp", { pendingToken });
      localStorage.setItem("pendingToken", data.pendingToken);
      setError("");
      alert("New OTP sent to your email!");
    } catch (err) {
      setError("Failed to resend OTP");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Check your email 📧</h1>
        <p>We sent a 6-digit code to your email. Enter it below.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleVerify}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              maxLength={6}
              required
            />
          </div>
          <button className="btn-primary" disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "16px", fontSize: "13px", color: "#888" }}>
          Didn't receive it?{" "}
          <span
            onClick={handleResend}
            style={{ color: "#6c63ff", cursor: "pointer", fontWeight: 600 }}
          >
            Resend OTP
          </span>
        </p>
      </div>
    </div>
  );
}