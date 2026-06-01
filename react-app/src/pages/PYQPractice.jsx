import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.js';

const SCREEN = { SELECT: 'select', TEST: 'test', RESULT: 'result', HISTORY: 'history', REVIEW: 'review' };

// ─── helpers ────────────────────────────────────────────────────────────────
function fmtTime(s) {
  if (!s && s !== 0) return '—';
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}m ${sec}s`;
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function gradeColor(pct) {
  if (pct >= 70) return '#10b981';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

// ─── component ──────────────────────────────────────────────────────────────
export default function PYQPractice() {
  const { fetchAuth } = useAuth();
  const [screen, setScreen] = useState(SCREEN.SELECT);
  const [years, setYears] = useState([]);           // from GET /api/pyq2/years
  const [mediumFilter, setMediumFilter] = useState('all');  // all | tamil | english
  const [loadingYears, setLoadingYears] = useState(true);

  // test state
  const [activeMeta, setActiveMeta] = useState(null);  // { year, medium, label }
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});       // { qId: selectedLabel }
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loadingTest, setLoadingTest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startTimeRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // result state
  const [result, setResult] = useState(null);

  // history state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);

  useEffect(() => { loadYears(); }, []);
  useEffect(() => () => clearInterval(timerRef.current), []);

  async function loadYears() {
    setLoadingYears(true);
    try {
      const res = await fetch('/api/pyq2/years');
      const d = await res.json();
      setYears(d.success ? d.data : []);
    } catch (e) { setYears([]); }
    setLoadingYears(false);
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetchAuth('/api/pyq2/history');
      if (!res) return;
      const d = await res.json();
      setHistory(d.success ? d.data : []);
    } catch (e) { setHistory([]); }
    setLoadingHistory(false);
  }

  async function startTest(year, medium) {
    setLoadingTest(true);
    const effectiveMedium = medium === 'all' ? 'all' : medium;
    try {
      // Create attempt
      const aRes = await fetchAuth('/api/pyq2/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, medium: effectiveMedium })
      });
      if (!aRes) return;
      const aD = await aRes.json();
      if (!aD.success) throw new Error(aD.error || 'Could not start attempt');

      // Load questions filtered by medium
      const params = new URLSearchParams({ year });
      if (effectiveMedium !== 'all') params.set('medium', effectiveMedium);
      const qRes = await fetch(`/api/pyq2/questions?${params}`);
      const qD = await qRes.json();
      if (!qD.success) throw new Error('Failed to load questions');

      const mediumLabel = effectiveMedium === 'tamil' ? 'Tamil' : effectiveMedium === 'english' ? 'English' : 'All';
      setActiveMeta({ year, medium: effectiveMedium, label: `${year} · ${mediumLabel}` });
      setAttemptId(aD.data.attempt_id);
      setQuestions(qD.data);
      setAnswers({});
      setCurrentIdx(0);
      setElapsed(0);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      setScreen(SCREEN.TEST);
    } catch (e) {
      alert(e.message || 'Failed to start test');
    }
    setLoadingTest(false);
  }

  function selectAnswer(qId, label) {
    setAnswers(prev => ({ ...prev, [qId]: label }));
  }

  async function submitTest() {
    if (submitting) return;
    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0) {
      const ok = window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`);
      if (!ok) return;
    }
    clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const res = await fetchAuth(`/api/pyq2/attempts/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, time_taken_seconds: elapsed })
      });
      if (!res) return;
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setResult({ ...d.data, questions });
      setScreen(SCREEN.RESULT);
    } catch (e) {
      alert(e.message || 'Submit failed');
    }
    setSubmitting(false);
  }

  async function openReview(attemptId) {
    setLoadingReview(true);
    setScreen(SCREEN.REVIEW);
    try {
      const res = await fetchAuth(`/api/pyq2/history/${attemptId}`);
      if (!res) return;
      const d = await res.json();
      setReviewData(d.success ? d.data : null);
    } catch (e) { setReviewData(null); }
    setLoadingReview(false);
  }

  // ── derived ────────────────────────────────────────────────────────────────
  const answeredCount = Object.keys(answers).length;
  const totalQ = questions.length;
  const currentQ = questions[currentIdx];

  // ── SCREEN: SELECT ─────────────────────────────────────────────────────────
  if (screen === SCREEN.SELECT) {
    return (
      <div className="page-wrap">
        <div className="page-header">
          <div>
            <h1 className="page-title">PYQ Practice</h1>
            <p className="page-sub">Practise actual TNPSC Previous Year Question Papers — choose year and medium.</p>
          </div>
          <button className="btn" onClick={() => { setScreen(SCREEN.HISTORY); loadHistory(); }}>
            📋 My History
          </button>
        </div>

        {/* Medium filter */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Medium</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['all','All Questions'],['tamil','Tamil Only'],['english','English Only']].map(([v, l]) => (
              <button
                key={v}
                className={`pill-btn${mediumFilter === v ? ' active' : ''}`}
                onClick={() => setMediumFilter(v)}
              >{l}</button>
            ))}
          </div>
        </div>

        {loadingYears ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : years.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No papers available</h3>
            <p>Run the PYQ import to load question papers.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {years.map(p => {
              const qCount = mediumFilter === 'tamil' ? parseInt(p.tamil_count)
                : mediumFilter === 'english' ? parseInt(p.english_count)
                : p.total_count;
              return (
                <div key={p.id} className="mod-card" style={{ padding: '22px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <span className="badge-primary" style={{ fontSize: 13, padding: '4px 12px' }}>{p.year}</span>
                      <div style={{ fontSize: 13, color: '#475569', marginTop: 8 }}>{p.label}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: 22, color: '#7c3aed' }}>{p.total_count}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: 22, color: '#f59e0b' }}>{p.tamil_count}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Tamil</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: 22, color: '#10b981' }}>{p.english_count}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>English</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      <strong style={{ color: '#1e293b', fontSize: 15 }}>{qCount}</strong> questions to practise
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => startTest(p.year, mediumFilter)}
                      disabled={loadingTest || qCount === 0}
                    >
                      {loadingTest ? 'Loading…' : 'Start →'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── SCREEN: TEST ───────────────────────────────────────────────────────────
  if (screen === SCREEN.TEST && currentQ) {
    const progress = Math.round((answeredCount / totalQ) * 100);
    return (
      <div className="page-wrap">
        {/* Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{activeMeta?.label}</span>
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 12 }}>{answeredCount}/{totalQ} answered</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 20, color: '#7c3aed' }}>⏱ {fmtTime(elapsed)}</span>
            <button className="btn btn-primary" onClick={submitTest} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Test'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, marginBottom: 20 }}>
          <div style={{ height: 6, background: '#7c3aed', borderRadius: 4, width: progress + '%', transition: 'width 0.3s' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>
          {/* Question card */}
          <div className="q-card">
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
              Question {currentQ.q_no} of {totalQ}
              {currentQ.difficulty && <span className="badge-warning" style={{ marginLeft: 8 }}>{currentQ.difficulty}</span>}
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', lineHeight: 1.6, marginBottom: 16, whiteSpace: 'pre-line' }}>
              {currentQ.question_text}
            </div>
            <ul className="q-options-list">
              {(currentQ.options || []).map(o => (
                <li key={o.label}>
                  <button
                    className={`q-option-btn${answers[currentQ.id] === o.label ? ' chosen' : ''}`}
                    onClick={() => selectAnswer(currentQ.id, o.label)}
                  >
                    <strong>{o.label})</strong> {o.text}
                  </button>
                </li>
              ))}
            </ul>

            {/* Prev / Next */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-sm" disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}>← Prev</button>
              <button className="btn btn-sm" disabled={currentIdx === totalQ - 1} onClick={() => setCurrentIdx(i => i + 1)}>Next →</button>
            </div>
          </div>

          {/* Question palette */}
          <div className="mod-card" style={{ padding: 16, position: 'sticky', top: 16 }}>
            <div className="mod-card-title">Question Palette</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = i === currentIdx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(i)}
                    style={{
                      aspectRatio: '1', borderRadius: 6, border: '1.5px solid',
                      background: isCurrent ? '#7c3aed' : isAnswered ? '#d1fae5' : '#f8fafc',
                      borderColor: isCurrent ? '#7c3aed' : isAnswered ? '#10b981' : '#e2e8f0',
                      color: isCurrent ? '#fff' : isAnswered ? '#065f46' : '#94a3b8',
                      fontWeight: 700, fontSize: 11, cursor: 'pointer', padding: 0
                    }}
                  >
                    {q.q_no}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, fontSize: 11, color: '#94a3b8', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#d1fae5', border: '1px solid #10b981', display: 'inline-block' }} />
                Answered
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'inline-block' }} />
                Not answered
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SCREEN: RESULT ─────────────────────────────────────────────────────────
  if (screen === SCREEN.RESULT && result) {
    const pct = result.score_percentage || 0;
    const color = gradeColor(pct);
    const grade = pct >= 70 ? 'Excellent' : pct >= 50 ? 'Average' : 'Needs Improvement';

    return (
      <div className="page-wrap">
        <div className="page-header">
          <div><h1 className="page-title">Test Results</h1></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => setScreen(SCREEN.SELECT)}>← Back to Papers</button>
            <button className="btn btn-primary" onClick={() => startTest(activeMeta.year, activeMeta.medium)}>Retry Paper</button>
          </div>
        </div>

        {/* Score hero */}
        <div className="score-display-wrap" style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: '4rem', fontWeight: 900, color, lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: 8, color: '#1e293b' }}>{grade}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: 4 }}>
            {result.correct} correct · {result.wrong} wrong · {result.unanswered} skipped
          </div>
        </div>

        <div className="mod-stats-row" style={{ marginBottom: 20 }}>
          <div className="mod-stat"><span className="mod-stat-num green">{result.correct}</span><span>Correct</span></div>
          <div className="mod-stat"><span className="mod-stat-num red">{result.wrong}</span><span>Wrong</span></div>
          <div className="mod-stat"><span className="mod-stat-num amber">{result.unanswered}</span><span>Skipped</span></div>
          <div className="mod-stat"><span className="mod-stat-num purple">{fmtTime(elapsed)}</span><span>Time Taken</span></div>
        </div>

        {/* Question-by-question review */}
        <div className="mod-card" style={{ padding: '20px 24px' }}>
          <div className="mod-card-title">Answer Review</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
            {(result.questions || []).map((q, i) => {
              const chosen = answers[q.id];
              const isCorrect = chosen === q.correct_option;
              const skipped = !chosen;
              return (
                <div key={q.id} style={{
                  border: `1.5px solid ${skipped ? '#e2e8f0' : isCorrect ? '#6ee7b7' : '#fca5a5'}`,
                  borderRadius: 10, padding: '14px 16px',
                  background: skipped ? '#f8fafc' : isCorrect ? '#f0fdf4' : '#fff5f5'
                }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>Q{q.q_no}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 10, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                    {q.question_text}
                  </div>
                  <ul className="q-options-list">
                    {(q.options || []).map(o => {
                      let bg = 'transparent', border = '#e2e8f0', textColor = '#64748b';
                      if (o.label === q.correct_option) { bg = '#d1fae5'; border = '#10b981'; textColor = '#065f46'; }
                      if (o.label === chosen && !isCorrect) { bg = '#fee2e2'; border = '#ef4444'; textColor = '#991b1b'; }
                      return (
                        <li key={o.label}>
                          <div style={{
                            padding: '7px 12px', borderRadius: 7, border: `1px solid ${border}`,
                            background: bg, color: textColor, fontSize: 13, marginBottom: 4,
                            display: 'flex', alignItems: 'center', gap: 8
                          }}>
                            {o.label === q.correct_option && <span>✅</span>}
                            {o.label === chosen && !isCorrect && <span>❌</span>}
                            <strong>{o.label})</strong> {o.text}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {skipped && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>— Skipped. Correct: <strong>{q.correct_option}</strong></div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── SCREEN: HISTORY ────────────────────────────────────────────────────────
  if (screen === SCREEN.HISTORY) {
    return (
      <div className="page-wrap">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Attempt History</h1>
            <p className="page-sub">All your submitted PYQ practice attempts.</p>
          </div>
          <button className="btn" onClick={() => setScreen(SCREEN.SELECT)}>← Back to Papers</button>
        </div>

        {loadingHistory ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No attempts yet</h3>
            <p>Complete a PYQ practice test to see your history here.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setScreen(SCREEN.SELECT)}>Start Practising</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Paper</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Correct</th>
                  <th>Wrong</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => {
                  const pct = parseFloat(h.score_percentage) || 0;
                  return (
                    <tr key={h.id}>
                      <td>
                        <span className="badge-primary" style={{ marginRight: 6 }}>{h.year}</span>
                        <span className="badge-info">
                          {h.medium_filter === 'tamil' ? 'Tamil' : h.medium_filter === 'english' ? 'English' : 'All'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{fmtDate(h.submitted_at)}</td>
                      <td>
                        <span style={{ fontWeight: 800, fontSize: 15, color: gradeColor(pct) }}>{pct}%</span>
                      </td>
                      <td style={{ color: '#10b981', fontWeight: 700 }}>{h.correct_count}</td>
                      <td style={{ color: '#ef4444', fontWeight: 700 }}>{h.wrong_count}</td>
                      <td style={{ fontSize: 12 }}>{fmtTime(h.time_taken_seconds)}</td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => openReview(h.id)}>
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── SCREEN: REVIEW (historical attempt) ───────────────────────────────────
  if (screen === SCREEN.REVIEW) {
    if (loadingReview) return <div className="spinner-wrap"><div className="spinner" /></div>;
    if (!reviewData) return (
      <div className="page-wrap">
        <button className="btn" onClick={() => setScreen(SCREEN.HISTORY)}>← Back to History</button>
        <div className="empty-state" style={{ marginTop: 32 }}>
          <div className="empty-state-icon">⚠️</div><h3>Could not load review</h3>
        </div>
      </div>
    );

    const { attempt, questions: rQs } = reviewData;
    const pct = parseFloat(attempt.score_percentage) || 0;

    return (
      <div className="page-wrap">
        <div className="page-header">
          <div>
            <h1 className="page-title">Attempt Review</h1>
            <p className="page-sub">{attempt.year} · {attempt.medium_filter === 'tamil' ? 'Tamil' : attempt.medium_filter === 'english' ? 'English' : 'All'} · {fmtDate(attempt.submitted_at)}</p>
          </div>
          <button className="btn" onClick={() => setScreen(SCREEN.HISTORY)}>← Back to History</button>
        </div>

        <div className="mod-stats-row" style={{ marginBottom: 20 }}>
          <div className="mod-stat">
            <span className="mod-stat-num" style={{ color: gradeColor(pct) }}>{pct}%</span><span>Score</span>
          </div>
          <div className="mod-stat"><span className="mod-stat-num green">{attempt.correct_count}</span><span>Correct</span></div>
          <div className="mod-stat"><span className="mod-stat-num red">{attempt.wrong_count}</span><span>Wrong</span></div>
          <div className="mod-stat"><span className="mod-stat-num amber">{attempt.total_questions - attempt.answered_count}</span><span>Skipped</span></div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rQs.map(q => {
            const chosen = q.selected_option;
            const isCorrect = chosen && chosen === q.correct_option;
            const skipped = !chosen;
            return (
              <div key={q.id} style={{
                border: `1.5px solid ${skipped ? '#e2e8f0' : isCorrect ? '#6ee7b7' : '#fca5a5'}`,
                borderRadius: 10, padding: '14px 16px',
                background: skipped ? '#f8fafc' : isCorrect ? '#f0fdf4' : '#fff5f5'
              }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
                  Q{q.q_no}
                  {skipped && <span style={{ marginLeft: 8, color: '#94a3b8' }}>Skipped</span>}
                  {!skipped && isCorrect && <span style={{ marginLeft: 8, color: '#10b981' }}>✅ Correct</span>}
                  {!skipped && !isCorrect && <span style={{ marginLeft: 8, color: '#ef4444' }}>❌ Wrong (You: {chosen}, Answer: {q.correct_option})</span>}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                  {q.question_text}
                </div>
                <ul className="q-options-list" style={{ marginTop: 10 }}>
                  {(q.options || []).map(o => {
                    let bg = 'transparent', border = '#e2e8f0', textColor = '#64748b';
                    if (o.label === q.correct_option) { bg = '#d1fae5'; border = '#10b981'; textColor = '#065f46'; }
                    if (o.label === chosen && !isCorrect) { bg = '#fee2e2'; border = '#ef4444'; textColor = '#991b1b'; }
                    return (
                      <li key={o.label}>
                        <div style={{
                          padding: '6px 12px', borderRadius: 7, border: `1px solid ${border}`,
                          background: bg, color: textColor, fontSize: 13, marginBottom: 3
                        }}>
                          <strong>{o.label})</strong> {o.text}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return <div className="spinner-wrap"><div className="spinner" /></div>;
}
