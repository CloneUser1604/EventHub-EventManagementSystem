import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, message, Table, Tag, Avatar } from 'antd';
import { QrcodeOutlined, ReloadOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api';

const { Title, Text } = Typography;

const StaffDashboard = () => {
  const [qrToken, setQrToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  
  // Hardcode tạm eventId để test (Trong thực tế staff chọn sự kiện từ danh sách)
  const mockEventId = 1;

  useEffect(() => {
    fetchParticipants();
    // Tạo 1 interval cập nhật danh sách mỗi 10 giây (nếu đang ở màn hình này)
    const interval = setInterval(fetchParticipants, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchParticipants = async () => {
    setLoadingParticipants(true);
    try {
      const res = await api.get(`/staff/events/${mockEventId}/participants`);
      if (res.data.success) {
        setParticipants(res.data.data);
      }
    } catch (err) {
      // message.error('Không thể tải danh sách người tham gia');
    } finally {
      setLoadingParticipants(false);
    }
  };

  const generateStaffSession = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/staff/session/${mockEventId}`);
      if (res.data.success) {
        setQrToken(res.data.data.qrToken);
        message.success('Đã tạo phiên check-in mới!');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'Tạo phiên check-in thất bại');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'Người tham dự', render: (_, r) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
        <Avatar style={{ background: '#2563eb' }}>{r.FullName?.[0]}</Avatar>
        <div>
          <Text strong style={{ display: 'block' }}>{r.FullName}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.Email}</Text>
        </div>
      </div>
    )},
    { title: 'Mã vé', dataIndex: 'RegistrationID', render: v => `EMS-${v}` },
    { title: 'Trạng thái Check-in', dataIndex: 'AttendanceStatus', render: s => s === 'Present' ? <Tag color="green">Đã Check-in</Tag> : <Tag color="default">Chưa Check-in</Tag> }
  ];

  return (
    <div style={{ padding: '40px 24px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
      <Title level={2} style={{ fontFamily: "'Inter', sans-serif" }}>Dành cho Staff (Nhân viên điểm danh)</Title>
      <Text type="secondary">Vui lòng sinh mã QR Code phiên làm việc của bạn. Người tham gia sẽ quét mã này và nhập OTP để điểm danh.</Text>
      
      <Card style={{ marginTop: '24px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        {!qrToken ? (
          <div style={{ padding: '40px 0' }}>
            <QrcodeOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '16px' }} />
            <div>
              <Button type="primary" size="large" onClick={generateStaffSession} loading={loading} style={{ borderRadius: 8 }}>
                Bắt đầu phiên Check-in
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '20px 0' }}>
            <div style={{ background: '#fff', padding: '16px', display: 'inline-block', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
              <QRCodeSVG value={qrToken} size={250} level="H" />
            </div>
            <div style={{ marginTop: '24px' }}>
              <Button icon={<ReloadOutlined />} onClick={generateStaffSession} loading={loading} style={{ borderRadius: 8 }}>
                Làm mới mã QR (Hết hạn sau 24h)
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div style={{ marginTop: '40px', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={4} style={{ fontFamily: "'Inter', sans-serif", margin: 0 }}>Danh sách Người tham gia</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchParticipants} loading={loadingParticipants}>Làm mới</Button>
        </div>
        <Table 
          columns={columns} 
          dataSource={participants} 
          rowKey="RegistrationID"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 600 }}
          loading={loadingParticipants}
          style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}
          locale={{ emptyText: 'Chưa có người tham dự' }}
        />
      </div>
    </div>
  );
};

export default StaffDashboard;
