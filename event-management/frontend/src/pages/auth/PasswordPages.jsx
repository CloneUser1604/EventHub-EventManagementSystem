import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Input, Button, message, Result } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { authService } from '../../services/auth.service';
import './Auth.css';

// ─── Forgot Password ───────────────────────────────────────────
export const ForgotPasswordPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onFinish = async ({ email }) => {
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      message.error(err.response?.data?.message || 'Yêu cầu thất bại. Thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-page auth-page--center">
        <div className="auth-card">
          <Result
            icon={<div style={{ fontSize: 64 }}>📬</div>}
            title="Kiểm tra email của bạn"
            subTitle="Nếu email tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Kiểm tra cả thư mục Spam."
            extra={
              <Link to="/login">
                <Button type="primary" size="large" className="auth-submit-btn">
                  Quay lại đăng nhập
                </Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page auth-page--center">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-logo" style={{ marginBottom: 16 }}>
            <span className="logo-icon">🎓</span>
            <span className="logo-text">EMS</span>
          </div>
          <h2>Quên mật khẩu?</h2>
          <p>Nhập email đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu cho bạn.</p>
        </div>

        <Form form={form} onFinish={onFinish} layout="vertical" size="large" requiredMark={false}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input prefix={<MailOutlined className="input-icon" />} placeholder="example@email.com" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block className="auth-submit-btn">
              {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
            </Button>
          </Form.Item>
        </Form>

        <div className="auth-footer-text" style={{ textAlign: 'center' }}>
          <Link to="/login" className="auth-link">← Quay lại đăng nhập</Link>
        </div>
      </div>
    </div>
  );
};

// ─── Reset Password ────────────────────────────────────────────
export const ResetPasswordPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = new URLSearchParams(window.location.search).get('token');

  const onFinish = async ({ password, confirmPassword }) => {
    if (!token) return message.error('Token không hợp lệ');
    setLoading(true);
    try {
      await authService.resetPassword({ token, password, confirmPassword });
      setSuccess(true);
    } catch (err) {
      message.error(err.response?.data?.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page auth-page--center">
        <div className="auth-card">
          <Result status="error" title="Token không hợp lệ" subTitle="Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." extra={<Link to="/forgot-password"><Button type="primary">Yêu cầu lại</Button></Link>} />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-page auth-page--center">
        <div className="auth-card">
          <Result
            icon={<div style={{ fontSize: 64 }}>✅</div>}
            title="Đặt lại mật khẩu thành công!"
            subTitle="Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập với mật khẩu mới."
            extra={<Link to="/login"><Button type="primary" size="large" className="auth-submit-btn">Đăng nhập ngay</Button></Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page auth-page--center">
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-logo" style={{ marginBottom: 16 }}>
            <span className="logo-icon">🎓</span>
            <span className="logo-text">EMS</span>
          </div>
          <h2>Đặt lại mật khẩu</h2>
          <p>Tạo mật khẩu mới cho tài khoản của bạn.</p>
        </div>

        <Form form={form} onFinish={onFinish} layout="vertical" size="large" requiredMark={false}>
          <Form.Item
            name="password"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 8, message: 'Mật khẩu phải ít nhất 8 ký tự' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Mật khẩu phải có chữ hoa, chữ thường và số',
              },
            ]}
          >
            <Input.Password placeholder="Tối thiểu 8 ký tự" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Mật khẩu không khớp'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block className="auth-submit-btn">
              {loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};
