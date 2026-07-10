/**
 * Bulk seed script: Creates multiple events and participants.
 * Run with: node scripts/seed-bulk.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { connectDB, getPool, sql, closeDB } = require('../config/db');

async function seedBulk() {
  console.log('Connecting to DB...');
  await connectDB();
  const pool = getPool();

  const password = 'Password@123';
  const hash = await bcrypt.hash(password, 12);

  // 1. Get/Create Organizer
  let orgRes = await pool.request().query("SELECT TOP 1 UserID FROM Users WHERE Role = 'Organizer'");
  let orgId;
  if (orgRes.recordset.length === 0) {
    orgRes = await pool.request().query(`
      INSERT INTO Users (FullName, Email, PasswordHash, Role, IsActive, IsVerified) 
      OUTPUT INSERTED.UserID 
      VALUES (N'Bulk Organizer', 'bulkorg@ems.edu.vn', '${hash}', 'Organizer', 1, 1)
    `);
    orgId = orgRes.recordset[0].UserID;
    await pool.request().input('OrgId', sql.Int, orgId).query(`
      INSERT INTO OrganizerProfiles (UserID, OrganizationName, ApprovalStatus) 
      VALUES (@OrgId, 'Global Tech Events', 'Approved')
    `);
  } else {
    orgId = orgRes.recordset[0].UserID;
  }

  // 2. Get/Create Category and Venue
  let catRes = await pool.request().query("SELECT TOP 1 CategoryID FROM Categories");
  let catId = catRes.recordset.length > 0 ? catRes.recordset[0].CategoryID : null;

  let venueRes = await pool.request().query("SELECT TOP 1 VenueID FROM Venues");
  let venueId = venueRes.recordset.length > 0 ? venueRes.recordset[0].VenueID : null;

  // 3. Create 10 Participants
  console.log('Seeding 10 Participants...');
  const participantIds = [];
  for (let i = 1; i <= 10; i++) {
    const email = `participant${i}@ems.edu.vn`;
    let uRes = await pool.request().input('Email', sql.VarChar(255), email).query('SELECT UserID FROM Users WHERE Email = @Email');
    if (uRes.recordset.length === 0) {
      const p = await pool.request()
        .input('FullName', sql.NVarChar(150), `Participant User ${i}`)
        .input('Email', sql.VarChar(255), email)
        .input('Hash', sql.VarChar(255), hash)
        .query(`
          INSERT INTO Users (FullName, Email, PasswordHash, Role, IsActive, IsVerified) 
          OUTPUT INSERTED.UserID 
          VALUES (@FullName, @Email, @Hash, 'Participant', 1, 1)
        `);
      participantIds.push(p.recordset[0].UserID);
    } else {
      participantIds.push(uRes.recordset[0].UserID);
    }
  }

  // 4. Create 5 Events
  console.log('Seeding 5 Events...');
  const eventData = [
    { title: 'Global Tech Summit 2026', desc: 'Sự kiện công nghệ lớn nhất năm', start: 5, end: 6, status: 'Published' },
    { title: 'AI Developer Conference', desc: 'Hội thảo chuyên sâu về AI', start: 10, end: 11, status: 'Published' },
    { title: 'Web3 & Blockchain Expo', desc: 'Triển lãm Blockchain lớn nhất', start: -5, end: -4, status: 'Completed' },
    { title: 'Future of Cloud Computing', desc: 'Bàn luận về điện toán đám mây', start: 20, end: 22, status: 'Approved' },
    { title: 'Cybersecurity Workshop', desc: 'Thực hành bảo mật mạng', start: 30, end: 31, status: 'Published' },
  ];

  const eventIds = [];
  for (const ed of eventData) {
    const checkRes = await pool.request().input('Title', sql.NVarChar(300), ed.title).query('SELECT EventID FROM Events WHERE Title = @Title');
    if (checkRes.recordset.length === 0) {
      const eRes = await pool.request()
        .input('OrgId', sql.Int, orgId)
        .input('CatId', sql.Int, catId)
        .input('VenueId', sql.Int, venueId)
        .input('Title', sql.NVarChar(300), ed.title)
        .input('Desc', sql.NVarChar(sql.MAX), ed.desc)
        .input('Status', sql.VarChar(20), ed.status)
        .query(`
          INSERT INTO Events (OrganizerID, CategoryID, VenueID, Title, Description, StartDate, EndDate, Status, ApprovalStatus) 
          OUTPUT INSERTED.EventID
          VALUES (@OrgId, @CatId, @VenueId, @Title, @Desc, DATEADD(day, ${ed.start}, GETDATE()), DATEADD(day, ${ed.end}, GETDATE()), @Status, 'Approved')
        `);
      eventIds.push(eRes.recordset[0].EventID);
    } else {
      eventIds.push(checkRes.recordset[0].EventID);
    }
  }

  // 5. Register Participants to Events
  console.log('Registering Participants to Events...');
  for (const eId of eventIds) {
    // Register the first 5 participants to each event
    for (let i = 0; i < 5; i++) {
      const pId = participantIds[i];
      const checkReg = await pool.request().input('EvtId', sql.Int, eId).input('PartId', sql.Int, pId).query('SELECT RegistrationID FROM Registrations WHERE EventID = @EvtId AND ParticipantID = @PartId');
      
      if (checkReg.recordset.length === 0) {
        const rRes = await pool.request()
          .input('EvtId', sql.Int, eId)
          .input('PartId', sql.Int, pId)
          .query(`
            INSERT INTO Registrations (EventID, ParticipantID, Status) 
            OUTPUT INSERTED.RegistrationID 
            VALUES (@EvtId, @PartId, 'Registered')
          `);
        
        const regId = rRes.recordset[0].RegistrationID;
        
        // Generate QR code for them
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await pool.request()
          .input('RegId', sql.Int, regId)
          .input('OTP', sql.VarChar(10), otpCode)
          .query(`
            INSERT INTO QRTickets (RegistrationID, QRCodeData, OTPCode, IsUsed) 
            VALUES (@RegId, 'QR-' + CAST(@RegId AS VARCHAR), @OTP, 0)
          `);
      }
    }
  }

  console.log('✅ Bulk data seeded successfully!');
  console.log('\\n📋 Created 10 Participants: participant1@ems.edu.vn -> participant10@ems.edu.vn');
  console.log('   Password: Password@123');
  console.log('📋 Created 5 Events and registered participants automatically.');
  
  await closeDB();
  process.exit(0);
}

seedBulk().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
