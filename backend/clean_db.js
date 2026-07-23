require('dotenv').config();
const { connectDB, getPool, closeDB } = require('./config/db');

async function cleanDB() {
  try {
    await connectDB();
    const pool = getPool();
    
    const tablesToDrop = [
      'SurveyResponses',
      'SurveyQuestions',
      'Surveys',
      'EventSponsors',
      'Sponsors'
    ];

    for (const table of tablesToDrop) {
      console.log(`Đang xóa bảng ${table}...`);
      try {
        await pool.request().query(`DROP TABLE IF EXISTS ${table};`);
        console.log(`Xóa thành công ${table}.`);
      } catch (e) {
        console.log(`Lỗi xóa ${table}:`, e.message);
      }
    }

    await closeDB();
    console.log("Hoàn tất dọn dẹp Database!");
  } catch (err) {
    console.error("Lỗi kết nối:", err);
  }
}

cleanDB();
