import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Spin } from 'antd';
import useAuthStore from '../store/authStore';
import '../styles/UserProfile.css';

const UserProfile = () => {
  const { accessToken } = useAuthStore();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${accessToken}` } };
        const response = await axios.get('http://localhost:5000/api/users/me', config);
        
        // SỬA LỖI 1: Bắt đúng lớp bọc dữ liệu từ backend master
        const userData = response.data.data || response.data;
        setProfileData(userData);
      } catch (error) {
        console.error('Lỗi khi lấy thông tin:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (accessToken) fetchUserProfile();
  }, [accessToken]);

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}><Spin size="large" /></div>;

  // SỬA LỖI 2: Quét đồng thời cả biến chữ thường (master) và chữ hoa (phòng hờ)
  const displayName = profileData?.fullName || profileData?.FullName || 'Người dùng ẩn danh';
  const email = profileData?.email || profileData?.Email || 'Chưa cập nhật email';
  const realAvatar = profileData?.avatarURL || profileData?.AvatarURL;
  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4a25e1&color=fff&size=128&bold=true`;
  const userRole = profileData?.role || profileData?.Role || 'Participant';
  
  // SỬA LỖI 3: Lấy đúng ngày tham gia và định dạng lại
  const createdAt = profileData?.createdAt || profileData?.CreatedAt;
  const joinDate = createdAt ? new Date(createdAt).toLocaleDateString('vi-VN') : 'Đang cập nhật...';

  const formatEventDate = (dateString) => {
    if (!dateString) return 'Chưa xác định';
    return new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
            <img src={realAvatar || defaultAvatar} alt="Avatar" className="profile-avatar" />
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
                <span className="stat-number">{profileData?.stats?.organized || 0}</span>
                <span className="stat-label">SỰ KIỆN QUẢN LÝ</span>
              </div>
            ) : (
              <>
                <div className="stat-box">
                  <span className="stat-number">{profileData?.stats?.registered || 0}</span>
                  <span className="stat-label">ĐĂNG KÝ</span>
                </div>
                <div className="stat-box">
                  <span className="stat-number">{profileData?.stats?.attended || 0}</span>
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
                {profileData?.events?.organized?.length > 0 ? (
                  profileData.events.organized.map((event, idx) => (
                    <div key={idx} className="event-item">
                      <div className="event-info">
                        <h4>{event.Title || event.title}</h4>
                        <p>📍 {event.Location || event.location || 'Trực tuyến'}</p>
                        <p>🕒 {formatEventDate(event.StartDate || event.startDate)}</p>
                      </div>
                      <span className="status-badge active">{event.Status || event.status || 'Active'}</span>
                    </div>
                  ))
                ) : <p className="no-data">Bạn chưa tạo sự kiện nào.</p>}
              </div>
            </div>
          ) : (
            <>
              <div className="profile-section" style={{ marginBottom: '32px' }}>
                <h3 className="section-title">Sự kiện sắp diễn ra (Đã đăng ký)</h3>
                <div className="event-list">
                  {profileData?.events?.registered?.length > 0 ? (
                    profileData.events.registered.map((event, idx) => (
                      <div key={idx} className="event-item">
                        <div className="event-info">
                          <h4>{event.Title || event.title}</h4>
                          <p>📍 {event.Location || event.location || 'Trực tuyến'}</p>
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
                  {profileData?.events?.attended?.length > 0 ? (
                    profileData.events.attended.map((event, idx) => (
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