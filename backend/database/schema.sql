-- ==========================================================
-- Lend and Borrow: Campus Item Sharing Platform
-- PostgreSQL Normalized Database Schema
-- University of Hyderabad (@uohyd.ac.in)
-- ==========================================================

-- Clean up existing tables if resetting
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS borrow_requests CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS wishlist CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
-- Enforces university email domain @uohyd.ac.in
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL CHECK (email LIKE '%@uohyd.ac.in'),
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    school VARCHAR(150),
    program VARCHAR(100),
    hostel VARCHAR(100),
    room_no VARCHAR(50),
    hostel_room VARCHAR(100),
    department VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- EMAIL VERIFICATIONS TABLE (For Registration OTP)
CREATE TABLE email_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_email_verifications_email ON email_verifications(email);

-- 2. CATEGORIES TABLE
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'package',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ITEMS TABLE
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    condition VARCHAR(50) NOT NULL CHECK (condition IN ('Brand New', 'Like New', 'Good', 'Fair', 'Usable')),
    price_per_day NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price_per_day >= 0),
    deposit NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (deposit >= 0),
    image_url TEXT,
    location VARCHAR(150),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(30) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'borrowed', 'maintenance', 'hidden')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. BORROW REQUESTS TABLE
-- Tracks status: PENDING -> ACCEPTED -> PAYMENT -> BORROWED -> RETURN_REQUESTED -> RETURNED -> COMPLETED (or REJECTED / CANCELLED)
CREATE TABLE borrow_requests (
    id SERIAL PRIMARY KEY,
    item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    borrower_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date >= start_date),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'ACCEPTED', 'REJECTED', 'PAYMENT', 'BORROWED', 
        'RETURN_REQUESTED', 'RETURNED', 'COMPLETED', 'CANCELLED'
    )),
    request_note TEXT,
    owner_remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. PAYMENTS TABLE
-- Mock payment records
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    borrow_request_id INT NOT NULL REFERENCES borrow_requests(id) ON DELETE CASCADE,
    payer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('UPI', 'CAMPUS_WALLET', 'CARD', 'CASH')),
    status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
    payment_reference VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TRANSACTIONS TABLE
-- Itemized breakdown (Rental fee, security deposit, refund)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    payment_id INT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('BORROW_FEE', 'SECURITY_DEPOSIT', 'REFUND')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    transaction_code VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. RETURNS TABLE
CREATE TABLE returns (
    id SERIAL PRIMARY KEY,
    borrow_request_id INT NOT NULL REFERENCES borrow_requests(id) ON DELETE CASCADE,
    return_request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actual_return_date TIMESTAMP WITH TIME ZONE,
    return_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (return_status IN ('PENDING', 'CONFIRMED', 'DISPUTED')),
    borrower_note TEXT,
    owner_note TEXT,
    deposit_refunded BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. FEEDBACK TABLE
-- 1 to 5 star ratings and reviews
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    borrow_request_id INT NOT NULL REFERENCES borrow_requests(id) ON DELETE CASCADE,
    reviewer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. CAMPUS WISHLIST TABLE
-- Students add items they wish to borrow, system notifies upon availability
CREATE TABLE wishlist (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    max_price NUMERIC(10, 2) CHECK (max_price IS NULL OR max_price >= 0),
    notes TEXT,
    status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. CONVERSATIONS & MESSAGES TABLE
-- In-app messaging between students
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(id) ON DELETE SET NULL,
    user1_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_pair UNIQUE (user1_id, user2_id, item_id)
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    link VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-performance queries
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_owner ON items(owner_id);
CREATE INDEX idx_items_availability ON items(is_available, status);
CREATE INDEX idx_borrow_requests_borrower ON borrow_requests(borrower_id);
CREATE INDEX idx_borrow_requests_item ON borrow_requests(item_id);
CREATE INDEX idx_borrow_requests_status ON borrow_requests(status);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_wishlist_user ON wishlist(user_id, status);
