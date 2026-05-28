import { useState, useEffect } from 'react';
import axios from 'axios';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function OrganizerDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyEvents();
  }, []);

  const fetchMyEvents = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/my-events`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approvedEvents = events.filter(e => e.status === 'Approved');
  const pendingEvents = events.filter(e => ['Draft', 'Pending', 'Rejected'].includes(e.status));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER CỐ ĐỊNH PHÍA TRÊN CÙNG */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 h-16 z-50 px-8 flex justify-between items-center shadow-sm">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-blue-600 tracking-wide">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            E
          </div>
          EVENT<span className="text-gray-800">HUB</span>
        </Link>
        <span className="bg-green-50 text-green-700 px-3 py-1 text-xs font-semibold rounded-full">
          Ban tổ chức (Organizer)
        </span>
      </header>

      {/* NỘI DUNG CHÍNH (pt-24 để tránh bị Header đè lên) */}
      <div className="pt-24 p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Organizer Dashboard</h1>
            <p className="text-gray-600 mt-1">Xin chào, {user?.fullName}</p>
          </div>
          
          <div className="flex gap-4">
            <Link 
              to="/organizer/create-event"
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 flex items-center gap-2 font-medium shadow-md transition-all"
            >
              + Tạo Sự Kiện Mới
            </Link>
            <button 
              onClick={logout}
              className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 font-medium shadow-md transition-all"
            >
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Thống kê nhanh */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow">
            <p className="text-gray-500 font-medium">Tổng sự kiện</p>
            <p className="text-4xl font-bold mt-2 text-gray-800">{events.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow">
            <p className="text-gray-500 font-medium">Đã phê duyệt</p>
            <p className="text-4xl font-bold mt-2 text-green-600">{approvedEvents.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow">
            <p className="text-gray-500 font-medium">Chờ phê duyệt</p>
            <p className="text-4xl font-bold mt-2 text-yellow-600">{pendingEvents.length}</p>
          </div>
        </div>

        {/* Sự kiện của tôi */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Sự kiện của tôi</h2>

          {loading ? (
            <p className="text-center py-6 text-gray-500">Đang tải danh sách sự kiện...</p>
          ) : (
            <>
              {/* Đoạn sự kiện Đã phê duyệt */}
              <div className="mb-8">
                <h3 className="font-semibold text-green-700 mb-4 flex items-center gap-2 text-lg">
                  ✅ Đã phê duyệt ({approvedEvents.length})
                </h3>
                {approvedEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {approvedEvents.map(event => (
                      <div key={event._id} className="border border-green-100 bg-green-50/20 p-5 rounded-xl hover:shadow-sm transition">
                        <h4 className="font-semibold text-gray-800 text-lg">{event.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          📅 {new Date(event.startDateTime).toLocaleDateString('vi-VN')}
                        </p>
                        <span className="inline-block mt-3 px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Đang công khai
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic pl-2">Chưa có sự kiện nào được duyệt.</p>
                )}
              </div>

              {/* Đoạn sự kiện Chưa phê duyệt / Nháp */}
              <div>
                <h3 className="font-semibold text-yellow-700 mb-4 flex items-center gap-2 text-lg">
                  ⏳ Chưa phê duyệt / Nháp ({pendingEvents.length})
                </h3>
                {pendingEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingEvents.map(event => (
                      <div key={event._id} className="border border-gray-200 bg-white p-5 rounded-xl hover:shadow-sm transition">
                        <h4 className="font-semibold text-gray-800 text-lg">{event.title}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Trạng thái: <span className="font-semibold text-yellow-600">{event.status}</span>
                        </p>
                        {event.rejectionReason && (
                          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mt-3 border border-red-100">
                            <strong>Lý do từ chối:</strong> {event.rejectionReason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic pl-2">Không có sự kiện nháp hoặc chờ duyệt.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}