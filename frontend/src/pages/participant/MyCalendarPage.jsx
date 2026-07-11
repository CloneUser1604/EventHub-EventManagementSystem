import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tabs, Card, Tag, Button, Empty, Spin, Modal, QRCode,
  Typography, Badge, Tooltip, message
} from 'antd';
import {
  CalendarOutlined, EnvironmentOutlined, QrcodeOutlined,
  CloseCircleOutlined, ClockCircleOutlined, CheckCircleOutlined,
  RightOutlined
} from '@ant-design/icons';
import MainLayout from '../../components/layout/MainLayout';
import { registrationService } from '../../services/registration.service';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import { getImageUrl } from '../../utils/imageHelpers';
import { useTranslation } from '../../hooks/useTranslation';
dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text } = Typography;

/* ── Countdown component ────────────────────────────────────── */
const Countdown = ({ targetDate, size = 'normal', t }) => {
  const [timeLeft, setTimeLeft] = useState({ expired: false, text: '' });

  useEffect(() => {
    const tick = () => {
      const diff = dayjs(targetDate).diff(dayjs());
      if (diff <= 0) { setTimeLeft({ expired: true, text: t ? t('calendar.ongoing') : 'Đang diễn ra' }); return; }
      const d = dayjs.duration(diff);
      const days = Math.floor(d.asDays());
      const inDaysStr = t ? t('calendar.inDays') : 'Còn';
      const daysStr = t ? t('calendar.days') : 'ngày';
      if (days > 1) setTimeLeft({ expired: false, text: `${inDaysStr} ${days} ${daysStr}` });
      else setTimeLeft({ expired: false, text: `${d.hours()}g ${d.minutes()}p ${d.seconds()}s` });
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [targetDate, t]);

  return (
    <span style={{
      fontFamily: "'Inter', sans-serif",
      fontWeight: 700,
      fontSize: size === 'small' ? 12 : 14,
      color: timeLeft.expired ? '#10b981' : '#f59e0b',
    }}>
      {timeLeft.text || '...'}
    </span>
  );
};

/* ── QR Ticket Modal ────────────────────────────────────────── */
const TicketModal = ({ registration, onClose }) => {
  if (!registration) return null;
  return (
    <Modal open={!!registration} onCancel={onClose} footer={null} width={400} centered
      title={<span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>🎟️ Vé sự kiện</span>}>
      <div style={{ textAlign: 'center' }}>
        {/* Event info header */}
        <div style={{ background: 'linear-gradient(135deg,#0f1629,#1a2744)', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, display: 'block' }}>Sự kiện</Text>
          <Text strong style={{ color: 'white', fontSize: 16, display: 'block', marginBottom: 12 }}>{registration.Title}</Text>
        </div>

        {/* OTP */}
        <div style={{ background: '#fef3c7', border: '2px dashed #f59e0b', borderRadius: 12, padding: '16px 24px', marginBottom: 16 }}>
          <Text style={{ color: '#92400e', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
            🔑 MÃ OTP CHECK-IN
          </Text>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 40, fontWeight: 800, letterSpacing: 10, color: '#1a2744' }}>
            {registration.OTPCode}
          </div>
          <Text style={{ color: '#92400e', fontSize: 11 }}>Giữ mã bí mật — chỉ cung cấp cho Staff khi check-in</Text>
        </div>

        {/* Details */}
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', textAlign: 'left' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <CalendarOutlined style={{ color: '#2563eb', marginTop: 2 }} />
            <div>
              <Text strong style={{ fontSize: 13 }}>{dayjs(registration.StartDate).format('dddd, DD/MM/YYYY')}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(registration.StartDate).format('HH:mm')} – {dayjs(registration.EndDate).format('HH:mm')}</Text>
            </div>
          </div>
          {registration.VenueName && (
            <div style={{ display: 'flex', gap: 8 }}>
              <EnvironmentOutlined style={{ color: '#7c3aed', marginTop: 2 }} />
              <div>
                <Text style={{ fontSize: 13 }}>{registration.VenueName}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>{registration.VenueAddress}</Text>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

/* ── Event Registration Card ───────────────────────────────── */
const RegistrationCard = ({ reg, onViewTicket, onCancel }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isPast = dayjs(reg.EndDate).isBefore(dayjs());
  const isOngoing = dayjs(reg.StartDate).isBefore(dayjs()) && !isPast;
  const isCancelled = reg.Status === 'Cancelled' || reg.EventStatus === 'Cancelled';
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Card
      style={{ borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', opacity: isCancelled ? 0.65 : 1 }}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 0 }}>
        {/* Color bar */}
        <div style={{
          width: isMobile ? '100%' : 6, 
          height: isMobile ? 6 : 'auto', 
          flexShrink: 0,
          background: isCancelled ? '#e5e7eb'
            : isOngoing ? 'linear-gradient(180deg,#10b981,#059669)'
            : isPast ? '#9ca3af'
            : 'linear-gradient(180deg,#2563eb,#4f46e5)',
        }} />

        {/* Cover */}
        <div style={{ width: isMobile ? '100%' : 120, height: isMobile ? 120 : 'auto', minHeight: isMobile ? 120 : 100, background: '#1a2744', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
          {reg.CoverImageURL
            ? <img src={getImageUrl(reg.CoverImageURL)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: isMobile ? 120 : 100 }} />
            : <div style={{ width: '100%', height: '100%', minHeight: isMobile ? 120 : 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🎓</div>}
          {isOngoing && (
            <div style={{ position: 'absolute', top: 6, left: 6, background: '#10b981', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>
              LIVE
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text strong style={{ fontSize: 15, fontFamily: "'Inter', sans-serif", lineHeight: 1.3 }}>{reg.Title}</Text>
                {reg.isStaffForThisEvent && <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>Staff</Tag>}
                {reg.isSpeakerForThisEvent && <Tag color="purple" style={{ borderRadius: 6, fontWeight: 600 }}>Speaker</Tag>}
              </div>
              {reg.AttendanceStatus && (
                <Tag color={reg.AttendanceStatus === 'Present' ? 'green' : reg.AttendanceStatus === 'Late' ? 'orange' : 'red'} style={{ borderRadius: 6, flexShrink: 0 }}>
                  {reg.AttendanceStatus === 'Present' ? '✅ Đã tham dự' : reg.AttendanceStatus === 'Late' ? '⏰ Đến muộn' : '❌ Vắng'}
                </Tag>
              )}
            </div>

            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13 }}>
                <CalendarOutlined style={{ color: '#2563eb', fontSize: 12 }} />
                <span>{dayjs(reg.StartDate).format('DD/MM/YYYY · HH:mm')}</span>
              </div>
              {reg.VenueName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13 }}>
                  <EnvironmentOutlined style={{ color: '#7c3aed', fontSize: 12 }} />
                  <span>{reg.VenueName}</span>
                </div>
              )}
              {!isPast && !isCancelled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <ClockCircleOutlined style={{ color: '#f59e0b', fontSize: 12 }} />
                  <Countdown targetDate={reg.StartDate} size="small" t={t} />
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="small" onClick={() => navigate(`/events/${reg.EventID}`)} style={{ borderRadius: 7, fontSize: 13 }}>
              {t('calendar.detail')} <RightOutlined />
            </Button>
            {reg.Status === 'Registered' && !isPast && !isCancelled && (
              reg.isSpeakerForThisEvent ? null :
              reg.isStaffForThisEvent ? (
                <Button size="small" type="primary" onClick={() => navigate(`/events/${reg.EventID}`)}
                  style={{ borderRadius: 7, fontSize: 13 }}>
                  {t('calendar.scanQr')}
                </Button>
              ) : reg.OTPCode ? (
                <Button size="small" type="primary" onClick={() => onViewTicket(reg)}
                  style={{ borderRadius: 7, fontSize: 13 }}>
                  {t('calendar.viewOtp')}
                </Button>
              ) : null
            )}
            {reg.Status === 'Registered' && !isPast && !isCancelled && !reg.isStaffForThisEvent && !reg.isSpeakerForThisEvent && (
              <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => onCancel(reg, t)}
                style={{ borderRadius: 7, fontSize: 13 }}>
                {t('calendar.cancel')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

/* ── Main Page ──────────────────────────────────────────────── */
const MyCalendarPage = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketReg, setTicketReg] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const { t } = useTranslation();
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await registrationService.getMyRegistrations();
      setRegistrations(res.data.data);
    } catch { message.error('Tải dữ liệu thất bại'); }
    finally { setLoading(false); }
  };

  const handleCancel = (reg, tFunction) => {
    Modal.confirm({
      title: tFunction('calendar.confirmCancelTitle'),
      content: `${tFunction('calendar.confirmCancelBody')} "${reg.Title}"?`,
      okText: tFunction('calendar.yesCancel'), okButtonProps: { danger: true }, cancelText: tFunction('calendar.no'),
      onOk: async () => {
        try {
          await registrationService.cancel(reg.RegistrationID);
          message.success('Đã huỷ đăng ký');
          fetchAll();
        } catch (err) { message.error(err.response?.data?.message || 'Huỷ thất bại'); }
      },
    });
  };

  const now = dayjs();
  const upcoming = registrations.filter(r => r.Status === 'Registered' && dayjs(r.StartDate).isAfter(now));
  const ongoing = registrations.filter(r => r.Status === 'Registered' && !dayjs(r.StartDate).isAfter(now) && dayjs(r.EndDate).isAfter(now));
  const past = registrations.filter(r => r.Status === 'Registered' && !dayjs(r.EndDate).isAfter(now));
  const cancelledByUser = registrations.filter(r => r.Status === 'Cancelled' && r.EventStatus !== 'Cancelled');
  const cancelledEvent = registrations.filter(r => r.EventStatus === 'Cancelled');

  const renderList = (list, emptyText) => (
    loading ? <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
    : list.length === 0
    ? <Empty description={emptyText} style={{ padding: '48px 0' }} />
    : <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {list.map(r => (
          <RegistrationCard key={r.RegistrationID} reg={r} onViewTicket={setTicketReg} onCancel={handleCancel} />
        ))}
      </div>
  );

  /* ── Month-view mini calendar widget ── */
  const calendarDays = (() => {
    const start = currentMonth.startOf('month');
    const daysInMonth = currentMonth.daysInMonth();
    const startDow = start.day(); // 0=Sun
    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  })();

  const eventDays = new Set(
    upcoming
      .filter(r => dayjs(r.StartDate).month() === currentMonth.month() && dayjs(r.StartDate).year() === currentMonth.year())
      .map(r => dayjs(r.StartDate).date())
  );

  return (
    <MainLayout>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0f1629,#1a2744)', padding: isMobile ? '24px 16px 20px' : '40px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Title level={isMobile ? 3 : 2} style={{ color: 'white', fontFamily: "'Inter', sans-serif", margin: '0 0 6px' }}>
            📅 {t('calendar.title')}
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>
            {upcoming.length} {t('calendar.upcoming').toLowerCase()} · {ongoing.length} {t('calendar.ongoing').toLowerCase()} · {past.length} {t('calendar.attended').toLowerCase()}
          </Text>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px 12px 60px' : '32px 24px 80px', width: '100%', overflowX: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: isMobile ? 24 : 28, alignItems: 'start', width: '100%' }}>

          {/* Left: List */}
          <div style={{ minWidth: 0, width: '100%' }}>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'upcoming',
                  label: <Badge count={upcoming.length} size="small" offset={[6, -2]}><span style={{ paddingRight: 8 }}>{t('calendar.upcoming')}</span></Badge>,
                  children: renderList(upcoming.sort((a, b) => dayjs(a.StartDate).diff(dayjs(b.StartDate))), t('calendar.emptyUpcoming')),
                },
                {
                  key: 'ongoing',
                  label: <Badge count={ongoing.length} size="small" offset={[6, -2]}><span style={{ paddingRight: 8 }}>{t('calendar.ongoing')}</span></Badge>,
                  children: renderList(ongoing.sort((a, b) => dayjs(a.StartDate).diff(dayjs(b.StartDate))), t('calendar.emptyOngoing')),
                },
                {
                  key: 'past',
                  label: `${t('calendar.past')} (${past.length})`,
                  children: renderList(past.sort((a, b) => dayjs(b.StartDate).diff(dayjs(a.StartDate))), t('calendar.emptyPast')),
                },
                {
                  key: 'cancelled_by_user',
                  label: `${t('calendar.cancelled')} (${cancelledByUser.length})`,
                  children: renderList(cancelledByUser, t('calendar.emptyCancelled')),
                },
                {
                  key: 'cancelled_event',
                  label: `${t('calendar.eventCancelled')} (${cancelledEvent.length})`,
                  children: renderList(cancelledEvent, t('calendar.emptyEventCancelled')),
                },
              ]}
            />
          </div>

            {/* Right: Mini calendar + next event */}
            <div style={{ position: 'sticky', top: isMobile ? 0 : 80, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Mini calendar */}
              <Card style={{ borderRadius: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Button type="text" size="small" onClick={() => setCurrentMonth(m => m.subtract(1, 'month'))}>&lt;</Button>
                  <Text strong style={{ fontFamily: "'Inter', sans-serif", fontSize: 15 }}>
                    {currentMonth.format('MM/YYYY')}
                  </Text>
                  <Button type="text" size="small" onClick={() => setCurrentMonth(m => m.add(1, 'month'))}>&gt;</Button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, textAlign: 'center' }}>
                  {['CN','T2','T3','T4','T5','T6','T7'].map(d => (
                    <div key={d} style={{ fontSize: 11, color: '#9ca3af', padding: '4px 0', fontWeight: 600 }}>{d}</div>
                  ))}
                  {calendarDays.map((day, i) => {
                    const isToday = day === now.date() && currentMonth.month() === now.month() && currentMonth.year() === now.year();
                    const hasEvent = day && eventDays.has(day);
                    return (
                      <div key={i} style={{
                        padding: '5px 0', borderRadius: 6, fontSize: 12, fontWeight: hasEvent ? 700 : 400,
                        background: isToday ? 'linear-gradient(135deg,#2563eb,#4f46e5)' : hasEvent ? '#eff6ff' : 'transparent',
                        color: isToday ? 'white' : hasEvent ? '#2563eb' : day ? '#374151' : 'transparent',
                        position: 'relative',
                      }}>
                        {day || ''}
                        {hasEvent && !isToday && (
                          <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: '#2563eb' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Next event */}
              {upcoming.length > 0 && (() => {
                const next = upcoming.sort((a, b) => dayjs(a.StartDate).diff(dayjs(b.StartDate)))[0];
                return (
                  <Card style={{ borderRadius: 14, background: 'linear-gradient(135deg,#0f1629,#1a2744)', border: 'none' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Sự kiện tiếp theo</Text>
                    <Text strong style={{ color: 'white', fontSize: 14, display: 'block', marginBottom: 8 }}>{next.Title}</Text>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
                      {dayjs(next.StartDate).format('DD/MM · HH:mm')}
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Đếm ngược</Text>
                      <div style={{ marginTop: 2 }}><Countdown targetDate={next.StartDate} /></div>
                    </div>
                    {next.OTPCode && (
                      <Button type="primary" block size="small" onClick={() => setTicketReg(next)}
                        style={{ marginTop: 12, borderRadius: 8, fontWeight: 600 }}>
                        Xem Mã OTP
                      </Button>
                    )}
                  </Card>
                );
              })()}
            </div>
          </div>
      </div>

      <TicketModal registration={ticketReg} onClose={() => setTicketReg(null)} />
    </MainLayout>
  );
};

export default MyCalendarPage;
