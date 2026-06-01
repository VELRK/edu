import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { apiFetch } from '../lib/api';

function Dashboard() {
  const { fetchAuth } = useAuth();
  const [stats, setStats] = useState(null);
  const [examHistory, setExamHistory] = useState([]);
  const [platformCounts, setPlatformCounts] = useState(null);
  const [loading, setLoading] = useState(true);

  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  const userName = user?.name || 'Student';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, examsRes, countsRes] = await Promise.all([
          fetchAuth('/api/user/stats'),
          fetchAuth('/api/exam-attempts'),
          apiFetch('/api/dashboard/counts'),
        ]);
        if (!statsRes || !examsRes) return;
        if (statsRes.ok) {
          const d = await statsRes.json();
          setStats(d.data);
        }
        if (examsRes.ok) {
          const d = await examsRes.json();
          setExamHistory((d.data || []).slice(0, 5));
        }
        if (countsRes.ok) {
          const d = await countsRes.json();
          if (d.success) setPlatformCounts(d.data.totals);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const overallPct = stats ? Math.round((stats.topics_completed / Math.max(stats.total_topics, 1)) * 100) : 0;

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Dashboard</h1></div>
        <div className="page-body" style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{greeting}, {userName}! 👋</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Here's your study summary</p>
        </div>
        <Link to="/exam" className="btn btn-primary">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Practice Now
        </Link>
      </div>

      <div className="page-body">
        {/* Platform overview banner */}
        {platformCounts && (
          <div className="platform-banner">
            <div className="platform-banner-label">Platform Content Available</div>
            <div className="platform-banner-stats">
              {[
                { n: platformCounts.topics, l: 'Topics' },
                { n: platformCounts.questions, l: 'Questions' },
                { n: platformCounts.flashcards, l: 'Flashcards' },
                { n: platformCounts.memory_tricks, l: 'Memory Tricks' },
                { n: platformCounts.bullet_points, l: 'Bullet Points' },
                { n: platformCounts.vs_comparisons, l: 'Comparisons' },
              ].map(({ n, l }) => (
                <div key={l} className="platform-stat">
                  <span className="platform-stat-n">{n}</span>
                  <span className="platform-stat-l">{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon purple">📚</div>
            <div>
              <div className="stat-value">{stats?.topics_completed ?? 0}</div>
              <div className="stat-label">Topics Completed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">✅</div>
            <div>
              <div className="stat-value">{stats?.total_topics ?? 0}</div>
              <div className="stat-label">Total Topics</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">📝</div>
            <div>
              <div className="stat-value">{stats?.exams_taken ?? 0}</div>
              <div className="stat-label">Exams Taken</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">🏆</div>
            <div>
              <div className="stat-value">{stats?.avg_score ?? 0}%</div>
              <div className="stat-label">Avg Score</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Overall Progress */}
          <div className="card">
            <div className="card-title">Overall Progress</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <svg width={90} height={90} viewBox="0 0 90 90">
                  <circle cx={45} cy={45} r={38} fill="none" stroke="var(--border)" strokeWidth={8} />
                  <circle
                    cx={45} cy={45} r={38} fill="none"
                    stroke="var(--primary)" strokeWidth={8}
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 38}`}
                    strokeDashoffset={`${2 * Math.PI * 38 * (1 - overallPct / 100)}`}
                    transform="rotate(-90 45 45)"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{overallPct}%</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 6 }}>
                  You've completed <strong style={{ color: 'var(--text)' }}>{stats?.topics_completed}</strong> out of <strong style={{ color: 'var(--text)' }}>{stats?.total_topics}</strong> topics
                </p>
                <Link to="/courses" className="btn btn-outline btn-sm">Browse Courses →</Link>
              </div>
            </div>
          </div>

          {/* Subject Progress */}
          <div className="card">
            <div className="card-title">Subject Progress</div>
            {stats?.subject_progress?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.subject_progress.map((sub) => {
                  const pct = sub.total_topics > 0 ? Math.round((sub.completed_topics / sub.total_topics) * 100) : 0;
                  return (
                    <div key={sub.subject_id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500, color: 'var(--text)' }}>{sub.subject_name_english}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{sub.completed_topics}/{sub.total_topics}</span>
                      </div>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--success)' : pct > 50 ? 'var(--primary)' : 'var(--warning)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📖</div>
                <p>Start studying to see your progress</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Exam History */}
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Recent Exam Attempts</div>
            <Link to="/progress" className="btn btn-outline btn-sm">View All</Link>
          </div>
          {examHistory.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Subject</th>
                    <th>Score</th>
                    <th>Correct</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {examHistory.map((ex) => (
                    <tr key={ex.id}>
                      <td style={{ fontWeight: 500 }}>{ex.topic_name_english}</td>
                      <td><span className="badge badge-primary">{ex.subject_name_english}</span></td>
                      <td>
                        <span style={{ color: ex.score >= 70 ? 'var(--success)' : ex.score >= 40 ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }}>
                          {ex.score}%
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{ex.correct_answers}/{ex.total_questions}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(ex.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <p>No exam attempts yet. <Link to="/exam">Take your first exam!</Link></p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20 }}>
          <Link to="/courses" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center', cursor: 'pointer', transition: 'box-shadow 0.15s', hover: 'shadow' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📚</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Study Courses</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Browse all topics</div>
            </div>
          </Link>
          <Link to="/exam" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✍️</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>PYQ Practice</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Previous year questions</div>
            </div>
          </Link>
          <Link to="/progress" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>My Progress</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Track your growth</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
