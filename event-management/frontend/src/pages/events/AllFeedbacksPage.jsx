import React, {useEffect, useState} from "react";
import {useParams, useNavigate} from "react-router-dom";
// ĐÃ THÊM 'Divider' VÀO DÒNG DƯỚI ĐÂY:
import {Rate, Progress, Avatar, Button, Spin, Empty, Tag, Divider} from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import MainLayout from "../../components/layout/MainLayout";
import {feedbackService} from "../../services/feedback.service";
import useEventStore from "../../store/eventStore";
import useAuthStore from "../../store/authStore";
import FeedbackModal from "../../components/events/FeedbackModal";
import dayjs from "dayjs";

export default function AllFeedbacksPage() {
  const {id} = useParams();
  const navigate = useNavigate();
  const {selectedEvent: event, fetchEventById} = useEventStore();
  const {user} = useAuthStore();
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStar, setFilterStar] = useState(0); // 0 = Hiển thị tất cả
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    fetchEventById(id);
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const res = await feedbackService.getEventFeedbacks(id);
      if (res.success) {
        setFeedbacks(res.data);
        setStats(res.stats);
      }
    } catch (e) {
      console.error("Lỗi khi tải danh sách đánh giá:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div style={{textAlign: "center", padding: "100px 24px"}}>
          <Spin size="large" tip="Đang tải danh sách đánh giá..." />
        </div>
      </MainLayout>
    );
  }

  // Lọc danh sách bình luận dựa theo số sao được chọn
  const filteredFeedbacks =
    filterStar === 0
      ? feedbacks
      : feedbacks.filter((f) => f.Rating === filterStar);

  return (
    <MainLayout>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 24px",
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        {/* Nút quay lại */}
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/events/${id}`)}
          style={{
            marginBottom: 24,
            fontWeight: 600,
            padding: 0,
            fontSize: "15px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          Quay lại trang chi tiết sự kiện
        </Button>

        {/* Tiêu đề trang */}
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 800,
            color: "#0f172a",
            margin: "0 0 8px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Toàn bộ đánh giá & phản hồi
        </h1>
        <p
          style={{
            color: "#64748b",
            fontSize: "16px",
            margin: "0 0 40px 0",
            fontWeight: 500,
          }}
        >
          Sự kiện:{" "}
          <span style={{color: "#2563eb", fontWeight: 700}}>
            {event?.Title}
          </span>
        </p>

        {/* Cấu trúc Layout 2 cột bằng CSS Grid */}
        <style>{`
          .feedback-dashboard-grid {
            display: grid;
            grid-template-columns: 360px 1fr;
            gap: 48px;
            align-items: start;
          }
          @media (max-width: 992px) {
            .feedback-dashboard-grid {
              grid-template-columns: 1fr;
              gap: 32px;
            }
            .sticky-stats-panel {
              position: static !important;
            }
          }
          .star-row-filter {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            padding: 8px 16px;
            border-radius: 12px;
            transition: all 0.2s ease;
          }
          .star-row-filter:hover {
            background-color: #f1f5f9;
          }
          .star-row-filter.active {
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
          }
        `}</style>

        <div className="feedback-dashboard-grid">
          {/* ── CỘT TRÁI: TỔNG QUAN DASHBOARD & BỘ LỌC SAO ── */}
          <div
            className="sticky-stats-panel"
            style={{
              position: "sticky",
              top: "100px",
              backgroundColor: "#f8fafc",
              padding: "32px",
              borderRadius: "24px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: "20px",
              }}
            >
              Tổng quan điểm số
            </h3>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                marginBottom: "32px",
              }}
            >
              <div
                style={{
                  fontSize: "56px",
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                }}
              >
                {Number(stats?.AverageRating || 0).toFixed(1)}
              </div>
              <div>
                <Rate
                  disabled
                  allowHalf
                  value={Number(stats?.AverageRating || 0)}
                  style={{fontSize: "18px", color: "#facc15"}}
                />
                <div
                  style={{
                    fontSize: "14px",
                    color: "#64748b",
                    marginTop: "4px",
                    fontWeight: 500,
                  }}
                >
                  {stats?.TotalReviews || 0} lượt đánh giá
                </div>
              </div>
            </div>

            <Divider style={{margin: "20px 0", borderColor: "#e2e8f0"}} />

            <div
              style={{
                fontSize: "13px",
                color: "#64748b",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FilterOutlined /> Lọc theo số sao
            </div>

            {/* Danh sách các mức sao để click lọc */}
            <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats?.[`Star${star}`] || 0;
                const percent = stats?.TotalReviews
                  ? (count / stats.TotalReviews) * 100
                  : 0;
                const isActive = filterStar === star;

                return (
                  <div
                    key={star}
                    className={`star-row-filter ${isActive ? "active" : ""}`}
                    onClick={() => setFilterStar(isActive ? 0 : star)}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        color: "#334155",
                        minWidth: "16px",
                        fontSize: "14px",
                      }}
                    >
                      {star}
                    </span>
                    <Rate
                      disabled
                      count={1}
                      value={1}
                      style={{fontSize: "14px", color: "#facc15"}}
                    />
                    <Progress
                      percent={percent}
                      showInfo={false}
                      strokeColor="#facc15"
                      trailColor="#e2e8f0"
                      style={{margin: 0, flex: 1}}
                    />
                    <span
                      style={{
                        fontSize: "14px",
                        color: isActive ? "#2563eb" : "#64748b",
                        minWidth: "28px",
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            {filterStar !== 0 && (
              <Button
                type="dashed"
                block
                onClick={() => setFilterStar(0)}
                style={{
                  marginTop: "20px",
                  borderRadius: "10px",
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                Xoá bộ lọc (Xem tất cả)
              </Button>
            )}
          </div>

          {/* ── CỘT PHẢI: DANH SÁCH BÌNH LUẬN CHI TIẾT ── */}
          <div style={{display: "flex", flexDirection: "column", gap: "20px"}}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "4px",
              }}
            >
              <div
                style={{fontSize: "16px", fontWeight: 700, color: "#1e293b"}}
              >
                {filterStar !== 0 ? (
                  <span>
                    Đang hiển thị các đánh giá{" "}
                    <Tag
                      color="blue"
                      style={{marginLeft: 6, fontWeight: 700, fontSize: "13px"}}
                    >
                      {filterStar} Sao
                    </Tag>
                  </span>
                ) : (
                  "Tất cả bình luận nhận xét"
                )}
              </div>
              <div
                style={{fontSize: "14px", color: "#64748b", fontWeight: 500}}
              >
                Tìm thấy {filteredFeedbacks.length} kết quả
              </div>
            </div>

            {filteredFeedbacks.length === 0 ? (
              <div
                style={{
                  padding: "64px 24px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "24px",
                }}
              >
                <Empty
                  description={`Chưa có lượt đánh giá ${filterStar !== 0 ? `${filterStar} sao` : ""} nào cho sự kiện này.`}
                />
              </div>
            ) : (
              <div
                style={{display: "flex", flexDirection: "column", gap: "16px"}}
              >
                {filteredFeedbacks.map((item) => (
                  <div
                    key={item.FeedbackID}
                    style={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "20px",
                      padding: "24px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)",
                    }}
                  >
                    {/* Header Card bình luận */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "16px",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "14px",
                          alignItems: "center",
                        }}
                      >
                        <Avatar
                          size={44}
                          src={item.AvatarURL}
                          icon={!item.AvatarURL && <UserOutlined />}
                          style={{backgroundColor: "#2563eb", flexShrink: 0}}
                        />
                        <div>
                          <div
                            style={{
                              fontWeight: 800,
                              color: "#0f172a",
                              fontSize: "16px",
                              marginBottom: "2px",
                            }}
                          >
                            {item.UserName}
                          </div>
                          <div
                            style={{
                              fontSize: "13px",
                              color: "#94a3b8",
                              fontWeight: 500,
                            }}
                          >
                            {dayjs(item.CreatedAt).format("DD/MM/YYYY · HH:mm")}
                          </div>
                        </div>
                      </div>

                      {/* Số sao của bình luận đó và nút sửa nếu là của mình */}
                      <div style={{display: "flex", alignItems: "center", gap: 8, flexShrink: 0}}>
                        {user?.userId == item.ParticipantID && (
                          <Button
                            type="text"
                            size="small"
                            style={{color: "#2563eb", fontSize: 13, fontWeight: 500}}
                            onClick={() => {
                              setEditData(item);
                              setModalOpen(true);
                            }}
                          >
                            Sửa
                          </Button>
                        )}
                        <Rate
                          disabled
                          value={item.Rating}
                          style={{
                            fontSize: "15px",
                            color: "#facc15",
                          }}
                        />
                      </div>
                    </div>

                    {/* Nội dung comment */}
                    <div
                      style={{
                        color: "#334155",
                        fontSize: "15px",
                        lineHeight: "1.65",
                        fontWeight: 500,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {item.Comment || (
                        <span
                          style={{
                            color: "#94a3b8",
                            fontStyle: "italic",
                            fontWeight: 400,
                          }}
                        >
                          Người dùng không để lại lời nhắn.
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <FeedbackModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditData(null);
        }}
        eventId={id}
        onSuccess={loadData}
        initialData={editData}
      />
    </MainLayout>
  );
}
