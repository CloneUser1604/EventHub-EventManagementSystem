const { getPool, sql } = require('../config/db');

class AuthRepository {
  async findUserByEmail(email) {
    const pool = getPool();
    const result = await pool.request()
      .input('Email', sql.VarChar(255), email)
      .query('SELECT * FROM Users WHERE Email = @Email');
    return result.recordset[0];
  }

  // [Tìm User theo email] Thực thi SELECT lấy thông tin User kèm trạng thái OrganizerProfile
  async findUserWithOrgStatus(email) {
    const pool = getPool();
    const result = await pool.request()
      .input('Email', sql.VarChar(255), email)
      .query(`
        SELECT u.UserID, u.FullName, u.Email, u.PasswordHash, u.Role, u.Phone, u.IsFPTStudent, u.IsActive, u.IsVerified, u.AvatarURL, u.MustChangePassword,
               op.ApprovalStatus as OrgApprovalStatus, op.RejectionReason, op.OrganizationName
        FROM Users u
        LEFT JOIN OrganizerProfiles op ON u.UserID = op.UserID
        WHERE u.Email = @Email
      `);
    return result.recordset[0];
  }

  // [Tạo User mới] Thực thi INSERT INTO Users
  async createUser(userData) {
    const pool = getPool();
    const result = await pool.request()
      .input('FullName', sql.NVarChar(150), userData.fullName)
      .input('Email', sql.VarChar(255), userData.email)
      .input('PasswordHash', sql.VarChar(255), userData.passwordHash)
      .input('Role', sql.VarChar(20), userData.role)
      .input('Phone', sql.VarChar(20), userData.phone || null)
      .input('IsFPTStudent', sql.Bit, userData.isFPTStudent ? 1 : 0)
      .query(`
        INSERT INTO Users (FullName, Email, PasswordHash, Role, Phone, IsFPTStudent, IsVerified, IsActive)
        OUTPUT INSERTED.UserID, INSERTED.FullName, INSERTED.Email, INSERTED.Role, INSERTED.CreatedAt
        VALUES (@FullName, @Email, @PasswordHash, @Role, @Phone, @IsFPTStudent, 1, 1)
      `);
    return result.recordset[0];
  }

  async createOrganizerProfile(userId, organizationName, documentJSON) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('OrganizationName', sql.NVarChar(200), organizationName)
      .input('DocumentURL', sql.VarChar(500), documentJSON)
      .query(`
        INSERT INTO OrganizerProfiles (UserID, OrganizationName, DocumentURL, ApprovalStatus)
        VALUES (@UserID, @OrganizationName, @DocumentURL, 'Pending')
      `);
  }

  async updateOrganizerProfileForResubmit(userId, documentJSON) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('DocumentURL', sql.VarChar(500), documentJSON)
      .query(`
        UPDATE OrganizerProfiles 
        SET DocumentURL = @DocumentURL, ApprovalStatus = 'Pending', RejectionReason = NULL, UpdatedAt = GETDATE()
        WHERE UserID = @UserID
      `);
  }

  async getAdminIds() {
    const pool = getPool();
    const result = await pool.request().query(`SELECT UserID FROM Users WHERE Role = 'Admin' AND IsActive = 1`);
    return result.recordset;
  }

  async createNotification(data) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, data.userId)
      .input('Title', sql.NVarChar(300), data.title)
      .input('Message', sql.NVarChar(sql.MAX), data.message)
      .input('Type', sql.VarChar(30), data.type)
      .query(`INSERT INTO Notifications (UserID,Title,Message,Type) VALUES (@UserID,@Title,@Message,@Type)`);
  }

  async updateUserVerifyToken(userId, verifyToken, verifyTokenExpiry) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('VerifyToken', sql.VarChar(255), verifyToken)
      .input('VerifyTokenExpiry', sql.DateTime, verifyTokenExpiry)
      .query(`UPDATE Users SET VerifyToken = @VerifyToken, VerifyTokenExpiry = @VerifyTokenExpiry WHERE UserID = @UserID`);
  }

  async updateRefreshToken(userId, refreshToken, refreshTokenExpiry) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('RefreshToken', sql.VarChar(500), refreshToken)
      .input('RefreshTokenExpiry', sql.DateTime, refreshTokenExpiry)
      .query(`UPDATE Users SET RefreshToken = @RefreshToken, RefreshTokenExpiry = @RefreshTokenExpiry, UpdatedAt = GETDATE() WHERE UserID = @UserID`);
  }

  async findUserByRefreshToken(userId, refreshToken) {
    const pool = getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .input('RefreshToken', sql.VarChar(500), refreshToken)
      .query(`SELECT UserID, FullName, Email, Role, IsActive, RefreshTokenExpiry FROM Users WHERE UserID = @UserID AND RefreshToken = @RefreshToken`);
    return result.recordset[0];
  }

  async clearRefreshToken(userId) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`UPDATE Users SET RefreshToken = NULL, RefreshTokenExpiry = NULL WHERE UserID = @UserID`);
  }

  async getUserProfile(userId) {
    const pool = getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT u.UserID, u.FullName, u.Email, u.Role, u.AvatarURL, u.Phone, u.IsFPTStudent, u.IsVerified, u.CreatedAt,
               op.OrganizerProfileID, op.OrganizationName, op.ApprovalStatus AS OrgApprovalStatus,
               op.DocumentURL, op.RejectionReason AS OrgRejectionReason
        FROM Users u
        LEFT JOIN OrganizerProfiles op ON u.UserID = op.UserID
        WHERE u.UserID = @UserID
      `);
    return result.recordset[0];
  }

  async checkIsCurrentStaff(userId) {
    const pool = getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT TOP 1 1 FROM EventStaffs es
        JOIN Events e ON es.EventID = e.EventID
        WHERE es.StaffID = @UserID AND e.EndDate > GETDATE()
      `);
    return result.recordset.length > 0;
  }

  async getOrganizerEvents(userId) {
    const pool = getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`SELECT e.EventID AS id, e.Title AS title, e.StartDate AS startDate, e.Status AS status, v.Name AS VenueName
              FROM Events e 
              LEFT JOIN Venues v ON e.VenueID = v.VenueID 
              WHERE e.OrganizerID = @UserID ORDER BY e.StartDate DESC`);
    return result.recordset;
  }

  async getParticipantEvents(userId) {
    const pool = getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query(`
        SELECT e.EventID AS id, e.Title AS title, e.StartDate AS startDate, r.Status AS status, v.Name AS VenueName
        FROM Events e
        JOIN Registrations r ON e.EventID = r.EventID
        LEFT JOIN Venues v ON e.VenueID = v.VenueID
        WHERE r.ParticipantID = @UserID
        ORDER BY e.StartDate DESC
      `);
    return result.recordset;
  }

  async updateProfile(userId, fullName, phone, isFPTStudent, avatarURL) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('FullName', sql.NVarChar(150), fullName)
      .input('Phone', sql.VarChar(20), phone)
      .input('IsFPTStudent', sql.Bit, isFPTStudent ? 1 : 0)
      .input('AvatarURL', sql.NVarChar(500), avatarURL)
      .query(`
        UPDATE Users 
        SET FullName = @FullName, Phone = @Phone, IsFPTStudent = @IsFPTStudent, AvatarURL = @AvatarURL, UpdatedAt = GETDATE()
        WHERE UserID = @UserID
      `);
  }

  async updateOrganizerDocuments(userId, documentJSON) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('DocumentURL', sql.VarChar(500), documentJSON)
      .query(`
        UPDATE OrganizerProfiles 
        SET DocumentURL = @DocumentURL, ApprovalStatus = 'Pending', UpdatedAt = GETDATE()
        WHERE UserID = @UserID
      `);
  }

  async setResetToken(userId, resetToken, resetTokenExpiry) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('ResetToken', sql.VarChar(255), resetToken)
      .input('ResetTokenExpiry', sql.DateTime, resetTokenExpiry)
      .query(`UPDATE Users SET ResetToken = @ResetToken, ResetTokenExpiry = @ResetTokenExpiry WHERE UserID = @UserID`);
  }

  async findUserByResetToken(token) {
    const pool = getPool();
    const result = await pool.request()
      .input('Token', sql.VarChar(255), token)
      .query(`SELECT UserID, ResetTokenExpiry FROM Users WHERE ResetToken = @Token`);
    return result.recordset[0];
  }

  async updatePasswordAndClearTokens(userId, passwordHash) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('PasswordHash', sql.VarChar(255), passwordHash)
      .query(`UPDATE Users SET PasswordHash=@PasswordHash, ResetToken=NULL, ResetTokenExpiry=NULL, RefreshToken=NULL, RefreshTokenExpiry=NULL, UpdatedAt=GETDATE() WHERE UserID=@UserID`);
  }

  async getPasswordHash(userId) {
    const pool = getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, userId)
      .query('SELECT PasswordHash FROM Users WHERE UserID = @UserID');
    return result.recordset[0]?.PasswordHash;
  }

  async updatePassword(userId, passwordHash) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('PasswordHash', sql.VarChar(255), passwordHash)
      .query(`UPDATE Users SET PasswordHash=@PasswordHash, UpdatedAt=GETDATE() WHERE UserID=@UserID`);
  }

  async createGoogleUser(fullName, email, avatarUrl, passwordHash) {
    const pool = getPool();
    const result = await pool.request()
      .input('FullName', sql.NVarChar(150), fullName)
      .input('Email', sql.VarChar(255), email)
      .input('PasswordHash', sql.VarChar(255), passwordHash)
      .input('AvatarURL', sql.VarChar(500), avatarUrl || null)
      .input('Role', sql.VarChar(20), 'Participant')
      .query(`
        INSERT INTO Users (FullName, Email, PasswordHash, Role, AvatarURL, IsVerified, IsActive)
        OUTPUT INSERTED.UserID, INSERTED.Role, INSERTED.FullName, INSERTED.Email, INSERTED.AvatarURL
        VALUES (@FullName, @Email, @PasswordHash, @Role, @AvatarURL, 1, 1)
      `);
    return result.recordset[0];
  }

  async createSpeakerUser(data, tempToken, tokenExpiry) {
    const pool = getPool();
    const result = await pool.request()
      .input('FullName', sql.NVarChar(150), data.fullName)
      .input('Email', sql.VarChar(255), data.email)
      .input('PasswordHash', sql.VarChar(255), data.passwordHash)
      .input('Role', sql.VarChar(20), 'Speaker')
      .input('Phone', sql.VarChar(20), data.phone || null)
      .input('VerifyToken', sql.VarChar(255), tempToken)
      .input('VerifyTokenExpiry', sql.DateTime, tokenExpiry)
      .query(`
        INSERT INTO Users (FullName, Email, PasswordHash, Role, Phone, IsVerified, VerifyToken, VerifyTokenExpiry, MustChangePassword, IsActive)
        OUTPUT INSERTED.UserID
        VALUES (@FullName, @Email, @PasswordHash, 'Speaker', @Phone, 0, @VerifyToken, @VerifyTokenExpiry, 1, 0)
      `);
    return result.recordset[0].UserID;
  }

  async createSpeakerProfile(speakerId, data) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, speakerId)
      .input('Bio', sql.NVarChar(sql.MAX), data.bio || null)
      .input('Expertise', sql.NVarChar(500), data.expertise || null)
      .input('LinkedInURL', sql.VarChar(500), data.linkedInURL || null)
      .query(`INSERT INTO SpeakerProfiles (UserID, Bio, Expertise, LinkedInURL) VALUES (@UserID, @Bio, @Expertise, @LinkedInURL)`);
  }

  async getSpeakerById(speakerId) {
    const pool = getPool();
    const result = await pool.request()
      .input('UserID', sql.Int, speakerId)
      .query(`SELECT UserID, FullName, Email, Role, IsActive FROM Users WHERE UserID = @UserID AND Role = 'Speaker'`);
    return result.recordset[0];
  }

  async approveSpeaker(speakerId, resetToken, resetExpiry) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, speakerId)
      .input('ResetToken', sql.VarChar(255), resetToken)
      .input('ResetTokenExpiry', sql.DateTime, resetExpiry)
      .query(`UPDATE Users SET IsActive=1, ResetToken=@ResetToken, ResetTokenExpiry=@ResetTokenExpiry, IsVerified=1, UpdatedAt=GETDATE() WHERE UserID=@UserID`);
  }

  async rejectSpeaker(speakerId) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, speakerId)
      .query(`UPDATE Users SET IsActive = 0, UpdatedAt = GETDATE() WHERE UserID = @UserID`);
  }

  async getOrganizerProfileById(profileId) {
    const pool = getPool();
    const result = await pool.request()
      .input('ID', sql.Int, profileId)
      .query(`SELECT op.*, u.FullName, u.Email FROM OrganizerProfiles op JOIN Users u ON op.UserID = u.UserID WHERE op.OrganizerProfileID = @ID`);
    return result.recordset[0];
  }

  async approveOrganizer(profileId, adminId) {
    const pool = getPool();
    await pool.request()
      .input('ID', sql.Int, profileId)
      .input('AdminID', sql.Int, adminId)
      .query(`UPDATE OrganizerProfiles SET ApprovalStatus='Approved', ApprovedBy=@AdminID, ApprovedAt=GETDATE(), UpdatedAt=GETDATE() WHERE OrganizerProfileID=@ID`);
  }

  async rejectOrganizer(profileId, adminId, reason) {
    const pool = getPool();
    await pool.request()
      .input('ID', sql.Int, profileId)
      .input('AdminID', sql.Int, adminId)
      .input('Reason', sql.NVarChar(500), reason)
      .query(`UPDATE OrganizerProfiles SET ApprovalStatus='Rejected', ApprovedBy=@AdminID, ApprovedAt=GETDATE(), RejectionReason=@Reason, UpdatedAt=GETDATE() WHERE OrganizerProfileID=@ID`);
  }

  async getPendingOrganizers() {
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
    return result.recordset;
  }

  async getAllOrganizers() {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT op.OrganizerProfileID, op.OrganizationName, op.DocumentURL,
             op.ApprovalStatus, op.CreatedAt, op.RejectionReason, op.ApprovedAt,
             u.UserID, u.FullName, u.Email, u.Phone, u.IsActive
      FROM OrganizerProfiles op
      JOIN Users u ON op.UserID = u.UserID
      ORDER BY CASE op.ApprovalStatus WHEN 'Pending' THEN 0 WHEN 'Approved' THEN 1 ELSE 2 END, op.CreatedAt DESC
    `);
    return result.recordset;
  }

  async getPendingSpeakers() {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT u.UserID, u.FullName, u.Email, u.Phone, u.IsActive, u.CreatedAt,
             sp.Bio, sp.Expertise, sp.LinkedInURL
      FROM Users u
      LEFT JOIN SpeakerProfiles sp ON u.UserID = sp.UserID
      WHERE u.Role = 'Speaker' AND u.IsActive = 0
      ORDER BY u.CreatedAt ASC
    `);
    return result.recordset;
  }

  async getAllSpeakers() {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT u.UserID, u.FullName, u.Email, u.Phone, u.IsActive, u.CreatedAt,
             sp.Bio, sp.Expertise, sp.LinkedInURL
      FROM Users u
      LEFT JOIN SpeakerProfiles sp ON u.UserID = sp.UserID
      WHERE u.Role = 'Speaker'
      ORDER BY u.CreatedAt DESC
    `);
    return result.recordset;
  }

  async updateSettings(userId, emailNotifs) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('EmailNotifs', sql.Bit, emailNotifs ? 1 : 0)
      .query(`UPDATE Users SET EmailNotifs = @EmailNotifs WHERE UserID = @UserID`);
  }

  async deleteAccount(userId, deletedEmail, deletedName) {
    const pool = getPool();
    await pool.request()
      .input('UserID', sql.Int, userId)
      .input('Email', sql.VarChar(255), deletedEmail)
      .input('FullName', sql.NVarChar(150), deletedName)
      .query(`UPDATE Users SET IsActive = 0, Email = @Email, FullName = @FullName WHERE UserID = @UserID`);
  }
  async createGoogleUser(name, email, picture, passwordHash) {
    const pool = getPool();
    const result = await pool.request()
      .input('FullName', sql.NVarChar(150), name)
      .input('Email', sql.VarChar(255), email)
      .input('PasswordHash', sql.VarChar(255), passwordHash)
      .input('Role', sql.VarChar(50), 'Participant')
      .input('AvatarURL', sql.NVarChar(sql.MAX), picture)
      .input('IsActive', sql.Bit, 1)
      .input('IsVerified', sql.Bit, 1)
      .query(`
        INSERT INTO Users (FullName, Email, PasswordHash, Role, AvatarURL, IsActive, IsVerified)
        OUTPUT INSERTED.*
        VALUES (@FullName, @Email, @PasswordHash, @Role, @AvatarURL, @IsActive, @IsVerified)
      `);
    return result.recordset[0];
  }
}
module.exports = new AuthRepository();
