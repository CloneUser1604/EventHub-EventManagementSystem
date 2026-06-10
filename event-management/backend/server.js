require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'EMS API running', timestamp: new Date().toISOString() }));


// ── DEBUG endpoint (chỉ dùng khi development) ─────────────────
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/check-admin', async (req, res) => {
    try {
      const { getPool, sql } = require('./config/db');
      const pool = getPool();
      const result = await pool.request()
        .query(`SELECT UserID, FullName, Email, Role,
                       IsActive, IsVerified,
                       LEFT(PasswordHash, 30) AS HashPrefix,
                       LEN(PasswordHash) AS HashLen
                FROM Users WHERE Email = 'admin@ems.edu.vn'`);
      if (result.recordset.length === 0) {
        return res.json({ found: false, message: 'Admin not found. Run: node scripts/seed-admin.js' });
      }
      res.json({ found: true, admin: result.recordset[0] });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}


// ── TEMP: Reset admin password endpoint ──────────────────────
// Gọi 1 lần: GET http://localhost:5000/api/debug/reset-admin
// Sau đó XOÁ endpoint này khỏi code
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/reset-admin', async (req, res) => {
    try {
      const bcrypt = require('bcryptjs');
      const { getPool, sql } = require('./config/db');
      const pool = getPool();
      const password = 'Admin@123';
      const hash = await bcrypt.hash(password, 12);
      await pool.request()
        .input('Hash', sql.VarChar(255), hash)
        .input('Email', sql.VarChar(255), 'admin@ems.edu.vn')
        .query('UPDATE Users SET PasswordHash=@Hash, IsActive=1, IsVerified=1, Role=\'Admin\' WHERE Email=@Email');
      res.json({ 
        success: true, 
        message: 'Admin password reset to Admin@123',
        hashPrefix: hash.substring(0, 29)
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/events',        require('./routes/event.routes'));
app.use('/api/registrations', require('./routes/registration.routes'));

app.use('*', (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message });
});

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`🚀 EMS Backend: http://localhost:${PORT}`));
};
startServer();
module.exports = app;
