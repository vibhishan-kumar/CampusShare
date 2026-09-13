import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  PlusCircle, 
  Save, 
  Image as ImageIcon, 
  Sparkles, 
  UploadCloud, 
  Link as LinkIcon, 
  Check, 
  X, 
  Camera, 
  Loader2 
} from 'lucide-react';

const PRESET_IMAGES = [
  { label: 'Scientific Calculator', url: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=600' },
  { label: 'Campus Bicycle', url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600' },
  { label: 'Badminton Racket', url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600' },
  { label: 'Arduino / Electronics', url: 'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=600' },
  { label: 'Lab Coat / Tools', url: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=600' },
  { label: 'Academic Textbook', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600' },
  { label: 'Study Lamp / Dorm', url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600' },
  { label: 'Bluetooth Speaker', url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600' },
];

export default function AddEditItemPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Image upload states
  const [uploadMode, setUploadMode] = useState('device'); // 'device' | 'url'
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageFileName, setImageFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
    condition: 'Good',
    price_per_day: '',
    deposit: '',
    location: user?.hostel_room || "Men's Hostel J",
    image_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600',
  });

  const handleFileProcess = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Selected image is too large (maximum 10MB).');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target.result;
        try {
          const res = await api.uploadItemImage({
            image: base64Data,
            filename: file.name,
          });

          if (res.success && res.url) {
            setFormData(prev => ({ ...prev, image_url: res.url }));
            setImageFileName(file.name);
          } else {
            setFormData(prev => ({ ...prev, image_url: base64Data }));
            setImageFileName(file.name);
          }
        } catch (err) {
          setFormData(prev => ({ ...prev, image_url: base64Data }));
          setImageFileName(file.name);
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to read image from device.');
      setUploadingImage(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  useEffect(() => {
    async function init() {
      try {
        const catRes = await api.getCategories();
        if (catRes.success) {
          setCategories(catRes.categories);
          if (!isEdit && catRes.categories.length > 0) {
            setFormData(prev => ({ ...prev, category_id: catRes.categories[0].id }));
          }
        }

        if (isEdit) {
          const itemRes = await api.getItem(id);
          if (itemRes.success) {
            const it = itemRes.item;
            setFormData({
              name: it.name,
              category_id: it.category_id || '',
              description: it.description || '',
              condition: it.condition || 'Good',
              price_per_day: it.price_per_day,
              deposit: it.deposit,
              location: it.location || '',
              image_url: it.image_url || '',
            });
          }
        }
      } catch (err) {
        setError('Failed to load item or categories.');
      }
    }
    init();
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user?.is_banned) {
      setError('Your campus account is suspended by the administrator. You cannot list or edit items.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      if (isEdit) {
        const res = await api.updateItem(id, formData);
        if (res.success) {
          navigate(`/items/${id}`);
        } else {
          setError(res.message || 'Failed to update item.');
        }
      } else {
        const res = await api.createItem(formData);
        if (res.success) {
          navigate(`/items/${res.item.id}`);
        } else {
          setError(res.message || 'Failed to list item.');
        }
      }
    } catch (err) {
      setError(err.message || 'Submission error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
          {isEdit ? 'Edit Item Details' : 'List an Item to Lend on Campus'}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Help fellow UoH students while earning extra cash. Set a fair daily rate and optional security deposit.
        </p>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {Boolean(user?.is_banned) && (
          <div className="alert alert-danger" style={{ fontWeight: 700, marginBottom: '1.25rem' }}>
            ⚠️ Your campus account has been suspended by the campus administrator. You cannot list or edit items on the platform. Please contact the Proctor's Office to resolve this.
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Item Name */}
          <div className="form-group">
            <label className="form-label">Item Title / Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Casio fx-991CW Scientific Calculator"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Category & Condition */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Condition *</label>
              <select
                className="form-select"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                required
              >
                <option value="Brand New">Brand New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Usable">Usable</option>
              </select>
            </div>
          </div>

          {/* Price & Deposit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Daily Rental Fee (₹) *</label>
              <input
                type="number"
                step="1"
                min="0"
                className="form-input"
                placeholder="e.g. 20"
                value={formData.price_per_day}
                onChange={(e) => setFormData({ ...formData, price_per_day: e.target.value })}
                required
              />
              <span className="form-help">Amount borrower pays per day.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Refundable Security Deposit (₹)</label>
              <input
                type="number"
                step="1"
                min="0"
                className="form-input"
                placeholder="e.g. 200"
                value={formData.deposit}
                onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
              />
              <span className="form-help">Returned to borrower upon safe return.</span>
            </div>
          </div>

          {/* Campus Location */}
          <div className="form-group">
            <label className="form-label">Campus Handover Location *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Men's Hostel J Lobby / CS Department Ground Floor"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          {/* Photo / Image Upload Section */}
          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                Item Photo *
              </label>

              {/* Mode Toggle: Device vs URL */}
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.2rem', borderRadius: 'var(--radius-md)', gap: '0.2rem' }}>
                <button
                  type="button"
                  onClick={() => setUploadMode('device')}
                  style={{
                    border: 'none',
                    background: uploadMode === 'device' ? '#ffffff' : 'transparent',
                    color: uploadMode === 'device' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: uploadMode === 'device' ? 700 : 500,
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    boxShadow: uploadMode === 'device' ? 'var(--shadow-sm)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <UploadCloud size={14} /> Upload from Device
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('url')}
                  style={{
                    border: 'none',
                    background: uploadMode === 'url' ? '#ffffff' : 'transparent',
                    color: uploadMode === 'url' ? 'var(--primary)' : 'var(--text-muted)',
                    fontWeight: uploadMode === 'url' ? 700 : 500,
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    boxShadow: uploadMode === 'url' ? 'var(--shadow-sm)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <LinkIcon size={14} /> Image URL / Presets
                </button>
              </div>
            </div>

            {/* Hidden File Input for Device Upload */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />

            {uploadMode === 'device' ? (
              <div>
                {/* Drag and Drop Zone or Preview Card */}
                {formData.image_url ? (
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '1.25rem', 
                      padding: '1rem', 
                      border: '1.5px solid var(--border-color)', 
                      borderRadius: 'var(--radius-md)', 
                      background: '#f8fafc' 
                    }}
                  >
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      style={{ 
                        width: '100px', 
                        height: '80px', 
                        objectFit: 'cover', 
                        borderRadius: 'var(--radius-sm)', 
                        border: '1px solid var(--border-color)',
                        backgroundColor: '#ffffff'
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600';
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                        <Check size={16} /> Photo ready for listing
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem', wordBreak: 'break-all' }}>
                        {imageFileName || 'Custom image from your device'}
                      </div>
                      <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                        >
                          <Camera size={13} /> Change Photo
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#ef4444', border: '1px solid #fca5a5', background: '#ffffff' }}
                          onClick={() => {
                            setFormData({ ...formData, image_url: '' });
                            setImageFileName('');
                          }}
                        >
                          <X size={13} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Empty Drop Zone */
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${isDragOver ? 'var(--primary)' : 'var(--border-focus)'}`,
                      borderRadius: 'var(--radius-lg)',
                      padding: '2rem 1.5rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: isDragOver ? 'var(--primary-light)' : '#f8fafc',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {uploadingImage ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
                        <Loader2 size={32} className="spinner" />
                        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Uploading image from device...</span>
                      </div>
                    ) : (
                      <>
                        <div 
                          style={{ 
                            width: '52px', 
                            height: '52px', 
                            borderRadius: '50%', 
                            background: 'var(--primary-light)', 
                            color: 'var(--primary)', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            marginBottom: '0.75rem' 
                          }}
                        >
                          <UploadCloud size={26} />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                          Click to upload or drag & drop photo here
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Supports JPG, PNG, WEBP, or GIF from your phone or computer (up to 10MB)
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* URL / Preset Mode */
              <div>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={formData.image_url}
                  onChange={(e) => {
                    setFormData({ ...formData, image_url: e.target.value });
                    setImageFileName('');
                  }}
                />

                <div style={{ marginTop: '0.6rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                    <Sparkles size={13} style={{ display: 'inline', marginRight: '4px' }} />
                    Or select a campus preset photo:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {PRESET_IMAGES.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, image_url: p.url });
                          setImageFileName('');
                        }}
                        style={{
                          background: formData.image_url === p.url ? 'var(--primary-light)' : '#f1f5f9',
                          color: formData.image_url === p.url ? 'var(--primary)' : '#475569',
                          border: `1px solid ${formData.image_url === p.url ? 'var(--primary)' : 'var(--border-color)'}`,
                          borderRadius: 'var(--radius-full)',
                          padding: '0.2rem 0.6rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description & Usage Guidelines</label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Describe the item's features, included accessories (cables, locks, cases), or specific instructions for borrowing."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontWeight: 700 }}
            disabled={loading || Boolean(user?.is_banned)}
          >
            {user?.is_banned ? 'Account Suspended (Banned)' : loading ? 'Saving Listing...' : isEdit ? 'Update Item Details' : 'Publish Item to Campus'}
          </button>
        </form>
      </div>
    </div>
  );
}
