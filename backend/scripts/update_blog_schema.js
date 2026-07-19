require('dotenv').config();
const { connectDB, getPool } = require('../config/db');

async function updateBlogSchema() {
  try {
    await connectDB();
    const pool = getPool();
    console.log('Running Blog schema updates...');

    // 1. Add columns to Blogs table
    try {
      await pool.request().query(`
        ALTER TABLE Blogs ADD 
          Images NVARCHAR(MAX) NULL,
          PollQuestion NVARCHAR(500) NULL,
          PollOptions NVARCHAR(MAX) NULL
      `);
      console.log('[+] Added Images, PollQuestion, PollOptions to Blogs');
    } catch (e) {
      if (e.message.includes('already has an object named') || e.message.includes('column names in each table must be unique')) {
        console.log('[-] Columns already exist in Blogs');
      } else {
        console.warn('[!] Error adding columns to Blogs:', e.message);
      }
    }

    // 2. Create BlogPollVotes table
    try {
      await pool.request().query(`
        IF OBJECT_ID('BlogPollVotes', 'U') IS NULL
        BEGIN
          CREATE TABLE BlogPollVotes (
            VoteID INT IDENTITY(1,1) PRIMARY KEY,
            BlogID INT NOT NULL REFERENCES Blogs(BlogID) ON DELETE CASCADE,
            UserID INT NOT NULL REFERENCES Users(UserID),
            OptionIndex INT NOT NULL,
            CreatedAt DATETIME DEFAULT GETDATE(),
            UNIQUE(BlogID, UserID)
          );
          PRINT 'BlogPollVotes created';
        END
      `);
      console.log('[+] Created BlogPollVotes table');
    } catch (e) {
      console.warn('[!] Error creating BlogPollVotes:', e.message);
    }

    console.log('Blog schema update complete!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to run updates:', error);
    process.exit(1);
  }
}

updateBlogSchema();
