import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Result, Spin } from 'antd';
import { authService } from '../../services/auth.service';
import './Auth.css';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error | no-token
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }
    const verify = async () => {
      try {
        const res = await authService.verifyEmail(token);
        setMessage(res.data.message);
        setStatus('success');
      } catch (err) {
        setMessage(err.response?.data?.message || 'Xác thực thất bại');
        setStatus('error');
      }
    };
    verify();
  }, [token]);

  return (
    <div className="auth-page auth-page--center">
      <div className="auth-card">
        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <p style={{ marginTop: 16, color: '#6b7280' }}>Đang xác thực email của bạn...</p>
          </div>
        )}

        {status === 'success' && (
          <Result
            icon={<div style={{ fontSize: 64 }}>✅</div>}
            title="Xác thực email thành công!"
            subTitle={message || 'Email của bạn đã được xác thực. Bạn có thể đăng nhập ngay bây giờ.'}
            extra={
              <Link to="/login">
                <Button type="primary" size="large" className="auth-submit-btn">
                  Đăng nhập ngay
                </Button>
              </Link>
            }
          />
        )}

        {status === 'error' && (
          <Result
            status="error"
            title="Xác thực thất bại"
            subTitle={message || 'Link xác thực không hợp lệ hoặc đã hết hạn.'}
            extra={[
              <Link to="/resend-verification" key="resend">
                <Button type="primary" size="large">Gửi lại email xác thực</Button>
              </Link>,
              <Link to="/login" key="login">
                <Button size="large">Về trang đăng nhập</Button>
              </Link>,
            ]}
          />
        )}

        {status === 'no-token' && (
          <Result
            status="warning"
            title="Không tìm thấy token"
            subTitle="Link xác thực không hợp lệ. Vui lòng kiểm tra lại email."
            extra={
              <Link to="/login">
                <Button type="primary" size="large">Về trang đăng nhập</Button>
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
