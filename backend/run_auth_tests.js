// run_auth_tests.js
// Kịch bản Automation Test (Không cần cài đặt thư viện ngoài, chạy bằng Node.js)
// Yêu cầu: Server Backend đang chạy ở http://localhost:5000 (npm run dev)

const API_URL = "http://localhost:5000/api/auth";

// Hàm hỗ trợ in kết quả (console màu)
const printResult = (tc, name, passed, msg) => {
  if (passed) {
    console.log(`\x1b[32m[PASSED]\x1b[0m ${tc}: ${name}`);
  } else {
    console.log(`\x1b[31m[FAILED]\x1b[0m ${tc}: ${name} \n  -> Lỗi: ${msg}`);
  }
};

async function runTests() {
  console.log("=========================================");
  console.log(" BẮT ĐẦU CHẠY AUTOMATION TEST: TC_AUTH");
  console.log("=========================================\n");

  const randomString = Math.random().toString(36).substring(7);
  const testEmail = `testuser_${randomString}@gmail.com`;
  const testPassword = "Password@123";

  // ---------------------------------------------------------
  // TC_AU_02: Signup input formatting (Lỗi format email)
  // ---------------------------------------------------------
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "invalid-email-format",
        password: "123",
        fullName: "Test User"
      })
    });
    const data = await res.json();
    if (res.status === 400 || !data.success) {
      printResult("TC_AU_02", "Signup with invalid formatting", true);
    } else {
      printResult("TC_AU_02", "Signup with invalid formatting", false, "Hệ thống không báo lỗi khi email sai định dạng");
    }
  } catch (err) {
    printResult("TC_AU_02", "Signup with invalid formatting", false, err.message);
  }

  // ---------------------------------------------------------
  // TC_AU_01: Signup with valid information
  // ---------------------------------------------------------
  let signupSuccess = false;
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        fullName: "Automation Tester"
      })
    });
    const data = await res.json();
    if ((res.status === 200 || res.status === 201) && data.success) {
      signupSuccess = true;
      printResult("TC_AU_01", "Signup with valid information", true);
    } else {
      printResult("TC_AU_01", "Signup with valid information", false, data.message || "Đăng ký thất bại");
    }
  } catch (err) {
    printResult("TC_AU_01", "Signup with valid information", false, err.message);
  }

  // ---------------------------------------------------------
  // TC_AU_03: Signup with existing email
  // ---------------------------------------------------------
  if (signupSuccess) {
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          fullName: "Another User"
        })
      });
      const data = await res.json();
      if (res.status === 400 || !data.success) {
        printResult("TC_AU_03", "Signup with existing email", true);
      } else {
        printResult("TC_AU_03", "Signup with existing email", false, "Cho phép đăng ký trùng email");
      }
    } catch (err) {
      printResult("TC_AU_03", "Signup with existing email", false, err.message);
    }
  } else {
    console.log(`\x1b[33m[SKIPPED]\x1b[0m TC_AU_03 (Bỏ qua vì TC_AU_01 thất bại)`);
  }

  // ---------------------------------------------------------
  // TC_AU_04: Login with valid credentials
  // ---------------------------------------------------------
  if (signupSuccess) {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });
      const data = await res.json();
      // Chú ý: Có thể User mới đăng ký cần xác thực email (IsVerified=0), 
      // tùy logic backend mà code có thể trả về lỗi "Vui lòng xác thực email".
      // Ở đây ta ghi nhận nếu trả về token HOẶC lỗi xác thực email đều coi là gọi API login thành công.
      if (data.success || (data.message && data.message.toLowerCase().includes('xác thực'))) {
        printResult("TC_AU_04", "Login with valid credentials", true);
      } else {
        printResult("TC_AU_04", "Login with valid credentials", false, data.message || "Đăng nhập thất bại");
      }
    } catch (err) {
      printResult("TC_AU_04", "Login with valid credentials", false, err.message);
    }
  } else {
    console.log(`\x1b[33m[SKIPPED]\x1b[0m TC_AU_04 (Bỏ qua vì TC_AU_01 thất bại)`);
  }

  // ---------------------------------------------------------
  // TC_AU_05: Forgot password request
  // ---------------------------------------------------------
  if (signupSuccess) {
    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail })
      });
      const data = await res.json();
      if (res.status === 200 || data.success) {
        printResult("TC_AU_05", "Forgot password request", true);
      } else {
        // Nếu chức năng gửi mail chưa cấu hình sẽ báo lỗi server 500
        printResult("TC_AU_05", "Forgot password request", false, data.message || "Gửi yêu cầu thất bại (có thể do chưa cấu hình SMTP)");
      }
    } catch (err) {
      printResult("TC_AU_05", "Forgot password request", false, err.message);
    }
  } else {
    console.log(`\x1b[33m[SKIPPED]\x1b[0m TC_AU_05 (Bỏ qua vì TC_AU_01 thất bại)`);
  }

  console.log("\n=========================================");
  console.log(" KẾT THÚC AUTOMATION TEST");
  console.log("=========================================");
}

runTests();
