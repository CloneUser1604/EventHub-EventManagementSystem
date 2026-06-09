require('dotenv').config({ path: './.env' });
const { connectDB, getPool, closeDB, sql } = require('./config/db');
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const runTest = async () => {
  const uniqueId = Date.now();
  const orgEmail = `org_${uniqueId}@ems.edu.vn`;
  const speakerEmail = `speaker_${uniqueId}@ems.edu.vn`;
  let pool = null;
  
  console.log('--- START INTEGRATION TEST ---');
  
  try {
    // 1. REGISTER ORGANIZER via API
    console.log(`\n1. Registering Organizer: ${orgEmail}...`);
    const regRes = await axios.post(`${API_URL}/auth/register`, {
      fullName: 'Test Organizer Club',
      email: orgEmail,
      password: 'Password@123',
      role: 'Organizer',
      phone: '0988776655',
      organizationName: 'FPT Software Club',
      description: 'Chuyên tổ chức các hoạt động công nghệ cho sinh viên',
      documentUrl: 'https://drive.google.com/drive/folders/123456789'
    });
    
    console.log('Register Response:', regRes.data);
    
    // Connect to DB to check profile and verify the user (so they can login)
    await connectDB();
    pool = getPool();
    
    // Check Organizer profile in DB
    console.log('\n2. Verifying Organizer profile in DB...');
    const userRow = await pool.request()
      .input('Email', sql.VarChar(255), orgEmail)
      .query(`
        SELECT u.UserID, u.FullName, op.OrganizationName, op.Description, op.DocumentURL, op.ApprovalStatus
        FROM Users u
        LEFT JOIN OrganizerProfiles op ON u.UserID = op.UserID
        WHERE u.Email = @Email
      `);
    
    console.log('User and Profile in DB:', userRow.recordset[0]);
    if (!userRow.recordset[0].Description || !userRow.recordset[0].DocumentURL) {
      throw new Error('Organizer profile fields (description or documentUrl) are missing in DB!');
    }
    
    // Activate and Verify user in DB so they can bypass email verification for testing login
    console.log('\n3. Verifying and activating organizer in DB...');
    await pool.request()
      .input('Email', sql.VarChar(255), orgEmail)
      .query("UPDATE Users SET IsVerified = 1, IsActive = 1 WHERE Email = @Email");
    
    // 4. LOGIN ORGANIZER via API
    console.log('\n4. Logging in as Organizer...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: orgEmail,
      password: 'Password@123'
    });
    
    const { accessToken, user: loggedUser } = loginRes.data.data;
    console.log('Login successful! Welcome:', loggedUser.fullName);
    console.log('Organizer profile returned:', loggedUser.organizerProfile);
    
    const headers = { Authorization: `Bearer ${accessToken}` };
    
    // 5. CREATE EVENT via API
    console.log('\n5. Creating Event...');
    const eventRes = await axios.post(`${API_URL}/events`, {
      title: 'Workshop Cloud Computing 2026',
      description: 'Lớp học ngắn hạn về AWS và Google Cloud Platform',
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      endDate: new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString(),
      maxParticipants: 150
    }, { headers });
    
    const createdEvent = eventRes.data.data;
    console.log('Event created successfully:', createdEvent);
    
    // 6. REGISTER SPEAKER FOR THIS EVENT via API
    console.log(`\n6. Registering Speaker for Event: ${speakerEmail}...`);
    const speakerRes = await axios.post(`${API_URL}/events/${createdEvent.EventID}/speakers`, {
      email: speakerEmail,
      fullName: 'Dr. John Doe',
      phone: '0909090909',
      bio: 'Cloud Architect with 15 years experience',
      expertise: 'AWS/GCP Specialist',
      linkedInUrl: 'https://linkedin.com/in/johndoe',
      websiteUrl: 'https://johndoe.com'
    }, { headers });
    
    console.log('Speaker registration response:', speakerRes.data);
    
    // 7. VERIFY SPEAKER IN DB
    console.log('\n7. Verifying Speaker details in DB...');
    const speakerRows = await pool.request()
      .input('Email', sql.VarChar(255), speakerEmail)
      .query(`
        SELECT u.UserID, u.FullName, u.Role, sp.Bio, sp.Expertise, sp.LinkedInURL
        FROM Users u
        LEFT JOIN SpeakerProfiles sp ON u.UserID = sp.UserID
        WHERE u.Email = @Email
      `);
    console.log('Speaker User and Profile in DB:', speakerRows.recordset[0]);
    
    // Verify invitation/linkage
    const inviteRows = await pool.request()
      .input('EventID', sql.Int, createdEvent.EventID)
      .input('SpeakerID', sql.Int, speakerRows.recordset[0].UserID)
      .query(`
        SELECT * FROM SpeakerInvitations 
        WHERE EventID = @EventID AND SpeakerID = @SpeakerID
      `);
    console.log('Speaker Invitation Link in DB:', inviteRows.recordset[0]);
    
    if (inviteRows.recordset[0].Status !== 'Accepted') {
      throw new Error('Speaker invitation status should be Accepted!');
    }
    
    // 8. GET EVENT DETAILS via API
    console.log('\n8. Getting Event details and speaker list...');
    const detailsRes = await axios.get(`${API_URL}/events/${createdEvent.EventID}`, { headers });
    console.log('Event Details with Speakers:', detailsRes.data.data);
    
    console.log('\n✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('\n❌ INTEGRATION TEST FAILED:', error.response?.data || error.message);
  } finally {
    if (pool) {
      await pool.request()
        .input('Email', sql.VarChar(255), orgEmail)
        .query("DELETE FROM Users WHERE Email = @Email");
      await pool.request()
        .input('Email', sql.VarChar(255), speakerEmail)
        .query("DELETE FROM Users WHERE Email = @Email");
    }
    await closeDB();
    console.log('--- END INTEGRATION TEST ---');
  }
};

runTest();
