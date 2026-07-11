import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Button, Space, Modal, message, Input, Select, Empty, Typography, Tooltip, Badge } from 'antd';
import { PlusOutlined, EditOutlined, SendOutlined, DeleteOutlined, EyeOutlined, CloseCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import MainLayout from '../../components/layout/MainLayout';
import { eventService } from '../../services/event.service';
import dayjs from 'dayjs';
import { getImageUrl } from '../../utils/imageHelpers';
import useAuthStore from '../../store/authStore';
import { useTranslation } from '../../hooks/useTranslation';

const { Title, Text } = Typography;
const { confirm } = Modal;

const getStatusConfig = (t) => ({
  Draft:          { color: 'default', label: t('myEvents.draft') },
  PendingApproval:{ color: 'orange',  label: t('myEvents.pending') },
  Published:      { color: 'green',   label: t('myEvents.published') },
  Rejected:       { color: 'red',     label: t('myEvents.rejected') },
  Cancelled:      { color: 'red',     label: t('myEvents.cancelled') },
  Completed:      { color: 'blue',    label: t('myEvents.completed') },
});

const OrganizerEventsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reasonModal, setReasonModal] = useState({ open: false, reason: '', title: '' });

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getDerivedStatus = (e) => {
    if (e.Status === 'Published' && dayjs(e.EndDate).isBefore(dayjs())) {
      return 'Completed';
    }
    return e.Status;
  };

  useEffect(() => { 
    if (user?.UserID || user?.userId) {
      fetchMyEvents(); 
    }
  }, [user?.UserID, user?.userId]);

  const fetchMyEvents = async () => {
    setLoading(true);
    try {
      const res = await eventService.getEvents({ organizerId: user?.UserID || user?.userId, limit: 100, sortBy: 'CreatedAt', sortOrder: 'DESC' });
      setEvents(res.data.data.events);
    } catch { message.error('Lấy danh sách thất bại'); }
    finally { setLoading(false); }
  };

  const handleSubmit = (eventId) => {
    confirm({
      title: 'Gửi yêu cầu duyệt?',
      icon: <ExclamationCircleOutlined />,
      content: 'Sự kiện sẽ được gửi lên Admin để phê duyệt. Bạn có thể chỉnh sửa trong khi chờ duyệt.',
      okText: 'Gửi duyệt', cancelText: 'Huỷ',
      onOk: async () => {
        try {
          await eventService.submitForApproval(eventId);
          message.success('Đã gửi yêu cầu duyệt!');
          fetchMyEvents();
        } catch (err) { message.error(err.response?.data?.message || 'Gửi duyệt thất bại'); }
      },
    });
  };

  const handleDelete = (eventId, title) => {
    confirm({
      title: `Xoá sự kiện "${title}"?`, icon: <ExclamationCircleOutlined />,
      content: 'Hành động này không thể hoàn tác.',
      okText: 'Xoá', okButtonProps: { danger: true }, cancelText: 'Huỷ',
      onOk: async () => {
        try { await eventService.deleteEvent(eventId); message.success('Đã xoá sự kiện'); fetchMyEvents(); }
        catch (err) { message.error(err.response?.data?.message || 'Xoá thất bại'); }
      },
    });
  };

  const handleCancel = (eventId, title) => {
    let reason = '';
    confirm({
      title: `Huỷ sự kiện "${title}"?`,
      icon: <CloseCircleOutlined style={{ color: '#ef4444' }} />,
      content: (
        <div>
          <Text type="secondary">Người tham dự sẽ được thông báo.</Text>
          <Input.TextArea style={{ marginTop: 12 }} placeholder="Lý do huỷ..." onChange={e => { reason = e.target.value; }} />
        </div>
      ),
      okText: 'Huỷ sự kiện', okButtonProps: { danger: true }, cancelText: 'Không',
      onOk: async () => {
        try { await eventService.cancelEvent(eventId, reason); message.success('Đã huỷ sự kiện'); fetchMyEvents(); }
        catch (err) { message.error(err.response?.data?.message || 'Huỷ thất bại'); }
      },
    });
  };

  const filtered = events.filter(e => {
    const matchSearch = !search || e.Title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || getDerivedStatus(e) === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    {
      title: t('myEvents.event'),
      dataIndex: 'Title',
      render: (title, row) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 120, height: 70, borderRadius: 8, overflow: 'hidden', background: '#f0f2f5', flexShrink: 0 }}>
            {row.CoverImageURL
              ? <img src={getImageUrl(row.CoverImageURL)} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Img</div>
            }
          </div>
          <div>
            <Text strong style={{ display: 'block', fontSize: 14 }}>{title}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{row.CategoryName ? (t(`categories.${row.CategoryName}`) || row.CategoryName) : '—'}</Text>
          </div>
        </div>
      ),
    },
    {
      title: t('myEvents.time'),
      dataIndex: 'StartDate',
      width: 160,
      render: (d) => <Text style={{ fontSize: 13 }}>{dayjs(d).format('DD/MM/YYYY HH:mm')}</Text>,
    },
    {
      title: t('myEvents.registered'),
      width: 100,
      render: (_, row) => (
        <span style={{ fontSize: 13 }}>
          {row.RegisteredCount || 0}{row.MaxParticipants ? `/${row.MaxParticipants}` : ''}
        </span>
      ),
    },
    {
      title: t('myEvents.status'),
      dataIndex: 'Status',
      width: 130,
      render: (s, row) => {
        const derived = getDerivedStatus(row);
        const cfg = getStatusConfig(t);
        return (
          <div>
            <Tag color={cfg[derived]?.color || 'default'} style={{ borderRadius: 6, fontWeight: 600 }}>
              {cfg[derived]?.label || derived}
            </Tag>
            {row.ApprovalStatus === 'Pending' && row.Status === 'Published' && (
              <Tag color="orange" style={{ marginTop: 4, borderRadius: 6, display: 'block', width: 'fit-content' }}>
                Đang chờ duyệt sửa
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: t('myEvents.action'),
      width: 200,
      render: (_, row) => (
        <Space size={4}>
          <Tooltip title={t('myEvents.viewDetails')}>
            <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => navigate(`/events/${row.EventID}`)} />
          </Tooltip>
          {['Draft', 'Rejected'].includes(row.Status) && (
            <>
              <Tooltip title={t('myEvents.edit')}>
                <Button type="text" icon={<EditOutlined />} size="small" onClick={() => navigate(`/organizer/events/${row.EventID}/edit`)} />
              </Tooltip>
              <Tooltip title={t('myEvents.submitApproval')}>
                <Button type="text" icon={<SendOutlined />} size="small" style={{ color: '#2563eb' }} onClick={() => handleSubmit(row.EventID)} />
              </Tooltip>
              <Tooltip title={t('myEvents.delete')}>
                <Button type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => handleDelete(row.EventID, row.Title)} />
              </Tooltip>
            </>
          )}
          {['Published'].includes(row.Status) && (
            <>
              <Tooltip title={t('myEvents.editContent')}>
                <Button type="text" icon={<EditOutlined />} size="small" onClick={() => navigate(`/organizer/events/${row.EventID}/edit`)} />
              </Tooltip>
              <Tooltip title={t('myEvents.manageEvent')}>
                <Button type="text" icon={<EyeOutlined />} size="small" style={{ color: '#10b981' }} onClick={() => navigate(`/organizer/events/${row.EventID}/dashboard`)}>
                  {t('myEvents.manage')}
                </Button>
              </Tooltip>
              <Tooltip title={t('myEvents.cancelEvent')}>
                <Button type="text" icon={<CloseCircleOutlined />} size="small" danger onClick={() => handleCancel(row.EventID, row.Title)} />
              </Tooltip>
            </>
          )}
          {row.RejectionReason && (
            <Tooltip title="Xem lý do từ chối">
              <Button type="text" icon={<ExclamationCircleOutlined />} size="small" danger onClick={() => setReasonModal({ open: true, reason: row.RejectionReason, title: row.Title })} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <MainLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '24px 12px 60px' : '32px 24px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 0, justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', marginBottom: 28 }}>
          <div>
            <Title level={isMobile ? 3 : 2} style={{ margin: 0, fontFamily: "'Inter', sans-serif" }}>🗂️ {t('myEvents.title')}</Title>
            <Text type="secondary">{t('myEvents.subtitle')}</Text>
          </div>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => navigate('/organizer/events/create')}
            style={{ borderRadius: 10, height: 44, fontWeight: 700, width: isMobile ? '100%' : 'auto' }}>
            {t('myEvents.createNew')}
          </Button>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {Object.entries(getStatusConfig(t)).map(([status, conf]) => {
            const count = events.filter(e => getDerivedStatus(e) === status).length;
            if (!count) return null;
            return (
              <div key={status} onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
                style={{ background: statusFilter === status ? '#1a2744' : 'white', color: statusFilter === status ? 'white' : '#374151',
                  border: `1.5px solid ${statusFilter === status ? '#1a2744' : '#e5e7eb'}`,
                  borderRadius: 10, padding: '10px 18px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ fontWeight: 700, fontSize: 20 }}>{count}</div>
                <div style={{ fontSize: 12 }}>{conf.label}</div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 20 }}>
          <Input.Search placeholder={t('myEvents.search')} value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: isMobile ? '100%' : 340 }} allowClear />
          <Select value={statusFilter || undefined} onChange={v => setStatusFilter(v || '')} placeholder={t('myEvents.allStatus')} allowClear style={{ width: isMobile ? '100%' : 180 }}>
            {Object.entries(getStatusConfig(t)).map(([v, c]) => <Select.Option key={v} value={v}>{c.label}</Select.Option>)}
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="EventID"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: t => `${t} sự kiện` }}
          locale={{ emptyText: <Empty description="Bạn chưa có sự kiện nào" extra={<Button type="primary" onClick={() => navigate('/organizer/events/create')}>Tạo ngay</Button>} /> }}
          style={{ background: 'white', borderRadius: 14 }}
          size={isMobile ? "small" : "middle"}
          scroll={{ x: 800 }}
        />

        {/* Rejection Reason Modal */}
        <Modal
          title={`Lý do từ chối: ${reasonModal.title}`}
          open={reasonModal.open}
          onOk={() => setReasonModal({ open: false, reason: '', title: '' })}
          onCancel={() => setReasonModal({ open: false, reason: '', title: '' })}
          footer={[
            <Button key="close" type="primary" onClick={() => setReasonModal({ open: false, reason: '', title: '' })}>
              Đã hiểu
            </Button>
          ]}
        >
          <div style={{ padding: '16px 0' }}>
            <Text>{reasonModal.reason}</Text>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default OrganizerEventsPage;
