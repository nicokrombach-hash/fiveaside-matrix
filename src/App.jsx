import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ChevronLeft, User, Plus, Trash2, Upload,
  Building2, Users, Star, Cloud, RefreshCw
} from 'lucide-react';

const SUPABASE_URL = 'https://euudeiogircwlvzmsmsr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uPz_tUHK-jgtGSa2tstLHQ_mO1nF-63';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ATHLETE_CFG = [
  { k: 'maturity',     l: 'Marken-Reife',           s: 'Leidenschaft / Innovation',      w: '20%', abbr: 'MR' },
  { k: 'storytelling', l: 'Storytelling-Potenzial',  s: 'Sexyness / Potential',           w: '25%', abbr: 'ST' },
  { k: 'leverage',     l: 'Wirtschaftliche Hebel',   s: 'Monetarisierung / Momentum',     w: '25%', abbr: 'WH' },
  { k: 'efficiency',   l: 'Operative Effizienz',     s: 'Aufwand / Timing / Kapazitäten', w: '15%', abbr: 'OE' },
  { k: 'network',      l: 'Netzwerk-Kompatibilität', s: 'Network Fit / Menschen',         w: '15%', abbr: 'NK' },
];
const BRAND_CFG = [
  { k: 'passion',  l: 'Passion / Innovation',   s: 'Leidenschaft / Kreativität', w: '20%', abbr: 'PA' },
  { k: 'sexyness', l: 'Sexyness / Potenzial',   s: 'Marktattraktivität',         w: '25%', abbr: 'SE' },
  { k: 'ip',       l: 'IP / Momentum',          s: 'Rechte / Timing',            w: '25%', abbr: 'IP' },
  { k: 'aufwand',  l: 'Aufwand / Timing',       s: 'Ressourcen / Kapazität',     w: '15%', abbr: 'AU' },
  { k: 'network',  l: 'Network Fit / Synergie', s: 'Menschen / Kompatibilität',  w: '15%', abbr: 'NW' },
];

const QUADRANTS = [
  { id: 'tl', label: 'Entwicklungs-\nprojekte', sx: '23%', sy: '22%', strat: 'Invest & Develop', desc: 'Hoher Impact, geringere Synergie. Entwicklungspotenzial mit gezieltem Aufbau.' },
  { id: 'tr', label: 'Anker-\nAthleten',        sx: '77%', sy: '22%', strat: 'Joint Venture & Eigenmarken-Aufbau. Sofortiges Onboarding.', desc: 'Höchste Priorität. Maximales Marktpotenzial bei optimaler Synergie.' },
  { id: 'bl', label: 'Kritische\nFälle',        sx: '23%', sy: '78%', strat: 'Review & Decide', desc: 'Niedriger Impact und Synergie. Kritisch überprüfen oder abgeben.' },
  { id: 'br', label: 'Spezialisten',            sx: '77%', sy: '78%', strat: 'Nischen-Strategie', desc: 'Hohe Synergie, begrenzter Impact. Spezialisierte Verwertung möglich.' },
];

function calcScores(scores, cfg) {
  if (!scores) return { synergie: 0, impact: 0, total: 0 };
  const keys = cfg.map(c => c.k);
  const synergie = scores[keys[4]] ?? 5;
  const impact = ((scores[keys[1]] ?? 5) + (scores[keys[2]] ?? 5)) / 2;
  const total = cfg.reduce((s, c) => s + (scores[c.k] ?? 0), 0) / cfg.length;
  return { synergie, impact, total: Math.round(total * 10) / 10 };
}
function getGrade(t) {
  if (t >= 9) return 'A+'; if (t >= 8) return 'A'; if (t >= 7) return 'B';
  if (t >= 6) return 'C+'; if (t >= 5) return 'C'; return 'D';
}
function getQid(sy, imp) {
  const r = sy >= 5; const t = imp >= 5;
  return t && r ? 'tr' : t && !r ? 'tl' : !t && r ? 'br' : 'bl';
}
const clamp = v => Math.max(3, Math.min(97, v));

export default function FiveAsideMasterApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [view, setView] = useState('grid');
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState({ athletes: [], brands: [] });
  const rowId = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('data_store').select('id, content').limit(1).single();
      if (data) { rowId.current = data.id; setDb(data.content); }
      setLoading(false);
    };
    init();
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'data_store' },
        payload => setDb(payload.new.content))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const sync = async (newDb) => {
    setDb(newDb);
    await supabase.from('data_store').update({ content: newDb }).eq('id', rowId.current);
  };

  const cfg = activeTab === 'athletes' ? ATHLETE_CFG : BRAND_CFG;
  const list = db[activeTab] || [];
  const item = list.find(i => i.id === selectedId);

  const ranked = [...list].sort((a, b) => {
    const sk = cfg.map(c => c.k);
    return (b.scores[sk[1]] + b.scores[sk[2]]) - (a.scores[sk[1]] + a.scores[sk[2]]);
  });

  const upd = (id, field, val) => {
    const newList = db[activeTab].map(i => i.id === id ? { ...i, [field]: val } : i);
    sync({ ...db, [activeTab]: newList });
  };

  const addNew = () => {
    const n = {
      id: Date.now(), name: 'Neuer Eintrag', image: null,
      alter: '', spielklasse: '', erfolge: '', management: '',
      scores: cfg.reduce((a, c) => ({ ...a, [c.k]: 5 }), {})
    };
    if (activeTab === 'athletes') { n.sport = 'Sportart'; n.league = 'Liga'; }
    else { n.industry = 'Branche'; n.focus = 'Fokus'; }
    sync({ ...db, [activeTab]: [...db[activeTab], n] });
    setSelectedId(n.id);
    setView('detail');
  };

  const del = id => {
    if (!window.confirm('Eintrag wirklich löschen?')) return;
    sync({ ...db, [activeTab]: db[activeTab].filter(i => i.id !== id) });
    setView('grid');
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <RefreshCw color="var(--gold)" size={36} style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '0.4em', fontSize: '0.7rem', color: 'var(--gold)' }}>
        Connecting to Five Aside Cloud…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const sc = item ? calcScores(item.scores, cfg) : { synergie: 0, impact: 0, total: 0 };
  const qid = item ? getQid(sc.synergie, sc.impact) : 'bl';
  const qdata = QUADRANTS.find(q => q.id === qid);
  const dotX = item ? (sc.synergie / 10) * 100 : 50;
  const dotY = item ? ((10 - sc.impact) / 10) * 100 : 50;

  return (
    <div style={{ padding: '1.8rem', minHeight: '100vh' }}>
      <style>{`
        .app-header { display:flex; justify-content:space-between; align-items:center; max-width:1300px; margin:0 auto 2.5rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border); flex-wrap:wrap; gap:1rem; }
        .logo { cursor:pointer; }
        .logo h1 { font-family:"Barlow Condensed",sans-serif; font-size:2.8rem; font-weight:900; font-style:italic; color:var(--gold); text-transform:uppercase; letter-spacing:-0.03em; line-height:1; }
        .logo-sub { display:flex; align-items:center; gap:0.5rem; margin-top:0.3rem; }
        .dot { width:6px; height:6px; background:var(--green); border-radius:50%; animation:pulseDot 2s infinite; }
        @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:.4} }
        .logo-sub span { font-size:0.5rem; text-transform:uppercase; letter-spacing:0.4em; font-weight:700; color:var(--muted); }
        .tab-switcher { display:flex; background:rgba(0,0,0,0.5); padding:0.35rem; border-radius:0.9rem; border:1px solid var(--border); }
        .tab-btn { padding:0.55rem 1.4rem; border-radius:0.6rem; font-family:"Barlow Condensed",sans-serif; font-size:0.62rem; font-weight:900; font-style:italic; text-transform:uppercase; letter-spacing:0.12em; border:none; cursor:pointer; transition:all 0.2s; color:var(--muted); background:transparent; }
        .tab-btn.active { background:var(--gold); color:#000; }
        .tab-btn:not(.active):hover { color:#fff; }
        .home-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; max-width:700px; margin:3rem auto 0; }
        .home-card { background:var(--card); border:2px solid var(--border); border-radius:2rem; padding:3rem 2rem; display:flex; flex-direction:column; align-items:center; cursor:pointer; transition:all 0.25s; text-align:center; }
        .home-card:hover { border-color:var(--gold); }
        .home-card:hover .hicon { color:var(--gold); transform:scale(1.1); }
        .home-icon-wrap { width:64px; height:64px; background:#000; border-radius:1rem; display:flex; align-items:center; justify-content:center; margin-bottom:1.2rem; }
        .hicon { color:#333; transition:all 0.25s; }
        .home-card h3 { font-family:"Barlow Condensed",sans-serif; font-size:1.6rem; font-weight:900; font-style:italic; text-transform:uppercase; }
        .grid-header { display:flex; justify-content:space-between; align-items:flex-end; max-width:1300px; margin:0 auto 1.8rem; flex-wrap:wrap; gap:1rem; }
        .grid-title { font-family:"Barlow Condensed",sans-serif; font-size:2.2rem; font-weight:900; font-style:italic; text-transform:uppercase; letter-spacing:-0.02em; }
        .btn-add { display:flex; align-items:center; gap:0.4rem; background:var(--gold); color:#000; border:none; padding:0.75rem 1.6rem; border-radius:1rem; font-family:"Barlow Condensed",sans-serif; font-size:0.8rem; font-weight:900; font-style:italic; text-transform:uppercase; cursor:pointer; transition:all 0.2s; }
        .btn-add:hover { background:#fff; }
        .cards-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:1.2rem; max-width:1300px; margin:0 auto; }
        .item-card { background:var(--card); border:2px solid var(--border); border-radius:1.6rem; padding:1.2rem; cursor:pointer; transition:all 0.25s; position:relative; }
        .item-card:hover { border-color:var(--gold); }
        .rank-badge { position:absolute; top:-9px; right:-9px; width:36px; height:36px; background:var(--gold); border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:"Barlow Condensed",sans-serif; font-weight:900; font-style:italic; font-size:0.78rem; color:#000; z-index:2; box-shadow:0 4px 16px rgba(212,175,55,0.4); }
        .card-img { aspect-ratio:1; background:#000; border-radius:1.2rem; margin-bottom:0.9rem; overflow:hidden; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; }
        .card-img img { width:100%; height:100%; object-fit:cover; }
        .card-name { font-size:1rem; font-weight:700; margin-bottom:0.2rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:color 0.2s; }
        .item-card:hover .card-name { color:var(--gold); }
        .card-sub { font-size:0.5rem; text-transform:uppercase; letter-spacing:0.25em; font-weight:700; color:var(--muted); }
        .detail-wrap { display:grid; grid-template-columns:420px 1fr; gap:1.2rem; max-width:1300px; margin:0 auto; animation:fadeUp 0.35s ease both; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @media(max-width:960px){ .detail-wrap{grid-template-columns:1fr;} }
        .panel { background:var(--card); border:1px solid var(--border); border-radius:1.8rem; padding:1.6rem; }
        .back-btn { background:none; border:none; color:var(--muted); cursor:pointer; display:flex; align-items:center; gap:0.4rem; font-size:0.55rem; font-weight:700; text-transform:uppercase; letter-spacing:0.3em; margin-bottom:1.2rem; transition:color 0.2s; font-family:"Barlow",sans-serif; }
        .back-btn:hover { color:var(--gold); }
        .profile-row { display:flex; gap:1rem; align-items:flex-start; margin-bottom:1rem; }
        .avatar-wrap { position:relative; flex-shrink:0; }
        .avatar { width:80px; height:80px; background:#000; border-radius:1.2rem; overflow:hidden; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; }
        .avatar img { width:100%; height:100%; object-fit:cover; }
        .avatar-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.75); border-radius:1.2rem; display:flex; align-items:center; justify-content:center; opacity:0; cursor:pointer; transition:opacity 0.2s; }
        .avatar-wrap:hover .avatar-overlay { opacity:1; }
        .name-input { width:100%; background:transparent; font-family:"Barlow Condensed",sans-serif; font-size:1.7rem; font-weight:900; font-style:italic; color:var(--gold); letter-spacing:-0.02em; border:none; border-bottom:1px solid var(--border); outline:none; margin-bottom:0.4rem; padding-bottom:0.2rem; transition:border-color 0.2s; }
        .name-input:focus { border-color:var(--gold); }
        .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-top:0.5rem; }
        .meta-field { display:flex; flex-direction:column; gap:0.2rem; }
        .meta-label { font-size:0.5rem; text-transform:uppercase; letter-spacing:0.25em; font-weight:700; color:var(--muted); }
        .meta-input { background:rgba(0,0,0,0.4); border:1px solid var(--border); border-radius:0.5rem; padding:0.35rem 0.6rem; font-size:0.72rem; font-weight:600; color:#ccc; outline:none; font-family:"Barlow",sans-serif; transition:border-color 0.2s; width:100%; }
        .meta-input:focus { border-color:var(--gold); color:var(--gold); }
        .meta-textarea { background:rgba(0,0,0,0.4); border:1px solid var(--border); border-radius:0.5rem; padding:0.4rem 0.6rem; font-size:0.68rem; font-weight:500; color:#ccc; outline:none; font-family:"Barlow",sans-serif; transition:border-color 0.2s; width:100%; resize:none; min-height:52px; line-height:1.4; }
        .meta-textarea:focus { border-color:var(--gold); color:var(--gold); }
        .meta-full { grid-column:span 2; }
        .section-label { font-size:0.5rem; font-weight:900; text-transform:uppercase; letter-spacing:0.4em; color:var(--muted); margin-bottom:1rem; margin-top:0.8rem; }
        .slider-item { margin-bottom:1.1rem; }
        .slider-top { display:flex; align-items:baseline; gap:0.5rem; margin-bottom:0.35rem; flex-wrap:wrap; }
        .slider-main-label { font-size:0.78rem; font-weight:700; color:#fff; }
        .slider-sub-label { font-size:0.62rem; color:var(--muted); font-weight:500; }
        .slider-right { margin-left:auto; display:flex; align-items:baseline; gap:0.5rem; }
        .slider-pct { font-size:0.6rem; color:var(--muted); font-weight:600; }
        .slider-val { font-family:"Barlow Condensed",sans-serif; font-size:1.6rem; font-weight:900; font-style:italic; color:var(--gold); line-height:1; }
        .gesamtscore { background:rgba(0,0,0,0.4); border:1px solid var(--border); border-radius:1.2rem; padding:1.1rem 1.2rem; margin-top:0.8rem; }
        .gs-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem; }
        .gs-title { font-size:0.5rem; font-weight:900; text-transform:uppercase; letter-spacing:0.35em; color:var(--muted); }
        .gs-grade { font-family:"Barlow Condensed",sans-serif; font-size:2.2rem; font-weight:900; font-style:italic; color:rgba(255,255,255,0.08); line-height:1; }
        .gs-score { font-family:"Barlow Condensed",sans-serif; font-size:2rem; font-weight:900; font-style:italic; color:var(--gold); line-height:1; }
        .gs-score span { font-size:0.85rem; color:var(--muted); font-style:normal; }
        .gs-bars { display:flex; flex-direction:column; gap:0.38rem; }
        .gs-bar-row { display:flex; align-items:center; gap:0.5rem; }
        .gs-bar-key { font-size:0.52rem; font-weight:700; text-transform:uppercase; color:var(--muted); width:18px; flex-shrink:0; }
        .gs-bar-track { flex:1; height:3px; background:#000; border-radius:999px; overflow:hidden; }
        .gs-bar-fill { height:100%; background:var(--gold); border-radius:999px; transition:width 0.5s ease; }
        .right-col { display:flex; flex-direction:column; gap:1rem; }
        .matrix-panel { background:var(--card); border:1px solid var(--border); border-radius:1.8rem; padding:1.4rem 1.6rem; flex:1; display:flex; flex-direction:column; }
        .matrix-header { font-size:0.5rem; font-weight:900; text-transform:uppercase; letter-spacing:0.4em; color:var(--muted); margin-bottom:1rem; }
        .matrix-with-yaxis { display:flex; width:100%; gap:0.5rem; }
        .y-axis-label { writing-mode:vertical-rl; transform:rotate(180deg); font-size:0.48rem; font-weight:700; text-transform:uppercase; letter-spacing:0.25em; color:var(--muted); white-space:nowrap; align-self:center; }
        .matrix-inner { flex:1; display:flex; flex-direction:column; }
        .matrix-canvas { position:relative; width:100%; aspect-ratio:1; background:var(--card2); border:1px solid var(--border); border-radius:0.8rem; overflow:hidden; }
        .mline-h { position:absolute; left:0; right:0; border-top:1px solid rgba(255,255,255,0.04); }
        .mline-v { position:absolute; top:0; bottom:0; border-left:1px solid rgba(255,255,255,0.04); }
        .mline-center-h { position:absolute; top:50%; left:0; right:0; border-top:1px solid rgba(255,255,255,0.1); }
        .mline-center-v { position:absolute; left:50%; top:0; bottom:0; border-left:1px solid rgba(255,255,255,0.1); }
        .quad-label { position:absolute; font-size:0.55rem; font-weight:600; color:rgba(255,255,255,0.25); text-align:center; line-height:1.4; pointer-events:none; white-space:pre-line; }
        .matrix-dot { position:absolute; width:18px; height:18px; background:var(--gold); border-radius:50%; transform:translate(-50%,-50%); border:2px solid #000; box-shadow:0 0 30px rgba(212,175,55,0.8),0 0 8px rgba(212,175,55,0.4); transition:all 0.8s cubic-bezier(0.34,1.56,0.64,1); z-index:10; }
        @keyframes ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.2);opacity:0} }
        .matrix-dot::after { content:''; position:absolute; inset:-5px; border-radius:50%; border:1px solid rgba(212,175,55,0.25); animation:ring 2s infinite; }
        .x-ticks { display:flex; justify-content:space-between; padding:0.25rem 0 0; }
        .tick { font-size:0.45rem; color:rgba(255,255,255,0.18); font-weight:600; }
        .x-axis-label { text-align:center; font-size:0.48rem; font-weight:700; text-transform:uppercase; letter-spacing:0.25em; color:var(--muted); margin-top:0.4rem; }
        .matrix-bottom-bar { display:flex; gap:1.5rem; padding:0.7rem 1rem; background:rgba(0,0,0,0.4); border-radius:0.8rem; margin-top:0.8rem; border:1px solid var(--border); flex-wrap:wrap; }
        .mbb-item { display:flex; align-items:center; gap:0.5rem; }
        .mbb-label { font-size:0.5rem; font-weight:700; text-transform:uppercase; letter-spacing:0.3em; color:var(--muted); }
        .mbb-val { font-family:"Barlow Condensed",sans-serif; font-size:1.1rem; font-weight:900; font-style:italic; color:var(--gold); }
        .qh-box { margin-left:auto; display:flex; align-items:center; gap:0.5rem; background:var(--card2); border:1px solid rgba(212,175,55,0.3); border-radius:0.6rem; padding:0.45rem 0.8rem; }
        .qh-title { font-size:0.55rem; font-weight:900; text-transform:uppercase; letter-spacing:0.05em; color:var(--gold); margin-bottom:0.15rem; }
        .qh-strat { font-size:0.6rem; font-weight:700; color:#ddd; margin-bottom:0.1rem; }
        .qh-desc { font-size:0.55rem; color:#666; line-height:1.4; max-width:200px; }
        .btn-delete { background:none; border:none; color:#3d1111; display:flex; align-items:center; gap:0.4rem; font-size:0.55rem; font-weight:700; text-transform:uppercase; letter-spacing:0.25em; cursor:pointer; transition:color 0.2s; font-family:"Barlow",sans-serif; align-self:flex-end; }
        .btn-delete:hover { color:var(--red); }
      `}</style>

      <header className="app-header">
        <div className="logo" onClick={() => { setActiveTab('home'); setView('grid'); }}>
          <h1>Five Aside</h1>
          <div className="logo-sub"><div className="dot" /><span>Cloud Matrix Live</span></div>
        </div>
        {activeTab !== 'home' && (
          <div className="tab-switcher">
            <button className={'tab-btn' + (activeTab === 'athletes' ? ' active' : '')} onClick={() => { setActiveTab('athletes'); setView('grid'); }}>Athlete Matrix</button>
            <button className={'tab-btn' + (activeTab === 'brands' ? ' active' : '')} onClick={() => { setActiveTab('brands'); setView('grid'); }}>Brands / Rights</button>
          </div>
        )}
      </header>

      {activeTab === 'home' && (
        <div className="home-grid">
          <div className="home-card" onClick={() => setActiveTab('athletes')}>
            <div className="home-icon-wrap"><div className="hicon"><Users size={36} /></div></div>
            <h3>Athlete Matrix</h3>
          </div>
          <div className="home-card" onClick={() => setActiveTab('brands')}>
            <div className="home-icon-wrap"><div className="hicon"><Building2 size={36} /></div></div>
            <h3>Brands / Rights</h3>
          </div>
        </div>
      )}

      {activeTab !== 'home' && view === 'grid' && (
        <>
          <div className="grid-header">
            <h2 className="grid-title">Top Ranked {activeTab === 'athletes' ? 'Athletes' : 'Brands'}</h2>
            <button className="btn-add" onClick={addNew}><Plus size={16} strokeWidth={3} /> Add New</button>
          </div>
          <div className="cards-grid">
            {ranked.map((it, idx) => (
              <div key={it.id} className="item-card" onClick={() => { setSelectedId(it.id); setView('detail'); }}>
                <div className="rank-badge">#{idx + 1}</div>
                <div className="card-img">
                  {it.image ? <img src={it.image} alt={it.name} /> : <User size={52} opacity={0.08} />}
                </div>
                <div className="card-name">{it.name}</div>
                <div className="card-sub">{activeTab === 'athletes' ? it.sport : it.industry}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab !== 'home' && view === 'detail' && item && (
        <div className="detail-wrap">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div className="panel">
              <button className="back-btn" onClick={() => setView('grid')}><ChevronLeft size={13} /> Back to Dashboard</button>
              <div className="profile-row">
                <div className="avatar-wrap">
                  <div className="avatar">
                    {item.image ? <img src={item.image} alt={item.name} /> : <User size={36} opacity={0.1} />}
                  </div>
                  <input type="file" style={{ display: 'none' }} ref={fileInputRef} onChange={e => {
                    const f = e.target.files[0]; if (!f) return;
                    const r = new FileReader(); r.onloadend = () => upd(item.id, 'image', r.result); r.readAsDataURL(f);
                  }} />
                  <div className="avatar-overlay" onClick={() => fileInputRef.current.click()}><Upload size={20} /></div>
                </div>
                <div style={{ flex: 1 }}>
                  <input className="name-input" value={item.name} onChange={e => upd(item.id, 'name', e.target.value)} />
                </div>
              </div>
              <div className="meta-grid">
                <div className="meta-field">
                  <div className="meta-label">Sport / Branche</div>
                  <input className="meta-input" value={activeTab === 'athletes' ? item.sport : item.industry} onChange={e => upd(item.id, activeTab === 'athletes' ? 'sport' : 'industry', e.target.value)} />
                </div>
                <div className="meta-field">
                  <div className="meta-label">Alter</div>
                  <input className="meta-input" value={item.alter || ''} onChange={e => upd(item.id, 'alter', e.target.value)} />
                </div>
                <div className="meta-field">
                  <div className="meta-label">{activeTab === 'athletes' ? 'Liga / Spielklasse' : 'Fokus'}</div>
                  <input className="meta-input" value={activeTab === 'athletes' ? item.league : item.focus} onChange={e => upd(item.id, activeTab === 'athletes' ? 'league' : 'focus', e.target.value)} />
                </div>
                <div className="meta-field">
                  <div className="meta-label">Management</div>
                  <input className="meta-input" value={item.management || ''} onChange={e => upd(item.id, 'management', e.target.value)} />
                </div>
                <div className="meta-field meta-full">
                  <div className="meta-label">Erfolge</div>
                  <textarea className="meta-textarea" value={item.erfolge || ''} onChange={e => upd(item.id, 'erfolge', e.target.value)} placeholder="Titel, Auszeichnungen, Erfolge…" />
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="section-label">Bewertungskriterien</div>
              {cfg.map(c => (
                <div key={c.k} className="slider-item">
                  <div className="slider-top">
                    <span className="slider-main-label">{c.l}</span>
                    <span className="slider-sub-label">{c.s}</span>
                    <div className="slider-right">
                      <span className="slider-pct">{c.w}</span>
                      <span className="slider-val">{item.scores[c.k]}</span>
                    </div>
                  </div>
                  <input type="range" min={0} max={10} step={1} value={item.scores[c.k]}
                    onChange={e => upd(item.id, 'scores', { ...item.scores, [c.k]: parseInt(e.target.value) })} />
                </div>
              ))}
              <div className="gesamtscore">
                <div className="gs-header">
                  <div>
                    <div className="gs-title">Gesamtscore</div>
                    <div className="gs-score">{sc.total.toFixed(1)}<span> / 10</span></div>
                  </div>
                  <div className="gs-grade">{getGrade(sc.total)}</div>
                </div>
                <div className="gs-bars">
                  {cfg.map(c => (
                    <div key={c.k} className="gs-bar-row">
                      <div className="gs-bar-key">{c.abbr}</div>
                      <div className="gs-bar-track">
                        <div className="gs-bar-fill" style={{ width: (item.scores[c.k] * 10) + '%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="right-col">
            <div className="matrix-panel">
              <div className="matrix-header">Live-Matrix</div>
              <div className="matrix-with-yaxis">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', paddingBottom: '1.6rem' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: '0.2rem' }}>
                    {[10, 8, 6, 4, 2, 0].map(n => <span key={n} className="tick">{n}</span>)}
                  </div>
                  <div className="y-axis-label">Markt-Impact</div>
                </div>
                <div className="matrix-inner">
                  <div className="matrix-canvas">
                    {[20, 40, 60, 80].map(p => <div key={'h' + p} className="mline-h" style={{ top: p + '%' }} />)}
                    {[20, 40, 60, 80].map(p => <div key={'v' + p} className="mline-v" style={{ left: p + '%' }} />)}
                    <div className="mline-center-h" />
                    <div className="mline-center-v" />
                    {QUADRANTS.map(q => (
                      <div key={q.id} className="quad-label" style={{
                        left: q.sx, top: q.sy, transform: 'translate(-50%,-50%)',
                        color: q.id === qid ? 'rgba(212,175,55,0.65)' : 'rgba(255,255,255,0.18)',
                        fontWeight: q.id === qid ? 700 : 500,
                      }}>{q.label}</div>
                    ))}
                    <div className="matrix-dot" style={{ left: clamp(dotX) + '%', top: clamp(dotY) + '%' }} />
                  </div>
                  <div className="x-ticks">{[0, 2, 4, 6, 8, 10].map(n => <span key={n} className="tick">{n}</span>)}</div>
                  <div className="x-axis-label">Management-Synergie</div>
                </div>
              </div>
              <div className="matrix-bottom-bar">
                <div className="mbb-item"><span className="mbb-label">Synergie</span><span className="mbb-val">{sc.synergie.toFixed(1)}</span></div>
                <div className="mbb-item"><span className="mbb-label">Impact</span><span className="mbb-val">{sc.impact.toFixed(1)}</span></div>
                <div className="qh-box">
                  <div>
                    <div className="qh-title">{qdata.id === 'tr' ? 'Anker-Athlet' : qdata.id === 'tl' ? 'Entwicklungsprojekt' : qdata.id === 'br' ? 'Spezialist' : 'Kritischer Fall'}</div>
                    <div className="qh-strat">{qdata.strat}</div>
                    <div className="qh-desc">{qdata.desc}</div>
                  </div>
                </div>
              </div>
            </div>
            <button className="btn-delete" onClick={() => del(item.id)}>
              <Trash2 size={12} /> Delete Permanent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
