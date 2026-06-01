import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const TAMIL_DISTRICTS = [
  'Ariyalur','Chengalpattu','Chennai','Coimbatore','Cuddalore','Dharmapuri',
  'Dindigul','Erode','Kallakurichi','Kancheepuram','Kanyakumari','Karur',
  'Krishnagiri','Madurai','Mayiladuthurai','Nagapattinam','Namakkal',
  'Nilgiris','Perambalur','Pudukkottai','Ramanathapuram','Ranipet',
  'Salem','Sivaganga','Tenkasi','Thanjavur','Theni','Thoothukudi',
  'Tiruchirappalli','Tirunelveli','Tirupathur','Tiruppur','Tiruvallur',
  'Tiruvannamalai','Tiruvarur','Vellore','Villupuram','Virudhunagar',
];

export default function Register() {
  const [step,    setStep]    = useState('form'); // 'form' | 'otp'
  const [form,    setForm]    = useState({
    name: '', phone: '', email: '',
    medium: '', gender: '', age: '', district: '', address: '',
  });
  const [otp,     setOtp]     = useState('');
  const [devOtp,  setDevOtp]  = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [counts,  setCounts]  = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/dashboard/counts')
      .then(r => r.json())
      .then(d => { if (d.success) setCounts(d.data.totals); })
      .catch(() => {});
  }, []);

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }));

  async function sendOtp(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim())                     return setError('Full name is required');
    if (!/^\d{10}$/.test(form.phone))          return setError('Enter a valid 10-digit phone number');

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose:  'register',
          phone:    form.phone,
          name:     form.name.trim() || null,
          email:    form.email.trim() || null,
          medium:   form.medium  || null,
          gender:   form.gender  || null,
          age:      form.age     ? parseInt(form.age) : null,
          district: form.district || null,
          address:  form.address.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDevOtp(data.otp || '');
        setStep('otp');
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch { setError('Network error. Try again.'); }
    setLoading(false);
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setError('');
    if (!otp || otp.length !== 6) return setError('Enter the 6-digit OTP');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('jwt', data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch { setError('Network error. Try again.'); }
    setLoading(false);
  }

  const statItems = counts
    ? [
        { n: counts.topics,       l: 'Topics' },
        { n: counts.questions,    l: 'Questions' },
        { n: counts.flashcards,   l: 'Flashcards' },
        { n: counts.bullet_points,l: 'Bullet Points' },
      ]
    : [];

  return (
    <div className="auth-split">
      {/* Brand */}
      <div className="auth-brand">
        <div className="auth-brand-inner">
          <div className="auth-logo">
            <span className="auth-logo-icon">🎓</span>
            <div>
              <div className="auth-logo-title">TNPSC Group 4</div>
              <div className="auth-logo-sub">Exam Preparation Platform</div>
            </div>
          </div>
          <div className="auth-brand-headline">
            <h2>இலவசமாக<br />இணையுங்கள்!</h2>
            <p>Join thousands of students preparing for TNPSC Group 4.</p>
          </div>
          {statItems.length > 0 && (
            <div className="auth-counts">
              {statItems.map(({ n, l }) => (
                <div key={l} className="auth-count-pill">
                  <span className="auth-count-n">{n}</span>
                  <span className="auth-count-l">{l}</span>
                </div>
              ))}
            </div>
          )}
          <div className="auth-features-list">
            {[
              ['🆓', '100% free — no subscription needed'],
              ['📱', 'Works great on mobile'],
              ['🇮🇳', 'Tamil & English content'],
              ['🎯', 'TNPSC Group 4 focused curriculum'],
            ].map(([icon, text]) => (
              <div key={text} className="auth-feature-row">
                <span className="auth-feature-icon">{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="auth-form-panel">
        <div className="auth-mobile-logo">
          <span>🎓</span>
          <div>
            <div className="auth-logo-title">TNPSC Group 4</div>
            <div className="auth-logo-sub">Exam Preparation</div>
          </div>
        </div>

        <div className="auth-form-box">

          {step === 'form' ? (
            <>
              <div className="auth-form-title">
                <h2>Create your account</h2>
                <p>Start your TNPSC preparation — it's free</p>
              </div>
              {error && <div className="alert-error">{error}</div>}

              <form onSubmit={sendOtp}>

                {/* ── Required ── */}
                <div className="form-section-label">Required</div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input type="text" className="form-control" placeholder="Ravi Kumar"
                      value={form.name} onChange={set('name')} required autoFocus />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input type="tel" className="form-control" placeholder="9876543210"
                      value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/,'').slice(0,10) }))}
                      maxLength={10} required />
                  </div>
                </div>

                {/* ── Optional personal ── */}
                <div className="form-section-label">Personal Details <span className="form-optional">optional</span></div>
                <div className="form-row-2">
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" className="form-control" placeholder="you@example.com"
                      value={form.email} onChange={set('email')} />
                  </div>
                  <div className="form-group">
                    <label>Medium</label>
                    <select className="form-control" value={form.medium} onChange={set('medium')}>
                      <option value="">Select medium</option>
                      <option value="tamil">Tamil</option>
                      <option value="english">English</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label>Gender</label>
                    <select className="form-control" value={form.gender} onChange={set('gender')}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Age</label>
                    <input type="number" className="form-control" placeholder="25"
                      value={form.age} onChange={set('age')} min={10} max={80} />
                  </div>
                </div>

                {/* ── Address ── */}
                <div className="form-section-label">Address <span className="form-optional">optional</span></div>
                <div className="form-group">
                  <label>District</label>
                  <select className="form-control" value={form.district} onChange={set('district')}>
                    <option value="">Select district</option>
                    {TAMIL_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Full Address</label>
                  <textarea className="form-control" rows={3}
                    placeholder="Door No, Street, Area, City — e.g. 12/3A, Anna Nagar, Chennai"
                    value={form.address} onChange={set('address')}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? <><span className="btn-spinner" /> Sending OTP...</> : 'Send OTP'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="auth-form-title">
                <h2>Verify OTP</h2>
                <p>OTP sent to <strong>+91 {form.phone}</strong></p>
              </div>
              {devOtp && (
                <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                  Dev mode — OTP: <strong style={{ fontSize: 18, letterSpacing: 2 }}>{devOtp}</strong>
                </div>
              )}
              {error && <div className="alert-error">{error}</div>}
              <form onSubmit={verifyOtp}>
                <div className="form-group">
                  <label>6-digit OTP</label>
                  <input
                    type="text" className="form-control" placeholder="123456" maxLength={6}
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/,'').slice(0,6))}
                    required autoFocus inputMode="numeric"
                    style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
                  />
                </div>
                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? <><span className="btn-spinner" /> Verifying...</> : 'Verify & Create Account'}
                </button>
                <button type="button" className="auth-btn"
                  style={{ background: 'transparent', color: 'var(--primary)', marginTop: 8 }}
                  onClick={() => { setStep('form'); setOtp(''); setError(''); setDevOtp(''); }}>
                  ← Edit details
                </button>
              </form>
            </>
          )}

          <div className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
