import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Typography, Input, Button, message, Card, Result } from 'antd';
import { SafetyCertificateOutlined, CheckCircleFilled } from '@ant-design/icons';
import MainLayout from '../../components/layout/MainLayout';
import useAuthStore from '../../store/authStore';
import { staffService } from '../../services/staff.service';

const { Title, Text } = Typography;

const ParticipantCheckinPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const staffId = searchParams.get('staffId');
  const { isAuthenticated, user } = useAuthStore();
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCheckin = async () => {
    if (!isAuthenticated) {
      message.error('Vui lòng đăng nhập để check-in');
      navigate('/login', { state: { returnUrl: window.location.pathname + window.location.search } });
      return;
    }
    
    if (!otp || otp.length < 6) {
      message.error('Vui lòng nhập đủ mã OTP (6 ký tự)');
      return;
    }

    if (!staffId) {
      message.error('Đường dẫn Check-in không hợp lệ (Thiếu Staff ID)');
      return;
    }

    try {
      setLoading(true);
      await staffService.participantCheckinWithOTP(id, otp, staffId);
      setSuccess(true);
      
      // Countdown 3s then redirect
      setTimeout(() => {
        navigate('/');
      }, 3000);
      
    } catch (error) {
      message.error(error.message || 'Check-in thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>
        {success ? (
          <Result
            icon={<CheckCircleFilled style={{ color: '#10b981' }} />}
            title={<span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700 }}>Tham gia sự kiện thành công!</span>}
            subTitle="Chuyển hướng về trang chủ trong vài giây..."
            style={{ background: 'white', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
          />
        ) : (
          <Card style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: '32px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, color: '#3b82f6', marginBottom: 16 }}>
              <SafetyCertificateOutlined />
            </div>
            <Title level={3} style={{ fontFamily: 'Sora,sans-serif', marginBottom: 8 }}>
              Check-in Sự Kiện
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 32 }}>
              Nhập mã OTP gồm 6 ký tự để xác nhận tham gia sự kiện.
            </Text>

            <Input.OTP 
              size="large" 
              length={6} 
              value={otp} 
              onChange={setOtp}
              style={{ justifyContent: 'center', marginBottom: 32 }}
            />

            <Button 
              type="primary" 
              size="large" 
              block 
              loading={loading}
              onClick={handleCheckin}
              style={{ height: 48, borderRadius: 8, fontWeight: 600 }}
            >
              Xác Nhận Check-in
            </Button>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default ParticipantCheckinPage;
