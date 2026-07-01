const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Đảm bảo các thư mục tồn tại
const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };
ensureDir('uploads/organizer-docs');
ensureDir('uploads/avatars');
ensureDir('uploads/events');
ensureDir('uploads/feedbacks');

// ─── XỬ LÝ CHUNG CHO PROFILE (Cả Tài liệu & Avatar) ────────────────────────
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Tự động rẽ nhánh thư mục dựa vào tên trường (fieldname)
    if (file.fieldname === 'avatar') {
      cb(null, 'uploads/avatars');
    } else {
      cb(null, 'uploads/organizer-docs');
    }
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    // Gắn tiền tố riêng biệt để Frontend dễ phân giải
    if (file.fieldname === 'avatar') {
      cb(null, `avatar_${Date.now()}_${safe}`);
    } else {
      cb(null, `org_${Date.now()}_${safe}`);
    }
  },
});

const profileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.fieldname === 'avatar') {
    const allowedImages = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (allowedImages.includes(ext)) cb(null, true);
    else cb(new Error('Ảnh đại diện chỉ chấp nhận định dạng: JPG, PNG, GIF, WEBP'), false);
  } else {
    const allowedDocs = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    if (allowedDocs.includes(ext)) cb(null, true);
    else cb(new Error('Tài liệu chỉ chấp nhận file: PDF, DOC, DOCX, JPG, PNG'), false);
  }
};

const uploadOrgDocs = multer({
  storage: profileStorage,
  fileFilter: profileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 6 }, // 10MB, tối đa 5 file doc + 1 avatar = 6
});

// ─── XỬ LÝ CHO EVENT ────────────────────────
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

// ─── XỬ LÝ CHO FEEDBACK ────────────────────────
const feedbackStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/feedbacks'),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `feedback_${Date.now()}_${safe}`);
  },
});

const uploadFeedback = multer({
  storage: feedbackStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB / file for videos
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.avi'];
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Chỉ chấp nhận file ảnh hoặc video'), false);
  }
});

module.exports = { uploadOrgDocs, uploadEvent, uploadFeedback };