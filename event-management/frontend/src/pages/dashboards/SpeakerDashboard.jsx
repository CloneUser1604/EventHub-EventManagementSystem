import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function SpeakerDashboard() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Speaker Dashboard</h1>
        <button onClick={logout} className="bg-red-600 text-white px-4 py-2 rounded">Đăng xuất</button>
      </div>
      <p>Xin chào Diễn giả, <strong>{user?.fullName}</strong> ({user?.role})</p>
      <div className="mt-8 grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">Bài trình bày: 0</div>
        <div className="bg-white p-6 rounded-xl shadow">Lịch diễn thuyết: 0</div>
        <div className="bg-white p-6 rounded-xl shadow">Câu hỏi từ khán giả: 0</div>
      </div>
    </div>
  );
}
