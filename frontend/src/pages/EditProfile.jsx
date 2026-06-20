import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { message, Spin } from 'antd';
import useAuthStore from '../store/authStore';
import '../styles/EditProfile.css';

const EditProfile = () => {
  const { accessToken, fetchMe } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State cho Tab Thông tin
  const [formData, setFormData] = useState({
    FullName: '', Phone: '', AvatarURL: '', 
    Username: '', Email: ''
  });

  // State cho Tab Mật khẩu
  const [passwordData, setPasswordData] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const config = { headers: { Authorization: `Bearer ${accessToken}` } };
        const res = await axios.get('http://localhost:5000/api/users/me', config);
        const u = res.data.data || res.data;
        setFormData({
          FullName: u.FullName || u.fullName || '',
          Phone: u.Phone || u.phone || '',
          AvatarURL: u.AvatarURL || u.avatarURL || '',
          Email: u.Email || u.email || '',
          Username: u.Email?.split('@')[0] || '', // Lấy phần trước @ làm username
        });
      } catch (err) {
        message.error('Không thể tải dữ liệu hồ sơ');
      } finally { 
        setIsLoading(false); 
      }
    };
    if (accessToken) loadData();
  }, [accessToken]);

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const config = { headers: { Authorization: `Bearer ${accessToken}` } };
      await axios.put('http://localhost:5000/api/users/me', formData, config);
      await fetchMe();
      message.success('Cập nhật thông tin thành công!');
      navigate('/profile');
    } catch (err) {
      message.error('Lưu thất bại, vui lòng kiểm tra lại');
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return message.warning('Mật khẩu xác nhận không khớp');
    }
    setIsSaving(true);
    try {
      const config = { headers: { Authorization: `Bearer ${accessToken}` } };
      await axios.put('http://localhost:5000/api/users/me/password', passwordData, config);
      message.success('Đổi mật khẩu thành công!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi đổi mật khẩu');
    } finally { 
      setIsSaving(false); 
    }
  };

  if (isLoading) return <div className="loading-center"><Spin size="large" /></div>;

  return (
    <div className="edit-profile-layout">
      {/* Thanh Menu Trái */}
      <div className="sidebar-nav">
        <h3 className="sidebar-header">EMS Settings</h3>
        <div className={`nav-item ${activeTab === '1' ? 'active' : ''}`} onClick={() => setActiveTab('1')}>
          <i className="fa-solid fa-user"></i> Personal Information
        </div>
        <div className={`nav-item ${activeTab === '2' ? 'active' : ''}`} onClick={() => setActiveTab('2')}>
          <i className="fa-solid fa-shield-halved"></i> Security
        </div>
        <div className="nav-item" onClick={() => navigate('/profile')} style={{ marginTop: '20px', color: '#ef4444' }}>
          <i className="fa-solid fa-arrow-left"></i> Back to Profile
        </div>
      </div>

      {/* Nội dung Form Bên Phải */}
      <div className="content-view">
        {activeTab === '1' ? (
          <div className="form-container">
            <h2 className="view-title">Edit Profile</h2>
            <p className="view-subtitle">Thông tin này sẽ hiển thị trên hồ sơ công khai của bạn.</p>

            <div className="profile-photo-section">
              <img src={formData.AvatarURL || 'https://ui-avatars.com/api/?name=User&background=4a25e1&color=fff'} alt="Avatar" className="avatar-preview" />
              <div className="photo-actions">
                <p className="photo-hint">Ảnh đại diện <br/><span>Nên dùng ảnh vuông, kích thước tối thiểu 400x400px.</span></p>
                <div className="btn-group">
                  <input 
                    type="text" 
                    placeholder="Dán link ảnh (URL) vào đây..." 
                    className="url-input" 
                    value={formData.AvatarURL} 
                    onChange={(e) => setFormData({...formData, AvatarURL: e.target.value})} 
                  />
                  <button type="button" className="btn-remove" onClick={() => setFormData({...formData, AvatarURL: ''})}>Xóa ảnh</button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveInfo} className="grid-form">
              <div className="input-group">
                <label>Họ và Tên</label>
                <input type="text" value={formData.FullName} onChange={(e) => setFormData({...formData, FullName: e.target.value})} required />
              </div>
              <div className="input-group">
                <label>Tên đăng nhập</label>
                <input type="text" value={formData.Username} disabled style={{ backgroundColor: '#f8fafc' }} />
              </div>
              <div className="input-group">
                <label>Địa chỉ Email</label>
                <input type="email" value={formData.Email} disabled style={{ backgroundColor: '#f8fafc' }} />
              </div>
              <div className="input-group">
                <label>Số điện thoại</label>
                <input type="tel" value={formData.Phone} onChange={(e) => setFormData({...formData, Phone: e.target.value})} />
              </div>

              <div className="full-width-actions">
                 <button type="submit" className="btn-save-main" disabled={isSaving}>
                    {isSaving ? <Spin size="small" /> : 'Lưu thay đổi'}
                 </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="form-container">
            <h2 className="view-title">Security</h2>
            <p className="view-subtitle">Cập nhật mật khẩu để bảo vệ tài khoản của bạn.</p>
            <form onSubmit={handleUpdatePassword} className="security-form">
              <div className="input-group full">
                <label>Mật khẩu hiện tại</label>
                <input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} required />
              </div>
              <div className="input-group full">
                <label>Mật khẩu mới</label>
                <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} minLength="6" required />
              </div>
              <div className="input-group full">
                <label>Xác nhận mật khẩu mới</label>
                <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} minLength="6" required />
              </div>
              <button type="submit" className="btn-save-main" disabled={isSaving}>
                {isSaving ? <Spin size="small" /> : 'Đổi mật khẩu'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditProfile;