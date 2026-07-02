import React, {useEffect, useState} from "react";
import {Rate, Button, Empty, message, Select, Avatar} from "antd";
import {
  MessageOutlined,
  ArrowRightOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {useNavigate} from "react-router-dom";
import FeedbackModal from "./FeedbackModal";
import FeedbackCard from "./FeedbackCard";
import {feedbackService} from "../../services/feedback.service";
import dayjs from "dayjs";
import useAuthStore from "../../store/authStore";

export default function FeedbackSection({eventId}) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({TotalReviews: 0, AverageRating: 0});
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  const loadData = async () => {
    try {
      const res = await feedbackService.getEventFeedbacks(eventId);
      if (res.success) {
        setFeedbacks(res.data);
        setStats(res.stats);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  useEffect(() => {
    const handleOpenModal = () => handleWriteFeedback();
    window.addEventListener('openFeedbackModal', handleOpenModal);
    return () => window.removeEventListener('openFeedbackModal', handleOpenModal);
  }, [user, eventId]);

  const handleWriteFeedback = async () => {
    try {
      if (!user) {
        message.warning("Vui lòng đăng nhập để đánh giá.");
        return;
      }
      const res = await feedbackService.checkEligibility(eventId);
      if (res.success) {
        setEditData(null);
        setModalOpen(true);
      }
    } catch (error) {
      message.error(error.message || "Bạn chưa đủ điều kiện để đánh giá sự kiện này.");
    }
  };

  const [sortType, setSortType] = useState('latest');

  let displayFeedbacks = [...feedbacks];
  if (sortType === 'mine' && user) {
    const mineIdx = displayFeedbacks.findIndex(f => f.ParticipantID == user.userId);
    if (mineIdx > -1) {
      const mineItem = displayFeedbacks.splice(mineIdx, 1)[0];
      displayFeedbacks.unshift(mineItem);
    }
  }

  const previewList = displayFeedbacks.slice(0, 3); // Lấy tối đa 3 cái mới nhất để hiển thị nhanh ngoài trang chi tiết

  return (
    <div
      style={{
        marginTop: 48,
        paddingTop: 48,
        borderTop: "1px solid #e2e8f0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 24,
        }}
      >
        <div>
          <h2
            style={{fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0}}
          >
            Đánh giá & Phản hồi
          </h2>
          {stats.TotalReviews > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 8,
              }}
            >
              <span style={{fontSize: 32, fontWeight: 800, color: "#0f172a"}}>
                {Number(stats.AverageRating).toFixed(1)}
              </span>
              <div>
                <Rate
                  disabled
                  allowHalf
                  value={Number(stats.AverageRating)}
                  style={{fontSize: 16, color: "#facc15"}}
                />
                <div style={{fontSize: 13, color: "#64748b", fontWeight: 500}}>
                  Dựa trên {stats.TotalReviews} đánh giá
                </div>
              </div>
            </div>
          )}
        </div>
        
        {feedbacks.length > 0 && (
          <Select 
            value={sortType} 
            onChange={setSortType}
            style={{ width: 180 }}
            options={[
              { value: 'latest', label: 'Mới nhất' },
              ...(feedbacks.some(f => f.ParticipantID == user?.userId) ? [{ value: 'mine', label: 'Bình luận của bạn' }] : [])
            ]}
          />
        )}
      </div>

      {feedbacks.length === 0 ? (
        <div
          style={{
            backgroundColor: "#f8fafc",
            padding: 32,
            borderRadius: 16,
            textAlign: "center",
            border: "1px dashed #cbd5e1",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#475569",
              marginBottom: 16,
            }}
          >
            Chưa có đánh giá nào cho sự kiện này.
          </div>
          {(() => {
            const userFeedback = feedbacks.find(f => f.ParticipantID == user?.userId);
            return userFeedback ? (
              <Button
                type="default"
                icon={<MessageOutlined />}
                onClick={() => { setEditData(userFeedback); setModalOpen(true); }}
                style={{borderRadius: 8, fontWeight: 600, height: 40, color: "#2563eb", borderColor: "#2563eb"}}
              >
                Sửa đánh giá của bạn
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<MessageOutlined />}
                onClick={handleWriteFeedback}
                style={{borderRadius: 8, fontWeight: 600, height: 40}}
              >
                Viết đánh giá đầu tiên
              </Button>
            );
          })()}
        </div>
      ) : (
        <>
          {/* Danh sách các card review ngắn gọn */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              marginBottom: 24,
            }}
          >
            {previewList.map((item) => (
              <FeedbackCard key={item.FeedbackID} item={item} onEdit={(data) => { setEditData(data); setModalOpen(true); }} onSuccess={loadData} />
            ))}
          </div>

          <div style={{display: "flex", gap: 16, flexWrap: "wrap"}}>
            {(() => {
              const userFeedback = feedbacks.find(f => f.ParticipantID == user?.userId);
              return userFeedback ? (
                <Button
                  type="default"
                  icon={<MessageOutlined />}
                  onClick={() => { setEditData(userFeedback); setModalOpen(true); }}
                  style={{borderRadius: 10, height: 44, fontWeight: 600, color: "#2563eb", borderColor: "#2563eb"}}
                >
                  Sửa đánh giá của bạn
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<MessageOutlined />}
                  onClick={handleWriteFeedback}
                  style={{borderRadius: 10, height: 44, fontWeight: 600}}
                >
                  Viết đánh giá
                </Button>
              );
            })()}

            {/* ĐÃ SỬA ĐIỀU KIỆN: Chỉ cần có từ 1 đánh giá trở lên là hiện nút View All */}
            {feedbacks.length > 0 && (
              <Button
                onClick={() => navigate(`/events/${eventId}/feedbacks`)}
                style={{
                  borderRadius: 10,
                  height: 44,
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                Xem tất cả {stats.TotalReviews} đánh giá{" "}
                <ArrowRightOutlined style={{marginLeft: 6}} />
              </Button>
            )}
          </div>
        </>
      )}

      <FeedbackModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditData(null);
        }}
        eventId={eventId}
        onSuccess={loadData}
        initialData={editData}
      />
    </div>
  );
}
