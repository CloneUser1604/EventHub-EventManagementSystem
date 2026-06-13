const { getPool, sql } = require('../config/db');
const jwt = require('jsonwebtoken');

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
        .input('ParticipantID', sql.Int, userId)
        .query("SELECT Status FROM StaffInvitations WHERE EventID = @EventID AND ParticipantID = @ParticipantID AND Status = 'Accepted'");
      if (staffCheck.recordset.length === 0) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    // Lấy danh sách những người đã đăng ký sự kiện này
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query(`
        SELECT r.RegistrationID, r.ParticipantID, u.FullName, u.Email, r.Status, i.Status AS InviteStatus, a.Status AS AttendanceStatus
        FROM Registrations r
        JOIN Users u ON r.ParticipantID = u.UserID
        LEFT JOIN StaffInvitations i ON r.EventID = i.EventID AND r.ParticipantID = i.ParticipantID
        LEFT JOIN Attendance a ON r.RegistrationID = a.RegistrationID
        WHERE r.EventID = @EventID AND r.Status = 'Registered'
      `);

    return res.status(200).json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Get participants error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách người tham gia' });
  }
};

// ─── INVITE STAFF ────────────────────────────────────────────────
const inviteStaff = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { participantId } = req.body;
    const organizerId = req.user.UserID;

    const pool = getPool();

    // Verify Organizer owns event
    const eventCheck = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query('SELECT OrganizerID, Title FROM Events WHERE EventID = @EventID');
    
    if (eventCheck.recordset.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
    if (eventCheck.recordset[0].OrganizerID !== organizerId) return res.status(403).json({ success: false, message: 'Forbidden' });

    // Check if participant is actually registered
    const regCheck = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('ParticipantID', sql.Int, participantId)
      .query("SELECT * FROM Registrations WHERE EventID = @EventID AND ParticipantID = @ParticipantID AND Status = 'Registered'");
    
    if (regCheck.recordset.length === 0) return res.status(400).json({ success: false, message: 'Người này chưa đăng ký sự kiện' });

    // Check existing invitation
    const invCheck = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('ParticipantID', sql.Int, participantId)
      .query("SELECT Status FROM StaffInvitations WHERE EventID = @EventID AND ParticipantID = @ParticipantID");
    
    if (invCheck.recordset.length > 0) {
      if (invCheck.recordset[0].Status === 'Declined') {
        await pool.request()
          .input('EventID', sql.Int, eventId)
          .input('ParticipantID', sql.Int, participantId)
          .query("UPDATE StaffInvitations SET Status = 'Pending', RespondedAt = NULL WHERE EventID = @EventID AND ParticipantID = @ParticipantID");
          
        await pool.request()
          .input('UserID', sql.Int, participantId)
          .input('Title', sql.NVarChar(300), 'Lời mời làm Staff (Gửi lại)')
          .input('Message', sql.NVarChar(sql.MAX), `Bạn được mời lại làm Staff cho sự kiện "${eventCheck.recordset[0].Title}".`)
          .input('Type', sql.VarChar(30), 'General')
          .input('RelatedID', sql.Int, eventId)
          .input('RelatedType', sql.VarChar(50), 'StaffInvite')
          .query(`INSERT INTO Notifications (UserID, Title, Message, Type, RelatedID, RelatedType) VALUES (@UserID, @Title, @Message, @Type, @RelatedID, @RelatedType)`);

        return res.json({ success: true, message: 'Đã gửi lại lời mời làm Staff' });
      }
      return res.status(400).json({ success: false, message: 'Người này đã được mời làm Staff' });
    }

    // Insert invitation
    await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('ParticipantID', sql.Int, participantId)
      .input('InvitedBy', sql.Int, organizerId)
      .query(`
        INSERT INTO StaffInvitations (EventID, ParticipantID, InvitedBy, Status)
        VALUES (@EventID, @ParticipantID, @InvitedBy, 'Pending')
      `);

    // Gửi thông báo cho Participant (dùng Type = General để tránh lỗi CHECK CONSTRAINT trong DB, và dùng RelatedType để phân biệt frontend)
    await pool.request()
      .input('UserID', sql.Int, participantId)
      .input('Title', sql.NVarChar(300), 'Lời mời làm Staff')
      .input('Message', sql.NVarChar(sql.MAX), `Bạn được mời làm Staff cho sự kiện "${eventCheck.recordset[0].Title}".`)
      .input('Type', sql.VarChar(30), 'General')
      .input('RelatedID', sql.Int, eventId)
      .input('RelatedType', sql.VarChar(50), 'StaffInvite')
      .query(`INSERT INTO Notifications (UserID, Title, Message, Type, RelatedID, RelatedType) VALUES (@UserID, @Title, @Message, @Type, @RelatedID, @RelatedType)`);

    return res.status(200).json({ success: true, message: 'Đã gửi lời mời Staff' });
  } catch (error) {
    console.error('Invite staff error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi gửi lời mời Staff' });
  }
};

// ─── RESPOND TO INVITATION ───────────────────────────────────────
const respondToInvitation = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { action } = req.body; // 'Accept' or 'Decline'
    const participantId = req.user.UserID;

    if (!['Accepted', 'Declined'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Hành động không hợp lệ' });
    }

    const pool = getPool();
    const result = await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('ParticipantID', sql.Int, participantId)
      .input('Status', sql.VarChar(20), action)
      .query(`
        UPDATE StaffInvitations 
        SET Status = @Status, RespondedAt = GETDATE()
        OUTPUT INSERTED.InvitedBy
        WHERE EventID = @EventID AND ParticipantID = @ParticipantID AND Status = 'Pending'
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lời mời hoặc đã xử lý' });
    }

    // Nếu đồng ý, thêm vào bảng EventStaffs
    if (action === 'Accepted') {
      const invitedBy = result.recordset[0].InvitedBy;
      await pool.request()
        .input('EventID', sql.Int, eventId)
        .input('StaffID', sql.Int, participantId)
        .input('AssignedBy', sql.Int, invitedBy)
        .query(`
          INSERT INTO EventStaffs (EventID, StaffID, AssignedBy)
          VALUES (@EventID, @StaffID, @AssignedBy)
        `);
    }

    return res.status(200).json({ success: true, message: `Bạn đã ${action === 'Accepted' ? 'chấp nhận' : 'từ chối'} làm Staff` });
  } catch (error) {
    console.error('Respond invitation error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xử lý phản hồi' });
  }
};

// ─── GET INVITATIONS (For Participant) ───────────────────────────
const getMyInvitations = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request()
      .input('ParticipantID', sql.Int, req.user.UserID)
      .query(`
        SELECT i.EventID, e.Title AS EventTitle, i.Status, i.SentAt
        FROM StaffInvitations i
        JOIN Events e ON i.EventID = e.EventID
        WHERE i.ParticipantID = @ParticipantID
      `);
    return res.status(200).json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Get my invitations error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lấy danh sách lời mời' });
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
      .input('ParticipantID', sql.Int, staffId)
      .query("SELECT * FROM StaffInvitations WHERE EventID = @EventID AND ParticipantID = @ParticipantID AND Status = 'Accepted'");

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

// ─── REVOKE STAFF (For Organizer) ────────────────────────────────
const revokeStaff = async (req, res) => {
  try {
    const { eventId, staffId } = req.params;
    const organizerId = req.user.UserID;
    const pool = getPool();

    // Verify ownership
    const eventCheck = await pool.request()
      .input('EventID', sql.Int, eventId)
      .query('SELECT OrganizerID FROM Events WHERE EventID = @EventID');
    
    if (eventCheck.recordset.length === 0 || eventCheck.recordset[0].OrganizerID !== organizerId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('StaffID', sql.Int, staffId)
      .query('DELETE FROM EventStaffs WHERE EventID = @EventID AND StaffID = @StaffID');

    await pool.request()
      .input('EventID', sql.Int, eventId)
      .input('ParticipantID', sql.Int, staffId)
      .query("DELETE FROM StaffInvitations WHERE EventID = @EventID AND ParticipantID = @ParticipantID");

    return res.status(200).json({ success: true, message: 'Đã xóa quyền Staff' });
  } catch (error) {
    console.error('Revoke staff error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xóa quyền Staff' });
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
  inviteStaff,
  respondToInvitation,
  getMyInvitations,
  generateStaffSession,
  revokeStaff,
  participantCheckinWithOTP
};
