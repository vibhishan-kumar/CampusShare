import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, 
  ShieldCheck, 
  AlertCircle, 
  Mail, 
  Phone,  
  Hash 
} from 'lucide-react';

const UOH_SCHOOLS = [
  'School of Computer and Information Sciences (SCIS)',
  'School of Physics',
  'School of Chemistry',
  'School of Life Sciences (SLS)',
  'School of Mathematics and Statistics',
  'School of Management Studies',
  'School of Humanities',
  'School of Social Sciences',
  'School of Economics',
  'School of Engineering Sciences and Technology (SEST)',
  'Sarojini Naidu School of Arts & Communication',
  'Other / Department Center',
];

const UOH_PROGRAMS = [
  'Master of Computer Applications (MCA)',
  'M.Tech AI',
  'M.Tech IT',
  'M.Tech CS',
  'IM.Tech (Integrated M.Tech)',
  'Ph.D. / Research Scholar',
  'MBA (Management Studies)',
  'M.A. Humanities / Social Sciences',
  'Other Degree / Program',
];

const UOH_HOSTELS = [
  "Men's Hostel A",
  "Men's Hostel B",
  "Men's Hostel C",
  "Men's Hostel D",
  "Men's Hostel E",
  "Men's Hostel F",
  "Men's Hostel G",
  "Men's Hostel H",
  "Men's Hostel I",
  "Men's Hostel J",
  "Men's Hostel K",
  "Men's Hostel L",
  "Men's Hostel M",
  'Ladies Hostel 1',
  'Ladies Hostel 2',
  'Ladies Hostel 3',
  'Ladies Hostel 4',
  'Ladies Hostel 5',
  'Ladies Hostel 6',
  'Ladies Hostel 7',
  'Ladies Hostel 8',
  'Ladies Hostel 9',
  'Ladies Hostel 10',
  'Ladies Hostel 11',
  'Ladies Hostel 12',
  'NRS Hostel (Research Scholars)',
  'Day Scholar / Off-Campus Residence',
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    school: UOH_SCHOOLS[0],
    program: UOH_PROGRAMS[0],
    hostel: UOH_HOSTELS[0],
    room_no: '',
    email: '',
    password: '',
  });

  // Submit State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const isUohEmail = formData.email.toLowerCase().trim().endsWith('@uohyd.ac.in');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isUohEmail) {
      setError('Registration is restricted to University of Hyderabad students. Email must end with @uohyd.ac.in');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const res = await register(formData);
      if (res.success) {
        navigate('/browse');
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '2rem auto' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <UserPlus size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
            Student Registration
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Join the campus sharing network at University of Hyderabad
          </p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* 1. Full Name */}
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* 2. Phone Number */}
          <div className="form-group">
            <label className="form-label">Phone Number *</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Phone size={15} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8' }} />
              <input
                type="tel"
                className="form-input"
                placeholder="Enter Phone Number"
                style={{ paddingLeft: '2.2rem' }}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          {/* 3. School / Faculty */}
          <div className="form-group">
            <label className="form-label">School*</label>
            <select
              className="form-select"
              value={formData.school}
              onChange={(e) => setFormData({ ...formData, school: e.target.value })}
              required
            >
              {UOH_SCHOOLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 4. Program */}
          <div className="form-group">
            <label className="form-label">Program *</label>
            <select
              className="form-select"
              value={formData.program}
              onChange={(e) => setFormData({ ...formData, program: e.target.value })}
              required
            >
              {UOH_PROGRAMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* 5. Hostel */}
          <div className="form-group">
            <label className="form-label">Hostel *</label>
            <select
              className="form-select"
              value={formData.hostel}
              onChange={(e) => setFormData({ ...formData, hostel: e.target.value })}
              required
            >
              {UOH_HOSTELS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* 6. Room No */}
          <div className="form-group">
            <label className="form-label">Room No *</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Hash size={15} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Enter Room Number"
                style={{ paddingLeft: '2.2rem' }}
                value={formData.room_no}
                onChange={(e) => setFormData({ ...formData, room_no: e.target.value })}
                required
              />
            </div>
          </div>

          {/* 7. University Email */}
          <div className="form-group">
            <label className="form-label">University Email*</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} style={{ position: 'absolute', left: '0.75rem', color: '#94a3b8' }} />
              <input
                type="email"
                className="form-input"
                placeholder="Enter University Email"
                style={{ paddingLeft: '2.3rem' }}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            {formData.email && (
              <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {isUohEmail ? (
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                    <ShieldCheck size={14} style={{ display: 'inline' }} /> Valid university email address
                  </span>
                ) : (
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                    <AlertCircle size={14} style={{ display: 'inline' }} /> Must end with @uohyd.ac.in
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 5. Password */}
          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter Password (min 8 characters)"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.8rem', fontWeight: 700, marginTop: '0.5rem' }}
            disabled={loading || !isUohEmail}
          >
            {loading ? 'Creating Account...' : 'Create Campus Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
