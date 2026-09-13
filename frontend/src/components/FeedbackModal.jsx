import React, { useState } from 'react';
import { api } from '../api/client';
import RatingStars from './RatingStars';
import { X, Star } from 'lucide-react';

export default function FeedbackModal({ borrowRequest, onClose, onFeedbackSuccess }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!borrowRequest) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.submitFeedback({
        borrow_request_id: borrowRequest.id,
        rating,
        comment,
      });

      if (res.success) {
        if (onFeedbackSuccess) onFeedbackSuccess(res.feedback);
        onClose();
      } else {
        setError(res.message || 'Failed to submit feedback.');
      }
    } catch (err) {
      setError(err.message || 'Error submitting review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Rate & Review</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert-danger">{error}</div>}

          <div style={{ textAlign: 'center', margin: '1rem 0 1.5rem' }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              How was your experience sharing <strong>{borrowRequest.item_name}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RatingStars
                rating={rating}
                interactive={true}
                onChange={setRating}
                size={28}
              />
            </div>
            <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>
              {rating === 5 && 'Outstanding! 🌟'}
              {rating === 4 && 'Very Good 👍'}
              {rating === 3 && 'Average 🙂'}
              {rating === 2 && 'Needs Improvement ⚠️'}
              {rating === 1 && 'Disappointing ❌'}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Feedback / Remarks:</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Was the item in great condition? Handover on time? Highly recommended to other students?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Submitting Review...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}
