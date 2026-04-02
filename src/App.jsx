import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChevronLeft, User, Plus, Trash2, Upload, Building2, Users, RefreshCw, Move, Instagram, ExternalLink, Loader, Zap, Search } from 'lucide-react';

const LOGO_SRC = '/fa_logo.jpg';
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
const RIGHTSHOLDER_CFG = [
  { k: 'passion',  l: 'Passion / Innovation',   s: 'Leidenschaft / Kreativität', w: '20%', abbr: 'PA' },
  { k: 'sexyness', l: 'Sexyness / Potenzial',   s: 'Marktattraktivität',         w: '25%', abbr: 'SE' },
  { k: 'ip',       l: 'IP / Momentum',          s: 'Rechte / Timing',            w: '25%', abbr: 'IP' },
  { k: 'aufwand',  l: 'Aufwand / Timing',       s: 'Ressourcen / Kapazität',     w: '15%', abbr: 'AU' },
  { k: 'network',  l: 'Network Fit / Synergie', s: 'Menschen / Kompatibilität',  w: '15%', abbr: 'NW' },
];

const QUADRANTS = [
  { id:'tl', label:'Entwicklungs-\nprojekte', sx:'23%', sy:'22%', strat:'Invest & Develop', desc:'Hoher Impact, geringere Synergie. Entwicklungspotenzial mit gezieltem Aufbau.' },
  { id:'tr', label:'Anker-\nAthleten',        sx:'77%', sy:'22%', strat:'Joint Venture & Eigenmarken-Aufbau. Sofortiges Onboarding.', desc:'Höchste Priorität. Maximales Marktpotenzial bei optimaler Synergie.' },
  { id:'bl', label:'Kritische\nFälle',        sx:'23%', sy:'78%', strat:'Review & Decide', desc:'Niedriger Impact und Synergie. Kritisch überprüfen oder abgeben.' },
  { id:'br', label:'Spezialisten',            sx:'77%', sy:'78%', strat:'Nischen-Strategie', desc:'Hohe Synergie, begrenzter Impact. Spezialisierte Verwertung möglich.' },
];

function calcScores(scores, cfg) {
  if (!scores) return { synergie:0, impact:0, total:0 };
  const keys = cfg.map(c=>c.k);
  const synergie = scores[keys[4]] ?? 5;
  const impact = ((scores[keys[1]]??5) + (scores[keys[2]]??5)) / 2;
  const total = cfg.reduce((s,c) => s+(scores[c.k]??0), 0) / cfg.length;
  return { synergie, impact, total: Math.round(total*10)/10 };
}
function getGrade(t) {
  if (t>=9) return 'A+'; if (t>=8) return 'A'; if (t>=7) return 'B';
  if (t>=6) return 'C+'; if (t>=5) return 'C'; return 'D';
}
function getQid(sy, imp) {
  const r=sy>=5, t=imp>=5;
  return t&&r?'tr':t&&!r?'tl':!t&&r?'br':'bl';
}
const clamp = v => Math.max(3, Math.min(97, v));

async function claudeAPI(prompt) {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    if (!data.content) return null;
    return data.content.filter(b=>b.type==='text').map(b=>b.text).join('');
  } catch(e) { console.error('API error:', e); return null; }
}

function parseJSON(text, requiredKey) {
  if (!text) return null;
  try {
    const patterns = [
      new RegExp(`\\{[^{}]*"${requiredKey}"[^{}]*\\}`),
      /```json\s*([\s\S]*?)\s*```/,
      /\{[\s\S]*\}/
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        const str = m[1] || m[0];
        try { return JSON.parse(str); } catch(e) {}
      }
    }
  } catch(e) {}
  return null;
}

async function fetchInstaStats(handle) {
  const h = handle.replace('@','').trim();
  const text = await claudeAPI(
    `Search for the exact current Instagram follower count of @${h}. ` +
    `Check multiple sources: socialblade.com/instagram/user/${h}, instagram.com/${h}, and google search "${h} instagram followers". ` +
    `IMPORTANT: Report the HIGHEST and most recent number you find. Follower counts are often in millions for athletes. ` +
    `If you see 1,200,000 write "1.2M". If you see 990,000 write "990K". Be precise. ` +
    `Return ONLY valid JSON: {"followers":"1.2M","following":"456","posts":"789","bio":"short bio","verified":false} ` +
    `No other text. If truly not found: {"followers":"N/A","following":"N/A","posts":"N/A","bio":"","verified":false}`
  );
  return parseJSON(text, 'followers');
}

async function fetchAthleteAutofill(name) {
  const text = await claudeAPI(
    `Search the web comprehensively for the athlete "${name}". Search Wikipedia, transfermarkt.de, and sports news sites. ` +
    `Find: sport, current team/club, age, management agency, career highlights, current season stats. ` +
    `Return ONLY this JSON, no other text: ` +
    `{"sport":"","league":"","alter":"","management":"","erfolge":"","leistungsdaten":"","instaHandle":"","imageUrl":""}. ` +
    `For "erfolge": 3-5 major achievements as text (e.g. "U21 Weltmeister 2023, 2x Torschützenkönig"). ` +
    `For "leistungsdaten": current season stats as German bullet points (e.g. "• 14 Tore / 9 Assists\n• Marktwert: 25 Mio €"). ` +
    `For "instaHandle": username without @. For "imageUrl": direct .jpg/.png URL. For "alter": age number. Unknown = "".`
  );
  return parseJSON(text, 'sport');
}

async function fetchBrandAutofill(name) {
  const text = await claudeAPI(
    `Search the web for the company or brand "${name}". Return ONLY this JSON: ` +
    `{"industry":"","focus":"","alter":"","management":"","erfolge":"","leistungsdaten":"","instaHandle":"","imageUrl":""}. ` +
    `For "imageUrl": direct .jpg/.png URL to logo. For "leistungsdaten": 2-3 key facts in German bullet points. ` +
    `For "alter": founding year. For "management": CEO. Unknown = "".`
  );
  return parseJSON(text, 'industry');
}

async function fetchLeistungsdaten(name, sport) {
  const sportSites = {
    'fußball': 'transfermarkt.de und sofascore.com',
    'basketball': 'basketball-reference.com und nba.com',
    'tennis': 'atptour.com und wtatennis.com',
    'golf': 'pgatour.com und dpworldtour.com',
    'handball': 'handball-bundesliga.de',
  };
  const s = sport?.toLowerCase() || '';
  const sites = Object.entries(sportSites).find(([k]) => s.includes(k))?.[1] || 'Google und Wikipedia';
  const text = await claudeAPI(
    `Search ${sites} for current season statistics of "${name}" (sport: ${sport||'unknown'}). ` +
    `Return ONLY valid JSON: {"stats":"3-4 bullet points in German e.g. • 14 Tore / 9 Assists\n• Marktwert: 25 Mio €\n• Nationalmannschaft: 8 Einsätze"} No other text.`
  );
  return parseJSON(text, 'stats');
}

function InstaCard({ item, upd }) {
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const stats = item.instaStats || null;
  const handle = (item.instaHandle||'').replace('@','').trim();
  const profileUrl = handle ? `https://instagram.com/${handle}` : null;
  const socialBladeUrl = handle ? `https://socialblade.com/instagram/user/${handle}` : null;

  const doFetch = async (h) => {
    setLoading(true);
    const f = await fetchInstaStats(h);
    if (f) upd(item.id, 'instaStats', f);
    setLoading(false);
  };

  const handleInput = (val) => {
    upd(item.id, 'instaHandle', val);
    const clean = val.replace('@','').trim();
    if (timerRef.current) clearTimeout(timerRef.current);
    if (clean.length > 2) timerRef.current = setTimeout(()=>doFetch(clean), 1500);
  };

  return (
    <div style={{gridColumn:'span 2',borderRadius:'0.8rem',overflow:'hidden',border:'1px solid rgba(225,48,108,0.3)',background:'#0a0a0a',marginTop:'0.2rem'}}>
      <div style={{padding:'0.6rem 1rem',display:'flex',alignItems:'center',gap:'0.6rem',borderBottom:'1px solid rgba(255,255,255,0.05)',background:'linear-gradient(90deg,rgba(225,48,108,0.1),transparent)'}}>
        <div style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Instagram size={11} color="#fff"/>
        </div>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.62rem',fontWeight:900,color:'#fff',letterSpacing:'0.15em',textTransform:'uppercase'}}>Instagram</span>
        {loading && <span style={{marginLeft:'auto',fontSize:'0.45rem',color:'#E1306C',fontWeight:700,display:'flex',alignItems:'center',gap:'0.3rem',textTransform:'uppercase'}}><Loader size={10} style={{animation:'spin 1s linear infinite'}}/>Sucht…</span>}
        {!loading && stats && stats.followers!=='N/A' && <span style={{marginLeft:'auto',fontSize:'0.42rem',color:'#2ecc71',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.2em'}}>● Live</span>}
        {!loading && handle && <button onClick={()=>doFetch(handle)} style={{marginLeft:(!stats||stats.followers==='N/A')?'auto':'0.4rem',background:'none',border:'none',cursor:'pointer',color:'#888',fontSize:'0.42rem',fontWeight:700,textTransform:'uppercase',fontFamily:"'Barlow',sans-serif",padding:0}}>↻ Aktualisieren</button>}
      </div>
      <div style={{padding:'0.6rem 1rem',borderBottom:stats?'1px solid rgba(255,255,255,0.05)':'none',display:'flex',alignItems:'center',gap:'0.5rem'}}>
        <span style={{color:'#E1306C',fontSize:'0.85rem',fontWeight:700,flexShrink:0}}>@</span>
        <input style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'0.4rem',padding:'0.3rem 0.55rem',fontSize:'0.74rem',fontWeight:600,color:'#fff',outline:'none',fontFamily:"'Barlow',sans-serif"}}
          value={handle} onChange={e=>handleInput(e.target.value)} placeholder="username — Stats werden auto-geladen"/>
        {profileUrl && <a href={profileUrl} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',gap:'0.3rem',background:'linear-gradient(45deg,#dc2743,#cc2366)',color:'#fff',textDecoration:'none',padding:'0.3rem 0.65rem',borderRadius:'0.4rem',fontSize:'0.55rem',fontWeight:700,whiteSpace:'nowrap',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase'}}>Profil <ExternalLink size={9}/></a>}
      </div>
      {stats && stats.followers!=='N/A' && (
        <div style={{padding:'0.75rem 1rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'0.75rem'}}>
            <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(45deg,#f09433,#E1306C)',padding:2,flexShrink:0}}>
              <div style={{width:'100%',height:'100%',borderRadius:'50%',background:'#111',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
                {item.image?<img src={item.image} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:`${item.imgX??50}% ${item.imgY??50}%`}} alt=""/>:<User size={16} color="#444"/>}
              </div>
            </div>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.3rem'}}>
                <span style={{fontSize:'0.75rem',fontWeight:700,color:'#fff'}}>@{handle}</span>
                {stats.verified&&<span style={{fontSize:'0.65rem',color:'#0095f6'}}>✓</span>}
              </div>
              {stats.bio&&<div style={{fontSize:'0.58rem',color:'#aaa',lineHeight:1.4,marginTop:'0.1rem'}}>{stats.bio}</div>}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.45rem',marginBottom:'0.6rem'}}>
            {[{l:'Follower',v:stats.followers},{l:'Following',v:stats.following},{l:'Posts',v:stats.posts}].map(s=>
              <div key={s.l} style={{background:'rgba(255,255,255,0.04)',borderRadius:'0.45rem',padding:'0.45rem',textAlign:'center'}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1rem',fontWeight:900,fontStyle:'italic',color:'#fff',lineHeight:1}}>{s.v}</div>
                <div style={{fontSize:'0.45rem',color:'#666',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',marginTop:'0.15rem'}}>{s.l}</div>
              </div>
            )}
          </div>
          {socialBladeUrl&&<a href={socialBladeUrl} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'0.35rem',padding:'0.35rem',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'0.45rem',textDecoration:'none',fontSize:'0.5rem',color:'#888',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',fontFamily:"'Barlow',sans-serif"}}><ExternalLink size={9}/> Social Blade — vollständige Statistiken</a>}
        </div>
      )}
      {stats&&stats.followers==='N/A'&&handle&&(
        <div style={{padding:'0.65rem 1rem',fontSize:'0.6rem',color:'#666',textAlign:'center'}}>
          Keine Daten für @{handle}
          {socialBladeUrl&&<a href={socialBladeUrl} target="_blank" rel="noopener noreferrer" style={{color:'#D4AF37',textDecoration:'none',marginLeft:'0.4rem'}}>Social Blade ↗</a>}
        </div>
      )}
    </div>
  );
}

export default function FiveAsideMasterApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [brandSubTab, setBrandSubTab] = useState('brands');
  const [view, setView] = useState('grid');
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [db, setDb] = useState(null);
  const [imgAdjusted, setImgAdjusted] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [leistungLoading, setLeistungLoading] = useState({});
  const [quickName, setQuickName] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const rowId = useRef(null);
  const fileInputRef = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data, error } = await supabase.from('data_store').select('id, content').limit(1).single();
        if (error) throw error;
        if (data) { rowId.current = data.id; setDb({ athletes:[], brands:[], rightsholder:[], ...data.content }); }
      } catch { setLoadError(true); }
      setLoading(false);
    };
    init();
    const ch = supabase.channel('db-changes')
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'data_store' },
        p => setDb({ athletes:[], brands:[], rightsholder:[], ...p.new.content }))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const sync = (newDb) => {
    setDb(newDb);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from('data_store').update({ content: newDb }).eq('id', rowId.current);
    }, 800);
  };

  const listKey = activeTab==='athletes' ? 'athletes' : brandSubTab==='rightsholder' ? 'rightsholder' : 'brands';
  const cfg = activeTab==='athletes' ? ATHLETE_CFG : brandSubTab==='rightsholder' ? RIGHTSHOLDER_CFG : BRAND_CFG;
  const list = (db||{})[listKey] || [];
  const item = list.find(i=>i.id===selectedId);
  const ranked = [...list].sort((a,b) => {
    const sk=cfg.map(c=>c.k);
    return (b.scores[sk[1]]+b.scores[sk[2]]) - (a.scores[sk[1]]+a.scores[sk[2]]);
  });

  const upd = (id, field, val) => {
    const newList = ((db||{})[listKey]||[]).map(i=>i.id===id?{...i,[field]:val}:i);
    sync({ ...db, [listKey]:newList });
  };

  const updMulti = (id, fields) => {
    const newList = ((db||{})[listKey]||[]).map(i=>i.id===id?{...i,...fields}:i);
    sync({ ...db, [listKey]:newList });
  };

  const doAutoFill = async (id) => {
    const it = ((db||{})[listKey]||[]).find(i=>i.id===id);
    if (!it) return;
    setAiLoading(prev=>({...prev,[id]:true}));
    const isAthlete = activeTab==='athletes';
    const data = isAthlete ? await fetchAthleteAutofill(it.name) : await fetchBrandAutofill(it.name);
    if (data) {
      const fields = {};
      if (isAthlete) {
        if (data.sport) fields.sport = data.sport;
        if (data.league) fields.league = data.league;
      } else {
        if (data.industry) fields.industry = data.industry;
        if (data.focus) fields.focus = data.focus;
      }
      if (data.alter) fields.alter = String(data.alter);
      if (data.management) fields.management = data.management;
      if (data.erfolge) fields.erfolge = data.erfolge;
      if (data.leistungsdaten) fields.leistungsdaten = data.leistungsdaten;
      if (data.instaHandle && !it.instaHandle) fields.instaHandle = data.instaHandle;
      if (data.imageUrl && !it.image) fields.aiImageUrl = data.imageUrl;
      updMulti(id, fields);
      const handleToFetch = data.instaHandle || it.instaHandle;
      if (handleToFetch) {
        const insta = await fetchInstaStats(handleToFetch.replace('@','').trim());
        if (insta) updMulti(id, { ...fields, instaHandle: handleToFetch, instaStats: insta });
      }
    }
    setAiLoading(prev=>({...prev,[id]:false}));
  };

  const addNew = () => {
    const n = { id:Date.now(), name:'Neuer Eintrag', image:null, imgX:50, imgY:50, alter:'', spielklasse:'', erfolge:'', management:'', leistungsdaten:'', instaHandle:'', instaStats:null, aiImageUrl:'', scores:cfg.reduce((a,c)=>({...a,[c.k]:5}),{}) };
    if (activeTab==='athletes') { n.sport='Sportart'; n.league='Liga'; } else { n.industry='Branche'; n.focus='Fokus'; }
    sync({ ...db, [listKey]:[...((db||{})[listKey]||[]),n] });
    setSelectedId(n.id); setView('detail');
  };

  const addFromName = async () => {
    if (!quickName.trim()) return;
    setQuickLoading(true);
    const n = { id:Date.now(), name:quickName.trim(), image:null, imgX:50, imgY:50, alter:'', spielklasse:'', erfolge:'', management:'', leistungsdaten:'', instaHandle:'', instaStats:null, aiImageUrl:'', scores:cfg.reduce((a,c)=>({...a,[c.k]:5}),{}) };
    if (activeTab==='athletes') { n.sport=''; n.league=''; } else { n.industry=''; n.focus=''; }
    const newDb = { ...db, [listKey]:[...((db||{})[listKey]||[]),n] };
    sync(newDb); setSelectedId(n.id); setView('detail'); setQuickName(''); setQuickLoading(false);
    setTimeout(()=>doAutoFill(n.id), 400);
  };

  const refreshLeistung = async (id) => {
    const it = ((db||{})[listKey]||[]).find(i=>i.id===id); if(!it) return;
    setLeistungLoading(prev=>({...prev,[id]:true}));
    const result = await fetchLeistungsdaten(it.name, it.sport||it.industry);
    if (result?.stats) upd(id, 'leistungsdaten', result.stats);
    setLeistungLoading(prev=>({...prev,[id]:false}));
  };

  const del = (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Eintrag wirklich löschen?')) return;
    sync({ ...db, [listKey]:((db||{})[listKey]||[]).filter(i=>i.id!==id) });
    if (view==='detail') setView('grid');
  };

  const sc = item ? calcScores(item.scores, cfg) : {synergie:0,impact:0,total:0};
  const qid = item ? getQid(sc.synergie, sc.impact) : 'bl';
  const qdata = QUADRANTS.find(q=>q.id===qid);
  const dotX = item ? (sc.synergie/10)*100 : 50;
  const dotY = item ? ((10-sc.impact)/10)*100 : 50;

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#191919',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1rem'}}>
      <RefreshCw color="#D4AF37" size={36} style={{animation:'spin 1s linear infinite'}}/>
      <p style={{fontFamily:'"Barlow Condensed",sans-serif',fontWeight:900,fontStyle:'italic',textTransform:'uppercase',letterSpacing:'0.4em',fontSize:'0.75rem',color:'#D4AF37'}}>Connecting to Five Aside Cloud…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (loadError||!db) return (
    <div style={{minHeight:'100vh',background:'#191919',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1rem'}}>
      <p style={{fontFamily:'"Barlow Condensed",sans-serif',fontWeight:900,fontStyle:'italic',textTransform:'uppercase',letterSpacing:'0.3em',fontSize:'0.75rem',color:'#ff3b3b'}}>Verbindungsfehler — Seite neu laden</p>
      <button onClick={()=>window.location.reload()} style={{background:'#D4AF37',border:'none',color:'#000',padding:'0.6rem 1.4rem',borderRadius:'0.6rem',fontFamily:'"Barlow Condensed",sans-serif',fontWeight:900,fontSize:'0.8rem',cursor:'pointer'}}>Neu laden</button>
    </div>
  );

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,700;0,900;1,700;1,900&family=Barlow:wght@400;500;600;700&display=swap');
    *{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;box-sizing:border-box;}
    body{margin:0;background:#191919;font-family:'Barlow',sans-serif;}
    .wrap{width:100%;max-width:1440px;margin:0 auto;padding:2rem 3rem;}
    .app-header{display:flex;justify-content:space-between;align-items:center;padding:1rem 3rem;border-bottom:1px solid rgba(255,255,255,0.08);background:#191919;position:sticky;top:0;z-index:100;}
    .logo-img{height:160px;width:auto;object-fit:contain;cursor:pointer;}
    .logo-fallback{font-family:'Barlow Condensed',sans-serif;font-size:2.8rem;font-weight:900;font-style:italic;color:#D4AF37;text-transform:uppercase;letter-spacing:-0.03em;cursor:pointer;line-height:1;}
    .logo-sub{display:flex;align-items:center;gap:0.4rem;margin-top:0.3rem;}
    .dot{width:6px;height:6px;background:#2ecc71;border-radius:50%;animation:pulseDot 2s infinite;}
    @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:.4}}
    .logo-sub span{font-size:0.5rem;text-transform:uppercase;letter-spacing:0.4em;font-weight:700;color:#666;}
    .tab-switcher{display:flex;background:rgba(0,0,0,0.6);padding:0.3rem;border-radius:0.9rem;border:1px solid rgba(255,255,255,0.12);}
    .tab-btn{padding:0.6rem 1.5rem;border-radius:0.6rem;font-family:'Barlow Condensed',sans-serif;font-size:0.7rem;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:0.1em;border:none;cursor:pointer;transition:all 0.2s;color:#666;background:transparent;white-space:nowrap;}
    .tab-btn.active{background:#D4AF37;color:#000;}
    .tab-btn:not(.active):hover{color:#fff;}
    .sub-switcher{display:inline-flex;background:rgba(0,0,0,0.4);padding:0.25rem;border-radius:0.7rem;border:1px solid rgba(255,255,255,0.08);margin-bottom:1.5rem;}
    .sub-btn{padding:0.45rem 1.4rem;border-radius:0.5rem;font-family:'Barlow Condensed',sans-serif;font-size:0.65rem;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:0.1em;border:none;cursor:pointer;transition:all 0.2s;color:#666;background:transparent;}
    .sub-btn.active{background:rgba(212,175,55,0.15);color:#D4AF37;border:1px solid rgba(212,175,55,0.3);}
    .sub-btn:not(.active):hover{color:#fff;}
    .home-grid{display:grid;grid-template-columns:1fr 1fr;gap:2rem;max-width:900px;margin:5rem auto 0;}
    .home-card{background:#1E1E1E;border:1px solid rgba(255,255,255,0.14);border-radius:2.5rem;padding:4.5rem 2rem;display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:all 0.25s;text-align:center;}
    .home-card:hover{border-color:#D4AF37;transform:translateY(-3px);}
    .home-card:hover .hicon{color:#D4AF37;transform:scale(1.1);}
    .home-icon-wrap{width:80px;height:80px;background:#000;border-radius:1.2rem;display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem;border:1px solid rgba(255,255,255,0.1);}
    .hicon{color:#444;transition:all 0.25s;}
    .home-card h3{font-family:'Barlow Condensed',sans-serif;font-size:2rem;font-weight:900;font-style:italic;text-transform:uppercase;color:#fff;letter-spacing:-0.01em;}
    .grid-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;}
    .grid-title{font-family:'Barlow Condensed',sans-serif;font-size:2.4rem;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:-0.02em;color:#fff;}
    .quick-add-row{display:flex;gap:0.6rem;margin-bottom:1.8rem;align-items:center;}
    .quick-input{flex:1;max-width:380px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.12);border-radius:0.8rem;padding:0.65rem 1rem;font-size:0.82rem;font-weight:600;color:#fff;outline:none;font-family:'Barlow',sans-serif;transition:border-color 0.2s;}
    .quick-input:focus{border-color:#D4AF37;}
    .quick-input::placeholder{color:#555;}
    .btn-ai{display:flex;align-items:center;gap:0.4rem;background:linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.08));border:1px solid rgba(212,175,55,0.4);color:#D4AF37;padding:0.65rem 1.2rem;border-radius:0.8rem;font-family:'Barlow Condensed',sans-serif;font-size:0.75rem;font-weight:900;font-style:italic;text-transform:uppercase;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
    .btn-ai:hover{background:rgba(212,175,55,0.25);}
    .btn-ai:disabled{opacity:0.5;cursor:not-allowed;}
    .btn-add{display:flex;align-items:center;gap:0.5rem;background:#D4AF37;color:#000;border:none;padding:0.65rem 1.4rem;border-radius:0.8rem;font-family:'Barlow Condensed',sans-serif;font-size:0.78rem;font-weight:900;font-style:italic;text-transform:uppercase;cursor:pointer;transition:all 0.2s;}
    .btn-add:hover{background:#fff;}
    .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1.4rem;}
    .item-card{background:#1E1E1E;border:1px solid rgba(255,255,255,0.14);border-radius:1.6rem;padding:1.2rem;cursor:pointer;transition:all 0.25s;position:relative;}
    .item-card:hover{border-color:#D4AF37;transform:translateY(-2px);}
    .rank-badge{position:absolute;top:-10px;right:-10px;width:38px;height:38px;background:#D4AF37;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:0.8rem;color:#000;z-index:2;box-shadow:0 4px 16px rgba(212,175,55,0.5);}
    .card-img{aspect-ratio:1;background:#111;border-radius:1.2rem;margin-bottom:1rem;overflow:hidden;border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;}
    .card-img img{width:100%;height:100%;object-fit:cover;}
    .card-name{font-family:'Barlow Condensed',sans-serif;font-size:1.15rem;font-weight:700;font-style:italic;margin-bottom:0.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color 0.2s;color:#fff;}
    .item-card:hover .card-name{color:#D4AF37;}
    .card-sub{font-size:0.52rem;text-transform:uppercase;letter-spacing:0.2em;font-weight:700;color:#666;margin-bottom:0.6rem;}
    .card-footer{display:flex;justify-content:space-between;align-items:center;padding-top:0.6rem;border-top:1px solid rgba(255,255,255,0.06);}
    .card-delete-btn{background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.48rem;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#5a1a1a;transition:color 0.2s;font-family:'Barlow',sans-serif;padding:0;}
    .card-delete-btn:hover{color:#ff3b3b;}
    .detail-wrap{display:grid;grid-template-columns:440px 1fr;gap:1.5rem;animation:fadeUp 0.35s ease both;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @media(max-width:960px){.detail-wrap{grid-template-columns:1fr;}}
    .panel{background:#1E1E1E;border:1px solid rgba(255,255,255,0.14);border-radius:1.8rem;padding:1.8rem;}
    .back-btn{background:none;border:none;color:#666;cursor:pointer;display:flex;align-items:center;gap:0.4rem;font-size:0.55rem;font-weight:700;text-transform:uppercase;letter-spacing:0.3em;margin-bottom:1.2rem;transition:color 0.2s;font-family:'Barlow',sans-serif;}
    .back-btn:hover{color:#D4AF37;}
    .profile-row{display:flex;gap:1rem;align-items:flex-start;margin-bottom:0.8rem;}
    .avatar-wrap{position:relative;flex-shrink:0;}
    .avatar{width:88px;height:88px;background:#000;border-radius:1.2rem;overflow:hidden;border:1px solid rgba(255,255,255,0.14);display:flex;align-items:center;justify-content:center;}
    .avatar img{width:100%;height:100%;object-fit:cover;}
    .avatar-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.75);border-radius:1.2rem;display:flex;align-items:center;justify-content:center;opacity:0;cursor:pointer;transition:opacity 0.2s;}
    .avatar-wrap:hover .avatar-overlay{opacity:1;}
    .name-input{width:100%;background:transparent;font-family:'Barlow Condensed',sans-serif;font-size:1.9rem;font-weight:900;font-style:italic;color:#D4AF37;letter-spacing:-0.02em;border:none;border-bottom:1px solid rgba(255,255,255,0.1);outline:none;margin-bottom:0.3rem;padding-bottom:0.2rem;transition:border-color 0.2s;}
    .name-input:focus{border-color:#D4AF37;}
    .ai-fill-btn{display:flex;align-items:center;gap:0.35rem;background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);border-radius:0.4rem;padding:0.25rem 0.7rem;font-size:0.52rem;font-weight:700;color:#D4AF37;cursor:pointer;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:0.08em;transition:all 0.2s;margin-top:0.3rem;}
    .ai-fill-btn:hover{background:rgba(212,175,55,0.2);}
    .ai-fill-btn:disabled{opacity:0.5;cursor:not-allowed;}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-top:0.6rem;}
    .meta-field{display:flex;flex-direction:column;gap:0.25rem;}
    .meta-label{font-size:0.52rem;text-transform:uppercase;letter-spacing:0.25em;font-weight:700;color:#888;}
    .meta-input{background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.12);border-radius:0.5rem;padding:0.4rem 0.7rem;font-size:0.78rem;font-weight:600;color:#fff;outline:none;font-family:'Barlow',sans-serif;transition:border-color 0.2s;width:100%;}
    .meta-input:focus{border-color:#D4AF37;color:#D4AF37;}
    .meta-textarea{background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.12);border-radius:0.5rem;padding:0.5rem 0.7rem;font-size:0.78rem;font-weight:500;color:#fff;outline:none;font-family:'Barlow',sans-serif;transition:border-color 0.2s;width:100%;resize:vertical;min-height:80px;line-height:1.6;}
    .meta-textarea:focus{border-color:#D4AF37;color:#D4AF37;}
    .meta-full{grid-column:span 2;}
    .ai-img-preview{grid-column:span 2;background:rgba(0,0,0,0.3);border:1px solid rgba(212,175,55,0.25);border-radius:0.6rem;padding:0.7rem;display:flex;gap:0.8rem;align-items:center;}
    .ai-img-thumb{width:60px;height:60px;border-radius:0.5rem;object-fit:cover;border:1px solid rgba(255,255,255,0.1);flex-shrink:0;background:#111;}
    .leistung-box{grid-column:span 2;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);border-radius:0.6rem;padding:0.7rem 0.9rem;}
    .leistung-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;}
    .leistung-refresh{display:flex;align-items:center;gap:0.3rem;background:none;border:1px solid rgba(212,175,55,0.25);border-radius:0.35rem;padding:0.18rem 0.55rem;font-size:0.48rem;font-weight:700;color:#D4AF37;cursor:pointer;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:0.08em;transition:all 0.2s;}
    .leistung-refresh:hover{background:rgba(212,175,55,0.1);}
    .leistung-refresh:disabled{opacity:0.5;cursor:not-allowed;}
    .leistung-empty{font-size:0.65rem;color:#555;font-style:italic;}
    .img-pos-wrap{grid-column:span 2;display:flex;flex-direction:column;gap:0.5rem;}
    .img-preview-box{position:relative;width:100%;aspect-ratio:16/7;background:#000;border-radius:0.8rem;overflow:hidden;border:1px solid rgba(255,255,255,0.12);}
    .img-preview-box img{width:100%;height:100%;object-fit:cover;pointer-events:none;}
    .img-pos-controls{display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;}
    .pos-field{display:flex;flex-direction:column;gap:0.2rem;}
    .section-label{font-size:0.52rem;font-weight:900;text-transform:uppercase;letter-spacing:0.4em;color:#888;margin-bottom:1rem;margin-top:0.8rem;}
    .slider-item{margin-bottom:1.1rem;}
    .slider-top{display:flex;align-items:baseline;gap:0.5rem;margin-bottom:0.4rem;flex-wrap:wrap;}
    .slider-main-label{font-family:'Barlow Condensed',sans-serif;font-size:0.88rem;font-weight:700;font-style:italic;color:#fff;}
    .slider-sub-label{font-size:0.62rem;color:#fff;font-weight:500;opacity:0.5;}
    .slider-right{margin-left:auto;display:flex;align-items:baseline;gap:0.5rem;}
    .slider-pct{font-size:0.6rem;color:#888;font-weight:600;}
    .slider-val{font-family:'Barlow Condensed',sans-serif;font-size:1.7rem;font-weight:900;font-style:italic;color:#D4AF37;line-height:1;}
    .gesamtscore{background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);border-radius:1.2rem;padding:1.1rem 1.3rem;margin-top:0.9rem;}
    .gs-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.8rem;}
    .gs-title{font-size:0.5rem;font-weight:900;text-transform:uppercase;letter-spacing:0.35em;color:#888;}
    .gs-grade{font-family:'Barlow Condensed',sans-serif;font-size:2.3rem;font-weight:900;font-style:italic;color:rgba(255,255,255,0.07);line-height:1;}
    .gs-score{font-family:'Barlow Condensed',sans-serif;font-size:2.1rem;font-weight:900;font-style:italic;color:#D4AF37;line-height:1;}
    .gs-score span{font-size:0.85rem;color:#888;font-style:normal;}
    .gs-bars{display:flex;flex-direction:column;gap:0.38rem;}
    .gs-bar-row{display:flex;align-items:center;gap:0.5rem;}
    .gs-bar-key{font-size:0.5rem;font-weight:700;text-transform:uppercase;color:#888;width:18px;flex-shrink:0;}
    .gs-bar-track{flex:1;height:3px;background:#000;border-radius:999px;overflow:hidden;}
    .gs-bar-fill{height:100%;background:#D4AF37;border-radius:999px;transition:width 0.5s ease;}
    .right-col{display:flex;flex-direction:column;gap:1rem;}
    .matrix-panel{background:#1E1E1E;border:1px solid rgba(255,255,255,0.14);border-radius:1.8rem;padding:1.5rem;flex:1;display:flex;flex-direction:column;}
    .matrix-header{font-size:0.5rem;font-weight:900;text-transform:uppercase;letter-spacing:0.4em;color:#888;margin-bottom:1rem;}
    .matrix-with-yaxis{display:flex;width:100%;gap:0.5rem;}
    .y-axis-label{writing-mode:vertical-rl;transform:rotate(180deg);font-size:0.46rem;font-weight:700;text-transform:uppercase;letter-spacing:0.22em;color:#888;white-space:nowrap;align-self:center;}
    .matrix-inner{flex:1;display:flex;flex-direction:column;}
    .matrix-canvas{position:relative;width:100%;aspect-ratio:1;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:0.8rem;overflow:hidden;}
    .mline-h{position:absolute;left:0;right:0;border-top:1px solid rgba(255,255,255,0.04);}
    .mline-v{position:absolute;top:0;bottom:0;border-left:1px solid rgba(255,255,255,0.04);}
    .mline-center-h{position:absolute;top:50%;left:0;right:0;border-top:1px solid rgba(255,255,255,0.1);}
    .mline-center-v{position:absolute;left:50%;top:0;bottom:0;border-left:1px solid rgba(255,255,255,0.1);}
    .quad-label{position:absolute;font-size:0.52rem;font-weight:600;text-align:center;line-height:1.4;pointer-events:none;white-space:pre-line;}
    .matrix-dot{position:absolute;width:18px;height:18px;background:#D4AF37;border-radius:50%;transform:translate(-50%,-50%);border:2px solid #000;box-shadow:0 0 30px rgba(212,175,55,0.8);transition:left 0.6s cubic-bezier(0.34,1.56,0.64,1),top 0.6s cubic-bezier(0.34,1.56,0.64,1);z-index:10;}
    @keyframes ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.2);opacity:0}}
    .matrix-dot::after{content:'';position:absolute;inset:-5px;border-radius:50%;border:1px solid rgba(212,175,55,0.25);animation:ring 2s infinite;}
    .x-ticks{display:flex;justify-content:space-between;padding:0.25rem 0 0;}
    .tick{font-size:0.44rem;color:rgba(255,255,255,0.18);font-weight:600;}
    .x-axis-label{text-align:center;font-size:0.48rem;font-weight:700;text-transform:uppercase;letter-spacing:0.22em;color:#888;margin-top:0.4rem;}
    .matrix-bottom-bar{display:flex;gap:1.2rem;padding:0.7rem 1rem;background:rgba(0,0,0,0.5);border-radius:0.8rem;margin-top:0.8rem;border:1px solid rgba(255,255,255,0.1);flex-wrap:wrap;align-items:center;}
    .mbb-item{display:flex;align-items:center;gap:0.4rem;}
    .mbb-label{font-size:0.48rem;font-weight:700;text-transform:uppercase;letter-spacing:0.28em;color:#888;}
    .mbb-val{font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:900;font-style:italic;color:#D4AF37;}
    .qh-box{margin-left:auto;display:flex;align-items:flex-start;background:#111;border:1px solid rgba(212,175,55,0.3);border-radius:0.6rem;padding:0.55rem 0.8rem;}
    .qh-title{font-size:0.55rem;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#D4AF37;margin-bottom:0.15rem;}
    .qh-strat{font-size:0.6rem;font-weight:700;color:#fff;margin-bottom:0.1rem;}
    .qh-desc{font-size:0.55rem;color:#aaa;line-height:1.4;max-width:220px;}
    .btn-delete-detail{background:none;border:none;color:#5a1a1a;display:flex;align-items:center;gap:0.4rem;font-size:0.52rem;font-weight:700;text-transform:uppercase;letter-spacing:0.22em;cursor:pointer;transition:color 0.2s;font-family:'Barlow',sans-serif;align-self:flex-end;margin-top:0.4rem;}
    .btn-delete-detail:hover{color:#ff3b3b;}
    input[type=range]{width:100%;height:3px;background:#000;border-radius:999px;outline:none;cursor:pointer;-webkit-appearance:none;accent-color:#D4AF37;}
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:#D4AF37;border:2px solid #000;box-shadow:0 0 8px rgba(212,175,55,0.5);}
    .ai-loading-bar{grid-column:span 2;display:flex;align-items:center;gap:0.6rem;padding:0.65rem 0.9rem;background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.2);border-radius:0.6rem;font-size:0.62rem;color:#D4AF37;font-weight:600;}
  `;

  return (
    <div style={{background:'#191919',minHeight:'100vh',color:'#fff'}}>
      <style>{CSS}</style>
      <header className="app-header">
        <div onClick={()=>{setActiveTab('home');setView('grid');}} style={{cursor:'pointer'}}>
          <img src={LOGO_SRC} alt="Five Aside" className="logo-img"
            onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='block';}}/>
          <div className="logo-fallback" style={{display:'none'}}>Five Aside</div>
          <div className="logo-sub"><div className="dot"/><span>Cloud Matrix Live</span></div>
        </div>
        {activeTab !== 'home' && (
          <div className="tab-switcher">
            <button className={'tab-btn'+(activeTab==='athletes'?' active':'')} onClick={()=>{setActiveTab('athletes');setView('grid');}}>Athlete Matrix</button>
            <button className={'tab-btn'+(activeTab==='brands'?' active':'')} onClick={()=>{setActiveTab('brands');setView('grid');}}>Brands / Rightsholder Matrix</button>
          </div>
        )}
      </header>

      <div className="wrap">
        {activeTab === 'home' && (
          <div className="home-grid">
            <div className="home-card" onClick={()=>setActiveTab('athletes')}>
              <div className="home-icon-wrap"><div className="hicon"><Users size={40}/></div></div>
              <h3>Athlete Matrix</h3>
            </div>
            <div className="home-card" onClick={()=>setActiveTab('brands')}>
              <div className="home-icon-wrap"><div className="hicon"><Building2 size={40}/></div></div>
              <h3>Brands / Rightsholder Matrix</h3>
            </div>
          </div>
        )}

        {activeTab === 'brands' && view === 'grid' && (
          <div className="sub-switcher">
            <button className={'sub-btn'+(brandSubTab==='brands'?' active':'')} onClick={()=>setBrandSubTab('brands')}>Brands</button>
            <button className={'sub-btn'+(brandSubTab==='rightsholder'?' active':'')} onClick={()=>setBrandSubTab('rightsholder')}>Rightsholder</button>
          </div>
        )}

        {activeTab !== 'home' && view === 'grid' && (
          <>
            <div className="grid-header">
              <h2 className="grid-title">{activeTab==='athletes'?'Top Ranked Athletes':brandSubTab==='rightsholder'?'Top Ranked Rightsholder':'Top Ranked Brands'}</h2>
              <button className="btn-add" onClick={addNew}><Plus size={15} strokeWidth={3}/> Manuell</button>
            </div>
            <div className="quick-add-row">
              <input className="quick-input" value={quickName} onChange={e=>setQuickName(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&!quickLoading&&quickName.trim()&&addFromName()}
                placeholder={activeTab==='athletes'?'Athleten-Name → KI füllt alle Felder automatisch…':'Brand/Rightsholder-Name → KI füllt alle Felder automatisch…'}/>
              <button className="btn-ai" onClick={addFromName} disabled={quickLoading||!quickName.trim()}>
                {quickLoading?<><Loader size={13} style={{animation:'spin 1s linear infinite'}}/> Erstellt…</>:<><Zap size={13}/> KI-Schnellerstellung</>}
              </button>
            </div>
            <div className="cards-grid">
              {ranked.map((it, idx) => (
                <div key={it.id} className="item-card" onClick={()=>{setSelectedId(it.id);setView('detail');setImgAdjusted({});}}>
                  <div className="rank-badge">#{idx+1}</div>
                  <div className="card-img">
                    {it.image?<img src={it.image} alt={it.name} style={{objectPosition:`${it.imgX??50}% ${it.imgY??50}%`}}/>:
                     it.aiImageUrl?<img src={it.aiImageUrl} alt={it.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:
                     <User size={52} color="#333"/>}
                  </div>
                  <div className="card-name">{it.name}</div>
                  <div className="card-sub">{activeTab==='athletes'?`${it.sport||''}${it.league?' · '+it.league:''}`:it.industry||''}</div>
                  <div className="card-footer">
                    <span style={{fontSize:'0.48rem',color:'#555',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.12em'}}>Score {calcScores(it.scores,cfg).total.toFixed(1)}</span>
                    <button className="card-delete-btn" onClick={e=>del(it.id,e)}><Trash2 size={11}/> Löschen</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab !== 'home' && view === 'detail' && item && (
          <div className="detail-wrap">
            <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
              <div className="panel">
                <button className="back-btn" onClick={()=>setView('grid')}><ChevronLeft size={13}/> Back to Dashboard</button>
                <div className="profile-row">
                  <div className="avatar-wrap">
                    <div className="avatar">
                      {item.image?<img src={item.image} alt={item.name} style={{objectPosition:`${item.imgX??50}% ${item.imgY??50}%`}}/>:
                       item.aiImageUrl?<img src={item.aiImageUrl} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:
                       <User size={36} color="#333"/>}
                    </div>
                    <input type="file" style={{display:'none'}} ref={fileInputRef} onChange={e=>{
                      const f=e.target.files[0]; if(!f) return;
                      const r=new FileReader();
                      r.onloadend=()=>{ upd(item.id,'image',r.result); setImgAdjusted(prev=>({...prev,[item.id]:false})); };
                      r.readAsDataURL(f);
                    }}/>
                    <div className="avatar-overlay" onClick={()=>fileInputRef.current.click()}><Upload size={18} color="#fff"/></div>
                  </div>
                  <div style={{flex:1}}>
                    <input className="name-input" value={item.name} onChange={e=>upd(item.id,'name',e.target.value)}/>
                    <button className="ai-fill-btn" onClick={()=>doAutoFill(item.id)} disabled={!!aiLoading[item.id]}>
                      {aiLoading[item.id]?<><Loader size={11} style={{animation:'spin 1s linear infinite'}}/> KI sucht…</>:<><Search size={11}/> KI-Autofill alle Felder</>}
                    </button>
                  </div>
                </div>

                {aiLoading[item.id] && (
                  <div className="ai-loading-bar">
                    <Loader size={13} style={{animation:'spin 1s linear infinite',flexShrink:0}}/>
                    KI sucht aktuelle Daten für {item.name}… ca. 15–20 Sekunden
                  </div>
                )}

                {item.aiImageUrl && !item.image && (
                  <div className="ai-img-preview">
                    <img src={item.aiImageUrl} alt="KI Vorschlag" className="ai-img-thumb" onError={e=>e.target.style.display='none'}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'0.52rem',color:'#D4AF37',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:'0.3rem'}}>KI-Bild Vorschlag</div>
                      <div style={{fontSize:'0.6rem',color:'#888',marginBottom:'0.5rem'}}>Von KI gefunden — oder eigenes Bild hochladen.</div>
                      <div style={{display:'flex',gap:'0.5rem'}}>
                        <button onClick={()=>fileInputRef.current.click()} style={{background:'#D4AF37',border:'none',color:'#000',padding:'0.25rem 0.7rem',borderRadius:'0.35rem',fontSize:'0.52rem',fontWeight:700,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase'}}>Eigenes hochladen</button>
                        <button onClick={()=>upd(item.id,'aiImageUrl','')} style={{background:'none',border:'1px solid rgba(255,255,255,0.15)',color:'#888',padding:'0.25rem 0.7rem',borderRadius:'0.35rem',fontSize:'0.52rem',fontWeight:700,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase'}}>Verwerfen</button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="meta-grid">
                  <div className="meta-field">
                    <div className="meta-label">{activeTab==='athletes'?'Sportart':'Branche'}</div>
                    <input className="meta-input" value={activeTab==='athletes'?(item.sport||''):(item.industry||'')} onChange={e=>upd(item.id,activeTab==='athletes'?'sport':'industry',e.target.value)}/>
                  </div>
                  <div className="meta-field">
                    <div className="meta-label">Alter</div>
                    <input className="meta-input" value={item.alter||''} onChange={e=>upd(item.id,'alter',e.target.value)}/>
                  </div>
                  <div className="meta-field">
                    <div className="meta-label">{activeTab==='athletes'?'Verein / Team':'Fokus'}</div>
                    <input className="meta-input" value={activeTab==='athletes'?(item.league||''):(item.focus||'')} onChange={e=>upd(item.id,activeTab==='athletes'?'league':'focus',e.target.value)}/>
                  </div>
                  <div className="meta-field">
                    <div className="meta-label">Management</div>
                    <input className="meta-input" value={item.management||''} onChange={e=>upd(item.id,'management',e.target.value)}/>
                  </div>
                  <div className="meta-field meta-full">
                    <div className="meta-label">Erfolge</div>
                    <textarea className="meta-textarea" value={item.erfolge||''} onChange={e=>upd(item.id,'erfolge',e.target.value)} placeholder="Titel, Auszeichnungen, Erfolge…"/>
                  </div>
                  <div className="leistung-box">
                    <div className="leistung-header">
                      <div className="meta-label" style={{display:'flex',alignItems:'center',gap:'0.35rem'}}><Zap size={10} color="#D4AF37"/> Leistungsdaten</div>
                      <button className="leistung-refresh" onClick={()=>refreshLeistung(item.id)} disabled={!!leistungLoading[item.id]}>
                        {leistungLoading[item.id]?<><Loader size={9} style={{animation:'spin 1s linear infinite'}}/> Lädt…</>:<><RefreshCw size={9}/> KI-Update</>}
                      </button>
                    </div>
                    {item.leistungsdaten
                      ? <textarea style={{width:'100%',background:'transparent',border:'none',outline:'none',fontSize:'0.72rem',color:'#ccc',lineHeight:1.8,resize:'vertical',fontFamily:"'Barlow',sans-serif",minHeight:'60px',padding:0}}
                          value={item.leistungsdaten} onChange={e=>upd(item.id,'leistungsdaten',e.target.value)}/>
                      : <div className="leistung-empty">Noch keine Daten — „KI-Update" klicken für aktuelle Statistiken</div>
                    }
                  </div>
                  {item.image && !imgAdjusted[item.id] && (
                    <div className="img-pos-wrap">
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div className="meta-label" style={{display:'flex',alignItems:'center',gap:'0.4rem'}}><Move size={10} color="#888"/> Bildausschnitt anpassen</div>
                        <button onClick={()=>setImgAdjusted(prev=>({...prev,[item.id]:true}))}
                          style={{background:'rgba(212,175,55,0.15)',border:'1px solid rgba(212,175,55,0.3)',borderRadius:'0.4rem',padding:'0.2rem 0.7rem',fontSize:'0.52rem',fontWeight:700,color:'#D4AF37',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase',letterSpacing:'0.1em'}}>
                          ✓ Fertig
                        </button>
                      </div>
                      <div className="img-preview-box"><img src={item.image} alt="preview" style={{objectPosition:`${item.imgX??50}% ${item.imgY??50}%`}}/></div>
                      <div className="img-pos-controls">
                        <div className="pos-field">
                          <div className="meta-label">Horizontal ← →</div>
                          <input type="range" min={0} max={100} step={1} value={item.imgX??50} onChange={e=>upd(item.id,'imgX',parseInt(e.target.value))}/>
                        </div>
                        <div className="pos-field">
                          <div className="meta-label">Vertikal ↑ ↓</div>
                          <input type="range" min={0} max={100} step={1} value={item.imgY??50} onChange={e=>upd(item.id,'imgY',parseInt(e.target.value))}/>
                        </div>
                      </div>
                    </div>
                  )}
                  {item.image && imgAdjusted[item.id] && (
                    <div style={{gridColumn:'span 2'}}>
                      <button onClick={()=>setImgAdjusted(prev=>({...prev,[item.id]:false}))}
                        style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'0.4rem',padding:'0.22rem 0.7rem',fontSize:'0.48rem',fontWeight:700,color:'#666',cursor:'pointer',fontFamily:"'Barlow',sans-serif",textTransform:'uppercase',letterSpacing:'0.1em',display:'flex',alignItems:'center',gap:'0.3rem'}}>
                        <Move size={10}/> Bildausschnitt anpassen
                      </button>
                    </div>
                  )}
                  <InstaCard item={item} upd={upd}/>
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
                      onChange={e=>upd(item.id,'scores',{...item.scores,[c.k]:parseInt(e.target.value)})}/>
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
                    {cfg.map(c=>(
                      <div key={c.k} className="gs-bar-row">
                        <div className="gs-bar-key">{c.abbr}</div>
                        <div className="gs-bar-track"><div className="gs-bar-fill" style={{width:(item.scores[c.k]*10)+'%'}}/></div>
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
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.3rem',paddingBottom:'1.6rem'}}>
                    <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'space-between',alignItems:'flex-end',paddingRight:'0.2rem'}}>
                      {[10,8,6,4,2,0].map(n=><span key={n} className="tick">{n}</span>)}
                    </div>
                    <div className="y-axis-label">Markt-Impact</div>
                  </div>
                  <div className="matrix-inner">
                    <div className="matrix-canvas">
                      {[20,40,60,80].map(p=><div key={'h'+p} className="mline-h" style={{top:p+'%'}}/>)}
                      {[20,40,60,80].map(p=><div key={'v'+p} className="mline-v" style={{left:p+'%'}}/>)}
                      <div className="mline-center-h"/><div className="mline-center-v"/>
                      {QUADRANTS.map(q=>(
                        <div key={q.id} className="quad-label" style={{left:q.sx,top:q.sy,transform:'translate(-50%,-50%)',color:q.id===qid?'rgba(212,175,55,0.65)':'rgba(255,255,255,0.15)',fontWeight:q.id===qid?700:500}}>{q.label}</div>
                      ))}
                      <div className="matrix-dot" style={{left:clamp(dotX)+'%',top:clamp(dotY)+'%'}}/>
                    </div>
                    <div className="x-ticks">{[0,2,4,6,8,10].map(n=><span key={n} className="tick">{n}</span>)}</div>
                    <div className="x-axis-label">Management-Synergie</div>
                  </div>
                </div>
                <div className="matrix-bottom-bar">
                  <div className="mbb-item"><span className="mbb-label">Synergie</span><span className="mbb-val">{sc.synergie.toFixed(1)}</span></div>
                  <div className="mbb-item"><span className="mbb-label">Impact</span><span className="mbb-val">{sc.impact.toFixed(1)}</span></div>
                  <div className="qh-box">
                    <div>
                      <div className="qh-title">{qdata.id==='tr'?'Anker-Athlet':qdata.id==='tl'?'Entwicklungsprojekt':qdata.id==='br'?'Spezialist':'Kritischer Fall'}</div>
                      <div className="qh-strat">{qdata.strat}</div>
                      <div className="qh-desc">{qdata.desc}</div>
                    </div>
                  </div>
                </div>
              </div>
              <button className="btn-delete-detail" onClick={e=>del(item.id,e)}><Trash2 size={12}/> Delete Permanent</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
