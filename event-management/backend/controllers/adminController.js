const Event = require('../models/Event');
const User = require('../models/User');

// Lấy danh sách sự kiện chờ duyệt
exports.getPendingEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: 'Pending' })
      .populate('organizer', 'fullName email')
      .populate('venue')
      .sort({ createdAt: -1 });

    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Admin phê duyệt sự kiện
// Admin phê duyệt sự kiện
exports.approveEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: 'Không tìm thấy sự kiện' });

    event.status = 'Approved';
    event.isPublic = true;
    event.rejectionReason = undefined; // Xóa lý do từ chối cũ nếu có

    await event.save();

    res.json({ message: 'Sự kiện đã được phê duyệt và công khai', event });
  } catch (err) {
    console.error('Lỗi duyệt sự kiện:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Admin từ chối sự kiện
exports.rejectEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Vui lòng nhập lý do từ chối' });
    }

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: 'Không tìm thấy sự kiện' });

    event.status = 'Rejected';
    event.isPublic = false;
    event.rejectionReason = rejectionReason;

    await event.save();

    res.json({ message: 'Đã từ chối sự kiện', event });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};