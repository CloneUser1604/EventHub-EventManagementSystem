require('dotenv').config();
const { connectDB, getPool, closeDB, sql } = require('./config/db');

const seedVenues = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    const pool = getPool();

    console.log('Checking for existing venues...');
    const result = await pool.request().query('SELECT COUNT(*) AS count FROM Venues');
    if (result.recordset[0].count > 0) {
      console.log('Venues already seeded. Skipping.');
      return;
    }

    console.log('Seeding default university venues...');
    await pool.request().query(`
      INSERT INTO Venues (Name, Address, Capacity, Description, MapURL, IsActive) VALUES
      (N'Hội trường A', N'Khu trung tâm, Tầng 1, Tòa nhà chính', 500, N'Hội trường lớn chính của trường, trang bị âm thanh ánh sáng hiện đại.', 'https://maps.google.com/?q=Hoi+Truong+A', 1),
      (N'Phòng hội thảo B102', N'Tòa nhà B, Tầng 1', 100, N'Phòng họp hội thảo vừa, thích hợp cho workshop và sinh hoạt câu lạc bộ.', 'https://maps.google.com/?q=Phong+Hoi+Thao+B102', 1),
      (N'Sân vận động trung tâm', N'Khu liên hợp thể thao trường', 2000, N'Không gian ngoài trời rộng lớn, phù hợp cho lễ hội, hoạt động thể thao.', 'https://maps.google.com/?q=San+Van+Dong', 1),
      (N'Thư viện trường', N'Tòa nhà Thư viện, Tầng 2', 150, N'Không gian yên tĩnh phù hợp cho giới thiệu sách, seminar học thuật nhỏ.', 'https://maps.google.com/?q=Thu+Vien', 1);
    `);
    
    console.log('✅ Default venues seeded successfully!');
  } catch (error) {
    console.error('❌ Failed to seed venues:', error.message);
  } finally {
    await closeDB();
  }
};

seedVenues();
