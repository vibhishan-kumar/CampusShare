import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Shield, Star, Clock, ArrowRight, User } from 'lucide-react';
import StatusBadge, { formatAvailableDate } from './StatusBadge';

export default function ItemCard({ item }) {
  const [isHovered, setIsHovered] = useState(false);
  const isBorrowed = Boolean(item.is_currently_borrowed || item.status === 'borrowed' || !item.is_available);

  return (
    <div 
      className="card card-interactive" 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        background: '#ffffff',
        position: 'relative'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image & Floating Badges */}
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '195px', 
          backgroundColor: '#f1f5f9', 
          overflow: 'hidden',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)'
        }}
      >
        <img
          src={item.image_url || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600'}
          alt={item.name}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            transform: isHovered ? 'scale(1.06)' : 'scale(1)'
          }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600';
          }}
        />

        {/* Category Pill Top-Left */}
        <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              background: 'rgba(255, 255, 255, 0.92)',
              color: 'var(--primary)',
              padding: '0.22rem 0.6rem',
              borderRadius: '999px',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
              letterSpacing: '0.02em',
              textTransform: 'uppercase'
            }}
          >
            {item.category_name || 'Campus'}
          </span>
        </div>

        {/* Status Badge Top-Right */}
        <div style={{ position: 'absolute', top: '10px', right: '10px', maxWidth: '85%' }}>
          <StatusBadge 
            status={isBorrowed ? 'BORROWED' : 'AVAILABLE'} 
            availableAfter={item.available_after}
          />
        </div>

        {/* Condition Tag Bottom-Left */}
        {item.condition && (
          <div style={{ position: 'absolute', bottom: '10px', left: '10px' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                background: 'rgba(15, 23, 42, 0.78)',
                color: '#ffffff',
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                backdropFilter: 'blur(6px)',
              }}
            >
              {item.condition}
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3 style={{ fontSize: '1.08rem', fontWeight: 800, lineHeight: '1.35', marginBottom: '0.45rem', color: 'var(--text-main)' }}>
          <Link to={`/items/${item.id}`} style={{ color: 'inherit', transition: 'color 0.15s ease' }}>
            {item.name}
          </Link>
        </h3>

        {/* Available After Banner (if currently borrowed) */}
        {isBorrowed && item.available_after && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              padding: '0.3rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.74rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
            }}
          >
            <Clock size={13} color="#d97706" />
            <span>Available after {formatAvailableDate(item.available_after)}</span>
          </div>
        )}

        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '0.9rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
          {item.description || 'Verified student item available for borrow on UoH campus.'}
        </p>

        {/* Campus Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#64748b', marginBottom: '1rem' }}>
          <MapPin size={14} color="#6366f1" style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
            {item.location || 'UoH Campus'}
          </span>
        </div>

        {/* Owner & Price Footer */}
        <div 
          style={{ 
            borderTop: '1px solid var(--border-color)', 
            paddingTop: '0.9rem', 
            marginTop: 'auto',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}
        >
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Daily Rent
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.15 }}>
              ₹{item.price_per_day} <span style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ day</span>
            </div>
            {item.deposit > 0 ? (
              <div style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600, marginTop: '0.15rem' }}>
                ₹{item.deposit} refundable
              </div>
            ) : (
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                Zero deposit
              </div>
            )}
          </div>

          <Link
            to={`/items/${item.id}`}
            className={`btn btn-sm ${!isBorrowed && !item.is_owner ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              fontWeight: 700,
              padding: '0.45rem 0.95rem',
              borderRadius: 'var(--radius-md)',
              borderColor: isBorrowed && !item.is_owner ? '#fde68a' : undefined,
              backgroundColor: isBorrowed && !item.is_owner ? '#fffbeb' : undefined,
              color: isBorrowed && !item.is_owner ? '#92400e' : undefined,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            {item.is_owner ? 'Your Item' : isBorrowed ? (item.available_after ? `Due ${formatAvailableDate(item.available_after)}` : 'Borrowed') : <><span>Borrow</span><ArrowRight size={13} /></>}
          </Link>
        </div>
      </div>
    </div>
  );
}

