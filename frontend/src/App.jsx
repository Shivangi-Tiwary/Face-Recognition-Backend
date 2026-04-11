import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import VerifyOtp from "./pages/VerifyOtp";
import Chat from "./pages/Chat";
import UserDashboard from "./pages/UserDashboard";

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />

        {/* Standalone chat (keep if used outside dashboard) */}
        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          }
        />

        {/* User Dashboard — all /user/* routes handled inside UserDashboard */}
        <Route
          path="/user/*"
          element={
            <PrivateRoute>
              <UserDashboard />
            </PrivateRoute>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}