/**
 * Run this to seed mock data: node scripts/seed-mock.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { connectDB, getPool, sql, closeDB } = require('../config/db');

async function seedMock() {
  console.log('Connecting to DB...');
  await connectDB();
  const pool = getPool();

  const password = 'Password@123';
  const hash = await bcrypt.hash(password, 12);
  
  console.log('Seeding mock users...');

  // Helper to insert user
  async function insertUser(email, fullName, role, avatar) {
    let res = await pool.request().input('Email', sql.VarChar(255), email).query('SELECT UserID FROM Users WHERE Email = @Email');
    if (res.recordset.length > 0) {
      console.log(`User ${email} already exists. Skipping user creation.`);
      return res.recordset[0].UserID;
    }
    res = await pool.request()
      .input('FullName', sql.NVarChar(150), fullName)
      .input('Email', sql.VarChar(255), email)
      .input('Hash', sql.VarChar(255), hash)
      .input('Role', sql.VarChar(20), role)
      .input('Avatar', sql.VarChar(500), avatar)
      .query('INSERT INTO Users (FullName, Email, PasswordHash, Role, IsActive, IsVerified, AvatarURL) OUTPUT INSERTED.UserID VALUES (@FullName, @Email, @Hash, @Role, 1, 1, @Avatar)');
    return res.recordset[0].UserID;
  }

  const orgId = await insertUser('organizer@ems.edu.vn', 'Tech Events Organizer', 'Organizer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Org');
  const staffId = await insertUser('toilastaffv0@gmail.com', 'Staff Member', 'Staff', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Staff');
  const speakerId = await insertUser('speaker@ems.edu.vn', 'Dr. Tech Speaker', 'Speaker', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Speaker');
  const partId = await insertUser('participant@ems.edu.vn', 'John Participant', 'Participant', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Part');

  // Insert Profiles if not exist
  await pool.request().input('OrgId', sql.Int, orgId).query(`
    IF NOT EXISTS (SELECT 1 FROM OrganizerProfiles WHERE UserID = @OrgId)
    INSERT INTO OrganizerProfiles (UserID, OrganizationName, ApprovalStatus) VALUES (@OrgId, 'Tech Events FPT', 'Approved')
  `);

  await pool.request().input('SpkId', sql.Int, speakerId).query(`
    IF NOT EXISTS (SELECT 1 FROM SpeakerProfiles WHERE UserID = @SpkId)
    INSERT INTO SpeakerProfiles (UserID, Bio, Expertise) VALUES (@SpkId, 'Senior AI Researcher', 'Artificial Intelligence')
  `);

  // Insert Venue
  let venueRes = await pool.request().query("SELECT TOP 1 VenueID FROM Venues WHERE Name = 'Hội trường FPTU'");
  let venueId;
  if (venueRes.recordset.length === 0) {
    venueRes = await pool.request().query("INSERT INTO Venues (Name, Address, Capacity) OUTPUT INSERTED.VenueID VALUES (N'Hội trường FPTU', N'Khu công nghệ cao Hòa Lạc', 500)");
    venueId = venueRes.recordset[0].VenueID;
  } else {
    venueId = venueRes.recordset[0].VenueID;
  }

  // Get Category
  let catRes = await pool.request().query("SELECT TOP 1 CategoryID FROM Categories");
  let catId = catRes.recordset.length > 0 ? catRes.recordset[0].CategoryID : null;

  // Insert Event
  console.log('Seeding mock event...');
  let eventRes = await pool.request().input('OrgId', sql.Int, orgId).query("SELECT TOP 1 EventID FROM Events WHERE OrganizerID = @OrgId");
  let eventId;
  if (eventRes.recordset.length === 0) {
    eventRes = await pool.request()
      .input('OrgId', sql.Int, orgId)
      .input('CatId', sql.Int, catId)
      .input('VenueId', sql.Int, venueId)
      .query(`
        INSERT INTO Events (OrganizerID, CategoryID, VenueID, Title, Description, StartDate, EndDate, Status, ApprovalStatus, CoverImageURL) 
        OUTPUT INSERTED.EventID
        VALUES (@OrgId, @CatId, @VenueId, N'Tech Seminar: Tương lai của AI 2026', N'Một sự kiện về AI cực kỳ thú vị.', DATEADD(day, 2, GETDATE()), DATEADD(day, 3, GETDATE()), 'Approved', 'Approved', 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80')
      `);
    eventId = eventRes.recordset[0].EventID;

    // Assign Staff
    await pool.request().input('EvtId', sql.Int, eventId).input('StaffId', sql.Int, staffId).input('OrgId', sql.Int, orgId)
      .query("INSERT INTO EventStaffs (EventID, StaffID, AssignedBy) VALUES (@EvtId, @StaffId, @OrgId)");
      
    // Create Session
    let sessRes = await pool.request().input('EvtId', sql.Int, eventId).query(`
      INSERT INTO Sessions (EventID, Title, StartTime, EndTime) OUTPUT INSERTED.SessionID 
      VALUES (@EvtId, N'Khai mạc', DATEADD(day, 2, GETDATE()), DATEADD(day, 2, GETDATE()))
    `);
    
    // Assign Speaker
    await pool.request().input('SessId', sql.Int, sessRes.recordset[0].SessionID).input('SpkId', sql.Int, speakerId)
      .query("INSERT INTO SessionSpeakers (SessionID, SpeakerID, Role) VALUES (@SessId, @SpkId, 'Keynote')");
  }

  console.log('✅ Mock data seeded successfully!');
  console.log('\\n📋 Login Credentials:');
  console.log('   Password for all mock accounts: Password@123');
  console.log('   Organizer:  organizer@ems.edu.vn');
  console.log('   Staff:      toilastaffv0@gmail.com');
  console.log('   Speaker:    speaker@ems.edu.vn');
  console.log('   Participant: participant@ems.edu.vn');
  
  await closeDB();
  process.exit(0);
}

seedMock().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
