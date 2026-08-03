const { connectDB } = require('../config/db');
const sql = require('mssql');
const bcrypt = require('bcryptjs');

async function test() {
  const pool = await connectDB();
  try {
    const r = await pool.request()
      .input('Email', sql.VarChar(255), 'user1@gmail.com')
      .query(`
        SELECT u.UserID, u.FullName, u.Email, u.PasswordHash, u.Role, u.Phone, u.IsActive, u.IsVerified, u.AvatarURL, u.MustChangePassword,
               op.ApprovalStatus as OrgApprovalStatus, op.RejectionReason, op.OrganizationName
        FROM Users u
        LEFT JOIN OrganizerProfiles op ON u.UserID = op.UserID
        WHERE u.Email = @Email
      `);
    const user = r.recordset[0];
    console.log('Query OK. User:', user.Email, '| Role:', user.Role);
    const match = await bcrypt.compare('Abc@1234', user.PasswordHash);
    console.log('Password "Abc@1234" matches:', match);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
  process.exit(0);
}
test();
