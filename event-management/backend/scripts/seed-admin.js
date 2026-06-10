/**
 * Run once after DB setup:  node scripts/seed-admin.js
 * Creates/resets admin account with correct bcrypt hash.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { connectDB, getPool, sql, closeDB } = require('../config/db');

async function seed() {
  console.log('Connecting to DB...');
  await connectDB();
  const pool = getPool();

  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const email    = process.env.ADMIN_EMAIL    || 'admin@ems.edu.vn';
  const hash     = await bcrypt.hash(password, 12);

  console.log(`\nSeeding admin: ${email}`);

  const existing = await pool.request()
    .input('Email', sql.VarChar(255), email)
    .query('SELECT UserID FROM Users WHERE Email = @Email');

  if (existing.recordset.length > 0) {
    await pool.request()
      .input('Email', sql.VarChar(255), email)
      .input('Hash',  sql.VarChar(255), hash)
      .query('UPDATE Users SET PasswordHash=@Hash, IsActive=1, IsVerified=1, Role=\'Admin\', UpdatedAt=GETDATE() WHERE Email=@Email');
    console.log('✅ Admin password UPDATED');
  } else {
    await pool.request()
      .input('FullName', sql.NVarChar(150), 'System Administrator')
      .input('Email',    sql.VarChar(255), email)
      .input('Hash',     sql.VarChar(255), hash)
      .query('INSERT INTO Users (FullName,Email,PasswordHash,Role,IsActive,IsVerified) VALUES (@FullName,@Email,@Hash,\'Admin\',1,1)');
    console.log('✅ Admin account CREATED');
  }

  console.log(`\n📋 Credentials:`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  await closeDB();
  process.exit(0);
}

seed().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
