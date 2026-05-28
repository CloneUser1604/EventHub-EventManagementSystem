import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApprovedEvents();
  }, []);

  const fetchApprovedEvents = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/approved`);
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => {
    if (user) {
      navigate(`/${user.role.toLowerCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl">
              E
            </div>
            <h1 className="text-2xl font-bold text-gray-800">EventHub</h1>
          </Link>

          <div className="flex items-center gap-8">
            <Link to="/" className="font-medium hover:text-blue-600">Trang chủ</Link>
            <Link to="/events" className="font-medium hover:text-blue-600">Sự kiện</Link>

            {user ? (
              /* KHỐI DROPDOWN SỬA LỖI HOVER */
              <div className="relative group py-3 cursor-pointer">
                <div className="flex items-center gap-3 hover:bg-gray-100 px-4 py-2 rounded-lg transition-all">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                    {user.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm leading-none">{user.fullName}</p>
                    <p className="text-xs text-gray-500 mt-1">{user.role}</p>
                  </div>
                </div>

                {/* Dropdown Menu sát cạnh dưới thẻ cha */}
                <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-2xl shadow-xl py-2 border hidden group-hover:block z-50">
                  <button 
                    onClick={goToDashboard}
                    className="w-full text-left px-6 py-3 hover:bg-gray-100 flex items-center gap-3 text-gray-700 font-medium"
                  >
                    📊 Vào Dashboard
                  </button>
                  <hr className="border-gray-100" />
                  <button 
                    onClick={logout}
                    className="w-full text-left px-6 py-3 hover:bg-gray-100 text-red-600 flex items-center gap-3 font-medium"
                  >
                    🚪 Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" className="px-6 py-2.5 border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50">Đăng nhập</Link>
                <Link to="/register" className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Đăng ký</Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-24">
        <div className="max-w-5xl mx-auto text-center px-6">
          <h1 className="text-5xl font-bold mb-6">Khám phá những sự kiện chất lượng</h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Nền tảng kết nối cộng đồng với hàng trăm sự kiện học thuật, hội thảo, workshop hấp dẫn
          </p>
          <button
            onClick={() => document.getElementById('events-section').scrollIntoView({ behavior: 'smooth' })}
            className="bg-white text-blue-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition"
          >
            Khám phá sự kiện ngay
          </button>
        </div>
      </div>

      {/* Danh sách sự kiện nổi bật */}
      <div id="events-section" className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold">Sự kiện đang diễn ra & Sắp tới</h2>
          <Link to="/events" className="text-blue-600 hover:underline">Xem tất cả →</Link>
        </div>

        {loading ? (
          <p className="text-center py-10">Đang tải sự kiện...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.length > 0 ? (
              events.map(event => (
                <div key={event._id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition">
                  {event.banner && (
                    <img 
                      src={event.banner} 
                      alt={event.title} 
                      className="w-full h-52 object-cover" 
                    />
                  )}
                  <div className="p-6">
                    <h3 className="font-bold text-xl mb-3 line-clamp-2">{event.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{event.description}</p>
                    
                    <div className="flex justify-between text-sm text-gray-500">
                      <p>📅 {new Date(event.startDateTime).toLocaleDateString('vi-VN')}</p>
                      <p>👥 {event.maxCapacity || 'Không giới hạn'}</p>
                    </div>

                    <button className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition">
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-3 text-center py-20 text-gray-500">Chưa có sự kiện nào được phê duyệt.</p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p>© 2026 EventHub - Hệ thống quản lý sự kiện</p>
          <p className="mt-2 text-sm">Được phát triển để hỗ trợ cộng đồng học thuật và tổ chức sự kiện</p>
        </div>
      </footer>
    </div>
  );
}