import React, { useState } from 'react';
import { Card, Button, Typography, message, Spin } from 'antd';
import { QrcodeOutlined, ReloadOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api';

const { Title, Text } = Typography;

const StaffDashboard = () => {
  const [qrToken, setQrToken] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Hardcode tạm eventId để test (Trong thực tế staff chọn sự kiện từ danh sách)
  const mockEventId = 1;

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

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <Title level={2}>Dành cho Staff (Nhân viên điểm danh)</Title>
      <Text type="secondary">Vui lòng sinh mã QR Code phiên làm việc của bạn. Người tham gia sẽ quét mã này và nhập OTP để điểm danh.</Text>
      
      <Card style={{ marginTop: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        {!qrToken ? (
          <div style={{ padding: '40px 0' }}>
            <QrcodeOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '16px' }} />
            <div>
              <Button type="primary" size="large" onClick={generateStaffSession} loading={loading}>
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
              <Button icon={<ReloadOutlined />} onClick={generateStaffSession} loading={loading}>
                Làm mới mã QR (Hết hạn sau 24h)
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StaffDashboard;
