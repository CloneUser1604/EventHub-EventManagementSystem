import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Menu, Avatar, Dropdown, Badge, Button, Drawer,
  Space, Typography, Popover, List, Tag, Empty, Modal
} from 'antd';
import {
  HomeOutlined, CalendarOutlined, BellOutlined, UserOutlined,
  LogoutOutlined, SettingOutlined, MenuOutlined, PlusOutlined,
  DashboardOutlined, CheckCircleOutlined, TeamOutlined,
  SearchOutlined, CloseOutlined
} from '@ant-design/icons';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import { message } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const roleNav = {
  Participant: [
    { key: '/', icon: <HomeOutlined />, label: 'Trang chủ' },
    { key: '/events', icon: <SearchOutlined />, label: 'Sự kiện' },
    { key: '/my-calendar', icon: <CalendarOutlined />, label: 'Lịch của tôi' },
  ],
  Organizer: [
    { key: '/', icon: <HomeOutlined />, label: 'Trang chủ' },
    { key: '/events', icon: <SearchOutlined />, label: 'Sự kiện' },
    { key: '/organizer/events', icon: <CalendarOutlined />, label: 'Sự kiện của tôi' },
    { key: '/organizer/events/create', icon: <PlusOutlined />, label: 'Tạo sự kiện' },
  ],
  Admin: [
    { key: '/admin', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/admin/organizers', icon: <TeamOutlined />, label: 'Ban tổ chức' },
    { key: '/admin/events', icon: <CheckCircleOutlined />, label: 'Duyệt sự kiện' },
    { key: '/events', icon: <SearchOutlined />, label: 'Tất cả sự kiện' },
  ],
  Staff: [
    { key: '/', icon: <HomeOutlined />, label: 'Trang chủ' },
    { key: '/staff/checkin', icon: <CheckCircleOutlined />, label: 'Check-in' },
  ],
  Speaker: [
    { key: '/', icon: <HomeOutlined />, label: 'Trang chủ' },
    { key: '/my-calendar', icon: <CalendarOutlined />, label: 'Sự kiện của tôi' },
  ],
};

const publicNav = [
  { key: '/', icon: <HomeOutlined />, label: 'Trang chủ' },
  { key: '/events', icon: <SearchOutlined />, label: 'Sự kiện' },
];

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications, markRead } = useNotificationStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [staffModal, setStaffModal] = useState({ open: false, notification: null });
  const [speakerModal, setSpeakerModal] = useState({ open: false, notification: null });

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
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Text strong style={{ display: 'block' }}>{user?.fullName}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>
      </div>
      <Menu style={{ border: 'none' }} items={[
        { key: 'profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân', onClick: () => navigate('/profile') },
        { key: 'settings', icon: <SettingOutlined />, label: 'Cài đặt', onClick: () => navigate('/settings') },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true, onClick: handleLogout },
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
    <div style={{ width: 360 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>Thông báo</Text>
        {unreadCount > 0 && <Button type="link" size="small" onClick={() => notifications.forEach(n => !n.IsRead && markRead(n.NotificationID))}>Đọc tất cả</Button>}
      </div>
      {notifications.length === 0
        ? <Empty description="Không có thông báo" style={{ padding: 24 }} />
        : <List
            dataSource={notifications.slice(0, 8)}
            renderItem={n => (
              <List.Item
                onClick={() => handleNotificationClick(n)}
                style={{ padding: '10px 16px', cursor: 'pointer', background: n.IsRead ? 'white' : '#f0f5ff', borderBottom: '1px solid #f5f5f5' }}
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
          <span style={{ color: 'white', fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: 20, letterSpacing: -0.5 }}>EMS</span>
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
                  <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                    {userMenu}
                  </div>
                )}
                trigger={['click']} placement="bottomRight">
                <Space style={{ cursor: 'pointer', padding: '0 8px', borderRadius: 8, transition: 'all 0.3s' }} className="hover-bg">
                  <Avatar
                    src={user?.avatarURL}
                    style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', cursor: 'pointer', fontFamily: 'Sora' }}
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
      <Drawer title={<span style={{ fontFamily: 'Sora', fontWeight: 800 }}>🎓 EMS</span>} open={mobileOpen} onClose={() => setMobileOpen(false)} placement="left" width={260}>
        <Menu mode="vertical" selectedKeys={[activeKey]} items={navItems.map(n => ({ ...n, onClick: () => { navigate(n.key); setMobileOpen(false); } }))} style={{ border: 'none' }} />
      </Drawer>

      {/* ── Content ─────────────────────────────────────── */}
      <Content>{children}</Content>

      {/* ── Footer ──────────────────────────────────────── */}
      <Footer style={{ background: '#0f1629', color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '20px 24px' }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          © {new Date().getFullYear()} EMS — Event Management System · Powered by Anthropic Claude
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
