import React, {useState} from "react";
import {Avatar, Rate, Button, Image, Modal, Input, message, Tag} from "antd";
import {UserOutlined, DeleteOutlined, MessageOutlined, WarningOutlined} from "@ant-design/icons";
import dayjs from "dayjs";
import {feedbackService} from "../../services/feedback.service";
import useAuthStore from "../../store/authStore";
import {getImageUrl} from "../../utils/imageHelpers";
import useEventStore from "../../store/eventStore";

const {TextArea} = Input;

export default function FeedbackCard({item, onEdit, onSuccess}) {
  const {user} = useAuthStore();
  const {selectedEvent} = useEventStore();
  
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [loading, setLoading] = useState(false);

  const isParticipant = user?.userId == item.ParticipantID;
  const isOrganizer = user?.userId == selectedEvent?.OrganizerID;

  let mediaURLs = [];
  if (item.MediaURLs) {
    try {
      mediaURLs = typeof item.MediaURLs === "string" ? JSON.parse(item.MediaURLs) : item.MediaURLs;
    } catch (e) {
      mediaURLs = [];
    }
  }

  const handleDelete = () => {
    Modal.confirm({
      title: "Xác nhận xóa đánh giá",
      content: "Bạn có chắc chắn muốn xóa đánh giá này không? Hành động này không thể hoàn tác.",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await feedbackService.deleteFeedback(selectedEvent?.EventID, item.FeedbackID);
          message.success("Đã xóa đánh giá thành công.");
          onSuccess();
        } catch (error) {
          message.error(error.message || "Lỗi xóa đánh giá.");
        }
      }
    });
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return message.warning("Vui lòng nhập nội dung trả lời.");
    setLoading(true);
    try {
      await feedbackService.replyFeedback(selectedEvent?.EventID, item.FeedbackID, replyContent);
      message.success("Đã trả lời đánh giá.");
      setReplyModalOpen(false);
      onSuccess();
    } catch (error) {
      message.error(error.message || "Lỗi khi trả lời.");
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return message.warning("Vui lòng nhập lý do báo cáo.");
    setLoading(true);
    try {
      await feedbackService.reportFeedback(selectedEvent?.EventID, item.FeedbackID, reportReason);
      message.success("Đã báo cáo đánh giá lên Admin.");
      setReportModalOpen(false);
      onSuccess();
    } catch (error) {
      message.error(error.message || "Lỗi báo cáo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "20px",
        padding: "24px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}
    >
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px"}}>
        <div style={{display: "flex", gap: "14px", alignItems: "center"}}>
          <Avatar
            size={44}
            src={getImageUrl(item.AvatarURL) || undefined}
            icon={!item.AvatarURL && <UserOutlined />}
            style={{backgroundColor: "#2563eb", flexShrink: 0}}
          />
          <div>
            <div style={{fontWeight: 800, color: "#0f172a", fontSize: "16px", marginBottom: "2px"}}>
              {item.UserName}
            </div>
            <div style={{fontSize: "13px", color: "#94a3b8", fontWeight: 500}}>
              {dayjs(item.CreatedAt).format("DD/MM/YYYY · HH:mm")}
              {item.UpdatedAt && dayjs(item.UpdatedAt).diff(dayjs(item.CreatedAt), 'second') > 1 && (
                <span style={{ fontStyle: 'italic', marginLeft: 4, color: '#64748b' }}>(đã chỉnh sửa)</span>
              )}
            </div>
          </div>
        </div>

        <div style={{display: "flex", alignItems: "center", gap: 8, flexShrink: 0}}>
          {isParticipant && (
            <>
              <Button type="text" size="small" style={{color: "#2563eb", fontSize: 13, fontWeight: 500}} onClick={() => onEdit(item)}>Sửa</Button>
              <Button type="text" size="small" danger style={{fontSize: 13, fontWeight: 500}} onClick={handleDelete}>Xóa</Button>
            </>
          )}
          {isOrganizer && !isParticipant && (
            <>
              <Button type="text" size="small" icon={<MessageOutlined />} style={{color: "#2563eb", fontSize: 13, fontWeight: 500}} onClick={() => { setReplyContent(item.Reply || ""); setReplyModalOpen(true); }}>
                {item.Reply ? "Sửa trả lời" : "Trả lời"}
              </Button>
              {!item.IsReported && <Button type="text" size="small" danger icon={<WarningOutlined />} style={{fontSize: 13, fontWeight: 500}} onClick={() => setReportModalOpen(true)}>Báo cáo</Button>}
            </>
          )}
          <Rate disabled value={item.Rating} style={{fontSize: "15px", color: "#facc15"}} />
        </div>
      </div>

      <div style={{color: "#334155", fontSize: "15px", lineHeight: "1.65", fontWeight: 500, whiteSpace: "pre-wrap"}}>
        {item.Comment || <span style={{color: "#94a3b8", fontStyle: "italic", fontWeight: 400}}>Người dùng không để lại lời nhắn.</span>}
      </div>

      {mediaURLs.length > 0 && (
        <div style={{display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8}}>
          {mediaURLs.map((url, idx) => {
            const isVideo = url.match(/\.(mp4|mov|avi)$/i);
            const fullUrl = url.startsWith('http') ? url : `http://localhost:5000${url}`;
            if (isVideo) {
              return (
                <video key={idx} src={fullUrl} controls style={{height: 100, borderRadius: 8, objectFit: "cover"}} />
              );
            }
            return (
              <Image key={idx} src={fullUrl} height={100} style={{borderRadius: 8, objectFit: "cover"}} />
            );
          })}
        </div>
      )}

      {item.Reply && (
        <div style={{marginTop: 16, backgroundColor: "#f8fafc", padding: 16, borderRadius: 12, borderLeft: "4px solid #3b82f6"}}>
          <div style={{fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4}}>
            Phản hồi từ Ban tổ chức:
          </div>
          <div style={{fontSize: 15, color: "#334155", whiteSpace: "pre-wrap", marginBottom: 8}}>
            {item.Reply}
          </div>
          <div style={{fontSize: 13, color: "#94a3b8", fontWeight: 500}}>
            {dayjs(item.RepliedAt).format("DD/MM/YYYY · HH:mm")}
            {item.ReplyUpdatedAt && (
              <span style={{ fontStyle: 'italic', marginLeft: 4, color: '#64748b' }}>(đã chỉnh sửa)</span>
            )}
          </div>
        </div>
      )}
      
      {item.IsReported && (
        <div style={{marginTop: 8}}>
          <Tag color="error" icon={<WarningOutlined />}>Đã báo cáo lên Admin</Tag>
        </div>
      )}

      <Modal title="Trả lời đánh giá" open={replyModalOpen} onCancel={() => setReplyModalOpen(false)} onOk={handleReply} confirmLoading={loading}>
        <TextArea rows={4} placeholder="Nhập phản hồi của bạn..." value={replyContent} onChange={(e) => setReplyContent(e.target.value)} />
      </Modal>

      <Modal title="Báo cáo đánh giá" open={reportModalOpen} onCancel={() => setReportModalOpen(false)} onOk={handleReport} confirmLoading={loading} okText="Báo cáo" okButtonProps={{danger: true}}>
        <div style={{marginBottom: 12}}>Vui lòng cho biết lý do bạn báo cáo đánh giá này:</div>
        <TextArea rows={4} placeholder="Ví dụ: Đánh giá chứa từ ngữ phản cảm, sai sự thật..." value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
      </Modal>
    </div>
  );
}
