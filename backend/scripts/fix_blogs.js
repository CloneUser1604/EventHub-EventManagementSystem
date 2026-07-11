require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { connectDB, getPool } = require('../config/db');

async function fixDb() {
  try {
    await connectDB();
    const pool = getPool();
    
    console.log('Checking Blogs table...');
    try {
      await pool.request().query('SELECT IsReported FROM Blogs WHERE 1=0');
      console.log('IsReported already exists.');
    } catch (err) {
      console.log('IsReported is missing. Adding missing columns to Blogs...');
      await pool.request().query(`
        ALTER TABLE Blogs ADD 
          IsReported BIT NOT NULL DEFAULT 0,
          ReportReason NVARCHAR(500) NULL,
          ReportedAt DATETIME NULL,
          ReportedBy INT NULL
      `);
      console.log('✅ Added IsReported to Blogs.');
    }

    console.log('Database schema fixed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixDb();
