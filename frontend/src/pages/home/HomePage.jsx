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
} from "@ant-design/icons";
import MainLayout from "../../components/layout/MainLayout";
import EventCard from "../../components/events/EventCard";
import useEventStore from "../../store/eventStore";
import useSettingStore from "../../store/settingStore";
import { useTranslation } from "../../hooks/useTranslation";
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

// ─── Custom Featured Card ──────────────────────────────────────
const FeaturedEventCard = ({ event, index }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div
      onClick={() => navigate(`/events/${event.EventID}`)}
      className="featured-card-hover"
      style={{
        position: "relative",
        height: 420,
        borderRadius: 20,
        overflow: "hidden",
        cursor: "pointer",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
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
          <div style={{ background: "#F9FAFB", color: "#18181B", padding: "2px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14 }}>🔥</span> {event.RegisteredCount || 0} {t('home.registered') || "ĐĂNG KÝ"}
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

const HomePage = () => {
  const navigate = useNavigate();
  const {events, isLoading, categories, fetchEvents, fetchMeta} =
    useEventStore();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const heroRef = useRef(null);
  const carouselRef = useRef(null);
  const { theme } = useSettingStore();
  const { t } = useTranslation();

  useEffect(() => {
    fetchMeta();
    fetchEvents({status: "Published", limit: 100, page: 1});
  }, []);

  const handleScrollLeft = () => {
    carouselRef.current?.prev();
  };

  const handleScrollRight = () => {
    carouselRef.current?.next();
  };

  const handleSearch = () => {
    navigate(
      `/events?search=${encodeURIComponent(search)}${selectedCat ? `&categoryId=${selectedCat}` : ""}`,
    );
  };

  const featuredEvents = [...events]
    .filter((e) => dayjs(e.EndDate).isAfter(dayjs())) // Sắp hoặc đang diễn ra
    .sort((a, b) => (b.RegisteredCount || 0) - (a.RegisteredCount || 0))
    .slice(0, 5);

  const upcomingEvents = [...events]
    .filter((e) => dayjs(e.StartDate).isAfter(dayjs()))
    .sort((a, b) => dayjs(a.StartDate).valueOf() - dayjs(b.StartDate).valueOf())
    .slice(0, 3);

  return (
    <MainLayout>
      {/* ══════════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        style={{
          background:
            "linear-gradient(145deg, #0f1629 0%, #162040 40%, #1a1060 80%, #0f1629 100%)",
          minHeight: "88vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          padding: "80px 24px",
        }}
      >
        {/* Decorative blobs */}
        {[
          {
            w: 500,
            h: 500,
            top: "-150px",
            left: "-100px",
            color: "#60a5fa",
            opacity: 0.07,
          },
          {
            w: 400,
            h: 400,
            bottom: "-100px",
            right: "-50px",
            color: "#a78bfa",
            opacity: 0.08,
          },
          {
            w: 300,
            h: 300,
            top: "40%",
            left: "60%",
            color: "#34d399",
            opacity: 0.05,
          },
        ].map((b, i) => (
          <div
            key={i}
            className="animate-float"
            style={{
              position: "absolute",
              width: b.w,
              height: b.h,
              top: b.top,
              bottom: b.bottom,
              left: b.left,
              right: b.right,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${b.color}, transparent 70%)`,
              opacity: b.opacity,
              pointerEvents: "none",
              animationDelay: `${i * 2}s`,
            }}
          />
        ))}

        <div
          style={{
            textAlign: "center",
            maxWidth: 780,
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Badge */}
          <div
            className="animate-fade-in-up"
            style={{
              animationDelay: "0.1s",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 100,
              padding: "6px 16px",
              marginBottom: 28,
              backdropFilter: "blur(8px)",
            }}
          >
            <span style={{fontSize: 14}}>✨</span>
            <Text
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {t('home.badge')}
            </Text>
          </div>

          <h1
            className="animate-fade-in-up"
            style={{
              animationDelay: "0.2s",
              fontFamily: "'Geist', sans-serif",
              fontSize: "clamp(36px, 6vw, 68px)",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.15,
              marginBottom: 20,
              letterSpacing: "-1px",
            }}
          >
            {t('home.heroTitle1')}
            <br />
            <span
              className="animate-shimmer"
              style={{
                background:
                  "linear-gradient(90deg,#60a5fa,#a78bfa,#34d399,#60a5fa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {t('home.heroTitle2')}
            </span>
          </h1>

          <p
            className="animate-fade-in-up"
            style={{
              animationDelay: "0.3s",
              fontSize: "clamp(16px, 2vw, 20px)",
              color: "rgba(255,255,255,0.7)",
              marginBottom: 40,
              lineHeight: 1.6,
            }}
          >
            {t('home.heroSubtitle')}
          </p>

          {/* Search Bar */}
          <style>{`
            .hero-search-bar {
              display: flex; gap: 0; max-width: 620px; margin: 0 auto 48px;
              background: white; border-radius: 14px; padding: 6px 6px 6px 0;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .hero-search-category { 
              width: 140px; display: flex; align-items: center; 
              background: #f0fdf4; border-radius: 8px; margin-right: 8px;
            }
            .hero-search-category .ant-select-selector { 
              padding: 0 12px !important; 
              background-color: transparent !important;
              color: #166534 !important;
              font-weight: 600;
            }
            .hero-search-category .ant-select-selection-placeholder {
              color: #166534 !important;
              opacity: 0.7;
            }
            .hero-search-btn { border-radius: 10px; padding: 0 24px; height: 48px; }
            @media (max-width: 576px) {
              .hero-search-bar { flex-direction: column; padding: 12px; gap: 8px; border-radius: 16px; background: rgba(255,255,255,0.95); }
              .hero-search-category { width: 100%; border-left: none; margin-right: 0; padding: 4px 0; background: #f0fdf4; border-radius: 8px; }
              .hero-search-btn { width: 100%; height: 44px; margin-top: 4px; }
            }
          `}</style>
          <div
            className="hero-search-bar animate-fade-in-up"
            style={{animationDelay: "0.4s"}}
          >
            <Input
              size="large"
              placeholder={t('home.searchPlaceholder')}
              prefix={<SearchOutlined style={{color: "#9ca3af"}} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleSearch}
              style={{flex: 1, borderRadius: 12, border: "none"}}
            />
            <Select
              placeholder={t('home.categoryPlaceholder')}
              value={selectedCat || undefined}
              onChange={setSelectedCat}
              variant="borderless"
              className="hero-search-category"
              allowClear
            >
              {categories.map((c) => (
                <Option key={c.CategoryID} value={c.CategoryID}>
                  {t(`categories.${c.Name}`) !== `categories.${c.Name}` ? t(`categories.${c.Name}`) : c.Name}
                </Option>
              ))}
            </Select>
            <Button
              type="primary"
              size="large"
              onClick={handleSearch}
              style={{
                borderRadius: 12,
                padding: "0 32px",
                fontWeight: 600,
                background: "var(--onyx-accent)",
              }}
            >
              {t('home.searchBtn')}
            </Button>
          </div>

          {/* Stats */}
          <div
            className="animate-fade-in-up"
            style={{
              animationDelay: "0.5s",
              display: "flex",
              justifyContent: "center",
              gap: 40,
              flexWrap: "wrap",
            }}
          >
            {[
              {val: events.length || 1500, label: t('home.stats.events'), suffix: "+"},
              {val: 50000, label: t('home.stats.users'), suffix: "+"},
              {val: 200, label: t('home.stats.organizers'), suffix: "+"},
            ].map((s, i) => (
              <div key={i} style={{textAlign: "center"}}>
                <div
                  style={{
                    color: "var(--blue-light)",
                    fontSize: 28,
                    marginBottom: 8,
                  }}
                >
                  {i === 0 && <CalendarOutlined className="animate-float-icon" />}
                  {i === 1 && <TeamOutlined className="animate-float-icon" style={{animationDelay: "0.2s"}} />}
                  {i === 2 && <TrophyOutlined className="animate-float-icon" style={{animationDelay: "0.4s"}} />}
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontFamily: "'Geist', sans-serif",
                    fontWeight: 800,
                    color: "white",
                  }}
                >
                  <Counter target={s.val} suffix={s.suffix} />
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wave */}
        <svg
          style={{position: "absolute", bottom: 0, left: 0, width: "100%"}}
          viewBox="0 0 1440 60"
          fill="none"
        >
          <path
            d="M0 60 C360 0 1080 0 1440 60 L1440 60 L0 60Z"
            fill={theme === 'dark' ? '#000000' : '#f9fafb'}
          />
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
          .featured-card-hover {
            transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease;
          }
          .featured-card-hover:hover {
            transform: translateY(-6px);
            box-shadow: 0 12px 32px rgba(0,0,0,0.15) !important;
          }
          .featured-card-hover:hover .featured-card-img {
            transform: scale(1.05);
          }
        `}</style>
      </section>

      {/* ══════════════════════════════════════════════════
          CATEGORY CHIPS
      ══════════════════════════════════════════════════ */}
      <section
        style={{padding: "40px 24px 0", maxWidth: 1200, margin: "0 auto"}}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Tag
            className="category-tag-hover"
            onClick={() => navigate("/events")}
            style={{
              cursor: "pointer",
              padding: "6px 16px",
              fontSize: 14,
              borderRadius: 100,
              background: "#1a2744",
              color: "white",
              border: "none",
              fontWeight: 600,
            }}
          >
            🔥 {t('categories.Tất cả')}
          </Tag>
          {categories.map((c) => (
            <Tag
              className="category-tag-hover"
              key={c.CategoryID}
              onClick={() => navigate(`/events?categoryId=${c.CategoryID}`)}
              style={{
                cursor: "pointer",
                padding: "6px 16px",
                fontSize: 14,
                borderRadius: 100,
                fontWeight: 500,
                border: "1.5px solid #e5e7eb",
                background: "white",
                color: "#374151",
              }}
            >
              {t(`categories.${c.Name}`) !== `categories.${c.Name}` ? t(`categories.${c.Name}`) : c.Name}
            </Tag>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FEATURED EVENTS
      ══════════════════════════════════════════════════ */}
      {featuredEvents.length > 0 && (
        <section
          style={{padding: "60px 24px", maxWidth: 1200, margin: "0 auto"}}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 32,
            }}
          >
            <div>
              <Title
                level={2}
                style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: 32,
                  fontWeight: 800,
                  margin: 0,
                  color: theme === 'dark' ? '#fff' : '#18181b',
                }}
              >
                {t('home.featured')} <span style={{color: "#f59e0b"}}>★</span>
              </Title>
              <Text style={{color: theme === 'dark' ? '#a1a1aa' : '#71717a', fontSize: 16}}>
                {t('home.heroSubtitle')}
              </Text>
            </div>
            
            <div style={{ display: 'flex', gap: 8 }}>
              <Button 
                shape="circle" 
                icon={<LeftOutlined />} 
                onClick={handleScrollLeft} 
                style={{ border: '1px solid var(--whisper-border)', color: 'var(--charcoal-ink)' }}
              />
              <Button 
                shape="circle" 
                icon={<RightOutlined />} 
                onClick={handleScrollRight}
                style={{ border: '1px solid var(--whisper-border)', color: 'var(--charcoal-ink)' }}
              />
            </div>
          </div>

          <div style={{ margin: "0 -12px" }}>
            <Carousel
              ref={carouselRef}
              autoplay
              autoplaySpeed={3000}
              slidesToShow={3}
              infinite={true}
              dots={false}
              responsive={[
                { breakpoint: 1024, settings: { slidesToShow: 2 } },
                { breakpoint: 768, settings: { slidesToShow: 1 } },
              ]}
            >
              {featuredEvents.map((event, index) => (
                <div key={event.EventID}>
                  <FeaturedEventCard event={event} index={index} />
                </div>
              ))}
            </Carousel>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════
          UPCOMING EVENTS
      ══════════════════════════════════════════════════ */}
      <section
        style={{padding: "56px 24px 80px", maxWidth: 1200, margin: "0 auto"}}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <div>
            <Title
              level={2}
              style={{
                margin: 0,
                fontFamily: "'Geist', sans-serif",
                fontSize: 26,
                color: theme === 'dark' ? '#fff' : '#18181b',
              }}
            >
              📅 {t('home.upcoming')}
            </Title>
            <Text style={{color: theme === 'dark' ? '#a1a1aa' : '#71717a'}}>
              {t('home.upcomingSubtitle')}
            </Text>
          </div>
          <Button
            type="link"
            onClick={() => navigate("/events")}
            icon={<ArrowRightOutlined />}
            iconPosition="end"
            style={{fontWeight: 600, color: "#2563eb"}}
          >
            {t('home.allEvents')}
          </Button>
        </div>

        {isLoading ? (
          <div style={{textAlign: "center", padding: 60}}>
            <Spin size="large" />
          </div>
        ) : upcomingEvents.length === 0 ? (
          <Empty description="Chưa có sự kiện nào" />
        ) : (
          <Row gutter={[20, 20]}>
            {upcomingEvents.map((event, index) => (
              <Col key={event.EventID} xs={24} sm={12} lg={8}>
                <EventCard event={event} index={index} />
              </Col>
            ))}
          </Row>
        )}

        <div style={{textAlign: "center", marginTop: 40}}>
          <Button
            size="large"
            onClick={() => navigate("/events")}
            style={{
              borderRadius: 10,
              paddingInline: 32,
              height: 48,
              fontWeight: 600,
              border: "2px solid #2563eb",
              color: "#2563eb",
              background: 'transparent',
            }}
          >
            {t('home.viewAll')} <ArrowRightOutlined />
          </Button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════════ */}
      <section
        style={{
          background: "linear-gradient(135deg,#0f1629,#1a2744)",
          padding: "64px 24px",
          textAlign: "center",
        }}
      >
        <h2
          className="animate-fade-in-up"
          style={{
            fontFamily: "'Geist', sans-serif",
            fontSize: 30,
            color: "white",
            fontWeight: 800,
            marginBottom: 12,
          }}
        >
          {t('home.ctaTitle')}
        </h2>
        <p
          className="animate-fade-in-up"
          style={{
            animationDelay: "0.1s",
            color: "rgba(255,255,255,0.6)",
            fontSize: 16,
            marginBottom: 32,
          }}
        >
          {t('home.ctaSubtitle')}
        </p>
        <div
          className="animate-fade-in-up"
          style={{
            animationDelay: "0.2s",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Button
            className="animate-soft-pulse"
            type="primary"
            size="large"
            onClick={() => navigate("/register")}
            style={{
              borderRadius: 10,
              height: 50,
              paddingInline: 36,
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            {t('home.ctaBtn')}
          </Button>
        </div>
      </section>
    </MainLayout>
  );
};

export default HomePage;
