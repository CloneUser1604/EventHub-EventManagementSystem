import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, Upload, message, Result, Typography, Radio, Alert } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, PhoneOutlined, TeamOutlined, InboxOutlined } from '@ant-design/icons';
import { GoogleLogin } from '@react-oauth/google';
import useAuthStore from '../../store/authStore';
import './Auth.css';

const { Text } = Typography;
const { Dragger } = Upload;
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ROLES = [
  {
    value: 'Participant',
    emoji: '🎓',
    label: 'Người tham dự',
    desc: 'Đăng ký và tham gia sự kiện. Kích hoạt ngay sau xác thực email.',
  },
  {
    value: 'Organizer',
    emoji: '🏢',
    label: 'Ban tổ chức',
    desc: 'Tạo và quản lý sự kiện. Cần Admin phê duyệt hồ sơ.',
  },
];

const RegisterPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { isEditRejected, prefillData, reason } = location.state || {};
  const { googleLogin } = useAuthStore();

  const [role, setRole] = useState(isEditRejected ? 'Organizer' : 'Participant');
  const [isUniversityStudent, setIsUniversityStudent] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState({ done: false, email: '', message: '' });

  useEffect(() => {
    if (isEditRejected && prefillData) {
      form.setFieldsValue({
        email: prefillData.email,
        fullName: prefillData.fullName,
        phone: prefillData.phone,
        organizationName: prefillData.organizationName,
      });
      // The user must enter password, so we don't prefill password
    }
  }, [isEditRejected, prefillData, form]);

  const onFinish = async (values) => {
    if (role === 'Organizer' && fileList.length === 0) {
      return message.error('Ban tổ chức cần upload ít nhất 1 tài liệu xác minh');
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('fullName', values.fullName);
      formData.append('email', values.email);
      formData.append('password', values.password);
      formData.append('role', role);
      if (values.phone) formData.append('phone', values.phone);
      if (role === 'Participant' && isUniversityStudent) {
        formData.append('university', 'Đại học FPT');
      }
      if (role === 'Organizer') {
        formData.append('organizationName', values.organizationName);
        fileList.forEach(f => formData.append('documents', f.originFileObj));
      }

      const endpoint = isEditRejected ? '/auth/resubmit-organizer' : '/auth/register';
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setSuccess({ done: true, email: values.email, message: data.message, isOrganizer: role === 'Organizer' });
      } else {
        if (data.errors) data.errors.forEach(e => message.error(e.message));
        else message.error(data.message || 'Đăng ký thất bại');
      }
    } catch {
      message.error('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    console.log('Google Login/Register Success', credentialResponse);
    const result = await googleLogin(credentialResponse.credential);
    if (result.success) {
      message.success('Đăng nhập/Đăng ký bằng Google thành công!');
      const role = result.user?.role || '';
      const dest = role === 'Admin' ? '/admin'
                 : role === 'Organizer' ? '/organizer/events'
                 : role === 'Participant' ? '/'
                 : role === 'Speaker' ? '/my-calendar'
                 : role === 'Staff' ? '/'
                 : '/';
      navigate(dest, { replace: true });
    } else {
      message.error(result.message || 'Đăng nhập Google thất bại');
    }
  };

  if (success.done) {
    return (
      <div className="auth-page auth-page--center">
        <div className="auth-card auth-card--wide">
          <Result
            icon={<div style={{ fontSize: 64 }}>📧</div>}
            title="Đăng ký thành công!"
            subTitle={
              <div>
                <p>{success.message}</p>
                {success.isOrganizer && (
                  <div style={{ marginTop: 12, padding: '12px 16px', background: '#fef3c7', borderRadius: 8, border: '1px solid #f59e0b' }}>
                    <p style={{ fontWeight: 600, color: '#92400e', marginBottom: 4 }}>⏳ Tài khoản Ban tổ chức</p>
                    <p style={{ color: '#92400e', fontSize: 13 }}>Admin sẽ xem xét hồ sơ của bạn. Bạn có thể đăng nhập ngay nhưng cần được duyệt để tạo sự kiện.</p>
                  </div>
                )}
              </div>
            }
            extra={
              <Button type="primary" size="large" onClick={() => navigate('/login')} className="auth-submit-btn">
                Về trang đăng nhập
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">🎓</span>
            <span className="logo-text">EMS</span>
          </div>
          <h1 className="auth-tagline">
            Tham gia cộng đồng<br />
            <span className="gradient-text">sự kiện đại học</span>
          </h1>
          <p className="auth-description">
            Đăng ký để khám phá hàng trăm sự kiện thú vị và kết nối với cộng đồng sinh viên.
          </p>
          <div className="auth-steps-preview">
            {['Tạo tài khoản', 'Xác thực email', 'Khám phá sự kiện'].map((s, i) => (
              <div key={i} className="step-preview-item">
                <div className="step-number">{i + 1}</div>
                <span>{s}</span>
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

      {/* Right panel */}
      <div className="auth-right auth-right--scroll">
        <div className="auth-card">
          <div className="auth-card-header">
            <Button type="link" onClick={() => navigate('/')} style={{ padding: 0, marginBottom: 16, color: '#6b7280' }}>
              ← Về trang chủ
            </Button>
            <h2>{isEditRejected ? 'Sửa hồ sơ Ban tổ chức' : 'Tạo tài khoản'}</h2>
            <p>{isEditRejected ? 'Cập nhật lại thông tin và giấy tờ để nộp lại hồ sơ.' : 'Chọn loại tài khoản phù hợp với bạn.'}</p>
          </div>

          {isEditRejected && (
            <Alert
              message="Hồ sơ bị từ chối"
              description={reason}
              type="error"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          {/* Role selector */}
          {!isEditRejected && (
            <div className="role-selector" style={{ marginBottom: 24 }}>
            {ROLES.map(r => (
              <div key={r.value}
                className={`role-card ${role === r.value ? 'role-card--active' : ''}`}
                onClick={() => { setRole(r.value); setFileList([]); }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>{r.emoji}</div>
                <div className="role-label">{r.label}</div>
                <div className="role-desc">{r.desc}</div>
              </div>
            ))}
          </div>
          )}

          <Form form={form} layout="vertical" onFinish={onFinish} size="large" requiredMark={false}>
            <Form.Item name="fullName" label="Họ và tên"
              rules={[{ required: true, message: 'Vui lòng nhập họ tên' }, { min: 2, message: 'Ít nhất 2 ký tự' }]}>
              <Input prefix={<UserOutlined className="input-icon" />} placeholder="Nguyễn Văn A" disabled={isEditRejected} />
            </Form.Item>

            <Form.Item name="email" label="Email"
              rules={[{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}>
              <Input prefix={<MailOutlined className="input-icon" />} placeholder="example@email.com" disabled={isEditRejected} />
            </Form.Item>

            <Form.Item name="phone" label="Số điện thoại (tuỳ chọn)"
              rules={[
                { pattern: /^[0-9]{10,11}$/, message: 'Vui lòng nhập đúng định dạng số điện thoại (10-11 số)' }
              ]}>
              <Input prefix={<PhoneOutlined className="input-icon" />} placeholder="0912345678" disabled={isEditRejected} />
            </Form.Item>

            {role === 'Participant' && (
                <Form.Item label="Bạn có phải là sinh viên Đại học FPT không?">
                  <Radio.Group 
                    onChange={(e) => setIsUniversityStudent(e.target.value)} 
                    value={isUniversityStudent}
                    disabled={isEditRejected}
                  >
                    <Radio value={true}>Có</Radio>
                    <Radio value={false}>Không</Radio>
                  </Radio.Group>
                </Form.Item>
            )}

            {role === 'Organizer' && (
              <>
                <Form.Item name="organizationName" label="Tên tổ chức / CLB"
                  rules={[{ required: true, message: 'Vui lòng nhập tên tổ chức' }]}>
                  <Input prefix={<TeamOutlined className="input-icon" />} placeholder="CLB Công nghệ thông tin" disabled={isEditRejected} />
                </Form.Item>

                <Form.Item
                  label={
                    <span>
                      Tài liệu xác minh{' '}
                      <Text type="danger">*</Text>{' '}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        (Giấy phép, quyết định thành lập, CMND chủ nhiệm…)
                      </Text>
                    </span>
                  }
                >
                  <Dragger
                    multiple
                    maxCount={5}
                    fileList={fileList}
                    beforeUpload={() => false}
                    onChange={({ fileList: fl }) => setFileList(fl)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    style={{ borderRadius: 10 }}
                  >
                    <p style={{ fontSize: 28 }}><InboxOutlined /></p>
                    <p style={{ fontWeight: 600, marginBottom: 4 }}>Kéo thả hoặc nhấn để chọn file</p>
                    <p style={{ color: '#9ca3af', fontSize: 12 }}>
                      PDF, DOC, DOCX, JPG, PNG · Tối đa 5 file · 10MB/file
                    </p>
                  </Dragger>
                  {fileList.length === 0 && (
                    <Text type="danger" style={{ fontSize: 12 }}>⚠️ Bắt buộc upload ít nhất 1 tài liệu</Text>
                  )}
                </Form.Item>
              </>
            )}

            <Form.Item name="password" label="Mật khẩu"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu' },
                { min: 8, message: 'Ít nhất 8 ký tự' },
                { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: 'Phải có chữ hoa, thường và số' },
              ]}>
              <Input.Password prefix={<LockOutlined className="input-icon" />} placeholder="Tối thiểu 8 ký tự" />
            </Form.Item>

            <Form.Item name="confirmPassword" label="Xác nhận mật khẩu"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                ({ getFieldValue }) => ({
                  validator(_, v) {
                    if (!v || getFieldValue('password') === v) return Promise.resolve();
                    return Promise.reject(new Error('Mật khẩu không khớp'));
                  },
                }),
              ]}>
              <Input.Password prefix={<LockOutlined className="input-icon" />} placeholder="Nhập lại mật khẩu" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block className="auth-submit-btn">
                {loading ? 'Đang xử lý...' : (isEditRejected ? 'Gửi lại hồ sơ' : `Đăng ký ${role === 'Organizer' ? 'Ban tổ chức' : 'Người tham dự'}`)}
              </Button>
            </Form.Item>

            {role === 'Participant' && !isEditRejected && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0' }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }}></div>
                  <span style={{ margin: '0 12px', color: '#6b7280', fontSize: 13 }}>Hoặc đăng ký bằng</span>
                  <div style={{ flex: 1, height: 1, backgroundColor: '#e5e7eb' }}></div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                      message.error('Đăng nhập Google thất bại');
                    }}
                    useOneTap
                  />
                </div>
              </>
            )}

            <div className="auth-footer-text">
              Đã có tài khoản?{' '}
              <Link to="/login" className="auth-link">Đăng nhập ngay</Link>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
