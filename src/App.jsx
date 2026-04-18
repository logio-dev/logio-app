import React, { useState, useEffect, useRef, Fragment } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Save, Trash2, BarChart3, FileText, Settings, Menu, X, Home, Check, LogOut, Calendar, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


// ========== Supabase設定 ==========
function sb(table) {
  const _url = 'https://ruomhthswdxylopkhmnh.supabase.co';
  const _key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1b21odGhzd2R4eWxvcGtobW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzQ1NjMsImV4cCI6MjA4NzUxMDU2M30.kH60ggCa7t_M7iJQbTpgJOgUUEl_rMQZM5e6Mob6hEE';
  const base = _url + '/rest/v1/' + table;
  const h = {
    'apikey': _key,
    'Authorization': 'Bearer ' + _key,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  return {
    async select(filter) {
      const url = filter ? (base + '?' + filter) : base;
      const res = await fetch(url, { headers: h });
      if (!res.ok) console.error('select error:', res.status, url);
      return res.json();
    },
    async insert(data) {
      const res = await fetch(base, { method: 'POST', headers: h, body: JSON.stringify(data) });
      return res.json();
    },
    async upsert(data, onConflict) {
      const h2 = Object.assign({}, h, { 'Prefer': 'resolution=merge-duplicates,return=representation' });
      const url = onConflict ? (base + '?on_conflict=' + encodeURIComponent(onConflict)) : base;
      const res = await fetch(url, { method: 'POST', headers: h2, body: JSON.stringify(data) });
      if (!res.ok) { const err = await res.text(); console.error('upsert error:', res.status, err); }
      return res.json();
    },
    async update(data, filter) {
      const res = await fetch(base + '?' + filter, { method: 'PATCH', headers: h, body: JSON.stringify(data) });
      return res.json();
    },
    async delete(filter) {
      const res = await fetch(base + '?' + filter, { method: 'DELETE', headers: h });
      return res.ok;
    }
  };
}

if (typeof window !== 'undefined') {
  window.storage = {
    async get(key) {
      try { const value = localStorage.getItem(key); return value ? { key, value } : null; } catch { return null; }
    },
    async set(key, value) {
      try { localStorage.setItem(key, value); return { key, value }; } catch { return null; }
    }
  };
}

// ========== ★ site_locks ヘルパー ==========
// Supabaseで以下のテーブルを作成してください:
// CREATE TABLE site_locks (
//   id uuid default gen_random_uuid() primary key,
//   site_name text not null unique,
//   user_name text not null,
//   updated_at timestamptz default now()
// );
const siteLocks = {
  async acquire(siteName, userName) {
    try {
      const db = sb('site_locks');
      const existing = await db.select(`site_name=eq.${encodeURIComponent(siteName)}`);
      if (Array.isArray(existing) && existing.length > 0) {
        const lock = existing[0];
        // 自分のロックなら更新して続行
        if (lock.user_name === userName) {
          await db.update({ updated_at: new Date().toISOString() }, `site_name=eq.${encodeURIComponent(siteName)}`);
          return { ok: true, lockedBy: null };
        }
        // 他人のロック → ブロック
        return { ok: false, lockedBy: lock.user_name };
      }
      await db.insert({ site_name: siteName, user_name: userName, updated_at: new Date().toISOString() });
      return { ok: true, lockedBy: null };
    } catch(e) {
      console.error('lock acquire error:', e);
      return { ok: true, lockedBy: null }; // エラー時は通す
    }
  },
  async release(siteName, userName) {
    try {
      await sb('site_locks').delete(`site_name=eq.${encodeURIComponent(siteName)}&user_name=eq.${encodeURIComponent(userName)}`);
    } catch(e) { console.error('lock release error:', e); }
  },
  async check(siteName) {
    try {
      const data = await sb('site_locks').select(`site_name=eq.${encodeURIComponent(siteName)}`);
      if (Array.isArray(data) && data.length > 0) return data[0].user_name;
      return null;
    } catch(e) { return null; }
  }
};

// ========== LOGIOロゴ ==========
function LOGIOLogo({ className = "", size = "md", animated = false }) {
  const sizeStyles = { xs: "text-lg", sm: "text-xl", md: "text-4xl", lg: "text-5xl", xl: "text-6xl" };
  const elephantSizes = { xs: 40, sm: 50, md: 90, lg: 120, xl: 150 };
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@900&display=swap');
        .logio-char { display: inline-block; opacity: ${animated ? 0 : 1}; }
        ${animated ? `
        .logio-char-animated { animation: charFloatUpCinematic 1.8s ease-in-out forwards; }
        .logio-char-0 { animation-delay: 0s; } .logio-char-1 { animation-delay: 0.3s; }
        .logio-char-2 { animation-delay: 0.6s; }
        @keyframes charFloatUpCinematic {
          0% { opacity: 0; transform: translateY(40px) scale(0.95); }
          50% { opacity: 0.5; }
          70% { opacity: 1; transform: translateY(-8px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .elephant-silhouette { opacity: 0; animation: elephantCinematicEntry 2.5s ease-in-out 1.2s forwards; }
        @keyframes elephantCinematicEntry {
          0% { opacity: 0; transform: scale(0.7) translateY(20px); }
          40% { opacity: 0.06; }
          100% { opacity: 0.12; transform: scale(1) translateY(0); }
        }` : ''}
        .elephant-static { opacity: 0.12; }
      `}</style>
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <div className={`absolute inset-0 flex items-center justify-center ${animated ? 'elephant-silhouette' : 'elephant-static'}`}>
          <svg width={elephantSizes[size]} height={elephantSizes[size]} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <g>
              <rect x="70" y="80" width="80" height="60" rx="30" fill="#1C1917" opacity="0.08"/>
              <circle cx="90" cy="70" r="35" fill="#1C1917" opacity="0.08"/>
              <ellipse cx="65" cy="60" rx="20" ry="30" fill="#1C1917" opacity="0.08"/>
              <ellipse cx="115" cy="60" rx="20" ry="30" fill="#1C1917" opacity="0.08"/>
              <path d="M 90,95 Q 85,110 75,125 Q 70,135 65,145 Q 60,155 55,165" stroke="#1C1917" strokeWidth="12" fill="none" opacity="0.08" strokeLinecap="round"/>
              <rect x="75" y="135" width="12" height="30" rx="6" fill="#1C1917" opacity="0.08"/>
              <rect x="95" y="135" width="12" height="30" rx="6" fill="#1C1917" opacity="0.08"/>
              <rect x="115" y="135" width="12" height="30" rx="6" fill="#1C1917" opacity="0.08"/>
              <rect x="135" y="135" width="12" height="30" rx="6" fill="#1C1917" opacity="0.08"/>
              <path d="M 150,110 Q 155,115 158,125" stroke="#1C1917" strokeWidth="5" fill="none" opacity="0.08" strokeLinecap="round"/>
            </g>
          </svg>
        </div>
        <span className={`${sizeStyles[size]} relative z-10`}
          style={{ fontFamily: 'Roboto Condensed, -apple-system, sans-serif', fontWeight: 900, letterSpacing: '0.05em', color: '#1C1917' }}>
          {['W','a','c'].map((c, i) => (
            <span key={i} className={`logio-char ${animated ? `logio-char-animated logio-char-${i}` : ''}`}>{c}</span>
          ))}
        </span>
      </div>
    </>
  );
}

// ===== カウントアップフック（bounce）=====
function useCountUp(target, duration=900) {
  const [val, setVal] = React.useState(0);
  React.useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const startTime = performance.now();
    const bounce = t => t < 0.85 ? 1 - Math.pow(1 - t / 0.85, 3) : 1 + Math.sin((t - 0.85) / 0.15 * Math.PI) * 0.07;
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setVal(Math.round(bounce(progress) * target));
      if (progress < 1) requestAnimationFrame(tick);
      else setVal(target);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return val;
}

// ========== マスタデータ ==========
const MASTER_DATA = {
  projectNames: ['内装解体', 'スケルトン解体', '建物解体', '外装解体', '外構解体', 'アスベスト除去', '設備解体', '躯体解体'],
  salesPersons: ['間野', '八ツ田', '木嶋', '西', '鈴木', '原', '二宮'],
  employees: ['五十嵐悠哉', '折田優作', '稲葉正輝', '井ケ田浩寿', '大野勝也', '石森達也', '一村琢磨', '間野昂平', '西貴大', '二宮翼'],
  inHouseWorkers: ['五十嵐悠哉', '井ケ田浩寿', '稲葉正輝', '石森達也', '一村琢磨', '間野昂平', '折田優作', '大野勝也', '小峯朋宏', '松橋信行', '浅見勇弥', '石田竜二', '田南功紀', '尾崎奈帆', '古山慎祐', '増岡利幸', '森繁信', '西貴大', '二宮翼'],
  inHouseWorkersByDept: {
    '工事1課': ['五十嵐悠哉', '井ケ田浩寿', '稲葉正輝', '石森達也', '一村琢磨', '間野昂平', '折田優作', '大野勝也'],
    '環境課': ['小峯朋宏', '松橋信行', '浅見勇弥', '石田竜二', '田南功紀', '尾崎奈帆', '古山慎祐', '増岡利幸', '森繁信']
  },
  disposalSiteUnitPrices: {
    '入間緑化': {
      '廃プラ': 13000, '木くず': 3500, '断熱材': 7000, 'がら陶': 22000,
      '石膏ボード': 22000, 'コンクリートがら': 22000, '金属くず': 1000,
      '繊維くず': 1300, '非飛散性アスベスト（運搬費含む）': 35000
    }
  },
  outsourcingCompanies: ['TCY興業', 'ALTEQ', '山田興業', '川田工業', 'マルカイ工業', 'MM興業'],
  weather: ['晴', '曇', '雨', '雪'],
  workCategories: ['解体', '清掃', '積込', '搬出'],
  vehicles: ['軽バン', '2td', '3td', '4td', '4tc', '8tc', '増td', '10tc'],
  vehicleNumbersByType: {
    '軽バン': ['た1'], '2td': ['77', '201'],
    '3td': ['8736', '55', '3122', '66', '4514', '33', '3000', '1000', '6000', '44'],
    '4td': ['6994'], '4tc': ['2265', '11', '3214', '858', '8000', '4000', '5000', '8025', '88'],
    '8tc': ['7000'], '増td': ['22'], '10tc': ['181', '381']
  },
  heavyMachinery: ['PC30', 'PC78US', 'PC138US'],
  workingHoursOptions: (() => {
    const options = [];
    for (let hours = 0; hours <= 24; hours++) {
      for (let minutes = 0; minutes < 60; minutes += 30) {
        if (hours === 24 && minutes > 0) break;
        options.push(`${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`);
      }
    }
    return options;
  })(),
  wasteTypes: ['混合廃棄物', '木くず', '廃プラ', 'がら陶', 'コンクリートがら', '金属くず', '石膏ボード', 'ガラス', '断熱材', '繊維くず', '非飛散性アスベスト（運搬費含む）'],
  disposalSites: ['入間緑化', '石坂', 'ワイエム', 'フルハシ', 'ミダック', 'リバー', '二光産業', '木村建設', 'ウムヴェルト', 'ギプロ', '中央環境', '戸部組', '東和アークス'],
  scrapTypes: ['金属くず'],
  buyers: ['小林金属', '高橋金属', 'ナンセイスチール', '服部金属', 'サンビーム', '光田産業', '青木商店', '長沼商事'],
  statuses: ['着工前', '進行中', '完了']
};

const VEHICLE_UNIT_PRICES = {
  '軽バン': 0, '2td': 10000, '3td': 10000, '4td': 15000,
  '4tc': 15000, '8tc': 20000, '増td': 20000, '10tc': 20000
};

const generateId = (prefix) => {
  if (crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
const formatCurrency = (num) => new Intl.NumberFormat('ja-JP').format(num);
const getDayOfWeek = (dateStr) => {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[new Date(dateStr).getDay()];
};

// ========== ブルーglow矢印コンポーネント ==========
function GradChevron({ open = false, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{
        flexShrink: 0,
        transition: 'transform 0.2s ease',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        filter: 'drop-shadow(0 0 4px rgba(59,130,246,0.8))',
      }}>
      <polyline points="6 9 12 15 18 9" stroke="#3b82f6" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
function GradChevronUp({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ flexShrink:0, filter:'drop-shadow(0 0 4px rgba(59,130,246,0.8))' }}>
      <polyline points="18 15 12 9 6 15" stroke="#3b82f6" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

// ========== ★ Header（リロードアイコン追加）==========
function Header({ showMenuButton = false, onMenuClick, onExport, onReload, onSearch, reloading = false, mascots = null }) {
  return (
    <header className="bg-transparent no-print" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
      borderBottom: '1px solid #E8E8E8',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      pointerEvents: 'none',
    }}>
      <style>{`@keyframes logio-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', height:'52px', paddingLeft:'16px', paddingRight:'16px', pointerEvents:'auto' }}>
        {/* 左：ハンバーガー */}
        <div style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)' }}>
          {showMenuButton && (
            <button onClick={onMenuClick} style={{ color:'rgba(28,25,23,0.7)', background:'none', border:'none', cursor:'pointer', padding:'6px', display:'flex', alignItems:'center', justifyContent:'center' }}
              onMouseEnter={e => e.currentTarget.style.color='#1C1917'}
              onMouseLeave={e => e.currentTarget.style.color='rgba(28,25,23,0.7)'}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 8H21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M6 16H18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
        {/* 中央：ロゴ */}
        <span style={{ fontSize:'22px', fontWeight:900, letterSpacing:'0.05em', color:'#1C1917', fontFamily:'Roboto Condensed, -apple-system, sans-serif', userSelect:'none' }}>Wac</span>
        {/* 右：マスコット＋アイコン */}
        <div style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', display:'flex', gap:'2px', alignItems:'center' }}>
          {/* マスコット */}
          {mascots}
          {/* リロード */}
          <button onClick={onReload} title="最新データに更新"
            style={{ color:'rgba(28,25,23,0.45)', background:'none', border:'none', cursor:'pointer', padding:'6px', display:'flex', alignItems:'center', justifyContent:'center' }}
            onMouseEnter={e => e.currentTarget.style.color='#1C1917'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(28,25,23,0.45)'}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: reloading ? 'logio-spin 0.6s linear infinite' : 'none' }}>
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
          {/* エクスポート */}
          <button onClick={onExport} title="エクスポート"
            style={{ color:'rgba(28,25,23,0.45)', background:'none', border:'none', cursor:'pointer', padding:'6px', display:'flex', alignItems:'center', justifyContent:'center' }}
            onMouseEnter={e => e.currentTarget.style.color='#1C1917'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(28,25,23,0.45)'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          {/* 検索 */}
          <button onClick={onSearch} title="現場を検索"
            style={{ color:'rgba(28,25,23,0.45)', background:'none', border:'none', cursor:'pointer', padding:'6px', display:'flex', alignItems:'center', justifyContent:'center' }}
            onMouseEnter={e => e.currentTarget.style.color='#1C1917'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(28,25,23,0.45)'}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function Select({ label, labelEn, options, value, onChange, placeholder = "選択してください", required = false }) {
  return (
    <div className="mb-4">
      <label style={{display:"block",fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>
        {label} / {labelEn} {required && <span style={{color:'#f87171'}}>*</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width:'100%', padding:'10px 12px', background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', borderRadius:9, fontSize:15, outline:'none', boxSizing:'border-box', maxWidth:'100%', fontFamily:'inherit', WebkitAppearance:'none' }}
        required={required}>
        <option value="" style={{background:'#fff',color:'#111'}}>{placeholder}</option>
        {options.map((opt) => <option key={opt} value={opt} style={{background:'#fff',color:'#111'}}>{opt}</option>)}
      </select>
    </div>
  );
}

function DarkSelect({ label, labelEn, options, value, onChange, placeholder = "選択してください" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    };
    if (isOpen) { document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }
  }, [isOpen]);

  return (
    <div className="mb-4 relative" ref={dropdownRef}>
      <label style={{display:"block",fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>
        {label} / {labelEn}
      </label>
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left focus:outline-none transition-colors relative rounded-lg"
        style={{ background: 'rgba(255,255,255,0.08)', border: 'none' }}>
        {selectedOption ? (
          <div>
            <div className="text-white text-base font-medium">{selectedOption.title}</div>
            {selectedOption.subtitle && <div className="text-gray-500 text-xs mt-1">{selectedOption.subtitle}</div>}
          </div>
        ) : (
          <div className="text-gray-500 text-base">{placeholder}</div>
        )}
        <span style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)'}}>
          <GradChevron open={isOpen} size={18}/>
        </span>
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg shadow-xl max-h-80 overflow-y-auto"
          style={{ background: '#2D2D2D', border: '1px solid #3D3D3D' }}>
          {options.map((option) => (
            <button key={option.value} type="button" onClick={() => { onChange(option.value); setIsOpen(false); }}
              className="w-full px-4 py-3 text-left transition-colors relative"
              style={{ borderBottom: '1px solid #3D3D3D' }}
              onMouseEnter={e => e.currentTarget.style.background='#3D3D3D'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <div className="pr-8">
                <div className="text-base font-medium" style={{color:'#fff'}}>{option.title}</div>
                {option.subtitle && <div className="text-xs mt-1" style={{color:'rgba(255,255,255,0.4)'}}>{option.subtitle}</div>}
              </div>
              {value === option.value && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />}
            </button>
          ))}
        </div>
      )}


    </div>
  );
}

function TextInput({ label, labelEn, value, onChange, placeholder = "", type = "text", required = false }) {
  return (
    <div className="mb-4">
      <label style={{display:"block",fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>
        {label} / {labelEn} {required && <span style={{color:'#f87171'}}>*</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'10px 12px', background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', borderRadius:9, fontSize:15, outline:'none', boxSizing:'border-box', maxWidth:'100%', fontFamily:'inherit' }}
        required={required} />
    </div>
  );
}

function Button({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled = false }) {
  const baseClass = "w-full px-6 py-4 font-bold text-lg transition-all flex items-center justify-center gap-2 rounded-lg";
  const variants = {
    primary: disabled ? "opacity-40 cursor-not-allowed" : "text-white",
    secondary: "border text-white",
    danger: "text-white"
  };
  const styles = {
    primary: disabled ? { background: 'rgba(255,255,255,0.1)' } : { background: 'rgba(59,130,246,0.8)' },
    secondary: { background: 'var(--bg3)', border: '1px solid var(--border)' },
    danger: { background: 'rgba(239,68,68,0.8)' }
  };
  return (
    <button onClick={onClick} className={`${baseClass} ${variants[variant]} ${className}`} disabled={disabled} style={styles[variant]}>
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  );
}

function MetricCard({ label, value, unit = "", type = "neutral", rawValue = 0, subValue = null, subLabel = null }) {
  const textStyles = {
    neutral: "text-white", revenue: "text-white",
    cost: "text-red-400/80",
    profit: rawValue > 0 ? "text-blue-400/90" : "text-red-400/80",
    rate: "text-white", scrap: "text-white"
  };
  return (
    <div className="rgba(255,255,255,0.02) rounded-md p-4 flex flex-col gap-2">
      <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">{label}</p>
      <div>
        <p className={`text-xl font-semibold ${textStyles[type]} tabular-nums`}
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
          {unit}{value}
        </p>
        {subValue && <p className="text-gray-500 text-xs mt-1 tabular-nums">{subLabel && <span className="mr-1">{subLabel}</span>}{subValue}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="mb-4 mt-8">
      <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h2>
    </div>
  );
}

// ========== Sidebar ==========
function Sidebar({ currentPage, onNavigate, sidebarOpen, setSidebarOpen, onLogout }) {
  const navItems = [
    { id: 'home', label: 'ホーム', icon: Home },
    { id: 'project', label: 'PROJECT', icon: FileText },
    { id: 'input', label: '日報入力', icon: Plus },
    { id: 'list', label: '日報一覧', icon: FileText },
    { id: 'analysis', label: '原価分析', icon: BarChart3 },
    { id: 'export', label: 'EXPORT', icon: ChevronUp },
    { id: 'settings', label: '設定・編集', icon: Settings }
  ];

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full border-r" style={{background:'#fff', borderColor:'#E8E8E8'}}>
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button onClick={() => setSidebarOpen(false)} className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none">
                <X className="h-6 w-6" style={{color:'#1C1917'}} />
              </button>
            </div>
            <div className="flex-1 h-0 overflow-y-auto" style={{ paddingTop:'calc(env(safe-area-inset-top, 0px) + 20px)', paddingBottom:'16px' }}>
              <div className="flex items-center flex-shrink-0 px-4 mb-8">
                <span style={{fontSize:24,fontWeight:900,letterSpacing:'0.05em',color:'#1C1917',fontFamily:'Roboto Condensed,-apple-system,sans-serif'}}>Wac</span>
              </div>
              <nav className="px-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button key={item.id} onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
                      className="w-full group flex items-center px-3 py-3 text-sm font-medium transition-colors min-h-[48px] rounded-lg"
                      style={{
                        color: isActive ? '#1C1917' : '#999',
                        background: isActive ? '#F4F4F4' : 'transparent',
                        fontWeight: isActive ? 700 : 500,
                      }}>
                      <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="border-t" style={{ borderColor:'#E8E8E8', padding:'16px', paddingBottom:'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              <button onClick={onLogout} className="w-full px-4 py-3 text-sm font-medium transition-colors flex items-center gap-3 rounded-lg"
                style={{ background:'#F4F4F4', border:'none', color:'#666' }}>
                <LogOut className="h-5 w-5" />
                <span>ログアウト</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ========== SplashScreen ==========
function SplashScreen() {
  return (
    <>
      <style>{`
        @keyframes splashBounceIn { 0%{opacity:0;transform:translateY(60px) scale(0.8)} 60%{opacity:1;transform:translateY(-15px) scale(1.05)} 80%{transform:translateY(8px) scale(0.97)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes mascotFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes titleSlide     { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:translateY(0)} }
        .splash-bg { position:fixed;inset:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999; }
        .splash-mascot-kun  { opacity:0; animation:splashBounceIn 0.9s cubic-bezier(0.34,1.56,0.64,1) 0.2s forwards, mascotFloat 2.5s ease-in-out 1.1s infinite; transform-origin:center bottom; }
        .splash-mascot-chan { opacity:0; animation:splashBounceIn 0.9s cubic-bezier(0.34,1.56,0.64,1) 0.5s forwards, mascotFloat 2.5s ease-in-out 1.4s infinite; transform-origin:center bottom; }
        .splash-title { animation:titleSlide 0.6s ease-out 0.8s both; }
        .splash-sub   { animation:titleSlide 0.6s ease-out 1.1s both; }
      `}</style>
      <div className="splash-bg">
        <div style={{display:'flex', gap:24, alignItems:'flex-end', marginBottom:0}}>
          <div className="splash-mascot-kun">
            <img src="/face-kun.svg" alt="フェイスくん" style={{width:130,height:130,filter:'drop-shadow(0 8px 24px rgba(0,0,0,0.5))'}} />
          </div>
          <div className="splash-mascot-chan">
            <img src="/face-chan.svg" alt="フェイスちゃん" style={{width:130,height:130,filter:'drop-shadow(0 8px 24px rgba(0,0,0,0.5))'}} />
          </div>
        </div>
        <div className="splash-title" style={{marginTop:24,textAlign:'center'}}>
          <span style={{fontSize:42,fontWeight:900,letterSpacing:'0.1em',color:'#fff',fontFamily:'Roboto Condensed,-apple-system,sans-serif',textShadow:'0 2px 12px rgba(0,0,0,0.4)'}}>Wac</span>
        </div>
        <div className="splash-sub" style={{marginTop:8}}>
          <span style={{fontSize:13,color:'rgba(255,255,255,0.6)',letterSpacing:'0.08em'}}>現場管理をスマートに</span>
        </div>
      </div>
    </>
  );
}

// ========== LoginPage ==========
function LoginPage({ onLogin }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [mascot, setMascot] = useState('kun'); // 'kun' or 'chan'
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setError('');
    setIsLoggingIn(true);
    await new Promise(r => setTimeout(r, 300)); // アニメーション用ちょっと待つ
    if ((userId === 'face1991' && password === 'face1991') || (userId === 'ryokuka2005' && password === 'ryokuka2005')) {
      onLogin({ type: 'company', userId }); return;
    }
    if (userId === 'admin2026' && password === 'admin2026') {
      onLogin({ type: 'admin', userId }); return;
    }
    const validPartnerIds = ['TCY001', 'ALT001', 'YMD001', 'KWD001', 'MRK001', 'MM001'];
    if (validPartnerIds.includes(userId) && password === userId.toLowerCase()) {
      onLogin({ type: 'partner', userId }); return;
    }
    setIsLoggingIn(false);
    setError('IDまたはパスワードが正しくありません');
  };

  return (
    <>
      <style>{`
        @keyframes loginMascotIdle { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-8px) rotate(1deg)} }
        @keyframes loginMascotError { 0%{transform:translateX(0)} 20%{transform:translateX(-10px) rotate(-5deg)} 40%{transform:translateX(10px) rotate(5deg)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} 100%{transform:translateX(0)} }
        @keyframes loginMascotSuccess { 0%{transform:scale(1) rotate(0)} 30%{transform:scale(1.2) rotate(-10deg)} 60%{transform:scale(1.1) rotate(8deg)} 100%{transform:scale(1) rotate(0)} }
        @keyframes loginFadeIn { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .mascot-idle    { animation: loginMascotIdle 2.5s ease-in-out infinite; transform-origin:center bottom; }
        .mascot-error   { animation: loginMascotError 0.5s ease-in-out; transform-origin:center bottom; }
        .mascot-success { animation: loginMascotSuccess 0.6s ease-in-out; transform-origin:center bottom; }
        .login-card { animation: loginFadeIn 0.5s ease-out; }
        .mascot-toggle { cursor:pointer; transition:opacity .2s; }
        .mascot-toggle:hover { opacity:0.8; }
      `}</style>
      <div style={{minHeight:'100vh', background:'linear-gradient(160deg,#f0f4ff 0%,#faf8ff 60%,#fff0f8 100%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 16px'}}>
        {/* マスコット */}
        <div style={{marginBottom:16, position:'relative'}}>
          <img
            src={mascot === 'kun' ? '/face-kun.svg' : '/face-chan.svg'}
            alt={mascot === 'kun' ? 'フェイスくん' : 'フェイスちゃん'}
            className={`mascot-idle${error ? ' mascot-error' : ''}${isLoggingIn ? ' mascot-success' : ''}`}
            style={{width:120, height:120, filter:'drop-shadow(0 4px 16px rgba(0,0,0,0.15))', display:'block', margin:'0 auto'}}
          />
          {/* 切り替えボタン */}
          <div style={{display:'flex', gap:8, justifyContent:'center', marginTop:10}}>
            <button className="mascot-toggle" onClick={()=>{setMascot('kun');setUserId('');setPassword('');setError('');}}
              style={{width:32,height:32,borderRadius:'50%',border:`2px solid ${mascot==='kun'?'#6366F1':'#E5E7EB'}`,background:mascot==='kun'?'#EEF2FF':'#fff',overflow:'hidden',padding:2}}>
              <img src="/face-kun.svg" alt="くん" style={{width:'100%',height:'100%'}} />
            </button>
            <button className="mascot-toggle" onClick={()=>{setMascot('chan');setUserId('');setPassword('');setError('');}}
              style={{width:32,height:32,borderRadius:'50%',border:`2px solid ${mascot==='chan'?'#EC4899':'#E5E7EB'}`,background:mascot==='chan'?'#FDF2F8':'#fff',overflow:'hidden',padding:2}}>
              <img src="/face-chan.svg" alt="ちゃん" style={{width:'100%',height:'100%'}} />
            </button>
          </div>
          <div style={{display:'flex',gap:24,justifyContent:'center',marginTop:6}}>
            <span style={{fontSize:10,color:mascot==='kun'?'#6366F1':'#9CA3AF',fontWeight:mascot==='kun'?700:400}}>一般</span>
            <span style={{fontSize:10,color:mascot==='chan'?'#EC4899':'#9CA3AF',fontWeight:mascot==='chan'?700:400}}>管理者</span>
          </div>
        </div>

        {/* ログインカード */}
        <div className="login-card" style={{width:'100%', maxWidth:360}}>
          <div style={{textAlign:'center', marginBottom:24}}>
            <span style={{fontSize:32, fontWeight:900, letterSpacing:'0.08em', color:'#1C1917', fontFamily:'Roboto Condensed,-apple-system,sans-serif'}}>Wac</span>
            <p style={{fontSize:12, color: mascot === 'chan' ? '#EC4899' : '#9CA3AF', marginTop:4, fontWeight: mascot === 'chan' ? 700 : 400}}>
              {mascot === 'chan' ? '管理者ログイン' : '現場管理をスマートに'}
            </p>
          </div>
          <div style={{borderRadius:20, padding:24, background:'#fff', boxShadow:'0 8px 32px rgba(0,0,0,0.08)', border:'1px solid rgba(0,0,0,0.06)'}}>
            {[['ID', 'text', userId, setUserId], ['パスワード', 'password', password, setPassword]].map(([lbl, tp, val, setter]) => (
              <div key={lbl} style={{marginBottom:16}}>
                <label style={{display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6}}>{lbl}</label>
                <input type={tp} value={val} onChange={(e) => setter(e.target.value)}
                  onKeyDown={tp === 'password' ? (e) => e.key === 'Enter' && handleLogin() : undefined}
                  placeholder={`${lbl}を入力`}
                  style={{width:'100%', padding:'12px 14px', background:'#F9FAFB', border:'1px solid #E5E7EB', color:'#1C1917', borderRadius:10, fontSize:16, outline:'none', fontFamily:'inherit', boxSizing:'border-box', transition:'border-color .15s'}}
                  onFocus={(e) => e.target.style.borderColor = mascot === 'kun' ? '#6366F1' : '#EC4899'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'} />
              </div>
            ))}
            {error && (
              <div style={{marginBottom:16, padding:'10px 14px', borderRadius:10, fontSize:13, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', color:'#DC2626'}}>
                {error}
              </div>
            )}
            <button onClick={handleLogin} disabled={isLoggingIn}
              style={{width:'100%', padding:'13px', borderRadius:10, fontWeight:700, fontSize:14, background: mascot === 'kun' ? (isLoggingIn ? '#A5B4FC' : '#6366F1') : (isLoggingIn ? '#F9A8D4' : '#EC4899'), color:'#fff', border:'none', cursor: isLoggingIn ? 'not-allowed' : 'pointer', fontFamily:'inherit', transition:'all .2s', boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>
              {isLoggingIn ? '...' : (mascot === 'chan' ? '管理者ログイン' : 'ログイン')}
            </button>
          </div>
        </div>
        <p style={{fontSize:11, color:'#9CA3AF', marginTop:24}}>© 2026 FREAKS lab.</p>
      </div>
    </>
  );
}


// ========== HomePage ==========
function HomePage({ sites, selectedSite, onSelectSite, onNavigate, totals, projectInfo, reports, lockStatus, currentUserId, sitesReady, currentPage, onViewPdf }) {
  const [financeOpen, setFinanceOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [wasteOpen, setWasteOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setSiteDropdownOpen(false);
    };
    if (siteDropdownOpen) { document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }
  }, [siteDropdownOpen]);

  const costRatio = totals.totalRevenue > 0 ? (totals.accumulatedCost / totals.totalRevenue) * 100 : 0;

  // 稼働日数・人工数
  const workingDays = (reports||[]).length;
  const totalInHouseRaw = (reports||[]).reduce((s,r)=>(r.workDetails?.inHouseWorkers||[]).reduce((ss)=>ss+1,s),0);
  const totalOutsourcingRaw = (reports||[]).reduce((s,r)=>(r.workDetails?.outsourcingLabor||[]).reduce((ss,o)=>ss+(parseInt(o.count||o.workers)||0),s),0);
  const totalInHouse = totalInHouseRaw;
  const totalOutsourcing = totalOutsourcingRaw;
  const totalWorkers = totalInHouse + totalOutsourcing;
  const animDays = useCountUp(workingDays);
  const animWorkers = useCountUp(totalWorkers);
  const animInHouse = useCountUp(totalInHouse);
  const animOutsourcing = useCountUp(totalOutsourcing);

  const costRatioFixed = costRatio.toFixed(1);
  let costBarColor = "#3B82F6";
  let costBarBg = "rgba(59,130,246,0.12)";
  let costStatus = "Good";
  if (costRatio >= 85) { costBarColor = "#EF4444"; costBarBg = "rgba(239,68,68,0.12)"; costStatus = "危険"; }
  else if (costRatio >= 70) { costBarColor = "#F59E0B"; costBarBg = "rgba(245,158,11,0.12)"; costStatus = "注意"; }

  const today = new Date(); today.setHours(0,0,0,0);
  const start = projectInfo?.startDate ? new Date(projectInfo.startDate) : null;
  const end = projectInfo?.endDate ? new Date(projectInfo.endDate) : null;
  const totalDays = start && end ? Math.max(1, Math.ceil((end - start) / 86400000)) : 1;
  const elapsedDays = start ? Math.max(0, Math.ceil((today - start) / 86400000)) : 0;
  const remainDays = end ? Math.max(0, Math.ceil((end - today) / 86400000)) : null;
  const progressPercent = Math.min(100, (elapsedDays / totalDays) * 100);

  const selectedSiteData = sites.find(s => s.name === selectedSite);
  const projectNumber = projectInfo?.projectNumber || selectedSiteData?.projectNumber || '';

  const card = { background: 'var(--bg3)', border: 'none', borderRadius: '12px', transition: 'border-color 0.15s ease' };

  // ★ ナビの maxWidth をコンテンツ(max-w-2xl=672px)と統一
  const NAV_MAX_W = '672px';

  // ========== マスコット常駐ロジック ==========
  const [kunPopup, setKunPopup] = React.useState(null);
  const [chanPopup,setChanPopup]= React.useState(null);
  const initKunPos  = () => ({x:window.innerWidth/2 - 58, y:10});
  const initChanPos = () => ({x:window.innerWidth/2 + 26, y:10});
  const [kunPos,  setKunPos]  = React.useState(initKunPos);
  const [chanPos, setChanPos] = React.useState(initChanPos);
  const kunDrag  = React.useRef({ dragging:false, moved:false, ox:0, oy:0 });
  const chanDrag = React.useRef({ dragging:false, moved:false, ox:0, oy:0 });

  const makeDrag = (dragRef, setPos) => ({
    onPointerDown: (e) => {
      e.stopPropagation();
      dragRef.current.dragging = true;
      dragRef.current.moved = false;
      dragRef.current.ox = e.clientX;
      dragRef.current.oy = e.clientY;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      if (!dragRef.current.dragging) return;
      const dx = Math.abs(e.clientX - dragRef.current.ox);
      const dy = Math.abs(e.clientY - dragRef.current.oy);
      if (dx > 3 || dy > 3) dragRef.current.moved = true;
      if (!dragRef.current.moved) return;
      const x = Math.max(0, Math.min(window.innerWidth - 40, e.clientX - 20));
      const y = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - 20));
      setPos({ x, y });
    },
    onPointerUp: (e) => { dragRef.current.dragging = false; },
  });

  const handleKunTap = (e) => {
    if (kunDrag.current.moved) return;
    const now = new Date();
    const h = String(now.getHours()).padStart(2,'0');
    const m = String(now.getMinutes()).padStart(2,'0');
    const s = String(now.getSeconds()).padStart(2,'0');
    const d = ['日','月','火','水','木','金','土'][now.getDay()];
    setKunPopup(`${now.getMonth()+1}/${now.getDate()}(${d}) ${h}:${m}:${s}`);
    setTimeout(() => setKunPopup(null), 3000);
  };

  const handleChanTap = (e) => {
    if (chanDrag.current.moved) return;
    setChanPopup('取得中...');
    const fetchWeather = async (lat, lon) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Asia%2FTokyo`);
        const data = await res.json();
        const wc = data.current_weather?.weathercode;
        const temp = data.current_weather?.temperature;
        const icons = {0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',51:'🌦',53:'🌦',55:'🌧',61:'🌧',63:'🌧',65:'🌧',71:'🌨',73:'🌨',75:'🌨',80:'🌦',81:'🌧',82:'🌧',95:'⛈',96:'⛈',99:'⛈'};
        setChanPopup(`${icons[wc]||'🌡'} ${temp}°C`);
        setTimeout(() => setChanPopup(null), 4000);
      } catch { setChanPopup('取得失敗'); setTimeout(() => setChanPopup(null), 2000); }
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(35.6762, 139.6503)
      );
    } else { fetchWeather(35.6762, 139.6503); }
  };


  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'#F5F7FA' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;700&display=swap');
        :root {
          --bg:      #FFFFFF;
          --bg2:     #FFFFFF;
          --bg3:     #F4F4F4;
          --border:  #E8E8E8;
          --text:    #1C1917;
          --text2:   #666666;
          --text3:   #999999;
          --main:    #2D2D2D;
          --main2:   #3D3D3D;
          --accent:  #2D2D2D;
        }
        html, body { background: #F5F7FA !important; }
        *, *::before, *::after { box-sizing: border-box; }
        * { font-family: 'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        input, select, textarea { font-size: 16px !important; max-width: 100%; width: 100%; box-sizing: border-box; }
        .finance-detail { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease; }
        .finance-detail.open { grid-template-rows: 1fr; }
        .finance-detail > div { overflow: hidden; }
        .logio-progress-track { background: #EBEBEB; border-radius: 999px; overflow: hidden; }
        .logio-progress-bar { border-radius: 999px; transition: width 0.8s ease; }
        .logio-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #22C55E; animation: logiopulse 2s ease infinite; flex-shrink: 0; }
        @keyframes logiopulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        .logio-nav-btn { position:relative; overflow:hidden; transition:all 0.15s ease; }
        .logio-nav-btn:active { transform:scale(0.98); }
        .logio-lbl { font-size: 11px; font-weight: 600; color: var(--text2); letter-spacing: 0.04em; }
        .logio-val-lg { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; color: var(--text); }
        .logio-val-md { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--text); }
        .bg-transparent { background: var(--bg) !important; }
        .min-h-screen { background: var(--bg); }
        .text-white { color: var(--text) !important; }
        .text-gray-300, .text-gray-400, .text-gray-500 { color: var(--text3) !important; }
        .border-white\/\[0\.08\], .border-white\/\[0\.06\] { border-color: var(--border) !important; }
      `}</style>

      {/* ★ コンテンツ: max-w-2xl(672px) + px-4(16px) */}
      <div className="max-w-2xl mx-auto px-5 pt-3 pb-5 w-full" style={{ flex:1, paddingBottom: 'calc(240px + env(safe-area-inset-bottom, 0px))', background:'#F5F7FA' }}>

        {/* 現場セレクター */}
        <div className="relative mb-5" ref={dropdownRef}>
          {!sitesReady ? (
            <div style={{ width:'100%', padding:'14px 16px', borderRadius:14, background:'rgba(255,255,255,0.08)', border:'1.5px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'rgba(255,255,255,0.3)', flexShrink:0 }}/>
              <div style={{ height:14, width:140, borderRadius:6, background:'rgba(255,255,255,0.2)' }}/>
            </div>
          ) : (
          <button onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left"
            style={{ background: '#1E293B', border: 'none', borderRadius: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            {selectedSite ? (
              <div className="flex items-center gap-3">
                <div className="logio-status-dot" />
                <div>
                  <p style={{ fontSize: '17px', fontWeight:700, color:'#fff' }}>{selectedSite}</p>
                  {projectNumber && <p className="text-gray-500 mt-0.5 tracking-wider" style={{ fontSize: '11px', color:'#888', marginTop:2 }}>PROJECT NO.: {projectNumber}</p>}
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '14px', color:'rgba(255,255,255,0.4)' }}>現場を選択してください</span>
            )}
            <GradChevron open={siteDropdownOpen} size={16}/>
          </button>
          )}
          {siteDropdownOpen && (
            <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl shadow-xl overflow-hidden"
              style={{ background: '#fff', border: '1px solid #E8E8E8' }}>
              {sites.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">現場が登録されていません</div>
              ) : sites.map(site => (
                <button key={site.name} onClick={() => { onSelectSite(site.name); setSiteDropdownOpen(false); window.scrollTo({top:0,behavior:'instant'}); document.body.scrollTop=0; document.documentElement.scrollTop=0; }}
                  className="w-full px-4 py-3 text-left flex items-center justify-between transition-colors"
                  style={{ borderBottom: '1px solid #F0F0F0' }}
                  onMouseEnter={e => e.currentTarget.style.background='#F7F7F7'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight:600, color:'#1C1917' }}>{site.name}</p>
                    {site.projectNumber && <p style={{ fontSize: '11px', color:'#999', marginTop:2 }}>{site.projectNumber}</p>}
                  </div>
                  {selectedSite === site.name && <Check className="w-4 h-4 text-blue-500" />}
                </button>
              ))}
            </div>
          )}
          {/* sitesReady条件の閉じ */}
        </div>

        {/* ★ ロックバナー（自分以外が入力中の場合） */}
        {selectedSite && lockStatus && lockStatus !== currentUserId && (
          <div style={{
            display:'flex', alignItems:'center', gap:'10px',
            padding:'10px 14px', marginBottom:'12px',
            background:'rgba(245,158,11,0.08)',
            border:'1px solid rgba(245,158,11,0.25)',
            borderRadius:'10px',
          }}>
            <span style={{ fontSize:'18px', flexShrink:0 }}>🔒</span>
            <div>
              <p style={{ fontSize:'12px', fontWeight:700, color:'#f59e0b' }}>入力中: {lockStatus}</p>
              <p style={{ fontSize:'10px', color:'#6b7280', marginTop:'1px' }}>閲覧は可能ですが、日報入力は完了後にお試しください</p>
            </div>
          </div>
        )}

        {selectedSite && (
          <>
            {/* 稼働日数・人工数カード */}
            <div className="mb-2" style={{background:'#fff',borderRadius:18,padding:18,border:'0.5px solid #E8E8E8',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
              <style>{`
                @keyframes breatheSlate {
                  0%,100% { opacity:1; text-shadow:0 0 0px rgba(203,213,225,0); }
                  50%      { opacity:0.55; text-shadow:0 0 24px rgba(203,213,225,0.5); }
                }
                .workers-breathe { animation: breatheSlate 3s ease-in-out infinite; }
              `}</style>
              <div style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.12em',fontFamily:'JetBrains Mono,monospace',marginBottom:14}}>稼働日数 / WORKING DAYS</div>
              <div style={{display:'flex',alignItems:'flex-end',gap:18,marginBottom:16}}>
                <div>
                  <div style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.12em',fontFamily:'JetBrains Mono,monospace',marginBottom:2}}>DAYS</div>
                  <span style={{fontSize:54,fontWeight:700,color:'#111',lineHeight:1,fontVariantNumeric:'tabular-nums'}}>{animDays}</span>
                  <span style={{fontSize:12,color:'#aaa',marginLeft:3}}>日</span>
                </div>
                <div style={{width:1,height:50,background:'#E8E8E8',flexShrink:0,alignSelf:'flex-end',marginBottom:4}}/>
                <div>
                  <div style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.12em',fontFamily:'JetBrains Mono,monospace',marginBottom:2}}>WORKERS</div>
                  <span className="workers-breathe" style={{fontSize:54,fontWeight:700,color:'#FBBF24',lineHeight:1,fontVariantNumeric:'tabular-nums',display:'inline-block'}}>{animWorkers}</span>
                  <span style={{fontSize:12,color:'#aaa',marginLeft:3}}>人</span>
                </div>
              </div>
              <div style={{display:'flex',gap:20,paddingTop:12,borderTop:'1px solid #F0F0F0'}}>
                <div>
                  <p style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.08em',fontFamily:'JetBrains Mono,monospace',marginBottom:3}}>自社</p>
                  <span style={{fontSize:20,fontWeight:700,color:'#111',fontVariantNumeric:'tabular-nums'}}>{totalInHouse}</span>
                  <span style={{fontSize:11,color:'#aaa',marginLeft:2}}>人</span>
                </div>
                <div>
                  <p style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.08em',fontFamily:'JetBrains Mono,monospace',marginBottom:3}}>外注</p>
                  <span style={{fontSize:20,fontWeight:700,color:'#111',fontVariantNumeric:'tabular-nums'}}>{totalOutsourcing}</span>
                  <span style={{fontSize:11,color:'#aaa',marginLeft:2}}>人</span>
                </div>
                <div>
                  <p style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.08em',fontFamily:'JetBrains Mono,monospace',marginBottom:3}}>合計</p>
                  <span style={{fontSize:20,fontWeight:700,color:'#111',fontVariantNumeric:'tabular-nums'}}>{totalWorkers}</span>
                  <span style={{fontSize:11,color:'#aaa',marginLeft:2}}>人</span>
                </div>
              </div>
            </div>



            {/* 産廃処分費カード */}
            {(() => {
              const WASTE_COLORS = ['#d97706','#65a30d','#7c3aed','#0891b2','#dc2626','#f472b6'];
              const wasteByType = {};
              (reports||[]).forEach(r=>(r.wasteItems||[]).forEach(w=>{
                wasteByType[w.material] = (wasteByType[w.material]||0)+(w.amount||0);
              }));
              const wasteEntries = Object.entries(wasteByType).sort((a,b)=>b[1]-a[1]);
              const wasteTotal = wasteEntries.reduce((s,[,v])=>s+v, 0);
              const maxWaste = wasteEntries[0]?.[1]||1;
              const typeCount = wasteEntries.length;
              if (typeCount === 0) return null;

              const R=16, CX=22, CY=22, CIRC=2*Math.PI*R;
              let offset = 0;
              const donutSlices = wasteEntries.map(([name,val],i)=>{
                const dash = (val/wasteTotal)*CIRC;
                const s = { name, val, color:WASTE_COLORS[i%WASTE_COLORS.length], dash, offset };
                offset += dash;
                return s;
              });

              return (
                <div className="overflow-hidden mb-4" style={{background:'#fff',border:'0.5px solid #E8E8E8',borderRadius:'18px',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                  <button onClick={()=>setWasteOpen(!wasteOpen)}
                    style={{ width:'100%', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'none', border:'none', cursor:'pointer' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px', flex:1, marginRight:'10px' }}>
                      <div>
                        <p style={{ fontSize:9, fontWeight:700, color:'#1E3A5F', marginBottom:3, letterSpacing:'.12em', fontFamily:'JetBrains Mono,monospace' }}>産廃処分費 / WASTE DISPOSAL</p>
                        <div style={{ display:'flex', alignItems:'baseline', gap:'6px' }}>
                          <span style={{ fontSize:'20px', fontWeight:700, color:'#111', fontVariantNumeric:'tabular-nums' }}>¥{formatCurrency(wasteTotal)}</span>
                          <span style={{ fontSize:'10px', color:'#aaa' }}>{typeCount}種類</span>
                        </div>
                      </div>
                      <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink:0 }}>
                        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="8"/>
                        {donutSlices.map((s,i)=>(
                          <circle key={i} cx={CX} cy={CY} r={R} fill="none"
                            stroke={s.color} strokeWidth="8"
                            strokeDasharray={`${s.dash} ${CIRC-s.dash}`}
                            strokeDashoffset={-(s.offset-CIRC/4)}
                            transform={`rotate(-90 ${CX} ${CY})`}/>
                        ))}
                        <text x={CX} y={CY+3} textAnchor="middle" fontSize="8" fontWeight="700" fill="#666">{typeCount}種</text>
                      </svg>
                    </div>
                    <GradChevron open={wasteOpen} size={16}/>
                  </button>
                  <div style={{ display: wasteOpen ? 'block' : 'none', borderTop:'1px solid #F0F0F0' }}>
                    <div style={{ padding:'4px 14px 16px' }}>
                      <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                        {wasteEntries.map(([name,val],i)=>{
                          const color = WASTE_COLORS[i%WASTE_COLORS.length];
                          const pct = Math.round((val/maxWaste)*100);
                          return (
                            <div key={name}>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                                <span style={{ fontSize:'12px', color:'#1C1917', fontWeight:'700' }}>{name}</span>
                                <span style={{ fontSize:'11px', color:'#555', fontWeight:'700' }}>¥{formatCurrency(val)}</span>
                              </div>
                              <div style={{ height:'5px', background:'rgba(0,0,0,0.08)', borderRadius:'3px' }}>
                                <div style={{ height:'5px', width:`${pct}%`, background:color, borderRadius:'3px', transition:'width 0.4s ease' }}/>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 解体作業日報カード */}
            {reports && reports.length > 0 && (() => {
              const latest = [...reports].sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
              const latestDate = latest?.date || '';
              const mo = latestDate ? parseInt(latestDate.split('-')[1]) : '';
              const da = latestDate ? parseInt(latestDate.split('-')[2]) : '';
              const dayNames = ['日','月','火','水','木','金','土'];
              const dayName = latestDate ? dayNames[new Date(latestDate).getDay()] : '';
              return (
                <div className="mb-4" style={{background:'#fff',borderRadius:18,padding:'14px 16px',border:'0.5px solid #E8E8E8',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div>
                      <p style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.1em',marginBottom:5}}>REPORT</p>
                      <p style={{fontSize:15,fontWeight:800,color:'#111',marginBottom:5}}>解体作業日報</p>
                      <div style={{display:'flex',gap:6}}>
                        <span style={{fontSize:10,fontWeight:700,color:'#555',background:'#F0F0F0',padding:'2px 8px',borderRadius:20}}>{reports.length}件</span>
                        {latestDate && <span style={{fontSize:10,fontWeight:700,color:'#4ade80',background:'rgba(34,197,94,0.15)',padding:'2px 8px',borderRadius:20}}>最新 {mo}/{da}（{dayName}）</span>}
                      </div>
                    </div>
                    <style>{`@keyframes pdf-pulse{0%,100%{box-shadow:0 0 0 0 rgba(153,27,27,0.7)}50%{box-shadow:0 0 0 10px rgba(153,27,27,0)}}`}</style>
                    <button onClick={()=>onViewPdf&&onViewPdf(latest)}
                      style={{display:'flex',alignItems:'center',gap:7,padding:'11px 18px',background:'#991B1B',border:'1px solid rgba(248,113,113,0.3)',borderRadius:10,cursor:'pointer',flexShrink:0,animation:'pdf-pulse 1.8s ease-out infinite'}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span style={{fontSize:12,fontWeight:700,color:'#fff'}}>PDF</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {!selectedSite && sitesReady && sites.length === 0 && (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: '20vh', marginTop: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '16px' }}>現場が登録されていません</p>
            <button onClick={() => onNavigate('settings')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 32px', background: '#1e2d4a', border: 'none', color: 'rgba(255,255,255,0.85)', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#263a5e'}
              onMouseLeave={e => e.currentTarget.style.background = '#1e2d4a'}>
              <span style={{ fontSize: '15px' }}>＋</span>現場を追加する
            </button>
          </div>
        )}
      </div>

      {/* ★ マスコット（非表示中） */}
      {false && <div {...makeDrag(kunDrag, setKunPos)} onClick={handleKunTap}
        style={{position:'fixed',left:kunPos.x,top:kunPos.y,zIndex:60,cursor:'grab',userSelect:'none',touchAction:'none'}}>
        <img src="/face-kun.svg" alt="くん" style={{width:32,height:32,display:'block',filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.15))',pointerEvents:'none'}} />
        {kunPopup && <div style={{position:'absolute',top:'calc(100% + 2px)',left:'50%',transform:'translateX(-50%)',background:'#1C1917',color:'#fff',borderRadius:8,padding:'4px 8px',fontSize:11,fontWeight:700,whiteSpace:'nowrap',boxShadow:'0 2px 8px rgba(0,0,0,0.3)',pointerEvents:'none',zIndex:100}}>{kunPopup}</div>}
      </div>}
      {false && <div {...makeDrag(chanDrag, setChanPos)} onClick={handleChanTap}
        style={{position:'fixed',left:chanPos.x,top:chanPos.y,zIndex:60,cursor:'grab',userSelect:'none',touchAction:'none'}}>
        <img src="/face-chan.svg" alt="ちゃん" style={{width:32,height:32,display:'block',filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.15))',pointerEvents:'none'}} />
        {chanPopup && <div style={{position:'absolute',top:'calc(100% + 2px)',left:'50%',transform:'translateX(-50%)',background:'#1C1917',color:'#fff',borderRadius:8,padding:'4px 8px',fontSize:11,fontWeight:700,whiteSpace:'nowrap',boxShadow:'0 2px 8px rgba(0,0,0,0.3)',pointerEvents:'none',zIndex:100}}>{chanPopup}</div>}
      </div>}
    </div>
  );
}

// ========== ProjectSettingsPage ==========
function ProjectSettingsPage({ sites, selectedSite, projectInfo, setProjectInfo, onSave, onAddSite, onDeleteSite, onRenameSite, onNavigate, onSelectSite }) {
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [openCard, setOpenCard] = useState(null);
  const [showAllSites, setShowAllSites] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ name: '', amount: '' });
  const [editingName, setEditingName] = useState(null);
  const [editNameVal, setEditNameVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.body.scrollTop=0; document.documentElement.scrollTop=0; }, []);

  const handleAddSite = () => {
    if (!newSiteName.trim()) return alert('現場名を入力してください');
    const name = newSiteName.trim();
    onAddSite(name);
    setNewSiteName(''); setShowAddSite(false);
    // 追加後に自動でカードを開く（少し待ってから）
    setTimeout(() => { setOpenCard(name); onSelectSite && onSelectSite(name); }, 300);
  };

  const handleDeleteSite = (siteName) => {
    if (!confirm(`現場「${siteName}」を削除しますか？\n関連するプロジェクト情報と日報もすべて削除されます。`)) return;
    onDeleteSite(siteName);
    if (openCard === siteName) setOpenCard(null);
  };

  const toggleDisposalSite = (site) => {
    const cur = projectInfo.contractedDisposalSites || [];
    setProjectInfo({ ...projectInfo, contractedDisposalSites: cur.includes(site) ? cur.filter(s=>s!==site) : [...cur, site] });
  };

  const addExpense = () => {
    if (!expenseForm.name || !expenseForm.amount) return;
    setProjectInfo({ ...projectInfo, expenses: [...(projectInfo.expenses||[]), { name: expenseForm.name, amount: parseFloat(expenseForm.amount) }] });
    setExpenseForm({ name: '', amount: '' });
  };
  const removeExpense = (i) => setProjectInfo({ ...projectInfo, expenses: (projectInfo.expenses||[]).filter((_,idx)=>idx!==i) });

  // 案Dアバター: 年 / 番号 ネオン
  const SiteAvatar = ({ pjNo }) => {
    const parts = (pjNo||'').split('-');
    const year = parts[0] || '';
    const num  = parts[1] || '';
    if (!year && !num) return (
      <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.08)', border:'1px dashed rgba(255,255,255,0.1)', fontSize:8, fontWeight:700, color:'rgba(255,255,255,0.45)', textAlign:'center', lineHeight:1.4 }}>未採<br/>番</div>
    );
    return (
      <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg)', border:'1px solid rgba(99,102,241,0.3)', boxShadow:'0 0 12px rgba(99,102,241,0.08) inset', gap:1, padding:2 }}>
        <span style={{ fontSize:7, fontWeight:700, color:'#6366f1', letterSpacing:'.02em', lineHeight:1, textShadow:'0 0 6px rgba(99,102,241,0.8)' }}>{year}</span>
        <div style={{ width:28, height:1, background:'rgba(99,102,241,0.3)' }}/>
        <span style={{ fontSize:12, fontWeight:900, color:'#a5b4fc', lineHeight:1, letterSpacing:'-.02em', textShadow:'0 0 8px rgba(99,102,241,0.7)' }}>{num||'---'}</span>
      </div>
    );
  };

  return (
    <div style={{ background:'#F5F7FA', minHeight:'100vh', color:'#1C1917', width:'100%', maxWidth:'100vw', overflowX:'hidden' }}>
      <div className="max-w-2xl mx-auto px-4 py-6" style={{ paddingBottom:'calc(160px + env(safe-area-inset-bottom,0px))', boxSizing:'border-box', width:'100%', maxWidth:'100%' }}>

        {/* 閉じるボタン */}
        <button onClick={() => onNavigate('home')}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, background:'#fff', border:'0.5px solid #E8E8E8', color:'#1E3A5F', fontSize:12, fontWeight:600, cursor:'pointer', marginBottom:12 }}>
          <X className="w-4 h-4" />閉じる
        </button>

        {/* タイトル */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:18, fontWeight:800, letterSpacing:'-.02em', color:'#111' }}>現場管理</div>
          <div style={{ fontSize:10, color:'#888', textTransform:'uppercase', letterSpacing:'.1em', marginTop:2 }}>Site Management</div>
        </div>

        {/* 新規追加ボタン / フォーム */}
        {!showAddSite ? (
          <button onClick={() => setShowAddSite(true)}
            style={{ width:'100%', padding:'13px 16px', borderRadius:12, border:'1.5px dashed rgba(59,130,246,0.4)', background:'rgba(59,130,246,0.04)', color:'#60a5fa', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:24 }}>
            <Plus className="w-4 h-4" />新規現場を追加
          </button>
        ) : (
          <div style={{ marginBottom:24, padding:16, borderRadius:12, border:'1.5px dashed rgba(59,130,246,0.3)', background:'#EFF6FF' }}>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'#1D4ED8', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8 }}>新規現場名 / Site Name</label>
            <input type="text" value={newSiteName} onChange={e=>setNewSiteName(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleAddSite()}
              placeholder="例: 渋谷〇〇ビル解体工事"
              style={{ width:'100%', padding:'12px 14px', background:'#fff', border:'1px solid #BFDBFE', color:'#1C1917', borderRadius:9, fontSize:16, outline:'none', marginBottom:12, boxSizing:'border-box', maxWidth:'100%' }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <button onClick={handleAddSite} style={{ padding:12, background:'#2563EB', border:'none', color:'#fff', borderRadius:9, fontSize:14, fontWeight:700, cursor:'pointer' }}>追加する</button>
              <button onClick={()=>{setShowAddSite(false);setNewSiteName('');}} style={{ padding:12, background:'#2D2D2D', border:'none', color:'rgba(255,255,255,0.65)', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer' }}>キャンセル</button>
            </div>
          </div>
        )}

        {/* セクションラベル */}
        {sites.length > 0 && (
          <div style={{position:'relative',marginBottom:10}}>
            <svg style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',opacity:0.4,pointerEvents:'none'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="現場名を検索..."
              style={{width:'100%',padding:'9px 12px 9px 32px',borderRadius:9,border:'0.5px solid #E8E8E8',background:'#fff',color:'#111',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}/>
          </div>
        )}
        {sites.length > 0 && (
          <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginBottom:8,paddingLeft:2}}>
            {searchQuery ? `${sites.filter(s=>s.name.toLowerCase().includes(searchQuery.toLowerCase())).length}件 / ${sites.length}件` : `${sites.length}件`}
          </div>
        )}

        {/* アコーディオンカード */}
        {(()=>{
          const filtered = sites.filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()));
          const displayed = (searchQuery || showAllSites) ? filtered : filtered.slice(0, 5);
          const remaining = filtered.length - displayed.length;
          return (<>
            {displayed.map((site) => {
          const isOpen = openCard === site.name;
          const pjNo = site.projectNumber || (site.projectInfo && site.projectInfo.projectNumber) || '';
          // このカードが選択中現場かどうか
          const isSelected = selectedSite === site.name;
          // 開いているカードのprojectInfo = 選択中現場なら親のprojectInfo, それ以外はsite内のデータ
          const cardInfo = isSelected ? projectInfo : (site.projectInfo || {
            workType:'', client:'', workLocation:'', salesPerson:'', siteManager:'',
            startDate:'', endDate:'', contractAmount:'', additionalAmount:'',
            transferCost:'', leaseCost:'', materialsCost:'', status:'', discharger:'',
            transportCompany:'', contractedDisposalSites:[], expenses:[], projectNumber: pjNo,
            outsourcingItems:[], sgaItems:[], siteExpenseItems:[]
          });
          const setCardInfo = isSelected
            ? setProjectInfo
            : (val) => { /* 非選択現場は保存時に別途処理 */ };

          return (
            <div key={site.name} style={{
              borderRadius:12, marginBottom:8, overflow:'hidden',
              width:'100%', maxWidth:'100vw', boxSizing:'border-box', minWidth:0,
              border: 'none',
              background: '#2D2D2D',
              boxShadow: 'none',
              outline: isSelected ? '2px solid #1E293B' : 'none',
            }}>
              {/* カードヘッダー */}
              <button onClick={() => {
                  if (!isSelected && !isOpen) onSelectSite && onSelectSite(site.name);
                  setOpenCard(isOpen ? null : site.name);
                }}
                style={{ width:'100%', padding:'10px 8px', display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
                <SiteAvatar pjNo={pjNo || cardInfo.projectNumber} />
                <div style={{ flex:1, minWidth:0 }}>
                  {editingName === site.name ? (
                    <div style={{ display:'flex', alignItems:'center', gap:6 }} onClick={e=>e.stopPropagation()}>
                      <input
                        type="text" value={editNameVal}
                        onChange={e=>setEditNameVal(e.target.value)}
                        onKeyDown={e=>{ if(e.key==='Enter'){ onRenameSite(site.name,editNameVal); setEditingName(null); } if(e.key==='Escape') setEditingName(null); }}
                        autoFocus
                        style={{ flex:1, padding:'5px 8px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(59,130,246,0.5)', borderRadius:7, color:'#fff', fontSize:14, fontWeight:700, outline:'none' }}
                      />
                      <button onClick={e=>{ e.stopPropagation(); onRenameSite(site.name,editNameVal); setEditingName(null); }}
                        style={{ padding:'5px 10px', borderRadius:7, border:'none', background:'rgba(59,130,246,0.2)', color:'#60a5fa', fontSize:11, fontWeight:700, cursor:'pointer' }}>保存</button>
                      <button onClick={e=>{ e.stopPropagation(); setEditingName(null); }}
                        style={{ padding:'5px 8px', borderRadius:7, border:'none', background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.65)', fontSize:11, cursor:'pointer' }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{site.name}</div>
                      <button onClick={e=>{ e.stopPropagation(); setEditingName(site.name); setEditNameVal(site.name); }}
                        style={{ padding:'2px 6px', borderRadius:5, border:'none', background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.45)', fontSize:9, cursor:'pointer', flexShrink:0 }}>編集</button>
                    </div>
                  )}
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.45)', marginTop:1 }}>
                    {pjNo || cardInfo.projectNumber || '番号未設定'}{cardInfo.status ? ` · ${cardInfo.status}` : ''}
                  </div>
                </div>
                {isSelected && (
                  <span style={{ fontSize:9, fontWeight:700, padding:'3px 7px', borderRadius:99, background:'rgba(34,197,94,0.12)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.2)', flexShrink:0 }}>選択中</span>
                )}
                <GradChevron open={isOpen} size={16}/>
              </button>

              {/* 展開コンテンツ */}
              {isOpen && (
                <div style={{ padding:'0 10px 14px', borderTop:'1px solid #EBEBEB', width:'100%', maxWidth:'100%', boxSizing:'border-box', overflow:'hidden' }}>
                  <div style={{ paddingTop:16, minWidth:0, width:'100%', maxWidth:'100%' }}>
                    {/* 工事番号（読み取り専用） */}
                    <div style={{ marginBottom:14 }}>
                      <label style={{ display:'block', fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>工事番号 / PROJECT NO.</label>
                      <div style={{ padding:'10px 12px', background:'#2D2D2D', border:'none', borderRadius:8, fontSize:14, color:'rgba(255,255,255,0.45)', boxSizing:'border-box', width:'100%' }}>
                        {cardInfo.projectNumber || pjNo || '未採番'}　<span style={{ fontSize:10 }}>※ 自動採番（編集不可）</span>
                      </div>
                    </div>

                    {isSelected ? (
                      <>
                        {/* タブ */}
                        <div style={{display:'flex',gap:4,background:'rgba(255,255,255,0.06)',borderRadius:10,padding:4,marginBottom:16}}>
                          {[['basic','基本情報'],['order','受注情報']].map(([t,label])=>(
                            <button key={t} onClick={()=>setProjectInfo({...projectInfo,_formTab:t})}
                              style={{flex:1,padding:'8px',border:'none',borderRadius:7,fontSize:13,fontWeight:500,cursor:'pointer',
                                background:(projectInfo._formTab||'basic')===t?'#fff':'transparent',
                                color:(projectInfo._formTab||'basic')===t?'#111':'rgba(255,255,255,0.5)',transition:'all 0.15s'}}>
                              {label}
                            </button>
                          ))}
                        </div>

                        {/* 受注情報タブ */}
                        {(projectInfo._formTab||'basic')==='order' && (
                          <div>
                            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>受注情報</div>
                            <div style={{marginBottom:10}}>
                              <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>入金予定日</label>
                              <input type="date" value={projectInfo.paymentDueDate||''} onChange={e=>setProjectInfo({...projectInfo,paymentDueDate:e.target.value})}
                                style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                            </div>
                            <div style={{marginBottom:10}}>
                              <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>支払条件</label>
                              <input type="text" value={projectInfo.paymentTerms||''} onChange={e=>setProjectInfo({...projectInfo,paymentTerms:e.target.value})} placeholder="例) 翌月末"
                                style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
                            </div>
                            <div style={{marginBottom:16}}>
                              <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>請求書送付先</label>
                              <input type="text" value={projectInfo.invoiceRecipient||''} onChange={e=>setProjectInfo({...projectInfo,invoiceRecipient:e.target.value})} placeholder="例) 経理部 田中様"
                                style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
                            </div>
                            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10,borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:14}}>下請情報</div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                              <div>
                                <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>下請金額（税抜）</label>
                                <input type="number" value={projectInfo.subcontractAmount||''} onChange={e=>setProjectInfo({...projectInfo,subcontractAmount:e.target.value})} placeholder="0"
                                  style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'monospace'}}/>
                              </div>
                              <div>
                                <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>下請業者</label>
                                <input type="text" value={projectInfo.subcontractor||''} onChange={e=>setProjectInfo({...projectInfo,subcontractor:e.target.value})} placeholder="例) △△工業"
                                  style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
                              </div>
                            </div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                              <div>
                                <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>支払条件</label>
                                <input type="text" value={projectInfo.subcontractTerms||''} onChange={e=>setProjectInfo({...projectInfo,subcontractTerms:e.target.value})} placeholder="例) 翌々月末"
                                  style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
                              </div>
                              <div>
                                <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>請求書送付先</label>
                                <input type="text" value={projectInfo.subcontractInvoiceRecipient||''} onChange={e=>setProjectInfo({...projectInfo,subcontractInvoiceRecipient:e.target.value})} placeholder="例) 経理部"
                                  style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
                              </div>
                            </div>
                            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10,borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:14}}>書類確認</div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
                              {[{key:'work',label:'WORK表'},{key:'paperManifest',label:'紙マニフェスト'},{key:'eManifest',label:'電子マニフェスト'},{key:'treatmentContract',label:'処理委託契約書'},{key:'estimateContract',label:'見積契約書'},{key:'signboard',label:'看板'},{key:'preInvoice',label:'着工前請求書'},{key:'postInvoice',label:'着工後請求書'},{key:'safetyDocs',label:'安全書類'}].map(({key,label})=>{
                                const chk = projectInfo.documentsChecklist || {};
                                return (
                                  <button key={key} onClick={()=>setProjectInfo({...projectInfo,documentsChecklist:{...chk,[key]:!chk[key]}})}
                                    style={{padding:'8px 6px',borderRadius:8,border:`1px solid ${chk[key]?'rgba(34,197,94,0.4)':'rgba(255,255,255,0.1)'}`,background:chk[key]?'rgba(34,197,94,0.15)':'rgba(255,255,255,0.04)',color:chk[key]?'#4ade80':'rgba(255,255,255,0.5)',fontSize:10,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:4}}>
                                    <span style={{fontSize:12}}>{chk[key]?'☑':'☐'}</span>{label}
                                  </button>
                                );
                              })}
                            </div>
                            <div style={{display:'flex',gap:8,marginTop:8}}>
                              <button onClick={onSave} style={{flex:2,padding:'13px',background:'linear-gradient(135deg,#2563EB,#4f46e5)',border:'none',color:'#fff',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                                <Save className="w-4 h-4"/>保存
                              </button>
                              <button onClick={async()=>{ await onSave(); onNavigate('order_pdf'); }} style={{flex:2,padding:'13px',background:'#991B1B',border:'none',color:'#fff',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                                <FileText className="w-4 h-4"/>受注表PDF
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 基本情報タブ */}
                        {(projectInfo._formTab||'basic')==='basic' && (
                          <>
<Select label="工事種別" labelEn="Work Type" options={MASTER_DATA.projectNames} value={projectInfo.workType||''} onChange={v=>setProjectInfo({...projectInfo,workType:v})} />
                        <TextInput label="発注者" labelEn="Client" value={projectInfo.client||''} onChange={v=>setProjectInfo({...projectInfo,client:v})} placeholder="○○建設株式会社" />
                        <TextInput label="現場住所" labelEn="Site Location" value={projectInfo.workLocation||''} onChange={v=>setProjectInfo({...projectInfo,workLocation:v})} placeholder="東京都渋谷区..." />
                        <Select label="営業担当" labelEn="Sales" options={MASTER_DATA.salesPersons} value={projectInfo.salesPerson||''} onChange={v=>setProjectInfo({...projectInfo,salesPerson:v})} />
                        <Select label="現場責任者" labelEn="Site Manager" options={MASTER_DATA.employees} value={projectInfo.siteManager||''} onChange={v=>setProjectInfo({...projectInfo,siteManager:v})} />
                        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10, marginBottom:24 }}>
                          <div>
                            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>工期開始</label>
                            <input type="date" value={projectInfo.startDate||''} onChange={e=>setProjectInfo({...projectInfo,startDate:e.target.value})}
                              style={{ width:'100%', padding:'11px 12px', background:'#2D2D2D', border:'none', color:'#fff', borderRadius:8, fontSize:15, outline:'none', boxSizing:'border-box' }} />
                          </div>
                          <div>
                            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>工期終了</label>
                            <input type="date" value={projectInfo.endDate||''} onChange={e=>setProjectInfo({...projectInfo,endDate:e.target.value})}
                              style={{ width:'100%', padding:'11px 12px', background:'#2D2D2D', border:'none', color:'#fff', borderRadius:8, fontSize:15, outline:'none', boxSizing:'border-box' }} />
                          </div>
                        </div>
                        <TextInput label="売上（税抜）" labelEn="Revenue" type="number" value={projectInfo.contractAmount||''} onChange={v=>setProjectInfo({...projectInfo,contractAmount:v})} placeholder="5000000" />
                        <TextInput label="追加金額（税抜）" labelEn="Additional" type="number" value={projectInfo.additionalAmount||''} onChange={v=>setProjectInfo({...projectInfo,additionalAmount:v})} placeholder="0" />

                        {/* ★ 現場詳細 */}
                        <div style={{ marginBottom:20, padding:'14px 16px', borderRadius:12, background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.2)' }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>現場詳細 / Site Details</div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
                            <div>
                              <label style={{ display:'block', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>面積 (㎡)</label>
                              <input type="number" value={projectInfo.siteAreaM2||''} onChange={e=>setProjectInfo({...projectInfo,siteAreaM2:e.target.value})} placeholder="例) 150"
                                style={{ width:'100%', padding:'10px', background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', borderRadius:8, fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
                            </div>
                            <div>
                              <label style={{ display:'block', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>坪数 (坪)</label>
                              <input type="number" value={projectInfo.siteTsubo||''} onChange={e=>setProjectInfo({...projectInfo,siteTsubo:e.target.value})} placeholder="例) 45"
                                style={{ width:'100%', padding:'10px', background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', borderRadius:8, fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
                            </div>
                            <div>
                              <label style={{ display:'block', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>業態</label>
                              <input type="text" value={projectInfo.siteUseType||''} onChange={e=>setProjectInfo({...projectInfo,siteUseType:e.target.value})} placeholder="例) 商業"
                                style={{ width:'100%', padding:'10px', background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', borderRadius:8, fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
                            </div>
                          </div>
                          <div>
                            <label style={{ display:'block', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>工事条件</label>
                            <textarea value={projectInfo.workCondition||''} onChange={e=>setProjectInfo({...projectInfo,workCondition:e.target.value})} placeholder="例) アスベスト有り、夜間作業あり..."
                              style={{ width:'100%', padding:'10px', background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit', minHeight:64, resize:'vertical' }} />
                          </div>
                        </div>

                        {/* ===== 経費2分類タブ ===== */}
                        {(()=>{
                          const activeTab = projectInfo._costTab||'out';
                          const MISC_QUICK=['パーキング代','高速代','交通費','経費','道具代','東リース','アクティオ','パノラマ','ペッカー','集塵機','高所作業車','コンプレッサー','ミニユンボ','アタッチメント','アスベスト分析費'];
                          // 自動移行：既存の現場経費・販管費をmiscItemsに統合（初回のみ）
                          const miscItems = projectInfo.miscItems !== undefined ? projectInfo.miscItems :
                            [...(projectInfo.siteExpenseItems||[]), ...(projectInfo.sgaItems||[])];
                          const renderItems=(items,delFn,color,border)=>items.map((item,i)=>(
                            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 10px',borderRadius:9,marginBottom:5,background:'rgba(255,255,255,0.06)',border:'none'}}>
                              <div style={{width:34,height:34,borderRadius:8,background:'rgba(255,255,255,0.1)',color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,flexShrink:0,border:`1px solid ${border}`}}>{item.name.slice(0,3)}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div>
                                <div style={{fontSize:10,color:'rgba(255,255,255,0.55)',fontFamily:'monospace'}}>{item.days?`${item.days}日`:'日数未設定'}</div>
                              </div>
                              <div style={{fontSize:12,fontWeight:700,color:'#fbbf24',fontVariantNumeric:'tabular-nums',whiteSpace:'nowrap'}}>¥{formatCurrency(item.amount)}</div>
                              <button onClick={()=>delFn(i)} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(239,68,68,0.25)',cursor:'pointer',background:'rgba(239,68,68,0.1)',color:'#f87171',fontSize:13,fontWeight:700}}>✕</button>
                            </div>
                          ));
                          const renderForm=(key,quick,color,grad,addFn)=>{
                            const name=projectInfo[`_${key}Name`]||'', days=projectInfo[`_${key}Days`]||'', amt=projectInfo[`_${key}Amt`]||'';
                            const rgb=key==='out'?'59,130,246':'168,85,247';
                            return (
                              <div style={{padding:12,borderRadius:10,background:'rgba(255,255,255,0.06)',border:'none',marginTop:4}}>
                                <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:5}}>直接原価（リース・機材・資材・経費等）</label>
                                <input type="text" value={name} onChange={e=>setProjectInfo({...projectInfo,[`_${key}Name`]:e.target.value})}
                                  placeholder="費用名を入力…" style={{width:'100%',padding:'11px 12px',background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:9,fontSize:16,outline:'none',boxSizing:'border-box',fontFamily:'inherit',marginBottom:8}}/>
                                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:10}}>
                                  {quick.map(q=>(<button key={q} onClick={()=>setProjectInfo({...projectInfo,[`_${key}Name`]:q})}
                                    style={{padding:'5px 9px',borderRadius:7,border:`1px solid ${name===q?`rgba(${rgb},0.5)`:'rgba(255,255,255,0.07)'}`,background:name===q?`rgba(${rgb},0.15)`:'rgba(255,255,255,0.02)',color:name===q?color:'rgba(255,255,255,0.65)',fontSize:11,fontWeight:name===q?700:600,cursor:'pointer',fontFamily:'inherit'}}>{q}</button>))}
                                </div>
                                <div style={{display:'grid',gridTemplateColumns:'1fr 1.5fr',gap:8,marginBottom:8}}>
                                  <div>
                                    <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>使用日数 <span style={{fontWeight:400,color:'rgba(255,255,255,0.3)'}}>(任意)</span></label>
                                    <input type="number" value={days} onChange={e=>setProjectInfo({...projectInfo,[`_${key}Days`]:e.target.value})} placeholder="—" min="0" style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:8,fontSize:16,outline:'none',boxSizing:'border-box',fontFamily:'monospace',colorScheme:'dark'}}/>
                                  </div>
                                  <div>
                                    <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>金額 <span style={{fontWeight:400,color:'rgba(255,255,255,0.3)'}}>(任意)</span></label>
                                    <input type="number" value={amt} onChange={e=>setProjectInfo({...projectInfo,[`_${key}Amt`]:e.target.value})} placeholder="¥0" min="0" style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:8,fontSize:16,outline:'none',boxSizing:'border-box',fontFamily:'monospace',colorScheme:'dark'}}/>
                                  </div>
                                </div>
                                <button disabled={!name} onClick={()=>addFn(name,days,amt)}
                                  style={{width:'100%',padding:'11px',borderRadius:9,border:'none',background:!name?'rgba(255,255,255,0.04)':grad,color:!name?'#374151':'white',fontSize:13,fontWeight:700,cursor:!name?'not-allowed':'pointer',fontFamily:'inherit',opacity:!name?0.4:1}}>
                                  ＋ 追加
                                </button>
                              </div>
                            );
                          };
                          return (
                            <div style={{marginBottom:16}}>
                              {/* リース・機材・資材・経費等のみ */}
                              {renderItems(miscItems,(i)=>setProjectInfo({...projectInfo,miscItems:miscItems.filter((_,j)=>j!==i)}),'#a855f7','rgba(168,85,247,0.12)')}
                              {miscItems.length>0&&<div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'4px 4px',borderTop:'1px solid rgba(168,85,247,0.1)',marginBottom:2}}><span style={{fontSize:10,color:'rgba(255,255,255,0.45)',fontFamily:'monospace'}}>小計</span><span style={{fontSize:14,fontWeight:800,color:'#a855f7',fontVariantNumeric:'tabular-nums'}}>¥{formatCurrency(miscItems.reduce((s,i)=>s+(parseFloat(i.amount)||0),0))}</span></div>}
                              {renderForm('misc',MISC_QUICK,'#a855f7','linear-gradient(135deg,#7c3aed,#a855f7)',(name,days,amt)=>{const ni={name,days:days?parseInt(days):null,amount:parseFloat(amt)||0};setProjectInfo({...projectInfo,miscItems:[...miscItems,ni],_miscName:'',_miscDays:'',_miscAmt:''});})}
                              <div style={{marginTop:12,padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,0.08)',border:'none'}}>
                                <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8,fontFamily:'monospace'}}>コストサマリー</div>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                                  <span style={{fontSize:11,color:'rgba(255,255,255,0.45)'}}>リース・機材・資材・経費等 <span style={{fontSize:9,fontFamily:'monospace'}}>直接原価</span></span>
                                  <span style={{fontSize:13,fontWeight:700,color:'#a855f7',fontVariantNumeric:'tabular-nums'}}>¥{formatCurrency(miscItems.reduce((s,i)=>s+(parseFloat(i.amount)||0),0))}</span>
                                </div>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0 0'}}>
                                  <span style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.45)'}}>直接原価 合計</span>
                                  <span style={{fontSize:16,fontWeight:900,color:'#fff',fontVariantNumeric:'tabular-nums'}}>¥{formatCurrency(miscItems.reduce((s,i)=>s+(parseFloat(i.amount)||0),0))}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                                                                        <Select label="ステータス" labelEn="Status" options={MASTER_DATA.statuses} value={projectInfo.status||''} onChange={v=>setProjectInfo({...projectInfo,status:v})} />
                        {/* マニフェスト */}
                        <div style={{marginBottom:16}}>
                          <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>マニフェスト / MANIFEST</label>
                          {/* 排出事業者（1回のみ） */}
                          <div style={{marginBottom:14}}>
                            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.35)',letterSpacing:'.08em',marginBottom:4}}>排出事業者</div>
                            <input type="text" value={projectInfo.manifestDischarger||''} onChange={e=>setProjectInfo({...projectInfo,manifestDischarger:e.target.value})}
                              placeholder="排出事業者名を入力"
                              style={{width:'100%',padding:'9px 11px',background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
                          </div>
                          <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:12}}>
                            {/* ヘッダー非表示（縦並びに変更） */}
                            {/* 行 */}
                            {(projectInfo.manifestRows||[]).map((row,i)=>(
                              <div key={i} style={{background:'rgba(255,255,255,0.04)',borderRadius:10,padding:'10px 12px',marginBottom:8,position:'relative'}}>
                                <button onClick={()=>{
                                  const rows=(projectInfo.manifestRows||[]).filter((_,j)=>j!==i);
                                  setProjectInfo({...projectInfo,manifestRows:rows});
                                }} style={{position:'absolute',top:8,right:8,width:24,height:24,borderRadius:6,border:'none',background:'rgba(239,68,68,0.15)',color:'#f87171',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,flexShrink:0}}>✕</button>
                                {/* 処分先 */}
                                <div style={{marginBottom:8,paddingRight:32}}>
                                  <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:'.06em',marginBottom:4}}>処分先</div>
                                  <select value={row.disposal||''} onChange={e=>{
                                    const rows=[...(projectInfo.manifestRows||[])];
                                    rows[i]={...rows[i],disposal:e.target.value};
                                    setProjectInfo({...projectInfo,manifestRows:rows});
                                  }} style={{width:'100%',padding:'9px 8px',background:'rgba(255,255,255,0.08)',border:'none',color:row.disposal?'#fff':'rgba(255,255,255,0.3)',borderRadius:8,fontSize:13,outline:'none',fontFamily:'inherit',WebkitAppearance:'none',boxSizing:'border-box'}}>
                                    <option value="" style={{background:'#F3F4F6'}}>処分先を選択</option>
                                    {MASTER_DATA.disposalSites.map(s=><option key={s} value={s} style={{background:'#F3F4F6'}}>{s}</option>)}
                                  </select>
                                  <div style={{display:'flex',gap:4,marginTop:4}}>
                                    <input type="text" value={row._custom||''} onChange={e=>{
                                      const rows=[...(projectInfo.manifestRows||[])];
                                      rows[i]={...rows[i],_custom:e.target.value};
                                      setProjectInfo({...projectInfo,manifestRows:rows});
                                    }} onKeyDown={e=>{
                                      if(e.key==='Enter'&&(row._custom||'').trim()){
                                        const rows=[...(projectInfo.manifestRows||[])];
                                        rows[i]={...rows[i],disposal:row._custom.trim(),_custom:''};
                                        setProjectInfo({...projectInfo,manifestRows:rows});
                                      }
                                    }} placeholder="リストにない場合"
                                      style={{flex:1,padding:'6px 8px',background:'rgba(255,255,255,0.05)',border:'1px dashed rgba(255,255,255,0.12)',color:'#fff',borderRadius:6,fontSize:12,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
                                    <button onClick={()=>{
                                      const v=(row._custom||'').trim();
                                      if(!v) return;
                                      const rows=[...(projectInfo.manifestRows||[])];
                                      rows[i]={...rows[i],disposal:v,_custom:''};
                                      setProjectInfo({...projectInfo,manifestRows:rows});
                                    }} style={{padding:'6px 10px',background:'rgba(59,130,246,0.2)',border:'1px solid rgba(59,130,246,0.3)',color:'#60a5fa',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',fontFamily:'inherit'}}>＋</button>
                                  </div>
                                </div>
                                {/* 運搬会社 + 枚数 */}
                                <div style={{display:'grid',gridTemplateColumns:'1fr 72px',gap:8}}>
                                  <div>
                                    <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:'.06em',marginBottom:4}}>運搬会社</div>
                                    <select value={row.transport||''} onChange={e=>{
                                      const rows=[...(projectInfo.manifestRows||[])];
                                      rows[i]={...rows[i],transport:e.target.value};
                                      setProjectInfo({...projectInfo,manifestRows:rows});
                                    }} style={{width:'100%',padding:'9px 8px',background:'rgba(255,255,255,0.08)',border:'none',color:row.transport?'#fff':'rgba(255,255,255,0.3)',borderRadius:8,fontSize:13,outline:'none',fontFamily:'inherit',WebkitAppearance:'none',boxSizing:'border-box'}}>
                                      <option value="" style={{background:'#F3F4F6'}}>選択</option>
                                      {['自社運搬','入間緑化','奈良商事'].map(t=><option key={t} value={t} style={{background:'#F3F4F6'}}>{t}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.3)',letterSpacing:'.06em',marginBottom:4}}>枚数</div>
                                    <input type="number" min="1" inputMode="numeric" value={row.count||''} onChange={e=>{
                                      const rows=[...(projectInfo.manifestRows||[])];
                                      rows[i]={...rows[i],count:e.target.value};
                                      setProjectInfo({...projectInfo,manifestRows:rows});
                                    }} placeholder="1" style={{padding:'9px 6px',background:'rgba(59,130,246,0.12)',border:'none',color:'#60a5fa',borderRadius:8,fontSize:15,fontWeight:700,outline:'none',textAlign:'center',width:'100%',boxSizing:'border-box',fontFamily:'inherit'}}/>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button onClick={()=>{
                              const rows=[...(projectInfo.manifestRows||[]),{disposal:'',transport:'',count:'1'}];
                              setProjectInfo({...projectInfo,manifestRows:rows});
                            }} style={{width:'100%',padding:'10px',background:'rgba(255,255,255,0.03)',border:'1.5px dashed rgba(255,255,255,0.1)',borderRadius:10,color:'rgba(255,255,255,0.35)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginTop:4}}>
                              ＋ 行を追加
                            </button>
                            {(projectInfo.manifestRows||[]).length>0 && (
                              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 12px',background:'rgba(255,255,255,0.04)',borderRadius:9,marginTop:10}}>
                                <span style={{fontSize:12,color:'#aaa'}}>合計枚数</span>
                                <span style={{fontSize:18,fontWeight:700,color:'#60a5fa'}}>{(projectInfo.manifestRows||[]).reduce((s,r)=>s+(parseInt(r.count)||0),0)}枚</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* 保存・削除 */}
                        <div style={{ display:'flex', gap:8, marginTop:8 }}>
                          <button onClick={onSave} style={{ flex:3, padding:'13px', background:'linear-gradient(135deg,#2563EB,#4f46e5)', border:'none', color:'#fff', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                            <Save className="w-4 h-4" />保存
                          </button>
                          <button onClick={()=>handleDeleteSite(site.name)} style={{ flex:1, padding:'13px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>削除</button>
                        </div>

                          </>
                        )}
                      </>
                    ) : (
                      /* 非選択現場：基本情報のみ表示 + 「この現場を選択して編集」ボタン */
                      <div>
                        <div style={{ padding:'12px 14px', background:'rgba(255,255,255,0.08)', borderRadius:9, marginBottom:14, fontSize:13, color:'rgba(255,255,255,0.65)', lineHeight:1.6 }}>
                          {cardInfo.workType && <div>工事種別：{cardInfo.workType}</div>}
                          {cardInfo.client && <div>発注者：{cardInfo.client}</div>}
                          {cardInfo.status && <div>ステータス：{cardInfo.status}</div>}
                          {!cardInfo.workType && !cardInfo.client && <span style={{ color:'rgba(255,255,255,0.45)' }}>プロジェクト情報未設定</span>}
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={()=>{ onSelectSite && onSelectSite(site.name); setOpenCard(site.name); }}
                            style={{ flex:3, padding:'12px', background:'linear-gradient(135deg,#2563EB,#4f46e5)', border:'none', color:'#fff', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                            この現場を選択して編集
                          </button>
                          <button onClick={()=>handleDeleteSite(site.name)} style={{ flex:1, padding:'12px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>削除</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
            })}
            {remaining > 0 && (
              <button onClick={()=>setShowAllSites(true)}
                style={{width:'100%',padding:'10px',border:'1px dashed #CBD5E1',borderRadius:8,background:'transparent',color:'#1E3A5F',fontSize:12,fontWeight:700,cursor:'pointer',marginTop:4,fontFamily:'inherit'}}>
                ＋ 残り{remaining}件を表示
              </button>
            )}
          </>);
        })()}

        {sites.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,0.45)', fontSize:13 }}>
            現場が登録されていません
          </div>
        )}
      </div>
    </div>
  );
}

// ========== ReportInputPage ==========
const SubTotal = ({ label, value }) => value > 0 ? (
  <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 4px 14px', alignItems:'center' }}>
    <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.45)' }}>{label}小計</span>
    <span style={{ fontSize:'13px', fontWeight:'700', color:'#60A5FA', fontVariantNumeric:'tabular-nums' }}>¥{formatCurrency(value)}</span>
  </div>
) : <div style={{marginBottom:'14px'}} />;

function ReportInputPage({ onSave, onNavigate, projectInfo, onReleaseLock, editReport, onUpdate }) {
  const isEditMode = !!editReport;
  const [currentStep, setCurrentStep] = useState(1);
  const [report, setReport] = useState(
    isEditMode
      ? { date: editReport.date, weather: editReport.weather, recorder: editReport.recorder, customRecorder: '' }
      : { date: new Date().toISOString().split('T')[0], weather: '', recorder: '', customRecorder: '' }
  );
  const [workDetails, setWorkDetails] = useState(
    isEditMode ? (() => {
      const wd = editReport.workDetails || { workCategory:'', workContent:'', inHouseWorkers:[], outsourcingLabor:[], vehicles:[], machinery:[], envItems:[], extItems:[], costItems:[], dailyExpenses:[] };
      return {
        ...wd,
        outsourcingLabor: (wd.outsourcingLabor || []).map(o => ({
          ...o,
          count: parseFloat(o.count || o.workers || 0)
        }))
      };
    })()
    : { workCategory: '', workContent: '', inHouseWorkers: [], outsourcingLabor: [], vehicles: [], machinery: [], envItems: [], extItems: [], costItems: [], dailyExpenses: [] }
  );
  const [wasteItems, setWasteItems] = useState(isEditMode ? (editReport.wasteItems || []) : []);
  const [scrapItems, setScrapItems] = useState(isEditMode ? (editReport.scrapItems || []) : []);
  const [editingWasteIdx, setEditingWasteIdx] = useState(null);
  const [editingScrapIdx, setEditingScrapIdx] = useState(null);
  // ★ 半日追加
  const unitPrices = { inHouseDaytime: 25000, inHouseNighttime: 35000, inHouseNightLoading: 25000, inHouseHalfDay: 12500, outsourcingDaytime: 25000, outsourcingNighttime: 30000 };
  // ★ dept追加
  const [wForm, setWForm] = useState({ name:'', start:'', end:'', shift:'daytime', dept:'k1' });
  const [oForm, setOForm] = useState({ company:'', count:'', shift:'daytime', start:'', end:'' });
  const [vForm, setVForm] = useState({ type:'', number:'' });
  const [mForm, setMForm] = useState({ type:'', price:'' });
  const [wasteForm, setWasteForm] = useState({ type:'', disposal:'', qty:'', unit:'㎥', price:'', manifest:'', haisha:'', driver:'', vType:'', vNumber:'', haishiShift:'', haishiOverride:false, haishiPrice:'' });
  const [scrapForm, setScrapForm] = useState({ type:'金属くず', buyer:'', qty:'', unit:'kg', price:'', manifest:'', volumeM3:'' });
  // ★ 課タブ
  const [currentDept, setCurrentDept] = useState('k1');

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [currentStep]);

  // ★ キャンセル時にロック解放
  const handleCancel = async () => {
    if (confirm('入力内容を破棄してホーム画面に戻りますか？')) {
      if (onReleaseLock) await onReleaseLock();
      window.scrollTo({top:0,behavior:'instant'});
      onNavigate('home');
    }
  };

  const isStep1Valid = () => report.date && report.recorder;
  const [isSaving, setIsSaving] = useState(false);
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const data = { ...report, recorder: report.customRecorder || report.recorder, workDetails, wasteItems, scrapItems };
      if (isEditMode && onUpdate) {
        await onUpdate(editReport.id, data);
      } else {
        await onSave(data);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ★ シフト別単価（半日追加）
  const getShiftAmount = (shift) => {
    if (shift === 'nighttime') return unitPrices.inHouseNighttime;
    if (shift === 'nightLoading') return unitPrices.inHouseNightLoading;
    if (shift === 'halfDay') return unitPrices.inHouseHalfDay;
    return unitPrices.inHouseDaytime;
  };

  const addWorker = () => {
    const actualName = wForm.name.trim();
    if (!actualName||!wForm.start||!wForm.end) return;
    const amount = getShiftAmount(wForm.shift);
    setWorkDetails({...workDetails, inHouseWorkers:[...workDetails.inHouseWorkers,{...wForm,amount}]});
    setWForm({name:'',start:'',end:'',shift:'daytime',dept:currentDept});
  };
  const addOutsource = () => {
    const actualCompany = oForm.company.trim();
    if (!actualCompany||!oForm.count) return;
    const count = parseFloat(oForm.count) || 0;
    const basePrice = oForm.shift==='nighttime'?unitPrices.outsourcingNighttime:unitPrices.outsourcingDaytime;
    const amount = count * basePrice;
    setWorkDetails({...workDetails, outsourcingLabor:[...workDetails.outsourcingLabor,{...oForm,count,amount}]});
    setOForm({company:'',count:'',shift:'daytime',start:'',end:''});
  };
  const addVehicle = () => {
    if (!vForm.type) return;
    setWorkDetails({...workDetails, vehicles:[...workDetails.vehicles,{...vForm,amount:VEHICLE_UNIT_PRICES[vForm.type]||0}]});
    setVForm({type:'',number:'',driver:''});
  };
  const addMachinery = () => {
    if (!mForm.type) return;
    setWorkDetails({...workDetails, machinery:[...workDetails.machinery,{type:mForm.type,unitPrice:parseFloat(mForm.price)||0}]});
    setMForm({type:'',price:''});
  };
  const addEnv = () => {
    if (!envForm.driver) return;
    let unitPrice = 0;
    if (envForm.isOverride) unitPrice = parseFloat(envForm.price)||0;
    else if (envForm.shift) unitPrice = envForm.shift==='day' ? ENV_PRICES.day : ENV_PRICES.night;
    if (!unitPrice) return;
    const count = parseInt(envForm.count)||1;
    const shiftLabel = envForm.isOverride ? '例外' : (envForm.shift==='day'?'昼':'夜');
    setWorkDetails({...workDetails, envItems:[...(workDetails.envItems||[]),{driver:envForm.driver,shift:shiftLabel,count,unitPrice,amount:unitPrice*count}]});
    setEnvForm({driver:'',shift:'',count:1,price:'',isOverride:false});
  };
  const addExt = () => {
    let unitPrice = 0;
    if (extForm.isOverride) unitPrice = parseFloat(extForm.price)||0;
    else if (extForm.shift) unitPrice = extForm.shift==='day' ? EXT_PRICES.day : EXT_PRICES.night;
    if (!unitPrice) return;
    const count = parseInt(extForm.count)||1;
    const shiftLabel = extForm.isOverride ? '例外' : (extForm.shift==='day'?'昼':'夜');
    setWorkDetails({...workDetails, extItems:[...(workDetails.extItems||[]),{company:'ワイエムエコフューチャー',shift:shiftLabel,count,unitPrice,amount:unitPrice*count}]});
    setExtForm({shift:'',count:1,price:'',isOverride:false});
  };
  const addWaste = () => {
    if (!wasteForm.type||!wasteForm.disposal||!wasteForm.qty) return;
    const qty=parseFloat(wasteForm.qty)||0, price=parseFloat(wasteForm.price)||0;
    const ENV_P={day:20000,night:30000}, EXT_P={day:22000,night:32000};
    let haishiAmount=0;
    if(wasteForm.haisha==='env'&&wasteForm.haishiShift) haishiAmount=ENV_P[wasteForm.haishiShift];
    else if(wasteForm.haisha==='ext') haishiAmount=wasteForm.haishiOverride?parseFloat(wasteForm.haishiPrice)||0:(wasteForm.haishiShift?EXT_P[wasteForm.haishiShift]:0);
    const newItem = {
      material:wasteForm.type, disposalSite:wasteForm.disposal,
      quantity:qty, unit:wasteForm.unit, unitPrice:0, amount:price,
      manifestNumber:wasteForm.manifest,
      haisha:wasteForm.haisha||'', driver:wasteForm.driver||'',
      vType:wasteForm.vType||'', vNumber:wasteForm.vNumber||'',
      haishiShift:wasteForm.haishiShift||'', haishiAmount,
    };
    if (editingWasteIdx !== null) {
      const items = [...wasteItems];
      items[editingWasteIdx] = newItem;
      setWasteItems(items);
      setEditingWasteIdx(null);
    } else {
      setWasteItems([...wasteItems, newItem]);
    }
    setWasteForm({type:'',disposal:'',qty:'',unit:'㎥',price:'',manifest:'',haisha:'',driver:'',vType:'',vNumber:'',haishiShift:'',haishiOverride:false,haishiPrice:''});
  };
  const addScrap = () => {
    if (!scrapForm.type||!scrapForm.buyer||!scrapForm.qty) return;
    const qty=parseFloat(scrapForm.qty), total=parseFloat(scrapForm.price)||0;
    const newItem = {type:scrapForm.type,buyer:scrapForm.buyer,quantity:qty,unit:scrapForm.unit,unitPrice:0,amount:-total,manifestNumber:scrapForm.manifest||'',volumeM3:scrapForm.volumeM3?parseFloat(scrapForm.volumeM3):null};
    if (editingScrapIdx !== null) {
      const items = [...scrapItems];
      items[editingScrapIdx] = newItem;
      setScrapItems(items);
      setEditingScrapIdx(null);
    } else {
      setScrapItems([...scrapItems, newItem]);
    }
    setScrapForm({type:'金属くず',buyer:'',qty:'',unit:'kg',price:'',manifest:'',volumeM3:''});
  };

  const shiftLabel = s => s==='nighttime'?'夜間':s==='nightLoading'?'夜積':s==='halfDay'?'半日':'日勤';
  const shiftColor = s => s==='nighttime'?'#8B5CF6':s==='nightLoading'?'#6366F1':s==='halfDay'?'#F59E0B':'#3B82F6';

  const StepDots = () => (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', padding:'14px 0 10px' }}>
      {[1,2,3].map(i => (
        <div key={i} style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: i < currentStep ? '#22c55e' : i === currentStep ? '#2563EB' : 'var(--border)',
          transition: 'all 0.3s ease', flexShrink: 0,
        }} />
      ))}
    </div>
  );

  const mkCard = (accentColor) => ({
    background: '#2D2D2D',
    border: 'none',
    borderRadius: '14px', padding: '16px', marginBottom: '12px', overflow: 'hidden'
  });
  const inputCard      = mkCard('#3b82f6');
  const inputCardCyan  = mkCard('#22d3ee');
  const inputCardAmber = mkCard('#f59e0b');
  const inputCardGreen = mkCard('#34d399');
  const inputCardRose  = mkCard('#f43f5e');
  const inpSel = { width:'100%', padding:'12px 10px', background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', fontSize:'15px', borderRadius:'9px', outline:'none', WebkitAppearance:'none', fontFamily:'inherit', boxSizing:'border-box' };
  const inpTxt = { width:'100%', padding:'12px 10px', background:'rgba(255,255,255,0.08)', border:'none', color:'#fff', fontSize:'15px', borderRadius:'9px', outline:'none', fontFamily:'inherit', boxSizing:'border-box', WebkitAppearance:'none', appearance:'none' };
  const inpLbl = { display:'block', fontSize:'11px', fontWeight:'700', color:'rgba(255,255,255,0.5)', marginBottom:'6px', letterSpacing:'0.04em' };
  const grid2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' };
  const grid3 = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'10px' };

  // ★ ItemCard: アバターは常に1文字
  const ItemCard = ({ avatarBg, avatarColor, avatarText, name, meta, amount, amountColor, onDel }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'rgba(255,255,255,0.08)', border:'none', borderRadius:'12px', marginBottom:'8px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
        <div style={{ width:'34px', height:'34px', borderRadius:'9px', background:avatarBg, color:avatarColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'700', flexShrink:0, fontFamily:'sans-serif' }}>{avatarText}</div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:'13px', fontWeight:'700', color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
          <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.45)', marginTop:'2px' }} dangerouslySetInnerHTML={{__html: meta}} />
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
        <span style={{ fontSize:'13px', fontWeight:'700', color: amountColor||'#60a5fa', whiteSpace:'nowrap' }}>{amount}</span>
        <button onClick={onDel} style={{ width:'32px', height:'32px', borderRadius:'8px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171', fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:700 }}>✕</button>
      </div>
    </div>
  );

  // ★ シフトボタン: 4択（半日追加）
  const ShiftBtns4 = ({ value, onChange }) => (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px' }}>
      {[
        ['daytime',     '日勤',   '#2563EB'],
        ['nighttime',   '夜間',   '#7C3AED'],
        ['nightLoading','夜積',   '#4F46E5'],
        ['halfDay',     '半日',   '#D97706'],
      ].map(([v,label,color])=>(
        <button key={v} onClick={()=>onChange(v)} style={{
          padding:'9px 4px', borderRadius:'8px',
          border:`1.5px solid ${value===v?color:'rgba(255,255,255,0.15)'}`,
          background: value===v?`${color}25`:'rgba(255,255,255,0.06)',
          color: value===v?color:'rgba(255,255,255,0.5)',
          fontSize:'12px', fontWeight:'700', cursor:'pointer', transition:'all 0.15s',
          textAlign:'center', whiteSpace:'nowrap'
        }}>{label}</button>
      ))}
    </div>
  );

  // ★ 課タブ（人数表記なし）
  const DeptTabs = ({ value, onChange }) => (
    <div style={{ display:'flex', gap:'4px', marginBottom:'10px', background:'rgba(255,255,255,0.08)', borderRadius:'10px', padding:'4px', border:'none' }}>
      {[['k1','工事1課'],['ek','環境課']].map(([d,label])=>(
        <button key={d} onClick={()=>onChange(d)}
          style={{
            flex:1, padding:'8px 4px', borderRadius:'7px', border:'none',
            fontFamily:'inherit', fontSize:'12px', fontWeight:'700',
            cursor:'pointer', transition:'all .15s', textAlign:'center',
            background: value===d ? (d==='k1'?'rgba(59,130,246,0.25)':'rgba(34,197,94,0.25)') : 'transparent',
            color: value===d ? (d==='k1'?'#93C5FD':'#6EE7B7') : 'rgba(255,255,255,0.4)'
          }}>{label}</button>
      ))}
    </div>
  );

  const AddBtn = ({ onClick, disabled, label, pulse }) => (
    <>
      <style>{`@keyframes add-pulse{0%,100%{box-shadow:0 0 0 0 rgba(153,27,27,0.7)}50%{box-shadow:0 0 0 10px rgba(153,27,27,0)}}`}</style>
      <button onClick={onClick} disabled={disabled} style={{ width:'100%', padding:'13px', background: disabled?'rgba(255,255,255,0.05)':'#991B1B', border:`1px solid ${disabled?'rgba(255,255,255,0.08)':'rgba(248,113,113,0.3)'}`, borderRadius:'10px', color: disabled?'rgba(255,255,255,0.2)':'#fff', fontSize:'13px', fontWeight:'700', cursor: disabled?'not-allowed':'pointer', marginTop:'8px', animation: !disabled ? 'add-pulse 1.8s ease-out infinite' : 'none' }}>{label || '＋ 追加する'}</button>
    </>
  );

  const SectionLabel = ({ ja, en }) => (
    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
      <span style={{ fontSize:'10px', fontWeight:'700', color:'#fff', textTransform:'uppercase', letterSpacing:'0.08em' }}>{ja} <span style={{color:'rgba(255,255,255,0.4)'}}>/ {en}</span></span>
      <span style={{ flex:1, height:'1px', background:'var(--border)' }} />
    </div>
  );

  const BFooter = ({ onBack, onNext, nextLabel, nextColor, disabled }) => (
    <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'42rem', padding:`12px 16px calc(12px + env(safe-area-inset-bottom,0px))`, background:'#fff', borderTop:'1px solid #E8E8E8', display:'flex', gap:'10px', zIndex:40 }}>
      {onBack && <button onClick={onBack} style={{ flex:1, padding:'15px', background:'#F4F4F4', border:'none', color:'#666', borderRadius:'12px', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>← 戻る</button>}
      <button onClick={onNext} disabled={disabled} style={{ flex:2, padding:'15px', background: disabled?'#E8E8E8': nextColor||'#2563eb', border:'none', color: disabled?'#999':'white', borderRadius:'12px', fontSize:'15px', fontWeight:'700', cursor: disabled?'not-allowed':'pointer' }}>{nextLabel}</button>
    </div>
  );

  const workContent_tags = ['1F解体作業','2F解体作業','外壁解体','基礎解体','内装解体','鉄骨切断','産廃積込','整地作業'];

  return (
    <div style={{ background: isEditMode ? '#111' : '#fff', minHeight:'100vh', overflowX:'hidden' }}>
      <style>{`@keyframes fadeUpIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } .b-panel{animation:fadeUpIn 0.22s ease;} input[type="time"]::-webkit-calendar-picker-indicator { opacity:0; width:0; padding:0; margin:0; } @keyframes addPulse { 0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0.8);background:rgba(59,130,246,0.2);border-color:rgba(59,130,246,0.4)} 50%{box-shadow:0 0 0 10px rgba(59,130,246,0);background:rgba(59,130,246,0.5);border-color:rgba(59,130,246,0.9)} } .btn-pulse { animation: addPulse 2s ease-in-out infinite; }`}</style>

      {/* ヘッダー */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'#fff', backdropFilter:'blur(4px)', borderBottom:'1px solid #E8E8E8', padding:'12px 16px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{ fontSize:'17px', fontWeight:700, color:'#1C1917' }}>{isEditMode ? '日報を編集' : '日報入力'}</span>
            {isEditMode && <span style={{fontSize:10,fontWeight:700,background:'#FEF3C7',color:'#92400E',padding:'2px 8px',borderRadius:20}}>編集中</span>}
          </div>
          <button onClick={handleCancel}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:8, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', color:'#DC2626', cursor:'pointer', fontSize:12, fontWeight:700 }}>
            <X style={{width:13,height:13}}/> キャンセル
          </button>
        </div>
        {!isEditMode && <StepDots />}
      </div>

      {/* 編集モード：1画面 */}
      {isEditMode && (
        <div className="b-panel" style={{ padding:'16px 16px 120px', background:'#1C1C1E', maxWidth:'42rem', margin:'0 auto', boxSizing:'border-box' }}>

          {/* 基本情報 */}
          <SectionLabel ja="基本情報" en="Basic Info" />
          <div style={inputCard}>
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontSize:'11px', color:'rgba(255,255,255,0.5)', marginBottom:'8px', fontWeight:700, letterSpacing:'0.04em' }}>作業日</label>
              <input type="date" value={report.date} onChange={e=>setReport({...report,date:e.target.value})}
                style={{ ...inpTxt, fontSize:'16px', padding:'13px 14px', boxSizing:'border-box', width:'100%', display:'block', WebkitAppearance:'none', textAlign:'left' }} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'11px', color:'rgba(255,255,255,0.5)', marginBottom:'8px', fontWeight:700, letterSpacing:'0.04em' }}>記入者</label>
              <select value={report.recorder} onChange={e=>setReport({...report,recorder:e.target.value,customRecorder:''})} style={{ ...inpSel, padding:'13px 14px', fontSize:'16px' }}>
                <option value="" style={{color:"#000",background:"#fff"}}>選択してください</option>
                {MASTER_DATA.employees.map(n=><option key={n} style={{color:"#000",background:"#fff"}}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* 施工内容 */}
          <SectionLabel ja="施工内容" en="Work Info" />
          <div style={inputCard}>
            <input type="text" placeholder="例）1F解体作業" value={workDetails.workContent} onChange={e=>setWorkDetails({...workDetails,workContent:e.target.value})} style={{...inpTxt,marginBottom:8}} />
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {workContent_tags.map(t=>(
                <button key={t} onClick={()=>setWorkDetails({...workDetails,workContent:t})}
                  style={{padding:'4px 10px',borderRadius:7,border:`1px solid ${workDetails.workContent===t?'rgba(59,130,246,0.5)':'rgba(255,255,255,0.1)'}`,background:workDetails.workContent===t?'rgba(59,130,246,0.2)':'rgba(255,255,255,0.06)',color:workDetails.workContent===t?'#93C5FD':'rgba(255,255,255,0.5)',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 自社人工 */}
          <SectionLabel ja="自社人工" en="In-house" />
          {workDetails.inHouseWorkers.map((w,i)=>(
            <div key={i} style={{background:'#fff',borderRadius:10,padding:'10px 12px',marginBottom:5,display:'flex',alignItems:'center',gap:8,border:'0.5px solid #E8E8E8'}}>
              <div style={{width:30,height:30,borderRadius:8,background:'#EFF6FF',color:'#1D4ED8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:500,flexShrink:0}}>{w.name.charAt(0)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:500,color:'#1C1917'}}>{w.name}</div>
                <div style={{fontSize:10,color:'#999',marginTop:1}}>{w.start} → {w.end}　<span style={{color:shiftColor(w.shift)}}>{shiftLabel(w.shift)}</span></div>
              </div>
              <div style={{fontSize:12,fontWeight:500,color:'#B45309'}}>¥{formatCurrency(w.amount)}</div>
              <button onClick={()=>setWorkDetails({...workDetails,inHouseWorkers:workDetails.inHouseWorkers.filter((_,j)=>j!==i)})}
                style={{width:24,height:24,borderRadius:6,background:'#FEF2F2',border:'0.5px solid #FECACA',color:'#EF4444',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
            </div>
          ))}
          <div style={inputCard}>
            <div style={{marginBottom:8}}>
              <label style={inpLbl}>課</label>
              <DeptTabs value={currentDept} onChange={(d)=>{setCurrentDept(d);setWForm(prev=>({...prev,name:'',dept:d}));}} />
            </div>
            <div style={{marginBottom:8}}>
              <label style={inpLbl}>氏名</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:5}}>
                {(MASTER_DATA.inHouseWorkersByDept[currentDept==='k1'?'工事1課':'環境課']||[]).map(n=>(
                  <button key={n} onClick={()=>setWForm({...wForm,name:n})}
                    style={{padding:'4px 9px',borderRadius:7,border:`1px solid ${wForm.name===n?'rgba(59,130,246,0.5)':'rgba(255,255,255,0.1)'}`,background:wForm.name===n?'rgba(59,130,246,0.3)':'rgba(255,255,255,0.08)',color:wForm.name===n?'#93C5FD':'rgba(255,255,255,0.5)',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{n}</button>
                ))}
              </div>
              <input type="text" value={wForm.name} onChange={e=>setWForm({...wForm,name:e.target.value})} placeholder="直接入力も可" style={inpTxt} />
            </div>
            <div style={{...grid2,marginBottom:8}}>
              <div><label style={inpLbl}>開始</label><select value={wForm.start} onChange={e=>setWForm({...wForm,start:e.target.value})} style={inpSel}><option value="" style={{color:"#000",background:"#fff"}}>--:--</option>{MASTER_DATA.workingHoursOptions.map(t=><option key={t} style={{color:"#000",background:"#fff"}}>{t}</option>)}</select></div>
              <div><label style={inpLbl}>終了</label><select value={wForm.end} onChange={e=>setWForm({...wForm,end:e.target.value})} style={inpSel}><option value="" style={{color:"#000",background:"#fff"}}>--:--</option>{MASTER_DATA.workingHoursOptions.map(t=><option key={t} style={{color:"#000",background:"#fff"}}>{t}</option>)}</select></div>
            </div>
            <div style={{marginBottom:8}}>
              <label style={inpLbl}>区分</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:5}}>
                {[['daytime','日勤','#3b82f6'],['nighttime','夜間','#8b5cf6'],['nightLoading','夜積','#6366f1'],['halfDay','半日','#f59e0b']].map(([v,label,color])=>(
                  <button key={v} onClick={()=>setWForm({...wForm,shift:v})} style={{padding:'8px 4px',borderRadius:8,border:`1px solid ${wForm.shift===v?color:'var(--border)'}`,background:wForm.shift===v?`${color}18`:'var(--bg3)',color:wForm.shift===v?color:'rgba(255,255,255,0.45)',fontSize:11,fontWeight:600,cursor:'pointer',textAlign:'center'}}>{label}</button>
                ))}
              </div>
            </div>
            <AddBtn onClick={addWorker} disabled={!wForm.name.trim()||!wForm.start||!wForm.end} pulse={!!wForm.name.trim()} />
          </div>

          {/* 外注人工 */}
          <SectionLabel ja="外注人工" en="Outsourcing" />
          {workDetails.outsourcingLabor.map((o,i)=>(
            <div key={i} style={{background:'#fff',borderRadius:10,padding:'10px 12px',marginBottom:5,display:'flex',alignItems:'center',gap:8,border:'0.5px solid #E8E8E8'}}>
              <div style={{width:30,height:30,borderRadius:8,background:'#ECFDF5',color:'#065F46',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:500,flexShrink:0}}>{o.company.charAt(0)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:500,color:'#1C1917'}}>{o.company}</div>
                <div style={{display:'flex',alignItems:'center',gap:5,marginTop:4}}>
                  <input type="number" min="1" inputMode="numeric" value={o.count||''} onChange={e=>{
                    const entries=[...workDetails.outsourcingLabor];
                    const newCount=parseInt(e.target.value,10)||0;
                    const newAmount=newCount*(o.shift==='nighttime'?30000:25000);
                    entries[i]={...entries[i],count:newCount,amount:newAmount};
                    setWorkDetails({...workDetails,outsourcingLabor:entries});
                  }} style={{width:44,height:28,border:'1.5px solid #BFDBFE',borderRadius:6,background:'#EFF6FF',color:'#1D4ED8',fontSize:14,fontWeight:500,textAlign:'center',outline:'none',fontFamily:'inherit'}}/>
                  <span style={{fontSize:11,color:'#555'}}>人</span>
                  {o.start && o.end && <span style={{fontSize:10,color:'#999'}}>{o.start}→{o.end}</span>}
                  <span style={{fontSize:10,color:shiftColor(o.shift)}}>{shiftLabel(o.shift)}</span>
                </div>
              </div>
              <div style={{fontSize:12,fontWeight:500,color:'#B45309'}}>¥{formatCurrency(o.amount)}</div>
              <button onClick={()=>setWorkDetails({...workDetails,outsourcingLabor:workDetails.outsourcingLabor.filter((_,j)=>j!==i)})}
                style={{width:24,height:24,borderRadius:6,background:'#FEF2F2',border:'0.5px solid #FECACA',color:'#EF4444',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
            </div>
          ))}
          <div style={inputCardCyan}>
            <div style={{...grid2,marginBottom:8}}>
              <div>
                <label style={inpLbl}>会社名</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:5}}>
                  {MASTER_DATA.outsourcingCompanies.map(c=>(
                    <button key={c} onClick={()=>setOForm({...oForm,company:c})}
                      style={{padding:'3px 8px',borderRadius:6,border:`1px solid ${oForm.company===c?'rgba(34,211,238,0.5)':'rgba(255,255,255,0.07)'}`,background:oForm.company===c?'rgba(34,211,238,0.25)':'rgba(255,255,255,0.08)',color:oForm.company===c?'#67E8F9':'rgba(255,255,255,0.5)',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>{c}</button>
                  ))}
                </div>
                <input type="text" value={oForm.company} onChange={e=>setOForm({...oForm,company:e.target.value})} placeholder="直接入力も可" style={inpTxt} />
              </div>
              <div>
                <label style={inpLbl}>人数</label>
                <select value={oForm.count} onChange={e=>setOForm({...oForm,count:e.target.value})} style={inpSel}>
                  <option value="" style={{color:"#000",background:"#fff"}}>人数を選択</option>
                  {[0.25,0.5,0.75,1,2,3,4,5,6,7,8,9,10].map(n=>(
                    <option key={n} value={String(n)} style={{color:"#000",background:"#fff"}}>{n === 0.25 ? '0.25人 (¼)' : n === 0.5 ? '0.5人 (½)' : n === 0.75 ? '0.75人 (¾)' : `${n}人`}</option>
                  ))}
                </select>
                {oForm.count&&parseFloat(oForm.count)>0&&<div style={{fontSize:10,color:'#60a5fa',textAlign:'right',marginTop:2}}>¥{new Intl.NumberFormat('ja-JP').format(parseFloat(oForm.count)*(oForm.shift==='nighttime'?unitPrices.outsourcingNighttime:unitPrices.outsourcingDaytime))}</div>}
              </div>
            </div>
            <div style={{...grid2,marginBottom:8}}>
              <div><label style={inpLbl}>開始</label><select value={oForm.start} onChange={e=>setOForm({...oForm,start:e.target.value})} style={inpSel}><option value="" style={{color:"#000",background:"#fff"}}>--:--</option>{MASTER_DATA.workingHoursOptions.map(t=><option key={t} style={{color:"#000",background:"#fff"}}>{t}</option>)}</select></div>
              <div><label style={inpLbl}>終了</label><select value={oForm.end} onChange={e=>setOForm({...oForm,end:e.target.value})} style={inpSel}><option value="" style={{color:"#000",background:"#fff"}}>--:--</option>{MASTER_DATA.workingHoursOptions.map(t=><option key={t} style={{color:"#000",background:"#fff"}}>{t}</option>)}</select></div>
            </div>
            <div style={{marginBottom:8}}>
              <label style={inpLbl}>区分</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {[['daytime','日勤','#3b82f6'],['nighttime','夜間','#8b5cf6']].map(([v,label,color])=>(
                  <button key={v} onClick={()=>setOForm({...oForm,shift:v})} style={{padding:'10px',borderRadius:9,border:`1px solid ${oForm.shift===v?color:'var(--border)'}`,background:oForm.shift===v?`${color}18`:'var(--bg3)',color:oForm.shift===v?color:'rgba(255,255,255,0.45)',fontSize:12,fontWeight:600,cursor:'pointer'}}>{label}</button>
                ))}
              </div>
            </div>
            {oForm.count && <div style={{textAlign:'right',fontSize:12,color:'#60a5fa',fontWeight:600,marginBottom:8}}>¥{formatCurrency(parseFloat(oForm.count||0)*(oForm.shift==='nighttime'?unitPrices.outsourcingNighttime:unitPrices.outsourcingDaytime))}</div>}
            <AddBtn onClick={addOutsource} disabled={!oForm.company.trim()||!oForm.count} />
          </div>

          {/* 車両 */}
          <SectionLabel ja="車両" en="Vehicles" />
          {workDetails.vehicles.map((v,i)=>(
            <div key={i} style={{background:'#fff',borderRadius:10,padding:'10px 12px',marginBottom:5,display:'flex',alignItems:'center',gap:8,border:'0.5px solid #E8E8E8'}}>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500,color:'#1C1917'}}>{v.type} <span style={{color:'#999',fontSize:11}}>({v.number})</span></div></div>
              <div style={{fontSize:12,fontWeight:500,color:'#B45309'}}>¥{formatCurrency(v.amount)}</div>
              <button onClick={()=>setWorkDetails({...workDetails,vehicles:workDetails.vehicles.filter((_,j)=>j!==i)})}
                style={{width:24,height:24,borderRadius:6,background:'#FEF2F2',border:'0.5px solid #FECACA',color:'#EF4444',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
            </div>
          ))}
          <div style={inputCard}>
            <div style={grid2}>
              <div><label style={inpLbl}>車種</label><select value={vForm.type} onChange={e=>setVForm({...vForm,type:e.target.value,number:''})} style={inpSel}><option value="" style={{color:"#000",background:"#fff"}}>選択</option>{MASTER_DATA.vehicles.map(v=><option key={v} style={{color:"#000",background:"#fff"}}>{v}</option>)}</select></div>
              <div><label style={inpLbl}>車番 <span style={{color:'rgba(255,255,255,0.3)',fontSize:9}}>(任意)</span></label><select value={vForm.number} onChange={e=>setVForm({...vForm,number:e.target.value})} style={inpSel}><option value="" style={{color:"#000",background:"#fff"}}>選択</option>{(MASTER_DATA.vehicleNumbersByType[vForm.type]||[]).map(n=><option key={n} style={{color:"#000",background:"#fff"}}>{n}</option>)}</select></div>
            </div>
            <AddBtn onClick={addVehicle} disabled={!vForm.type} />
          </div>

          {/* 産廃 */}
          <SectionLabel ja="産廃処分費" en="Waste" />
          {editingWasteIdx === null && wasteItems.length > 0 && (
            <div style={{fontSize:11,color:'rgba(245,158,11,0.8)',marginBottom:6,padding:'5px 10px',background:'rgba(245,158,11,0.06)',borderRadius:7,border:'1px dashed rgba(245,158,11,0.2)'}}>
              ✏️ 行をタップすると編集できます
            </div>
          )}
          {wasteItems.map((w,i)=>(
            <div key={i} onClick={()=>{
              setEditingWasteIdx(i);
              setWasteForm({type:w.material,disposal:w.disposalSite,qty:String(w.quantity),unit:w.unit||'㎥',price:String(w.amount),manifest:w.manifestNumber||'',haisha:w.haisha||'',driver:w.driver||'',vType:w.vType||'',vNumber:w.vNumber||'',haishiShift:w.haishiShift||'',haishiOverride:false,haishiPrice:''});
            }} style={{borderRadius:10,padding:'10px 12px',marginBottom:5,cursor:'pointer',display:'flex',alignItems:'center',gap:8,
              background: editingWasteIdx===i ? 'rgba(245,158,11,0.08)' : '#FFFBEB',
              border: editingWasteIdx===i ? '2px solid rgba(245,158,11,0.6)' : '1px solid #FDE68A'
            }}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:500,color:'#1C1917'}}>{w.material} → {w.disposalSite}</div>
                <div style={{fontSize:10,color:'#999'}}>{w.quantity}{w.unit}　¥{formatCurrency(w.amount)}</div>
              </div>
              {editingWasteIdx===i
                ? <span style={{fontSize:9,background:'rgba(245,158,11,0.2)',color:'#B45309',border:'1px solid rgba(245,158,11,0.4)',borderRadius:4,padding:'2px 7px',flexShrink:0,fontWeight:700}}>編集中</span>
                : <span style={{fontSize:11,color:'rgba(245,158,11,0.6)',flexShrink:0}}>✏️</span>
              }
              <button onClick={e=>{e.stopPropagation();if(editingWasteIdx===i){setEditingWasteIdx(null);setWasteForm({type:'',disposal:'',qty:'',unit:'㎥',price:'',manifest:'',haisha:'',driver:'',vType:'',vNumber:'',haishiShift:'',haishiOverride:false,haishiPrice:''});}setWasteItems(wasteItems.filter((_,j)=>j!==i));}}
                style={{width:24,height:24,borderRadius:6,background:'#FEF2F2',border:'0.5px solid #FECACA',color:'#EF4444',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
            </div>
          ))}
          <div style={inputCardGreen}>
            <div style={grid2}>
              <div><label style={inpLbl}>種類</label><input type="text" value={wasteForm.type} onChange={e=>setWasteForm({...wasteForm,type:e.target.value})} placeholder="木くず・廃プラ等" style={inpTxt} /></div>
              <div>
                <label style={inpLbl}>処分先</label>
                {((projectInfo?.manifestRows||[]).map(r=>r.disposal).filter(Boolean).filter((d,i,a)=>a.indexOf(d)===i).length > 0 || (projectInfo?.contractedDisposalSites||[]).length > 0) && (
                  <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:5}}>
                    {[...(projectInfo?.contractedDisposalSites||[]),...(projectInfo?.manifestRows||[]).map(r=>r.disposal).filter(Boolean).filter(d=>!(projectInfo?.contractedDisposalSites||[]).includes(d)).filter((d,i,a)=>a.indexOf(d)===i)].map(s=>(
                      <button key={s} onClick={()=>setWasteForm({...wasteForm,disposal:s})}
                        style={{padding:'3px 7px',borderRadius:6,border:`1px solid ${wasteForm.disposal===s?'rgba(74,222,128,0.5)':'rgba(255,255,255,0.1)'}`,background:wasteForm.disposal===s?'rgba(74,222,128,0.15)':'rgba(255,255,255,0.06)',color:wasteForm.disposal===s?'#4ade80':'rgba(255,255,255,0.5)',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>{s}</button>
                    ))}
                  </div>
                )}
                <input type="text" value={wasteForm.disposal} onChange={e=>setWasteForm({...wasteForm,disposal:e.target.value})} placeholder="処分先を入力または選択" style={inpTxt} />
              </div>
            </div>
            <div style={grid3}>
              <div><label style={inpLbl}>数量</label><input type="number" step="0.1" value={wasteForm.qty} onChange={e=>setWasteForm({...wasteForm,qty:e.target.value})} placeholder="0" style={inpTxt} /></div>
              <div><label style={inpLbl}>単位</label><select value={wasteForm.unit} onChange={e=>setWasteForm({...wasteForm,unit:e.target.value})} style={inpSel}><option value="㎥" style={{color:"#000",background:"#fff"}}>㎥</option><option value="kg">kg</option><option value="t">t</option></select></div>
              <div><label style={inpLbl}>金額</label><input type="number" value={wasteForm.price} onChange={e=>setWasteForm({...wasteForm,price:e.target.value})} placeholder="0" style={inpTxt} /></div>
            </div>
            <div style={{marginBottom:8}}><label style={inpLbl}>マニNo. <span style={{color:'rgba(255,255,255,0.3)',fontSize:9}}>(任意)</span></label><input type="text" value={wasteForm.manifest} onChange={e=>setWasteForm({...wasteForm,manifest:e.target.value})} placeholder="例）A-12345" style={inpTxt} /></div>
            {/* 配車選択 */}
            <div style={{marginBottom:8}}>
              <label style={inpLbl}>配車</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                {[['','なし','#6B7280'],['env','環境課','#4ade80'],['ext','ワイエム','#a5b4fc']].map(([v,label,color])=>(
                  <button key={v} onClick={()=>setWasteForm({...wasteForm,haisha:v,driver:'',vType:'',vNumber:'',haishiShift:'',haishiOverride:false,haishiPrice:''})}
                    style={{padding:'8px',borderRadius:8,border:`1px solid ${wasteForm.haisha===v?color:'var(--border)'}`,background:wasteForm.haisha===v?`rgba(${v==='env'?'34,197,94':v==='ext'?'99,102,241':'107,114,128'},0.1)`:'var(--bg3)',color:wasteForm.haisha===v?color:'rgba(255,255,255,0.45)',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{label}</button>
                ))}
              </div>
            </div>
            {/* 環境課展開 */}
            {wasteForm.haisha==='env' && (
              <div style={{padding:12,borderRadius:9,background:'#F0FDF4',border:'1px solid #BBF7D0',marginBottom:10}}>
                <label style={{...inpLbl,color:'#4ade80',marginBottom:6}}>運転者（環境課）</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
                  {['小峯朋宏','松橋信行','浅見勇弥','石田竜二','古山慎祐','尾崎奈帆'].map(d=>(
                    <button key={d} onClick={()=>setWasteForm({...wasteForm,driver:d})}
                      style={{padding:'5px 9px',borderRadius:7,border:`1px solid ${wasteForm.driver===d?'rgba(34,197,94,0.5)':'rgba(255,255,255,0.07)'}`,background:wasteForm.driver===d?'rgba(34,197,94,0.15)':'rgba(255,255,255,0.02)',color:wasteForm.driver===d?'#4ade80':'#6B7280',fontSize:11,fontWeight:wasteForm.driver===d?700:600,cursor:'pointer',fontFamily:'inherit'}}>
                      {d.slice(0,2)}
                    </button>
                  ))}
                </div>
                <input type="text" value={wasteForm.driver} onChange={e=>setWasteForm({...wasteForm,driver:e.target.value})} placeholder="その他：名前を入力" style={{...inpTxt,marginBottom:10}}/>
                <label style={{...inpLbl,marginBottom:6}}>使用車両</label>
                <div style={{...grid2,marginBottom:10}}>
                  <div>
                    <label style={inpLbl}>車種</label>
                    <select value={wasteForm.vType||''} onChange={e=>setWasteForm({...wasteForm,vType:e.target.value,vNumber:''})} style={{...inpSel,background:'#fff',color:'#111',border:'1px solid #D1FAE5'}}>
                      <option value="" style={{color:"#000",background:"#fff"}}>車種を選択</option>{MASTER_DATA.vehicles.map(v=><option key={v} style={{color:"#000",background:"#fff"}}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={inpLbl}>車番</label>
                    <select value={wasteForm.vNumber||''} onChange={e=>setWasteForm({...wasteForm,vNumber:e.target.value})} style={{...inpSel,background:'#fff',color:'#111',border:'1px solid #D1FAE5'}}>
                      <option value="" style={{color:"#000",background:"#fff"}}>車番を選択</option>{(MASTER_DATA.vehicleNumbersByType[wasteForm.vType]||[]).map(n=><option key={n} style={{color:"#000",background:"#fff"}}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <label style={{...inpLbl,marginBottom:6}}>シフト</label>
                <div style={grid2}>
                  {[['day','昼',20000],['night','夜',30000]].map(([v,label,price])=>(
                    <button key={v} onClick={()=>setWasteForm({...wasteForm,haishiShift:v})}
                      style={{padding:'10px',borderRadius:9,border:`1px solid ${wasteForm.haishiShift===v?'rgba(34,197,94,0.5)':'rgba(255,255,255,0.08)'}`,background:wasteForm.haishiShift===v?'rgba(34,197,94,0.1)':'rgba(255,255,255,0.02)',cursor:'pointer',fontFamily:'inherit',textAlign:'center'}}>
                      <div style={{fontSize:13,fontWeight:800,color:wasteForm.haishiShift===v?'#4ade80':'#6B7280'}}>{label}</div>
                      <div style={{fontSize:10,fontFamily:'monospace',color:wasteForm.haishiShift===v?'#4ade80':'#374151'}}>¥{formatCurrency(price)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* ワイエム展開 */}
            {wasteForm.haisha==='ext' && (
              <div style={{padding:12,borderRadius:9,background:'#EEF2FF',border:'1px solid #C7D2FE',marginBottom:10}}>
                <div style={{marginBottom:10,padding:'6px 10px',borderRadius:7,background:'rgba(99,102,241,0.1)',fontSize:12,fontWeight:700,color:'#a5b4fc'}}>ワイエムエコフューチャー</div>
                <label style={{...inpLbl,marginBottom:6}}>シフト</label>
                <div style={{...grid2,marginBottom:8}}>
                  {[['day','昼',22000],['night','夜',32000]].map(([v,label,price])=>(
                    <button key={v} onClick={()=>setWasteForm({...wasteForm,haishiShift:v,haishiOverride:false})}
                      style={{padding:'10px',borderRadius:9,border:`1px solid ${!wasteForm.haishiOverride&&wasteForm.haishiShift===v?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.08)'}`,background:!wasteForm.haishiOverride&&wasteForm.haishiShift===v?'rgba(99,102,241,0.1)':'rgba(255,255,255,0.02)',cursor:'pointer',fontFamily:'inherit',textAlign:'center'}}>
                      <div style={{fontSize:13,fontWeight:800,color:!wasteForm.haishiOverride&&wasteForm.haishiShift===v?'#a5b4fc':'#6B7280'}}>{label}</div>
                      <div style={{fontSize:10,fontFamily:'monospace',color:!wasteForm.haishiOverride&&wasteForm.haishiShift===v?'#a5b4fc':'#374151'}}>¥{formatCurrency(price)}</div>
                    </button>
                  ))}
                </div>
                <div style={{...grid2,marginBottom:8}}>
                  <div>
                    <label style={{...inpLbl,marginBottom:4}}>車種 <span style={{fontWeight:400,color:'rgba(255,255,255,0.3)'}}>(任意)</span></label>
                    <select value={wasteForm.vType||''} onChange={e=>setWasteForm({...wasteForm,vType:e.target.value,vNumber:''})} style={{...inpSel,background:'#fff',color:'#111',border:'1px solid #D1FAE5'}}>
                      <option value="" style={{color:"#000",background:"#fff"}}>選択</option>
                      {MASTER_DATA.vehicles.map(v=><option key={v} style={{color:"#000",background:"#fff"}}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{...inpLbl,marginBottom:4}}>車番 <span style={{fontWeight:400,color:'rgba(255,255,255,0.3)'}}>(任意)</span></label>
                    <select value={wasteForm.vNumber||''} onChange={e=>setWasteForm({...wasteForm,vNumber:e.target.value})} style={{...inpSel,background:'#fff',color:'#111',border:'1px solid #D1FAE5'}}>
                      <option value="" style={{color:"#000",background:"#fff"}}>選択</option>
                      {(MASTER_DATA.vehicleNumbersByType[wasteForm.vType]||[]).map(n=><option key={n} style={{color:"#000",background:"#fff"}}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={()=>setWasteForm({...wasteForm,haishiOverride:!wasteForm.haishiOverride,haishiShift:''})}
                  style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit',marginBottom:6}}>
                  <div style={{width:14,height:14,borderRadius:3,border:`1px solid ${wasteForm.haishiOverride?'#6366f1':'#374151'}`,background:wasteForm.haishiOverride?'#6366f1':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',flexShrink:0}}>{wasteForm.haishiOverride?'✓':''}</div>
                  <span style={{fontSize:11,color:wasteForm.haishiOverride?'#a5b4fc':'#4B5563'}}>遠方・例外あり（金額を手入力）</span>
                </button>
                {wasteForm.haishiOverride && (
                  <input type="number" value={wasteForm.haishiPrice} onChange={e=>setWasteForm({...wasteForm,haishiPrice:e.target.value})} placeholder="配車費を入力" style={{...inpTxt,borderColor:'rgba(99,102,241,0.3)'}}/>
                )}
              </div>
            )}
            {editingWasteIdx !== null ? (
              <div style={{display:'flex',gap:6,marginTop:8}}>
                <button onClick={addWaste} disabled={!wasteForm.type||!wasteForm.disposal||!wasteForm.qty}
                  style={{flex:2,padding:'11px',background:'rgba(245,158,11,0.2)',border:'1px solid rgba(245,158,11,0.4)',borderRadius:9,color:'#FCD34D',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✓ この内容で上書き</button>
                <button onClick={()=>{setEditingWasteIdx(null);setWasteForm({type:'',disposal:'',qty:'',unit:'㎥',price:'',manifest:'',haisha:'',driver:'',vType:'',vNumber:'',haishiShift:'',haishiOverride:false,haishiPrice:''});}}
                  style={{flex:1,padding:'11px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,color:'rgba(255,255,255,0.4)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>新規追加</button>
              </div>
            ) : (
              <AddBtn onClick={addWaste} disabled={!wasteForm.type||!wasteForm.disposal||!wasteForm.qty} />
            )}
          </div>

          {/* スクラップ */}
          <SectionLabel ja="スクラップ売上" en="Scrap" />
          {editingScrapIdx === null && scrapItems.length > 0 && (
            <div style={{fontSize:11,color:'rgba(34,197,94,0.8)',marginBottom:6,padding:'5px 10px',background:'rgba(34,197,94,0.06)',borderRadius:7,border:'1px dashed rgba(34,197,94,0.2)'}}>
              ✏️ 行をタップすると編集できます
            </div>
          )}
          {scrapItems.map((s,i)=>(
            <div key={i} onClick={()=>{
              setEditingScrapIdx(i);
              setScrapForm({type:s.type,buyer:s.buyer,qty:String(s.quantity),unit:s.unit||'kg',price:String(Math.abs(s.amount)),manifest:s.manifestNumber||'',volumeM3:s.volumeM3!=null?String(s.volumeM3):''});
            }} style={{borderRadius:10,padding:'10px 12px',marginBottom:5,cursor:'pointer',display:'flex',alignItems:'center',gap:8,
              background: editingScrapIdx===i ? 'rgba(34,197,94,0.08)' : '#ECFDF5',
              border: editingScrapIdx===i ? '2px solid rgba(34,197,94,0.6)' : '1px solid #BBF7D0'
            }}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:500,color:'#1C1917'}}>{s.type} → {s.buyer}</div>
                <div style={{fontSize:10,color:'#999'}}>{s.quantity}{s.unit}　¥{formatCurrency(Math.abs(s.amount))}</div>
              </div>
              {editingScrapIdx===i
                ? <span style={{fontSize:9,background:'rgba(34,197,94,0.2)',color:'#15803D',border:'1px solid rgba(34,197,94,0.4)',borderRadius:4,padding:'2px 7px',flexShrink:0,fontWeight:700}}>編集中</span>
                : <span style={{fontSize:11,color:'rgba(34,197,94,0.6)',flexShrink:0}}>✏️</span>
              }
              <button onClick={e=>{e.stopPropagation();if(editingScrapIdx===i){setEditingScrapIdx(null);setScrapForm({type:'金属くず',buyer:'',qty:'',unit:'kg',price:''});}setScrapItems(scrapItems.filter((_,j)=>j!==i));}}
                style={{width:24,height:24,borderRadius:6,background:'#FEF2F2',border:'0.5px solid #FECACA',color:'#EF4444',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
            </div>
          ))}
          <div style={inputCardRose}>
            <div style={grid2}>
              <div><label style={inpLbl}>種類</label><input type="text" value={scrapForm.type} onChange={e=>setScrapForm({...scrapForm,type:e.target.value})} placeholder="金属くず" style={inpTxt} /></div>
              <div><label style={inpLbl}>買取業者</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:5}}>
                  {MASTER_DATA.buyers.map(b=>(
                    <button key={b} onClick={()=>setScrapForm({...scrapForm,buyer:b})}
                      style={{padding:'3px 8px',borderRadius:6,border:`1px solid ${scrapForm.buyer===b?'rgba(74,222,128,0.5)':'rgba(255,255,255,0.07)'}`,background:scrapForm.buyer===b?'rgba(74,222,128,0.15)':'var(--bg3)',color:scrapForm.buyer===b?'#4ade80':'#9CA3AF',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>{b}</button>
                  ))}
                </div>
                <input type="text" value={scrapForm.buyer} onChange={e=>setScrapForm({...scrapForm,buyer:e.target.value})} placeholder="直接入力も可" style={inpTxt} />
              </div>
            </div>
            <div style={grid3}>
              <div><label style={inpLbl}>数量</label><input type="number" step="0.1" value={scrapForm.qty} onChange={e=>setScrapForm({...scrapForm,qty:e.target.value})} placeholder="0" style={inpTxt} /></div>
              <div><label style={inpLbl}>単位</label><select value={scrapForm.unit} onChange={e=>setScrapForm({...scrapForm,unit:e.target.value})} style={inpSel}><option value="kg" style={{color:"#000",background:"#fff"}}>kg</option><option value="㎥">㎥</option><option value="t">t</option></select></div>
              <div><label style={inpLbl}>合計金額</label><input type="number" value={scrapForm.price} onChange={e=>setScrapForm({...scrapForm,price:e.target.value})} placeholder="0" style={inpTxt} /></div>
            </div>
            <div style={{marginBottom:8}}><label style={inpLbl}>マニ伝No. <span style={{color:'rgba(255,255,255,0.3)',fontSize:9}}>(任意)</span></label><input type="text" value={scrapForm.manifest||''} onChange={e=>setScrapForm({...scrapForm,manifest:e.target.value})} placeholder="例）A-12345" style={inpTxt} /></div>
            <div style={{marginBottom:8}}><label style={inpLbl}>㎥換算 <span style={{color:'rgba(255,255,255,0.3)',fontSize:9}}>(任意・単価計算用)</span></label><input type="number" step="0.01" value={scrapForm.volumeM3||''} onChange={e=>setScrapForm({...scrapForm,volumeM3:e.target.value})} placeholder="例）1.5" style={inpTxt} /></div>
            {editingScrapIdx !== null ? (
              <div style={{display:'flex',gap:6,marginTop:8}}>
                <button onClick={addScrap} disabled={!scrapForm.type||!scrapForm.buyer||!scrapForm.qty}
                  style={{flex:2,padding:'11px',background:'rgba(34,197,94,0.2)',border:'1px solid rgba(34,197,94,0.4)',borderRadius:9,color:'#4ade80',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✓ この内容で上書き</button>
                <button onClick={()=>{setEditingScrapIdx(null);setScrapForm({type:'金属くず',buyer:'',qty:'',unit:'kg',price:'',manifest:'',volumeM3:''});}}
                  style={{flex:1,padding:'11px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,color:'rgba(255,255,255,0.4)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>新規追加</button>
              </div>
            ) : (
              <AddBtn onClick={addScrap} disabled={!scrapForm.type||!scrapForm.buyer||!scrapForm.qty} />
            )}
          </div>

          {/* 経費 */}
          <SectionLabel ja="経費" en="Expenses" />
          {(workDetails.dailyExpenses||[]).map((e,i)=>(
            <div key={i} style={{background:'#fff',borderRadius:10,padding:'10px 12px',marginBottom:5,display:'flex',alignItems:'center',gap:8,border:'0.5px solid #E8E8E8'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500,color:'#1C1917'}}>{e.name}</div>
                <div style={{fontSize:10,color:'#999'}}>¥{formatCurrency(e.amount)}</div>
              </div>
              <button onClick={()=>setWorkDetails({...workDetails,dailyExpenses:(workDetails.dailyExpenses||[]).filter((_,j)=>j!==i)})}
                style={{width:24,height:24,borderRadius:6,background:'#FEF2F2',border:'0.5px solid #FECACA',color:'#EF4444',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
            </div>
          ))}
          <div style={inputCard}>
            <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
              {['パーキング代','高速代','交通費','経費','道具代','アスベスト分析費'].map(n=>(
                <button key={n} onClick={()=>setWorkDetails({...workDetails,_expName:n})}
                  style={{padding:'4px 9px',borderRadius:7,border:`1px solid ${workDetails._expName===n?'rgba(59,130,246,0.5)':'rgba(255,255,255,0.1)'}`,background:workDetails._expName===n?'rgba(59,130,246,0.3)':'rgba(255,255,255,0.08)',color:workDetails._expName===n?'#93C5FD':'rgba(255,255,255,0.5)',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{n}</button>
              ))}
            </div>
            <div style={{...grid2,marginBottom:8}}>
              <div>
                <label style={inpLbl}>項目名</label>
                <input type="text" value={workDetails._expName||''} onChange={e=>setWorkDetails({...workDetails,_expName:e.target.value})} placeholder="例）パーキング代" style={inpTxt} />
              </div>
              <div>
                <label style={inpLbl}>金額</label>
                <input type="number" value={workDetails._expAmt||''} onChange={e=>setWorkDetails({...workDetails,_expAmt:e.target.value})} placeholder="0" style={inpTxt} />
              </div>
            </div>
            <AddBtn onClick={()=>{
              const name=(workDetails._expName||'').trim();
              const amt=parseFloat(workDetails._expAmt)||0;
              if(!name) return;
              setWorkDetails({...workDetails,dailyExpenses:[...(workDetails.dailyExpenses||[]),{name,amount:amt}],_expName:'',_expAmt:''});
            }} disabled={!(workDetails._expName||'').trim()} />
          </div>
          {(workDetails.dailyExpenses||[]).length>0 && <SubTotal label="経費" value={(workDetails.dailyExpenses||[]).reduce((s,e)=>s+(e.amount||0),0)} />}

          {/* 更新ボタン */}
          <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'42rem',padding:`12px 16px calc(12px + env(safe-area-inset-bottom,0px))`,background:'#fff',borderTop:'1px solid #E8E8E8',zIndex:40}}>
            <button onClick={handleSave} disabled={isSaving}
              style={{width:'100%',padding:'15px',background:isSaving?'#E8E8E8':'#16a34a',border:'none',color:isSaving?'#999':'#fff',borderRadius:12,fontSize:15,fontWeight:700,cursor:isSaving?'not-allowed':'pointer',fontFamily:'inherit'}}>
              {isSaving ? '更新中...' : '✓ 更新する'}
            </button>
          </div>
        </div>
      )}

      {/* Step 1 */}
      {!isEditMode && currentStep === 1 && (
        <div className="b-panel" style={{ padding:'16px 16px 100px', background:'#fff', maxWidth:'42rem', margin:'0 auto', boxSizing:'border-box' }}>
          <SectionLabel ja="基本情報" en="Basic Info" />
          <div style={inputCard}>
            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'11px', color:'rgba(255,255,255,0.5)', marginBottom:'8px', fontWeight:700, letterSpacing:'0.04em' }}>作業日 <span style={{color:'#f87171'}}>*</span></label>
              <input type="date" value={report.date} onChange={e=>setReport({...report,date:e.target.value})}
                style={{ ...inpTxt, fontSize:'16px', padding:'13px 14px', boxSizing:'border-box', width:'100%', display:'block', WebkitAppearance:'none', textAlign:'left' }} />
            </div>

            <div>
              <label style={{ display:'block', fontSize:'11px', color:'rgba(255,255,255,0.5)', marginBottom:'8px', fontWeight:700, letterSpacing:'0.04em' }}>記入者 <span style={{color:'#f87171'}}>*</span></label>
              <select value={report.recorder} onChange={e=>setReport({...report,recorder:e.target.value,customRecorder:''})} style={{ ...inpSel, padding:'13px 14px', fontSize:'16px' }}>
                <option value="" style={{color:"#000",background:"#fff"}}>選択してください</option>
                {MASTER_DATA.employees.map(n=><option key={n} style={{color:"#000",background:"#fff"}}>{n}</option>)}
              </select>
            </div>
          </div>
          <BFooter onNext={()=>setCurrentStep(2)} nextLabel="次へ →" disabled={!isStep1Valid()} />
        </div>
      )}

      {/* Step 2 */}
      {!isEditMode && currentStep === 2 && (
        <div className="b-panel" style={{ padding:'16px 16px 100px', background:'#fff', maxWidth:'42rem', margin:'0 auto', boxSizing:'border-box' }}>

          {/* 施工情報 */}
          <SectionLabel ja="施工情報" en="Work Info" />
          <div style={inputCard}>
            <div>
              <label style={inpLbl}>施工内容</label>
              <input type="text" placeholder="例）1F解体作業" value={workDetails.workContent} onChange={e=>setWorkDetails({...workDetails,workContent:e.target.value})} style={inpTxt} />
              <p style={{ fontSize:'9px', color:'rgba(255,255,255,0.45)', margin:'7px 0 5px' }}>⏱ 候補から選択</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {workContent_tags.filter(t=>!workDetails.workContent||t.includes(workDetails.workContent)).map(t=>(
                  <button key={t} onClick={()=>setWorkDetails({...workDetails,workContent:t})}
                    style={{ fontSize:'11px', color: workDetails.workContent===t?'#93C5FD':'rgba(255,255,255,0.5)', background: workDetails.workContent===t?'rgba(37,99,235,0.1)':'var(--bg3)', border:`1px solid ${workDetails.workContent===t?'#1D4ED8':'var(--border)'}`, padding:'5px 10px', borderRadius:'20px', cursor:'pointer', whiteSpace:'nowrap' }}>{t}</button>
                ))}
              </div>
            </div>
          </div>

          {/* 自社人工 */}
          <SectionLabel ja="自社人工" en="In-House Labor" />
          {workDetails.inHouseWorkers.map((w,i)=>(
            <ItemCard key={i}
              avatarBg={`${shiftColor(w.shift)}20`} avatarColor={shiftColor(w.shift)}
              avatarText={w.name.charAt(0)}
              name={w.name}
              meta={`${w.start} → ${w.end}　<span style="color:${shiftColor(w.shift)}">${shiftLabel(w.shift)}</span>　<span style="font-size:9px;color:${w.dept==='k1'?'#3b82f6':'#22c55e'};background:${w.dept==='k1'?'rgba(59,130,246,0.1)':'rgba(34,197,94,0.1)'};padding:1px 5px;border-radius:4px">${w.dept==='k1'?'工事1課':'環境課'}</span>`}
              amount={`¥${formatCurrency(w.amount)}`}
              onDel={()=>setWorkDetails({...workDetails,inHouseWorkers:workDetails.inHouseWorkers.filter((_,j)=>j!==i)})} />
          ))}
          <div style={inputCard}>
            {/* ★ 課タブ（人数なし）*/}
            <div style={{ marginBottom:'10px' }}>
              <label style={inpLbl}>課 / Department</label>
              <DeptTabs value={currentDept} onChange={(d)=>{
                setCurrentDept(d);
                setWForm(prev => ({...prev, name:'', dept:d}));
              }} />
            </div>
            <div style={{ marginBottom:'10px' }}>
              <label style={inpLbl}>氏名</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:6}}>
                {(MASTER_DATA.inHouseWorkersByDept[currentDept==='k1'?'工事1課':'環境課']||[]).map(n=>(
                  <button key={n} onClick={()=>setWForm({...wForm,name:n})}
                    style={{padding:'5px 10px',borderRadius:7,border:`1px solid ${wForm.name===n?'rgba(59,130,246,0.5)':'rgba(255,255,255,0.1)'}`,background:wForm.name===n?'rgba(59,130,246,0.3)':'rgba(255,255,255,0.08)',color:wForm.name===n?'#93C5FD':'rgba(255,255,255,0.5)',fontSize:12,fontWeight:wForm.name===n?700:400,cursor:'pointer',fontFamily:'inherit'}}>
                    {n}
                  </button>
                ))}
              </div>
              <input type="text" value={wForm.name} onChange={e=>setWForm({...wForm,name:e.target.value})}
                placeholder="直接入力も可" style={inpTxt} />
            </div>
            {/* ★ シフト4択 */}
            <div style={{ marginBottom:'10px' }}>
              <label style={inpLbl}>区分 / Shift</label>
              <ShiftBtns4 value={wForm.shift} onChange={v=>setWForm({...wForm,shift:v})} />
            </div>
            <div style={grid2}>
              <div><label style={inpLbl}>開始</label><select value={wForm.start} onChange={e=>setWForm({...wForm,start:e.target.value})} style={inpSel}><option value="" style={{color:"#000",background:"#fff"}}>--:--</option>{MASTER_DATA.workingHoursOptions.map(t=><option key={t} style={{color:"#000",background:"#fff"}}>{t}</option>)}</select></div>
              <div><label style={inpLbl}>終了</label><select value={wForm.end} onChange={e=>setWForm({...wForm,end:e.target.value})} style={inpSel}><option value="" style={{color:"#000",background:"#fff"}}>--:--</option>{MASTER_DATA.workingHoursOptions.map(t=><option key={t} style={{color:"#000",background:"#fff"}}>{t}</option>)}</select></div>
            </div>
            <div style={{ textAlign:'right', fontSize:'12px', color:'#60a5fa', fontWeight:'600', marginBottom:'8px' }}>
              適用単価: ¥{formatCurrency(getShiftAmount(wForm.shift))}
            </div>
            <AddBtn onClick={addWorker} disabled={!wForm.name.trim()||!wForm.start||!wForm.end} pulse={!!wForm.name.trim()} />
          </div>
          {workDetails.inHouseWorkers.length>0 && <SubTotal label="自社人工" value={workDetails.inHouseWorkers.reduce((s,w)=>s+w.amount,0)} />}

          {/* 外注人工 */}
          <SectionLabel ja="外注人工" en="Outsourcing" />
          {isEditMode && workDetails.outsourcingLabor.length > 0 && (
            <button onClick={handleSave} disabled={isSaving}
              style={{width:'100%',padding:'13px',background:'rgba(34,197,94,0.25)',border:'1.5px solid rgba(34,197,94,0.5)',borderRadius:10,color:'#4ade80',fontSize:14,fontWeight:700,cursor:'pointer',marginBottom:10,fontFamily:'inherit'}}>
              {isSaving ? '更新中...' : '✓ 人数を変更したらここで更新'}
            </button>
          )}
          {workDetails.outsourcingLabor.map((o,i)=>(
            <div key={i} style={{borderRadius:11,marginBottom:6,background:'rgba(34,211,238,0.06)',border:'1px solid rgba(34,211,238,0.2)',padding:'10px 12px',display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:36,height:36,borderRadius:9,background:'rgba(34,211,238,0.15)',color:'#22d3ee',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,flexShrink:0}}>{o.company.charAt(0)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'#fff'}}>{o.company}</div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                  <input type="number" min="1" inputMode="numeric" value={o.count||''} onChange={e=>{
                    const entries=[...workDetails.outsourcingLabor];
                    const newCount=parseInt(e.target.value,10)||0;
                    const newAmount=newCount*(o.shift==='nighttime'?30000:25000);
                    entries[i]={...entries[i],count:newCount,amount:newAmount};
                    setWorkDetails({...workDetails,outsourcingLabor:entries});
                  }} style={{width:60,padding:'6px 8px',background:'rgba(34,211,238,0.15)',border:'1.5px solid rgba(34,211,238,0.4)',color:'#67E8F9',borderRadius:7,fontSize:18,fontWeight:700,textAlign:'center',outline:'none',fontFamily:'inherit'}}/>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>人</span>
                  {o.start && o.end && <span style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{o.start} → {o.end}</span>}
                  <span style={{color:shiftColor(o.shift),fontSize:11}}>{shiftLabel(o.shift)}</span>
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'#67E8F9'}}>¥{formatCurrency(o.amount)}</div>
                <button onClick={()=>setWorkDetails({...workDetails,outsourcingLabor:workDetails.outsourcingLabor.filter((_,j)=>j!==i)})}
                  style={{marginTop:4,width:28,height:28,borderRadius:7,border:'1px solid rgba(239,68,68,0.25)',cursor:'pointer',background:'rgba(239,68,68,0.08)',color:'#f87171',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>✕</button>
              </div>
            </div>
          ))}
          {isEditMode && workDetails.outsourcingLabor.length > 0 && (
            <div style={{padding:'8px 12px',background:'rgba(34,211,238,0.06)',border:'1px dashed rgba(34,211,238,0.2)',borderRadius:8,marginBottom:8,fontSize:11,color:'rgba(34,211,238,0.7)',textAlign:'center'}}>
              ↑ 人数を直接変更できます
            </div>
          )}
          <div style={inputCardCyan}>
            <div style={{...grid2,marginBottom:8}}>
              <div>
                <label style={inpLbl}>会社名</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:6}}>
                  {MASTER_DATA.outsourcingCompanies.map(c=>(
                    <button key={c} onClick={()=>setOForm({...oForm,company:c})}
                      style={{padding:'4px 9px',borderRadius:7,border:`1px solid ${oForm.company===c?'rgba(34,211,238,0.5)':'rgba(255,255,255,0.07)'}`,background:oForm.company===c?'rgba(34,211,238,0.25)':'rgba(255,255,255,0.08)',color:oForm.company===c?'#67E8F9':'rgba(255,255,255,0.5)',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
                      {c}
                    </button>
                  ))}
                </div>
                <input type="text" value={oForm.company} onChange={e=>setOForm({...oForm,company:e.target.value})} placeholder="直接入力も可" style={inpTxt} />
              </div>
              <div>
                <label style={inpLbl}>人数</label>
                <select value={oForm.count} onChange={e=>setOForm({...oForm,count:e.target.value})} style={inpSel}>
                  <option value="" style={{color:"#000",background:"#fff"}}>人数を選択</option>
                  {[0.25,0.5,0.75,1,2,3,4,5,6,7,8,9,10].map(n=>(
                    <option key={n} value={String(n)} style={{color:"#000",background:"#fff"}}>{n === 0.25 ? '0.25人 (¼)' : n === 0.5 ? '0.5人 (½)' : n === 0.75 ? '0.75人 (¾)' : `${n}人`}</option>
                  ))}
                </select>
                {oForm.count&&parseFloat(oForm.count)>0&&<div style={{fontSize:10,color:'#60a5fa',textAlign:'right',marginTop:2}}>¥{new Intl.NumberFormat('ja-JP').format(parseFloat(oForm.count)*(oForm.shift==='nighttime'?unitPrices.outsourcingNighttime:unitPrices.outsourcingDaytime))}</div>}
              </div>
            </div>
            <div style={{...grid2,marginBottom:8}}>
              <div><label style={inpLbl}>開始</label><select value={oForm.start} onChange={e=>setOForm({...oForm,start:e.target.value})} style={inpSel}><option value="" style={{color:"#000",background:"#fff"}}>--:--</option>{MASTER_DATA.workingHoursOptions.map(t=><option key={t} style={{color:"#000",background:"#fff"}}>{t}</option>)}</select></div>
              <div><label style={inpLbl}>終了</label><select value={oForm.end} onChange={e=>setOForm({...oForm,end:e.target.value})} style={inpSel}><option value="" style={{color:"#000",background:"#fff"}}>--:--</option>{MASTER_DATA.workingHoursOptions.map(t=><option key={t} style={{color:"#000",background:"#fff"}}>{t}</option>)}</select></div>
            </div>
            <div style={{marginBottom:8}}>
              <label style={inpLbl}>区分</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                {[['daytime','日勤','#3b82f6'],['nighttime','夜間','#8b5cf6']].map(([v,label,color])=>(
                  <button key={v} onClick={()=>setOForm({...oForm,shift:v})} style={{padding:'11px',borderRadius:'9px',border:`1px solid ${oForm.shift===v?color:'var(--border)'}`,background:oForm.shift===v?`${color}18`:'var(--bg3)',color:oForm.shift===v?color:'rgba(255,255,255,0.45)',fontSize:'12px',fontWeight:'600',cursor:'pointer'}}>{label}</button>
                ))}
              </div>
            </div>
            {oForm.count && <div style={{textAlign:'right',fontSize:'12px',color:'#60a5fa',fontWeight:'600',marginBottom:'8px'}}>¥{formatCurrency(parseFloat(oForm.count||0)*(oForm.shift==='nighttime'?unitPrices.outsourcingNighttime:unitPrices.outsourcingDaytime))}</div>}
            <AddBtn onClick={addOutsource} disabled={!oForm.company.trim()||!oForm.count} />
          </div>
          {workDetails.outsourcingLabor.length>0 && <SubTotal label="外注人工" value={workDetails.outsourcingLabor.reduce((s,o)=>s+o.amount,0)} />}

          {/* 車両 */}
          <SectionLabel ja="車両" en="Vehicles" />
          {workDetails.vehicles.map((v,i)=>(
            <ItemCard key={i}
              avatarBg="rgba(245,158,11,0.12)" avatarColor="#fbbf24"
              avatarText={v.type.slice(0,3)}
              name={v.type}
              meta={`${v.number}${v.driver ? `　(${v.driver})` : ''}`}
              amount={`¥${formatCurrency(v.amount)}`}
              onDel={()=>setWorkDetails({...workDetails,vehicles:workDetails.vehicles.filter((_,j)=>j!==i)})} />
          ))}
          <div style={inputCardAmber}>
            <div style={grid2}>
              <div><label style={inpLbl}>車種</label><select value={vForm.type} onChange={e=>setVForm({type:e.target.value,number:''})} style={inpSel}><option value="" style={{color:"#000",background:"#fff"}}>選択</option>{MASTER_DATA.vehicles.map(v=><option key={v} style={{color:"#000",background:"#fff"}}>{v}</option>)}</select></div>
              <div><label style={inpLbl}>車番</label><select value={vForm.number} onChange={e=>setVForm({...vForm,number:e.target.value})} style={inpSel}><option value="" style={{color:"#000",background:"#fff"}}>選択</option>{(MASTER_DATA.vehicleNumbersByType[vForm.type]||[]).map(n=><option key={n} style={{color:"#000",background:"#fff"}}>{n}</option>)}</select></div>
            </div>
            {vForm.type && <div style={{ textAlign:'right', fontSize:'12px', color:'#60a5fa', fontWeight:'600', marginBottom:'8px' }}>¥{formatCurrency(VEHICLE_UNIT_PRICES[vForm.type]||0)}</div>}
            <AddBtn onClick={addVehicle} disabled={!vForm.type} />
          </div>
          {workDetails.vehicles.length>0 && <SubTotal label="車両" value={workDetails.vehicles.reduce((s,v)=>s+v.amount,0)} />}

          {/* 重機 */}
          <SectionLabel ja="重機" en="Machinery" />
          {workDetails.machinery.map((m,i)=>(
            <ItemCard key={i}
              avatarBg="rgba(99,102,241,0.12)" avatarColor="#818cf8"
              avatarText="機"
              name={m.type} meta=""
              amount={`¥${formatCurrency(m.unitPrice)}`}
              onDel={()=>setWorkDetails({...workDetails,machinery:workDetails.machinery.filter((_,j)=>j!==i)})} />
          ))}
          <div style={inputCardAmber}>
            <div style={grid2}>
              <div>
                <label style={inpLbl}>機種</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:5}}>
                  {MASTER_DATA.heavyMachinery.map(m=>(
                    <button key={m} onClick={()=>setMForm({...mForm,type:m})}
                      style={{padding:'3px 8px',borderRadius:6,border:`1px solid ${mForm.type===m?'rgba(245,158,11,0.5)':'rgba(255,255,255,0.1)'}`,background:mForm.type===m?'rgba(245,158,11,0.2)':'rgba(255,255,255,0.06)',color:mForm.type===m?'#fbbf24':'rgba(255,255,255,0.5)',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>{m}</button>
                  ))}
                </div>
                <input type="text" value={mForm.type} onChange={e=>setMForm({...mForm,type:e.target.value})} placeholder="直接入力も可" style={inpTxt} />
              </div>
              <div><label style={inpLbl}>単価 <span style={{color:'rgba(255,255,255,0.3)',fontSize:9}}>(任意)</span></label><input type="number" value={mForm.price} onChange={e=>setMForm({...mForm,price:e.target.value})} placeholder="0" style={inpTxt} /></div>
            </div>
            <AddBtn onClick={addMachinery} disabled={!mForm.type} />
          </div>
          {workDetails.machinery.length>0 && <SubTotal label="重機" value={workDetails.machinery.reduce((s,m)=>s+m.unitPrice,0)} />}

          {/* 経費 */}
          <SectionLabel ja="経費" en="Expenses" />
          {(workDetails.dailyExpenses||[]).map((e,i)=>(
            <div key={i} style={{background:'#fff',borderRadius:10,padding:'10px 12px',marginBottom:5,display:'flex',alignItems:'center',gap:8,border:'0.5px solid #E8E8E8'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500,color:'#1C1917'}}>{e.name}</div>
                <div style={{fontSize:10,color:'#999'}}>¥{formatCurrency(e.amount)}</div>
              </div>
              <button onClick={()=>setWorkDetails({...workDetails,dailyExpenses:(workDetails.dailyExpenses||[]).filter((_,j)=>j!==i)})}
                style={{width:24,height:24,borderRadius:6,background:'#FEF2F2',border:'0.5px solid #FECACA',color:'#EF4444',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
            </div>
          ))}
          <div style={inputCard}>
            <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
              {['パーキング代','高速代','交通費','経費','道具代','アスベスト分析費'].map(n=>(
                <button key={n} onClick={()=>setWorkDetails({...workDetails,_expName:n})}
                  style={{padding:'4px 9px',borderRadius:7,border:`1px solid ${workDetails._expName===n?'rgba(59,130,246,0.5)':'rgba(255,255,255,0.1)'}`,background:workDetails._expName===n?'rgba(59,130,246,0.3)':'rgba(255,255,255,0.08)',color:workDetails._expName===n?'#93C5FD':'rgba(255,255,255,0.5)',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{n}</button>
              ))}
            </div>
            <div style={{...grid2,marginBottom:8}}>
              <div>
                <label style={inpLbl}>項目名</label>
                <input type="text" value={workDetails._expName||''} onChange={e=>setWorkDetails({...workDetails,_expName:e.target.value})} placeholder="例）パーキング代" style={inpTxt} />
              </div>
              <div>
                <label style={inpLbl}>金額</label>
                <input type="number" value={workDetails._expAmt||''} onChange={e=>setWorkDetails({...workDetails,_expAmt:e.target.value})} placeholder="0" style={inpTxt} />
              </div>
            </div>
            <AddBtn onClick={()=>{
              const name=(workDetails._expName||'').trim();
              const amt=parseFloat(workDetails._expAmt)||0;
              if(!name) return;
              setWorkDetails({...workDetails,dailyExpenses:[...(workDetails.dailyExpenses||[]),{name,amount:amt}],_expName:'',_expAmt:''});
            }} disabled={!(workDetails._expName||'').trim()} />
          </div>
          {(workDetails.dailyExpenses||[]).length>0 && <SubTotal label="経費" value={(workDetails.dailyExpenses||[]).reduce((s,e)=>s+(e.amount||0),0)} />}

          <BFooter onBack={()=>setCurrentStep(1)} onNext={()=>setCurrentStep(3)} nextLabel="次へ →" />
        </div>
      )}

      {/* Step 3 */}
      {/* Step 3 */}
      {!isEditMode && currentStep === 3 && (
        <div className="b-panel" style={{ padding:'16px 16px 100px', background:'#fff', maxWidth:'42rem', margin:'0 auto', boxSizing:'border-box' }}>
          <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.45)', marginBottom:'20px' }}>※ない場合はそのまま保存できます</p>

          {/* 産廃 */}
          <SectionLabel ja="産廃処分費" en="Waste Disposal" />
          {editingWasteIdx === null && wasteItems.length > 0 && (
            <div style={{fontSize:11,color:'rgba(245,158,11,0.8)',marginBottom:6,padding:'5px 10px',background:'rgba(245,158,11,0.06)',borderRadius:7,border:'1px dashed rgba(245,158,11,0.2)'}}>
              ✏️ 行をタップすると編集できます
            </div>
          )}
          {wasteItems.map((w,i)=>(
            <div key={i} onClick={()=>{
              setEditingWasteIdx(i);
              setWasteForm({type:w.material,disposal:w.disposalSite,qty:String(w.quantity),unit:w.unit||'㎥',price:String(w.amount),manifest:w.manifestNumber||'',haisha:w.haisha||'',driver:w.driver||'',vType:w.vType||'',vNumber:w.vNumber||'',haishiShift:w.haishiShift||'',haishiOverride:false,haishiPrice:''});
            }} style={{borderRadius:11,marginBottom:6,overflow:'hidden',cursor:'pointer',
              background: editingWasteIdx===i ? 'rgba(245,158,11,0.08)' : '#FFFBEB',
              border: editingWasteIdx===i ? '2px solid rgba(245,158,11,0.6)' : '1px solid #FDE68A'
            }}>
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px'}}>
                <div style={{width:36,height:36,borderRadius:9,background:'rgba(245,158,11,0.15)',color:'#fbbf24',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,flexShrink:0}}>{w.material.slice(0,2)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#1C1917'}}>{w.material} → {w.disposalSite}</div>
                  <div style={{fontSize:10,color:'#999'}}>{w.quantity}{w.unit}　¥{formatCurrency(w.amount)}{w.manifestNumber?`　マニ:${w.manifestNumber}`:''}</div>
                </div>
                {editingWasteIdx===i
                  ? <span style={{fontSize:9,background:'rgba(245,158,11,0.2)',color:'#B45309',border:'1px solid rgba(245,158,11,0.4)',borderRadius:4,padding:'2px 7px',flexShrink:0,fontWeight:700}}>編集中</span>
                  : <span style={{fontSize:11,color:'rgba(245,158,11,0.5)',flexShrink:0}}>✏️</span>
                }
                <div style={{fontSize:12,fontWeight:700,color:'#fbbf24',fontVariantNumeric:'tabular-nums',flexShrink:0}}>¥{formatCurrency(w.amount)}</div>
                <button onClick={e=>{e.stopPropagation();if(editingWasteIdx===i){setEditingWasteIdx(null);setWasteForm({type:'',disposal:'',qty:'',unit:'㎥',price:'',manifest:'',haisha:'',driver:'',vType:'',vNumber:'',haishiShift:'',haishiOverride:false,haishiPrice:''});}setWasteItems(wasteItems.filter((_,j)=>j!==i));}} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(239,68,68,0.25)',cursor:'pointer',background:'rgba(239,68,68,0.1)',color:'#f87171',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,flexShrink:0}}>✕</button>
              </div>
            </div>
          ))}
          <div style={inputCardGreen}>
            <div style={grid2}>
              <div><label style={inpLbl}>種類</label><input type="text" value={wasteForm.type} onChange={e=>setWasteForm({...wasteForm,type:e.target.value})} placeholder="木くず・廃プラ等" style={inpTxt} /></div>
              <div>
                <label style={inpLbl}>処分先</label>
                {((projectInfo?.manifestRows||[]).map(r=>r.disposal).filter(Boolean).filter((d,i,a)=>a.indexOf(d)===i).length > 0 ||
                  (projectInfo?.contractedDisposalSites||[]).length > 0) && (
                  <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:6}}>
                    {[...(projectInfo?.contractedDisposalSites||[]),...(projectInfo?.manifestRows||[]).map(r=>r.disposal).filter(Boolean).filter(d=>!(projectInfo?.contractedDisposalSites||[]).includes(d)).filter((d,i,a)=>a.indexOf(d)===i)].map(s=>(
                      <button key={s} onClick={()=>setWasteForm({...wasteForm,disposal:s})}
                        style={{padding:'3px 8px',borderRadius:6,border:`1px solid ${wasteForm.disposal===s?'rgba(74,222,128,0.5)':'rgba(255,255,255,0.1)'}`,background:wasteForm.disposal===s?'rgba(74,222,128,0.15)':'rgba(255,255,255,0.06)',color:wasteForm.disposal===s?'#4ade80':'rgba(255,255,255,0.5)',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                <input type="text" value={wasteForm.disposal} onChange={e=>setWasteForm({...wasteForm,disposal:e.target.value})}
                  placeholder="処分先を入力または上から選択" style={inpTxt} />
              </div>
            </div>
            <div style={grid3}>
              <div><label style={inpLbl}>数量</label><input type="number" step="0.1" value={wasteForm.qty} onChange={e=>setWasteForm({...wasteForm,qty:e.target.value})} placeholder="0" style={inpTxt} /></div>
              <div><label style={inpLbl}>単位</label><select value={wasteForm.unit} onChange={e=>setWasteForm({...wasteForm,unit:e.target.value})} style={inpSel}><option value="㎥" style={{color:"#000",background:"#fff"}}>㎥</option><option value="kg">kg</option><option value="t">t</option></select></div>
              <div><label style={inpLbl}>金額</label><input type="number" value={wasteForm.price} onChange={e=>setWasteForm({...wasteForm,price:e.target.value})} placeholder="0" style={inpTxt} /></div>
            </div>
            <div style={{marginBottom:10}}><label style={inpLbl}>マニフェスト No. <span style={{color:'rgba(255,255,255,0.45)',fontWeight:400,fontSize:'9px'}}>(任意)</span></label><input type="text" value={wasteForm.manifest} onChange={e=>setWasteForm({...wasteForm,manifest:e.target.value})} placeholder="例）A-12345" style={inpTxt} /></div>

            {/* 配車方法 */}
            <label style={{...inpLbl,marginBottom:6}}>配車方法 <span style={{color:'rgba(255,255,255,0.45)',fontWeight:400}}>(任意)</span></label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10}}>
              {[
                ['env','環境課配車','昼¥20,000\n夜¥30,000','rgba(34,197,94,0.15)','rgba(34,197,94,0.5)','#4ade80'],
                ['ext','ワイエム配車','昼¥22,000\n夜¥32,000','rgba(99,102,241,0.15)','rgba(99,102,241,0.5)','#a5b4fc'],
              ].map(([v,label,price,bg,border,color])=>(
                <button key={v} onClick={()=>setWasteForm({...wasteForm,haisha:wasteForm.haisha===v?'':v,driver:'',vType:'',vNumber:'',haishiShift:'',haishiOverride:false,haishiPrice:''})}
                  style={{padding:'10px 4px',borderRadius:10,border:`1px solid ${wasteForm.haisha===v?border:'rgba(255,255,255,0.08)'}`,background:wasteForm.haisha===v?bg:'var(--bg3)',cursor:'pointer',fontFamily:'inherit',textAlign:'center',transition:'all .12s'}}>
                  <div style={{fontSize:11,fontWeight:700,color:wasteForm.haisha===v?color:'rgba(255,255,255,0.65)',lineHeight:1.4}}>{label}</div>
                  <div style={{fontSize:9,fontFamily:'monospace',color:wasteForm.haisha===v?color:'rgba(255,255,255,0.45)',marginTop:3,whiteSpace:'pre'}}>{price}</div>
                </button>
              ))}
            </div>

            {/* 環境課展開 */}
            {wasteForm.haisha==='env' && (
              <div style={{padding:12,borderRadius:9,background:'#F0FDF4',border:'1px solid #BBF7D0',marginBottom:10}}>
                <label style={{...inpLbl,color:'#4ade80',marginBottom:6}}>運転者（環境課）</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
                  {['小峯朋宏','松橋信行','浅見勇弥','石田竜二','古山慎祐','尾崎奈帆'].map(d=>(
                    <button key={d} onClick={()=>setWasteForm({...wasteForm,driver:d})}
                      style={{padding:'5px 9px',borderRadius:7,border:`1px solid ${wasteForm.driver===d?'rgba(34,197,94,0.5)':'rgba(255,255,255,0.07)'}`,background:wasteForm.driver===d?'rgba(34,197,94,0.15)':'rgba(255,255,255,0.02)',color:wasteForm.driver===d?'#4ade80':'#6B7280',fontSize:11,fontWeight:wasteForm.driver===d?700:600,cursor:'pointer',fontFamily:'inherit'}}>
                      {d.slice(0,2)}
                    </button>
                  ))}
                </div>
                <input type="text" value={wasteForm.driver} onChange={e=>setWasteForm({...wasteForm,driver:e.target.value})} placeholder="その他：名前を入力" style={{...inpTxt,marginBottom:10}}/>
                {/* 車両マスタ */}
                <label style={{...inpLbl,marginBottom:6}}>使用車両</label>
                <div style={{...grid2,marginBottom:10}}>
                  <div>
                    <label style={inpLbl}>車種</label>
                    <select value={wasteForm.vType} onChange={e=>setWasteForm({...wasteForm,vType:e.target.value,vNumber:''})} style={{...inpSel,background:'#fff',color:'#111',border:'1px solid #D1FAE5'}}>
                      <option value="" style={{color:"#000",background:"#fff"}}>車種を選択</option>{MASTER_DATA.vehicles.map(v=><option key={v} style={{color:"#000",background:"#fff"}}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={inpLbl}>車番</label>
                    <select value={wasteForm.vNumber} onChange={e=>setWasteForm({...wasteForm,vNumber:e.target.value})} style={{...inpSel,background:"#fff",color:"#111",border:"1px solid #D1FAE5"}}>
                      <option value="" style={{color:"#000",background:"#fff"}}>車番を選択</option>{(MASTER_DATA.vehicleNumbersByType[wasteForm.vType]||[]).map(n=><option key={n} style={{color:"#000",background:"#fff"}}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <label style={{...inpLbl,marginBottom:6}}>シフト</label>
                <div style={grid2}>
                  {[['day','昼',20000],['night','夜',30000]].map(([v,label,price])=>(
                    <button key={v} onClick={()=>setWasteForm({...wasteForm,haishiShift:v})}
                      style={{padding:'10px',borderRadius:9,border:`1px solid ${wasteForm.haishiShift===v?'rgba(34,197,94,0.5)':'rgba(255,255,255,0.08)'}`,background:wasteForm.haishiShift===v?'rgba(34,197,94,0.1)':'rgba(255,255,255,0.02)',cursor:'pointer',fontFamily:'inherit',textAlign:'center'}}>
                      <div style={{fontSize:13,fontWeight:800,color:wasteForm.haishiShift===v?'#4ade80':'#6B7280'}}>{label}</div>
                      <div style={{fontSize:10,fontFamily:'monospace',color:wasteForm.haishiShift===v?'#4ade80':'#374151'}}>¥{formatCurrency(price)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ワイエム展開 */}
            {wasteForm.haisha==='ext' && (
              <div style={{padding:12,borderRadius:9,background:'#EEF2FF',border:'1px solid #C7D2FE',marginBottom:10}}>
                <div style={{marginBottom:10,padding:'6px 10px',borderRadius:7,background:'rgba(99,102,241,0.1)',fontSize:12,fontWeight:700,color:'#a5b4fc'}}>ワイエムエコフューチャー</div>
                <label style={{...inpLbl,marginBottom:6}}>シフト</label>
                <div style={{...grid2,marginBottom:8}}>
                  {[['day','昼',22000],['night','夜',32000]].map(([v,label,price])=>(
                    <button key={v} onClick={()=>setWasteForm({...wasteForm,haishiShift:v,haishiOverride:false})}
                      style={{padding:'10px',borderRadius:9,border:`1px solid ${!wasteForm.haishiOverride&&wasteForm.haishiShift===v?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.08)'}`,background:!wasteForm.haishiOverride&&wasteForm.haishiShift===v?'rgba(99,102,241,0.1)':'rgba(255,255,255,0.02)',cursor:'pointer',fontFamily:'inherit',textAlign:'center'}}>
                      <div style={{fontSize:13,fontWeight:800,color:!wasteForm.haishiOverride&&wasteForm.haishiShift===v?'#a5b4fc':'#6B7280'}}>{label}</div>
                      <div style={{fontSize:10,fontFamily:'monospace',color:!wasteForm.haishiOverride&&wasteForm.haishiShift===v?'#a5b4fc':'#374151'}}>¥{formatCurrency(price)}</div>
                    </button>
                  ))}
                </div>
                <div style={{...grid2,marginBottom:8}}>
                  <div>
                    <label style={{...inpLbl,marginBottom:4}}>車種 <span style={{fontWeight:400,color:'rgba(255,255,255,0.3)'}}>(任意)</span></label>
                    <select value={wasteForm.vType||''} onChange={e=>setWasteForm({...wasteForm,vType:e.target.value,vNumber:''})} style={{...inpSel,background:'#fff',color:'#111',border:'1px solid #C7D2FE'}}>
                      <option value="" style={{color:"#000",background:"#fff"}}>車種を選択</option>
                      {MASTER_DATA.vehicles.map(v=><option key={v} style={{color:"#000",background:"#fff"}}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{...inpLbl,marginBottom:4}}>車番 <span style={{fontWeight:400,color:'rgba(255,255,255,0.3)'}}>(任意)</span></label>
                    <select value={wasteForm.vNumber||''} onChange={e=>setWasteForm({...wasteForm,vNumber:e.target.value})} style={{...inpSel,background:'#fff',color:'#111',border:'1px solid #C7D2FE'}}>
                      <option value="" style={{color:"#000",background:"#fff"}}>車番を選択</option>
                      {(MASTER_DATA.vehicleNumbersByType[wasteForm.vType]||[]).map(n=><option key={n} style={{color:"#000",background:"#fff"}}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={()=>setWasteForm({...wasteForm,haishiOverride:!wasteForm.haishiOverride,haishiShift:''})}
                  style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit',marginBottom:6}}>
                  <div style={{width:14,height:14,borderRadius:3,border:`1px solid ${wasteForm.haishiOverride?'#6366f1':'#374151'}`,background:wasteForm.haishiOverride?'#6366f1':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#fff',flexShrink:0}}>{wasteForm.haishiOverride?'✓':''}</div>
                  <span style={{fontSize:11,color:wasteForm.haishiOverride?'#a5b4fc':'#4B5563'}}>遠方・例外あり（金額を手入力）</span>
                </button>
                {wasteForm.haishiOverride && (
                  <input type="number" value={wasteForm.haishiPrice} onChange={e=>setWasteForm({...wasteForm,haishiPrice:e.target.value})} placeholder="配車費を入力" style={{...inpTxt,borderColor:'rgba(99,102,241,0.3)'}}/>
                )}
              </div>
            )}

            {editingWasteIdx !== null ? (
              <div style={{display:'flex',gap:6,marginTop:8}}>
                <button onClick={addWaste} disabled={!wasteForm.type||!wasteForm.disposal||!wasteForm.qty}
                  style={{flex:2,padding:'11px',background:'rgba(245,158,11,0.2)',border:'1px solid rgba(245,158,11,0.4)',borderRadius:9,color:'#FCD34D',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✓ この内容で上書き</button>
                <button onClick={()=>{setEditingWasteIdx(null);setWasteForm({type:'',disposal:'',qty:'',unit:'㎥',price:'',manifest:'',haisha:'',driver:'',vType:'',vNumber:'',haishiShift:'',haishiOverride:false,haishiPrice:''});}}
                  style={{flex:1,padding:'11px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,color:'rgba(255,255,255,0.4)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>新規追加</button>
              </div>
            ) : (
              <AddBtn onClick={addWaste} disabled={!wasteForm.type||!wasteForm.disposal||!wasteForm.qty||(wasteForm.haisha==='env'&&(!wasteForm.driver||!wasteForm.haishiShift))||(wasteForm.haisha==='ext'&&!wasteForm.haishiOverride&&!wasteForm.haishiShift)} />
            )}
          </div>
          {wasteItems.length>0 && (
            <SubTotal label="産廃" value={wasteItems.reduce((s,w)=>s+w.amount,0)} />
          )}

          {/* スクラップ */}
          <SectionLabel ja="スクラップ売上" en="Scrap Revenue" />
          {scrapItems.map((s,i)=>(
            <div key={i} onClick={()=>{
              setEditingScrapIdx(i);
              setScrapForm({type:s.type,buyer:s.buyer,qty:String(s.quantity),unit:s.unit||'kg',price:String(Math.abs(s.amount)),manifest:s.manifestNumber||'',volumeM3:s.volumeM3!=null?String(s.volumeM3):''});
            }} style={{borderRadius:11,marginBottom:6,cursor:'pointer',
              background: editingScrapIdx===i ? 'rgba(34,197,94,0.08)' : '#ECFDF5',
              border: editingScrapIdx===i ? '1.5px solid rgba(34,197,94,0.5)' : '0.5px solid #BBF7D0',
              padding:'10px 12px', display:'flex', alignItems:'center', gap:8
            }}>
              <div style={{width:32,height:32,borderRadius:8,background:'rgba(34,197,94,0.15)',color:'#4ade80',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>{s.type.charAt(0)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:500,color:'#1C1917'}}>{s.type} → {s.buyer}</div>
                <div style={{fontSize:10,color:'#999'}}>{s.quantity}{s.unit}　¥{formatCurrency(Math.abs(s.amount))}</div>
              </div>
              {editingScrapIdx===i && <span style={{fontSize:9,background:'rgba(34,197,94,0.15)',color:'#16A34A',border:'1px solid rgba(34,197,94,0.3)',borderRadius:4,padding:'1px 6px',flexShrink:0}}>編集中</span>}
              <button onClick={e=>{e.stopPropagation();if(editingScrapIdx===i){setEditingScrapIdx(null);setScrapForm({type:'金属くず',buyer:'',qty:'',unit:'kg',price:''});}setScrapItems(scrapItems.filter((_,j)=>j!==i));}}
                style={{width:24,height:24,borderRadius:6,background:'#FEF2F2',border:'0.5px solid #FECACA',color:'#EF4444',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
            </div>
          ))}
          <div style={inputCardRose}>
            <div style={grid2}>
              <div><label style={inpLbl}>種類</label>
                <div style={{display:'flex',gap:5,marginBottom:5}}>
                  <button onClick={()=>setScrapForm({...scrapForm,type:'金属くず'})}
                    style={{padding:'5px 10px',borderRadius:7,border:`1px solid ${scrapForm.type==='金属くず'?'rgba(74,222,128,0.5)':'rgba(255,255,255,0.07)'}`,background:scrapForm.type==='金属くず'?'rgba(74,222,128,0.15)':'var(--bg3)',color:scrapForm.type==='金属くず'?'#4ade80':'#9CA3AF',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
                    金属くず
                  </button>
                </div>
                <input type="text" value={scrapForm.type} onChange={e=>setScrapForm({...scrapForm,type:e.target.value})} placeholder="直接入力も可" style={inpTxt} />
              </div>
              <div><label style={inpLbl}>買取業者</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:5}}>
                  {MASTER_DATA.buyers.map(b=>(
                    <button key={b} onClick={()=>setScrapForm({...scrapForm,buyer:b})}
                      style={{padding:'4px 9px',borderRadius:7,border:`1px solid ${scrapForm.buyer===b?'rgba(74,222,128,0.5)':'rgba(255,255,255,0.07)'}`,background:scrapForm.buyer===b?'rgba(74,222,128,0.15)':'var(--bg3)',color:scrapForm.buyer===b?'#4ade80':'#9CA3AF',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
                      {b}
                    </button>
                  ))}
                </div>
                <input type="text" value={scrapForm.buyer} onChange={e=>setScrapForm({...scrapForm,buyer:e.target.value})} placeholder="直接入力も可" style={inpTxt} />
              </div>
            </div>
            <div style={grid3}>
              <div><label style={inpLbl}>数量</label><input type="number" step="0.1" value={scrapForm.qty} onChange={e=>setScrapForm({...scrapForm,qty:e.target.value})} placeholder="0" style={inpTxt} /></div>
              <div><label style={inpLbl}>単位</label><select value={scrapForm.unit} onChange={e=>setScrapForm({...scrapForm,unit:e.target.value})} style={inpSel}><option value="kg" style={{color:"#000",background:"#fff"}}>kg</option><option value="㎥">㎥</option><option value="t">t</option></select></div>
              <div><label style={inpLbl}>合計金額</label><input type="number" value={scrapForm.price} onChange={e=>setScrapForm({...scrapForm,price:e.target.value})} placeholder="0" style={inpTxt} /></div>
            </div>
            <div style={{marginBottom:8}}><label style={inpLbl}>マニ伝No. <span style={{color:'rgba(255,255,255,0.3)',fontSize:9}}>(任意)</span></label><input type="text" value={scrapForm.manifest} onChange={e=>setScrapForm({...scrapForm,manifest:e.target.value})} placeholder="例）A-12345" style={inpTxt} /></div>
            <div style={{marginBottom:8}}><label style={inpLbl}>㎥換算 <span style={{color:'rgba(255,255,255,0.3)',fontSize:9}}>(任意・単価計算用)</span></label><input type="number" step="0.01" value={scrapForm.volumeM3||''} onChange={e=>setScrapForm({...scrapForm,volumeM3:e.target.value})} placeholder="例）1.5" style={inpTxt} /></div>
            {scrapForm.price && (
              <div style={{ textAlign:'right', fontSize:'12px', color:'#4ade80', fontWeight:'600', marginBottom:'8px' }}>
                ¥{formatCurrency(parseFloat(scrapForm.price||0))}
              </div>
            )}
            {editingScrapIdx !== null ? (
              <div style={{display:'flex',gap:6,marginTop:8}}>
                <button onClick={addScrap} disabled={!scrapForm.type||!scrapForm.buyer||!scrapForm.qty}
                  style={{flex:2,padding:'11px',background:'rgba(34,197,94,0.2)',border:'1px solid rgba(34,197,94,0.4)',borderRadius:9,color:'#4ade80',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✓ この内容で上書き</button>
                <button onClick={()=>{setEditingScrapIdx(null);setScrapForm({type:'金属くず',buyer:'',qty:'',unit:'kg',price:'',manifest:'',volumeM3:''});}}
                  style={{flex:1,padding:'11px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:9,color:'rgba(255,255,255,0.4)',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>新規追加</button>
              </div>
            ) : (
              <AddBtn onClick={addScrap} disabled={!scrapForm.type||!scrapForm.buyer||!scrapForm.qty} />
            )}
          </div>
          {scrapItems.length>0 && <SubTotal label="スクラップ" value={Math.abs(scrapItems.reduce((s,i)=>s+i.amount,0))} />}

          <BFooter onBack={()=>setCurrentStep(2)} onNext={handleSave} nextLabel={isSaving ? '保存中...' : isEditMode ? '更新する ✓' : '保存する ✓'} nextColor="#16a34a" disabled={isSaving} />
        </div>
      )}
    </div>
  );
}

// ========== ReportListPage ==========
function ReportListPage({ reports, onDelete, onNavigate, onEdit }) {
  const [filterCategory, setFilterCategory] = useState('');
  const [openMonths, setOpenMonths] = useState({});
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.body.scrollTop=0; document.documentElement.scrollTop=0; }, []);

  const filteredReports = reports.filter(r => {
    const category = r.workDetails?.workCategory || r.workCategory;
    if (filterCategory && category !== filterCategory) return false;
    return true;
  });
  const months = [...new Set(filteredReports.map(r => r.date.substring(0, 7)))].sort().reverse();
  useEffect(() => { if (months.length > 0) setOpenMonths({}); }, [reports, filterCategory]);
  const toggleMonth = (month) => setOpenMonths(prev => ({ ...prev, [month]: !prev[month] }));
  const fmtMonth = (ym) => { const [y, m] = ym.split('-'); return `${y}年${parseInt(m)}月`; };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6" style={{paddingBottom:'calc(180px + env(safe-area-inset-bottom,0px))',background:'#F5F7FA',minHeight:'100vh'}}>
      <div className="mb-4">
        <button onClick={() => { window.scrollTo({top:0,behavior:'instant'}); onNavigate('home'); }} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"#fff",border:"0.5px solid #E8E8E8",borderRadius:10,fontSize:12,fontWeight:600,color:"#1E3A5F",cursor:"pointer"}}>
          <X className="w-4 h-4" />閉じる
        </button>
      </div>
      <p style={{fontSize:12,color:'#888',marginBottom:16}}>全 {filteredReports.length}件</p>
      {months.map(month => {
        const monthReports = filteredReports.filter(r => r.date.startsWith(month)).sort((a,b) => new Date(b.date)-new Date(a.date));
        const isOpen = !!openMonths[month];
        const monthCost = monthReports.reduce((sum, r) => sum +
          (r.workDetails?.inHouseWorkers?.reduce((s,w)=>s+(w.amount||0),0)||0) +
          (r.workDetails?.outsourcingLabor?.reduce((s,o)=>s+(o.amount||0),0)||0) +
          (r.workDetails?.vehicles?.reduce((s,v)=>s+(v.amount||0),0)||0) +
          (r.workDetails?.machinery?.reduce((s,m)=>s+(m.unitPrice||0),0)||0) +
          (r.workDetails?.envItems?.reduce((s,t)=>s+(t.amount||0),0)||0) +
          (r.workDetails?.extItems?.reduce((s,t)=>s+(t.amount||0),0)||0) +
          (r.wasteItems?.reduce((s,w)=>s+(w.amount||0),0)||0), 0);
        return (
          <div key={month} className="mb-3">
            <button onClick={() => toggleMonth(month)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#1E293B', border:'none', borderRadius: isOpen ? '18px 18px 0 0' : '18px', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'14px', fontWeight:700, color:'#fff' }}>{fmtMonth(month)}</span>
                <span style={{ fontSize:'11px', color:'rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.12)', padding:'2px 8px', borderRadius:'10px' }}>{monthReports.length}件</span>
                {monthCost > 0 && <span style={{ fontSize:'11px', color:'#94A3B8', fontWeight:700 }}>¥{formatCurrency(monthCost)}</span>}
              </div>
              {isOpen ? <GradChevronUp size={16}/> : <GradChevron open={false} size={16}/>}
            </button>
            {isOpen && (
              <div style={{ background:'#2D2D2D', border:'none', borderRadius:'0 0 12px 12px', overflow:'hidden' }}>
                {monthReports.map((report, idx) => (
                  <ReportAccordion key={report.id} report={report} onDelete={() => onDelete(report.id)} onEdit={() => onEdit(report)} isLast={idx === monthReports.length - 1} />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {filteredReports.length === 0 && <p className="text-center text-gray-400 py-12">該当する日報がありません</p>}
    </div>
  );
}

function ReportAccordion({ report, onDelete, onEdit, isLast }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ borderBottom: isLast && !isOpen ? 'none' : '1px solid #F0F0F0' }}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-transparent/50 transition-colors">
        <div className="text-left flex-1">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <span style={{fontSize:15,fontWeight:700,color:"#111"}}>{report.date}</span>
            <span style={{fontSize:12,color:"#aaa"}}>({getDayOfWeek(report.date)})</span>
            
            {/* 記入者＋更新日時 */}
            <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'rgba(255,255,255,0.65)', fontFamily:'monospace', background:'#E8E8E8', border:'none', padding:'2px 7px', borderRadius:99, color:'#555' }}>
              {report.updatedBy || report.recorder || ''}
              {report.updatedAt && (
                <span style={{ color:'rgba(255,255,255,0.45)' }}>
                  {' · '}{new Date(report.updatedAt).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span style={{padding:"2px 8px",borderRadius:6,background:"#EFF6FF",color:"#1D4ED8",fontSize:10,fontWeight:700}}>{report.workDetails?.workCategory || report.workCategory}</span>
            {report.wasteItems?.some(w=>w.haisha==='env') && (
              <span style={{padding:'2px 7px',borderRadius:6,background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.2)',fontSize:10,fontWeight:700,color:'#4ade80'}}>環境課配車</span>
            )}
            {report.wasteItems?.some(w=>w.haisha==='ext') && (
              <span style={{padding:'2px 7px',borderRadius:6,background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',fontSize:10,fontWeight:700,color:'#a5b4fc'}}>ワイエム配車</span>
            )}
            {(() => {
              const totalCost =
                (report.workDetails?.inHouseWorkers?.reduce((s,w)=>s+(w.amount||0),0)||0) +
                (report.workDetails?.outsourcingLabor?.reduce((s,o)=>s+(o.amount||0),0)||0) +
                (report.workDetails?.vehicles?.reduce((s,v)=>s+(v.amount||0),0)||0) +
                (report.workDetails?.machinery?.reduce((s,m)=>s+(m.unitPrice||0),0)||0) +
                (report.workDetails?.envItems?.reduce((s,t)=>s+(t.amount||0),0)||0) +
                (report.workDetails?.extItems?.reduce((s,t)=>s+(t.amount||0),0)||0) +
                (report.wasteItems?.reduce((s,w)=>s+(w.amount||0),0)||0);
              return totalCost > 0 && <span style={{color:"#B45309",fontWeight:700,fontSize:13,fontVariantNumeric:"tabular-nums"}}>¥{formatCurrency(totalCost)}</span>;
            })()}
          </div>
        </div>
        <span className="ml-4">{isOpen ? <GradChevronUp size={18}/> : <GradChevron open={false} size={18}/>}</span>
      </button>
      {isOpen && (
        <div style={{padding:"14px 16px",background:"#FAFAFA",borderTop:"1px solid #EBEBEB"}}>
          <div style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid #EBEBEB"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><span style={{fontSize:11,color:"#999"}}>記入者:</span><span style={{fontSize:13,fontWeight:600,color:"#1C1917"}}>{report.recorder}</span></div>
            <div style={{display:"flex",alignItems:"flex-start",gap:8}}><span style={{fontSize:11,color:"#999",marginTop:1}}>施工内容:</span><span style={{fontSize:13,color:"#1C1917"}}>{report.workDetails?.workContent || report.workContent || 'なし'}</span></div>
          </div>
          {report.workDetails && (
            <div className="mb-4">
              <p style={{fontSize:10,fontWeight:700,color:"#999",letterSpacing:".08em",textTransform:"uppercase",marginBottom:10}}>原価明細</p>
              {report.workDetails.inHouseWorkers?.length > 0 && (
                <div style={{marginBottom:10,borderRadius:8,padding:"10px 12px",background:"#F0F0F0"}}>
                  <p style={{fontSize:11,fontWeight:700,color:"#1D4ED8",marginBottom:6}}>自社人工: {report.workDetails.inHouseWorkers.length}名</p>
                  {report.workDetails.inHouseWorkers.map((w, idx) => (
                    <p key={idx} style={{fontSize:12,color:"#333",marginLeft:8,marginBottom:4}}>• {w.name} <span style={{color:"#999"}}>{w.start||w.startTime}-{w.end||w.endTime}</span> <span style={{color:"#B45309",fontWeight:600}}>¥{formatCurrency(w.amount)}</span></p>
                  ))}
                </div>
              )}
              {report.workDetails.outsourcingLabor?.length > 0 && (
                <div style={{marginBottom:10,borderRadius:8,padding:"10px 12px",background:"#F0F0F0"}}>
                  <p style={{fontSize:11,fontWeight:700,color:"#0369A1",marginBottom:6}}>外注人工: {report.workDetails.outsourcingLabor.length}件</p>
                  {report.workDetails.outsourcingLabor.map((o, idx) => (
                    <p key={idx} style={{fontSize:12,color:"#333",marginLeft:8,marginBottom:4}}>• {o.company} <span style={{color:"#999"}}>{o.count || o.workers}人</span> <span style={{color:"#B45309",fontWeight:600}}>¥{formatCurrency(o.amount)}</span></p>
                  ))}
                </div>
              )}
              {report.workDetails.vehicles?.length > 0 && (
                <div style={{marginBottom:10,borderRadius:8,padding:"10px 12px",background:"#F0F0F0"}}>
                  <p style={{fontSize:11,fontWeight:700,color:"#78716C",marginBottom:6}}>車両: {report.workDetails.vehicles.length}台</p>
                  {report.workDetails.vehicles.map((v, idx) => (
                    <p key={idx} style={{fontSize:12,color:"#333",marginLeft:8,marginBottom:4}}>• {v.type} <span style={{color:"#999"}}>({v.number})</span> <span style={{color:"#B45309",fontWeight:600}}>¥{formatCurrency(v.amount)}</span></p>
                  ))}
                </div>
              )}
              {report.workDetails.machinery?.length > 0 && (
                <div style={{marginBottom:10,borderRadius:8,padding:"10px 12px",background:"#F0F0F0"}}>
                  <p style={{fontSize:11,fontWeight:700,color:"#78716C",marginBottom:6}}>重機: {report.workDetails.machinery.length}台</p>
                  {report.workDetails.machinery.map((m, idx) => (
                    <p key={idx} style={{fontSize:12,color:"#333",marginLeft:8,marginBottom:4}}>• {m.type} <span style={{color:"#B45309",fontWeight:600}}>¥{formatCurrency(m.unitPrice)}</span></p>
                  ))}
                </div>
              )}
              {(report.workDetails.envItems?.length > 0 || report.workDetails.extItems?.length > 0) && (
                <div className="mb-3 rounded p-2" style={{ background: '#F0FDF4', border:'1px solid #BBF7D0' }}>
                  <p className="text-xs font-semibold mb-2" style={{color:'#4ade80'}}>
                    運搬: {(report.workDetails.envItems?.length||0)+(report.workDetails.extItems?.length||0)}件 / ¥{formatCurrency(
                      (report.workDetails.envItems||[]).reduce((s,t)=>s+(t.amount||0),0)+
                      (report.workDetails.extItems||[]).reduce((s,t)=>s+(t.amount||0),0)
                    )}
                  </p>
                  {report.workDetails.envItems?.map((t, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">• {t.driver} <span className="text-gray-500">{t.shift} {t.count}台</span> <span className="text-yellow-400">¥{formatCurrency(t.amount)}</span></p>
                  ))}
                  {report.workDetails.extItems?.map((t, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">• {t.company} <span className="text-gray-500">{t.shift} {t.count}台</span> <span className="text-yellow-400">¥{formatCurrency(t.amount)}</span></p>
                  ))}
                </div>
              )}
            </div>
          )}
          {report.wasteItems?.length > 0 && (
            <div className="mb-4 rounded p-2" style={{ background: '#2D2D2D' }}>
              <p className="text-xs font-semibold text-red-400 mb-2">廃棄物: {report.wasteItems.length}件 / ¥{formatCurrency(report.wasteItems.reduce((s,w)=>s+w.amount,0))}</p>
              {report.wasteItems.map((waste, idx) => (
                <div key={idx} className="text-sm text-gray-300 ml-3 mb-1">
                  <p>• {waste.material} <span className="text-gray-500">{waste.quantity}{waste.unit}</span> - {waste.disposalSite}</p>
                  {waste.haisha==='env' && (
                    <div style={{display:'flex',alignItems:'center',gap:5,marginTop:4,padding:'3px 8px',borderRadius:6,background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.15)',width:'fit-content'}}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                      <span style={{fontSize:10,fontWeight:700,color:'#4ade80',fontFamily:'monospace'}}>環境課配車 / {waste.driver}{waste.vType?` ${waste.vType}(${waste.vNumber})`:''} {waste.haishiShift==='day'?'昼':'夜'} ¥{formatCurrency(waste.haishiAmount||0)}</span>
                    </div>
                  )}
                  {waste.haisha==='ext' && (
                    <div style={{display:'flex',alignItems:'center',gap:5,marginTop:4,padding:'3px 8px',borderRadius:6,background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.15)',width:'fit-content'}}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                      <span style={{fontSize:10,fontWeight:700,color:'#a5b4fc',fontFamily:'monospace'}}>ワイエム配車 {waste.haishiShift==='day'?'昼':waste.haishiShift==='night'?'夜':'例外'} ¥{formatCurrency(waste.haishiAmount||0)}</span>
                    </div>
                  )}
                  {waste.manifestNumber && <p className="text-xs text-gray-500 ml-4">マニフェスト: {waste.manifestNumber}</p>}
                </div>
              ))}
            </div>
          )}
          {report.scrapItems?.length > 0 && (
            <div className="mb-4 rounded p-2" style={{ background: '#2D2D2D' }}>
              <p className="text-xs font-semibold text-green-400 mb-2">スクラップ: {report.scrapItems.length}件 / ¥{formatCurrency(Math.abs(report.scrapItems.reduce((s,sc)=>s+sc.amount,0)))}</p>
              {report.scrapItems.map((scrap, idx) => (
                <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">• {scrap.type} <span className="text-gray-500">{scrap.quantity}{scrap.unit}</span> - {scrap.buyer}</p>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button onClick={() => { if (window.__navigatePDF) window.__navigatePDF(report); }}
              className="py-3 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-1">
              <FileText className="w-4 h-4" />PDF
            </button>
            <button onClick={() => onEdit && onEdit(report)}
              className="flex-1 py-3 px-4 text-white rounded-lg transition-colors font-bold text-sm flex items-center justify-center gap-1"
              style={{ background:'rgba(245,158,11,0.2)', border:'1px solid rgba(245,158,11,0.4)', color:'#fbbf24' }}>
              <Settings className="w-4 h-4" />編集
            </button>
            <button onClick={onDelete}
              className="py-3 px-3 text-white rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-1"
              style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171' }}>
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== ProjectPage ==========
function ProjectPage({ projectInfo, selectedSite, onNavigate }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.body.scrollTop=0; document.documentElement.scrollTop=0; }, []);
  return (
    <div className="max-w-2xl mx-auto px-5 py-4" style={{background:'#F5F7FA',minHeight:'100vh',paddingBottom:'calc(160px + env(safe-area-inset-bottom,0px))'}}>
      <button onClick={() => { window.scrollTo({top:0,behavior:'instant'}); document.body.scrollTop=0; document.documentElement.scrollTop=0; onNavigate('home'); }} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'#fff',border:'0.5px solid #E8E8E8',borderRadius:10,fontSize:12,fontWeight:600,color:'#1E3A5F',cursor:'pointer',marginBottom:12}}>
        <X className="w-4 h-4" />閉じる
      </button>
      {(selectedSite || projectInfo?.workType) && (
        <div style={{background:'#1E293B',borderRadius:18,padding:'14px 16px',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:16,fontWeight:700,color:'#fff',marginBottom:2}}>{selectedSite || projectInfo?.workType}</div>
            {projectInfo?.projectNumber && <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>PROJECT NO.: {projectInfo.projectNumber}</div>}
          </div>
          {projectInfo?.status && (
            <span style={{display:'inline-block',padding:'4px 12px',borderRadius:20,fontSize:11,fontWeight:700,flexShrink:0,
              background:projectInfo.status==='進行中'?'rgba(34,197,94,0.2)':projectInfo.status==='完了'?'rgba(37,99,235,0.2)':'rgba(245,158,11,0.2)',
              color:projectInfo.status==='進行中'?'#4ade80':projectInfo.status==='完了'?'#93C5FD':'#FCD34D'
            }}>{projectInfo.status}</span>
          )}
        </div>
      )}
      <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:10,border:'0.5px solid #E8E8E8',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
        <div style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.1em',marginBottom:12}}>基本情報</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[['発注者','CLIENT',projectInfo.client],['現場住所','LOCATION',projectInfo.workLocation],['営業担当','SALES',projectInfo.salesPerson],['現場責任者','MANAGER',projectInfo.siteManager]].map(([ja,en,val])=>(
            <div key={ja}><p style={{fontSize:9,color:'#1E3A5F',fontWeight:700,letterSpacing:'.08em',marginBottom:2}}>{ja} / {en}</p><p style={{fontSize:14,fontWeight:500,color:'#111'}}>{val||'-'}</p></div>
          ))}
        </div>
      </div>
      <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:10,border:'0.5px solid #E8E8E8',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
        <div style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.1em',marginBottom:12}}>期間</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[['開始日','START DATE',projectInfo.startDate],['終了日','END DATE',projectInfo.endDate]].map(([ja,en,val])=>(
            <div key={ja}><p style={{fontSize:9,color:'#1E3A5F',fontWeight:700,letterSpacing:'.08em',marginBottom:2}}>{ja} / {en}</p><p style={{fontSize:14,fontWeight:500,color:'#111'}}>{val||'-'}</p></div>
          ))}
        </div>
      </div>
      <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:10,border:'0.5px solid #E8E8E8',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
        <div style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.1em',marginBottom:12}}>金額</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[
            ['契約金額','CONTRACT',projectInfo.contractAmount,'#111'],
            ['追加金額','ADDITIONAL',projectInfo.additionalAmount,'#2563EB'],
            ...(projectInfo.transferCost?[['回送費','TRANSFER',projectInfo.transferCost,'#555']]:[[],[]].slice(0,0)),
            ...(projectInfo.leaseCost?[['リース費','LEASE',projectInfo.leaseCost,'#555']]:[[],[]].slice(0,0)),
            ...(projectInfo.materialsCost?[['資材費','MATERIALS',projectInfo.materialsCost,'#555']]:[[],[]].slice(0,0)),
          ].map(([ja,en,val,color])=>ja&&(
            <div key={ja}><p style={{fontSize:9,color:'#1E3A5F',fontWeight:700,letterSpacing:'.08em',marginBottom:2}}>{ja} / {en}</p><p style={{fontSize:18,fontWeight:700,color,fontVariantNumeric:'tabular-nums'}}>¥{val?formatCurrency(parseFloat(val)):'0'}</p></div>
          ))}
        </div>
      </div>

      <button onClick={() => onNavigate('settings')} style={{width:'100%',padding:'14px',background:'#1E293B',border:'none',borderRadius:14,fontSize:14,fontWeight:700,color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        <Settings className="w-4 h-4" />編集する
      </button>
    </div>
  );
}

// ========== AnalysisPage ==========
function AnalysisPage({ reports, totals, projectInfo, onNavigate }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.body.scrollTop=0; document.documentElement.scrollTop=0; }, []);
  const [activeTab, setActiveTab] = useState(0);
  const chartRef1 = React.useRef(null);
  const chartRef2 = React.useRef(null);
  const chartRef3 = React.useRef(null);
  const chartInst = React.useRef({});

  // データ計算
  const costByCategory = { '人工費': 0, '車両費': 0, '重機費': 0, '産廃費': 0 };
  reports.forEach(r => {
    if (r.workDetails) {
      r.workDetails.inHouseWorkers?.forEach(w => costByCategory['人工費'] += w.amount || 0);
      r.workDetails.outsourcingLabor?.forEach(o => costByCategory['人工費'] += o.amount || 0);
      r.workDetails.vehicles?.forEach(v => costByCategory['車両費'] += v.amount || 0);
      r.workDetails.machinery?.forEach(m => costByCategory['重機費'] += m.unitPrice || 0);
      r.workDetails.envItems?.forEach(t => costByCategory['環境課配車'] = (costByCategory['環境課配車']||0) + (t.amount || 0));
      r.workDetails.extItems?.forEach(t => costByCategory['外部運搬'] = (costByCategory['外部運搬']||0) + (t.amount || 0));
    }
    r.wasteItems?.forEach(w => costByCategory['産廃費'] += w.amount || 0);
  });
  if (projectInfo?.transferCost) costByCategory['回送費'] = parseFloat(projectInfo.transferCost) || 0;
  if (projectInfo?.leaseCost) costByCategory['リース費'] = parseFloat(projectInfo.leaseCost) || 0;
  if (projectInfo?.materialsCost) costByCategory['資材費'] = parseFloat(projectInfo.materialsCost) || 0;

  const pieData = Object.keys(costByCategory).map(key => ({ name: key, value: costByCategory[key] })).filter(d => d.value > 0);
  const COLORS = ['#1E3A8A','#378ADD','#60A5FA','#6366F1','#A78BFA','#8B5CF6','#93C5FD'];
  const totalCost = pieData.reduce((s,d) => s+d.value, 0);

  const monthlyData = {};
  const monthlyWorkers = {};
  reports.forEach(r => {
    const month = r.date.substring(0, 7);
    if (!monthlyData[month]) { monthlyData[month] = 0; monthlyWorkers[month] = 0; }
    if (r.workDetails) {
      r.workDetails.inHouseWorkers?.forEach(w => { monthlyData[month] += w.amount || 0; monthlyWorkers[month] += w.count || 1; });
      r.workDetails.outsourcingLabor?.forEach(o => { monthlyData[month] += o.amount || 0; monthlyWorkers[month] += o.count || 1; });
      r.workDetails.vehicles?.forEach(v => monthlyData[month] += v.amount || 0);
      r.workDetails.machinery?.forEach(m => monthlyData[month] += m.unitPrice || 0);
      r.workDetails.envItems?.forEach(t => monthlyData[month] += t.amount || 0);
      r.workDetails.extItems?.forEach(t => monthlyData[month] += t.amount || 0);
    }
    r.wasteItems?.forEach(w => monthlyData[month] += w.amount || 0);
  });
  const sortedMonths = Object.keys(monthlyData).sort();
  const barLabels = sortedMonths.map(m => m.substring(5)+'月');
  const barValues = sortedMonths.map(m => Math.round(monthlyData[m] / 10000));
  const workerValues = sortedMonths.map(m => monthlyWorkers[m]);

  const grossMargin = totals.totalRevenue > 0 ? ((totals.grossProfit / totals.totalRevenue) * 100).toFixed(1) : '0.0';
  const grossMarginNum = parseFloat(grossMargin);
  const marginColor = grossMarginNum >= 40 ? '#639922' : grossMarginNum >= 20 ? '#BA7517' : '#D85A30';

  // Chart.js動的ロード
  React.useEffect(() => {
    if (window.Chart) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    document.head.appendChild(script);
  }, []);

  // Chart描画
  React.useEffect(() => {
    if (activeTab !== 1 || !chartRef1.current) return;
    if (chartInst.current.pie) chartInst.current.pie.destroy();
    if (pieData.length === 0) return;
    chartInst.current.pie = new window.Chart(chartRef1.current, {
      type: 'doughnut',
      data: { labels: pieData.map(d=>d.name), datasets: [{ data: pieData.map(d=>d.value), backgroundColor: COLORS, borderWidth: 0 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} }, cutout:'65%' }
    });
  }, [activeTab]);

  React.useEffect(() => {
    if (activeTab !== 2) return;
    if (barLabels.length === 0) return;
    setTimeout(() => {
      if (chartRef2.current) {
        if (chartInst.current.bar) chartInst.current.bar.destroy();
        chartInst.current.bar = new window.Chart(chartRef2.current, {
          type: 'bar',
          data: { labels: barLabels, datasets: [{ label:'原価(万円)', data: barValues, backgroundColor:'#378ADD', borderRadius:4, borderWidth:0 }] },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false},ticks:{color:'#888'}}, y:{grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#888',callback:v=>v+'万'}} } }
        });
      }
      if (chartRef3.current) {
        if (chartInst.current.line) chartInst.current.line.destroy();
        chartInst.current.line = new window.Chart(chartRef3.current, {
          type: 'line',
          data: { labels: barLabels, datasets: [{ label:'人工', data: workerValues, borderColor:'#639922', backgroundColor:'rgba(99,153,34,0.1)', tension:0.4, fill:true, pointRadius:4, pointBackgroundColor:'#639922' }] },
          options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false},ticks:{color:'#888'}}, y:{grid:{color:'rgba(0,0,0,0.06)'},ticks:{color:'#888',callback:v=>v+'人'}} } }
        });
      }
    }, 50);
  }, [activeTab]);

  const maxBar = Math.max(...pieData.map(d=>d.value), 1);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4" style={{paddingBottom:'calc(180px + env(safe-area-inset-bottom,0px))',minHeight:'100vh',background:'#F5F7FA'}}>
      {/* 戻るボタン */}
      <button onClick={()=>{ window.scrollTo({top:0,behavior:'instant'}); onNavigate('home'); }}
        style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'#fff',border:'0.5px solid #E8E8E8',borderRadius:10,fontSize:12,fontWeight:600,color:'#1E3A5F',cursor:'pointer',marginBottom:12}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E3A5F" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        閉じる
      </button>
      {/* タブ */}
      <div style={{display:'flex',gap:4,background:'#E8ECF0',borderRadius:10,padding:4,marginBottom:16}}>
        {['財務','原価内訳','月別推移'].map((t,i) => (
          <button key={i} onClick={()=>setActiveTab(i)}
            style={{flex:1,padding:'8px',border: i===activeTab?'0.5px solid #E8E8E8':'none',borderRadius:7,fontSize:13,fontWeight:500,cursor:'pointer',background:i===activeTab?'#fff':'transparent',color:i===activeTab?'#111':'#888',transition:'all 0.15s'}}>
            {t}
          </button>
        ))}
      </div>

      {/* 財務タブ */}
      {activeTab === 0 && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
            {[
              {label:'売上',value:`¥${formatCurrency(totals.totalRevenue)}`,color:'#111'},
              {label:'原価',value:`¥${formatCurrency(totals.accumulatedCost)}`,color:'#D85A30'},
              {label:'粗利',value:`¥${formatCurrency(totals.grossProfit)}`,color:'#639922'},
            ].map((k,i) => (
              <div key={i} style={{background:'#fff',borderRadius:14,padding:'12px 10px',border:'0.5px solid #E8E8E8'}}>
                <div style={{fontSize:11,color:'#1E3A5F',marginBottom:4}}>{k.label}</div>
                <div style={{fontSize:15,fontWeight:500,color:k.color,fontVariantNumeric:'tabular-nums'}}>{k.value}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:12,display:'flex',flexDirection:'column',alignItems:'center',border:'0.5px solid #E8E8E8'}}>
            <div style={{fontSize:12,color:'#1E3A5F',marginBottom:6}}>粗利率 / Gross Margin</div>
            <div style={{fontSize:36,fontWeight:500,color:marginColor,fontVariantNumeric:'tabular-nums'}}>{grossMargin}%</div>
            <div style={{width:'100%',height:8,background:'#F0F0F0',borderRadius:4,overflow:'hidden',margin:'10px 0 6px'}}>
              <div style={{width:`${Math.min(100,grossMarginNum)}%`,height:'100%',background:marginColor,borderRadius:4,transition:'width 0.8s ease'}}></div>
            </div>
            {totals.accumulatedScrap > 0 && <div style={{fontSize:12,color:'#888'}}>スクラップ売上 ¥{formatCurrency(totals.accumulatedScrap)}</div>}
          </div>
          <div style={{background:'#2C2825',borderRadius:12,padding:14}}>
            <div style={{fontSize:12,color:'#888',marginBottom:10}}>収支内訳</div>
            {[
              {label:'売上',value:totals.totalRevenue,color:'#378ADD'},
              {label:'原価',value:totals.accumulatedCost,color:'#D85A30'},
              {label:'粗利',value:Math.abs(totals.grossProfit),color:marginColor},
            ].map((b,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{fontSize:11,color:'#888',width:52,textAlign:'right',flexShrink:0}}>{b.label}</div>
                <div style={{flex:1,height:10,background:'#F0F0F0',borderRadius:5,overflow:'hidden'}}>
                  <div style={{width:`${Math.round((b.value/Math.max(totals.totalRevenue,1))*100)}%`,height:'100%',background:b.color,borderRadius:5,transition:'width 0.8s ease'}}></div>
                </div>
                <div style={{fontSize:11,color:'#888',width:60,flexShrink:0,fontVariantNumeric:'tabular-nums'}}>¥{formatCurrency(b.value)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 原価内訳タブ */}
      {activeTab === 1 && (
        <>
          <div style={{background:'#F4F4F4',borderRadius:12,padding:14,marginBottom:12}}>
            <div style={{fontSize:12,color:'#888',marginBottom:10}}>原価構成比</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
              {pieData.map((d,i) => (
                <span key={i} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#888'}}>
                  <span style={{width:8,height:8,borderRadius:2,background:COLORS[i%COLORS.length],flexShrink:0}}></span>
                  {d.name} {totalCost>0?Math.round((d.value/totalCost)*100):0}%
                </span>
              ))}
            </div>
            {pieData.length > 0
              ? <div style={{position:'relative',width:'100%',height:200}}><canvas ref={chartRef1} role="img" aria-label="原価構成比ドーナツグラフ"></canvas></div>
              : <div style={{textAlign:'center',padding:32,color:'#888',fontSize:13}}>データがありません</div>
            }
          </div>
          <div style={{background:'#F4F4F4',borderRadius:12,padding:14}}>
            <div style={{fontSize:12,color:'#888',marginBottom:10}}>カテゴリ別金額</div>
            {pieData.sort((a,b)=>b.value-a.value).map((d,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{fontSize:11,color:'#888',width:60,textAlign:'right',flexShrink:0}}>{d.name}</div>
                <div style={{flex:1,height:10,background:'#E8E8E8',borderRadius:5,overflow:'hidden'}}>
                  <div style={{width:`${Math.round((d.value/maxBar)*100)}%`,height:'100%',background:COLORS[i%COLORS.length],borderRadius:5}}></div>
                </div>
                <div style={{fontSize:11,color:'#888',width:60,flexShrink:0,fontVariantNumeric:'tabular-nums'}}>¥{formatCurrency(d.value)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 月別推移タブ */}
      {activeTab === 2 && (
        <>
          <div style={{background:'#F4F4F4',borderRadius:12,padding:14,marginBottom:12}}>
            <div style={{fontSize:12,color:'#888',marginBottom:10}}>月別原価推移（万円）</div>
            {barLabels.length > 0
              ? <div style={{position:'relative',width:'100%',height:200}}><canvas ref={chartRef2} role="img" aria-label="月別原価推移グラフ"></canvas></div>
              : <div style={{textAlign:'center',padding:32,color:'#888',fontSize:13}}>データがありません</div>
            }
          </div>
          <div style={{background:'#F4F4F4',borderRadius:12,padding:14}}>
            <div style={{fontSize:12,color:'#888',marginBottom:10}}>月別人工推移（人）</div>
            {barLabels.length > 0
              ? <div style={{position:'relative',width:'100%',height:160}}><canvas ref={chartRef3} role="img" aria-label="月別稼働人工グラフ"></canvas></div>
              : <div style={{textAlign:'center',padding:32,color:'#888',fontSize:13}}>データがありません</div>
            }
          </div>
        </>
      )}

    </div>
  );
}


// ========== ExportPage ==========
function ExportPage({ sites, reports, projectInfo, selectedSite, onNavigate }) {
  const [gasUrl, setGasUrl] = useState('');
  const [gasMonthlyUrl, setGasMonthlyUrl] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [lastExport, setLastExport] = useState('');
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.body.scrollTop=0; document.documentElement.scrollTop=0; }, []);
  useEffect(() => {
    const loadSettings = async () => {
      const gasUrlResult = await window.storage.get('logio-gas-url');
      const gasMonthlyUrlResult = await window.storage.get('logio-gas-monthly-url');
      const lastResult = await window.storage.get('logio-last-export');
      if (gasUrlResult?.value) setGasUrl(gasUrlResult.value);
      if (gasMonthlyUrlResult?.value) setGasMonthlyUrl(gasMonthlyUrlResult.value);
      if (lastResult?.value) setLastExport(lastResult.value);
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    if (gasUrl) await window.storage.set('logio-gas-url', gasUrl);
    if (gasMonthlyUrl) await window.storage.set('logio-gas-monthly-url', gasMonthlyUrl);
    setExportStatus('✅ 設定を保存しました');
    setTimeout(() => setExportStatus(''), 3000);
  };

  const handleExportMonthlyReport = async () => {
    const targetUrl = gasMonthlyUrl || gasUrl;
    if (!targetUrl) { setExportStatus('❌ GAS URLを入力してください'); return; }
    if (!selectedSite) { setExportStatus('❌ 現場を選択してください'); return; }
    setExporting(true); setExportStatus('📤 月報を更新中...');
    try {
      const siteData = { siteName: selectedSite, projectNumber: projectInfo.projectNumber || '', workType: projectInfo.workType || '', client: projectInfo.client || '', workLocation: projectInfo.workLocation || '', salesPerson: projectInfo.salesPerson || '', siteManager: projectInfo.siteManager || '', startDate: projectInfo.startDate || '', endDate: projectInfo.endDate || '', contractAmount: projectInfo.contractAmount || 0, additionalAmount: projectInfo.additionalAmount || 0, status: projectInfo.status || '', transferCost: projectInfo.transferCost || 0, leaseCost: projectInfo.leaseCost || 0, materialsCost: projectInfo.materialsCost || 0 };
      await fetch(targetUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'updateMonthlyReport', siteData, reportData: reports, monthlySpreadsheetUrl: gasMonthlyUrl || null }), mode: 'no-cors' });
      const now = new Date().toLocaleString('ja-JP');
      setExportStatus(`✅ 月報を更新しました！（${now}）`);
    } catch (error) { setExportStatus('❌ 月報更新に失敗しました: ' + error.message); }
    finally { setExporting(false); setTimeout(() => setExportStatus(''), 8000); }
  };

  const handleExportWorkReport = async () => {
    if (!gasUrl) { setExportStatus('❌ GAS URLを入力してください'); return; }
    if (!selectedSite) { setExportStatus('❌ 現場を選択してください'); return; }
    if (reports.length === 0) { setExportStatus('❌ 日報データがありません'); return; }
    setExporting(true); setExportStatus('📤 解体作業日報をスプレッドシートに作成中...');
    try {
      const siteData = { siteName: selectedSite, projectNumber: projectInfo.projectNumber || '', workType: projectInfo.workType || '', client: projectInfo.client || '', workLocation: projectInfo.workLocation || '', salesPerson: projectInfo.salesPerson || '', siteManager: projectInfo.siteManager || '', startDate: projectInfo.startDate || '', endDate: projectInfo.endDate || '', contractAmount: projectInfo.contractAmount || 0, additionalAmount: projectInfo.additionalAmount || 0, status: projectInfo.status || '', discharger: projectInfo.discharger || '', transportCompany: projectInfo.transportCompany || '', contractedDisposalSites: projectInfo.contractedDisposalSites || [], transferCost: projectInfo.transferCost || 0, leaseCost: projectInfo.leaseCost || 0, materialsCost: projectInfo.materialsCost || 0 };
      await fetch(gasUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'exportWorkReport', siteData, reportData: reports }), mode: 'no-cors' });
      const now = new Date().toLocaleString('ja-JP');
      setLastExport(now);
      await window.storage.set('logio-last-export', now);
      setExportStatus(`✅ 解体作業日報をスプレッドシートに作成しました！（${now}）\n日報データ: ${reports.length}件`);
    } catch (error) { setExportStatus('❌ エクスポートに失敗しました: ' + error.message); }
    finally { setExporting(false); setTimeout(() => setExportStatus(''), 8000); }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-4" style={{minHeight:'100vh',background:'#F5F7FA',paddingBottom:'calc(160px + env(safe-area-inset-bottom,0px))'}}>
      <button onClick={() => onNavigate('home')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'#fff',border:'0.5px solid #E8E8E8',borderRadius:10,fontSize:12,fontWeight:600,color:'#1E3A5F',cursor:'pointer',marginBottom:12}}>
        <X className="w-4 h-4" />閉じる
      </button>
      <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:10,border:'0.5px solid #E8E8E8',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
        <div style={{fontSize:13,fontWeight:700,color:'#111',marginBottom:12}}>スプレッドシート設定</div>
        <div style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.1em',marginBottom:4}}>日報用 GAS URL <span style={{color:'#DC2626'}}>*必須</span></div>
        <input type="text" value={gasUrl} onChange={(e) => setGasUrl(e.target.value)} placeholder="例: https://script.google.com/macros/s/..."
          style={{width:'100%',padding:'10px 12px',border:'0.5px solid #E8E8E8',borderRadius:10,fontSize:13,color:'#111',background:'#F8FAFC',marginBottom:10,boxSizing:'border-box'}} />
        <div style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.1em',marginBottom:4}}>月報用 GAS URL</div>
        <input type="text" value={gasMonthlyUrl} onChange={(e) => setGasMonthlyUrl(e.target.value)} placeholder="例: https://script.google.com/macros/s/..."
          style={{width:'100%',padding:'10px 12px',border:'0.5px solid #E8E8E8',borderRadius:10,fontSize:13,color:'#111',background:'#F8FAFC',marginBottom:10,boxSizing:'border-box'}} />
        <button onClick={handleSaveSettings} style={{padding:'8px 16px',background:'#1E293B',border:'none',borderRadius:8,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>
          保存
        </button>
      </div>
      <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:10,border:'0.5px solid #E8E8E8',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
        <div style={{fontSize:13,fontWeight:700,color:'#111',marginBottom:6}}>月報</div>
        <p style={{fontSize:12,color:'#888',marginBottom:10}}>全現場の月報シートにこの現場の情報を反映します。</p>
        <button onClick={handleExportMonthlyReport} disabled={exporting || !gasUrl || !selectedSite}
          style={{width:'100%',padding:'13px',background:exporting||!gasUrl||!selectedSite?'#E8E8E8':'#15803D',border:'none',borderRadius:12,fontSize:14,fontWeight:700,color:exporting||!gasUrl||!selectedSite?'#aaa':'#fff',cursor:exporting||!gasUrl||!selectedSite?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          <FileText className="w-4 h-4" />{exporting ? '更新中...' : '月報を更新'}
        </button>
      </div>
      <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:10,border:'0.5px solid #E8E8E8',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
        <div style={{fontSize:13,fontWeight:700,color:'#111',marginBottom:6}}>解体作業日報</div>
        <p style={{fontSize:12,color:'#888',marginBottom:10}}>LOGIO仕様の解体作業日報をスプレッドシートに自動生成します</p>
        <button onClick={handleExportWorkReport} disabled={exporting || !gasUrl || !selectedSite}
          style={{width:'100%',padding:'13px',background:exporting||!gasUrl||!selectedSite?'#E8E8E8':'#1E293B',border:'none',borderRadius:12,fontSize:14,fontWeight:700,color:exporting||!gasUrl||!selectedSite?'#aaa':'#fff',cursor:exporting||!gasUrl||!selectedSite?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          <FileText className="w-4 h-4" />{exporting ? '作成中...' : '解体作業日報をスプシに作成'}
        </button>
        {exportStatus && (
          <div style={{marginTop:10,padding:10,borderRadius:10,fontSize:12,background:exportStatus.startsWith('✅')?'rgba(34,197,94,0.08)':exportStatus.startsWith('❌')?'rgba(239,68,68,0.08)':'rgba(59,130,246,0.08)',color:exportStatus.startsWith('✅')?'#16A34A':exportStatus.startsWith('❌')?'#DC2626':'#2563EB',whiteSpace:'pre-line'}}>{exportStatus}</div>
        )}
      </div>
      <div style={{background:'#fff',borderRadius:18,padding:16,border:'0.5px solid #E8E8E8',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
        <div style={{fontSize:13,fontWeight:700,color:'#111',marginBottom:10}}>ステータス</div>
        {[['最終エクスポート', lastExport || '未実行'], ['現場', selectedSite || '未選択'], ['日報データ', `${reports.length}件`]].map(([label, val]) => (
          <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'0.5px solid #F0F0F0'}}>
            <span style={{fontSize:12,color:'#888'}}>{label}</span><span style={{fontSize:13,fontWeight:600,color:'#111'}}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


// ========== OrderPDFPage ==========
function OrderPDFPage({ projectInfo, onNavigate }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.body.scrollTop=0; document.documentElement.scrollTop=0; }, []);

  const handlePrint = () => window.print();

  const fmt = (v) => v ? `¥${Number(v).toLocaleString()}` : '—';
  const chk = projectInfo.documentsChecklist || {};
  const DOCS = [
    {key:'work',label:'WORK表'},{key:'paperManifest',label:'紙マニフェスト'},{key:'eManifest',label:'電子マニフェスト'},
    {key:'treatmentContract',label:'処理委託契約書'},{key:'estimateContract',label:'見積契約書'},{key:'signboard',label:'看板'},
    {key:'preInvoice',label:'着工前請求書'},{key:'postInvoice',label:'着工後請求書'},{key:'safetyDocs',label:'安全書類'},
  ];
  const contractAmtTax = projectInfo.contractAmount ? Math.round(Number(projectInfo.contractAmount) * 1.1) : 0;
  const subAmtTax = projectInfo.subcontractAmount ? Math.round(Number(projectInfo.subcontractAmount) * 1.1) : 0;

  return (
    <div style={{background:'#F5F7FA',minHeight:'100vh'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .order-pdf { box-shadow: none !important; }
        }
        .order-table { border-collapse: collapse; width: 100%; }
        .order-table th, .order-table td { border: 1px solid #555; padding: 4px 6px; font-size: 11px; }
        .order-table th { background: #374151; color: #fff; font-weight: 700; text-align: center; }
      `}</style>

      {/* 操作バー */}
      <div className="no-print" style={{background:'#1E293B',padding:'10px 16px',display:'flex',gap:8,alignItems:'center'}}>
        <button onClick={()=>onNavigate('home')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'rgba(255,255,255,0.1)',border:'0.5px solid rgba(255,255,255,0.2)',borderRadius:8,fontSize:12,fontWeight:600,color:'#fff',cursor:'pointer'}}>
          <X className="w-4 h-4"/>閉じる
        </button>
        <button onClick={handlePrint} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'#DC2626',border:'none',borderRadius:8,fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>
          <FileText className="w-4 h-4"/>印刷 / PDF保存
        </button>
      </div>

      {/* 受注表本体 */}
      <div className="order-pdf" style={{maxWidth:800,margin:'16px auto',background:'#fff',padding:'clamp(12px,4vw,28px)',fontFamily:"'Noto Sans JP', sans-serif",boxShadow:'0 2px 16px rgba(0,0,0,0.1)',overflowX:'auto'}}>

        {/* ヘッダー */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,position:'relative'}}>
          <div style={{fontSize:10,color:'#555'}}>社外秘</div>
          <div style={{fontSize:22,fontWeight:700,textAlign:'center',position:'absolute',left:0,right:0,pointerEvents:'none'}}>受　注　表</div>
          <div style={{fontSize:10,color:'#555',textAlign:'right'}}>
            <div>提出日　　　　年　　月　　日</div>
            <div style={{marginTop:4}}>業務担当者　{projectInfo.salesPerson || '　　　　'}</div>
          </div>
        </div>

        {/* 基本情報テーブル */}
        <table className="order-table" style={{marginBottom:12,minWidth:600}}>
          <tbody>
            <tr>
              <th style={{width:100}}>発注先（会社名）</th>
              <td colSpan={3}>{projectInfo.client || ''}</td>
              <th style={{width:80}}>施工体制</th>
              <td style={{width:120}}>自社施工　□</td>
            </tr>
            <tr>
              <th>工事名</th>
              <td colSpan={5}>{projectInfo.workType || ''} {projectInfo.workLocation ? `（${projectInfo.workLocation}）` : ''}</td>
            </tr>
            <tr>
              <th>施工場所</th>
              <td colSpan={5}>{projectInfo.workLocation || ''}</td>
            </tr>
            <tr>
              <th>工期</th>
              <td colSpan={2}>{projectInfo.startDate || ''}</td>
              <td style={{textAlign:'center',width:20}}>〜</td>
              <td colSpan={2}>{projectInfo.endDate || ''}</td>
            </tr>
          </tbody>
        </table>

        {/* 受注情報テーブル */}
        <table className="order-table" style={{marginBottom:12}}>
          <tbody>
            <tr>
              <th rowSpan={4} style={{width:60,writingMode:'vertical-rl',textAlign:'center'}}>受注</th>
              <th style={{width:100}}>受注金額</th>
              <td style={{width:120}}>{fmt(projectInfo.contractAmount)}</td>
              <td style={{fontSize:10,color:'#555'}}>（税込 {fmt(contractAmtTax)}）</td>
              <th style={{width:80}}>入金予定日</th>
              <td>{projectInfo.paymentDueDate || ''}</td>
            </tr>
            <tr>
              <th>支払条件</th>
              <td colSpan={4}>{projectInfo.paymentTerms || ''}</td>
            </tr>
            <tr>
              <th>請求書送付先</th>
              <td colSpan={4}>{projectInfo.invoiceRecipient || ''}</td>
            </tr>
            <tr>
              <th>領収型的書（添付）</th>
              <td colSpan={4}></td>
            </tr>
          </tbody>
        </table>

        {/* 下請情報テーブル */}
        <table className="order-table" style={{marginBottom:12}}>
          <tbody>
            <tr>
              <th rowSpan={3} style={{width:60,writingMode:'vertical-rl',textAlign:'center'}}>下請</th>
              <th style={{width:100}}>下請金額</th>
              <td style={{width:120}}>{fmt(projectInfo.subcontractAmount)}</td>
              <td style={{fontSize:10,color:'#555'}}>（税込 {fmt(subAmtTax)}）</td>
              <th style={{width:80}}>下請業者</th>
              <td>{projectInfo.subcontractor || ''}</td>
            </tr>
            <tr>
              <th>支払条件</th>
              <td colSpan={4}>{projectInfo.subcontractTerms || ''}</td>
            </tr>
            <tr>
              <th>請求書送付先</th>
              <td colSpan={4}>{projectInfo.subcontractInvoiceRecipient || ''}</td>
            </tr>
          </tbody>
        </table>

        {/* マニフェスト */}
        <div style={{fontWeight:700,fontSize:12,marginBottom:6,borderBottom:'2px solid #374151',paddingBottom:4}}>マニフェスト】</div>
        <table className="order-table" style={{marginBottom:16}}>
          <thead>
            <tr>
              <th style={{width:'25%'}}>排出</th>
              <th style={{width:'25%'}}>運搬</th>
              <th style={{width:'25%'}}>処分</th>
              <th style={{width:'10%'}}>枚数</th>
              <th style={{width:'15%'}}>備考</th>
            </tr>
          </thead>
          <tbody>
            {(projectInfo.manifestRows||[{disposal:'',transport:'',count:''}]).map((row,i)=>(
              <tr key={i}>
                <td>{row.disposal||''}</td>
                <td>{row.transport||''}</td>
                <td></td>
                <td style={{textAlign:'center'}}>{row.count ? `${row.count}枚` : ''}</td>
                <td></td>
              </tr>
            ))}
            {Array.from({length:Math.max(0, 4-(projectInfo.manifestRows||[]).length)}).map((_,i)=>(
              <tr key={`empty-${i}`}><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
            ))}
          </tbody>
        </table>

        {/* 書類確認 */}
        <div style={{fontWeight:700,fontSize:12,marginBottom:6,borderBottom:'2px solid #374151',paddingBottom:4}}>書類・その他】</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4,marginBottom:16}}>
          {DOCS.map(({key,label})=>(
            <div key={key} style={{display:'flex',alignItems:'center',gap:6,fontSize:11}}>
              <span style={{fontSize:14}}>{chk[key]?'☑':'☐'}</span>{label}
            </div>
          ))}
        </div>

        {/* フッター */}
        <div style={{borderTop:'1px solid #ccc',paddingTop:10,display:'flex',gap:16,justifyContent:'flex-end',fontSize:10,color:'#555'}}>
          <div>工事番号：{projectInfo.projectNumber || ''}</div>
          <div>現場責任者：{projectInfo.siteManager || ''}</div>
        </div>
      </div>
    </div>
  );
}

// ========== ReportPDFPage ==========
function ReportPDFPage({ report, projectInfo: propProjectInfo, onNavigate }) {
  const projectInfo = report._projectInfo || propProjectInfo;
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.body.scrollTop=0; document.documentElement.scrollTop=0; }, []);
  useEffect(() => {
    const loadAllReports = async () => {
      try {
        const siteName = report.siteName || report.site_name;
        if (siteName) {
          const data = await sb('reports').select(`site_name=eq.${encodeURIComponent(siteName)}&order=date.asc`);
          if (Array.isArray(data) && data.length > 0) {
            setAllReports(data.map(r => ({ id: r.id, date: r.date, weather: r.weather, recorder: r.recorder, workDetails: r.work_details || {}, wasteItems: r.waste_items || [], scrapItems: r.scrap_items || [], createdAt: r.created_at })));
          } else { setAllReports([report]); }
        } else { setAllReports([report]); }
      } catch (error) { setAllReports([report]); }
      setLoading(false);
    };
    loadAllReports();
  }, [report]);

  if (loading) return <div className="min-h-screen bg-transparent flex items-center justify-center"><p className="text-gray-400">読み込み中...</p></div>;

  const totalInHouseWorkers = allReports.reduce((sum, r) => sum + (r.workDetails?.inHouseWorkers?.length || 0), 0);
  const totalInHouseCost = allReports.reduce((sum, r) => sum + (r.workDetails?.inHouseWorkers || []).reduce((s, w) => s + (w.amount || 0), 0), 0);
  const totalOutsourcingWorkers = allReports.reduce((sum, r) => sum + (r.workDetails?.outsourcingLabor || []).reduce((s, o) => s + (parseInt(o.count || o.workers) || 0), 0), 0);
  const totalOutsourcingCost = allReports.reduce((sum, r) => sum + (r.workDetails?.outsourcingLabor || []).reduce((s, o) => s + (o.amount || 0), 0), 0);
  const totalVehicleCost = allReports.reduce((sum, r) => sum + (r.workDetails?.vehicles || []).reduce((s, v) => s + (v.amount || 0), 0), 0);
  const totalMachineryCost = allReports.reduce((sum, r) => sum + (r.workDetails?.machinery || []).reduce((s, m) => s + (m.unitPrice || 0), 0), 0);
  const totalWasteCost = allReports.reduce((sum, r) => sum + (r.wasteItems || []).reduce((s, w) => s + (w.amount || 0), 0), 0);
  const totalHaishiCost = allReports.reduce((sum, r) => sum + (r.wasteItems || []).reduce((s, w) => s + (w.haishiAmount || 0), 0), 0);
  const totalTransportCost = allReports.reduce((sum, r) => sum + (r.workDetails?.envItems || []).reduce((s,t)=>s+(t.amount||0),0) + (r.workDetails?.extItems || []).reduce((s,t)=>s+(t.amount||0),0), 0);
  const totalDailyExpenses = allReports.reduce((sum, r) => sum + (r.workDetails?.dailyExpenses || []).reduce((s,e)=>s+(e.amount||0),0), 0);
  const totalScrapRevenue = allReports.reduce((sum, r) => sum + Math.abs((r.scrapItems || []).reduce((s, sc) => s + (sc.amount || 0), 0)), 0);
  const totalRevenue = (parseFloat(projectInfo.contractAmount) || 0) + (parseFloat(projectInfo.additionalAmount) || 0);
  const totalCost = totalInHouseCost + totalOutsourcingCost + (totalVehicleCost + totalHaishiCost) + totalMachineryCost + totalTransportCost + totalWasteCost + totalDailyExpenses
    + (parseFloat(projectInfo.transferCost) || 0) + (parseFloat(projectInfo.leaseCost) || 0) + (parseFloat(projectInfo.materialsCost) || 0)
    + (projectInfo.miscItems || [...(projectInfo.outsourcingItems||[]),...(projectInfo.siteExpenseItems||[]),...(projectInfo.sgaItems||[])]).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
    + (projectInfo.expenses || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const grossProfit = totalRevenue - totalCost;
  const fmtDate = (dateStr) => { if (!dateStr) return ''; const p = dateStr.split('-'); return `${parseInt(p[1])}/${parseInt(p[2])}`; };
  const fmtDay = (dateStr) => { if (!dateStr) return ''; return ['日','月','火','水','木','金','土'][new Date(dateStr).getDay()]; };
  const ROWS_PER_PAGE = 20;
  const pages = [];
  for (let i = 0; i < allReports.length; i += ROWS_PER_PAGE) {
    pages.push(allReports.slice(i, i + ROWS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'#f5f5f5', overflowX:'auto', overflowY:'auto', zIndex:100, WebkitOverflowScrolling:'touch' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
        .pdf-container { font-family: 'Noto Sans JP', sans-serif; background: #fff; }
        .pdf-table { border-collapse: collapse; width: 100%; }
        .pdf-table th, .pdf-table td { border: 1px solid #D1D5DB; padding: 2px 4px; font-size: 9px; line-height: 1.3; white-space: nowrap; }
        .pdf-table th { background: #374151; color: #fff; font-weight: 700; text-align: center; font-size: 8px; }
        .pdf-table td { color: #111827; background: #fff; }
        .pdf-header-table { border-collapse: collapse; width: 100%; }
        .pdf-header-table th, .pdf-header-table td { border: 1px solid #D1D5DB; padding: 3px 6px; font-size: 10px; line-height: 1.4; }
        .pdf-header-table th { background: #374151; color: #fff; font-weight: 700; text-align: left; font-size: 8px; width: 80px; }
        .pdf-header-table td { color: #111827; background: #fff; }
        .result-table { border-collapse: collapse; width: 100%; }
        .result-table th, .result-table td { border: 1px solid #D1D5DB; padding: 2px 8px; font-size: 9px; }
        .result-table th { background: #FEF9C3; color: #854D0E; font-weight: 700; text-align: left; width: 70px; white-space: nowrap; }
        .result-table td { color: #111827; text-align: right; background: #fff; font-variant-numeric: tabular-nums; white-space: nowrap; min-width: 90px; }
        @media print {
          .no-print { display: none !important; }
          @page { size: A3 landscape; margin: 6mm; }
          .pdf-container { zoom: 0.85; }
          .pdf-page-break { page-break-before: always; }
        }
      `}</style>
      <div className="no-print border-b sticky top-0 z-50" style={{ background:'#fff', borderColor:'#E5E7EB' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => onNavigate('home')} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:"#F3F4F6",border:"1px solid #E5E7EB",borderRadius:8,fontSize:12,fontWeight:600,color:"#374151",cursor:"pointer",flexShrink:0}}>
            <ChevronLeft className="w-4 h-4" />ホームに戻る
          </button>
          <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <span style={{fontSize:11,color:'#9CA3AF',whiteSpace:'nowrap'}}>全{allReports.length}件</span>
            <button onClick={() => window.print()} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'#2563EB',border:'none',borderRadius:8,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
              <FileText className="w-4 h-4" />PDF出力
            </button>
          </div>
        </div>
      </div>
      <div style={{ overflowX: 'auto', overflowY: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', background:'#f5f5f5' }}>
        {pages.map((pageRows, pageIdx) => {
          const isLastPage = pageIdx === pages.length - 1;
          const pageOffset = pageIdx * ROWS_PER_PAGE;
          const pageEmptyRows = ROWS_PER_PAGE - pageRows.length;
          const pageInHouseWorkers = pageRows.reduce((s,r)=>s+(r.workDetails?.inHouseWorkers||[]).length,0);
          const pageInHouseCost    = pageRows.reduce((s,r)=>s+(r.workDetails?.inHouseWorkers||[]).reduce((a,w)=>a+(w.amount||0),0),0);
          const pageOutWorkers     = pageRows.reduce((s,r)=>s+(r.workDetails?.outsourcingLabor||[]).reduce((a,o)=>a+(parseInt(o.count||o.workers)||0),0),0);
          const pageOutCost        = pageRows.reduce((s,r)=>s+(r.workDetails?.outsourcingLabor||[]).reduce((a,o)=>a+(o.amount||0),0),0);
          const pageVehicleCost    = pageRows.reduce((s,r)=>s+(r.workDetails?.vehicles||[]).reduce((a,v)=>a+(v.amount||0),0),0);
          const pageHaishiCost     = pageRows.reduce((s,r)=>s+(r.wasteItems||[]).reduce((a,w)=>a+(w.haishiAmount||0),0),0);
          const pageMachineryCost  = pageRows.reduce((s,r)=>s+(r.workDetails?.machinery||[]).reduce((a,m)=>a+(m.unitPrice||0),0),0);
          const pageWasteCost      = pageRows.reduce((s,r)=>s+(r.wasteItems||[]).reduce((a,w)=>a+(w.amount||0),0),0);
          const pageTotal          = pageInHouseCost+pageOutCost+pageVehicleCost+pageHaishiCost+pageMachineryCost+pageWasteCost;

          // リース等アイテム集計
          const miscItems = projectInfo.miscItems || [...(projectInfo.outsourcingItems||[]),...(projectInfo.siteExpenseItems||[]),...(projectInfo.sgaItems||[])];
          const dailyExpMap = {};
          miscItems.forEach(i=>{ if(!dailyExpMap[i.name]) dailyExpMap[i.name]={name:i.name,days:0,amount:0}; dailyExpMap[i.name].days+=(i.days||0); dailyExpMap[i.name].amount+=parseFloat(i.amount)||0; });
          allReports.forEach(r=>(r.workDetails?.dailyExpenses||[]).forEach(e=>{ if(!dailyExpMap[e.name]) dailyExpMap[e.name]={name:e.name,days:0,amount:0}; dailyExpMap[e.name].days+=1; dailyExpMap[e.name].amount+=(e.amount||0); }));
          const leaseItems = Object.values(dailyExpMap);
          const leaseTotal = leaseItems.reduce((s,i)=>s+i.amount,0);
          const hasLease = leaseItems.length > 0;

          // 現場詳細・単価計算
          const areaM2 = parseFloat(projectInfo.siteAreaM2) || 0;
          const wQty   = allReports.reduce((s,r)=>(r.wasteItems||[]).reduce((a,w)=>a+(parseFloat(w.quantity)||0),s),0)
                       + allReports.reduce((s,r)=>(r.scrapItems||[]).reduce((a,sc)=>a+(sc.volumeM3?parseFloat(sc.volumeM3)||0:0),s),0);
          const wCost  = allReports.reduce((s,r)=>(r.wasteItems||[]).reduce((a,w)=>a+(w.amount||0),s),0);
          const laborC = allReports.reduce((s,r)=>s+(r.workDetails?.inHouseWorkers||[]).reduce((a,w)=>a+(w.amount||0),0)+(r.workDetails?.outsourcingLabor||[]).reduce((a,o)=>a+(o.amount||0),0),0);
          const unitWaste   = wQty   > 0 ? Math.round(wCost/wQty)       : 0;
          const unitLaborM2 = areaM2 > 0 ? Math.round(laborC/areaM2)    : 0;
          const unitCostM2  = areaM2 > 0 ? Math.round(totalCost/areaM2) : 0;

          // ヘッダー列幅: リースあり=5列、なし=4列
          const headerCols = '290px 185px 185px 155px 1fr';

          return (
            <div key={pageIdx} className={`pdf-container p-6${pageIdx > 0 ? ' pdf-page-break' : ''}`} style={{ minWidth: '1200px', width: '1200px', margin: '0 auto', background:'#fff', marginBottom: isLastPage ? 0 : 16 }}>
              <div style={{ width: '1200px' }}>
                {pageIdx === 0 ? (
                  <div className="text-center mb-3">
                    <h1 className="pdf-title text-xl font-black tracking-[0.3em] border-b-2 pb-2 inline-block px-8" style={{color:'#111827',borderColor:'#374151'}}>解　体　作　業　日　報</h1>
                    <p className="text-right text-gray-500 text-[9px] mt-1 mr-2">EMS-記-22</p>
                  </div>
                ) : (
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <span style={{fontSize:11,fontWeight:700,color:'#374151'}}>解体作業日報（続き）</span>
                    <span style={{fontSize:10,color:'#9CA3AF'}}>{pageIdx+1} / {pages.length} ページ</span>
                  </div>
                )}
                <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: headerCols, width:'1152px' }}>
                  <table className="pdf-header-table">
                    <tbody>
                      {[['発注者', projectInfo.client], ['プロジェクト名', report.siteName || report.site_name || ''], ['工事種別', projectInfo.workType||''], ['住所', projectInfo.workLocation], ['工期', `${projectInfo.startDate} ～ ${projectInfo.endDate}`], ['営業担当', projectInfo.salesPerson], ['責任者', projectInfo.siteManager]].map(([k, v]) => (
                        <tr key={k}><th>{k}</th><td>{v || ''}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <table className="pdf-header-table">
                    <tbody>
                      <tr><th>排出事業者</th><td>{projectInfo.manifestDischarger || projectInfo.discharger || ''}</td></tr>
                      <tr><th>運搬会社</th><td className="text-[8px]" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{[...new Set((projectInfo.manifestRows||[]).map(r=>r.transport).filter(Boolean))].join('\n') || projectInfo.transportCompany || ''}</td></tr>
                      <tr><th>契約処分先</th><td className="text-[8px]" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{[...new Set((projectInfo.manifestRows||[]).map(r=>r.disposal).filter(Boolean))].join('\n') || (projectInfo.contractedDisposalSites||[]).join('\n')}</td></tr>
                      <tr><th>PROJECT NO.</th><td>{projectInfo.projectNumber || ''}</td></tr>
                      <tr><th>ステータス</th><td>{projectInfo.status || ''}</td></tr>
                    </tbody>
                  </table>
                  <table className="pdf-header-table" style={{fontSize:'8px', height:'100%'}}>
                    <thead>
                      <tr><th colSpan="3" style={{textAlign:'center',fontSize:'8px',color:'#C4B5FD',background:'#374151',fontWeight:700}}>リース・機材・資材・経費等</th></tr>
                      <tr style={{background:'#F3F4F6'}}><th style={{width:'55%'}}>項目</th><th style={{width:'15%',textAlign:'center'}}>日</th><th style={{width:'30%',textAlign:'right'}}>金額</th></tr>
                    </thead>
                    <tbody style={{verticalAlign:'top'}}>
                      {hasLease
                        ? leaseItems.map((it,i)=>(<tr key={i}><td>{it.name}</td><td style={{textAlign:'center'}}>{it.days||''}</td><td style={{textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{it.amount>0?formatCurrency(it.amount):'-'}</td></tr>))
                        : <tr><td colSpan="3" style={{textAlign:'center',color:'#9CA3AF',padding:'6px'}}>—</td></tr>
                      }
                      {/* 空行で高さを発注者ブロックに合わせる */}
                      {hasLease && Array.from({length: Math.max(0, 7 - leaseItems.length)}).map((_,i)=>(
                        <tr key={`pad-${i}`}><td colSpan="3" style={{padding:'3px 6px'}}>&nbsp;</td></tr>
                      ))}
                      {hasLease && <tr style={{borderTop:'1px solid #374151'}}><td colSpan="2" style={{textAlign:'right',fontWeight:700}}>小計</td><td style={{textAlign:'right',fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{formatCurrency(leaseTotal)}</td></tr>}
                    </tbody>
                  </table>
                  <div style={{display:'flex', flexDirection:'column'}}>
                    <div className="text-center py-1 font-bold text-[10px] tracking-widest" style={{background:'#374151',color:'#C4B5FD',border:'1px solid #374151'}}>現　場　詳　細</div>
                    <table className="pdf-header-table" style={{flex:1,fontSize:'9px'}}>
                      <tbody>
                        <tr><th style={{fontSize:'9px'}}>面積</th><td style={{fontSize:'9px',textAlign:'right'}}>{projectInfo.siteAreaM2 ? `${projectInfo.siteAreaM2} ㎡` : '—'}</td></tr>
                        <tr><th style={{fontSize:'9px'}}>坪数</th><td style={{fontSize:'9px',textAlign:'right'}}>{projectInfo.siteTsubo  ? `${projectInfo.siteTsubo} 坪`  : '—'}</td></tr>
                        <tr><th style={{fontSize:'9px'}}>業態</th><td style={{fontSize:'9px',textAlign:'right'}}>{projectInfo.siteUseType || '—'}</td></tr>
                        <tr><th style={{fontSize:'9px',whiteSpace:'nowrap'}}>工事条件</th><td style={{fontSize:'8px',textAlign:'right',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'80px'}}>{projectInfo.workCondition || '—'}</td></tr>
                        <tr style={{borderTop:'1px solid #374151'}}><th colSpan={2} style={{textAlign:'center',color:'#C4B5FD',background:'#374151',fontSize:'9px',fontWeight:700,letterSpacing:'.05em'}}>原　価　単　価</th></tr>
                        <tr><th style={{fontSize:'9px'}}>処分費㎥単価</th><td style={{fontSize:'9px',textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{unitWaste   > 0 ? `¥${formatCurrency(unitWaste)}`   : '—'}</td></tr>
                        <tr><th style={{fontSize:'9px'}}>人件費㎡単価</th><td style={{fontSize:'9px',textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{unitLaborM2 > 0 ? `¥${formatCurrency(unitLaborM2)}` : '—'}</td></tr>
                        <tr><th style={{fontSize:'9px'}}>解体原価㎡単価</th><td style={{fontSize:'9px',textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{unitCostM2  > 0 ? `¥${formatCurrency(unitCostM2)}`  : '—'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                    <div style={{width:'100%'}}>
                      <div className="text-center py-1 font-bold text-[10px] tracking-widest" style={{background:'#374151',color:'#EAB308',border:'1px solid #374151'}}>【　収　支　結　果　】</div>
                      <table className="result-table" style={{width:'100%'}}>
                        <tbody>
                          {[['見積金額', totalRevenue],['原価金額', totalCost],['追加金額', parseFloat(projectInfo.additionalAmount) || 0]].map(([label, val]) => (
                            <tr key={label}><th>{label}</th><td>¥{formatCurrency(val)}</td></tr>
                          ))}
                          <tr style={{ borderTop: '2px solid #374151' }}>
                            <th style={{color:'#B45309',fontWeight:700}}>粗利</th>
                            <td style={{ color: grossProfit >= 0 ? '#1D4ED8' : '#DC2626', fontWeight:700 }}>¥{formatCurrency(grossProfit)}</td>
                          </tr>
                          <tr>
                            <th style={{color:'#B45309'}}>粗利率</th>
                            <td style={{ color: grossProfit >= 0 ? '#1D4ED8' : '#DC2626', fontWeight:700 }}>{totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(1) : '0.0'}%</td>
                          </tr>
                          {totalScrapRevenue > 0 && (
                            <tr style={{ borderTop: '1px dashed #D1D5DB' }}>
                              <th style={{color:'#065F46'}}>金属売上</th>
                              <td style={{color:'#065F46',fontWeight:700}}>¥{formatCurrency(totalScrapRevenue)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <table className="pdf-table" style={{ width:'1152px' }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ width: '28px' }}>日数</th><th rowSpan="2" style={{ width: '52px' }}>日付</th>
                      <th rowSpan="2" style={{ width: '18px' }}>曜</th><th rowSpan="2" style={{ minWidth: '150px' }}>施工内容</th>
                      <th colSpan="2">作業時間</th><th colSpan="2">自社人工</th><th colSpan="2">外注人工</th>
                      <th colSpan="2">車両</th><th rowSpan="2" style={{ width: '50px' }}>重機</th><th colSpan="5">産廃・スクラップ</th>
                    </tr>
                    <tr>
                      <th style={{ width: '35px' }}>開始</th><th style={{ width: '35px' }}>終了</th>
                      <th style={{ width: '68px' }}>氏名</th><th style={{ width: '50px' }}>金額</th>
                      <th style={{ width: '65px' }}>会社・人数</th><th style={{ width: '50px' }}>金額</th>
                      <th style={{ width: '33px' }}>車種</th><th style={{ width: '36px' }}>車番</th>
                      <th style={{ width: '55px' }}>発生材</th><th style={{ width: '82px' }}>数量</th>
                      <th style={{ width: '52px' }}>金額</th><th style={{ width: '90px', textAlign:'center' }}>搬出先</th><th style={{ width: '90px', textAlign:'center' }}>マニNo.</th>
                    </tr>
                  </thead>
                  <tbody>
              {pageRows.map((r, idx) => {
                const workers = r.workDetails?.inHouseWorkers || [];
                const outsourcing = r.workDetails?.outsourcingLabor || [];
                const vehicles = r.workDetails?.vehicles || [];
                const machinery = r.workDetails?.machinery || [];
                const transport = [...(r.workDetails?.envItems||[]).map(t=>({...t,name:t.driver})), ...(r.workDetails?.extItems||[]).map(t=>({...t,name:t.company}))];
                const waste = r.wasteItems || [];
                const scrap = r.scrapItems || [];

                // 環境課配車の産廃と通常産廃を分離
                const envWaste  = waste.filter(w=>w.haisha==='env');
                const extWaste  = waste.filter(w=>w.haisha==='ext');
                const normWaste = waste.filter(w=>!w.haisha||w.haisha==='');
                const scrapRows = scrap.map(s=>({ material:s.type, quantity:s.quantity, unit:s.unit, volumeM3:s.volumeM3||null, amount:Math.abs(s.amount), disposalSite:s.buyer, manifestNumber:'-', envDriver:'', extHaisha:false, vType:'', vNumber:'' }));

                // 行データ統合：自社人工、外注、車両、重機、産廃を行単位で対応
                // 環境課配車行は (運転者) + 車両 + その産廃 を同じ行に
                const envWorkerRows = envWaste.map(w=>({ name:`(${w.driver})`, amount:0, isEnv:true, vType:w.vType||'', vNumber:w.vNumber||'', waste:{ material:w.material, quantity:w.quantity, unit:w.unit, amount:w.amount, disposalSite:w.disposalSite, manifestNumber:w.manifestNumber||'', envDriver:w.driver, extHaisha:false, vType:w.vType||'', vNumber:w.vNumber||'' } }));
                // ワイエム配車産廃行
                const extWasteRows = extWaste.map(w=>({ material:w.material, quantity:w.quantity, unit:w.unit, amount:w.amount, disposalSite:w.disposalSite, manifestNumber:w.manifestNumber||'', envDriver:'', extHaisha:true, vType:'', vNumber:'' }));
                // 通常産廃＋スクラップ
                const normWasteRows = [...normWaste.map(w=>({ material:w.material, quantity:w.quantity, unit:w.unit, amount:w.amount, disposalSite:w.disposalSite, manifestNumber:w.manifestNumber||'', envDriver:'', extHaisha:false, vType:'', vNumber:'' })), ...scrapRows];
                const wasteAndScrap = normWasteRows;

                const allWorkers = [ ...workers, ...envWorkerRows ];
                // 通常産廃が自社人工より多い場合、自社人工を〃で補完
                const effectiveWorkers = [...allWorkers];
                if (wasteAndScrap.length > workers.length) {
                  for (let i = workers.length; i < wasteAndScrap.length; i++) {
                    if (!effectiveWorkers[i] || effectiveWorkers[i]?.isEnv) {
                      const lastWorker = workers[workers.length - 1];
                      if (lastWorker) {
                        effectiveWorkers.splice(i, 0, { ...lastWorker, isDitto: true, amount: 0 });
                      }
                    }
                  }
                }
                const maxSubRows = Math.max(1, effectiveWorkers.length, outsourcing.length, vehicles.length, machinery.length, extWasteRows.length, envWorkerRows.length + wasteAndScrap.length);
                const allStartTimes = [...workers.map(w => w.start || w.startTime), ...outsourcing.map(o => o.start || o.startTime)].filter(Boolean).sort();
                const allEndTimes = [...workers.map(w => w.end || w.endTime), ...outsourcing.map(o => o.end || o.endTime)].filter(Boolean).sort().reverse();
                return (
                  <Fragment key={r.id}>
                    {Array.from({ length: maxSubRows }, (_, subIdx) => (
                      <tr key={`${r.id}-${subIdx}`}>
                        {subIdx === 0 && (
                          <>
                            <td rowSpan={maxSubRows} className="text-center">{pageOffset + idx + 1}</td>
                            <td rowSpan={maxSubRows} className="text-center text-[8px]">{fmtDate(r.date)}</td>
                            <td rowSpan={maxSubRows} className="text-center text-[8px]">{fmtDay(r.date)}</td>
                            <td rowSpan={maxSubRows} className="text-[8px]" style={{ whiteSpace: 'normal', maxWidth: '120px' }}>{r.workDetails?.workContent || ''}</td>
                            <td rowSpan={maxSubRows} className="text-center text-[8px]">{allStartTimes[0] || '-'}</td>
                            <td rowSpan={maxSubRows} className="text-center text-[8px]">{allEndTimes[0] || '-'}</td>
                          </>
                        )}
                        <td className="text-[8px]" style={effectiveWorkers[subIdx]?.isEnv?{color:'#374151'}:{}}>{effectiveWorkers[subIdx]?.isDitto ? '〃' : (effectiveWorkers[subIdx]?.name||'')}</td>
                        <td className="text-right text-[8px]">{effectiveWorkers[subIdx]&&!effectiveWorkers[subIdx].isEnv&&!effectiveWorkers[subIdx].isDitto?`¥${formatCurrency(effectiveWorkers[subIdx].amount)}`:''}</td>
                        <td className="text-[8px]">{outsourcing[subIdx] ? `${outsourcing[subIdx].company} ${parseFloat(outsourcing[subIdx].count || outsourcing[subIdx].workers || 0)}人` : ''}</td>
                        <td className="text-right text-[8px]">{outsourcing[subIdx] ? `¥${formatCurrency(outsourcing[subIdx].amount)}` : ''}</td>
                        {/* 車両：通常車両 or 環境課車両 or ワイエム or 〃 */}
                        <td className="text-center text-[8px]">{vehicles[subIdx]?.type || (effectiveWorkers[subIdx]?.isEnv ? effectiveWorkers[subIdx].vType : '') || (effectiveWorkers[subIdx]?.isDitto ? '〃' : '') || (extWasteRows[subIdx] ? '配車' : '')}</td>
                        <td className="text-center text-[8px]">{vehicles[subIdx] ? vehicles[subIdx].number : (effectiveWorkers[subIdx]?.isEnv ? effectiveWorkers[subIdx].vNumber : '') || (effectiveWorkers[subIdx]?.isDitto ? '〃' : '') || (extWasteRows[subIdx] ? 'ワイエム' : '')}</td>
                        <td className="text-[8px]">{machinery[subIdx]?.type || ''}</td>
                        {/* 産廃：環境課行はwaste、ワイエム行はextWaste、通常行はwasteAndScrap */}
                        {(()=>{
                          const envW = effectiveWorkers[subIdx]?.isEnv ? effectiveWorkers[subIdx].waste : null;
                          const extW = !effectiveWorkers[subIdx]?.isEnv && !effectiveWorkers[subIdx]?.isDitto ? extWasteRows[subIdx] : null;
                          // subIdxまでの通常行（isEnvでもisDittoでもない行 + isDitto行）のインデックス
                          // effectiveWorkersの中でisEnvでない行の順番を数える
                          let normIdx = -1;
                          if (!effectiveWorkers[subIdx]?.isEnv) {
                            normIdx = 0;
                            for (let k = 0; k < subIdx; k++) {
                              if (!effectiveWorkers[k]?.isEnv) normIdx++;
                            }
                          }
                          const normW = (!effectiveWorkers[subIdx]?.isEnv) ? wasteAndScrap[normIdx] : null;
                          const w = envW || normW;
                          const isScrap = w?.manifestNumber==='-';
                          return (<>
                            <td className="text-[8px]">{w?.material||''}</td>
                            <td className="text-right text-[8px]" style={{whiteSpace:'nowrap'}}>{w ? (w.volumeM3 ? `${w.quantity}${w.unit}/${w.volumeM3}㎥` : `${w.quantity}${w.unit}`) : ''}</td>
                            <td className="text-right text-[8px]" style={isScrap?{color:'#ef4444'}:{}}>{w?`¥${formatCurrency(w.amount)}`:''}</td>
                            <td className="text-right text-[8px]" style={isScrap?{color:'#ef4444'}:{}}>{w?.disposalSite||''}</td>
                            <td className="text-right text-[8px]">{isScrap?'スクラップ':(w?.manifestNumber||'')}</td>
                          </>);
                        })()}
                      </tr>
                    ))}
                  </Fragment>
                );
              })}

                  {Array.from({ length: pageEmptyRows }, (_, idx) => (
                    <tr key={`empty-${idx}`}>
                      <td className="text-center" style={{ height: '18px' }}>{pageOffset + pageRows.length + idx + 1}</td>
                      <td></td><td></td><td></td><td></td><td></td><td></td>
                      <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                      <td></td><td></td><td></td><td></td>
                    </tr>
                  ))}
                  <tr style={{ background: '#374151' }}>
                    <th colSpan="6" className="text-right" style={{ background: '#374151', color: '#fff' }}>
                      {pages.length > 1 ? `${pageIdx+1}/${pages.length}ページ 小計` : '計'}
                    </th>
                    <td className="text-center text-[8px] font-bold" style={{ color: '#fff', background:'#374151' }}>{pageInHouseWorkers}人</td>
                    <td className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#374151' }}>¥{formatCurrency(pageInHouseCost)}</td>
                    <td className="text-center text-[8px] font-bold" style={{ color: '#fff', background:'#374151' }}>{pageOutWorkers}人</td>
                    <td className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#374151' }}>¥{formatCurrency(pageOutCost)}</td>
                    <td colSpan="2" className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#374151' }}>¥{formatCurrency(pageVehicleCost + pageHaishiCost)}</td>
                    <td className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#374151' }}>¥{formatCurrency(pageMachineryCost)}</td>
                    <td colSpan="2" className="text-center text-[8px] font-bold" style={{ color: '#fff', background:'#374151', whiteSpace:'nowrap' }}>{(pageRows.reduce((s,r)=>(r.wasteItems||[]).reduce((a,w)=>a+(parseFloat(w.quantity)||0),s),0)+pageRows.reduce((s,r)=>(r.scrapItems||[]).reduce((a,sc)=>a+(sc.volumeM3?parseFloat(sc.volumeM3)||0:0),s),0)).toFixed(1)}㎥</td><td className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#374151', whiteSpace:'nowrap' }}>¥{formatCurrency(pageWasteCost)}</td>
                    <td className="text-right text-[8px] font-bold" style={{ color: '#D1D5DB', background:'#374151' }}>原価小計</td>
                    <td className="text-right text-[8px] font-bold" style={{ color: '#fff', background:'#374151' }}>¥{formatCurrency(pageTotal)}</td>
                  </tr>
                  {isLastPage && pages.length > 1 && (
                    <tr style={{ background: '#1a1a2e' }}>
                      <th colSpan="6" className="text-right" style={{ background: '#1a1a2e', color: '#fff' }}>合　計</th>
                      <td className="text-center text-[8px] font-bold" style={{ color: '#fff', background:'#1a1a2e' }}>{totalInHouseWorkers}人</td>
                      <td className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#1a1a2e' }}>¥{formatCurrency(totalInHouseCost)}</td>
                      <td className="text-center text-[8px] font-bold" style={{ color: '#fff', background:'#1a1a2e' }}>{totalOutsourcingWorkers}人</td>
                      <td className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#1a1a2e' }}>¥{formatCurrency(totalOutsourcingCost)}</td>
                      <td colSpan="2" className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#1a1a2e' }}>¥{formatCurrency(totalVehicleCost + totalHaishiCost)}</td>
                      <td className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#1a1a2e' }}>¥{formatCurrency(totalMachineryCost)}</td>
                      <td colSpan="2" className="text-center text-[8px] font-bold" style={{ color: '#fff', background:'#1a1a2e', whiteSpace:'nowrap' }}>{(allReports.reduce((s,r)=>(r.wasteItems||[]).reduce((a,w)=>a+(parseFloat(w.quantity)||0),s),0)+allReports.reduce((s,r)=>(r.scrapItems||[]).reduce((a,sc)=>a+(sc.volumeM3?parseFloat(sc.volumeM3)||0:0),s),0)).toFixed(1)}㎥</td><td className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#1a1a2e', whiteSpace:'nowrap' }}>¥{formatCurrency(totalWasteCost)}</td>
                      <td className="text-right text-[8px] font-bold" style={{ color: '#D1D5DB', background:'#1a1a2e' }}>原価合計</td>
                      <td className="text-right text-[8px] font-bold" style={{ color: '#fff', background:'#1a1a2e' }}>¥{formatCurrency(totalCost)}</td>
                    </tr>
                  )}
                  </tbody>
                </table>
                {isLastPage && (
                  <div style={{display:'flex',justifyContent:'flex-end',marginTop:4,width:'1152px'}}>
                    <div style={{border:'1px solid #374151',background:'#374151',padding:'6px 16px',display:'flex',alignItems:'center',gap:12,borderRadius:2}}>
                      <span style={{color:'#9CA3AF',fontSize:11,fontWeight:700,letterSpacing:'.04em'}}>原価合計</span>
                      <span style={{color:'#fff',fontSize:16,fontWeight:900,fontVariantNumeric:'tabular-nums'}}>¥{formatCurrency(totalCost)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


export default function LOGIOApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try { return !!localStorage.getItem('wac_user'); } catch { return false; }
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try { const u = localStorage.getItem('wac_user'); return u ? JSON.parse(u) : null; } catch { return null; }
  });
  const [currentPage, setCurrentPage] = useState('home');

  const [navHoverId, setNavHoverId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [password, setPassword] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [editingReport, setEditingReport] = useState(null);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const defaultProjectInfo = {
    projectId: '', projectNumber: '', projectName: '', client: '', workLocation: '',
    salesPerson: '', siteManager: '', startDate: '', endDate: '',
    contractAmount: '', additionalAmount: '', status: '進行中',
    discharger: '', contractedDisposalSites: [], transferCost: '', leaseCost: '', materialsCost: '',
    outsourcingItems: [], sgaItems: [], manifestRows: [{disposal:'',transport:'',count:'1'}], manifestDischarger: '', miscItems: [],
    paymentDueDate: '', paymentTerms: '', invoiceRecipient: '',
    subcontractAmount: '', subcontractor: '', subcontractTerms: '', subcontractInvoiceRecipient: '',
    documentsChecklist: {work:false,paperManifest:false,eManifest:false,treatmentContract:false,estimateContract:false,signboard:false,preInvoice:false,postInvoice:false,safetyDocs:false}
  };
  const [projectInfo, setProjectInfo] = useState(defaultProjectInfo);
  const [reports, setReports] = useState([]);
  // ★ 追加 state
  const [reloading, setReloading] = useState(false);
  const [lockStatus, setLockStatus] = useState(null);
  const [sitesReady, setSitesReady] = useState(false);

  useEffect(() => {
    const vp = document.querySelector('meta[name="viewport"]');
    const content = currentPage === 'pdf' ? 'width=device-width, initial-scale=1' : 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    if (vp) vp.setAttribute('content', content);
    else { const meta = document.createElement('meta'); meta.name='viewport'; meta.content=content; document.head.appendChild(meta); }
  }, [currentPage]);

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => setShowSplash(false), 4000);
    return () => clearTimeout(timer);
  }, [showSplash]);

  useEffect(() => { if (isLoggedIn) loadSites(); }, [isLoggedIn]);

  const loadSites = async () => {
    try {
      const data = await sb('sites').select('order=created_at.asc');
      if (Array.isArray(data)) {
        // project_infoからproject_numberを取得して統合
        const piData = await sb('project_info').select('select=site_name,project_number');
        const piMap = {};
        if (Array.isArray(piData)) piData.forEach(p => { if (p.site_name) piMap[p.site_name] = p.project_number || ''; });
        setSites(data.map(s => ({ name: s.name, createdAt: s.created_at, status: s.status, projectNumber: piMap[s.name] || s.project_number || '' })));
      }
    } catch (error) { console.log('loadSites error:', error); }
    setSitesReady(true);
  };

  const generateProjectNumber = async () => {
    const currentYear = new Date().getFullYear();
    const data = await sb('project_info').select('select=project_number');
    const allNums = Array.isArray(data) ? data.map(d => d.project_number).filter(Boolean) : [];
    const nums = allNums.filter(num => num && num.startsWith(currentYear + '-')).map(num => { const parts = num.split('-'); return parts.length === 2 ? parseInt(parts[1], 10) : 0; }).filter(num => !isNaN(num));
    return `${currentYear}-${(Math.max(...nums, 0) + 1).toString().padStart(3, '0')}`;
  };

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    try { localStorage.setItem('wac_user', JSON.stringify(user)); } catch {}
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      if (selectedSite && currentUser) siteLocks.release(selectedSite, currentUser.userId);
      try { localStorage.removeItem('wac_user'); } catch {}
      setIsLoggedIn(false); setCurrentUser(null); setSelectedSite(''); setSidebarOpen(false); setLockStatus(null);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  // ★ リロード
  const handleReload = async () => {
    if (reloading) return;
    setReloading(true);
    try {
      await loadSites();
      if (selectedSite) {
        await loadProjectInfo(selectedSite);
        await loadReports(selectedSite);
        const locker = await siteLocks.check(selectedSite);
        setLockStatus(locker);
      }
    } catch(e) { console.error(e); }
    setTimeout(() => setReloading(false), 600);
  };

  const handleAddSite = async (siteName) => {
    try {
      const projectNumber = await generateProjectNumber();
      await sb('sites').insert({ name: siteName, project_number: projectNumber, status: '進行中' });
      await sb('project_info').insert({ site_name: siteName, project_number: projectNumber, work_type: '', client: '', work_location: '', sales_person: '', site_manager: '', start_date: '', end_date: '', contract_amount: 0, additional_amount: 0, status: '進行中', discharger: '', transport_company: '', contracted_disposal_sites: [], transfer_cost: 0, lease_cost: 0, materials_cost: 0, expenses: [] });
      setSites(prev => [...prev, { name: siteName, projectNumber, status: '進行中' }]);
      setSelectedSite(siteName);
      setProjectInfo({ projectId: '', projectNumber, projectName: siteName, workType: '', client: '', workLocation: '', salesPerson: '', siteManager: '', startDate: '', endDate: '', contractAmount: '', additionalAmount: '', status: '進行中', discharger: '', transportCompany: '', contractedDisposalSites: [], transferCost: '', leaseCost: '', materialsCost: '', expenses: [], outsourcingItems: [], sgaItems: [], manifestRows: [{disposal:'',transport:'',count:'1'}], manifestDischarger: '', miscItems: [], paymentDueDate: '', paymentTerms: '', invoiceRecipient: '', subcontractAmount: '', subcontractor: '', subcontractTerms: '', subcontractInvoiceRecipient: '', documentsChecklist: {work:false,paperManifest:false,eManifest:false,treatmentContract:false,estimateContract:false,signboard:false,preInvoice:false,postInvoice:false,safetyDocs:false} });
      alert(`✅ 現場「${siteName}」を追加しました\nPROJECT NO.: ${projectNumber}`);
    } catch (error) { console.error(error); alert('❌ 現場の追加に失敗しました'); }
  };

  const handleDeleteSite = async (siteName) => {
    try {
      await sb('sites').delete(`name=eq.${encodeURIComponent(siteName)}`);
      await sb('project_info').delete(`site_name=eq.${encodeURIComponent(siteName)}`);
      await sb('reports').delete(`site_name=eq.${encodeURIComponent(siteName)}`);
      setSites(prev => prev.filter(s => s.name !== siteName));
      if (selectedSite === siteName) { setSelectedSite(''); setLockStatus(null); }
      alert(`✅ 現場「${siteName}」を削除しました`);
    } catch (error) { alert('❌ 現場の削除に失敗しました'); }
  };

  const handleRenameSite = async (oldName, newName) => {
    if (!newName.trim() || newName.trim() === oldName) return;
    const n = newName.trim();
    try {
      // sites テーブル更新
      await sb('sites').update({ name: n }, `name=eq.${encodeURIComponent(oldName)}`);
      // project_info テーブル更新
      await sb('project_info').update({ site_name: n }, `site_name=eq.${encodeURIComponent(oldName)}`);
      // reports テーブル更新
      await sb('reports').update({ site_name: n }, `site_name=eq.${encodeURIComponent(oldName)}`);
      setSites(prev => prev.map(s => s.name === oldName ? { ...s, name: n } : s));
      if (selectedSite === oldName) { setSelectedSite(n); }
      alert(`✅ 現場名を「${n}」に変更しました`);
    } catch (error) { console.error(error); alert('❌ 現場名の変更に失敗しました'); }
  };

  // ★ 現場選択時にロック状態確認
  const handleSelectSite = async (siteName) => {
    setSelectedSite(siteName);
    setProjectInfo(defaultProjectInfo);
    setReports([]);
    await loadProjectInfo(siteName);
    await loadReports(siteName);
    const locker = await siteLocks.check(siteName);
    setLockStatus(locker);
  };

  const loadProjectInfo = async (siteName) => {
    try {
      const data = await sb('project_info').select(`site_name=eq.${encodeURIComponent(siteName)}`);
      if (Array.isArray(data) && data.length > 0) {
        const d = data[0];
        const rawMiscItems = d.misc_items;
        const miscItems = rawMiscItems !== undefined && rawMiscItems !== null
          ? rawMiscItems
          : [...(d.site_expense_items||[]), ...(d.sga_items||[])];
        const info = { projectId: d.id || '', projectNumber: d.project_number || '', projectName: siteName, workType: d.work_type || '', client: d.client || '', workLocation: d.work_location || '', salesPerson: d.sales_person || '', siteManager: d.site_manager || '', startDate: d.start_date || '', endDate: d.end_date || '', contractAmount: d.contract_amount || '', additionalAmount: d.additional_amount || '', status: d.status || '進行中', discharger: d.discharger || '', transportCompany: d.transport_company || '', contractedDisposalSites: d.contracted_disposal_sites || [], transferCost: d.transfer_cost || '', leaseCost: d.lease_cost || '', materialsCost: d.materials_cost || '', expenses: d.expenses || [], outsourcingItems: d.outsourcing_items || [], sgaItems: d.sga_items || [], siteExpenseItems: d.site_expense_items || [], miscItems, manifestRows: (d.manifest_entries||[]).length > 0 ? d.manifest_entries : [{disposal:'',transport:'',count:'1'}], manifestDischarger: d.manifest_discharger || d.discharger || '', completionDate: d.completion_date || '',
          siteAreaM2: d.site_area_m2 != null ? String(d.site_area_m2) : '',
          siteTsubo:  d.site_tsubo  != null ? String(d.site_tsubo)  : '',
          siteUseType: d.site_use_type  || '',
          workCondition: d.work_condition || '',
          paymentDueDate: d.payment_due_date || '',
          paymentTerms: d.payment_terms || '',
          invoiceRecipient: d.invoice_recipient || '',
          subcontractAmount: d.subcontract_amount != null ? String(d.subcontract_amount) : '',
          subcontractor: d.subcontractor || '',
          subcontractTerms: d.subcontract_terms || '',
          subcontractInvoiceRecipient: d.subcontract_invoice_recipient || '',
          documentsChecklist: d.documents_checklist || {work:false,paperManifest:false,eManifest:false,treatmentContract:false,estimateContract:false,signboard:false,preInvoice:false,postInvoice:false,safetyDocs:false},
        };
        setProjectInfo(info);
        return info;
      }
    } catch (error) { console.error('loadProjectInfo error:', error); }
    return null;
  };

  const loadReports = async (siteName) => {
    try {
      const data = await sb('reports').select(`site_name=eq.${encodeURIComponent(siteName)}&order=date.asc`);
      if (Array.isArray(data)) setReports(data.map(r => ({ id: r.id, siteName: r.site_name, date: r.date, weather: r.weather, recorder: r.recorder, workDetails: r.work_details || {}, wasteItems: r.waste_items || [], scrapItems: r.scrap_items || [], createdAt: r.created_at, updatedBy: r.updated_by || '', updatedAt: r.updated_at || r.created_at || '' })));
      else setReports([]);
    } catch (error) { setReports([]); }
  };

  const handleSaveProject = async () => {
    if (!selectedSite) return alert('現場を選択してください');
    try {
      await sb('project_info').upsert({ site_name: selectedSite, project_number: projectInfo.projectNumber || '', work_type: projectInfo.workType || '', client: projectInfo.client || '', work_location: projectInfo.workLocation || '', sales_person: projectInfo.salesPerson || '', site_manager: projectInfo.siteManager || '', start_date: projectInfo.startDate || '', end_date: projectInfo.endDate || '', contract_amount: parseFloat(projectInfo.contractAmount) || 0, additional_amount: parseFloat(projectInfo.additionalAmount) || 0, status: projectInfo.status || '進行中', discharger: projectInfo.manifestDischarger || '', transport_company: (projectInfo.manifestRows||[]).map(r=>r.transport).filter(Boolean).join(','), contracted_disposal_sites: [...new Set((projectInfo.manifestRows||[]).map(r=>r.disposal).filter(Boolean))], transfer_cost: parseFloat(projectInfo.transferCost) || 0, lease_cost: parseFloat(projectInfo.leaseCost) || 0, materials_cost: parseFloat(projectInfo.materialsCost) || 0, expenses: projectInfo.expenses || [], outsourcing_items: projectInfo.outsourcingItems || [], sga_items: projectInfo.sgaItems || [], site_expense_items: projectInfo.siteExpenseItems || [], misc_items: (projectInfo.miscItems && projectInfo.miscItems.length > 0) ? projectInfo.miscItems : undefined, manifest_entries: projectInfo.manifestRows || [], manifest_discharger: projectInfo.manifestDischarger || '', site_area_m2: projectInfo.siteAreaM2 ? parseFloat(projectInfo.siteAreaM2) : null,
          payment_due_date: projectInfo.paymentDueDate || '',
          payment_terms: projectInfo.paymentTerms || '',
          invoice_recipient: projectInfo.invoiceRecipient || '',
          subcontract_amount: projectInfo.subcontractAmount ? parseFloat(projectInfo.subcontractAmount) : null,
          subcontractor: projectInfo.subcontractor || '',
          subcontract_terms: projectInfo.subcontractTerms || '',
          subcontract_invoice_recipient: projectInfo.subcontractInvoiceRecipient || '',
          documents_checklist: projectInfo.documentsChecklist || null,
        site_tsubo: projectInfo.siteTsubo ? parseFloat(projectInfo.siteTsubo) : null,
        site_use_type: projectInfo.siteUseType || null,
        work_condition: projectInfo.workCondition || null,
        updated_at: new Date().toISOString() }, 'site_name');
      await sb('sites').update({ project_number: projectInfo.projectNumber || '' }, `name=eq.${encodeURIComponent(selectedSite)}`);
      setSites(prev => prev.map(s => s.name === selectedSite ? { ...s, projectNumber: projectInfo.projectNumber || '' } : s));
      alert('✅ プロジェクト情報を保存しました');
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (error) { console.error(error); alert('❌ 保存に失敗しました: ' + (error?.message || JSON.stringify(error))); }
  };

  // ★ 保存後にロック解放
  const handleSaveReport = async (reportData) => {
    if (!selectedSite) return alert('現場を選択してください');
    try {
      const now = new Date().toISOString();
      const updatedBy = reportData.recorder || currentUser?.userId || '';
      // updated_by・updated_atカラムがない場合も保存できるよう try/catch で2段階対応
      try {
        await sb('reports').insert({ site_name: selectedSite, date: reportData.date, weather: reportData.weather || '', recorder: reportData.recorder || '', work_details: reportData.workDetails || {}, waste_items: reportData.wasteItems || [], scrap_items: reportData.scrapItems || [], updated_by: updatedBy, updated_at: now });
      } catch(e) {
        // カラムなしの場合はupdated_by・updated_atなしで再試行
        await sb('reports').insert({ site_name: selectedSite, date: reportData.date, weather: reportData.weather || '', recorder: reportData.recorder || '', work_details: reportData.workDetails || {}, waste_items: reportData.wasteItems || [], scrap_items: reportData.scrapItems || [] });
      }
      const userName = currentUser?.userId || 'unknown';
      await siteLocks.release(selectedSite, userName);
      setLockStatus(null);
      await loadReports(selectedSite);
      alert('✅ 日報を保存しました');
      window.scrollTo({ top: 0, behavior: 'instant' });
      setCurrentPage('home');
    } catch (error) { console.error(error); alert('❌ 保存に失敗しました: ' + error.message); }
  };

  const handleUpdateReport = async (reportId, reportData) => {
    try {
      const now = new Date().toISOString();
      const updatedBy = reportData.recorder || currentUser?.userId || '';
      const wd = {
        ...reportData.workDetails,
        outsourcingLabor: (reportData.workDetails?.outsourcingLabor || []).map(o => ({
          ...o,
          count: parseFloat(o.count || o.workers || 0),
        }))
      };
      try {
        await sb('reports').update({ date: reportData.date, weather: reportData.weather || '', recorder: reportData.recorder || '', work_details: wd, waste_items: reportData.wasteItems || [], scrap_items: reportData.scrapItems || [], updated_by: updatedBy, updated_at: now }, `id=eq.${reportId}`);
      } catch(e) {
        await sb('reports').update({ date: reportData.date, weather: reportData.weather || '', recorder: reportData.recorder || '', work_details: wd, waste_items: reportData.wasteItems || [], scrap_items: reportData.scrapItems || [] }, `id=eq.${reportId}`);
      }
      await loadReports(selectedSite);
      setEditingReport(null);
      alert('✅ 日報を更新しました');
      setCurrentPage('home');
    } catch (error) { console.error(error); alert('❌ 更新に失敗しました: ' + error.message); }
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm('この日報を削除しますか？')) return;
    try {
      await sb('reports').delete(`id=eq.${reportId}`);
      setReports(prev => prev.filter(r => r.id !== reportId));
      alert('✅ 日報を削除しました');
    } catch (error) { alert('❌ 削除に失敗しました'); }
  };

  const calculateTotals = () => {
    const totalRevenue = (parseFloat(projectInfo.contractAmount) || 0) + (parseFloat(projectInfo.additionalAmount) || 0);
    let accumulatedCost = 0, accumulatedScrap = 0;
    reports.forEach(report => {
      if (report.workDetails) {
        report.workDetails.inHouseWorkers?.forEach(w => accumulatedCost += w.amount || 0);
        report.workDetails.outsourcingLabor?.forEach(o => accumulatedCost += o.amount || 0);
        report.workDetails.vehicles?.forEach(v => accumulatedCost += v.amount || 0);
        report.workDetails.machinery?.forEach(m => accumulatedCost += m.unitPrice || 0);
        report.workDetails.envItems?.forEach(t => accumulatedCost += t.amount || 0);
        report.workDetails.extItems?.forEach(t => accumulatedCost += t.amount || 0);
        report.workDetails.dailyExpenses?.forEach(e => accumulatedCost += e.amount || 0);
      }
      report.wasteItems?.forEach(w => accumulatedCost += (w.amount || 0));
      report.wasteItems?.forEach(w => accumulatedCost += (w.haishiAmount || 0)); // 配車費は車両費扱い
      report.scrapItems?.forEach(s => accumulatedScrap += Math.abs(s.amount || 0));
    });
    accumulatedCost += (parseFloat(projectInfo.transferCost) || 0) + (parseFloat(projectInfo.leaseCost) || 0) + (parseFloat(projectInfo.materialsCost) || 0)
      + (projectInfo.miscItems || [...(projectInfo.outsourcingItems||[]),...(projectInfo.siteExpenseItems||[]),...(projectInfo.sgaItems||[])]).reduce((s,i) => s + (parseFloat(i.amount)||0), 0)
      + (projectInfo.expenses || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const grossProfit = totalRevenue - accumulatedCost;
    return { totalRevenue, accumulatedCost, accumulatedScrap, grossProfit, grossProfitRateContract: totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(1) : '0.0', grossProfitRateWithScrap: (totalRevenue + accumulatedScrap) > 0 ? (grossProfit / (totalRevenue + accumulatedScrap) * 100).toFixed(1) : '0.0' };
  };

  // ★ handleNavigate: 日報入力時にロック取得
  const handleNavigate = (page) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (page === 'settings') { setShowPasswordModal(true); setPassword(''); }
    else if (page === 'input') {
      (async () => {
        if (!selectedSite) return;
        const userName = currentUser?.userId || 'unknown';
        const result = await siteLocks.acquire(selectedSite, userName);
        if (!result.ok) {
          alert(`🔒 現在「${result.lockedBy}」が入力中です。\n入力が完了するまでお待ちください。`);
          return;
        }
        setLockStatus(userName);
        setEditingReport(null);
        setCurrentPage('input');
      })();
    } else { setCurrentPage(page); }
  };

  const handlePasswordSubmit = () => {
    if (password === 'face1991') { setShowPasswordModal(false); setPassword(''); setCurrentPage('settings'); }
    else { alert('❌ パスワードが正しくありません'); setPassword(''); }
  };

  const totals = calculateTotals();
  window.__navigatePDF = async (report) => {
    const siteName = report.siteName || report.site_name;
    let info = projectInfo;
    if (siteName) {
      const fetched = await loadProjectInfo(siteName);
      if (fetched) info = fetched;
    }
    setSelectedReport({ ...report, _projectInfo: info });
    setCurrentPage('pdf');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  window.__navigateEdit = (report) => { setEditingReport(report); setCurrentPage('edit'); window.scrollTo({ top: 0, behavior: 'instant' }); };
  window.__navigatePdf = async (report) => {
    let info = projectInfo;
    const fetched = await loadProjectInfo(selectedSite);
    if (fetched) info = fetched;
    setSelectedReport({ ...report, _projectInfo: info });
    setCurrentPage('pdf');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (showSplash) return <SplashScreen />;
  if (!isLoggedIn) return <LoginPage onLogin={handleLogin} />;

  // ★ マスコット常駐ロジック（ホーム・日報一覧・分析ページのみ表示）
  const MASCOT_PAGES = ['home', 'list', 'analysis'];
  const showMascot = MASCOT_PAGES.includes(currentPage);

  // ★ ロック解放関数（ReportInputPage に渡す）
  const releaseLock = async () => {
    const userName = currentUser?.userId || 'unknown';
    await siteLocks.release(selectedSite, userName);
    setLockStatus(null);
  };

  return (
    <div className="min-h-screen bg-transparent flex" style={{ overflowX: (currentPage === 'pdf' || currentPage === 'order_pdf') ? 'auto' : 'hidden' }}>
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onLogout={handleLogout} />
      <div className="flex flex-col flex-1 bg-transparent">
        <Header
          showMenuButton onMenuClick={() => setSidebarOpen(true)}
          onExport={() => handleNavigate('export')}
          onReload={handleReload}
          onSearch={() => setShowSearchModal(true)}
          reloading={reloading}
        />
        <main className="flex-1" style={{ paddingTop: 'calc(52px + env(safe-area-inset-top, 0px))', overflowX: (currentPage === 'pdf' || currentPage === 'order_pdf') ? 'auto' : 'hidden' }}>
          {/* ★ ボトム固定ナビ - Dock Style */}
          {selectedSite && ['home','list','analysis'].includes(currentPage) && (() => {
            const navDefs = [
              { id:'home',     label:'ホーム',     color:'#7eb8d4', bg:'rgba(60,120,160,0.15)',  bd:'rgba(126,184,212,0.22)'  },
              { id:'list',     label:'日報',  color:'#6dbb8a', bg:'rgba(50,110,75,0.15)',   bd:'rgba(109,187,138,0.22)'  },
              { id:'analysis', label:'分析', color:'#c9973e', bg:'rgba(140,100,30,0.15)',   bd:'rgba(201,151,62,0.22)'  },
              { id:'settings', label:'設定', color:'#a07cc5', bg:'rgba(110,75,155,0.15)',  bd:'rgba(160,124,197,0.22)' },
            ];
            const allIds = ['home','list','input','analysis','settings'];
            const activeIdx = allIds.indexOf(currentPage);
            const dockIcon = (id, stroke) => {
              const s = {width:20,height:20};
              if(id==='home') return <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
              if(id==='list') return <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
              if(id==='analysis') return <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>;
              if(id==='settings') return <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
              return null;
            };
            const getTransform = (id, idx) => {
              const isActive = currentPage === id;
              const isHover = navHoverId === id;
              const diff = Math.abs(activeIdx - idx);
              const hoverDiff = navHoverId ? Math.abs(allIds.indexOf(navHoverId) - idx) : 99;
              if(isActive) return {ty:-13, sc:1.12};
              if(isHover) return {ty:-13, sc:1.12};
              if(hoverDiff===1) return {ty:-6, sc:1.05};
              if(hoverDiff===2) return {ty:-2, sc:1.02};
              if(diff===1) return {ty:-6, sc:1.05};
              if(diff===2) return {ty:-2, sc:1.02};
              return {ty:0, sc:1};
            };
            const renderDockBtn = (item, idx) => {
              const isActive = currentPage === item.id;
              const isHover = navHoverId === item.id;
              const {ty, sc} = getTransform(item.id, idx);
              const showColor = isActive || isHover;
              return (
                <button key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  onMouseEnter={() => setNavHoverId(item.id)}
                  onMouseLeave={() => setNavHoverId(null)}
                  onTouchStart={() => setNavHoverId(item.id)}
                  onTouchEnd={() => { setTimeout(()=>setNavHoverId(null), 300); }}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',cursor:'pointer',background:'none',border:'none',fontFamily:'inherit',outline:'none',WebkitTapHighlightColor:'transparent',position:'relative',height:60,flex:1}}>
                  <div style={{width:42,height:42,borderRadius:13,display:'flex',alignItems:'center',justifyContent:'center',position:'absolute',bottom:14,background:showColor?item.bg:'rgba(255,255,255,0.03)',border:`1px solid ${showColor?item.bd:'rgba(255,255,255,0.05)'}`,boxShadow:showColor?'0 6px 20px rgba(0,0,0,0.5)':'none',transform:`translateY(${ty}px) scale(${sc})`,transition:'transform .3s cubic-bezier(0.34,1.4,0.64,1),background .2s,border-color .2s,box-shadow .2s'}}>
                    {dockIcon(item.id, showColor?item.color:'rgba(255,255,255,0.22)')}
                  </div>
                  <span style={{position:'absolute',bottom:1,fontSize:8,fontWeight:700,letterSpacing:'.05em',color:showColor?item.color:'rgba(255,255,255,0.45)',whiteSpace:'nowrap',fontFamily:'monospace',transition:'color .2s'}}>{item.label}</span>
                  {isActive && <div style={{position:'absolute',bottom:-1,left:'50%',transform:'translateX(-50%)',width:3,height:3,borderRadius:'50%',background:item.color}}/>}
                </button>
              );
            };
            const isFabActive = currentPage === 'input';
            const isFabHover = navHoverId === 'input';
            const fabDiff = Math.abs(activeIdx - 2);
            const fabHoverDiff = navHoverId ? Math.abs(allIds.indexOf(navHoverId) - 2) : 99;
            const fabTy = (isFabActive||isFabHover) ? -15 : (fabHoverDiff===1||fabDiff===1) ? -6 : 0;
            const fabSc = (isFabActive||isFabHover) ? 1.16 : (fabHoverDiff===1||fabDiff===1) ? 1.05 : 1;
            return (
              <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'672px',padding:`0 16px calc(20px + env(safe-area-inset-bottom,0px))`,display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:30,pointerEvents:'none'}}>
                <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',width:'100%',background:'#1E293B',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:'10px 8px',pointerEvents:'all',boxShadow:'0 8px 32px rgba(30,41,59,0.5)'}}>
                  {renderDockBtn(navDefs[0], 0)}
                  {renderDockBtn(navDefs[1], 1)}
                  <button onClick={() => handleNavigate('input')} onMouseEnter={()=>setNavHoverId('input')} onMouseLeave={()=>setNavHoverId(null)} onTouchStart={()=>setNavHoverId('input')} onTouchEnd={()=>{setTimeout(()=>setNavHoverId(null),300);}} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',cursor:'pointer',background:'none',border:'none',fontFamily:'inherit',outline:'none',WebkitTapHighlightColor:'transparent',position:'relative',height:60,flex:1}}>
                    <div style={{width:48,height:48,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',position:'absolute',bottom:11,background:isFabActive?'white':'rgba(225,225,225,0.88)',border:'none',boxShadow:isFabActive?'0 1px 0 rgba(255,255,255,0.8) inset,0 10px 28px rgba(0,0,0,0.65)':'0 1px 0 rgba(255,255,255,0.5) inset,0 6px 20px rgba(0,0,0,0.55)',transform:`translateY(${fabTy}px) scale(${fabSc})`,transition:'transform .35s cubic-bezier(0.34,1.4,0.64,1),background .25s,box-shadow .25s'}}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={isFabActive?'#000':'#222'} strokeWidth="2.3" strokeLinecap="round" style={{width:22,height:22,transition:'transform .35s cubic-bezier(0.34,1.4,0.64,1)',transform:isFabActive?'rotate(45deg)':'none'}}>
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                    </div>
                    <span style={{position:'absolute',bottom:1,fontSize:8,fontWeight:700,letterSpacing:'.05em',color:isFabActive?'var(--text2)':'var(--text3)',whiteSpace:'nowrap',fontFamily:'monospace',transition:'color .25s'}}>INPUT</span>
                    {isFabActive && <div style={{position:'absolute',bottom:-1,left:'50%',transform:'translateX(-50%)',width:3,height:3,borderRadius:'50%',background:'rgba(255,255,255,0.5)'}}/>}
                  </button>
                  {renderDockBtn(navDefs[2], 3)}
                  {renderDockBtn(navDefs[3], 4)}
                </div>
              </div>
            );
          })()}
          {currentPage === 'home' && (
            <HomePage
              sites={sites} selectedSite={selectedSite} onSelectSite={handleSelectSite}
              onNavigate={handleNavigate} totals={totals} projectInfo={projectInfo} reports={reports}
              lockStatus={lockStatus}
              currentUserId={currentUser?.userId}
              sitesReady={sitesReady}
              currentPage={currentPage}
              onViewPdf={(report)=>{ window.__navigatePdf && window.__navigatePdf(report); }}
            />
          )}
          {currentPage === 'settings' && <ProjectSettingsPage sites={sites} selectedSite={selectedSite} projectInfo={projectInfo} setProjectInfo={setProjectInfo} onSave={handleSaveProject} onAddSite={handleAddSite} onDeleteSite={handleDeleteSite} onRenameSite={handleRenameSite} onNavigate={handleNavigate} onSelectSite={handleSelectSite} />}
          {currentPage === 'input' && (
            <ReportInputPage
              key={editingReport ? editingReport.id : 'new'}
              onSave={handleSaveReport}
              onNavigate={handleNavigate}
              projectInfo={projectInfo}
              onReleaseLock={releaseLock}
              editReport={editingReport}
              onUpdate={handleUpdateReport}
            />
          )}
          {currentPage === 'list' && <ReportListPage reports={reports} onDelete={handleDeleteReport} onNavigate={handleNavigate} onEdit={(report) => { setEditingReport(report); setCurrentPage('input'); }} />}
          {currentPage === 'analysis' && <AnalysisPage reports={reports} totals={totals} projectInfo={projectInfo} onNavigate={handleNavigate} />}
          {currentPage === 'project' && <ProjectPage projectInfo={projectInfo} selectedSite={selectedSite} onNavigate={handleNavigate} />}
          {currentPage === 'export' && <ExportPage sites={sites} reports={reports} projectInfo={projectInfo} selectedSite={selectedSite} onNavigate={handleNavigate} />}
          {currentPage === 'pdf' && selectedReport && <ReportPDFPage report={selectedReport} projectInfo={projectInfo} onNavigate={handleNavigate} />}
          {currentPage === 'order_pdf' && <OrderPDFPage projectInfo={projectInfo} onNavigate={handleNavigate} />}
        </main>
      </div>

      {/* パスワードモーダル */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-transparent/80 flex items-center justify-center z-50 px-4">
          <div className="bg-transparent p-6 max-w-md w-full rounded-lg border border-white/[0.08]">
            <h2 className="text-xl font-bold text-white mb-4">管理者認証</h2>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="パスワードを入力" className="w-full px-4 py-3 bg-transparent border border-white/[0.08] text-white text-base rounded-md focus:outline-none focus:border-blue-500 mb-4" autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handlePasswordSubmit} className="px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">認証</button>
              <button onClick={() => { setShowPasswordModal(false); setPassword(''); }} className="px-4 py-3 bg-transparent border border-white/[0.08] text-gray-300 font-medium rounded-lg hover:bg-gray-700">キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* 工期確認モーダル */}
      {showCalendarModal && (() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const start = projectInfo?.startDate ? new Date(projectInfo.startDate) : null;
        const end = projectInfo?.endDate ? new Date(projectInfo.endDate) : null;
        const totalDays = start && end ? Math.max(1, Math.ceil((end - start) / 86400000)) : 0;
        const elapsedDays = start ? Math.max(0, Math.ceil((today - start) / 86400000)) : 0;
        const remainDays = end ? Math.max(0, Math.ceil((end - today) / 86400000)) : null;
        const progressPercent = totalDays > 0 ? Math.min(100, (elapsedDays / totalDays) * 100) : 0;
        const barColor = progressPercent >= 90 ? '#f59e0b' : '#3b82f6';
        return (
          <div className="fixed inset-0 bg-transparent/80 flex items-end justify-center z-50" onClick={() => setShowCalendarModal(false)} style={{ backdropFilter:'blur(4px)' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:'var(--bg2)', border:'none', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'480px', padding:'24px 24px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
              <div style={{ width:'36px', height:'4px', background:'rgba(255,255,255,0.15)', borderRadius:'2px', margin:'0 auto 24px' }} />
              <p style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.65)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'16px' }}>工期 / Schedule</p>
              {selectedSite ? (
                <>
                  <p style={{ fontSize:'16px', fontWeight:700, color:'#fff', marginBottom:'20px' }}>{selectedSite}</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'20px' }}>
                    {[['開始日', projectInfo?.startDate], ['終了日', projectInfo?.endDate]].map(([label, val]) => (
                      <div key={label} style={{ background:'#2D2D2D', border:'none', borderRadius:'10px', padding:'14px' }}>
                        <p style={{ fontSize:'10px', color:'rgba(255,255,255,0.65)', marginBottom:'6px' }}>{label}</p>
                        <p style={{ fontSize:'15px', fontWeight:600, color:'#fff' }}>{val || '未設定'}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom:'16px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                      <span style={{ fontSize:'12px', color:'rgba(255,255,255,0.65)' }}>経過 {elapsedDays}日 / 全{totalDays}日</span>
                      <span style={{ fontSize:'12px', fontWeight:700, color: remainDays === 0 ? '#ef4444' : remainDays !== null && remainDays <= 7 ? '#f59e0b' : '#6B7280' }}>{remainDays !== null ? `残 ${remainDays}日` : '未設定'}</span>
                    </div>
                    <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:'99px', height:'6px', overflow:'hidden' }}>
                      <div style={{ width:`${progressPercent}%`, height:'100%', background:barColor, borderRadius:'99px', transition:'width 0.6s ease' }} />
                    </div>
                    <p style={{ fontSize:'24px', fontWeight:800, color:'#fff', marginTop:'12px' }}>{Math.round(progressPercent)}%</p>
                  </div>
                </>
              ) : (
                <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.65)', textAlign:'center', padding:'20px 0' }}>現場を選択してください</p>
              )}
              <button onClick={() => setShowCalendarModal(false)}
                style={{ width:'100%', padding:'14px', background:'#2D2D2D', border:'none', color:'rgba(255,255,255,0.65)', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer', marginTop:'8px' }}>
                閉じる
              </button>
            </div>
          </div>
        );
      })()}

      {/* 通知モーダル */}
      {showNotificationModal && (() => {
        const costRatio = totals.totalRevenue > 0 ? (totals.accumulatedCost / totals.totalRevenue) * 100 : 0;


        const alerts = [];
        if (costRatio >= 85) alerts.push({ level:'danger', icon:'🚨', title:'原価率が危険水準です', body:`現在 ${costRatio.toFixed(1)}% — 目安: 85%以下` });
        else if (costRatio >= 70) alerts.push({ level:'warn', icon:'⚠️', title:'原価率が注意水準です', body:`現在 ${costRatio.toFixed(1)}% — 目安: 70%以下` });
        const levelColor = { danger:'#ef4444', warn:'#f59e0b' };
        const levelBg = { danger:'rgba(239,68,68,0.08)', warn:'rgba(245,158,11,0.08)' };
        return (
          <div className="fixed inset-0 bg-transparent/80 flex items-end justify-center z-50" onClick={() => setShowNotificationModal(false)} style={{ backdropFilter:'blur(4px)' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:'var(--bg2)', border:'none', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'480px', padding:'24px 24px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
              <div style={{ width:'36px', height:'4px', background:'rgba(255,255,255,0.15)', borderRadius:'2px', margin:'0 auto 24px' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                <p style={{ fontSize:'11px', fontWeight:700, color:'rgba(255,255,255,0.65)', textTransform:'uppercase', letterSpacing:'0.1em' }}>通知 / Notifications</p>
                {alerts.length > 0 && <span style={{ fontSize:'11px', fontWeight:700, color:'#ef4444', background:'rgba(239,68,68,0.1)', padding:'2px 8px', borderRadius:'99px' }}>{alerts.length}件</span>}
              </div>
              {alerts.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0' }}>
                  <p style={{ fontSize:'28px', marginBottom:'12px' }}>✅</p>
                  <p style={{ fontSize:'14px', color:'rgba(255,255,255,0.65)' }}>アラートはありません</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'16px' }}>
                  {alerts.map((a, i) => (
                    <div key={i} style={{ background: levelBg[a.level], border:`1px solid ${levelColor[a.level]}33`, borderRadius:'12px', padding:'14px 16px', display:'flex', gap:'12px', alignItems:'flex-start' }}>
                      <span style={{ fontSize:'20px', flexShrink:0 }}>{a.icon}</span>
                      <div>
                        <p style={{ fontSize:'13px', fontWeight:700, color: levelColor[a.level], marginBottom:'4px' }}>{a.title}</p>
                        <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.45)' }}>{a.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setShowNotificationModal(false)}
                style={{ width:'100%', padding:'14px', background:'#2D2D2D', border:'none', color:'rgba(255,255,255,0.65)', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                閉じる
              </button>
            </div>
          </div>
        );
      })()}

      {/* 現場検索モーダル */}
      {showSearchModal && (
        <div className="fixed inset-0 flex items-end justify-center z-50" onClick={() => { setShowSearchModal(false); setSearchQuery(''); }} style={{ backdropFilter:'blur(4px)', background:'rgba(0,0,0,0.3)' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'480px', padding:'24px 20px calc(24px + env(safe-area-inset-bottom, 0px))', boxShadow:'0 -8px 32px rgba(0,0,0,0.12)' }}>
            <div style={{ width:'36px', height:'4px', background:'#E8E8E8', borderRadius:'2px', margin:'0 auto 20px' }} />
            <p style={{ fontSize:'11px', fontWeight:700, color:'#999', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>現場を検索 / Search</p>
            <div style={{ position:'relative', marginBottom:'16px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.2" strokeLinecap="round" style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="現場名を入力..."
                style={{ width:'100%', padding:'12px 14px 12px 36px', background:'#F4F4F4', border:'none', borderRadius:'12px', fontSize:'16px', outline:'none', color:'#1C1917', boxSizing:'border-box' }}
              />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px', maxHeight:'240px', overflowY:'auto' }}>
              {sites.filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(site => (
                <button key={site.name} onClick={() => { handleSelectSite(site.name); setShowSearchModal(false); setSearchQuery(''); window.scrollTo({top:0,behavior:'instant'}); }}
                  style={{ width:'100%', padding:'12px 14px', background: selectedSite === site.name ? '#1A1A1A' : '#F4F4F4', border:'none', borderRadius:'10px', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <p style={{ fontSize:'14px', fontWeight:600, color: selectedSite === site.name ? '#fff' : '#1C1917' }}>{site.name}</p>
                    {site.projectNumber && <p style={{ fontSize:'10px', color: selectedSite === site.name ? 'rgba(255,255,255,0.5)' : '#999', marginTop:'2px' }}>{site.projectNumber}</p>}
                  </div>
                  {selectedSite === site.name && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </button>
              ))}
              {sites.filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <p style={{ textAlign:'center', padding:'20px', color:'#999', fontSize:'13px' }}>「{searchQuery}」に一致する現場がありません</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
