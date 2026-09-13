import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import RatingStars from '../components/RatingStars';
import StatusBadge from '../components/StatusBadge';
import PaymentModal from '../components/PaymentModal';
import FeedbackModal from '../components/FeedbackModal';
import { 
  ShieldCheck, 
  MapPin, 
  Phone, 
  School, 
  Package, 
  Star, 
  Edit3, 
  Save, 
  X, 
  PlusCircle, 
  ExternalLink,
  ArrowDownLeft,
  Clock,
  RotateCcw,
  CreditCard,
  CheckCircle
} from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'borrows';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [stats, setStats] = useState(null);
  const [myListings, setMyListings] = useState([]);
  const [myBorrows, setMyBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    school: '',
    program: '',
    hostel: '',
    room_no: '',
    hostel_room: '',
    department: '',
    avatar_url: '',
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Modals state
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [feedbackRequest, setFeedbackRequest] = useState(null);

  const loadProfileData = async () => {
    try {
      const [profileRes, listingsRes, borrowsRes] = await Promise.all([
        api.getProfile(),
        api.getMyListings(),
        api.getMyBorrows(),
      ]);

      if (profileRes.success) {
        setStats(profileRes.stats);
        setFormData({
          name: profileRes.user.name || '',
          phone: profileRes.user.phone || '',
          school: profileRes.user.school || '',
          program: profileRes.user.program || '',
          hostel: profileRes.user.hostel || '',
          room_no: profileRes.user.room_no || '',
          hostel_room: profileRes.user.hostel_room || '',
          department: profileRes.user.department || '',
          avatar_url: profileRes.user.avatar_url || '',
        });
      }

      if (listingsRes.success) {
        setMyListings(listingsRes.items || []);
      }

      if (borrowsRes.success) {
        setMyBorrows(borrowsRes.requests || []);
      }
    } catch (err) {
      console.error('Failed to load student profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Borrower action: Initiate Return
  const handleInitiateReturn = async (requestId) => {
    const note = prompt('Add an optional return note (e.g. Ready for pickup at hostel or department):', 'Ready to return');
    if (note === null) return;

    try {
      const res = await api.initiateReturn({
        borrow_request_id: requestId,
        borrower_note: note,
      });
      if (res.success) {
        alert('Return requested! Owner has been notified.');
        loadProfileData();
      }
    } catch (err) {
      alert(err.message || 'Failed to initiate return.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setMessage('');
    try {
      const res = await api.updateProfile(formData);
      if (res.success) {
        setMessage('Profile updated successfully!');
        setIsEditing(false);
        refreshProfile();
      }
    } catch (err) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading student profile...</div>;
  }

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto' }}>
      {/* Profile Banner */}
      <div
        className="card"
        style={{
          padding: '2rem',
          marginBottom: '2rem',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
          <img
            src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || '')}`}
            alt={user?.name}
            style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-light)' }}
          />

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {user?.name}
              </h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'var(--success-light)', color: 'var(--success)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                <ShieldCheck size={14} /> UoH Verified
              </span>
            </div>

            <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {user?.email}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RatingStars rating={stats?.rating || 5.0} size={17} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>
                ({stats?.reviewCount || 0} reviews)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/items/add"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <PlusCircle size={15} /> List New Item
            </Link>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <><X size={15} /> Cancel</> : <><Edit3 size={15} /> Edit Profile</>}
            </button>
          </div>
        </div>

        {message && <div className="alert alert-success" style={{ marginTop: '1.25rem' }}>{message}</div>}

        {/* Edit Form */}
        {isEditing ? (
          <form onSubmit={handleUpdate} style={{ marginTop: '1.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">School / Faculty</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. School of Computer and Information Sciences"
                  value={formData.school || ''}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Program</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. MCA"
                  value={formData.program || ''}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr', gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Hostel</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Men's Hostel J"
                  value={formData.hostel || ''}
                  onChange={(e) => setFormData({ ...formData, hostel: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Room No</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 214"
                  value={formData.room_no || ''}
                  onChange={(e) => setFormData({ ...formData, room_no: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Avatar / Profile Picture URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://images.unsplash.com/..."
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={saveLoading}>
              <Save size={16} /> {saveLoading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        ) : (
          /* Profile Details Cards */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}>
              <School size={18} color="var(--primary)" />
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>School & Program</span>
                <strong>{user?.program ? `${user.program} • ` : ''}{user?.school || user?.department || 'Not specified'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}>
              <MapPin size={18} color="var(--primary)" />
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Hostel & Room</span>
                <strong>{user?.hostel ? `${user.hostel} - Room ${user.room_no || 'N/A'}` : user?.hostel_room || 'UoH Campus'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}>
              <Phone size={18} color="var(--primary)" />
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Phone Number</span>
                <strong>{user?.phone || 'Not specified'}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Campus Activity Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        <div 
          className="card" 
          onClick={() => handleTabChange('listings')}
          style={{ 
            padding: '1.25rem', 
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: activeTab === 'listings' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            background: activeTab === 'listings' ? '#f8faff' : '#ffffff',
            boxShadow: activeTab === 'listings' ? '0 4px 12px rgba(99, 102, 241, 0.12)' : 'none'
          }}
          title="Click to view items listed by you"
        >
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>
            {stats?.itemsListed || 0}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>
            Items Listed on Campus
          </div>
        </div>

        <div 
          className="card" 
          onClick={() => handleTabChange('borrows')}
          style={{ 
            padding: '1.25rem', 
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: activeTab === 'borrows' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            background: activeTab === 'borrows' ? '#f8faff' : '#ffffff',
            boxShadow: activeTab === 'borrows' ? '0 4px 12px rgba(99, 102, 241, 0.12)' : 'none'
          }}
          title="Click to view your borrowing history"
        >
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--secondary)' }}>
            {stats?.itemsBorrowed || 0}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>
            Items Successfully Borrowed
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)' }}>
            {stats?.rating || '5.0'} ⭐
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>
            Peer Trust Score
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border-color)', marginBottom: '2rem' }}>
        <button
          type="button"
          onClick={() => handleTabChange('borrows')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'borrows' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'borrows' ? 'var(--primary)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          }}
        >
          <ArrowDownLeft size={18} />
          Borrowing History
          <span style={{ 
            background: activeTab === 'borrows' ? 'var(--primary)' : '#e2e8f0', 
            color: activeTab === 'borrows' ? '#ffffff' : '#475569', 
            fontSize: '0.75rem', 
            padding: '0.15rem 0.55rem', 
            borderRadius: '999px',
            fontWeight: 800
          }}>
            {myBorrows.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('listings')}
          style={{
            padding: '0.75rem 1.25rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'listings' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'listings' ? 'var(--primary)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '-2px',
            transition: 'all 0.15s ease',
          }}
        >
          <Package size={18} />
          My Listed Items
          <span style={{ 
            background: activeTab === 'listings' ? 'var(--primary)' : '#e2e8f0', 
            color: activeTab === 'listings' ? '#ffffff' : '#475569', 
            fontSize: '0.75rem', 
            padding: '0.15rem 0.55rem', 
            borderRadius: '999px',
            fontWeight: 800
          }}>
            {myListings.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Borrowing History */}
      {activeTab === 'borrows' && (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                Borrowing History ({myBorrows.length})
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Items you have requested or borrowed from fellow students on campus
              </p>
            </div>

            <Link
              to="/browse"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <ExternalLink size={15} /> Browse More Items
            </Link>
          </div>

          {myBorrows.length === 0 ? (
            <div
              className="card"
              style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: '#ffffff',
                border: '1px dashed var(--border-color)',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  color: '#64748b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <Package size={26} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                No borrow requests yet
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', maxWidth: '440px', margin: '0 auto 1.25rem', lineHeight: '1.5' }}>
                Need a calculator for exams, cycle for campus commute, lab coat, or textbooks? Explore available items shared by students.
              </p>
              <Link to="/browse" className="btn btn-primary btn-sm">
                Explore Campus Items
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {myBorrows.map((req) => (
                <div key={req.id} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    {/* Item Info */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <img
                        src={req.item_image || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600'}
                        alt={req.item_name}
                        style={{ width: '65px', height: '65px', borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
                      />
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.2rem' }}>
                          <Link to={`/items/${req.item_id}`}>{req.item_name}</Link>
                        </h3>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Owner: <strong>{req.owner_name}</strong> ({req.owner_hostel || 'Campus Hostel'})
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>
                          <Clock size={13} style={{ display: 'inline', marginRight: '3px' }} />
                          {req.start_date} to {req.end_date} • <strong>₹{req.total_price}</strong> rental
                          {req.item_deposit > 0 && ` + ₹${req.item_deposit} deposit`}
                        </div>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem' }}>
                      <StatusBadge status={req.status} />

                      {/* State 1: ACCEPTED -> Pay Now */}
                      {req.status === 'ACCEPTED' && (
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => setPaymentRequest(req)}
                        >
                          <CreditCard size={15} /> Proceed to Pay & Finalize
                        </button>
                      )}

                      {/* State 2: BORROWED -> Request Return */}
                      {req.status === 'BORROWED' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleInitiateReturn(req.id)}
                        >
                          <RotateCcw size={15} /> Handover & Request Return
                        </button>
                      )}

                      {/* State 3: COMPLETED -> Leave Rating */}
                      {req.status === 'COMPLETED' && !req.my_feedback_id && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setFeedbackRequest(req)}
                        >
                          <Star size={15} color="#f59e0b" /> Rate Item & Owner
                        </button>
                      )}

                      {req.status === 'COMPLETED' && req.my_feedback_id && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 700 }}>
                          ✓ Reviewed & Rated
                        </span>
                      )}
                    </div>
                  </div>

                  {req.owner_remarks && (
                    <div style={{ background: '#f8fafc', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', marginTop: '0.85rem', fontSize: '0.82rem', color: '#475569' }}>
                      <strong>Owner Note:</strong> {req.owner_remarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: My Listed Items */}
      {activeTab === 'listings' && (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                My Listed Items ({myListings.length})
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Campus items you have made available for fellow UoH students to borrow
              </p>
            </div>

            {!user?.is_banned && (
              <Link
                to="/items/add"
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
              >
                <PlusCircle size={15} /> List New Item
              </Link>
            )}
          </div>

          {user?.is_banned && (
            <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
              ⚠️ Your campus account is suspended by the administrator. Listing new items is currently disabled.
            </div>
          )}

          {myListings.length === 0 ? (
            <div
              className="card"
              style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: '#ffffff',
                border: '1px dashed var(--border-color)',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <Package size={26} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                You haven't listed any items yet
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', maxWidth: '440px', margin: '0 auto 1.25rem', lineHeight: '1.5' }}>
                Have a cycle, scientific calculator, lab coat, or textbooks lying around? Share them with fellow campus students and earn rental fees.
              </p>
              {!user?.is_banned && (
                <Link
                  to="/items/add"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
                >
                  <PlusCircle size={15} /> List Your First Item
                </Link>
              )}
            </div>
          ) : (
            <div className="grid-cards">
              {myListings.map((item) => (
                <div key={item.id} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                  <img
                    src={item.image_url || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600'}
                    alt={item.name}
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '0.75rem' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{item.category_name}</span>
                    <StatusBadge status={item.is_available ? 'AVAILABLE' : 'BORROWED'} availableAfter={item.available_after} />
                  </div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    <Link to={`/items/${item.id}`}>{item.name}</Link>
                  </h3>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                    ₹{item.price_per_day}/day {item.deposit > 0 && `(₹${item.deposit} deposit)`}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto' }}>
                    <Link to={`/items/edit/${item.id}`} className="btn btn-secondary btn-sm" style={{ flex: 1, textAlign: 'center' }}>
                      Edit
                    </Link>
                    <Link to={`/items/${item.id}`} className="btn btn-primary btn-sm" style={{ flex: 1, textAlign: 'center' }}>
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Checkout Modal */}
      {paymentRequest && (
        <PaymentModal
          borrowRequest={paymentRequest}
          onClose={() => setPaymentRequest(null)}
          onPaymentSuccess={() => {
            loadProfileData();
          }}
        />
      )}

      {/* Rating / Review Modal */}
      {feedbackRequest && (
        <FeedbackModal
          borrowRequest={feedbackRequest}
          onClose={() => setFeedbackRequest(null)}
          onFeedbackSuccess={() => {
            alert('Review submitted! Thank you.');
            loadProfileData();
          }}
        />
      )}
    </div>
  );
}
