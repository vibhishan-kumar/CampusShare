-- ==========================================================
-- Lend and Borrow: Seed Data
-- University of Hyderabad (@uohyd.ac.in)
-- ==========================================================

-- 1. Insert Categories
INSERT INTO categories (name, slug, description, icon) VALUES
('Academic & Books', 'academic-books', 'Textbooks, reference manuals, notes, and study material', 'book-open'),
('Electronics & Gadgets', 'electronics-gadgets', 'Calculators, chargers, adapters, monitors, and audio gear', 'cpu'),
('Cycles & Mobility', 'cycles-mobility', 'Bicycles, skateboards, helmets, and campus commute gear', 'bike'),
('Sports & Fitness', 'sports-fitness', 'Badminton rackets, footballs, cricket kits, and yoga mats', 'activity'),
('Lab & Workshop Tools', 'lab-tools', 'Lab aprons, dissection kits, breadboards, and tool sets', 'flask-conical'),
('Lifestyle & Hostel', 'lifestyle-hostel', 'Study lamps, kettles, irons, laundry racks, and dorm gear', 'home')
ON CONFLICT (slug) DO NOTHING;

-- 2. Insert Sample University Students
-- All passwords are set to 'password123' (hashed via bcrypt: $2a$10$tZ3J1Vl0M9X8/1L3OqJ8se1p.p3F8c8d8P5a4T8v2Y4q6W8e0R2aK)
INSERT INTO users (id, name, email, password_hash, phone, hostel_room, department, avatar_url, role) VALUES
(1, 'Arun Sharma', 'arun.sharma@uohyd.ac.in', '$2a$10$tZ3J1Vl0M9X8/1L3OqJ8se1p.p3F8c8d8P5a4T8v2Y4q6W8e0R2aK', '+91 9876543210', 'Men''s Hostel J - Room 214', 'Computer Science & Engineering', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'student'),
(2, 'Priya Verma', 'priya.verma@uohyd.ac.in', '$2a$10$tZ3J1Vl0M9X8/1L3OqJ8se1p.p3F8c8d8P5a4T8v2Y4q6W8e0R2aK', '+91 9876543211', 'Ladies Hostel LH-3 - Room 102', 'Biotechnology', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'student'),
(3, 'Rahul Nair', 'rahul.nair@uohyd.ac.in', '$2a$10$tZ3J1Vl0M9X8/1L3OqJ8se1p.p3F8c8d8P5a4T8v2Y4q6W8e0R2aK', '+91 9876543212', 'Men''s Hostel F - Room 308', 'School of Physics', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', 'student'),
(4, 'Sneha Patel', 'sneha.patel@uohyd.ac.in', '$2a$10$tZ3J1Vl0M9X8/1L3OqJ8se1p.p3F8c8d8P5a4T8v2Y4q6W8e0R2aK', '+91 9876543213', 'Ladies Hostel LH-1 - Room 205', 'School of Management Studies', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'student')
ON CONFLICT (email) DO NOTHING;

-- 3. Insert Campus Items
INSERT INTO items (id, owner_id, category_id, name, description, condition, price_per_day, deposit, image_url, location, is_available, status) VALUES
(1, 1, 2, 'Casio FX-991CW Advanced Scientific Calculator', 'Ideal for engineering mathematics, matrices, and statistics exams. Clean screen and fresh battery.', 'Like New', 15.00, 200.00, 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600', 'Men''s Hostel J Lobby / CS Dept', true, 'available'),
(2, 3, 3, 'Hercules Roadeo 21-Speed Gear Bicycle', 'Smooth commuter cycle with bottle holder and cable lock included. Great for moving between North and South campus.', 'Good', 40.00, 500.00, 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600', 'Men''s Hostel F Cycle Stand', true, 'available'),
(3, 2, 4, 'Yonex Carbonex Badminton Racket Set with Shuttlecocks', 'Pair of well-strung lightweight rackets, grip tape newly replaced. Includes half a tube of Mavis 350 shuttles.', 'Like New', 25.00, 300.00, 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600', 'Ladies Hostel LH-3 Reception', true, 'available'),
(4, 1, 2, 'Arduino Uno R3 Ultimate Sensor & Starter Kit', 'Includes Arduino board, ultrasonic sensor, OLED display, servo motor, jumper wires, and breadboard. Perfect for lab projects.', 'Like New', 35.00, 400.00, 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=600', 'CS Department Lab 2', true, 'available'),
(5, 2, 5, 'Cotton Chemistry Lab Coat & UV Safety Goggles', 'Unisex 100% white cotton lab apron (Size M/L) and anti-fog splash goggles. Washed and sanitized.', 'Good', 10.00, 100.00, 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600', 'School of Chemistry Foyer', true, 'available'),
(6, 4, 1, 'Introduction to Algorithms (CLRS 3rd Edition)', 'Hardcover standard textbook for Design and Analysis of Algorithms. Highlight-free and well-maintained.', 'Good', 20.00, 250.00, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600', 'SMS Library or LH-1', true, 'available'),
(7, 3, 6, 'Philips Rechargeable LED Desk Study Lamp', 'Foldable 3-stage touch brightness lamp with 8 hours battery backup. Lifesaver during hostel power cuts.', 'Brand New', 15.00, 150.00, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600', 'Physics Dept Reading Room', true, 'available'),
(8, 4, 2, 'Boat Stone 1200 14W Bluetooth Speaker', 'Portable rugged speaker with crisp bass. Great for hostel terrace acoustic sessions and presentations.', 'Good', 30.00, 350.00, 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600', 'LH-1 Common Room', true, 'available')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Wishlist Requests
INSERT INTO wishlist (user_id, category_id, title, max_price, notes, status) VALUES
(2, 2, 'Mini HDMI to VGA adapter for lab presentation', 20.00, 'Needed on Thursday afternoon for project demo in School of Biotech seminar hall.', 'active'),
(1, 4, 'Table Tennis Racket Pair', 30.00, 'Looking for TT bats for evening hostel tournament this weekend.', 'active'),
(4, 3, 'Helmet for bicycle / motorized two-wheeler', 25.00, 'ISI marked full or half helmet needed for 3 days.', 'active');

-- 5. Insert Sample Completed Borrow & Feedback
INSERT INTO borrow_requests (id, item_id, borrower_id, start_date, end_date, total_price, status, request_note, owner_remarks) VALUES
(1, 1, 2, '2026-09-01', '2026-09-03', 30.00, 'COMPLETED', 'Need for end-semester Biostatistics exam.', 'Sure Priya, take good care of it!'),
(2, 2, 4, '2026-09-05', '2026-09-08', 120.00, 'BORROWED', 'Need for weekend city trip and campus errands.', 'Keys and lock code handed over.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, borrow_request_id, payer_id, payee_id, amount, payment_method, status, payment_reference) VALUES
(1, 1, 2, 1, 30.00, 'UPI', 'SUCCESS', 'PAY-UOH-20260901-8841'),
(2, 2, 4, 3, 120.00, 'CAMPUS_WALLET', 'SUCCESS', 'PAY-UOH-20260905-9932')
ON CONFLICT (id) DO NOTHING;

INSERT INTO transactions (payment_id, transaction_type, amount, status, transaction_code) VALUES
(1, 'BORROW_FEE', 30.00, 'COMPLETED', 'TXN-UOH-001'),
(2, 'BORROW_FEE', 120.00, 'COMPLETED', 'TXN-UOH-002');

INSERT INTO returns (borrow_request_id, return_request_date, actual_return_date, return_status, borrower_note, owner_note, deposit_refunded) VALUES
(1, '2026-09-03 16:00:00+05:30', '2026-09-03 16:30:00+05:30', 'CONFIRMED', 'Returned in exact same condition with case.', 'Received on time, thanks!', true);

INSERT INTO feedback (borrow_request_id, reviewer_id, target_user_id, item_id, rating, comment) VALUES
(1, 2, 1, 1, 5, 'Arun was very helpful and the calculator worked flawlessly for my exam! Highly recommend.'),
(1, 1, 2, 1, 5, 'Priya took great care of the calculator and returned it right on schedule.');

-- 6. Sample Notifications
INSERT INTO notifications (user_id, title, message, type, link) VALUES
(1, 'Return Completed', 'Priya Verma returned your Casio FX-991CW. Transaction completed.', 'RETURN_CONFIRMED', '/dashboard'),
(2, 'Item Returned & Rated', 'Your return for Casio FX-991CW was accepted. You received a 5-star rating!', 'RETURN_CONFIRMED', '/dashboard'),
(4, 'Borrow Request Approved', 'Rahul Nair accepted your borrow request for Hercules Roadeo Bicycle!', 'REQUEST_ACCEPTED', '/dashboard');
