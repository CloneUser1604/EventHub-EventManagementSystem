import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout, Menu, Card, Statistic, Table, Tag, Button, Space,
  Modal, Input, App as AntdApp, Avatar, Typography, Spin, Badge, Tooltip, Dropdown, Row, Col, Tabs, Descriptions, Select, Form
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined,
  TeamOutlined, CalendarOutlined, UserOutlined, TrophyOutlined,
  ExclamationCircleOutlined, DownloadOutlined, AppstoreOutlined,
  MenuUnfoldOutlined, MenuFoldOutlined, LogoutOutlined, ArrowLeftOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import useAuthStore from '../../store/authStore';
import { adminService } from '../../services/admin.service';
import { eventService } from '../../services/event.service';
import { venueService } from '../../services/venue.service';
import EventDetailPage from '../events/EventDetailPage';
import dayjs from 'dayjs';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminDashboard = () => {
  const { message, modal } = AntdApp.useApp();
  const confirm = modal.confirm;
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeMenu, setActiveMenu] = useState('overview');
  const [selectedEventId, setSelectedEventId] = useState(null);
  
  const [stats, setStats] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [allOrganizers, setAllOrganizers] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [pendingSpeakers, setPendingSpeakers] = useState([]);
  const [allSpeakers, setAllSpeakers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allVenues, setAllVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [rejectModal, setRejectModal] = useState({ open: false, type: '', id: null, title: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [editReasonModal, setEditReasonModal] = useState({ open: false, data: null });
  const [viewOrgModal, setViewOrgModal] = useState({ open: false, org: null });

  // Event Approval with Staff Assignment
  const [approveEventModal, setApproveEventModal] = useState({ open: false, event: null });
  const [selectedStaffs, setSelectedStaffs] = useState([]);
  const [availableStaffs, setAvailableStaffs] = useState([]);

  // Staff CRUD Modal
  const [staffModal, setStaffModal] = useState({ open: false, data: null });
  const [staffForm] = Form.useForm();

  // Venue CRUD Modal
  const [venueModal, setVenueModal] = useState({ open: false, data: null });
  const [venueForm] = Form.useForm();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, orgsRes, allOrgsRes, eventsRes, speakersRes, allSpeakersRes, usersRes, allEventsRes, staffRes, venuesRes] = await Promise.all([
        eventService.getDashboardStats(),
        adminService.getPendingOrganizers(),
        adminService.getAllOrganizers(),
        eventService.getEvents({ approvalStatus: 'Pending', limit: 100 }),
        adminService.getPendingSpeakers(),
        adminService.getAllSpeakers(),
        adminService.getAllUsers && adminService.getAllUsers() || fetch(API_BASE + '/admin/users', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }).then(r => r.json()),
        eventService.getEvents({ limit: 200 }),
        fetch(API_BASE + '/staff/available', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }).then(r => r.json()),
        venueService.getAllVenues()
      ]);
      setStats(statsRes.data?.data?.stats || statsRes.data?.stats || {});
      setRecentEvents(statsRes.data?.data?.recentEvents || statsRes.data?.recentEvents || []);
      setPendingOrgs(orgsRes.data?.data || []);
      setAllOrganizers(allOrgsRes.data?.data || []);
      setPendingEvents(eventsRes.data?.data?.events || []);
      setAllEvents(allEventsRes.data?.data?.events || []);
      setPendingSpeakers(speakersRes.data?.data || []);
      setAllSpeakers(allSpeakersRes.data?.data || []);
      
      const usersData = usersRes.data?.data || usersRes.data || [];
      setAllUsers(usersData);
      setAvailableStaffs(staffRes.data || []);
      setAllVenues(venuesRes.data?.data || []);
    } catch (e) { 
      message.error('Tải dữ liệu thất bại'); 
    } finally { 
      setLoading(false); 
    }
  };

  /* ── Action Handlers ── */
  const handleOrgAction = async (profileId, action, reason = '') => {
    try {
      await adminService.reviewOrganizer(profileId, action, reason);
      message.success(action === 'approve' ? '✅ Đã phê duyệt ban tổ chức' : '❌ Đã từ chối');
      loadAll();
    } catch (err) { message.error(err.response?.data?.message || 'Thao tác thất bại'); }
  };

  const handleEventAction = async (eventId, action, reason = '') => {
    try {
      await eventService.reviewEvent(eventId, action, reason);
      message.success(action === 'approve' ? '✅ Đã duyệt & công bố sự kiện' : '❌ Đã từ chối sự kiện');
      loadAll();
    } catch (err) { message.error(err.response?.data?.message || 'Thao tác thất bại'); }
  };

  const handleApproveEventWithStaff = async () => {
    const { event } = approveEventModal;
    try {
      // 1. Duyệt sự kiện
      await eventService.reviewEvent(event.EventID, 'approve');
      
      // 2. Gán staff nếu có chọn
      if (selectedStaffs.length > 0) {
        const assignRes = await fetch(`${API_BASE}/staff/events/${event.EventID}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
          body: JSON.stringify({ staffIds: selectedStaffs })
        });
        const assignData = await assignRes.json();
        if (!assignData.success) {
          message.warning(`Duyệt sự kiện thành công nhưng lỗi gán Staff: ${assignData.message}`);
        } else {
          message.success('✅ Đã duyệt sự kiện và gán Staff thành công!');
        }
      } else {
        message.success('✅ Đã duyệt & công bố sự kiện (Chưa gán Staff)');
      }
      setApproveEventModal({ open: false, event: null });
      setSelectedStaffs([]);
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const handleSaveStaff = async (values) => {
    try {
      if (staffModal.data) {
        const res = await fetch(`${API_BASE}/staff/${staffModal.data.UserID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
          body: JSON.stringify(values)
        });
        const data = await res.json();
        if (!data.success) return message.error(data.message);
        message.success('Cập nhật Staff thành công');
      } else {
        const res = await fetch(`${API_BASE}/staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
          body: JSON.stringify(values)
        });
        const data = await res.json();
        if (!data.success) return message.error(data.message);
        message.success('Thêm Staff thành công');
      }
      setStaffModal({ open: false, data: null });
      staffForm.resetFields();
      loadAll();
    } catch (err) {
      message.error('Lỗi khi lưu Staff');
    }
  };

  const handleDeleteStaff = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/staff/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await res.json();
      if (!data.success) return message.error(data.message);
      message.success('Khoá Staff thành công');
      loadAll();
    } catch (err) {
      message.error('Lỗi khi khoá Staff');
    }
  };

  const openStaffModal = (data = null) => {
    if (data) {
      staffForm.setFieldsValue({ fullName: data.FullName, email: data.Email, phone: data.Phone, isActive: data.IsActive });
    } else {
      staffForm.resetFields();
    }
    setStaffModal({ open: true, data });
  };

  const handleVenueSubmit = async (values) => {
    try {
      if (venueModal.data) {
        const res = await venueService.updateVenue(venueModal.data.VenueID, values);
        if (!res.data.success) return message.error(res.data.message);
        message.success('Cập nhật địa điểm thành công');
      } else {
        const res = await venueService.createVenue(values);
        if (!res.data.success) return message.error(res.data.message);
        message.success('Thêm địa điểm thành công');
      }
      setVenueModal({ open: false, data: null });
      venueForm.resetFields();
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi lưu địa điểm');
    }
  };

  const handleDeleteVenue = async (id) => {
    try {
      await venueService.deleteVenue(id);
      message.success('Xóa địa điểm thành công');
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể xóa địa điểm vì đang được sử dụng');
    }
  };

  const openVenueModal = (data = null) => {
    if (data) {
      venueForm.setFieldsValue({ Name: data.Name, Address: data.Address });
    } else {
      venueForm.resetFields();
    }
    setVenueModal({ open: true, data });
  };

  const handleSpeakerAction = async (speakerId, action, reason = '') => {
    try {
      await adminService.reviewSpeaker(speakerId, action, reason);
      message.success(action === 'approve' ? '✅ Đã phê duyệt diễn giả' : '❌ Đã từ chối');
      loadAll();
    } catch (err) { message.error(err.response?.data?.message || 'Thao tác thất bại'); }
  };

  const openReject = (type, id, title) => {
    setRejectReason('');
    setRejectModal({ open: true, type, id, title });
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return message.warning('Vui lòng nhập lý do');
    const { type, id } = rejectModal;
    if (type === 'org') await handleOrgAction(id, 'reject', rejectReason);
    if (type === 'event') await handleEventAction(id, 'reject', rejectReason);
    if (type === 'cancel_event') await handleEventAction(id, 'cancel', rejectReason);
    if (type === 'speaker') await handleSpeakerAction(id, 'reject', rejectReason);
    setRejectModal({ open: false });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  /* ── Columns ── */
  const eventCols = [
    {
      title: 'Sự kiện', render: (_, r) => (
        <div>
          <Text strong style={{ display: 'block' }}>
            {r.Title} 
            {r.ProposedChanges && <Tag color="orange" style={{ marginLeft: 8, borderRadius: 6 }}>Sửa đổi</Tag>}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.OrganizerName} · Bắt đầu: {dayjs(r.StartDate).format('DD/MM/YYYY')}</Text>
        </div>
      ),
    },
    { title: 'Địa điểm', dataIndex: 'VenueName', render: v => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
    {
      title: 'Hành động', width: 260,
      render: (_, r) => {
        const isApprovedNoChanges = (r.ApprovalStatus === 'Approved' || r.Status === 'Published' || r.Status === 'Completed') && !r.ProposedChanges;
        return (
          <Space size={4}>
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => { setActiveMenu('event_detail'); setSelectedEventId(r.EventID); }}>Xem</Button>
            {isApprovedNoChanges ? (
              <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => openReject('cancel_event', r.EventID, r.Title)}>Khóa sự kiện</Button>
            ) : (
              <>
                {r.ProposedChanges && (
                  <Button type="primary" ghost style={{ color: '#60a5fa', borderColor: '#60a5fa' }} size="small" onClick={() => setEditReasonModal({ open: true, data: r })}>Thay đổi</Button>
                )}
                <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => {
                  setSelectedStaffs([]);
                  setApproveEventModal({ open: true, event: r });
                }}>Duyệt</Button>
                <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => openReject('event', r.EventID, r.Title)}>Từ chối</Button>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  const orgCols = [
    {
      title: 'Tổ chức', render: (_, r) => (
        <div>
          <Text strong style={{ display: 'block' }}>{r.OrganizationName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.FullName} · {r.Email}</Text>
        </div>
      ),
    },
    {
      title: 'Tài liệu', dataIndex: 'documents',
      render: (docs) => (
        <Space size={4} wrap>
          {(docs || []).map((f, i) => (
            <Button key={i} size="small" type="link" icon={<DownloadOutlined />} href={`${API_BASE.replace('/api', '')}/uploads/organizer-docs/${f}`} target="_blank">File {i + 1}</Button>
          ))}
          {(!docs || docs.length === 0) && <Text type="secondary" style={{ fontSize: 12 }}>Không có</Text>}
        </Space>
      ),
    },
    { title: 'Ngày đăng ký', dataIndex: 'CreatedAt', render: d => dayjs(d).format('DD/MM/YYYY') },
    {
      title: 'Trạng thái', dataIndex: 'ApprovalStatus', width: 130,
      render: s => {
        const cfg = { Approved: 'green', Rejected: 'red', Pending: 'orange' };
        const lbl = { Approved: '✅ Đã duyệt', Rejected: '❌ Từ chối', Pending: '⏳ Chờ duyệt' };
        return <Tag color={cfg[s] || 'default'} style={{ borderRadius: 6, fontWeight: 600 }}>{lbl[s] || s}</Tag>;
      },
    },
    {
      title: 'Hành động', width: 220,
      render: (_, r) => (
        <Space>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setViewOrgModal({ open: true, org: r })}>Hồ sơ</Button>
          {r.ApprovalStatus === 'Pending' ? (
            <>
              <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => confirm({ title: `Duyệt "${r.OrganizationName}"?`, onOk: () => handleOrgAction(r.OrganizerProfileID, 'approve') })}>Duyệt</Button>
              <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => openReject('org', r.OrganizerProfileID, r.OrganizationName)}>Từ chối</Button>
            </>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>{r.ApprovalStatus === 'Approved' ? '✅ Đã duyệt' : '❌ Đã từ chối'}</Text>
          )}
        </Space>
      ),
    },
  ];

  const speakerCols = [
    {
      title: 'Diễn giả', render: (_, r) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Avatar style={{ background: '#2563eb' }}>{r.FullName?.[0]}</Avatar>
          <div>
            <Text strong style={{ display: 'block' }}>{r.FullName}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.Email}</Text>
          </div>
        </div>
      ),
    },
    { title: 'Chuyên môn', dataIndex: 'Expertise', render: v => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
    { title: 'Ngày tạo', dataIndex: 'CreatedAt', render: d => dayjs(d).format('DD/MM/YYYY') },
    {
      title: 'Hành động', width: 220,
      render: (_, r) => {
        if (r.IsActive) {
          return <Tag color="green" style={{ fontWeight: 600, borderRadius: 6 }}>✅ Đã duyệt</Tag>;
        }
        return (
          <Space>
            <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => confirm({ title: `Duyệt diễn giả "${r.FullName}"?`, onOk: () => handleSpeakerAction(r.UserID, 'approve') })}>Duyệt</Button>
            <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => openReject('speaker', r.UserID, r.FullName)}>Từ chối</Button>
          </Space>
        );
      },
    },
  ];

  const userCols = [
    {
      title: 'Người dùng', render: (_, r) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Avatar style={{ background: r.Role === 'Admin' ? '#f59e0b' : r.Role === 'Organizer' ? '#10b981' : '#6366f1' }}>{r.FullName?.[0]}</Avatar>
          <div>
            <Text strong style={{ display: 'block' }}>{r.FullName}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.Email}</Text>
          </div>
        </div>
      ),
    },
    { 
      title: 'Vai trò', dataIndex: 'Role', 
      render: r => <Tag color={r === 'Admin' ? 'gold' : r === 'Organizer' ? 'green' : 'blue'}>{r}</Tag> 
    },
    { title: 'Ngày tham gia', dataIndex: 'CreatedAt', render: d => dayjs(d).format('DD/MM/YYYY') },
    {
      title: 'Trạng thái', dataIndex: 'IsActive',
      render: (active, record) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Đang hoạt động' : 'Bị khoá'}</Tag>
      ),
    },
    {
      title: 'Hành động', width: 120,
      render: (_, r) => (
        <Button 
          type={r.IsActive ? 'default' : 'primary'} 
          danger={r.IsActive} 
          size="small"
          onClick={async () => {
            if (r.Role === 'Admin') return message.warning('Không thể thao tác trên Admin');
            try {
              await adminService.updateUserStatus(r.UserID, !r.IsActive);
              message.success('Thao tác thành công');
              loadAll();
            } catch (err) { message.error('Thao tác thất bại'); }
          }}
        >
          {r.IsActive ? 'Khoá TK' : 'Mở khoá'}
        </Button>
      ),
    },
  ];

  const staffTableCols = [
    {
      title: 'Tình nguyện viên', render: (_, r) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Avatar style={{ background: '#7c3aed' }}>{r.FullName?.[0]}</Avatar>
          <div>
            <Text strong style={{ display: 'block' }}>{r.FullName}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.Email}</Text>
          </div>
        </div>
      ),
    },
    { title: 'SĐT', dataIndex: 'Phone', render: v => <Text>{v || '—'}</Text> },
    { title: 'Trạng thái', dataIndex: 'IsActive', render: active => <Tag color={active ? 'green' : 'red'}>{active ? 'Hoạt động' : 'Đã khoá'}</Tag> },
    {
      title: 'Hành động', width: 150,
      render: (_, r) => (
        <Space>
          <Button size="small" type="primary" ghost style={{ color: '#60a5fa', borderColor: '#60a5fa' }} onClick={() => openStaffModal(r)}>Sửa</Button>
          <Button size="small" danger onClick={() => confirm({ title: 'Khoá Staff này?', onOk: () => handleDeleteStaff(r.UserID) })}>Khoá</Button>
        </Space>
      )
    }
  ];

  const venueCols = [
    { title: 'Tên địa điểm', dataIndex: 'Name', render: t => <Text strong>{t}</Text> },
    { title: 'Địa chỉ', dataIndex: 'Address' },
    {
      title: 'Hành động', width: 150,
      render: (_, r) => (
        <Space>
          <Button size="small" type="primary" ghost style={{ color: '#60a5fa', borderColor: '#60a5fa' }} onClick={() => openVenueModal(r)}>Sửa</Button>
          <Button size="small" danger onClick={() => confirm({ title: `Xóa địa điểm "${r.Name}"?`, content: 'Hành động này không thể hoàn tác.', onOk: () => handleDeleteVenue(r.VenueID) })}>Xóa</Button>
        </Space>
      )
    }
  ];

  /* ── Sidebar Menu ── */
  const menuItems = [
    { key: 'overview', icon: <AppstoreOutlined />, label: 'Tổng quan' },
    { key: 'events', icon: <CalendarOutlined />, label: `Quản lý sự kiện`, 
      extra: pendingEvents.length > 0 ? <Badge count={pendingEvents.length} /> : null },
    { key: 'organizers', icon: <TeamOutlined />, label: `Ban tổ chức`, 
      extra: pendingOrgs.length > 0 ? <Badge count={pendingOrgs.length} /> : null },
    { key: 'speakers', icon: <UserOutlined />, label: `Diễn giả`, 
      extra: pendingSpeakers.length > 0 ? <Badge count={pendingSpeakers.length} /> : null },
    { key: 'staffs', icon: <TeamOutlined />, label: 'Tình nguyện viên' },
    { key: 'venues', icon: <EnvironmentOutlined />, label: 'Quản lý Địa điểm' },
    { key: 'users', icon: <UserOutlined />, label: 'Người dùng' },
  ];

  if (loading && !stats) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div>;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobile && !collapsed && (
        <div onClick={() => setCollapsed(true)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} />
      )}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth="0"
        onBreakpoint={(broken) => {
          setIsMobile(broken);
          setCollapsed(broken);
        }}
        theme="dark"
        style={{ overflow: 'auto', height: '100vh', position: isMobile ? 'fixed' : 'sticky', top: 0, left: 0, zIndex: 1000, background: '#0f172a', boxShadow: '2px 0 8px rgba(0,0,0,0.15)' }}
        width={260}
      >
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 20 }}>
            E
          </div>
          {!collapsed && <div style={{ color: 'white', fontSize: 20, fontWeight: 800, fontFamily: "'Inter', sans-serif", letterSpacing: 1 }}>EMS Admin</div>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[activeMenu]}
          onClick={({ key }) => setActiveMenu(key)}
          items={menuItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{item.label}</span>
                {!collapsed && item.extra}
              </div>
            )
          }))}
          style={{ background: 'transparent', borderRight: 0 }}
        />
      </Sider>
      
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} style={{ fontSize: '16px', width: 64, height: 64 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: handleLogout }] }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#2563eb' }}>{user?.FullName?.[0] || 'A'}</Avatar>
                <Text strong>{user?.FullName || 'Admin'}</Text>
              </div>
            </Dropdown>
          </div>
        </Header>
        
        <Content style={{ margin: '24px', background: '#fff', padding: activeMenu === 'event_detail' ? 0 : 24, borderRadius: 12, minHeight: 280, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {activeMenu === 'overview' && (
            <div>
              <Title level={4} style={{ fontFamily: "'Inter', sans-serif", marginBottom: 24 }}>Tổng quan hệ thống</Title>
              <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                {[
                  { title: 'Tổng sự kiện', value: stats?.TotalEvents, icon: <CalendarOutlined />, color: '#2563eb' },
                  { title: 'Sự kiện Đang diễn ra', value: stats?.PublishedEvents, icon: <CheckCircleOutlined />, color: '#10b981' },
                  { title: 'Ban tổ chức', value: stats?.TotalOrganizers, icon: <UserOutlined />, color: '#0ea5e9' },
                  { title: 'Người tham dự', value: stats?.TotalParticipants, icon: <TeamOutlined />, color: '#7c3aed' },
                  { title: 'Lượt đăng ký', value: stats?.TotalRegistrations, icon: <TrophyOutlined />, color: '#f59e0b' },
                ].map((s, i) => (
                  <Col key={i} xs={12} sm={8} lg={4}>
                    <Card style={{ borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "'Inter', sans-serif" }}>{s.value ?? 0}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{s.title}</div>
                        </div>
                        <div style={{ fontSize: 20, color: s.color, opacity: 0.3 }}>{s.icon}</div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>

              <Title level={5} style={{ fontFamily: "'Inter', sans-serif", marginBottom: 16 }}>Hoạt động sự kiện gần đây</Title>
              <Table
                dataSource={recentEvents} rowKey="EventID"
                pagination={{ pageSize: 5 }}
                scroll={{ x: 600 }}
                columns={[
                  { title: 'Sự kiện', dataIndex: 'Title', render: (t, r) => <><Text strong>{t}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{r.OrganizerName}</Text></> },
                  { title: 'Ngày', dataIndex: 'StartDate', width: 120, render: d => dayjs(d).format('DD/MM/YYYY') },
                  { title: 'Trạng thái', dataIndex: 'Status', width: 130,
                    render: s => {
                      const cfg = { Published: 'green', PendingApproval: 'orange', Draft: 'default', Rejected: 'red', Cancelled: 'red', Completed: 'blue' };
                      const label = { Published: 'Công bố', PendingApproval: 'Chờ duyệt', Draft: 'Nháp', Rejected: 'Từ chối', Cancelled: 'Đã huỷ', Completed: 'Kết thúc' };
                      return <Tag color={cfg[s] || 'default'}>{label[s] || s}</Tag>;
                    }
                  },
                ]}
              />
            </div>
          )}

          {activeMenu === 'events' && (
            <div>
              <Title level={4} style={{ fontFamily: "'Inter', sans-serif", marginBottom: 24 }}>Quản lý Sự kiện</Title>
              <Tabs defaultActiveKey="pending" items={[
                {
                  key: 'pending',
                  label: `Sự kiện chờ duyệt (${pendingEvents.filter(e => !e.ProposedChanges).length})`,
                  children: <Table columns={eventCols} dataSource={pendingEvents.filter(e => !e.ProposedChanges)} rowKey="EventID" pagination={{ pageSize: 10 }} scroll={{ x: 800 }} locale={{ emptyText: 'Không có sự kiện nào chờ duyệt' }} />
                },
                {
                  key: 'edit_requests',
                  label: `Yêu cầu chỉnh sửa (${allEvents.filter(e => e.ProposedChanges).length})`,
                  children: <Table columns={eventCols} dataSource={allEvents.filter(e => e.ProposedChanges)} rowKey="EventID" pagination={{ pageSize: 10 }} scroll={{ x: 800 }} locale={{ emptyText: 'Không có yêu cầu chỉnh sửa nào' }} />
                },
                {
                  key: 'approved',
                  label: 'Sự kiện đã duyệt/công bố',
                  children: <Table columns={eventCols} dataSource={allEvents.filter(e => (e.ApprovalStatus === 'Approved' || e.Status === 'Published' || e.Status === 'Completed') && !e.ProposedChanges)} rowKey="EventID" pagination={{ pageSize: 10 }} scroll={{ x: 800 }} locale={{ emptyText: 'Không có sự kiện nào' }} />
                }
              ]} />
            </div>
          )}

          {activeMenu === 'organizers' && (
            <div>
              <Title level={4} style={{ fontFamily: "'Inter', sans-serif", marginBottom: 24 }}>Quản lý Ban tổ chức</Title>
              <Table columns={orgCols} dataSource={allOrganizers} rowKey="OrganizerProfileID" pagination={{ pageSize: 10 }} scroll={{ x: 800 }} rowClassName={r => r.ApprovalStatus === 'Pending' ? 'row-pending' : ''} locale={{ emptyText: 'Chưa có dữ liệu' }} />
            </div>
          )}

          {activeMenu === 'speakers' && (
            <div>
              <Title level={4} style={{ fontFamily: "'Inter', sans-serif", marginBottom: 24 }}>Quản lý Diễn giả</Title>
              <Table 
                columns={speakerCols} 
                dataSource={allSpeakers} 
                rowKey="UserID" 
                pagination={{ pageSize: 10 }} 
                scroll={{ x: 800 }} 
                rowClassName={r => !r.IsActive ? 'row-pending' : ''}
                locale={{ emptyText: 'Không có dữ liệu diễn giả' }} 
              />
            </div>
          )}

          {activeMenu === 'staffs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ fontFamily: "'Inter', sans-serif", margin: 0 }}>Quản lý Tình nguyện viên (Staff)</Title>
                <Button type="primary" onClick={() => openStaffModal()}>+ Thêm Staff mới</Button>
              </div>
              <Table columns={staffTableCols} dataSource={availableStaffs} rowKey="UserID" pagination={{ pageSize: 10 }} scroll={{ x: 800 }} locale={{ emptyText: 'Chưa có Staff nào' }} />
            </div>
          )}

          {activeMenu === 'venues' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ fontFamily: "'Inter', sans-serif", margin: 0 }}>Quản lý Địa điểm</Title>
                <Button type="primary" onClick={() => openVenueModal()}>+ Thêm Địa điểm</Button>
              </div>
              <Table columns={venueCols} dataSource={allVenues} rowKey="VenueID" pagination={{ pageSize: 10 }} scroll={{ x: 800 }} locale={{ emptyText: 'Chưa có Địa điểm nào' }} />
            </div>
          )}

          {activeMenu === 'users' && (
            <div>
              <Title level={4} style={{ fontFamily: "'Inter', sans-serif", marginBottom: 24 }}>Quản lý Người dùng</Title>
              <Table columns={userCols} dataSource={allUsers} rowKey="UserID" pagination={{ pageSize: 10 }} scroll={{ x: 800 }} locale={{ emptyText: 'Không có người dùng nào' }} />
            </div>
          )}

          {activeMenu === 'event_detail' && selectedEventId && (
            <div style={{ position: 'relative' }}>
              <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => setActiveMenu('events')} style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                Quay lại
              </Button>
              <EventDetailPage adminEventId={selectedEventId} noLayout={true} />
            </div>
          )}
        </Content>
      </Layout>

      {/* Reject Modal */}
      <Modal
        title={rejectModal.type === 'cancel_event' ? 'Lý do khóa sự kiện' : 'Lý do từ chối'} 
        open={rejectModal.open} 
        onOk={confirmReject} 
        onCancel={() => setRejectModal({ open: false })} 
        okText={rejectModal.type === 'cancel_event' ? 'Xác nhận khóa' : 'Xác nhận từ chối'} 
        cancelText="Huỷ" 
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea rows={4} placeholder={rejectModal.type === 'cancel_event' ? 'Nhập lý do khóa sự kiện...' : 'Nhập lý do từ chối (sẽ gửi qua email)...'} value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
      </Modal>

      {/* Approve Event with Staff Assignment Modal */}
      <Modal
        title="Duyệt Sự kiện & Phân công Staff"
        open={approveEventModal.open}
        onOk={handleApproveEventWithStaff}
        onCancel={() => {
          setApproveEventModal({ open: false, event: null });
          setSelectedStaffs([]);
        }}
        okText="Xác nhận Duyệt"
        cancelText="Huỷ"
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Bạn đang duyệt sự kiện: <Text strong>{approveEventModal.event?.Title}</Text></Text>
        </div>
        <div style={{ marginBottom: 8 }}>
          <Text strong>Phân công Staff (Không bắt buộc)</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
            Bạn có thể chọn một hoặc nhiều Staff để phụ trách sự kiện này.
          </Text>
        </div>
        <Select
          mode="multiple"
          placeholder="Chọn Staff..."
          style={{ width: '100%' }}
          value={selectedStaffs}
          onChange={setSelectedStaffs}
          options={availableStaffs.map(s => ({ value: s.UserID, label: `${s.FullName} (${s.Email})` }))}
          filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
        />
      </Modal>

      <Modal 
        title="Nội dung yêu cầu thay đổi" 
        open={editReasonModal.open} 
        onCancel={() => setEditReasonModal({ open: false, data: null })}
        footer={[
          <Button key="close" onClick={() => setEditReasonModal({ open: false, data: null })}>Đóng</Button>
        ]}
      >
        {editReasonModal.data && (
          <div>
            <Text strong>Lý do chỉnh sửa từ Organizer:</Text>
            <div style={{ padding: 12, background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, marginTop: 8, marginBottom: 16 }}>
              {editReasonModal.data.EditReason || 'Không có lý do chi tiết'}
            </div>
            <Text type="secondary">Nội dung chi tiết thay đổi sẽ được cập nhật khi bạn nhấn Duyệt ở cột Hành động.</Text>
          </div>
        )}
      </Modal>

      {/* View Organizer Docs */}
      <Modal 
        title={`Hồ sơ: ${viewOrgModal.org?.OrganizationName}`} 
        open={viewOrgModal.open} 
        onCancel={() => setViewOrgModal({ open: false, org: null })}
        footer={<Button onClick={() => setViewOrgModal({ open: false, org: null })}>Đóng</Button>}
        width={600}
      >
        {viewOrgModal.org && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Tổ chức">{viewOrgModal.org.OrganizationName}</Descriptions.Item>
            <Descriptions.Item label="Người đại diện">{viewOrgModal.org.FullName}</Descriptions.Item>
            <Descriptions.Item label="Email">{viewOrgModal.org.Email}</Descriptions.Item>
            <Descriptions.Item label="Điện thoại">{viewOrgModal.org.Phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Chức vụ">{viewOrgModal.org.Position || '—'}</Descriptions.Item>
            <Descriptions.Item label="Ngày đăng ký">{dayjs(viewOrgModal.org.CreatedAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={viewOrgModal.org.ApprovalStatus === 'Approved' ? 'green' : viewOrgModal.org.ApprovalStatus === 'Rejected' ? 'red' : 'orange'}>
                {viewOrgModal.org.ApprovalStatus}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Tài liệu tải lên">
              <Space direction="vertical">
                {(viewOrgModal.org.documents || []).map((f, i) => (
                  <Button key={i} size="small" type="link" icon={<DownloadOutlined />} href={`${API_BASE.replace('/api', '')}/uploads/organizer-docs/${f}`} target="_blank">
                    Tải về tài liệu {i + 1}
                  </Button>
                ))}
                {(!viewOrgModal.org.documents || viewOrgModal.org.documents.length === 0) && <Text type="secondary">Không có tài liệu</Text>}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Staff CRUD Modal */}
      <Modal
        title={staffModal.data ? "Cập nhật Tình nguyện viên" : "Thêm mới Tình nguyện viên"}
        open={staffModal.open}
        onCancel={() => setStaffModal({ open: false, data: null })}
        onOk={() => staffForm.submit()}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={staffForm} layout="vertical" onFinish={handleSaveStaff}>
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
            <Input />
          </Form.Item>
          {!staffModal.data && (
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Vui lòng nhập email hợp lệ' }]}>
              <Input />
            </Form.Item>
          )}
          {!staffModal.data && (
            <Form.Item name="password" label="Mật khẩu" tooltip="Nếu để trống sẽ sử dụng mật khẩu mặc định là 123456">
              <Input.Password placeholder="123456" />
            </Form.Item>
          )}
          <Form.Item name="phone" label="Số điện thoại">
            <Input />
          </Form.Item>
          {staffModal.data && (
            <Form.Item name="isActive" label="Trạng thái hoạt động" valuePropName="checked">
              <Select options={[
                { value: true, label: 'Đang hoạt động' },
                { value: false, label: 'Đã khoá' }
              ]} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Venue CRUD Modal */}
      <Modal
        title={venueModal.data ? "Cập nhật Địa điểm" : "Thêm mới Địa điểm"}
        open={venueModal.open}
        onCancel={() => setVenueModal({ open: false, data: null })}
        onOk={() => venueForm.submit()}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={venueForm} layout="vertical" onFinish={handleVenueSubmit}>
          <Form.Item name="Name" label="Tên địa điểm" rules={[{ required: true, message: 'Vui lòng nhập tên địa điểm' }]}>
            <Input placeholder="VD: Tòa nhà Alpha (Hà Nội)" />
          </Form.Item>
          <Form.Item name="Address" label="Địa chỉ" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}>
            <Input.TextArea placeholder="VD: Khu CNC Hòa Lạc, Thạch Thất, Hà Nội" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default AdminDashboard;
