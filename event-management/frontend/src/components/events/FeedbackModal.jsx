import React, {useState} from "react";
import {Modal, Rate, Input, Button, message} from "antd";
import {feedbackService} from "../../services/feedback.service";

const {TextArea} = Input;

export default function FeedbackModal({open, onClose, eventId, onSuccess}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return message.warning("Vui lòng chọn số sao đánh giá!");
    try {
      setLoading(true);
      await feedbackService.submitFeedback(eventId, rating, comment);
      message.success("Cảm ơn bạn đã đánh giá sự kiện!");
      onSuccess(); // Báo cho component cha load lại dữ liệu
      handleClose();
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment("");
    onClose();
  };

  return (
    <Modal
      title={
        <span style={{fontSize: 20, fontWeight: 800}}>Đánh giá sự kiện</span>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      centered
      width={500}
    >
      <div style={{textAlign: "center", padding: "20px 0"}}>
        <div style={{fontSize: 16, fontWeight: 600, marginBottom: 12}}>
          Bạn cảm thấy sự kiện này thế nào?
        </div>
        <Rate
          value={rating}
          onChange={setRating}
          style={{fontSize: 36, color: "#facc15", marginBottom: 24}}
        />

        <div style={{textAlign: "left", marginBottom: 8, fontWeight: 600}}>
          Chia sẻ thêm trải nghiệm của bạn (Tuỳ chọn)
        </div>
        <TextArea
          rows={4}
          placeholder="Sự kiện tổ chức tốt không? Diễn giả thế nào?..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          showCount
          style={{borderRadius: 12, padding: 12, fontSize: 15}}
        />

        <Button
          type="primary"
          block
          size="large"
          loading={loading}
          onClick={handleSubmit}
          style={{
            marginTop: 24,
            borderRadius: 12,
            height: 48,
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          Gửi đánh giá
        </Button>
      </div>
    </Modal>
  );
}
