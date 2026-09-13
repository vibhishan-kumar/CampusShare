import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge, { formatAvailableDate } from '../components/StatusBadge';
import RatingStars from '../components/RatingStars';
import ItemChatModal from '../components/ItemChatModal';
import { 
  Calendar, 
  MapPin, 
  User, 
  ShieldCheck, 
  MessageSquare, 
  Clock, 
  Tag, 
  AlertCircle, 
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  CheckCircle2,
  HeartHandshake
} from 'lucide-react';

export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Borrow form state
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(nextWeek);
  const [requestNote, setRequestNote] = useState('');
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [borrowSuccess, setBorrowSuccess] = useState('');
  const [borrowError, setBorrowError] = useState('');

  // Owner action loading
  const [actionLoading, setActionLoading] = useState(false);
  const [wishlistMsg, setWishlistMsg] = useState('');

  const handleAddToWishlist = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.createWishlist({
        title: item.name,
        category_id: item.category_id,
        max_price: item.price_per_day,
        notes: `Alert me when ${item.name} is returned and available again.`,
      });
      if (res.success) {
        setWishlistMsg('Added to your campus wishlist! You will be alerted when available.');
        setTimeout(() => setWishlistMsg(''), 4500);
      }
    } catch (err) {
      setWishlistMsg(err.message || 'Already in your wishlist or unable to add.');
      setTimeout(() => setWishlistMsg(''), 4500);
    }
  };

  useEffect(() => {
    async function fetchItem() {
      setLoading(true);
      try {
        const res = await api.getItem(id);
        if (res.success) {
          setItem(res.item);
        } else {
          setError('Item not found.');
        }
      } catch (err) {
        setError(err.message || 'Error loading item details.');
      } finally {
        setLoading(false);
      }
    }
    fetchItem();
  }, [id]);

  // Calculate borrow duration & price
  const calculateCost = () => {
    if (!item || !startDate || !endDate) return { days: 0, rental: 0, deposit: 0, total: 0 };
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return { days: 0, rental: 0, deposit: 0, total: 0 };
    }
    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
    const rental = diffDays * item.price_per_day;
    const deposit = item.deposit || 0;
    return {
      days: diffDays,
      rental,
      deposit,
      total: rental + deposit,
    };
  };

  const cost = calculateCost();

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    if (user?.is_banned) {
      setBorrowError('Your campus account has been suspended by the campus administrator. You cannot borrow items.');
      return;
    }
    setBorrowLoading(true);
    setBorrowError('');
    setBorrowSuccess('');

    try {
      const res = await api.createBorrowRequest({
        item_id: item.id,
        start_date: startDate,
        end_date: endDate,
        request_note: requestNote,
      });

      if (res.success) {
        setBorrowSuccess('Borrow request submitted successfully! Owner has been notified.');
        setTimeout(() => {
          navigate('/dashboard?tab=borrowing');
        }, 1500);
      } else {
        setBorrowError(res.message || 'Failed to submit borrow request.');
      }
    } catch (err) {
      setBorrowError(err.message || 'Error submitting borrow request.');
    } finally {
      setBorrowLoading(false);
    }
  };

  const handleStartChat = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user?.is_banned) {
      alert('Your campus account has been suspended by the campus administrator. You cannot start chat conversations.');
      return;
    }
    setIsChatOpen(true);
  };

  const handleToggleAvailability = async () => {
    setActionLoading(true);
    try {
      const res = await api.toggleAvailability(item.id);
      if (res.success) {
        setItem(prev => ({
          ...prev,
          is_available: res.item.is_available === 1,
          status: res.item.status,
        }));
      }
    } catch (err) {
      alert(err.message || 'Failed to toggle availability.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await api.deleteItem(item.id);
      if (res.success) {
        alert('Item deleted.');
        navigate('/dashboard');
      }
    } catch (err) {
      alert(err.message || 'Failed to delete item.');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading item details...</div>;
  }

  if (error || !item) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Item Not Found</h2>
        <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>{error}</p>
        <Link to="/browse" className="btn btn-primary">Back to Marketplace</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumbs */}
      <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        <Link to="/" style={{ color: 'inherit' }}>Home</Link> &gt;{' '}
        <Link to="/browse" style={{ color: 'inherit' }}>Marketplace</Link> &gt;{' '}
        <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{item.name}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>
        {/* Left Column: Image & Owner Info */}
        <div>
          <div
            style={{
              width: '100%',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              backgroundColor: '#f1f5f9',
              border: '1px solid var(--border-color)',
              marginBottom: '1.5rem',
            }}
          >
            <img
              src={item.image_url || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600'}
              alt={item.name}
              style={{ width: '100%', maxHeight: '420px', objectFit: 'cover' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600';
              }}
            />
          </div>

          {/* Owner Profile Card */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Item Owner & Verified Student
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <img
                src={item.owner_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.owner_name)}`}
                alt={item.owner_name}
                style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-light)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  {item.owner_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {item.owner_department || 'University of Hyderabad Student'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                  <RatingStars rating={item.owner_rating} size={14} />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    ({item.owner_review_count || 0} reviews)
                  </span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={15} color="#94a3b8" />
                <span>Hostel / Room: <strong>{item.owner_hostel || 'On Campus'}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={15} color="#10b981" />
                <span>Official Campus Email: <strong>{item.owner_email}</strong></span>
              </div>
            </div>

            {!item.is_owner && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.5rem', 
                  padding: '0.75rem 1rem', 
                  fontWeight: 700, 
                  fontSize: '0.92rem',
                  boxShadow: 'var(--shadow-sm)'
                }}
                onClick={handleStartChat}
              >
                <MessageSquare size={18} /> Let's Chat with {item.owner_name ? item.owner_name.split(' ')[0] : 'Owner'}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Item Info & Borrow Action */}
        <div>
          {/* Header & Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, fontSize: '0.75rem', padding: '0.2rem 0.65rem', borderRadius: '999px' }}>
              {item.category_name}
            </span>
            <span style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: '0.75rem', padding: '0.2rem 0.65rem', borderRadius: '999px' }}>
              Condition: {item.condition}
            </span>
            <StatusBadge 
              status={item.is_available ? 'AVAILABLE' : 'BORROWED'} 
              availableAfter={item.available_after} 
            />
          </div>

          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.3, marginBottom: '0.85rem' }}>
            {item.name}
          </h1>

          {/* Pricing Box */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'baseline',
              gap: '1.5rem',
              marginBottom: '1.5rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Daily Rental Fee</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                ₹{item.price_per_day}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}> / day</span>
            </div>

            {item.deposit > 0 && (
              <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Refundable Security Deposit</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  ₹{item.deposit}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#166534', display: 'block' }}>100% refunded upon return</span>
              </div>
            )}
          </div>

          {/* Location */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            <MapPin size={16} color="var(--primary)" />
            <span>Pickup & Handover Location: <strong>{item.location}</strong></span>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Description & Features</h3>
            <p style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {item.description || 'No additional description provided by owner.'}
            </p>
          </div>

          {/* Conditional Action: Owner controls vs Borrower Request Box */}
          {item.is_owner ? (
            <div className="card" style={{ padding: '1.5rem', background: '#f8fafc', border: '2px dashed var(--primary)' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                You Own This Item
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                You can manage your listing, edit pricing, or toggle availability if you need to use the item yourself.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <Link to={`/items/edit/${item.id}`} className="btn btn-secondary btn-sm">
                  <Edit size={16} /> Edit Details
                </Link>

                <button
                  type="button"
                  className={`btn btn-sm ${item.is_available ? 'btn-secondary' : 'btn-success'}`}
                  disabled={actionLoading}
                  onClick={handleToggleAvailability}
                >
                  {item.is_available ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
                  <span>{item.is_available ? 'Set as Unavailable' : 'Make Available'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleDeleteItem}
                >
                  <Trash2 size={16} /> Delete Item
                </button>
              </div>
            </div>
          ) : (
            /* Borrower Request Box */
            <div className="card" style={{ padding: '1.5rem', border: '1.5px solid var(--border-focus)' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-main)' }}>
                Request to Borrow This Item
              </h3>

              {!item.is_available ? (
                <div
                  style={{
                    padding: '1.25rem',
                    background: '#fffbeb',
                    border: '1.5px solid #fde68a',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                    <Clock size={20} /> Currently Borrowed by another Student
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#78350f', lineHeight: 1.5, margin: 0, marginBottom: item.available_after ? '0.75rem' : '0' }}>
                    This item is currently on loan with another campus student.
                  </p>

                  {item.available_after ? (
                    <div style={{ background: '#ffffff', border: '1px solid #fde68a', padding: '0.75rem 0.95rem', borderRadius: 'var(--radius-sm)', fontSize: '0.86rem', color: '#92400e' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
                        <span>📅 Expected Return:</span>
                        <strong style={{ color: '#b45309' }}>{formatAvailableDate(item.available_after)}</strong>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#16a34a', marginTop: '0.35rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CheckCircle2 size={14} /> It will be available for borrowing after this date ({formatAvailableDate(item.available_after)}).
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.82rem', color: '#b45309', marginTop: '0.25rem', fontWeight: 600 }}>
                      It will be available once returned by the borrower.
                    </div>
                  )}

                  {wishlistMsg && (
                    <div className="alert alert-success" style={{ marginTop: '0.75rem', fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}>
                      {wishlistMsg}
                    </div>
                  )}

                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleStartChat}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontWeight: 700 }}
                    >
                      <MessageSquare size={16} /> Let's Chat with {item.owner_name ? item.owner_name.split(' ')[0] : 'Owner'} for Next Slot
                    </button>
                    <button
                      type="button"
                      onClick={handleAddToWishlist}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.55rem 1rem' }}
                    >
                      <HeartHandshake size={15} /> Add to Campus Wishlist
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBorrowSubmit}>
                  {borrowError && <div className="alert alert-danger">{borrowError}</div>}
                  {borrowSuccess && (
                    <div className="alert alert-success">
                      <CheckCircle2 size={18} />
                      <span>{borrowSuccess}</span>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.82rem' }}>Start Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={startDate}
                        min={today}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.82rem' }}>End Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={endDate}
                        min={startDate || today}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.82rem' }}>Note to Owner (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Needed for statistics exam prep, will handle with care"
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                    />
                  </div>

                  {/* Calculated Breakdown */}
                  {cost.days > 0 && (
                    <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span>Duration:</span>
                        <strong>{cost.days} {cost.days === 1 ? 'day' : 'days'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span>Rental Charge ({cost.days} × ₹{item.price_per_day}):</span>
                        <strong>₹{cost.rental.toFixed(2)}</strong>
                      </div>
                      {cost.deposit > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span>Refundable Deposit:</span>
                          <strong>₹{cost.deposit.toFixed(2)}</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', marginTop: '0.4rem', fontWeight: 800, fontSize: '0.95rem' }}>
                        <span>Estimated Total:</span>
                        <span style={{ color: 'var(--primary)' }}>₹{cost.total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', fontWeight: 700 }}
                    disabled={borrowLoading || !item.is_available || cost.days <= 0}
                  >
                    {borrowLoading ? 'Sending Request...' : 'Send Borrow Request to Owner'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.25rem' }}>
          Student Reviews on this Item ({item.reviews ? item.reviews.length : 0})
        </h2>

        {(!item.reviews || item.reviews.length === 0) ? (
          <div style={{ background: '#ffffff', padding: '2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            No reviews yet for this item. Be the first to borrow and share feedback!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {item.reviews.map((rev) => (
              <div key={rev.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <img
                      src={rev.reviewer_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(rev.reviewer_name)}`}
                      alt={rev.reviewer_name}
                      style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                    />
                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{rev.reviewer_name}</span>
                  </div>
                  <RatingStars rating={rev.rating} size={14} />
                </div>
                <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                  {rev.comment}
                </p>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.4rem', display: 'block' }}>
                  {new Date(rev.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Item Direct Chat Modal */}
      {item && (
        <ItemChatModal
          item={item}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
}
