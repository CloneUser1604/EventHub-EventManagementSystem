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

  const [formData, setFormData] = useState({
    fullName: '', phone: '', avatarURL: '', email: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  // ĐÃ THÊM: State để quản lý việc ẩn/hiện mật khẩu cho từng ô
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // ĐÃ THÊM: Hàm đảo ngược trạng thái ẩn/hiện
  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const config = { headers: { Authorization: `Bearer ${accessToken}` } };
        const res = await axios.get('http://localhost:5000/api/auth/me', config);
        const u = res.data.data || res.data;
        
        setFormData({
          fullName: u.fullName || u.FullName || '',
          phone: u.phone || u.Phone || '',
          avatarURL: u.avatarURL || u.AvatarURL || '',
          email: u.email || u.Email || '',
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
      
      const updatePayload = {
        fullName: formData.fullName,
        phone: formData.phone,
        avatarURL: formData.avatarURL,
        FullName: formData.fullName,
        Phone: formData.phone,
        AvatarURL: formData.avatarURL
      };

      await axios.put('http://localhost:5000/api/auth/me', updatePayload, config);
      
      if (fetchMe) await fetchMe();
      message.success('Cập nhật thông tin thành công!');
      navigate('/profile');
    } catch (err) {
      console.error('❌ LỖI UPDATE PROFILE:', err.response?.data || err.message);
      message.error(err.response?.data?.message || 'Lưu thất bại, vui lòng kiểm tra lại');
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
      await axios.put('http://localhost:5000/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, config);
      
      message.success('Đổi mật khẩu thành công!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      // Reset lại con mắt về trạng thái nhắm sau khi đổi thành công
      setShowPassword({ current: false, new: false, confirm: false });
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
              <img src={formData.avatarURL || 'https://ui-avatars.com/api/?name=User&background=4a25e1&color=fff'} alt="Avatar" className="avatar-preview" />
              <div className="photo-actions">
                <p className="photo-hint">Ảnh đại diện <br/><span>Nên dùng ảnh vuông, kích thước tối thiểu 400x400px.</span></p>
                <div className="btn-group">
                  <input 
                    type="text" 
                    placeholder="Dán link ảnh (URL) vào đây..." 
                    className="url-input" 
                    value={formData.avatarURL} 
                    onChange={(e) => setFormData({...formData, avatarURL: e.target.value})} 
                  />
                  <button type="button" className="btn-remove" onClick={() => setFormData({...formData, avatarURL: ''})}>Xóa ảnh</button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveInfo} className="grid-form">
              <div className="input-group">
                <label>Họ và Tên</label>
                <input type="text" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required />
              </div>
              
              <div className="input-group">
                <label>Địa chỉ Email</label>
                <input type="email" value={formData.email} disabled style={{ backgroundColor: '#f8fafc' }} />
              </div>
              <div className="input-group">
                <label>Số điện thoại</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
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
              
              {/* CỤM MẬT KHẨU HIỆN TẠI */}
              <div className="input-group full">
                <label>Mật khẩu hiện tại</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword.current ? 'text' : 'password'} 
                    value={passwordData.currentPassword} 
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} 
                    required 
                    style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                  />
                  <i 
                    className={`fa-solid ${showPassword.current ? 'fa-eye-slash' : 'fa-eye'}`} 
                    onClick={() => togglePasswordVisibility('current')}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#64748b' }}
                  ></i>
                </div>
              </div>

              {/* CỤM MẬT KHẨU MỚI */}
              <div className="input-group full">
                <label>Mật khẩu mới</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword.new ? 'text' : 'password'} 
                    value={passwordData.newPassword} 
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} 
                    minLength="6" 
                    required 
                    style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                  />
                  <i 
                    className={`fa-solid ${showPassword.new ? 'fa-eye-slash' : 'fa-eye'}`} 
                    onClick={() => togglePasswordVisibility('new')}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#64748b' }}
                  ></i>
                </div>
              </div>

              {/* CỤM XÁC NHẬN MẬT KHẨU */}
              <div className="input-group full">
                <label>Xác nhận mật khẩu mới</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword.confirm ? 'text' : 'password'} 
                    value={passwordData.confirmPassword} 
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} 
                    minLength="6" 
                    required 
                    style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                  />
                  <i 
                    className={`fa-solid ${showPassword.confirm ? 'fa-eye-slash' : 'fa-eye'}`} 
                    onClick={() => togglePasswordVisibility('confirm')}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#64748b' }}
                  ></i>
                </div>
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