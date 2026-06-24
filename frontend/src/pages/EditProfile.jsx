import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { message, Spin } from 'antd';
import useAuthStore from '../store/authStore';
import { getImageUrl } from '../utils/imageHelpers';
import '../styles/EditProfile.css';

const EditProfile = () => {
  const { accessToken, fetchMe } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State quản lý riêng cho Organizer
  const [userRole, setUserRole] = useState('');
  const [existingDocs, setExistingDocs] = useState([]);
  const [newDocs, setNewDocs] = useState(null);

  // State quản lý file ảnh đại diện upload từ máy
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '', phone: '', avatarURL: '', email: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
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

        // Ghi nhận Role và mảng tài liệu cũ của Organizer
        setUserRole(u.role || u.Role);
        if (u.organizerProfile && u.organizerProfile.documents) {
          setExistingDocs(u.organizerProfile.documents);
        }

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

    // ĐÃ THÊM: Validate Số điện thoại chuẩn VN (10 số, bắt đầu bằng số 0)
    if (formData.phone) {
      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test(formData.phone)) {
        return message.warning('Số điện thoại không hợp lệ! Vui lòng nhập 10 chữ số và bắt đầu bằng số 0.');
      }
    }

    setIsSaving(true);
    try {
      const formDataPayload = new FormData();
      formDataPayload.append('fullName', formData.fullName);
      formDataPayload.append('phone', formData.phone);
      
      // Ưu tiên gửi file ảnh, nếu không có thì gửi link URL
      if (avatarFile) {
        formDataPayload.append('avatar', avatarFile);
      } else {
        formDataPayload.append('avatarURL', formData.avatarURL);
      }
      
      // Nếu có chọn file tài liệu mới thì đính kèm vào
      if (newDocs) {
        Array.from(newDocs).forEach(file => {
          formDataPayload.append('documents', file);
        });
      }

      const config = { 
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'multipart/form-data' // Bắt buộc khi có file
        } 
      };

      await axios.put('http://localhost:5000/api/auth/me', formDataPayload, config);
      
      if (fetchMe) await fetchMe();
      if (newDocs) {
         message.success('Cập nhật tài liệu thành công! Tài khoản đang chờ duyệt lại.');
      } else {
         message.success('Cập nhật thông tin thành công!');
      }
      navigate('/profile');
    } catch (err) {
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
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (passwordData.newPassword.length < 8 || !passwordRegex.test(passwordData.newPassword)) {
      return message.warning('Mật khẩu mới phải ít nhất 8 ký tự, chứa chữ hoa, chữ thường và số!');
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
      setShowPassword({ current: false, new: false, confirm: false });
    } catch (err) {
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const errorMsg = err.response.data.errors.map(e => e.message).join(', ');
        message.error(`Lỗi: ${errorMsg}`);
      } else {
        message.error(err.response?.data?.message || 'Lỗi đổi mật khẩu');
      }
    } finally { 
      setIsSaving(false); 
    }
  };

  if (isLoading) return <div className="loading-center"><Spin size="large" /></div>;

  return (
    <div className="edit-profile-layout">
      <div className="sidebar-nav">
        <h3 className="sidebar-header">EMS Settings</h3>
        <div className={`nav-item ${activeTab === '1' ? 'active' : ''}`} onClick={() => setActiveTab('1')}>
          <i className="fa-solid fa-user"></i> Thông tin cá nhân
        </div>
        <div className={`nav-item ${activeTab === '2' ? 'active' : ''}`} onClick={() => setActiveTab('2')}>
          <i className="fa-solid fa-shield-halved"></i> Bảo mật
        </div>
        <div className="nav-item" onClick={() => navigate('/profile')} style={{ marginTop: '20px', color: '#ef4444' }}>
          <i className="fa-solid fa-arrow-left"></i> Quay lại Hồ sơ
        </div>
      </div>

      <div className="content-view">
        {activeTab === '1' ? (
          <div className="form-container">
            <h2 className="view-title">Chỉnh sửa hồ sơ</h2>
            <p className="view-subtitle">Thông tin này sẽ hiển thị trên hồ sơ công khai của bạn.</p>

            <div className="profile-photo-section">
              <img 
                src={avatarPreview || getImageUrl(formData.avatarURL) || 'https://ui-avatars.com/api/?name=User&background=4a25e1&color=fff'} 
                alt="Avatar" 
                className="avatar-preview" 
                style={{ objectFit: 'cover' }}
              />
              <div className="photo-actions">
                <p className="photo-hint">Ảnh đại diện <br/><span>Nên dùng ảnh vuông, định dạng JPG/PNG.</span></p>
                <div className="btn-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  
                  {/* Nút tải ảnh lên từ máy */}
                  <label style={{
                    background: '#4f46e5', color: 'white', padding: '8px 12px', borderRadius: '6px', 
                    cursor: 'pointer', fontSize: '13px', fontWeight: 500, display: 'inline-block', margin: 0
                  }}>
                    <i className="fa-solid fa-cloud-arrow-up" style={{marginRight: 6}}></i> Tải ảnh lên
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setAvatarFile(file);
                          setAvatarPreview(URL.createObjectURL(file)); // Cập nhật hình xem trước
                          setFormData({...formData, avatarURL: ''}); // Xóa URL cũ để ưu tiên file
                        }
                      }} 
                    />
                  </label>

                  <input 
                    type="text" 
                    placeholder="Hoặc dán link ảnh (URL)..." 
                    className="url-input" 
                    value={formData.avatarURL} 
                    onChange={(e) => {
                      setFormData({...formData, avatarURL: e.target.value});
                      setAvatarFile(null); // Bỏ chọn file nếu dán URL
                      setAvatarPreview(null);
                    }} 
                    style={{ flex: 1, minWidth: '150px' }}
                  />
                  <button type="button" className="btn-remove" onClick={() => {
                    setFormData({...formData, avatarURL: ''});
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  }}>Xóa ảnh</button>
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
              
              {/* ĐÃ SỬA: Chặn nhập chữ, giới hạn 10 ký tự */}
              <div className="input-group">
                <label>Số điện thoại</label>
                <input 
                  type="tel" 
                  value={formData.phone} 
                  maxLength="10"
                  placeholder="Ví dụ: 0912345678"
                  onChange={(e) => {
                    const onlyNumbers = e.target.value.replace(/\D/g, '');
                    setFormData({...formData, phone: onlyNumbers});
                  }} 
                />
              </div>

              {/* KHU VỰC TẢI TÀI LIỆU (Chỉ hiện với Organizer) */}
              {userRole === 'Organizer' && (
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Tài liệu xác minh & Giấy phép sự kiện</label>
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    
                    {/* Hiển thị tài liệu cũ (nếu có) */}
                    {existingDocs.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#64748b' }}>Tài liệu hiện tại của bạn:</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {existingDocs.map((doc, idx) => (
                            <a key={idx} href={`http://localhost:5000/uploads/organizer-docs/${doc}`} target="_blank" rel="noreferrer" 
                               style={{ fontSize: '12px', background: '#e2e8f0', padding: '6px 12px', borderRadius: '4px', textDecoration: 'none', color: '#1e293b', fontWeight: 500 }}>
                              <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', marginRight: 6 }}></i>
                              Tài liệu {idx + 1}
                            </a>
                          ))}
                        </div>
                        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#f59e0b', fontStyle: 'italic' }}>
                          <i className="fa-solid fa-circle-info" style={{ marginRight: 4 }}></i>
                          Nếu tải lên tài liệu mới, hệ thống sẽ xóa file cũ và trạng thái tài khoản sẽ chuyển về <strong>Chờ duyệt</strong>.
                        </p>
                      </div>
                    )}

                    <input 
                      type="file" 
                      multiple 
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => setNewDocs(e.target.files)} 
                      style={{ width: '100%', fontSize: '13px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )}

              <div className="full-width-actions" style={{ gridColumn: '1 / -1' }}>
                 <button type="submit" className="btn-save-main" disabled={isSaving}>
                    {isSaving ? <Spin size="small" /> : 'Lưu thay đổi'}
                 </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="form-container">
            <h2 className="view-title">Đổi mật khẩu</h2>
            <p className="view-subtitle">Cập nhật mật khẩu để bảo vệ tài khoản của bạn.</p>
            <form onSubmit={handleUpdatePassword} className="security-form">
              
              <div className="input-group full">
                <label>Mật khẩu hiện tại</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword.current ? 'text' : 'password'} value={passwordData.currentPassword} onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} required style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} />
                  <i className={`fa-solid ${showPassword.current ? 'fa-eye-slash' : 'fa-eye'}`} onClick={() => togglePasswordVisibility('current')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#64748b' }}></i>
                </div>
              </div>

              <div className="input-group full">
                <label>Mật khẩu mới (Ít nhất 8 ký tự, gồm chữ hoa, thường & số)</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword.new ? 'text' : 'password'} value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} minLength="8" required style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} />
                  <i className={`fa-solid ${showPassword.new ? 'fa-eye-slash' : 'fa-eye'}`} onClick={() => togglePasswordVisibility('new')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#64748b' }}></i>
                </div>
              </div>

              <div className="input-group full">
                <label>Xác nhận mật khẩu mới</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPassword.confirm ? 'text' : 'password'} value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} minLength="8" required style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }} />
                  <i className={`fa-solid ${showPassword.confirm ? 'fa-eye-slash' : 'fa-eye'}`} onClick={() => togglePasswordVisibility('confirm')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#64748b' }}></i>
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