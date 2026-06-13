import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout, Menu, Card, Statistic, Table, Tag, Button, Space,
  Modal, Input, message, Avatar, Typography, Spin, Badge, Tooltip, Dropdown, Row, Col, Tabs, Descriptions
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined,
  TeamOutlined, CalendarOutlined, UserOutlined, TrophyOutlined,
  ExclamationCircleOutlined, DownloadOutlined, AppstoreOutlined,
  MenuUnfoldOutlined, MenuFoldOutlined, LogoutOutlined
} from '@ant-design/icons';
import useAuthStore from '../../store/authStore';
import { adminService } from '../../services/admin.service';
import { eventService } from '../../services/event.service';
import dayjs from 'dayjs';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { confirm } = Modal;
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  
  const [collapsed, setCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState('overview');
  
  const [stats, setStats] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [allOrganizers, setAllOrganizers] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [pendingSpeakers, setPendingSpeakers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [rejectModal, setRejectModal] = useState({ open: false, type: '', id: null, title: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [editReasonModal, setEditReasonModal] = useState({ open: false, data: null });
  const [viewOrgModal, setViewOrgModal] = useState({ open: false, org: null });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, orgsRes, allOrgsRes, eventsRes, speakersRes, usersRes, allEventsRes] = await Promise.all([
        eventService.getDashboardStats(),
        adminService.getPendingOrganizers(),
        adminService.getAllOrganizers(),
        eventService.getEvents({ approvalStatus: 'Pending', limit: 100 }),
        adminService.getPendingSpeakers(),
        adminService.getAllUsers && adminService.getAllUsers() || fetch(API_BASE + '/admin/users', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }).then(r => r.json()),
        eventService.getEvents({ limit: 200 })
      ]);
      setStats(statsRes.data?.data?.stats || statsRes.data?.stats || {});
      setRecentEvents(statsRes.data?.data?.recentEvents || statsRes.data?.recentEvents || []);
      setPendingOrgs(orgsRes.data?.data || []);
      setAllOrganizers(allOrgsRes.data?.data || []);
      setPendingEvents(eventsRes.data?.data?.events || []);
      setAllEvents(allEventsRes.data?.data?.events || []);
      setPendingSpeakers(speakersRes.data?.data || []);
      
      const usersData = usersRes.data?.data || usersRes.data || [];
      setAllUsers(usersData);
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
    if (!rejectReason.trim()) return message.warning('Vui lòng nhập lý do từ chối');
    const { type, id } = rejectModal;
    if (type === 'org') await handleOrgAction(id, 'reject', rejectReason);
    if (type === 'event') await handleEventAction(id, 'reject', rejectReason);
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
      title: 'Hành động', width: 220,
      render: (_, r) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/events/${r.EventID}`)}>Xem</Button>
          {r.ProposedChanges && (
            <Button type="primary" size="small" ghost onClick={() => setEditReasonModal({ open: true, data: r })}>Thay đổi</Button>
          )}
          <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => confirm({ title: `Duyệt sự kiện "${r.Title}"?`, onOk: () => handleEventAction(r.EventID, 'approve') })}>Duyệt</Button>
          <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => openReject('event', r.EventID, r.Title)}>Từ chối</Button>
        </Space>
      ),
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
      title: 'Hành động', width: 180,
      render: (_, r) => (
        <Space>
          <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => confirm({ title: `Duyệt diễn giả "${r.FullName}"?`, onOk: () => handleSpeakerAction(r.UserID, 'approve') })}>Duyệt</Button>
          <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => openReject('speaker', r.UserID, r.FullName)}>Từ chối</Button>
        </Space>
      ),
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
            try {
              await fetch(`${API_BASE}/admin/users/${r.UserID}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
                body: JSON.stringify({ isActive: !r.IsActive })
              });
              message.success(`Đã ${r.IsActive ? 'khoá' : 'mở khoá'} tài khoản`);
              loadAll();
            } catch (err) { message.error('Thao tác thất bại'); }
          }}
        >
          {r.IsActive ? 'Khoá TK' : 'Mở khoá'}
        </Button>
      ),
    },
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
    { key: 'users', icon: <TeamOutlined />, label: 'Quản lý Người dùng' },
  ];

  if (loading && !stats) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div>;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="dark"
        style={{ background: '#0f172a', boxShadow: '2px 0 8px rgba(0,0,0,0.15)' }}
        width={260}
      >
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 20 }}>
            E
          </div>
          {!collapsed && <div style={{ color: 'white', fontSize: 20, fontWeight: 800, fontFamily: 'Sora,sans-serif', letterSpacing: 1 }}>EMS Admin</div>}
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
        
        <Content style={{ margin: '24px', background: '#fff', padding: 24, borderRadius: 12, minHeight: 280, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          {activeMenu === 'overview' && (
            <div>
              <Title level={4} style={{ fontFamily: 'Sora,sans-serif', marginBottom: 24 }}>Tổng quan hệ thống</Title>
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
                          <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: 'Sora,sans-serif' }}>{s.value ?? 0}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{s.title}</div>
                        </div>
                        <div style={{ fontSize: 20, color: s.color, opacity: 0.3 }}>{s.icon}</div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>

              <Title level={5} style={{ fontFamily: 'Sora,sans-serif', marginBottom: 16 }}>Hoạt động sự kiện gần đây</Title>
              <Table
                dataSource={recentEvents} rowKey="EventID"
                pagination={{ pageSize: 5 }}
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
              <Title level={4} style={{ fontFamily: 'Sora,sans-serif', marginBottom: 24 }}>Quản lý Sự kiện</Title>
              <Tabs defaultActiveKey="pending" items={[
                {
                  key: 'pending',
                  label: `Sự kiện chờ duyệt (${pendingEvents.length})`,
                  children: <Table columns={eventCols} dataSource={pendingEvents} rowKey="EventID" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Không có sự kiện nào chờ duyệt' }} />
                },
                {
                  key: 'approved',
                  label: 'Sự kiện đã duyệt/công bố',
                  children: <Table columns={eventCols} dataSource={allEvents.filter(e => e.ApprovalStatus === 'Approved' || e.Status === 'Published' || e.Status === 'Completed')} rowKey="EventID" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Không có sự kiện nào' }} />
                }
              ]} />
            </div>
          )}

          {activeMenu === 'organizers' && (
            <div>
              <Title level={4} style={{ fontFamily: 'Sora,sans-serif', marginBottom: 24 }}>Quản lý Ban tổ chức</Title>
              <Table columns={orgCols} dataSource={allOrganizers} rowKey="OrganizerProfileID" pagination={{ pageSize: 10 }} rowClassName={r => r.ApprovalStatus === 'Pending' ? 'row-pending' : ''} locale={{ emptyText: 'Chưa có dữ liệu' }} />
            </div>
          )}

          {activeMenu === 'speakers' && (
            <div>
              <Title level={4} style={{ fontFamily: 'Sora,sans-serif', marginBottom: 24 }}>Diễn giả chờ phê duyệt</Title>
              <Table columns={speakerCols} dataSource={pendingSpeakers} rowKey="UserID" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Không có diễn giả nào chờ duyệt' }} />
            </div>
          )}

          {activeMenu === 'users' && (
            <div>
              <Title level={4} style={{ fontFamily: 'Sora,sans-serif', marginBottom: 24 }}>Quản lý Người dùng</Title>
              <Table columns={userCols} dataSource={allUsers} rowKey="UserID" pagination={{ pageSize: 10 }} locale={{ emptyText: 'Không có người dùng nào' }} />
            </div>
          )}
        </Content>
      </Layout>

      {/* Reject Modal */}
      <Modal
        title="Lý do từ chối" 
        open={rejectModal.open} 
        onOk={confirmReject} 
        onCancel={() => setRejectModal({ open: false })} 
        okText="Xác nhận từ chối" 
        cancelText="Huỷ" 
        okButtonProps={{ danger: true }}
      >
        <Input.TextArea rows={4} placeholder="Nhập lý do từ chối (sẽ gửi qua email cho người đăng ký)..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
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

      {/* View Org Modal */}
      <Modal
        open={viewOrgModal.open}
        onCancel={() => setViewOrgModal({ open: false, org: null })}
        footer={<Button onClick={() => setViewOrgModal({ open: false, org: null })}>Đóng</Button>}
        title={<span style={{ fontFamily: 'Sora,sans-serif' }}>Hồ sơ Ban tổ chức</span>}
        width={600}
      >
        {viewOrgModal.org && (
          <Descriptions column={1} bordered size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="Tên tổ chức"><Text strong>{viewOrgModal.org.OrganizationName}</Text></Descriptions.Item>
            <Descriptions.Item label="Người đại diện">{viewOrgModal.org.FullName}</Descriptions.Item>
            <Descriptions.Item label="Email">{viewOrgModal.org.Email}</Descriptions.Item>
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
    </Layout>
  );
};

export default AdminDashboard;
