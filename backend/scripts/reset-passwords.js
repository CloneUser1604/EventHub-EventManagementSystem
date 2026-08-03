const bcrypt = require('bcryptjs');
const sql = require('mssql');
const { connectDB } = require('../config/db');

async function resetPasswords() {
  const pool = await connectDB();
  const hash = await bcrypt.hash('Abc@1234', 10);
  console.log('New hash:', hash);
  
  // Verify hash works
  const test = await bcrypt.compare('Abc@1234', hash);
  console.log('Hash verification:', test);
  
  await pool.request()
    .input('hash', sql.VarChar(255), hash)
    .query("UPDATE Users SET PasswordHash = @hash");
  
  console.log('All passwords reset to: Abc@1234');
  process.exit(0);
}

resetPasswords().catch(console.error);
