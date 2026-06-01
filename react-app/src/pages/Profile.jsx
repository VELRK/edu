import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function Profile() {
  const { fetchAuth } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, statsRes] = await Promise.all([
          fetchAuth('/api/user/profile'),
          fetchAuth('/api/user/stats'),
        ]);
        if (!profileRes || !statsRes) return;
        if (profileRes.ok) {
          const d = await profileRes.json();
          setProfile(d.data);
          setForm({ name: d.data.name || '', phone: d.data.phone || '', address: d.data.address || '' });
          // Sync name to localStorage user
          const userRaw = localStorage.getItem('user');
          if (userRaw) {
            const u = JSON.parse(userRaw);
            u.name = d.data.name || u.name;
            localStorage.setItem('user', JSON.stringify(u));
          }
        }
        if (statsRes.ok) {
          const d = await statsRes.json();
          setStats(d.data);
        }
      } catch (e) { setError('Failed to load profile'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetchAuth('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        setProfile(prev => ({ ...prev, ...form }));
        const userRaw = localStorage.getItem('user');
        if (userRaw) {
          const u = JSON.parse(userRaw);
          u.name = form.name || u.name;
          localStorage.setItem('user', JSON.stringify(u));
        }
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to save');
      }
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const overallPct = stats ? Math.round((stats.topics_completed / Math.max(stats.total_topics, 1)) * 100) : 0;

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Profile</h1></div>
        <div className="page-body" style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header"><h1>My Profile</h1></div>
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, maxWidth: 900 }}>

          {/* Left: Avatar + Stats */}
          <div>
            <div className="card" style={{ textAlign: 'center', padding: 28 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', fontSize: 30, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                {getInitials(profile?.name || profile?.username)}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{profile?.name || profile?.username}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{profile?.email || profile?.username}</div>
              {profile?.phone && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>📞 {profile.phone}</div>}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' }) : 'N/A'}
              </div>
            </div>

            {/* Study Stats */}
            {stats && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-title">Study Stats</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Topics Completed</span>
                    <span style={{ fontWeight: 600 }}>{stats.topics_completed} / {stats.total_topics}</span>
                  </div>
                  <div>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill" style={{ width: `${overallPct}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, textAlign: 'right' }}>{overallPct}% complete</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Exams Taken</span>
                    <span style={{ fontWeight: 600 }}>{stats.exams_taken}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Average Score</span>
                    <span style={{ fontWeight: 600, color: stats.avg_score >= 70 ? 'var(--success)' : 'var(--warning)' }}>{stats.avg_score}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Edit Form */}
          <div className="card">
            <div className="card-title">Edit Profile</div>
            {error && <div className="alert-error">{error}</div>}
            {saved && <div className="alert-success">Profile saved successfully!</div>}

            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" className="form-control" value={form.name} onChange={set('name')} placeholder="Your full name" />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" className="form-control" value={profile?.email || profile?.username || ''} disabled style={{ background: '#f8fafc', color: 'var(--text-muted)' }} />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Email cannot be changed</p>
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" className="form-control" value={form.phone} onChange={set('phone')} placeholder="9876543210" />
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  className="form-control"
                  value={form.address}
                  onChange={set('address')}
                  placeholder="Your full address..."
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '10px 24px' }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
