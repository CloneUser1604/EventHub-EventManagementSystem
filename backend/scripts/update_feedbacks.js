require('dotenv').config();
const { connectDB, getPool } = require('../config/db');

async function updateFeedbacksTable() {
    await connectDB();
    const pool = getPool();
    
    try {
        console.log("Adding MediaURLs column...");
        await pool.request().query(`
            IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'MediaURLs' AND Object_ID = Object_ID(N'Feedbacks'))
            BEGIN
                ALTER TABLE Feedbacks ADD MediaURLs NVARCHAR(MAX) NULL;
            END
        `);
        
        console.log("Adding Reply column...");
        await pool.request().query(`
            IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'Reply' AND Object_ID = Object_ID(N'Feedbacks'))
            BEGIN
                ALTER TABLE Feedbacks ADD Reply NVARCHAR(MAX) NULL;
                ALTER TABLE Feedbacks ADD RepliedAt DATETIME NULL;
            END
        `);
        
        console.log("Adding Report columns...");
        await pool.request().query(`
            IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'IsReported' AND Object_ID = Object_ID(N'Feedbacks'))
            BEGIN
                ALTER TABLE Feedbacks ADD IsReported BIT NOT NULL DEFAULT 0;
                ALTER TABLE Feedbacks ADD ReportReason NVARCHAR(MAX) NULL;
                ALTER TABLE Feedbacks ADD ReportedAt DATETIME NULL;
                ALTER TABLE Feedbacks ADD ReportedBy INT NULL REFERENCES Users(UserID);
            END
        `);
        
        console.log("Feedback table updated successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error updating Feedbacks table:", error);
        process.exit(1);
    }
}

updateFeedbacksTable();
