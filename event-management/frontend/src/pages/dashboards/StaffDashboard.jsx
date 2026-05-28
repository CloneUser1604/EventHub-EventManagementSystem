import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function StaffDashboard() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Staff Dashboard</h1>
        <button onClick={logout} className="bg-red-600 text-white px-4 py-2 rounded">Đăng xuất</button>
      </div>
      <p>Xin chào Nhân viên, <strong>{user?.fullName}</strong> ({user?.role})</p>
      <div className="mt-8 grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">Nhiệm vụ hôm nay: 0</div>
        <div className="bg-white p-6 rounded-xl shadow">Yêu cầu cần duyệt: 0</div>
        <div className="bg-white p-6 rounded-xl shadow">Sự kiện hỗ trợ: 0</div>
      </div>
    </div>
  );
}
