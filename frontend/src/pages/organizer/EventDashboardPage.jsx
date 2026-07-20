import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Menu, Typography, Card, Row, Col, Table, Button, Tag, message, Avatar, Spin, Modal, Form, Input } from 'antd';
import { 
  AppstoreOutlined, TeamOutlined, EditOutlined, 
  LeftOutlined, IdcardOutlined, NotificationOutlined, SendOutlined
} from '@ant-design/icons';
import MainLayout from '../../components/layout/MainLayout';
import { eventService } from '../../services/event.service';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const EventDashboardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('overview');
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [assignedStaffs, setAssignedStaffs] = useState([]);
  const [loading, setLoading] = useState(true);

  // States cho tính năng gửi thông báo
  const [isNotifyModalVisible, setIsNotifyModalVisible] = useState(false);
  const [sendingNotify, setSendingNotify] = useState(false);
  const [notifyForm] = Form.useForm();

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evtRes, partRes, staffRes] = await Promise.all([
        eventService.getEventById(id),
        fetch(`${API_BASE}/staff/events/${id}/participants`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        }).then(r => r.json()),
        fetch(`${API_BASE}/staff/events/${id}/assigned`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        }).then(r => r.json())
      ]);
      setEvent(evtRes.data.data || evtRes.data);
      setParticipants(partRes.data || []);
      setAssignedStaffs(staffRes.data || []);
    } catch (err) {
      message.error('Lỗi tải dữ liệu Dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (values) => {
    if (participants.length === 0) {
      return message.warning('Chưa có ai đăng ký tham gia sự kiện này!');
    }
    
    setSendingNotify(true);
    try {
      const res = await fetch(`${API_BASE}/events/${id}/notify-participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(values)
      });
      const data = await res.json();
      if (data.success) {
        message.success(data.message || 'Đã gửi thông báo thành công!');
        setIsNotifyModalVisible(false);
        notifyForm.resetFields();
      } else {
        message.error(data.message || 'Lỗi khi gửi thông báo');
      }
    } catch (err) {
      message.error('Lỗi kết nối máy chủ');
    } finally {
      setSendingNotify(false);
    }
  };

  if (loading) return <MainLayout><div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div></MainLayout>;
  if (!event) return <MainLayout><div style={{ padding: 40, textAlign: 'center' }}>Sự kiện không tồn tại</div></MainLayout>;

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
    { title: 'Trạng thái', dataIndex: 'Status', render: () => <Tag color="green">Đã đăng ký</Tag> }
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
    { title: 'Chức vụ', render: (_, r) => <Tag color="purple">{r.Role || 'Staff'}</Tag> },
    { title: 'Phân công lúc', dataIndex: 'AssignedAt', render: d => dayjs(d?.replace('Z', '')).format('DD/MM/YYYY HH:mm') }
  ];

  return (
    <MainLayout>
      <div style={{ background: 'linear-gradient(135deg,#0f1629,#1a2744)', padding: '32px 24px', color: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 20, alignItems: 'center' }}>
          <Button icon={<LeftOutlined />} onClick={() => navigate('/organizer/events')} ghost style={{ border: 0, padding: 0 }} />
          <div style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Event Dashboard</Text>
            <Title level={2} style={{ color: 'white', margin: 0, fontFamily: "'Inter', sans-serif" }}>{event.Title}</Title>
          </div>
          
          {/* Nút gửi thông báo mới */}
          <Button 
            type="default" 
            icon={<NotificationOutlined />} 
            onClick={() => setIsNotifyModalVisible(true)}
            style={{ borderRadius: 8, background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            Gửi thông báo ({participants.length})
          </Button>

          <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/organizer/events/${id}/edit`)} style={{ borderRadius: 8 }}>
            Chỉnh sửa sự kiện
          </Button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '24px auto', padding: '0 24px', minHeight: '60vh' }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={6} lg={5}>
            <Menu
              mode="inline"
              selectedKeys={[activeMenu]}
              onClick={e => setActiveMenu(e.key)}
              style={{ borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}
              items={[
                { key: 'overview', icon: <AppstoreOutlined />, label: 'Tổng quan' },
                { key: 'participants', icon: <TeamOutlined />, label: 'Người tham dự' },
                { key: 'staffs', icon: <IdcardOutlined />, label: 'Danh sách Staff' },
              ]}
            />
          </Col>
          
          <Col xs={24} md={18} lg={19}>
            {activeMenu === 'overview' && (
              <div>
                <Title level={4} style={{ fontFamily: "'Inter', sans-serif", marginBottom: 24 }}>Thống kê sự kiện</Title>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ fontSize: 13, color: '#64748b' }}>Tổng đăng ký</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb', fontFamily: "'Inter', sans-serif" }}>
                        {event.RegisteredCount || participants.length} <span style={{ fontSize: 14, color: '#94a3b8' }}>/ {event.MaxParticipants || '∞'}</span>
                      </div>
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ fontSize: 13, color: '#64748b' }}>Staff phụ trách</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#7c3aed', fontFamily: "'Inter', sans-serif" }}>
                        {assignedStaffs.length}
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>
            )}

            {activeMenu === 'participants' && (
              <div>
                <Title level={4} style={{ fontFamily: "'Inter', sans-serif", marginBottom: 24 }}>Danh sách Người tham dự</Title>
                <Table 
                  columns={participantCols} 
                  dataSource={participants} 
                  rowKey="RegistrationID"
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 600 }}
                  style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}
                  locale={{ emptyText: 'Chưa có người tham dự' }}
                />
              </div>
            )}

            {activeMenu === 'staffs' && (
              <div>
                <Title level={4} style={{ fontFamily: "'Inter', sans-serif", marginBottom: 24 }}>Danh sách Staff (Được phân công bởi Admin)</Title>
                <Table 
                  columns={staffCols} 
                  dataSource={assignedStaffs} 
                  rowKey="EventStaffID"
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 600 }}
                  style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}
                  locale={{ emptyText: 'Chưa có Staff nào được phân công' }}
                />
              </div>
            )}
          </Col>
        </Row>
      </div>

      {/* Modal soạn thông báo */}
      <Modal
        title={<div><NotificationOutlined style={{ color: '#2563eb', marginRight: 8 }} /> Soạn thông báo cho người tham dự</div>}
        open={isNotifyModalVisible}
        onCancel={() => !sendingNotify && setIsNotifyModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <div style={{ marginBottom: 16, padding: '12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8 }}>
          <Text type="secondary">
            Thông báo này sẽ được gửi trực tiếp đến <b>{participants.length}</b> người dùng đã đăng ký tham gia sự kiện.
          </Text>
        </div>

        <Form form={notifyForm} layout="vertical" onFinish={handleSendNotification}>
          <Form.Item 
            name="title" 
            label="Tiêu đề thông báo" 
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
          >
            <Input placeholder="VD: Thay đổi phòng tổ chức sự kiện..." />
          </Form.Item>

          <Form.Item 
            name="message" 
            label="Nội dung" 
            rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}
          >
            <TextArea rows={5} placeholder="Nhập chi tiết nội dung muốn thông báo đến người tham gia..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button onClick={() => setIsNotifyModalVisible(false)} style={{ marginRight: 8 }} disabled={sendingNotify}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={sendingNotify} icon={<SendOutlined />}>
              Gửi thông báo
            </Button>
          </Form.Item>
        </Form>
      </Modal>

    </MainLayout>
  );
};

export default EventDashboardPage;