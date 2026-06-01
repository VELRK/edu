import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { apiFetch } from '../lib/api';

const SCREEN = { SETUP: 'setup', EXAM: 'exam', RESULT: 'result' };

function fmtTime(s) {
  if (!s && s !== 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PYQExam() {
  const { fetchAuth } = useAuth();

  // setup state
  const [subjects, setSubjects] = useState([]);
  const [topicsBySubject, setTopicsBySubject] = useState({});  // { subjectId: [{...}] }
  const [selectedTopics, setSelectedTopics] = useState(new Set());
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [starting, setStarting] = useState(false);

  // exam state
  const [screen, setScreen] = useState(SCREEN.SETUP);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  // result state
  const [result, setResult] = useState(null);  // { score, total, correct, wrong, skipped, details }

  useEffect(() => {
    loadSubjects();
    return () => clearInterval(timerRef.current);
  }, []);

  async function loadSubjects() {
    setLoadingSubjects(true);
    try {
      const res = await fetchAuth('/api/subjects');
      if (!res) return;
      const d = await res.json();
      const subs = d.data || [];
      setSubjects(subs);
      // Load all topics for all subjects in parallel
      setLoadingTopics(true);
      const results = await Promise.all(
        subs.map(s => fetchAuth(`/api/subjects/${s.subject_id}/topics`)
          .then(r => r ? r.json() : { data: [] }).then(d => ({ subjectId: s.subject_id, topics: d.data || [] }))
          .catch(() => ({ subjectId: s.subject_id, topics: [] })))
      );
      const map = {};
      results.forEach(({ subjectId, topics }) => { map[subjectId] = topics; });
      setTopicsBySubject(map);
      setLoadingTopics(false);
    } catch (e) { }
    setLoadingSubjects(false);
  }

  // All topics flat list for current filter
  const allTopics = subjects.flatMap(s => (topicsBySubject[s.subject_id] || []).map(t => ({ ...t, subject: s })));
  const visibleTopics = subjectFilter === 'all' ? allTopics : allTopics.filter(t => String(t.subject_id) === subjectFilter);

  function toggleTopic(topicId) {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      next.has(topicId) ? next.delete(topicId) : next.add(topicId);
      return next;
    });
  }

  function selectAll() {
    setSelectedTopics(new Set(visibleTopics.map(t => t.topic_id)));
  }

  function deselectAll() {
    if (subjectFilter === 'all') {
      setSelectedTopics(new Set());
    } else {
      setSelectedTopics(prev => {
        const next = new Set(prev);
        visibleTopics.forEach(t => next.delete(t.topic_id));
        return next;
      });
    }
  }

  async function startExam() {
    if (selectedTopics.size === 0) return;
    setStarting(true);
    try {
      const topicIds = [...selectedTopics];
      const fetches = topicIds.map(id =>
        apiFetch(`/api/topics/${id}/questions`)
          .then(r => r.json())
          .then(d => {
            const topicInfo = allTopics.find(t => t.topic_id === id);
            return (d.data || []).map(q => ({
              ...q,
              _uid: `${id}_${q.id}`,
              _topicId: id,
              _topicName: topicInfo?.topic_name_english || `Topic ${id}`,
              _subjectName: topicInfo?.subject?.subject_name_english || ''
            }));
          })
          .catch(() => [])
      );
      const nested = await Promise.all(fetches);
      const combined = shuffle(nested.flat());
      if (combined.length === 0) {
        alert('No questions found for the selected topics. Please select different topics.');
        setStarting(false);
        return;
      }
      setQuestions(combined);
      setAnswers({});
      setCurrentIdx(0);
      setElapsed(0);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      setScreen(SCREEN.EXAM);
    } catch (e) {
      alert('Failed to load questions.');
    }
    setStarting(false);
  }

  async function submitExam(force = false) {
    const unanswered = questions.length - Object.keys(answers).length;
    if (!force && unanswered > 0) {
      const ok = window.confirm(`${unanswered} question(s) unanswered. Submit anyway?`);
      if (!ok) return;
    }
    clearInterval(timerRef.current);
    setSubmitting(true);

    let correct = 0, wrong = 0, skipped = 0;
    const details = questions.map(q => {
      const chosen = answers[q._uid];
      if (!chosen) { skipped++; return { ...q, chosen: null, isCorrect: false, skipped: true }; }
      const isCorrect = chosen === q.correct_option;
      isCorrect ? correct++ : wrong++;
      return { ...q, chosen, isCorrect, skipped: false };
    });

    // Save wrong answers silently
    const wrongOnes = details.filter(d => !d.isCorrect && !d.skipped && d.db_id);
    Promise.all(wrongOnes.map(q =>
      fetchAuth('/api/user/wrong-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: q.db_id, selected_option: q.chosen })
      }).catch(() => {})
    ));

    const score = Math.round((correct / questions.length) * 100);
    setResult({ score, total: questions.length, correct, wrong, skipped, timeTaken: elapsed, details });
    setScreen(SCREEN.RESULT);
    setSubmitting(false);
  }

  // ── SETUP ────────────────────────────────────────────────────────────────
  if (screen === SCREEN.SETUP) {
    const selectedInView = visibleTopics.filter(t => selectedTopics.has(t.topic_id)).length;

    return (
      <div className="page-wrap" style={{ paddingBottom: 100 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Topic Exam</h1>
            <p className="page-sub">Select one or more topics, then start the exam.</p>
          </div>
          {selectedTopics.size > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#7c3aed', fontWeight: 700 }}>
                {selectedTopics.size} topic{selectedTopics.size !== 1 ? 's' : ''} selected
              </span>
              <button className="btn btn-primary" onClick={startExam} disabled={starting}>
                {starting ? 'Loading…' : 'Start Exam →'}
              </button>
            </div>
          )}
        </div>

        {/* Subject filter */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Filter by Subject</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className={`pill-btn${subjectFilter === 'all' ? ' active' : ''}`} onClick={() => setSubjectFilter('all')}>
              All Subjects
            </button>
            {subjects.map(s => (
              <button
                key={s.subject_id}
                className={`pill-btn${subjectFilter === String(s.subject_id) ? ' active' : ''}`}
                onClick={() => setSubjectFilter(String(s.subject_id))}
              >
                {s.subject_name_english}
              </button>
            ))}
          </div>
        </div>

        {/* Select / Deselect row */}
        {!loadingTopics && visibleTopics.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
            <button className="btn btn-sm" onClick={selectAll}>
              ✓ Select All ({visibleTopics.length})
            </button>
            {selectedInView > 0 && (
              <button className="btn btn-sm" onClick={deselectAll}>
                ✕ Deselect ({selectedInView})
              </button>
            )}
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4 }}>
              {selectedTopics.size} total selected
            </span>
          </div>
        )}

        {/* Topics grid */}
        {loadingSubjects || loadingTopics ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : visibleTopics.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No topics found</h3>
          </div>
        ) : (
          <div className="exam-topic-grid">
            {visibleTopics.map(t => {
              const checked = selectedTopics.has(t.topic_id);
              return (
                <button
                  key={t.topic_id}
                  className={`exam-topic-card${checked ? ' selected' : ''}`}
                  onClick={() => toggleTopic(t.topic_id)}
                >
                  <div className="exam-topic-check">{checked ? '✓' : ''}</div>
                  <div className="exam-topic-body">
                    <div className="exam-topic-name">{t.topic_name_english}</div>
                    {t.topic_name_tamil && (
                      <div className="exam-topic-name-tamil">{t.topic_name_tamil}</div>
                    )}
                    <div className="exam-topic-meta">
                      <span className="exam-topic-subject">{t.subject?.subject_name_english}</span>
                      {t.exam_priority && (
                        <span className={`exam-prio-badge ${t.exam_priority}`}>{t.exam_priority}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Sticky bottom bar */}
        {selectedTopics.size > 0 && (
          <div className="exam-start-bar">
            <div style={{ fontWeight: 700, color: '#1e293b' }}>
              {selectedTopics.size} topic{selectedTopics.size !== 1 ? 's' : ''} selected
            </div>
            <button className="btn btn-primary" style={{ padding: '10px 28px', fontSize: 14 }} onClick={startExam} disabled={starting}>
              {starting ? 'Loading questions…' : 'Start Exam →'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── EXAM ─────────────────────────────────────────────────────────────────
  if (screen === SCREEN.EXAM) {
    const currentQ = questions[currentIdx];
    const answeredCount = Object.keys(answers).length;
    const progress = Math.round((answeredCount / questions.length) * 100);

    return (
      <div className="page-wrap" style={{ maxWidth: 900 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>Topic Exam</span>
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 12 }}>{answeredCount}/{questions.length} answered</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 18, color: '#7c3aed', background: '#ede9fe', padding: '4px 12px', borderRadius: 8 }}>
              ⏱ {fmtTime(elapsed)}
            </span>
            <button className="btn btn-danger" onClick={() => submitExam(false)} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Progress */}
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, marginBottom: 20 }}>
          <div style={{ height: 6, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: 4, width: `${progress}%`, transition: 'width 0.3s' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 18, alignItems: 'start' }}>
          {/* Question card */}
          <div className="q-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Q{currentIdx + 1} of {questions.length}
                {currentQ.difficulty && <span className="badge-warning" style={{ marginLeft: 8 }}>{currentQ.difficulty}</span>}
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {currentQ._subjectName && <span className="exam-tag">{currentQ._subjectName}</span>}
                {currentQ._topicName && <span className="exam-tag topic">{currentQ._topicName}</span>}
              </div>
            </div>

            {currentQ.question_tamil && (
              <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', lineHeight: 1.7, marginBottom: 6, whiteSpace: 'pre-line' }}>
                {currentQ.question_tamil}
              </div>
            )}
            {currentQ.question_english && (
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginBottom: 14, whiteSpace: 'pre-line' }}>
                {currentQ.question_english}
              </div>
            )}

            <ul className="q-options-list">
              {(currentQ.option_details || []).map(o => (
                <li key={o.label}>
                  <button
                    className={`q-option-btn${answers[currentQ._uid] === o.label ? ' chosen' : ''}`}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQ._uid]: o.label }))}
                  >
                    <strong style={{ minWidth: 18, display: 'inline-block' }}>{o.label})</strong> {o.text}
                  </button>
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-sm" disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}>← Prev</button>
              <button className="btn btn-sm" disabled={currentIdx === questions.length - 1} onClick={() => setCurrentIdx(i => i + 1)}>Next →</button>
              {answers[currentQ._uid] && (
                <button className="btn btn-sm" style={{ marginLeft: 'auto', color: '#94a3b8' }}
                  onClick={() => setAnswers(prev => { const n = { ...prev }; delete n[currentQ._uid]; return n; })}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Palette */}
          <div className="mod-card" style={{ padding: 14, position: 'sticky', top: 16 }}>
            <div className="mod-card-title" style={{ marginBottom: 10 }}>Question Palette</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5 }}>
              {questions.map((q, i) => {
                const isAns = !!answers[q._uid];
                const isCur = i === currentIdx;
                return (
                  <button
                    key={q._uid}
                    onClick={() => setCurrentIdx(i)}
                    style={{
                      aspectRatio: '1', borderRadius: 6, border: '1.5px solid',
                      background: isCur ? '#7c3aed' : isAns ? '#d1fae5' : '#f8fafc',
                      borderColor: isCur ? '#7c3aed' : isAns ? '#10b981' : '#e2e8f0',
                      color: isCur ? '#fff' : isAns ? '#065f46' : '#94a3b8',
                      fontWeight: 700, fontSize: 11, cursor: 'pointer', padding: 0,
                      fontFamily: 'inherit'
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#d1fae5', border: '1px solid #10b981', display: 'inline-block' }} />
                Answered ({answeredCount})
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'inline-block' }} />
                Not answered ({questions.length - answeredCount})
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────────────────
  if (screen === SCREEN.RESULT && result) {
    const { score, total, correct, wrong, skipped, timeTaken, details } = result;
    const grade = score >= 70 ? 'Excellent' : score >= 50 ? 'Good' : score >= 35 ? 'Average' : 'Needs Practice';
    const gradeColor = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : score >= 35 ? '#f97316' : '#ef4444';

    return (
      <div className="page-wrap">
        <div className="page-header">
          <div><h1 className="page-title">Exam Results</h1></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={() => { setScreen(SCREEN.SETUP); setResult(null); }}>← New Exam</button>
            <button className="btn btn-primary" onClick={() => {
              setAnswers({}); setCurrentIdx(0); setElapsed(0);
              startTimeRef.current = Date.now();
              timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
              setScreen(SCREEN.EXAM);
            }}>Retry Same Topics</button>
          </div>
        </div>

        {/* Score hero */}
        <div style={{
          background: 'linear-gradient(135deg, #ede9fe, #e0e7ff)',
          borderRadius: 16, padding: '32px 24px', textAlign: 'center', marginBottom: 20
        }}>
          <div style={{ fontSize: '4.5rem', fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{score}%</div>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#1e293b', marginTop: 8 }}>{grade}</div>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            {correct} correct · {wrong} wrong · {skipped} skipped · {fmtTime(timeTaken)} taken
          </div>
        </div>

        <div className="mod-stats-row" style={{ marginBottom: 20 }}>
          <div className="mod-stat"><span className="mod-stat-num green">{correct}</span><div className="mod-stat-lbl">Correct</div></div>
          <div className="mod-stat"><span className="mod-stat-num red">{wrong}</span><div className="mod-stat-lbl">Wrong</div></div>
          <div className="mod-stat"><span className="mod-stat-num amber">{skipped}</span><div className="mod-stat-lbl">Skipped</div></div>
          <div className="mod-stat"><span className="mod-stat-num purple">{total}</span><div className="mod-stat-lbl">Total</div></div>
        </div>

        {/* Per-question review */}
        <div className="mod-card" style={{ padding: '20px 24px' }}>
          <div className="mod-card-title">Answer Review</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            {details.map((q, i) => {
              const borderColor = q.skipped ? '#e2e8f0' : q.isCorrect ? '#6ee7b7' : '#fca5a5';
              const bg = q.skipped ? '#f8fafc' : q.isCorrect ? '#f0fdf4' : '#fff5f5';
              return (
                <div key={q._uid} style={{ border: `1.5px solid ${borderColor}`, borderRadius: 10, padding: '14px 16px', background: bg }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span>Q{i + 1}</span>
                    <span className="exam-tag">{q._topicName}</span>
                    {q.skipped && <span style={{ color: '#f59e0b', fontWeight: 700 }}>Skipped</span>}
                    {!q.skipped && q.isCorrect && <span style={{ color: '#10b981', fontWeight: 700 }}>✅ Correct</span>}
                    {!q.skipped && !q.isCorrect && <span style={{ color: '#ef4444', fontWeight: 700 }}>❌ Wrong</span>}
                  </div>
                  {q.question_tamil && (
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', lineHeight: 1.6, marginBottom: 4, whiteSpace: 'pre-line' }}>
                      {q.question_tamil}
                    </div>
                  )}
                  {q.question_english && (
                    <div style={{ fontSize: 12, color: '#475569', marginBottom: 10, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {q.question_english}
                    </div>
                  )}
                  <ul className="q-options-list">
                    {(q.option_details || []).map(o => {
                      let bg2 = 'transparent', bc = '#e2e8f0', tc = '#64748b';
                      if (o.label === q.correct_option) { bg2 = '#d1fae5'; bc = '#10b981'; tc = '#065f46'; }
                      if (o.label === q.chosen && !q.isCorrect) { bg2 = '#fee2e2'; bc = '#ef4444'; tc = '#991b1b'; }
                      return (
                        <li key={o.label}>
                          <div style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${bc}`, background: bg2, color: tc, fontSize: 13, marginBottom: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                            {o.label === q.correct_option && <span>✅</span>}
                            {o.label === q.chosen && !q.isCorrect && <span>❌</span>}
                            <strong>{o.label})</strong> {o.text}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {q.skipped && (
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                      Correct answer: <strong style={{ color: '#10b981' }}>{q.correct_option}</strong>
                      {q.correct_answer_tamil && ` — ${q.correct_answer_tamil}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return <div className="spinner-wrap"><div className="spinner" /></div>;
}
