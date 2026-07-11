# 🎓 EMS — Event Management System

Hệ thống quản lý sự kiện đại học — Web platform toàn diện được xây dựng với React + Node.js + SQL Server.

---

## 🌟 Các tính năng chính (Đã hoàn thiện)

Dự án đã phát triển hoàn thiện các phân hệ cốt lõi:

1. **Quản lý Tài khoản (Authentication & RBAC):** Đăng ký, đăng nhập, quên mật khẩu, phân quyền 5 roles (Admin, Organizer, Staff, Participant, Speaker).
2. **Quản lý Sự kiện (Event Management):** CRUD sự kiện, kiểm duyệt sự kiện bởi Admin.
3. **Đăng ký & Vé QR (Registration & QR Ticket):** Đăng ký tham gia, tạo QR Code check-in và mã OTP tự động.
4. **Điểm danh (Check-in):** Staff sử dụng mã OTP hoặc quét QR để check-in và ghi nhận trạng thái tham dự.
5. **Diễn giả & Nhân sự (Speaker & Staff):** Ban tổ chức mời diễn giả và phân công Staff hỗ trợ sự kiện, hệ thống tự động gửi lời mời.
6. **Khảo sát & Đánh giá (Survey & Feedback):** Form đánh giá sự kiện sau khi kết thúc, hỗ trợ đính kèm hình ảnh và phản hồi từ Ban tổ chức.
7. **Thông báo (Notifications):** Hệ thống thông báo thời gian thực/pop-up qua các sự kiện (thêm bài viết, duyệt sự kiện, nhắc nhở...).
8. **Báo cáo & Thống kê (Dashboard & Reports):** Bảng điều khiển thống kê số liệu chi tiết cho Admin và Organizer.
9. **Lịch cá nhân (Personal Calendar):** Quản lý lịch trình sự kiện cá nhân (Sắp tới, đang diễn ra, đã tham gia).
10. **Cộng đồng (Blogs):** Tính năng chia sẻ bài viết, giao lưu tương tác.

---

## 📁 Cấu trúc dự án

```
ems/
├── backend/                  # Node.js + ExpressJS API
│   ├── config/
│   │   ├── db.js             # Kết nối SQL Server
│   │   └── schema.sql        # Toàn bộ bảng + schema
│   ├── controllers/          # Logic xử lý API
│   ├── middleware/           # JWT, RBAC & Validators
│   ├── routes/               # API endpoints
│   ├── scripts/              # Các script hỗ trợ (cập nhật DB, seed data, fix lỗi)
│   ├── utils/                # Helper (email, upload, jwt)
│   └── server.js             # Entry point
│
└── frontend/                 # ReactJS
    ├── src/
    │   ├── components/       # UI Components tái sử dụng
    │   ├── pages/            # View cho các role (Admin, Organizer, Participant,...)
    │   ├── services/         # Axios API calls
    │   ├── store/            # Zustand global state (auth, notification, settings)
    │   ├── styles/           # CSS toàn cục
    │   └── App.jsx           # Routing
    └── package.json
```

---

## 🚀 Cài đặt & Chạy dự án

### 1. Database (SQL Server)

```sql
-- Mở SQL Server Management Studio (SSMS)
-- Tạo database:
CREATE DATABASE EMS_DB;

-- Mở và chạy toàn bộ mã trong file backend/config/schema.sql
```

> **Lưu ý:** Nếu có các bản cập nhật Database bổ sung, hãy mở terminal tại thư mục `backend` và chạy các script tương ứng trong thư mục `scripts/` (Ví dụ: `node scripts/update_feedbacks.js`).

### 2. Backend

```bash
cd backend
cp .env.example .env
# Chỉnh sửa file .env với thông tin CSDL, JWT_SECRET, Email SMTP...

npm install
npm run dev   # Sử dụng nodemon để tự restart khi code thay đổi
```
Backend sẽ khởi chạy tại: `http://localhost:5000`

### 3. Frontend

```bash
cd frontend
npm install
npm start
```
Frontend sẽ khởi chạy tại: `http://localhost:3000`

---

## 🔑 Tài khoản Admin mặc định

Hệ thống có sẵn tài khoản quản trị cao nhất để bạn bắt đầu thiết lập:

```text
Email:    admin@ems.edu.vn
Password: Admin@123
```
> ⚠️ Hãy đổi mật khẩu ngay sau khi deploy lên môi trường Production!

---

## 🛠️ Tech Stack

| Layer     | Công nghệ sử dụng                        |
|-----------|------------------------------------------|
| **Frontend**  | React 18, React Router 6, Ant Design 5   |
| **State**     | Zustand (có hỗ trợ persist)              |
| **HTTP**      | Axios (Tự động refresh token interceptor)|
| **Backend**   | Node.js, Express.js                      |
| **Database**  | Microsoft SQL Server (mssql)             |
| **Authentication**| JWT (Access Token 7 ngày + Refresh Token 30 ngày) |
| **Security**  | bcrypt, rate limiting, CORS              |
| **Uploads**   | Multer (Lưu trữ file local)              |
| **Email**     | Nodemailer (Gmail SMTP)                  |
