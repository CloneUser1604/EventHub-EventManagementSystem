const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const authRepository = require('../repositories/auth.repository');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthService {
  async register(data, files) {
    const { fullName, email, password, role = 'Participant', phone, organizationName, university } = data;
    
    if (!['Participant', 'Organizer'].includes(role)) {
      throw new Error('BAD_REQUEST: Chỉ được đăng ký với vai trò: Người tham dự hoặc Ban tổ chức');
    }

    const existing = await authRepository.findUserByEmail(email);
    if (existing) throw new Error('CONFLICT: Email đã được sử dụng');

    if (role === 'Organizer') {
      if (!files || !files['documents'] || files['documents'].length === 0) {
        throw new Error('BAD_REQUEST: Ban tổ chức cần upload ít nhất 1 tài liệu xác minh');
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    const newUser = await authRepository.createUser({
      fullName, email, passwordHash, role, phone, university
    });

    if (role === 'Organizer') {
      const filePaths = files['documents'].map(f => f.filename);
      const documentJSON = JSON.stringify(filePaths);

      await authRepository.createOrganizerProfile(newUser.UserID, organizationName, documentJSON);

      const admins = await authRepository.getAdminIds();
      for (const admin of admins) {
        await authRepository.createNotification({
          userId: admin.UserID,
          title: '🏢 Ban tổ chức mới cần phê duyệt',
          message: `${fullName} (${organizationName}) đã đăng ký tài khoản Ban tổ chức. Vui lòng xem xét hồ sơ trong Admin Dashboard.`,
          type: 'General'
        });
      }
    }

    return {
      user: { userId: newUser.UserID, email: newUser.Email, role: newUser.Role },
      message: role === 'Organizer'
        ? 'Đăng ký thành công! Tài khoản ban tổ chức đang chờ Admin phê duyệt.'
        : 'Đăng ký thành công! Bạn có thể đăng nhập ngay.'
    };
  }

  async resubmitOrganizer(data, files) {
    const { email, password } = data;

    const user = await authRepository.findUserWithOrgStatus(email);
    if (!user) throw new Error('UNAUTHORIZED: Email không đúng');

    const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
    if (!isPasswordValid) throw new Error('UNAUTHORIZED: Mật khẩu không đúng');

    if (user.Role !== 'Organizer') throw new Error('BAD_REQUEST: Tài khoản không phải Ban tổ chức');
    if (user.OrgApprovalStatus !== 'Rejected') throw new Error('BAD_REQUEST: Hồ sơ hiện tại không ở trạng thái bị từ chối');

    if (!files || !files['documents'] || files['documents'].length === 0) {
      throw new Error('BAD_REQUEST: Bắt buộc tải lên tài liệu xác minh mới');
    }

    const filePaths = files['documents'].map(f => f.filename);
    const documentJSON = JSON.stringify(filePaths);

    await authRepository.updateOrganizerProfileForResubmit(user.UserID, documentJSON);

    const admins = await authRepository.getAdminIds();
    for (const admin of admins) {
      await authRepository.createNotification({
        userId: admin.UserID,
        title: '🏢 Ban tổ chức cập nhật lại hồ sơ',
        message: `${user.FullName} (${user.OrganizationName}) đã cập nhật và nộp lại hồ sơ. Vui lòng xem xét trong Admin Dashboard.`,
        type: 'General'
      });
    }

    return { message: 'Đã gửi lại hồ sơ thành công! Vui lòng chờ Admin phê duyệt.' };
  }

  async resendVerification(email) {
    const user = await authRepository.findUserByEmail(email);
    const msg = 'Nếu email tồn tại và chưa xác thực, chúng tôi sẽ gửi lại email.';
    if (!user || user.IsVerified) return { message: msg };

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await authRepository.updateUserVerifyToken(user.UserID, verifyToken, verifyTokenExpiry);
    sendVerificationEmail(email, user.FullName, verifyToken).catch(console.error);
    return { message: msg };
  }

  async login(email, password) {
    const user = await authRepository.findUserWithOrgStatus(email);
    if (!user) throw new Error('UNAUTHORIZED: Email hoặc mật khẩu không đúng');

    const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
    if (!isPasswordValid) throw new Error('UNAUTHORIZED: Email hoặc mật khẩu không đúng');

    if (!user.IsActive) {
      if (user.Role === 'Speaker') throw new Error('UNAUTHORIZED: Tài khoản diễn giả chưa được Admin phê duyệt.');
      if (user.Role !== 'Organizer') throw new Error('UNAUTHORIZED: Tài khoản đã bị vô hiệu hóa');
    }

    if (user.Role === 'Organizer') {
      if (user.OrgApprovalStatus === 'Pending') throw new Error('UNAUTHORIZED: Tài khoản ban tổ chức của bạn đang chờ Admin phê duyệt.');
      if (user.OrgApprovalStatus === 'Rejected') {
        const payload = {
          code: 'REJECTED_ORGANIZER',
          message: 'Hồ sơ ban tổ chức của bạn đã bị từ chối.',
          reason: user.RejectionReason,
          user: {
            email: user.Email,
            fullName: user.FullName,
            phone: user.Phone,
            university: user.University,
            organizationName: user.OrganizationName
          }
        };
        throw new Error('REJECTED_ORGANIZER::' + JSON.stringify(payload));
      }
    }

    const tokenPayload = { userId: user.UserID, email: user.Email, role: user.Role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await authRepository.updateRefreshToken(user.UserID, refreshToken, refreshExpiry);

    return {
      accessToken, refreshToken,
      mustChangePassword: user.MustChangePassword,
      user: {
        userId: user.UserID,
        fullName: user.FullName,
        email: user.Email,
        role: user.Role,
        avatarURL: user.AvatarURL,
        phone: user.Phone,
        isVerified: user.IsVerified,
        orgApprovalStatus: user.OrgApprovalStatus || null,
      }
    };
  }

  async refreshToken(token) {
    if (!token) throw new Error('UNAUTHORIZED: Refresh token required');
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch(err) {
      throw new Error('UNAUTHORIZED: Invalid or expired refresh token');
    }

    const user = await authRepository.findUserByRefreshToken(decoded.userId, token);
    if (!user) throw new Error('UNAUTHORIZED: Invalid refresh token');
    if (!user.IsActive) throw new Error('UNAUTHORIZED: Account deactivated');
    if (new Date() > new Date(user.RefreshTokenExpiry)) throw new Error('UNAUTHORIZED: Refresh token expired');

    const tokenPayload = { userId: user.UserID, email: user.Email, role: user.Role };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await authRepository.updateRefreshToken(user.UserID, newRefreshToken, refreshExpiry);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(userId) {
    await authRepository.clearRefreshToken(userId);
  }

  async getMe(userId) {
    if (!userId) throw new Error('UNAUTHORIZED: Lỗi xác thực người dùng');
    
    const row = await authRepository.getUserProfile(userId);
    if (!row) throw new Error('NOT_FOUND: User not found');

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
        documents: (() => { try { return JSON.parse(row.DocumentURL || '[]'); } catch { return []; } })(),
      };
    }

    user.isCurrentStaff = await authRepository.checkIsCurrentStaff(userId);
    user.events = { organized: [], registered: [], attended: [] };
    user.stats = { organized: 0, registered: 0, attended: 0 };

    if (user.role === 'Organizer') {
      const orgEvents = await authRepository.getOrganizerEvents(userId);
      user.events.organized = orgEvents || [];
      user.stats.organized = user.events.organized.length;
    } else {
      const allRegs = await authRepository.getParticipantEvents(userId);
      user.events.registered = allRegs.filter(e => e.status !== 'Cancelled');
      user.events.attended = allRegs.filter(e => e.status === 'Attended' || e.status === 'CheckedIn');
      user.stats.registered = user.events.registered.length;
      user.stats.attended = user.events.attended.length;
    }
    return user;
  }

  async updateMe(userId, role, data, files) {
    let finalAvatarURL = data.avatarURL || null;
    if (files && files['avatar'] && files['avatar'].length > 0) {
      finalAvatarURL = files['avatar'][0].filename;
    }
    await authRepository.updateProfile(userId, data.fullName, data.phone || null, data.university || null, finalAvatarURL);

    if (role === 'Organizer' && files && files['documents'] && files['documents'].length > 0) {
      const filePaths = files['documents'].map(f => f.filename);
      await authRepository.updateOrganizerDocuments(userId, JSON.stringify(filePaths));
    }
  }

  async forgotPassword(email) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw new Error('NOT_FOUND: Tài khoản này không tồn tại.');
    if (!user.IsActive) throw new Error('FORBIDDEN: Tài khoản này đã bị khóa.');

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await authRepository.setResetToken(user.UserID, resetToken, resetTokenExpiry);
    
    // Simulate logging the reset url for local development
    const resetURL = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log(`\n🔑 PASSWORD RESET LINK cho ${email}:\n👉 ${resetURL}\n`);

    sendPasswordResetEmail(email, user.FullName, resetToken).catch(console.error);
  }

  async resetPassword(token, password) {
    const user = await authRepository.findUserByResetToken(token);
    if (!user) throw new Error('BAD_REQUEST: Token không hợp lệ hoặc đã hết hạn');
    if (new Date() > new Date(user.ResetTokenExpiry)) throw new Error('BAD_REQUEST: Token đã hết hạn.');

    const passwordHash = await bcrypt.hash(password, 12);
    await authRepository.updatePasswordAndClearTokens(user.UserID, passwordHash);
  }

  async changePassword(userId, currentPassword, newPassword) {
    const hash = await authRepository.getPasswordHash(userId);
    const isValid = await bcrypt.compare(currentPassword, hash);
    if (!isValid) throw new Error('BAD_REQUEST: Mật khẩu hiện tại không đúng');

    const newHash = await bcrypt.hash(newPassword, 12);
    await authRepository.updatePassword(userId, newHash);
  }

  async createSpeaker(data) {
    const existing = await authRepository.findUserByEmail(data.email);
    let speakerId;

    if (existing) {
      if (existing.Role === 'Speaker') {
        speakerId = existing.UserID;
      } else {
        throw new Error('CONFLICT: Email này đã được dùng cho tài khoản khác');
      }
    } else {
      const tempToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const passwordHash = await bcrypt.hash(data.password, 10);
      
      speakerId = await authRepository.createSpeakerUser({ ...data, passwordHash }, tempToken, tokenExpiry);
      await authRepository.createSpeakerProfile(speakerId, data);
    }

    return { speakerId, status: 'PendingAdminApproval' };
  }

  async approveSpeaker(speakerId, action, rejectionReason) {
    const speaker = await authRepository.getSpeakerById(speakerId);
    if (!speaker) throw new Error('NOT_FOUND: Không tìm thấy tài khoản diễn giả');

    if (action === 'approve') {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await authRepository.approveSpeaker(speakerId, resetToken, resetExpiry);
      return { resetToken, message: 'Tài khoản diễn giả đã được phê duyệt' };
    } else if (action === 'reject') {
      if (!rejectionReason) throw new Error('BAD_REQUEST: Vui lòng nhập lý do từ chối');
      await authRepository.rejectSpeaker(speakerId);
      return { message: 'Đã từ chối tài khoản diễn giả' };
    }
    throw new Error('BAD_REQUEST: action phải là approve hoặc reject');
  }

  async approveOrganizer(profileId, adminId, action, rejectionReason) {
    const org = await authRepository.getOrganizerProfileById(profileId);
    if (!org) throw new Error('NOT_FOUND: Không tìm thấy hồ sơ ban tổ chức');

    if (action === 'approve') {
      await authRepository.approveOrganizer(profileId, adminId);
      await authRepository.createNotification({
        userId: org.UserID,
        title: '✅ Tài khoản Ban tổ chức đã được duyệt!',
        message: `Tài khoản Ban tổ chức "${org.OrganizationName}" đã được Admin phê duyệt. Bạn có thể tạo sự kiện ngay bây giờ.`,
        type: 'General'
      });
      return { message: 'Đã phê duyệt tài khoản Ban tổ chức' };
    } else if (action === 'reject') {
      if (!rejectionReason) throw new Error('BAD_REQUEST: Vui lòng nhập lý do từ chối');
      await authRepository.rejectOrganizer(profileId, adminId, rejectionReason);
      
      const { sendOrganizerRejectionEmail } = require('../utils/email');
      await sendOrganizerRejectionEmail(org.Email, org.FullName, org.OrganizationName, rejectionReason);
      await authRepository.createNotification({
        userId: org.UserID,
        title: '❌ Hồ sơ Ban tổ chức bị từ chối',
        message: `Hồ sơ "${org.OrganizationName}" bị từ chối. Lý do: ${rejectionReason}`,
        type: 'General'
      });
      return { message: 'Đã từ chối hồ sơ Ban tổ chức' };
    }
    throw new Error('BAD_REQUEST: action phải là approve hoặc reject');
  }

  async getPendingOrganizers() {
    const orgs = await authRepository.getPendingOrganizers();
    return orgs.map(org => {
      let documents = [];
      try {
        if (org.DocumentURL) documents = JSON.parse(org.DocumentURL);
      } catch (e) {
        console.error('Failed to parse DocumentURL:', org.DocumentURL);
      }
      return { ...org, documents };
    });
  }

  async getAllOrganizers() {
    const orgs = await authRepository.getAllOrganizers();
    return orgs.map(org => {
      let documents = [];
      try {
        if (org.DocumentURL) documents = JSON.parse(org.DocumentURL);
      } catch (e) {
        console.error('Failed to parse DocumentURL:', org.DocumentURL);
      }
      return { ...org, documents };
    });
  }

  async getPendingSpeakers() {
    return await authRepository.getPendingSpeakers();
  }

  async getAllSpeakers() {
    return await authRepository.getAllSpeakers();
  }

  async updateSettings(userId, emailNotifs) {
    await authRepository.updateSettings(userId, emailNotifs);
  }

  async deleteAccount(userId) {
    const deletedEmail = `deleted_${userId}_${Date.now()}@ems.edu.vn`;
    const deletedName = `Người dùng đã xóa`;
    await authRepository.deleteAccount(userId, deletedEmail, deletedName);
  }

  async googleLogin(idToken) {
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (error) {
      throw new Error('UNAUTHORIZED: Token Google không hợp lệ');
    }

    const { email, name, picture } = payload;
    let user = await authRepository.findUserByEmail(email);

    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      user = await authRepository.createGoogleUser(name, email, picture, passwordHash);
    }

    if (!user.IsActive) {
      throw new Error('FORBIDDEN: Tài khoản của bạn đã bị khóa');
    }

    const tokenPayload = { userId: user.UserID, role: user.Role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);
    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await authRepository.updateRefreshToken(user.UserID, refreshToken, refreshTokenExpiry);

    return {
      accessToken,
      refreshToken,
      user: {
        userId: user.UserID,
        fullName: user.FullName,
        email: user.Email,
        role: user.Role,
        avatarUrl: user.AvatarURL,
        mustChangePassword: user.MustChangePassword
      }
    };
  }
}

module.exports = new AuthService();
