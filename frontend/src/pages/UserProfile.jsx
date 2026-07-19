import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import useAuthStore from '../store/authStore';
import { getImageUrl } from '../utils/imageHelpers';
import '../styles/UserProfile.css';

const UserProfile = () => {
  const { accessToken, user: globalUser } = useAuthStore();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${accessToken}` } };
        const response = await axios.get('http://localhost:5000/api/auth/me', config);
        const userData = response.data.data || response.data;
        setProfileData(userData);
      } catch (error) {
        console.error('Lỗi khi lấy thông tin từ API:', error);
        setProfileData(globalUser);
      } finally {
        setIsLoading(false);
      }
    };
    if (accessToken) fetchUserProfile();
  }, [accessToken, globalUser]);

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}><Spin size="large" /></div>;

  const safeData = profileData || globalUser || {};
  const actualUser = safeData.user ? safeData.user : safeData;

  const displayName = actualUser.fullName || actualUser.FullName || actualUser.name || 'Người dùng ẩn danh';
  const email = actualUser.email || actualUser.Email || 'Chưa cập nhật email';
  
  const rawAvatar = actualUser.avatarURL || actualUser.AvatarURL;
  const processedAvatar = getImageUrl(rawAvatar);
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4a25e1&color=fff&size=128&bold=true`;
  const finalAvatar = processedAvatar || defaultAvatar;

  const userRole = actualUser.role || actualUser.Role || 'Participant';
  const createdAt = actualUser.createdAt || actualUser.CreatedAt;
  const joinDate = createdAt ? new Date(createdAt).toLocaleDateString('vi-VN') : 'Đang cập nhật...';

  const organizedEvents = safeData.events?.organized || [];
  const registeredEvents = safeData.events?.registered || [];
  const attendedEvents = safeData.events?.attended || [];

  const stats = {
    organized: safeData.stats?.organized || organizedEvents.length || 0,
    registered: safeData.stats?.registered || registeredEvents.length || 0,
    attended: safeData.stats?.attended || attendedEvents.length || 0,
  };

  const formatEventDate = (dateString) => {
    if (!dateString) return 'Chưa xác định';
    return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getBadgeStyle = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'cancelled') return { backgroundColor: '#ef4444', color: '#fff', border: 'none' }; // Nền Đỏ
    if (s === 'published' || s === 'active') return { backgroundColor: '#10b981', color: '#fff', border: 'none' }; // Nền Xanh lá
    if (s === 'pendingapproval' || s === 'pending') return { backgroundColor: '#f59e0b', color: '#fff', border: 'none' }; // Nền Cam
    if (s === 'completed') return { backgroundColor: '#3b82f6', color: '#fff', border: 'none' }; // Nền Xanh dương
    return { backgroundColor: '#64748b', color: '#fff', border: 'none' }; // Draft hoặc Mặc định (Xám)
  };

  return (
    <div className="profile-page">
      <div className="profile-top-bar">
        <Link to="/" className="btn-back-home">
          <i className="fa-solid fa-arrow-left"></i> Quay lại
        </Link>
      </div>

      <div className="profile-container">
        <div className="profile-sidebar">
          <div className="profile-top">
            <img src={finalAvatar} alt="Avatar" className="profile-avatar" />
            <h2 className="profile-name">{displayName}</h2>
            <p className="profile-email">{email}</p>
            
            <Link to="/profile/edit" className="btn-edit" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Cập nhật hồ sơ
            </Link>

            <div className="profile-meta">
              <div className="meta-item"><i className="fa-solid fa-user-tag"></i> Vai trò: {userRole}</div>
              <div className="meta-item"><i className="fa-solid fa-calendar-days"></i> Tham gia: {joinDate}</div>
            </div>
          </div>

          <div className="profile-stats">
            {userRole === 'Organizer' ? (
              <div className="stat-box" style={{ borderRight: 'none' }}>
                <span className="stat-number">{stats.organized}</span>
                <span className="stat-label">SỰ KIỆN QUẢN LÝ</span>
              </div>
            ) : (
              <>
                <div className="stat-box">
                  <span className="stat-number">{stats.registered}</span>
                  <span className="stat-label">ĐĂNG KÝ</span>
                </div>
                <div className="stat-box">
                  <span className="stat-number">{stats.attended}</span>
                  <span className="stat-label">ĐÃ THAM GIA</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="profile-main">
          {userRole === 'Organizer' ? (
            <div className="profile-section">
              <h3 className="section-title">Sự kiện đã và đang tổ chức</h3>
              <div className="event-list">
                {organizedEvents.length > 0 ? (
                  organizedEvents.map((event, idx) => {
                    const statusText = event.Status || event.status || 'Active';
                    return (
                      <div key={idx} className="event-item">
                        <div className="event-info">
                          <h4>{event.Title || event.title}</h4>
                          <p>📍 {event.Location || event.location || 'Đang cập nhật'}</p>
                          <p>🕒 {formatEventDate(event.StartDate || event.startDate)}</p>
                        </div>
                        {/* ĐÃ SỬA: Thay thế class tĩnh thành style màu động */}
                        <span className="status-badge" style={getBadgeStyle(statusText)}>
                          {statusText}
                        </span>
                      </div>
                    );
                  })
                ) : <p className="no-data">Bạn chưa tạo sự kiện nào.</p>}
              </div>
            </div>
          ) : (
            <>
              <div className="profile-section" style={{ marginBottom: '32px' }}>
                <h3 className="section-title">Sự kiện sắp diễn ra (Đã đăng ký)</h3>
                <div className="event-list">
                  {registeredEvents.length > 0 ? (
                    registeredEvents.map((event, idx) => (
                      <div 
                        key={idx} 
                        className="event-item"
                        onClick={() => navigate('/my-calendar')}
                        style={{ cursor: 'pointer' }}
                        title="Đến lịch của tôi"
                      >
                        <div className="event-info">
                          <h4>{event.Title || event.title}</h4>
                          <p>📍 {event.Location || event.location || 'Đang cập nhật'}</p>
                          <p>🕒 {formatEventDate(event.StartDate || event.startDate)}</p>
                        </div>
                        <span className="status-badge registered">Đã đặt chỗ</span>
                      </div>
                    ))
                  ) : <p className="no-data">Bạn chưa đăng ký sự kiện nào.</p>}
                </div>
              </div>

              <div className="profile-section">
                <h3 className="section-title">Lịch sử tham gia</h3>
                <div className="event-list">
                  {attendedEvents.length > 0 ? (
                    attendedEvents.map((event, idx) => (
                      <div key={idx} className="event-item">
                        <div className="event-info">
                          <h4>{event.Title || event.title}</h4>
                          <p>📍 {event.Location || event.location || 'Trực tuyến'}</p>
                          <p>🕒 {formatEventDate(event.StartDate || event.startDate)}</p>
                        </div>
                        <span className="status-badge attended">Đã tham gia</span>
                      </div>
                    ))
                  ) : <p className="no-data">Chưa có lịch sử tham gia.</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;