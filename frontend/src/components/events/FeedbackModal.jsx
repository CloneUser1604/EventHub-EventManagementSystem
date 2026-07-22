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

const generateVideoThumbnail = (file) => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    
    // Play slightly to force frame decoding in some browsers
    video.play().catch(() => {});

    video.addEventListener("loadeddata", () => {
      // Seek to 1s or midway if shorter
      video.currentTime = Math.min(1, video.duration / 2 || 0);
    });
    
    video.addEventListener("seeked", () => {
      // Small delay to ensure frame is rendered to video element
      setTimeout(() => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        } catch (e) {
          resolve("");
        } finally {
          video.pause();
          URL.revokeObjectURL(video.src);
        }
      }, 150);
    });
    
    video.addEventListener("error", () => {
      resolve("");
      URL.revokeObjectURL(video.src);
    });
  });
};

export default function FeedbackModal({open, onClose, eventId, onSuccess, initialData}) {
  const [rating, setRating] = useState(initialData?.Rating || 0);
  const [comment, setComment] = useState(initialData?.Comment || "");
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewContent, setPreviewContent] = useState(null);

  const handlePreview = async (file) => {
    let type = 'image';
    if (file.type && file.type.startsWith('video/')) {
      type = 'video';
    } else if (file.url && file.url.match(/\.(mp4|webm|ogg)$/i)) {
      type = 'video';
    }

    let url = file.url;
    if (!url) {
      if (type === 'video' && file.originFileObj) {
        url = URL.createObjectURL(file.originFileObj);
      } else {
        if (!file.preview) {
          if (type === 'video') {
            file.preview = await generateVideoThumbnail(file.originFileObj);
          } else {
            file.preview = await getBase64(file.originFileObj);
          }
        }
        url = file.preview;
      }
    } else if (url.startsWith('/')) {
      url = `http://localhost:5000${url}`;
    }

    setPreviewContent({ type, url });
    setPreviewTitle(file.name || 'Preview');
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
      message.error(error.response?.data?.message || error.message || "Có lỗi xảy ra, vui lòng thử lại.");
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

  const handleBeforeUpload = (file) => {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (isVideo) {
      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        message.error('Video không được vượt quá 50MB!');
        return Upload.LIST_IGNORE;
      }
    } else if (isImage) {
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('Hình ảnh không được vượt quá 5MB!');
        return Upload.LIST_IGNORE;
      }
    } else {
      message.error('Chỉ hỗ trợ tải lên hình ảnh hoặc video!');
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handlePreviewFile = async (file) => {
    if (file.type && file.type.startsWith('video/')) {
      return await generateVideoThumbnail(file);
    }
    return await getBase64(file);
  };

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
          beforeUpload={handleBeforeUpload}
          previewFile={handlePreviewFile}
          maxCount={3}
          accept="image/*,video/*"
        >
          {fileList.length >= 3 ? null : uploadButton}
        </Upload>

        <Modal
          open={previewOpen}
          title={previewTitle}
          footer={null}
          onCancel={() => {
            setPreviewOpen(false);
            if (previewContent?.type === 'video' && previewContent?.url?.startsWith('blob:')) {
              URL.revokeObjectURL(previewContent.url);
            }
          }}
          width={800}
        >
          <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#000', borderRadius: 8, overflow: 'hidden' }}>
            {previewContent?.type === 'video' ? (
              <video
                src={previewContent.url}
                controls
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
            ) : (
              <img alt="preview" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} src={previewContent?.url} />
            )}
          </div>
        </Modal>

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
