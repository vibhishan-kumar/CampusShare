import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import RatingStars from '../components/RatingStars';
import { 
  ShieldCheck, 
  Users, 
  Package, 
  RotateCcw, 
  CheckCircle, 
  IndianRupee, 
  AlertTriangle, 
  Trash2, 
  Ban, 
  Search, 
  PlusCircle, 
  Activity, 
  Layers, 
  FolderPlus, 
  ExternalLink 
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');

  // Stats state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users state
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Items state
  const [items, setItems] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategory, setItemCategory] = useState('all');
  const [itemsLoading, setItemsLoading] = useState(false);

  // Borrows state
  const [borrows, setBorrows] = useState([]);
  const [borrowStatus, setBorrowStatus] = useState('all');
  const [borrowsLoading, setBorrowsLoading] = useState(false);

  // Categories state
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState({ name: '', slug: '', description: '', icon: 'package' });
  const [catLoading, setCatLoading] = useState(false);

  // Common message/alert
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // 1. Load Stats
  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.admin.getStats();
      if (res.success) setStats(res.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  // 2. Load Users
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.admin.getUsers({ search: userSearch });
      if (res.success) setUsers(res.users);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  // 3. Load Items
  const loadItems = async () => {
    setItemsLoading(true);
    try {
      const res = await api.admin.getItems({ search: itemSearch, category: itemCategory });
      if (res.success) setItems(res.items);
    } catch (err) {
      console.error(err);
    } finally {
      setItemsLoading(false);
    }
  };

  // 4. Load Borrows
  const loadBorrows = async () => {
    setBorrowsLoading(true);
    try {
      const res = await api.admin.getBorrows({ status: borrowStatus });
      if (res.success) setBorrows(res.borrows);
    } catch (err) {
      console.error(err);
    } finally {
      setBorrowsLoading(false);
    }
  };

  // 5. Load Categories
  const loadCategories = async () => {
    try {
      const res = await api.getCategories();
      if (res.success) setCategories(res.categories);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStats();
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'items') loadItems();
    if (activeTab === 'borrows') loadBorrows();
    if (activeTab === 'overview') loadStats();
  }, [activeTab, userSearch, itemSearch, itemCategory, borrowStatus]);

  // Actions
  const handleToggleBan = async (userId, currentBanned) => {
    const actionText = currentBanned ? 'unban' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${actionText} this student account?`)) return;
    try {
      const res = await api.admin.toggleUserBan(userId);
      if (res.success) {
        setNotice(res.message);
        loadUsers();
      }
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const handleDeleteStudent = async (userId, userName) => {
    const promptMsg = `⚠️ PERMANENT DATABASE DELETION:\n\nAre you sure you want to permanently remove "${userName}"?\n\nThis will completely delete from the database:\n• The student account\n• All listed campus items\n• All borrow requests & transactions\n• All reviews & feedback\n• All chat messages & conversations\n• All wishlist requests\n• Email verification OTP records\n\nThis action CANNOT be undone. Proceed?`;
    if (!window.confirm(promptMsg)) return;

    try {
      const res = await api.admin.deleteUser(userId);
      if (res.success) {
        setNotice(res.message || `Student "${userName}" and all data permanently deleted.`);
        loadUsers();
        loadStats();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete student.');
    }
  };

  const handleDeleteItem = async (itemId) => {
    const reason = prompt('Reason for removal (will be notified to item owner):', 'Policy violation / duplicate listing');
    if (reason === null) return;
    try {
      const res = await api.admin.deleteItem(itemId, { reason });
      if (res.success) {
        setNotice('Item removed successfully.');
        loadItems();
        loadStats();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete item.');
    }
  };

  const handleForceComplete = async (borrowId) => {
    if (!window.confirm('Force complete this transaction? This marks the status as COMPLETED and sets the item back to Available.')) return;
    try {
      const res = await api.admin.forceCompleteBorrow(borrowId);
      if (res.success) {
        setNotice('Transaction resolved and marked COMPLETED.');
        loadBorrows();
        loadStats();
      }
    } catch (err) {
      alert(err.message || 'Failed to resolve transaction.');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCat.name.trim()) return;
    setCatLoading(true);
    try {
      const res = await api.admin.createCategory(newCat);
      if (res.success) {
        setNotice('New campus category created!');
        setNewCat({ name: '', slug: '', description: '', icon: 'package' });
        loadCategories();
      }
    } catch (err) {
      alert(err.message || 'Failed to create category.');
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Delete this category? Only empty categories can be deleted.')) return;
    try {
      const res = await api.admin.deleteCategory(catId);
      if (res.success) {
        setNotice('Category removed.');
        loadCategories();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete category.');
    }
  };

  return (
    <div>
      {/* Admin Portal Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#f3e8ff', color: '#7e22ce', padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            <ShieldCheck size={14} /> Campus Administration
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            Admin Control Center
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Oversee student accounts, moderate item listings, track campus transactions, and manage platform settings.
          </p>
        </div>
      </div>

      {notice && (
        <div className="alert alert-success" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{notice}</span>
          <button onClick={() => setNotice('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button>
        </div>
      )}

      {/* Admin Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', overflowX: 'auto' }}>
        {[
          { id: 'overview', label: 'Overview & KPIs', icon: Activity },
          { id: 'users', label: 'Student Accounts', icon: Users },
          { id: 'items', label: 'Item Moderation', icon: Package },
          { id: 'borrows', label: 'Campus Borrow Ledger', icon: RotateCcw },
          { id: 'categories', label: 'Category Manager', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={17} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === 'overview' && (
        <div>
          {statsLoading || !stats ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading analytics...</div>
          ) : (
            <>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Students</span>
                    <Users size={20} />
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)' }}>{stats.totalStudents}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Verified @uohyd.ac.in accounts</div>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--secondary)', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Items Listed</span>
                    <Package size={20} />
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)' }}>{stats.totalItems}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Across 6 campus categories</div>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Active Borrows</span>
                    <RotateCcw size={20} />
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)' }}>{stats.activeBorrows}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Currently in transit or borrowed</div>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Completed</span>
                    <CheckCircle size={20} />
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)' }}>{stats.completedBorrows}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Safe campus returns</div>
                </div>

                <div className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4338ca', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Volume</span>
                    <IndianRupee size={20} />
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--primary)' }}>₹{stats.totalVolume.toFixed(2)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Simulated payments processed</div>
                </div>
              </div>

              {/* Two Column Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {/* Recent Activity */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Platform Activity</h3>
                  {stats.recentActivity.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent transactions recorded.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {stats.recentActivity.map((a) => (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #f1f5f9' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{a.item_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {a.borrower_name} borrowed from {a.owner_name}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <StatusBadge status={a.status} />
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '2px' }}>₹{a.total_price}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Breakdown */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Category Distribution</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {stats.categoryBreakdown.map((cat) => (
                      <div key={cat.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{cat.name}</span>
                        <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {cat.item_count} items
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= TAB 2: STUDENTS ================= */}
      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                className="form-input"
                style={{ paddingLeft: '2.2rem' }}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing <strong>{users.length}</strong> students
            </div>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Student</th>
                  <th style={{ padding: '0.75rem 1rem' }}>School & Program</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Hostel & Room</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Activity</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Rating</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 700 }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      {u.phone && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{u.phone}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>{u.program || 'Student'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{u.school || u.department || 'UoH'}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>{u.hostel || 'Hostel'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Room {u.room_no || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>{u.items_count} listed</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.borrows_count} borrows</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <RatingStars rating={u.rating} size={13} />
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {u.is_banned ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.75rem' }}>Suspended</span>
                      ) : (
                        <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.75rem' }}>Active</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {u.role !== 'admin' && (
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${u.is_banned ? 'btn-success' : 'btn-secondary'}`}
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                            onClick={() => handleToggleBan(u.id, u.is_banned)}
                            title={u.is_banned ? 'Lift suspension' : 'Suspend account'}
                          >
                            {u.is_banned ? 'Unban' : 'Suspend'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={() => handleDeleteStudent(u.id, u.name)}
                            title="Permanently remove student and all data from database"
                          >
                            <Trash2 size={12} />
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: ITEMS ================= */}
      {activeTab === 'items' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search by title or owner..."
                className="form-input"
                style={{ paddingLeft: '2.2rem' }}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing <strong>{items.length}</strong> items
            </div>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Item</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Owner</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Pricing</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                          src={it.image_url || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600'}
                          alt={it.name}
                          style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                        />
                        <div>
                          <div style={{ fontWeight: 700 }}>{it.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{it.location}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{it.category_name}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>{it.owner_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{it.owner_email}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <strong>₹{it.price_per_day}</strong> / day
                      {it.deposit > 0 && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>+₹{it.deposit} deposit</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <StatusBadge status={it.is_available ? 'AVAILABLE' : 'BORROWED'} />
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                        onClick={() => handleDeleteItem(it.id)}
                        title="Force Remove Item"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: BORROW LEDGER ================= */}
      {activeTab === 'borrows' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filter by Status:</label>
              <select
                className="form-select"
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: 'auto' }}
                value={borrowStatus}
                onChange={(e) => setBorrowStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="ACCEPTED">ACCEPTED</option>
                <option value="BORROWED">BORROWED</option>
                <option value="RETURN_REQUESTED">RETURN_REQUESTED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing <strong>{borrows.length}</strong> transactions
            </div>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>ID & Item</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Borrower</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Owner</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Period</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Resolution</th>
                </tr>
              </thead>
              <tbody>
                {borrows.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 700 }}>#{b.id} - {b.item_name}</div>
                      {b.payment_reference && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>Ref: {b.payment_reference}</div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>{b.borrower_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{b.borrower_email}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>{b.owner_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{b.owner_email}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div>{b.start_date} to {b.end_date}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <strong>₹{b.total_price}</strong>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <StatusBadge status={b.status} />
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {b.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', fontWeight: 600 }}
                          onClick={() => handleForceComplete(b.id)}
                          title="Force Complete & Return Item"
                        >
                          Force Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: CATEGORIES ================= */}
      {activeTab === 'categories' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {/* Categories List */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Active Campus Categories</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {categories.map((c) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>slug: {c.slug} • icon: {c.icon}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => handleDeleteCategory(c.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Category Form */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Add New Category</h3>
            <form onSubmit={handleCreateCategory}>
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Lab Kits & Workshop"
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category Slug (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. lab-kits"
                  value={newCat.slug}
                  onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Brief description of items in this category..."
                  value={newCat.description}
                  onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={catLoading}>
                <PlusCircle size={16} /> Create Category
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
