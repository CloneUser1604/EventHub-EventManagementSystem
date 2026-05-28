const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

exports.register = async (req, res) => {
  try {
    const { username, email, password, fullName, phone, role } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'Email đã tồn tại!' });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ message: 'Tên đăng nhập đã tồn tại!' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      username, email, passwordHash, fullName, phone,
      role: role || 'User'
    });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Đăng ký thành công!',
      token,
      user: { id: user._id, username, email, fullName, role: user.role }
    });
  } catch (err) {
    console.error('Lỗi Register:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    // PHÒNG NGỰ: Nếu lỗi hy hữu Frontend gửi lên một Object thay vì String
    if (typeof email === 'object' && email !== null) {
      email = email.email; // Trích xuất chuỗi email từ object ra nếu lỡ bị bọc dữ liệu
    }

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ email và mật khẩu!' });
    }

    // Tiến hành tìm kiếm bình thường với chuỗi string sạch
    const user = await User.findOne({ email: String(email).trim() });
    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng!' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng!' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: { id: user._id, username: user.username, email: user.email, fullName: user.fullName, role: user.role }
    });
  } catch (err) {
    console.error('Lỗi Login Chi Tiết:', err);
    return res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email không tồn tại!' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    
    await sendEmail(email, 'Đặt lại mật khẩu', `
      <h3>Đặt lại mật khẩu</h3>
      <p>Click vào link sau để đặt lại mật khẩu:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>Link này sẽ hết hạn sau 15 phút.</p>
    `);

    res.json({ message: 'Link đặt lại mật khẩu đã được gửi đến email!' });
  } catch (err) {
    console.error('Lỗi Forgot Password:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn!' });

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'Đặt lại mật khẩu thành công!' });
  } catch (err) {
    console.error('Lỗi Reset Password:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};