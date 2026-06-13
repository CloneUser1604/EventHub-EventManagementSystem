import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Menu, Typography, Card, Row, Col, Table, Button, Tag, Space, message, Avatar, Spin, Tooltip } from 'antd';
import { 
  AppstoreOutlined, TeamOutlined, UserOutlined, EditOutlined, 
  LeftOutlined, IdcardOutlined, ArrowRightOutlined
} from '@ant-design/icons';
import MainLayout from '../../components/layout/MainLayout';
import { eventService } from '../../services/event.service';
import dayjs from 'dayjs';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const EventDashboardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('overview');
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evtRes, partRes] = await Promise.all([
        eventService.getEventById(id),
        fetch(`${API_BASE}/staff/events/${id}/participants`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        }).then(r => r.json())
      ]);
      setEvent(evtRes.data.data);
      setParticipants(partRes.data || []);
    } catch (err) {
      message.error('Lỗi tải dữ liệu Dashboard');
    } finally {
      setLoading(false);
    }
  };

  const inviteStaff = async (participantId) => {
    try {
      const res = await fetch(`${API_BASE}/staff/events/${id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ participantId })
      });
      const data = await res.json();
      if (data.success) {
        message.success('Đã gửi lời mời làm Staff!');
        loadData();
      } else {
        message.error(data.message);
      }
    } catch (err) {
      message.error('Lỗi gửi lời mời');
    }
  };

  const revokeStaff = async (staffId) => {
    try {
      const res = await fetch(`${API_BASE}/staff/events/${id}/staff/${staffId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await res.json();
      if (data.success) {
        message.success('Đã xóa quyền Staff!');
        loadData();
      } else {
        message.error(data.message);
      }
    } catch (err) {
      message.error('Lỗi xóa quyền');
    }
  };

  if (loading) return <MainLayout><div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div></MainLayout>;
  if (!event) return <MainLayout><div style={{ padding: 40, textAlign: 'center' }}>Sự kiện không tồn tại</div></MainLayout>;

  const staffs = participants.filter(p => p.InviteStatus === 'Accepted' || p.InviteStatus === 'Pending');

  const participantCols = [
    { title: 'Người tham dự', render: (_, r) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar style={{ background: '#2563eb' }}>{r.FullName?.[0]}</Avatar>
        <div>
          <Text strong style={{ display: 'block' }}>{r.FullName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.Email}</Text>
        </div>
      </div>
    )},
    { title: 'Mã vé', dataIndex: 'RegistrationID', render: v => `EMS-${v}` },
    { title: 'Trạng thái', dataIndex: 'Status', render: s => <Tag color="green">Đã đăng ký</Tag> },
    { title: 'Vai trò', render: (_, r) => {
        if (!r.InviteStatus) return <Tag color="default">Participant</Tag>;
        if (r.InviteStatus === 'Accepted') return <Tag color="blue">Staff</Tag>;
        if (r.InviteStatus === 'Pending') return <Tag color="orange">Đang mời Staff</Tag>;
        return <Tag color="default">Participant</Tag>;
    }},
    { title: 'Hành động', render: (_, r) => (
      !r.InviteStatus || r.InviteStatus === 'Declined' ? (
        <Space direction="vertical" size={2}>
          {r.InviteStatus === 'Declined' && <Text type="danger" style={{ fontSize: 12 }}>❌ Đã từ chối</Text>}
          <Button size="small" type="primary" ghost icon={<IdcardOutlined />} onClick={() => inviteStaff(r.ParticipantID)}>
            {r.InviteStatus === 'Declined' ? 'Mời lại Staff' : 'Trao quyền Staff'}
          </Button>
        </Space>
      ) : (
        <Text type="secondary" style={{ fontSize: 13 }}>Đã gửi lời mời</Text>
      )
    )},
  ];

  const staffCols = [
    { title: 'Nhân sự', render: (_, r) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar style={{ background: '#7c3aed' }}>{r.FullName?.[0]}</Avatar>
        <div>
          <Text strong style={{ display: 'block' }}>{r.FullName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.Email}</Text>
        </div>
      </div>
    )},
    { title: 'Tình trạng lời mời', dataIndex: 'InviteStatus', render: s => {
        const cfg = { Pending: { c: 'orange', t: 'Chờ phản hồi' }, Accepted: { c: 'green', t: 'Đã đồng ý' }, Declined: { c: 'red', t: 'Đã từ chối' } };
        return <Tag color={cfg[s]?.c}>{cfg[s]?.t}</Tag>;
    }},
    { title: 'Hành động', render: (_, r) => (
      r.InviteStatus === 'Accepted' ? (
        <Button danger size="small" onClick={() => revokeStaff(r.ParticipantID)}>
          Xóa quyền
        </Button>
      ) : null
    )}
  ];

  return (
    <MainLayout>
      <div style={{ background: 'linear-gradient(135deg,#0f1629,#1a2744)', padding: '32px 24px', color: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 20, alignItems: 'center' }}>
          <Button icon={<LeftOutlined />} onClick={() => navigate('/organizer/events')} ghost style={{ border: 0, padding: 0 }} />
          <div style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Event Dashboard</Text>
            <Title level={2} style={{ color: 'white', margin: 0, fontFamily: 'Sora,sans-serif' }}>{event.Title}</Title>
          </div>
          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/organizer/events/${id}/edit`)} style={{ borderRadius: 8 }}>
            Chỉnh sửa sự kiện
          </Button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 24px', minHeight: '60vh' }}>
        <Layout style={{ background: 'transparent' }}>
          <Sider width={220} style={{ background: 'transparent' }}>
            <Menu
              mode="inline"
              selectedKeys={[activeMenu]}
              onClick={e => setActiveMenu(e.key)}
              style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}
              items={[
                { key: 'overview', icon: <AppstoreOutlined />, label: 'Tổng quan' },
                { key: 'participants', icon: <TeamOutlined />, label: 'Người tham dự' },
                { key: 'staffs', icon: <IdcardOutlined />, label: 'Quản lý Staff' },
              ]}
            />
          </Sider>
          
          <Content style={{ paddingLeft: 24 }}>
            {activeMenu === 'overview' && (
              <div>
                <Title level={4} style={{ fontFamily: 'Sora,sans-serif', marginBottom: 24 }}>Thống kê sự kiện</Title>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ fontSize: 13, color: '#64748b' }}>Tổng đăng ký</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb', fontFamily: 'Sora,sans-serif' }}>
                        {event.RegisteredCount} <span style={{ fontSize: 14, color: '#94a3b8' }}>/ {event.MaxParticipants || '∞'}</span>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ fontSize: 13, color: '#64748b' }}>Staff đã mời</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#7c3aed', fontFamily: 'Sora,sans-serif' }}>
                        {staffs.length}
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>
            )}

            {activeMenu === 'participants' && (
              <div>
                <Title level={4} style={{ fontFamily: 'Sora,sans-serif', marginBottom: 24 }}>Danh sách Người tham dự</Title>
                <Table 
                  columns={participantCols} 
                  dataSource={participants} 
                  rowKey="RegistrationID"
                  pagination={{ pageSize: 10 }}
                  style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}
                  locale={{ emptyText: 'Chưa có người tham dự' }}
                />
              </div>
            )}

            {activeMenu === 'staffs' && (
              <div>
                <Title level={4} style={{ fontFamily: 'Sora,sans-serif', marginBottom: 24 }}>Quản lý Staff</Title>
                <Table 
                  columns={staffCols} 
                  dataSource={staffs} 
                  rowKey="ParticipantID"
                  pagination={{ pageSize: 10 }}
                  style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}
                  locale={{ emptyText: 'Chưa có Staff nào được mời' }}
                />
              </div>
            )}
          </Content>
        </Layout>
      </div>
    </MainLayout>
  );
};

export default EventDashboardPage;
