require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB, getPool, closeDB } = require('./config/db');

const initDB = async () => {
  try {
    console.log('Connecting to database...');
    await connectDB();
    const pool = getPool();

    console.log('Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'config', 'schema.sql');
    let schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Remove SSMS 'GO' commands if they exist (schema.sql doesn't seem to have them, but just in case)
    schemaSql = schemaSql.replace(/\bGO\b/gi, '');

    console.log('Executing schema.sql to create tables and seed data...');
    await pool.request().query(schemaSql);
    
    console.log('✅ Database schema and seed data initialized successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
  } finally {
    await closeDB();
  }
};

initDB();
