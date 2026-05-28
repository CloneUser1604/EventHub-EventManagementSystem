import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'User'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, formData);
      alert('Đăng ký thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Đăng Ký Tài Khoản</h2>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit}>
          <input type="text" name="fullName" placeholder="Họ và tên" onChange={handleChange} required className="w-full p-3 border rounded-lg mb-3" />
          <input type="text" name="username" placeholder="Tên đăng nhập" onChange={handleChange} required className="w-full p-3 border rounded-lg mb-3" />
          <input type="email" name="email" placeholder="Email" onChange={handleChange} required className="w-full p-3 border rounded-lg mb-3" />
          <input type="password" name="password" placeholder="Mật khẩu" onChange={handleChange} required className="w-full p-3 border rounded-lg mb-3" />
          <input type="tel" name="phone" placeholder="Số điện thoại" onChange={handleChange} className="w-full p-3 border rounded-lg mb-3" />

          <select name="role" onChange={handleChange} className="w-full p-3 border rounded-lg mb-6">
            <option value="User">Người tham gia (User)</option>
            <option value="Speaker">Diễn giả (Speaker)</option>
            <option value="Organizer">Ban tổ chức (Organizer)</option>
            <option value="Staff">Nhân viên (Staff)</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
          >
            {loading ? 'Đang xử lý...' : 'Đăng Ký'}
          </button>
        </form>

        <p className="text-center mt-4">
          Đã có tài khoản? <Link to="/login" className="text-blue-600 hover:underline">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}