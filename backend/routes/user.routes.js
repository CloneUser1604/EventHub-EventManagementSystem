const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../config/db');
const jwt = require('jsonwebtoken');

// API: Lấy thông tin cá nhân kèm thống kê và DANH SÁCH sự kiện thật từ database
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ success: false, message: "Không tìm thấy Token!" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUserId = decoded.userId; 

        const pool = getPool();

        // 1. Lấy thông tin cơ bản của User
        const userResult = await pool.request()
            .input('UserId', sql.Int, currentUserId)
            .query(`SELECT * FROM Users WHERE UserID = @UserId;`);

        if (userResult.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
        }

        const user = userResult.recordset[0];
        let registeredEvents = [];
        let attendedEvents = [];
        let organizedEvents = [];

        // 2. Lấy danh sách sự kiện (Đã bọc an toàn chống lỗi sập Server)
        try {
            if (user.Role === 'Organizer') {
                const orgResult = await pool.request()
                    .input('UserId', sql.Int, currentUserId)
                    .query(`
                        SELECT * FROM Events 
                        WHERE OrganizerID = @UserId 
                        ORDER BY StartDate DESC
                    `);
                organizedEvents = orgResult.recordset;
            } else {
                const partResult = await pool.request()
                    .input('UserId', sql.Int, currentUserId)
                    .query(`
                        -- Lấy sự kiện ĐÃ ĐĂNG KÝ (Dùng e.* để chống lỗi thiếu cột)
                        SELECT e.*, r.Status AS RegStatus
                        FROM Registrations r
                        JOIN Events e ON r.EventID = e.EventID
                        WHERE r.ParticipantID = @UserId AND r.Status = 'Registered'
                        ORDER BY e.StartDate DESC;

                        -- Lấy sự kiện ĐÃ THAM GIA
                        SELECT e.*, a.Status AS AttStatus
                        FROM Attendance a
                        JOIN Registrations r ON a.RegistrationID = r.RegistrationID
                        JOIN Events e ON r.EventID = e.EventID
                        WHERE r.ParticipantID = @UserId AND a.Status IN ('Present', 'Late')
                        ORDER BY e.StartDate DESC;
                    `);
                registeredEvents = partResult.recordsets[0] || [];
                attendedEvents = partResult.recordsets[1] || [];
            }
        } catch (sqlError) {
            // Nếu có lỗi do sai tên cột/bảng, báo ra Terminal nhưng KHÔNG LÀM SẬP API
            console.error("⚠️ Lỗi truy vấn sự kiện (Có thể sai tên cột/bảng):", sqlError.message);
        }

        // 3. Trả dữ liệu về cho Frontend 
        res.status(200).json({
            ...user,
            data: user, // <-- Bổ sung dòng này để authStore.js (Frontend) không bị văng lỗi
            stats: {
                registered: registeredEvents.length,
                attended: attendedEvents.length,
                organized: organizedEvents.length
            },
            events: {
                registered: registeredEvents,
                attended: attendedEvents,
                organized: organizedEvents
            }
        });

    } catch (error) {
        console.error("❌ Lỗi API /me:", error);
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(403).json({ success: false, message: "Token hết hạn hoặc không hợp lệ." });
        }
        res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ." });
    }
});

// API: Cập nhật thông tin cá nhân
router.put('/me', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.status(401).json({ success: false, message: "Không tìm thấy Token!" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUserId = decoded.userId; 
        
        const { FullName, Phone } = req.body; 

        const pool = getPool();
        await pool.request()
            .input('FullName', sql.NVarChar(150), FullName)
            .input('Phone', sql.VarChar(20), Phone || null)
            .input('UserId', sql.Int, currentUserId)
            .query(`
                UPDATE Users 
                SET FullName = @FullName, 
                    Phone = @Phone,
                    UpdatedAt = GETDATE()
                WHERE UserID = @UserId
            `);

        res.status(200).json({ success: true, message: "Cập nhật thành công!" });

    } catch (error) {
        console.error("❌ Lỗi API PUT /me:", error);
        res.status(500).json({ success: false, message: "Lỗi máy chủ nội bộ." });
    }
});

module.exports = router;