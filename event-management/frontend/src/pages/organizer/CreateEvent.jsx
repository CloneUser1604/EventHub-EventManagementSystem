import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function CreateEvent() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    typeEvent: '',
    startDateTime: '',
    endDateTime: '',
    venue: '',
    maxCapacity: '',
    agenda: '',
    livestreamUrl: '',
    tags: ''
  });

  const [verificationFiles, setVerificationFiles] = useState([]);

  const tabs = ["Thông tin cơ bản", "Thời gian & Địa điểm", "Chương trình", "Tài liệu xác minh"];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setVerificationFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (isDraft) => {
    setLoading(true);
    setMessage('');

    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    data.append('status', isDraft ? 'Draft' : 'Pending');

    verificationFiles.forEach(file => {
      data.append('verificationDocuments', file);
    });

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/events`, data, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage(isDraft 
        ? '✅ Đã lưu sự kiện làm nháp!' 
        : '✅ Đã gửi sự kiện chờ Admin phê duyệt!'
      );

      setTimeout(() => navigate('/organizer'), 2000);
    } catch (err) {
      setMessage('❌ Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Tạo Sự Kiện Mới</h1>
        <button 
          onClick={() => navigate('/organizer')}
          className="text-gray-600 hover:text-gray-800"
        >
          ← Quay lại Dashboard
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-8">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-8 py-4 font-medium border-b-2 transition ${activeTab === i 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 0: Thông tin cơ bản */}
      {activeTab === 0 && (
        <div className="space-y-6">
          <input type="text" name="title" placeholder="Tiêu đề sự kiện *" onChange={handleChange} className="w-full p-4 border rounded-xl" required />
          <textarea name="description" placeholder="Mô tả chi tiết sự kiện *" onChange={handleChange} rows={5} className="w-full p-4 border rounded-xl" required />
        </div>
      )}

      {/* Tab 1: Thời gian & Địa điểm */}
      {activeTab === 1 && (
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label>Thời gian bắt đầu</label>
            <input type="datetime-local" name="startDateTime" onChange={handleChange} className="w-full p-4 border rounded-xl" />
          </div>
          <div>
            <label>Thời gian kết thúc</label>
            <input type="datetime-local" name="endDateTime" onChange={handleChange} className="w-full p-4 border rounded-xl" />
          </div>
        </div>
      )}

      {/* Tab 3: Tài liệu xác minh */}
      {activeTab === 3 && (
        <div>
          <p className="text-red-600 mb-4">* Bắt buộc khi gửi phê duyệt</p>
          <input 
            type="file" 
            multiple 
            onChange={handleFileChange} 
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl"
          />
          <p className="text-sm text-gray-500 mt-2">Hỗ trợ: PDF, JPG, PNG (tối đa 10MB/file)</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-4 mt-12">
        <button
          onClick={() => handleSubmit(true)}
          disabled={loading}
          className="flex-1 py-4 bg-gray-600 text-white rounded-xl font-medium hover:bg-gray-700"
        >
          {loading ? 'Đang lưu...' : '💾 Lưu Nháp'}
        </button>

        <button
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
        >
          {loading ? 'Đang gửi...' : '📤 Gửi Phê Duyệt'}
        </button>
      </div>

      {message && <p className="mt-6 text-center font-medium text-lg">{message}</p>}
    </div>
  );
}