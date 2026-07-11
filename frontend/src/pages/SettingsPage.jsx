import React, { useState, useEffect } from 'react';
import { Switch, Select, Button, Typography, message, Modal } from 'antd';
import { ExclamationCircleOutlined, ArrowLeftOutlined, BellOutlined, GlobalOutlined, BulbOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import useAuthStore from '../store/authStore';
import useSettingStore from '../store/settingStore';
import { useTranslation } from '../hooks/useTranslation';
import api from '../utils/axiosConfig';

const { Title, Text } = Typography;

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Use Global States
  const { theme, emailNotifs, setTheme, setLanguage, setEmailNotifs } = useSettingStore();
  const { t, language } = useTranslation();

  const handleLanguageChange = (val) => {
    setLanguage(val);
    message.success(val === 'en' ? 'Language updated' : 'Đã cập nhật ngôn ngữ');
  };

  const handleThemeChange = (val) => {
    setTheme(val);
    message.success(language === 'en' ? 'Theme updated' : 'Đã cập nhật giao diện');
  };

  const showDeleteConfirm = () => {
    Modal.confirm({
      title: t('settings.deleteAcc') + '?',
      icon: <ExclamationCircleOutlined />,
      content: t('settings.deleteDesc'),
      okText: t('settings.deleteAcc'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          const hide = message.loading('Đang xóa tài khoản...', 0);
          await api.delete('/auth/account');
          hide();
          message.success('Tài khoản đã được xóa thành công.');
          // Log out user
          useAuthStore.getState().logout();
          navigate('/login');
        } catch (error) {
          message.error('Lỗi khi xóa tài khoản');
        }
      },
    });
  };

  return (
    <MainLayout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', minHeight: '80vh' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(-1)} 
            style={{ fontSize: 18, color: theme === 'dark' ? '#fff' : '#000' }} 
          />
          <div>
            <Title level={2} style={{ margin: 0, fontFamily: "'Geist', sans-serif", color: theme === 'dark' ? '#fff' : '#18181b' }}>
              {t('settings.title')}
            </Title>
            <Text type="secondary" style={{ color: theme === 'dark' ? '#a1a1aa' : undefined }}>{t('settings.subtitle')}</Text>
          </div>
        </div>

        {/* Section: Hiển thị */}
        <div style={{ background: theme === 'dark' ? '#1f1f1f' : '#fafafa', border: `1px solid ${theme === 'dark' ? '#333' : '#e5e5e5'}`, borderRadius: 12, padding: 32, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <BulbOutlined style={{ fontSize: 24, color: theme === 'dark' ? '#fff' : '#18181B' }} />
            <Title level={4} style={{ margin: 0, fontFamily: "'Geist', sans-serif", color: theme === 'dark' ? '#fff' : '#18181b' }}>{t('settings.appearance')}</Title>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: `1px solid ${theme === 'dark' ? '#333' : '#f0f0f0'}` }}>
            <div>
              <Text strong style={{ fontSize: 15, display: 'block', color: theme === 'dark' ? '#fff' : '#18181b' }}>{t('settings.theme')}</Text>
              <Text type="secondary" style={{ color: theme === 'dark' ? '#a1a1aa' : undefined }}>{t('settings.themeDesc')}</Text>
            </div>
            <Select
              value={theme}
              onChange={handleThemeChange}
              style={{ width: 140 }}
              options={[
                { value: 'light', label: '🌞 Sáng' },
                { value: 'dark', label: '🌙 Tối' },
              ]}
            />
          </div>
        </div>

        {/* Section: Ngôn ngữ */}
        <div style={{ background: theme === 'dark' ? '#1f1f1f' : '#fafafa', border: `1px solid ${theme === 'dark' ? '#333' : '#e5e5e5'}`, borderRadius: 12, padding: 32, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <GlobalOutlined style={{ fontSize: 24, color: theme === 'dark' ? '#fff' : '#18181B' }} />
            <Title level={4} style={{ margin: 0, fontFamily: "'Geist', sans-serif", color: theme === 'dark' ? '#fff' : '#18181b' }}>{t('settings.lang')}</Title>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong style={{ fontSize: 15, display: 'block', color: theme === 'dark' ? '#fff' : '#18181b' }}>{t('settings.langTitle')}</Text>
              <Text type="secondary" style={{ color: theme === 'dark' ? '#a1a1aa' : undefined }}>{t('settings.langDesc')}</Text>
            </div>
            <Select
              value={language}
              onChange={handleLanguageChange}
              style={{ width: 140 }}
              options={[
                { value: 'vi', label: '🇻🇳 Tiếng Việt' },
                { value: 'en', label: '🇬🇧 English' },
              ]}
            />
          </div>
        </div>

        {/* Section: Thông báo */}
        <div style={{ background: theme === 'dark' ? '#1f1f1f' : '#fafafa', border: `1px solid ${theme === 'dark' ? '#333' : '#e5e5e5'}`, borderRadius: 12, padding: 32, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <BellOutlined style={{ fontSize: 24, color: theme === 'dark' ? '#fff' : '#18181B' }} />
            <Title level={4} style={{ margin: 0, fontFamily: "'Geist', sans-serif", color: theme === 'dark' ? '#fff' : '#18181b' }}>{t('settings.notif')}</Title>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong style={{ fontSize: 15, display: 'block', color: theme === 'dark' ? '#fff' : '#18181b' }}>{t('settings.emailNotif')}</Text>
              <Text type="secondary" style={{ color: theme === 'dark' ? '#a1a1aa' : undefined }}>{t('settings.emailDesc')}</Text>
            </div>
            <Switch 
              checked={emailNotifs} 
              onChange={async (checked) => {
                try {
                  await api.put('/auth/settings', { emailNotifs: checked });
                  setEmailNotifs(checked);
                  message.success(checked ? 'Đã bật thông báo email' : 'Đã tắt thông báo email');
                } catch (error) {
                  message.error('Lỗi cập nhật cấu hình');
                }
              }} 
            />
          </div>
        </div>

        {/* Section: Danger Zone */}
        <div style={{ background: theme === 'dark' ? '#2a1215' : '#fff1f2', border: `1px solid ${theme === 'dark' ? '#5c1020' : '#ffe4e6'}`, borderRadius: 12, padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <SafetyCertificateOutlined style={{ fontSize: 24, color: '#e11d48' }} />
            <Title level={4} style={{ margin: 0, fontFamily: "'Geist', sans-serif", color: '#e11d48' }}>{t('settings.danger')}</Title>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong style={{ fontSize: 15, display: 'block', color: '#be123c' }}>{t('settings.deleteAcc')}</Text>
              <Text type="secondary" style={{ color: '#fda4af' }}>{t('settings.deleteDesc')}</Text>
            </div>
            <Button danger type="primary" onClick={showDeleteConfirm}>{t('settings.deleteAcc')}</Button>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default SettingsPage;
