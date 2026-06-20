import React from 'react';
import { Card, Tag, Avatar, Tooltip } from 'antd';
import { CalendarOutlined, EnvironmentOutlined, TeamOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const statusConfig = {
  Published:      { color: 'green',   label: 'Đang mở' },
  PendingApproval:{ color: 'orange',  label: 'Chờ duyệt' },
  Draft:          { color: 'default', label: 'Nháp' },
  Rejected:       { color: 'red',     label: 'Bị từ chối' },
  Cancelled:      { color: 'red',     label: 'Đã huỷ' },
  Completed:      { color: 'blue',    label: 'Đã kết thúc' },
};

const EventCard = ({ event, showStatus = false }) => {
  const navigate = useNavigate();
  const remaining = event.MaxParticipants ? event.MaxParticipants - (event.RegisteredCount || 0) : null;
  const isFull = remaining !== null && remaining <= 0;
  const isPast = dayjs(event.EndDate).isBefore(dayjs());
  const status = statusConfig[event.Status] || { color: 'default', label: event.Status };

  return (
    <Card
      className="card-hover"
      onClick={() => navigate(`/events/${event.EventID}`)}
      cover={
        <div style={{ position: 'relative', height: 180, overflow: 'hidden', background: 'linear-gradient(135deg,#1a2744,#0f1629)' }}>
          {event.CoverImageURL
            ? <img src={event.CoverImageURL} alt={event.Title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🎓</div>
          }
          {/* Overlays */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {event.IsInternalOnly && <Tag color="purple" style={{ margin: 0, borderRadius: 6, fontWeight: 600, fontSize: 11 }}>Nội bộ</Tag>}
            {event.CategoryName && <Tag color="blue" style={{ margin: 0, borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{event.CategoryName}</Tag>}
            {showStatus && <Tag color={status.color} style={{ margin: 0, borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{status.label}</Tag>}
          </div>
          {isFull && (
            <div style={{ position: 'absolute', top: 12, right: 12, background: '#ef4444', color: 'white', padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>HẾT CHỖ</div>
          )}
        </div>
      }
      bodyStyle={{ padding: '14px 16px' }}
      style={{ borderRadius: 14, overflow: 'hidden' }}
    >
      <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 8, lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {event.Title}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13 }}>
          <CalendarOutlined style={{ color: '#2563eb', flexShrink: 0 }} />
          <span>{dayjs(event.StartDate).format('DD/MM/YYYY · HH:mm')}</span>
        </div>
        {event.VenueName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13 }}>
            <EnvironmentOutlined style={{ color: '#7c3aed', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.VenueName}</span>
          </div>
        )}
        {remaining !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <TeamOutlined style={{ color: isFull ? '#ef4444' : '#10b981', flexShrink: 0 }} />
            <span style={{ color: isFull ? '#ef4444' : '#6b7280' }}>
              {isFull ? 'Đã đầy' : `Còn ${remaining} chỗ`}
            </span>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={22} style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', fontSize: 11 }}>
            {event.OrganizerName?.[0]}
          </Avatar>
          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{event.OrganizationName || event.OrganizerName}</span>
        </div>
        {isPast && <Tag color="default" style={{ margin: 0, fontSize: 11 }}>Đã kết thúc</Tag>}
      </div>
    </Card>
  );
};

export default EventCard;
