const Event = require('../models/Event');

exports.createEvent = async (req, res) => {
  try {
    // Lúc này nhờ có Multer nên req.body đã có đầy đủ dữ liệu text
    const { 
      title, description, typeEvent, venue, startDateTime, 
      endDateTime, ticketTypes, tags, agenda, livestreamUrl, 
      maxCapacity, status 
    } = req.body;

    // Xử lý dữ liệu phòng ngự phòng trường hợp chuỗi rỗng gây sập định dạng ObjectId
    const cleanTypeEvent = typeEvent && typeEvent.trim() !== "" ? typeEvent : undefined;
    const cleanVenue = venue && venue.trim() !== "" ? venue : undefined;

    // Duyệt mảng các file được up lên (nếu có) từ req.files để lưu cấu trúc vào DB
    let documents = [];
    if (req.files && req.files.length > 0) {
      documents = req.files.map(file => ({
        fileName: file.originalname,
        // Tạm thời lưu dạng chuỗi giả lập hoặc base64, sau này bạn có thể nâng cấp up lên Cloudinary/S3
        fileUrl: `uploads/${Date.now()}-${file.originalname}`, 
        fileType: file.mimetype,
        uploadedAt: new Date()
      }));
    }

    const event = await Event.create({
      title,
      description,
      typeEvent: cleanTypeEvent,
      organizer: req.user.id, // Lấy ID của Organizer đang đăng nhập từ middleware protect
      venue: cleanVenue,
      startDateTime,
      endDateTime,
      ticketTypes: ticketTypes ? JSON.parse(ticketTypes) : [], // Ép kiểu nếu Frontend gửi dạng Stringify
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [], // Tách chuỗi tag "music, game" thành ['music', 'game']
      agenda,
      livestreamUrl,
      maxCapacity: maxCapacity ? Number(maxCapacity) : undefined,
      status: status || 'Draft',   
      verificationDocuments: documents // Lưu thông tin tài liệu xác minh vào đây
    });

    return res.status(201).json({ message: 'Tạo sự kiện thành công', event });
  } catch (err) {
    console.error('🔥 LỖI TẠO SỰ KIỆN CHI TIẾT:', err);
    return res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.getMyEvents = async (req, res) => {
  const events = await Event.find({ organizer: req.user.id })
    .populate('venue')
    .sort({ createdAt: -1 });
  res.json(events);
};

// Thêm hàm này vào cuối file backend/controllers/eventController.js
exports.getApprovedEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: 'Approved', isPublic: true })
      .populate('venue')
      .sort({ startDateTime: 1 }); // Sắp xếp sự kiện sắp diễn ra lên trước
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};