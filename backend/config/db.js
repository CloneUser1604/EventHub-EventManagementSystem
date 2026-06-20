const sql = require('mssql');

const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE || 'EMS_DB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

const connectDB = async () => {
  try {
    if (pool) return pool;
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to SQL Server successfully');
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

const getPool = () => {
  if (!pool) throw new Error('Database not initialized. Call connectDB() first.');
  return pool;
};

const closeDB = async () => {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('Database connection closed');
  }
};

module.exports = { connectDB, getPool, closeDB, sql };
