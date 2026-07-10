import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form, Input, Button, Select, DatePicker, Upload, InputNumber,
  message, Steps, Divider, Card, Typography, Space, Modal, Alert, Radio
} from 'antd';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  PlusOutlined, DeleteOutlined, UploadOutlined, SaveOutlined,
  SendOutlined, ArrowLeftOutlined, CalendarOutlined
} from '@ant-design/icons';
import MainLayout from '../../components/layout/MainLayout';
import useEventStore from '../../store/eventStore';
import { eventService } from '../../services/event.service';
import { authService } from '../../services/auth.service';
import { useTranslation } from '../../hooks/useTranslation';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Option } = Select;
const { RangePicker } = DatePicker;

const EventFormPage = () => {
  const { id } = useParams(); // undefined = create, has value = edit
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { categories, venues, fetchMeta, fetchEventById } = useEventStore();
  const [loading, setLoading] = useState(false);
  const [coverFileList, setCoverFileList] = useState([]);
  const [docsFileList, setDocsFileList] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [speakerModal, setSpeakerModal] = useState(false);
  const [speakerForm] = Form.useForm();
  const [addingSpeaker, setAddingSpeaker] = useState(false);
  const [createdSpeakers, setCreatedSpeakers] = useState([]);
  const [isEdit, setIsEdit] = useState(false);
  const [event, setEvent] = useState(null);
  const [editReasonModal, setEditReasonModal] = useState({ open: false, submitAfter: false, values: null });
  const [editReason, setEditReason] = useState('');

  useEffect(() => {
    fetchMeta();
    if (id) {
      setIsEdit(true);
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    const ev = await fetchEventById(id);
    if (!ev) return navigate('/organizer/events');
    setEvent(ev);
    form.setFieldsValue({
      title: ev.Title,
      description: ev.Description,
      coverImageURL: ev.CoverImageURL,
      categoryId: ev.CategoryID,
      venueId: ev.VenueID,
      dateRange: ev.StartDate && ev.EndDate ? [dayjs(ev.StartDate), dayjs(ev.EndDate)] : null,
      registrationDeadline: ev.RegistrationDeadline ? dayjs(ev.RegistrationDeadline) : null,
      maxParticipants: ev.MaxParticipants,
      isInternalOnly: ev.IsInternalOnly === true || ev.IsInternalOnly === 1,
    });
    setSessions(ev.sessions || []);
  };

  const handleSave = async (submitAfter = false) => {
    try {
      const values = await form.validateFields();
      if (!isEdit && docsFileList.length === 0) {
        return message.error('Vui lòng upload Tài liệu/Giấy phép sự kiện');
      }

      if (isEdit && event?.Status === 'Published') {
        setEditReasonModal({ open: true, submitAfter, values });
        return;
      }

      doSubmit(values, submitAfter);
    } catch (info) {
      console.log('Validate Failed:', info);
      message.error('Vui lòng kiểm tra lại các trường bắt buộc');
    }
  };

  const doSubmit = async (values, submitAfter, reason = '') => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('description', values.description || '');
      if (values.categoryId) formData.append('categoryId', values.categoryId);
      if (values.venueId) formData.append('venueId', values.venueId);
      if (values.dateRange?.[0]) formData.append('startDate', values.dateRange[0].toISOString());
      if (values.dateRange?.[1]) formData.append('endDate', values.dateRange[1].toISOString());
      if (values.registrationDeadline) formData.append('registrationDeadline', values.registrationDeadline.toISOString());
      if (values.maxParticipants) formData.append('maxParticipants', values.maxParticipants);
      if (values.isInternalOnly !== undefined) formData.append('isInternalOnly', values.isInternalOnly);
      
      const invalidSession = sessions.find(s => !(s.title || s.Title) || !(s.startTime || s.StartTime) || !(s.endTime || s.EndTime));
      if (invalidSession) {
        setLoading(false);
        return message.error('Vui lòng điền đủ Tiêu đề, Bắt đầu và Kết thúc cho các Chương trình (Phiên)');
      }

      const eventStart = values.dateRange?.[0];
      const eventEnd = values.dateRange?.[1];
      if (eventStart && eventEnd) {
        for (let s of sessions) {
          const sStart = dayjs(s.startTime || s.StartTime);
          const sEnd = dayjs(s.endTime || s.EndTime);
          if (sEnd.isSame(sStart) || sEnd.isBefore(sStart)) {
            setLoading(false);
            return message.error(`Thời gian kết thúc của phiên "${s.title || s.Title || 'Không tên'}" phải diễn ra sau thời gian bắt đầu`);
          }
          if (sStart.isBefore(eventStart) || sEnd.isAfter(eventEnd)) {
            setLoading(false);
            return message.error(`Thời gian của phiên "${s.title || s.Title || 'Không tên'}" phải nằm trong thời gian diễn ra sự kiện`);
          }
        }
      }

      const parsedSessions = sessions.map(s => ({
        title: s.title || s.Title,
        description: s.description || s.Description,
        startTime: s.startTime || s.StartTime,
        endTime: s.endTime || s.EndTime,
        location: s.location || s.Location,
        speakerEmails: s.speakerEmails || s.SpeakerEmails || [],
      }));
      formData.append('sessions', JSON.stringify(parsedSessions));
      if (reason) {
        formData.append('editReason', reason);
      }

      if (coverFileList.length > 0) {
        formData.append('coverImage', coverFileList[0].originFileObj);
      }
      
      docsFileList.forEach(f => {
        formData.append('documents', f.originFileObj);
      });

      // Temporary replacement since we use FormData and need custom api call
      const token = localStorage.getItem('accessToken');
      let response;
      if (isEdit) {
        response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/events/${id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
      } else {
        response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/events`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
      }
      
      const resData = await response.json();
      if (!resData.success) throw new Error(resData.message || 'Lỗi lưu sự kiện');

      if (isEdit) {
        message.success('Đã cập nhật sự kiện');
        if (submitAfter) {
          if (event?.Status !== 'Published') {
            await eventService.submitForApproval(id);
          }
          message.success('Đã gửi yêu cầu duyệt!');
          navigate(`/organizer/events`);
        }
      } else {
        const newId = resData.data.eventId;
        message.success('Đã tạo sự kiện thành công!');
        if (submitAfter) {
          await eventService.submitForApproval(newId);
          message.success('Đã gửi yêu cầu duyệt!');
          navigate('/organizer/events');
        } else {
          navigate(`/organizer/events`);
        }
      }
    } catch (error) {
      message.error(error.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEditReason = () => {
    if (!editReason.trim()) {
      return message.error('Vui lòng nhập lý do chỉnh sửa');
    }
    setEditReasonModal({ ...editReasonModal, open: false });
    doSubmit(editReasonModal.values, editReasonModal.submitAfter, editReason);
  };

  const addSession = () => setSessions(s => [...s, { title: '', description: '', startTime: '', endTime: '', location: '', speakerEmails: [], _new: true }]);
  const removeSession = (i) => setSessions(s => s.filter((_, idx) => idx !== i));
  const updateSession = (i, field, val) => setSessions(s => s.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const handleCreateSpeaker = async () => {
    try {
      const values = await speakerForm.validateFields();
      setAddingSpeaker(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/speakers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.success) {
        message.success(t('createEvent.speakerCreatedSuccess', { defaultValue: 'Đã tạo tài khoản diễn giả! Chờ Admin phê duyệt.' }));
        setCreatedSpeakers(prev => [...prev, values]);
        speakerForm.resetFields();
        setSpeakerModal(false);
      } else {
        message.error(data.message);
      }
    } catch (err) {
      if (!err?.errorFields) message.error(t('createEvent.speakerCreatedFail', { defaultValue: 'Tạo diễn giả thất bại' }));
    } finally {
      setAddingSpeaker(false);
    }
  };

  const isLocked = isEdit && event?.EditLockedAt && !event?.AdminEditUnlock;
  const isSubmitted = event?.ApprovalStatus === 'Pending';

  return (
    <MainLayout>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/organizer/events')} />
          <div>
            <Title level={3} style={{ margin: 0, fontFamily: "'Inter', sans-serif" }}>
              {isEdit ? '✏️ Chỉnh sửa sự kiện' : `🎉 ${t('createEvent.title')}`}
            </Title>
            <Text type="secondary">{t('createEvent.subtitle')}</Text>
          </div>
        </div>

        {isLocked && (
          <Alert type="warning" showIcon message="Sự kiện đã bị khoá chỉnh sửa (sau 3 ngày). Liên hệ Admin để mở khoá." style={{ marginBottom: 20, borderRadius: 10 }} />
        )}
        {isSubmitted && (
          <Alert type="info" showIcon message="Sự kiện đang chờ Admin duyệt. Một số chỉnh sửa có thể bị giới hạn." style={{ marginBottom: 20, borderRadius: 10 }} />
        )}

        <Form form={form} layout="vertical" size="large" requiredMark="optional">

          {/* ── Section 1: Basic Info ── */}
          <Card style={{ borderRadius: 14, marginBottom: 20 }}>
            <Title level={5} style={{ fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>📋 {t('createEvent.basicInfo')}</Title>

            <Form.Item name="title" label={t('createEvent.eventTitle')} rules={[{ required: true, message: 'Vui lòng nhập tên sự kiện' }, { min: 5, message: 'Tên phải ít nhất 5 ký tự' }]}>
              <Input placeholder="VD: Hội thảo AI trong giáo dục 2025" maxLength={300} showCount />
            </Form.Item>

            <Form.Item name="description" label="Mô tả sự kiện ">
              <ReactQuill theme="snow" style={{ height: 200, marginBottom: 40 }} />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item name="categoryId" label={t('createEvent.category')}>
                <Select placeholder="Chọn lĩnh vực" allowClear>
                  {categories.map(c => <Option key={c.CategoryID} value={c.CategoryID}>{t(`categories.${c.Name}`) || c.Name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="venueId" label={t('createEvent.venue')}>
                <Select placeholder="Chọn địa điểm" allowClear>
                  {venues.map(v => <Option key={v.VenueID} value={v.VenueID}>{v.Name}</Option>)}
                </Select>
              </Form.Item>
            </div>

            <Form.Item label={t('createEvent.coverImage')}>
              <Dragger
                maxCount={1}
                fileList={coverFileList}
                beforeUpload={() => false}
                onChange={({ fileList: fl }) => setCoverFileList(fl)}
                accept="image/*"
                listType="picture"
              >
                <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                <p className="ant-upload-text">{t('createEvent.dragCover')}</p>
              </Dragger>
            </Form.Item>

            <Form.Item label={<span>{t('createEvent.eventDocs')} <span style={{color: 'red'}}>*</span> <span style={{fontSize: 13, color: '#6b7280'}}>{t('createEvent.requiredDocs')}</span></span>}>
              <Dragger
                multiple
                maxCount={5}
                fileList={docsFileList}
                beforeUpload={() => false}
                onChange={({ fileList: fl }) => setDocsFileList(fl)}
                accept=".pdf,.doc,.docx,.jpg,.png"
              >
                <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                <p className="ant-upload-text">{t('createEvent.dragDocs')}</p>
                <p className="ant-upload-hint">{t('createEvent.uploadHint')}</p>
              </Dragger>
            </Form.Item>
          </Card>

          {/* ── Section 2: Date & Registration ── */}
          <Card style={{ borderRadius: 14, marginBottom: 20 }}>
            <Title level={5} style={{ fontFamily: "'Inter', sans-serif", marginBottom: 20 }}>📅 {t('createEvent.dateAndReg')}</Title>

            <Form.Item name="isInternalOnly" label={t('createEvent.isInternalOnly')} initialValue={true}>
              <Radio.Group>
                <Radio value={true}>{t('createEvent.internalStudents')}</Radio>
                <Radio value={false}>{t('createEvent.publicEveryone')}</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item 
              name="dateRange" 
              label={t('createEvent.dateRange')} 
              rules={[
                { required: true, message: 'Vui lòng chọn thời gian' },
                {
                  validator: (_, value) => {
                    if (value && value[0] && value[1]) {
                      if (value[0].isSame(value[1]) || value[1].isBefore(value[0])) {
                        return Promise.reject(new Error('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu'));
                      }
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <RangePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }}
                disabledDate={d => d && d.isBefore(dayjs().startOf('day'))} />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item 
                name="registrationDeadline" 
                label={t('createEvent.registrationDeadline')}
                dependencies={['dateRange']}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value) return Promise.resolve();
                      const dates = getFieldValue('dateRange');
                      if (dates && dates[0]) {
                        const start = dates[0];
                        if (value.isAfter(start.subtract(1, 'day'))) {
                          return Promise.reject(new Error('Hạn đăng ký phải kết thúc ít nhất 1 ngày trước khi sự kiện bắt đầu'));
                        }
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }}
                  disabledDate={d => d && d.isBefore(dayjs().startOf('day'))} />
              </Form.Item>
              <Form.Item name="maxParticipants" label={t('createEvent.maxParticipants')}>
                <InputNumber min={1} max={10000} style={{ width: '100%' }} placeholder="Không giới hạn nếu để trống" />
              </Form.Item>
            </div>
          </Card>

          {/* ── Section 3: Sessions / Agenda ── */}
          <Card style={{ borderRadius: 14, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Title level={5} style={{ fontFamily: "'Inter', sans-serif", margin: 0 }}>🗓️ {t('createEvent.agenda')} ({sessions.length} {t('createEvent.sessions')})</Title>
              <Button type="dashed" icon={<PlusOutlined />} onClick={addSession}>{t('createEvent.addSession')}</Button>
            </div>

            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', border: '2px dashed #e5e7eb', borderRadius: 10 }}>
                <CalendarOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                <div>{t('createEvent.noSession')}</div>
              </div>
            ) : sessions.map((s, i) => (
              <div key={i} style={{ background: '#f9fafb', borderRadius: 10, padding: 16, marginBottom: 12, border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 13 }}>{t('createEvent.session')} {i + 1}</Text>
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => removeSession(i)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <Text style={{ fontSize: 12, fontWeight: 600 }}>{t('createEvent.sessionName')}</Text>
                    <Input value={s.title || s.Title || ''} onChange={e => updateSession(i, 'title', e.target.value)} placeholder="VD: Khai mạc / Workshop" style={{ marginTop: 4 }} />
                  </div>
                  <div>
                    <Text style={{ fontSize: 12, fontWeight: 600 }}>{t('createEvent.roomLocation')}</Text>
                    <Input value={s.location || s.Location || ''} onChange={e => updateSession(i, 'location', e.target.value)} placeholder="VD: Phòng A1" style={{ marginTop: 4 }} />
                  </div>
                  <div>
                    <Text style={{ fontSize: 12, fontWeight: 600 }}>{t('createEvent.start')}</Text>
                    <DatePicker showTime format="DD/MM HH:mm" style={{ width: '100%', marginTop: 4 }}
                      value={s.startTime || s.StartTime ? dayjs(s.startTime || s.StartTime) : null}
                      onChange={d => updateSession(i, 'startTime', d?.toISOString())} />
                  </div>
                  <div>
                    <Text style={{ fontSize: 12, fontWeight: 600 }}>{t('createEvent.end')}</Text>
                    <DatePicker showTime format="DD/MM HH:mm" style={{ width: '100%', marginTop: 4 }}
                      value={s.endTime || s.EndTime ? dayjs(s.endTime || s.EndTime) : null}
                      onChange={d => updateSession(i, 'endTime', d?.toISOString())} />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: 600 }}>{t('createEvent.speakerEmails')}</Text>
                  <Select mode="tags" style={{ width: '100%', marginTop: 4 }} placeholder="Nhập email diễn giả và ấn Enter"
                    value={s.speakerEmails || s.SpeakerEmails || []}
                    onChange={val => updateSession(i, 'speakerEmails', val)} />
                </div>
                <Input.TextArea value={s.description || s.Description || ''} onChange={e => updateSession(i, 'description', e.target.value)}
                  placeholder={t('createEvent.sessionDesc')} rows={2} />
              </div>
            ))}
          </Card>

          {/* ── Section 4: Speakers ── */}
          <Card style={{ borderRadius: 14, marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Title level={5} style={{ fontFamily: "'Inter', sans-serif", margin: '0 0 4px' }}>🎤 {t('createEvent.speakers')}</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{t('createEvent.speakerHelp')}</Text>
              </div>
              <Button icon={<PlusOutlined />} onClick={() => setSpeakerModal(true)}>{t('createEvent.addSpeaker')}</Button>
            </div>
            
            {createdSpeakers.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('createEvent.createdSpeakers')}</Text>
                <Space size={[0, 8]} wrap>
                  {createdSpeakers.map((spk, idx) => (
                    <div key={idx} style={{ 
                      padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', 
                      borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 
                    }}>
                      <div style={{ width: 28, height: 28, background: '#e0e7ff', color: '#4f46e5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                        {spk.fullName?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <Text strong style={{ display: 'block', fontSize: 13, lineHeight: '1.2' }}>{spk.fullName}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{spk.email}</Text>
                      </div>
                    </div>
                  ))}
                </Space>
              </div>
            )}
          </Card>

          {/* ── Action buttons ── */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button size="large" onClick={() => navigate('/organizer/events')} style={{ borderRadius: 10 }}>{t('createEvent.cancel')}</Button>
            <Button size="large" icon={<SaveOutlined />} onClick={() => handleSave(false)} loading={loading}
              style={{ borderRadius: 10, border: '2px solid #2563eb', color: '#2563eb', fontWeight: 600 }}>
              {t('createEvent.saveDraft')}
            </Button>
            <Button type="primary" size="large" icon={<SendOutlined />} onClick={() => handleSave(true)} loading={loading}
              style={{ borderRadius: 10, height: 46, fontWeight: 700, paddingInline: 24 }}>
              {t('createEvent.saveSubmit')}
            </Button>
          </div>
        </Form>
      </div>

      {/* Speaker Modal */}
      <Modal open={speakerModal} onCancel={() => setSpeakerModal(false)} onOk={handleCreateSpeaker}
        confirmLoading={addingSpeaker} okText={t('createEvent.createAccount')}
        title={<span style={{ fontFamily: "'Inter', sans-serif" }}>🎤 {t('createEvent.addNewSpeaker')}</span>}
        width={480}>
        <Alert type="info" showIcon style={{ marginBottom: 16, borderRadius: 8 }}
          message={t('createEvent.speakerApprovalAlert')} />
        <Form form={speakerForm} layout="vertical" size="middle">
          <Form.Item name="fullName" label={t('createEvent.fullName')} rules={[{ required: true }]}>
            <Input placeholder={t('createEvent.fullNamePlaceholder')} />
          </Form.Item>
          <Form.Item name="email" label={t('createEvent.email')} rules={[{ required: true }, { type: 'email' }]}>
            <Input placeholder={t('createEvent.emailPlaceholder')} />
          </Form.Item>
          <Form.Item name="password" label={t('createEvent.passwordForSpeaker')} rules={[
            { required: true, message: t('createEvent.passwordRequired') },
            { min: 8, message: t('createEvent.passwordMinLength') },
            { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: t('createEvent.passwordPattern') }
          ]}>
            <Input.Password placeholder={t('createEvent.passwordPlaceholder')} />
          </Form.Item>
          <Form.Item name="phone" label={t('createEvent.phone')}>
            <Input placeholder={t('createEvent.phonePlaceholder')} />
          </Form.Item>
          <Form.Item name="expertise" label={t('createEvent.expertise')}>
            <Input placeholder={t('createEvent.expertisePlaceholder')} />
          </Form.Item>
          <Form.Item name="bio" label={t('createEvent.bio')}>
            <Input.TextArea rows={3} placeholder={t('createEvent.bioPlaceholder')} />
          </Form.Item>
          <Form.Item name="linkedInURL" label={t('createEvent.linkedIn')}>
            <Input placeholder={t('createEvent.linkedInPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('createEvent.editReasonTitle', { defaultValue: 'Lý do chỉnh sửa sự kiện' })}
        open={editReasonModal.open}
        onOk={handleConfirmEditReason}
        onCancel={() => setEditReasonModal({ open: false, submitAfter: false, values: null })}
        okText={t('createEvent.submitEdit', { defaultValue: 'Gửi duyệt chỉnh sửa' })}
        cancelText={t('createEvent.cancel')}
      >
        <Alert 
          message="Sự kiện của bạn đã được duyệt. Việc chỉnh sửa sẽ yêu cầu Admin phê duyệt lại và gửi thông báo thay đổi đến người tham gia." 
          type="warning" 
          showIcon 
          style={{ marginBottom: 16 }} 
        />
        <Input.TextArea 
          rows={4} 
          placeholder="Nhập chi tiết nội dung thay đổi (VD: Thay đổi địa điểm, dời ngày...)" 
          value={editReason}
          onChange={e => setEditReason(e.target.value)}
        />
      </Modal>

    </MainLayout>
  );
};

export default EventFormPage;
