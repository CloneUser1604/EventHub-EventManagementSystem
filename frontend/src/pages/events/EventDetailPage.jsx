import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Tag, Avatar, Tabs, Timeline, Modal, message,
  Spin, Descriptions, QRCode, Typography, Space, Divider, Alert, Empty, Table
} from 'antd';
import {
  CalendarOutlined, EnvironmentOutlined, TeamOutlined,
  ClockCircleOutlined, CheckCircleOutlined, UserOutlined,
  ShareAltOutlined, HeartOutlined, HeartFilled, QrcodeOutlined, ArrowLeftOutlined
} from '@ant-design/icons';
import MainLayout from '../../components/layout/MainLayout';
import useEventStore from '../../store/eventStore';
import useAuthStore from '../../store/authStore';
import { registrationService } from '../../services/registration.service';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { getImageUrl } from '../../utils/imageHelpers';
import FeedbackSection from '../../components/events/FeedbackSection';
dayjs.extend(duration);

const { Title, Text, Paragraph } = Typography;

// ─── Countdown Timer ──────────────────────────────────────────
const Countdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const diff = dayjs(targetDate).diff(dayjs());
      if (diff <= 0) { setTimeLeft('Đã bắt đầu'); return; }
      const d = dayjs.duration(diff);
      setTimeLeft(`${d.days()}d ${d.hours()}h ${d.minutes()}m ${d.seconds()}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  return <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: '#2563eb' }}>{timeLeft}</span>;
};

const EventDetailPage = ({ adminEventId, noLayout }) => {
  const { id } = useParams();
  const targetId = adminEventId || id;
  const navigate = useNavigate();
  const { selectedEvent: event, isLoading, fetchEventById } = useEventStore();
  const { user, isAuthenticated } = useAuthStore();
  const [registering, setRegistering] = useState(false);
  const [myRegistration, setMyRegistration] = useState(null);
  const [ticketModal, setTicketModal] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  const handleWriteReviewClick = () => {
    setActiveTab('feedback');
    setTimeout(() => {
      document.getElementById('event-tabs-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.dispatchEvent(new Event('openFeedbackModal'));
    }, 150);
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const favs = JSON.parse(localStorage.getItem('favoriteEvents') || '[]');
      setIsFav(favs.includes(String(targetId)));
    };
    handleStorageChange();
    window.addEventListener('favoritesUpdated', handleStorageChange);
    return () => window.removeEventListener('favoritesUpdated', handleStorageChange);
  }, [targetId]);

  const toggleFav = () => {
    let favs = JSON.parse(localStorage.getItem('favoriteEvents') || '[]');
    if (isFav) {
      favs = favs.filter(id => id !== String(targetId));
      message.success('Đã bỏ yêu thích sự kiện');
    } else {
      if (!favs.includes(String(targetId))) favs.push(String(targetId));
      message.success('Đã thêm vào sự kiện yêu thích');
    }
    localStorage.setItem('favoriteEvents', JSON.stringify(favs));
    setIsFav(!isFav);
    window.dispatchEvent(new Event('favoritesUpdated'));
  };

  useEffect(() => {
    fetchEventById(targetId);
    if (isAuthenticated && (user?.role === 'Participant' || user?.role === 'Speaker' || user?.role === 'Staff')) loadMyRegistration();
  }, [targetId, isAuthenticated, user]);

  useEffect(() => {
    if (event && (event.isStaff || user?.userId === event.OrganizerID)) {
      loadParticipants();
    }
  }, [event, user]);

  const loadParticipants = async () => {
    try {
      setLoadingParticipants(true);
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_BASE}/staff/events/${targetId}/participants`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await res.json();
      setParticipants(data.data || []);
    } catch {}
    finally { setLoadingParticipants(false); }
  };

  const loadMyRegistration = async () => {
    try {
      const res = await registrationService.getMyRegistrations();
      const reg = res.data.data.find(r => String(r.EventID) === String(targetId) && r.Status === 'Registered');
      setMyRegistration(reg || null);
    } catch {}
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      message.warning('Vui lòng đăng nhập để đăng ký sự kiện!');
      return navigate('/login', { state: { from: { pathname: `/events/${targetId}` } } });
    }
    if (user?.role !== 'Participant' && user?.role !== 'Speaker' && user?.role !== 'Staff') return message.warning('Chỉ người dùng cá nhân, diễn giả hoặc staff mới có thể đăng ký tham gia sự kiện');
    setRegistering(true);
    try {
      const res = await registrationService.register(parseInt(targetId));
      message.success(res.data.message);
      await loadMyRegistration();
      useEventStore.setState(state => ({
        selectedEvent: { ...state.selectedEvent, RegisteredCount: (state.selectedEvent.RegisteredCount || 0) + 1 }
      }));
    } catch (err) {
      message.error(err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancel = async () => {
    Modal.confirm({
      title: 'Huỷ đăng ký?',
      content: 'Bạn có chắc muốn huỷ đăng ký sự kiện này?',
      okText: 'Huỷ đăng ký', okButtonProps: { danger: true },
      cancelText: 'Không',
      onOk: async () => {
        try {
          await registrationService.cancel(myRegistration.RegistrationID);
          message.success('Đã huỷ đăng ký');
          setMyRegistration(null);
          useEventStore.setState(state => ({
            selectedEvent: { ...state.selectedEvent, RegisteredCount: Math.max(0, (state.selectedEvent.RegisteredCount || 0) - 1) }
          }));
        } catch (err) {
          message.error(err.response?.data?.message || 'Huỷ thất bại');
        }
      },
    });
  };

  if (isLoading || !event) return noLayout ? (
    <div style={{ textAlign: 'center', padding: '120px 24px' }}><Spin size="large" /></div>
  ) : (
    <MainLayout><div style={{ textAlign: 'center', padding: '120px 24px' }}><Spin size="large" /></div></MainLayout>
  );

  const isPast = dayjs(event.EndDate).isBefore(dayjs());
  const isFull = event.MaxParticipants && event.RegisteredCount >= event.MaxParticipants;
  const deadlinePassed = event.RegistrationDeadline && dayjs().isAfter(dayjs(event.RegistrationDeadline));
  const canRegister = isAuthenticated && (user?.role === 'Participant' || user?.role === 'Speaker') && !myRegistration && !isFull && !deadlinePassed && !isPast && event.Status === 'Published';

  const isUpcoming = dayjs(event.StartDate).isAfter(dayjs());
  
  const isPastedHTML = event?.Description && (event.Description.includes('&lt;div') || event.Description.includes('&lt;style') || event.Description.includes('&lt;!DOCTYPE') || event.Description.includes('&lt;section'));

  // ĐÃ THÊM: Biến kiểm tra điều kiện chặn Đăng ký
  const notFptStudent = isAuthenticated && event.IsInternalOnly && user?.university !== 'Đại học FPT';

  const unescapeHTML = (htmlStr) => {
    if (!htmlStr) return '';
    if (isPastedHTML) {
      // Strip all actual HTML tags injected by Quill (like <p>, <br>) and replace with space
      let text = htmlStr.replace(/<[^>]+>/g, ' ');
      return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
    }
    return htmlStr.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  };

  const content = (
    <div style={{ background: noLayout ? '#fff' : 'inherit' }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: 420, background: 'linear-gradient(135deg,#0f1629,#1a2744)', overflow: 'hidden' }}>
        {event.CoverImageURL && <img src={getImageUrl(event.CoverImageURL)} alt={event.Title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,22,41,0.95) 0%, rgba(15,22,41,0.5) 50%, transparent 100%)' }} />

        <div style={{ position: 'absolute', bottom: 32, left: 0, right: 0, maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          {!noLayout && (
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}
              style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 16, padding: 0 }}>Quay lại</Button>
          )}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {event.IsInternalOnly ? (
              <Tag color="purple" style={{ borderRadius: 6, fontWeight: 600 }}>Sinh viên trường</Tag>
            ) : (
              <Tag color="cyan" style={{ borderRadius: 6, fontWeight: 600 }}>Tất cả mọi người</Tag>
            )}
            {event.CategoryName && <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>{event.CategoryName}</Tag>}
            {isPast && <Tag color="default">Đã kết thúc</Tag>}
            {event.Status === 'Cancelled' && <Tag color="red">Đã huỷ</Tag>}
          </div>
          <Title level={1} style={{ color: 'white', fontFamily: "'Inter', sans-serif", margin: '0 0 12px', fontSize: 'clamp(22px,4vw,36px)', lineHeight: 1.2 }}>
            {event.Title}
          </Title>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
            <span><CalendarOutlined style={{ marginRight: 6 }} />{dayjs(event.StartDate).format('dddd, DD/MM/YYYY · HH:mm')}</span>
            <span><EnvironmentOutlined style={{ marginRight: 6 }} />{event.VenueName || 'Chưa cập nhật'}</span>
            <span><TeamOutlined style={{ marginRight: 6 }} />{event.RegisteredCount || 0} đã đăng ký{event.MaxParticipants ? ` / ${event.MaxParticipants}` : ''}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <style>{`
        .event-detail-grid {
          display: grid; grid-template-columns: 1fr 340px; gap: 32px; align-items: start;
        }
        @media (max-width: 992px) {
          .event-detail-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
        <div className="event-detail-grid">

          {/* Left: Main content */}
          <div style={{ minWidth: 0 }} id="event-tabs-container">
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
              {
                key: 'about',
                label: 'Giới thiệu',
                children: (
                  <div>

                    {event.Description ? (
                      <>
                        <style>{`
                          .custom-html-content * { max-width: 100% !important; box-sizing: border-box !important; }
                          .custom-html-content .container { width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
                          .custom-html-content .hero { height: auto !important; min-height: 300px; padding: 40px 20px !important; }
                          .custom-html-content img { height: auto !important; }
                          ${isPastedHTML ? '.custom-html-content { white-space: normal !important; }' : ''}
                        `}</style>
                        <div className={`ql-editor custom-html-content ${isPastedHTML ? 'is-html' : ''}`} style={{ padding: 0, fontSize: 15, lineHeight: 1.8, color: '#374151', maxWidth: '100%', overflowX: 'hidden' }} dangerouslySetInnerHTML={{ __html: unescapeHTML(event.Description) }} />
                      </>
                    ) : (
                      <Paragraph style={{ fontSize: 15, lineHeight: 1.8, color: '#374151', whiteSpace: 'pre-wrap' }}>
                        Chưa có mô tả cho sự kiện này.
                      </Paragraph>
                    )}
                  </div>
                ),
              },
              {
                key: 'agenda',
                label: `Chương trình (${event.sessions?.length || 0})`,
                children: event.sessions?.length > 0 ? (
                  <Timeline items={event.sessions.map(s => ({
                    color: 'blue',
                    children: (
                      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                          <Text strong style={{ fontFamily: "'Inter', sans-serif", fontSize: 15 }}>{s.Title}</Text>
                          <Tag color="blue" style={{ borderRadius: 6 }}>
                            {dayjs(s.StartTime).format('HH:mm')} – {dayjs(s.EndTime).format('HH:mm')}
                          </Tag>
                        </div>
                        {s.Description && <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4 }}>{s.Description}</Text>}
                        {s.Location && <Text type="secondary" style={{ fontSize: 12 }}><EnvironmentOutlined /> {s.Location}</Text>}
                        {s.Speakers && <div style={{ marginTop: 8 }}><Text style={{ fontSize: 12, color: '#6b7280' }}>🎤 {s.Speakers}</Text></div>}
                      </div>
                    ),
                  }))} />
                ) : <Empty description="Chưa có chương trình chi tiết" />,
              },
              {
                key: 'organizer',
                label: 'Ban tổ chức',
                children: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, background: '#f9fafb', borderRadius: 12 }}>
                    <Avatar size={64} style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', fontSize: 24 }}>
                      {event.OrganizerName?.[0]}
                    </Avatar>
                    <div>
                      <Text strong style={{ fontSize: 17, fontFamily: "'Inter', sans-serif", display: 'block' }}>{event.OrganizationName || event.OrganizerName}</Text>
                      <Text type="secondary">{event.OrganizerEmail}</Text>
                    </div>
                  </div>
                ),
              },
              ...(event.isStaff || user?.userId === event.OrganizerID ? [{
                key: 'participants',
                label: 'Quản lý Participant',
                children: (
                  <div style={{ padding: '16px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Text strong style={{ fontSize: 16 }}>Danh sách Người tham gia</Text>
                    </div>
                    <Table 
                      size="small"
                      loading={loadingParticipants}
                      dataSource={participants}
                      rowKey="RegistrationID"
                      pagination={{ pageSize: 10 }}
                      columns={[
                        { title: 'Tên', dataIndex: 'FullName', render: t => <Text strong>{t}</Text> },
                        { title: 'Email', dataIndex: 'Email' },
                        { title: 'Trạng thái', dataIndex: 'AttendanceStatus', render: s => (
                            s === 'Present' || s === 'Late' ? <Tag color="green">Đã tham gia</Tag> :
                            <Tag color="default">Chưa tham gia</Tag>
                        )}
                      ]}
                    />
                  </div>
                ),
              }] : []),
              {
                key: 'feedback',
                label: 'Đánh giá & Phản hồi',
                children: (
                  <div style={{ paddingTop: 8 }}>
                    <FeedbackSection eventId={targetId} />
                  </div>
                ),
              }
            ]} />
          </div>

          {/* Right: Sticky registration panel */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #e5e7eb', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
              <div style={{ marginBottom: 20 }}>
                <Tag color={
                  event.Status !== 'Published' ? 'default' :
                  isPast ? 'default' :
                  deadlinePassed ? 'red' :
                  isFull ? 'orange' : 'green'
                } style={{ borderRadius: 6, fontWeight: 600, marginBottom: 12 }}>
                  {event.Status !== 'Published' ? event.Status :
                   isPast ? '⚫ Đã kết thúc' :
                   deadlinePassed ? '🔴 Hết hạn đăng ký' :
                   isFull ? '🟡 Đã đầy chỗ' : '🟢 Đang mở đăng ký'}
                </Tag>
                <div style={{ fontSize: 13, color: '#6b7280', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span><CalendarOutlined style={{ marginRight: 6 }} />{dayjs(event.StartDate).format('DD/MM/YYYY · HH:mm')}</span>
                  <span><EnvironmentOutlined style={{ marginRight: 6 }} />{event.VenueName || 'Chưa cập nhật'}</span>
                  {event.MaxParticipants && (
                    <span><TeamOutlined style={{ marginRight: 6 }} />
                      <span style={{ color: isFull ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                        {event.MaxParticipants - (event.RegisteredCount || 0)} chỗ còn lại
                      </span> / {event.MaxParticipants}
                    </span>
                  )}
                </div>
                {!isPast && event.Status !== 'Cancelled' && (
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 8, marginTop: 16, textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <Text style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Thời gian đếm ngược</Text>
                    <Countdown targetDate={event.StartDate} />
                  </div>
                )}
              </div>

              {/* Registered state */}
              {myRegistration ? (
                <div>
                  <Alert message="Bạn đã đăng ký thành công!" type="success" showIcon style={{ marginBottom: 12, borderRadius: 10 }} />
                  <Button type="primary" block size="large" icon={<QrcodeOutlined />} onClick={() => setTicketModal(true)}
                    style={{ borderRadius: 10, height: 46, fontWeight: 700, marginBottom: 10 }}>
                    {event.isStaff ? 'Quét QR Check-in' : 'Xem Mã OTP'}
                  </Button>
                  {!event.isStaff && !deadlinePassed && !isPast && (
                    <Button danger block size="large" onClick={handleCancel}
                      style={{ borderRadius: 10, height: 42, fontWeight: 600 }}>
                      Huỷ đăng ký
                    </Button>
                  )}
                  {isPast && (
                    <Button type="default" block size="large" onClick={handleWriteReviewClick}
                      style={{ borderRadius: 10, height: 42, fontWeight: 600, marginTop: 10, borderColor: '#2563eb', color: '#2563eb' }}>
                      📝 Viết đánh giá
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* ĐÃ THÊM: Hiện thông báo màu cam nếu bị chặn */}
                  {isPast ? <Alert message="Sự kiện đã kết thúc" type="info" showIcon style={{ borderRadius: 10, marginBottom: 12 }} />
                    : isFull ? <Alert message="Sự kiện đã đầy chỗ" type="warning" showIcon style={{ borderRadius: 10, marginBottom: 12 }} />
                    : deadlinePassed ? <Alert message="Đã hết hạn đăng ký" type="warning" showIcon style={{ borderRadius: 10, marginBottom: 12 }} />
                    : notFptStudent ? <Alert message="Sự kiện nội bộ chỉ dành cho sinh viên trường Đại học FPT" type="error" showIcon style={{ borderRadius: 10, marginBottom: 12 }} />
                    : null}
                  <Button
                    type="primary" block size="large" onClick={handleRegister}
                    loading={registering}
                    // ĐÃ SỬA: Thêm điều kiện khóa nút (disabled) nếu bị chặn do không phải SV FPT
                    disabled={isPast || isFull || deadlinePassed || event.Status !== 'Published' || notFptStudent}
                    style={{ borderRadius: 10, height: 50, fontWeight: 700, fontSize: 15, marginBottom: 10 }}
                  >
                    {registering ? 'Đang đăng ký...' : '🎟️ Đăng ký tham dự'}
                  </Button>
                </>
              )}

              <Divider style={{ margin: '16px 0' }} />
              <Space style={{ width: '100%', justifyContent: 'center' }}>
                <Button type="text" icon={<ShareAltOutlined />} onClick={() => { navigator.clipboard.writeText(window.location.href); message.success('Đã sao chép link!'); }}>Chia sẻ</Button>
                <Button type="text" onClick={toggleFav} icon={isFav ? <HeartFilled style={{ color: '#ef4444' }} /> : <HeartOutlined />}>
                  {isFav ? 'Đã yêu thích' : 'Yêu thích'}
                </Button>
              </Space>

              <Divider style={{ margin: '16px 0' }} />
              <Descriptions column={1} size="small" styles={{ label: { color: '#6b7280', fontSize: 13, width: 100 }, content: { fontWeight: 600, fontSize: 13, color: '#374151' } }}>
                <Descriptions.Item label="Bắt đầu">{dayjs(event.StartDate).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                <Descriptions.Item label="Kết thúc">{dayjs(event.EndDate).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                {event.RegistrationDeadline && <Descriptions.Item label="Hạn đăng ký">{dayjs(event.RegistrationDeadline).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>}
                <Descriptions.Item label="Ban tổ chức">{event.OrganizationName || event.OrganizerName}</Descriptions.Item>
                {event.VenueName && <Descriptions.Item label="Địa điểm">{event.VenueName}</Descriptions.Item>}
              </Descriptions>
            </div>
          </div>
        </div>
      </div>

      {/* QR Ticket Modal */}
      <Modal open={ticketModal} onCancel={() => setTicketModal(false)} footer={null} width={420} centered
        title={<span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>{event?.isStaff ? '🎟️ Quét để Check-in' : '🎟️ Vé của bạn'}</span>}>
        {myRegistration && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            {event?.isStaff ? (
              <div style={{ background: '#f9fafb', borderRadius: 12, padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>Đưa mã QR này cho người tham gia quét</Text>
                <QRCode value={`${window.location.origin}/events/${event.EventID}/checkin?staffId=${user?.userId}`} size={200} />
              </div>
            ) : (
              <div style={{ background: '#f9fafb', borderRadius: 12, padding: '16px 20px', textAlign: 'left' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Mã OTP của bạn</Text>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 36, fontWeight: 800, letterSpacing: 8, color: '#1a2744', marginTop: 4 }}>
                  {myRegistration.OTPCode}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>⚠️ Giữ mã này bí mật. Dùng để check-in tại sự kiện.</Text>
              </div>
            )}
            <div style={{ marginTop: 16, textAlign: 'left' }}>
              <Text strong style={{ display: 'block' }}>{event.Title}</Text>
              <Text type="secondary" style={{ fontSize: 13 }}><CalendarOutlined style={{ marginRight: 6 }} />{dayjs(event.StartDate).format('DD/MM/YYYY · HH:mm')}</Text>
              {event.VenueName && <><br /><Text type="secondary" style={{ fontSize: 13 }}><EnvironmentOutlined style={{ marginRight: 6 }} />{event.VenueName}</Text></>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );

  return noLayout ? content : <MainLayout>{content}</MainLayout>;
};

export default EventDetailPage;