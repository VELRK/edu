import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';

export default function Analytics() {
  const { fetchAuth } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetchAuth('/api/user/analytics');
      if (!res) return;
      const d = await res.json();
      if (d.success) setData(d.data);
      else setError(true);
    } catch (e) { setError(true); }
    setLoading(false);
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  if (error || !data) return (
    <div className="page-wrap">
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <h3>No analytics yet</h3>
        <p>Take some practice tests first to see your analytics.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={load}>Try Again</button>
      </div>
    </div>
  );

  const mastery = data.topic_mastery || {};
  const wa = data.wrong_answers || {};
  const subjectAccuracy = data.subject_accuracy || [];
  const avgScore = subjectAccuracy.length
    ? Math.round(subjectAccuracy.reduce((s, x) => s + (x.avg_score || 0), 0) / subjectAccuracy.length)
    : 0;
  const trend = data.score_trend || [];
  const maxTrend = trend.length ? Math.max(...trend.map(t => t.avg_score || 0)) || 100 : 100;
  const difficulty = data.difficulty_breakdown || [];
  const maxDiff = difficulty.length ? Math.max(...difficulty.map(i => parseInt(i.count) || 0)) || 1 : 1;

  const masteryPct = mastery.total ? Math.round((mastery.completed / mastery.total) * 100) : 0;
  const masteryPctDisplay = mastery.total ? masteryPct : 0;
  const waMastered = parseInt(wa.mastered) || 0;
  const waTotal = parseInt(wa.total_wrong) || 0;
  const waPct = waTotal > 0 ? Math.round((waMastered / waTotal) * 100) : 0;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Performance Analytics</h1>
          <p className="page-sub">Deep dive into your learning performance across subjects and time.</p>
        </div>
        <button className="btn btn-primary" onClick={load}>Refresh</button>
      </div>

      <div className="mod-stats-row">
        <div className="mod-stat"><span className="mod-stat-num green">{mastery.completed || 0}</span><span>Topics Completed</span></div>
        <div className="mod-stat"><span className="mod-stat-num purple">{mastery.total || 0}</span><span>Total Topics</span></div>
        <div className="mod-stat"><span className="mod-stat-num amber">{avgScore}%</span><span>Avg Score</span></div>
        <div className="mod-stat"><span className="mod-stat-num red">{wa.unmastered || 0}</span><span>Unmastered Wrongs</span></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <div className="mod-card" style={{ padding: '20px 24px' }}>
          <div className="mod-card-title">Score Trend (Last 30 Days)</div>
          {trend.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-state-icon">📈</div>
              <p>No exam data yet.</p>
            </div>
          ) : (
            <div className="bar-chart-row">
              {trend.map((t, i) => {
                const h = Math.round(((t.avg_score || 0) / maxTrend) * 100);
                const date = new Date(t.date);
                const label = (date.getMonth() + 1) + '/' + date.getDate();
                return (
                  <div key={i} className="bar-col">
                    <span className="bar-val">{t.avg_score}%</span>
                    <div className="bar-fill" style={{ height: h + 'px' }} />
                    <span className="bar-lbl">{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mod-card" style={{ padding: '20px 24px' }}>
          <div className="mod-card-title">Wrong Answers Summary</div>
          {!wa.total_wrong ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-state-icon">✅</div>
              <p>No wrong answers recorded yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Total recorded</span>
                <span style={{ fontWeight: 800, fontSize: '1.4rem', color: '#1e293b' }}>{waTotal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Mastered</span>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#10b981' }}>{waMastered}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Unmastered</span>
                <span style={{ fontWeight: 700, fontSize: '1.2rem', color: '#ef4444' }}>{wa.unmastered || 0}</span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8', marginBottom: 4 }}>
                  <span>Mastery Rate</span><span>{waPct}%</span>
                </div>
                <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4 }}>
                  <div style={{ height: 8, background: '#10b981', borderRadius: 4, width: waPct + '%' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mod-card" style={{ padding: '20px 24px', marginTop: 20 }}>
        <div className="mod-card-title">Subject-wise Performance</div>
        {subjectAccuracy.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <div className="empty-state-icon">📋</div>
            <p>No data yet. Take topic quizzes or mock tests.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Attempts</th>
                  <th>Avg Score</th>
                  <th>Accuracy</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {subjectAccuracy.map(s => {
                  const scoreColor = s.avg_score >= 70 ? '#10b981' : s.avg_score >= 50 ? '#f59e0b' : '#ef4444';
                  const badge = s.avg_score >= 70 ? 'badge-success' : s.avg_score >= 50 ? 'badge-warning' : 'badge-danger';
                  const status = s.avg_score >= 70 ? 'Strong' : s.avg_score >= 50 ? 'Average' : 'Weak';
                  return (
                    <tr key={s.subject_id}>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>{s.subject_name_english}</td>
                      <td>{s.attempts || 0}</td>
                      <td style={{ color: scoreColor, fontWeight: 700 }}>{s.avg_score || 0}%</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 6, background: '#e2e8f0', borderRadius: 4 }}>
                            <div style={{ width: (s.accuracy || 0) + '%', height: 6, background: scoreColor, borderRadius: 4 }} />
                          </div>
                          {s.accuracy || 0}%
                        </div>
                      </td>
                      <td><span className={badge}>{status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <div className="mod-card" style={{ padding: '20px 24px' }}>
          <div className="mod-card-title">Wrong Answers by Difficulty</div>
          {difficulty.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}><p>No wrong answer data.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {difficulty.map(item => {
                const count = parseInt(item.count) || 0;
                const pct = Math.round((count / maxDiff) * 100);
                const color = item.difficulty?.toLowerCase() === 'easy' ? '#10b981' : item.difficulty?.toLowerCase() === 'medium' ? '#f59e0b' : '#ef4444';
                return (
                  <div key={item.difficulty}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 5 }}>
                      <span style={{ color: '#94a3b8' }}>{item.difficulty || 'Unknown'}</span>
                      <span style={{ fontWeight: 700, color }}>{count} wrong</span>
                    </div>
                    <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4 }}>
                      <div style={{ width: pct + '%', height: 8, background: color, borderRadius: 4 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mod-card" style={{ padding: '20px 24px' }}>
          <div className="mod-card-title">Topic Mastery</div>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '3.5rem', fontWeight: 900, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
              {masteryPctDisplay}%
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: 8 }}>
              {mastery.completed || 0} of {mastery.total || 0} topics completed
            </div>
            <div style={{ height: 10, background: '#e2e8f0', borderRadius: 5, marginTop: 16 }}>
              <div style={{ width: masteryPctDisplay + '%', height: 10, background: 'linear-gradient(90deg, #7c3aed, #06b6d4)', borderRadius: 5 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: 6 }}>
              <span>0%</span><span>Target: 100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
