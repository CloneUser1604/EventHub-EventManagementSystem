import React, { useState, useEffect } from 'react';
import { Card, Typography, List, Tag, Spin, Button, Empty, Row, Col, Space } from 'antd';
import { CalendarOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getImageUrl } from '../../utils/imageHelpers';

const { Title, Text } = Typography;

const SpeakerEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/speaker/events`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        const data = await res.json();
        if (data.success) {
          setEvents(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch speaker events:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontFamily: 'Arial, Helvetica, sans-serif' }}>Sự kiện của tôi</Title>
        <Text type="secondary">Danh sách các sự kiện bạn được mời tham gia với tư cách Diễn giả</Text>
      </div>

      {events.length === 0 ? (
        <Empty description="Bạn chưa tham gia sự kiện nào" style={{ marginTop: 40 }} />
      ) : (
        <Row gutter={[16, 16]}>
          {events.map(event => (
            <Col xs={24} md={12} key={event.EventID}>
              <Card 
                hoverable 
                style={{ borderRadius: 12, overflow: 'hidden' }}
                bodyStyle={{ padding: 16 }}
                cover={
                  <div style={{ 
                    height: 140, 
                    backgroundImage: event.CoverImageURL ? `url(${getImageUrl(event.CoverImageURL)})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: '#f3f4f6'
                  }} />
                }
              >
                <div style={{ marginBottom: 8 }}>
                  <Tag color={
                    event.Status === 'Published' ? 'success' : 
                    event.Status === 'Draft' ? 'default' : 
                    event.Status === 'Cancelled' ? 'error' : 'processing'
                  }>
                    {event.Status === 'Published' ? 'Đã duyệt' : event.Status}
                  </Tag>
                </div>
                <Title level={5} style={{ margin: '0 0 8px', fontSize: 16, fontFamily: 'Arial, Helvetica, sans-serif' }} ellipsis={{ rows: 2 }}>
                  {event.Title}
                </Title>
                <Space direction="vertical" size={2} style={{ width: '100%', marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}><CalendarOutlined /> {dayjs(event.StartDate).format('DD/MM/YYYY HH:mm')}</Text>
                </Space>
                <Button 
                  type="primary" 
                  icon={<EyeOutlined />} 
                  onClick={() => navigate(`/events/${event.EventID}`)}
                  style={{ borderRadius: 6, width: '100%' }}
                >
                  Xem chi tiết sự kiện
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
};

export default SpeakerEventsPage;
