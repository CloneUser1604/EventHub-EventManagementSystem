import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import '../styles/EditProfile.css';

const EditProfile = () => {
  const { accessToken, fetchMe } = useAuthStore();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    FullName: '',
    Phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Lấy dữ liệu cũ để điền sẵn vào Form
  useEffect(() => {
    const fetchCurrentData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${accessToken}` } };
        const response = await axios.get('http://localhost:5000/api/users/me', config);
        setFormData({
          FullName: response.data.FullName || '',
          Phone: response.data.Phone || '',
        });
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu cũ", error);
      }
    };
    if (accessToken) fetchCurrentData();
  }, [accessToken]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${accessToken}` } };
      // Gửi yêu cầu cập nhật lên Backend
      await axios.put('http://localhost:5000/api/users/me', formData, config);
      
      // Cập nhật lại kho dữ liệu chung và quay về trang Profile
      await fetchMe(); 
      navigate('/profile');
    } catch (error) {
      alert('Cập nhật thất bại. Vui lòng thử lại!');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-card">
        <h2 className="edit-profile-title">Cập nhật hồ sơ</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Họ và Tên</label>
            <input 
              type="text" 
              name="FullName" 
              value={formData.FullName} 
              onChange={handleChange} 
              className="form-input"
              placeholder="Nhập họ và tên của bạn"
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Số điện thoại</label>
            <input 
              type="tel" 
              name="Phone" 
              value={formData.Phone} 
              onChange={handleChange} 
              className="form-input"
              placeholder="Nhập số điện thoại"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => navigate('/profile')}>
              Hủy
            </button>
            <button type="submit" className="btn-save" disabled={isLoading}>
              {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;