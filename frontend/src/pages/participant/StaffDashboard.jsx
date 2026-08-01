import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, message, Table, Tag, Avatar, Select, Empty } from 'antd';
import { QrcodeOutlined, ReloadOutlined } from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../utils/axiosConfig';
import { staffService } from '../../services/staff.service';

const { Title, Text } = Typography;

// [Bảng điều khiển dành cho nhân viên] Kích hoạt từ giao diện -> Gọi Store/API xử lý
const StaffDashboard = () => {
  const [qrToken, setQrToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [myEvents, setMyEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);

  useEffect(() => {
    staffService.getMyEvents().then(res => {
      if (res.data) {
        setMyEvents(res.data);
      }
    }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    
    fetchParticipants();
    const interval = setInterval(fetchParticipants, 10000);
    return () => clearInterval(interval);
  }, [selectedEventId]);

  // [Lấy danh sách tham gia để điểm danh] Kích hoạt từ giao diện -> Gọi Store/API xử lý
  const fetchParticipants = async () => {
    if (!selectedEventId) return;
    setLoadingParticipants(true);
    try {
      const res = await api.get(`/staff/events/${selectedEventId}/participants`);
      if (res.data.success) {
        setParticipants(res.data.data);
      }
    } catch (err) {
      // message.error('Không thể tải danh sách người tham gia');
    } finally {
      setLoadingParticipants(false);
    }
  };

  // [Tạo mã phiên làm việc cho nhân viên] Kích hoạt từ giao diện -> Gọi Store/API xử lý
  const generateStaffSession = async () => {
    if (!selectedEventId) {
      message.error('Vui lòng chọn sự kiện trước');
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/staff/session/${selectedEventId}`);
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

      <div style={{ marginTop: '24px', textAlign: 'left' }}>
        <Text strong>Chọn sự kiện: </Text>
        <Select
          style={{ width: 300 }}
          placeholder="Chọn sự kiện để điểm danh"
          value={selectedEventId}
          onChange={(val) => { setSelectedEventId(val); setQrToken(null); }}
        >
          {myEvents.map(e => (
            <Select.Option key={e.EventID} value={e.EventID}>{e.Title}</Select.Option>
          ))}
        </Select>
      </div>
      
      {selectedEventId ? (
        <>
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
        </>
      ) : (
        <div style={{ marginTop: 40 }}>
          <Empty description="Vui lòng chọn sự kiện ở trên để bắt đầu" />
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
