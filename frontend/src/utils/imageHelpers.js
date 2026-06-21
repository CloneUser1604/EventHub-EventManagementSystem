export const getImageUrl = (url) => {
  if (!url) return '';
  
  // ĐÃ SỬA: Trả về ngay lập tức nếu là link mạng (http) HOẶC mã ảnh Base64 (data:)
  if (url.startsWith('http') || url.startsWith('data:')) {
    return url;
  }
  
  // Lấy baseUrl từ env (thường là http://localhost:5000/api)
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  
  // Cắt bỏ phần /api ở cuối (nếu có) để lấy base url của server backend
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  
  // Tự động phân giải thư mục con dựa trên tiền tố của filename (multer setup)
  let subDir = '';
  if (!url.includes('/')) {
    if (url.startsWith('event_')) subDir = 'events/';
    else if (url.startsWith('org_')) subDir = 'organizer-docs/';
    else if (url.startsWith('avatar_')) subDir = 'avatars/';
  }
  
  // Nối path vào thư mục uploads
  return `${baseUrl}/uploads/${subDir}${url}`;
};