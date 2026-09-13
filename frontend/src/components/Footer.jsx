import React from 'react';
import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer" style={{ padding: '1.25rem 1.5rem', marginTop: 'auto' }}>
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.84rem',
          color: 'var(--text-muted)',
        }}
      >
        <div>
          © {new Date().getFullYear()} <strong>CampusShare</strong> • University of Hyderabad. Built for students, by students.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          Made with <Heart size={14} color="#ef4444" fill="#ef4444" /> for UoH Campus Life
        </div>
      </div>
    </footer>
  );
}
