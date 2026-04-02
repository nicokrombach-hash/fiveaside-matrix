import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ChevronLeft, User, Plus, Trash2, Upload, Building2, Users, RefreshCw, Move, Instagram, ExternalLink, Loader, Zap, Search, Calendar, FileText, BarChart2 } from 'lucide-react';

const LOGO_SRC = '/fa_logo.jpg';
const SUPABASE_URL = 'https://euudeiogircwlvzmsmsr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uPz_tUHK-jgtGSa2tstLHQ_mO1nF-63';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Konfigurationen für die verschiedenen Card-Typen
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

const LEAD_STATUSES = [
  { value:'neu',         label:'Neu / Prospect',       color:'#888',    bg:'rgba(136,136,136,0.12)' },
  { value:'kontaktiert', label:'Kontaktiert / Pitch',  color:'#3b82f6', bg:'rgba(59,130,246,0.12)'  },
  { value:'verhandlung', label:'Verhandlung',           color:'#D4AF37', bg:'rgba(212,175,55,0.12)'  },
  { value:'aktiv',       label:'Abgeschlossen / Aktiv', color:'#22c55e', bg:'rgba(34,197,94,0.12)'   },
  { value:'hold',        label:'On Hold / Verloren',    color:'#ef4444', bg:'rgba(239,68,68,0.12)'   },
];

// Hilfsfunktionen
function calcScores(scores, cfg) {
  if (!scores) return { synergie:0, impact:0, total:0 };
  const keys = cfg.map(c=>c.k);
  const synergie = scores[keys[4]] ?? 5;
  const impact = ((scores[keys[1]]??5)+(scores[keys[2]]??5))/2;
  const total = cfg.reduce((s,c)=>s+(scores[c.k]??0),0)/cfg.length;
  return { synergie, impact, total:Math.round(total*10)/10 };
}
function getLeadStatus(val) { return LEAD_STATUSES.find(s=>s.value===val)||LEAD_STATUSES[0]; }
function newScores(cfg) { return cfg.reduce((a,c)=>({...a,[c.k]:5}),{}); }

// Lead Status Badge Komponente
function LeadBadge({ status, onChange }) {
  const s = getLeadStatus(status);
  return (
    <div style={{position:'relative', display:'inline-block'}}>
      <select 
        value={status||'neu'} 
        onChange={e=>onChange(e.target.value)}
        style={{
          appearance:'none', background:s.bg, border:`1px solid ${s.color}40`, borderRadius:'0.45rem',
          padding:'0.22rem 1.6rem 0.22rem 0.65rem', fontSize:'0.52rem', fontWeight:700, color:s.color,
          cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif", textTransform:'uppercase', outline:'none'
        }}>
        {LEAD_STATUSES.map(ls=><option key={ls.value} value={ls.value}>{ls.label}</option>)}
      </select>
    </div>
  );
}

export default function FiveAsideMasterApp() {
  const [activeTab, setActiveTab] = useState('athletes'); // Home, Athletes, Brands
  const [athleteSubTab, setAthleteSubTab] = useState('potenzial'); // Potenzial, FiveAside
  const [fiveAsideSubTab, setFiveAsideSubTab] = useState('athleten'); // Athleten, Brands
  const [db, setDb] = useState({ athletes:[], brands:[], fiveaside_athletes:[], fiveaside_brands:[] });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState('grid');
  
  const rowId = useRef(null);

  // Laden der Daten von Supabase
  useEffect(() => {
    const init = async () => {
      try {
        const { data, error } = await supabase.from('data_store').select('id, content').limit(1).single();
        if (data) {
          rowId.current = data.id;
          setDb(prev => ({ ...prev, ...data.content }));
        }
      } catch (e) {
        console.error("Fehler beim Laden:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const sync = async (newDb) => {
    setDb(newDb);
    await supabase.from('data_store').update({ content: newDb }).eq('id', rowId.current);
  };

  // Logik für die Auswahl der richtigen Liste basierend auf den Reitern
  const getActiveListKey = () => {
    if (activeTab === 'athletes') {
      if (athleteSubTab === 'fiveaside') {
        return fiveAsideSubTab === 'brands' ? 'fiveaside_brands' : 'fiveaside_athletes';
      }
      return 'athletes';
    }
    return 'brands';
  };

  const listKey = getActiveListKey();
  const currentList = db[listKey] || [];

  if (loading) return <div style={{background:'#191919', color:'#D4AF37', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Lädt System...</div>;

  return (
    <div style={{background:'#191919', minHeight:'100vh', color:'#fff', fontFamily:'Barlow, sans-serif'}}>
      {/* Header & Navigation */}
      <header style={{padding:'2rem', borderBottom:'1px solid rgba(255,255,255,0.1)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{fontSize:'1.5rem', fontWeight:900, fontStyle:'italic', color:'#D4AF37'}}>FIVE ASIDE</div>
        
        <nav style={{display:'flex', gap:'1rem', background:'rgba(0,0,0,0.3)', padding:'0.5rem', borderRadius:'1rem'}}>
          <button onClick={() => setActiveTab('athletes')} style={{background: activeTab==='athletes'?'#D4AF37':'transparent', color: activeTab==='athletes'?'#000':'#666', border:'none', padding:'0.5rem 1rem', borderRadius:'0.5rem', cursor:'pointer', fontWeight:700}}>ATHLETEN</button>
          <button onClick={() => setActiveTab('brands')} style={{background: activeTab==='brands'?'#D4AF37':'transparent', color: activeTab==='brands'?'#000':'#666', border:'none', padding:'0.5rem 1rem', borderRadius:'0.5rem', cursor:'pointer', fontWeight:700}}>BRANDS</button>
        </nav>
      </header>

      <main style={{padding:'2rem'}}>
        {/* Unter-Navigation für Athleten */}
        {activeTab === 'athletes' && (
          <div style={{marginBottom:'2rem', display:'flex', gap:'1rem'}}>
            <button onClick={() => setAthleteSubTab('potenzial')} style={{border:'none', background:'transparent', color: athleteSubTab==='potenzial'?'#D4AF37':'#666', fontWeight:700, cursor:'pointer'}}>POTENZIELLE ATHLETEN</button>
            <button onClick={() => setAthleteSubTab('fiveaside')} style={{border:'none', background:'transparent', color: athleteSubTab==='fiveaside'?'#D4AF37':'#666', fontWeight:700, cursor:'pointer'}}>FIVE ASIDE AKQUISE</button>
          </div>
        )}

        {/* Five Aside Sub-Tabs */}
        {activeTab === 'athletes' && athleteSubTab === 'fiveaside' && (
          <div style={{marginBottom:'2rem', padding:'0.5rem', background:'rgba(212,175,55,0.1)', borderRadius:'0.5rem', display:'inline-flex', gap:'1rem'}}>
            <button onClick={() => setFiveAsideSubTab('athleten')} style={{background: fiveAsideSubTab==='athleten'?'#D4AF37':'transparent', border:'none', color: fiveAsideSubTab==='athleten'?'#000':'#D4AF37', padding:'0.3rem 1rem', borderRadius:'0.3rem', cursor:'pointer', fontSize:'0.7rem'}}>ATHLETEN CARDS</button>
            <button onClick={() => setFiveAsideSubTab('brands')} style={{background: fiveAsideSubTab==='brands'?'#D4AF37':'transparent', border:'none', color: fiveAsideSubTab==='brands'?'#000':'#D4AF37', padding:'0.3rem 1rem', borderRadius:'0.3rem', cursor:'pointer', fontSize:'0.7rem'}}>BRAND DEALS</button>
          </div>
        )}

        {/* Grid Ansicht der Karten */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:'1.5rem'}}>
          {currentList.map(item => (
            <div key={item.id} style={{background:'#1E1E1E', borderRadius:'1rem', padding:'1rem', border:'1px solid rgba(255,255,255,0.1)'}}>
              <div style={{height:'150px', background:'#111', borderRadius:'0.5rem', marginBottom:'1rem'}}></div>
              <h3 style={{fontSize:'1rem', margin:'0 0 0.5rem 0'}}>{item.name}</h3>
              {listKey.includes('brands') && <LeadBadge status={item.leadStatus} onChange={(val) => {
                 const newList = currentList.map(i => i.id === item.id ? {...i, leadStatus: val} : i);
                 sync({...db, [listKey]: newList});
              }} />}
            </div>
          ))}
          
          {/* Hinzufügen Button */}
          <button 
            onClick={() => {
              const newItem = { id: Date.now(), name: "Neuer Eintrag", leadStatus: 'neu', scores: newScores(ATHLETE_CFG) };
              sync({ ...db, [listKey]: [...currentList, newItem] });
            }}
            style={{background:'rgba(212,175,55,0.1)', border:'2px dashed #D4AF37', borderRadius:'1rem', color:'#D4AF37', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', minHeight:'200px'}}>
            <Plus size={32} />
          </button>
        </div>
      </main>
    </div>
  );
}
