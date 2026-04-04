import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChevronLeft, User, Plus, Trash2, Upload, Building2, Users, RefreshCw, Move, Instagram, ExternalLink, Loader, Zap, Search, Calendar, FileText, BarChart2 } from 'lucide-react';

const LOGO_SRC = '/fa_logo.jpg';
const SUPABASE_URL = 'https://euudeiogircwlvzmsmsr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uPz_tUHK-jgtGSa2tstLHQ_mO1nF-63';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ATHLETE_CFG = [
  { k:'maturity',     l:'Marken-Reife',           s:'Leidenschaft / Innovation',      w:'20%', abbr:'MR' },
  { k:'storytelling', l:'Storytelling-Potenzial',  s:'Sexyness / Potential',           w:'25%', abbr:'ST' },
  { k:'leverage',     l:'Wirtschaftliche Hebel',   s:'Monetarisierung / Momentum',     w:'25%', abbr:'WH' },
  { k:'efficiency',   l:'Operative Effizienz',     s:'Aufwand / Timing / Kapazitäten', w:'15%', abbr:'OE' },
  { k:'network',      l:'Netzwerk-Kompatibilität', s:'Network Fit / Menschen',         w:'15%', abbr:'NK' },
];
const BRAND_CFG = [
  { k:'passion',  l:'Passion / Innovation',   s:'Leidenschaft / Kreativität', w:'20%', abbr:'PA' },
  { k:'sexyness', l:'Sexyness / Potenzial',   s:'Marktattraktivität',         w:'25%', abbr:'SE' },
  { k:'ip',       l:'IP / Momentum',          s:'Rechte / Timing',            w:'25%', abbr:'IP' },
  { k:'aufwand',  l:'Aufwand / Timing',       s:'Ressourcen / Kapazität',     w:'15%', abbr:'AU' },
  { k:'network',  l:'Network Fit / Synergie', s:'Menschen / Kompatibilität',  w:'15%', abbr:'NW' },
];
const RIGHTSHOLDER_CFG = BRAND_CFG.map(c=>({...c}));

const LEAD_STATUSES = [
  { value:'neu',         label:'Neu / Prospect',       color:'#888',    bg:'rgba(136,136,136,0.12)' },
  { value:'kontaktiert', label:'Kontaktiert / Pitch',  color:'#3b82f6', bg:'rgba(59,130,246,0.12)'  },
  { value:'verhandlung', label:'Verhandlung',           color:'#D4AF37', bg:'rgba(212,175,55,0.12)'  },
  { value:'aktiv',       label:'Abgeschlossen / Aktiv', color:'#22c55e', bg:'rgba(34,197,94,0.12)'   },
  { value:'hold',        label:'On Hold / Verloren',    color:'#ef4444', bg:'rgba(239,68,68,0.12)'   },
];

const QUADRANTS = [
  { id:'tl', label:'Entwicklungs-\nprojekte', sx:'23%', sy:'22%', strat:'Invest & Develop', desc:'Hoher Impact, geringere Synergie.' },
  { id:'tr', label:'Anker-\nAthleten',        sx:'77%', sy:'22%', strat:'Joint Venture & Eigenmarken-Aufbau.', desc:'Höchste Priorität. Maximales Marktpotenzial.' },
  { id:'bl', label:'Kritische\nFälle',        sx:'23%', sy:'78%', strat:'Review & Decide', desc:'Kritisch überprüfen oder abgeben.' },
  { id:'br', label:'Spezialisten',            sx:'77%', sy:'78%', strat:'Nischen-Strategie', desc:'Spezialisierte Verwertung möglich.' },
];

function calcScores(scores, cfg) {
  if (!scores) return { synergie:0, impact:0, total:0 };
  const keys = cfg.map(c=>c.k);
  const synergie = scores[keys[4]] ?? 5;
  const impact = ((scores[keys[1]]??5)+(scores[keys[2]]??5))/2;
  const total = cfg.reduce((s,c)=>s+(scores[c.k]??0),0)/cfg.length;
  return { synergie, impact, total:Math.round(total*10)/10 };
}
function getGrade(t) {
  if (t>=9) return 'A+'; if (t>=8) return 'A'; if (t>=7) return 'B';
  if (t>=6) return 'C+'; if (t>=5) return 'C'; return 'D';
}
function getQid(sy,imp) { return imp>=5&&sy>=5?'tr':imp>=5?'tl':sy>=5?'br':'bl'; }
const clamp = v=>Math.max(3,Math.min(97,v));
function getLeadStatus(val) { return LEAD_STATUSES.find(s=>s.value===val)||LEAD_STATUSES[0]; }
function newScores(cfg) { return cfg.reduce((a,c)=>({...a,[c.k]:5}),{}); }

async function claudeAPI(prompt) {
  try {
    const res = await fetch('/api/claude', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1200,
        tools:[{type:'web_search_20250305',name:'web_search'}],
        messages:[{role:'user',content:prompt}] })
    });
    const data = await res.json();
    if (!data.content) return null;
    return data.content.filter(b=>b.type==='text').map(b=>b.text).join('');
  } catch(e) { return null; }
}

function parseJSON(text, key) {
  if (!text) return null;
  const patterns = [new RegExp(`\\{[^{}]*"${key}"[^{}]*\\}`,'s'), /```json\s*([\s\S]*?)\s*```/, /\{[\s\S]*\}/];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) { try { return JSON.parse(m[1]||m[0]); } catch(e) {} }
  }
  return null;
}

async function fetchInstaStats(handle) {
  const h = handle.replace('@','').trim();
  const text = await claudeAPI(
    `Search for Instagram stats of @${h}. Check socialblade.com/instagram/user/${h} and Google. `+
    `Report the HIGHEST recent follower count. 1,200,000="1.2M", 990,000="990K". `+
    `Return ONLY JSON: {"followers":"1.2M","following":"456","posts":"789","bio":"bio","verified":false} `+
    `If not found: {"followers":"N/A","following":"N/A","posts":"N/A","bio":"","verified":false}`
  );
  return parseJSON(text,'followers');
}

async function fetchAthleteAutofill(name) {
  const text = await claudeAPI(
    `Search Wikipedia, transfermarkt.de, sports news for athlete "${name}". `+
    `Return ONLY JSON: {"sport":"","league":"","alter":"","management":"","erfolge":"","leistungsdaten":"","instaHandle":"","imageUrl":""} `+
    `erfolge: 3-5 achievements. leistungsdaten: German bullet points "• stat\n• stat". instaHandle: without @. imageUrl: .jpg/.png. alter: number. Unknown="".`
  );
  return parseJSON(text,'sport');
}

async function fetchBrandAutofill(name, isBrand) {
  const text = await claudeAPI(
    `Search web for ${isBrand?'brand/company':'rights holder/sports association'} "${name}". `+
    `Return ONLY JSON: {"industry":"","focus":"","alter":"","management":"","erfolge":"","leistungsdaten":"","instaHandle":"","linkedinUrl":"","imageUrl":"","sponsoringBudget":"","zielgruppe":"","marketingZiele":"","engagements":"","inventar":"","reichweite":"","fanDemografie":"","werteFit":""} `+
    `sponsoringBudget: e.g. "50.000–200.000 €/Jahr". zielgruppe: e.g. "Gen Z, Millennials". `+
    `marketingZiele: e.g. "Awareness, Image". inventar: e.g. "Trikot, Social Media". reichweite: e.g. "120K IG, 2M TV". Unknown="".`
  );
  return parseJSON(text,'industry');
}

async function fetchLeistungsdaten(name, sport) {
  const sites = sport?.toLowerCase().includes('fußball')?'transfermarkt.de und sofascore.com':
    sport?.toLowerCase().includes('basketball')?'basketball-reference.com':'Google';
  const text = await claudeAPI(
    `Search ${sites} for 2024/2025 stats of "${name}" (${sport||'unknown'}). `+
    `Return ONLY JSON: {"stats":"• stat1\n• stat2\n• stat3"} with real numbers.`
  );
  if (!text) return null;
  const m = text.match(/"stats"\s*:\s*"([^"]+)"/);
  if (m) return { stats: m[1].replace(/\\n/g,'\n') };
  return parseJSON(text,'stats');
}

// ── LEAD BADGE ────────────────────────────────────────────────────────────────
function LeadBadge({ status, onChange }) {
  const s = getLeadStatus(status);
  return (
    <div style={{position:'relative',display:'inline-block'}}>
      <select value={status||'neu'} onChange={e=>onChange(e.target.value)}
        style={{appearance:'none',background:s.bg,border:`1px solid ${s.color}40`,borderRadius:'0.45rem',
          padding:'0.22rem 1.6rem 0.22rem 0.65rem',fontSize:'0.52rem',fontWeight:700,color:s.color,
          cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase',letterSpacing:'0.08em',outline:'none'}}>
        {LEAD_STATUSES.map(ls=><option key={ls.value} value={ls.value}>{ls.label}</option>)}
      </select>
      <span style={{position:'absolute',right:'0.45rem',top:'50%',transform:'translateY(-50%)',fontSize:'0.4rem',color:s.color,pointerEvents:'none'}}>▼</span>
    </div>
  );
}

// ── INSTA CARD ────────────────────────────────────────────────────────────────
function InstaCard({ item, upd }) {
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const stats = item.instaStats||null;
  const handle = (item.instaHandle||'').replace('@','').trim();
  const profileUrl = handle?`https://instagram.com/${handle}`:null;
  const socialBladeUrl = handle?`https://socialblade.com/instagram/user/${handle}`:null;

  const doFetch = async h => {
    setLoading(true);
    const f = await fetchInstaStats(h);
    if (f) upd(item.id,'instaStats',f);
    setLoading(false);
  };
  const handleInput = val => {
    upd(item.id,'instaHandle',val);
    const clean=val.replace('@','').trim();
    if (timerRef.current) clearTimeout(timerRef.current);
    if (clean.length>2) timerRef.current=setTimeout(()=>doFetch(clean),1500);
  };

  return (
    <div style={{gridColumn:'span 2',borderRadius:'0.8rem',overflow:'hidden',border:'1px solid rgba(225,48,108,0.3)',background:'#0a0a0a',marginTop:'0.2rem'}}>
      <div style={{padding:'0.55rem 1rem',display:'flex',alignItems:'center',gap:'0.6rem',borderBottom:'1px solid rgba(255,255,255,0.05)',background:'linear-gradient(90deg,rgba(225,48,108,0.1),transparent)'}}>
        <div style={{width:20,height:20,borderRadius:'50%',background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Instagram size={10} color="#fff"/>
        </div>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.6rem',fontWeight:900,color:'#fff',letterSpacing:'0.15em',textTransform:'uppercase'}}>Instagram</span>
        {loading&&<span style={{marginLeft:'auto',fontSize:'0.42rem',color:'#E1306C',fontWeight:700,display:'flex',alignItems:'center',gap:'0.3rem'}}><Loader size={9} style={{animation:'spin 1s linear infinite'}}/>Sucht…</span>}
        {!loading&&stats&&stats.followers!=='N/A'&&<span style={{marginLeft:'auto',fontSize:'0.4rem',color:'#2ecc71',fontWeight:700,textTransform:'uppercase'}}>● Live</span>}
        {!loading&&handle&&<button onClick={()=>doFetch(handle)} style={{marginLeft:(!stats||stats.followers==='N/A')?'auto':'0.4rem',background:'none',border:'none',cursor:'pointer',color:'#888',fontSize:'0.4rem',fontWeight:700,textTransform:'uppercase',fontFamily:"'Barlow',sans-serif",padding:0}}>↻ Update</button>}
      </div>
      <div style={{padding:'0.55rem 1rem',borderBottom:stats?'1px solid rgba(255,255,255,0.05)':'none',display:'flex',alignItems:'center',gap:'0.5rem'}}>
        <span style={{color:'#E1306C',fontSize:'0.8rem',fontWeight:700,flexShrink:0}}>@</span>
        <input style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'0.4rem',padding:'0.28rem 0.5rem',fontSize:'0.72rem',fontWeight:600,color:'#fff',outline:'none',fontFamily:"'Barlow',sans-serif"}}
          value={handle} onChange={e=>handleInput(e.target.value)} placeholder="username"/>
        {profileUrl&&<a href={profileUrl} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',gap:'0.3rem',background:'linear-gradient(45deg,#dc2743,#cc2366)',color:'#fff',textDecoration:'none',padding:'0.28rem 0.6rem',borderRadius:'0.4rem',fontSize:'0.52rem',fontWeight:700,whiteSpace:'nowrap',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase'}}>Profil <ExternalLink size={8}/></a>}
      </div>
      {stats&&stats.followers!=='N/A'&&(
        <div style={{padding:'0.7rem 1rem'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.4rem',marginBottom:'0.5rem'}}>
            {[{l:'Follower',k:'followers'},{l:'Following',k:'following'},{l:'Posts',k:'posts'}].map(s=>
              <div key={s.k} style={{background:'rgba(255,255,255,0.04)',borderRadius:'0.4rem',padding:'0.4rem',textAlign:'center'}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.95rem',fontWeight:900,fontStyle:'italic',color:'#fff',lineHeight:1}}>{stats[s.k]}</div>
                <div style={{fontSize:'0.42rem',color:'#666',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',margin:'0.12rem 0'}}>{s.l}</div>
                <input style={{width:'100%',background:'transparent',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',outline:'none',fontSize:'0.58rem',color:'#aaa',fontFamily:"'Barlow',sans-serif",textAlign:'center',padding:'0.1rem 0'}}
                  value={stats[s.k]||''} placeholder="bearbeiten…"
                  onChange={e=>upd(item.id,'instaStats',{...stats,[s.k]:e.target.value})}/>
              </div>
            )}
          </div>
          {socialBladeUrl&&<a href={socialBladeUrl} target="_blank" rel="noopener noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'0.3rem',padding:'0.3rem',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:'0.4rem',textDecoration:'none',fontSize:'0.46rem',color:'#666',fontWeight:700,textTransform:'uppercase',fontFamily:"'Barlow',sans-serif"}}><ExternalLink size={8}/> Social Blade</a>}
        </div>
      )}
      {stats&&stats.followers==='N/A'&&handle&&(
        <div style={{padding:'0.6rem 1rem',fontSize:'0.58rem',color:'#666',textAlign:'center'}}>
          Keine Daten für @{handle}{socialBladeUrl&&<a href={socialBladeUrl} target="_blank" rel="noopener noreferrer" style={{color:'#D4AF37',textDecoration:'none',marginLeft:'0.4rem'}}>Social Blade ↗</a>}
        </div>
      )}
    </div>
  );
}

// ── BRAND DEALS ──────────────────────────────────────────────────────────────
const DEAL_STATUS_COLORS = {
  'Aktiv':        { color:'#22c55e', bg:'rgba(34,197,94,0.12)'  },
  'In Verhandlung':{ color:'#D4AF37', bg:'rgba(212,175,55,0.12)' },
  'Abgeschlossen':{ color:'#888',    bg:'rgba(136,136,136,0.12)'},
  'Geplant':      { color:'#3b82f6', bg:'rgba(59,130,246,0.12)' },
};

function DealModal({ deal, onClose, onUpdate, onDelete }) {
  const [d, setD] = React.useState(deal);
  const sc = DEAL_STATUS_COLORS[d.status] || { color:'#888', bg:'rgba(136,136,136,0.12)' };

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#1E1E1E',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'1.4rem',padding:'1.8rem',width:'100%',maxWidth:'420px',position:'relative'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1.4rem'}}>
          {d.logo
            ? <img src={d.logo} alt={d.brandName} style={{width:48,height:48,borderRadius:'50%',objectFit:'contain',background:'#fff',padding:'4px',border:'2px solid rgba(212,175,55,0.3)'}}/>
            : <div style={{width:48,height:48,borderRadius:'50%',background:'rgba(212,175,55,0.15)',border:'2px solid rgba(212,175,55,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',fontWeight:700,color:'#D4AF37',fontFamily:"'Barlow Condensed',sans-serif"}}>{(d.brandName||'?')[0].toUpperCase()}</div>
          }
          <div style={{flex:1}}>
            <input value={d.brandName||''} onChange={e=>setD(p=>({...p,brandName:e.target.value}))}
              style={{width:'100%',background:'transparent',border:'none',borderBottom:'1px solid rgba(255,255,255,0.1)',outline:'none',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.4rem',fontWeight:900,fontStyle:'italic',color:'#D4AF37',padding:'0 0 0.2rem 0'}}
              placeholder="Markenname"/>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'#666',cursor:'pointer',fontSize:'1.2rem',lineHeight:1,padding:0}}>✕</button>
        </div>

        {/* Logo URL */}
        <div style={{marginBottom:'0.8rem'}}>
          <div style={{fontSize:'0.48rem',textTransform:'uppercase',letterSpacing:'0.22em',fontWeight:700,color:'#888',marginBottom:'0.25rem'}}>Logo URL</div>
          <input value={d.logo||''} onChange={e=>setD(p=>({...p,logo:e.target.value}))}
            style={{width:'100%',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'0.5rem',padding:'0.38rem 0.65rem',fontSize:'0.72rem',color:'#fff',outline:'none',fontFamily:"'Barlow',sans-serif",boxSizing:'border-box'}}
            placeholder="https://logo.clearbit.com/nike.com"/>
        </div>

        {/* Grid fields */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.65rem',marginBottom:'0.8rem'}}>
          {[
            {l:'Laufzeit', k:'duration', ph:'z.B. 2024 – 2026'},
            {l:'Budget', k:'budget', ph:'z.B. 50.000 €'},
          ].map(f=>(
            <div key={f.k}>
              <div style={{fontSize:'0.48rem',textTransform:'uppercase',letterSpacing:'0.22em',fontWeight:700,color:'#888',marginBottom:'0.25rem'}}>{f.l}</div>
              <input value={d[f.k]||''} onChange={e=>setD(p=>({...p,[f.k]:e.target.value}))}
                style={{width:'100%',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'0.5rem',padding:'0.38rem 0.65rem',fontSize:'0.72rem',color:'#fff',outline:'none',fontFamily:"'Barlow',sans-serif",boxSizing:'border-box'}}
                placeholder={f.ph}/>
            </div>
          ))}
        </div>

        {/* Scope */}
        <div style={{marginBottom:'0.8rem'}}>
          <div style={{fontSize:'0.48rem',textTransform:'uppercase',letterSpacing:'0.22em',fontWeight:700,color:'#888',marginBottom:'0.25rem'}}>Leistungsumfang</div>
          <textarea value={d.scope||''} onChange={e=>setD(p=>({...p,scope:e.target.value}))}
            style={{width:'100%',background:'rgba(0,0,0,0.4)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'0.5rem',padding:'0.38rem 0.65rem',fontSize:'0.72rem',color:'#fff',outline:'none',fontFamily:"'Barlow',sans-serif",resize:'vertical',minHeight:'70px',lineHeight:1.6,boxSizing:'border-box'}}
            placeholder="z.B. 3x Social Media Post, 1x Event, 1x Shoot"/>
        </div>

        {/* Status dropdown */}
        <div style={{marginBottom:'1.2rem'}}>
          <div style={{fontSize:'0.48rem',textTransform:'uppercase',letterSpacing:'0.22em',fontWeight:700,color:'#888',marginBottom:'0.25rem'}}>Status</div>
          <select value={d.status||'Aktiv'} onChange={e=>setD(p=>({...p,status:e.target.value}))}
            style={{appearance:'none',background:sc.bg,border:`1px solid ${sc.color}40`,borderRadius:'0.5rem',padding:'0.38rem 0.65rem',fontSize:'0.72rem',fontWeight:700,color:sc.color,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",width:'100%',outline:'none'}}>
            {Object.keys(DEAL_STATUS_COLORS).map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Actions */}
        <div style={{display:'flex',gap:'0.6rem'}}>
          <button onClick={()=>onUpdate(d)}
            style={{flex:1,background:'#D4AF37',border:'none',color:'#000',padding:'0.6rem',borderRadius:'0.7rem',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.78rem',fontWeight:900,fontStyle:'italic',textTransform:'uppercase',cursor:'pointer'}}>
            Speichern
          </button>
          <button onClick={onDelete}
            style={{background:'none',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444',padding:'0.6rem 1rem',borderRadius:'0.7rem',fontFamily:"'Barlow Condensed',sans-serif",fontSize:'0.72rem',fontWeight:700,cursor:'pointer',textTransform:'uppercase',letterSpacing:'0.05em'}}>
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}

function BrandDealsSection({ item, upd }) {
  const [modalDeal, setModalDeal] = React.useState(null); // {deal, idx} or {deal:null} for new
  const deals = item.brandDeals || [];

  const saveDeal = (updated, idx) => {
    const newDeals = [...deals];
    if (idx === -1) newDeals.push(updated);
    else newDeals[idx] = updated;
    upd(item.id, 'brandDeals', newDeals);
    setModalDeal(null);
  };

  const deleteDeal = (idx) => {
    if (!window.confirm('Deal wirklich löschen?')) return;
    upd(item.id, 'brandDeals', deals.filter((_,i)=>i!==idx));
    setModalDeal(null);
  };

  const newDeal = () => setModalDeal({ deal:{ brandName:'', logo:'', duration:'', budget:'', scope:'', status:'Aktiv' }, idx:-1 });

  return (
    <>
      <div style={{gridColumn:'span 2',background:'rgba(0,0,0,0.25)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'0.7rem',padding:'0.8rem 0.9rem'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.7rem'}}>
          <div style={{fontSize:'0.5rem',textTransform:'uppercase',letterSpacing:'0.32em',fontWeight:900,color:'#888',display:'flex',alignItems:'center',gap:'0.35rem'}}>
            <span style={{color:'#D4AF37'}}>◆</span> Kooperationen
          </div>
          <button onClick={newDeal}
            style={{width:22,height:22,borderRadius:'50%',background:'rgba(212,175,55,0.15)',border:'1px solid rgba(212,175,55,0.35)',color:'#D4AF37',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.85rem',fontWeight:700,lineHeight:1}}>
            +
          </button>
        </div>

        {deals.length === 0
          ? <div style={{fontSize:'0.6rem',color:'#444',fontStyle:'italic'}}>Noch keine Brand-Deals — + klicken zum Hinzufügen</div>
          : <div style={{display:'flex',flexWrap:'wrap',gap:'0.6rem',alignItems:'center'}}>
              {deals.map((d, idx) => {
                const sc = DEAL_STATUS_COLORS[d.status] || DEAL_STATUS_COLORS['Abgeschlossen'];
                return (
                  <button key={idx} onClick={()=>setModalDeal({deal:d,idx})}
                    title={d.brandName}
                    style={{position:'relative',width:36,height:36,borderRadius:'50%',border:`2px solid ${sc.color}55`,background:'#111',cursor:'pointer',padding:0,overflow:'hidden',transition:'all 0.18s',flexShrink:0}}>
                    {d.logo
                      ? <img src={d.logo} alt={d.brandName} style={{width:'100%',height:'100%',objectFit:'contain',padding:'3px'}} onError={e=>{e.target.style.display='none';e.target.nextSibling.style.display='flex';}}/>
                      : null}
                    <div style={{display:d.logo?'none':'flex',width:'100%',height:'100%',alignItems:'center',justifyContent:'center',fontSize:'0.65rem',fontWeight:900,color:sc.color,fontFamily:"'Barlow Condensed',sans-serif"}}>
                      {(d.brandName||'?')[0].toUpperCase()}
                    </div>
                    {/* Status dot */}
                    <div style={{position:'absolute',bottom:0,right:0,width:9,height:9,borderRadius:'50%',background:sc.color,border:'1.5px solid #1E1E1E'}}/>
                  </button>
                );
              })}
            </div>
        }
      </div>

      {modalDeal && (
        <DealModal
          deal={modalDeal.deal}
          onClose={()=>setModalDeal(null)}
          onUpdate={d=>saveDeal(d, modalDeal.idx)}
          onDelete={()=>deleteDeal(modalDeal.idx)}
        />
      )}
    </>
  );
}


// ── LOCAL INPUT (prevents focus loss on every keystroke) ────────────────────
function LocalInput({ value, onChange, className, style, placeholder, type='text' }) {
  const [local, setLocal] = React.useState(value||'');
  React.useEffect(() => { setLocal(value||''); }, [value]);
  return (
    <input type={type} className={className} style={style} placeholder={placeholder}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={e => { if (e.target.value !== (value||'')) onChange(e); }}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
    />
  );
}

function LocalTextarea({ value, onChange, className, style, placeholder }) {
  const [local, setLocal] = React.useState(value||'');
  React.useEffect(() => { setLocal(value||''); }, [value]);
  return (
    <textarea className={className} style={style} placeholder={placeholder}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={e => { if (e.target.value !== (value||'')) onChange(e); }}
    />
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function FiveAsideMasterApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [athleteSubTab, setAthleteSubTab] = useState('potenzial');
  const [fiveAsideSubTab, setFiveAsideSubTab] = useState('athleten');
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

  const ignoringRealtime = useRef(false);
  const dbLoaded = useRef(false); // Guard: never save before DB is loaded

  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setLoading(false); } };
    const timeout = setTimeout(() => { finish(); setLoadError(true); }, 8000);

    const init = async () => {
      try {
        const { data, error } = await supabase.from('data_store').select('id, content').limit(1).single();
        if (error) throw error;
        if (data) {
          rowId.current = data.id;
          setDb({ athletes:[], brands:[], rightsholder:[], fiveaside_athletes:[], fiveaside_brands:[], ...data.content });
          dbLoaded.current = true; // DB loaded — saves now allowed
        }
      } catch(e) {
        console.error('Supabase:', e);
        setLoadError(true);
      } finally {
        clearTimeout(timeout);
        finish();
      }
    };
    init();

    const ch = supabase.channel('db-changes')
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'data_store'},
        p => {
          // Ignore realtime updates right after we saved — prevents slider reset bug
          if (ignoringRealtime.current) return;
          setDb({athletes:[],brands:[],rightsholder:[],fiveaside_athletes:[],fiveaside_brands:[],...p.new.content});
        })
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); clearTimeout(timeout); };
  }, []);

  // Strip images for fast saves (sliders, text) — images saved separately
  const stripImgs = arr => (arr||[]).map(({image,...rest})=>rest);

  const saveImageToDb = async (newDb) => {
    try {
      ignoringRealtime.current = true;
      await supabase.from('data_store').update({ content: newDb }).eq('id', rowId.current);
      setTimeout(() => { ignoringRealtime.current = false; }, 3000);
    } catch(e) { console.error('Image save error:', e); ignoringRealtime.current = false; }
  };

  const sync = (newDb, includeImages = false) => {
    setDb(newDb);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      // SAFETY: Never save if DB hasn't been loaded yet — prevents data loss
      if (!dbLoaded.current || !rowId.current) {
        console.warn('Save blocked: DB not yet loaded');
        return;
      }
      try {
        ignoringRealtime.current = true;
        const payload = includeImages ? newDb : {
          ...newDb,
          athletes: stripImgs(newDb.athletes),
          brands: stripImgs(newDb.brands),
          rightsholder: stripImgs(newDb.rightsholder),
          fiveaside_athletes: stripImgs(newDb.fiveaside_athletes),
          fiveaside_brands: stripImgs(newDb.fiveaside_brands),
        };
        await supabase.from('data_store').update({ content: payload }).eq('id', rowId.current);
        setTimeout(() => { ignoringRealtime.current = false; }, 3000);
      } catch(e) {
        console.error('Save error:', e);
        ignoringRealtime.current = false;
      }
    }, 800);
  };

  const getListKey = () => {
    if (activeTab==='athletes') {
      if (athleteSubTab==='fiveaside') return fiveAsideSubTab==='brands'?'fiveaside_brands':'fiveaside_athletes';
      return 'athletes';
    }
    return brandSubTab==='rightsholder'?'rightsholder':'brands';
  };

  const listKey = getListKey();
  const isBrandCtx = listKey==='brands'||listKey==='fiveaside_brands';
  const isRHCtx = listKey==='rightsholder';
  const isBrandOrRH = isBrandCtx||isRHCtx;
  const cfg = (listKey==='athletes'||listKey==='fiveaside_athletes')?ATHLETE_CFG:isRHCtx?RIGHTSHOLDER_CFG:BRAND_CFG;

  const list = (db||{})[listKey]||[];
  const item = list.find(i=>i.id===selectedId);
  const ranked = [...list].sort((a,b)=>{ const sk=cfg.map(c=>c.k); return (b.scores[sk[1]]+b.scores[sk[2]])-(a.scores[sk[1]]+a.scores[sk[2]]); });

  const upd = (id, field, val) => {
    const nl=((db||{})[listKey]||[]).map(i=>i.id===id?{...i,[field]:val}:i);
    const newDb = {...db,[listKey]:nl};
    // Images: save full payload. Text/scores: strip images for tiny payload
    sync(newDb, field === 'image');
  };
  const updMulti = (id, fields) => {
    const nl=((db||{})[listKey]||[]).map(i=>i.id===id?{...i,...fields}:i);
    sync({...db,[listKey]:nl}, 'image' in fields);
  };

  const doAutoFill = async id => {
    const it=((db||{})[listKey]||[]).find(i=>i.id===id); if(!it) return;
    setAiLoading(p=>({...p,[id]:true}));
    if (isBrandOrRH) {
      const data=await fetchBrandAutofill(it.name,isBrandCtx);
      if (data) {
        const f={};
        if(data.industry)f.industry=data.industry; if(data.focus)f.focus=data.focus;
        if(data.alter)f.alter=String(data.alter); if(data.management)f.management=data.management;
        if(data.erfolge)f.erfolge=data.erfolge; if(data.leistungsdaten)f.leistungsdaten=data.leistungsdaten;
        if(data.instaHandle&&!it.instaHandle)f.instaHandle=data.instaHandle;
        if(data.linkedinUrl)f.linkedinUrl=data.linkedinUrl;
        if(data.imageUrl&&!it.image)f.aiImageUrl=data.imageUrl;
        if(isBrandCtx){if(data.sponsoringBudget)f.sponsoringBudget=data.sponsoringBudget;if(data.zielgruppe)f.zielgruppe=data.zielgruppe;if(data.marketingZiele)f.marketingZiele=data.marketingZiele;if(data.engagements)f.engagements=data.engagements;}
        else{if(data.inventar)f.inventar=data.inventar;if(data.reichweite)f.reichweite=data.reichweite;if(data.fanDemografie)f.fanDemografie=data.fanDemografie;if(data.werteFit)f.werteFit=data.werteFit;}
        updMulti(id,f);
        if(data.instaHandle){const insta=await fetchInstaStats(data.instaHandle.replace('@','').trim());if(insta)updMulti(id,{...f,instaHandle:data.instaHandle,instaStats:insta});}
      }
    } else {
      const data=await fetchAthleteAutofill(it.name);
      if(data){
        const f={};
        if(data.sport)f.sport=data.sport;if(data.league)f.league=data.league;
        if(data.alter)f.alter=String(data.alter);if(data.management)f.management=data.management;
        if(data.erfolge)f.erfolge=data.erfolge;if(data.leistungsdaten)f.leistungsdaten=data.leistungsdaten;
        if(data.instaHandle&&!it.instaHandle)f.instaHandle=data.instaHandle;
        if(data.imageUrl&&!it.image)f.aiImageUrl=data.imageUrl;
        updMulti(id,f);
        if(data.instaHandle){const insta=await fetchInstaStats(data.instaHandle.replace('@','').trim());if(insta)updMulti(id,{...f,instaHandle:data.instaHandle,instaStats:insta});}
      }
    }
    setAiLoading(p=>({...p,[id]:false}));
  };

  const mkNew = () => {
    const base={id:Date.now(),name:'Neuer Eintrag',image:null,imgX:50,imgY:50,alter:'',erfolge:'',management:'',leistungsdaten:'',instaHandle:'',instaStats:null,aiImageUrl:'',brandDeals:[],scores:newScores(cfg)};
    if(isBrandOrRH){return{...base,industry:'',focus:'',leadStatus:'neu',linkedinUrl:'',keyEvents:'',notizen:'',sponsoringBudget:'',zielgruppe:'',marketingZiele:'',engagements:'',inventar:'',reichweite:'',fanDemografie:'',werteFit:''};}
    return{...base,sport:'',league:'',spielklasse:''};
  };

  const addNew = () => { const n=mkNew(); sync({...db,[listKey]:[...((db||{})[listKey]||[]),n]}); setSelectedId(n.id); setView('detail'); };
  const addFromName = async () => {
    if(!quickName.trim())return;
    setQuickLoading(true);
    const n={...mkNew(),name:quickName.trim()};
    sync({...db,[listKey]:[...((db||{})[listKey]||[]),n]});
    setSelectedId(n.id); setView('detail'); setQuickName(''); setQuickLoading(false);
    setTimeout(()=>doAutoFill(n.id),400);
  };

  const refreshLeistung = async id => {
    const it=((db||{})[listKey]||[]).find(i=>i.id===id); if(!it)return;
    setLeistungLoading(p=>({...p,[id]:true}));
    const r=await fetchLeistungsdaten(it.name,it.sport||it.industry);
    if(r?.stats)upd(id,'leistungsdaten',r.stats);
    setLeistungLoading(p=>({...p,[id]:false}));
  };

  const del = (id,e) => {
    if(e)e.stopPropagation();
    if(!window.confirm('Eintrag wirklich löschen?'))return;
    sync({...db,[listKey]:((db||{})[listKey]||[]).filter(i=>i.id!==id)});
    if(view==='detail')setView('grid');
  };

  const sc = item?calcScores(item.scores,cfg):{synergie:0,impact:0,total:0};
  const qid = item?getQid(sc.synergie,sc.impact):'bl';
  const qdata = QUADRANTS.find(q=>q.id===qid);
  const dotX = item?(sc.synergie/10)*100:50;
  const dotY = item?((10-sc.impact)/10)*100:50;

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#191919',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1rem'}}>
      <RefreshCw color="#D4AF37" size={36} style={{animation:'spin 1s linear infinite'}}/>
      <p style={{fontFamily:'"Barlow Condensed",sans-serif',fontWeight:900,fontStyle:'italic',textTransform:'uppercase',letterSpacing:'0.4em',fontSize:'0.75rem',color:'#D4AF37'}}>Connecting…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (loadError||!db) return (
    <div style={{minHeight:'100vh',background:'#191919',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1rem'}}>
      <p style={{fontFamily:'"Barlow Condensed",sans-serif',fontWeight:900,color:'#ff3b3b',fontSize:'0.75rem',textTransform:'uppercase',letterSpacing:'0.3em'}}>Verbindungsfehler — Neu laden</p>
      <button onClick={()=>window.location.reload()} style={{background:'#D4AF37',border:'none',color:'#000',padding:'0.6rem 1.4rem',borderRadius:'0.6rem',fontFamily:'"Barlow Condensed",sans-serif',fontWeight:900,fontSize:'0.8rem',cursor:'pointer'}}>Neu laden</button>
    </div>
  );

  // Realtime: reload images from DB after other users save with images
  // (our sync strips images for speed, but when others save we get full data)

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,700;0,900;1,700;1,900&family=Barlow:wght@400;500;600;700&display=swap');
    *{-webkit-font-smoothing:antialiased;box-sizing:border-box;}
    body{margin:0;background:#191919;font-family:'Barlow',sans-serif;}
    .wrap{width:100%;max-width:1440px;margin:0 auto;padding:2rem 3rem;}
    .app-header{display:flex;justify-content:space-between;align-items:center;padding:1rem 3rem;border-bottom:1px solid rgba(255,255,255,0.08);background:#191919;position:sticky;top:0;z-index:100;}
    .logo-img{height:160px;width:auto;object-fit:contain;cursor:pointer;}
    .logo-fallback{font-family:'Barlow Condensed',sans-serif;font-size:2.8rem;font-weight:900;font-style:italic;color:#D4AF37;text-transform:uppercase;cursor:pointer;line-height:1;}
    .logo-sub{display:flex;align-items:center;gap:0.4rem;margin-top:0.3rem;}
    .dot{width:6px;height:6px;background:#2ecc71;border-radius:50%;animation:pulseDot 2s infinite;}
    @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:.4}}
    .logo-sub span{font-size:0.5rem;text-transform:uppercase;letter-spacing:0.4em;font-weight:700;color:#666;}
    .tab-switcher{display:flex;background:rgba(0,0,0,0.6);padding:0.3rem;border-radius:0.9rem;border:1px solid rgba(255,255,255,0.12);}
    .tab-btn{padding:0.6rem 1.5rem;border-radius:0.6rem;font-family:'Barlow Condensed',sans-serif;font-size:0.7rem;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:0.1em;border:none;cursor:pointer;transition:all 0.2s;color:#666;background:transparent;white-space:nowrap;}
    .tab-btn.active{background:#D4AF37;color:#000;}
    .tab-btn:not(.active):hover{color:#fff;}
    .sub-row{display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap;margin-bottom:1rem;}
    .sub-switcher{display:inline-flex;background:rgba(0,0,0,0.4);padding:0.22rem;border-radius:0.7rem;border:1px solid rgba(255,255,255,0.08);}
    .sub-btn{padding:0.4rem 1.2rem;border-radius:0.48rem;font-family:'Barlow Condensed',sans-serif;font-size:0.62rem;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:0.08em;border:none;cursor:pointer;transition:all 0.2s;color:#666;background:transparent;}
    .sub-btn.active{background:rgba(212,175,55,0.15);color:#D4AF37;border:1px solid rgba(212,175,55,0.3);}
    .sub-btn:not(.active):hover{color:#fff;}
    .home-grid{display:grid;grid-template-columns:1fr 1fr;gap:2rem;max-width:900px;margin:5rem auto 0;}
    .home-card{background:#1E1E1E;border:1px solid rgba(255,255,255,0.14);border-radius:2.5rem;padding:4rem 2rem;display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:all 0.25s;text-align:center;}
    .home-card:hover{border-color:#D4AF37;transform:translateY(-3px);}
    .home-card:hover .hicon{color:#D4AF37;transform:scale(1.1);}
    .home-icon-wrap{width:80px;height:80px;background:#000;border-radius:1.2rem;display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem;border:1px solid rgba(255,255,255,0.1);}
    .hicon{color:#444;transition:all 0.25s;}
    .home-card h3{font-family:'Barlow Condensed',sans-serif;font-size:2rem;font-weight:900;font-style:italic;text-transform:uppercase;color:#fff;}
    .grid-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:1.2rem;flex-wrap:wrap;gap:1rem;}
    .grid-title{font-family:'Barlow Condensed',sans-serif;font-size:2.2rem;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:-0.02em;color:#fff;}
    .quick-add-row{display:flex;gap:0.6rem;margin-bottom:1.5rem;align-items:center;}
    .quick-input{flex:1;max-width:380px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.12);border-radius:0.8rem;padding:0.6rem 1rem;font-size:0.8rem;font-weight:600;color:#fff;outline:none;font-family:'Barlow',sans-serif;transition:border-color 0.2s;}
    .quick-input:focus{border-color:#D4AF37;}
    .quick-input::placeholder{color:#555;}
    .btn-ai{display:flex;align-items:center;gap:0.4rem;background:linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.08));border:1px solid rgba(212,175,55,0.4);color:#D4AF37;padding:0.6rem 1.2rem;border-radius:0.8rem;font-family:'Barlow Condensed',sans-serif;font-size:0.73rem;font-weight:900;font-style:italic;text-transform:uppercase;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
    .btn-ai:hover{background:rgba(212,175,55,0.25);}
    .btn-ai:disabled{opacity:0.5;cursor:not-allowed;}
    .btn-add{display:flex;align-items:center;gap:0.5rem;background:#D4AF37;color:#000;border:none;padding:0.6rem 1.3rem;border-radius:0.8rem;font-family:'Barlow Condensed',sans-serif;font-size:0.76rem;font-weight:900;font-style:italic;text-transform:uppercase;cursor:pointer;transition:all 0.2s;}
    .btn-add:hover{background:#fff;}
    .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1.3rem;}
    .item-card{background:#1E1E1E;border:1px solid rgba(255,255,255,0.14);border-radius:1.6rem;padding:1.2rem;cursor:pointer;transition:all 0.25s;position:relative;}
    .item-card:hover{border-color:#D4AF37;transform:translateY(-2px);}
    .rank-badge{position:absolute;top:-10px;right:-10px;width:36px;height:36px;background:#D4AF37;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:0.78rem;color:#000;z-index:2;box-shadow:0 4px 16px rgba(212,175,55,0.5);}
    .card-img{aspect-ratio:1;background:#111;border-radius:1.2rem;margin-bottom:0.9rem;overflow:hidden;border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;}
    .card-img img{width:100%;height:100%;object-fit:cover;}
    .card-name{font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:700;font-style:italic;margin-bottom:0.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color 0.2s;color:#fff;}
    .item-card:hover .card-name{color:#D4AF37;}
    .card-sub{font-size:0.5rem;text-transform:uppercase;letter-spacing:0.18em;font-weight:700;color:#666;margin-bottom:0.5rem;}
    .card-footer{display:flex;justify-content:space-between;align-items:center;padding-top:0.5rem;border-top:1px solid rgba(255,255,255,0.06);}
    .card-delete-btn{background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:0.3rem;font-size:0.45rem;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#5a1a1a;transition:color 0.2s;font-family:'Barlow',sans-serif;padding:0;}
    .card-delete-btn:hover{color:#ff3b3b;}
    .detail-wrap{display:grid;grid-template-columns:440px 1fr;gap:1.5rem;animation:fadeUp 0.35s ease both;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @media(max-width:960px){.detail-wrap{grid-template-columns:1fr;}}
    .panel{background:#1E1E1E;border:1px solid rgba(255,255,255,0.14);border-radius:1.8rem;padding:1.7rem;}
    .back-btn{background:none;border:none;color:#666;cursor:pointer;display:flex;align-items:center;gap:0.4rem;font-size:0.53rem;font-weight:700;text-transform:uppercase;letter-spacing:0.28em;margin-bottom:1.1rem;transition:color 0.2s;font-family:'Barlow',sans-serif;}
    .back-btn:hover{color:#D4AF37;}
    .profile-row{display:flex;gap:1rem;align-items:flex-start;margin-bottom:0.8rem;}
    .avatar-wrap{position:relative;flex-shrink:0;}
    .avatar{width:88px;height:88px;background:#000;border-radius:1.2rem;overflow:hidden;border:2px solid rgba(255,255,255,0.14);display:flex;align-items:center;justify-content:center;}
    .avatar img{width:100%;height:100%;object-fit:cover;}
    .avatar-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.75);border-radius:1.2rem;display:flex;align-items:center;justify-content:center;opacity:0;cursor:pointer;transition:opacity 0.2s;}
    .avatar-wrap:hover .avatar-overlay{opacity:1;}
    .name-input{width:100%;background:transparent;font-family:'Barlow Condensed',sans-serif;font-size:1.85rem;font-weight:900;font-style:italic;color:#D4AF37;letter-spacing:-0.02em;border:none;border-bottom:1px solid rgba(255,255,255,0.1);outline:none;margin-bottom:0.3rem;padding-bottom:0.2rem;}
    .name-input:focus{border-color:#D4AF37;}
    .ai-fill-btn{display:flex;align-items:center;gap:0.35rem;background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);border-radius:0.4rem;padding:0.22rem 0.65rem;font-size:0.5rem;font-weight:700;color:#D4AF37;cursor:pointer;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:0.08em;transition:all 0.2s;margin-top:0.3rem;}
    .ai-fill-btn:hover{background:rgba(212,175,55,0.2);}
    .ai-fill-btn:disabled{opacity:0.5;cursor:not-allowed;}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.55rem;margin-top:0.6rem;}
    .meta-field{display:flex;flex-direction:column;gap:0.22rem;}
    .meta-label{font-size:0.5rem;text-transform:uppercase;letter-spacing:0.22em;font-weight:700;color:#888;}
    .meta-input{background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.12);border-radius:0.5rem;padding:0.38rem 0.65rem;font-size:0.76rem;font-weight:600;color:#fff;outline:none;font-family:'Barlow',sans-serif;transition:border-color 0.2s;width:100%;}
    .meta-input:focus{border-color:#D4AF37;color:#D4AF37;}
    .meta-textarea{background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.12);border-radius:0.5rem;padding:0.45rem 0.65rem;font-size:0.76rem;font-weight:500;color:#fff;outline:none;font-family:'Barlow',sans-serif;transition:border-color 0.2s;width:100%;resize:vertical;min-height:75px;line-height:1.6;}
    .meta-textarea:focus{border-color:#D4AF37;color:#D4AF37;}
    .meta-full{grid-column:span 2;}
    .ai-img-preview{grid-column:span 2;background:rgba(0,0,0,0.3);border:1px solid rgba(212,175,55,0.25);border-radius:0.6rem;padding:0.65rem;display:flex;gap:0.75rem;align-items:center;}
    .ai-img-thumb{width:56px;height:56px;border-radius:0.5rem;object-fit:cover;border:1px solid rgba(255,255,255,0.1);flex-shrink:0;background:#111;}
    .leistung-box{grid-column:span 2;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.08);border-radius:0.6rem;padding:0.65rem 0.85rem;}
    .leistung-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.45rem;}
    .leistung-refresh{display:flex;align-items:center;gap:0.3rem;background:none;border:1px solid rgba(212,175,55,0.25);border-radius:0.35rem;padding:0.16rem 0.5rem;font-size:0.46rem;font-weight:700;color:#D4AF37;cursor:pointer;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:0.08em;transition:all 0.2s;}
    .leistung-refresh:hover{background:rgba(212,175,55,0.1);}
    .leistung-refresh:disabled{opacity:0.5;cursor:not-allowed;}
    .leistung-empty{font-size:0.6rem;color:#555;font-style:italic;}
    .img-pos-wrap{grid-column:span 2;display:flex;flex-direction:column;gap:0.5rem;}
    .img-preview-box{position:relative;width:100%;aspect-ratio:16/7;background:#000;border-radius:0.8rem;overflow:hidden;border:1px solid rgba(255,255,255,0.12);}
    .img-preview-box img{width:100%;height:100%;object-fit:cover;pointer-events:none;}
    .img-pos-controls{display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;}
    .pos-field{display:flex;flex-direction:column;gap:0.2rem;}
    .section-label{font-size:0.5rem;font-weight:900;text-transform:uppercase;letter-spacing:0.38em;color:#888;margin-bottom:0.9rem;margin-top:0.7rem;}
    .slider-item{margin-bottom:1rem;}
    .slider-top{display:flex;align-items:baseline;gap:0.5rem;margin-bottom:0.35rem;flex-wrap:wrap;}
    .slider-main-label{font-family:'Barlow Condensed',sans-serif;font-size:0.85rem;font-weight:700;font-style:italic;color:#fff;}
    .slider-sub-label{font-size:0.6rem;color:#fff;font-weight:500;opacity:0.5;}
    .slider-right{margin-left:auto;display:flex;align-items:baseline;gap:0.5rem;}
    .slider-pct{font-size:0.58rem;color:#888;font-weight:600;}
    .slider-val{font-family:'Barlow Condensed',sans-serif;font-size:1.65rem;font-weight:900;font-style:italic;color:#D4AF37;line-height:1;}
    .gesamtscore{background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);border-radius:1.2rem;padding:1rem 1.2rem;margin-top:0.85rem;}
    .gs-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;}
    .gs-title{font-size:0.48rem;font-weight:900;text-transform:uppercase;letter-spacing:0.32em;color:#888;}
    .gs-grade{font-family:'Barlow Condensed',sans-serif;font-size:2.2rem;font-weight:900;font-style:italic;color:rgba(255,255,255,0.07);line-height:1;}
    .gs-score{font-family:'Barlow Condensed',sans-serif;font-size:2rem;font-weight:900;font-style:italic;color:#D4AF37;line-height:1;}
    .gs-score span{font-size:0.82rem;color:#888;font-style:normal;}
    .gs-bars{display:flex;flex-direction:column;gap:0.36rem;}
    .gs-bar-row{display:flex;align-items:center;gap:0.5rem;}
    .gs-bar-key{font-size:0.48rem;font-weight:700;text-transform:uppercase;color:#888;width:17px;flex-shrink:0;}
    .gs-bar-track{flex:1;height:3px;background:#000;border-radius:999px;overflow:hidden;}
    .gs-bar-fill{height:100%;background:#D4AF37;border-radius:999px;transition:width 0.5s ease;}
    .right-col{display:flex;flex-direction:column;gap:1rem;}
    .matrix-panel{background:#1E1E1E;border:1px solid rgba(255,255,255,0.14);border-radius:1.8rem;padding:1.4rem;flex:1;display:flex;flex-direction:column;}
    .matrix-header{font-size:0.48rem;font-weight:900;text-transform:uppercase;letter-spacing:0.38em;color:#888;margin-bottom:0.9rem;}
    .matrix-with-yaxis{display:flex;width:100%;gap:0.5rem;}
    .y-axis-label{writing-mode:vertical-rl;transform:rotate(180deg);font-size:0.44rem;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#888;white-space:nowrap;align-self:center;}
    .matrix-inner{flex:1;display:flex;flex-direction:column;}
    .matrix-canvas{position:relative;width:100%;aspect-ratio:1;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:0.8rem;overflow:hidden;}
    .mline-h{position:absolute;left:0;right:0;border-top:1px solid rgba(255,255,255,0.04);}
    .mline-v{position:absolute;top:0;bottom:0;border-left:1px solid rgba(255,255,255,0.04);}
    .mline-center-h{position:absolute;top:50%;left:0;right:0;border-top:1px solid rgba(255,255,255,0.1);}
    .mline-center-v{position:absolute;left:50%;top:0;bottom:0;border-left:1px solid rgba(255,255,255,0.1);}
    .quad-label{position:absolute;font-size:0.5rem;font-weight:600;text-align:center;line-height:1.4;pointer-events:none;white-space:pre-line;}
    .matrix-dot{position:absolute;width:17px;height:17px;background:#D4AF37;border-radius:50%;transform:translate(-50%,-50%);border:2px solid #000;box-shadow:0 0 28px rgba(212,175,55,0.8);transition:left 0.6s cubic-bezier(0.34,1.56,0.64,1),top 0.6s cubic-bezier(0.34,1.56,0.64,1);z-index:10;}
    @keyframes ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.2);opacity:0}}
    .matrix-dot::after{content:'';position:absolute;inset:-5px;border-radius:50%;border:1px solid rgba(212,175,55,0.25);animation:ring 2s infinite;}
    .x-ticks{display:flex;justify-content:space-between;padding:0.22rem 0 0;}
    .tick{font-size:0.42rem;color:rgba(255,255,255,0.16);font-weight:600;}
    .x-axis-label{text-align:center;font-size:0.46rem;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#888;margin-top:0.35rem;}
    .matrix-bottom-bar{display:flex;gap:1rem;padding:0.65rem 0.9rem;background:rgba(0,0,0,0.5);border-radius:0.8rem;margin-top:0.7rem;border:1px solid rgba(255,255,255,0.1);flex-wrap:wrap;align-items:center;}
    .mbb-item{display:flex;align-items:center;gap:0.35rem;}
    .mbb-label{font-size:0.45rem;font-weight:700;text-transform:uppercase;letter-spacing:0.25em;color:#888;}
    .mbb-val{font-family:'Barlow Condensed',sans-serif;font-size:1.05rem;font-weight:900;font-style:italic;color:#D4AF37;}
    .qh-box{margin-left:auto;background:#111;border:1px solid rgba(212,175,55,0.3);border-radius:0.6rem;padding:0.5rem 0.75rem;}
    .qh-title{font-size:0.52rem;font-weight:900;text-transform:uppercase;color:#D4AF37;margin-bottom:0.1rem;}
    .qh-desc{font-size:0.52rem;color:#aaa;line-height:1.4;max-width:200px;}
    .btn-delete-detail{background:none;border:none;color:#5a1a1a;display:flex;align-items:center;gap:0.4rem;font-size:0.5rem;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;cursor:pointer;transition:color 0.2s;font-family:'Barlow',sans-serif;align-self:flex-end;margin-top:0.4rem;}
    .btn-delete-detail:hover{color:#ff3b3b;}
    input[type=range]{width:100%;height:3px;background:#000;border-radius:999px;outline:none;cursor:pointer;-webkit-appearance:none;accent-color:#D4AF37;}
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:#D4AF37;border:2px solid #000;box-shadow:0 0 8px rgba(212,175,55,0.5);}
    .ai-loading-bar{grid-column:span 2;display:flex;align-items:center;gap:0.6rem;padding:0.6rem 0.85rem;background:rgba(212,175,55,0.06);border:1px solid rgba(212,175,55,0.2);border-radius:0.6rem;font-size:0.6rem;color:#D4AF37;font-weight:600;}
    .section-divider{grid-column:span 2;border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0.3rem 0;}
  `;

  // Shared detail header + avatar + AI fill
  const DetailHeader = ({onBack}) => {
    const ls = getLeadStatus(item.leadStatus);
    return (
      <>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.1rem'}}>
          <button className="back-btn" style={{margin:0}} onClick={onBack}><ChevronLeft size={13}/> Zurück</button>
          {isBrandOrRH&&<LeadBadge status={item.leadStatus} onChange={v=>upd(item.id,'leadStatus',v)}/>}
        </div>
        <div className="profile-row">
          <div className="avatar-wrap">
            <div className="avatar" style={isBrandOrRH?{borderColor:ls.color+'80'}:{}}>
              {item.image?<img src={item.image} alt={item.name} style={{objectPosition:`${item.imgX??50}% ${item.imgY??50}%`}}/>:
               item.aiImageUrl?<img src={item.aiImageUrl} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:
               isBrandOrRH?<Building2 size={32} color="#333"/>:<User size={32} color="#333"/>}
            </div>
            <input type="file" accept="image/*" style={{display:'none'}} ref={fileInputRef} onChange={e=>{
              const f=e.target.files[0]; if(!f) return;
              const rd=new FileReader();
              rd.onloadend=()=>{
                const img=new Image();
                img.onload=()=>{
                  const canvas=document.createElement('canvas');
                  const ratio=Math.min(300/img.width,300/img.height,1);
                  canvas.width=Math.round(img.width*ratio);
                  canvas.height=Math.round(img.height*ratio);
                  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
                  upd(item.id,'image',canvas.toDataURL('image/jpeg',0.45));
                  setImgAdjusted(p=>({...p,[item.id]:false}));
                };
                img.src=rd.result;
              };
              rd.readAsDataURL(f);
            }}/>
            <div className="avatar-overlay" onClick={()=>fileInputRef.current.click()}><Upload size={16} color="#fff"/></div>
          </div>
          <div style={{flex:1}}>
            <LocalInput className="name-input" value={item.name} onChange={e=>upd(item.id,'name',e.target.value)}/>
            <button className="ai-fill-btn" onClick={()=>doAutoFill(item.id)} disabled={!!aiLoading[item.id]}>
              {aiLoading[item.id]?<><Loader size={10} style={{animation:'spin 1s linear infinite'}}/> Sucht…</>:<><Search size={10}/> KI-Autofill alle Felder</>}
            </button>
          </div>
        </div>
        {aiLoading[item.id]&&<div className="ai-loading-bar"><Loader size={12} style={{animation:'spin 1s linear infinite',flexShrink:0}}/>KI sucht Daten für {item.name}… ~15 Sek.</div>}
        {item.aiImageUrl&&!item.image&&(
          <div className="ai-img-preview" style={{marginTop:'0.5rem'}}>
            <img src={item.aiImageUrl} className="ai-img-thumb" alt="" onError={e=>e.target.style.display='none'}/>
            <div style={{flex:1}}>
              <div style={{fontSize:'0.5rem',color:'#D4AF37',fontWeight:700,textTransform:'uppercase',marginBottom:'0.3rem'}}>KI-Bild Vorschlag</div>
              <div style={{display:'flex',gap:'0.5rem',marginTop:'0.3rem'}}>
                <button onClick={()=>fileInputRef.current.click()} style={{background:'#D4AF37',border:'none',color:'#000',padding:'0.2rem 0.6rem',borderRadius:'0.3rem',fontSize:'0.5rem',fontWeight:700,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase'}}>Eigenes</button>
                <button onClick={()=>upd(item.id,'aiImageUrl','')} style={{background:'none',border:'1px solid rgba(255,255,255,0.12)',color:'#666',padding:'0.2rem 0.6rem',borderRadius:'0.3rem',fontSize:'0.5rem',fontWeight:700,cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase'}}>Verwerfen</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Shared right column (matrix + scores)
  const RightCol = () => (
    <div className="right-col">
      <div className="panel">
        <div className="section-label">Bewertungskriterien</div>
        {cfg.map(c=>(
          <div key={c.k} className="slider-item">
            <div className="slider-top">
              <span className="slider-main-label">{c.l}</span>
              <span className="slider-sub-label">{c.s}</span>
              <div className="slider-right"><span className="slider-pct">{c.w}</span><span className="slider-val">{item.scores[c.k]}</span></div>
            </div>
            <input type="range" min={0} max={10} step={1} value={item.scores[c.k]}
              onChange={e=>upd(item.id,'scores',{...item.scores,[c.k]:+e.target.value})}/>
          </div>
        ))}
        <div className="gesamtscore">
          <div className="gs-header">
            <div><div className="gs-title">Gesamtscore</div><div className="gs-score">{sc.total.toFixed(1)}<span> / 10</span></div></div>
            <div className="gs-grade">{getGrade(sc.total)}</div>
          </div>
          <div className="gs-bars">{cfg.map(c=><div key={c.k} className="gs-bar-row"><div className="gs-bar-key">{c.abbr}</div><div className="gs-bar-track"><div className="gs-bar-fill" style={{width:(item.scores[c.k]*10)+'%'}}/></div></div>)}</div>
        </div>
      </div>
      <div className="matrix-panel">
        <div className="matrix-header">Live-Matrix</div>
        <div className="matrix-with-yaxis">
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'0.3rem',paddingBottom:'1.6rem'}}>
            <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'space-between',alignItems:'flex-end',paddingRight:'0.2rem'}}>{[10,8,6,4,2,0].map(n=><span key={n} className="tick">{n}</span>)}</div>
            <div className="y-axis-label">Markt-Impact</div>
          </div>
          <div className="matrix-inner">
            <div className="matrix-canvas">
              {[20,40,60,80].map(p=><div key={'h'+p} className="mline-h" style={{top:p+'%'}}/>)}
              {[20,40,60,80].map(p=><div key={'v'+p} className="mline-v" style={{left:p+'%'}}/>)}
              <div className="mline-center-h"/><div className="mline-center-v"/>
              {QUADRANTS.map(q=><div key={q.id} className="quad-label" style={{left:q.sx,top:q.sy,transform:'translate(-50%,-50%)',color:q.id===qid?'rgba(212,175,55,0.65)':'rgba(255,255,255,0.15)',fontWeight:q.id===qid?700:500}}>{q.label}</div>)}
              <div className="matrix-dot" style={{left:clamp(dotX)+'%',top:clamp(dotY)+'%'}}/>
            </div>
            <div className="x-ticks">{[0,2,4,6,8,10].map(n=><span key={n} className="tick">{n}</span>)}</div>
            <div className="x-axis-label">Management-Synergie</div>
          </div>
        </div>
        <div className="matrix-bottom-bar">
          <div className="mbb-item"><span className="mbb-label">Synergie</span><span className="mbb-val">{sc.synergie.toFixed(1)}</span></div>
          <div className="mbb-item"><span className="mbb-label">Impact</span><span className="mbb-val">{sc.impact.toFixed(1)}</span></div>
          <div className="qh-box"><div><div className="qh-title">{qdata.strat}</div><div className="qh-desc">{qdata.desc}</div></div></div>
        </div>
      </div>
      <button className="btn-delete-detail" onClick={e=>del(item.id,e)}><Trash2 size={11}/> Delete Permanent</button>
    </div>
  );

  const MF = ({label, field, full, area, placeholder, icon}) => (
    <div className={'meta-field'+(full?' meta-full':'')}>
      <div className="meta-label" style={{display:'flex',alignItems:'center',gap:'0.28rem'}}>{icon&&icon}{label}</div>
      {area?<LocalTextarea className="meta-textarea" value={item[field]||''} placeholder={placeholder||''} onChange={e=>upd(item.id,field,e.target.value)}/>
           :<LocalInput className="meta-input" value={item[field]||''} placeholder={placeholder||''} onChange={e=>upd(item.id,field,e.target.value)}/>}
    </div>
  );

  const getGridTitle = () => {
    if (activeTab === 'athletes') {
      if (athleteSubTab === 'potenzial') return 'Potenzielle Athleten';
      if (fiveAsideSubTab === 'brands') return 'Five Aside Athleten - Brands';
      return 'Five Aside Athleten';
    }
    if (brandSubTab === 'rightsholder') return 'Rightsholder';
    return 'Brands';
  };

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
        {activeTab!=='home'&&(
          <div className="tab-switcher">
            <button className={'tab-btn'+(activeTab==='athletes'?' active':'')} onClick={()=>{setActiveTab('athletes');setView('grid');}}>Athlete Matrix</button>
            <button className={'tab-btn'+(activeTab==='brands'?' active':'')} onClick={()=>{setActiveTab('brands');setView('grid');}}>Brands / Rightsholder</button>
          </div>
        )}
      </header>

      <div className="wrap">
        {activeTab==='home'&&(
          <div className="home-grid">
            <div className="home-card" onClick={()=>setActiveTab('athletes')}>
              <div className="home-icon-wrap"><div className="hicon"><Users size={40}/></div></div>
              <h3>Athlete Matrix</h3>
            </div>
            <div className="home-card" onClick={()=>setActiveTab('brands')}>
              <div className="home-icon-wrap"><div className="hicon"><Building2 size={40}/></div></div>
              <h3>Brands / Rightsholder</h3>
            </div>
          </div>
        )}

        {/* Sub-navigation */}
        {activeTab==='athletes'&&view==='grid'&&(
          <div className="sub-row">
            <div className="sub-switcher">
              <button className={'sub-btn'+(athleteSubTab==='potenzial'?' active':'')} onClick={()=>setAthleteSubTab('potenzial')}>Potenzielle Athleten</button>
              <button className={'sub-btn'+(athleteSubTab==='fiveaside'?' active':'')} onClick={()=>setAthleteSubTab('fiveaside')}>Five Aside Athleten</button>
            </div>
            {athleteSubTab==='fiveaside'&&(
              <div className="sub-switcher">
                <button className={'sub-btn'+(fiveAsideSubTab==='athleten'?' active':'')} onClick={()=>setFiveAsideSubTab('athleten')}>Athleten</button>
                <button className={'sub-btn'+(fiveAsideSubTab==='brands'?' active':'')} onClick={()=>setFiveAsideSubTab('brands')}>Brands</button>
              </div>
            )}
          </div>
        )}
        {activeTab==='brands'&&view==='grid'&&(
          <div className="sub-switcher" style={{marginBottom:'1rem'}}>
            <button className={'sub-btn'+(brandSubTab==='brands'?' active':'')} onClick={()=>setBrandSubTab('brands')}>Brands</button>
            <button className={'sub-btn'+(brandSubTab==='rightsholder'?' active':'')} onClick={()=>setBrandSubTab('rightsholder')}>Rightsholder</button>
          </div>
        )}

        {/* GRID */}
        {activeTab!=='home'&&view==='grid'&&(
          <>
            <div className="grid-header">
              <h2 className="grid-title">{getGridTitle()}</h2>
              <button className="btn-add" onClick={addNew}><Plus size={14} strokeWidth={3}/> Manuell</button>
            </div>
            <div className="quick-add-row">
              <input className="quick-input" value={quickName} onChange={e=>setQuickName(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&!quickLoading&&quickName.trim()&&addFromName()}
                placeholder={isBrandOrRH?'Brand/Rightsholder-Name - KI füllt alle Felder…':'Athleten-Name - KI füllt alle Felder automatisch…'}/>
              <button className="btn-ai" onClick={addFromName} disabled={quickLoading||!quickName.trim()}>
                {quickLoading?<><Loader size={13} style={{animation:'spin 1s linear infinite'}}/> Erstellt…</>:<><Zap size={13}/> KI-Schnellerstellung</>}
              </button>
            </div>
            <div className="cards-grid">
              {ranked.map((it,idx)=>{
                const ls=getLeadStatus(it.leadStatus);
                return (
                  <div key={it.id} className="item-card"
                    style={isBrandOrRH&&it.leadStatus&&it.leadStatus!=='neu'?{borderColor:ls.color+'55'}:{}}
                    onClick={()=>{setSelectedId(it.id);setView('detail');setImgAdjusted({});}}>
                    <div className="rank-badge">#{idx+1}</div>
                    {isBrandOrRH&&(
                      <div style={{position:'absolute',top:'0.75rem',left:'0.75rem',background:ls.bg,border:`1px solid ${ls.color}40`,borderRadius:'0.35rem',padding:'0.1rem 0.45rem',fontSize:'0.42rem',fontWeight:700,color:ls.color,textTransform:'uppercase',letterSpacing:'0.06em',fontFamily:"'Barlow Condensed',sans-serif"}}>{ls.label}</div>
                    )}
                    <div className="card-img" style={isBrandOrRH?{marginTop:'1.4rem'}:{}}>
                      {it.image?<img src={it.image} alt={it.name} style={{objectPosition:`${it.imgX??50}% ${it.imgY??50}%`}}/>:
                       it.aiImageUrl?<img src={it.aiImageUrl} alt={it.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>e.target.style.display='none'}/>:
                       isBrandOrRH?<Building2 size={46} color="#333"/>:<User size={46} color="#333"/>}
                    </div>
                    <div className="card-name">{it.name}</div>
                    <div className="card-sub">{isBrandOrRH?`${it.industry||''}${it.focus?' · '+it.focus:''}`:`${it.sport||''}${it.league?' · '+it.league:''}`}</div>
                    <div className="card-footer">
                      <span style={{fontSize:'0.46rem',color:'#555',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.1em'}}>Score {calcScores(it.scores,cfg).total.toFixed(1)}</span>
                      <button className="card-delete-btn" onClick={e=>del(it.id,e)}><Trash2 size={10}/> Löschen</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* DETAIL — Brand / Rightsholder */}
        {activeTab!=='home'&&view==='detail'&&item&&isBrandOrRH&&(
          <div className="detail-wrap">
            <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
              <div className="panel">
                <DetailHeader onBack={()=>setView('grid')}/>
                <div className="meta-grid" style={{marginTop:'0.7rem'}}>
                  <MF label="Branche / Kategorie" field="industry"/>
                  <MF label="Gründungsjahr" field="alter" placeholder="z.B. 2005"/>
                  <MF label="Fokus / Segment" field="focus"/>
                  <MF label="Ansprechpartner / CEO" field="management"/>
                  {/* LinkedIn */}
                  <div className="meta-field meta-full">
                    <div className="meta-label">🔗 LinkedIn URL</div>
                    <div style={{display:'flex',gap:'0.4rem',alignItems:'center'}}>
                      <LocalInput className="meta-input" style={{flex:1}} value={item.linkedinUrl||''} placeholder="https://linkedin.com/company/…"
                        onChange={e=>upd(item.id,'linkedinUrl',e.target.value)}/>
                      {item.linkedinUrl&&<a href={item.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{background:'#0077b5',color:'#fff',textDecoration:'none',padding:'0.3rem 0.6rem',borderRadius:'0.4rem',fontSize:'0.5rem',fontWeight:700,whiteSpace:'nowrap',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase',display:'flex',alignItems:'center',gap:'0.2rem'}}>Öffnen <ExternalLink size={8}/></a>}
                    </div>
                  </div>
                  <hr className="section-divider"/>
                  {/* Brand-specific */}
                  {isBrandCtx&&<>
                    <MF label="💰 Sponsoring-Budget" field="sponsoringBudget" placeholder="z.B. 50.000–200.000 €/Jahr"/>
                    <MF label="🎯 Zielgruppe" field="zielgruppe" placeholder="z.B. Gen Z, B2B, Millennials"/>
                    <MF label="📣 Marketing-Ziele" field="marketingZiele" full area placeholder="z.B. Awareness, Leads, Image-Stärkung…"/>
                    <MF label="🤝 Bestehende Engagements" field="engagements" full area placeholder="Aktuelle Sponsorings und Partnerschaften…"/>
                  </>}
                  {/* Rightsholder-specific */}
                  {isRHCtx&&<>
                    <MF label="📦 Inventar" field="inventar" placeholder="z.B. Trikot, Social Media, Events"/>
                    <MF label="📡 Reichweite" field="reichweite" placeholder="z.B. 120K IG, 2M TV"/>
                    <MF label="👥 Fan-Demografie" field="fanDemografie" full area placeholder="z.B. 18–35, männlich, DACH-Raum…"/>
                    <MF label="💡 Werte-Fit" field="werteFit" full area placeholder="Gemeinsame Werte, Positionierung…"/>
                  </>}
                  <hr className="section-divider"/>
                  <MF label="Erfolge / Referenzen" field="erfolge" full area placeholder="Wichtige Meilensteine, Awards, Cases…"/>
                  <div className="leistung-box">
                    <div className="leistung-header">
                      <div className="meta-label" style={{display:'flex',alignItems:'center',gap:'0.3rem'}}><BarChart2 size={9} color="#D4AF37"/> Kennzahlen</div>
                      <button className="leistung-refresh" onClick={()=>refreshLeistung(item.id)} disabled={!!leistungLoading[item.id]}>
                        {leistungLoading[item.id]?<><Loader size={8} style={{animation:'spin 1s linear infinite'}}/> Lädt…</>:<><RefreshCw size={8}/> KI-Update</>}
                      </button>
                    </div>
                    {item.leistungsdaten
                      ?<LocalTextarea style={{width:'100%',background:'transparent',border:'none',outline:'none',fontSize:'0.7rem',color:'#ccc',lineHeight:1.8,resize:'vertical',fontFamily:"'Barlow',sans-serif",minHeight:'55px',padding:0}} value={item.leistungsdaten} onChange={e=>upd(item.id,'leistungsdaten',e.target.value)}/>
                      :<div className="leistung-empty">„KI-Update" für aktuelle Kennzahlen</div>
                    }
                  </div>
                  <MF label={<><Calendar size={9} style={{marginRight:'0.2rem'}}/>Key Events / Timeline</>} field="keyEvents" full area placeholder="Wichtige Termine, Saisonstart, Deadlines…"/>
                  <MF label={<><FileText size={9} style={{marginRight:'0.2rem'}}/>Notizen</>} field="notizen" full area placeholder="Interne Notizen, nächste Schritte, Anmerkungen…"/>
                  {item.image&&!imgAdjusted[item.id]&&(
                    <div className="img-pos-wrap">
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div className="meta-label" style={{display:'flex',alignItems:'center',gap:'0.3rem'}}><Move size={9} color="#888"/> Bildausschnitt</div>
                        <button onClick={()=>setImgAdjusted(p=>({...p,[item.id]:true}))} style={{background:'rgba(212,175,55,0.15)',border:'1px solid rgba(212,175,55,0.3)',borderRadius:'0.35rem',padding:'0.18rem 0.6rem',fontSize:'0.5rem',fontWeight:700,color:'#D4AF37',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase'}}>✓ Fertig</button>
                      </div>
                      <div className="img-preview-box"><img src={item.image} alt="preview" style={{objectPosition:`${item.imgX??50}% ${item.imgY??50}%`}}/></div>
                      <div className="img-pos-controls">
                        <div className="pos-field"><div className="meta-label">Horizontal</div><input type="range" min={0} max={100} value={item.imgX??50} onChange={e=>upd(item.id,'imgX',+e.target.value)}/></div>
                        <div className="pos-field"><div className="meta-label">Vertikal</div><input type="range" min={0} max={100} value={item.imgY??50} onChange={e=>upd(item.id,'imgY',+e.target.value)}/></div>
                      </div>
                    </div>
                  )}
                  <InstaCard item={item} upd={upd}/>
                </div>
              </div>
            </div>
            <RightCol/>
          </div>
        )}

        {/* DETAIL — Athlete */}
        {activeTab!=='home'&&view==='detail'&&item&&!isBrandOrRH&&(
          <div className="detail-wrap">
            <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
              <div className="panel">
                <DetailHeader onBack={()=>setView('grid')}/>
                <div className="meta-grid" style={{marginTop:'0.7rem'}}>
                  <div className="meta-field"><div className="meta-label">Sportart</div><LocalInput className="meta-input" value={item.sport||''} onChange={e=>upd(item.id,'sport',e.target.value)}/></div>
                  <div className="meta-field"><div className="meta-label">Alter</div><LocalInput className="meta-input" value={item.alter||''} onChange={e=>upd(item.id,'alter',e.target.value)}/></div>
                  <div className="meta-field"><div className="meta-label">Verein / Team</div><LocalInput className="meta-input" value={item.league||''} onChange={e=>upd(item.id,'league',e.target.value)}/></div>
                  <div className="meta-field"><div className="meta-label">Management</div><LocalInput className="meta-input" value={item.management||''} onChange={e=>upd(item.id,'management',e.target.value)}/></div>
                  <div className="meta-field meta-full"><div className="meta-label">Erfolge</div><LocalTextarea className="meta-textarea" value={item.erfolge||''} onChange={e=>upd(item.id,'erfolge',e.target.value)} placeholder="Titel, Auszeichnungen…"/></div>
                  <div className="leistung-box">
                    <div className="leistung-header">
                      <div className="meta-label" style={{display:'flex',alignItems:'center',gap:'0.3rem'}}><Zap size={9} color="#D4AF37"/> Leistungsdaten</div>
                      <button className="leistung-refresh" onClick={()=>refreshLeistung(item.id)} disabled={!!leistungLoading[item.id]}>
                        {leistungLoading[item.id]?<><Loader size={8} style={{animation:'spin 1s linear infinite'}}/> Lädt…</>:<><RefreshCw size={8}/> KI-Update</>}
                      </button>
                    </div>
                    {item.leistungsdaten
                      ?<LocalTextarea style={{width:'100%',background:'transparent',border:'none',outline:'none',fontSize:'0.7rem',color:'#ccc',lineHeight:1.8,resize:'vertical',fontFamily:"'Barlow',sans-serif",minHeight:'55px',padding:0}} value={item.leistungsdaten} onChange={e=>upd(item.id,'leistungsdaten',e.target.value)}/>
                      :<div className="leistung-empty">„KI-Update" für aktuelle Statistiken</div>
                    }
                  </div>
                  {item.image&&!imgAdjusted[item.id]&&(
                    <div className="img-pos-wrap">
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div className="meta-label" style={{display:'flex',alignItems:'center',gap:'0.3rem'}}><Move size={9} color="#888"/> Bildausschnitt</div>
                        <button onClick={()=>setImgAdjusted(p=>({...p,[item.id]:true}))} style={{background:'rgba(212,175,55,0.15)',border:'1px solid rgba(212,175,55,0.3)',borderRadius:'0.35rem',padding:'0.18rem 0.6rem',fontSize:'0.5rem',fontWeight:700,color:'#D4AF37',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",textTransform:'uppercase'}}>✓ Fertig</button>
                      </div>
                      <div className="img-preview-box"><img src={item.image} alt="preview" style={{objectPosition:`${item.imgX??50}% ${item.imgY??50}%`}}/></div>
                      <div className="img-pos-controls">
                        <div className="pos-field"><div className="meta-label">Horizontal</div><input type="range" min={0} max={100} value={item.imgX??50} onChange={e=>upd(item.id,'imgX',+e.target.value)}/></div>
                        <div className="pos-field"><div className="meta-label">Vertikal</div><input type="range" min={0} max={100} value={item.imgY??50} onChange={e=>upd(item.id,'imgY',+e.target.value)}/></div>
                      </div>
                    </div>
                  )}
                  {item.image&&imgAdjusted[item.id]&&(
                    <div style={{gridColumn:'span 2'}}>
                      <button onClick={()=>setImgAdjusted(p=>({...p,[item.id]:false}))} style={{background:'none',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'0.4rem',padding:'0.2rem 0.65rem',fontSize:'0.46rem',fontWeight:700,color:'#666',cursor:'pointer',fontFamily:"'Barlow',sans-serif",textTransform:'uppercase',display:'flex',alignItems:'center',gap:'0.3rem'}}><Move size={9}/> Bildausschnitt anpassen</button>
                    </div>
                  )}
                  <InstaCard item={item} upd={upd}/>
                  <BrandDealsSection item={item} upd={upd}/>
                </div>
              </div>
            </div>
            <RightCol/>
          </div>
        )}
      </div>
    </div>
  );
}
