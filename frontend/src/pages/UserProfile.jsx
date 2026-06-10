import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import '../styles/UserProfile.css';

const UserProfile = () => {
  const { accessToken } = useAuthStore();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        };
        const response = await axios.get('http://localhost:5000/api/users/me', config);
        setProfileData(response.data);
      } catch (error) {
        console.error('Lỗi khi lấy thông tin thống kê:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchUserProfile();
    }
  }, [accessToken]);

  if (isLoading) {
    return <div className="profile-page" style={{ alignItems: 'center', justifyItems: 'center' }}><h3>Đang tải dữ liệu hồ sơ...</h3></div>;
  }

  const displayName = profileData?.FullName || profileData?.fullName || 'Người dùng ẩn danh';
  const realAvatar = profileData?.AvatarURL || profileData?.avatarURL || profileData?.avatar;
  const nameAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4a25e1&color=fff&size=128&bold=true&length=1`;
  const userRole = profileData?.Role || profileData?.role || 'Participant';

  const formatEventDate = (dateString) => {
    if (!dateString) return 'Chưa xác định';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
  };

  return (
    <div className="profile-page">
      <div className="profile-top-bar">
        <Link to="/" className="btn-back-home">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Quay lại
        </Link>
      </div>

      <div className="profile-container">
        <div className="profile-sidebar">
          <div className="profile-top">
            <img 
              src={realAvatar ? `http://localhost:5000${realAvatar}` : nameAvatar} 
              alt="Avatar" 
              className="profile-avatar" 
              onError={(e) => { e.target.src = nameAvatar }}
            />
            <h2 className="profile-name">{displayName}</h2>
            <p className="profile-email">{profileData?.Email || profileData?.email}</p>
            
            <Link to="/profile/edit" className="btn-edit" style={{ textDecoration: 'none', display: 'inline-block', boxSizing: 'border-box' }}>
              Cập nhật hồ sơ
            </Link>

            <div className="profile-meta">
              <div className="meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Vai trò: {userRole}
              </div>
              <div className="meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Tham gia: {(profileData?.CreatedAt || profileData?.createdAt) && new Date(profileData.CreatedAt || profileData.createdAt).toLocaleDateString('vi-VN')}
              </div>
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
                  profileData.events.organized.map((event) => (
                    <div key={event.EventID || event.eventID} className="event-item">
                      <div className="event-info">
                        <h4>{event.Title || event.title}</h4>
                        <p>📍 {event.Location || event.location || 'Trực tuyến'}</p>
                        <p>🕒 {formatEventDate(event.StartDate || event.startDate)}</p>
                      </div>
                      <span className={`status-badge ${event.Status?.toLowerCase() || event.status?.toLowerCase() || 'active'}`}>
                        {event.Status || event.status || 'Active'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="no-data">Bạn chưa tạo sự kiện nào.</p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="profile-section" style={{ marginBottom: '32px' }}>
                <h3 className="section-title">Sự kiện sắp diễn ra </h3>
                <div className="event-list">
                  {profileData?.events?.registered?.length > 0 ? (
                    profileData.events.registered.map((event) => (
                      <div key={event.EventID || event.eventID} className="event-item">
                        <div className="event-info">
                          <h4>{event.Title || event.title}</h4>
                          <p>📍 {event.Location || event.location || 'Trực tuyến'}</p>
                          <p>🕒 {formatEventDate(event.StartDate || event.startDate)}</p>
                        </div>
                        <span className="status-badge registered">Đã đăng ký</span>
                      </div>
                    ))
                  ) : (
                    <p className="no-data">Bạn chưa đăng ký sự kiện nào.</p>
                  )}
                </div>
              </div>

              <div className="profile-section">
                <h3 className="section-title">Lịch sử tham gia</h3>
                <div className="event-list">
                  {profileData?.events?.attended?.length > 0 ? (
                    profileData.events.attended.map((event) => (
                      <div key={event.EventID || event.eventID} className="event-item">
                        <div className="event-info">
                          <h4>{event.Title || event.title}</h4>
                          <p>📍 {event.Location || event.location || 'Trực tuyến'}</p>
                          <p>🕒 {formatEventDate(event.StartDate || event.startDate)}</p>
                        </div>
                        <span className="status-badge attended">Đã tham gia</span>
                      </div>
                    ))
                  ) : (
                    <p className="no-data">Chưa có lịch sử tham gia.</p>
                  )}
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