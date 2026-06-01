import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';

export default function Bookmarks() {
  const { fetchAuth } = useAuth();
  const [tab, setTab] = useState('question');
  const [questions, setQuestions] = useState([]);
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answered, setAnswered] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setAnswered({});
    try {
      const res = await fetchAuth('/api/user/bookmarks');
      if (!res) return;
      const d = await res.json();
      if (d.success) {
        setQuestions(d.data.questions || []);
        setFlashcards(d.data.flashcards || []);
      }
    } catch (e) {}
    setLoading(false);
  }

  async function removeBookmark(bookmarkId) {
    try {
      await fetchAuth('/api/user/bookmarks/' + bookmarkId, { method: 'DELETE' });
      setQuestions(prev => prev.filter(i => i.bookmark_id !== bookmarkId));
      setFlashcards(prev => prev.filter(i => i.bookmark_id !== bookmarkId));
    } catch (e) {}
  }

  function selectOpt(q, label) {
    if (answered[q.bookmark_id]) return;
    const isCorrect = label === q.correct_option;
    setAnswered(prev => ({ ...prev, [q.bookmark_id]: { chosen: label, correct: q.correct_option, isCorrect } }));
  }

  const items = tab === 'question' ? questions : flashcards;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bookmarks</h1>
          <p className="page-sub">Your saved questions and flashcards.</p>
        </div>
      </div>

      <div className="mod-tabs" style={{ marginBottom: 20 }}>
        <button className={`mod-tab-btn${tab === 'question' ? ' active' : ''}`} onClick={() => setTab('question')}>
          Questions {questions.length > 0 && <span className="badge-primary" style={{ marginLeft: 6 }}>{questions.length}</span>}
        </button>
        <button className={`mod-tab-btn${tab === 'flashcard' ? ' active' : ''}`} onClick={() => setTab('flashcard')}>
          Flashcards {flashcards.length > 0 && <span className="badge-primary" style={{ marginLeft: 6 }}>{flashcards.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔖</div>
          <h3>No {tab === 'question' ? 'questions' : 'flashcards'} bookmarked yet</h3>
          <p>While studying topics, tap the bookmark icon to save items here.</p>
        </div>
      ) : tab === 'question' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {questions.map(q => {
            const ans = answered[q.bookmark_id];
            return (
              <div key={q.bookmark_id} className="q-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div className="q-card-meta">
                    <span className="badge-info">{q.subject_name_english}</span>
                    <span className="badge-gray">{q.topic_name_english}</span>
                    {q.difficulty && <span className="badge-warning">{q.difficulty}</span>}
                    {q.year && <span className="badge-gray">{q.year}</span>}
                  </div>
                  <button className="btn btn-sm btn-danger" onClick={() => removeBookmark(q.bookmark_id)}>Remove</button>
                </div>

                {q.question_tamil && (
                  <div style={{ color: '#475569', marginBottom: 6, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {q.question_tamil}
                  </div>
                )}
                <div style={{ fontWeight: 600, marginBottom: 14, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                  {q.question_english}
                </div>

                <ul className="q-options-list">
                  {(q.options || []).map(o => {
                    let cls = 'q-option-btn';
                    if (ans) {
                      if (o.label === ans.correct) cls += ' correct';
                      else if (o.label === ans.chosen && !ans.isCorrect) cls += ' wrong';
                    }
                    return (
                      <li key={o.label}>
                        <button className={cls} disabled={!!ans} onClick={() => selectOpt(q, o.label)}>
                          <strong>{o.label})</strong> {o.text}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {ans && (
                  <div className={`q-feedback-box${ans.isCorrect ? ' correct' : ' wrong'}`} style={{ marginTop: 10 }}>
                    {ans.isCorrect ? '✅ Correct!' : `❌ Wrong. Correct answer: ${ans.correct}`}
                    {q.correct_answer_tamil && !ans.isCorrect && (
                      <div style={{ marginTop: 4, fontWeight: 400, fontSize: 12 }}>{q.correct_answer_tamil}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {flashcards.map(fc => (
            <div key={fc.bookmark_id} className="mod-card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {fc.subject_name_english} · {fc.topic_name_english}
                  </div>
                  <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 8, fontSize: 15 }}>
                    {fc.front_english || fc.front_tamil}
                  </div>
                  <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.6, borderTop: '1px solid #e2e8f0', paddingTop: 8, marginTop: 4 }}>
                    {fc.back_english || fc.back_tamil}
                  </div>
                </div>
                <button className="btn btn-sm btn-danger" onClick={() => removeBookmark(fc.bookmark_id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
