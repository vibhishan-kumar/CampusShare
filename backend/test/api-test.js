// Automated Backend Integration Test
const app = require('../server');
const http = require('http');

let server;
const PORT = 5002;
const BASE_URL = `http://localhost:${PORT}/api`;

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function runTests() {
  console.log('\n🧪 Running CampusShare Backend Verification Tests...\n');
  server = app.listen(PORT);

  // Wait 1s for db init
  await new Promise(r => setTimeout(r, 1000));

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('/health');
    assert(health.status === 200 && health.data.status === 'healthy', 'Health check responds with healthy');

    // 2. Reject OTP request with non-@uohyd.ac.in email
    const badOtp = await request('/auth/send-otp', {
      method: 'POST',
      body: { email: 'intruder@gmail.com' },
    });
    assert(badOtp.status === 400, 'OTP request rejects non-@uohyd.ac.in email');

    // 3. Send OTP to valid university student 1
    const ts = Date.now();
    const student1Email = `student1_${ts}@uohyd.ac.in`;
    const otpRes1 = await request('/auth/send-otp', {
      method: 'POST',
      body: { email: student1Email },
    });
    assert(otpRes1.status === 200 && otpRes1.data.devOtp, 'OTP successfully sent to Student 1');
    const otp1 = otpRes1.data.devOtp;

    // 4. Reject registration with wrong OTP
    const wrongOtpReg = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Vikram Reddy',
        phone: '+91 9876543210',
        school: 'School of Computer and Information Sciences',
        program: 'MCA',
        hostel: "Men's Hostel J",
        room_no: '214',
        email: student1Email,
        otp: '000000',
        password: 'password123',
      },
    });
    assert(wrongOtpReg.status === 400, 'Registration rejects incorrect OTP');

    // 5. Register Student 1 with valid OTP and all fields
    const reg1 = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Vikram Reddy',
        phone: '+91 9876543210',
        school: 'School of Computer and Information Sciences',
        program: 'MCA',
        hostel: "Men's Hostel J",
        room_no: '214',
        email: student1Email,
        otp: otp1,
        password: 'password123',
      },
    });
    assert(reg1.status === 201 && reg1.data.token && reg1.data.user.school === 'School of Computer and Information Sciences', 'Student 1 registers with OTP and credentials');
    const token1 = reg1.data.token;
    const user1 = reg1.data.user;

    // 6. Send OTP and register Student 2
    const student2Email = `student2_${ts}@uohyd.ac.in`;
    const otpRes2 = await request('/auth/send-otp', {
      method: 'POST',
      body: { email: student2Email },
    });
    const otp2 = otpRes2.data.devOtp;

    const reg2 = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Ananya Rao',
        phone: '+91 9876543211',
        school: 'School of Humanities',
        program: 'M.A.',
        hostel: 'Ladies Hostel LH-2',
        room_no: '304',
        email: student2Email,
        otp: otp2,
        password: 'password123',
      },
    });
    assert(reg2.status === 201 && reg2.data.token, 'Student 2 registers with OTP and credentials');
    const token2 = reg2.data.token;
    const user2 = reg2.data.user;

    // 5. Login verification
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: student1Email, password: 'password123' },
    });
    assert(loginRes.status === 200 && loginRes.data.user.email === student1Email, 'Login with university credentials');

    // 6. Student 1 adds an item
    const addItemRes = await request('/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        name: 'Sony WH-1000XM4 Noise Cancelling Headphones',
        category_id: 2,
        description: 'Excellent for exam study in the campus library.',
        condition: 'Like New',
        price_per_day: 50.00,
        deposit: 1000.00,
        location: "Men's Hostel J Lobby",
      },
    });
    assert(addItemRes.status === 201 && addItemRes.data.item.id, 'Student 1 creates an item listing');
    const itemId = addItemRes.data.item.id;

    // 7. Student 1 cannot borrow their own item
    const selfBorrow = await request('/borrows', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        item_id: itemId,
        start_date: '2026-09-15',
        end_date: '2026-09-17',
      },
    });
    assert(selfBorrow.status === 400, 'Student cannot borrow their own item');

    // 8. Student 2 sends borrow request to Student 1
    const borrowRes = await request('/borrows', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: {
        item_id: itemId,
        start_date: '2026-09-15',
        end_date: '2026-09-17',
        request_note: 'Need for preparing my dissertation viva.',
      },
    });
    assert(borrowRes.status === 201 && borrowRes.data.borrowRequest.id, 'Student 2 submits borrow request');
    const requestId = borrowRes.data.borrowRequest.id;

    // 9. Student 1 accepts borrow request
    const acceptRes = await request(`/borrows/${requestId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token1}` },
      body: { action: 'ACCEPT', owner_remarks: 'Approved, see you at the library foyer.' },
    });
    assert(acceptRes.status === 200 && acceptRes.data.borrowRequest.status === 'ACCEPTED', 'Item owner accepts borrow request');

    // 9.5 Create Online Payment Order Session
    const orderRes = await request('/payments/create-order', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: { borrow_request_id: requestId },
    });
    assert(orderRes.status === 200 && orderRes.data.order.orderId, 'Online payment order session created');

    // 10. Student 2 performs online payment
    const payRes = await request('/payments/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: {
        borrow_request_id: requestId,
        payment_method: 'ONLINE_UPI',
        upi_id: 'student2@oksbi',
        transaction_id: 'UPI-TEST-123456',
      },
    });
    assert(
      payRes.status === 200 && 
      payRes.data.receipt.paymentReference && 
      payRes.data.receipt.method === 'ONLINE_UPI', 
      'Online UPI payment succeeds and digital receipt generated'
    );

    // Verify razorpay signature verification endpoint
    const rzpVerifyRes = await request('/payments/verify-razorpay', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: {
        razorpay_order_id: 'order_test_123',
        razorpay_payment_id: 'pay_test_123',
        razorpay_signature: 'sig_test_123',
      },
    });
    assert(rzpVerifyRes.status === 200 && rzpVerifyRes.data.verified, 'Razorpay verification endpoint responds');

    // Verify item is now marked borrowed and not available
    const itemCheck = await request(`/items/${itemId}`);
    assert(itemCheck.data.item.is_available === false && itemCheck.data.item.status === 'borrowed', 'Item status updated to borrowed');

    // 11. Student 2 initiates return
    const returnReq = await request('/returns/initiate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: {
        borrow_request_id: requestId,
        borrower_note: 'Finished my viva, returning in perfect shape.',
      },
    });
    assert(returnReq.status === 200, 'Borrower initiates return');

    // 12. Student 1 confirms return
    const confirmReturn = await request('/returns/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        borrow_request_id: requestId,
        owner_note: 'Item checked and intact. Deposit returned.',
        deposit_refunded: true,
      },
    });
    assert(confirmReturn.status === 200, 'Owner confirms return receipt');

    // Verify item is available again
    const itemAvailableCheck = await request(`/items/${itemId}`);
    assert(itemAvailableCheck.data.item.is_available === true && itemAvailableCheck.data.item.status === 'available', 'Item status reset to available');

    // 13. Student 2 submits 5-star feedback
    const feedbackRes = await request('/feedback', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: {
        borrow_request_id: requestId,
        rating: 5,
        comment: 'Vikram was very polite and punctual. The headphones were pristine!',
      },
    });
    assert(feedbackRes.status === 201, 'Borrower submits 5-star rating & review');

    // 14. Wishlist matching
    // Student 2 posts a wish for "Scientific Calculator"
    const wishRes = await request('/wishlist', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: {
        title: 'Casio Scientific Calculator fx-991',
        category_id: 2,
        max_price: 30.00,
        notes: 'Needed for stats exam',
      },
    });
    assert(wishRes.status === 201, 'Student posts a campus wishlist item');

    // Student 1 posts matching calculator item
    const matchItemRes = await request('/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        name: 'Casio Scientific Calculator fx-991EX',
        category_id: 2,
        description: 'Standard engineering calculator with all matrix functions.',
        condition: 'Like New',
        price_per_day: 20.00,
        deposit: 150.00,
      },
    });
    assert(matchItemRes.status === 201, 'Matching item posted');

    // Check Student 2 notifications for wishlist match
    const notifs = await request('/notifications', {
      headers: { Authorization: `Bearer ${token2}` },
    });
    const hasWishlistAlert = notifs.data.notifications.some(n => n.type === 'WISHLIST_MATCH');
    assert(hasWishlistAlert, 'Wishlist matching notification successfully triggered');

    // 15. In-App Messaging
    const convoRes = await request('/messages/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: { target_user_id: user1.id, item_id: itemId },
    });
    assert(convoRes.status === 200 || convoRes.status === 201, 'Start messaging conversation');
    const convoId = convoRes.data.conversation.id;

    const msgRes = await request(`/messages/conversations/${convoId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
      body: { message_text: 'Hi Vikram, thank you again for the headphones!' },
    });
    assert(msgRes.status === 201, 'Send message in conversation');

    // 16. Admin Access Control - Regular student blocked
    const studentBlocked = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert(studentBlocked.status === 403, 'Regular student blocked from admin endpoint (403)');

    // 17. Admin Login
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@uohyd.ac.in', password: 'password123' },
    });
    assert(adminLogin.status === 200 && adminLogin.data.user.role === 'admin', 'Campus Administrator login successful');
    const adminToken = adminLogin.data.token;

    // 18. Admin Platform Stats & KPIs
    const adminStats = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminStats.status === 200 && 
      typeof adminStats.data.stats.totalStudents === 'number' &&
      typeof adminStats.data.stats.totalItems === 'number',
      'Admin successfully fetches platform KPIs & stats'
    );

    // 19. Admin User Directory
    const adminUsers = await request('/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminUsers.status === 200 && Array.isArray(adminUsers.data.users) && adminUsers.data.users.length > 0,
      'Admin fetches student user directory'
    );

    // 20. Admin Item Moderation List
    const adminItems = await request('/admin/items', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminItems.status === 200 && Array.isArray(adminItems.data.items),
      'Admin fetches campus items for moderation'
    );

    // 21. Admin Borrow Ledger
    const adminBorrows = await request('/admin/borrows', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminBorrows.status === 200 && Array.isArray(adminBorrows.data.borrows),
      'Admin fetches campus-wide borrow ledger'
    );

    // 22. Admin Ban/Unban Toggle
    const banToggle = await request(`/admin/users/${user1.id}/ban`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(banToggle.status === 200 && banToggle.data.is_banned === true, 'Admin bans student account');

    // 23. Banned student items hidden from public website
    const publicItemsWhileBanned = await request('/items');
    const hasBannedStudentItem = publicItemsWhileBanned.data.items.some(it => it.owner_id === user1.id);
    assert(!hasBannedStudentItem, 'Banned student items are NOT visible on public website');

    const itemDetailWhileBanned = await request(`/items/${itemId}`, {
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert(itemDetailWhileBanned.status === 404, 'Banned student item detail returns 404 to other students');

    // 24. Banned student write actions blocked with clear message
    const bannedItemPost = await request('/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: {
        name: 'Casio Banned Test Calculator',
        condition: 'Good',
        price_per_day: 10,
      },
    });
    assert(
      bannedItemPost.status === 403 && bannedItemPost.data.message.includes('suspended'),
      'Banned student write attempt (create item) blocked with clear suspension message'
    );

    const bannedMsgPost = await request(`/messages/conversations/${convoId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: { message_text: 'Hello, this should fail' },
    });
    assert(
      bannedMsgPost.status === 403 && bannedMsgPost.data.message.includes('suspended'),
      'Banned student write attempt (send message) blocked with clear suspension message'
    );

    const bannedWishPost = await request('/wishlist', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: { title: 'Banned student wish test' },
    });
    assert(
      bannedWishPost.status === 403 && bannedWishPost.data.message.includes('suspended'),
      'Banned student write attempt (post wish) blocked with clear suspension message'
    );

    // 25. Unban restores all previous items and write access
    const unbanToggle = await request(`/admin/users/${user1.id}/ban`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(unbanToggle.status === 200 && unbanToggle.data.is_banned === false, 'Admin unbans student account');

    const publicItemsAfterUnban = await request('/items');
    const hasRestoredItem = publicItemsAfterUnban.data.items.some(it => it.owner_id === user1.id);
    assert(hasRestoredItem, 'Unbanned student previous items immediately restored and visible on website');

    // 26. Permanent Student Removal by Admin
    const deleteStudentRes = await request(`/admin/users/${user2.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deleteStudentRes.status === 200 && deleteStudentRes.data.success, 'Admin permanently removes Student 2');

    // 27. Verify all data wiped from database
    const dbCheck = require('../config/db');
    const { rows: remainingUsers } = await dbCheck.query('SELECT id FROM users WHERE id = $1', [user2.id]);
    const { rows: remainingVerifs } = await dbCheck.query('SELECT id FROM email_verifications WHERE email = $1', [student2Email]);
    const { rows: remainingBorrows } = await dbCheck.query('SELECT id FROM borrow_requests WHERE borrower_id = $1', [user2.id]);
    assert(
      remainingUsers.length === 0 && remainingVerifs.length === 0 && remainingBorrows.length === 0,
      'All student records, verifications, and borrow history permanently wiped from database'
    );

    console.log(`\n🎉 Verification Completed: ${passed} passed, ${failed} failed.\n`);
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('❌ Test execution error:', err);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
