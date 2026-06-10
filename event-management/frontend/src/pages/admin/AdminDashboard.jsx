import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Statistic, Table, Tag, Button, Space,
  Modal, Input, message, Tabs, Avatar, Typography, Spin, Badge, Tooltip
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined,
  TeamOutlined, CalendarOutlined, UserOutlined, TrophyOutlined,
  ExclamationCircleOutlined, FileTextOutlined, DownloadOutlined
} from '@ant-design/icons';
import MainLayout from '../../components/layout/MainLayout';
import { adminService } from '../../services/admin.service';
import { eventService } from '../../services/event.service';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { confirm } = Modal;
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [allOrganizers, setAllOrganizers] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [pendingSpeakers, setPendingSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState({ open: false, type: '', id: null, title: '' });
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, orgsRes, allOrgsRes, eventsRes, speakersRes] = await Promise.all([
        eventService.getDashboardStats(),
        adminService.getPendingOrganizers(),
        adminService.getAllOrganizers(),
        eventService.getEvents({ approvalStatus: 'Pending', limit: 50 }),
        adminService.getPendingSpeakers(),
      ]);
      setStats(statsRes.data.data.stats);
      setRecentEvents(statsRes.data.data.recentEvents);
      setPendingOrgs(orgsRes.data.data);
      setAllOrganizers(allOrgsRes.data.data);
      setPendingEvents(eventsRes.data.data.events);
      setPendingSpeakers(speakersRes.data.data);
    } catch (e) { message.error('Tải dữ liệu thất bại'); }
    finally { setLoading(false); }
  };

  /* ── Approve/Reject Organizer ── */
  const handleOrgAction = async (profileId, action, reason = '') => {
    try {
      await adminService.reviewOrganizer(profileId, action, reason);
      message.success(action === 'approve' ? '✅ Đã phê duyệt ban tổ chức' : '❌ Đã từ chối');
      loadAll();
    } catch (err) { message.error(err.response?.data?.message || 'Thao tác thất bại'); }
  };

  /* ── Approve/Reject Event ── */
  const handleEventAction = async (eventId, action, reason = '') => {
    try {
      await eventService.reviewEvent(eventId, action, reason);
      message.success(action === 'approve' ? '✅ Đã duyệt & công bố sự kiện' : '❌ Đã từ chối sự kiện');
      loadAll();
    } catch (err) { message.error(err.response?.data?.message || 'Thao tác thất bại'); }
  };

  /* ── Approve/Reject Speaker ── */
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

  /* ── Organizer columns ── */
  const orgColumns = [
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
            <Tooltip key={i} title={f}>
              <Button size="small" type="link" icon={<DownloadOutlined />}
                href={`${API_BASE.replace('/api', '')}/uploads/organizer-docs/${f}`} target="_blank">
                File {i + 1}
              </Button>
            </Tooltip>
          ))}
          {(!docs || docs.length === 0) && <Text type="secondary" style={{ fontSize: 12 }}>Không có</Text>}
        </Space>
      ),
    },
    { title: 'Ngày đăng ký', dataIndex: 'CreatedAt', width: 130, render: d => <Text style={{ fontSize: 12 }}>{dayjs(d).format('DD/MM/YYYY')}</Text> },
    {
      title: 'Hành động', width: 180,
      render: (_, r) => (
        <Space>
          <Button type="primary" size="small" icon={<CheckCircleOutlined />}
            onClick={() => confirm({ title: `Duyệt "${r.OrganizationName}"?`, okText: 'Duyệt', onOk: () => handleOrgAction(r.OrganizerProfileID, 'approve') })}>
            Duyệt
          </Button>
          <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => openReject('org', r.OrganizerProfileID, r.OrganizationName)}>
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

  /* ── Event columns ── */
  const eventColumns = [
    {
      title: 'Sự kiện', render: (_, r) => (
        <div>
          <Text strong style={{ display: 'block', fontSize: 14 }}>{r.Title}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.OrganizerName} · {dayjs(r.StartDate).format('DD/MM/YYYY')}</Text>
        </div>
      ),
    },
    { title: 'Địa điểm', dataIndex: 'VenueName', width: 140, render: v => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
    {
      title: 'Hành động', width: 200,
      render: (_, r) => (
        <Space>
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/events/${r.EventID}`)}>Xem</Button>
          <Button type="primary" size="small" icon={<CheckCircleOutlined />}
            onClick={() => confirm({ title: `Duyệt sự kiện "${r.Title}"?`, okText: 'Duyệt & Công bố', onOk: () => handleEventAction(r.EventID, 'approve') })}>
            Duyệt
          </Button>
          <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => openReject('event', r.EventID, r.Title)}>
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

  /* ── Speaker columns ── */
  const speakerColumns = [
    {
      title: 'Diễn giả', render: (_, r) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Avatar style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>{r.FullName?.[0]}</Avatar>
          <div>
            <Text strong style={{ display: 'block' }}>{r.FullName}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.Email}</Text>
          </div>
        </div>
      ),
    },
    { title: 'Chuyên môn', dataIndex: 'Expertise', render: v => <Text style={{ fontSize: 13 }}>{v || '—'}</Text> },
    { title: 'Ngày tạo', dataIndex: 'CreatedAt', width: 120, render: d => <Text style={{ fontSize: 12 }}>{dayjs(d).format('DD/MM/YYYY')}</Text> },
    {
      title: 'Hành động', width: 180,
      render: (_, r) => (
        <Space>
          <Button type="primary" size="small" icon={<CheckCircleOutlined />}
            onClick={() => confirm({ title: `Duyệt diễn giả "${r.FullName}"?`, okText: 'Duyệt', onOk: () => handleSpeakerAction(r.UserID, 'approve') })}>
            Duyệt
          </Button>
          <Button danger size="small" icon={<CloseCircleOutlined />} onClick={() => openReject('speaker', r.UserID, r.FullName)}>
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];

  if (loading && !stats) return (
    <MainLayout><div style={{ textAlign: 'center', padding: '120px 24px' }}><Spin size="large" /></div></MainLayout>
  );

  return (
    <MainLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Title level={2} style={{ margin: 0, fontFamily: 'Sora,sans-serif' }}>⚙️ Admin Dashboard</Title>
          <Text type="secondary">Quản lý và phê duyệt toàn hệ thống</Text>
        </div>

        {/* Stats */}
        <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
          {[
            { title: 'Tổng sự kiện', value: stats?.TotalEvents, icon: <CalendarOutlined />, color: '#2563eb' },
            { title: 'Đang diễn ra', value: stats?.PublishedEvents, icon: <CheckCircleOutlined />, color: '#10b981' },
            { title: 'Chờ duyệt', value: stats?.PendingApproval, icon: <ExclamationCircleOutlined />, color: '#f59e0b' },
            { title: 'Người tham dự', value: stats?.TotalParticipants, icon: <TeamOutlined />, color: '#7c3aed' },
            { title: 'Ban tổ chức', value: stats?.TotalOrganizers, icon: <UserOutlined />, color: '#0ea5e9' },
            { title: 'Lượt đăng ký', value: stats?.TotalRegistrations, icon: <TrophyOutlined />, color: '#f59e0b' },
          ].map((s, i) => (
            <Col key={i} xs={12} sm={8} lg={4}>
              <Card style={{ borderRadius: 14, border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 26, fontFamily: 'Sora,sans-serif', fontWeight: 800, color: s.color }}>
                      {s.value ?? '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.title}</div>
                  </div>
                  <div style={{ fontSize: 22, color: s.color, opacity: 0.25 }}>{s.icon}</div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Pending badges */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {pendingOrgs.length > 0 && <Tag color="orange" style={{ padding: '4px 12px', borderRadius: 8, fontSize: 13 }}>🏢 {pendingOrgs.length} ban tổ chức chờ duyệt</Tag>}
          {pendingEvents.length > 0 && <Tag color="blue" style={{ padding: '4px 12px', borderRadius: 8, fontSize: 13 }}>📅 {pendingEvents.length} sự kiện chờ duyệt</Tag>}
          {pendingSpeakers.length > 0 && <Tag color="purple" style={{ padding: '4px 12px', borderRadius: 8, fontSize: 13 }}>🎤 {pendingSpeakers.length} diễn giả chờ duyệt</Tag>}
          {pendingOrgs.length === 0 && pendingEvents.length === 0 && pendingSpeakers.length === 0 && (
            <Tag color="green" style={{ padding: '4px 12px', borderRadius: 8, fontSize: 13 }}>✅ Không có mục nào chờ duyệt</Tag>
          )}
        </div>

        {/* Main tabs */}
        <Card style={{ borderRadius: 16 }}>
          <Tabs defaultActiveKey="events" items={[
            {
              key: 'events',
              label: <Badge count={pendingEvents.length} size="small"><span style={{ paddingRight: 8 }}>📅 Sự kiện chờ duyệt</span></Badge>,
              children: (
                <Table columns={eventColumns} dataSource={pendingEvents} rowKey="EventID"
                  pagination={{ pageSize: 8 }}
                  locale={{ emptyText: <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>✅ Không có sự kiện chờ duyệt</div> }} />
              ),
            },
            {
              key: 'organizers',
              label: <Badge count={pendingOrgs.length} size="small"><span style={{ paddingRight: 8 }}>🏢 Ban tổ chức chờ duyệt</span></Badge>,
              children: (
                <Table columns={orgColumns} dataSource={pendingOrgs} rowKey="OrganizerProfileID"
                  pagination={{ pageSize: 8 }}
                  locale={{ emptyText: <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>✅ Không có ban tổ chức chờ duyệt</div> }} />
              ),
            },
            {
              key: 'speakers',
              label: <Badge count={pendingSpeakers.length} size="small"><span style={{ paddingRight: 8 }}>🎤 Diễn giả chờ duyệt</span></Badge>,
              children: (
                <Table columns={speakerColumns} dataSource={pendingSpeakers} rowKey="UserID"
                  pagination={{ pageSize: 8 }}
                  locale={{ emptyText: <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>✅ Không có diễn giả chờ duyệt</div> }} />
              ),
            },
            {
              key: 'all-organizers',
              label: <Badge count={allOrganizers.filter(o => o.ApprovalStatus === 'Pending').length} size="small"><span style={{ paddingRight: 8 }}>📋 Danh sách Ban tổ chức</span></Badge>,
              children: (
                <Table
                  columns={[
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
                            <Button key={i} size="small" type="link" icon={<DownloadOutlined />}
                              href={`${API_BASE.replace('/api','')}/uploads/organizer-docs/${f}`} target="_blank">
                              File {i + 1}
                            </Button>
                          ))}
                          {(!docs || docs.length === 0) && <Text type="secondary" style={{ fontSize: 12 }}>Không có</Text>}
                        </Space>
                      ),
                    },
                    { title: 'Ngày đăng ký', dataIndex: 'CreatedAt', width: 120, render: d => dayjs(d).format('DD/MM/YYYY') },
                    {
                      title: 'Trạng thái', dataIndex: 'ApprovalStatus', width: 130,
                      render: s => {
                        const cfg = { Approved: 'green', Rejected: 'red', Pending: 'orange' };
                        const lbl = { Approved: '✅ Đã duyệt', Rejected: '❌ Từ chối', Pending: '⏳ Chờ duyệt' };
                        return <Tag color={cfg[s] || 'default'} style={{ borderRadius: 6, fontWeight: 600 }}>{lbl[s] || s}</Tag>;
                      },
                    },
                    {
                      title: 'Hành động', width: 200,
                      render: (_, r) => r.ApprovalStatus === 'Pending' ? (
                        <Space>
                          <Button type="primary" size="small" icon={<CheckCircleOutlined />}
                            onClick={() => confirm({ title: `Duyệt "${r.OrganizationName}"?`, okText: 'Duyệt', onOk: () => handleOrgAction(r.OrganizerProfileID, 'approve') })}>
                            Duyệt
                          </Button>
                          <Button danger size="small" icon={<CloseCircleOutlined />}
                            onClick={() => openReject('org', r.OrganizerProfileID, r.OrganizationName)}>
                            Từ chối
                          </Button>
                        </Space>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {r.ApprovalStatus === 'Approved' ? `✅ Duyệt lúc ${dayjs(r.ApprovedAt).format('DD/MM/YYYY')}` : `❌ Từ chối: ${r.RejectionReason || '—'}`}
                        </Text>
                      ),
                    },
                  ]}
                  dataSource={allOrganizers}
                  rowKey="OrganizerProfileID"
                  pagination={{ pageSize: 10 }}
                  rowClassName={r => r.ApprovalStatus === 'Pending' ? 'row-pending' : ''}
                  locale={{ emptyText: <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Chưa có ban tổ chức nào đăng ký</div> }}
                />
              ),
            },
            {
              key: 'recent',
              label: '🕐 Hoạt động gần đây',
              children: (
                <Table
                  dataSource={recentEvents} rowKey="EventID"
                  pagination={{ pageSize: 8 }}
                  columns={[
                    { title: 'Sự kiện', dataIndex: 'Title', render: (t, r) => <><Text strong>{t}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{r.OrganizerName}</Text></> },
                    { title: 'Ngày', dataIndex: 'StartDate', width: 120, render: d => dayjs(d).format('DD/MM/YYYY') },
                    { title: 'Trạng thái', dataIndex: 'Status', width: 130,
                      render: s => {
                        const cfg = { Published: 'green', PendingApproval: 'orange', Draft: 'default', Rejected: 'red', Cancelled: 'red', Completed: 'blue' };
                        const label = { Published: 'Công bố', PendingApproval: 'Chờ duyệt', Draft: 'Nháp', Rejected: 'Từ chối', Cancelled: 'Đã huỷ', Completed: 'Kết thúc' };
                        return <Tag color={cfg[s] || 'default'} style={{ borderRadius: 6 }}>{label[s] || s}</Tag>;
                      }
                    },
                    { title: '', width: 80, render: (_, r) => <Button type="link" size="small" onClick={() => navigate(`/events/${r.EventID}`)}>Xem</Button> },
                  ]}
                />
              ),
            },
          ]} />
        </Card>
      </div>

      {/* Reject reason modal */}
      <Modal
        open={rejectModal.open}
        onCancel={() => setRejectModal({ open: false })}
        onOk={confirmReject}
        okText="Xác nhận từ chối" okButtonProps={{ danger: true }}
        cancelText="Huỷ"
        title={<span style={{ fontFamily: 'Sora,sans-serif' }}>❌ Từ chối: {rejectModal.title}</span>}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>Vui lòng nhập lý do từ chối. Người dùng sẽ nhận được thông báo.</Text>
        <Input.TextArea
          rows={4}
          placeholder="VD: Tài liệu chưa đầy đủ / Thông tin sự kiện không hợp lệ..."
          value={rejectReason}
          onChange={e => setRejectReason(e.target.value)}
          showCount maxLength={500}
        />
      </Modal>
    </MainLayout>
  );
};

export default AdminDashboard;
