require('dotenv').config();
const { connectDB, getPool, sql } = require('../config/db');
const bcrypt = require('bcryptjs');

async function seed() {
  await connectDB();
  const pool = getPool();

  console.log('Fetching dependencies...');
  
  // Get an organizer
  const orgResult = await pool.request().query("SELECT TOP 1 UserID FROM Users WHERE Email='organizerdemo@example.com'");
  if (orgResult.recordset.length === 0) {
    console.error("❌ No organizerdemo@example.com found! Please run clean_db.sql and start the backend to auto-seed default users first.");
    process.exit(1);
  }
  const orgId = orgResult.recordset[0].UserID;

  // Get categories
  const catResult = await pool.request().query("SELECT CategoryID FROM Categories");
  if (catResult.recordset.length === 0) {
    console.error('No categories found! Please seed categories first.');
    process.exit(1);
  }
  const cats = catResult.recordset.map(c => c.CategoryID);
  const getRandCat = () => cats[Math.floor(Math.random() * cats.length)];

  // Seed Users (Participants, Staff, Speakers)
  console.log('Seeding users (16 Participants, 10 Staff, 5 Speakers)...');
  const passwordHash = await bcrypt.hash('123456', 10);
  
  // 1. Seed 16 Participants
  for (let i = 1; i <= 16; i++) {
    const isInternal = i > 8; // 9-16 is internal
    const university = isInternal ? 'Đại học FPT' : 'Đại học Quốc gia';
    const emailDomain = isInternal ? '@fpt.edu.vn' : '@gmail.com';
    const email = `sv${i}${emailDomain}`;
    
    try {
      const checkUser = await pool.request().input('Email', sql.VarChar, email).query('SELECT UserID FROM Users WHERE Email=@Email');
      if (checkUser.recordset.length === 0) {
        await pool.request()
          .input('FullName', sql.NVarChar, `Sinh viên ${i}`)
          .input('Email', sql.VarChar, email)
          .input('PasswordHash', sql.VarChar, passwordHash)
          .input('Role', sql.VarChar, 'Participant')
          .input('University', sql.NVarChar, university)
          .input('IsActive', sql.Bit, 1)
          .input('IsVerified', sql.Bit, 1)
          .query(`
            INSERT INTO Users (FullName, Email, PasswordHash, Role, University, IsActive, IsVerified)
            VALUES (@FullName, @Email, @PasswordHash, @Role, @University, @IsActive, @IsVerified)
          `);
        console.log(`✅ Created Participant: ${email} (${university})`);
      }
    } catch (err) {
      console.error(`❌ Failed to create Participant ${email}:`, err.message);
    }
  }

  // 2. Seed 10 Staff
  for (let i = 1; i <= 10; i++) {
    const email = `staff${i}@ems.edu.vn`;
    try {
      const checkUser = await pool.request().input('Email', sql.VarChar, email).query('SELECT UserID FROM Users WHERE Email=@Email');
      if (checkUser.recordset.length === 0) {
        await pool.request()
          .input('FullName', sql.NVarChar, `Nhân viên sự kiện ${i}`)
          .input('Email', sql.VarChar, email)
          .input('PasswordHash', sql.VarChar, passwordHash)
          .input('Role', sql.VarChar, 'Staff')
          .input('IsActive', sql.Bit, 1)
          .input('IsVerified', sql.Bit, 1)
          .query(`
            INSERT INTO Users (FullName, Email, PasswordHash, Role, IsActive, IsVerified)
            VALUES (@FullName, @Email, @PasswordHash, @Role, @IsActive, @IsVerified)
          `);
        console.log(`✅ Created Staff: ${email}`);
      }
    } catch (err) {
      console.error(`❌ Failed to create Staff ${email}:`, err.message);
    }
  }

  // 3. Seed 5 Speakers
  for (let i = 1; i <= 5; i++) {
    const email = `speaker${i}@ems.edu.vn`;
    try {
      const checkUser = await pool.request().input('Email', sql.VarChar, email).query('SELECT UserID FROM Users WHERE Email=@Email');
      if (checkUser.recordset.length === 0) {
        // Insert User and return UserID
        const result = await pool.request()
          .input('FullName', sql.NVarChar, `Diễn giả ${i}`)
          .input('Email', sql.VarChar, email)
          .input('PasswordHash', sql.VarChar, passwordHash)
          .input('Role', sql.VarChar, 'Speaker')
          .input('IsActive', sql.Bit, 1)
          .input('IsVerified', sql.Bit, 1)
          .query(`
            INSERT INTO Users (FullName, Email, PasswordHash, Role, IsActive, IsVerified)
            OUTPUT INSERTED.UserID
            VALUES (@FullName, @Email, @PasswordHash, @Role, @IsActive, @IsVerified)
          `);
        const newUserId = result.recordset[0].UserID;

        // Insert SpeakerProfile
        await pool.request()
          .input('UserID', sql.Int, newUserId)
          .input('Bio', sql.NVarChar(sql.MAX), `Bio của Diễn giả ${i}. Chuyên gia với nhiều năm kinh nghiệm trong lĩnh vực công nghệ.`)
          .input('Expertise', sql.NVarChar(500), 'Chuyên gia Công nghệ, Lãnh đạo')
          .query(`
            INSERT INTO SpeakerProfiles (UserID, Bio, Expertise)
            VALUES (@UserID, @Bio, @Expertise)
          `);
        console.log(`✅ Created Speaker: ${email}`);
      }
    } catch (err) {
      console.error(`❌ Failed to create Speaker ${email}:`, err.message);
    }
  }

  const now = new Date();
  const generateDate = (daysOffset) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysOffset);
    return d;
  }

  const events = [
    // 1-4: Sắp diễn ra (Còn hạn đăng ký)
    { title: "Hội thảo Trí tuệ nhân tạo (AI) 2026", type: "upcoming_open", internal: 0 },
    { title: "Khóa học Lập trình Web Fullstack cấp tốc", type: "upcoming_open", internal: 1 },
    { title: "Talkshow Hành trang sinh viên CNTT", type: "upcoming_open", internal: 0 },
    { title: "Cuộc thi Hackathon Mùa hè xanh", type: "upcoming_open", internal: 1 },

    // 5-8: Sắp diễn ra (Hết hạn đăng ký)
    { title: "Lễ hội văn hóa Nhật Bản FPT", type: "upcoming_open", internal: 1 },
    { title: "Workshop Kỹ năng mềm: Giao tiếp ấn tượng", type: "upcoming_open", internal: 0 },
    { title: "Chia sẻ kinh nghiệm thực tập FSoft", type: "upcoming_closed", internal: 1 },
    { title: "Buổi gặp gỡ CLB Tiếng Anh", type: "upcoming_closed", internal: 0 },

    // 9-12: Đang diễn ra
    { title: "Giải bóng đá sinh viên toàn quốc", type: "ongoing", internal: 0 },
    { title: "Tuần lễ sách và văn hóa đọc", type: "ongoing", internal: 1 },
    { title: "Triển lãm Đồ án tốt nghiệp Sinh viên Thiết kế", type: "ongoing", internal: 0 },
    { title: "Chuỗi sự kiện Chào Tân sinh viên", type: "ongoing", internal: 1 },

    // 13-16: Đã kết thúc
    { title: "Lễ tốt nghiệp Khóa 18", type: "completed", internal: 1 },
    { title: "Hội diễn văn nghệ kỉ niệm thành lập trường", type: "completed", internal: 0 },
    { title: "Cuộc thi tranh biện Debate Championship", type: "completed", internal: 1 },
    { title: "Ngày hội việc làm Job Fair 2025", type: "completed", internal: 0 },

    // 17-20: Đã hủy
    { title: "Workshop Kỹ năng lãnh đạo (Đã hủy)", type: "cancelled", internal: 0 },
    { title: "Chuyến đi thực tế tại doanh nghiệp (Đã hủy)", type: "cancelled", internal: 1 },
    { title: "Khóa đào tạo Agile/Scrum (Dời lịch vô thời hạn)", type: "cancelled", internal: 0 },
    { title: "Giao lưu ca nhạc sinh viên (Hủy do thời tiết)", type: "cancelled", internal: 1 }
  ];

  console.log(`Seeding ${events.length} events...`);
  
  // We first delete old events to avoid duplicates when running multiple times
  await pool.request().query("DELETE FROM Registrations WHERE EventID IN (SELECT EventID FROM Events WHERE OrganizerID IN (SELECT UserID FROM Users WHERE Email='organizerdemo@example.com'))");
  await pool.request().query("DELETE FROM EventStaffs WHERE EventID IN (SELECT EventID FROM Events WHERE OrganizerID IN (SELECT UserID FROM Users WHERE Email='organizerdemo@example.com'))");
  await pool.request().query("DELETE FROM Events WHERE OrganizerID IN (SELECT UserID FROM Users WHERE Email='organizerdemo@example.com')");

  // Prepare participants for registration
  const partRes = await pool.request().query("SELECT UserID FROM Users WHERE Role='Participant'");
  const participants = partRes.recordset.map(r => r.UserID);
  
  // Prepare staffs for assignment
  const staffRes = await pool.request().query("SELECT UserID FROM Users WHERE Role='Staff'");
  const staffs = staffRes.recordset.map(r => r.UserID);

  for (let ev of events) {
    let startDate, endDate, regDeadline, status;
    let approvalStatus = 'Approved';
    
    if (ev.type === "upcoming_open") {
      startDate = generateDate(10);
      endDate = generateDate(11);
      regDeadline = generateDate(5);
      status = 'Published';
    } else if (ev.type === "upcoming_closed") {
      startDate = generateDate(5);
      endDate = generateDate(6);
      regDeadline = generateDate(-1);
      status = 'Published';
    } else if (ev.type === "ongoing") {
      startDate = generateDate(-1);
      endDate = generateDate(2);
      regDeadline = generateDate(-5);
      status = 'Published';
    } else if (ev.type === "completed") {
      startDate = generateDate(-20);
      endDate = generateDate(-18);
      regDeadline = generateDate(-25);
      status = 'Completed';
    } else if (ev.type === "cancelled") {
      startDate = generateDate(5);
      endDate = generateDate(6);
      regDeadline = generateDate(2);
      status = 'Cancelled';
    }

    try {
      const insertResult = await pool.request()
        .input('OrganizerID', sql.Int, orgId)
        .input('CategoryID', sql.Int, getRandCat())
        .input('Title', sql.NVarChar(300), ev.title)
        .input('Description', sql.NVarChar(sql.MAX), 'Mô tả chi tiết cho sự kiện: ' + ev.title)
        .input('CoverImageURL', sql.VarChar(500), 'https://res.cloudinary.com/dzj8z3e58/image/upload/v1721538350/default_event.jpg')
        .input('StartDate', sql.DateTime, startDate)
        .input('EndDate', sql.DateTime, endDate)
        .input('RegistrationDeadline', sql.DateTime, regDeadline)
        .input('MaxParticipants', sql.Int, 100)
        .input('IsInternalOnly', sql.Bit, ev.internal)
        .input('Status', sql.VarChar(20), status)
        .input('ApprovalStatus', sql.VarChar(20), approvalStatus)
        .query(`
          INSERT INTO Events (
            OrganizerID, CategoryID, Title, Description, CoverImageURL, 
            StartDate, EndDate, RegistrationDeadline, MaxParticipants, 
            IsInternalOnly, Status, ApprovalStatus
          ) 
          OUTPUT INSERTED.EventID
          VALUES (
            @OrganizerID, @CategoryID, @Title, @Description, @CoverImageURL,
            @StartDate, @EndDate, @RegistrationDeadline, @MaxParticipants,
            @IsInternalOnly, @Status, @ApprovalStatus
          )
        `);
      
      const eventId = insertResult.recordset[0].EventID;
      console.log(`✅ Created: ${ev.title} (${ev.type}, Internal: ${ev.internal})`);

      // Seed registrations and staffs if upcoming_open or ongoing
      if ((ev.type === 'upcoming_open' || ev.type === 'ongoing')) {
        // Assign up to 3 participants randomly
        if (participants.length > 0) {
          const shuffledParts = participants.sort(() => 0.5 - Math.random());
          const selectedParts = shuffledParts.slice(0, 3);
          
          for (const pid of selectedParts) {
            await pool.request()
              .input('EventID', sql.Int, eventId)
              .input('ParticipantID', sql.Int, pid)
              .query(`
                INSERT INTO Registrations (EventID, ParticipantID, Status)
                VALUES (@EventID, @ParticipantID, 'Registered')
              `);
          }
          console.log(`   👉 Seeded ${selectedParts.length} registrations`);
        }

        // Assign up to 7 staffs randomly
        if (staffs.length > 0) {
          const shuffledStaffs = staffs.sort(() => 0.5 - Math.random());
          const selectedStaffs = shuffledStaffs.slice(0, 7);
          
          for (const sid of selectedStaffs) {
            await pool.request()
              .input('EventID', sql.Int, eventId)
              .input('StaffID', sql.Int, sid)
              .input('AssignedBy', sql.Int, orgId)
              .query(`
                INSERT INTO EventStaffs (EventID, StaffID, AssignedBy)
                VALUES (@EventID, @StaffID, @AssignedBy)
              `);
          }
          console.log(`   👉 Seeded ${selectedStaffs.length} staffs`);
        }
      }

    } catch (err) {
      console.error(`❌ Failed to create ${ev.title}:`, err.message);
    }
  }

  console.log('Seed completed!');
  process.exit(0);
}

seed().catch(console.error);
