const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../config/db');

// ── API: ĐĂNG KÝ (REGISTER) ─────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin bắt buộc." });
        }

        const pool = getPool();
        
        // Kiểm tra xem email đã tồn tại trong hệ thống chưa
        const checkEmail = await pool.request()
            .input('Email', sql.VarChar(255), email)
            .query('SELECT UserID FROM Users WHERE Email = @Email');

        if (checkEmail.recordset.length > 0) {
            return res.status(400).json({ success: false, message: "Email này đã được sử dụng." });
        }

        // Mã hóa mật khẩu bảo mật bằng bcryptjs
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Thêm tài khoản mới vào Database SQL Server
        await pool.request()
            .input('FullName', sql.NVarChar(150), fullName)
            .input('Email', sql.VarChar(255), email)
            .input('PasswordHash', sql.VarChar(255), hashedPassword)
            .input('Role', sql.VarChar(50), role || 'Participant')
            .query(`
                INSERT INTO Users (FullName, Email, PasswordHash, Role, IsActive, IsVerified, CreatedAt)
                VALUES (@FullName, @Email, @PasswordHash, @Role, 1, 1, GETDATE())
            `);

        res.status(201).json({ success: true, message: "Đăng ký tài khoản thành công!" });
    } catch (error) {
        console.error("❌ Lỗi Đăng ký:", error);
        res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ." });
    }
});

// ── API: ĐĂNG NHẬP (LOGIN) ──────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Vui lòng nhập email và mật khẩu." });
        }

        const pool = getPool();
        const result = await pool.request()
            .input('Email', sql.VarChar(255), email)
            .query(`SELECT * FROM Users WHERE Email = @Email`);

        const user = result.recordset[0];

        if (!user) {
            return res.status(401).json({ success: false, message: "Email hoặc mật khẩu không chính xác." });
        }

        // Kiểm tra đối chiếu mật khẩu băm
        const validPassword = await bcrypt.compare(password, user.PasswordHash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: "Email hoặc mật khẩu không chính xác." });
        }

        // Kiểm tra xem trạng thái tài khoản có hoạt động không
        if (!user.IsActive) {
            return res.status(403).json({ success: false, message: "Tài khoản của bạn đã bị khóa." });
        }

        // Tạo mã Token chữ ký số JWT
        const token = jwt.sign(
            { userId: user.UserID, role: user.Role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        // ĐÃ SỬA: Bọc payload vào trong object 'data' để khớp với Frontend (res.data.data)
        res.status(200).json({
            success: true,
            message: "Đăng nhập thành công!",
            data: {
                accessToken: token,
                refreshToken: token,
                user: {
                    userId: user.UserID,
                    fullName: user.FullName,
                    email: user.Email,
                    role: user.Role,
                    avatarURL: user.AvatarURL
                }
            }
        });

    } catch (error) {
        console.error("❌ Lỗi Login:", error);
        res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ." });
    }
});

module.exports = router;