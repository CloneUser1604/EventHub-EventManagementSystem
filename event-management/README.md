# 🎓 EMS — Event Management System

Hệ thống quản lý sự kiện đại học — web platform đầy đủ với React + Node.js + SQL Server.

---

## 📁 Cấu trúc dự án

```
ems/
├── backend/                  # Node.js + ExpressJS API
│   ├── config/
│   │   ├── db.js             # Kết nối SQL Server
│   │   └── schema.sql        # Toàn bộ 20 bảng + seed data
│   ├── controllers/
│   │   └── auth.controller.js
│   ├── middleware/
│   │   ├── auth.js           # JWT middleware + RBAC
│   │   └── validators.js     # express-validator rules
│   ├── routes/
│   │   └── auth.routes.js
│   ├── utils/
│   │   ├── jwt.js
│   │   ├── email.js          # Nodemailer templates
│   │   └── response.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
└── frontend/                 # ReactJS
    ├── src/
    │   ├── pages/auth/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── VerifyEmailPage.jsx
    │   │   ├── PasswordPages.jsx  # ForgotPassword + ResetPassword
    │   │   └── Auth.css
    │   ├── components/ui/
    │   │   └── ProtectedRoute.jsx
    │   ├── services/
    │   │   ├── api.js         # Axios + auto token refresh
    │   │   └── auth.service.js
    │   ├── store/
    │   │   └── authStore.js   # Zustand global state
    │   ├── App.jsx            # Routes config
    │   └── index.js
    └── package.json
```

---

## 🚀 Cài đặt & Chạy

### 1. Database (SQL Server)

```sql
-- Tạo database
CREATE DATABASE EMS_DB;

-- Chạy schema
-- Mở SQL Server Management Studio → chạy file backend/config/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Điền thông tin DB, JWT, Email vào .env

npm install
npm run dev   # nodemon — tự restart khi thay đổi
# hoặc: npm start
```

Backend chạy tại: `http://localhost:5000`

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

Frontend chạy tại: `http://localhost:3000`

---

## 🔐 API Authentication Endpoints

| Method | Endpoint                        | Mô tả                        | Auth? |
|--------|---------------------------------|------------------------------|-------|
| POST   | /api/auth/register              | Đăng ký tài khoản            | ❌    |
| POST   | /api/auth/login                 | Đăng nhập                    | ❌    |
| GET    | /api/auth/verify-email?token=…  | Xác thực email               | ❌    |
| POST   | /api/auth/resend-verification   | Gửi lại email xác thực       | ❌    |
| POST   | /api/auth/forgot-password       | Quên mật khẩu                | ❌    |
| POST   | /api/auth/reset-password        | Đặt lại mật khẩu             | ❌    |
| POST   | /api/auth/refresh-token         | Làm mới access token         | ❌    |
| GET    | /api/auth/me                    | Lấy thông tin user hiện tại  | ✅    |
| POST   | /api/auth/logout                | Đăng xuất                    | ✅    |
| PUT    | /api/auth/change-password       | Đổi mật khẩu                 | ✅    |

---

## 👥 Roles & Permissions

| Role        | Mô tả                                    |
|-------------|------------------------------------------|
| Admin       | Quản trị toàn hệ thống                   |
| Organizer   | Tạo & quản lý sự kiện (cần Admin duyệt)  |
| Staff       | Check-in người tham dự                   |
| Participant | Đăng ký & tham gia sự kiện              |
| Speaker     | Diễn giả được mời                        |

---

## 🔑 Tài khoản Admin mặc định

```
Email:    admin@ems.edu.vn
Password: Admin@123
```

> ⚠️ Đổi mật khẩu ngay sau khi deploy production!

---

## 🛣️ Modules tiếp theo

Sau Authentication, các module cần phát triển theo thứ tự:

1. **Event Management** — CRUD sự kiện, approval workflow
2. **Registration & QR Ticket** — Đăng ký, tạo QR Code + OTP
3. **Check-in** — Staff scan QR, verify OTP, cập nhật attendance
4. **Speaker & Staff** — Mời diễn giả, assign staff
5. **Survey & Feedback** — Tạo khảo sát, thu thập phản hồi
6. **Notifications** — Hệ thống thông báo
7. **Dashboard & Reports** — Báo cáo thống kê
8. **Personal Calendar** — Lịch sự kiện cá nhân

---

## 🛠️ Tech Stack

| Layer     | Technology                               |
|-----------|------------------------------------------|
| Frontend  | React 18, React Router 6, Ant Design 5   |
| State     | Zustand + persist                        |
| HTTP      | Axios (auto refresh token interceptor)   |
| Backend   | Node.js, Express.js, JWT                 |
| Database  | Microsoft SQL Server                     |
| Email     | Nodemailer (Gmail SMTP)                  |
| Auth      | JWT Access Token (7d) + Refresh (30d)    |
| Security  | bcrypt (12 rounds), rate limiting, CORS  |
