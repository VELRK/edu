import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { apiFetch } from '../lib/api';

function FlashCards({ cards }) {
  const [flipped, setFlipped] = useState({});

  const toggle = (i) => setFlipped(prev => ({ ...prev, [i]: !prev[i] }));
  const flipAll   = () => setFlipped(Object.fromEntries(cards.map((_, i) => [i, true])));
  const resetAll  = () => setFlipped({});

  if (!cards.length) return (
    <div className="empty-state"><div className="empty-state-icon">🃏</div><p>No flashcards available</p></div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {cards.length} cards · <span style={{ color: 'var(--primary)' }}>tap any card to flip</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={flipAll}  className="btn btn-outline btn-sm">Show All English</button>
          <button onClick={resetAll} className="btn btn-outline btn-sm">Reset All</button>
        </div>
      </div>

      {/* Grid of all cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16,
      }}>
        {cards.map((card, i) => (
          <div key={i} style={{ perspective: 800, height: 160 }} onClick={() => toggle(i)}>
            <div style={{
              width: '100%', height: '100%', position: 'relative',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.45s ease',
              transform: flipped[i] ? 'rotateY(180deg)' : 'rotateY(0deg)',
              cursor: 'pointer',
            }}>
              {/* Front — Tamil */}
              <div style={{
                position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                boxShadow: '0 4px 12px rgba(124,58,237,0.25)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  தமிழ் · Card {i + 1}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: '#fff', fontWeight: 500 }}>{card.front}</div>
                {card.cardType ? (
                  <div style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 8px', alignSelf: 'flex-start', color: '#fff' }}>
                    {card.cardType}
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>tap to flip →</div>
                )}
              </div>

              {/* Back — Tamil answer + English */}
              <div style={{
                position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                background: '#fff',
                border: '2px solid var(--primary)',
                boxShadow: '0 4px 12px rgba(124,58,237,0.15)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  விடை · Card {i + 1}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '6px 0' }}>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text)', fontWeight: 500 }}>{card.back}</div>
                  {card.backEnglish && (
                    <div style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--text-muted)' }}>{card.backEnglish}</div>
                  )}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>← tap to flip back</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Mobile uses a drill-down: subjects → topics → detail
   Desktop keeps the 3-panel side-by-side layout */

function BackBtn({ onClick, label }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
      background: 'none', border: '1px solid var(--border)', borderRadius: 8,
      fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 12,
    }}>
      ← {label}
    </button>
  );
}

function Courses() {
  const { fetchAuth } = useAuth();
  const [subjects, setSubjects]         = useState([]);
  const [topics, setTopics]             = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTopic, setSelectedTopic]     = useState(null);
  const [topicDetail, setTopicDetail]   = useState(null);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading]           = useState(true);
  const [topicLoading, setTopicLoading] = useState(false);
  const [loadedSubjects, setLoadedSubjects] = useState(new Set());
  const [activeTab, setActiveTab]       = useState('summary');
  const [error, setError]               = useState('');
  // mobile drill-down: 'subjects' | 'topics' | 'detail'
  const [mobileView, setMobileView]     = useState('subjects');

  const isMobile = () => window.innerWidth < 768;

  // ── Load subjects + progress ──────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [subRes, progRes] = await Promise.all([
          fetchAuth('/api/subjects'),
          fetchAuth('/api/user/progress'),
        ]);
        if (!subRes || !progRes) return;
        if (!subRes.ok) {
          const d = await subRes.json().catch(() => ({}));
          setError(d.error || `Failed to load subjects (${subRes.status})`);
        } else {
          const d = await subRes.json();
          const subs = d.data || [];
          setSubjects(subs);
          const preferred = subs.find(s => s.subject_id === 'general_science') || subs[0];
          if (preferred) setSelectedSubject(preferred.subject_id);
        }
        if (progRes.ok) {
          const d = await progRes.json();
          const map = {};
          (d.data || []).forEach(p => { map[p.topic_id] = p.completed; });
          setUserProgress(map);
        }
      } catch (e) {
        setError('Network error loading subjects');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line

  // ── Load topics when subject changes ─────────────────────
  useEffect(() => {
    if (!selectedSubject || topics[selectedSubject]) return;
    const loadTopics = async () => {
      try {
        const res = await fetchAuth(`/api/subjects/${selectedSubject}/topics`);
        const d = res.ok ? await res.json() : { data: [] };
        setTopics(prev => ({ ...prev, [selectedSubject]: d.data || [] }));
        setLoadedSubjects(prev => new Set([...prev, selectedSubject]));
      } catch (e) {
        console.error(e);
        setTopics(prev => ({ ...prev, [selectedSubject]: [] }));
        setLoadedSubjects(prev => new Set([...prev, selectedSubject]));
      }
    };
    loadTopics();
  }, [selectedSubject]); // eslint-disable-line

  // ── Handlers ─────────────────────────────────────────────
  const selectSubject = (subjectId) => {
    setSelectedSubject(subjectId);
    setSelectedTopic(null);
    setTopicDetail(null);
    if (isMobile()) setMobileView('topics');
  };

  const openTopic = async (topicId) => {
    setSelectedTopic(topicId);
    setTopicDetail(null);
    setActiveTab('summary');
    setTopicLoading(true);
    if (isMobile()) setMobileView('detail');
    try {
      const res = await apiFetch(`/api/topics/${topicId}`);
      if (res.ok) {
        const d = await res.json();
        setTopicDetail(d.data);
      }
    } catch (e) { console.error(e); }
    finally { setTopicLoading(false); }
  };

  const toggleProgress = async (topicId) => {
    const newVal = !userProgress[topicId];
    setUserProgress(prev => ({ ...prev, [topicId]: newVal ? 1 : 0 }));
    try {
      await fetchAuth('/api/user/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId, completed: newVal }),
      });
    } catch (e) { console.error(e); }
  };

  const priorityBadge = (p) => {
    const cls = p?.toLowerCase() === 'high' ? 'badge-high'
              : p?.toLowerCase() === 'medium' ? 'badge-medium' : 'badge-low';
    return <span className={`badge ${cls}`}>{p || 'N/A'}</span>;
  };

  const currentTopics  = selectedSubject ? (topics[selectedSubject] || []) : [];
  const currentSubject = subjects.find(s => s.subject_id === selectedSubject);

  // ── Loading / Error states ────────────────────────────────
  if (loading) return (
    <div>
      <div className="page-header"><h1>Courses</h1></div>
      <div className="page-body" style={{ display:'flex', justifyContent:'center', paddingTop:48 }}>
        <div className="spinner" />
      </div>
    </div>
  );

  if (error) return (
    <div>
      <div className="page-header"><h1>Courses</h1></div>
      <div className="page-body"><div className="alert-error">{error}</div></div>
    </div>
  );

  // ── Sub-components ───────────────────────────────────────

  const SubjectPanel = ({ mobile }) => (
    <div style={{
      width: mobile ? '100%' : 200,
      flexShrink: 0,
      background: '#fff',
      borderRight: mobile ? 'none' : '1px solid var(--border)',
      overflowY: 'auto',
      padding: '12px 0',
      display: mobile ? (mobileView === 'subjects' ? 'block' : 'none') : 'block',
    }}>
      <div style={{ padding:'8px 16px 4px', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
        Subjects ({subjects.length})
      </div>
      {subjects.map(sub => (
        <button key={sub.subject_id} onClick={() => selectSubject(sub.subject_id)} style={{
          display:'block', width:'100%', textAlign:'left', padding:'12px 16px',
          background: selectedSubject === sub.subject_id ? 'var(--primary-light)' : 'transparent',
          border: 'none',
          borderLeft: `3px solid ${selectedSubject === sub.subject_id ? 'var(--primary)' : 'transparent'}`,
          cursor:'pointer', fontSize: mobile ? 15 : 13,
          fontWeight: selectedSubject === sub.subject_id ? 600 : 400,
          color: selectedSubject === sub.subject_id ? 'var(--primary-dark)' : 'var(--text)',
          transition:'all 0.12s',
        }}>
          {sub.subject_name_english}
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{sub.subject_name_tamil}</div>
        </button>
      ))}
    </div>
  );

  const TopicPanel = ({ mobile }) => (
    <div style={{
      width: mobile ? '100%' : 300,
      flexShrink: 0,
      borderRight: mobile ? 'none' : '1px solid var(--border)',
      overflowY: 'auto',
      background: '#fafbfc',
      padding: '12px 0',
      display: mobile ? (mobileView === 'topics' ? 'block' : 'none') : 'block',
    }}>
      {mobile && (
        <div style={{ padding:'0 16px 8px' }}>
          <BackBtn onClick={() => setMobileView('subjects')} label="Subjects" />
        </div>
      )}
      <div style={{ padding:'8px 16px 4px', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>
        {currentSubject?.subject_name_english} ({currentTopics.length})
      </div>
      {!currentTopics.length ? (
        <div style={{ padding:24, textAlign:'center', color:'var(--text-muted)', fontSize:14 }}>
          {loadedSubjects.has(selectedSubject)
            ? <><div style={{ fontSize:32, marginBottom:8 }}>📭</div>No topics available</>
            : <><div style={{ fontSize:32, marginBottom:8 }}>⏳</div>Loading topics...</>
          }
        </div>
      ) : (
        currentTopics.map(t => (
          <div key={t.topic_id} onClick={() => openTopic(t.topic_id)} style={{
            padding: mobile ? '14px 16px' : '10px 16px',
            cursor:'pointer',
            borderLeft: `3px solid ${selectedTopic === t.topic_id ? 'var(--primary)' : 'transparent'}`,
            background: selectedTopic === t.topic_id ? '#fff' : 'transparent',
            borderBottom:'1px solid var(--border)', transition:'all 0.12s',
          }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize: mobile ? 14 : 13, fontWeight:500, color:'var(--text)', lineHeight:1.4, marginBottom:4 }}>
                  {t.topic_name_english}
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:4 }}>{t.topic_name_tamil}</div>
                <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                  {priorityBadge(t.exam_priority)}
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>Unit {t.unit}</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); toggleProgress(t.topic_id); }}
                title={userProgress[t.topic_id] ? 'Mark incomplete' : 'Mark complete'}
                style={{
                  width:24, height:24, borderRadius:4, flexShrink:0,
                  border:`2px solid ${userProgress[t.topic_id] ? 'var(--success)' : 'var(--border)'}`,
                  background: userProgress[t.topic_id] ? 'var(--success)' : 'transparent',
                  color:'#fff', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', transition:'all 0.15s',
                }}
              >{userProgress[t.topic_id] ? '✓' : ''}</button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const DetailPanel = ({ mobile }) => (
    <div style={{
      flex: mobile ? 'none' : 1,
      width: mobile ? '100%' : 'auto',
      overflowY: 'auto',
      padding: mobile ? 16 : 24,
      display: mobile ? (mobileView === 'detail' ? 'block' : 'none') : 'block',
    }}>
      {mobile && mobileView === 'detail' && (
        <BackBtn onClick={() => setMobileView('topics')} label="Topics" />
      )}

      {!selectedTopic && !mobile && (
        <div className="empty-state" style={{ paddingTop:64 }}>
          <div className="empty-state-icon">👈</div>
          <p style={{ fontSize:15 }}>Select a topic to start studying</p>
        </div>
      )}

      {topicLoading && (
        <div style={{ display:'flex', justifyContent:'center', paddingTop:48 }}>
          <div className="spinner" />
        </div>
      )}

      {topicDetail && !topicLoading && (
        <div>
          {/* Topic header */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
              <h2 style={{ fontSize: mobile ? 17 : 20 }}>{topicDetail.topic_name_english}</h2>
              {priorityBadge(topicDetail.exam_priority)}
            </div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:8 }}>
              {topicDetail.topic_name_tamil} · Unit {topicDetail.unit}
            </div>
            <button
              onClick={() => toggleProgress(topicDetail.topic_id)}
              className={`btn btn-sm ${userProgress[topicDetail.topic_id] ? 'btn-success' : 'btn-outline'}`}
            >
              {userProgress[topicDetail.topic_id] ? '✓ Completed' : '○ Mark Complete'}
            </button>
          </div>

          {/* Tabs — scrollable on mobile */}
          <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:16, overflowX:'auto', WebkitOverflowScrolling:'touch' }}>
            {[
              ['summary',    'Summary'],
              ['bullets',    `Points (${topicDetail.bullet_points?.length || 0})`],
              ['compare',    `Compare (${topicDetail.vs_comparisons?.length || 0})`],
              ['tricks',     `Tricks (${topicDetail.memory_tricks?.length || 0})`],
              ['flashcards', `Flashcards (${topicDetail.flashcards?.length || 0})`],
              ['errors',     `Errors (${topicDetail.human_errors?.length || 0})`],
              ['prediction', 'Exam Tip'],
              ['questions',  `PYQ (${topicDetail.pyq_questions?.length || 0})`],
            ].map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: mobile ? '8px 12px' : '8px 16px',
                background:'none', border:'none', whiteSpace:'nowrap',
                borderBottom:`2px solid ${activeTab === tab ? 'var(--primary)' : 'transparent'}`,
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === tab ? 600 : 400,
                fontSize: mobile ? 12 : 13,
                cursor:'pointer', transition:'all 0.15s', marginBottom:-1,
              }}>{label}</button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'summary' && (
            <div className="card">
              <div style={{ fontSize:14, lineHeight:1.7, color:'var(--text)', marginBottom: topicDetail.summary?.tamil ? 14 : 0 }}>
                {topicDetail.summary?.english}
              </div>
              {topicDetail.summary?.tamil && (
                <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.8, borderTop:'1px solid var(--border)', paddingTop:12 }}>
                  {topicDetail.summary?.tamil}
                </div>
              )}
            </div>
          )}

          {activeTab === 'bullets' && (
            <div className="card">
              {topicDetail.bullet_points?.length ? (
                <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:12 }}>
                  {topicDetail.bullet_points.map((bp, i) => (
                    <li key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', paddingBottom:10, borderBottom:'1px solid var(--border)' }}>
                      <span style={{ color:'var(--primary)', fontWeight:700, flexShrink:0, marginTop:2 }}>•</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.6, fontWeight:500 }}>{bp.point_tamil}</div>
                        {bp.point_english && (
                          <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5, marginTop:3 }}>{bp.point_english}</div>
                        )}
                        {bp.is_number_fact && bp.key_number && (
                          <span className="badge badge-primary" style={{ marginTop:5, display:'inline-block' }}>Key: {bp.key_number}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <div className="empty-state"><div className="empty-state-icon">📋</div><p>No key points available</p></div>}
            </div>
          )}

          {activeTab === 'compare' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {topicDetail.vs_comparisons?.length ? topicDetail.vs_comparisons.map((comp, i) => (
                <div key={i} className="card">
                  <div className="card-title">{comp.title_english}</div>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Feature</th><th>Item A</th><th>Item B</th></tr></thead>
                      <tbody>
                        {comp.rows?.map((row, j) => (
                          <tr key={j}>
                            <td style={{ fontWeight:500 }}>{row.feature}</td>
                            <td>{row.item_a}</td>
                            <td>{row.item_b}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )) : <div className="card"><div className="empty-state"><div className="empty-state-icon">⚖️</div><p>No comparisons</p></div></div>}
            </div>
          )}

          {activeTab === 'tricks' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {topicDetail.memory_tricks?.length ? topicDetail.memory_tricks.map((trick, i) => (
                <div key={i} className="card" style={{ borderLeft:'4px solid var(--warning)' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--warning)', marginBottom:6, textTransform:'uppercase' }}>💡 {trick.type || 'Memory Trick'}</div>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>{trick.fact_to_remember}</div>
                  <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.6 }}>{trick.trick_tamil || trick.trick_english}</div>
                  {trick.trick_tamil && trick.trick_english && (
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{trick.trick_english}</div>
                  )}
                </div>
              )) : <div className="card"><div className="empty-state"><div className="empty-state-icon">🧠</div><p>No memory tricks</p></div></div>}
            </div>
          )}

          {activeTab === 'flashcards' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 4 }}>Flashcard Practice</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tap a card to flip between Tamil and English</p>
              </div>
              <FlashCards
                cards={(topicDetail.flashcards || []).map(fc => ({
                  front: fc.front_tamil,
                  back: fc.back_tamil,
                  backEnglish: fc.back_english,
                  cardType: fc.card_type,
                }))}
              />
            </div>
          )}

          {activeTab === 'errors' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {topicDetail.human_errors?.length ? topicDetail.human_errors.map((he, i) => (
                <div key={i} className="card" style={{ borderLeft:'4px solid var(--danger)' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--danger)', marginBottom:8, textTransform:'uppercase' }}>⚠️ பொதுவான தவறு {i + 1}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:6, padding:'8px 12px' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--danger)', marginBottom:4 }}>தவறான பதில்</div>
                      <div style={{ fontSize:14, color:'#991b1b' }}>{he.wrong_answer_tamil}</div>
                    </div>
                    <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:6, padding:'8px 12px' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--success)', marginBottom:4 }}>சரியான பதில்</div>
                      <div style={{ fontSize:14, color:'#166534' }}>{he.correct_answer_tamil}</div>
                    </div>
                    <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:6, padding:'8px 12px' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--warning)', marginBottom:4 }}>தவறு ஏன்?</div>
                      <div style={{ fontSize:13, color:'#92400e', lineHeight:1.6 }}>{he.why_mistake_tamil}</div>
                    </div>
                    {he.memory_tip_tamil && (
                      <div style={{ background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:6, padding:'8px 12px' }}>
                        <div style={{ fontSize:11, fontWeight:700, color:'var(--primary)', marginBottom:4 }}>💡 நினைவு குறிப்பு</div>
                        <div style={{ fontSize:13, color:'#5b21b6', lineHeight:1.6 }}>{he.memory_tip_tamil}</div>
                      </div>
                    )}
                  </div>
                </div>
              )) : <div className="card"><div className="empty-state"><div className="empty-state-icon">✅</div><p>No common errors recorded</p></div></div>}
            </div>
          )}

          {activeTab === 'prediction' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {topicDetail.exam_prediction && (
                <div className="card" style={{ borderLeft:'4px solid var(--primary)' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'var(--primary)', marginBottom:12, textTransform:'uppercase' }}>📊 2026 தேர்வு கணிப்பு</div>
                  <div style={{ display:'flex', gap:24, flexWrap:'wrap', marginBottom:12 }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:36, fontWeight:800, color:'var(--primary)' }}>{topicDetail.exam_prediction.probability_percent}%</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>வாய்ப்பு</div>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:36, fontWeight:800, color:'var(--info)' }}>{topicDetail.exam_prediction.expected_questions}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>எதிர்பார்க்கப்படும் கேள்விகள்</div>
                    </div>
                  </div>
                  {topicDetail.exam_prediction.most_likely_topics?.length > 0 && (
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, marginBottom:6, color:'var(--text-muted)' }}>அதிக வாய்ப்புள்ள தலைப்புகள்:</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {topicDetail.exam_prediction.most_likely_topics.map((t, i) => (
                          <span key={i} style={{ background:'var(--primary-light)', color:'var(--primary-dark)', padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:500 }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {topicDetail.predicted_question_tamil && (
                <div className="card" style={{ borderLeft:'4px solid var(--warning)' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--warning)', marginBottom:8, textTransform:'uppercase' }}>🎯 கணிக்கப்பட்ட கேள்வி (தமிழ்)</div>
                  <div style={{ fontSize:14, lineHeight:1.7, color:'var(--text)', fontStyle:'italic' }}>{topicDetail.predicted_question_tamil}</div>
                  {topicDetail.predicted_question_english && (
                    <div style={{ fontSize:13, lineHeight:1.6, color:'var(--text-muted)', marginTop:8 }}>{topicDetail.predicted_question_english}</div>
                  )}
                </div>
              )}

              {topicDetail.ai_note_tamil && (
                <div className="card" style={{ borderLeft:'4px solid var(--success)', background:'#f0fdf4' }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'var(--success)', marginBottom:8, textTransform:'uppercase' }}>🤖 AI குறிப்பு</div>
                  <div style={{ fontSize:14, lineHeight:1.8, color:'#166534' }}>{topicDetail.ai_note_tamil}</div>
                </div>
              )}

              {!topicDetail.exam_prediction && !topicDetail.predicted_question_tamil && !topicDetail.ai_note_tamil && (
                <div className="card"><div className="empty-state"><div className="empty-state-icon">🔮</div><p>No exam prediction data available</p></div></div>
              )}
            </div>
          )}

          {activeTab === 'questions' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {topicDetail.pyq_questions?.length ? topicDetail.pyq_questions.map((q, i) => (
                <div key={i} className="card">
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, flexWrap:'wrap', gap:4 }}>
                    <span style={{ fontSize:11, color:'var(--text-muted)' }}>Q{i+1}{q.year ? ` · ${q.year}` : ''}</span>
                    {q.pyq_verified && <span className="badge badge-primary">PYQ Verified</span>}
                  </div>
                  <div style={{ fontSize: mobile ? 13 : 14, fontWeight:500, marginBottom:10, lineHeight:1.5 }}>{q.question_tamil || q.question_english}</div>
                  {q.question_tamil && q.question_english && (
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10, lineHeight:1.5 }}>{q.question_english}</div>
                  )}
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {q.option_details?.map(opt => (
                      <div key={opt.label} style={{
                        padding:'8px 12px', borderRadius:6, fontSize: mobile ? 13 : 13,
                        background: opt.label === q.correct_option ? '#d1fae5' : '#f8fafc',
                        border:`1px solid ${opt.label === q.correct_option ? 'var(--success)' : 'var(--border)'}`,
                        color: opt.label === q.correct_option ? '#065f46' : 'var(--text)',
                        fontWeight: opt.label === q.correct_option ? 600 : 400,
                        lineHeight: 1.4,
                      }}>
                        <span style={{ fontWeight:700 }}>{opt.label})</span> {opt.text}
                        {opt.label === q.correct_option && <span style={{ marginLeft:6 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )) : <div className="card"><div className="empty-state"><div className="empty-state-icon">❓</div><p>No PYQ questions</p></div></div>}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Courses</h1>
          {/* Mobile breadcrumb */}
          <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
            {mobileView === 'subjects' && `${subjects.length} subjects`}
            {mobileView === 'topics'   && `${currentSubject?.subject_name_english} · ${currentTopics.length} topics`}
            {mobileView === 'detail'   && (topicDetail?.topic_name_english || 'Loading...')}
          </p>
        </div>
      </div>

      {/* ── Desktop layout: 3 panels side-by-side ── */}
      <div className="courses-desktop">
        <SubjectPanel mobile={false} />
        <TopicPanel   mobile={false} />
        <DetailPanel  mobile={false} />
      </div>

      {/* ── Mobile layout: one panel at a time ── */}
      <div className="courses-mobile">
        <SubjectPanel mobile={true} />
        <TopicPanel   mobile={true} />
        <DetailPanel  mobile={true} />
      </div>
    </div>
  );
}

export default Courses;
