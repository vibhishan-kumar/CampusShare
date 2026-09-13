import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import ItemCard from '../components/ItemCard';
import { 
  BookOpen, 
  Cpu, 
  Bike, 
  Activity, 
  FlaskConical, 
  Home as HomeIcon, 
  ArrowRight, 
  ShieldCheck, 
  Search,
  Share2,
  RotateCcw,
  Zap
} from 'lucide-react';

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [itemsRes, catsRes] = await Promise.all([
          api.getItems({ availability: 'available' }),
          api.getCategories(),
        ]);
        if (itemsRes.success) setItems(itemsRes.items.slice(0, 8));
        if (catsRes.success) setCategories(catsRes.categories);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getCategoryTheme = (iconName) => {
    switch (iconName) {
      case 'book-open': 
        return { icon: <BookOpen size={22} />, bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
      case 'cpu': 
        return { icon: <Cpu size={22} />, bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
      case 'bike': 
        return { icon: <Bike size={22} />, bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' };
      case 'activity': 
        return { icon: <Activity size={22} />, bg: '#fdf2f8', color: '#db2777', border: '#fbcfe8' };
      case 'flask-conical': 
        return { icon: <FlaskConical size={22} />, bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' };
      default: 
        return { icon: <HomeIcon size={22} />, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <div>

      {/* Categories Showcase */}
      <section style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Browse by Campus Category
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Explore academic gear, commute vehicles, electronics, and daily student necessities
            </p>
          </div>
          <Link to="/browse" style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            View all categories <ArrowRight size={16} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.2rem' }}>
          {categories.map((cat) => {
            const theme = getCategoryTheme(cat.icon);
            return (
              <Link
                key={cat.id}
                to={`/browse?category=${cat.id}`}
                className="card card-interactive"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.9rem',
                  textDecoration: 'none',
                  color: 'var(--text-main)',
                  border: `1.5px solid ${theme.border}`,
                  background: '#ffffff',
                }}
              >
                <div 
                  style={{ 
                    color: theme.color, 
                    background: theme.bg, 
                    padding: '0.65rem', 
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {theme.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.15rem' }}>
                    {cat.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Campus listings
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Items Grid */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
              <Zap size={14} /> Available on Campus
            </div>
            <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Latest Verified Listings
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Borrow cycles, scientific calculators, and gear directly from fellow UoH students
            </p>
          </div>
          <Link to="/browse" className="btn btn-secondary btn-sm" style={{ fontWeight: 700 }}>
            Browse All Items ({items.length})
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Loading available campus items...
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: '#ffffff', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--border-color)' }}>
            <Share2 size={40} color="#94a3b8" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.4rem' }}>No items listed on campus yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
              Be the first student to share an item on CampusShare and earn rental pocket money!
            </p>
            <Link to="/items/add" className="btn btn-primary">List Your First Item</Link>
          </div>
        ) : (
          <div className="grid-cards">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* How CampusShare Works Section */}
      <section
        className="card"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f8faff 100%)',
          padding: '3.5rem 2.25rem',
          marginBottom: '2.5rem',
          border: '1.5px solid var(--border-color)',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
            Seamless & Safe
          </div>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.6rem', letterSpacing: '-0.02em' }}>
            How CampusShare Works
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.55' }}>
            Designed exclusively for the University of Hyderabad campus community with built-in trust and accountability.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
          <div 
            style={{ 
              background: '#ffffff', 
              padding: '1.75rem', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative'
            }}
          >
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <Search size={24} />
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
              Step 1
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Find or List Spare Gear
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.55' }}>
              Search for scientific calculators, bicycles, textbooks, or electronics. Or list your own idle items to earn rental fees from fellow students.
            </p>
          </div>

          <div 
            style={{ 
              background: '#ffffff', 
              padding: '1.75rem', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative'
            }}
          >
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <ShieldCheck size={24} />
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
              Step 2
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Request & Secure Meetup
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.55' }}>
              Once approved by the owner, pay online securely with escrow deposit guarantee. Chat directly to arrange a quick handover at your hostel or department.
            </p>
          </div>

          <div 
            style={{ 
              background: '#ffffff', 
              padding: '1.75rem', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative'
            }}
          >
            <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <RotateCcw size={24} />
            </div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
              Step 3
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              Return & Build Trust
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.55' }}>
              Return the item on time, receive your security deposit back immediately, and leave peer reviews to build your campus trust score.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

