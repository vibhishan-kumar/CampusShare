import React from 'react';
import { Star } from 'lucide-react';

export default function RatingStars({ rating = 5, totalStars = 5, interactive = false, onChange = null, size = 16 }) {
  const numericRating = Math.round(Number(rating) || 0);

  if (interactive) {
    return (
      <div className="star-rating" style={{ gap: '6px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange && onChange(star)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
          >
            <Star
              size={size}
              fill={star <= numericRating ? '#f59e0b' : 'none'}
              color={star <= numericRating ? '#f59e0b' : '#cbd5e1'}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="star-rating" style={{ gap: '2px' }}>
      {[...Array(totalStars)].map((_, i) => (
        <Star
          key={i}
          size={size}
          fill={i < numericRating ? '#f59e0b' : 'none'}
          color={i < numericRating ? '#f59e0b' : '#cbd5e1'}
        />
      ))}
      <span style={{ fontSize: '0.8rem', fontWeight: 700, marginLeft: '4px', color: '#475569' }}>
        {Number(rating).toFixed(1)}
      </span>
    </div>
  );
}
