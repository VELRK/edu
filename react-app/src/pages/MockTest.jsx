import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { apiFetch } from '../lib/api';

const SCREENS = { SETUP: 'setup', TEST: 'test', RESULT: 'result' };

function fmtTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function MockTest() {
  const { fetchAuth } = useAuth();
  const [screen, setScreen] = useState(SCREENS.SETUP);
  const [config, setConfig] = useState({ num_questions: 50, duration_minutes: 60, subject_ids: [] });
  const [subjects, setSubjects] = useState([]);

  const [testId, setTestId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});   // { question_id: label }
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);
  const answersRef = useRef({});  // keep current answers accessible inside timer

  useEffect(() => {
    loadSubjects();
    return () => clearInterval(timerRef.current);
  }, []);

  // keep ref in sync so the timer callback can read latest answers
  useEffect(() => { answersRef.current = answers; }, [answers]);

  async function loadSubjects() {
    try {
      const res = await apiFetch('/api/topics');
      const d = await res.json();
      const subMap = {};
      (d.data || []).forEach(t => { subMap[t.subject_id] = t.subject_english; });
      setSubjects(Object.entries(subMap).map(([id, name]) => ({ id, name })));
    } catch (e) {}
  }

  function toggleSubject(id) {
    setConfig(prev => {
      const ids = prev.subject_ids.includes(id)
        ? prev.subject_ids.filter(s => s !== id)
        : [...prev.subject_ids, id];
      return { ...prev, subject_ids: ids };
    });
  }

  async function startTest() {
    setLoading(true);
    try {
      // Step 1 — generate test (server picks random questions)
      const genRes = await fetchAuth('/api/mock-tests/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_questions: config.num_questions,
          time_limit: config.duration_minutes * 60,
          subject_ids: config.subject_ids.length ? config.subject_ids : undefined
        })
      });
      if (!genRes) return;
      const genD = await genRes.json();
      if (!genD.success) throw new Error(genD.error || 'Failed to generate test');

      // Step 2 — load questions for the new test
      const qRes = await fetchAuth(`/api/mock-tests/${genD.mock_test_id}`);
      const qD = await qRes.json();
      if (!qD.success) throw new Error('Failed to load questions');

      const qs = qD.data.questions || [];
      if (!qs.length) throw new Error('No questions returned. Try different subjects.');

      setTestId(genD.mock_test_id);
      setQuestions(qs);
      setAnswers({});
      answersRef.current = {};
      setCurrent(0);
      const secs = config.duration_minutes * 60;
      setTimeLeft(secs);
      setScreen(SCREENS.TEST);

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            submitTestNow(genD.mock_test_id, answersRef.current, secs);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
      alert(e.message || 'Failed to start test. Make sure there are enough questions.');
    }
    setLoading(false);
  }

  // answers as array of { question_id, selected_option }
  function buildAnswersArray(ansObj) {
    return Object.entries(ansObj).map(([qid, label]) => ({
      question_id: parseInt(qid),
      selected_option: label
    }));
  }

  async function submitTestNow(id, ansObj, timeSecs) {
    clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const res = await fetchAuth(`/api/mock-tests/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: buildAnswersArray(ansObj),
          time_taken: timeSecs
        })
      });
      if (!res) return;
      const d = await res.json();
      if (d.success) {
        setResult(d);
        setScreen(SCREENS.RESULT);
      } else {
        alert(d.error || 'Submit failed');
      }
    } catch (e) {
      alert('Submit failed. Please try again.');
    }
    setSubmitting(false);
  }

  function handleSubmitClick() {
    const unanswered = questions.length - Object.keys(answers).length;
    if (unanswered > 0) {
      const ok = window.confirm(`${unanswered} question(s) unanswered. Submit anyway?`);
      if (!ok) return;
    }
    const elapsed = config.duration_minutes * 60 - timeLeft;
    submitTestNow(testId, answers, elapsed);
  }

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if (screen === SCREENS.SETUP) {
    return (
      <div className="page-wrap">
        <div className="page-header">
          <div>
            <h1 className="page-title">Mock Test</h1>
            <p className="page-sub">Simulate a full TNPSC exam with random questions.</p>
          </div>
        </div>

        <div style={{ maxWidth: 620 }}>
          <div className="mod-card" style={{ padding: 28 }}>
            <div className="mod-card-title" style={{ marginBottom: 22 }}>Configure Your Test</div>

            <div className="mod-form-group">
              <label>Number of Questions</label>
              <input type="number" value={config.num_questions} min={5} max={200}
                onChange={e => setConfig(p => ({ ...p, num_questions: Math.max(5, +e.target.value) }))} />
            </div>

            <div className="mod-form-group">
              <label>Duration (minutes)</label>
              <input type="number" value={config.duration_minutes} min={5} max={180}
                onChange={e => setConfig(p => ({ ...p, duration_minutes: Math.max(5, +e.target.value) }))} />
            </div>

            <div className="mod-form-group">
              <label>
                Subjects
                <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 12, marginLeft: 6 }}>
                  (leave empty for all subjects)
                </span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {subjects.map(s => (
                  <button
                    key={s.id}
                    className={`subj-pill${config.subject_ids.includes(s.id) ? ' active' : ''}`}
                    onClick={() => toggleSubject(s.id)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#475569' }}>
              <strong style={{ color: '#1e293b' }}>{config.num_questions}</strong> questions &nbsp;·&nbsp;
              <strong style={{ color: '#1e293b' }}>{config.duration_minutes} min</strong> &nbsp;·&nbsp;
              {config.subject_ids.length
                ? <span><strong style={{ color: '#7c3aed' }}>{config.subject_ids.length}</strong> subject{config.subject_ids.length !== 1 ? 's' : ''} selected</span>
                : <span>All subjects</span>
              }
            </div>

            <button
              className="btn btn-primary"
              style={{ padding: '12px 32px', fontSize: 15, fontWeight: 700 }}
              onClick={startTest}
              disabled={loading}
            >
              {loading ? 'Generating Test…' : '▶ Start Test'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── TEST ──────────────────────────────────────────────────────────────────
  if (screen === SCREENS.TEST) {
    const q = questions[current];
    const answeredCount = Object.keys(answers).length;
    const total = questions.length;
    const progress = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
    const isWarn = timeLeft <= 300 && timeLeft > 60;
    const isDanger = timeLeft <= 60;

    return (
      <div className="page-wrap" style={{ maxWidth: 960 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>
            Question {current + 1} <span style={{ color: '#94a3b8', fontWeight: 400 }}>of {total}</span>
          </div>
          <div className={`timer-display${isDanger ? ' danger' : isWarn ? ' warn' : ''}`}>
            ⏱ {fmtTime(timeLeft)}
          </div>
          <button className="btn btn-danger" onClick={handleSubmitClick} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Test'}
          </button>
        </div>

        {/* Progress */}
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, marginBottom: 20 }}>
          <div style={{ height: 6, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: 4, width: `${progress}%`, transition: 'width 0.3s' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>
          {/* Question */}
          {q && (
            <div className="q-card">
              <div className="q-card-meta" style={{ marginBottom: 10 }}>
                <span className="badge-info">{q.subject_name_english}</span>
                <span className="badge-gray">{q.topic_name_english}</span>
                {q.difficulty && <span className="badge-warning">{q.difficulty}</span>}
              </div>
              {q.question_tamil && (
                <div style={{ color: '#475569', marginBottom: 6, lineHeight: 1.6, fontSize: 15, whiteSpace: 'pre-line' }}>
                  {q.question_tamil}
                </div>
              )}
              {q.question_english && (
                <div style={{ fontWeight: 600, marginBottom: 16, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                  {q.question_english}
                </div>
              )}
              <ul className="q-options-list">
                {(q.options || []).map(o => (
                  <li key={o.label}>
                    <button
                      className={`q-option-btn${answers[q.question_id] === o.label ? ' chosen' : ''}`}
                      onClick={() => setAnswers(prev => ({ ...prev, [q.question_id]: o.label }))}
                    >
                      <strong>{o.label})</strong> {o.text}
                    </button>
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-sm" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>← Prev</button>
                <button className="btn btn-sm" disabled={current === total - 1} onClick={() => setCurrent(c => c + 1)}>Next →</button>
                {answers[q.question_id] && (
                  <button className="btn btn-sm" style={{ marginLeft: 'auto', color: '#94a3b8' }}
                    onClick={() => setAnswers(prev => { const n = { ...prev }; delete n[q.question_id]; return n; })}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Palette */}
          <div className="mod-card" style={{ padding: 16, position: 'sticky', top: 16 }}>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {answeredCount} / {total} answered
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5 }}>
              {questions.map((qq, i) => {
                const isAns = !!answers[qq.question_id];
                const isCur = i === current;
                return (
                  <button
                    key={qq.question_id}
                    onClick={() => setCurrent(i)}
                    style={{
                      aspectRatio: '1', borderRadius: 6, border: '1.5px solid',
                      background: isCur ? '#7c3aed' : isAns ? '#d1fae5' : '#f8fafc',
                      borderColor: isCur ? '#7c3aed' : isAns ? '#10b981' : '#e2e8f0',
                      color: isCur ? '#fff' : isAns ? '#065f46' : '#94a3b8',
                      fontWeight: 700, fontSize: 11, cursor: 'pointer', padding: 0, fontFamily: 'inherit'
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-sm" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>← Prev</button>
              <button className="btn btn-sm" disabled={current === total - 1} onClick={() => setCurrent(c => c + 1)}>Next →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (screen === SCREENS.RESULT && result) {
    const pct = result.score || 0;
    const grade = pct >= 70 ? 'Excellent' : pct >= 50 ? 'Good' : pct >= 35 ? 'Average' : 'Needs Practice';
    const gradeColor = pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : pct >= 35 ? '#f97316' : '#ef4444';
    const wrong = result.total_questions - result.correct_answers;

    return (
      <div className="page-wrap">
        <div className="page-header">
          <div><h1 className="page-title">Test Results</h1></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={() => { setScreen(SCREENS.SETUP); setResult(null); }}>New Test</button>
            <button className="btn btn-primary" onClick={() => window.location.href = '/wrong-answers'}>
              Practice Wrong Answers
            </button>
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)',
          borderRadius: 16, padding: '36px 24px', textAlign: 'center', marginBottom: 24
        }}>
          <div style={{ fontSize: '4.5rem', fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1e293b', marginTop: 8 }}>{grade}</div>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            {result.correct_answers} correct · {wrong} wrong out of {result.total_questions} questions
          </div>
        </div>

        <div className="mod-stats-row">
          <div className="mod-stat">
            <span className="mod-stat-num green">{result.correct_answers}</span>
            <div className="mod-stat-lbl">Correct</div>
          </div>
          <div className="mod-stat">
            <span className="mod-stat-num red">{wrong}</span>
            <div className="mod-stat-lbl">Wrong</div>
          </div>
          <div className="mod-stat">
            <span className="mod-stat-num amber">{result.total_questions - result.correct_answers - wrong || 0}</span>
            <div className="mod-stat-lbl">Skipped</div>
          </div>
          <div className="mod-stat">
            <span className="mod-stat-num purple">{result.total_questions}</span>
            <div className="mod-stat-lbl">Total</div>
          </div>
        </div>

        <div style={{ marginTop: 20, padding: '14px 18px', background: '#f0fdf4', border: '1px solid #6ee7b7', borderRadius: 10, fontSize: 13, color: '#065f46' }}>
          ✅ Wrong answers from this test have been automatically saved to your <strong>Wrong Answer Notebook</strong>.
        </div>
      </div>
    );
  }

  return <div className="spinner-wrap"><div className="spinner" /></div>;
}
