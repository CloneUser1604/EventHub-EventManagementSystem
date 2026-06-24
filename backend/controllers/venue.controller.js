const { getPool, sql } = require('../config/db');

// Lấy danh sách địa điểm
const getAllVenues = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query('SELECT VenueID, Name, Address FROM Venues ORDER BY Name ASC');
    return res.status(200).json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Get all venues error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách địa điểm' });
  }
};

// Thêm địa điểm mới
const createVenue = async (req, res) => {
  try {
    const { Name, Address } = req.body;
    if (!Name || !Address) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên và địa chỉ địa điểm' });
    }

    const pool = getPool();
    
    // Check if exists
    const check = await pool.request()
      .input('Name', sql.NVarChar(200), Name)
      .query('SELECT VenueID FROM Venues WHERE Name = @Name');
      
    if (check.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Tên địa điểm đã tồn tại' });
    }

    const result = await pool.request()
      .input('Name', sql.NVarChar(200), Name)
      .input('Address', sql.NVarChar(500), Address)
      .query(`
        INSERT INTO Venues (Name, Address)
        OUTPUT INSERTED.VenueID, INSERTED.Name, INSERTED.Address
        VALUES (@Name, @Address)
      `);

    return res.status(201).json({ success: true, data: result.recordset[0], message: 'Thêm địa điểm thành công' });
  } catch (error) {
    console.error('Create venue error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi thêm địa điểm' });
  }
};

// Cập nhật địa điểm
const updateVenue = async (req, res) => {
  try {
    const { id } = req.params;
    const { Name, Address } = req.body;

    if (!Name || !Address) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên và địa chỉ' });
    }

    const pool = getPool();
    
    // Check if exists but not self
    const check = await pool.request()
      .input('Name', sql.NVarChar(200), Name)
      .input('VenueID', sql.Int, id)
      .query('SELECT VenueID FROM Venues WHERE Name = @Name AND VenueID != @VenueID');
      
    if (check.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Tên địa điểm đã tồn tại' });
    }

    const result = await pool.request()
      .input('VenueID', sql.Int, id)
      .input('Name', sql.NVarChar(200), Name)
      .input('Address', sql.NVarChar(500), Address)
      .query(`
        UPDATE Venues
        SET Name = @Name, Address = @Address
        OUTPUT INSERTED.VenueID, INSERTED.Name, INSERTED.Address
        WHERE VenueID = @VenueID
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa điểm' });
    }

    return res.status(200).json({ success: true, data: result.recordset[0], message: 'Cập nhật thành công' });
  } catch (error) {
    console.error('Update venue error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi cập nhật địa điểm' });
  }
};

// Xóa địa điểm
const deleteVenue = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();

    // Kiểm tra xem địa điểm có đang được sử dụng ở sự kiện nào không
    const checkUsed = await pool.request()
      .input('VenueID', sql.Int, id)
      .query('SELECT TOP 1 EventID FROM Events WHERE VenueID = @VenueID');

    if (checkUsed.recordset.length > 0) {
      return res.status(400).json({ success: false, message: 'Không thể xóa địa điểm này vì đã được sử dụng cho sự kiện' });
    }

    const result = await pool.request()
      .input('VenueID', sql.Int, id)
      .query('DELETE FROM Venues WHERE VenueID = @VenueID');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy địa điểm' });
    }

    return res.status(200).json({ success: true, message: 'Đã xóa địa điểm thành công' });
  } catch (error) {
    console.error('Delete venue error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi xóa địa điểm' });
  }
};

module.exports = {
  getAllVenues,
  createVenue,
  updateVenue,
  deleteVenue
};
