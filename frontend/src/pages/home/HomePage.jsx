import React, {useEffect, useState, useRef} from "react";
import {useNavigate} from "react-router-dom";
import {
  Input,
  Button,
  Row,
  Col,
  Tag,
  Spin,
  Select,
  Empty,
  Typography,
  Carousel,
} from "antd";
import {
  SearchOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  TeamOutlined,
  TrophyOutlined,
  LeftOutlined,
  RightOutlined,
  EnvironmentOutlined,
  FireOutlined,
  SafetyCertificateOutlined,
  RocketOutlined,
  CodeOutlined, 
  BookOutlined, 
  SmileOutlined, 
  HeartOutlined, 
  NotificationOutlined, 
  AppstoreOutlined
} from "@ant-design/icons";
import MainLayout from "../../components/layout/MainLayout";
import EventCard from "../../components/events/EventCard";
import useEventStore from "../../store/eventStore";
import useSettingStore from "../../store/settingStore";
import { useTranslation } from "../../hooks/useTranslation";
import { useScrollAnimation } from "../../hooks/useScrollAnimation";
import dayjs from "dayjs";

const {Title, Text} = Typography;
const {Option} = Select;

// ─── Animated counter ──────────────────────────────────────────
const Counter = ({target, suffix = ""}) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / 60);
    const t = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(t);
      } else setCount(start);
    }, 20);
    return () => clearInterval(t);
  }, [target]);
  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

<<<<<<< HEAD
const getCategoryIcon = (categoryName) => {
  const name = (categoryName || '').toLowerCase();
  if (name.includes('công nghệ') || name.includes('tech') || name.includes('it')) return <CodeOutlined />;
  if (name.includes('học thuật') || name.includes('academic')) return <BookOutlined />;
  if (name.includes('hướng nghiệp') || name.includes('career')) return <RocketOutlined />;
  if (name.includes('kỹ năng') || name.includes('skill')) return <SmileOutlined />;
  if (name.includes('thể thao') || name.includes('sport')) return <TrophyOutlined />;
  if (name.includes('tình nguyện') || name.includes('volunteer')) return <HeartOutlined />;
  if (name.includes('văn hóa') || name.includes('nghệ thuật') || name.includes('art')) return <NotificationOutlined />;
  return <AppstoreOutlined />;
};


=======
// ─── Custom Featured Card ──────────────────────────────────────
const FeaturedEventCard = ({ event, index }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div
      onClick={() => navigate(`/events/${event.EventID}`)}
      className="landing-event-card"
      style={{
        position: "relative",
        height: 420,
        borderRadius: 20,
        overflow: "hidden",
        cursor: "pointer",
        background: "#18181b",
        margin: "12px",
      }}
    >
      <img
        src={event.CoverImageURL || "https://images.unsplash.com/photo-1540575467063-178a50c2df87"}
        alt={event.Title}
        className="featured-card-img"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.85,
          transition: "transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(24,24,27,1) 0%, rgba(24,24,27,0.3) 60%, transparent 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Tag color="#27272A" style={{ margin: 0, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, fontWeight: 500, color: "white" }}>
            {event.CategoryName ? (t(`categories.${event.CategoryName}`) !== `categories.${event.CategoryName}` ? t(`categories.${event.CategoryName}`) : event.CategoryName) : t('home.stats.events')}
          </Tag>
          <div style={{ background: "#F9FAFB", color: "#f59e0b", padding: "2px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <FireOutlined /> {event.RegisteredCount || 0} ĐĂNG KÝ
          </div>
        </div>
        
        <h3 style={{ margin: 0, color: "white", fontSize: 24, fontFamily: "'Geist', sans-serif", fontWeight: 700, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {event.Title}
        </h3>

        <div style={{ display: "flex", alignItems: "center", gap: 20, color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CalendarOutlined style={{ color: "#F9FAFB" }} /> {dayjs(event.StartDate).format("DD/MM - HH:mm")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <EnvironmentOutlined style={{ color: "#F9FAFB" }} /> {event.VenueName?.split(" ")[0] || "Online"}
          </div>
        </div>
      </div>
    </div>
  );
};

>>>>>>> e327bcf86549f211b22360e539b7612b019cdeca
const HomePage = () => {
  const navigate = useNavigate();
  const {events, isLoading, categories, fetchEvents, fetchMeta} = useEventStore();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const carouselRef = useRef(null);
  const { theme } = useSettingStore();
  const { t } = useTranslation();

  // Scroll Animation Hooks
  const [heroRef, heroVisible] = useScrollAnimation({ threshold: 0.1, triggerOnce: true });
  const [aboutRef, aboutVisible] = useScrollAnimation({ threshold: 0.2, triggerOnce: true });
  const [featuresRef, featuresVisible] = useScrollAnimation({ threshold: 0.2, triggerOnce: true });
  const [featuredEventsRef, featuredEventsVisible] = useScrollAnimation({ threshold: 0.1, triggerOnce: true });
  const [upcomingEventsRef, upcomingEventsVisible] = useScrollAnimation({ threshold: 0.1, triggerOnce: true });

  useEffect(() => {
    fetchMeta();
    fetchEvents({status: "Published", limit: 100, page: 1});
  }, []);

  const handleScrollLeft = () => carouselRef.current?.prev();
  const handleScrollRight = () => carouselRef.current?.next();
  const handleSearch = () => {
    navigate(`/events?search=${encodeURIComponent(search)}${selectedCat ? `&categoryId=${selectedCat}` : ""}`);
  };

  const featuredEvents = [...events]
    .filter((e) => dayjs(e.EndDate).isAfter(dayjs()))
    .sort((a, b) => (b.RegisteredCount || 0) - (a.RegisteredCount || 0))
    .slice(0, 5);

  const upcomingEvents = [...events]
    .filter((e) => dayjs(e.StartDate).isAfter(dayjs()))
    .sort((a, b) => dayjs(a.StartDate).valueOf() - dayjs(b.StartDate).valueOf())
    .slice(0, 6);

  return (
    <MainLayout>
      {/* ══════════════════════════════════════════════════
          HERO SECTION (FPTU CONTEXT)
      ══════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        style={{
          background: "linear-gradient(145deg, #0f1629 0%, #162040 40%, #1a1060 80%, #0f1629 100%)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          padding: "80px 24px",
        }}
      >
        {/* Decorative blobs */}
        <div style={{ position: "absolute", width: 500, height: 500, top: "-150px", left: "-100px", borderRadius: "50%", background: "radial-gradient(circle, #f27024, transparent 70%)", opacity: 0.1, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 400, height: 400, bottom: "-100px", right: "-50px", borderRadius: "50%", background: "radial-gradient(circle, #34d399, transparent 70%)", opacity: 0.1, pointerEvents: "none" }} />

        <div style={{ textAlign: "center", maxWidth: 800, position: "relative", zIndex: 2 }}>
          {/* Badge */}
          <div
            className={`motion-fade-up ${heroVisible ? 'is-visible' : ''}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 100, padding: "6px 16px", marginBottom: 28, backdropFilter: "blur(8px)",
            }}
          >
            <span style={{fontSize: 14, color: '#f27024'}}>🔥</span>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500 }}>
              {t('home.badge')}
            </Text>
          </div>

          <h1
            className={`motion-fade-up motion-delay-100 ${heroVisible ? 'is-visible' : ''}`}
            style={{
              fontFamily: "'Geist', sans-serif", fontSize: "clamp(36px, 6vw, 68px)",
              fontWeight: 800, color: "white", lineHeight: 1.15, marginBottom: 20, letterSpacing: "-1px",
            }}
          >
            {t('home.heroTitle1')} <br />
            <span style={{ color: "#f27024" }}>{t('home.heroTitle2')}</span>
          </h1>

          <p
            className={`motion-fade-up motion-delay-200 ${heroVisible ? 'is-visible' : ''}`}
            style={{
              fontSize: "clamp(16px, 2vw, 20px)", color: "rgba(255,255,255,0.7)",
              marginBottom: 40, lineHeight: 1.6,
            }}
          >
            {t('home.heroSubtitle')}
          </p>

          {/* Search Bar */}
          <div className={`motion-fade-up motion-delay-300 ${heroVisible ? 'is-visible' : ''}`}>
            <div style={{
                display: "flex", gap: 0, maxWidth: 620, margin: "0 auto 48px",
                background: "white", borderRadius: 14, padding: "6px 6px 6px 0",
                boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
              }}
              className="hero-search-bar"
            >
              <Input
                size="large" placeholder={t('home.searchPlaceholder')}
                prefix={<SearchOutlined style={{color: "#9ca3af"}} />}
                value={search} onChange={(e) => setSearch(e.target.value)} onPressEnter={handleSearch}
                style={{flex: 1, borderRadius: 12, border: "none"}}
              />
              <Button
                type="primary" size="large" onClick={handleSearch}
                style={{ borderRadius: 10, padding: "0 32px", fontWeight: 600, background: "#f27024", border: "none" }}
              >
                {t('home.searchBtn')}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div
            className={`motion-fade-up motion-delay-400 ${heroVisible ? 'is-visible' : ''}`}
            style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}
          >
            {[
              {val: 50, label: t('home.stats.organizers'), suffix: "+", icon: <TeamOutlined />},
              {val: 1000, label: t('home.stats.events'), suffix: "+", icon: <CalendarOutlined />},
              {val: 15000, label: t('home.stats.users'), suffix: "+", icon: <FireOutlined />},
            ].map((s, i) => (
              <div key={i} style={{textAlign: "center"}}>
                <div style={{ color: "#f27024", fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontFamily: "'Geist', sans-serif", fontWeight: 800, color: "white" }}>
                  <Counter target={s.val} suffix={s.suffix} />
                </div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          ABOUT SECTION
      ══════════════════════════════════════════════════ */}
      <section style={{ padding: '40px 24px 0', maxWidth: 1200, margin: '0 auto', overflow: 'hidden' }}>
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
        `}</style>
        <div 
          className="hide-scrollbar" 
          style={{ 
            display: 'flex', 
            gap: 10, 
            flexWrap: 'nowrap', 
            justifyContent: 'flex-start', 
            overflowX: 'auto',
            paddingBottom: 8 // for scrollbar space if visible
          }}
        >
          <Tag
            className="category-tag-hover"
            onClick={() => navigate('/events')}
            style={{ 
              cursor: 'pointer', padding: '6px 16px', fontSize: 14, borderRadius: 100, 
              background: '#1a2744', color: 'white', border: 'none', fontWeight: 600, 
              flexShrink: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' 
            }}
          >
            🔥 Tất cả
          </Tag>
          {categories.map((c) => (
            <Tag
              className="category-tag-hover"
              key={c.CategoryID}
              onClick={() => navigate(`/events?categoryId=${c.CategoryID}`)}
              icon={getCategoryIcon(c.Name)}
              style={{ 
                cursor: 'pointer', padding: '6px 16px', fontSize: 14, borderRadius: 100, 
                fontWeight: 500, border: '1.5px solid #e5e7eb', background: 'white', 
                color: '#374151', flexShrink: 0, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' 
              }}
            >
              {c.Name}
            </Tag>
          ))}
        </div>
      </section>

      <section ref={aboutRef} style={{ padding: "100px 24px", background: theme === 'dark' ? '#121212' : '#ffffff' }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} md={12}>
              <div className={`motion-slide-left ${aboutVisible ? 'is-visible' : ''}`}>
                <div style={{ color: "#f27024", fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>{t('home.about.tag')}</div>
                <Title level={2} style={{ fontSize: 40, fontWeight: 800, color: theme === 'dark' ? '#fff' : '#111', lineHeight: 1.2, marginBottom: 24 }}>
                  {t('home.about.title')}
                </Title>
                <p style={{ fontSize: 18, color: theme === 'dark' ? '#a1a1aa' : '#555', lineHeight: 1.7, marginBottom: 24 }}>
                  {t('home.about.p1')}
                </p>
                <p style={{ fontSize: 18, color: theme === 'dark' ? '#a1a1aa' : '#555', lineHeight: 1.7, marginBottom: 32 }}>
                  {t('home.about.p2')}
                </p>
                <Button type="primary" size="large" onClick={() => navigate('/events')} style={{ background: '#f27024', borderRadius: 8, fontWeight: 600, padding: '0 32px', height: 48 }}>
                  {t('home.about.btn')}
                </Button>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div className={`motion-slide-right ${aboutVisible ? 'is-visible' : ''}`} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: -20, left: -20, width: 100, height: 100, background: '#f27024', borderRadius: '50%', opacity: 0.2 }} />
                <img 
                  src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                  alt="FPTU Events" 
                  style={{ width: '100%', borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.1)', position: 'relative', zIndex: 2 }} 
                />
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FEATURES SECTION
      ══════════════════════════════════════════════════ */}
      <section ref={featuresRef} style={{ padding: "100px 24px", background: theme === 'dark' ? '#0a0a0a' : '#f9fafb' }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <div className={`motion-fade-up ${featuresVisible ? 'is-visible' : ''}`}>
            <div style={{ color: "#f27024", fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>{t('home.features.tag')}</div>
            <Title level={2} style={{ fontSize: 36, fontWeight: 800, color: theme === 'dark' ? '#fff' : '#111', marginBottom: 60 }}>
              {t('home.features.title')}
            </Title>
          </div>

          <Row gutter={[32, 32]}>
            {[
              {
                icon: <TeamOutlined style={{ fontSize: 40, color: '#f27024' }} />,
                title: t('home.features.f1Title'),
                desc: t('home.features.f1Desc')
              },
              {
                icon: <SafetyCertificateOutlined style={{ fontSize: 40, color: '#10b981' }} />,
                title: t('home.features.f2Title'),
                desc: t('home.features.f2Desc')
              },
              {
                icon: <RocketOutlined style={{ fontSize: 40, color: '#3b82f6' }} />,
                title: t('home.features.f3Title'),
                desc: t('home.features.f3Desc')
              }
            ].map((f, i) => (
              <Col xs={24} md={8} key={i}>
                <div 
                  className={`motion-fade-up motion-delay-${(i+1)*100} ${featuresVisible ? 'is-visible' : ''}`}
                  style={{
                    background: theme === 'dark' ? '#18181b' : '#fff',
                    padding: 40,
                    borderRadius: 24,
                    height: '100%',
                    boxShadow: theme === 'dark' ? 'none' : '0 10px 30px rgba(0,0,0,0.05)',
                    border: theme === 'dark' ? '1px solid #27272a' : 'none',
                    transition: 'transform 0.3s',
                  }}
                >
                  <div style={{ background: theme === 'dark' ? 'rgba(242,112,36,0.1)' : '#fff3e0', width: 80, height: 80, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    {f.icon}
                  </div>
                  <Title level={4} style={{ color: theme === 'dark' ? '#fff' : '#111', fontWeight: 700, marginBottom: 16 }}>{f.title}</Title>
                  <Text style={{ color: theme === 'dark' ? '#a1a1aa' : '#555', fontSize: 16, lineHeight: 1.6 }}>{f.desc}</Text>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FEATURED EVENTS SECTION
      ══════════════════════════════════════════════════ */}
      {featuredEvents.length > 0 && (
        <section ref={featuredEventsRef} style={{padding: "100px 24px", maxWidth: 1200, margin: "0 auto"}}>
          <div className={`motion-fade-up ${featuredEventsVisible ? 'is-visible' : ''}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
            <div>
              <Title level={2} style={{ fontFamily: "'Geist', sans-serif", fontSize: 36, fontWeight: 800, margin: 0, color: theme === 'dark' ? '#fff' : '#18181b' }}>
                {t('home.featured')} <span style={{color: "#f27024"}}>★</span>
              </Title>
              <Text style={{color: theme === 'dark' ? '#a1a1aa' : '#71717a', fontSize: 16}}>
                {t('home.featuredSubtitle')}
              </Text>
            </div>
            
            <div style={{ display: 'flex', gap: 8 }}>
              <Button shape="circle" icon={<LeftOutlined />} onClick={handleScrollLeft} style={{ border: '1px solid var(--whisper-border)' }} />
              <Button shape="circle" icon={<RightOutlined />} onClick={handleScrollRight} style={{ border: '1px solid var(--whisper-border)' }} />
            </div>
          </div>

          <div className={`motion-fade-up motion-delay-200 ${featuredEventsVisible ? 'is-visible' : ''}`} style={{ margin: "0 -12px" }}>
            <Carousel
              ref={carouselRef} autoplay autoplaySpeed={4000} slidesToShow={3} infinite={true} dots={false}
              responsive={[
                { breakpoint: 1024, settings: { slidesToShow: 2 } },
                { breakpoint: 768, settings: { slidesToShow: 1 } },
              ]}
            >
              {featuredEvents.map((event, index) => (
                <div key={event.EventID}><FeaturedEventCard event={event} index={index} /></div>
              ))}
            </Carousel>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════
          UPCOMING EVENTS
      ══════════════════════════════════════════════════ */}
      <section ref={upcomingEventsRef} style={{padding: "50px 24px 100px", maxWidth: 1200, margin: "0 auto", borderTop: `1px solid ${theme === 'dark' ? '#27272a' : '#e5e7eb'}`}}>
        <div className={`motion-fade-up ${upcomingEventsVisible ? 'is-visible' : ''}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40, marginTop: 50 }}>
          <div>
            <Title level={2} style={{ margin: 0, fontFamily: "'Geist', sans-serif", fontSize: 32, color: theme === 'dark' ? '#fff' : '#18181b' }}>
              📅 {t('home.upcoming')}
            </Title>
            <Text style={{color: theme === 'dark' ? '#a1a1aa' : '#71717a', fontSize: 16}}>
              {t('home.upcomingSubtitle')}
            </Text>
          </div>
          <Button type="link" onClick={() => navigate("/events")} icon={<ArrowRightOutlined />} iconPosition="end" style={{fontWeight: 600, color: "#f27024", fontSize: 16}}>
            {t('home.allEvents')}
          </Button>
        </div>

        {isLoading ? (
          <div style={{textAlign: "center", padding: 60}}><Spin size="large" /></div>
        ) : upcomingEvents.length === 0 ? (
          <Empty description="Chưa có sự kiện nào" />
        ) : (
          <Row gutter={[24, 24]}>
            {upcomingEvents.map((event, index) => (
              <Col key={event.EventID} xs={24} sm={12} lg={8} className={`motion-fade-up motion-delay-${(index%3+1)*100} ${upcomingEventsVisible ? 'is-visible' : ''}`}>
                <EventCard event={event} index={index} />
              </Col>
            ))}
          </Row>
        )}
      </section>

      {/* ══════════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════════ */}
      <section style={{ background: "linear-gradient(135deg, #f27024, #ea580c)", padding: "80px 24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Geist', sans-serif", fontSize: 36, color: "white", fontWeight: 800, marginBottom: 16 }}>
          {t('home.ctaTitle')}
        </h2>
        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 18, marginBottom: 40, maxWidth: 600, margin: "0 auto 40px" }}>
          {t('home.ctaSubtitle')}
        </p>
        <div>
          <Button size="large" onClick={() => navigate("/register")} style={{ borderRadius: 10, height: 52, paddingInline: 40, fontWeight: 700, fontSize: 16, color: "#ea580c", border: 'none' }}>
            {t('home.ctaBtn')}
          </Button>
        </div>
      </section>
    </MainLayout>
  );
};

export default HomePage;
