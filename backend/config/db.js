const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let pgPool = null;
let sqliteDb = null;
let isPostgresActive = false;

// 1. Configure PostgreSQL Pool
const pgConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.PGUSER || 'postgres',
      host: process.env.PGHOST || 'localhost',
      database: process.env.PGDATABASE || 'lend_and_borrow',
      password: process.env.PGPASSWORD || 'postgres',
      port: parseInt(process.env.PGPORT || '5432', 10),
      connectionTimeoutMillis: 2500,
    };

// Test PG Connection & fallback gracefully
async function initDatabase() {
  try {
    const testPool = new Pool(pgConfig);
    const client = await testPool.connect();
    await client.query('SELECT 1');
    client.release();
    pgPool = testPool;
    isPostgresActive = true;
    console.log('✅ Connected successfully to PostgreSQL database:', pgConfig.database || process.env.DATABASE_URL);
  } catch (err) {
    console.warn('⚠️  PostgreSQL connection unavailable (' + (err.message || 'connection failed') + ').');
    console.log('🔄 Switching seamlessly to built-in development SQLite engine...');
    initSqliteFallback();
  }
}

function initSqliteFallback() {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.resolve(__dirname, '../database/dev_campus.sqlite');
  
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Failed to open SQLite fallback database:', err.message);
    } else {
      console.log('✅ SQLite dev database active at:', dbPath);
      setupSqliteSchema();
    }
  });
}

// Convert PostgreSQL $1, $2, $3 to ? for SQLite and map parameters in order
function convertPgToSqlite(text, params = []) {
  const sqliteParams = [];
  const sqliteSql = text.replace(/\$(\d+)/g, (match, num) => {
    const idx = parseInt(num, 10) - 1;
    sqliteParams.push(params[idx]);
    return '?';
  });
  return { sqliteSql, sqliteParams };
}

function query(text, params = []) {
  if (isPostgresActive && pgPool) {
    return pgPool.query(text, params);
  }

  return new Promise((resolve, reject) => {
    if (!sqliteDb) {
      return reject(new Error('Database not initialized'));
    }

    const { sqliteSql, sqliteParams } = convertPgToSqlite(text, params);

    const trimmed = text.trim().toUpperCase();
    const isSelect = trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA') || trimmed.includes('RETURNING');

    if (trimmed.startsWith('SELECT') || trimmed.startsWith('PRAGMA')) {
      sqliteDb.all(sqliteSql, sqliteParams, (err, rows) => {
        if (err) return reject(err);
        resolve({ rows: rows || [], rowCount: (rows || []).length });
      });
    } else if (trimmed.includes('RETURNING')) {
      const cleanText = text.replace(/RETURNING\s+.*$/i, '');
      const { sqliteSql: cleanSql, sqliteParams: runParams } = convertPgToSqlite(cleanText, params);
      const insertMatch = text.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)/i);
      const updateMatch = text.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET/i);

      sqliteDb.run(cleanSql, runParams, function (err) {
        if (err) return reject(err);
        if (insertMatch) {
          const tableName = insertMatch[1];
          const lastId = this.lastID;
          sqliteDb.get(`SELECT * FROM ${tableName} WHERE id = ?`, [lastId], (fetchErr, row) => {
            resolve({ rows: row ? [row] : [{ id: lastId }], rowCount: this.changes });
          });
        } else if (updateMatch) {
          const tableName = updateMatch[1];
          // Last param is typically id in WHERE id = $X
          const targetId = params[params.length - 1];
          sqliteDb.get(`SELECT * FROM ${tableName} WHERE id = ?`, [targetId], (fetchErr, row) => {
            resolve({ rows: row ? [row] : [], rowCount: this.changes });
          });
        } else {
          resolve({ rows: [], rowCount: this.changes });
        }
      });
    } else {
      sqliteDb.run(sqliteSql, sqliteParams, function (err) {
        if (err) return reject(err);
        resolve({
          rows: [],
          rowCount: this.changes,
          insertId: this.lastID,
        });
      });
    }
  });
}

function setupSqliteSchema() {
  // Create tables in SQLite compatible syntax
  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL CHECK (email LIKE '%@uohyd.ac.in'),
      password_hash TEXT NOT NULL,
      phone TEXT,
      school TEXT,
      program TEXT,
      hostel TEXT,
      room_no TEXT,
      hostel_room TEXT,
      department TEXT,
      avatar_url TEXT,
      role TEXT DEFAULT 'student',
      is_verified INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS email_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'package',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      description TEXT,
      condition TEXT NOT NULL,
      price_per_day REAL NOT NULL DEFAULT 0.0,
      deposit REAL NOT NULL DEFAULT 0.0,
      image_url TEXT,
      location TEXT,
      is_available INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'available',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS borrow_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      borrower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      request_note TEXT,
      owner_remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      borrow_request_id INTEGER NOT NULL REFERENCES borrow_requests(id) ON DELETE CASCADE,
      payer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SUCCESS',
      payment_reference TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      transaction_type TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      transaction_code TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      borrow_request_id INTEGER NOT NULL REFERENCES borrow_requests(id) ON DELETE CASCADE,
      return_request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      actual_return_date DATETIME,
      return_status TEXT NOT NULL DEFAULT 'PENDING',
      borrower_note TEXT,
      owner_note TEXT,
      deposit_refunded INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      borrow_request_id INTEGER NOT NULL REFERENCES borrow_requests(id) ON DELETE CASCADE,
      reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS wishlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      max_price REAL,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
      user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message_text TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      link TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
  ];

  sqliteDb.serialize(() => {
    schemaStatements.forEach((stmt) => sqliteDb.run(stmt));

    // Safely add any new columns to users table if it existed from previous run
    const columnsToAdd = [
      'ALTER TABLE users ADD COLUMN school TEXT;',
      'ALTER TABLE users ADD COLUMN program TEXT;',
      'ALTER TABLE users ADD COLUMN hostel TEXT;',
      'ALTER TABLE users ADD COLUMN room_no TEXT;',
      'ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 1;',
      'ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0;',
    ];
    columnsToAdd.forEach((colStmt) => {
      sqliteDb.run(colStmt, () => {}); // Silently ignore if column already exists
    });

    // Ensure Campus Administrator account exists (password: password123)
    const adminPassHash = '$2a$10$WYfIhPCI8PDs8iGnDlO3/OzXPh4YsUCDiqqLIEhaOn3S40MLp4t9S';
    sqliteDb.run(
      `INSERT OR IGNORE INTO users (name, email, password_hash, phone, school, program, hostel, room_no, hostel_room, department, avatar_url, role, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Campus Administrator',
        'admin@uohyd.ac.in',
        adminPassHash,
        '+91 40 23130000',
        'Office of the Proctor & Student Affairs',
        'Campus Administration',
        'Admin Block',
        'Room 101',
        'Admin Block - Room 101',
        'Campus Administration',
        'https://api.dicebear.com/7.x/initials/svg?seed=Admin',
        'admin',
        1,
      ],
      () => {
        // Ensure admin has updated password and role
        sqliteDb.run(`UPDATE users SET password_hash = ?, role = 'admin' WHERE email = 'admin@uohyd.ac.in'`, [adminPassHash]);
      }
    );

    seedSqliteIfEmpty();
  });
}

function seedSqliteIfEmpty() {
  sqliteDb.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err || (row && row.count > 0)) return;

    console.log('🌱 Seeding initial campus data into dev database...');
    // Seed sample categories
    const categories = [
      ['Academic & Books', 'academic-books', 'Textbooks, reference manuals, notes, and study material', 'book-open'],
      ['Electronics & Gadgets', 'electronics-gadgets', 'Calculators, chargers, adapters, monitors, and audio gear', 'cpu'],
      ['Cycles & Mobility', 'cycles-mobility', 'Bicycles, skateboards, helmets, and campus commute gear', 'bike'],
      ['Sports & Fitness', 'sports-fitness', 'Badminton rackets, footballs, cricket kits, and yoga mats', 'activity'],
      ['Lab & Workshop Tools', 'lab-tools', 'Lab aprons, dissection kits, breadboards, and tool sets', 'flask-conical'],
      ['Lifestyle & Hostel', 'lifestyle-hostel', 'Study lamps, kettles, irons, laundry racks, and dorm gear', 'home']
    ];
    const catStmt = sqliteDb.prepare('INSERT OR IGNORE INTO categories (name, slug, description, icon) VALUES (?, ?, ?, ?)');
    categories.forEach(c => catStmt.run(c));
    catStmt.finalize();

    // Seed sample students (password: password123)
    const passHash = '$2a$10$FdcCMJf/5XHbkN8HzAZFkOzqOkhOGbtSAanzucJKuOaShTzPG4vOO';
    const students = [
      ['Arun Sharma', 'arun.sharma@uohyd.ac.in', passHash, '+91 9876543210', "Men's Hostel J - Room 214", 'Computer Science & Engineering', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'],
      ['Priya Verma', 'priya.verma@uohyd.ac.in', passHash, '+91 9876543211', "Ladies Hostel LH-3 - Room 102", 'Biotechnology', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'],
      ['Rahul Nair', 'rahul.nair@uohyd.ac.in', passHash, '+91 9876543212', "Men's Hostel F - Room 308", 'School of Physics', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150'],
      ['Sneha Patel', 'sneha.patel@uohyd.ac.in', passHash, '+91 9876543213', "Ladies Hostel LH-1 - Room 205", 'School of Management Studies', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'],
      ['Vikram Reddy', 'vikram.reddy@uohyd.ac.in', passHash, '+91 9876543214', "Men's Hostel J - Room 214", 'MCA, School of Computer and Information Sciences', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150']
    ];
    const stuStmt = sqliteDb.prepare('INSERT OR IGNORE INTO users (name, email, password_hash, phone, hostel_room, department, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)');
    students.forEach(s => stuStmt.run(s));
    stuStmt.finalize();

    // Seed sample items
    const items = [
      [1, 2, 'Casio FX-991CW Advanced Scientific Calculator', 'Ideal for engineering mathematics, matrices, and statistics exams. Clean screen and fresh battery.', 'Like New', 15.00, 200.00, 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600', "Men's Hostel J Lobby / CS Dept", 1, 'available'],
      [3, 3, 'Hercules Roadeo 21-Speed Gear Bicycle', 'Smooth commuter cycle with bottle holder and cable lock included. Great for moving between North and South campus.', 'Good', 40.00, 500.00, 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600', "Men's Hostel F Cycle Stand", 1, 'available'],
      [2, 4, 'Yonex Carbonex Badminton Racket Set with Shuttlecocks', 'Pair of well-strung lightweight rackets, grip tape newly replaced. Includes half a tube of Mavis 350 shuttles.', 'Like New', 25.00, 300.00, 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600', 'Ladies Hostel LH-3 Reception', 1, 'available'],
      [1, 2, 'Arduino Uno R3 Ultimate Sensor & Starter Kit', 'Includes Arduino board, ultrasonic sensor, OLED display, servo motor, jumper wires, and breadboard.', 'Like New', 35.00, 400.00, 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=600', 'CS Department Lab 2', 1, 'available'],
      [2, 5, 'Cotton Chemistry Lab Coat & UV Safety Goggles', 'Unisex 100% white cotton lab apron (Size M/L) and anti-fog splash goggles. Washed and sanitized.', 'Good', 10.00, 100.00, 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600', 'School of Chemistry Foyer', 1, 'available'],
      [4, 1, 'Introduction to Algorithms (CLRS 3rd Edition)', 'Hardcover standard textbook for Design and Analysis of Algorithms. Clean and well-maintained.', 'Good', 20.00, 250.00, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600', 'SMS Library or LH-1', 1, 'available'],
      [3, 6, 'Philips Rechargeable LED Desk Study Lamp', 'Foldable 3-stage touch brightness lamp with 8 hours battery backup. Lifesaver during hostel power cuts.', 'Brand New', 15.00, 150.00, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600', 'Physics Dept Reading Room', 1, 'available'],
      [4, 2, 'Boat Stone 1200 14W Bluetooth Speaker', 'Portable rugged speaker with crisp bass. Great for hostel terrace acoustic sessions and presentations.', 'Good', 30.00, 350.00, 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600', 'LH-1 Common Room', 1, 'available'],
      [5, 2, 'Sony WH-1000XM4 Noise Cancelling Headphones', 'Industry leading noise cancellation, LDAC high res audio, 30hr battery. Great for focused study sessions in the library.', 'Like New', 50.00, 500.00, 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600', "Men's Hostel J - Room 214", 1, 'available'],
      [5, 2, 'Canon EOS 1500D DSLR Camera', '24.1 MP DSLR with 18-55mm lens, 64GB SD card, battery charger, and camera bag included. Perfect for university fests.', 'Like New', 250.00, 1500.00, 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600', "Men's Hostel J - Room 214", 1, 'available']
    ];
    const itemStmt = sqliteDb.prepare('INSERT OR IGNORE INTO items (owner_id, category_id, name, description, condition, price_per_day, deposit, image_url, location, is_available, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    items.forEach(it => itemStmt.run(it));
    itemStmt.finalize();

    // Seed sample borrow and feedback
    sqliteDb.run(`INSERT OR IGNORE INTO borrow_requests (id, item_id, borrower_id, start_date, end_date, total_price, status, request_note, owner_remarks)
      VALUES (1, 1, 2, '2026-09-01', '2026-09-03', 30.00, 'COMPLETED', 'Need for Biostatistics exam', 'Sure Priya, take good care of it')`);

    sqliteDb.run(`INSERT OR IGNORE INTO feedback (borrow_request_id, reviewer_id, target_user_id, item_id, rating, comment)
      VALUES (1, 2, 1, 1, 5, 'Arun was very helpful and the calculator worked flawlessly for my exam!')`);

    sqliteDb.run(`INSERT OR IGNORE INTO notifications (user_id, title, message, type, link)
      VALUES (1, 'Return Completed', 'Priya Verma returned your Casio FX-991CW. Transaction completed.', 'RETURN_CONFIRMED', '/dashboard')`);

    sqliteDb.run(`INSERT OR IGNORE INTO notifications (user_id, title, message, type, link)
      VALUES (2, 'Welcome to CampusShare @ UoH!', 'Explore items shared by your fellow students or list items you can share.', 'INFO', '/browse')`);

    console.log('✅ Campus dev database initialized and seeded successfully.');
  });
}

// Start database initialization
initDatabase();

module.exports = {
  query,
  isPostgres: () => isPostgresActive,
  getPool: () => pgPool,
};
