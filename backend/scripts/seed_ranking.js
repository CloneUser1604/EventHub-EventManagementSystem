require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { connectDB, getPool } = require('../config/db');
const sql = require('mssql');

async function seedRankingData() {
  try {
    console.log('Connecting to database...');
    await connectDB();
    const pool = getPool();
    
    console.log('Checking Users table columns...');
    try {
      await pool.request().query('SELECT AvatarURL FROM Users WHERE 1=0');
    } catch (err) {
      console.log('AvatarURL column missing! Adding it...');
      await pool.request().query('ALTER TABLE Users ADD AvatarURL VARCHAR(500) NULL');
    }

    console.log('Seeding Organizers...');
    const resultOrgs = await pool.request().query(`
      DECLARE @Org1 INT, @Org2 INT, @Org3 INT;
      
      -- Top Organizer
      IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'top_org@test.com')
      BEGIN
        INSERT INTO Users (FullName, Email, PasswordHash, Role, AvatarURL, IsVerified)
        VALUES ('Top Organizer', 'top_org@test.com', 'hash', 'Organizer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Top', 1);
        SET @Org1 = SCOPE_IDENTITY();
        INSERT INTO OrganizerProfiles (UserID, OrganizationName, ApprovalStatus) VALUES (@Org1, 'Top Events', 'Approved');
      END
      
      -- Average Organizer
      IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'avg_org@test.com')
      BEGIN
        INSERT INTO Users (FullName, Email, PasswordHash, Role, AvatarURL, IsVerified)
        VALUES ('Average Organizer', 'avg_org@test.com', 'hash', 'Organizer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Avg', 1);
        SET @Org2 = SCOPE_IDENTITY();
        INSERT INTO OrganizerProfiles (UserID, OrganizationName, ApprovalStatus) VALUES (@Org2, 'Average Co', 'Approved');
      END

      -- Bad Organizer
      IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = 'bad_org@test.com')
      BEGIN
        INSERT INTO Users (FullName, Email, PasswordHash, Role, AvatarURL, IsVerified)
        VALUES ('Bad Organizer', 'bad_org@test.com', 'hash', 'Organizer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bad', 1);
        SET @Org3 = SCOPE_IDENTITY();
        INSERT INTO OrganizerProfiles (UserID, OrganizationName, ApprovalStatus) VALUES (@Org3, 'Bad Events Ltd', 'Approved');
      END
      
      SELECT 
        (SELECT UserID FROM Users WHERE Email = 'top_org@test.com') AS Org1,
        (SELECT UserID FROM Users WHERE Email = 'avg_org@test.com') AS Org2,
        (SELECT UserID FROM Users WHERE Email = 'bad_org@test.com') AS Org3;
    `);

    const { Org1, Org2, Org3 } = resultOrgs.recordset[0];

    console.log('Seeding Events & Registrations...');
    
    // Ensure we have a category and venue
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM Categories WHERE Name = 'Seed Category')
        INSERT INTO Categories (Name) VALUES ('Seed Category');
      IF NOT EXISTS (SELECT 1 FROM Venues WHERE Name = 'Seed Venue')
        INSERT INTO Venues (Name, Address, Capacity) VALUES ('Seed Venue', '123 Seed St', 1000);
    `);
    
    const catRes = await pool.request().query("SELECT TOP 1 CategoryID FROM Categories WHERE Name = 'Seed Category'");
    const venueRes = await pool.request().query("SELECT TOP 1 VenueID FROM Venues WHERE Name = 'Seed Venue'");
    const catId = catRes.recordset[0].CategoryID;
    const venueId = venueRes.recordset[0].VenueID;

    // Create events for organizers
    await pool.request()
      .input('Org1', sql.Int, Org1)
      .input('Org2', sql.Int, Org2)
      .input('Org3', sql.Int, Org3)
      .input('CatID', sql.Int, catId)
      .input('VenueID', sql.Int, venueId)
      .query(`
      -- Org1: 3 Published Events
      IF NOT EXISTS (SELECT 1 FROM Events WHERE OrganizerID = @Org1)
      BEGIN
        INSERT INTO Events (Title, Description, CategoryID, OrganizerID, StartDate, EndDate, VenueID, Status, ApprovalStatus)
        VALUES 
        ('Top Event 1', 'Top', @CatID, @Org1, GETDATE(), GETDATE()+1, @VenueID, 'Published', 'Approved'),
        ('Top Event 2', 'Top', @CatID, @Org1, GETDATE(), GETDATE()+1, @VenueID, 'Published', 'Approved'),
        ('Top Event 3', 'Top', @CatID, @Org1, GETDATE(), GETDATE()+1, @VenueID, 'Published', 'Approved');
      END

      -- Org2: 1 Published Event, 1 Rejected
      IF NOT EXISTS (SELECT 1 FROM Events WHERE OrganizerID = @Org2)
      BEGIN
        INSERT INTO Events (Title, Description, CategoryID, OrganizerID, StartDate, EndDate, VenueID, Status, ApprovalStatus)
        VALUES 
        ('Avg Event 1', 'Avg', @CatID, @Org2, GETDATE(), GETDATE()+1, @VenueID, 'Published', 'Approved'),
        ('Avg Event Rejected', 'Avg', @CatID, @Org2, GETDATE(), GETDATE()+1, @VenueID, 'Draft', 'Rejected');
      END

      -- Org3: 5 Rejected Events
      IF NOT EXISTS (SELECT 1 FROM Events WHERE OrganizerID = @Org3)
      BEGIN
        INSERT INTO Events (Title, Description, CategoryID, OrganizerID, StartDate, EndDate, VenueID, Status, ApprovalStatus)
        VALUES 
        ('Bad Event 1', 'Bad', @CatID, @Org3, GETDATE(), GETDATE()+1, @VenueID, 'Draft', 'Rejected'),
        ('Bad Event 2', 'Bad', @CatID, @Org3, GETDATE(), GETDATE()+1, @VenueID, 'Draft', 'Rejected'),
        ('Bad Event 3', 'Bad', @CatID, @Org3, GETDATE(), GETDATE()+1, @VenueID, 'Draft', 'Rejected'),
        ('Bad Event 4', 'Bad', @CatID, @Org3, GETDATE(), GETDATE()+1, @VenueID, 'Draft', 'Rejected'),
        ('Bad Event 5', 'Bad', @CatID, @Org3, GETDATE(), GETDATE()+1, @VenueID, 'Draft', 'Rejected');
      END
    `);

    // Add registrations to boost Top Organizer's score
    const topEventRes = await pool.request().input('Org1', sql.Int, Org1).query("SELECT TOP 1 EventID FROM Events WHERE OrganizerID = @Org1");
    const avgEventRes = await pool.request().input('Org2', sql.Int, Org2).query("SELECT TOP 1 EventID FROM Events WHERE OrganizerID = @Org2 AND Status = 'Published'");
    
    if (topEventRes.recordset.length > 0 && avgEventRes.recordset.length > 0) {
      const topEventId = topEventRes.recordset[0].EventID;
      const avgEventId = avgEventRes.recordset[0].EventID;
      
      for (let i = 0; i < 20; i++) {
        const email = `part${i}@test.com`;
        await pool.request().input('email', sql.VarChar, email).query(`
          IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = @email)
            INSERT INTO Users (FullName, Email, PasswordHash, Role, IsVerified) VALUES ('Participant ' + CAST(@email AS VARCHAR), @email, 'hash', 'Participant', 1)
        `);
        
        const uidRes = await pool.request().input('email', sql.VarChar, email).query("SELECT UserID FROM Users WHERE Email = @email");
        const uid = uidRes.recordset[0].UserID;
        
        // 20 regs for Top Org
        await pool.request().input('ev', sql.Int, topEventId).input('uid', sql.Int, uid).query(`
          IF NOT EXISTS (SELECT 1 FROM Registrations WHERE EventID = @ev AND ParticipantID = @uid)
            INSERT INTO Registrations (EventID, ParticipantID, Status) VALUES (@ev, @uid, 'Registered')
        `);
        
        // 5 regs for Avg Org
        if (i < 5) {
          await pool.request().input('ev', sql.Int, avgEventId).input('uid', sql.Int, uid).query(`
            IF NOT EXISTS (SELECT 1 FROM Registrations WHERE EventID = @ev AND ParticipantID = @uid)
              INSERT INTO Registrations (EventID, ParticipantID, Status) VALUES (@ev, @uid, 'Registered')
          `);
        }
      }
    }

    // Seed Reported Blogs for Bad Organizer
    console.log('Seeding Reported Blogs...');
    const ev3Res = await pool.request().input('Org3', sql.Int, Org3).query("SELECT TOP 1 EventID FROM Events WHERE OrganizerID = @Org3");
    if (ev3Res.recordset.length > 0) {
      const ev3Id = ev3Res.recordset[0].EventID;
      await pool.request()
        .input('Org3', sql.Int, Org3)
        .input('Ev', sql.Int, ev3Id)
        .query(`
        IF NOT EXISTS (SELECT 1 FROM Blogs WHERE AuthorID = @Org3)
        BEGIN
          INSERT INTO Blogs (AuthorID, EventID, Title, Content, IsPublished)
          VALUES 
          (@Org3, @Ev, 'Spam Blog 1', 'Spam', 1),
          (@Org3, @Ev, 'Spam Blog 2', 'Spam', 1),
          (@Org3, @Ev, 'Spam Blog 3', 'Spam', 1);

          -- Insert Reports for these blogs
          INSERT INTO Reports (TargetType, TargetID, ReporterID, Reason, Status)
          SELECT 'Blog', BlogID, @Org3, 'Spam', 'Pending' FROM Blogs WHERE AuthorID = @Org3;
        END
      `);
    }

    console.log('✅ Seeding completed! You can now check the Organizer Ranking in the Admin Dashboard.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seedRankingData();
