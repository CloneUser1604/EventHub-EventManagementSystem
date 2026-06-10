-- ============================================================
-- Reset Admin password = 'Admin@123'
-- Chạy script này trong SQL Server Management Studio
-- sau khi chạy: node scripts/seed-admin.js
-- ============================================================

-- Kiểm tra admin hiện tại
SELECT UserID, FullName, Email, Role, IsActive, IsVerified,
       LEFT(PasswordHash, 30) AS HashPrefix
FROM Users WHERE Email = 'admin@ems.edu.vn';

-- Nếu cần update thủ công (sau khi lấy hash từ seed-admin.js output):
-- UPDATE Users 
-- SET PasswordHash = '<PASTE_HASH_HERE>',
--     IsActive = 1, IsVerified = 1
-- WHERE Email = 'admin@ems.edu.vn';
