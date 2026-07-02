const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export const feedbackService = {
  // Lấy danh sách feedback & thống kê
  getEventFeedbacks: async (eventId) => {
    const response = await fetch(`${API_URL}/events/${eventId}/feedbacks`);
    return response.json();
  },

  // Kiểm tra điều kiện đánh giá
  checkEligibility: async (eventId) => {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_URL}/events/${eventId}/feedbacks/check-eligibility`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Không thể kiểm tra điều kiện đánh giá.");
    return data;
  },

  // Gửi feedback mới
  submitFeedback: async (eventId, formData) => {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_URL}/events/${eventId}/feedbacks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Lỗi gửi đánh giá");
    return data;
  },

  // Sửa feedback
  updateFeedback: async (eventId, formData) => {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_URL}/events/${eventId}/feedbacks`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Lỗi cập nhật đánh giá");
    return data;
  },

  // Xóa feedback (Participant)
  deleteFeedback: async (eventId, feedbackId) => {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_URL}/events/${eventId}/feedbacks/${feedbackId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Lỗi xóa đánh giá");
    return data;
  },

  // Organizer trả lời feedback
  replyFeedback: async (eventId, feedbackId, reply) => {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_URL}/events/${eventId}/feedbacks/${feedbackId}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({reply}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Lỗi gửi câu trả lời");
    return data;
  },

  // Organizer báo cáo feedback
  reportFeedback: async (eventId, feedbackId, reason) => {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_URL}/events/${eventId}/feedbacks/${feedbackId}/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({reason}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Lỗi gửi báo cáo");
    return data;
  },

  // Admin lấy danh sách feedback bị báo cáo
  getReportedFeedbacks: async () => {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_URL}/admin/reported-feedbacks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Lỗi lấy danh sách báo cáo");
    return data;
  },

  // Admin xử lý báo cáo (action = 'delete' | 'dismiss')
  resolveReport: async (feedbackId, action) => {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_URL}/admin/reported-feedbacks/${feedbackId}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({action}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Lỗi xử lý báo cáo");
    return data;
  },
};
