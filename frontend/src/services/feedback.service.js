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
  submitFeedback: async (eventId, rating, comment) => {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_URL}/events/${eventId}/feedbacks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({rating, comment}),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Lỗi gửi đánh giá");
    return data;
  },

  // Sửa feedback
  updateFeedback: async (eventId, rating, comment) => {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(`${API_URL}/events/${eventId}/feedbacks`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({rating, comment}),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Lỗi cập nhật đánh giá");
    return data;
  },
};
