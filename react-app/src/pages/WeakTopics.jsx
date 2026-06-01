import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { useNavigate } from 'react-router-dom';

export default function WeakTopics() {
  const { fetchAuth } = useAuth();
  const navigate = useNavigate();
  const [weakTopics, setWeakTopics] = useState([]);
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [weakRes, recRes] = await Promise.all([
        fetchAuth('/api/user/analysis/weak-topics'),
        fetchAuth('/api/user/analysis/recommendations')
      ]);
      if (!weakRes || !recRes) return;
      const [weakD, recD] = await Promise.all([weakRes.json(), recRes.json()]);
      if (weakD.success) setWeakTopics(weakD.data);
      if (recD.success) setRecs(recD.data);
    } catch (e) {}
    setLoading(false);
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Weak Topic Analyzer</h1>
          <p className="page-sub">Focus your study time where it matters most.</p>
        </div>
        <button className="btn btn-primary" onClick={load}>Refresh</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <div>
          <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚠️ Topics Needing Improvement
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8' }}>(score &lt; 60%)</span>
          </div>
          {weakTopics.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏆</div>
              <h3 style={{ color: '#10b981' }}>No Weak Topics!</h3>
              <p>Take more mock tests to get detailed analysis.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {weakTopics.map(t => {
                const isCritical = t.priority === 'critical';
                return (
                  <div key={t.topic_id} className="weak-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{t.topic_name_english}</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                          {t.subject_name_english} · {t.attempts} attempt{t.attempts > 1 ? 's' : ''}
                        </div>
                      </div>
                      <span className={`badge-${isCritical ? 'danger' : 'warning'}`}>
                        {isCritical ? '🔥 Critical' : '⚠️ Needs Work'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span className={`weak-score-num ${t.priority}`}>{t.avg_score}%</span>
                      <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4 }}>
                        <div className={`weak-score-fill ${t.priority}`} style={{ width: t.avg_score + '%' }} />
                      </div>
                    </div>
                    {t.unmastered_wrong_answers > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#ef4444', marginBottom: 8 }}>
                        {t.unmastered_wrong_answers} unmastered wrong answers
                      </div>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => navigate('/wrong-answers')}>
                      Practice Wrong Answers
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>💡 Study Recommendations</div>
          {recs?.message && (
            <div className="mod-card" style={{ padding: '12px 16px', marginBottom: 12, fontSize: '0.88rem', color: '#475569' }}>
              💡 {recs.message}
            </div>
          )}

          {(recs?.revise_wrong_answers || []).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                Revise These Topics
              </div>
              {recs.revise_wrong_answers.map(t => (
                <div key={t.topic_id} className="rec-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/wrong-answers')}>
                  <div className="rec-icon" style={{ background: '#fee2e2' }}>❌</div>
                  <div className="rec-body">
                    <div className="rec-title">{t.topic_name_english}</div>
                    <div className="rec-sub">{t.subject_name_english} · {t.wrong_count} wrong answers · {t.exam_priority}</div>
                  </div>
                  <span style={{ color: '#94a3b8' }}>→</span>
                </div>
              ))}
            </div>
          )}

          {(recs?.explore_high_priority || []).length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                ⭐ High-Priority Topics to Explore
              </div>
              {recs.explore_high_priority.map(t => (
                <div key={t.topic_id} className="rec-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/courses')}>
                  <div className="rec-icon" style={{ background: '#dbeafe' }}>📖</div>
                  <div className="rec-body">
                    <div className="rec-title">{t.topic_name_english}</div>
                    <div className="rec-sub">{t.subject_name_english} · {t.exam_priority?.toUpperCase()} priority · Not yet studied</div>
                  </div>
                  <span style={{ color: '#94a3b8' }}>→</span>
                </div>
              ))}
            </div>
          )}

          {!recs?.revise_wrong_answers?.length && !recs?.explore_high_priority?.length && (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <h3>Great Progress!</h3>
              <p>Take a mock test to generate personalized recommendations.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mod-card" style={{ padding: '20px 24px', marginTop: 24 }}>
        <div className="mod-card-title">How to Use This Page</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 12 }}>
          {[
            { icon: '🔥', title: 'Critical (below 40%)', desc: 'Study this topic first. Multiple wrong answers signal a knowledge gap.' },
            { icon: '⚠️', title: 'Needs Work (40–60%)', desc: 'Improve with focused revision and re-practice of wrong answers.' },
            { icon: '✅', title: 'Take More Tests', desc: 'No weak topics? Take a mock test to discover new areas to improve.' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: 12 }}>
              <div style={{ fontSize: '1.5rem' }}>{item.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>{item.title}</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
