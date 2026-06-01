import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';

export default function Login() {
  const [phone,    setPhone]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [step,     setStep]     = useState('phone'); // 'phone' | 'otp'
  const [devOtp,   setDevOtp]   = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  async function sendOtp(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(phone)) return setError('Enter a valid 10-digit phone number');
    setLoading(true);
    try {
      const res  = await apiFetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'login' }),
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
      const res  = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
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
            <h2>உங்கள் கனவை<br />நனவாக்குவோம்</h2>
            <p>Complete Tamil study material — topics, PYQ practice, smart flashcards and memory tricks for TNPSC Group 4.</p>
          </div>
          <div className="auth-features-list">
            {[
              ['📚', 'Full syllabus in Tamil & English'],
              ['✍️', 'PYQ practice with explanations'],
              ['🧠', 'Flashcards & memory tricks'],
              ['📊', 'Progress tracking & analytics'],
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
          {step === 'phone' ? (
            <>
              <div className="auth-form-title">
                <h2>Welcome back</h2>
                <p>Enter your phone number to receive an OTP</p>
              </div>
              {error && <div className="alert-error">{error}</div>}
              <form onSubmit={sendOtp}>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel" className="form-control"
                    placeholder="9876543210" maxLength={10}
                    value={phone} onChange={e => setPhone(e.target.value.replace(/\D/,'').slice(0,10))}
                    required autoFocus
                  />
                </div>
                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? <><span className="btn-spinner" /> Sending...</> : 'Send OTP'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="auth-form-title">
                <h2>Enter OTP</h2>
                <p>OTP sent to <strong>+91 {phone}</strong></p>
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
                    type="text" className="form-control"
                    placeholder="123456" maxLength={6}
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/,'').slice(0,6))}
                    required autoFocus inputMode="numeric"
                    style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
                  />
                </div>
                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? <><span className="btn-spinner" /> Verifying...</> : 'Verify & Sign In'}
                </button>
                <button type="button" className="auth-btn"
                  style={{ background: 'transparent', color: 'var(--primary)', marginTop: 8 }}
                  onClick={() => { setStep('phone'); setOtp(''); setError(''); setDevOtp(''); }}>
                  ← Change number
                </button>
              </form>
            </>
          )}

          <div className="auth-switch">
            Don't have an account? <Link to="/register">Create one free</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
