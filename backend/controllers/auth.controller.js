const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { getPool, sql } = require('../config/db');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/email');
const {
  successResponse, createdResponse, errorResponse,
  unauthorizedResponse, notFoundResponse, conflictResponse, forbiddenResponse,
} = require('../utils/response');

// ─── REGISTER (Participant | Organizer only) ──────────────────
const register = async (req, res) => {
  try {
    const { fullName, email, password, role = 'Participant', phone, organizationName, university } = req.body;

    if (!['Participant', 'Organizer'].includes(role)) {
      return errorResponse(res, 'Chỉ được đăng ký với vai trò: Người tham dự hoặc Ban tổ chức', 400);
    }

    const pool = getPool();

    const existing = await pool.request()
      .input('Email', sql.VarChar(255), email)
      .query('SELECT UserID FROM Users WHERE Email = @Email');
    if (existing.recordset.length > 0) return conflictResponse(res, 'Email đã được sử dụng');

    if (role === 'Organizer') {
      const files = req.files;
      if (!files || !files['documents'] || files['documents'].length === 0) {
        return errorResponse(res, 'Ban tổ chức cần upload ít nhất 1 tài liệu xác minh', 400);
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const insertResult = await pool.request()
      .input('FullName', sql.NVarChar(150), fullName)
      .input('Email', sql.VarChar(255), email)
      .input('PasswordHash', sql.VarChar(255), passwordHash)
      .input('Role', sql.VarChar(20), role)
      .input('Phone', sql.VarChar(20), phone || null)
      .input('University', sql.NVarChar(150), university || null)
      .query(`
        INSERT INTO Users (FullName, Email, PasswordHash, Role, Phone, University, IsVerified, IsActive)
        OUTPUT INSERTED.UserID, INSERTED.FullName, INSERTED.Email, INSERTED.Role, INSERTED.CreatedAt
        VALUES (@FullName, @Email, @PasswordHash, @Role, @Phone, @University, 1, 1)
      `);

    const newUser = insertResult.recordset[0];

    if (role === 'Organizer') {
      const uploadedFiles = req.files['documents'];
      const filePaths = uploadedFiles.map(f => f.filename);
      const documentJSON = JSON.stringify(filePaths);

      await pool.request()
        .input('UserID', sql.Int, newUser.UserID)
        .input('OrganizationName', sql.NVarChar(200), organizationName)
        .input('DocumentURL', sql.VarChar(500), documentJSON)
        .query(`
          INSERT INTO OrganizerProfiles (UserID, OrganizationName, DocumentURL, ApprovalStatus)
          VALUES (@UserID, @OrganizationName, @DocumentURL, 'Pending')
        `);

      const admins = await pool.request()
        .query(`SELECT UserID FROM Users WHERE Role = 'Admin' AND IsActive = 1`);
      for (const admin of admins.recordset) {
        await pool.request()
          .input('AdminID', sql.Int, admin.UserID)
          .input('Title', sql.NVarChar(300), '🏢 Ban tổ chức mới cần phê duyệt')
          .input('Message', sql.NVarChar(sql.MAX), `${fullName} (${organizationName}) đã đăng ký tài khoản Ban tổ chức. Vui lòng xem xét hồ sơ trong Admin Dashboard.`)
          .input('Type', sql.VarChar(30), 'General')
          .query(`INSERT INTO Notifications (UserID,Title,Message,Type) VALUES (@AdminID,@Title,@Message,@Type)`);
      }
    }

    return createdResponse(
      res,
      { userId: newUser.UserID, email: newUser.Email, role: newUser.Role },
      role === 'Organizer'
        ? 'Đăng ký thành công! Tài khoản ban tổ chức đang chờ Admin phê duyệt. Bạn có thể đăng nhập nhưng cần được duyệt để tạo sự kiện.'
        : 'Đăng ký thành công! Bạn có thể đăng nhập ngay.'
    );
  } catch (error) {
    if (req.files?.documents) {
      req.files.documents.forEach(f => {
        fs.unlink(f.path, () => {});
      });
    }
    console.error('Register error:', error);
    return errorResponse(res, 'Đăng ký thất bại. Vui lòng thử lại.');
  }
};

// ─── VERIFY EMAIL ─────────────────────────────────────────────
const verifyEmail = async (req, res) => {
  return successResponse(res, null, 'Xác thực email không cần thiết. Tài khoản đã được kích hoạt.');
};

// ─── RESEND VERIFICATION ──────────────────────────────────────
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const pool = getPool();
    const result = await pool.request()
      .input('Email', sql.VarChar(255), email)
      .query('SELECT UserID, FullName, IsVerified FROM Users WHERE Email = @Email');

    const msg = 'Nếu email tồn tại và chưa xác thực, chúng tôi sẽ gửi lại email.';
    const user = result.recordset[0];
    if (!user || user.IsVerified) return successResponse(res, null, msg);

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.request()
      .input('UserID', sql.Int, user.UserID)
      .input('VerifyToken', sql.VarChar(255), verifyToken)
      .input('VerifyTokenExpiry', sql.DateTime, verifyTokenExpiry)
      .query(`UPDATE Users SET VerifyToken = @VerifyToken, VerifyTokenExpiry = @VerifyTokenExpiry WHERE UserID = @UserID`);

    sendVerificationEmail(email, user.FullName, verifyToken).catch(console.error);
    return successResponse(res, null, msg);
  } catch (error) {
    return errorResponse(res, 'Gửi lại email xác thực thất bại');
  }
};

// ─── LOGIN ────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`\n🔐 [LOGIN] email="${email}" | time=${new Date().toISOString()}`);
    const pool = getPool();

    const result = await pool.request()
      .input('Email', sql.VarChar(255), email)
      .query(`SELECT u.UserID, u.FullName, u.Email, u.PasswordHash, u.Role, u.Phone, u.IsActive, u.IsVerified, u.AvatarURL, 
                     op.ApprovalStatus as OrgApprovalStatus
              FROM Users u
              LEFT JOIN OrganizerProfiles op ON u.UserID = op.UserID
              WHERE u.Email = @Email`);

    const user = result.recordset[0];

    if (!user) {
      console.log(`  ❌ No user found for email: ${email}`);
      return unauthorizedResponse(res, 'Email hoặc mật khẩu không đúng');
    }
    console.log(`  ✅ Found: UserID=${user.UserID} Role=${user.Role} IsActive=${user.IsActive} IsVerified=${user.IsVerified}`);

    if (!user.IsActive) {
      console.log(`  ❌ Account inactive`);
      if (user.Role === 'Speaker') {
        return unauthorizedResponse(res, 'Tài khoản diễn giả chưa được Admin phê duyệt.');
      }
      if (user.Role !== 'Organizer') {
        return unauthorizedResponse(res, 'Tài khoản đã bị vô hiệu hóa');
      }
    }

    const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
    
    if (!isPasswordValid) {
      console.log(`  ❌ Wrong password`);
      return unauthorizedResponse(res, 'Email hoặc mật khẩu không đúng');
    }

    console.log(`  ✅ LOGIN SUCCESS: ${email} (${user.Role})`);
    
    const tokenPayload = { userId: user.UserID, email: user.Email, role: user.Role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.request()
      .input('UserID', sql.Int, user.UserID)
      .input('RefreshToken', sql.VarChar(500), refreshToken)
      .input('RefreshTokenExpiry', sql.DateTime, refreshExpiry)
      .query(`UPDATE Users SET RefreshToken = @RefreshToken, RefreshTokenExpiry = @RefreshTokenExpiry, UpdatedAt = GETDATE() WHERE UserID = @UserID`);

    return successResponse(res, {
      accessToken, refreshToken,
      user: {
        userId: user.UserID,
        fullName: user.FullName,
        email: user.Email,
        role: user.Role,
        avatarURL: user.AvatarURL,
        phone: user.Phone,
        isVerified: user.IsVerified,
        orgApprovalStatus: user.OrgApprovalStatus || null,
      },
    }, 'Đăng nhập thành công');
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'Đăng nhập thất bại. Vui lòng thử lại.');
  }
};

// ─── REFRESH TOKEN ────────────────────────────────────────────
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return unauthorizedResponse(res, 'Refresh token required');
    const decoded = verifyRefreshToken(token);
    const pool = getPool();

    const result = await pool.request()
      .input('UserID', sql.Int, decoded.userId)
      .input('RefreshToken', sql.VarChar(500), token)
      .query(`SELECT UserID, FullName, Email, Role, IsActive, RefreshTokenExpiry FROM Users WHERE UserID = @UserID AND RefreshToken = @RefreshToken`);

    const user = result.recordset[0];
    if (!user) return unauthorizedResponse(res, 'Invalid refresh token');
    if (!user.IsActive) return unauthorizedResponse(res, 'Account deactivated');
    if (new Date() > new Date(user.RefreshTokenExpiry)) return unauthorizedResponse(res, 'Refresh token expired');

    const tokenPayload = { userId: user.UserID, email: user.Email, role: user.Role };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.request()
      .input('UserID', sql.Int, user.UserID)
      .input('RefreshToken', sql.VarChar(500), newRefreshToken)
      .input('RefreshTokenExpiry', sql.DateTime, refreshExpiry)
      .query(`UPDATE Users SET RefreshToken = @RefreshToken, RefreshTokenExpiry = @RefreshTokenExpiry WHERE UserID = @UserID`);

    return successResponse(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');
  } catch (error) {
    if (['JsonWebTokenError', 'TokenExpiredError'].includes(error.name)) return unauthorizedResponse(res, 'Invalid or expired refresh token');
    return errorResponse(res, 'Token refresh failed');
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, req.user.UserID)
      .query(`UPDATE Users SET RefreshToken = NULL, RefreshTokenExpiry = NULL WHERE UserID = @UserID`);
    return successResponse(res, null, 'Đăng xuất thành công');
  } catch (error) {
    return errorResponse(res, 'Đăng xuất thất bại');
  }
};

// ─── GET ME ───────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const pool = getPool();
    
    const exactUserId = req.user?.UserID || req.user?.userId || req.user?.id;
    
    if (!exactUserId) {
       console.log('❌ Lỗi: Token bị thiếu ID người dùng', req.user);
       return errorResponse(res, 'Lỗi xác thực người dùng', 401);
    }

    const result = await pool.request()
      .input('UserID', sql.Int, exactUserId)
      .query(`
        SELECT u.UserID, u.FullName, u.Email, u.Role, u.AvatarURL, u.Phone, u.University, u.IsVerified, u.CreatedAt,
               op.OrganizerProfileID, op.OrganizationName, op.ApprovalStatus AS OrgApprovalStatus,
               op.DocumentURL, op.RejectionReason AS OrgRejectionReason
        FROM Users u
        LEFT JOIN OrganizerProfiles op ON u.UserID = op.UserID
        WHERE u.UserID = @UserID
      `);

    const row = result.recordset[0];
    if (!row) {
      console.log(`❌ Lỗi: Không tìm thấy tài khoản có ID = ${exactUserId} trong Database`);
      return notFoundResponse(res, 'User not found');
    }

    const user = {
      userId: row.UserID, 
      fullName: row.FullName, 
      email: row.Email,
      role: row.Role, 
      avatarURL: row.AvatarURL, 
      phone: row.Phone,
      university: row.University,
      isVerified: row.IsVerified, 
      createdAt: row.CreatedAt,
    };

    if (row.OrganizerProfileID) {
      user.organizerProfile = {
        id: row.OrganizerProfileID,
        organizationName: row.OrganizationName,
        approvalStatus: row.OrgApprovalStatus,
        rejectionReason: row.OrgRejectionReason,
        documents: (() => {
          try { return JSON.parse(row.DocumentURL || '[]'); }
          catch { return []; }
        })(),
      };
    }

    const staffCheck = await pool.request()
      .input('UserID', sql.Int, exactUserId)
      .query(`
        SELECT TOP 1 1 FROM EventStaffs es
        JOIN Events e ON es.EventID = e.EventID
        WHERE es.StaffID = @UserID AND e.EndDate > GETDATE()
      `);
    user.isCurrentStaff = staffCheck.recordset.length > 0;

    user.events = { organized: [], registered: [], attended: [] };
    user.stats = { organized: 0, registered: 0, attended: 0 };

    try {
      if (user.role === 'Organizer') {
        const orgEvents = await pool.request()
          .input('UserID', sql.Int, exactUserId)
          .query(`SELECT e.EventID AS id, e.Title AS title, e.StartDate AS startDate, e.Status AS status, v.Name AS VenueName
                  FROM Events e 
                  LEFT JOIN Venues v ON e.VenueID = v.VenueID 
                  WHERE e.OrganizerID = @UserID ORDER BY e.StartDate DESC`);
        user.events.organized = orgEvents.recordset || [];
        user.stats.organized = user.events.organized.length;
      } else {
        const regEvents = await pool.request()
          .input('UserID', sql.Int, exactUserId)
          .query(`
            SELECT e.EventID AS id, e.Title AS title, e.StartDate AS startDate, r.Status AS status, v.Name AS VenueName
            FROM Events e
            JOIN Registrations r ON e.EventID = r.EventID
            LEFT JOIN Venues v ON e.VenueID = v.VenueID
            WHERE r.ParticipantID = @UserID
            ORDER BY e.StartDate DESC
          `);
        const allRegs = regEvents.recordset || [];
        user.events.registered = allRegs.filter(e => e.status !== 'Cancelled');
        user.events.attended = allRegs.filter(e => e.status === 'Attended' || e.status === 'CheckedIn');
        user.stats.registered = user.events.registered.length;
        user.stats.attended = user.events.attended.length;
      }
    } catch (eventErr) {
      console.error("⚠️ Lỗi truy vấn lịch sử sự kiện:", eventErr.message);
    }

    return successResponse(res, user);
  } catch (error) {
    console.error("❌ Lỗi hệ thống hàm getMe:", error);
    return errorResponse(res, 'Failed to fetch user info');
  }
};

// ─── UPDATE ME ────────────────────────────────────────────────
const updateMe = async (req, res) => {
  try {
    const exactUserId = req.user?.UserID || req.user?.userId || req.user?.id;
    const { fullName, phone, university, avatarURL } = req.body;
    const pool = getPool();

    let finalAvatarURL = avatarURL || null;
    if (req.files && req.files['avatar'] && req.files['avatar'].length > 0) {
      finalAvatarURL = req.files['avatar'][0].filename;
    }

    await pool.request()
      .input('UserID', sql.Int, exactUserId)
      .input('FullName', sql.NVarChar(150), fullName)
      .input('Phone', sql.VarChar(20), phone || null)
      .input('University', sql.NVarChar(150), university || null)
      .input('AvatarURL', sql.VarChar(500), finalAvatarURL)
      .query(`
        UPDATE Users 
        SET FullName = @FullName, Phone = @Phone, University = @University, AvatarURL = @AvatarURL, UpdatedAt = GETDATE()
        WHERE UserID = @UserID
      `);

    if (req.user.Role === 'Organizer' && req.files && req.files['documents'] && req.files['documents'].length > 0) {
      const filePaths = req.files['documents'].map(f => f.filename);
      const documentJSON = JSON.stringify(filePaths);

      await pool.request()
        .input('UserID', sql.Int, exactUserId)
        .input('DocumentURL', sql.VarChar(500), documentJSON)
        .query(`
          UPDATE OrganizerProfiles 
          SET DocumentURL = @DocumentURL, ApprovalStatus = 'Pending', UpdatedAt = GETDATE()
          WHERE UserID = @UserID
        `);
    }

    return successResponse(res, null, 'Cập nhật hồ sơ thành công');
  } catch (error) {
    console.error('updateMe error:', error);
    return errorResponse(res, 'Cập nhật hồ sơ thất bại. Vui lòng thử lại.');
  }
};

// ─── FORGOT PASSWORD ──────────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const pool = getPool();
    const result = await pool.request()
      .input('Email', sql.VarChar(255), email)
      .query('SELECT UserID, FullName, IsActive FROM Users WHERE Email = @Email');

    const user = result.recordset[0];
    if (!user) return errorResponse(res, 'Tài khoản này không tồn tại. Vui lòng nhập lại email đã đăng ký.', 404);
    if (!user.IsActive) return errorResponse(res, 'Tài khoản này đã bị khóa. Không thể đặt lại mật khẩu.', 403);

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await pool.request()
      .input('UserID', sql.Int, user.UserID)
      .input('ResetToken', sql.VarChar(255), resetToken)
      .input('ResetTokenExpiry', sql.DateTime, resetTokenExpiry)
      .query(`UPDATE Users SET ResetToken = @ResetToken, ResetTokenExpiry = @ResetTokenExpiry WHERE UserID = @UserID`);

    const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log(`\n========================================`);
    console.log(`🔑 PASSWORD RESET LINK cho ${email}:`);
    console.log(`👉 ${resetURL}`);
    console.log(`========================================\n`);

    sendPasswordResetEmail(email, user.FullName, resetToken).catch(console.error);
    return successResponse(res, null, 'Đã gửi link đặt lại mật khẩu đến email của bạn.');
  } catch (error) {
    return errorResponse(res, 'Yêu cầu đặt lại mật khẩu thất bại');
  }
};

// ─── RESET PASSWORD ───────────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const pool = getPool();
    const result = await pool.request()
      .input('Token', sql.VarChar(255), token)
      .query(`SELECT UserID, ResetTokenExpiry FROM Users WHERE ResetToken = @Token`);

    const user = result.recordset[0];
    if (!user) return errorResponse(res, 'Token không hợp lệ hoặc đã hết hạn', 400);
    if (new Date() > new Date(user.ResetTokenExpiry)) return errorResponse(res, 'Token đã hết hạn.', 400);

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.request()
      .input('UserID', sql.Int, user.UserID)
      .input('PasswordHash', sql.VarChar(255), passwordHash)
      .query(`UPDATE Users SET PasswordHash=@PasswordHash, ResetToken=NULL, ResetTokenExpiry=NULL, RefreshToken=NULL, RefreshTokenExpiry=NULL, UpdatedAt=GETDATE() WHERE UserID=@UserID`);

    return successResponse(res, null, 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
  } catch (error) {
    return errorResponse(res, 'Đặt lại mật khẩu thất bại');
  }
};

// ─── CHANGE PASSWORD ──────────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const pool = getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, req.user.UserID)
      .query('SELECT PasswordHash FROM Users WHERE UserID = @UserID');

    const isValid = await bcrypt.compare(currentPassword, result.recordset[0].PasswordHash);
    if (!isValid) return errorResponse(res, 'Mật khẩu hiện tại không đúng', 400);

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.request()
      .input('UserID', sql.Int, req.user.UserID)
      .input('PasswordHash', sql.VarChar(255), newHash)
      .query(`UPDATE Users SET PasswordHash=@PasswordHash, UpdatedAt=GETDATE() WHERE UserID=@UserID`);

    return successResponse(res, null, 'Đổi mật khẩu thành công');
  } catch (error) {
    return errorResponse(res, 'Đổi mật khẩu thất bại');
  }
};

// ─── CREATE SPEAKER (Organizer tạo trong event) ───────────────
const createSpeaker = async (req, res) => {
  try {
    const { fullName, email, phone, bio, expertise, linkedInURL, password } = req.body;

    const pool = getPool();
    
    const existing = await pool.request()
      .input('Email', sql.VarChar(255), email)
      .query(`SELECT UserID, Role FROM Users WHERE Email = @Email`);

    let speakerId;

    if (existing.recordset.length > 0) {
      const existingUser = existing.recordset[0];
      if (existingUser.Role === 'Speaker') {
        speakerId = existingUser.UserID;
      } else {
        return conflictResponse(res, 'Email này đã được dùng cho tài khoản khác (không phải Diễn giả)');
      }
    } else {
      const tempToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const insertResult = await pool.request()
        .input('FullName', sql.NVarChar(150), fullName)
        .input('Email', sql.VarChar(255), email)
        .input('PasswordHash', sql.VarChar(255), await bcrypt.hash(password, 10))
        .input('Role', sql.VarChar(20), 'Speaker')
        .input('Phone', sql.VarChar(20), phone || null)
        .input('VerifyToken', sql.VarChar(255), tempToken)
        .input('VerifyTokenExpiry', sql.DateTime, tokenExpiry)
        .query(`
          INSERT INTO Users (FullName, Email, PasswordHash, Role, Phone, IsVerified, VerifyToken, VerifyTokenExpiry, MustChangePassword, IsActive)
          OUTPUT INSERTED.UserID
          VALUES (@FullName, @Email, @PasswordHash, 'Speaker', @Phone, 0, @VerifyToken, @VerifyTokenExpiry, 1, 0)
        `);

      speakerId = insertResult.recordset[0].UserID;

      await pool.request()
        .input('UserID', sql.Int, speakerId)
        .input('Bio', sql.NVarChar(sql.MAX), bio || null)
        .input('Expertise', sql.NVarChar(500), expertise || null)
        .input('LinkedInURL', sql.VarChar(500), linkedInURL || null)
        .query(`INSERT INTO SpeakerProfiles (UserID, Bio, Expertise, LinkedInURL) VALUES (@UserID, @Bio, @Expertise, @LinkedInURL)`);
    }

    return createdResponse(res, { speakerId, status: 'PendingAdminApproval' },
      'Đã tạo tài khoản diễn giả. Tài khoản cần được Admin phê duyệt trước khi kích hoạt.');
  } catch (error) {
    console.error('createSpeaker error:', error);
    return errorResponse(res, 'Tạo tài khoản diễn giả thất bại');
  }
};

// ─── ADMIN: duyệt / từ chối Speaker ─────────────────────────
const approveSpeaker = async (req, res) => {
  try {
    const { speakerId } = req.params;
    const { action, rejectionReason } = req.body; 
    const pool = getPool();

    const result = await pool.request()
      .input('UserID', sql.Int, parseInt(speakerId))
      .query(`SELECT UserID, FullName, Email, Role, IsActive FROM Users WHERE UserID = @UserID AND Role = 'Speaker'`);

    const speaker = result.recordset[0];
    if (!speaker) return notFoundResponse(res, 'Không tìm thấy tài khoản diễn giả');

    if (action === 'approve') {
      await pool.request()
        .input('UserID', sql.Int, parseInt(speakerId))
        .query(`UPDATE Users SET IsActive = 1, UpdatedAt = GETDATE() WHERE UserID = @UserID`);

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await pool.request()
        .input('UserID', sql.Int, parseInt(speakerId))
        .input('ResetToken', sql.VarChar(255), resetToken)
        .input('ResetTokenExpiry', sql.DateTime, resetExpiry)
        .query(`UPDATE Users SET ResetToken=@ResetToken, ResetTokenExpiry=@ResetTokenExpiry, IsVerified=1 WHERE UserID=@UserID`);

      return successResponse(res, { resetToken }, 'Tài khoản diễn giả đã được phê duyệt');

    } else if (action === 'reject') {
      if (!rejectionReason) return errorResponse(res, 'Vui lòng nhập lý do từ chối', 400);

      await pool.request()
        .input('UserID', sql.Int, parseInt(speakerId))
        .query(`UPDATE Users SET IsActive = 0, UpdatedAt = GETDATE() WHERE UserID = @UserID`);

      return successResponse(res, null, 'Đã từ chối tài khoản diễn giả');
    }

    return errorResponse(res, 'action phải là approve hoặc reject', 400);
  } catch (error) {
    return errorResponse(res, 'Xử lý phê duyệt diễn giả thất bại');
  }
};

// ─── ADMIN: duyệt Organizer profile ──────────────────────────
const approveOrganizer = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { action, rejectionReason } = req.body;
    const pool = getPool();

    const result = await pool.request()
      .input('ID', sql.Int, parseInt(profileId))
      .query(`SELECT op.*, u.FullName, u.Email FROM OrganizerProfiles op JOIN Users u ON op.UserID = u.UserID WHERE op.OrganizerProfileID = @ID`);

    const org = result.recordset[0];
    if (!org) return notFoundResponse(res, 'Không tìm thấy hồ sơ ban tổ chức');

    if (action === 'approve') {
      await pool.request()
        .input('ID', sql.Int, parseInt(profileId))
        .input('AdminID', sql.Int, req.user.UserID)
        .query(`UPDATE OrganizerProfiles SET ApprovalStatus='Approved', ApprovedBy=@AdminID, ApprovedAt=GETDATE(), UpdatedAt=GETDATE() WHERE OrganizerProfileID=@ID`);

      await pool.request()
        .input('UserID', sql.Int, org.UserID)
        .input('Title', sql.NVarChar(300), '✅ Tài khoản Ban tổ chức đã được duyệt!')
        .input('Message', sql.NVarChar(sql.MAX), `Tài khoản Ban tổ chức "${org.OrganizationName}" đã được Admin phê duyệt. Bạn có thể tạo sự kiện ngay bây giờ.`)
        .input('Type', sql.VarChar(30), 'General')
        .query(`INSERT INTO Notifications (UserID, Title, Message, Type) VALUES (@UserID, @Title, @Message, @Type)`);

      return successResponse(res, null, 'Đã phê duyệt tài khoản Ban tổ chức');

    } else if (action === 'reject') {
      if (!rejectionReason) return errorResponse(res, 'Vui lòng nhập lý do từ chối', 400);

      await pool.request()
        .input('ID', sql.Int, parseInt(profileId))
        .input('AdminID', sql.Int, req.user.UserID)
        .input('Reason', sql.NVarChar(500), rejectionReason)
        .query(`UPDATE OrganizerProfiles SET ApprovalStatus='Rejected', ApprovedBy=@AdminID, ApprovedAt=GETDATE(), RejectionReason=@Reason, UpdatedAt=GETDATE() WHERE OrganizerProfileID=@ID`);

      await pool.request()
        .input('UserID', sql.Int, org.UserID)
        .input('Title', sql.NVarChar(300), '❌ Hồ sơ Ban tổ chức bị từ chối')
        .input('Message', sql.NVarChar(sql.MAX), `Hồ sơ "${org.OrganizationName}" bị từ chối. Lý do: ${rejectionReason}`)
        .input('Type', sql.VarChar(30), 'General')
        .query(`INSERT INTO Notifications (UserID, Title, Message, Type) VALUES (@UserID, @Title, @Message, @Type)`);

      return successResponse(res, null, 'Đã từ chối hồ sơ Ban tổ chức');
    }

    return errorResponse(res, 'action phải là approve hoặc reject', 400);
  } catch (error) {
    return errorResponse(res, 'Xử lý phê duyệt thất bại');
  }
};

// ─── ADMIN: danh sách Organizer chờ duyệt ────────────────────
const getPendingOrganizers = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT op.OrganizerProfileID, op.OrganizationName, op.DocumentURL,
             op.ApprovalStatus, op.CreatedAt, op.RejectionReason,
             u.UserID, u.FullName, u.Email, u.Phone, u.IsVerified
      FROM OrganizerProfiles op
      JOIN Users u ON op.UserID = u.UserID
      WHERE op.ApprovalStatus = 'Pending'
      ORDER BY op.CreatedAt ASC
    `);

    const organizers = result.recordset.map(row => ({
      ...row,
      documents: (() => { try { return JSON.parse(row.DocumentURL || '[]'); } catch { return []; } })(),
    }));

    return successResponse(res, organizers);
  } catch (error) {
    return errorResponse(res, 'Lấy danh sách thất bại');
  }
};

// ─── ADMIN: danh sách Speaker chờ duyệt ──────────────────────
const getPendingSpeakers = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT u.UserID, u.FullName, u.Email, u.Phone, u.IsActive, u.CreatedAt,
             sp.Bio, sp.Expertise, sp.LinkedInURL
      FROM Users u
      LEFT JOIN SpeakerProfiles sp ON u.UserID = sp.UserID
      WHERE u.Role = 'Speaker' AND u.IsActive = 0
      ORDER BY u.CreatedAt ASC
    `);
    return successResponse(res, result.recordset);
  } catch (error) {
    return errorResponse(res, 'Lỗi lấy danh sách diễn giả');
  }
};

const getAllSpeakers = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT u.UserID, u.FullName, u.Email, u.Phone, u.IsActive, u.CreatedAt,
             sp.Bio, sp.Expertise, sp.LinkedInURL
      FROM Users u
      LEFT JOIN SpeakerProfiles sp ON u.UserID = sp.UserID
      WHERE u.Role = 'Speaker'
      ORDER BY u.CreatedAt DESC
    `);
    return successResponse(res, result.recordset);
  } catch (error) {
    return errorResponse(res, 'Lỗi lấy danh sách diễn giả');
  }
};


// ─── ADMIN: tất cả Organizer (pending + approved + rejected) ──
const getAllOrganizers = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT op.OrganizerProfileID, op.OrganizationName, op.DocumentURL,
             op.ApprovalStatus, op.CreatedAt, op.RejectionReason, op.ApprovedAt,
             u.UserID, u.FullName, u.Email, u.Phone, u.IsActive
      FROM OrganizerProfiles op
      JOIN Users u ON op.UserID = u.UserID
      ORDER BY
        CASE op.ApprovalStatus WHEN 'Pending' THEN 0 WHEN 'Approved' THEN 1 ELSE 2 END,
        op.CreatedAt DESC
    `);
    const organizers = result.recordset.map(row => ({
      ...row,
      documents: (() => { try { return JSON.parse(row.DocumentURL || '[]'); } catch { return []; } })(),
    }));
    return successResponse(res, organizers);
  } catch (error) {
    return errorResponse(res, 'Lấy danh sách ban tổ chức thất bại');
  }
};

// ─── SETTINGS (Update Email Notifications) ──────────────────
const updateSettings = async (req, res) => {
  try {
    const userId = req.user.UserID;
    const { emailNotifs } = req.body;

    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('EmailNotifs', sql.Bit, emailNotifs === true ? 1 : 0)
      .query(`
        UPDATE Users 
        SET EmailNotifs = @EmailNotifs
        WHERE UserID = @UserID
      `);

    return successResponse(res, null, 'Cập nhật cài đặt thành công');
  } catch (error) {
    console.error('Update settings error:', error);
    return errorResponse(res, 'Lỗi máy chủ');
  }
};

// ─── DELETE ACCOUNT (Soft Delete) ───────────────────────────
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.UserID;
    const pool = getPool();

    const deletedEmail = `deleted_${userId}_${Date.now()}@ems.edu.vn`;
    const deletedName = `Người dùng đã xóa`;

    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('Email', sql.VarChar(255), deletedEmail)
      .input('FullName', sql.NVarChar(150), deletedName)
      .query(`
        UPDATE Users 
        SET IsActive = 0, 
            Email = @Email, 
            FullName = @FullName
        WHERE UserID = @UserID
      `);

    return successResponse(res, null, 'Tài khoản đã được xóa thành công');
  } catch (error) {
    console.error('Delete account error:', error);
    return errorResponse(res, 'Lỗi máy chủ');
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  login,
  refreshToken,
  logout,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
  changePassword,
  createSpeaker,
  approveSpeaker,
  approveOrganizer,
  getPendingOrganizers,
  getAllOrganizers,
  getPendingSpeakers,
  getAllSpeakers,
  updateSettings,
  deleteAccount,
};