const eventRepository = require('../repositories/event.repository');
const { sql } = require('../config/db');

class EventService {
  // ─── GET EVENTS ──────────────────────────────────────────────
async getEvents(query, user) {
    const {
      page = 1, limit = 12,
      search, categoryId, venueId, status, approvalStatus,
      startDate, endDate, organizerId, timeStatus, isInternal,
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
          params.push({ name: 'Status', type: sql.VarChar(20), value: status });
        }
      }
      if (approvalStatus) {
        conditions.push(`e.ApprovalStatus = @ApprovalStatus`);
        params.push({ name: 'ApprovalStatus', type: sql.VarChar(20), value: approvalStatus });
      }
    } else if (isOrganizer) {
      params.push({ name: 'OrgID', type: sql.Int, value: user.UserID });
      if (status === 'all_published_cancelled') {
        conditions.push(`(e.Status IN ('Published', 'Cancelled') OR e.OrganizerID = @OrgID)`);
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
      params.push({ name: 'Search', type: sql.NVarChar, value: `%${search}%` });
    }
    if (categoryId) {
      conditions.push(`e.CategoryID = @CategoryID`);
      params.push({ name: 'CategoryID', type: sql.Int, value: parseInt(categoryId) });
    }
    if (venueId) {
      conditions.push(`e.VenueID = @VenueID`);
      params.push({ name: 'VenueID', type: sql.Int, value: parseInt(venueId) });
    }
    if (startDate) {
      conditions.push(`e.StartDate >= @StartDate`);
      params.push({ name: 'StartDate', type: sql.DateTime, value: new Date(startDate) });
    }
    if (endDate) {
      conditions.push(`e.EndDate <= @EndDate`);
      params.push({ name: 'EndDate', type: sql.DateTime, value: new Date(endDate) });
    }
    if (timeStatus === 'upcoming') {
      conditions.push(`e.StartDate > GETDATE()`);
    } else if (timeStatus === 'ongoing') {
      conditions.push(`e.StartDate <= GETDATE() AND e.EndDate >= GETDATE()`);
    } else if (timeStatus === 'past') {
      conditions.push(`e.EndDate < GETDATE()`);
    }
    if (isInternal === 'true') {
      conditions.push(`e.IsInternalOnly = 1`);
    } else if (isInternal === 'false') {
      conditions.push(`e.IsInternalOnly = 0`);
    }
    if (organizerId && (isAdmin || isOrganizer)) {
      conditions.push(`e.OrganizerID = @OrganizerID`);
      params.push({ name: 'OrganizerID', type: sql.Int, value: parseInt(organizerId) });
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';
    const validSortCols = { StartDate: 'e.StartDate', Title: 'e.Title', CreatedAt: 'e.CreatedAt', Rating: 'AverageRating', Participants: 'RegisteredCount' };
    const orderCol = validSortCols[sortBy] || 'e.StartDate';
    const orderDir = sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const total = await eventRepository.countEvents(whereClause, params);
    const events = await eventRepository.findEvents(whereClause, params, orderCol, orderDir, offset, parseInt(limit));

    return {
      events,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    };
  }

  // ─── GET EVENT BY ID ──────────────────────────────────────────────
async getEventById(id, user) {
    const event = await eventRepository.findEventById(id);
    if (!event) throw new Error('NOT_FOUND');

    const isOwner = user?.UserID === event.OrganizerID;
    const isAdmin = user?.Role === 'Admin';
    if (!isAdmin && !isOwner && event.Status !== 'Published' && event.Status !== 'Cancelled') {
      throw new Error('NOT_FOUND');
    }

    const sessionsRaw = await eventRepository.findEventSessions(id);
    const sessions = sessionsRaw.map(s => {
      s.speakerEmails = s.speakerEmailsStr ? s.speakerEmailsStr.split(',') : [];
      delete s.speakerEmailsStr;
      return s;
    });

    let isStaff = false;
    if (user) {
      isStaff = await eventRepository.checkIsStaff(id, user.UserID);
    }

    return { ...event, sessions, isStaff };
  }
}

module.exports = new EventService();
