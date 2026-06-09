const bcrypt = require('bcryptjs');
const { getPool, sql } = require('../config/db');

// ─── CREATE MOCK EVENT (FOR TESTING) ───────────────────────────
const createEvent = async (req, res) => {
  try {
    const { title, description, startDate, endDate, maxParticipants } = req.body;
    const organizerId = req.user.UserID;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Tiêu đề, ngày bắt đầu và ngày kết thúc là bắt buộc.',
      });
    }

    const pool = getPool();
    const result = await pool
      .request()
      .input('OrganizerID', sql.Int, organizerId)
      .input('Title', sql.NVarChar(300), title)
      .input('Description', sql.NVarChar(sql.MAX), description || null)
      .input('StartDate', sql.DateTime, new Date(startDate))
      .input('EndDate', sql.DateTime, new Date(endDate))
      .input('MaxParticipants', sql.Int, maxParticipants ? parseInt(maxParticipants) : null)
      .query(`
        INSERT INTO Events (OrganizerID, Title, Description, StartDate, EndDate, MaxParticipants, Status, ApprovalStatus)
        OUTPUT INSERTED.EventID, INSERTED.Title, INSERTED.StartDate, INSERTED.EndDate, INSERTED.Status
        VALUES (@OrganizerID, @Title, @Description, @StartDate, @EndDate, @MaxParticipants, 'Published', 'Approved')
      `);

    return res.status(201).json({
      success: true,
      message: 'Tạo sự kiện thành công!',
      data: result.recordset[0],
    });
  } catch (error) {
    console.error('Create event error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tạo sự kiện' });
  }
};

// ─── GET ORGANIZER'S EVENTS ────────────────────────────────────
const getMyEvents = async (req, res) => {
  try {
    const organizerId = req.user.UserID;
    const pool = getPool();
    const result = await pool
      .request()
      .input('OrganizerID', sql.Int, organizerId)
      .query(`
        SELECT EventID, Title, Description, StartDate, EndDate, MaxParticipants, Status, CreatedAt
        FROM Events
        WHERE OrganizerID = @OrganizerID
        ORDER BY CreatedAt DESC
      `);

    return res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Get my events error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sự kiện' });
  }
};

// ─── GET EVENT DETAILS (WITH ASSOCIATED SPEAKERS) ──────────────
const getEventDetails = async (req, res) => {
  try {
    const { eventId } = req.params;
    const pool = getPool();

    const eventResult = await pool
      .request()
      .input('EventID', sql.Int, eventId)
      .query(`
        SELECT EventID, OrganizerID, Title, Description, StartDate, EndDate, MaxParticipants, Status
        FROM Events
        WHERE EventID = @EventID
      `);

    const event = eventResult.recordset[0];
    if (!event) {
      return res.status(404).json({ success: false, message: 'Sự kiện không tồn tại' });
    }

    // Check permissions
    if (req.user.Role !== 'Admin' && event.OrganizerID !== req.user.UserID) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập sự kiện này' });
    }

    // Fetch speakers
    const speakersResult = await pool
      .request()
      .input('EventID', sql.Int, eventId)
      .query(`
        SELECT 
          u.UserID, u.FullName, u.Email, u.Phone,
          sp.SpeakerProfileID, sp.Bio, sp.Expertise, sp.LinkedInURL, sp.WebsiteURL,
          si.Status AS InvitationStatus, si.CreatedAt AS InvitedAt
        FROM SpeakerInvitations si
        JOIN Users u ON si.SpeakerID = u.UserID
        LEFT JOIN SpeakerProfiles sp ON u.UserID = sp.UserID
        WHERE si.EventID = @EventID
      `);

    return res.json({
      success: true,
      data: {
        ...event,
        speakers: speakersResult.recordset,
      },
    });
  } catch (error) {
    console.error('Get event details error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết sự kiện' });
  }
};

// ─── REGISTER SPEAKER FOR EVENT ────────────────────────────────
const registerSpeakerForEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { email, fullName, phone, bio, expertise, linkedInUrl, websiteUrl } = req.body;
    const organizerId = req.user.UserID;

    if (!email || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Email và Họ tên diễn giả là bắt buộc.',
      });
    }

    const pool = getPool();

    // 1. Verify event exists and requester has permission
    const eventResult = await pool
      .request()
      .input('EventID', sql.Int, eventId)
      .query('SELECT OrganizerID FROM Events WHERE EventID = @EventID');

    const event = eventResult.recordset[0];
    if (!event) {
      return res.status(404).json({ success: false, message: 'Sự kiện không tồn tại' });
    }

    if (req.user.Role !== 'Admin' && event.OrganizerID !== organizerId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thêm diễn giả cho sự kiện này' });
    }

    // 2. Check if user already exists
    const userResult = await pool
      .request()
      .input('Email', sql.VarChar(255), email)
      .query('SELECT UserID, Role FROM Users WHERE Email = @Email');

    let speakerUserId = null;
    const existingUser = userResult.recordset[0];

    if (existingUser) {
      if (existingUser.Role !== 'Speaker') {
        return res.status(400).json({
          success: false,
          message: 'Email này đã được sử dụng cho một tài khoản với vai trò khác (không phải Diễn giả).',
        });
      }
      speakerUserId = existingUser.UserID;

      // Make sure speaker profile exists
      const profileResult = await pool
        .request()
        .input('UserID', sql.Int, speakerUserId)
        .query('SELECT SpeakerProfileID FROM SpeakerProfiles WHERE UserID = @UserID');

      if (profileResult.recordset.length === 0) {
        await pool
          .request()
          .input('UserID', sql.Int, speakerUserId)
          .input('Bio', sql.NVarChar(sql.MAX), bio || null)
          .input('Expertise', sql.NVarChar(500), expertise || null)
          .input('LinkedInURL', sql.VarChar(500), linkedInUrl || null)
          .input('WebsiteURL', sql.VarChar(500), websiteUrl || null)
          .query(`
            INSERT INTO SpeakerProfiles (UserID, Bio, Expertise, LinkedInURL, WebsiteURL)
            VALUES (@UserID, @Bio, @Expertise, @LinkedInURL, @WebsiteURL)
          `);
      }
    } else {
      // Create new Speaker User
      const passwordHash = await bcrypt.hash('Speaker@123', 12);
      const insertUserResult = await pool
        .request()
        .input('FullName', sql.NVarChar(150), fullName)
        .input('Email', sql.VarChar(255), email)
        .input('PasswordHash', sql.VarChar(255), passwordHash)
        .input('Phone', sql.VarChar(20), phone || null)
        .query(`
          INSERT INTO Users (FullName, Email, PasswordHash, Role, Phone, IsVerified, IsActive)
          OUTPUT INSERTED.UserID
          VALUES (@FullName, @Email, @PasswordHash, 'Speaker', @Phone, 1, 1)
        `);

      speakerUserId = insertUserResult.recordset[0].UserID;

      // Create Speaker Profile
      await pool
        .request()
        .input('UserID', sql.Int, speakerUserId)
        .input('Bio', sql.NVarChar(sql.MAX), bio || null)
        .input('Expertise', sql.NVarChar(500), expertise || null)
        .input('LinkedInURL', sql.VarChar(500), linkedInUrl || null)
        .input('WebsiteURL', sql.VarChar(500), websiteUrl || null)
        .query(`
          INSERT INTO SpeakerProfiles (UserID, Bio, Expertise, LinkedInURL, WebsiteURL)
          VALUES (@UserID, @Bio, @Expertise, @LinkedInURL, @WebsiteURL)
        `);
    }

    // 3. Associate with Event via SpeakerInvitations
    const inviteResult = await pool
      .request()
      .input('EventID', sql.Int, eventId)
      .input('SpeakerID', sql.Int, speakerUserId)
      .query('SELECT Status FROM SpeakerInvitations WHERE EventID = @EventID AND SpeakerID = @SpeakerID');

    if (inviteResult.recordset.length > 0) {
      const invite = inviteResult.recordset[0];
      if (invite.Status === 'Accepted') {
        return res.status(400).json({
          success: false,
          message: 'Diễn giả này đã được đăng ký và hoạt động trong sự kiện này.',
        });
      } else {
        // Update to accepted since organizer is registering them directly
        await pool
          .request()
          .input('EventID', sql.Int, eventId)
          .input('SpeakerID', sql.Int, speakerUserId)
          .query(`
            UPDATE SpeakerInvitations 
            SET Status = 'Accepted', RespondedAt = GETDATE() 
            WHERE EventID = @EventID AND SpeakerID = @SpeakerID
          `);
      }
    } else {
      // Create new accepted invitation
      await pool
        .request()
        .input('EventID', sql.Int, eventId)
        .input('SpeakerID', sql.Int, speakerUserId)
        .input('InvitedBy', sql.Int, organizerId)
        .query(`
          INSERT INTO SpeakerInvitations (EventID, SpeakerID, InvitedBy, Status, RespondedAt)
          VALUES (@EventID, @SpeakerID, @InvitedBy, 'Accepted', GETDATE())
        `);
    }

    return res.status(201).json({
      success: true,
      message: 'Đăng ký diễn giả vào sự kiện thành công!',
      data: {
        speakerId: speakerUserId,
        email,
        fullName,
      },
    });
  } catch (error) {
    console.error('Register speaker for event error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi đăng ký diễn giả cho sự kiện' });
  }
};

module.exports = {
  createEvent,
  getMyEvents,
  getEventDetails,
  registerSpeakerForEvent,
};
