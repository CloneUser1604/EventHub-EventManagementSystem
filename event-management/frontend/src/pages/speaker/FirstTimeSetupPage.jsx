import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, Space, message, Spin, Alert, Divider } from 'antd';
import { LockOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const FirstTimeSetupPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [responses, setResponses] = useState({}); // { eventId: boolean }

  const userId = location.state?.userId;

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }

    const fetchInvitation = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/speaker/${userId}/pending-invitation`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setInvitations(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch invitation:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [userId, navigate]);

  const onFinish = async (values) => {
    // Kiem tra xem da tra loi het loi moi chua
    for (const inv of invitations) {
      if (responses[inv.EventID] === undefined) {
        return message.warning('Vui lòng phản hồi tất cả lời mời tham gia sự kiện trước khi tiếp tục.');
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        newPassword: values.newPassword,
        responses: Object.entries(responses).map(([eventId, accept]) => ({ eventId, accept }))
      };

      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/speaker/${userId}/first-time-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        message.success('Cập nhật tài khoản thành công! Vui lòng đăng nhập lại.');
        navigate('/login', { replace: true });
      } else {
        message.error(data.message || 'Cập nhật thất bại');
      }
    } catch (err) {
      message.error('Lỗi kết nối đến máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f3f4f6' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f3f4f6', padding: 20 }}>
      <Card style={{ width: '100%', maxWidth: 500, borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0, fontFamily: 'Arial, Helvetica, sans-serif' }}>Thiết lập tài khoản</Title>
          <Text type="secondary">Chào mừng bạn! Vui lòng hoàn thành thiết lập cho lần đầu đăng nhập.</Text>
        </div>

        {invitations.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            {invitations.map(inv => (
              <div key={inv.EventID} style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 12 }}>
                <Title level={5} style={{ marginTop: 0 }}>Thư mời làm Diễn giả</Title>
                <Text>Bạn đã được mời tham gia sự kiện: <br/><strong>{inv.Title}</strong></Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Thời gian: {dayjs(inv.StartDate).format('DD/MM/YYYY')} - {dayjs(inv.EndDate).format('DD/MM/YYYY')}
                </Text>
                
                <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                  <Button 
                    type={responses[inv.EventID] === true ? 'primary' : 'default'} 
                    icon={<CheckCircleOutlined />}
                    onClick={() => setResponses(prev => ({ ...prev, [inv.EventID]: true }))}
                    style={{ flex: 1 }}
                  >
                    Đồng ý tham gia
                  </Button>
                  <Button 
                    danger={responses[inv.EventID] === false}
                    type={responses[inv.EventID] === false ? 'primary' : 'default'}
                    icon={<CloseCircleOutlined />}
                    onClick={() => setResponses(prev => ({ ...prev, [inv.EventID]: false }))}
                    style={{ flex: 1 }}
                  >
                    Từ chối
                  </Button>
                </div>
                {responses[inv.EventID] !== undefined && (
                  <div style={{ marginTop: 12, textAlign: 'center' }}>
                    <Text type={responses[inv.EventID] ? 'success' : 'danger'} strong>
                      Bạn đã chọn: {responses[inv.EventID] ? 'Đồng ý' : 'Từ chối'}
                    </Text>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <Divider>Đổi mật khẩu bảo mật</Divider>

        <Form layout="vertical" onFinish={onFinish} form={form}>
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 8, message: 'Mật khẩu phải từ 8 ký tự trở lên' },
              { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Phải chứa chữ hoa, chữ thường và số' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu mới" size="large" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Nhập lại mật khẩu"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu" size="large" />
          </Form.Item>

          <Button 
            type="primary" 
            htmlType="submit" 
            block 
            size="large" 
            loading={submitting}
            style={{ marginTop: 12, height: 44, borderRadius: 8, fontWeight: 600 }}
          >
            Cập nhật & Bắt đầu sử dụng
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default FirstTimeSetupPage;
