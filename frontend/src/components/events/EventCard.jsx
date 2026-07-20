import React, { useState, useEffect } from 'react';
import { Card, Tag, Avatar, Tooltip } from 'antd';
import { 
  CalendarOutlined, EnvironmentOutlined, TeamOutlined, ClockCircleOutlined,
  UserOutlined, CodeOutlined, BookOutlined, RocketOutlined, SmileOutlined,
  TrophyOutlined, HeartOutlined, HeartFilled, NotificationOutlined, AppstoreOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getImageUrl } from '../../utils/imageHelpers';
import { useTranslation } from '../../hooks/useTranslation';

const getCategoryStyle = (categoryName) => {
  const name = (categoryName || '').toLowerCase();
  if (name.includes('công nghệ') || name.includes('tech') || name.includes('it')) return { color: 'blue', icon: <CodeOutlined /> };
  if (name.includes('học thuật') || name.includes('academic')) return { color: 'cyan', icon: <BookOutlined /> };
  if (name.includes('hướng nghiệp') || name.includes('career')) return { color: 'purple', icon: <RocketOutlined /> };
  if (name.includes('kỹ năng') || name.includes('skill')) return { color: 'orange', icon: <SmileOutlined /> };
  if (name.includes('thể thao') || name.includes('sport')) return { color: 'green', icon: <TrophyOutlined /> };
  if (name.includes('tình nguyện') || name.includes('volunteer')) return { color: 'magenta', icon: <HeartOutlined /> };
  if (name.includes('văn hóa') || name.includes('nghệ thuật') || name.includes('art')) return { color: 'pink', icon: <NotificationOutlined /> };
  return { color: 'default', icon: <AppstoreOutlined /> };
};

const statusConfig = {
  Published:      { color: 'green',   label: 'Đang mở' },
  PendingApproval:{ color: 'orange',  label: 'Chờ duyệt' },
  Draft:          { color: 'default', label: 'Nháp' },
  Rejected:       { color: 'red',     label: 'Bị từ chối' },
  Cancelled:      { color: 'red',     label: 'Đã huỷ' },
  Completed:      { color: 'blue',    label: 'Đã kết thúc' },
};

const EventCard = ({ event, showStatus = false, index = 0 }) => {
  const navigate = useNavigate();
  const remaining = event.MaxParticipants ? event.MaxParticipants - (event.RegisteredCount || 0) : null;
  const isFull = remaining !== null && remaining <= 0;
  
  const now = dayjs();
  const isPast = dayjs(event.EndDate).isBefore(now);
  const isUpcoming = dayjs(event.StartDate).isAfter(now);
  const isOngoing = !isPast && !isUpcoming;

  const status = statusConfig[event.Status] || { color: 'default', label: event.Status };
  const { t } = useTranslation();

  const [isFav, setIsFav] = useState(false);
  useEffect(() => {
    const handleStorageChange = () => {
      const favs = JSON.parse(localStorage.getItem('favoriteEvents') || '[]');
      setIsFav(favs.includes(String(event.EventID)));
    };
    handleStorageChange();
    window.addEventListener('favoritesUpdated', handleStorageChange);
    return () => window.removeEventListener('favoritesUpdated', handleStorageChange);
  }, [event.EventID]);

  return (
    <Card
      className="card-hover animate-fade-in-up"
      onClick={() => navigate(`/events/${event.EventID}`)}
      style={{ borderRadius: 14, overflow: 'hidden', animationDelay: `${index * 0.1}s`, height: '100%', display: 'flex', flexDirection: 'column' }}
      cover={
        <div style={{ position: 'relative', height: 180, overflow: 'hidden', background: 'linear-gradient(135deg,#1a2744,#0f1629)' }}>
          {event.CoverImageURL
            ? <img src={getImageUrl(event.CoverImageURL)} alt={event.Title} className="hover-zoom-img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div className="hover-zoom-img" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🎓</div>
          }
          {/* Overlays */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            {/* Removed top-left InternalOnly tag because it's already shown in the body */}
            {event.CategoryName && (
              <Tag style={{ margin: 0, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', color: 'white', fontWeight: 500, padding: '2px 8px' }}>
                {getCategoryStyle(event.CategoryName).icon} <span style={{ marginLeft: 4 }}>{t(`categories.${event.CategoryName}`) !== `categories.${event.CategoryName}` ? t(`categories.${event.CategoryName}`) : event.CategoryName}</span>
              </Tag>
            )}
            {showStatus && status.label !== 'Đã kết thúc' && (
              <Tag color={status.color} style={{ margin: 0, borderRadius: 6, border: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                {status.label}
              </Tag>
            )}
          </div>
          
          {/* Top Right Badges */}
          <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {event.Status === 'Cancelled' ? (
              <div style={{ background: '#ef4444', color: 'white', padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{status.label}</div>
            ) : isPast ? (
              <div style={{ background: '#4b5563', color: 'white', padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{t('eventCard.ended')}</div>
            ) : isOngoing ? (
              <div style={{ background: '#10b981', color: 'white', padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white', animation: 'pulse 2s infinite' }} /> {t('eventCard.happening')}
              </div>
            ) : isUpcoming ? (
              <div style={{ background: '#3b82f6', color: 'white', padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{t('eventCard.upcoming')}</div>
            ) : null}

            {isFull && !isPast && (
              <div style={{ background: '#ef4444', color: 'white', padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{t('eventCard.full')}</div>
            )}
            
            {isFav && (
              <div style={{ background: '#be123c', color: 'white', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 2px 8px rgba(190,18,60,0.3)' }}>
                <HeartFilled style={{color: '#fecdd3'}} /> {t('eventCard.favorite')}
              </div>
            )}
          </div>
        </div>
      }
      styles={{ body: { padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 } }}
    >
      <div
        className="event-card-title"
        style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 8, lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {event.Title}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13 }}>
          <CalendarOutlined style={{ color: '#2563eb', flexShrink: 0 }} />
          <span>{dayjs(event.StartDate).format('DD/MM/YYYY · HH:mm')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13 }}>
          <EnvironmentOutlined style={{ color: '#7c3aed', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.VenueName || t('eventCard.notUpdated')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13 }}>
          <UserOutlined style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span>{event.RegisteredCount || 0} {t('eventCard.registeredUsers')}</span>
        </div>
        {remaining !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <TeamOutlined style={{ color: isFull ? '#ef4444' : '#10b981', flexShrink: 0 }} />
            <span style={{ color: isFull ? '#ef4444' : '#6b7280' }}>
              {isFull ? t('eventCard.spotsFull') : `${t('eventCard.spotsLeft')} ${remaining}`}
            </span>
          </div>
        )}
        <div style={{ marginTop: 4 }}>
          {event.IsInternalOnly ? (
            <Tag color="purple" style={{ margin: 0, borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{t('eventCard.internalOnly')}</Tag>
          ) : (
            <Tag color="cyan" style={{ margin: 0, borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{t('eventCard.everyone')}</Tag>
          )}
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={22} style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', fontSize: 11 }}>
            {event.OrganizerName?.[0]}
          </Avatar>
          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{event.OrganizationName || event.OrganizerName}</span>
        </div>
      </div>
    </Card>
  );
};

export default EventCard;
