import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Unauthorized from './pages/Unauthorized';
import Home from './pages/Home';

// Dashboard
import AdminDashboard from './pages/dashboards/AdminDashboard';
import OrganizerDashboard from './pages/dashboards/OrganizerDashboard';
import UserDashboard from './pages/dashboards/UserDashboard';
import SpeakerDashboard from './pages/dashboards/SpeakerDashboard';
import StaffDashboard from './pages/dashboards/StaffDashboard';

// Tạo Sự Kiện
import CreateEvent from './pages/organizer/CreateEvent';

import { ProtectedRoute } from './routes/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Dashboard Routes bọc bảo vệ */}
        <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/organizer/*" element={<ProtectedRoute allowedRoles={['Organizer']}><OrganizerDashboard /></ProtectedRoute>} />
        <Route path="/user/*" element={<ProtectedRoute allowedRoles={['User']}><UserDashboard /></ProtectedRoute>} />
        <Route path="/speaker/*" element={<ProtectedRoute allowedRoles={['Speaker']}><SpeakerDashboard /></ProtectedRoute>} />
        <Route path="/staff/*" element={<ProtectedRoute allowedRoles={['Staff']}><StaffDashboard /></ProtectedRoute>} />

        {/* Tạo Sự Kiện */}
        <Route path="/organizer/create-event" element={
          <ProtectedRoute allowedRoles={['Organizer']}>
            <CreateEvent />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;