import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';

export default function Streak() {
  const { fetchAuth } = useAuth();
  const [streakData, setStreakData] = useState(null);
  const [goals, setGoals] = useState({ daily_questions_goal: 20, daily_topics_goal: 5, daily_flashcards_goal: 10, exam_date: '' });
  const [heatmap, setHeatmap] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [streakRes, goalsRes, analyticsRes] = await Promise.all([
        fetchAuth('/api/user/streak'),
        fetchAuth('/api/user/goals'),
        fetchAuth('/api/user/analytics')
      ]);
      if (!streakRes || !goalsRes || !analyticsRes) return;
      const [streakD, goalsD, analyticsD] = await Promise.all([streakRes.json(), goalsRes.json(), analyticsRes.json()]);
      if (streakD.success) setStreakData(streakD.data);
      if (goalsD.success) setGoals(g => ({ ...g, ...goalsD.data, exam_date: goalsD.data.exam_date ? goalsD.data.exam_date.slice(0, 10) : '' }));
      if (analyticsD.success) setHeatmap(analyticsD.data.activity_heatmap || []);
    } catch (e) {}
    setLoading(false);
  }

  async function saveGoals() {
    setSaving(true);
    try {
      await fetchAuth('/api/user/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...goals, exam_date: goals.exam_date || null })
      });
      alert('Goals saved!');
    } catch (e) { alert('Failed to save.'); }
    setSaving(false);
  }

  function buildHeatmap() {
    const map = {};
    heatmap.forEach(a => {
      const key = (a.activity_date || '').slice(0, 10);
      map[key] = (a.questions_answered || 0) + (a.topics_studied || 0) + (a.flashcards_reviewed || 0);
    });
    const today = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (29 - i));
      const key = d.toISOString().slice(0, 10);
      const val = map[key] || 0;
      const level = val === 0 ? '' : val < 5 ? 'l1' : val < 15 ? 'l2' : val < 30 ? 'l3' : 'l4';
      return { key, val, level };
    });
  }

  function countdown() {
    if (!goals.exam_date) return null;
    const exam = new Date(goals.exam_date);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exam - today) / 86400000);
    return diff >= 0 ? diff : null;
  }

  const streak = streakData?.current_streak || 0;
  const longest = streakData?.longest_streak || 0;
  const today = streakData?.today || {};
  const goalData = streakData?.goals || {};
  const daysLeft = countdown();
  const cells = buildHeatmap();

  const progressItems = [
    { label: 'Questions Answered', done: today.questions_answered || 0, goal: goalData.daily_questions_goal || goals.daily_questions_goal || 20, color: '#7c3aed' },
    { label: 'Topics Studied', done: today.topics_studied || 0, goal: goalData.daily_topics_goal || goals.daily_topics_goal || 5, color: '#10b981' },
    { label: 'Flashcards Reviewed', done: today.flashcards_reviewed || 0, goal: goalData.daily_flashcards_goal || goals.daily_flashcards_goal || 10, color: '#06b6d4' },
  ];

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Streak & Goals</h1>
          <p className="page-sub">Track your daily study habit and stay consistent.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="streak-hero">
            <div className="streak-num">{streak}</div>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>Day Streak</div>
            <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>Longest: {longest} days</div>
          </div>

          <div className="mod-card" style={{ padding: '20px 24px' }}>
            <div className="mod-card-title">Today's Progress</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              {progressItems.map(item => {
                const pct = Math.min(100, Math.round((item.done / item.goal) * 100));
                return (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                      <span style={{ color: '#475569' }}>{item.done >= item.goal ? '✅ ' : ''}{item.label}</span>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.done} / {item.goal}</span>
                    </div>
                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4 }}>
                      <div style={{ height: 8, background: item.color, borderRadius: 4, width: pct + '%', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="mod-card" style={{ padding: '20px 24px' }}>
            <div className="mod-card-title">Set Daily Goals</div>
            <div className="mod-form-group">
              <label>Questions per Day</label>
              <input type="number" value={goals.daily_questions_goal} min={1} max={200}
                onChange={e => setGoals(g => ({ ...g, daily_questions_goal: +e.target.value }))} />
            </div>
            <div className="mod-form-group">
              <label>Topics to Study per Day</label>
              <input type="number" value={goals.daily_topics_goal} min={1} max={50}
                onChange={e => setGoals(g => ({ ...g, daily_topics_goal: +e.target.value }))} />
            </div>
            <div className="mod-form-group">
              <label>Flashcards per Day</label>
              <input type="number" value={goals.daily_flashcards_goal} min={1} max={100}
                onChange={e => setGoals(g => ({ ...g, daily_flashcards_goal: +e.target.value }))} />
            </div>
            <div className="mod-form-group">
              <label>Target Exam Date</label>
              <input type="date" value={goals.exam_date}
                onChange={e => setGoals(g => ({ ...g, exam_date: e.target.value }))} />
            </div>
            <button className="btn btn-primary" onClick={saveGoals} disabled={saving}>
              {saving ? 'Saving…' : 'Save Goals'}
            </button>
          </div>

          {daysLeft !== null && (
            <div className="mod-card" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                Days Until Exam
              </div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '4rem', fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>
                {daysLeft}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 8 }}>
                {new Date(goals.exam_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mod-card" style={{ padding: '20px 24px', marginTop: 20 }}>
        <div className="mod-card-title">30-Day Activity</div>
        <div className="heatmap-grid" style={{ marginTop: 12 }}>
          {cells.map(c => (
            <div key={c.key} className={`hm-cell${c.level ? ' ' + c.level : ''}`} title={`${c.key}: ${c.val} activities`} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, fontSize: '0.75rem', color: '#94a3b8' }}>
          <span>Less</span>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: '#f1f5f9', border: '1px solid #e2e8f0' }} />
          <div className="hm-cell l1" style={{ width: 14, height: 14 }} />
          <div className="hm-cell l2" style={{ width: 14, height: 14 }} />
          <div className="hm-cell l3" style={{ width: 14, height: 14 }} />
          <div className="hm-cell l4" style={{ width: 14, height: 14 }} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
