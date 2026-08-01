import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, Checkbox, message, Divider } from 'antd';
import { MailOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { GoogleLogin } from '@react-oauth/google';
import useAuthStore from '../../store/authStore';
import './Auth.css';

// [Trang đăng nhập] Kích hoạt từ giao diện -> Gọi Store/API xử lý
const LoginPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, isLoading, isAuthenticated } = useAuthStore();
  const [rememberMe, setRememberMe] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  // [Xử lý gửi form đăng nhập] Kích hoạt từ giao diện -> Gọi Store/API xử lý
  const onFinish = async (values) => {
    console.log('🔐 [LOGIN SUBMIT] email:', values.email);
    const result = await login({ email: values.email, password: values.password });
    console.log('📨 [LOGIN RESULT]', result);
    if (result.success) {
      if (result.mustChangePassword) {
        message.warning('Vui lòng cập nhật mật khẩu trong lần đăng nhập đầu tiên');
        navigate('/speaker/first-time-setup', { state: { userId: result.user.userId, email: result.user.email } });
        return;
      }
      message.success('Đăng nhập thành công!');
      const role = result.user?.role || '';
      console.log('✅ Logged in as:', role);
      // Redirect based on role
      const dest = role === 'Admin' ? '/admin'
                 : role === 'Organizer' ? '/organizer/events'
                 : role === 'Participant' ? '/'
                 : role === 'Speaker' ? '/my-calendar'
                 : role === 'Staff' ? '/'
                 : from === '/dashboard' ? '/' : from;
      navigate(dest, { replace: true });
    } else {
      console.error('❌ Login failed:', result.message);
      if (result.code === 'REJECTED_ORGANIZER') {
        message.error({
          content: (
            <span>
              {result.message}{' '}
              <Button type="link" size="small" onClick={() => navigate('/register', { state: { isEditRejected: true, prefillData: result.user, reason: result.reason } })} style={{ padding: 0 }}>
                [Sửa hồ sơ]
              </Button>
            </span>
          ),
          duration: 10,
        });
      } else {
        message.error(result.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    }
  };

  // [Xử lý đăng nhập Google thành công] Kích hoạt từ giao diện -> Gọi Store/API xử lý
  const handleGoogleSuccess = async (credentialResponse) => {
    console.log('Google Login Success', credentialResponse);
    const result = await googleLogin(credentialResponse.credential);
    if (result.success) {
      message.success('Đăng nhập bằng Google thành công!');
      const role = result.user?.role || '';
      const dest = role === 'Admin' ? '/admin'
                 : role === 'Organizer' ? '/organizer/events'
                 : role === 'Participant' ? '/'
                 : role === 'Speaker' ? '/my-calendar'
                 : role === 'Staff' ? '/'
                 : from === '/dashboard' ? '/' : from;
      navigate(dest, { replace: true });
    } else {
      message.error(result.message || 'Đăng nhập Google thất bại');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">🎓</span>
            <span className="logo-text">EMS</span>
          </div>
          <h1 className="auth-tagline">
            Quản lý sự kiện<br />
            <span className="gradient-text">thông minh hơn</span>
          </h1>
          <p className="auth-description">
            Nền tảng quản lý sự kiện dành cho cộng đồng đại học — từ đăng ký đến check-in, tất cả trong một.
          </p>
          <div className="auth-features">
            {[
              { icon: '📅', text: 'Quản lý lịch sự kiện cá nhân' },
              { icon: '📲', text: 'Check-in bằng QR Code + OTP' },
              { icon: '📊', text: 'Báo cáo & thống kê thời gian thực' },
            ].map((f, i) => (
              <div key={i} className="auth-feature-item">
                <span className="feature-icon">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-left-deco">
          <div className="deco-circle deco-1" />
          <div className="deco-circle deco-2" />
          <div className="deco-circle deco-3" />
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <Button type="link" onClick={() => navigate('/')} style={{ padding: 0, marginBottom: 16, color: '#6b7280' }}>
              ← Về trang chủ
            </Button>
            <h2>Đăng nhập</h2>
            <p>Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục.</p>
          </div>

          <Form
            form={form}
            name="login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            requiredMark={false}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input
                prefix={<MailOutlined className="input-icon" />}
                placeholder="example@email.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="input-icon" />}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <div className="auth-form-options">
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              >
                Ghi nhớ đăng nhập
              </Checkbox>
              <Link to="/forgot-password" className="auth-link">
                Quên mật khẩu?
              </Link>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                block
                className="auth-submit-btn"
              >
                {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </Button>
            </Form.Item>
          </Form>

          <Divider plain>
            <span className="divider-text">Hoặc đăng nhập bằng</span>
          </Divider>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                message.error('Đăng nhập Google thất bại');
              }}
              useOneTap
            />
          </div>

          <Divider plain>
            <span className="divider-text">Chưa có tài khoản?</span>
          </Divider>

          <Link to="/register">
            <Button block size="large" className="auth-secondary-btn">
              Đăng ký ngay
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
