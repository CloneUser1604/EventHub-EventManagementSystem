import React, {useEffect} from "react";
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import {ConfigProvider, App as AntdApp} from "antd";
import viVN from "antd/locale/vi_VN";
import useAuthStore from "./store/authStore";
import "./styles/global.css";

// Auth
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import {
  ForgotPasswordPage,
  ResetPasswordPage,
} from "./pages/auth/PasswordPages";
import FirstTimeSetupPage from "./pages/speaker/FirstTimeSetupPage";

// Public
import HomePage from "./pages/home/HomePage";
import EventListPage from "./pages/events/EventListPage";
import EventDetailPage from "./pages/events/EventDetailPage";
import ParticipantCheckinPage from "./pages/events/ParticipantCheckinPage";
import AllFeedbacksPage from "./pages/events/AllFeedbacksPage";

// Participant
import MyCalendarPage from "./pages/participant/MyCalendarPage";
import ParticipantDashboard from "./pages/participant/ParticipantDashboard";
import StaffDashboard from "./pages/participant/StaffDashboard";

// Organizer
import OrganizerEventsPage from "./pages/organizer/OrganizerEventsPage";
import EventFormPage from "./pages/organizer/EventFormPage";
import EventDashboardPage from "./pages/organizer/EventDashboardPage";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";

// Guards
import ProtectedRoute from "./components/ui/ProtectedRoute";

const antdTheme = {
  token: {
    colorPrimary: "#2563eb",
    colorLink: "#2563eb",
    borderRadius: 8,
    fontFamily: "'DM Sans', -apple-system, sans-serif",
    fontSize: 15,
  },
  components: {
    Rate: {
      starColor: "#facc15",
      starHoverColor: "#facc15",
      starBg: "#e2e8f0"
    },
  },
};

const Unauthorized = () => (
  <div
    style={{
      textAlign: "center",
      padding: "120px 24px",
      fontFamily: "DM Sans,sans-serif",
    }}
  >
    <div style={{fontSize: 64, marginBottom: 16}}>🚫</div>
    <h2 style={{fontFamily: "Sora,sans-serif"}}>Không có quyền truy cập</h2>
    <p style={{color: "#6b7280"}}>Bạn không có quyền truy cập trang này.</p>
  </div>
);

const NotFound = () => (
  <div
    style={{
      textAlign: "center",
      padding: "120px 24px",
      fontFamily: "DM Sans,sans-serif",
    }}
  >
    <div style={{fontSize: 64, marginBottom: 16}}>🔍</div>
    <h2 style={{fontFamily: "Sora,sans-serif"}}>404 — Không tìm thấy trang</h2>
  </div>
);

function App() {
  const {isAuthenticated, fetchMe, accessToken, user} = useAuthStore();

  useEffect(() => {
    if (accessToken) fetchMe();
  }, []);

  return (
    <ConfigProvider locale={viVN} theme={antdTheme}>
      <AntdApp>
        <BrowserRouter
          future={{v7_startTransition: true, v7_relativeSplatPath: true}}
        >
          <Routes>
            {/* ── Public ── */}
            <Route path="/" element={<HomePage />} />
            <Route path="/events" element={<EventListPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route
              path="/events/:id/feedbacks"
              element={<AllFeedbacksPage />}
            />{" "}
            {/* Đã thêm đường dẫn mới ở đây */}
            <Route
              path="/events/:id/checkin"
              element={<ParticipantCheckinPage />}
            />
            {/* ── Auth ── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/speaker/first-time-setup"
              element={<FirstTimeSetupPage />}
            />
            {/* ── Participant & Staff ── */}
            <Route
              path="/participant"
              element={
                <ProtectedRoute roles={["Participant"]}>
                  <ParticipantDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute roles={["Participant", "Staff"]}>
                  <StaffDashboard />
                </ProtectedRoute>
              }
            />
            {/* ── Participant & Speaker ── */}
            <Route
              path="/my-calendar"
              element={
                <ProtectedRoute roles={["Participant", "Speaker"]}>
                  <MyCalendarPage />
                </ProtectedRoute>
              }
            />
            {/* ── Organizer ── */}
            <Route
              path="/organizer/events"
              element={
                <ProtectedRoute roles={["Organizer", "Admin"]}>
                  <OrganizerEventsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/create"
              element={
                <ProtectedRoute roles={["Organizer", "Admin"]}>
                  <EventFormPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/:id/dashboard"
              element={
                <ProtectedRoute roles={["Organizer", "Admin"]}>
                  <EventDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/events/:id/edit"
              element={
                <ProtectedRoute roles={["Organizer", "Admin"]}>
                  <EventFormPage />
                </ProtectedRoute>
              }
            />
            {/* ── Admin ── */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["Admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute roles={["Admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            {/* ── Misc ── */}
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route
              path="/dashboard"
              element={
                <Navigate
                  to={
                    user?.role === "Admin"
                      ? "/admin"
                      : user?.role === "Organizer"
                        ? "/organizer/events"
                        : user?.role === "Participant"
                          ? "/participant"
                          : "/"
                  }
                  replace
                />
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
