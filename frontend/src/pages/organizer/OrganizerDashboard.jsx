import React, { useState, useEffect } from 'react';
import {
  Layout, Menu, Card, Button, Table, Modal, Form, Input,
  Tag, Descriptions, Space, Divider, Typography, message,
  Tooltip, Row, Col, Empty, Badge
} from 'antd';
import {
  PlusOutlined, UserAddOutlined, CalendarOutlined,
  MailOutlined, PhoneOutlined, LinkedinOutlined,
  GlobalOutlined, LogoutOutlined, TeamOutlined,
  FileDoneOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import useAuthStore from '../../store/authStore';
import { eventService } from '../../services/event.service';
import { useNavigate } from 'react-router-dom';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;

const OrganizerDashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Modals state
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isRegisterSpeakerOpen, setIsRegisterSpeakerOpen] = useState(false);
  
  // Form instances
  const [eventForm] = Form.useForm();
  const [speakerForm] = Form.useForm();

  // Load events
  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await eventService.getMyEvents();
      if (res.data.success) {
        setEvents(res.data.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải danh sách sự kiện');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Handle Event selection and load details (with speakers)
  const handleSelectEvent = async (eventVal) => {
    try {
      const res = await eventService.getEventDetails(eventVal.EventID);
      if (res.data.success) {
        setSelectedEvent(res.data.data);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Không thể tải chi tiết sự kiện');
    }
  };

  // Handle Create Event submission
  const handleCreateEvent = async (values) => {
    try {
      const res = await eventService.createEvent({
        title: values.title,
        description: values.description,
        startDate: values.startDate,
        endDate: values.endDate,
        maxParticipants: values.maxParticipants ? parseInt(values.maxParticipants) : null
      });

      if (res.data.success) {
        message.success('Tạo sự kiện thử nghiệm thành công!');
        setIsCreateEventOpen(false);
        eventForm.resetFields();
        loadEvents();
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi tạo sự kiện');
    }
  };

  // Handle Speaker registration
  const handleRegisterSpeaker = async (values) => {
    if (!selectedEvent) return;
    try {
      const res = await eventService.registerSpeaker(selectedEvent.EventID, {
        email: values.email,
        fullName: values.fullName,
        phone: values.phone,
        bio: values.bio,
        expertise: values.expertise,
        linkedInUrl: values.linkedInUrl,
        websiteUrl: values.websiteUrl
      });

      if (res.data.success) {
        message.success('Đăng ký tài khoản và gán diễn giả vào sự kiện thành công!');
        setIsRegisterSpeakerOpen(false);
        speakerForm.resetFields();
        // Reload details to get new speaker list
        handleSelectEvent(selectedEvent);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi đăng ký diễn giả');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusTag = (status) => {
    switch (status) {
      case 'Published': return <Tag color="success">Đã xuất bản</Tag>;
      case 'Draft': return <Tag color="default">Bản nháp</Tag>;
      case 'PendingApproval': return <Tag color="warning">Chờ duyệt</Tag>;
      case 'Cancelled': return <Tag color="error">Đã huỷ</Tag>;
      default: return <Tag color="blue">{status}</Tag>;
    }
  };

  const getApprovalStatusTag = (status) => {
    switch (status) {
      case 'Approved': return <Tag color="success">Đã duyệt</Tag>;
      case 'Pending': return <Tag color="warning">Chờ duyệt</Tag>;
      case 'Rejected': return <Tag color="error">Từ chối</Tag>;
      default: return <Tag color="default">{status}</Tag>;
    }
  };

  // Table columns for event list
  const columns = [
    {
      title: 'Tên sự kiện',
      dataIndex: 'Title',
      key: 'Title',
      render: (text, record) => (
        <a onClick={() => handleSelectEvent(record)} style={{ fontWeight: 600 }}>
          {text}
        </a>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'StartDate',
      key: 'StartDate',
      render: (text) => new Date(text).toLocaleString('vi-VN'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'Status',
      key: 'Status',
      render: (status) => getStatusTag(status),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sidebar */}
      <Sider width={280} style={{ background: '#001529' }} breakpoint="lg" collapsedWidth="0">
        <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 32, marginRight: 8 }}>🎓</span>
            <div>
              <Title level={4} style={{ color: '#fff', margin: 0 }}>EMS Portal</Title>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Nhà Tổ Chức</Text>
            </div>
          </div>
          
          <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />

          {/* Org Profile Info Card in Sider */}
          {user?.organizerProfile && (
            <Card 
              size="small"
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                borderColor: 'rgba(255,255,255,0.1)', 
                borderRadius: 8,
                marginBottom: 20
              }}
              bodyStyle={{ padding: 12 }}
            >
              <Title level={5} style={{ color: '#fff', margin: '0 0 8px 0', fontSize: 14 }}>
                <TeamOutlined style={{ marginRight: 6 }} /> {user.organizerProfile.organizationName}
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 8, maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.organizerProfile.description}
              </Paragraph>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                <Text style={{ color: 'rgba(255,255,255,0.45)' }}>Tài khoản:</Text>
                {getApprovalStatusTag(user.organizerProfile.approvalStatus)}
              </div>
              {user.organizerProfile.documentUrl && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <a href={user.organizerProfile.documentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#177ddc', display: 'inline-flex', alignItems: 'center' }}>
                    <FileDoneOutlined style={{ marginRight: 4 }} /> Hồ sơ xác minh
                  </a>
                </div>
              )}
            </Card>
          )}

          <div style={{ flexGrow: 1 }} />

          {/* User Profile / Logout */}
          <Card
            size="small"
            style={{ 
              background: 'rgba(255,255,255,0.03)', 
              borderColor: 'rgba(255,255,255,0.08)',
              borderRadius: 8
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ 
                width: 36, 
                height: 36, 
                borderRadius: '50%', 
                background: '#1890ff', 
                color: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginRight: 10,
                fontWeight: 'bold'
              }}>
                {user?.fullName?.charAt(0) || 'O'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <Text style={{ color: '#fff', fontWeight: 600, display: 'block' }}>{user?.fullName}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</Text>
              </div>
            </div>
            <Button 
              type="primary" 
              danger 
              icon={<LogoutOutlined />} 
              block 
              onClick={handleLogout}
            >
              Đăng xuất
            </Button>
          </Card>
        </div>
      </Sider>

      {/* Main Content Area */}
      <Layout style={{ padding: '0 24px 24px' }}>
        <Header style={{ background: 'transparent', padding: '16px 0', height: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>Quản lý sự kiện</Title>
            <Text type="secondary">Tạo sự kiện và đăng ký diễn giả đồng hành cùng sự kiện.</Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            size="large"
            onClick={() => setIsCreateEventOpen(true)}
            style={{ borderRadius: 8, height: 45, fontWeight: 600 }}
          >
            Tạo sự kiện thử nghiệm
          </Button>
        </Header>

        <Content style={{ margin: '8px 0 0' }}>
          <Row gutter={24}>
            {/* Events List */}
            <Col xs={24} lg={11}>
              <Card 
                title={
                  <Space>
                    <CalendarOutlined />
                    <span>Danh sách sự kiện của bạn ({events.length})</span>
                  </Space>
                }
                bordered={false} 
                style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', minHeight: 480 }}
              >
                <Table 
                  dataSource={events} 
                  columns={columns} 
                  rowKey="EventID" 
                  loading={loading}
                  pagination={{ pageSize: 6 }}
                  onRow={(record) => ({
                    onClick: () => handleSelectEvent(record),
                    style: { cursor: 'pointer' }
                  })}
                  locale={{ emptyText: <Empty description="Bạn chưa tạo sự kiện nào" /> }}
                />
              </Card>
            </Col>

            {/* Event Details and Speaker Management */}
            <Col xs={24} lg={13}>
              {selectedEvent ? (
                <Card 
                  bordered={false} 
                  style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', minHeight: 480 }}
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Space>
                        <Badge status="processing" />
                        <span style={{ fontWeight: 600 }}>Chi tiết: {selectedEvent.Title}</span>
                      </Space>
                      {getStatusTag(selectedEvent.Status)}
                    </div>
                  }
                >
                  <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="Thời gian diễn ra">
                      {new Date(selectedEvent.StartDate).toLocaleString('vi-VN')} - {new Date(selectedEvent.EndDate).toLocaleString('vi-VN')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Số người tham gia tối đa">
                      {selectedEvent.MaxParticipants ? `${selectedEvent.MaxParticipants} người` : 'Không giới hạn'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Mô tả sự kiện">
                      {selectedEvent.Description || <Text type="secondary">Không có mô tả</Text>}
                    </Descriptions.Item>
                  </Descriptions>

                  <Divider style={{ margin: '20px 0' }} />

                  {/* Speaker Section */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={4} style={{ margin: 0 }}>
                      <TeamOutlined style={{ marginRight: 8 }} />
                      Diễn giả tham gia ({selectedEvent.speakers?.length || 0})
                    </Title>
                    <Button 
                      type="dashed" 
                      icon={<UserAddOutlined />}
                      onClick={() => setIsRegisterSpeakerOpen(true)}
                    >
                      Đăng ký diễn giả
                    </Button>
                  </div>

                  {selectedEvent.speakers && selectedEvent.speakers.length > 0 ? (
                    <Row gutter={[16, 16]}>
                      {selectedEvent.speakers.map((speaker) => (
                        <Col span={24} key={speaker.UserID}>
                          <Card 
                            size="small" 
                            style={{ 
                              background: '#fafafa', 
                              borderRadius: 8, 
                              border: '1px solid #f0f0f0' 
                            }}
                          >
                            <Row align="middle" justify="space-between">
                              <Col>
                                <Title level={5} style={{ margin: '0 0 4px 0' }}>{speaker.FullName}</Title>
                                <Space size="middle" style={{ fontSize: 13, color: '#666' }}>
                                  <span><MailOutlined /> {speaker.Email}</span>
                                  {speaker.Phone && <span><PhoneOutlined /> {speaker.Phone}</span>}
                                </Space>
                                {speaker.Expertise && (
                                  <div style={{ marginTop: 4 }}>
                                    <Tag color="cyan">{speaker.Expertise}</Tag>
                                  </div>
                                )}
                                {speaker.Bio && (
                                  <Paragraph style={{ margin: '8px 0 0 0', fontSize: 13, color: '#555' }}>
                                    {speaker.Bio}
                                  </Paragraph>
                                )}
                              </Col>
                              <Col>
                                <Space direction="vertical" align="end">
                                  <Tag color="success">Đã tham gia</Tag>
                                  <Space>
                                    {speaker.LinkedInURL && (
                                      <Tooltip title="LinkedIn Profile">
                                        <a href={speaker.LinkedInURL} target="_blank" rel="noopener noreferrer" style={{ color: '#0e76a8' }}>
                                          <LinkedinOutlined style={{ fontSize: 18 }} />
                                        </a>
                                      </Tooltip>
                                    )}
                                    {speaker.WebsiteURL && (
                                      <Tooltip title="Website">
                                        <a href={speaker.WebsiteURL} target="_blank" rel="noopener noreferrer" style={{ color: '#555' }}>
                                          <GlobalOutlined style={{ fontSize: 18 }} />
                                        </a>
                                      </Tooltip>
                                    )}
                                  </Space>
                                </Space>
                              </Col>
                            </Row>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  ) : (
                    <Empty 
                      image={Empty.PRESENTED_IMAGE_SIMPLE} 
                      description="Sự kiện chưa có diễn giả nào. Nhấn nút Đăng ký diễn giả để thêm." 
                    />
                  )}
                </Card>
              ) : (
                <Card 
                  bordered={false} 
                  style={{ 
                    borderRadius: 12, 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    minHeight: 480
                  }}
                >
                  <Empty 
                    description={
                      <span>
                        <InfoCircleOutlined style={{ fontSize: 24, color: '#1890ff', display: 'block', marginBottom: 8 }} />
                        Chọn một sự kiện từ danh sách bên trái để xem chi tiết và quản lý diễn giả
                      </span>
                    } 
                  />
                </Card>
              )}
            </Col>
          </Row>
        </Content>
      </Layout>

      {/* MODAL: Create Event */}
      <Modal
        title="Tạo sự kiện thử nghiệm"
        open={isCreateEventOpen}
        onCancel={() => setIsCreateEventOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={eventForm}
          layout="vertical"
          onFinish={handleCreateEvent}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="title"
            label="Tiêu đề sự kiện"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề sự kiện' }]}
          >
            <Input placeholder="Ví dụ: Workshop Lập trình ReactJS cho Người mới bắt đầu" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả sự kiện"
          >
            <Input.TextArea placeholder="Mô tả tóm tắt nội dung sự kiện..." rows={4} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="Ngày bắt đầu"
                rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}
              >
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="Ngày kết thúc"
                rules={[{ required: true, message: 'Chọn ngày kết thúc' }]}
              >
                <Input type="datetime-local" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="maxParticipants"
            label="Số lượng người tham gia tối đa (tuỳ chọn)"
          >
            <Input type="number" placeholder="Ví dụ: 100" min={1} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsCreateEventOpen(false)}>Huỷ</Button>
              <Button type="primary" htmlType="submit">Tạo sự kiện</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL: Register Speaker */}
      <Modal
        title={selectedEvent ? `Đăng ký diễn giả cho: ${selectedEvent.Title}` : 'Đăng ký diễn giả'}
        open={isRegisterSpeakerOpen}
        onCancel={() => setIsRegisterSpeakerOpen(false)}
        footer={null}
        destroyOnClose
        width={600}
      >
        <Form
          form={speakerForm}
          layout="vertical"
          onFinish={handleRegisterSpeaker}
          style={{ marginTop: 16 }}
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            * Hệ thống sẽ tự động tạo tài khoản vai trò <strong>Diễn giả (Speaker)</strong> nếu email này chưa tồn tại trong hệ thống. Mật khẩu mặc định sẽ là <strong>Speaker@123</strong>.
          </Text>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email diễn giả"
                rules={[
                  { required: true, message: 'Vui lòng nhập email diễn giả' },
                  { type: 'email', message: 'Email không hợp lệ' }
                ]}
              >
                <Input placeholder="speaker@domain.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="fullName"
                label="Họ và tên diễn giả"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên diễn giả' }]}
              >
                <Input placeholder="Nguyễn Văn B" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="phone"
            label="Số điện thoại (tuỳ chọn)"
          >
            <Input placeholder="0901234567" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="expertise"
                label="Lĩnh vực chuyên môn / Chức danh"
              >
                <Input placeholder="Ví dụ: Software Engineer @ Google" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="linkedInUrl"
                label="LinkedIn URL"
                rules={[{ type: 'url', message: 'Vui lòng nhập một URL hợp lệ' }]}
              >
                <Input placeholder="https://linkedin.com/in/username" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="websiteUrl"
            label="Website Cá nhân (URL)"
            rules={[{ type: 'url', message: 'Vui lòng nhập một URL hợp lệ' }]}
          >
            <Input placeholder="https://mywebsite.com" />
          </Form.Item>

          <Form.Item
            name="bio"
            label="Tiểu sử / Giới thiệu ngắn"
          >
            <Input.TextArea placeholder="Giới thiệu tóm tắt kinh nghiệm, quá trình hoạt động..." rows={3} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsRegisterSpeakerOpen(false)}>Huỷ</Button>
              <Button type="primary" htmlType="submit" icon={<UserAddOutlined />}>Đăng ký diễn giả</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default OrganizerDashboard;
