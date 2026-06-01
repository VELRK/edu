import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';

export default function SRSReview() {
  const { fetchAuth } = useAuth();
  const [cards, setCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [animating, setAnimating] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchAuth('/api/user/srs/due');
      if (!res) return;
      const d = await res.json();
      if (d.success) {
        const normalize = c => ({
          ...c,
          id: c.flashcard_id,
          front_text: c.front_english || c.front_tamil || '',
          back_text: c.back_english || c.back_tamil || '',
        });
        setCards([...(d.due || []).map(normalize), ...(d.new_cards || []).map(normalize)]);
      } else {
        setCards([]);
      }
    } catch (e) {
      setCards([]);
    }
    setLoading(false);
  }

  async function rate(quality) {
    if (animating) return;
    const card = cards[idx];
    try {
      await fetchAuth('/api/user/srs/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flashcard_id: card.id, quality })
      });
    } catch (e) {}

    const label = quality === 1 ? 'again' : quality === 3 ? 'hard' : quality === 4 ? 'good' : 'easy';
    setStats(prev => ({ ...prev, [label]: prev[label] + 1 }));

    setAnimating(true);
    setTimeout(() => {
      if (idx + 1 >= cards.length) {
        setDone(true);
      } else {
        setIdx(prev => prev + 1);
        setFlipped(false);
      }
      setAnimating(false);
    }, 300);
  }

  if (loading) {
    return (
      <div className="srs-loading">
        <div className="srs-loading-spinner" />
        <p>Loading your cards…</p>
      </div>
    );
  }

  if (done || cards.length === 0) {
    const isEmpty = cards.length === 0;
    const total = stats.again + stats.hard + stats.good + stats.easy;
    const retained = stats.good + stats.easy;
    const retainPct = total > 0 ? Math.round((retained / total) * 100) : 0;

    return (
      <div className="srs-wrap">
        <div className="srs-done-card">
          <div className="srs-done-icon">{isEmpty ? '📭' : '🎉'}</div>
          <h2 className="srs-done-title">
            {isEmpty ? 'All Caught Up!' : 'Session Complete!'}
          </h2>
          <p className="srs-done-sub">
            {isEmpty
              ? 'No cards are due for review right now. Check back later!'
              : `You reviewed ${total} card${total !== 1 ? 's' : ''} · ${retainPct}% retention`}
          </p>

          {done && (
            <div className="srs-result-grid">
              <div className="srs-result-cell again">
                <span className="srs-result-num">{stats.again}</span>
                <span className="srs-result-lbl">Again</span>
              </div>
              <div className="srs-result-cell hard">
                <span className="srs-result-num">{stats.hard}</span>
                <span className="srs-result-lbl">Hard</span>
              </div>
              <div className="srs-result-cell good">
                <span className="srs-result-num">{stats.good}</span>
                <span className="srs-result-lbl">Good</span>
              </div>
              <div className="srs-result-cell easy">
                <span className="srs-result-num">{stats.easy}</span>
                <span className="srs-result-lbl">Easy</span>
              </div>
            </div>
          )}

          <button className="srs-reload-btn" onClick={() => { setDone(false); setIdx(0); setFlipped(false); setStats({ again: 0, hard: 0, good: 0, easy: 0 }); load(); }}>
            {isEmpty ? 'Refresh' : 'Start Over'}
          </button>
        </div>
      </div>
    );
  }

  const card = cards[idx];
  const progress = idx / cards.length;
  const remaining = cards.length - idx;

  return (
    <div className="srs-wrap">
      {/* Header */}
      <div className="srs-header">
        <div className="srs-header-left">
          <h1 className="srs-title">Flashcard Review</h1>
          <p className="srs-subtitle">{remaining} card{remaining !== 1 ? 's' : ''} remaining today</p>
        </div>
        <div className="srs-session-stats">
          <span className="srs-ss again">{stats.again} Again</span>
          <span className="srs-ss good">{stats.good} Good</span>
          <span className="srs-ss easy">{stats.easy} Easy</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="srs-progress-track">
        <div className="srs-progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="srs-progress-label">{idx} / {cards.length} reviewed</div>

      {/* Card */}
      <div className="srs-card-area">
        <div
          className={`srs-scene${animating ? ' srs-exit' : ''}`}
          onClick={() => !animating && setFlipped(f => !f)}
          role="button"
          aria-label={flipped ? 'Hide answer' : 'Reveal answer'}
        >
          <div className={`srs-fc${flipped ? ' flipped' : ''}`}>
            {/* Front */}
            <div className="srs-face srs-front">
              <div className="srs-badge-row">
                {card.subject_name_english && (
                  <span className="srs-badge subject">{card.subject_name_english}</span>
                )}
                {card.topic_name_english && (
                  <span className="srs-badge topic">{card.topic_name_english}</span>
                )}
              </div>
              <div className="srs-question-text">{card.front_text}</div>
              <div className="srs-flip-hint">
                <span className="srs-flip-icon">↕</span> Click to reveal answer
              </div>
            </div>

            {/* Back */}
            <div className="srs-face srs-back">
              <div className="srs-answer-label">Answer</div>
              <div className="srs-answer-text">{card.back_text}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      {!flipped ? (
        <div className="srs-hint-row">
          <div className="srs-hint-icon">👆</div>
          <span>Tap the card to flip it and reveal the answer</span>
        </div>
      ) : (
        <div className="srs-rating-section">
          <p className="srs-rating-label">How well did you remember?</p>
          <div className="srs-rating-row">
            <button className="srs-rate-btn again" onClick={() => rate(1)} disabled={animating}>
              <span className="srs-rate-icon">✕</span>
              <span className="srs-rate-name">Again</span>
              <span className="srs-rate-hint">Forgot</span>
            </button>
            <button className="srs-rate-btn hard" onClick={() => rate(3)} disabled={animating}>
              <span className="srs-rate-icon">~</span>
              <span className="srs-rate-name">Hard</span>
              <span className="srs-rate-hint">Struggled</span>
            </button>
            <button className="srs-rate-btn good" onClick={() => rate(4)} disabled={animating}>
              <span className="srs-rate-icon">✓</span>
              <span className="srs-rate-name">Good</span>
              <span className="srs-rate-hint">Recalled</span>
            </button>
            <button className="srs-rate-btn easy" onClick={() => rate(5)} disabled={animating}>
              <span className="srs-rate-icon">★</span>
              <span className="srs-rate-name">Easy</span>
              <span className="srs-rate-hint">Perfect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
