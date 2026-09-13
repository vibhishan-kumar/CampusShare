import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import ItemCard from '../components/ItemCard';
import { Search, Filter, SlidersHorizontal, RefreshCw } from 'lucide-react';

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [condition, setCondition] = useState('all');
  const [maxPrice, setMaxPrice] = useState('');
  const [availability, setAvailability] = useState('all');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.getCategories();
        if (res.success) setCategories(res.categories);
      } catch (err) {
        console.error(err);
      }
    }
    fetchCategories();
  }, []);

  // Update query params when search filter changes
  useEffect(() => {
    const urlCategory = searchParams.get('category');
    if (urlCategory) setCategory(urlCategory);

    const urlSearch = searchParams.get('search');
    if (urlSearch) setSearch(urlSearch);
  }, [searchParams]);

  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      try {
        const params = {};
        if (search.trim()) params.search = search.trim();
        if (category && category !== 'all') params.category = category;
        if (condition && condition !== 'all') params.condition = condition;
        if (maxPrice && !isNaN(maxPrice)) params.max_price = maxPrice;
        if (availability && availability !== 'all') params.availability = availability;
        if (sort) params.sort = sort;

        const res = await api.getItems(params);
        if (res.success) {
          setItems(res.items);
        }
      } catch (err) {
        console.error('Error fetching filtered items:', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchItems, 250);
    return () => clearTimeout(timer);
  }, [search, category, condition, maxPrice, availability, sort]);

  const resetFilters = () => {
    setSearch('');
    setCategory('all');
    setCondition('all');
    setMaxPrice('');
    setAvailability('all');
    setSort('newest');
    setSearchParams({});
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
          Campus Marketplace
        </h1>
        <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
          Find calculators, books, gear cycles, electronics, and lab equipment shared by students on campus.
        </p>
      </div>

      {/* Category Pills Quick Bar */}
      <div style={{ display: 'flex', gap: '0.55rem', overflowX: 'auto', paddingBottom: '0.65rem', marginBottom: '1.5rem', scrollbarWidth: 'none' }}>
        <button
          type="button"
          onClick={() => { setCategory('all'); setSearchParams({ ...Object.fromEntries(searchParams), category: 'all' }); }}
          style={{
            padding: '0.45rem 1.05rem',
            borderRadius: '999px',
            fontSize: '0.84rem',
            fontWeight: 700,
            border: category === 'all' ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
            background: category === 'all' ? 'var(--primary)' : '#ffffff',
            color: category === 'all' ? '#ffffff' : 'var(--text-main)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            boxShadow: category === 'all' ? '0 2px 8px rgba(79, 70, 229, 0.28)' : 'var(--shadow-xs)',
            transition: 'all 0.15s ease'
          }}
        >
          All Items
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => { setCategory(String(c.id)); setSearchParams({ ...Object.fromEntries(searchParams), category: String(c.id) }); }}
            style={{
              padding: '0.45rem 1.05rem',
              borderRadius: '999px',
              fontSize: '0.84rem',
              fontWeight: 700,
              border: String(category) === String(c.id) ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
              background: String(category) === String(c.id) ? 'var(--primary)' : '#ffffff',
              color: String(category) === String(c.id) ? '#ffffff' : 'var(--text-main)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: String(category) === String(c.id) ? '0 2px 8px rgba(79, 70, 229, 0.28)' : 'var(--shadow-xs)',
              transition: 'all 0.15s ease'
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          padding: '1.25rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          {/* Keyword Search */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Keyword / Item Name</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="E.g. Casio, cycle, racket..."
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Category */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Condition */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Condition</label>
            <select
              className="form-select"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="all">Any Condition</option>
              <option value="Brand New">Brand New</option>
              <option value="Like New">Like New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Usable">Usable</option>
            </select>
          </div>

          {/* Availability */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Availability</label>
            <select
              className="form-select"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="available">Available Now</option>
              <option value="borrowed">Currently Borrowed</option>
            </select>
          </div>

          {/* Max Price */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>Max Price (₹/day)</label>
            <input
              type="number"
              placeholder="e.g. 50"
              className="form-input"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              min="0"
            />
          </div>

          {/* Sort & Reset */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Sort By</label>
              <select
                className="form-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            </div>

            <div style={{ alignSelf: 'flex-end' }}>
              <button
                type="button"
                onClick={resetFilters}
                className="btn btn-secondary"
                title="Reset Filters"
                style={{ height: '38px', padding: '0 0.8rem' }}
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Showing <strong>{items.length}</strong> campus items
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Updating search results...
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
          }}
        >
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            No items matched your filters
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Try adjusting your search keywords or resetting price and condition filters.
          </p>
          <button className="btn btn-secondary" onClick={resetFilters}>
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid-cards">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
