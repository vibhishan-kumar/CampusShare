# 🎓 CampusShare — University of Hyderabad Student Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg)](https://vitejs.dev/)
[![Tailwind / Modern CSS](https://img.shields.io/badge/Design-Modern_CSS_Design_System-06B6D4.svg)](frontend/src/styles/index.css)

A full-stack, campus-exclusive peer-to-peer sharing and rental platform built for students of the **University of Hyderabad** (`@uohyd.ac.in`). **CampusShare** allows verified students to lend, borrow, and manage items like scientific calculators, lab gear, textbooks, cycles, and electronics with complete safety, transparent ratings, online payments, escrow deposits, wishlist matching, campus administrator controls, and real-time student chat.

---

## 🚀 Tech Stack

* **Frontend**: React.js 18, React Router v6, HTML5, CSS3 Custom Design System, JavaScript (ES6+)
* **Backend**: Node.js, Express.js, RESTful API architecture, **Socket.IO** (bi-directional real-time communication)
* **Database**: PostgreSQL (11 normalized tables with triggers, constraints, foreign keys) & Raw SQL + Zero-Config Dev SQLite Fallback
* **Authentication & Security**: JWT (JSON Web Tokens), `bcryptjs` password hashing, Role-Based Access Control (RBAC)
* **Payments**: **Razorpay** (official SDK integration, server-side order generation, HMAC-SHA256 signature verification) + Escrow security deposit model
* **Image Storage**: **Cloudinary** (cloud media hosting, auto-compression, CDN delivery) + local fallback
* **Input Validation**: Dedicated Regex & Backend Validation Middleware (enforcing `@uohyd.ac.in` email format, 10-digit Indian phone numbers, password rules, date boundaries, and data constraints)

---

## ✨ Key Features

1. **Campus-Restricted Authentication & Profiles**
   - Registration strictly restricted to official `@uohyd.ac.in` email addresses.
   - Profile management with Academic Department, Hostel, Room Number, Phone, and Avatar.
   - Dual-tab profile view for **Borrowing History** (with deposit receipts & return actions) and **My Listed Items**.

2. **Item Listing & Modern Marketplace**
   - List items with multiple photos, condition grading (`Brand New`, `Like New`, `Good`, `Fair`, `Usable`), daily rental fee (₹), and refundable security deposit (₹).
   - Categories: Academic & Books, Electronics & Gadgets, Cycles & Mobility, Sports & Fitness, Lab & Workshop Tools, Lifestyle & Hostel.
   - Dynamic availability tracking (automatically marked unavailable when rented out, with return countdown).

3. **Browse & Instant Search**
   - Live search across titles, descriptions, and hostel locations.
   - Interactive quick-filter category pills, price range filters, and availability toggles.
   - Sorting by newest listings, rental price, and alphabetical order.

4. **Rental Lifecycle & State Machine**
   - Complete transactional flow:
     $$\text{PENDING} \longrightarrow \text{ACCEPTED} \longrightarrow \text{PAYMENT} \longrightarrow \text{BORROWED} \longrightarrow \text{RETURN\_REQUESTED} \longrightarrow \text{COMPLETED}$$
   - Owner accept/decline actions with remarks.

5. **Online Payment Gateway & Escrow Deposit Protection**
   - Simulated and live-ready payment interface supporting:
     - **Dynamic UPI QR Code** with live 5-minute countdown and GPay/PhonePe/Paytm links
     - **Interactive Bank Card** with real-time formatting and simulated 3D-Secure SMS OTP
     - **Net Banking** for major Indian institutions (SBI, HDFC, ICICI, Axis, PNB)
     - **Razorpay Checkout** integration
   - Digital transaction receipts with payment reference IDs and escrow deposit guarantees.

6. **Item Return & 5-Star Peer Reviews**
   - Handover confirmation and automatic return of refundable security deposit.
   - 1–5 star ratings and reviews that calculate student peer trust scores.

7. **Campus Wishlist & Automated Matchmaker**
   - Wishlist board where students post gear they urgently need.
   - Automated notification triggers when another student lists a matching item.

8. **In-App Direct Chat**
   - Private conversation threads between borrowers and owners with item context and unread counters.

9. **Campus Administrator Control Center (`/admin`)**
   - Real-time KPIs: registered students, active listings, current borrows, total transactions.
   - Student account moderation: Suspend/Unban accounts or permanent removal with cascade deletion.
   - Marketplace moderation: Prohibit or remove invalid listings.
   - Campus borrow dispute resolution and force-complete overrides.

---

## ⚡ Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [Git](https://git-scm.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/CampusShare.git
cd CampusShare
```

### 2. Install Dependencies
```bash
# Install root, backend, and frontend dependencies
npm run install:all
```
*(Or install manually: `cd backend && npm install && cd ../frontend && npm install`)*

### 3. Configure Environment Variables
Copy `.env.example` to `.env` inside `backend/`:
```bash
cp backend/.env.example backend/.env
```
*(The defaults run out of the box with the embedded zero-config database!)*

### 4. Run the Development Servers
In separate terminals or using the root concurrent runner:

**Backend (API Server)**:
```bash
cd backend
npm start
# API running on http://localhost:5000
# Health check: http://localhost:5000/api/health
```

**Frontend (Vite UI)**:
```bash
cd frontend
npm run dev
# App running on http://localhost:5173
```

Open your browser at **`http://localhost:5173`**!

---

## 👥 Demo Student Credentials

All pre-seeded demo accounts use password: **`password123`** (or use the 1-click quick login buttons on the Sign In page):

| Student Name | Email | Department / Hostel |
| :--- | :--- | :--- |
| **Arun Sharma** | `arun.sharma@uohyd.ac.in` | CS Dept / Men's Hostel J - 214 |
| **Priya Verma** | `priya.verma@uohyd.ac.in` | Biotech / LH-3 - 102 |
| **Rahul Nair** | `rahul.nair@uohyd.ac.in` | Physics / Men's Hostel F - 308 |
| **Sneha Patel** | `sneha.patel@uohyd.ac.in` | SMS / LH-1 - 205 |

**Administrator Account**:
- **Email**: `admin@uohyd.ac.in`
- **Password**: `admin123`

---

## 🧪 Testing

To execute the automated end-to-end integration test suite:
```bash
cd backend
npm run test:api
```

---

## 📁 Project Structure

```
CampusShare/
├── backend/
│   ├── config/          # Database connection pool & fallback
│   ├── controllers/     # API route handlers
│   ├── database/        # PostgreSQL schema, seed data, and SQLite fallback
│   ├── middleware/      # Auth, Admin guard, and upload middlewares
│   ├── routes/          # Express route definitions
│   ├── services/        # Notifications and wishlist matching
│   ├── test/            # Integration test suite
│   ├── uploads/         # User uploaded images
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── api/         # Axios/Fetch API client
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # Auth and Notification contexts
│   │   ├── pages/       # Route pages
│   │   └── styles/      # Design system CSS tokens
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .gitignore
├── package.json
└── README.md
```

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
