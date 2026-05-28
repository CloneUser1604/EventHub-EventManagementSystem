import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-4">403</h1>
        <h2 className="text-2xl mb-4">Không có quyền truy cập</h2>
        <p className="mb-6">Bạn không có quyền truy cập vào trang này.</p>
        <Link to="/login" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
          Quay lại Đăng nhập
        </Link>
      </div>
    </div>
  );
}