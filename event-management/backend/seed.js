const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedData = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Xóa dữ liệu cũ
  await User.deleteMany({});

  const salt = await bcrypt.genSalt(10);

  // Tạo Admin
  await User.create({
    username: "admin",
    email: "admin@event.com",
    passwordHash: await bcrypt.hash("admin123", salt),
    fullName: "Administrator",
    role: "Admin"
  });

  // Tạo Organizer
  await User.create({
    username: "organizer",
    email: "organizer@event.com",
    passwordHash: await bcrypt.hash("organizer123", salt),
    fullName: "Nguyễn Văn Tổ Chức",
    role: "Organizer",
    isOrganizerVerified: true
  });

  console.log("✅ Đã tạo dữ liệu demo thành công!");
  console.log("Admin     → email: admin@event.com | pass: admin123");
  console.log("Organizer → email: organizer@event.com | pass: organizer123");

  process.exit();
};

seedData();