const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function testDeleteBlog() {
  try {
    const pool = await sql.connect(dbConfig);
    console.log('✅ Connected to database.');

    // Tìm một blog vi phạm để test
    const result = await pool.request().query("SELECT TOP 1 b.BlogID, b.Title FROM Blogs b JOIN Reports r ON b.BlogID = r.TargetID WHERE r.TargetType = 'Blog'");
    if (result.recordset.length === 0) {
      console.log('❌ Không có bài viết nào đang bị report để test xoá.');
      return;
    }

    const blog = result.recordset[0];
    console.log(`Tiến hành test XÓA bài viết vi phạm: ID ${blog.BlogID} - ${blog.Title}`);

    // Thực thi lệnh xóa
    await pool.request()
      .input('id', sql.Int, blog.BlogID)
      .query('DELETE FROM Blogs WHERE BlogID = @id');

    console.log(`✅ Đã xóa bài viết ${blog.BlogID} thành công bằng lệnh DELETE FROM Blogs WHERE BlogID = @id.`);

    // Kiểm tra lại
    const check = await pool.request()
      .input('id', sql.Int, blog.BlogID)
      .query('SELECT BlogID FROM Blogs WHERE BlogID = @id');
      
    if (check.recordset.length === 0) {
      console.log('✅ Xác nhận: Bài viết đã bốc hơi khỏi Database!');
    } else {
      console.log('❌ Thất bại: Bài viết VẪN CÒN trong Database!');
    }

  } catch (err) {
    console.error('Lỗi trong quá trình kiểm thử:', err);
  } finally {
    sql.close();
  }
}

testDeleteBlog();
