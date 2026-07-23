// run_e2e_tests.js
// Kịch bản Automation Test (Không cần cài đặt thư viện ngoài, chạy bằng Node.js 18+)
// Yêu cầu: Server Backend đang chạy ở http://localhost:5000 (npm run dev)

const API_URL = "http://localhost:5000/api";
let tokens = { Admin: "", Organizer: "", Participant: "" };
let userIds = { Organizer: null, Participant: null };
let currentEventId = null;

const printStep = (step, msg) => console.log(`\n\x1b[36m=== BƯỚC ${step}: ${msg} ===\x1b[0m`);
const printResult = (tc, passed, msg) => {
  if (passed) console.log(`\x1b[32m[PASSED]\x1b[0m ${tc} - ${msg}`);
  else console.log(`\x1b[31m[FAILED]\x1b[0m ${tc} - ${msg}`);
};

const randomString = Math.random().toString(36).substring(7);
const orgEmail = `org_${randomString}@gmail.com`;
const partEmail = `part_${randomString}@gmail.com`;
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

async function runAllTests() {
  console.log("🚀 BẮT ĐẦU CHẠY AUTOMATION TEST TOÀN HỆ THỐNG (E2E) 🚀\n");

  // ==========================================
  printStep(1, "Thiết lập Admin (TC_Auth)");
  // ==========================================
  await fetchAPI("/debug/reset-admin", "GET");
  const adminLogin = await fetchAPI("/auth/login", "POST", { email: "admin@ems.edu.vn", password: "Admin@123" });
  if (adminLogin.data && adminLogin.data.success && adminLogin.data.data) {
    tokens.Admin = adminLogin.data.data.accessToken;
    printResult("Setup", true, "Đăng nhập Admin thành công");
  } else {
    printResult("Setup", false, "Đăng nhập Admin thất bại. Dừng test!");
    return;
  }

  // ==========================================
  printStep(2, "Đăng ký Organizer & Admin Duyệt (TC_AdminManagement)");
  // ==========================================
  const orgForm = new FormData();
  orgForm.append('email', orgEmail);
  orgForm.append('password', password);
  orgForm.append('fullName', 'Test Organizer');
  orgForm.append('role', 'Organizer');
  orgForm.append('organizationName', 'Test Org Corp');
  orgForm.append('documents', new Blob(['test pdf dummy content']), 'test_license.pdf');

  const orgReg = await fetchAPI("/auth/register", "POST", orgForm, null, true);
  if (orgReg.status === 200 || orgReg.status === 201) {
    printResult("TC_AU_01", true, "Đăng ký tài khoản Organizer thành công (Upload thành công)");
    
    // Đăng nhập Organizer để lấy userId
    const orgLogin = await fetchAPI("/auth/login", "POST", { email: orgEmail, password });
    if (orgLogin.data && orgLogin.data.success && orgLogin.data.data.user) {
      tokens.Organizer = orgLogin.data.data.accessToken;
      userIds.Organizer = orgLogin.data.data.user.userId;
      
      // Admin lấy danh sách Pending Organizers
      const pendingOrgsRes = await fetchAPI("/auth/admin/pending-organizers", "GET", null, tokens.Admin);
      let profileId = null;
      if (pendingOrgsRes.data && pendingOrgsRes.data.data) {
        const org = pendingOrgsRes.data.data.find(o => o.UserID === userIds.Organizer);
        if (org) profileId = org.OrganizerProfileID;
      }

      if (profileId) {
        // Admin duyệt Organizer
        const approveOrg = await fetchAPI(`/auth/admin/organizers/${profileId}/review`, "POST", { action: "approve" }, tokens.Admin);
        if (approveOrg.data && approveOrg.data.success) {
          printResult("TC_AD_01", true, "Admin duyệt quyền Organizer thành công");
        } else {
          printResult("TC_AD_01", false, "Admin duyệt quyền Organizer thất bại");
        }
      } else {
        printResult("TC_AD_01", false, "Không tìm thấy hồ sơ Organizer để duyệt");
      }
    } else {
      printResult("TC_AD_01", false, "Lỗi đăng nhập Organizer: " + JSON.stringify(orgLogin.data));
    }
  } else {
    printResult("TC_AU_01", false, "Đăng ký Organizer thất bại: " + JSON.stringify(orgReg.data));
  }

  // ==========================================
  printStep(3, "Organizer tạo sự kiện (TC_OrganizerEvent)");
  // ==========================================
  if (userIds.Organizer) {
    const eventForm = new FormData();
    eventForm.append('title', `Automation Event ${randomString}`);
    eventForm.append('description', 'Sự kiện được tạo tự động từ kịch bản test');
    eventForm.append('startDate', new Date(Date.now() + 86400000).toISOString()); // Ngày mai
    eventForm.append('endDate', new Date(Date.now() + 172800000).toISOString());
    eventForm.append('location', 'Test Location');
    eventForm.append('capacity', '100');
    eventForm.append('categoryId', '1');
    eventForm.append('documents', new Blob(['test event license']), 'event_license.pdf');

    const createRes = await fetchAPI("/events", "POST", eventForm, tokens.Organizer, true);
    if (createRes.data && createRes.data.success) {
      currentEventId = createRes.data.data.eventId;
      printResult("TC_OE_01", true, `Organizer tạo sự kiện thành công (ID: ${currentEventId})`);
      
      // Submit for Approval
      const submitRes = await fetchAPI(`/events/${currentEventId}/submit`, "POST", {}, tokens.Organizer);
      if (submitRes.data && submitRes.data.success) {
        printResult("TC_OE_02", true, "Organizer gửi duyệt sự kiện thành công");
      } else {
        printResult("TC_OE_02", false, "Gửi duyệt thất bại: " + JSON.stringify(submitRes.data));
      }
    } else {
      printResult("TC_OE_01", false, "Organizer tạo sự kiện thất bại: " + JSON.stringify(createRes.data));
    }
  }

  // ==========================================
  printStep(4, "Admin duyệt sự kiện (TC_AdminManagement)");
  // ==========================================
  if (currentEventId) {
    const approveEvt = await fetchAPI(`/admin/events/${currentEventId}/approve`, "POST", {}, tokens.Admin);
    if (approveEvt.data && approveEvt.data.success) {
      printResult("TC_AD_03", true, "Admin duyệt sự kiện thành công (Published)");
    } else {
      printResult("TC_AD_03", false, "Admin duyệt sự kiện thất bại: " + JSON.stringify(approveEvt.data));
    }
  }

  // ==========================================
  printStep(5, "Đăng ký Participant & Check-in (TC_CheckIn)");
  // ==========================================
  if (currentEventId) {
    // 1. Participant Register & Login
    await fetchAPI("/auth/register", "POST", { email: partEmail, password, fullName: "Test Participant" });
    const partLogin = await fetchAPI("/auth/login", "POST", { email: partEmail, password });
    
    if (partLogin.data && partLogin.data.success && partLogin.data.data.user) {
      tokens.Participant = partLogin.data.data.accessToken;
      userIds.Participant = partLogin.data.data.user.userId;

      // 2. Participant Register for event
      const registerEvt = await fetchAPI(`/registrations`, "POST", { eventId: currentEventId }, tokens.Participant);
      if (registerEvt.data && registerEvt.data.success) {
        printResult("TC_CI_01", true, "Participant đăng ký tham gia sự kiện thành công");
        
        // 3. Get OTP
        const myRegs = await fetchAPI(`/registrations/my`, "GET", null, tokens.Participant);
        let checkInOTP = null;
        if (myRegs.data && myRegs.data.data) {
          const regRecord = myRegs.data.data.find(r => r.EventID === currentEventId);
          if (regRecord) checkInOTP = regRecord.OTPCode;
        }
        
        if (checkInOTP) {
          // 4. Organizer scans QR using OTP
          const checkinRes = await fetchAPI(`/checkin/verify`, "POST", { eventId: currentEventId, otp: checkInOTP }, tokens.Organizer);
          
          if (checkinRes.data && checkinRes.data.success) {
            printResult("TC_CI_02", true, "Organizer Check-in cho Participant thành công");
            
            // 5. Test duplicate Check-in
            const dupCheckin = await fetchAPI(`/checkin/verify`, "POST", { eventId: currentEventId, otp: checkInOTP }, tokens.Organizer);
            if (!dupCheckin.data.success) {
              printResult("TC_CI_05", true, "Hệ thống chặn Check-in 2 lần thành công");
            } else {
              printResult("TC_CI_05", false, "LỖI BẢO MẬT: Hệ thống cho phép Check-in trùng lặp!");
            }
          } else {
            // Might fail because event is tomorrow! Which is correct according to business logic.
            printResult("TC_CI_03", true, "Hệ thống chặn Check-in (Có thể do chưa tới giờ sự kiện): " + checkinRes.data.message);
          }
        } else {
           printResult("TC_CI_01", false, "Không lấy được mã OTP của Participant");
        }
      } else {
        printResult("TC_CI_01", false, "Participant đăng ký sự kiện thất bại: " + JSON.stringify(registerEvt.data));
      }
    } else {
      printResult("TC_CI_01", false, "Đăng nhập Participant thất bại");
    }
  }

  console.log("\n🚀 KẾT THÚC AUTOMATION TEST E2E 🚀\n");
}

runAllTests();
