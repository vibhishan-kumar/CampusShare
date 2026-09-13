import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { 
  Repeat, 
  Share2,
  Search, 
  PlusCircle, 
  Bell, 
  MessageSquare, 
  LayoutDashboard, 
  HeartHandshake, 
  User, 
  LogOut, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Compass
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const notifRef = useRef(null);
  const userRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      {user?.is_banned && (
        <div
          style={{
            backgroundColor: '#dc2626',
            color: '#ffffff',
            padding: '0.65rem 1rem',
            textAlign: 'center',
            fontSize: '0.86rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            letterSpacing: '0.01em',
            zIndex: 100,
          }}
        >
          <span>
            ⚠️ Your campus account is currently suspended by the university administration. Your listings are hidden from the website, and you cannot post items, borrow, or write messages.
          </span>
        </div>
      )}
      <header className="navbar">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/" className="brand-logo" title="CampusShare @ UoH">
          <div className="brand-icon-box">
            <Share2 size={19} />
          </div>
          <span className="brand-name">CampusShare</span>
          <span className="brand-badge">UoH</span>
        </Link>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ flex: '1', maxWidth: '380px', margin: '0 1rem' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search 
              size={18} 
              style={{ position: 'absolute', left: '0.85rem', color: '#94a3b8' }} 
            />
            <input
              type="text"
              placeholder="Search cycles, calculators, books, tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem', borderRadius: '999px', fontSize: '0.86rem' }}
            />
          </div>
        </form>

        {/* Navigation Links */}
        <nav className="nav-links">
          <Link 
            to="/browse" 
            className={`nav-link ${location.pathname === '/browse' ? 'active' : ''}`}
          >
            <Compass size={17} />
            <span>Browse</span>
          </Link>
          <Link 
            to="/wishlist" 
            className={`nav-link ${location.pathname === '/wishlist' ? 'active' : ''}`}
          >
            <HeartHandshake size={17} />
            <span>Wishlist</span>
          </Link>

          {user ? (
            <>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className="btn btn-secondary btn-sm"
                  style={{
                    borderRadius: '999px',
                    borderColor: '#4f46e5',
                    color: '#4f46e5',
                    backgroundColor: '#eef2ff',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.35rem 0.85rem'
                  }}
                  title="Campus Administrator Control Center"
                >
                  <ShieldCheck size={16} />
                  <span>Admin Portal</span>
                </Link>
              )}

              <Link 
                to="/dashboard" 
                className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                title="Dashboard"
              >
                <LayoutDashboard size={17} />
                <span>Dashboard</span>
              </Link>

              <Link 
                to="/messages" 
                className={`nav-link ${location.pathname === '/messages' ? 'active' : ''}`}
                title="Campus Messages"
              >
                <MessageSquare size={17} />
                <span>Messages</span>
              </Link>

              {/* Notifications Dropdown */}
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="nav-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.3rem' }}
                  aria-label="Notifications"
                >
                  <Bell size={19} />
                  {unreadCount > 0 && (
                    <span className="badge-counter" style={{ position: 'absolute', top: '-4px', right: '-4px' }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '2.2rem',
                      width: '340px',
                      background: '#ffffff',
                      boxShadow: 'var(--shadow-xl)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      zIndex: 60,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markAsRead(n.id);
                              if (n.link) navigate(n.link);
                              setShowNotifs(false);
                            }}
                            style={{
                              padding: '0.75rem 1rem',
                              borderBottom: '1px solid #f1f5f9',
                              backgroundColor: n.is_read ? '#ffffff' : '#f0f9ff',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                              {n.title}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {n.message}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div ref={userRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
                    alt={user.name}
                    style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name.split(' ')[0]}
                  </span>
                </button>

                {showUserMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '2.4rem',
                      width: '210px',
                      background: '#ffffff',
                      boxShadow: 'var(--shadow-xl)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      zIndex: 60,
                      padding: '0.5rem 0',
                    }}
                  >
                    <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{user.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setShowUserMenu(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', fontSize: '0.85rem', color: 'var(--text-main)' }}
                    >
                      <User size={16} /> My Campus Profile
                    </Link>
                    <Link
                      to="/items/add"
                      onClick={() => setShowUserMenu(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}
                    >
                      <PlusCircle size={16} /> List New Item
                    </Link>
                    <Link
                      to="/dashboard"
                      onClick={() => setShowUserMenu(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1rem', fontSize: '0.85rem', color: 'var(--text-main)' }}
                    >
                      <LayoutDashboard size={16} /> Dashboard & Borrows
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setShowUserMenu(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.6rem 1rem',
                          fontSize: '0.85rem',
                          color: '#4f46e5',
                          fontWeight: 700,
                          backgroundColor: '#f5f3ff'
                        }}
                      >
                        <ShieldCheck size={16} /> Admin Portal
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                        navigate('/login');
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        padding: '0.6rem 1rem',
                        fontSize: '0.85rem',
                        color: 'var(--danger)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        borderTop: '1px solid var(--border-color)',
                      }}
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Log In
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Join UoH
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
    </>
  );
}
