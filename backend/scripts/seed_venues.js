require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { connectDB, getPool, sql } = require('../config/db');

const venuesToSeed = [
  { name: 'Tòa nhà Alpha (Hà Nội)', address: 'Hà Nội' },
  { name: 'Tòa nhà Alpha (Đà Nẵng)', address: 'Đà Nẵng' },
  { name: 'Tòa nhà Beta (Hà Nội)', address: 'Hà Nội' },
  { name: 'Tòa nhà Gamma (Hà Nội)', address: 'Hà Nội' },
  { name: 'Tòa nhà Delta (Hà Nội)', address: 'Hà Nội' },
  { name: 'Hội trường lớn Auditorium (Hà Nội)', address: 'Hà Nội' },
  { name: 'Hội trường lớn Auditorium (TP. HCM)', address: 'TP. HCM' },
  { name: 'Hội trường lớn Auditorium (Đà Nẵng)', address: 'Đà Nẵng' },
  { name: 'Hội trường lớn Auditorium (Cần Thơ)', address: 'Cần Thơ' },
  { name: 'Hội trường lớn Auditorium (Quy Nhơn)', address: 'Quy Nhơn' },
  { name: 'Thư viện (Hà Nội)', address: 'Hà Nội' },
  { name: 'Thư viện (TP. HCM)', address: 'TP. HCM' },
  { name: 'Thư viện (Đà Nẵng)', address: 'Đà Nẵng' },
  { name: 'Thư viện (Cần Thơ)', address: 'Cần Thơ' },
  { name: 'Thư viện (Quy Nhơn)', address: 'Quy Nhơn' },
  { name: 'Khu phức hợp thể thao ngoài trời (Hà Nội)', address: 'Hà Nội' },
  { name: 'Khu phức hợp thể thao ngoài trời (TP. HCM)', address: 'TP. HCM' },
  { name: 'Khu phức hợp thể thao ngoài trời (Đà Nẵng)', address: 'Đà Nẵng' },
  { name: 'Khu phức hợp thể thao ngoài trời (Cần Thơ)', address: 'Cần Thơ' },
  { name: 'Khu phức hợp thể thao ngoài trời (Quy Nhơn)', address: 'Quy Nhơn' },
  { name: 'Hồ Sen (Hà Nội)', address: 'Hà Nội' },
  { name: 'Đồi thông (Hà Nội)', address: 'Hà Nội' },
  { name: 'Vườn hoa hướng dương (Hà Nội)', address: 'Hà Nội' },
  { name: 'Quảng trường Campus (TP. HCM)', address: 'TP. HCM' },
  { name: 'Quảng trường Campus (Đà Nẵng)', address: 'Đà Nẵng' },
  { name: 'Quảng trường Campus (Cần Thơ)', address: 'Cần Thơ' },
  { name: 'Quảng trường Campus (Quy Nhơn)', address: 'Quy Nhơn' },
  { name: 'Hồ sinh thái trung tâm (TP. HCM)', address: 'TP. HCM' },
  { name: 'Tòa nhà Tổ hợp Giáo dục - Công nghệ (Cần Thơ)', address: 'Cần Thơ' },
  { name: 'Tòa nhà Giảng đường AI (Quy Nhơn)', address: 'Quy Nhơn' },
  { name: 'Trung tâm Đổi mới sáng tạo Quốc gia NIC (Hà Nội)', address: 'Hà Nội' },
  { name: 'Hội trường & Không gian triển lãm F-Ville (Hà Nội)', address: 'Hà Nội' },
  { name: 'Khu đô thị Công nghệ FPT Đà Nẵng (Đà Nẵng)', address: 'Đà Nẵng' },
  { name: 'Khu công nghệ cao TP.HCM - SHTP (TP. HCM)', address: 'TP. HCM' },
  { name: 'Vườn ươm Doanh nghiệp công nghệ cao (TP. HCM)', address: 'TP. HCM' },
];

const seedVenues = async () => {
  try {
    await connectDB();
    const pool = getPool();
    let inserted = 0;

    for (const v of venuesToSeed) {
      const check = await pool.request()
        .input('Name', sql.NVarChar(200), v.name)
        .query('SELECT VenueID FROM Venues WHERE Name = @Name');
      
      if (check.recordset.length === 0) {
        await pool.request()
          .input('Name', sql.NVarChar(200), v.name)
          .input('Address', sql.NVarChar(500), v.address)
          .query('INSERT INTO Venues (Name, Address) VALUES (@Name, @Address)');
        inserted++;
      }
    }
    console.log(`Seeded ${inserted} venues successfully!`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding venues:', error);
    process.exit(1);
  }
};

seedVenues();
