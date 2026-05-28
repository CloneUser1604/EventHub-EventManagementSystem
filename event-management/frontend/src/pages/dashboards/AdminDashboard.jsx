import { useState, useEffect } from 'react';
import axios from 'axios';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersByRole, setUsersByRole] = useState({});
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const eventsRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/events/pending`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPendingEvents(eventsRes.data);
      setTotalUsers(1248);
      setUsersByRole({ Admin: 3, Organizer: 45, User: 980, Speaker: 67, Staff: 153 });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cố định Header Thanh công cụ phía trên */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 h-16 z-50 px-8 flex justify-between items-center shadow-sm">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-blue-600 tracking-wide">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">E</div>
          EVENT<span className="text-gray-800">HUB</span>
        </Link>
        <span className="bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold rounded-full">Hệ thống Quản trị</span>
      </header>

      {/* Phần thân nội dung chính dịch xuống để không bị đè */}
      <div className="pt-24 p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Xin chào, {user?.fullName}</p>
          </div>
          <button onClick={logout} className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 font-medium shadow transition-all">
            Đăng xuất
          </button>
        </div>

        {/* Các khối thống kê */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow">
            <p className="text-gray-500 font-medium">Tổng sự kiện</p>
            <p className="text-4xl font-bold mt-2">248</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow">
            <p className="text-gray-500 font-medium">Tổng người dùng</p>
            <p className="text-4xl font-bold mt-2">{totalUsers}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow">
            <p className="text-gray-500 font-medium">Chờ phê duyệt</p>
            <p className="text-4xl font-bold mt-2 text-yellow-600">{pendingEvents.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow">
            <p className="text-gray-500 font-medium">Sự kiện đã duyệt</p>
            <p className="text-4xl font-bold mt-2 text-green-600">189</p>
          </div>
        </div>

        {/* Danh sách chờ duyệt */}
        <div className="bg-white rounded-2xl shadow p-6 mb-10">
          <h2 className="text-2xl font-semibold mb-6">Sự kiện chờ phê duyệt ({pendingEvents.length})</h2>
          {pendingEvents.length > 0 ? (
            <div className="space-y-4">
              {pendingEvents.map(event => (
                <div key={event._id} className="border border-gray-100 rounded-xl p-5 flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">Tổ chức bởi: {event.organizer?.fullName}</p>
                  </div>
                  <button 
                    onClick={() => window.location.href = '/admin/approval'}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-medium transition"
                  >
                    Xem & Phê duyệt
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">Không có sự kiện nào đang chờ phê duyệt.</p>
          )}
        </div>

        {/* Khối quản lý Role */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-2xl font-semibold mb-6">Thống kê Người dùng</h2>
          <div className="flex flex-wrap gap-3">
            {['all', 'Admin', 'Organizer', 'User', 'Speaker', 'Staff'].map(role => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-5 py-2 rounded-full font-medium transition-all ${filterRole === role ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}