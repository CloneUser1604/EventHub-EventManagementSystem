require('dotenv').config();
const { connectDB, getPool, sql } = require('../config/db');

async function runUpdate() {
  try {
    await connectDB();
    const pool = getPool();
    console.log('Running DB updates for the new project...');

    // 1. Add University to Users
    try {
      await pool.request().query(`ALTER TABLE Users ADD University NVARCHAR(150) NULL`);
      console.log('[+] Added University to Users');
    } catch (e) {
      if (e.message.includes('already has an object named') || e.message.includes('column names in each table must be unique')) {
        console.log('[-] University column already exists');
      } else {
        console.warn('[!] Error adding University:', e.message);
      }
    }

    // 2. Add ForceChangePassword to Users
    try {
      await pool.request().query(`ALTER TABLE Users ADD ForceChangePassword BIT DEFAULT 0`);
      console.log('[+] Added ForceChangePassword to Users');
    } catch (e) {
      if (e.message.includes('already has an object named') || e.message.includes('column names in each table must be unique')) {
        console.log('[-] ForceChangePassword column already exists');
      } else {
        console.warn('[!] Error adding ForceChangePassword:', e.message);
      }
    }

    // 3. Add DocumentsURL to Events
    try {
      await pool.request().query(`ALTER TABLE Events ADD DocumentsURL NVARCHAR(MAX) NULL`);
      console.log('[+] Added DocumentsURL to Events');
    } catch (e) {
      if (e.message.includes('already has an object named') || e.message.includes('column names in each table must be unique')) {
        console.log('[-] DocumentsURL column already exists');
      } else {
        console.warn('[!] Error adding DocumentsURL:', e.message);
      }
    }

    // 4. Add EmailNotifs to Users
    try {
      await pool.request().query(`ALTER TABLE Users ADD EmailNotifs BIT DEFAULT 1`);
      console.log('[+] Added EmailNotifs to Users');
    } catch (e) {
      if (e.message.includes('already has an object named') || e.message.includes('column names in each table must be unique')) {
        console.log('[-] EmailNotifs column already exists');
      } else {
        console.warn('[!] Error adding EmailNotifs:', e.message);
      }
    }

    console.log('DB Update complete!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to run updates:', error);
    process.exit(1);
  }
}

runUpdate();
