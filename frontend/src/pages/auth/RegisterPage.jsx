import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Form, Input, Button, Select, message, Steps, Result
} from 'antd';
import {
  UserOutlined, MailOutlined, LockOutlined,
  PhoneOutlined, TeamOutlined
} from '@ant-design/icons';
import useAuthStore from '../../store/authStore';
import './Auth.css';

const { Option } = Select;

const ROLES = [
  { value: 'Participant', label: '🎓 Người tham dự', desc: 'Đăng ký và tham gia sự kiện' },
  { value: 'Organizer', label: '🏢 Ban tổ chức', desc: 'Tạo và quản lý sự kiện' },
  { value: 'Speaker', label: '🎤 Diễn giả', desc: 'Tham gia diễn thuyết tại sự kiện' },
];

const RegisterPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState('Participant');
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const onFinish = async (values) => {
    const payload = {
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      role: values.role || 'Participant',
      phone: values.phone || undefined,
      organizationName: values.organizationName || undefined,
      description: values.description || undefined,
      documentUrl: values.documentUrl || undefined,
    };

    const result = await register(payload);
    if (result.success) {
      setRegisteredEmail(values.email);
      setIsSuccess(true);
    } else {
      if (result.errors) {
        result.errors.forEach((e) => message.error(e.message));
      } else {
        message.error(result.message);
      }
    }
  };

  if (isSuccess) {
    return (
      <div className="auth-page auth-page--center">
        <div className="auth-card auth-card--wide">
          <Result
            status="success"
            icon={<div style={{ fontSize: 64 }}>📧</div>}
            title="Đăng ký thành công!"
            subTitle={
              <div>
                <p>Chúng tôi đã gửi email xác thực đến <strong>{registeredEmail}</strong></p>
                <p>Vui lòng kiểm tra hộp thư và nhấn vào liên kết xác thực để kích hoạt tài khoản.</p>
              </div>
            }
            extra={[
              <Button key="login" type="primary" size="large" onClick={() => navigate('/login')} className="auth-submit-btn">
                Về trang đăng nhập
              </Button>,
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-logo">
            <span className="logo-icon">🎓</span>
            <span className="logo-text">EMS</span>
          </div>
          <h1 className="auth-tagline">
            Tham gia cộng đồng<br />
            <span className="gradient-text">sự kiện đại học</span>
          </h1>
          <p className="auth-description">
            Đăng ký tài khoản để khám phá hàng trăm sự kiện thú vị, kết nối với cộng đồng sinh viên và phát triển bản thân.
          </p>
          <div className="auth-steps-preview">
            {[
              'Tạo tài khoản',
              'Xác thực email',
              'Khám phá sự kiện',
            ].map((step, i) => (
              <div key={i} className="step-preview-item">
                <div className="step-number">{i + 1}</div>
                <span>{step}</span>
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

      <div className="auth-right auth-right--scroll">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Tạo tài khoản</h2>
            <p>Điền thông tin bên dưới để bắt đầu hành trình của bạn.</p>
          </div>

          <Form
            form={form}
            name="register"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            requiredMark={false}
            initialValues={{ role: 'Participant' }}
          >
            {/* Role Selection */}
            <Form.Item name="role" label="Bạn là ai?">
              <div className="role-selector">
                {ROLES.map((r) => (
                  <div
                    key={r.value}
                    className={`role-card ${selectedRole === r.value ? 'role-card--active' : ''}`}
                    onClick={() => {
                      setSelectedRole(r.value);
                      form.setFieldValue('role', r.value);
                    }}
                  >
                    <div className="role-label">{r.label}</div>
                    <div className="role-desc">{r.desc}</div>
                  </div>
                ))}
              </div>
            </Form.Item>

            <Form.Item
              name="fullName"
              label="Họ và tên"
              rules={[
                { required: true, message: 'Vui lòng nhập họ tên' },
                { min: 2, message: 'Họ tên phải ít nhất 2 ký tự' },
              ]}
            >
              <Input prefix={<UserOutlined className="input-icon" />} placeholder="Nguyễn Văn A" />
            </Form.Item>

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

            <Form.Item
              name="phone"
              label="Số điện thoại (tuỳ chọn)"
            >
              <Input prefix={<PhoneOutlined className="input-icon" />} placeholder="0912345678" />
            </Form.Item>

            {selectedRole === 'Organizer' && (
              <>
                <Form.Item
                  name="organizationName"
                  label="Tên tổ chức / CLB"
                  rules={[{ required: true, message: 'Vui lòng nhập tên tổ chức' }]}
                >
                  <Input prefix={<TeamOutlined className="input-icon" />} placeholder="CLB Công nghệ thông tin" />
                </Form.Item>

                <Form.Item
                  name="description"
                  label="Mô tả hoạt động tổ chức"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mô tả hoạt động' },
                    { min: 10, message: 'Mô tả hoạt động phải ít nhất 10 ký tự' }
                  ]}
                >
                  <Input.TextArea 
                    placeholder="Mô tả tóm tắt về CLB/Tổ chức của bạn, các sự kiện thường tổ chức..." 
                    rows={4} 
                  />
                </Form.Item>

                <Form.Item
                  name="documentUrl"
                  label="Thư mục/Tài liệu xác minh (URL)"
                  rules={[
                    { required: true, message: 'Vui lòng nhập đường dẫn thư mục/tài liệu xác minh' },
                    { type: 'url', message: 'Vui lòng nhập một URL hợp lệ' }
                  ]}
                >
                  <Input placeholder="Ví dụ: Link Google Drive chứa quyết định thành lập hoặc tài liệu liên quan" />
                </Form.Item>
              </>
            )}

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu' },
                { min: 8, message: 'Mật khẩu phải ít nhất 8 ký tự' },
                {
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'Mật khẩu phải có chữ hoa, chữ thường và số',
                },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="input-icon" />}
                placeholder="Tối thiểu 8 ký tự, có hoa + thường + số"
              />
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
                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="input-icon" />}
                placeholder="Nhập lại mật khẩu"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                block
                className="auth-submit-btn"
              >
                {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
              </Button>
            </Form.Item>

            <div className="auth-footer-text">
              Đã có tài khoản?{' '}
              <Link to="/login" className="auth-link">
                Đăng nhập ngay
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
