import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Menu, Avatar, Dropdown, Badge, Button, Drawer,
  Space, Typography, Popover, List, Empty, Modal, message
} from 'antd';
import {
  HomeOutlined, CalendarOutlined, BellOutlined, UserOutlined,
  LogoutOutlined, SettingOutlined, MenuOutlined, PlusOutlined,
  DashboardOutlined, CheckCircleOutlined, TeamOutlined,
  SearchOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import useAuthStore from "../../store/authStore";
import useNotificationStore from "../../store/notificationStore";
import useSettingStore from "../../store/settingStore";
import { useTranslation } from "../../hooks/useTranslation";
// ĐÃ THÊM: Import công cụ xử lý ảnh
import { getImageUrl } from '../../utils/imageHelpers';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

// Public Navigation (Khách)
const getPublicNav = (t) => [
  { key: '/', icon: <HomeOutlined />, label: t('nav.home') },
  { key: '/events', icon: <CalendarOutlined />, label: t('nav.events') },
];

// Role-based Navigation
const getRoleNav = (t) => ({
  Participant: [
    { key: '/', icon: <HomeOutlined />, label: t('nav.home') },
    { key: '/events', icon: <SearchOutlined />, label: t('nav.events') },
    { key: '/my-calendar', icon: <CalendarOutlined />, label: t('nav.myCalendar') },
  ],
  Organizer: [
    { key: '/', icon: <HomeOutlined />, label: t('nav.home') },
    { key: '/events', icon: <SearchOutlined />, label: t('nav.events') },
    { key: '/organizer/events', icon: <CalendarOutlined />, label: t('nav.myEvents') },
    { key: '/organizer/events/create', icon: <PlusOutlined />, label: t('nav.createEvent') },
    { key: '/blogs', icon: <TeamOutlined />, label: t('nav.blog') },
  ],
  Admin: [
    { key: '/admin', icon: <DashboardOutlined />, label: t('nav.dashboard') },
    { key: '/admin/organizers', icon: <TeamOutlined />, label: t('nav.organizers') },
    { key: '/admin/events', icon: <CheckCircleOutlined />, label: t('nav.approveEvents') },
    { key: '/events', icon: <SearchOutlined />, label: t('nav.events') },
  ],
  Staff: [
    { key: '/', icon: <HomeOutlined />, label: t('nav.home') },
    { key: '/events', icon: <SearchOutlined />, label: t('nav.events') },
    { key: '/my-calendar', icon: <CalendarOutlined />, label: t('nav.myCalendar') },
  ],
  Speaker: [
    { key: '/', icon: <HomeOutlined />, label: t('nav.home') },
    { key: '/my-calendar', icon: <CalendarOutlined />, label: t('nav.myCalendar') },
  ],
});

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications, markRead } = useNotificationStore();
  const { theme } = useSettingStore();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [staffModal, setStaffModal] = useState({ open: false, notification: null });
  const [speakerModal, setSpeakerModal] = useState({ open: false, notification: null });

  const publicNav = getPublicNav(t);
  const roleNav = getRoleNav(t);
  const navItems = isAuthenticated ? (roleNav[user?.role] || publicNav) : publicNav;
  const activeKey = navItems.reduce((longest, current) => {
    if (location.pathname.startsWith(current.key) && current.key !== '/') {
      return (!longest || current.key.length > longest.length) ? current.key : longest;
    }
    return longest;
  }, undefined) || (location.pathname === '/' ? '/' : undefined);

  useEffect(() => {
    if (isAuthenticated) fetchNotifications();
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [isAuthenticated]);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const userMenu = (
    <div style={{ width: 200 }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#f0f0f0'}` }}>
        <Text strong style={{ display: 'block' }}>{user?.fullName}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>
      </div>
      <Menu style={{ border: 'none', boxShadow: 'none', background: 'transparent' }} items={[
        { key: 'profile', icon: <UserOutlined />, label: t('nav.profile'), onClick: () => navigate('/profile') },
        { key: 'edit', icon: <SettingOutlined />, label: t('nav.settings'), onClick: () => navigate('/settings') },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: t('nav.logout'), danger: true, onClick: handleLogout },
      ]} />
    </div>
  );

  const respondStaffInvite = async (eventId, action, notifId) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/staff/events/${eventId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        message.success(data.message);
        markRead(notifId);
        fetchNotifications();
      } else {
        message.error(data.message);
      }
      setStaffModal({ open: false, notification: null });
    } catch (e) {
      message.error('Lỗi xử lý phản hồi');
    }
  };

  const respondSpeakerInvite = async (eventId, action, notifId) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/speaker/invitations/${eventId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        message.success(data.message);
        markRead(notifId);
        fetchNotifications();
      } else {
        message.error(data.message);
      }
      setSpeakerModal({ open: false, notification: null });
    } catch (e) {
      message.error('Lỗi xử lý phản hồi');
    }
  };

  const handleNotificationClick = (n) => {
    markRead(n.NotificationID);
    if (n.RelatedType === 'StaffInvite' || n.Type === 'StaffInvite') {
      setStaffModal({ open: true, notification: n });
    } else if (n.Type === 'SpeakerInvitation') {
      setSpeakerModal({ open: true, notification: n });
    }
  };

  const notifContent = (
    <div style={{ width: 360, background: theme === 'dark' ? '#141414' : '#fff' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong style={{ color: theme === 'dark' ? '#fff' : '#000' }}>
          {t('nav.notifications')}
        </Text>
        {unreadCount > 0 && <Button type="link" size="small" onClick={() => notifications.forEach(n => !n.IsRead && markRead(n.NotificationID))}>
          {t('nav.markAllRead')}
        </Button>}
      </div>
      {notifications.length === 0
        ? <Empty description={t('nav.noNotif')} style={{ padding: 24 }} />
        : <List
            dataSource={notifications.slice(0, 8)}
            renderItem={n => (
              <List.Item
                onClick={() => handleNotificationClick(n)}
                style={{ padding: '10px 16px', cursor: 'pointer', background: n.IsRead ? 'transparent' : (theme === 'dark' ? '#1f1f1f' : '#f0f5ff'), borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#f5f5f5'}` }}
              >
                <List.Item.Meta
                  title={<Text style={{ fontSize: 13, fontWeight: n.IsRead ? 400 : 600 }}>{n.Title}</Text>}
                  description={
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>{n.Message?.substring(0, 80)}...</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(n.CreatedAt).fromNow()}</Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
      }
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <style>{`
        .desktop-nav { display: flex !important; }
        .mobile-menu-btn { display: none !important; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: inline-block !important; }
          .header-user-name { display: none !important; }
        }
        /* Custom horizontal menu styling to match the screenshot */
        .desktop-nav.ant-menu-dark {
          background: transparent !important;
        }
        .desktop-nav.ant-menu-dark .ant-menu-item {
          background-color: transparent !important;
          color: rgba(255, 255, 255, 0.75) !important;
          font-weight: 500;
          font-size: 15px;
          border-bottom: 2px solid transparent !important;
          transition: all 0.3s;
          padding: 0 16px !important;
        }
        .desktop-nav.ant-menu-dark .ant-menu-item:hover,
        .desktop-nav.ant-menu-dark .ant-menu-item-active {
          color: #2563eb !important;
        }
        .desktop-nav.ant-menu-dark .ant-menu-item-selected {
          color: #2563eb !important;
          border-bottom: 2px solid #2563eb !important;
          background-color: transparent !important;
        }
      `}</style>
      {/* ── Header ─────────────────────────────────────── */}
      <Header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: scrolled ? 'rgba(15,22,41,0.97)' : '#0f1629',
        backdropFilter: 'blur(12px)',
        boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.3)' : 'none',
        transition: 'all 0.3s ease',
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎓</div>
          <span style={{ color: 'white', fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: -0.5 }}>EMS</span>
        </Link>

        {/* Desktop Nav */}
        <Menu
          mode="horizontal"
          selectedKeys={[activeKey]}
          style={{ background: 'transparent', border: 'none', flex: 1, justifyContent: 'center', color: 'white' }}
          theme="dark"
          className="desktop-nav"
          items={navItems.map(n => ({ ...n, onClick: () => navigate(n.key) }))}
        />

        {/* Right Actions */}
        <Space size={8}>
          {isAuthenticated ? (
            <>
              <Popover content={notifContent} trigger="click" placement="bottomRight" arrow={false}
                overlayStyle={{ padding: 0, borderRadius: 12, overflow: 'hidden' }}>
                <Badge count={unreadCount} size="small">
                  <Button type="text" icon={<BellOutlined />} style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18 }} />
                </Badge>
              </Popover>
              <Dropdown
                popupRender={() => (
                  <div style={{ background: theme === 'dark' ? '#141414' : 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                    {userMenu}
                  </div>
                )}
                trigger={['click']} placement="bottomRight">
                <Space style={{ cursor: 'pointer', padding: '0 8px', borderRadius: 8, transition: 'all 0.3s' }} className="hover-bg">
                  {/* ĐÃ SỬA: Đưa getImageUrl vào bọc thuộc tính src của Avatar */}
                  <Avatar
                    src={getImageUrl(user?.avatarURL) || undefined}
                    style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
                    size={36}
                  >
                    {user?.fullName?.[0]?.toUpperCase()}
                  </Avatar>
                  <span className="header-user-name" style={{ fontWeight: 500, color: 'white' }}>
                      {user?.fullName} {user?.isCurrentStaff && <span style={{ color: '#10b981', fontWeight: 600 }}>(Staff)</span>}
                  </span>
                </Space>
              </Dropdown>
            </>
          ) : (
            <Space>
              <Button type="text" onClick={() => navigate('/login')} style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>Đăng nhập</Button>
              <Button type="primary" onClick={() => navigate('/register')} style={{ borderRadius: 8, fontWeight: 600 }}>Đăng ký</Button>
            </Space>
          )}
          <Button type="text" icon={<MenuOutlined />} style={{ color: 'white', display: 'none' }} className="mobile-menu-btn" onClick={() => setMobileOpen(true)} />
        </Space>
      </Header>

      {/* Mobile Drawer */}
      <Drawer title={<span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800 }}>🎓 EMS</span>} open={mobileOpen} onClose={() => setMobileOpen(false)} placement="left" width={260}>
        <Menu mode="vertical" selectedKeys={[activeKey]} items={navItems.map(n => ({ ...n, onClick: () => { navigate(n.key); setMobileOpen(false); } }))} style={{ border: 'none' }} />
      </Drawer>

      {/* ── Content ─────────────────────────────────────── */}
      <Content>{children}</Content>

      {/* ── Footer ──────────────────────────────────────── */}
      <Footer style={{ background: '#0f1629', color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px 24px' }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          © {new Date().getFullYear()} EMS — Event Management System
        </Text>
      </Footer>

      <Modal
        title="Lời mời làm Staff"
        open={staffModal.open}
        onCancel={() => setStaffModal({ open: false, notification: null })}
        footer={null}
        centered
      >
        <div style={{ padding: '16px 0', textAlign: 'center' }}>
          <Text style={{ fontSize: 16 }}>{staffModal.notification?.Message}</Text>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button size="large" onClick={() => respondStaffInvite(staffModal.notification?.RelatedID, 'Declined', staffModal.notification?.NotificationID)}>
              Từ chối
            </Button>
            <Button type="primary" size="large" onClick={() => respondStaffInvite(staffModal.notification?.RelatedID, 'Accepted', staffModal.notification?.NotificationID)}>
              Đồng ý tham gia
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        title="Lời mời làm Diễn giả"
        open={speakerModal.open}
        onCancel={() => setSpeakerModal({ open: false, notification: null })}
        footer={null}
        centered
      >
        <div style={{ padding: '16px 0', textAlign: 'center' }}>
          <Text style={{ fontSize: 16 }}>{speakerModal.notification?.Message}</Text>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Button size="large" onClick={() => respondSpeakerInvite(speakerModal.notification?.RelatedID, 'Declined', speakerModal.notification?.NotificationID)}>
              Từ chối
            </Button>
            <Button type="primary" size="large" onClick={() => respondSpeakerInvite(speakerModal.notification?.RelatedID, 'Accepted', speakerModal.notification?.NotificationID)}>
              Đồng ý tham gia
            </Button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default MainLayout;