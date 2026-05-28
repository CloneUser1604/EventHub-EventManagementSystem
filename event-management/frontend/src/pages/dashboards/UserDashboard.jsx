import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function UserDashboard() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Logo ứng dụng cho User */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 h-16 z-50 px-8 flex justify-between items-center shadow-sm">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-blue-600 tracking-wide">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">E</div>
          EVENT<span className="text-gray-800">HUB</span>
        </Link>
        <div className="text-sm font-medium text-gray-600">Trang cá nhân thành viên</div>
      </header>

      {/* Thân trang */}
      <div className="pt-24 p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">User Dashboard</h1>
            <p className="text-gray-600 mt-1">Xin chào, <strong className="text-gray-800">{user?.fullName}</strong> ({user?.role})</p>
          </div>
          <button onClick={logout} className="bg-red-600 text-white px-5 py-2.5 rounded-xl hover:bg-red-700 font-medium shadow transition">
            Đăng xuất
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow font-medium text-gray-700">Sự kiện đã tham gia: <span className="text-blue-600 ml-1 font-bold">0</span></div>
          <div className="bg-white p-6 rounded-2xl shadow font-medium text-gray-700">Vé của tôi: <span className="text-blue-600 ml-1 font-bold">0</span></div>
          <div className="bg-white p-6 rounded-2xl shadow font-medium text-gray-700">Thông báo mới: <span className="text-blue-600 ml-1 font-bold">0</span></div>
        </div>
      </div>
    </div>
  );
}