import React, {useEffect, useState} from "react";
import {useParams, useNavigate} from "react-router-dom";
import {
  Button,
  Tag,
  Avatar,
  Modal,
  message,
  Spin,
  QRCode,
  Typography,
  Divider,
  Alert,
  Empty,
  Table,
} from "antd";
import {
  CalendarOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  ShareAltOutlined,
  HeartOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import MainLayout from "../../components/layout/MainLayout";
import useEventStore from "../../store/eventStore";
import useAuthStore from "../../store/authStore";
import {registrationService} from "../../services/registration.service";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

const {Text} = Typography;

// ─── Countdown Timer ──────────────────────────────────────────
const Countdown = ({targetDate}) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = dayjs(targetDate).diff(dayjs());
      if (diff <= 0) {
        setTimeLeft("Đã bắt đầu");
        return;
      }
      const d = dayjs.duration(diff);
      setTimeLeft(`${d.days()}d ${d.hours()}h ${d.minutes()}m ${d.seconds()}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  return (
    <span
      style={{fontFamily: "monospace", fontWeight: "bold", color: "#2563eb"}}
    >
      {timeLeft}
    </span>
  );
};

const EventDetailPage = ({adminEventId, noLayout}) => {
  const {id} = useParams();
  const targetId = adminEventId || id;
  const navigate = useNavigate();
  const {selectedEvent: event, isLoading, fetchEventById} = useEventStore();
  const {user, isAuthenticated} = useAuthStore();
  const [registering, setRegistering] = useState(false);
  const [myRegistration, setMyRegistration] = useState(null);
  const [ticketModal, setTicketModal] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  useEffect(() => {
    fetchEventById(targetId);
    if (
      isAuthenticated &&
      (user?.role === "Participant" || user?.role === "Speaker")
    )
      loadMyRegistration();
  }, [targetId, isAuthenticated, user]);

  useEffect(() => {
    if (event && (event.isStaff || user?.userId === event.OrganizerID)) {
      loadParticipants();
    }
  }, [event, user]);

  const loadParticipants = async () => {
    try {
      setLoadingParticipants(true);
      const API_BASE =
        process.env.REACT_APP_API_URL || "http://localhost:5000/api";
      const res = await fetch(
        `${API_BASE}/staff/events/${targetId}/participants`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        },
      );
      const data = await res.json();
      setParticipants(data.data || []);
    } catch {
    } finally {
      setLoadingParticipants(false);
    }
  };

  const loadMyRegistration = async () => {
    try {
      const res = await registrationService.getMyRegistrations();
      const reg = res.data.data.find(
        (r) =>
          String(r.EventID) === String(targetId) && r.Status === "Registered",
      );
      setMyRegistration(reg || null);
    } catch {}
  };

  const handleRegister = async () => {
    if (!isAuthenticated)
      return navigate("/login", {
        state: {from: {pathname: `/events/${targetId}`}},
      });
    if (user?.role !== "Participant" && user?.role !== "Speaker")
      return message.warning(
        "Chỉ người dùng cá nhân hoặc diễn giả mới có thể đăng ký tham gia sự kiện",
      );
    setRegistering(true);
    try {
      const res = await registrationService.register(parseInt(targetId));
      message.success(res.data.message);
      await loadMyRegistration();
    } catch (err) {
      message.error(err.response?.data?.message || "Đăng ký thất bại");
    } finally {
      setRegistering(false);
    }
  };

  const handleCancel = async () => {
    Modal.confirm({
      title: "Huỷ đăng ký?",
      content: "Bạn có chắc muốn huỷ đăng ký sự kiện này?",
      okText: "Huỷ đăng ký",
      okButtonProps: {danger: true},
      cancelText: "Không",
      onOk: async () => {
        try {
          await registrationService.cancel(myRegistration.RegistrationID);
          message.success("Đã huỷ đăng ký");
          setMyRegistration(null);
        } catch (err) {
          message.error(err.response?.data?.message || "Huỷ thất bại");
        }
      },
    });
  };

  if (isLoading || !event)
    return noLayout ? (
      <div style={{textAlign: "center", padding: "120px 24px"}}>
        <Spin size="large" />
      </div>
    ) : (
      <MainLayout>
        <div style={{textAlign: "center", padding: "120px 24px"}}>
          <Spin size="large" />
        </div>
      </MainLayout>
    );

  const isPast = dayjs(event.EndDate).isBefore(dayjs());
  const isFull =
    event.MaxParticipants && event.RegisteredCount >= event.MaxParticipants;
  const deadlinePassed =
    event.RegistrationDeadline &&
    dayjs().isAfter(dayjs(event.RegistrationDeadline));

  const isPastedHTML =
    event?.Description &&
    (event.Description.includes("&lt;div") ||
      event.Description.includes("&lt;style") ||
      event.Description.includes("&lt;!DOCTYPE") ||
      event.Description.includes("&lt;section"));

  const unescapeHTML = (htmlStr) => {
    if (!htmlStr) return "";
    if (isPastedHTML) {
      let text = htmlStr.replace(/<[^>]+>/g, " ");
      return text
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, " ");
    }
    return htmlStr
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"');
  };

  const fillPct = event.MaxParticipants
    ? Math.round(((event.RegisteredCount || 0) / event.MaxParticipants) * 100)
    : 0;
  const remaining = event.MaxParticipants
    ? event.MaxParticipants - (event.RegisteredCount || 0)
    : "Unlimited";

  const content = (
    <div
      style={{
        backgroundColor: "#ffffff",
        paddingBottom: "80px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* ── CSS Grid & Responsive ── */}
      <style>{`
        .figma-layout-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 60px;
          align-items: start;
        }
        .hero-banner { height: 400px; }
        @media (max-width: 1024px) {
          .figma-layout-grid { grid-template-columns: 1fr; gap: 40px; }
          .hero-banner { height: 320px; }
        }
        .custom-html-content img { max-width: 100%; border-radius: 12px; margin-top: 12px; }
        .figma-btn {
          width: 100%; height: 50px; border-radius: 12px; font-weight: bold; font-size: 16px; border: none; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .figma-btn-primary { background-color: #2563eb; color: white; }
        .figma-btn-primary:hover { background-color: #1d4ed8; }
        .figma-btn-primary:disabled { background-color: #cbd5e1; color: #64748b; cursor: not-allowed; }
        .figma-btn-danger { background-color: white; border: 1px solid #fecaca; color: #dc2626; }
        .figma-btn-danger:hover { background-color: #fef2f2; }
        .figma-btn-outline { background-color: white; border: 1px solid #e2e8f0; color: #334155; }
        .figma-btn-outline:hover { background-color: #f8fafc; }
      `}</style>

      {/* ── Hero Image Section ── */}
      <div
        className="hero-banner"
        style={{
          position: "relative",
          width: "100%",
          backgroundColor: "#0f172a",
          overflow: "hidden",
        }}
      >
        {event.CoverImageURL && (
          <img
            src={
              event.CoverImageURL.startsWith("http")
                ? event.CoverImageURL
                : `${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/../uploads/${event.CoverImageURL}`
            }
            alt={event.Title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.6,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(15,23,42,0.8), transparent)",
          }}
        />

        {!noLayout && (
          <button
            onClick={() => navigate(-1)}
            style={{
              position: "absolute",
              top: "24px",
              left: "24px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(0,0,0,0.5)",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "20px",
              cursor: "pointer",
              fontWeight: 600,
              backdropFilter: "blur(4px)",
            }}
          >
            <ArrowLeftOutlined /> Quay lại
          </button>
        )}

        {/* Tags */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            left: "24px",
            display: "flex",
            gap: "12px",
          }}
        >
          {event.CategoryName && (
            <span
              style={{
                backgroundColor: "#2563eb",
                color: "white",
                padding: "6px 16px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {event.CategoryName}
            </span>
          )}
          <span
            style={{
              backgroundColor: "#10b981",
              color: "white",
              padding: "6px 16px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            {event.Price === 0 || !event.Price ? "Free" : `$${event.Price}`}
          </span>
          {event.IsInternalOnly && (
            <span
              style={{
                backgroundColor: "#9333ea",
                color: "white",
                padding: "6px 16px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              Nội bộ
            </span>
          )}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div style={{maxWidth: "1200px", margin: "0 auto", padding: "40px 24px"}}>
        {/* Title */}
        <h1
          style={{
            fontSize: "36px",
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: "32px",
            lineHeight: 1.2,
          }}
        >
          {event.Title}
        </h1>

        <div className="figma-layout-grid">
          {/* ── LEFT COLUMN ── */}
          <div style={{display: "flex", flexDirection: "column", gap: "48px"}}>
            {/* Date & Time Info Boxes */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "16px",
              }}
            >
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                  }}
                >
                  <CalendarOutlined />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Date
                  </div>
                  <div
                    style={{
                      fontSize: "15px",
                      color: "#0f172a",
                      fontWeight: "bold",
                    }}
                  >
                    {dayjs(event.StartDate).format("MMMM D, YYYY")}
                  </div>
                </div>
              </div>
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    backgroundColor: "#eff6ff",
                    color: "#2563eb",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                  }}
                >
                  <ClockCircleOutlined />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    Time
                  </div>
                  <div
                    style={{
                      fontSize: "15px",
                      color: "#0f172a",
                      fontWeight: "bold",
                    }}
                  >
                    {dayjs(event.StartDate).format("h:mm A")}
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: "16px",
                }}
              >
                About this Event
              </h2>
              <div
                style={{color: "#475569", lineHeight: 1.7, fontSize: "15px"}}
              >
                {event.Description ? (
                  <div
                    className="custom-html-content"
                    dangerouslySetInnerHTML={{
                      __html: unescapeHTML(event.Description),
                    }}
                  />
                ) : (
                  <p>Chưa có mô tả cho sự kiện này.</p>
                )}
              </div>
              {/* Dummy tags matching Figma */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  marginTop: "24px",
                }}
              >
                <span
                  style={{
                    color: "#2563eb",
                    backgroundColor: "#eff6ff",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  #Coding
                </span>
                <span
                  style={{
                    color: "#2563eb",
                    backgroundColor: "#eff6ff",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  #Competition
                </span>
                <span
                  style={{
                    color: "#2563eb",
                    backgroundColor: "#eff6ff",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  #Event
                </span>
              </div>
            </div>

            {/* Agenda Section */}
            <div>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: "24px",
                }}
              >
                Agenda
              </h2>
              {event.sessions?.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "24px",
                  }}
                >
                  {event.sessions.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        gap: "24px",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: "#eff6ff",
                          color: "#2563eb",
                          fontWeight: "bold",
                          padding: "8px 16px",
                          borderRadius: "20px",
                          fontSize: "14px",
                          border: "1px solid #dbeafe",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dayjs(s.StartTime).format("h:mm A")}
                      </div>
                      <div style={{paddingTop: "6px"}}>
                        <h3
                          style={{
                            margin: 0,
                            fontWeight: "bold",
                            color: "#0f172a",
                            fontSize: "16px",
                          }}
                        >
                          {s.Title}
                        </h3>
                        {(s.Speakers || s.Description) && (
                          <p
                            style={{
                              margin: "8px 0 0",
                              fontSize: "14px",
                              color: "#64748b",
                            }}
                          >
                            {s.Speakers || s.Description}
                          </p>
                        )}
                        {s.Location && (
                          <p
                            style={{
                              margin: "8px 0 0",
                              fontSize: "12px",
                              color: "#94a3b8",
                            }}
                          >
                            <EnvironmentOutlined /> {s.Location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="Chưa có chương trình chi tiết" />
              )}
            </div>

            {/* Organizer Section */}
            <div>
              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: "24px",
                }}
              >
                Organizer
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  padding: "24px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Avatar
                  size={64}
                  style={{
                    backgroundColor: "#2563eb",
                    fontSize: "24px",
                    fontWeight: "bold",
                  }}
                >
                  {event.OrganizerName?.[0]}
                </Avatar>
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#0f172a",
                      fontSize: "17px",
                      marginBottom: "4px",
                    }}
                  >
                    {event.OrganizationName || event.OrganizerName}
                  </div>
                  <div style={{fontSize: "14px", color: "#64748b"}}>
                    {event.OrganizerEmail}
                  </div>
                </div>
              </div>
            </div>

            {/* ADMIN ONLY: Quản lý Participant */}
            {(event.isStaff || user?.userId === event.OrganizerID) && (
              <div>
                <Divider />
                <h2
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    color: "#0f172a",
                    marginBottom: "16px",
                  }}
                >
                  Quản lý Participant (Admin)
                </h2>
                <Table
                  size="small"
                  loading={loadingParticipants}
                  dataSource={participants}
                  rowKey="RegistrationID"
                  pagination={{pageSize: 10}}
                  columns={[
                    {
                      title: "Tên",
                      dataIndex: "FullName",
                      render: (t) => (
                        <span style={{fontWeight: "bold", color: "#334155"}}>
                          {t}
                        </span>
                      ),
                    },
                    {title: "Email", dataIndex: "Email"},
                    {
                      title: "Trạng thái",
                      dataIndex: "Status",
                      render: () => <Tag color="green">Đã đăng ký</Tag>,
                    },
                    {
                      title: "Điểm danh",
                      dataIndex: "AttendanceStatus",
                      render: (s) =>
                        s === "Present" ? (
                          <Tag color="green">Có mặt</Tag>
                        ) : s === "Late" ? (
                          <Tag color="orange">Đến muộn</Tag>
                        ) : (
                          <Tag color="red">Vắng</Tag>
                        ),
                    },
                  ]}
                />
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN (Sticky Sidebar) ── */}
          <div style={{position: "relative"}}>
            <div
              style={{
                position: "sticky",
                top: "96px",
                backgroundColor: "white",
                borderRadius: "24px",
                border: "1px solid #e2e8f0",
                padding: "28px",
                boxShadow:
                  "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
              }}
            >
              <h2
                style={{
                  fontSize: "32px",
                  fontWeight: 800,
                  color: "#16a34a",
                  margin: "0 0 24px 0",
                }}
              >
                {event.Price === 0 || !event.Price ? "Free" : `$${event.Price}`}
              </h2>

              {/* Capacity Progress Bar */}
              {event.MaxParticipants && (
                <div style={{marginBottom: "24px"}}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: "#0f172a",
                      marginBottom: "8px",
                    }}
                  >
                    <span>{event.RegisteredCount || 0} registered</span>
                    <span style={{color: "#64748b", fontWeight: 500}}>
                      {remaining} seats left
                    </span>
                  </div>
                  <div
                    style={{
                      height: "10px",
                      backgroundColor: "#f1f5f9",
                      borderRadius: "99px",
                      overflow: "hidden",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        backgroundColor: "#2563eb",
                        borderRadius: "99px",
                        width: `${Math.min(fillPct, 100)}%`,
                        transition: "width 0.5s",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      fontWeight: 500,
                    }}
                  >
                    {fillPct}% capacity filled
                  </div>
                </div>
              )}

              {/* Tickets List */}
              <div
                style={{
                  marginBottom: "24px",
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: "bold",
                        color: "#0f172a",
                        fontSize: "14px",
                      }}
                    >
                      Standard Admission
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginTop: "4px",
                      }}
                    >
                      Includes full access
                    </div>
                  </div>
                  <div
                    style={{
                      color: "#2563eb",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    {event.Price === 0 || !event.Price
                      ? "Free"
                      : `$${event.Price}`}
                  </div>
                </div>
              </div>

              {/* Registration Logic & Buttons */}
              {myRegistration ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <Alert
                    message="Bạn đã đăng ký thành công!"
                    type="success"
                    showIcon
                    style={{borderRadius: "12px", fontWeight: 500}}
                  />

                  <button
                    onClick={() => setTicketModal(true)}
                    className="figma-btn figma-btn-primary"
                  >
                    {event.isStaff ? "Quét QR Check-in" : "Xem Mã OTP của bạn"}
                  </button>

                  {!event.isStaff && !deadlinePassed && !isPast && (
                    <button
                      onClick={handleCancel}
                      className="figma-btn figma-btn-danger"
                    >
                      Huỷ đăng ký
                    </button>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {isPast ? (
                    <Alert
                      message="Sự kiện đã kết thúc"
                      type="info"
                      showIcon
                      style={{borderRadius: "12px"}}
                    />
                  ) : isFull ? (
                    <Alert
                      message="Sự kiện đã đầy chỗ"
                      type="warning"
                      showIcon
                      style={{borderRadius: "12px"}}
                    />
                  ) : deadlinePassed ? (
                    <Alert
                      message="Đã hết hạn đăng ký"
                      type="warning"
                      showIcon
                      style={{borderRadius: "12px"}}
                    />
                  ) : null}

                  <button
                    onClick={handleRegister}
                    disabled={
                      isPast ||
                      isFull ||
                      deadlinePassed ||
                      event.Status !== "Published"
                    }
                    className="figma-btn figma-btn-primary"
                  >
                    {registering
                      ? "Đang xử lý..."
                      : !isAuthenticated
                        ? "Đăng nhập để đăng ký"
                        : "Register Now"}
                  </button>
                </div>
              )}

              {/* Save & Share */}
              <div style={{display: "flex", gap: "12px", marginTop: "16px"}}>
                <button
                  className="figma-btn figma-btn-outline"
                  style={{flex: 1, height: "42px", fontSize: "14px"}}
                >
                  <HeartOutlined /> Save
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    message.success("Đã sao chép link!");
                  }}
                  className="figma-btn figma-btn-outline"
                  style={{flex: 1, height: "42px", fontSize: "14px"}}
                >
                  <ShareAltOutlined /> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── QR Ticket Modal ── */}
      <Modal
        open={ticketModal}
        onCancel={() => setTicketModal(false)}
        footer={null}
        width={420}
        centered
        title={
          <span style={{fontWeight: 800, color: "#0f172a"}}>
            {event?.isStaff ? "🎟️ Quét để Check-in" : "🎟️ Vé của bạn"}
          </span>
        }
      >
        {myRegistration && (
          <div style={{textAlign: "center", padding: "16px 0"}}>
            {event?.isStaff ? (
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "16px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Text
                  type="secondary"
                  style={{fontSize: "14px", marginBottom: "16px"}}
                >
                  Đưa mã QR này cho người tham gia quét
                </Text>
                <QRCode
                  value={`${window.location.origin}/events/${event.EventID}/checkin?staffId=${user?.userId}`}
                  size={200}
                />
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "16px",
                  padding: "20px",
                  textAlign: "left",
                }}
              >
                <Text
                  type="secondary"
                  style={{fontSize: "12px", fontWeight: 600}}
                >
                  Mã OTP của bạn
                </Text>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "36px",
                    fontWeight: 800,
                    letterSpacing: "8px",
                    color: "#0f172a",
                    margin: "4px 0",
                  }}
                >
                  {myRegistration.OTPCode}
                </div>
                <Text type="secondary" style={{fontSize: "12px"}}>
                  ⚠️ Giữ mã này bí mật. Dùng để check-in tại sự kiện.
                </Text>
              </div>
            )}
            <div
              style={{
                marginTop: "20px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <span
                style={{display: "block", fontWeight: "bold", color: "#0f172a"}}
              >
                {event.Title}
              </span>
              <Text
                type="secondary"
                style={{fontSize: "14px", display: "block"}}
              >
                <CalendarOutlined style={{marginRight: "6px"}} />
                {dayjs(event.StartDate).format("DD/MM/YYYY · HH:mm")}
              </Text>
              {event.VenueName && (
                <Text
                  type="secondary"
                  style={{fontSize: "14px", display: "block"}}
                >
                  <EnvironmentOutlined style={{marginRight: "6px"}} />
                  {event.VenueName}
                </Text>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );

  return noLayout ? content : <MainLayout>{content}</MainLayout>;
};

export default EventDetailPage;
