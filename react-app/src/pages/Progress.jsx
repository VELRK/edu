import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

function Progress() {
  const { fetchAuth } = useAuth();
  const [stats, setStats] = useState(null);
  const [examHistory, setExamHistory] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, examsRes, progressRes] = await Promise.all([
          fetchAuth('/api/user/stats'),
          fetchAuth('/api/exam-attempts'),
          fetchAuth('/api/user/progress'),
        ]);
        if (!statsRes || !examsRes || !progressRes) return;
        if (statsRes.ok) { const d = await statsRes.json(); setStats(d.data); }
        if (examsRes.ok) { const d = await examsRes.json(); setExamHistory(d.data || []); }
        if (progressRes.ok) { const d = await progressRes.json(); setProgressData(d.data || []); }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const overallPct = stats ? Math.round((stats.topics_completed / Math.max(stats.total_topics, 1)) * 100) : 0;

  const avgScore = examHistory.length
    ? Math.round(examHistory.reduce((s, e) => s + e.score, 0) / examHistory.length)
    : 0;

  const completedTopics = progressData.filter(p => p.completed);
  const subjectMap = {};
  progressData.forEach(p => {
    if (!subjectMap[p.subject_id]) subjectMap[p.subject_id] = { name: p.subject_name_english, total: 0, completed: 0 };
    subjectMap[p.subject_id].total++;
    if (p.completed) subjectMap[p.subject_id].completed++;
  });

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>My Progress</h1></div>
        <div className="page-body" style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header"><h1>My Progress</h1></div>
      <div className="page-body">

        {/* Summary Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon purple">📚</div>
            <div><div className="stat-value">{stats?.topics_completed ?? 0}</div><div className="stat-label">Topics Completed</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">📝</div>
            <div><div className="stat-value">{examHistory.length}</div><div className="stat-label">Exams Taken</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">🎯</div>
            <div><div className="stat-value">{avgScore}%</div><div className="stat-label">Average Score</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">📊</div>
            <div><div className="stat-value">{overallPct}%</div><div className="stat-label">Overall Progress</div></div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, marginBottom: 24 }}>
          {/* Circular Progress */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
            <svg width={150} height={150} viewBox="0 0 150 150">
              <circle cx={75} cy={75} r={60} fill="none" stroke="var(--border)" strokeWidth={12} />
              <circle
                cx={75} cy={75} r={60} fill="none"
                stroke={overallPct >= 70 ? 'var(--success)' : overallPct >= 40 ? 'var(--primary)' : 'var(--warning)'}
                strokeWidth={12} strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 60}`}
                strokeDashoffset={`${2 * Math.PI * 60 * (1 - overallPct / 100)}`}
                transform="rotate(-90 75 75)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div style={{ marginTop: -10, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary)' }}>{overallPct}%</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Course Completion</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{stats?.topics_completed} / {stats?.total_topics} topics</div>
            </div>
          </div>

          {/* Subject Progress Bars */}
          <div className="card">
            <div className="card-title">Subject-wise Progress</div>
            {stats?.subject_progress?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {stats.subject_progress.map(sub => {
                  const pct = sub.total_topics > 0 ? Math.round((sub.completed_topics / sub.total_topics) * 100) : 0;
                  const color = pct === 100 ? 'var(--success)' : pct > 60 ? 'var(--primary)' : pct > 30 ? 'var(--info)' : 'var(--warning)';
                  return (
                    <div key={sub.subject_id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{sub.subject_name_english}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          {sub.completed_topics}/{sub.total_topics} <span style={{ color, fontWeight: 600 }}>({pct}%)</span>
                        </span>
                      </div>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state"><div className="empty-state-icon">📖</div><p>Start studying to see your progress here</p></div>
            )}
          </div>
        </div>

        {/* Recently Completed Topics */}
        {completedTopics.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="card-title">Completed Topics ({completedTopics.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {completedTopics.map(t => (
                <span key={t.topic_id} style={{ background: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500, border: '1px solid #6ee7b7' }}>
                  ✓ {t.topic_name_english}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Exam History */}
        <div className="card">
          <div className="card-title">Exam History ({examHistory.length} attempts)</div>
          {examHistory.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Topic</th>
                    <th>Subject</th>
                    <th>Score</th>
                    <th>Correct</th>
                    <th>Time</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {examHistory.map((ex, i) => (
                    <tr key={ex.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{i + 1}</td>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{ex.topic_name_english}</td>
                      <td><span className="badge badge-primary">{ex.subject_name_english}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 50 }}>
                            <div className="progress-bar-wrap" style={{ height: 5 }}>
                              <div className="progress-bar-fill" style={{ width: `${ex.score}%`, background: ex.score >= 70 ? 'var(--success)' : ex.score >= 40 ? 'var(--warning)' : 'var(--danger)', height: 5 }} />
                            </div>
                          </div>
                          <span style={{ fontWeight: 600, color: ex.score >= 70 ? 'var(--success)' : ex.score >= 40 ? 'var(--warning)' : 'var(--danger)' }}>{ex.score}%</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>{ex.correct_answers}/{ex.total_questions}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ex.time_taken}s</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(ex.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <p>No exam attempts yet. Go to PYQ Exam to practice!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Progress;
