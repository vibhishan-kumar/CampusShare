import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { HeartHandshake, PlusCircle, Trash2, Bell, Sparkles, User, MapPin } from 'lucide-react';

export default function WishlistPage() {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    max_price: '',
    notes: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [wishRes, catRes] = await Promise.all([
        api.getWishlist(),
        api.getCategories(),
      ]);
      if (wishRes.success) setWishlist(wishRes.wishlist);
      if (catRes.success) setCategories(catRes.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePostWish = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in with your university account to post a wish.');
      return;
    }
    if (user?.is_banned) {
      setError('Your campus account has been suspended by the campus administrator. You cannot post wishes.');
      return;
    }
    setSubmitLoading(true);
    setError('');

    try {
      const res = await api.createWishlist(formData);
      if (res.success) {
        setShowModal(false);
        setFormData({ title: '', category_id: '', max_price: '', notes: '' });
        loadData();
      } else {
        setError(res.message || 'Failed to post wishlist item.');
      }
    } catch (err) {
      setError(err.message || 'Error posting wish.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteWish = async (wishId) => {
    if (!window.confirm('Remove this request from campus wishlist?')) return;
    try {
      const res = await api.deleteWishlist(wishId);
      if (res.success) {
        setWishlist(prev => prev.filter(w => w.id !== wishId));
      }
    } catch (err) {
      alert(err.message || 'Failed to delete wishlist item.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
            Campus Item Wishlist
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Can't find what you need on campus? Post a request! Our automated engine will notify you when a student lists it.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <PlusCircle size={17} /> Post a Campus Wish
        </button>
      </div>

      {/* Info Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
          border: '1px solid #c7d2fe',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ background: 'var(--primary)', color: '#ffffff', padding: '0.6rem', borderRadius: '50%' }}>
          <Bell size={20} />
        </div>
        <div style={{ fontSize: '0.86rem', color: '#312e81' }}>
          <strong>Automated Match Alerts:</strong> When another student posts an item matching your wishlist title or category, you will receive an instant notification in your campus bell tray!
        </div>
      </div>

      {/* Wishlist Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading wishlist...</div>
      ) : wishlist.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <HeartHandshake size={40} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>No student wishes active yet</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Be the first to request an item you need for classes, lab, or hostel.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>Post a Wish</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {wishlist.map((w) => (
            <div key={w.id} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                  {w.category_name || 'Item Request'}
                </span>
                {w.is_my_wish && (
                  <button
                    type="button"
                    onClick={() => handleDeleteWish(w.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px' }}
                    title="Delete your wish"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                {w.title}
              </h3>

              {w.max_price && (
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534', marginBottom: '0.5rem' }}>
                  Max Budget: ₹{w.max_price} / day
                </div>
              )}

              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', flex: 1, marginBottom: '1rem', lineHeight: 1.5 }}>
                {w.notes || 'No extra notes provided.'}
              </p>

              {/* Requester Footer */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img
                    src={w.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(w.user_name)}`}
                    alt={w.user_name}
                    style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                  />
                  <span style={{ fontWeight: 600 }}>{w.user_name}</span>
                </div>
                <span style={{ color: 'var(--text-light)', fontSize: '0.75rem' }}>
                  {new Date(w.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Wish Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Post a Campus Wish</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handlePostWish}>
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="form-group">
                <label className="form-label">What item are you looking for? *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Casio fx-991EX Calculator or Lab Coat Size M"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">Any Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Max Daily Budget (₹/day, optional)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="e.g. 25"
                  value={formData.max_price}
                  onChange={(e) => setFormData({ ...formData, max_price: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Additional Details / When needed:</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g. Needed for mid-sem exam on Friday or project submission this week."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontWeight: 700 }}
                disabled={submitLoading}
              >
                {submitLoading ? 'Posting...' : 'Post Wish to Campus'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
