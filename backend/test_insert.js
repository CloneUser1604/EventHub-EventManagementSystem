require('dotenv').config();
const { connectDB, getPool } = require('./config/db');

async function run() {
  await connectDB();
  const pool = getPool();
  try {
    const r = await pool.request().query("INSERT INTO Users (FullName, Email, PasswordHash, Role, IsActive, IsVerified) OUTPUT INSERTED.* VALUES ('Test', 'test2@ems.edu.vn', 'hash', 'Participant', 1, 1)");
    console.log(r.recordset[0]);
    console.log('IsActive:', r.recordset[0].IsActive);
    console.log('typeof:', typeof r.recordset[0].IsActive);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.request().query("DELETE FROM Users WHERE Email='test2@ems.edu.vn'");
    process.exit(0);
  }
}
run();
