import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, Row, Col, Tag, Spin, Select, Empty, Typography } from 'antd';
import { SearchOutlined, ArrowRightOutlined, CalendarOutlined, TeamOutlined, TrophyOutlined } from '@ant-design/icons';
import MainLayout from '../../components/layout/MainLayout';
import EventCard from '../../components/events/EventCard';
import useEventStore from '../../store/eventStore';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

// ─── Animated counter ──────────────────────────────────────────
const Counter = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / 60);
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(t); }
      else setCount(start);
    }, 20);
    return () => clearInterval(t);
  }, [target]);
  return <span>{count.toLocaleString()}{suffix}</span>;
};

const HomePage = () => {
  const navigate = useNavigate();
  const { events, isLoading, categories, fetchEvents, fetchMeta } = useEventStore();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const heroRef = useRef(null);

  useEffect(() => {
    fetchMeta();
    fetchEvents({ status: 'Published', limit: 8, page: 1, sortBy: 'StartDate', sortOrder: 'ASC' });
  }, []);

  const handleSearch = () => {
    navigate(`/events?search=${encodeURIComponent(search)}${selectedCat ? `&categoryId=${selectedCat}` : ''}`);
  };

  const featuredEvents = events.slice(0, 3);
  const upcomingEvents = events.slice(0, 8);

  return (
    <MainLayout>
      {/* ══════════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════════ */}
      <section ref={heroRef} style={{
        background: 'linear-gradient(145deg, #0f1629 0%, #162040 40%, #1a1060 80%, #0f1629 100%)',
        minHeight: '88vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', padding: '80px 24px',
      }}>
        {/* Decorative blobs */}
        {[
          { w:500, h:500, top:'-150px', left:'-100px', color:'#60a5fa', opacity:0.07 },
          { w:400, h:400, bottom:'-100px', right:'-50px', color:'#a78bfa', opacity:0.08 },
          { w:300, h:300, top:'40%', left:'60%', color:'#34d399', opacity:0.05 },
        ].map((b, i) => (
          <div key={i} style={{
            position: 'absolute', width: b.w, height: b.h,
            top: b.top, bottom: b.bottom, left: b.left, right: b.right,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${b.color}, transparent 70%)`,
            opacity: b.opacity, pointerEvents: 'none',
          }} />
        ))}

        <div style={{ textAlign: 'center', maxWidth: 780, position: 'relative', zIndex: 2 }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 100, padding: '6px 16px', marginBottom: 28, backdropFilter: 'blur(8px)' }}>
            <span style={{ fontSize: 14 }}>✨</span>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>Nền tảng sự kiện đại học #1</Text>
          </div>

          <h1 style={{
            fontFamily: 'Sora,sans-serif', fontSize: 'clamp(36px, 6vw, 68px)',
            fontWeight: 800, color: 'white', lineHeight: 1.15, marginBottom: 20,
            letterSpacing: '-1px',
          }}>
            Khám phá &amp; tham gia<br />
            <span style={{ background: 'linear-gradient(90deg,#60a5fa,#a78bfa,#34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              sự kiện đại học
            </span>
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 18, lineHeight: 1.7, marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}>
            Hội thảo, workshop, cuộc thi, triển lãm — tất cả sự kiện của cộng đồng sinh viên tập trung tại một nơi.
          </p>

          {/* Search Bar */}
          <div style={{
            display: 'flex', gap: 0, maxWidth: 620, margin: '0 auto 48px',
            background: 'white', borderRadius: 14, padding: '6px 6px 6px 0',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <Select
              placeholder="Lĩnh vực"
              style={{ width: 160, borderRight: '1px solid #e5e7eb' }}
              className="home-category-filter"
              variant="borderless"
              value={selectedCat || undefined}
              onChange={setSelectedCat}
              allowClear
            >
              {categories.map(c => <Option key={c.CategoryID} value={c.CategoryID}>{c.Name}</Option>)}
            </Select>
            <Input
              placeholder="Tìm sự kiện..."
              variant="borderless"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onPressEnter={handleSearch}
              style={{ flex: 1, fontSize: 15 }}
              prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            />
            <Button
              type="primary" size="large" onClick={handleSearch}
              style={{ borderRadius: 10, height: 44, paddingInline: 24, fontWeight: 600 }}
            >
              Tìm kiếm
            </Button>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
            {[
              { icon: <CalendarOutlined />, value: 120, suffix: '+', label: 'Sự kiện' },
              { icon: <TeamOutlined />, value: 5000, suffix: '+', label: 'Người tham gia' },
              { icon: <TrophyOutlined />, value: 30, suffix: '+', label: 'CLB & tổ chức' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontFamily: 'Sora,sans-serif', fontWeight: 800, color: 'white' }}>
                  <Counter target={s.value} suffix={s.suffix} />
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Wave */}
        <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%' }} viewBox="0 0 1440 60" fill="none">
          <path d="M0 60 C360 0 1080 0 1440 60 L1440 60 L0 60Z" fill="#f9fafb" />
        </svg>

        <style>{`
          .home-category-filter .ant-select-selector {
            background-color: #f0fdf4 !important;
            color: #166534 !important;
            font-weight: 600;
            border-radius: 10px 0 0 10px !important;
            height: 44px !important;
            display: flex !important;
            align-items: center !important;
          }
          .home-category-filter .ant-select-selection-placeholder {
            color: #166534 !important;
            opacity: 0.8;
          }
          .home-category-filter .ant-select-arrow {
            color: #166534 !important;
          }
        `}</style>
      </section>

      {/* ══════════════════════════════════════════════════
          CATEGORY CHIPS
      ══════════════════════════════════════════════════ */}
      <section style={{ padding: '40px 24px 0', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Tag
            onClick={() => navigate('/events')}
            style={{ cursor: 'pointer', padding: '6px 16px', fontSize: 14, borderRadius: 100, background: '#1a2744', color: 'white', border: 'none', fontWeight: 600 }}
          >
            🔥 Tất cả
          </Tag>
          {categories.map(c => (
            <Tag
              key={c.CategoryID}
              onClick={() => navigate(`/events?categoryId=${c.CategoryID}`)}
              style={{ cursor: 'pointer', padding: '6px 16px', fontSize: 14, borderRadius: 100, fontWeight: 500, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151' }}
            >
              {c.Name}
            </Tag>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FEATURED EVENTS
      ══════════════════════════════════════════════════ */}
      {featuredEvents.length > 0 && (
        <section style={{ padding: '56px 24px 0', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <div>
              <Title level={2} style={{ margin: 0, fontFamily: 'Sora,sans-serif', fontSize: 26 }}>
                🌟 Sự kiện nổi bật
              </Title>
              <Text type="secondary">Các sự kiện được nhiều người quan tâm nhất</Text>
            </div>
            <Button type="link" onClick={() => navigate('/events')} icon={<ArrowRightOutlined />} iconPosition="end" style={{ fontWeight: 600, color: '#2563eb' }}>
              Xem tất cả
            </Button>
          </div>

          <Row gutter={[20, 20]}>
            {featuredEvents.map(event => (
              <Col key={event.EventID} xs={24} sm={12} lg={8}>
                <EventCard event={event} />
              </Col>
            ))}
          </Row>
        </section>
      )}

      {/* ══════════════════════════════════════════════════
          UPCOMING EVENTS
      ══════════════════════════════════════════════════ */}
      <section style={{ padding: '56px 24px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <Title level={2} style={{ margin: 0, fontFamily: 'Sora,sans-serif', fontSize: 26 }}>
              📅 Sự kiện sắp diễn ra
            </Title>
            <Text type="secondary">Đừng bỏ lỡ những sự kiện thú vị sắp tới</Text>
          </div>
          <Button type="link" onClick={() => navigate('/events')} icon={<ArrowRightOutlined />} iconPosition="end" style={{ fontWeight: 600, color: '#2563eb' }}>
            Tất cả sự kiện
          </Button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : upcomingEvents.length === 0 ? (
          <Empty description="Chưa có sự kiện nào" />
        ) : (
          <Row gutter={[20, 20]}>
            {upcomingEvents.map(event => (
              <Col key={event.EventID} xs={24} sm={12} lg={6}>
                <EventCard event={event} />
              </Col>
            ))}
          </Row>
        )}

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Button size="large" onClick={() => navigate('/events')}
            style={{ borderRadius: 10, paddingInline: 32, height: 48, fontWeight: 600, border: '2px solid #2563eb', color: '#2563eb' }}>
            Xem tất cả sự kiện <ArrowRightOutlined />
          </Button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════════ */}
      <section style={{
        background: 'linear-gradient(135deg,#0f1629,#1a2744)',
        padding: '64px 24px', textAlign: 'center',
      }}>
        <h2 style={{ fontFamily: 'Sora,sans-serif', fontSize: 30, color: 'white', fontWeight: 800, marginBottom: 12 }}>
          Bạn là ban tổ chức?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 32 }}>
          Tạo và quản lý sự kiện của bạn dễ dàng hơn bao giờ hết.
        </p>
        <Button type="primary" size="large" onClick={() => navigate('/register')}
          style={{ borderRadius: 10, height: 50, paddingInline: 36, fontWeight: 700, fontSize: 16 }}>
          Bắt đầu miễn phí →
        </Button>
      </section>
    </MainLayout>
  );
};

export default HomePage;
