const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload folders exist
const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
ensureDir('uploads/organizer-docs');
ensureDir('uploads/avatars');
ensureDir('uploads/events');

// ─── Organizer verification documents ────────────────────────
const orgDocStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/organizer-docs'),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `org_${Date.now()}_${safe}`);
  },
});

const orgDocFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Chỉ chấp nhận file: PDF, DOC, DOCX, JPG, PNG'), false);
};

const uploadOrgDocs = multer({
  storage: orgDocStorage,
  fileFilter: orgDocFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }, // 10MB / file, tối đa 5 file
});

// ─── Event documents and cover ────────────────────────
const eventStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/events'),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `event_${Date.now()}_${safe}`);
  },
});

const uploadEvent = multer({
  storage: eventStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB / file
});

module.exports = { uploadOrgDocs, uploadEvent };
