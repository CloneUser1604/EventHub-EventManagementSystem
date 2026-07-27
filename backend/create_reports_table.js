const { connectDB, getPool } = require('./config/db');
require('dotenv').config(); // Load env if necessary

async function createReportsTable() {
  try {
    await connectDB();
    const pool = getPool();
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Reports' and xtype='U')
      BEGIN
        CREATE TABLE Reports (
            ReportID INT PRIMARY KEY IDENTITY(1,1),
            TargetType VARCHAR(50) NOT NULL,
            TargetID INT NOT NULL,           
            ReporterID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
            Reason NVARCHAR(MAX) NOT NULL,   
            Status VARCHAR(50) DEFAULT 'Pending',
            CreatedAt DATETIME DEFAULT GETDATE(),
            UNIQUE(TargetType, TargetID, ReporterID)
        );
        console.log('Reports table created successfully.');
      END
      ELSE
      BEGIN
        console.log('Reports table already exists.');
      END
    `);
    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createReportsTable();
