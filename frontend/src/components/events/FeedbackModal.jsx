import React, {useState} from "react";
import {Modal, Rate, Input, Button, Upload, message, Image} from "antd";
import {PlusOutlined} from "@ant-design/icons";
import {feedbackService} from "../../services/feedback.service";
import {getImageUrl} from "../../utils/imageHelpers";

const {TextArea} = Input;

const getBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

export default function FeedbackModal({open, onClose, eventId, onSuccess, initialData}) {
  const [rating, setRating] = useState(initialData?.Rating || 0);
  const [comment, setComment] = useState(initialData?.Comment || "");
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

  const handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    const fullUrl = file.url ? (file.url.startsWith('http') ? file.url : `http://localhost:5000${file.url}`) : file.preview;
    setPreviewImage(fullUrl);
    setPreviewOpen(true);
  };

  // Cập nhật state nếu initialData thay đổi
  React.useEffect(() => {
    if (open) {
      setRating(initialData?.Rating || 0);
      setComment(initialData?.Comment || "");
      if (initialData?.MediaURLs) {
        let media = [];
        try {
          media = typeof initialData.MediaURLs === 'string' ? JSON.parse(initialData.MediaURLs) : initialData.MediaURLs;
        } catch (e) {
          media = [];
        }
        setFileList(
          media.map((url, index) => ({
            uid: `-${index}`,
            name: `media-${index}`,
            status: "done",
            url: url, // For display
          }))
        );
      } else {
        setFileList([]);
      }
    }
  }, [open, initialData]);

  const handleSubmit = async () => {
    if (rating === 0) return message.warning("Vui lòng chọn số sao đánh giá!");
    
    // Nếu là chế độ sửa, kiểm tra xem có thay đổi gì không
    if (initialData) {
      const oldRating = initialData.Rating || 0;
      const oldComment = (initialData.Comment || "").trim();
      const newComment = comment.trim();
      
      let oldMedia = [];
      try {
        oldMedia = typeof initialData.MediaURLs === 'string' ? JSON.parse(initialData.MediaURLs) : (initialData.MediaURLs || []);
      } catch (e) {
        oldMedia = [];
      }
      
      const hasNewFiles = fileList.some(f => f.originFileObj);
      const existingMediaInList = fileList.filter(f => !f.originFileObj).map(f => f.url);
      
      // Có thay đổi nếu: Số sao đổi HOẶC text đổi HOẶC có file mới HOẶC số lượng file cũ bị thay đổi
      const ratingChanged = oldRating !== rating;
      const commentChanged = oldComment !== newComment;
      const mediaChanged = hasNewFiles || existingMediaInList.length !== oldMedia.length;

      if (!ratingChanged && !commentChanged && !mediaChanged) {
        return message.warning("Bạn cần thay đổi ít nhất một thông tin (số sao, nội dung, hoặc hình ảnh/video) để cập nhật!");
      }
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("rating", rating);
      formData.append("comment", comment);
      
      const existingMedia = [];
      fileList.forEach(file => {
        if (file.originFileObj) {
          formData.append("media", file.originFileObj);
        } else if (file.url) {
          existingMedia.push(file.url);
        }
      });
      
      if (existingMedia.length > 0) {
        formData.append("existingMedia", JSON.stringify(existingMedia));
      }

      if (initialData) {
        await feedbackService.updateFeedback(eventId, formData);
        message.success("Cập nhật đánh giá thành công!");
      } else {
        await feedbackService.submitFeedback(eventId, formData);
        message.success("Cảm ơn bạn đã đánh giá sự kiện!");
      }
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
    setFileList([]);
    onClose();
  };

  const handleChange = ({fileList: newFileList}) => setFileList(newFileList);

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{marginTop: 8}}>Tải lên</div>
    </div>
  );

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
          style={{borderRadius: 12, padding: 12, fontSize: 15, marginBottom: 20}}
        />

        <div style={{textAlign: "left", marginBottom: 8, fontWeight: 600}}>
          Chia sẻ khoảnh khắc của bạn trong sự kiện (Tối đa 3 file)
        </div>
        <Upload
          listType="picture-card"
          fileList={fileList}
          onChange={handleChange}
          onPreview={handlePreview}
          beforeUpload={() => false} // Ngăn upload tự động
          maxCount={3}
          accept="image/*,video/*"
        >
          {fileList.length >= 3 ? null : uploadButton}
        </Upload>

        {previewImage && (
          <Image
            wrapperStyle={{ display: 'none' }}
            preview={{
              visible: previewOpen,
              onVisibleChange: (visible) => setPreviewOpen(visible),
              afterOpenChange: (visible) => !visible && setPreviewImage(''),
            }}
            src={previewImage}
          />
        )}

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
          {initialData ? "Lưu thay đổi" : "Gửi đánh giá"}
        </Button>
      </div>
    </Modal>
  );
}
