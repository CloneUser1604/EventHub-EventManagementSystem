require('dotenv').config();
const { sql, getPool, connectDB } = require('./backend/config/db');

async function check() {
  await connectDB();
  const pool = getPool();
  try {
    const speakers = await pool.request().query(`SELECT UserID, FullName, Email, Role FROM Users WHERE Role='Speaker'`);
    console.log("SPEAKERS:");
    console.table(speakers.recordset);

    const ev = await pool.request().query(`SELECT EventID, Title, Status, ApprovalStatus FROM Events ORDER BY EventID DESC`);
    console.log("EVENTS:");
    console.table(ev.recordset);

    const inv = await pool.request().query(`SELECT * FROM SpeakerInvitations`);
    console.log("SPEAKER INVITATIONS:");
    console.table(inv.recordset);

    const sess = await pool.request().query(`SELECT * FROM SessionSpeakers`);
    console.log("SESSION SPEAKERS:");
    console.table(sess.recordset);

    const notifs = await pool.request().query(`SELECT NotificationID, UserID, Title, Type, RelatedID FROM Notifications WHERE Type='SpeakerInvitation'`);
    console.log("NOTIFICATIONS:");
    console.table(notifs.recordset);

  } catch (e) {
    console.error(e);
  }
  process.exit();
}
check();
