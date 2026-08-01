const checkinService = require('../services/checkin.service');

// [Xác nhận mã OTP Check-in] Gọi từ route POST /checkin/verify -> Xử lý OTP -> Gọi checkinService.verifyOTP
const verifyOTP = async (req, res) => {
  try {
    await checkinService.verifyOTP(req.user.UserID, req.body.qrToken, req.body.otpCode);
    return res.status(200).json({ success: true, message: 'Check-in thành công!' });
  } catch (error) {
    if (error.message.startsWith('BAD_REQUEST')) return res.status(400).json({ success: false, message: error.message.split(': ')[1] });
    if (error.message.startsWith('FORBIDDEN')) return res.status(403).json({ success: false, message: error.message.split(': ')[1] });
    if (error.message.startsWith('NOT_FOUND')) return res.status(404).json({ success: false, message: error.message.split(': ')[1] });
    console.error('Verify OTP error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xử lý check-in' });
  }
};

module.exports = {
  verifyOTP
};
