import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';

export default function WrongAnswers() {
  const { fetchAuth } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [filter, setFilter] = useState('all'); // all | unmastered | mastered
  const [loading, setLoading] = useState(true);
  const [answered, setAnswered] = useState({});

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    try {
      let url = '/api/user/wrong-answers';
      if (filter !== 'all') url += '?mastered=' + (filter === 'mastered' ? 1 : 0);
      const res = await fetchAuth(url);
      if (!res) return;
      const d = await res.json();
      setQuestions(d.success ? d.data : []);
    } catch (e) {
      setQuestions([]);
    }
    setLoading(false);
  }

  async function selectOpt(q, label) {
    if (answered[q.id]) return;
    const isCorrect = label === q.correct_option;
    setAnswered(prev => ({ ...prev, [q.id]: { chosen: label, correct: q.correct_option, isCorrect } }));
    if (isCorrect) {
      try {
        await fetchAuth('/api/user/wrong-answers/' + q.question_id + '/master', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }
        });
      } catch (e) {}
    }
  }

  const filteredQ = questions;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Wrong Answer Notebook</h1>
          <p className="page-sub">Review and master questions you previously got wrong.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'unmastered', 'mastered'].map(f => (
          <button
            key={f}
            className={`pill-btn${filter === f ? ' active' : ''}`}
            onClick={() => { setFilter(f); setAnswered({}); }}
          >
            {f === 'all' ? 'All' : f === 'unmastered' ? 'Need Practice' : 'Mastered'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : filteredQ.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">{filter === 'mastered' ? '🏆' : '✅'}</div>
          <h3>{filter === 'mastered' ? 'No mastered questions yet' : filter === 'unmastered' ? 'All caught up!' : 'No wrong answers recorded yet'}</h3>
          <p>
            {filter === 'all'
              ? 'Complete a Mock Test or Topic Exam — questions you get wrong are automatically saved here for practice.'
              : filter === 'unmastered'
              ? 'You have mastered all your wrong answers. Great work!'
              : 'Answer questions correctly in this notebook to mark them as mastered.'}
          </p>
          {filter === 'all' && (
            <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/mock-test" className="btn btn-primary">Take a Mock Test</a>
              <a href="/exam" className="btn">Topic Exam</a>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredQ.map(q => {
            const ans = answered[q.id];
            const opts = q.options || [];
            return (
              <div key={q.id} className="q-card">
                <div className="q-card-meta" style={{ marginBottom: 10 }}>
                  <span className="badge-info">{q.subject_name_english}</span>
                  <span className="badge-gray">{q.topic_name_english}</span>
                  {q.mastered ? <span className="badge-success">Mastered</span> : <span className="badge-danger">Unmastered</span>}
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Wrong {q.attempt_count}x</span>
                </div>
                <div className="q-text" style={{ marginBottom: 12 }}>
                  {q.question_tamil && <div style={{ color: '#475569', marginBottom: 4 }}>{q.question_tamil}</div>}
                  <div style={{ fontWeight: 600 }}>{q.question_english}</div>
                </div>
                <ul className="q-options-list">
                  {opts.map(o => {
                    let cls = 'q-option-btn';
                    if (ans) {
                      if (o.label === ans.correct) cls += ' correct';
                      else if (o.label === ans.chosen && !ans.isCorrect) cls += ' wrong';
                    }
                    return (
                      <li key={o.label}>
                        <button
                          className={cls}
                          disabled={!!ans}
                          onClick={() => selectOpt(q, o.label)}
                        >
                          <strong>{o.label})</strong> {o.text}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {ans && (
                  <div className={`q-feedback-box${ans.isCorrect ? ' correct' : ' wrong'}`}>
                    {ans.isCorrect ? '✅ Correct! Marked as mastered.' : `❌ Incorrect. Correct answer: ${ans.correct}`}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 8 }}>
                  Your last wrong answer: <strong>{q.selected_option}</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
