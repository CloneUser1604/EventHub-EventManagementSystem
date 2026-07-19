import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, Calendar, Badge, Typography, List, Tag, Modal, Input, Button, message } from 'antd';
import { CalendarOutlined, TagsOutlined, HistoryOutlined, ScanOutlined } from '@ant-design/icons';
import useAuthStore from '../../store/authStore';
import api from '../../utils/axiosConfig';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

const ParticipantDashboard = () => {
  const { user } = useAuthStore();
  const [selectedKey, setSelectedKey] = useState('calendar');
  const [isCheckinModalVisible, setIsCheckinModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [staffToken, setStaffToken] = useState('');

  // MOCK DATA (Thay bằng API call trong thực tế)
  const events = [
    { id: 1, title: 'AI in Healthcare', date: dayjs().add(2, 'day'), status: 'Registered', otp: '123456' },
    { id: 2, title: 'Web Development Workshop', date: dayjs().add(5, 'day'), status: 'Registered', otp: '654321' },
    { id: 3, title: 'Tech Career Fair', date: dayjs().subtract(10, 'day'), status: 'Attended' },
  ];

  const handleCheckin = async () => {
    if (!otpCode || !staffToken) {
      return message.error('Vui lòng nhập Token của Staff và OTP');
    }
    try {
      const res = await api.post('/checkin/verify', { qrToken: staffToken, otpCode });
      if (res.data.success) {
        message.success('Check-in thành công!');
        setIsCheckinModalVisible(false);
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Check-in thất bại');
    }
  };

  const getListData = (value) => {
    let listData = [];
    events.forEach(event => {
      if (value.isSame(event.date, 'day')) {
        listData.push({ type: 'success', content: event.title });
      }
    });
    return listData || [];
  };

  const dateCellRender = (value) => {
    const listData = getListData(value);
    return (
      <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
        {listData.map((item, index) => (
          <li key={index}>
            <Badge status={item.type} text={item.content} style={{ fontSize: '12px' }} />
          </li>
        ))}
      </ul>
    );
  };

  const renderContent = () => {
    switch (selectedKey) {
      case 'calendar':
        return (
          <Card title="Lịch cá nhân" bordered={false} className="shadow-card">
            <Calendar dateCellRender={dateCellRender} />
          </Card>
        );
      case 'tickets':
        return (
          <Card title="Vé của tôi" bordered={false} className="shadow-card">
            <List
              grid={{ gutter: 16, column: 2 }}
              dataSource={events.filter(e => e.status === 'Registered')}
              renderItem={item => (
                <List.Item>
                  <Card 
                    hoverable 
                    title={item.title} 
                    extra={<Tag color="blue">Sắp diễn ra</Tag>}
                    actions={[
                      <Button type="primary" onClick={() => setIsCheckinModalVisible(true)}>Check-in</Button>
                    ]}
                  >
                    <p><strong>Ngày:</strong> {item.date.format('DD/MM/YYYY HH:mm')}</p>
                    <div style={{ textAlign: 'center', marginTop: 16, padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
                      <Text type="secondary">Mã OTP Check-in</Text>
                      <Title level={2} style={{ margin: 0, letterSpacing: '4px', color: '#2563eb' }}>{item.otp}</Title>
                    </div>
                  </Card>
                </List.Item>
              )}
            />
          </Card>
        );
      case 'history':
        return (
          <Card title="Lịch sử tham gia" bordered={false} className="shadow-card">
            <List
              itemLayout="horizontal"
              dataSource={events.filter(e => e.status === 'Attended' || e.status === 'Cancelled')}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    title={item.title}
                    description={item.date.format('DD/MM/YYYY')}
                  />
                  <div>
                    <Tag color={item.status === 'Attended' ? 'green' : 'red'}>
                      {item.status === 'Attended' ? 'Đã tham gia' : 'Đã huỷ'}
                    </Tag>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Sider width={250} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <Title level={4} style={{ margin: 0, color: '#2563eb' }}>Participant Portal</Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={(e) => setSelectedKey(e.key)}
          style={{ borderRight: 0 }}
          items={[
            { key: 'calendar', icon: <CalendarOutlined />, label: 'Lịch cá nhân' },
            { key: 'tickets', icon: <TagsOutlined />, label: 'Vé của tôi' },
            { key: 'history', icon: <HistoryOutlined />, label: 'Lịch sử' },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ marginRight: 16 }}>Xin chào, <strong>{user?.fullName}</strong></span>
        </Header>
        <Content style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          {renderContent()}
        </Content>
      </Layout>

      <Modal
        title="Check-in Sự Kiện"
        open={isCheckinModalVisible}
        onOk={handleCheckin}
        onCancel={() => setIsCheckinModalVisible(false)}
        okText="Check-in"
        cancelText="Đóng"
      >
        <p>Vui lòng nhập mã Token (quét từ Staff) và mã OTP của bạn để check-in.</p>
        <div style={{ marginBottom: 16 }}>
          <Text strong>Staff Token</Text>
          <Input 
            placeholder="Nhập hoặc dán token của Staff..." 
            value={staffToken} 
            onChange={(e) => setStaffToken(e.target.value)} 
          />
        </div>
        <div>
          <Text strong>Mã OTP của bạn</Text>
          <Input 
            placeholder="Nhập mã OTP 6 số" 
            value={otpCode} 
            onChange={(e) => setOtpCode(e.target.value)} 
            maxLength={6}
          />
        </div>
      </Modal>
    </Layout>
  );
};

export default ParticipantDashboard;
