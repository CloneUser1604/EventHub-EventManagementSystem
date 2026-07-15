import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, Typography, Input, Button, List, Select, message, Spin, Space, Divider, Empty, Upload, Modal, Badge, Dropdown, Tag } from 'antd';
import { UserOutlined, PictureOutlined, HeartOutlined, HeartFilled, MessageOutlined, RetweetOutlined, ShareAltOutlined, EllipsisOutlined, HomeOutlined, PlusOutlined, SearchOutlined, BellOutlined, BarChartOutlined, SaveOutlined, UnorderedListOutlined, CloseCircleFilled, ArrowLeftOutlined, FormOutlined, BookOutlined, ExpandOutlined, EllipsisOutlined as MoreOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { blogService } from '../../services/blog.service';
import { eventService } from '../../services/event.service';
import useAuthStore from '../../store/authStore';
import useSettingStore from '../../store/settingStore';
import MainLayout from '../../components/layout/MainLayout';
import { useTranslation } from '../../hooks/useTranslation';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Helper to build image URL - normalizes to current backend regardless of stored host
const BACKEND_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
const buildImgUrl = (url) => {
  if (!url) return '';
  // If it's a full URL containing /uploads/, extract the path and repoint to current backend
  if (url.startsWith('http')) {
    try {
      const parsed = new URL(url);
      // Re-attach to current backend base
      return `${BACKEND_BASE}${parsed.pathname}`;
    } catch (e) {
      return url;
    }
  }
  // Relative path
  return `${BACKEND_BASE}/${url.replace(/\\/g, '/')}`;
};

// Parse ImageURL: returns array of string URLs
const parseImages = (raw) => {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch (e) {}
  return [raw];
};

// Grid image display component
const ImageGrid = ({ imageUrl, maxVisible = 3 }) => {
  const [lightbox, setLightbox] = React.useState(null); // index of open image
  const [showAll, setShowAll] = React.useState(false);
  const images = parseImages(imageUrl);
  if (images.length === 0) return null;

  const visibleImgs = showAll ? images : images.slice(0, maxVisible);
  const hiddenCount = images.length - maxVisible;

  const gridStyle = {
    display: 'grid',
    gap: 4,
    marginTop: 8,
    gridTemplateColumns: visibleImgs.length === 1 ? '1fr' : visibleImgs.length === 2 ? '1fr 1fr' : 'repeat(3, 1fr)',
  };

  return (
    <>
      <div style={gridStyle}>
        {visibleImgs.map((url, i) => {
          const isLast = !showAll && i === maxVisible - 1 && hiddenCount > 0;
          return (
            <div key={i} style={{ position: 'relative', paddingBottom: '75%', overflow: 'hidden', borderRadius: 8, cursor: 'pointer', backgroundColor: '#f3f4f6' }}>
              <img
                src={buildImgUrl(url)}
                alt={`img-${i}`}
                onClick={() => setLightbox(i)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
              />
              {isLast && (
                <div
                  onClick={() => setShowAll(true)}
                  style={{
                    position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: 22, fontWeight: 700
                  }}
                >
                  +{hiddenCount}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showAll && images.length > maxVisible && (
        <Button type="link" size="small" onClick={() => setShowAll(false)} style={{ padding: 0, marginTop: 4 }}>Thu gọn</Button>
      )}
      <Modal
        open={lightbox !== null}
        footer={null}
        onCancel={() => setLightbox(null)}
        width="auto"
        centered
        bodyStyle={{ padding: 0, background: 'transparent' }}
        style={{ maxWidth: '95vw' }}
      >
        {lightbox !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <img
              src={buildImgUrl(images[lightbox])}
              alt="full"
              style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
            />
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {images.map((url, i) => (
                  <img
                    key={i}
                    src={buildImgUrl(url)}
                    alt={`thumb-${i}`}
                    onClick={() => setLightbox(i)}
                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: i === lightbox ? '2px solid #6366f1' : '2px solid transparent', opacity: i === lightbox ? 1 : 0.7 }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

const BlogPage = ({ noLayout = false, adminBlogId = null, popupOnly = false, onClosePopup = null }) => {
  const { t } = useTranslation();
  const { theme } = useSettingStore();
  const params = useParams();
  const id = adminBlogId || params.id;
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [blogs, setBlogs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Post form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [hasDraft, setHasDraft] = useState(false);
  const [likedBlogs, setLikedBlogs] = useState({});
  const [allBlogs, setAllBlogs] = useState([]); // all blogs (no filter) for trending calculation
  const [commentsMap, setCommentsMap] = useState({});
  const [activeCommentBlogId, setActiveCommentBlogId] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailBlog, setDetailBlog] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [commentImageFiles, setCommentImageFiles] = useState([]);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyInput, setReplyInput] = useState('');
  const [replyImageFiles, setReplyImageFiles] = useState([]);
  const [commentSort, setCommentSort] = useState('top');
  const [savedBlogs, setSavedBlogs] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [expandedNotifs, setExpandedNotifs] = useState(new Set());
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('readNotifs') || '[]')); } catch { return new Set(); }
  });
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeView, setActiveView] = useState('feed');
  const [blogsSort, setBlogsSort] = useState('new');
  const [currentEventFilter, setCurrentEventFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  
  // Report state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportBlogId, setReportBlogId] = useState(null);
  const [reportReason, setReportReason] = useState(null);
  const [customReportReason, setCustomReportReason] = useState('');
  
  const [reportCommentModalVisible, setReportCommentModalVisible] = useState(false);
  const [reportCommentId, setReportCommentId] = useState(null);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const reportReasons = [
    'Spam hoặc quảng cáo rác',
    'Ngôn từ kích động thù địch',
    'Thông tin sai sự thật',
    'Quấy rối hoặc bắt nạt',
    'Nội dung không phù hợp',
    'Khác'
  ];

  const getRoleStyle = (role) => {
    switch (role) {
      case 'Admin': return { bg: '#fee2e2', color: '#b91c1c' };
      case 'Organizer': return { bg: '#fef3c7', color: '#b45309' };
      case 'Speaker': return { bg: '#e0e7ff', color: '#4338ca' };
      case 'Staff': return { bg: '#dcfce7', color: '#15803d' };
      case 'Attendee': return { bg: '#f3f4f6', color: '#374151' };
      default: return { bg: '#e0f2fe', color: '#0369a1' };
    }
  };

  const canPost = isAuthenticated;

  const getAvatarUrl = (url) => {
    if (!url) return undefined; // return undefined so Ant Design Avatar falls back to icon
    if (url.startsWith('http')) return url;
    if (url.startsWith('avatar_')) return `http://localhost:5000/uploads/avatars/${url}`;
    return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  useEffect(() => {
    fetchBlogs(blogsSort, currentEventFilter);
    if (isAuthenticated) {
      fetchEvents();
    }
    
    // Load draft
    const draft = localStorage.getItem('blog_draft');
    if (draft) {
      setHasDraft(true);
      try {
        const parsed = JSON.parse(draft);
        setContent(parsed.content || '');
        setSelectedEvent(parsed.eventId || null);
        setShowPoll(parsed.showPoll || false);
        setPollQuestion(parsed.pollQuestion || '');
        if (parsed.pollOptions) setPollOptions(parsed.pollOptions);
      } catch (e) {}
    }
  }, [isAuthenticated]);

  // Handle opening modal from URL params
  useEffect(() => {
    if (id && blogs.length > 0) {
      const blogIdNum = parseInt(id);
      const blog = blogs.find(b => b.BlogID === blogIdNum);
      if (blog) {
        setDetailBlog(blog);
        setDetailModalVisible(true);
        if (!commentsMap[blogIdNum]) {
          fetchComments(blogIdNum, commentSort);
        }
      }
    } else if (!id) {
      setDetailModalVisible(false);
      setDetailBlog(null);
    }
  }, [id, blogs]);

  useEffect(() => {
    if (detailModalVisible && window.location.hash) {
      const hashId = window.location.hash.substring(1);
      setTimeout(() => {
        const el = document.getElementById(hashId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.style.backgroundColor = '#fef08a'; // highlight
          setTimeout(() => el.style.backgroundColor = 'transparent', 2000);
        }
      }, 500);
    }
  }, [detailModalVisible, commentsMap]);

  const trendingEvents = React.useMemo(() => {
    const eventScores = {};
    allBlogs.forEach(blog => {
      if (blog.EventID && blog.EventTitle) {
        if (!eventScores[blog.EventID]) {
          eventScores[blog.EventID] = {
            id: blog.EventID,
            title: blog.EventTitle,
            score: 0,
            blogCount: 0
          };
        }
        eventScores[blog.EventID].score += (blog.LikeCount || 0) + (blog.CommentCount || 0);
        eventScores[blog.EventID].blogCount += 1;
      }
    });
    return Object.values(eventScores).sort((a, b) => b.score - a.score).slice(0, 5);
  }, [allBlogs]);

  const fetchBlogs = async (sort = blogsSort, eventId = currentEventFilter) => {
    setLoading(true);
    try {
      const res = await blogService.getBlogs({ limit: 50, sort, eventId });
      if (res.data?.success) {
        setBlogs(res.data.data.data || []);
        // Also fetch all blogs (no filter) to keep trending events accurate
        if (eventId) {
          const allRes = await blogService.getBlogs({ limit: 200, sort });
          if (allRes.data?.success) setAllBlogs(allRes.data.data.data || []);
        } else {
          setAllBlogs(res.data.data.data || []);
        }
      }
    } catch (error) {
      message.error('Không thể tải danh sách bài viết');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'activity') {
      fetchNotifications();
    } else if (activeView === 'saved') {
      fetchSavedBlogs();
    }
  }, [activeView]);

  const fetchSavedBlogs = async () => {
    if (!isAuthenticated) return;
    setLoadingSaved(true);
    try {
      const res = await blogService.getSavedBlogs();
      if (res.data?.success) setSavedBlogs(res.data.data || []);
    } catch (e) {
      message.error('Lỗi tải bài viết đã lưu');
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleSaveBlog = async (blogId) => {
    if (!isAuthenticated) return message.warning('Vui lòng đăng nhập để lưu');
    try {
      const res = await blogService.saveBlog(blogId);
      if (res.data?.success) {
        message.success(res.data.message);
        const isSaved = res.data.data?.saved;
        setBlogs(prev => prev.map(b => b.BlogID === blogId ? { ...b, UserSaved: isSaved } : b));
        if (detailBlog && detailBlog.BlogID === blogId) {
          setDetailBlog(prev => ({ ...prev, UserSaved: isSaved }));
        }
        if (activeView === 'saved') fetchSavedBlogs();
      }
    } catch (e) {
      message.error('Lỗi khi lưu bài viết');
    }
  };

  const handleMarkNotificationRead = (notifId) => {
    setReadNotificationIds(prev => {
      const newSet = new Set(prev);
      newSet.add(notifId);
      localStorage.setItem('readNotifs', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  const handleNotificationClick = async (item) => {
    handleMarkNotificationRead(`${item.Type}_${item.ID}`);
    
    // Find the blog in our loaded blogs or fetch it
    const targetBlogId = item.TargetID;
    let blog = blogs.find(b => b.BlogID === targetBlogId);
    
    // Open the blog detail modal
    if (blog) {
      setDetailBlog(blog);
    } else {
      // Blog not in current list, fetch it
      try {
        const res = await blogService.getBlogById(targetBlogId);
        if (res.data?.success) {
          blog = res.data.data;
          setDetailBlog(blog);
        }
      } catch (e) {
        // fallback: navigate via URL
        navigate(`/blogs/${targetBlogId}`);
        return;
      }
    }
    
    setDetailModalVisible(true);
    
    // For comment notifications, fetch comments then scroll
    if (item.Type !== 'blog_like') {
      const targetCommentId = item.ID;
      // Fetch comments if not loaded
      if (!commentsMap[targetBlogId]) {
        await fetchComments(targetBlogId, commentSort);
      }
      // Wait for modal to render then scroll
      setTimeout(() => {
        const commentEl = document.getElementById(`comment-${targetCommentId}`);
        if (commentEl) {
          commentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          commentEl.style.backgroundColor = '#fef3c7';
          setTimeout(() => { 
            commentEl.style.transition = 'background-color 1.5s ease';
            commentEl.style.backgroundColor = ''; 
          }, 2500);
        } else {
          // Comment might be a reply - try to find its parent and scroll there
          const allComments = commentsMap[targetBlogId] || [];
          const reply = allComments.find(c => c.CommentID === targetCommentId);
          if (reply?.ParentCommentID) {
            const parentEl = document.getElementById(`comment-${reply.ParentCommentID}`);
            if (parentEl) {
              parentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Highlight the reply within
              const replyEl = document.getElementById(`reply-${targetCommentId}`);
              if (replyEl) {
                replyEl.style.backgroundColor = '#fef3c7';
                setTimeout(() => { 
                  replyEl.style.transition = 'background-color 1.5s ease';
                  replyEl.style.backgroundColor = ''; 
                }, 2500);
              }
            }
          }
        }
      }, 600);
    } else {
      // For blog_like, just load comments too
      if (!commentsMap[targetBlogId]) {
        fetchComments(targetBlogId, commentSort);
      }
    }
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    setLoadingNotifications(true);
    try {
      const res = await blogService.getNotifications();
      if (res.data?.success) {
        setNotifications(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Fetch notifications on mount + poll every 60s so badge is always up-to-date
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications(); // immediate call on mount or when auth changes
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]); // eslint-disable-line

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await eventService.getEvents({ limit: 100 });
      if (res.data?.success) {
        setEvents(res.data.data.events || []);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách sự kiện:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim()) {
      message.warning(t('blog.enterContent'));
      return;
    }

    if (showPoll) {
      if (!pollQuestion.trim()) {
        message.warning(t('blog.enterPollQuestion'));
        return;
      }
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) {
        message.warning(t('blog.enterTwoOptions'));
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (title) formData.append('title', title);
      if (content) formData.append('content', content);
      if (selectedEvent) formData.append('eventId', selectedEvent);
      
      fileList.forEach(f => formData.append('images', f.originFileObj || f));

      if (showPoll) {
        formData.append('pollQuestion', pollQuestion.trim());
        const validOptions = pollOptions.filter(o => o.trim());
        formData.append('pollOptions', JSON.stringify(validOptions.map((text, i) => ({ id: i, text: text.trim() }))));
      }

      const res = await blogService.createBlog(formData);
      
      if (res.data?.success) {
        message.success(t('blog.postSuccess'));
        localStorage.removeItem('blog_draft');
        setHasDraft(false);
        setContent('');
        setSelectedEvent(null);
        setFileList([]);
        setPreviewUrls([]);
        setShowPoll(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        setIsModalVisible(false);
        fetchBlogs(blogsSort, currentEventFilter);
      }
    } catch (error) {
      message.error(error.response?.data?.message || t('blog.postError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: t('blog.confirm'),
      content: t('blog.confirmDelete'),
      okText: t('blog.delete'),
      cancelText: t('blog.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await blogService.deleteBlog(id);
          if (res.data?.success) {
            message.success(t('blog.deleteSuccess'));
            fetchBlogs();
          }
        } catch (error) {
          message.error(error.response?.data?.message || t('blog.deleteError'));
        }
      }
    });
  };

  const handleReportSubmit = async () => {
    let finalReason = reportReason;
    if (reportReason === 'Khác') {
      if (!customReportReason || !customReportReason.trim()) {
        return message.warning('Vui lòng nhập chi tiết lí do báo cáo');
      }
      finalReason = customReportReason.trim();
    }
    
    if (!finalReason) {
      return message.warning('Vui lòng chọn lí do báo cáo');
    }
    try {
      const res = await blogService.reportBlog(reportBlogId, finalReason);
      if (res.data?.success) {
        message.success('Đã gửi báo cáo thành công. Admin sẽ xem xét sớm nhất.');
        setReportModalVisible(false);
        setReportReason(null);
        setCustomReportReason('');
        setReportBlogId(null);
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi khi gửi báo cáo');
    }
  };

  const handleVote = async (blogId, optionIndex) => {
    if (!isAuthenticated) {
      message.warning('Vui lòng đăng nhập để bình chọn');
      return;
    }
    
    // Optimistic UI Update
    setBlogs(prevBlogs => prevBlogs.map(b => {
      if (b.BlogID === blogId) {
        const oldVote = b.UserVotedOption;
        if (oldVote === optionIndex) return b;
        
        const newPollVotes = { ...(b.PollVotes || {}) };
        if (oldVote !== undefined && oldVote !== null) {
          newPollVotes[oldVote] = Math.max(0, (newPollVotes[oldVote] || 1) - 1);
        }
        newPollVotes[optionIndex] = (newPollVotes[optionIndex] || 0) + 1;
        
        return {
          ...b,
          UserVotedOption: optionIndex,
          PollVotes: newPollVotes,
          TotalVotes: Object.values(newPollVotes).reduce((a, c) => a + c, 0)
        };
      }
      return b;
    }));

    try {
      const res = await blogService.votePoll(blogId, optionIndex);
      if (!res.data?.success) {
        fetchBlogs(); // rollback
      }
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi vote bình chọn');
      fetchBlogs(); // rollback on error
    }
  };

  const handleLike = async (blogId) => {
    if (!isAuthenticated) {
      message.warning('Vui lòng đăng nhập để like');
      return;
    }
    
    // Optimistic UI Update
    setBlogs(prevBlogs => prevBlogs.map(b => {
      if (b.BlogID === blogId) {
        const isLiked = b.UserLiked;
        return {
          ...b,
          UserLiked: !isLiked,
          LikeCount: isLiked ? Math.max(0, (b.LikeCount || 1) - 1) : (b.LikeCount || 0) + 1
        };
      }
      return b;
    }));
    
    try {
      await blogService.likeBlog(blogId);
    } catch (error) {
       message.error('Lỗi khi like bài viết');
       fetchBlogs();
    }
  };

  const fetchComments = async (blogId, sort = 'top') => {
    setLoadingComments(true);
    try {
      const res = await blogService.getComments(blogId, sort);
      setCommentsMap(prev => ({ ...prev, [blogId]: res.data.data || res.data }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleComment = (blogId) => {
    navigate(`/blogs/${blogId}`);
  };

  const handleCloseModal = () => {
    navigate('/blogs');
  };

  const handleSortChange = (newSort) => {
    setCommentSort(newSort);
    if (detailBlog) {
      fetchComments(detailBlog.BlogID, newSort);
    }
  };

  const handleLikeComment = async (commentId, blogId) => {
    if (!isAuthenticated) {
      message.warning('Vui lòng đăng nhập để like');
      return;
    }
    
    // Optimistic UI Update
    setCommentsMap(prev => {
      const comments = prev[blogId] || [];
      const newComments = comments.map(c => {
        if (c.CommentID === commentId) {
          const isLiked = c.UserLiked;
          return {
            ...c,
            UserLiked: !isLiked,
            LikeCount: isLiked ? Math.max(0, (c.LikeCount || 1) - 1) : (c.LikeCount || 0) + 1
          };
        }
        return c;
      });
      return { ...prev, [blogId]: newComments };
    });
    
    try {
      await blogService.likeComment(commentId);
    } catch (error) {
       message.error('Lỗi khi like bình luận');
       fetchComments(blogId, commentSort);
    }
  };

  const handleAddComment = async (blogId) => {
    if (!isAuthenticated) {
      message.warning('Vui lòng đăng nhập để bình luận');
      return;
    }
    if (!commentInput.trim() && commentImageFiles.length === 0) return;
    try {
      const formData = new FormData();
      if (commentInput.trim()) formData.append('content', commentInput);
      else formData.append('content', ' ');
      commentImageFiles.forEach(file => formData.append('images', file));

      const res = await blogService.addComment(blogId, formData);
      setCommentInput('');
      setCommentImageFiles([]);
      setBlogs(prev => prev.map(b => b.BlogID === blogId ? { ...b, CommentCount: (b.CommentCount || 0) + 1 } : b));
      fetchComments(blogId, commentSort);
    } catch (e) {
      message.error('Lỗi khi thêm bình luận');
    }
  };

  const handleReplySubmit = async (blogId, parentId) => {
    if (!isAuthenticated) return message.warning('Vui lòng đăng nhập để bình luận');
    if (!replyInput.trim() && replyImageFiles.length === 0) return;
    try {
      const formData = new FormData();
      if (replyInput.trim()) formData.append('content', replyInput);
      else formData.append('content', ' ');
      formData.append('parentCommentId', parentId);
      replyImageFiles.forEach(file => formData.append('images', file));

      await blogService.addComment(blogId, formData);
      setReplyInput('');
      setReplyImageFiles([]);
      setReplyingToId(null);
      setBlogs(prev => prev.map(b => b.BlogID === blogId ? { ...b, CommentCount: (b.CommentCount || 0) + 1 } : b));
      fetchComments(blogId, commentSort);
    } catch (e) {
      message.error('Lỗi khi thêm bình luận');
    }
  };

  const handleReportCommentSubmit = async () => {
    if (!reportReason) {
      message.error('Vui lòng chọn hoặc nhập lý do báo cáo');
      return;
    }
    const finalReason = reportReason === 'Khác' ? customReportReason.trim() : reportReason;
    if (reportReason === 'Khác' && !finalReason) {
      message.error('Vui lòng nhập lý do cụ thể');
      return;
    }
    try {
      await blogService.reportComment(reportCommentId, finalReason);
      message.success('Báo cáo bình luận thành công. Cảm ơn bạn đã phản hồi!');
      setReportCommentModalVisible(false);
      setReportCommentId(null);
      setReportReason(null);
      setCustomReportReason('');
    } catch (e) {
      message.error(e.message || 'Lỗi khi báo cáo bình luận');
    }
  };

  const handleEditComment = async (commentId, blogId) => {
    if (!editingCommentContent.trim()) return;
    try {
      const res = await blogService.editComment(commentId, editingCommentContent);
      if (res.data?.success || res.status === 200) {
        setEditingCommentId(null);
        setEditingCommentContent('');
        fetchComments(blogId, commentSort);
        message.success('Đã cập nhật bình luận');
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi cập nhật bình luận');
    }
  };

  const handleDeleteComment = (commentId, blogId) => {
    Modal.confirm({
      title: t('blog.confirm'),
      content: t('blog.confirmDeleteComment', { defaultValue: 'Bạn có chắc chắn muốn xóa bình luận này không?' }),
      okText: t('blog.delete'),
      cancelText: t('blog.cancel'),
      okType: 'danger',
      onOk: async () => {
        try {
          const res = await blogService.deleteComment(commentId);
          if (res.data?.success || res.status === 200) {
            message.success('Đã xoá bình luận');
            fetchComments(blogId, commentSort);
          }
        } catch (err) {
          console.error(err);
          message.error('Lỗi khi xoá bình luận');
        }
      }
    });
  };

  const handleShare = (blogId) => {
    const link = `${window.location.origin}/blogs/${blogId}`;
    navigator.clipboard.writeText(link).then(() => {
      message.success('Đã sao chép liên kết bài viết');
    }).catch(() => {
      message.error('Không thể sao chép liên kết');
    });
  };

  const handleOpenModal = () => {
    if (!isAuthenticated) {
      message.warning('Vui lòng đăng nhập để đăng bài');
      return;
    }
    setIsModalVisible(true);
  };

  const removeImage = (index) => {
    const newFileList = [...fileList];
    const newPreviewUrls = [...previewUrls];
    newFileList.splice(index, 1);
    newPreviewUrls.splice(index, 1);
    setFileList(newFileList);
    setPreviewUrls(newPreviewUrls);
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const updatePollOption = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      const newOptions = [...pollOptions];
      newOptions.splice(index, 1);
      setPollOptions(newOptions);
    }
  };

  const saveDraft = () => {
    const draft = {
      title,
      content,
      eventId: selectedEvent,
      showPoll,
      pollQuestion,
      pollOptions
    };
    localStorage.setItem('blog_draft', JSON.stringify(draft));
    setHasDraft(true);
    message.success('Đã lưu bài viết nháp');
    setIsModalVisible(false);
  };


  const pageContent = (
    <>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      
      {!popupOnly && (
      <div style={{ maxWidth: 1000, margin: isMobile ? '20px auto' : '40px auto', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 40 }}>
      
      {/* Navigation (Sidebar on Desktop, Select on Mobile) */}
      {isMobile ? (
        <div style={{ position: 'sticky', top: 60, zIndex: 10, background: theme === 'dark' ? '#09090b' : '#f9fafb', padding: '10px 0', marginBottom: 12 }}>
          <Select
            value={activeView}
            onChange={(val) => {
              if (val === 'search') {
                setActiveView('search');
                setSearchQuery('');
              } else if (val === 'feed') {
                setCurrentEventFilter(null);
                setActiveView('feed');
                fetchBlogs(blogsSort, null);
              } else {
                setActiveView(val);
              }
            }}
            style={{ width: '100%', fontWeight: 600 }}
            size="large"
          >
            <Option value="feed">{t('blog.forYou')}</Option>
            <Option value="search">{t('blog.search')}</Option>
            <Option value="activity">
              {t('blog.notifications')} 
              {notifications.filter(n => !readNotificationIds.has(`${n.Type}_${n.ID}`)).length > 0 && ` (${notifications.filter(n => !readNotificationIds.has(`${n.Type}_${n.ID}`)).length})`}
            </Option>
            <Option value="drafts">{t('blog.drafts')} {hasDraft ? ' (1)' : ''}</Option>
            <Option value="saved">{t('blog.saved')}</Option>
          </Select>
        </div>
      ) : (
        <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 100, height: 'max-content', zIndex: 10 }}>
          <Button            icon={<HomeOutlined style={{ fontSize: 20, color: activeView === 'feed' && !currentEventFilter ? '#4f46e5' : '#374151' }} />} 
              onClick={() => {
                setCurrentEventFilter(null);
                setActiveView('feed');
                fetchBlogs(blogsSort, null);
              }} 
              style={{ 
                justifyContent: 'flex-start', border: 'none', 
                backgroundColor: activeView === 'feed' && !currentEventFilter ? '#eef2ff' : 'transparent', 
                fontWeight: activeView === 'feed' && !currentEventFilter ? 700 : 500, 
                fontSize: 16, height: 48, borderRadius: 12, flexShrink: 0,
                color: activeView === 'feed' && !currentEventFilter ? '#4f46e5' : (theme === 'dark' ? '#d1d5db' : '#374151'),
                borderLeft: activeView === 'feed' && !currentEventFilter ? '3px solid #4f46e5' : '3px solid transparent',
              }}
          >{t('blog.forYou')}</Button>
          
          <Button 
            type="primary" 
            shape="round" 
            icon={<PlusOutlined />} 
            size="large" 
            style={{ width: '100%', marginTop: 24, height: 48, fontSize: 16, fontWeight: 600, backgroundColor: '#000000' }}
            onClick={() => {
              if (!canPost) return message.warning('Vui lòng đăng nhập');
              setIsModalVisible(true);
            }}
          >
            {t('blog.newBlogs')}
          </Button>
          
          <Button 
            type="text" 
            onClick={() => {
              setActiveView('search');
              setSearchQuery('');
            }}
            style={{ 
              textAlign: 'left', height: 48, borderRadius: 12, fontSize: 16, flexShrink: 0,
              fontWeight: activeView === 'search' ? 700 : 500, 
              display: 'flex', alignItems: 'center', gap: 12, 
              backgroundColor: activeView === 'search' ? '#eef2ff' : 'transparent',
              color: activeView === 'search' ? '#4f46e5' : (theme === 'dark' ? '#d1d5db' : '#374151'),
              borderLeft: activeView === 'search' ? '3px solid #4f46e5' : '3px solid transparent',
            }} 
            icon={<SearchOutlined style={{ fontSize: 22, color: activeView === 'search' ? '#4f46e5' : (theme === 'dark' ? '#d1d5db' : '#374151') }} />}
          >{t('blog.search')}</Button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button 
              type="text" 
              onClick={() => setActiveView('activity')} 
              style={{ 
                textAlign: 'left', height: 48, borderRadius: 12, fontSize: 16, flexShrink: 0,
                fontWeight: activeView === 'activity' ? 700 : 500, 
                display: 'flex', alignItems: 'center', gap: 12, 
                backgroundColor: activeView === 'activity' ? '#eef2ff' : 'transparent',
                color: activeView === 'activity' ? '#4f46e5' : (theme === 'dark' ? '#d1d5db' : '#374151'),
                borderLeft: activeView === 'activity' ? '3px solid #4f46e5' : '3px solid transparent',
              }} 
              icon={<HeartOutlined style={{ fontSize: 22, color: activeView === 'activity' ? '#4f46e5' : (theme === 'dark' ? '#d1d5db' : '#374151') }} />}
            >
              {t('blog.notifications')}
              {notifications.filter(n => !readNotificationIds.has(`${n.Type}_${n.ID}`)).length > 0 && (
                <Badge count={notifications.filter(n => !readNotificationIds.has(`${n.Type}_${n.ID}`)).length} />
              )}
            </Button>
            <Button 
              type="text" 
              onClick={() => setActiveView('drafts')} 
              style={{ 
                textAlign: 'left', height: 48, borderRadius: 12, fontSize: 16, flexShrink: 0,
                fontWeight: activeView === 'drafts' ? 700 : 500, 
                display: 'flex', alignItems: 'center', gap: 12, 
                backgroundColor: activeView === 'drafts' ? '#eef2ff' : 'transparent',
                color: activeView === 'drafts' ? '#4f46e5' : (theme === 'dark' ? '#d1d5db' : '#374151'),
                borderLeft: activeView === 'drafts' ? '3px solid #4f46e5' : '3px solid transparent',
              }} 
              icon={<FormOutlined style={{ fontSize: 22, color: activeView === 'drafts' ? '#4f46e5' : (theme === 'dark' ? '#d1d5db' : '#374151') }} />}
            >
              {t('blog.drafts')}
              {hasDraft && <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4f46e5', marginLeft: 4 }} />}
            </Button>
            <Button 
              type="text" 
              onClick={() => setActiveView('saved')} 
              style={{ 
                textAlign: 'left', height: 48, borderRadius: 12, fontSize: 16, flexShrink: 0,
                fontWeight: activeView === 'saved' ? 700 : 500, 
                display: 'flex', alignItems: 'center', gap: 12, 
                backgroundColor: activeView === 'saved' ? '#eef2ff' : 'transparent',
                color: activeView === 'saved' ? '#4f46e5' : (theme === 'dark' ? '#d1d5db' : '#374151'),
                borderLeft: activeView === 'saved' ? '3px solid #4f46e5' : '3px solid transparent',
              }} 
              icon={<BookOutlined style={{ fontSize: 22, color: activeView === 'saved' ? '#4f46e5' : (theme === 'dark' ? '#d1d5db' : '#374151') }} />}
            >
              {t('blog.saved')}
            </Button>
          </div>
        </div>
      )}
      
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 100 }}>
          <Button type="primary" shape="circle" icon={<PlusOutlined />} size="large" onClick={() => setIsModalVisible(true)} style={{ width: 56, height: 56, backgroundColor: '#000', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} />
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1, maxWidth: 620 }}>
      
      {activeView === 'activity' ? (
        <div style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', borderRadius: 24, border: theme === 'dark' ? '1px solid #27272a' : '1px solid #e5e5e5', padding: '24px' }}>
          <Title level={2} style={{ marginTop: 0, marginBottom: 20, color: theme === 'dark' ? '#fff' : 'inherit' }}>{t('blog.notifications')}</Title>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <Button shape="round" type={notificationFilter === 'all' ? 'primary' : 'default'} onClick={() => setNotificationFilter('all')}>{t('blog.filterAll')}</Button>
            <Button shape="round" type={notificationFilter === 'comments' ? 'primary' : 'default'} onClick={() => setNotificationFilter('comments')}>{t('blog.filterComments')}</Button>
            <Button shape="round" type={notificationFilter === 'likes' ? 'primary' : 'default'} onClick={() => setNotificationFilter('likes')}>{t('blog.filterLikes')}</Button>
          </div>
          {loadingNotifications ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={notifications.filter(n => {
                if (notificationFilter === 'likes') return n.Type === 'blog_like' || n.Type === 'comment_like';
                if (notificationFilter === 'comments') return n.Type === 'blog_comment' || n.Type === 'comment_reply';
                return true;
              })}
              renderItem={item => {
                let actionText = '';
                let typeIcon = null;
                let typeColor = '#6366f1';
                if (item.Type === 'blog_like') {
                  actionText = t('blog.likedYourBlog');
                  typeIcon = <HeartFilled style={{ color: '#ef4444', fontSize: 13 }} />;
                  typeColor = theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2';
                }
                if (item.Type === 'blog_comment') {
                  const title = item.TargetTitle ? `"${item.TargetTitle}"` : t('blog.blogPost');
                  actionText = `${t('blog.commentedOn')} ${title}`;
                  typeIcon = <MessageOutlined style={{ color: '#3b82f6', fontSize: 13 }} />;
                  typeColor = theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff';
                }
                if (item.Type === 'comment_reply') {
                  const preview = item.TargetTitle?.length > 40 ? item.TargetTitle.substring(0, 40) + '...' : item.TargetTitle;
                  actionText = `${t('blog.repliedToYourComment')} "${preview}"`;
                  typeIcon = <MessageOutlined style={{ color: '#8b5cf6', fontSize: 13 }} />;
                  typeColor = theme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : '#f5f3ff';
                }
                if (item.Type === 'comment_like') {
                  const preview = item.TargetTitle?.length > 40 ? item.TargetTitle.substring(0, 40) + '...' : item.TargetTitle;
                  actionText = `${t('blog.likedYourComment')} "${preview}"`;
                  typeIcon = <HeartFilled style={{ color: '#ef4444', fontSize: 13 }} />;
                  typeColor = theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2';
                }
                if (item.Type === 'system_alert') {
                  actionText = ''; // Rendered separately
                  typeIcon = <ExclamationCircleOutlined style={{ color: '#ef4444', fontSize: 13 }} />;
                  typeColor = theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2';
                }
                
                const notifKey = `${item.Type}_${item.ID}`;
                const isExpanded = expandedNotifs.has(notifKey);
                const toggleExpand = (e) => {
                  e.stopPropagation();
                  setExpandedNotifs(prev => {
                    const next = new Set(prev);
                    if (next.has(notifKey)) next.delete(notifKey);
                    else next.add(notifKey);
                    return next;
                  });
                };

                return (
                  <List.Item
                    style={{ 
                      padding: '14px 16px', 
                      marginBottom: 8, 
                      borderRadius: 12, 
                      cursor: 'pointer', 
                      backgroundColor: typeColor, 
                      border: 'none',
                      opacity: readNotificationIds.has(`${item.Type}_${item.ID}`) ? 0.65 : 1,
                    }}
                    onClick={() => handleNotificationClick(item)}
                  >
                    <List.Item.Meta
                      avatar={
                        <div style={{ position: 'relative' }}>
                          <Avatar src={getAvatarUrl(item.ActorAvatar)} size={44} icon={<UserOutlined />} />
                          <span style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: theme === 'dark' ? '#27272a' : '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
                            {typeIcon}
                          </span>
                        </div>
                      }
                      title={
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {item.Type !== 'system_alert' ? (
                            <>
                              <Text strong style={{ fontSize: 14, color: theme === 'dark' ? '#fff' : 'inherit', fontWeight: readNotificationIds.has(`${item.Type}_${item.ID}`) ? 400 : 700 }}>{item.ActorName}</Text>
                              {item.ActorRole && <span style={{ fontSize: 11, padding: '1px 7px', backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)', color: theme === 'dark' ? '#d1d5db' : '#374151', borderRadius: 10, border: theme === 'dark' ? '1px solid #4b5563' : '1px solid #e5e7eb' }}>{item.ActorRole}</span>}
                              <Text style={{ fontSize: 14, color: theme === 'dark' ? '#d1d5db' : '#374151', fontWeight: readNotificationIds.has(`${item.Type}_${item.ID}`) ? 400 : 500 }}>{actionText}</Text>
                            </>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                              <div><Tag color="volcano" style={{ borderRadius: 10, border: 'none', margin: 0, padding: '0 8px', fontWeight: 600 }}>THÔNG BÁO TỪ HỆ THỐNG</Tag></div>
                              <Text style={{ fontSize: 14, color: theme === 'dark' ? '#fff' : '#000', fontWeight: readNotificationIds.has(`${item.Type}_${item.ID}`) ? 400 : 600 }}>{item.TargetTitle}</Text>
                            </div>
                          )}
                        </div>
                      }
                      description={
                        <div>
                          <Text type="secondary" style={{ fontSize: 12, color: theme === 'dark' ? '#9ca3af' : undefined }}>
                            {dayjs(item.CreatedAt).subtract(7, 'hour').fromNow(true)
                              .replace('một', '1').replace('Một', '1').replace('vài giây', '1 giây')} {t('blog.ago')}
                          </Text>
                          {(item.Type === 'blog_comment' || item.Type === 'comment_reply' || item.Type === 'system_alert') && item.CommentContent && (
                            <div style={{ marginTop: 4, fontSize: 13, color: theme === 'dark' ? '#9ca3af' : '#374151', fontStyle: 'italic', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                              {isExpanded ? (
                                <>
                                  "{item.CommentContent}"
                                  <span onClick={toggleExpand} style={{ color: '#3b82f6', cursor: 'pointer', marginLeft: 8, fontWeight: 500 }}>Thu gọn</span>
                                </>
                              ) : (
                                <>
                                  "{item.CommentContent.length > 80 ? item.CommentContent.substring(0, 80) + '...' : item.CommentContent}"
                                  {item.CommentContent.length > 80 && (
                                    <span onClick={toggleExpand} style={{ color: '#3b82f6', cursor: 'pointer', marginLeft: 8, fontWeight: 500 }}>Xem thêm</span>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                          {(item.Type === 'blog_comment' || item.Type === 'comment_reply') && item.CommentImageURL && (
                            <div style={{ marginTop: 4, maxWidth: 240 }} onClick={e => e.stopPropagation()}>
                              <ImageGrid imageUrl={item.CommentImageURL} maxVisible={3} />
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
              locale={{ emptyText: <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}><BellOutlined style={{ fontSize: 40, marginBottom: 12 }} /><div>{t('blog.noNotifications')}</div></div> }}
            />
          )}
        </div>
      ) : activeView === 'drafts' ? (
        <div style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', borderRadius: 24, border: theme === 'dark' ? '1px solid #27272a' : '1px solid #e5e5e5', padding: '24px' }}>
          <Title level={2} style={{ marginTop: 0, marginBottom: 20, color: theme === 'dark' ? '#fff' : 'inherit' }}>{t('blog.drafts')}</Title>
          {hasDraft ? (
            <div style={{ padding: '16px', border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #f0f0f0', borderRadius: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setIsModalVisible(true)}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#fff' : 'inherit' }}>{t('blog.draftSaved')}</div>
                <div style={{ color: '#9ca3af', fontSize: 14 }}>{t('blog.clickToEdit')}</div>
              </div>
              <Space>
                <Button 
                  shape="round" 
                  danger 
                  onClick={(e) => {
                    e.stopPropagation();
                    localStorage.removeItem('blog_draft');
                    setHasDraft(false);
                    message.success(t('blog.draftDeleted'));
                  }} 
                >
                  {t('blog.delete')}
                </Button>
                <Button type="primary" shape="round">{t('blog.open')}</Button>
              </Space>
            </div>
          ) : (
            <Empty description={t('blog.noDrafts')} />
          )}
        </div>
      ) : activeView === 'saved' ? (
        <div style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', borderRadius: 24, border: theme === 'dark' ? '1px solid #27272a' : '1px solid #e5e5e5', padding: '24px' }}>
          <Title level={2} style={{ marginTop: 0, marginBottom: 20, color: theme === 'dark' ? '#fff' : 'inherit' }}>{t('blog.saved')}</Title>
          <Input 
            prefix={<SearchOutlined style={{ color: '#9ca3af', fontSize: 20 }} />}
            placeholder={t('blog.searchSaved')}
            value={savedSearchQuery}
            onChange={(e) => setSavedSearchQuery(e.target.value)}
            style={{ borderRadius: 24, backgroundColor: theme === 'dark' ? '#27272a' : '#f3f4f6', color: theme === 'dark' ? '#fff' : 'inherit', border: 'none', height: 48, fontSize: 16, marginBottom: 24 }}
          />
          {loadingSaved ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
          ) : (
            <List
              itemLayout="vertical"
              dataSource={savedBlogs.filter(b => 
                !savedSearchQuery.trim() || 
                (b.Title && b.Title.toLowerCase().includes(savedSearchQuery.toLowerCase())) ||
                (b.Content && b.Content.toLowerCase().includes(savedSearchQuery.toLowerCase())) ||
                (b.EventTitle && b.EventTitle.toLowerCase().includes(savedSearchQuery.toLowerCase())) ||
                (b.AuthorName && b.AuthorName.toLowerCase().includes(savedSearchQuery.toLowerCase()))
              )}
              renderItem={item => (
                <div style={{ padding: '16px 0', borderBottom: theme === 'dark' ? '1px solid #27272a' : '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => { setDetailBlog(item); setDetailModalVisible(true); fetchComments(item.BlogID, commentSort); }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Avatar src={getAvatarUrl(item.AuthorAvatar)} icon={<UserOutlined />} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        {((item.AuthorName && item.AuthorName.toLowerCase().includes('hệ thống')) || (item.Title && item.Title.includes('THÔNG BÁO TỪ HỆ THỐNG'))) ? (
                          <Tag color="volcano" style={{ borderRadius: 10, border: 'none', margin: 0, padding: '2px 10px', fontSize: 14, fontWeight: 600 }}>THÔNG BÁO TỪ HỆ THỐNG</Tag>
                        ) : (
                          <>
                            <Text strong style={{ fontSize: 15, color: theme === 'dark' ? '#fff' : '#000' }}>{item.AuthorName}</Text>
                            {item.AuthorRole && <span style={{ fontSize: 12, padding: '2px 8px', backgroundColor: getRoleStyle(item.AuthorRole).bg, color: getRoleStyle(item.AuthorRole).color, borderRadius: 12 }}>{item.AuthorRole}</span>}
                          </>
                        )}
                        {item.EventTitle && (
                          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setCurrentEventFilter(item.EventID); fetchBlogs(blogsSort, item.EventID); setActiveView('feed'); setDetailModalVisible(false); window.scrollTo(0, 0); }}>
                            <span style={{ color: '#9ca3af', fontSize: 14 }}>&gt;</span>
                            <Text strong className="hover-underline" style={{ fontSize: 15, color: theme === 'dark' ? '#fff' : '#000', marginLeft: 6 }}>{item.EventTitle}</Text>
                          </div>
                        )}
                        <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>{dayjs(item.CreatedAt).fromNow()}</Text>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 15, color: theme === 'dark' ? '#d1d5db' : '#111827' }}>{item.Content}</div>
                      
                      {item.EventTitle && (
                        <div style={{ marginTop: 12 }}>
                          <span 
                            onClick={(e) => { e.stopPropagation(); navigate(`/events/${item.EventID}`); }}
                            style={{ fontSize: 13, padding: '4px 12px', backgroundColor: theme === 'dark' ? '#3f3f46' : '#f3f4f6', border: theme === 'dark' ? '1px solid #52525b' : '1px solid #e5e7eb', borderRadius: 16, color: theme === 'dark' ? '#d1d5db' : '#4b5563', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', transition: 'all 0.2s', fontWeight: 500 }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = theme === 'dark' ? '#52525b' : '#e5e7eb'; e.currentTarget.style.borderColor = theme === 'dark' ? '#71717a' : '#d1d5db'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = theme === 'dark' ? '#3f3f46' : '#f3f4f6'; e.currentTarget.style.borderColor = theme === 'dark' ? '#52525b' : '#e5e7eb'; }}
                          >
                            {t('blog.joinEvent')}: {item.EventTitle}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              locale={{ emptyText: t('blog.noSavedBlogs') }}
            />
          )}
        </div>
      ) : activeView === 'search' ? (
        <div style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', borderRadius: 24, border: theme === 'dark' ? '1px solid #27272a' : '1px solid #e5e5e5', padding: '24px' }}>
          <Input 
            prefix={<SearchOutlined style={{ color: '#9ca3af', fontSize: 20 }} />}
            placeholder={t('blog.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ borderRadius: 24, backgroundColor: theme === 'dark' ? '#27272a' : '#f3f4f6', color: theme === 'dark' ? '#fff' : 'inherit', border: 'none', height: 48, fontSize: 16, marginBottom: 24 }}
          />
          
          {searchQuery.trim() ? (
            /* Realtime search results */
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'inline-block', backgroundColor: theme === 'dark' ? 'rgba(59,130,246,0.1)' : '#dbeafe', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 18, marginBottom: 4, color: theme === 'dark' ? '#60a5fa' : '#1d4ed8' }}>
                  {t('blog.searchResults')}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trendingEvents.filter(ev => ev.title.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 
                  ? trendingEvents.filter(ev => ev.title.toLowerCase().includes(searchQuery.toLowerCase())).map(ev => (
                    <div key={ev.id} style={{ padding: '12px 16px', borderRadius: 12, backgroundColor: theme === 'dark' ? '#18181b' : '#f8faff', border: theme === 'dark' ? '1px solid #27272a' : '1px solid #e0e7ff', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = theme === 'dark' ? '#27272a' : '#eef2ff'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = theme === 'dark' ? '#18181b' : '#f8faff'}
                      onClick={() => {
                        setCurrentEventFilter(ev.id);
                        setSearchQuery('');
                        setActiveView('feed');
                        fetchBlogs(blogsSort, ev.id);
                      }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#fff' : 'inherit' }}>
                          {ev.title}
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: 14, marginTop: 4 }}>{ev.blogCount} {t('blog.blogCount')} · {ev.score} {t('blog.interactionCount')}</div>
                      </div>
                      <span style={{ fontSize: 18, color: '#4f46e5' }}>→</span>
                    </div>
                  ))
                  : <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, padding: '32px 0' }}>{t('blog.noResultsFound')}</div>
                }
              </div>
            </div>
          ) : (
            /* Default: show trending */
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'inline-block', backgroundColor: theme === 'dark' ? 'rgba(250,204,21,0.1)' : '#fef08a', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: 20, marginBottom: 4, color: theme === 'dark' ? '#fde047' : '#854d0e' }}>
                  {t('blog.trending')}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {trendingEvents.length > 0 ? trendingEvents.map(ev => (
                  <div key={ev.id} style={{ padding: '12px 0', borderBottom: theme === 'dark' ? '1px solid #27272a' : '1px solid #f0f0f0', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }} onClick={() => {
                    setCurrentEventFilter(ev.id);
                    setSearchQuery('');
                    setActiveView('feed');
                    fetchBlogs(blogsSort, ev.id);
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 16, color: theme === 'dark' ? '#fff' : '#000' }}>{ev.title}</div>
                      <div style={{ color: '#9ca3af', fontSize: 14, marginTop: 4 }}>{ev.blogCount} {t('blog.blogsDiscussing')} · {ev.score} {t('blog.interactionCount')}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ color: '#9ca3af', fontSize: 14 }}>{t('blog.noTrendingEvents')}</div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            {currentEventFilter && (() => {
              const ev = allBlogs.find(b => b.EventID === currentEventFilter);
              const evTitle = ev?.EventTitle;
              return evTitle ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20, padding: '4px 12px', fontSize: 14, color: '#1d4ed8' }}>
                  <span>#{evTitle}</span>
                  <button 
                    onClick={() => { setCurrentEventFilter(null); fetchBlogs(blogsSort, null); }} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#1d4ed8', padding: 0, lineHeight: 1 }}
                  >✕</button>
                </div>
              ) : null;
            })()}
          </div>
          <Select 
            value={blogsSort} 
            onChange={(val) => { setBlogsSort(val); fetchBlogs(val, currentEventFilter); }}
            variant="borderless"
            style={{ fontWeight: 600, fontSize: 15 }}
          >
            <Option value="new">{t('blog.newest')}</Option>
            <Option value="trending">{t('blog.trending')}</Option>
          </Select>
        </div>
        
        {/* Blogs Container */}
      <div style={{ 
        backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', 
        borderRadius: 24, 
        border: theme === 'dark' ? '1px solid #27272a' : '1px solid #e5e5e5', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        overflow: 'hidden'
      }}>
        
        <div style={{ backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff', padding: isMobile ? '16px 12px' : '16px 24px', cursor: 'pointer', borderBottom: theme === 'dark' ? '1px solid #27272a' : '1px solid #f0f0f0' }} onClick={() => { if(canPost) setIsModalVisible(true); }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
              <Avatar src={getAvatarUrl(user?.avatarURL || user?.AvatarURL)} icon={<UserOutlined />} size={40} />
              <div style={{ color: '#9ca3af', fontSize: 15 }}>{t('blog.whatsNew')}</div>
            </div>
            <Button type="primary" shape="round" style={{ fontWeight: 600 }}>{t('blog.post')}</Button>
          </div>
        </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : (
        <List
          itemLayout="vertical"
          dataSource={blogs}
          renderItem={item => (
            <div style={{ padding: isMobile ? '16px 12px' : '16px 24px', borderBottom: theme === 'dark' ? '1px solid #27272a' : '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Avatar src={getAvatarUrl(item.AuthorAvatar)} icon={<UserOutlined />} size={40} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      {((item.AuthorName && item.AuthorName.toLowerCase().includes('hệ thống')) || (item.Title && item.Title.includes('THÔNG BÁO TỪ HỆ THỐNG'))) ? (
                        <Tag color="volcano" style={{ borderRadius: 10, border: 'none', margin: 0, padding: '2px 10px', fontSize: 14, fontWeight: 600 }}>THÔNG BÁO TỪ HỆ THỐNG</Tag>
                      ) : (
                        <>
                          <Text strong style={{ fontSize: 15, color: theme === 'dark' ? '#fff' : '#000' }}>{item.AuthorName}</Text>
                          {item.AuthorRole && <span style={{ fontSize: 12, padding: '2px 8px', backgroundColor: getRoleStyle(item.AuthorRole).bg, color: getRoleStyle(item.AuthorRole).color, borderRadius: 12 }}>{item.AuthorRole}</span>}
                        </>
                      )}
                      {item.EventTitle && (
                        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setCurrentEventFilter(item.EventID); fetchBlogs(blogsSort, item.EventID); setActiveView('feed'); setDetailModalVisible(false); window.scrollTo(0, 0); }}>
                          <span style={{ color: '#9ca3af', fontSize: 14 }}>&gt;</span>
                          <Text strong className="hover-underline" style={{ fontSize: 15, color: theme === 'dark' ? '#fff' : '#000', marginLeft: 6 }}>{item.EventTitle}</Text>
                        </div>
                      )}
                      <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>{dayjs(item.CreatedAt).subtract(7, 'hour').fromNow(true).replace('một', '1').replace('Một', '1').replace('vài giây', '1 giây')}</Text>
                    </div>
                    
                    <Space>
                      {user?.userId === item.AuthorID && (
                        <Button type="text" danger size="small" onClick={() => handleDelete(item.BlogID)}>Xóa</Button>
                      )}
                      <Dropdown 
                        menu={{ 
                          items: [
                            ...(user?.role !== 'Admin' && user?.userId !== item.AuthorID ? [{
                              key: 'report',
                              label: <span style={{ color: '#ff4d4f' }}>Báo cáo</span>,
                              onClick: (e) => {
                                e.domEvent.stopPropagation();
                                setReportBlogId(item.BlogID);
                                setReportModalVisible(true);
                              }
                            }] : []),
                            // If you want more menu items in the future, add them here
                          ] 
                        }} 
                        trigger={['click']} 
                        placement="bottomRight"
                        disabled={user?.role === 'Admin' || user?.userId === item.AuthorID}
                      >
                        <Button type="text" shape="circle" icon={<EllipsisOutlined />} style={{ color: '#9ca3af', display: (user?.role === 'Admin' || user?.userId === item.AuthorID) ? 'none' : 'inline-flex' }} onClick={e => e.stopPropagation()} />
                      </Dropdown>
                    </Space>
                  </div>
                  
                  <div style={{ marginTop: 4 }}>
                    {item.Title && !item.Title.includes('THÔNG BÁO TỪ HỆ THỐNG') && <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.Title}</div>}
                    {item.Title && item.Title.includes('THÔNG BÁO TỪ HỆ THỐNG') && item.Title.replace('THÔNG BÁO TỪ HỆ THỐNG', '').trim() !== '' && <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.Title.replace('THÔNG BÁO TỪ HỆ THỐNG', '').replace(/^\[|\]$/g, '').trim()}</div>}
                    <Paragraph style={{ margin: 0, fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {item.Content}
                    </Paragraph>
                  </div>

                  {item.EventTitle && (
                    <div style={{ marginTop: 12 }}>
                      <span 
                        onClick={(e) => { e.stopPropagation(); navigate(`/events/${item.EventID}`); }}
                        style={{ fontSize: 13, padding: '4px 12px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 16, color: '#4b5563', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', transition: 'all 0.2s', fontWeight: 500 }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e5e7eb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                      >
                        Tham gia sự kiện: {item.EventTitle}
                      </span>
                    </div>
                  )}
                  
                  {item.CoverURL && !item.Images?.length && (
                    <div style={{ marginTop: 12 }}>
                      <img 
                        src={item.CoverURL} 
                        alt="Blog Cover" 
                        style={{ 
                          width: '100%', 
                          maxHeight: 400, 
                          objectFit: 'cover', 
                          borderRadius: 12,
                          border: '1px solid #f0f0f0'
                        }} 
                      />
                    </div>
                  )}

                  {item.Images && item.Images.length > 0 && (
                    <div className="hide-scrollbar" style={{ marginTop: 12, display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 4 }}>
                      {item.Images.map((img, idx) => (
                        <img 
                          key={idx}
                          src={img} 
                          alt="Blog Content" 
                          style={{
                            flexShrink: 0,
                            width: item.Images.length === 1 ? '100%' : 260, 
                            height: item.Images.length === 1 ? 'auto' : 340,
                            maxHeight: 500, 
                            objectFit: 'cover', 
                            borderRadius: 12,
                            border: '1px solid #f0f0f0'
                          }} 
                        />
                      ))}
                    </div>
                  )}

                  {item.PollQuestion && item.PollOptions && (
                    <div style={{ marginTop: 16, border: '1px solid #f0f0f0', borderRadius: 16, padding: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>{item.PollQuestion}</div>
                      {item.PollOptions.map(opt => {
                        const total = item.TotalVotes || 0;
                        const count = (item.PollVotes && item.PollVotes[opt.id]) || 0;
                        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                        const isVoted = item.UserVotedOption === opt.id;
                        
                        return (
                          <div 
                            key={opt.id} 
                            onClick={() => handleVote(item.BlogID, opt.id)}
                            style={{ 
                              position: 'relative', 
                              marginBottom: 8, 
                              padding: '10px 16px', 
                              borderRadius: 8, 
                              border: isVoted ? '1px solid #1890ff' : '1px solid #e5e5e5', 
                              cursor: 'pointer',
                              overflow: 'hidden'
                            }}
                          >
                            <div style={{ 
                              position: 'absolute', 
                              left: 0, 
                              top: 0, 
                              bottom: 0, 
                              width: `${percent}%`, 
                              backgroundColor: isVoted ? '#e6f7ff' : '#f5f5f5',
                              zIndex: 0,
                              transition: 'width 0.3s ease'
                            }} />
                            <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: isVoted ? 600 : 500, color: isVoted ? '#1890ff' : (theme === 'dark' ? '#fff' : '#000') }}>{opt.text}</span>
                              <span style={{ color: '#9ca3af' }}>{percent}%</span>
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 8 }}>{item.TotalVotes || 0} lượt bình chọn</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 20, marginTop: 12, marginLeft: -8 }}>
                    <Button 
                      type="text" 
                      shape="round" 
                      icon={item.UserLiked ? <HeartFilled style={{ fontSize: 18, color: '#ff4d4f' }} /> : <HeartOutlined style={{ fontSize: 18, color: '#4b5563' }} />} 
                      onClick={() => handleLike(item.BlogID)}
                    >
                      <span style={{ fontWeight: 500 }}>{item.LikeCount || 0}</span>
                    </Button>
                    <Button 
                      type="text" 
                      shape="round" 
                      icon={<MessageOutlined style={{ fontSize: 18, color: '#4b5563' }} />} 
                      onClick={() => handleComment(item.BlogID)}
                    >
                      <span style={{ fontWeight: 500 }}>{item.CommentCount || 0}</span>
                    </Button>
                    <Button 
                      type="text" 
                      shape="circle" 
                      icon={<ShareAltOutlined style={{ fontSize: 18, color: '#4b5563' }} />} 
                      onClick={() => handleShare(item.BlogID)}
                    />
                    <Button 
                      type="text" 
                      shape="circle" 
                      icon={<BookOutlined style={{ fontSize: 18, color: item.UserSaved ? '#f59e0b' : '#4b5563' }} />} 
                      onClick={() => handleSaveBlog(item.BlogID)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          locale={{ 
            emptyText: (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE} 
                description={
                  <span style={{ color: '#9ca3af', fontSize: 15 }}>
                    {t('blog.noSavedBlogs', { defaultValue: 'Chưa có bài viết nào trên bảng tin.' })}
                  </span>
                } 
                style={{ padding: '60px 0' }}
              />
            )
          }}
        />
      )}
      </div>
      </>
      )}
      </div>
      </div>
      )}

      {/* Thread Creation Modal */}
      <Modal
        open={isModalVisible}
        onCancel={() => { setIsModalVisible(false); setPreviewUrls([]); setFileList([]); setShowPoll(false); setPollQuestion(''); setPollOptions(['', '']); }}
        footer={null}
        width={600}
        closable={false}
        bodyStyle={{ padding: 0 }}
        style={{ top: 40 }}
        title={<div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18 }}>{t('blog.newBlogs', { defaultValue: 'Blog mới' })}</div>}
      >
        <div style={{ padding: '16px 24px', borderBottom: theme === 'dark' ? '1px solid #27272a' : '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button type="text" onClick={() => setIsModalVisible(false)} style={{ margin: -8 }}>{t('blog.cancel')}</Button>
          <Button type="primary" shape="round" onClick={handlePost} loading={submitting} disabled={!content.trim() && !title.trim() && fileList.length === 0 && !showPoll}>{t('blog.post')}</Button>
        </div>

        <div style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' }} className="hide-scrollbar">
          <div style={{ display: 'flex', gap: 12 }}>
            <Avatar src={getAvatarUrl(user?.avatarURL || user?.AvatarURL)} icon={<UserOutlined />} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{user?.FullName || t('blog.you')}</span>
                <span style={{ color: '#9ca3af' }}>&gt;</span>
                <Select
                  showSearch
                  allowClear
                  placeholder={t('blog.communityOrTopic')}
                  variant="borderless"
                  loading={loadingEvents}
                  style={{ width: 240 }}
                  value={selectedEvent}
                  onChange={setSelectedEvent}
                  filterOption={(input, option) =>
                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {events.map(ev => (
                    <Option key={ev.EventID} value={ev.EventID}>{ev.Title}</Option>
                  ))}
                </Select>
              </div>
              
              <TextArea
                placeholder={t('blog.whatsNew')}
                autoSize={{ minRows: 2, maxRows: 10 }}
                variant="borderless"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ padding: 0, marginBottom: 12, resize: 'none', fontSize: 15 }}
              />
              
              {previewUrls.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: previewUrls.length === 1 ? '1fr' : '1fr 1fr', gap: 8, paddingBottom: 12 }}>
                  {previewUrls.map((url, index) => (
                    <div key={index} style={{ position: 'relative' }}>
                      <img src={url} alt="Preview" style={{ width: '100%', height: previewUrls.length === 1 ? 'auto' : 200, maxHeight: 400, borderRadius: 12, objectFit: 'cover' }} />
                      <CloseCircleFilled 
                        style={{ position: 'absolute', top: 8, right: 8, fontSize: 24, color: 'rgba(0,0,0,0.6)', cursor: 'pointer', backgroundColor: '#fff', borderRadius: '50%' }}
                        onClick={() => removeImage(index)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {showPoll && (
                <div style={{ border: theme === 'dark' ? '1px solid #27272a' : '1px solid #f0f0f0', borderRadius: 16, padding: 16, marginBottom: 16, boxSizing: 'border-box' }}>
                  <Input 
                    placeholder={t('blog.askAQuestion')} 
                    variant="borderless"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    style={{ padding: '0 0 12px 0', fontSize: 15, fontWeight: 600, borderBottom: theme === 'dark' ? '1px solid #27272a' : '1px solid #f0f0f0', borderRadius: 0, marginBottom: 12 }}
                  />
                  {pollOptions.map((opt, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <Input 
                        placeholder={`${t('blog.pollOption')} ${index + 1}`}
                        value={opt}
                        onChange={(e) => updatePollOption(index, e.target.value)}
                        style={{ borderRadius: 8, flex: 1 }}
                      />
                      {pollOptions.length > 2 && (
                        <Button type="text" danger icon={<CloseCircleFilled />} onClick={() => removePollOption(index)} />
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 4 && (
                    <Button type="dashed" block onClick={addPollOption} style={{ marginTop: 8, borderRadius: 8 }}>
                      {t('blog.addOption')}
                    </Button>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, marginTop: 8, color: '#9ca3af' }}>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  multiple
                  beforeUpload={(file) => {
                    setFileList(prev => [...prev, file]);
                    setPreviewUrls(prev => [...prev, URL.createObjectURL(file)]);
                    return false;
                  }}
                >
                  <PictureOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
                </Upload>
                <UnorderedListOutlined 
                  style={{ fontSize: 20, cursor: 'pointer', color: showPoll ? '#1890ff' : '#9ca3af' }} 
                  onClick={() => setShowPoll(!showPoll)} 
                />
              </div>
              
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Button 
                    shape="round"
                    onClick={saveDraft}
                    style={{ fontWeight: 600, padding: '0 24px' }}
                  >
                    {t('blog.saveDraft')}
                  </Button>
                  <Button 
                    type="primary" 
                    shape="round"
                    loading={submitting}
                    onClick={handlePost}
                    disabled={!content.trim()}
                    style={{ fontWeight: 600, padding: '0 24px', backgroundColor: content.trim() ? '#000' : '#f3f4f6', color: content.trim() ? '#fff' : '#9ca3af', border: 'none' }}
                  >
                    {t('blog.post')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Blog Detail Modal */}
      <Modal
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setDetailBlog(null);
          if (onClosePopup) {
            onClosePopup();
          } else {
            navigate('/blogs');
          }
        }}
        footer={null}
        width={680}
        bodyStyle={{ padding: 0 }}
        style={{ top: 20 }}
        closable={false}
      >
        {detailBlog && (
          <div style={{ height: '85vh', display: 'flex', flexDirection: 'column', backgroundColor: theme === 'dark' ? '#18181b' : '#fff' }}>
            <div style={{ padding: '16px 24px', borderBottom: theme === 'dark' ? '1px solid #27272a' : '1px solid #f0f0f0', display: 'flex', alignItems: 'center' }}>
              <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => { setDetailModalVisible(false); setDetailBlog(null); if (onClosePopup) onClosePopup(); }} style={{ marginRight: 16, fontSize: 18 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 18 }}>{t('blog.postDetails')}</div>
            </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }} className="hide-scrollbar">
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Avatar src={getAvatarUrl(detailBlog.AuthorAvatar)} icon={<UserOutlined />} size={40} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text strong style={{ fontSize: 15, color: theme === 'dark' ? '#fff' : '#000' }}>{detailBlog.AuthorName}</Text>
                      {detailBlog.AuthorRole && <span style={{ fontSize: 12, padding: '2px 8px', backgroundColor: getRoleStyle(detailBlog.AuthorRole).bg, color: getRoleStyle(detailBlog.AuthorRole).color, borderRadius: 12 }}>{detailBlog.AuthorRole}</span>}
                      {detailBlog.EventTitle && (
                        <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setCurrentEventFilter(detailBlog.EventID); fetchBlogs(blogsSort, detailBlog.EventID); setActiveView('feed'); setDetailModalVisible(false); window.scrollTo(0, 0); }}>
                          <span style={{ color: '#9ca3af', fontSize: 14 }}>&gt;</span>
                          <Text strong className="hover-underline" style={{ fontSize: 15, color: theme === 'dark' ? '#fff' : '#000', marginLeft: 6 }}>{detailBlog.EventTitle}</Text>
                        </div>
                      )}
                      <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>{dayjs(detailBlog.CreatedAt).subtract(7, 'hour').fromNow(true).replace('một', '1').replace('Một', '1').replace('vài giây', '1 giây')}</Text>
                    </div>
                    <Space>
                      {user?.userId === detailBlog.AuthorID && (
                        <Button type="text" danger size="small" onClick={() => { handleDelete(detailBlog.BlogID); setDetailModalVisible(false); }}>{t('blog.delete')}</Button>
                      )}
                      <Dropdown 
                        menu={{ 
                          items: [
                            ...(user?.role !== 'Admin' && user?.userId !== detailBlog.AuthorID ? [{
                              key: 'report',
                              label: <span style={{ color: '#ff4d4f' }}>{t('blog.report')}</span>,
                              onClick: (e) => {
                                e.domEvent.stopPropagation();
                                setReportBlogId(detailBlog.BlogID);
                                setReportModalVisible(true);
                              }
                            }] : []),
                          ] 
                        }} 
                        trigger={['click']} 
                        placement="bottomRight"
                        disabled={user?.role === 'Admin' || user?.userId === detailBlog.AuthorID}
                      >
                        <Button type="text" shape="circle" icon={<EllipsisOutlined />} style={{ color: '#9ca3af', display: (user?.role === 'Admin' || user?.userId === detailBlog.AuthorID) ? 'none' : 'inline-flex' }} onClick={e => e.stopPropagation()} />
                      </Dropdown>
                    </Space>
                  </div>
                  
                  <div style={{ marginTop: 4 }}>
                    {detailBlog.Title && <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{detailBlog.Title}</div>}
                    <Paragraph style={{ margin: 0, fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {detailBlog.Content}
                    </Paragraph>
                  </div>

                  {detailBlog.EventTitle && (
                    <div style={{ marginTop: 12 }}>
                      <span 
                        onClick={(e) => { e.stopPropagation(); navigate(`/events/${detailBlog.EventID}`); }}
                        style={{ fontSize: 13, padding: '6px 14px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 16, color: '#4b5563', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', transition: 'all 0.2s', fontWeight: 500 }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e5e7eb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                      >
                        Tham gia sự kiện: {detailBlog.EventTitle}
                      </span>
                    </div>
                  )}
                  
                  {detailBlog.CoverURL && !detailBlog.Images?.length && (
                    <div style={{ marginTop: 12 }}>
                      <img 
                        src={detailBlog.CoverURL} 
                        alt="Blog Cover" 
                        style={{ width: '100%', maxHeight: 400, objectFit: 'cover', borderRadius: 12, border: '1px solid #f0f0f0' }} 
                      />
                    </div>
                  )}

                  {detailBlog.Images && detailBlog.Images.length > 0 && (
                    <div className="hide-scrollbar" style={{ marginTop: 12, display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 4 }}>
                      {detailBlog.Images.map((img, idx) => (
                        <img 
                          key={idx}
                          src={img} 
                          alt="Blog Content" 
                          style={{
                            flexShrink: 0,
                            width: detailBlog.Images.length === 1 ? '100%' : 260, 
                            height: detailBlog.Images.length === 1 ? 'auto' : 340,
                            maxHeight: 500, 
                            objectFit: 'cover', 
                            borderRadius: 12,
                            border: '1px solid #f0f0f0'
                          }} 
                        />
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 20, marginTop: 12, marginLeft: -8 }}>
                    <Button 
                      type="text" 
                      shape="round" 
                      icon={detailBlog.UserLiked ? <HeartFilled style={{ fontSize: 18, color: '#ff4d4f' }} /> : <HeartOutlined style={{ fontSize: 18, color: '#4b5563' }} />} 
                      onClick={() => handleLike(detailBlog.BlogID)}
                    >
                      <span style={{ fontWeight: 500 }}>{detailBlog.LikeCount || 0}</span>
                    </Button>
                    <Button 
                      type="text" 
                      shape="round" 
                      icon={<MessageOutlined style={{ fontSize: 18, color: '#4b5563' }} />} 
                    >
                      <span style={{ fontWeight: 500 }}>{detailBlog.CommentCount || 0}</span>
                    </Button>
                    <Button 
                      type="text" 
                      shape="circle" 
                      icon={<ShareAltOutlined style={{ fontSize: 18, color: '#4b5563' }} />} 
                      onClick={() => handleShare(detailBlog.BlogID)}
                    />
                    <Button 
                      type="text" 
                      shape="circle" 
                      icon={<BookOutlined style={{ fontSize: 18, color: detailBlog?.UserSaved ? '#f59e0b' : '#4b5563' }} />} 
                      onClick={() => handleSaveBlog(detailBlog.BlogID)}
                    />
                  </div>
                </div>
              </div>
              
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: theme === 'dark' ? '1px solid #27272a' : '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                  <Select
                    value={commentSort}
                    onChange={handleSortChange}
                    variant="borderless"
                    style={{ fontWeight: 600, fontSize: 15, padding: 0, marginLeft: -12, color: theme === 'dark' ? '#fff' : '#000' }}
                    dropdownStyle={{ borderRadius: 12 }}
                  >
                    <Option value="top">↓ Hàng đầu</Option>
                    <Option value="new">↓ Mới nhất</Option>
                  </Select>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '16px 24px', borderTop: '1px solid #f0f0f0' }}>
                  <Avatar src={getAvatarUrl(user?.avatarURL || user?.AvatarURL)} icon={<UserOutlined />} size={36} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Upload 
                        multiple
                        beforeUpload={(file) => { setCommentImageFiles(prev => [...prev, file]); return false; }} 
                        showUploadList={false} 
                        accept="image/*"
                      >
                        <Button type="text" shape="circle" icon={<PictureOutlined style={{ fontSize: 20, color: '#6b7280' }} />} />
                      </Upload>
                      <Input 
                        placeholder={`${t('blog.replyTo')} ${detailBlog.AuthorName}...`}
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        onPressEnter={() => handleAddComment(detailBlog.BlogID)}
                        suffix={<Button type="link" onClick={() => handleAddComment(detailBlog.BlogID)} style={{ padding: 0, fontWeight: 600 }}>{t('blog.post')}</Button>}
                        style={{ borderRadius: 24, backgroundColor: theme === 'dark' ? '#27272a' : '#f9fafb', border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e5e5e5', padding: '8px 16px', fontSize: 15, color: theme === 'dark' ? '#fff' : '#000' }}
                      />
                    </div>
                    {commentImageFiles.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginLeft: 40 }}>
                        {commentImageFiles.map((file, idx) => (
                          <div key={idx} style={{ position: 'relative' }}>
                            <img src={URL.createObjectURL(file)} alt="preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #f0f0f0' }} />
                            <CloseCircleFilled style={{ position: 'absolute', top: -6, right: -6, color: '#ef4444', fontSize: 16, cursor: 'pointer', background: '#fff', borderRadius: '50%' }} onClick={() => setCommentImageFiles(prev => prev.filter((_, i) => i !== idx))} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {loadingComments ? (
                  <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {(() => {
                      const allComments = commentsMap[detailBlog.BlogID] || [];
                      const parentComments = allComments.filter(c => !c.ParentCommentID);
                      const replies = allComments.filter(c => c.ParentCommentID).sort((a, b) => new Date(a.CreatedAt) - new Date(b.CreatedAt));
                      
                      if (allComments.length === 0) {
                        return <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 14, padding: 20 }}>{t('blog.noComments')}</div>;
                      }
                      
                      return parentComments.map(comment => (
                        <div key={comment.CommentID} id={`comment-${comment.CommentID}`} style={{ display: 'flex', flexDirection: 'column', gap: 12, transition: 'background-color 0.8s', borderRadius: 8, padding: '4px 0' }}>
                          {/* Parent Comment */}
                          <div style={{ display: 'flex', gap: 12 }}>
                            <Avatar src={getAvatarUrl(comment.AuthorAvatar)} icon={<UserOutlined />} size={36} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Text strong style={{ fontSize: 15, color: theme === 'dark' ? '#fff' : '#000' }}>{comment.AuthorName}</Text>
                                {comment.AuthorRole && <span style={{ fontSize: 11, padding: '2px 6px', backgroundColor: getRoleStyle(comment.AuthorRole).bg, color: getRoleStyle(comment.AuthorRole).color, borderRadius: 10, marginLeft: 6 }}>{comment.AuthorRole}</span>}
                                <Text type="secondary" style={{ fontSize: 14, marginLeft: 6 }}>{dayjs(comment.CreatedAt).subtract(7, 'hour').fromNow(true).replace('một', '1').replace('Một', '1').replace('vài giây', '1 giây')} {t('blog.ago')}</Text>
                                {comment.UpdatedAt && <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>{t('blog.edited')}</Text>}
                              </div>
                              
                              {editingCommentId === comment.CommentID ? (
                                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <Input 
                                    value={editingCommentContent} 
                                    onChange={(e) => setEditingCommentContent(e.target.value)} 
                                    style={{ borderRadius: 16 }}
                                    onPressEnter={() => handleEditComment(comment.CommentID, detailBlog.BlogID)}
                                  />
                                  <Button type="primary" shape="round" onClick={() => handleEditComment(comment.CommentID, detailBlog.BlogID)}>Lưu</Button>
                                  <Button type="text" shape="round" onClick={() => setEditingCommentId(null)}>Hủy</Button>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ fontSize: 15, marginTop: 4, color: theme === 'dark' ? '#d1d5db' : '#111827' }}>{comment.Content}</div>
                                  {comment.ImageURL && <ImageGrid imageUrl={comment.ImageURL} />}
                                </div>
                              )}
                              
                              <div style={{ display: 'flex', gap: 12, marginTop: 8, marginLeft: -8, alignItems: 'center' }}>
                                <Button 
                                  type="text" 
                                  size="small" 
                                  shape="round"
                                  icon={comment.UserLiked ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />} 
                                  onClick={() => handleLikeComment(comment.CommentID, detailBlog.BlogID)}
                                >
                                  <span style={{ fontWeight: 500 }}>{comment.LikeCount > 0 ? comment.LikeCount : ''}</span>
                                </Button>
                                <Button type="text" size="small" shape="round" icon={<MessageOutlined />} onClick={() => setReplyingToId(replyingToId === comment.CommentID ? null : comment.CommentID)}>
                                  <span style={{ fontWeight: 500 }}>{replies.filter(r => r.ParentCommentID === comment.CommentID).length > 0 ? replies.filter(r => r.ParentCommentID === comment.CommentID).length : ''}</span>
                                </Button>
                                  {(user?.userId === comment.AuthorID || user?.UserID === comment.AuthorID) ? (
                                    <>
                                      <Button type="text" size="small" style={{ color: '#9ca3af', fontSize: 13 }} onClick={() => { setEditingCommentId(comment.CommentID); setEditingCommentContent(comment.Content); }}>
                                        Sửa
                                      </Button>
                                      <Button type="text" size="small" style={{ color: '#ff4d4f', fontSize: 13 }} onClick={() => handleDeleteComment(comment.CommentID, detailBlog.BlogID)}>
                                        Xóa
                                      </Button>
                                    </>
                                  ) : (user?.role !== 'Admin' && (
                                    <Button type="text" size="small" style={{ color: '#dc2626', fontSize: 13 }} onClick={() => { setReportCommentId(comment.CommentID); setReportCommentModalVisible(true); }}>
                                      Báo cáo
                                    </Button>
                                  ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Replies */}
                          {replies.filter(r => r.ParentCommentID === comment.CommentID).map(reply => (
                            <div key={reply.CommentID} id={`reply-${reply.CommentID}`} style={{ display: 'flex', gap: 12, marginLeft: 48, transition: 'background-color 0.8s', borderRadius: 8, padding: '4px 0' }}>
                              <Avatar src={getAvatarUrl(reply.AuthorAvatar)} icon={<UserOutlined />} size={28} />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <Text strong style={{ fontSize: 14, color: theme === 'dark' ? '#fff' : '#000' }}>{reply.AuthorName}</Text>
                                  {reply.AuthorRole && <span style={{ fontSize: 10, padding: '2px 6px', backgroundColor: getRoleStyle(reply.AuthorRole).bg, color: getRoleStyle(reply.AuthorRole).color, borderRadius: 10, marginLeft: 6 }}>{reply.AuthorRole}</span>}
                                  <Text type="secondary" style={{ fontSize: 13, marginLeft: 6 }}>{dayjs(reply.CreatedAt).subtract(7, 'hour').fromNow(true).replace('một', '1').replace('Một', '1').replace('vài giây', '1 giây')}</Text>
                                  {reply.UpdatedAt && <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>(đã chỉnh sửa)</Text>}
                                </div>
                                
                                {editingCommentId === reply.CommentID ? (
                                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <Input 
                                      value={editingCommentContent} 
                                      onChange={(e) => setEditingCommentContent(e.target.value)} 
                                      style={{ borderRadius: 16 }}
                                      onPressEnter={() => handleEditComment(reply.CommentID, detailBlog.BlogID)}
                                    />
                                    <Button type="primary" shape="round" onClick={() => handleEditComment(reply.CommentID, detailBlog.BlogID)}>Lưu</Button>
                                    <Button type="text" shape="round" onClick={() => setEditingCommentId(null)}>Hủy</Button>
                                  </div>
                                ) : (
                                  <div>
                                    <div style={{ fontSize: 14, marginTop: 4, color: theme === 'dark' ? '#d1d5db' : '#111827' }}>{reply.Content}</div>
                                    {reply.ImageURL && <ImageGrid imageUrl={reply.ImageURL} />}
                                  </div>
                                )}
                                
                                <div style={{ display: 'flex', gap: 12, marginTop: 4, marginLeft: -8, alignItems: 'center' }}>
                                  <Button 
                                    type="text" 
                                    size="small" 
                                    shape="round"
                                    icon={reply.UserLiked ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />} 
                                    onClick={() => handleLikeComment(reply.CommentID, detailBlog.BlogID)}
                                  >
                                    <span style={{ fontWeight: 500 }}>{reply.LikeCount > 0 ? reply.LikeCount : ''}</span>
                                  </Button>
                                  <Button type="text" size="small" shape="round" icon={<MessageOutlined />} onClick={() => setReplyingToId(replyingToId === comment.CommentID ? null : comment.CommentID)} />
                                  {(user?.userId === reply.AuthorID || user?.UserID === reply.AuthorID) ? (
                                    <>
                                      <Button type="text" size="small" style={{ color: '#9ca3af', fontSize: 13 }} onClick={() => { setEditingCommentId(reply.CommentID); setEditingCommentContent(reply.Content); }}>
                                        Sửa
                                      </Button>
                                      <Button type="text" size="small" style={{ color: '#ff4d4f', fontSize: 13 }} onClick={() => handleDeleteComment(reply.CommentID, detailBlog.BlogID)}>
                                        Xóa
                                      </Button>
                                    </>
                                  ) : (user?.role !== 'Admin' && (
                                    <Button type="text" size="small" style={{ color: '#dc2626', fontSize: 13 }} onClick={() => { setReportCommentId(reply.CommentID); setReportCommentModalVisible(true); }}>
                                      Báo cáo
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Reply Input Box */}
                          {replyingToId === comment.CommentID && (
                            <div style={{ display: 'flex', gap: 12, marginLeft: 48, marginTop: 4, alignItems: 'center' }}>
                              <Avatar src={getAvatarUrl(user?.avatarURL || user?.AvatarURL)} icon={<UserOutlined />} size={28} />
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <Upload 
                                    multiple
                                    beforeUpload={(file) => { setReplyImageFiles(prev => [...prev, file]); return false; }} 
                                    showUploadList={false} 
                                    accept="image/*"
                                  >
                                    <Button type="text" shape="circle" size="small" icon={<PictureOutlined style={{ fontSize: 16, color: '#6b7280' }} />} />
                                  </Upload>
                                  <Input 
                                    autoFocus
                                    placeholder={`Trả lời ${comment.AuthorName}...`}
                                    value={replyInput}
                                    onChange={(e) => setReplyInput(e.target.value)}
                                    onPressEnter={() => handleReplySubmit(detailBlog.BlogID, comment.CommentID)}
                                    suffix={<Button type="link" onClick={() => handleReplySubmit(detailBlog.BlogID, comment.CommentID)} style={{ padding: 0 }}>Đăng</Button>}
                                    style={{ borderRadius: 24, backgroundColor: theme === 'dark' ? '#27272a' : '#f9fafb', border: theme === 'dark' ? '1px solid #3f3f46' : '1px solid #e5e5e5', padding: '4px 12px', color: theme === 'dark' ? '#fff' : '#000' }}
                                  />
                                </div>
                                {replyImageFiles.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginLeft: 32 }}>
                                    {replyImageFiles.map((file, idx) => (
                                      <div key={idx} style={{ position: 'relative' }}>
                                        <img src={URL.createObjectURL(file)} alt="preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #f0f0f0' }} />
                                        <CloseCircleFilled style={{ position: 'absolute', top: -6, right: -6, color: '#ef4444', fontSize: 16, cursor: 'pointer', background: '#fff', borderRadius: '50%' }} onClick={() => setReplyImageFiles(prev => prev.filter((_, i) => i !== idx))} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Report Modal */}
      <Modal
        title="Báo cáo bài viết"
        open={reportModalVisible}
        onCancel={() => {
          setReportModalVisible(false);
          setReportReason(null);
          setCustomReportReason('');
          setReportBlogId(null);
        }}
        onOk={handleReportSubmit}
        okText="Gửi báo cáo"
        cancelText="Hủy"
        okButtonProps={{ danger: true, disabled: !reportReason }}
      >
        <p style={{ marginBottom: 16 }}>Vui lòng chọn lí do bạn muốn báo cáo bài viết này:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reportReasons.map((reason, idx) => (
            <div key={idx}>
              <div 
                onClick={() => setReportReason(reason)}
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: 8, 
                  border: reportReason === reason ? '2px solid #ef4444' : '1px solid #d1d5db',
                  backgroundColor: reportReason === reason ? '#fef2f2' : '#ffffff',
                  cursor: 'pointer',
                  fontWeight: reportReason === reason ? 600 : 400,
                  color: reportReason === reason ? '#b91c1c' : '#374151',
                  transition: 'all 0.2s'
                }}
              >
                {reason}
              </div>
              {reason === 'Khác' && reportReason === 'Khác' && (
                <div style={{ marginTop: 8 }}>
                  <Input.TextArea 
                    autoFocus
                    placeholder="Vui lòng nhập chi tiết lí do báo cáo..." 
                    rows={3} 
                    value={customReportReason}
                    onChange={e => setCustomReportReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* Report Comment Modal */}
      <Modal
        title="Báo cáo Bình luận"
        open={reportCommentModalVisible}
        onOk={handleReportCommentSubmit}
        onCancel={() => {
          setReportCommentModalVisible(false);
          setReportCommentId(null);
          setReportReason(null);
          setCustomReportReason('');
        }}
        okText="Gửi báo cáo"
        cancelText="Hủy"
        okButtonProps={{ danger: true, disabled: !reportReason || (reportReason === 'Khác' && !customReportReason.trim()) }}
      >
        <div style={{ padding: '8px 0' }}>
          <Typography.Text style={{ display: 'block', marginBottom: 16 }}>Vui lòng chọn lý do báo cáo bình luận này:</Typography.Text>
          <Space direction="vertical" style={{ width: '100%' }}>
            {reportReasons.map(r => (
              <Button 
                key={r} 
                block 
                style={{ textAlign: 'left', borderColor: reportReason === r ? '#ef4444' : '#e5e5e5', color: reportReason === r ? '#ef4444' : '#374151', backgroundColor: reportReason === r ? '#fef2f2' : '#ffffff' }}
                onClick={() => {
                  setReportReason(r);
                  if (r !== 'Khác') setCustomReportReason('');
                }}
              >
                {r}
              </Button>
            ))}
            {reportReason === 'Khác' && (
              <Input.TextArea
                autoFocus
                placeholder="Vui lòng nhập lý do cụ thể..."
                rows={3}
                value={customReportReason}
                onChange={e => setCustomReportReason(e.target.value)}
                style={{ marginTop: 8 }}
              />
            )}
          </Space>
        </div>
      </Modal>

      {/* FAB New Post on Mobile */}
      {isMobile && canPost && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999 }}>
          <Button 
            type="primary" 
            shape="circle" 
            icon={<PlusOutlined style={{ fontSize: 24 }} />} 
            style={{ width: 56, height: 56, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', background: '#4f46e5' }}
            onClick={() => setIsModalVisible(true)}
          />
        </div>
      )}
    </>
  );

  if (noLayout) {
    return pageContent;
  }

  return <MainLayout>{pageContent}</MainLayout>;
};

export default BlogPage;
