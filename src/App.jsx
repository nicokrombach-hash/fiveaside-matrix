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
  { k: 'ip',       l: 'IP / Momentum',          s: 'Rechte / Timing',
