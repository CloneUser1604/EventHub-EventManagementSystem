import React, {useEffect} from "react";
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import {ConfigProvider} from "antd";
import viVN from "antd/locale/vi_VN";
import useAuthStore from "./store/authStore";
import EventDetailPage from "./pages/EventDetailPage";
import "./index.css";

// [MỚI THÊM] Import HomePage
import HomePage from "./pages/HomePage";

// Auth Pages
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import {
  ForgotPasswordPage,
  ResetPasswordPage,
} from "./pages/auth/PasswordPages";

// Guards
import ProtectedRoute from "./components/ui/ProtectedRoute";

// Organizer Pages
import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";

// Ant Design theme customization
const antdTheme = {
  token: {
    colorPrimary: "#2563eb",
    colorLink: "#2563eb",
    borderRadius: 8,
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    fontSize: 15,
    colorBgContainer: "#ffffff",
  },
  components: {
    Button: {
      borderRadius: 8,
      fontWeight: 600,
    },
    Input: {
      borderRadius: 8,
    },
  },
};

// Placeholder pages until modules are built
const DashboardPage = () => {
  const {user} = useAuthStore();

  if (user?.role === "Organizer") {
    return <Navigate to="/organizer" replace />;
  }

  return (
    <div style={{padding: 32, fontFamily: "DM Sans, sans-serif"}}>
      <h2>🎓 Dashboard ({user?.role}) — Coming Soon</h2>
      <p style={{color: "#6b7280"}}>
        Phần quản trị của vai trò {user?.role} đang được phát triển.
      </p>
      <p>
        Xin chào, <strong>{user?.fullName}</strong>! Chào mừng đến với hệ thống
        EMS.
      </p>
    </div>
  );
};

const UnauthorizedPage = () => (
  <div
    style={{
      padding: 32,
      textAlign: "center",
      fontFamily: "DM Sans, sans-serif",
    }}
  >
    <h2>🚫 Không có quyền truy cập</h2>
    <p style={{color: "#6b7280"}}>Bạn không có quyền truy cập trang này.</p>
  </div>
);

function App() {
  const {isAuthenticated, fetchMe, accessToken} = useAuthStore();

  // Re-hydrate user on mount if token exists
  useEffect(() => {
    if (accessToken && !isAuthenticated) {
      fetchMe();
    }
  }, []);

  return (
    <ConfigProvider locale={viVN} theme={antdTheme}>
      <BrowserRouter>
        <Routes>
          {/* [MỚI THÊM] Public Landing Pages (Không cần đăng nhập) */}
          <Route path="/HomePage" element={<HomePage />} />
          <Route path="/event-detail" element={<EventDetailPage />} />

          {/* Public auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute roles={["Admin"]}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Organizer routes */}
          <Route
            path="/organizer/*"
            element={
              <ProtectedRoute roles={["Organizer", "Admin"]}>
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />

          {/* [ĐÃ SỬA LẠI LOGIC CHUYỂN HƯỚNG MẶC ĐỊNH] */}
          {/* Nếu truy cập '/', chuyển thẳng ra HomePage */}
          <Route path="/" element={<Navigate to="/HomePage" replace />} />

          {/* Nếu gõ sai đường dẫn, trả về HomePage */}
          <Route path="*" element={<Navigate to="/HomePage" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
