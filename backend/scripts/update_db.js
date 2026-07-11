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

    // 5. Add IsInternalOnly and Edit fields to Events
    const newEventCols = [
      { name: 'IsInternalOnly', def: 'BIT DEFAULT 1' },
      { name: 'EditReason', def: 'NVARCHAR(MAX) NULL' },
      { name: 'ProposedChanges', def: 'NVARCHAR(MAX) NULL' },
      { name: 'EditLockedAt', def: 'DATETIME NULL' },
      { name: 'AdminEditUnlock', def: 'BIT DEFAULT 0' },
      { name: 'RejectionReason', def: 'NVARCHAR(MAX) NULL' },
    ];

    for (let col of newEventCols) {
      try {
        await pool.request().query(`ALTER TABLE Events ADD ${col.name} ${col.def}`);
        console.log(`[+] Added ${col.name} to Events`);
      } catch (e) {
        if (e.message.includes('already has an object named') || e.message.includes('column names in each table must be unique')) {
          console.log(`[-] ${col.name} column already exists`);
        } else {
          console.warn(`[!] Error adding ${col.name}:`, e.message);
        }
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
