-- ============================================================
-- EVENT MANAGEMENT SYSTEM (EMS) - Database Schema
-- SQL Server
-- ============================================================

-- Drop existing tables in reverse dependency order
IF OBJECT_ID('EventSponsors', 'U') IS NOT NULL DROP TABLE EventSponsors;
IF OBJECT_ID('Sponsors', 'U') IS NOT NULL DROP TABLE Sponsors;
IF OBJECT_ID('Notifications', 'U') IS NOT NULL DROP TABLE Notifications;
IF OBJECT_ID('BlogCommentLikes', 'U') IS NOT NULL DROP TABLE BlogCommentLikes;
IF OBJECT_ID('BlogComments', 'U') IS NOT NULL DROP TABLE BlogComments;
IF OBJECT_ID('BlogLikes', 'U') IS NOT NULL DROP TABLE BlogLikes;
IF OBJECT_ID('BlogPollVotes', 'U') IS NOT NULL DROP TABLE BlogPollVotes;
IF OBJECT_ID('Reports', 'U') IS NOT NULL DROP TABLE Reports;
IF OBJECT_ID('SavedBlogs', 'U') IS NOT NULL DROP TABLE SavedBlogs;
IF OBJECT_ID('Blogs', 'U') IS NOT NULL DROP TABLE Blogs;
IF OBJECT_ID('SurveyResponses', 'U') IS NOT NULL DROP TABLE SurveyResponses;
IF OBJECT_ID('SurveyQuestions', 'U') IS NOT NULL DROP TABLE SurveyQuestions;
IF OBJECT_ID('Surveys', 'U') IS NOT NULL DROP TABLE Surveys;
IF OBJECT_ID('Attendance', 'U') IS NOT NULL DROP TABLE Attendance;
IF OBJECT_ID('QRTickets', 'U') IS NOT NULL DROP TABLE QRTickets;
IF OBJECT_ID('Registrations', 'U') IS NOT NULL DROP TABLE Registrations;
IF OBJECT_ID('EventStaffs', 'U') IS NOT NULL DROP TABLE EventStaffs;
IF OBJECT_ID('SessionSpeakers', 'U') IS NOT NULL DROP TABLE SessionSpeakers;
IF OBJECT_ID('SpeakerInvitations', 'U') IS NOT NULL DROP TABLE SpeakerInvitations;
IF OBJECT_ID('Sessions', 'U') IS NOT NULL DROP TABLE Sessions;
IF OBJECT_ID('Events', 'U') IS NOT NULL DROP TABLE Events;
IF OBJECT_ID('Venues', 'U') IS NOT NULL DROP TABLE Venues;
IF OBJECT_ID('Categories', 'U') IS NOT NULL DROP TABLE Categories;
IF OBJECT_ID('SpeakerProfiles', 'U') IS NOT NULL DROP TABLE SpeakerProfiles;
IF OBJECT_ID('OrganizerProfiles', 'U') IS NOT NULL DROP TABLE OrganizerProfiles;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
IF OBJECT_ID('Feedbacks', 'U') IS NOT NULL DROP TABLE Feedbacks;

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE Users (
  UserID       INT IDENTITY(1,1) PRIMARY KEY,
  FullName     NVARCHAR(150)  NOT NULL,
  Email        VARCHAR(255)   NOT NULL UNIQUE,
  PasswordHash VARCHAR(255)   NOT NULL,
  Role         VARCHAR(20)    NOT NULL CHECK (Role IN ('Admin','Organizer','Staff','Participant','Speaker')),
  AvatarURL    VARCHAR(500)   NULL,
  Phone        VARCHAR(20)    NULL,
  University   NVARCHAR(150)  NULL,
  IsActive     BIT            NOT NULL DEFAULT 1,
  IsVerified   BIT            NOT NULL DEFAULT 0,
  MustChangePassword BIT      NOT NULL DEFAULT 0,
  -- For email verification / password reset
  VerifyToken       VARCHAR(255) NULL,
  VerifyTokenExpiry DATETIME     NULL,
  ResetToken        VARCHAR(255) NULL,
  ResetTokenExpiry  DATETIME     NULL,
  -- Refresh token
  RefreshToken      VARCHAR(500) NULL,
  RefreshTokenExpiry DATETIME    NULL,
  CreatedAt    DATETIME       NOT NULL DEFAULT GETDATE(),
  UpdatedAt    DATETIME       NOT NULL DEFAULT GETDATE()
);

-- ============================================================
-- 2. ORGANIZER PROFILES
-- ============================================================
CREATE TABLE OrganizerProfiles (
  OrganizerProfileID INT IDENTITY(1,1) PRIMARY KEY,
  UserID             INT            NOT NULL UNIQUE REFERENCES Users(UserID) ON DELETE CASCADE,
  OrganizationName   NVARCHAR(200)  NOT NULL,
  Description        NVARCHAR(MAX)  NULL,
  DocumentURL        VARCHAR(500)   NULL,  -- Uploaded verification document
  ApprovalStatus     VARCHAR(20)    NOT NULL DEFAULT 'Pending'
                       CHECK (ApprovalStatus IN ('Pending','Approved','Rejected')),
  ApprovedBy         INT            NULL REFERENCES Users(UserID),
  ApprovedAt         DATETIME       NULL,
  RejectionReason    NVARCHAR(500)  NULL,
  CreatedAt          DATETIME       NOT NULL DEFAULT GETDATE(),
  UpdatedAt          DATETIME       NOT NULL DEFAULT GETDATE()
);

-- ============================================================
-- 3. SPEAKER PROFILES
-- ============================================================
CREATE TABLE SpeakerProfiles (
  SpeakerProfileID INT IDENTITY(1,1) PRIMARY KEY,
  UserID           INT            NOT NULL UNIQUE REFERENCES Users(UserID) ON DELETE CASCADE,
  Bio              NVARCHAR(MAX)  NULL,
  Expertise        NVARCHAR(500)  NULL,
  LinkedInURL      VARCHAR(500)   NULL,
  WebsiteURL       VARCHAR(500)   NULL,
  CreatedAt        DATETIME       NOT NULL DEFAULT GETDATE(),
  UpdatedAt        DATETIME       NOT NULL DEFAULT GETDATE()
);

-- ============================================================
-- 4. CATEGORIES
-- ============================================================
CREATE TABLE Categories (
  CategoryID   INT IDENTITY(1,1) PRIMARY KEY,
  Name         NVARCHAR(100)  NOT NULL UNIQUE,
  Description  NVARCHAR(500)  NULL,
  IconURL      VARCHAR(500)   NULL,
  IsActive     BIT            NOT NULL DEFAULT 1,
  CreatedAt    DATETIME       NOT NULL DEFAULT GETDATE()
);

-- ============================================================
-- 5. VENUES
-- ============================================================
CREATE TABLE Venues (
  VenueID     INT IDENTITY(1,1) PRIMARY KEY,
  Name        NVARCHAR(200)  NOT NULL,
  Address     NVARCHAR(500)  NOT NULL,
  Capacity    INT            NULL,
  Description NVARCHAR(MAX)  NULL,
  MapURL      VARCHAR(500)   NULL,
  IsActive    BIT            NOT NULL DEFAULT 1,
  CreatedAt   DATETIME       NOT NULL DEFAULT GETDATE()
);

-- ============================================================
-- 6. EVENTS
-- ============================================================
CREATE TABLE Events (
  EventID          INT IDENTITY(1,1) PRIMARY KEY,
  OrganizerID      INT            NOT NULL REFERENCES Users(UserID),
  CategoryID       INT            NULL REFERENCES Categories(CategoryID),
  VenueID          INT            NULL REFERENCES Venues(VenueID),
  Title            NVARCHAR(300)  NOT NULL,
  Description      NVARCHAR(MAX)  NULL,
  CoverImageURL    VARCHAR(500)   NULL,
  DocumentsURL     NVARCHAR(MAX)  NULL,
  StartDate        DATETIME       NOT NULL,
  EndDate          DATETIME       NOT NULL,
  RegistrationDeadline DATETIME   NULL,
  MaxParticipants  INT            NULL,
  IsInternalOnly   BIT            NOT NULL DEFAULT 0,
  Status           VARCHAR(20)    NOT NULL DEFAULT 'Draft'
                     CHECK (Status IN ('Draft','PendingApproval','Approved','Rejected','Published','Cancelled','Completed')),
  ApprovalStatus   VARCHAR(20)    NOT NULL DEFAULT 'NotSubmitted'
                     CHECK (ApprovalStatus IN ('NotSubmitted','Pending','Approved','Rejected')),
  ApprovedBy       INT            NULL REFERENCES Users(UserID),
  ApprovedAt       DATETIME       NULL,
  RejectionReason  NVARCHAR(500)  NULL,
  -- Lock edit after 3 days unless admin permits
  EditLockedAt     DATETIME       NULL,
  AdminEditUnlock  BIT            NOT NULL DEFAULT 0,
  ProposedChanges  NVARCHAR(MAX)  NULL,
  EditReason       NVARCHAR(500)  NULL,
  CreatedAt        DATETIME       NOT NULL DEFAULT GETDATE(),
  UpdatedAt        DATETIME       NOT NULL DEFAULT GETDATE()
);

-- ============================================================
-- 7. SESSIONS (Sub-sessions within an Event)
-- ============================================================
CREATE TABLE Sessions (
  SessionID    INT IDENTITY(1,1) PRIMARY KEY,
  EventID      INT            NOT NULL REFERENCES Events(EventID) ON DELETE CASCADE,
  Title        NVARCHAR(300)  NOT NULL,
  Description  NVARCHAR(MAX)  NULL,
  StartTime    DATETIME       NOT NULL,
  EndTime      DATETIME       NOT NULL,
  Location     NVARCHAR(300)  NULL,  -- Room or stage within the venue
  CreatedAt    DATETIME       NOT NULL DEFAULT GETDATE()
);

-- ============================================================
-- 8. SPEAKER INVITATIONS
-- ============================================================
CREATE TABLE SpeakerInvitations (
  InvitationID INT IDENTITY(1,1) PRIMARY KEY,
  EventID      INT            NOT NULL REFERENCES Events(EventID) ON DELETE CASCADE,
  SpeakerID    INT            NOT NULL REFERENCES Users(UserID),
  InvitedBy    INT            NOT NULL REFERENCES Users(UserID),
  Message      NVARCHAR(MAX)  NULL,
  Status       VARCHAR(20)    NOT NULL DEFAULT 'Pending'
                 CHECK (Status IN ('Pending','Accepted','Declined')),
  RespondedAt  DATETIME       NULL,
  CreatedAt    DATETIME       NOT NULL DEFAULT GETDATE(),
  UNIQUE (EventID, SpeakerID)
);

-- ============================================================
-- 9. SESSION SPEAKERS
-- ============================================================
CREATE TABLE SessionSpeakers (
  SessionSpeakerID INT IDENTITY(1,1) PRIMARY KEY,
  SessionID        INT NOT NULL REFERENCES Sessions(SessionID) ON DELETE CASCADE,
  SpeakerID        INT NOT NULL REFERENCES Users(UserID),
  Role             NVARCHAR(100) NULL,  -- e.g., Keynote, Panelist
  UNIQUE (SessionID, SpeakerID)
);

-- ============================================================
-- 10. EVENT STAFFS
-- ============================================================
CREATE TABLE EventStaffs (
  EventStaffID INT IDENTITY(1,1) PRIMARY KEY,
  EventID      INT NOT NULL REFERENCES Events(EventID) ON DELETE CASCADE,
  StaffID      INT NOT NULL REFERENCES Users(UserID),
  AssignedBy   INT NOT NULL REFERENCES Users(UserID),
  AssignedAt   DATETIME NOT NULL DEFAULT GETDATE(),
  UNIQUE (EventID, StaffID)
);


-- ============================================================
-- 11. REGISTRATIONS
-- ============================================================
CREATE TABLE Registrations (
  RegistrationID   INT IDENTITY(1,1) PRIMARY KEY,
  EventID          INT            NOT NULL REFERENCES Events(EventID),
  ParticipantID    INT            NOT NULL REFERENCES Users(UserID),
  Status           VARCHAR(20)    NOT NULL DEFAULT 'Registered'
                     CHECK (Status IN ('Registered','Cancelled','WaitingList')),
  RegisteredAt     DATETIME       NOT NULL DEFAULT GETDATE(),
  CancelledAt      DATETIME       NULL,
  CancellationNote NVARCHAR(500)  NULL,
  UNIQUE (EventID, ParticipantID)
);

-- ============================================================
-- 12. QR TICKETS
-- ============================================================
CREATE TABLE QRTickets (
  TicketID       INT IDENTITY(1,1) PRIMARY KEY,
  RegistrationID INT            NOT NULL UNIQUE REFERENCES Registrations(RegistrationID) ON DELETE CASCADE,
  QRCode         VARCHAR(500)   NOT NULL UNIQUE,  -- Unique token for QR
  OTPCode        VARCHAR(10)    NOT NULL,
  OTPExpiry      DATETIME       NOT NULL,
  IsUsed         BIT            NOT NULL DEFAULT 0,
  GeneratedAt    DATETIME       NOT NULL DEFAULT GETDATE()
);

-- ============================================================
-- 13. ATTENDANCE
-- ============================================================
CREATE TABLE Attendance (
  AttendanceID   INT IDENTITY(1,1) PRIMARY KEY,
  RegistrationID INT            NOT NULL UNIQUE REFERENCES Registrations(RegistrationID),
  CheckedInBy    INT            NOT NULL REFERENCES Users(UserID),  -- Staff who scanned
  CheckInTime    DATETIME       NOT NULL DEFAULT GETDATE(),
  Status         VARCHAR(20)    NOT NULL DEFAULT 'Present'
                   CHECK (Status IN ('Present','Late','Absent'))
);

-- ============================================================
-- 14. SURVEYS
-- ============================================================
CREATE TABLE Surveys (
  SurveyID    INT IDENTITY(1,1) PRIMARY KEY,
  EventID     INT            NOT NULL REFERENCES Events(EventID) ON DELETE CASCADE,
  CreatedBy   INT            NOT NULL REFERENCES Users(UserID),
  Title       NVARCHAR(300)  NOT NULL,
  Description NVARCHAR(MAX)  NULL,
  IsActive    BIT            NOT NULL DEFAULT 1,
  StartsAt    DATETIME       NULL,
  EndsAt      DATETIME       NULL,
  CreatedAt   DATETIME       NOT NULL DEFAULT GETDATE()
);

-- ============================================================
-- 15. SURVEY QUESTIONS
-- ============================================================
CREATE TABLE SurveyQuestions (
  QuestionID   INT IDENTITY(1,1) PRIMARY KEY,
  SurveyID     INT            NOT NULL REFERENCES Surveys(SurveyID) ON DELETE CASCADE,
  QuestionText NVARCHAR(500)  NOT NULL,
  QuestionType VARCHAR(20)    NOT NULL DEFAULT 'Text'
                 CHECK (QuestionType IN ('Text','Rating','SingleChoice','MultipleChoice')),
  Options      NVARCHAR(MAX)  NULL,  -- JSON array for choices
  IsRequired   BIT            NOT NULL DEFAULT 1,
  OrderIndex   INT            NOT NULL DEFAULT 0
);

-- ============================================================
-- 16. SURVEY RESPONSES
-- ============================================================
CREATE TABLE SurveyResponses (
  ResponseID    INT IDENTITY(1,1) PRIMARY KEY,
  SurveyID      INT            NOT NULL REFERENCES Surveys(SurveyID),
  QuestionID    INT            NOT NULL REFERENCES SurveyQuestions(QuestionID),
  ParticipantID INT            NOT NULL REFERENCES Users(UserID),
  Answer        NVARCHAR(MAX)  NOT NULL,
  SubmittedAt   DATETIME       NOT NULL DEFAULT GETDATE(),
  UNIQUE (QuestionID, ParticipantID)
);

-- ============================================================
-- 17. BLOGS
-- ============================================================
CREATE TABLE Blogs (
  BlogID      INT IDENTITY(1,1) PRIMARY KEY,
  AuthorID    INT            NOT NULL REFERENCES Users(UserID),
  EventID     INT            NULL REFERENCES Events(EventID),
  Title       NVARCHAR(300)  NOT NULL,
  Content     NVARCHAR(MAX)  NOT NULL,
  CoverURL    VARCHAR(500)   NULL,
  Images      NVARCHAR(MAX)  NULL,
  PollQuestion NVARCHAR(500) NULL,
  PollOptions NVARCHAR(MAX)  NULL,
  IsPublished BIT            NOT NULL DEFAULT 0,
  PublishedAt DATETIME       NULL,
  CreatedAt   DATETIME       NOT NULL DEFAULT GETDATE(),
  UpdatedAt   DATETIME       NOT NULL DEFAULT GETDATE()
);

-- ============================================================
-- 17a. BLOG LIKES
-- ============================================================
CREATE TABLE BlogLikes (
  LikeID      INT IDENTITY(1,1) PRIMARY KEY,
  BlogID      INT NOT NULL REFERENCES Blogs(BlogID) ON DELETE CASCADE,
  UserID      INT NOT NULL REFERENCES Users(UserID),
  CreatedAt   DATETIME DEFAULT GETDATE(),
  UNIQUE(BlogID, UserID)
);

-- ============================================================
-- 17b. BLOG COMMENTS
-- ============================================================
CREATE TABLE BlogComments (
  CommentID       INT IDENTITY(1,1) PRIMARY KEY,
  BlogID          INT NOT NULL REFERENCES Blogs(BlogID) ON DELETE CASCADE,
  UserID          INT NOT NULL REFERENCES Users(UserID),
  Content         NVARCHAR(MAX) NOT NULL,
  ImageURL        NVARCHAR(MAX) NULL,
  ParentCommentID INT NULL REFERENCES BlogComments(CommentID),
  CreatedAt       DATETIME DEFAULT GETDATE(),
  UpdatedAt       DATETIME DEFAULT GETDATE()
);

-- ============================================================
-- 17c. BLOG COMMENT LIKES
-- ============================================================
CREATE TABLE BlogCommentLikes (
  LikeID      INT IDENTITY(1,1) PRIMARY KEY,
  CommentID   INT NOT NULL REFERENCES BlogComments(CommentID) ON DELETE CASCADE,
  UserID      INT NOT NULL REFERENCES Users(UserID),
  CreatedAt   DATETIME DEFAULT GETDATE(),
  UNIQUE(CommentID, UserID)
);

-- ============================================================
-- 17d. BLOG POLL VOTES
-- ============================================================
CREATE TABLE BlogPollVotes (
  VoteID      INT IDENTITY(1,1) PRIMARY KEY,
  BlogID      INT NOT NULL REFERENCES Blogs(BlogID) ON DELETE CASCADE,
  UserID      INT NOT NULL REFERENCES Users(UserID),
  OptionIndex INT NOT NULL,
  CreatedAt   DATETIME DEFAULT GETDATE(),
  UNIQUE(BlogID, UserID)
);

-- ============================================================
-- 17e. SAVED BLOGS
-- ============================================================
CREATE TABLE SavedBlogs (
  SaveID      INT IDENTITY(1,1) PRIMARY KEY,
  BlogID      INT NOT NULL REFERENCES Blogs(BlogID) ON DELETE CASCADE,
  UserID      INT NOT NULL REFERENCES Users(UserID),
  CreatedAt   DATETIME DEFAULT GETDATE(),
  UNIQUE(BlogID, UserID)
);

-- ============================================================
-- 18. NOTIFICATIONS
-- ============================================================
CREATE TABLE Notifications (
  NotificationID INT IDENTITY(1,1) PRIMARY KEY,
  UserID         INT            NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
  Title          NVARCHAR(300)  NOT NULL,
  Message        NVARCHAR(MAX)  NOT NULL,
  Type           VARCHAR(30)    NOT NULL DEFAULT 'General'
                   CHECK (Type IN ('General','EventApproval','Registration','CheckIn','Survey','Reminder','OTP','SpeakerInvitation','EventUpdate')),
  IsRead         BIT            NOT NULL DEFAULT 0,
  RelatedID      INT            NULL,   -- EventID, RegistrationID, etc.
  RelatedType    VARCHAR(50)    NULL,   -- 'Event', 'Registration', etc.
  CreatedAt      DATETIME       NOT NULL DEFAULT GETDATE()
);

-- ============================================================
-- 21. FEEDBACKS
-- ============================================================
CREATE TABLE Feedbacks (
  FeedbackID    INT IDENTITY(1,1) PRIMARY KEY,
  EventID       INT NOT NULL REFERENCES Events(EventID) ON DELETE CASCADE,
  ParticipantID INT NOT NULL REFERENCES Users(UserID),
  Rating        INT NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
  Comment       NVARCHAR(MAX) NULL,
  MediaURLs     NVARCHAR(MAX) NULL,
  Reply         NVARCHAR(MAX) NULL,
  RepliedAt     DATETIME NULL,
  IsReported    BIT NOT NULL DEFAULT 0,
  ReportReason  NVARCHAR(MAX) NULL,
  ReportedAt    DATETIME NULL,
  ReportedBy    INT NULL REFERENCES Users(UserID),
  Status        VARCHAR(20) NOT NULL DEFAULT 'Active',
  CreatedAt     DATETIME NOT NULL DEFAULT GETDATE(),
  UpdatedAt     DATETIME NOT NULL DEFAULT GETDATE(),
  UNIQUE (EventID, ParticipantID)
);

-- ============================================================
-- SEED: Default Admin
-- ⚠️  KHÔNG insert hash thủ công ở đây vì dễ sai.
--    Sau khi tạo bảng xong, chạy lệnh sau để tạo admin đúng:
--      node scripts/seed-admin.js
-- ============================================================

-- ============================================================
-- Reports Table (Unified reporting for Blogs, Comments, Feedbacks)
-- ============================================================
CREATE TABLE Reports (
    ReportID INT PRIMARY KEY IDENTITY(1,1),
    TargetType VARCHAR(50) NOT NULL, -- 'Blog', 'BlogComment', 'Feedback'
    TargetID INT NOT NULL,           
    ReporterID INT NOT NULL FOREIGN KEY REFERENCES Users(UserID),
    Reason NVARCHAR(MAX) NOT NULL,   
    Status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Resolved', 'Dismissed'
    CreatedAt DATETIME DEFAULT GETDATE(),
    UNIQUE(TargetType, TargetID, ReporterID)
);

-- (Admin sẽ được tạo bởi seed-admin.js với hash chính xác)

-- Seed Categories
INSERT INTO Categories (Name, Description) VALUES
(N'Học thuật', N'Hội thảo, seminar, báo cáo khoa học'),
(N'Kỹ năng mềm', N'Kỹ năng giao tiếp, lãnh đạo, làm việc nhóm'),
(N'Công nghệ', N'Lập trình, AI, cybersecurity, hackathon'),
(N'Văn hóa nghệ thuật', N'Âm nhạc, triển lãm, biểu diễn'),
(N'Thể thao', N'Giải đấu thể thao, ngày hội thể thao'),
(N'Tình nguyện', N'Hoạt động cộng đồng, từ thiện'),
(N'Hướng nghiệp', N'Career fair, workshop việc làm, mentoring');

PRINT 'EMS Database Schema created successfully!';
