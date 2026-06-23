const { getPool, sql } = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ─── GET EVENT PARTICIPANTS ──────────────────────────────────────
const getEventParticipants = async (req, res) => {
  try {
    const { eventId } = req.params;
    const pool = getPool();

    const userId = req.user.UserID;
    const role = req.user.Role;

    // Verify access
    if (role !== 'Organizer' && role !== 'Admin') {
      const staffCheck = await pool.request()
        .input('EventID', sql.Int, eventId)
        .input('StaffID', sql.Int, userId)
        .query("SELECT 1 FROM EventStaffs WHERE EventID = @EventID AND StaffID = @StaffID");
      if (staffCheck.recordset.length === 0) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    // Lấy danh sách những người đã đăng ký sự kiện này (Attendees)
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query(`
        SELECT r.RegistrationID, r.ParticipantID, u.FullName, u.Email, r.Status, 
               CASE WHEN es.EventStaffID IS NOT NULL THEN 'Assigned' ELSE NULL END AS InviteStatus, 
               a.Status AS AttendanceStatus
        FROM Registrations r
        JOIN Users u ON r.ParticipantID = u.UserID
        LEFT JOIN EventStaffs es ON r.EventID = es.EventID AND r.ParticipantID = es.StaffID
        LEFT JOIN Attendance a ON r.RegistrationID = a.RegistrationID
        WHERE r.EventID = @EventID AND r.Status = 'Registered'
      `);

    return res.status(200).json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Get participants error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách người tham gia' });
  }
};

// ─── GET AVAILABLE STAFF ──────────────────────────────────────────
const getAvailableStaff = async (req, res) => {
  try {
    const pool = getPool();
    // Lấy tất cả user có role Staff
    const result = await pool.request()
      .query(`
        SELECT UserID, FullName, Email, Role, Phone, IsActive, CreatedAt
        FROM Users
        WHERE Role = 'Staff'
      `);
    return res.status(200).json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Get available staff error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách Staff' });
  }
};

// ─── CRUD STAFF BY ADMIN ──────────────────────────────────────────
const createStaff = async (req, res) => {
  try {
    const { fullName, email, phone, password, role } = req.body;
    const pool = getPool();
    const check = await pool.request().input('Email', sql.VarChar(255), email).query('SELECT 1 FROM Users WHERE Email = @Email');
    if (check.recordset.length > 0) return res.status(400).json({ success: false, message: 'Email đã tồn tại' });
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || '123456', salt);

    await pool.request()
      .input('FullName', sql.NVarChar(255), fullName)
      .input('Email', sql.VarChar(255), email)
      .input('PasswordHash', sql.VarChar(255), hashedPassword)
      .input('Role', sql.VarChar(50), role || 'Staff')
      .input('Phone', sql.VarChar(20), phone || null)
      .query(`
        INSERT INTO Users (FullName, Email, PasswordHash, Role, Phone, IsVerified, IsActive)
        VALUES (@FullName, @Email, @PasswordHash, @Role, @Phone, 1, 1)
      `);
    return res.status(201).json({ success: true, message: 'Thêm tình nguyện viên thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi thêm tình nguyện viên' });
  }
};

const updateStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { fullName, phone, role, isActive } = req.body;
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, staffId)
      .input('FullName', sql.NVarChar(255), fullName)
      .input('Phone', sql.VarChar(20), phone || null)
      .input('Role', sql.VarChar(50), role || 'Staff')
      .input('IsActive', sql.Bit, isActive !== undefined ? isActive : 1)
      .query(`
        UPDATE Users 
        SET FullName = @FullName, Phone = @Phone, Role = @Role, IsActive = @IsActive
        WHERE UserID = @UserID
      `);
    return res.status(200).json({ success: true, message: 'Cập nhật tình nguyện viên thành công' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật tình nguyện viên' });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const pool = getPool();
    // Soft delete or just block
    await pool.request()
      .input('UserID', sql.Int, staffId)
      .query('UPDATE Users SET IsActive = 0 WHERE UserID = @UserID');
    return res.status(200).json({ success: true, message: 'Đã khóa tình nguyện viên' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Lỗi xóa tình nguyện viên' });
  }
};

// ─── GET ASSIGNED STAFF ───────────────────────────────────────────
const getAssignedStaff = async (req, res) => {
  try {
    const { eventId } = req.params;
    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query(`
        SELECT es.EventStaffID, es.StaffID, u.FullName, u.Email, u.Role, u.Phone, es.AssignedAt
        FROM EventStaffs es
        JOIN Users u ON es.StaffID = u.UserID
        WHERE es.EventID = @EventID
      `);
    return res.status(200).json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Get assigned staff error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách Staff đã gán' });
  }
};

// ─── ASSIGN STAFF (By Admin) ──────────────────────────────────────
const assignStaff = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { staffIds } = req.body; // Mảng các staffId cần gán
    const adminId = req.user.UserID;

    if (!Array.isArray(staffIds) || staffIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất một Staff' });
    }

    const pool = getPool();

    // Lấy thông tin thời gian của sự kiện đang được gán
    const eventQuery = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query('SELECT StartDate, EndDate, Title FROM Events WHERE EventID = @EventID');
    
    if (eventQuery.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sự kiện' });
    }
    const currentEvent = eventQuery.recordset[0];

    const errors = [];
    let successCount = 0;

    for (const staffId of staffIds) {
      // Kiểm tra xem đã được gán chưa
      const existCheck = await pool.request()
        .input('EventID', sql.Int, eventId)
        .input('StaffID', sql.Int, staffId)
        .query('SELECT 1 FROM EventStaffs WHERE EventID = @EventID AND StaffID = @StaffID');
      
      if (existCheck.recordset.length > 0) continue; // Bỏ qua nếu đã gán

      // Kiểm tra trùng lịch (Overlap) với các sự kiện khác mà staff này đã được gán
      const overlapCheck = await pool.request()
        .input('StaffID', sql.Int, staffId)
        .input('EventID', sql.Int, eventId) // Bỏ qua chính sự kiện này
        .input('StartDate', sql.DateTime, currentEvent.StartDate)
        .input('EndDate', sql.DateTime, currentEvent.EndDate)
        .query(`
          SELECT e.Title, e.StartDate, e.EndDate 
          FROM EventStaffs es
          JOIN Events e ON es.EventID = e.EventID
          WHERE es.StaffID = @StaffID
            AND es.EventID != @EventID
            AND (
              (@StartDate < e.EndDate AND @EndDate > e.StartDate)
            )
        `);

      if (overlapCheck.recordset.length > 0) {
        const conflictEvent = overlapCheck.recordset[0];
        errors.push(`Staff ID ${staffId} bị trùng lịch với sự kiện "${conflictEvent.Title}"`);
        continue;
      }

      // Gán Staff
      await pool.request()
        .input('EventID', sql.Int, eventId)
        .input('StaffID', sql.Int, staffId)
        .input('AssignedBy', sql.Int, adminId)
        .query(`
          INSERT INTO EventStaffs (EventID, StaffID, AssignedBy)
          VALUES (@EventID, @StaffID, @AssignedBy)
        `);
      
      // Notify staff
      await pool.request()
        .input('UserID', sql.Int, staffId)
        .input('Title', sql.NVarChar(300), 'Phân công sự kiện mới')
        .input('Message', sql.NVarChar(sql.MAX), `Bạn đã được Admin phân công hỗ trợ sự kiện "${currentEvent.Title}".`)
        .input('Type', sql.VarChar(30), 'General')
        .query('INSERT INTO Notifications (UserID, Title, Message, Type) VALUES (@UserID, @Title, @Message, @Type)');
      
      successCount++;
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Đã gán thành công ${successCount} staff. Tuy nhiên có lỗi xảy ra: ${errors.join(', ')}`,
        errors
      });
    }

    return res.status(200).json({ success: true, message: `Đã gán thành công ${successCount} Staff.` });
  } catch (error) {
    console.error('Assign staff error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi gán Staff' });
  }
};

// ─── GENERATE STAFF CHECK-IN SESSION (For Staff) ─────────────────
const generateStaffSession = async (req, res) => {
  try {
    const { eventId } = req.params;
    const staffId = req.user.UserID;

    const pool = getPool();
    
    // Check if user is an accepted staff
    const staffCheck = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('StaffID', sql.Int, staffId)
      .query("SELECT * FROM EventStaffs WHERE EventID = @EventID AND StaffID = @StaffID");

    if (staffCheck.recordset.length === 0) {
      return res.status(403).json({ success: false, message: 'Bạn không phải là Staff của sự kiện này' });
    }

    // Generate JWT token containing eventId and staffId (Valid for 24h)
    const token = jwt.sign(
      { eventId, staffId, type: 'checkin_session' },
      process.env.JWT_SECRET || 'ems_super_secret_key',
      { expiresIn: '24h' }
    );

    return res.status(200).json({ success: true, data: { qrToken: token } });
  } catch (error) {
    console.error('Generate staff session error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi tạo phiên Staff' });
  }
};

// ─── REVOKE STAFF ────────────────────────────────────────────────
const revokeStaff = async (req, res) => {
  try {
    const { eventId, staffId } = req.params;
    const pool = getPool();

    // Admin chỉ cần xóa
    await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('StaffID', sql.Int, staffId)
      .query('DELETE FROM EventStaffs WHERE EventID = @EventID AND StaffID = @StaffID');

    return res.status(200).json({ success: true, message: 'Đã gỡ quyền Staff' });
  } catch (error) {
    console.error('Revoke staff error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi xóa quyền Staff' });
  }
};

// ─── PARTICIPANT CHECKIN WITH OTP ────────────────────────────────
const participantCheckinWithOTP = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { otp, staffId } = req.body;
    const participantId = req.user.UserID;

    if (!otp || !staffId) {
      return res.status(400).json({ success: false, message: 'Thiếu mã OTP hoặc Staff ID' });
    }

    const pool = getPool();

    // Verify staff exists for this event
    const staffCheck = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('StaffID', sql.Int, staffId)
      .query('SELECT 1 FROM EventStaffs WHERE EventID = @EventID AND StaffID = @StaffID');
    
    if (staffCheck.recordset.length === 0) {
      return res.status(400).json({ success: false, message: 'Staff này không tồn tại hoặc không có quyền' });
    }

    // Get registration and check OTP
    const regRes = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('ParticipantID', sql.Int, participantId)
      .query(`
        SELECT r.RegistrationID, r.Status, qt.OTPCode, qt.IsUsed
        FROM Registrations r
        JOIN QRTickets qt ON r.RegistrationID = qt.RegistrationID
        WHERE r.EventID = @EventID AND r.ParticipantID = @ParticipantID
      `);
    
    if (regRes.recordset.length === 0) {
      return res.status(400).json({ success: false, message: 'Bạn chưa đăng ký sự kiện này' });
    }

    const reg = regRes.recordset[0];
    if (reg.Status !== 'Registered') {
      return res.status(400).json({ success: false, message: 'Đăng ký của bạn không hợp lệ' });
    }

    if (reg.OTPCode !== otp) {
      return res.status(400).json({ success: false, message: 'Mã OTP không chính xác' });
    }

    if (reg.IsUsed) {
      return res.status(400).json({ success: false, message: 'Mã OTP này đã được sử dụng' });
    }

    // Check in success -> Update IsUsed = 1
    await pool.request()
      .input('RegistrationID', sql.Int, reg.RegistrationID)
      .query('UPDATE QRTickets SET IsUsed = 1 WHERE RegistrationID = @RegistrationID');

    // Create Attendance record
    await pool.request()
      .input('RegistrationID', sql.Int, reg.RegistrationID)
      .input('CheckedInBy', sql.Int, staffId)
      .query(`
        INSERT INTO Attendance (RegistrationID, CheckedInBy, Status, CheckInTime)
        VALUES (@RegistrationID, @CheckedInBy, 'Present', GETDATE())
      `);

    return res.status(200).json({ success: true, message: 'Tham gia sự kiện thành công!' });
  } catch (error) {
    console.error('Participant Checkin error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xử lý check-in' });
  }
};

module.exports = {
  getEventParticipants,
  getAvailableStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  getAssignedStaff,
  assignStaff,
  generateStaffSession,
  revokeStaff,
  participantCheckinWithOTP
};
