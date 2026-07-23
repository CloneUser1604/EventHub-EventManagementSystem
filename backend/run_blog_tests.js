// run_blog_tests.js
// Kịch bản Automation Test cho hệ thống Blog/Cộng đồng (E2E)
// Yêu cầu: Server Backend đang chạy ở http://localhost:5000 (npm run dev)

const API_URL = "http://localhost:5000/api";
let tokens = { Admin: "", Author: "", Reader: "" };
let userIds = { Author: null, Reader: null };
let currentBlogId = null;
let currentCommentId = null;

const printStep = (step, msg) => console.log(`\n\x1b[36m=== BƯỚC ${step}: ${msg} ===\x1b[0m`);
const printResult = (tc, passed, msg) => {
  if (passed) console.log(`\x1b[32m[PASSED]\x1b[0m ${tc} - ${msg}`);
  else console.log(`\x1b[31m[FAILED]\x1b[0m ${tc} - ${msg}`);
};

const randomString = Math.random().toString(36).substring(7);
const authorEmail = `author_${randomString}@gmail.com`;
const readerEmail = `reader_${randomString}@gmail.com`;
const password = "Password@123";

async function fetchAPI(endpoint, method = "GET", body = null, token = "", isFormData = false) {
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) {
    options.body = isFormData ? body : JSON.stringify(body);
  }
  
  try {
    const res = await fetch(`${API_URL}${endpoint}`, options);
    const data = await res.json();
    return { status: res.status, data };
  } catch (e) {
    return { status: 500, data: { success: false, message: e.message } };
  }
}

async function runBlogTests() {
  console.log("🚀 BẮT ĐẦU CHẠY AUTOMATION TEST: HỆ THỐNG BLOG & CỘNG ĐỒNG 🚀\n");

  // ==========================================
  printStep(1, "Thiết lập Tài khoản (Admin, Author, Reader)");
  // ==========================================
  
  // 1. Admin Login
  const adminLogin = await fetchAPI("/auth/login", "POST", { email: "admin@ems.edu.vn", password: "Admin@123" });
  if (adminLogin.data?.success) {
    tokens.Admin = adminLogin.data.data.accessToken;
    printResult("Setup_Admin", true, "Đăng nhập Admin thành công");
  } else {
    printResult("Setup_Admin", false, "Đăng nhập Admin thất bại. Dừng test!");
    return;
  }

  // 2. Register & Login Author
  await fetchAPI("/auth/register", "POST", { email: authorEmail, password, fullName: "Blog Author" });
  const authorLogin = await fetchAPI("/auth/login", "POST", { email: authorEmail, password });
  if (authorLogin.data?.success) {
    tokens.Author = authorLogin.data.data.accessToken;
    userIds.Author = authorLogin.data.data.user.userId;
    printResult("Setup_Author", true, "Tạo & Đăng nhập Author thành công");
  } else {
    printResult("Setup_Author", false, "Đăng nhập Author thất bại.");
    return;
  }

  // 3. Register & Login Reader
  await fetchAPI("/auth/register", "POST", { email: readerEmail, password, fullName: "Blog Reader" });
  const readerLogin = await fetchAPI("/auth/login", "POST", { email: readerEmail, password });
  if (readerLogin.data?.success) {
    tokens.Reader = readerLogin.data.data.accessToken;
    userIds.Reader = readerLogin.data.data.user.userId;
    printResult("Setup_Reader", true, "Tạo & Đăng nhập Reader thành công");
  }

  // ==========================================
  printStep(2, "Tạo bài viết mới (TC_Blog_Create)");
  // ==========================================
  const blogForm = new FormData();
  blogForm.append('title', `Test Blog Title ${randomString}`);
  blogForm.append('content', 'Đây là nội dung bài viết test tự động. Hello World!');
  // Thêm mock JSON cho poll (bình chọn)
  blogForm.append('poll', JSON.stringify({
    question: 'Bạn thích màu gì?',
    options: ['Đỏ', 'Xanh', 'Vàng']
  }));

  const createBlog = await fetchAPI("/blogs", "POST", blogForm, tokens.Author, true);
  if (createBlog.data?.success) {
    currentBlogId = createBlog.data.data.BlogID;
    printResult("TC_BL_01", true, `Tạo bài viết thành công (BlogID: ${currentBlogId})`);
  } else {
    printResult("TC_BL_01", false, "Tạo bài viết thất bại: " + JSON.stringify(createBlog.data));
    return; // Không thể test tiếp nếu không có bài viết
  }

  // ==========================================
  printStep(3, "Tương tác với bài viết: Reader Like & Vote (TC_Blog_Interact)");
  // ==========================================
  
  // 1. Reader Like
  const likeRes = await fetchAPI(`/blogs/${currentBlogId}/like`, "POST", {}, tokens.Reader);
  if (likeRes.data?.success) {
    printResult("TC_BL_02", true, "Reader thích (Like) bài viết thành công");
  } else {
    printResult("TC_BL_02", false, "Reader Like thất bại");
  }

  // 2. Reader Vote Poll
  const voteRes = await fetchAPI(`/blogs/${currentBlogId}/vote`, "POST", { optionIndex: 1 }, tokens.Reader);
  if (voteRes.data?.success) {
    printResult("TC_BL_03", true, "Reader bình chọn (Vote Poll) thành công");
  } else {
    printResult("TC_BL_03", false, "Reader Vote thất bại");
  }

  // ==========================================
  printStep(4, "Bình luận vào bài viết (TC_Blog_Comment)");
  // ==========================================
  const cmtForm = new FormData();
  cmtForm.append('content', 'Bài viết rất hay, cảm ơn tác giả!');
  const cmtRes = await fetchAPI(`/blogs/${currentBlogId}/comments`, "POST", cmtForm, tokens.Reader, true);
  
  if (cmtRes.data?.success) {
    currentCommentId = cmtRes.data.data.CommentID;
    printResult("TC_BL_04", true, `Reader bình luận thành công (CommentID: ${currentCommentId})`);
  } else {
    printResult("TC_BL_04", false, "Reader bình luận thất bại");
  }

  // ==========================================
  printStep(5, "Báo cáo vi phạm & Admin Xử lý (TC_Blog_Report)");
  // ==========================================
  
  // 1. Reader báo cáo bài viết
  const reportRes = await fetchAPI(`/blogs/${currentBlogId}/report`, "POST", { reason: "Nội dung spam test" }, tokens.Reader);
  if (reportRes.data?.success) {
    printResult("TC_BL_05", true, "Reader báo cáo bài viết thành công");
  } else {
    printResult("TC_BL_05", false, "Báo cáo thất bại");
  }

  // 2. Admin lấy danh sách báo cáo
  const adminReportList = await fetchAPI("/blogs/admin/reported", "GET", null, tokens.Admin);
  if (adminReportList.data?.success && adminReportList.data.data.length > 0) {
    const isFound = adminReportList.data.data.find(b => b.BlogID === currentBlogId);
    if (isFound) {
      printResult("TC_AD_04", true, "Admin thấy bài viết bị report trong danh sách");
      
      // 3. Admin xử lý report (Xóa bài hoặc Bỏ qua)
      const resolveRes = await fetchAPI(`/blogs/admin/reported/${currentBlogId}/resolve`, "PUT", { action: "ignore" }, tokens.Admin);
      if (resolveRes.data?.success) {
        printResult("TC_AD_05", true, "Admin đánh dấu bỏ qua báo cáo thành công");
      } else {
        printResult("TC_AD_05", false, "Admin xử lý báo cáo thất bại");
      }
    } else {
      printResult("TC_AD_04", false, "Admin không tìm thấy bài viết trong danh sách report");
    }
  } else {
    printResult("TC_AD_04", false, "Lỗi lấy danh sách báo cáo của Admin");
  }

  // ==========================================
  printStep(6, "Xóa bài viết (TC_Blog_Delete)");
  // ==========================================
  
  // 1. Reader cố gắng xóa bài (Phải thất bại vì không có quyền)
  const readerDelete = await fetchAPI(`/blogs/${currentBlogId}`, "DELETE", null, tokens.Reader);
  if (readerDelete.status === 403 || !readerDelete.data?.success) {
    printResult("TC_BL_06", true, "Hệ thống chặn thành công Reader xóa bài của người khác");
  } else {
    printResult("TC_BL_06", false, "LỖI BẢO MẬT: Reader xóa được bài của người khác!");
  }

  // 2. Author tự xóa bài của mình
  const authorDelete = await fetchAPI(`/blogs/${currentBlogId}`, "DELETE", null, tokens.Author);
  if (authorDelete.data?.success) {
    printResult("TC_BL_07", true, "Author xóa bài viết của chính mình thành công");
  } else {
    printResult("TC_BL_07", false, "Author xóa bài thất bại");
  }

  console.log("\n🚀 KẾT THÚC AUTOMATION TEST BLOG 🚀\n");
}

runBlogTests();
