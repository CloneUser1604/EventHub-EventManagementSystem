const eventRepository = require('../repositories/event.repository');

class EventService {
  async getEvents(query, user) {
    const {
      page = 1, limit = 12,
      search, categoryId, venueId, status, approvalStatus,
      startDate, endDate, organizerId, timeStatus, isInternal, isOpenRegistration,
      sortBy = 'StartDate', sortOrder = 'ASC',
    } = query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const isAdmin = user?.Role === 'Admin';
    const isOrganizer = user?.Role === 'Organizer';

    const conditions = [];
    const params = [];

    if (isAdmin) {
      if (status) {
        if (status === 'all_published_cancelled') {
          conditions.push(`e.Status IN ('Published', 'Cancelled')`);
        } else {
          conditions.push(`e.Status = @Status`);
          params.push({ name: 'Status', type: require('../config/db').sql.VarChar(20), value: status });
        }
      }
      if (approvalStatus) {
        conditions.push(`e.ApprovalStatus = @ApprovalStatus`);
        params.push({ name: 'ApprovalStatus', type: require('../config/db').sql.VarChar(20), value: approvalStatus });
      }
    } else if (isOrganizer) {
      params.push({ name: 'OrgID', type: require('../config/db').sql.Int, value: user.UserID });
      if (status === 'all_published_cancelled') {
        conditions.push(`(e.Status IN ('Published', 'Cancelled') OR e.OrganizerID = @OrgID)`);
      } else if (status === 'Published') {
        conditions.push(`e.Status = 'Published'`);
      } else if (status) {
        conditions.push(`e.Status = @Status`);
        params.push({ name: 'Status', type: require('../config/db').sql.VarChar(20), value: status });
      } else {
        conditions.push(`(e.Status = 'Published' OR e.OrganizerID = @OrgID)`);
      }
    } else {
      if (status === 'all_published_cancelled') {
        conditions.push(`e.Status IN ('Published', 'Cancelled')`);
      } else if (status === 'Cancelled') {
        conditions.push(`e.Status = 'Cancelled'`);
      } else {
        conditions.push(`e.Status = 'Published'`);
      }
    }

    if (search) {
      conditions.push(`(e.Title LIKE @Search OR e.Description LIKE @Search)`);
      params.push({ name: 'Search', type: require('../config/db').sql.NVarChar, value: `%${search}%` });
    }
    if (categoryId) {
      conditions.push(`e.CategoryID = @CategoryID`);
      params.push({ name: 'CategoryID', type: require('../config/db').sql.Int, value: parseInt(categoryId) });
    }
    if (venueId) {
      conditions.push(`e.VenueID = @VenueID`);
      params.push({ name: 'VenueID', type: require('../config/db').sql.Int, value: parseInt(venueId) });
    }
    if (organizerId) {
      conditions.push(`e.OrganizerID = @OrganizerID`);
      params.push({ name: 'OrganizerID', type: require('../config/db').sql.Int, value: parseInt(organizerId) });
    }
    if (isInternal) {
      conditions.push(`e.IsInternalOnly = 1`);
    }

    if (startDate) {
      conditions.push(`e.StartDate >= @StartDate`);
      params.push({ name: 'StartDate', type: require('../config/db').sql.DateTime, value: new Date(startDate) });
    }
    if (endDate) {
      conditions.push(`e.EndDate <= @EndDate`);
      params.push({ name: 'EndDate', type: require('../config/db').sql.DateTime, value: new Date(endDate) });
    }

    if (timeStatus) {
      conditions.push(`e.Status != 'Cancelled'`);
      if (timeStatus === 'upcoming') {
        conditions.push(`e.StartDate > GETUTCDATE()`);
      } else if (timeStatus === 'ongoing') {
        conditions.push(`e.StartDate <= GETUTCDATE() AND e.EndDate >= GETUTCDATE()`);
      } else if (timeStatus === 'past') {
        conditions.push(`e.EndDate < GETUTCDATE()`);
      }
    }
    
    if (isOpenRegistration === 'true') {
      conditions.push(`e.Status != 'Cancelled'`);
      conditions.push(`(e.RegistrationDeadline > GETUTCDATE() OR (e.RegistrationDeadline IS NULL AND e.StartDate > GETUTCDATE()))`);
      conditions.push(`(e.MaxParticipants IS NULL OR e.MaxParticipants > (SELECT COUNT(*) FROM Registrations r WHERE r.EventID = e.EventID AND r.Status = 'Registered'))`);
    }

    if (isOpenRegistration === 'true') {
      conditions.push(`e.Status != 'Cancelled'`);
      conditions.push(`(e.RegistrationDeadline > GETUTCDATE() OR (e.RegistrationDeadline IS NULL AND e.StartDate > GETUTCDATE()))`);
      conditions.push(`(e.MaxParticipants IS NULL OR e.MaxParticipants > (SELECT COUNT(*) FROM Registrations r WHERE r.EventID = e.EventID AND r.Status = 'Registered'))`);
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    let orderCol = 'e.StartDate';
    let orderDir = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    if (['Title', 'CreatedAt', 'StartDate'].includes(sortBy)) {
      orderCol = `e.${sortBy}`;
    }

    const total = await eventRepository.countEvents(whereClause, params);
    let events = await eventRepository.findEvents(whereClause, params, orderCol, orderDir, offset, limit);

    events = events.map(e => {
      let orgDocs = [];
      let evDocs = [];
      try { if (e.OrganizerDocs) orgDocs = JSON.parse(e.OrganizerDocs); } catch(err) {}
      try { if (e.DocumentsURL) evDocs = JSON.parse(e.DocumentsURL); } catch(err) {}
      return { ...e, organizerDocuments: orgDocs, eventDocuments: evDocs };
    });

    return {
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  async getEventById(eventId, user) {
    let event = await eventRepository.findEventById(eventId);
    if (!event) throw new Error('NOT_FOUND');

    try {
      event.organizerDocuments = event.OrganizerDocs ? JSON.parse(event.OrganizerDocs) : [];
    } catch (e) {
      event.organizerDocuments = [];
    }

    try {
      event.eventDocuments = event.DocumentsURL ? JSON.parse(event.DocumentsURL) : [];
    } catch (e) {
      event.eventDocuments = [];
    }

    event.Sessions = await eventRepository.findEventSessions(eventId);

    if (user?.Role === 'Staff') {
      event.IsStaffForThisEvent = await eventRepository.checkIsStaff(eventId, user.UserID);
    }
    return event;
  }

  // [Tạo sự kiện] Kiểm tra quyền Organizer -> Validate dữ liệu -> Parse dates -> Gọi eventRepository.createEvent
  async createEvent(data, user, files) {
    if (user.Role === 'Organizer') {
      const approvalStatus = await eventRepository.getOrganizerApprovalStatus(user.UserID);
      if (approvalStatus !== 'Approved') {
        throw new Error('FORBIDDEN: Tài khoản ban tổ chức chưa được Admin phê duyệt.');
      }
    }

    let coverImageURL = data.coverImageURL || null;
    let documentsURL = null;

    if (files && files['coverImage'] && files['coverImage'].length > 0) {
      coverImageURL = files['coverImage'][0].filename;
    }
    if (files && files['documents'] && files['documents'].length > 0) {
      documentsURL = JSON.stringify(files['documents'].map(f => f.filename));
    } else {
      throw new Error('BAD_REQUEST: Tài liệu/Giấy phép sự kiện là bắt buộc');
    }

    const sDate = new Date(data.startDate);
    const eDate = new Date(data.endDate);
    if (eDate <= sDate) throw new Error('BAD_REQUEST: Thời gian kết thúc phải diễn ra sau thời gian bắt đầu');
    
    if (data.registrationDeadline) {
      const rDate = new Date(data.registrationDeadline);
      const oneDayBeforeStart = new Date(sDate.getTime() - 24 * 60 * 60 * 1000);
      if (rDate > oneDayBeforeStart) {
        throw new Error('BAD_REQUEST: Hạn đăng ký phải kết thúc ít nhất 1 ngày trước khi sự kiện bắt đầu');
      }
    }

    let parsedSessions = [];
    if (typeof data.sessions === 'string') {
      try { parsedSessions = JSON.parse(data.sessions); } catch (e) {}
    } else if (Array.isArray(data.sessions)) {
      parsedSessions = data.sessions;
    }

    for (const s of parsedSessions) {
      if (!s.startTime || !s.endTime) throw new Error(`BAD_REQUEST: Vui lòng chọn đầy đủ thời gian cho phiên "${s.title || 'Không tên'}"`);
      const sStart = new Date(s.startTime);
      const sEnd = new Date(s.endTime);
      if (sEnd <= sStart) throw new Error(`BAD_REQUEST: Thời gian kết thúc của phiên "${s.title || 'Không tên'}" phải sau thời gian bắt đầu`);
      if (sStart < sDate || sEnd > eDate) throw new Error(`BAD_REQUEST: Thời gian của phiên "${s.title || 'Không tên'}" phải nằm trong thời gian sự kiện`);
      
      if (s.speakerEmails && Array.isArray(s.speakerEmails)) {
        for (const email of s.speakerEmails) {
          const speaker = await eventRepository.findUserByEmail(email);
          if (!speaker || speaker.Role !== 'Speaker') {
            throw new Error(`BAD_REQUEST: Email diễn giả "${email}" chưa có tài khoản trong hệ thống. Vui lòng bấm 'Tạo diễn giả' để thêm tài khoản trước.`);
          }
        }
      }
    }

    if (data.venueId) {
      const overlap = await eventRepository.checkVenueOverlap(data.venueId, sDate, eDate);
      if (overlap.length > 0) {
        throw new Error(`BAD_REQUEST: Địa điểm này đã được đặt cho sự kiện "${overlap[0].Title}".`);
      }
    }

    const newEvent = await eventRepository.createEvent({
      ...data,
      organizerId: user.UserID,
      coverImageURL,
      documentsURL,
      startDate: sDate,
      endDate: eDate,
      isInternalOnly: data.isInternalOnly === true || data.isInternalOnly === 'true'
    });

    for (const s of parsedSessions) {
      const sessionId = await eventRepository.createSession({
        ...s,
        eventId: newEvent.EventID,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime)
      });
      if (s.speakerEmails && Array.isArray(s.speakerEmails)) {
        for (const email of s.speakerEmails) {
          const speaker = await eventRepository.findUserByEmail(email);
          if (speaker && speaker.Role === 'Speaker') {
            await eventRepository.addSpeakerToSession(sessionId, speaker.UserID, newEvent.EventID, user.UserID);
          }
        }
      }
    }
    return { eventId: newEvent.EventID };
  }

  // [Cập nhật sự kiện] Kiểm tra quyền sở hữu -> Validate trạng thái -> Gọi eventRepository.updateEvent
  async updateEvent(eventId, data, user, files) {
    const event = await eventRepository.findEventById(eventId);
    if (!event) throw new Error('NOT_FOUND: Không tìm thấy sự kiện');

    const isOwner = user.UserID === event.OrganizerID;
    const isAdmin = user.Role === 'Admin';
    if (!isOwner && !isAdmin) throw new Error('FORBIDDEN');
    if (!isAdmin && event.EditLockedAt && !event.AdminEditUnlock) throw new Error('FORBIDDEN: Sự kiện đã bị khoá chỉnh sửa.');
    if (['Cancelled','Completed'].includes(event.Status) && !isAdmin) throw new Error('FORBIDDEN: Không thể chỉnh sửa sự kiện đã kết thúc/huỷ');

    const sDate = data.startDate ? new Date(data.startDate) : new Date(event.StartDate);
    const eDate = data.endDate ? new Date(data.endDate) : new Date(event.EndDate);
    if (eDate <= sDate) throw new Error('BAD_REQUEST: Thời gian kết thúc phải diễn ra sau thời gian bắt đầu');
    
    const rDateString = data.registrationDeadline !== undefined ? data.registrationDeadline : event.RegistrationDeadline;
    if (rDateString) {
      const rDate = new Date(rDateString);
      const oneDayBeforeStart = new Date(sDate.getTime() - 24 * 60 * 60 * 1000);
      if (rDate > oneDayBeforeStart) throw new Error('BAD_REQUEST: Hạn đăng ký phải kết thúc ít nhất 1 ngày trước');
    }

    let parsedSessions = [];
    if (typeof data.sessions === 'string') {
      try { parsedSessions = JSON.parse(data.sessions); } catch (e) {}
    } else if (Array.isArray(data.sessions)) {
      parsedSessions = data.sessions;
    }

    if (parsedSessions.length > 0) {
      for (const s of parsedSessions) {
        const sStart = new Date(s.startTime);
        const sEnd = new Date(s.endTime);
        if (sEnd <= sStart) throw new Error(`BAD_REQUEST: Thời gian kết thúc của phiên "${s.title}" phải sau thời gian bắt đầu`);
        if (sStart < sDate || sEnd > eDate) throw new Error(`BAD_REQUEST: Thời gian của phiên "${s.title}" phải nằm trong thời gian sự kiện`);
        
        if (s.speakerEmails && Array.isArray(s.speakerEmails)) {
          for (const email of s.speakerEmails) {
            const speaker = await eventRepository.findUserByEmail(email);
            if (!speaker || speaker.Role !== 'Speaker') {
              throw new Error(`BAD_REQUEST: Email diễn giả "${email}" chưa có tài khoản trong hệ thống. Vui lòng bấm 'Tạo diễn giả' để thêm tài khoản trước.`);
            }
          }
        }
      }
    }

    if (data.venueId !== undefined && data.venueId !== null) {
      const overlap = await eventRepository.checkVenueOverlap(data.venueId, sDate, eDate, eventId);
      if (overlap.length > 0) throw new Error(`BAD_REQUEST: Địa điểm đã được đặt cho sự kiện "${overlap[0].Title}".`);
    }

    let coverImageURL = data.coverImageURL;
    if (files && files['coverImage'] && files['coverImage'].length > 0) {
      coverImageURL = files['coverImage'][0].filename;
    }

    const editLockedAt = (!event.EditLockedAt && new Date() > new Date(new Date(event.CreatedAt).getTime() + 3*24*60*60*1000)) ? new Date() : event.EditLockedAt;

    const { sql } = require('../config/db');

    if (!isAdmin && event.Status === 'Published') {
      if (new Date(event.StartDate) <= new Date()) throw new Error('FORBIDDEN: Không thể chỉnh sửa sự kiện đã hoặc đang diễn ra');
      if (!data.editReason) throw new Error('BAD_REQUEST: Vui lòng cung cấp lý do chỉnh sửa');
      
      const proposedChanges = JSON.stringify({
        title: data.title || event.Title, 
        description: data.description !== undefined ? data.description : event.Description, 
        coverImageURL: coverImageURL !== undefined ? coverImageURL : event.CoverImageURL, 
        startDate: data.startDate ? new Date(data.startDate).toISOString() : event.StartDate, 
        endDate: data.endDate ? new Date(data.endDate).toISOString() : event.EndDate, 
        registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline).toISOString() : event.RegistrationDeadline, 
        maxParticipants: data.maxParticipants !== undefined ? data.maxParticipants : event.MaxParticipants, 
        categoryId: data.categoryId !== undefined ? data.categoryId : event.CategoryID, 
        venueId: data.venueId !== undefined ? data.venueId : event.VenueID,
        isInternalOnly: data.isInternalOnly !== undefined ? (data.isInternalOnly === true || data.isInternalOnly === 'true' ? 1 : 0) : event.IsInternalOnly,
        sessions: parsedSessions.length > 0 ? parsedSessions : undefined
      });

      await eventRepository.updateEvent(eventId, {
        ProposedChanges: { type: sql.NVarChar(sql.MAX), value: proposedChanges },
        EditReason: { type: sql.NVarChar(sql.MAX), value: data.editReason },
        ApprovalStatus: { type: sql.VarChar(50), value: 'Pending' }
      });
      
      const admins = await eventRepository.getAdmins();
      for (const admin of admins) {
        await eventRepository.createNotification({
          userId: admin.UserID,
          title: `Yêu cầu chỉnh sửa sự kiện: ${event.Title}`,
          message: `Lý do: ${data.editReason}`,
          type: 'EventApproval',
          relatedId: eventId,
          relatedType: 'Event'
        });
      }
      return { message: 'Đã gửi yêu cầu chỉnh sửa cho Admin phê duyệt' };
    }

    const updateData = {
      CategoryID: { type: sql.Int, value: data.categoryId !== undefined ? data.categoryId : event.CategoryID },
      VenueID: { type: sql.Int, value: data.venueId !== undefined ? data.venueId : event.VenueID },
      Title: { type: sql.NVarChar(300), value: data.title || event.Title },
      Description: { type: sql.NVarChar(sql.MAX), value: data.description !== undefined ? data.description : event.Description },
      CoverImageURL: { type: sql.VarChar(500), value: coverImageURL !== undefined ? coverImageURL : event.CoverImageURL },
      StartDate: { type: sql.DateTime, value: sDate },
      EndDate: { type: sql.DateTime, value: eDate },
      RegistrationDeadline: { type: sql.DateTime, value: rDateString ? new Date(rDateString) : event.RegistrationDeadline },
      MaxParticipants: { type: sql.Int, value: data.maxParticipants !== undefined ? data.maxParticipants : event.MaxParticipants },
      IsInternalOnly: { type: sql.Bit, value: data.isInternalOnly !== undefined ? (data.isInternalOnly === true || data.isInternalOnly === 'true' ? 1 : 0) : event.IsInternalOnly },
      EditLockedAt: { type: sql.DateTime, value: editLockedAt || null }
    };

    await eventRepository.updateEvent(eventId, updateData);

    if (parsedSessions.length > 0) {
      const oldInvs = await eventRepository.getSpeakerInvitations(eventId);
      const oldInvMap = {};
      oldInvs.forEach(i => oldInvMap[i.SpeakerID] = i.Status);

      await eventRepository.clearEventSessionsAndSpeakers(eventId);

      for (const s of parsedSessions) {
        const sessionId = await eventRepository.createSession({
          ...s,
          eventId: eventId,
          startTime: new Date(s.startTime),
          endTime: new Date(s.endTime)
        });
        if (s.speakerEmails && Array.isArray(s.speakerEmails)) {
          for (const email of s.speakerEmails) {
            const speaker = await eventRepository.findUserByEmail(email);
            if (speaker && speaker.Role === 'Speaker') {
              const prevStatus = oldInvMap[speaker.UserID] || 'Pending';
              await eventRepository.addSpeakerToSession(sessionId, speaker.UserID, eventId, user.UserID, prevStatus);
            }
          }
        }
      }
    }
    return { message: 'Cập nhật sự kiện thành công' };
  }

  async deleteEvent(eventId, user) {
    const event = await eventRepository.findEventById(eventId);
    if (!event) throw new Error('NOT_FOUND: Không tìm thấy sự kiện');
    if (user.UserID !== event.OrganizerID && user.Role !== 'Admin') throw new Error('FORBIDDEN');
    if (!['Draft','Rejected'].includes(event.Status) && user.Role !== 'Admin') throw new Error('FORBIDDEN: Chỉ xoá được sự kiện ở trạng thái Nháp hoặc Bị từ chối');
    await eventRepository.deleteEvent(eventId);
  }

  async submitForApproval(eventId, user) {
    const event = await eventRepository.findEventById(eventId);
    if (!event) throw new Error('NOT_FOUND: Không tìm thấy sự kiện');
    if (event.OrganizerID !== user.UserID) throw new Error('FORBIDDEN');
    if (event.ApprovalStatus === 'Pending') throw new Error('BAD_REQUEST: Sự kiện đang chờ duyệt');
    if (event.ApprovalStatus === 'Approved') throw new Error('BAD_REQUEST: Sự kiện đã được duyệt');

    const { sql } = require('../config/db');
    await eventRepository.updateEvent(eventId, {
      ApprovalStatus: { type: sql.VarChar(50), value: 'Pending' },
      Status: { type: sql.VarChar(20), value: 'PendingApproval' }
    });

    const admins = await eventRepository.getAdmins();
    for (const admin of admins) {
      await eventRepository.createNotification({
        userId: admin.UserID,
        title: 'Sự kiện mới cần duyệt',
        message: `Sự kiện "${event.Title}" đang chờ phê duyệt`,
        type: 'EventApproval',
        relatedId: eventId,
        relatedType: 'Event'
      });
    }
  }

  // [Hủy sự kiện] Lấy thông tin sự kiện -> Kiểm tra quyền sở hữu -> Gọi eventRepository.cancelEvent -> Gửi thông báo
  async cancelEvent(eventId, reason, user) {
    const event = await eventRepository.findEventById(eventId);
    if (!event) throw new Error('NOT_FOUND: Không tìm thấy sự kiện');
    if (user.UserID !== event.OrganizerID && user.Role !== 'Admin') throw new Error('FORBIDDEN');
    if (['Completed','Cancelled'].includes(event.Status)) throw new Error('BAD_REQUEST: Sự kiện đã kết thúc hoặc huỷ');

    const { sql } = require('../config/db');
    await eventRepository.updateEvent(eventId, {
      Status: { type: sql.VarChar(20), value: 'Cancelled' }
    });

    const regs = await eventRepository.getEventRegistrations(eventId);
    for (const reg of regs) {
      await eventRepository.createNotification({
        userId: reg.ParticipantID,
        title: '⚠️ Sự kiện đã bị huỷ',
        message: `Sự kiện "${event.Title}" đã bị huỷ.${reason ? ' Lý do: '+reason : ''}`,
        type: 'General',
        relatedId: eventId,
        relatedType: 'Event'
      });
    }
  }

  async getSessions(eventId) {
    return await eventRepository.findEventSessions(eventId);
  }

  async addSession(eventId, data, user) {
    const event = await eventRepository.findEventById(eventId);
    if (!event) throw new Error('NOT_FOUND: Không tìm thấy sự kiện');
    if (event.OrganizerID !== user.UserID && user.Role !== 'Admin') throw new Error('FORBIDDEN');
    const sessionId = await eventRepository.createSession({ ...data, eventId, startTime: new Date(data.startTime), endTime: new Date(data.endTime) });
    return await eventRepository.findSessionById(sessionId, eventId);
  }

  async updateSession(eventId, sessionId, data, user) {
    const session = await eventRepository.findSessionById(sessionId, eventId);
    if (!session) throw new Error('NOT_FOUND: Không tìm thấy phiên');
    if (session.OrganizerID !== user.UserID && user.Role !== 'Admin') throw new Error('FORBIDDEN');
    await eventRepository.updateSession(sessionId, { ...data, startTime: new Date(data.startTime), endTime: new Date(data.endTime) });
  }

  async deleteSession(eventId, sessionId, user) {
    const session = await eventRepository.findSessionById(sessionId, eventId);
    if (!session) throw new Error('NOT_FOUND: Không tìm thấy phiên');
    if (session.OrganizerID !== user.UserID && user.Role !== 'Admin') throw new Error('FORBIDDEN');
    await eventRepository.deleteSession(sessionId);
  }

  async unlockEventEdit(eventId) {
    await eventRepository.unlockEventEdit(eventId);
  }

  async getCategories() {
    return await eventRepository.getCategories();
  }

  async getVenues() {
    return await eventRepository.getVenues();
  }

  async getDashboardStats(timeRange) {
    const formatStr = (timeRange === 'day' || timeRange === 'week') ? 'yyyy-MM-dd' : 'yyyy-MM';
    let dateLimit = 'DATEADD(month, -6, GETDATE())';
    if (timeRange === 'day') dateLimit = 'DATEADD(day, -30, GETDATE())';
    if (timeRange === 'week') dateLimit = 'DATEADD(day, -7, GETDATE())';
    return await eventRepository.getDashboardStats(dateLimit, formatStr);
  }

  async getEventSpeakers(eventId) {
    return await eventRepository.getEventSpeakers(eventId);
  }
}

module.exports = new EventService();
