const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'santc123456',
  server: 'localhost',
  database: 'EMS_DB',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function fixCategories() {
  try {
    const pool = await sql.connect(config);
    
    await pool.request().query(`
      DELETE FROM Categories;
      DBCC CHECKIDENT ('Categories', RESEED, 0);
    `);

    const categories = [
      { name: 'Học thuật', desc: 'Hội thảo, seminar, báo cáo khoa học' },
      { name: 'Kỹ năng mềm', desc: 'Kỹ năng giao tiếp, lãnh đạo, làm việc nhóm' },
      { name: 'Công nghệ', desc: 'Lập trình, AI, cybersecurity, hackathon' },
      { name: 'Văn hóa nghệ thuật', desc: 'Âm nhạc, triển lãm, biểu diễn' },
      { name: 'Thể thao', desc: 'Giải đấu thể thao, ngày hội thể thao' },
      { name: 'Tình nguyện', desc: 'Hoạt động cộng đồng, từ thiện' },
      { name: 'Hướng nghiệp', desc: 'Career fair, workshop việc làm, mentoring' }
    ];

    for (let c of categories) {
      await pool.request()
        .input('name', sql.NVarChar, c.name)
        .input('desc', sql.NVarChar, c.desc)
        .query(`INSERT INTO Categories (Name, Description) VALUES (@name, @desc)`);
    }

    console.log("Categories fixed!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixCategories();
