require('dotenv').config();
const { sql, getPool, connectDB } = require('./backend/config/db');

async function check() {
  await connectDB();
  const pool = getPool();
  try {
    console.log("--- Notifications ---");
    const notifs = await pool.request().query(`
      SELECT NotificationID, UserID, Title, Type, RelatedID, IsRead, CreatedAt
      FROM Notifications
      WHERE Type = 'SpeakerInvitation'
    `);
    console.table(notifs.recordset);
    
    console.log("--- SpeakerInvitations ---");
    const inv = await pool.request().query(`
      SELECT * FROM SpeakerInvitations
    `);
    console.table(inv.recordset);
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
check();
