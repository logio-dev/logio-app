import React, { useState, useEffect, useRef, Fragment } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Save, Trash2, BarChart3, FileText, Settings, Menu, X, Home, Check, LogOut, Calendar, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

console.log('✅ LOGIO Phase5: Module loaded successfully');

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
      return res.json();
    },
    async insert(data) {
      const res = await fetch(base, { method: 'POST', headers: h, body: JSON.stringify(data) });
      return res.json();
    },
    async upsert(data, onConflict) {
      const h2 = Object.assign({}, h, { 'Prefer': 'resolution=merge-duplicates,return=representation' });
      const url = onConflict ? (base + '?on_conflict=' + onConflict) : base;
      const res = await fetch(url, { method: 'POST', headers: h2, body: JSON.stringify(data) });
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
        .logio-char-0 { animation-delay: 0s; } .logio-char-1 { animation-delay: 0.25s; }
        .logio-char-2 { animation-delay: 0.5s; } .logio-char-3 { animation-delay: 0.75s; }
        .logio-char-4 { animation-delay: 1.0s; }
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
              <rect x="70" y="80" width="80" height="60" rx="30" fill="#ffffff" opacity="0.12"/>
              <circle cx="90" cy="70" r="35" fill="#ffffff" opacity="0.12"/>
              <ellipse cx="65" cy="60" rx="20" ry="30" fill="#ffffff" opacity="0.12"/>
              <ellipse cx="115" cy="60" rx="20" ry="30" fill="#ffffff" opacity="0.12"/>
              <path d="M 90,95 Q 85,110 75,125 Q 70,135 65,145 Q 60,155 55,165" stroke="#ffffff" strokeWidth="12" fill="none" opacity="0.12" strokeLinecap="round"/>
              <rect x="75" y="135" width="12" height="30" rx="6" fill="#ffffff" opacity="0.12"/>
              <rect x="95" y="135" width="12" height="30" rx="6" fill="#ffffff" opacity="0.12"/>
              <rect x="115" y="135" width="12" height="30" rx="6" fill="#ffffff" opacity="0.12"/>
              <rect x="135" y="135" width="12" height="30" rx="6" fill="#ffffff" opacity="0.12"/>
              <path d="M 150,110 Q 155,115 158,125" stroke="#ffffff" strokeWidth="5" fill="none" opacity="0.12" strokeLinecap="round"/>
            </g>
          </svg>
        </div>
        <span className={`text-white ${sizeStyles[size]} relative z-10`}
          style={{ fontFamily: 'Roboto Condensed, -apple-system, sans-serif', fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {['L','O','G','I','O'].map((c, i) => (
            <span key={i} className={`logio-char ${animated ? `logio-char-animated logio-char-${i}` : ''}`}>{c}</span>
          ))}
        </span>
      </div>
    </>
  );
}

// ========== マスタデータ ==========
const MASTER_DATA = {
  projectNames: ['内装解体', 'スケルトン解体', '建物解体', '外装解体', '外構解体', 'アスベスト除去', '設備解体', '躯体解体'],
  salesPersons: ['間野', '八ツ田', '木嶋', '西', '鈴木', '原', '二宮'],
  employees: ['五十嵐悠哉', '折田優作', '稲葉正輝', '井ケ田浩寿', '大野勝也', '石森達也', '一村琢磨', '間野昂平'],
  inHouseWorkers: ['五十嵐悠哉', '井ケ田浩寿', '稲葉正輝', '石森達也', '一村琢磨', '間野昂平', '折田優作', '大野勝也', '小峯朋宏', '松橋信行', '浅見勇弥', '石田竜二', '田南功紀', '尾崎奈帆', '古山慎祐', '増岡利幸', '森繁信'],
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
  heavyMachinery: ['PC78US', 'PC138US'],
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
  disposalSites: ['木村建材', '二光産業', 'ギプロ', 'ウムヴェルト', '日栄興産', '戸部組', 'リバー', 'ワイエムエコフューチャー', '東和アークス', 'ヤマゼン', '入間緑化', '石坂産業'],
  scrapTypes: ['鉄くず', '銅線', 'アルミ', 'ステンレス', '真鍮'],
  buyers: ['小林金属', '高橋金属', 'ナンセイスチール', '服部金属', 'サンビーム', '光田産業', '青木商店', '長沼商事'],
  statuses: ['進行中', '完了', '中断']
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

// ========== ★ Header（リロードアイコン追加）==========
function Header({ showMenuButton = false, onMenuClick, onCalendar, onExport, onNotification, onReload, reloading = false, notificationCount = 0 }) {
  return (
    <header className="bg-black" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      <style>{`@keyframes logio-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', height:'52px', paddingLeft:'16px', paddingRight:'16px' }}>
        {/* 左：ハンバーガー */}
        <div style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)' }}>
          {showMenuButton && (
            <button onClick={onMenuClick} style={{ color:'rgba(255,255,255,0.55)', background:'none', border:'none', cursor:'pointer', padding:'6px', display:'flex', alignItems:'center', justifyContent:'center' }}
              onMouseEnter={e => e.currentTarget.style.color='white'}
              onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.55)'}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 8H21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M6 16H18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
        {/* 中央：ロゴ */}
        <span style={{ fontSize:'18px', fontWeight:800, letterSpacing:'-0.02em', color:'white', fontFamily:'Inter, -apple-system, BlinkMacSystemFont, sans-serif', userSelect:'none' }}>LOGIO</span>
        {/* 右：アイコン4つ（リロード追加）*/}
        <div style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', display:'flex', gap:'2px', alignItems:'center' }}>
          {/* ★ リロード */}
          <button onClick={onReload} title="最新データに更新"
            style={{ color:'rgba(255,255,255,0.35)', background:'none', border:'none', cursor:'pointer', padding:'6px', display:'flex', alignItems:'center', justifyContent:'center' }}
            onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.8)'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.35)'}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: reloading ? 'logio-spin 0.6s linear infinite' : 'none' }}>
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
          {/* カレンダー */}
          <button onClick={onCalendar} title="工期確認" style={{ color:'rgba(255,255,255,0.35)', background:'none', border:'none', cursor:'pointer', padding:'6px', display:'flex' }}
            onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.8)'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.35)'}>
            <Calendar className="w-5 h-5" />
          </button>
          {/* ベル（通知） */}
          <button onClick={onNotification} title="通知" style={{ position:'relative', color: notificationCount > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)', background:'none', border:'none', cursor:'pointer', padding:'6px', display:'flex' }}
            onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.8)'}
            onMouseLeave={e => e.currentTarget.style.color= notificationCount > 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {notificationCount > 0 && (
              <span style={{ position:'absolute', top:'4px', right:'4px', width:'8px', height:'8px', borderRadius:'50%', background:'#ef4444', border:'1.5px solid #000' }} />
            )}
          </button>
          {/* Export */}
          <button onClick={onExport} title="エクスポート" style={{ color:'rgba(255,255,255,0.35)', background:'none', border:'none', cursor:'pointer', padding:'6px', display:'flex' }}
            onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.8)'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.35)'}>
            <Activity className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function Select({ label, labelEn, options, value, onChange, placeholder = "選択してください", required = false }) {
  return (
    <div className="mb-6">
      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label} / {labelEn} {required && <span className="text-red-500">*</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 text-white text-base font-medium focus:outline-none rounded-lg"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
        required={required}>
        <option value="">{placeholder}</option>
        {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
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
      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label} / {labelEn}
      </label>
      <button type="button" onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 text-left focus:outline-none transition-colors relative rounded-lg"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {selectedOption ? (
          <div>
            <div className="text-white text-base font-medium">{selectedOption.title}</div>
            {selectedOption.subtitle && <div className="text-gray-500 text-xs mt-1">{selectedOption.subtitle}</div>}
          </div>
        ) : (
          <div className="text-gray-500 text-base">{placeholder}</div>
        )}
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg shadow-xl max-h-80 overflow-y-auto"
          style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)' }}>
          {options.map((option) => (
            <button key={option.value} type="button" onClick={() => { onChange(option.value); setIsOpen(false); }}
              className="w-full px-4 py-3 text-left transition-colors relative"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <div className="pr-8">
                <div className="text-white text-base font-medium">{option.title}</div>
                {option.subtitle && <div className="text-gray-500 text-xs mt-1">{option.subtitle}</div>}
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
      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label} / {labelEn} {required && <span className="text-red-500">*</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-3 text-white text-base font-medium focus:outline-none rounded-lg"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
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
    secondary: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' },
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
          <div className="fixed inset-0 bg-black bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-black border-r border-gray-900">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button onClick={() => setSidebarOpen(false)} className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none">
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 overflow-y-auto" style={{ paddingTop:'calc(env(safe-area-inset-top, 0px) + 20px)', paddingBottom:'16px' }}>
              <div className="flex items-center flex-shrink-0 px-4 mb-8">
                <LOGIOLogo size="sm" />
              </div>
              <nav className="px-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
                      className={`w-full group flex items-center px-3 py-3 text-sm font-medium transition-colors min-h-[48px] ${
                        currentPage === item.id ? 'text-white' : 'text-gray-500 hover:text-white'
                      }`}>
                      <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="border-t border-white/[0.06]" style={{ padding:'16px', paddingBottom:'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              <button onClick={onLogout} className="w-full px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors flex items-center gap-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
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
        @keyframes fadeInOut { 0%{opacity:0;} 50%{opacity:1;} 100%{opacity:0;} }
        .splash-container { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:black; animation:fadeInOut 3s ease-in-out forwards; }
      `}</style>
      <div className="splash-container"><LOGIOLogo size="md" animated={true} /></div>
    </>
  );
}

// ========== LoginPage ==========
function LoginPage({ onLogin }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    if ((userId === 'face1991' && password === 'face1991') || (userId === 'ryokuka2005' && password === 'ryokuka2005')) {
      onLogin({ type: 'company', userId }); return;
    }
    const validPartnerIds = ['TCY001', 'ALT001', 'YMD001', 'KWD001', 'MRK001', 'MM001'];
    if (validPartnerIds.includes(userId) && password === userId.toLowerCase()) {
      onLogin({ type: 'partner', userId }); return;
    }
    setError('IDまたはパスワードが正しくありません');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-[360px]">
          <div className="text-center mb-10">
            <LOGIOLogo size="md" />
            <p className="text-sm text-gray-500 mt-3" style={{ fontFamily: 'Inter, -apple-system, sans-serif' }}>現場管理をスマートに</p>
          </div>
          <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[['ID', 'text', userId, setUserId], ['パスワード', 'password', password, setPassword]].map(([lbl, tp, val, setter]) => (
              <div key={lbl} className="mb-5">
                <label className="block text-sm font-medium text-gray-400 mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>{lbl}</label>
                <input type={tp} value={val} onChange={(e) => setter(e.target.value)}
                  onKeyDown={tp === 'password' ? (e) => e.key === 'Enter' && handleLogin() : undefined}
                  placeholder={`${lbl}を入力`}
                  className="w-full px-4 py-3 bg-transparent text-white text-sm rounded-lg focus:outline-none transition-all"
                  style={{ border: '1px solid rgba(255,255,255,0.12)', fontFamily: 'Inter, sans-serif' }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.4)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
              </div>
            ))}
            {error && (
              <div className="mb-5 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', fontFamily: 'Inter, sans-serif' }}>
                {error}
              </div>
            )}
            <button onClick={handleLogin} className="w-full py-3 rounded-lg font-semibold text-sm transition-all hover:bg-white active:scale-[0.98]"
              style={{ background: '#EDEDED', color: '#000', fontFamily: 'Inter, sans-serif' }}>
              ログイン
            </button>
          </div>
        </div>
      </div>
      <div className="text-center py-6">
        <p className="text-xs text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>© 2026 LOGIO</p>
      </div>
    </div>
  );
}

// ========== HomePage ==========
function HomePage({ sites, selectedSite, onSelectSite, onNavigate, totals, projectInfo, reports, lockStatus, currentUserId }) {
  const [financeOpen, setFinanceOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [wasteOpen, setWasteOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(true);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setSiteDropdownOpen(false);
    };
    if (siteDropdownOpen) { document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }
  }, [siteDropdownOpen]);

  const costRatio = totals.totalRevenue > 0 ? (totals.accumulatedCost / totals.totalRevenue) * 100 : 0;
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
  const projectNumber = selectedSiteData?.projectNumber || projectInfo?.projectNumber || '';

  const card = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', transition: 'border-color 0.15s ease' };

  // ★ ナビの maxWidth をコンテンツ(max-w-2xl=672px)と統一
  const NAV_MAX_W = '672px';

  return (
    <div className="bg-black text-white" style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        input, select, textarea { font-size: 16px !important; }
        .finance-detail { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease; }
        .finance-detail.open { grid-template-rows: 1fr; }
        .finance-detail > div { overflow: hidden; }
        .logio-progress-track { background: rgba(255,255,255,0.04); border-radius: 999px; overflow: hidden; }
        .logio-progress-bar { border-radius: 999px; transition: width 0.8s ease; }
        .logio-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #22C55E; animation: logiopulse 2s ease infinite; flex-shrink: 0; }
        @keyframes logiopulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        .logio-nav-btn { position:relative; overflow:hidden; transition:all 0.15s ease; }
        .logio-nav-btn:active { transform:scale(0.98); }
        .logio-lbl { font-size: 11px; font-weight: 500; color: #6B7280; letter-spacing: 0.04em; }
        .logio-val-lg { font-size: 24px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
        .logio-val-md { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
      `}</style>

      {/* ★ コンテンツ: max-w-2xl(672px) + px-4(16px) */}
      <div className="max-w-2xl mx-auto px-4 py-5 w-full" style={{ flex:1, paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }}>

        {/* 現場セレクター */}
        <div className="relative mb-5" ref={dropdownRef}>
          <button onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left"
            style={{ background: 'linear-gradient(#0a0a0a, #0a0a0a) padding-box, linear-gradient(135deg, #3b82f6, #22d3ee, #6366f1) border-box', border: '1.5px solid transparent', borderRadius: '14px' }}>
            {selectedSite ? (
              <div className="flex items-center gap-3">
                <div className="logio-status-dot" />
                <div>
                  <p className="text-white font-semibold" style={{ fontSize: '17px' }}>{selectedSite}</p>
                  {projectNumber && <p className="text-gray-500 mt-0.5 tracking-wider" style={{ fontSize: '11px' }}>PROJECT NO.: {projectNumber}</p>}
                </div>
              </div>
            ) : (
              <span className="text-gray-500" style={{ fontSize: '14px' }}>現場を選択してください</span>
            )}
            <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${siteDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {siteDropdownOpen && (
            <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl shadow-xl overflow-hidden"
              style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)' }}>
              {sites.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">現場が登録されていません</div>
              ) : sites.map(site => (
                <button key={site.name} onClick={() => { onSelectSite(site.name); setSiteDropdownOpen(false); }}
                  className="w-full px-4 py-3 text-left flex items-center justify-between transition-colors"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div>
                    <p className="text-white font-medium" style={{ fontSize: '14px' }}>{site.name}</p>
                    {site.projectNumber && <p className="text-gray-500 mt-0.5" style={{ fontSize: '11px' }}>{site.projectNumber}</p>}
                  </div>
                  {selectedSite === site.name && <Check className="w-4 h-4 text-blue-500" />}
                </button>
              ))}
            </div>
          )}
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
            {/* 粗利・粗利率（折りたたみ） */}
            <div className="overflow-hidden mb-4" style={card}>
              <button onClick={() => setFinanceOpen(!financeOpen)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/[0.01] transition-colors">
                <div className="flex items-baseline gap-8">
                  <div>
                    <p className="logio-lbl mb-1">粗利</p>
                    <p className="logio-val-lg" style={{ color: totals.grossProfit >= 0 ? 'white' : '#F87171' }}>¥{formatCurrency(totals.grossProfit)}</p>
                  </div>
                  <div>
                    <p className="logio-lbl mb-1">粗利率</p>
                    <div className="flex items-center gap-1.5">
                      <p className="logio-val-lg text-white">{totals.grossProfitRateContract}%</p>
                      <TrendingUp className="w-4 h-4" style={{ color: '#34D399' }} />
                    </div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${financeOpen ? 'rotate-180' : ''}`} />
              </button>
              <div className={`finance-detail ${financeOpen ? 'open' : ''}`}>
                <div>
                  <div className="px-5 py-3 grid grid-cols-3 gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div><p className="logio-lbl mb-1">売上</p><p className="logio-val-md text-white">¥{formatCurrency(totals.totalRevenue)}</p></div>
                    <div><p className="logio-lbl mb-1">原価</p><p className="logio-val-md" style={{ color: 'rgba(248,113,113,0.8)' }}>¥{formatCurrency(totals.accumulatedCost)}</p></div>
                    {totals.accumulatedScrap > 0 && <div><p className="logio-lbl mb-1">スクラップ</p><p className="logio-val-md text-white">¥{formatCurrency(totals.accumulatedScrap)}</p></div>}
                  </div>
                </div>
              </div>
            </div>

            {/* 原価率・工期 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="px-4 py-4" style={card}>
                <div className="flex items-center justify-between mb-2">
                  <p className="logio-lbl">原価率</p>
                  <span className="font-medium px-1.5 py-0.5 rounded" style={{ fontSize: '10px', background: costBarBg, color: costBarColor }}>{costStatus}</span>
                </div>
                <p className="text-white font-bold tabular-nums mb-2" style={{ fontSize: '20px' }}>{costRatioFixed}%</p>
                <div className="logio-progress-track h-1.5">
                  <div className="logio-progress-bar h-full" style={{ width: `${Math.min(costRatio,100)}%`, backgroundColor: costBarColor }} />
                </div>
              </div>
              <div className="px-4 py-4" style={card}>
                <div className="flex items-center justify-between mb-2">
                  <p className="logio-lbl">工期</p>
                  <span className="font-medium text-gray-400" style={{ fontSize: '10px' }}>{remainDays !== null ? `残${remainDays}日` : '未設定'}</span>
                </div>
                <p className="text-white font-bold tabular-nums mb-2" style={{ fontSize: '20px' }}>{Math.round(progressPercent)}%</p>
                <div className="logio-progress-track h-1.5">
                  <div className="logio-progress-bar h-full" style={{ width: `${progressPercent}%`, backgroundColor: progressPercent >= 90 ? '#F59E0B' : '#3B82F6' }} />
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
                <div className="overflow-hidden mb-4" style={card}>
                  <button onClick={()=>setWasteOpen(!wasteOpen)}
                    style={{ width:'100%', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'none', border:'none', cursor:'pointer' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px', flex:1, marginRight:'10px' }}>
                      <div>
                        <p className="logio-lbl" style={{ marginBottom:'3px' }}>産廃処分費 / WASTE DISPOSAL</p>
                        <div style={{ display:'flex', alignItems:'baseline', gap:'6px' }}>
                          <span style={{ fontSize:'20px', fontWeight:700, color:'white', fontVariantNumeric:'tabular-nums' }}>¥{formatCurrency(wasteTotal)}</span>
                          <span style={{ fontSize:'10px', color:'#4B5563' }}>{typeCount}種類</span>
                        </div>
                      </div>
                      <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink:0 }}>
                        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#0f172a" strokeWidth="8"/>
                        {donutSlices.map((s,i)=>(
                          <circle key={i} cx={CX} cy={CY} r={R} fill="none"
                            stroke={s.color} strokeWidth="8"
                            strokeDasharray={`${s.dash} ${CIRC-s.dash}`}
                            strokeDashoffset={-(s.offset-CIRC/4)}
                            transform={`rotate(-90 ${CX} ${CY})`}/>
                        ))}
                        <text x={CX} y={CY+3} textAnchor="middle" fontSize="8" fontWeight="700" fill="white">{typeCount}種</text>
                      </svg>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${wasteOpen?'rotate-180':''}`}/>
                  </button>
                  <div style={{ display: wasteOpen ? 'block' : 'none', borderTop:'1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ padding:'4px 14px 16px' }}>
                      <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                        {wasteEntries.map(([name,val],i)=>{
                          const color = WASTE_COLORS[i%WASTE_COLORS.length];
                          const pct = Math.round((val/maxWaste)*100);
                          return (
                            <div key={name}>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                                <span style={{ fontSize:'11px', color, fontWeight:'600' }}>{name}</span>
                                <span style={{ fontSize:'11px', color:'white', fontWeight:'700' }}>¥{formatCurrency(val)}</span>
                              </div>
                              <div style={{ height:'5px', background:'#0f172a', borderRadius:'3px' }}>
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
          </>
        )}

        {!selectedSite && sites.length === 0 && (
          <div className="flex flex-col items-center justify-center" style={{ minHeight: '20vh', marginTop: '16px' }}>
            <p style={{ fontSize: '13px', color: '#4B5563', marginBottom: '16px' }}>現場が登録されていません</p>
            <button onClick={() => onNavigate('settings')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 32px', background: '#1e2d4a', border: 'none', color: 'rgba(255,255,255,0.85)', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#263a5e'}
              onMouseLeave={e => e.currentTarget.style.background = '#1e2d4a'}>
              <span style={{ fontSize: '15px' }}>＋</span>現場を追加する
            </button>
          </div>
        )}
      </div>

      {/* ★ ボトム固定ナビ（maxWidth を NAV_MAX_W=672px でコンテンツと完全一致）*/}
      {selectedSite && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: NAV_MAX_W,           // ★ max-w-2xl と同じ 672px
          padding: `10px 16px calc(10px + env(safe-area-inset-bottom, 0px))`,  // ★ px-4 と同じ 16px
          background: '#0a0a0a',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px 12px 0 0',
          zIndex: 30,
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: '8px',
        }}>
          <button onClick={() => onNavigate('input')}
            className="logio-nav-btn flex flex-col items-center gap-1.5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
            <Plus className="w-5 h-5" />
            <span className="font-semibold" style={{ fontSize: '11px' }}>日報入力</span>
          </button>
          {[
            { id:'list',     icon:FileText,  label:'日報一覧' },
            { id:'analysis', icon:BarChart3, label:'原価分析' },
            { id:'settings', icon:Settings,  label:'設定' },
          ].map(({ id, icon:Icon, label }) => (
            <button key={id} onClick={() => onNavigate(id)}
              className="logio-nav-btn flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors text-gray-400 hover:text-white"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Icon className="w-5 h-5" />
              <span className="font-medium" style={{ fontSize: '11px' }}>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== ProjectSettingsPage ==========
function ProjectSettingsPage({ sites, selectedSite, projectInfo, setProjectInfo, onSave, onAddSite, onDeleteSite, onNavigate }) {
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [showSiteList, setShowSiteList] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ name: '', amount: '' });
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);

  const handleAddSite = () => {
    if (!newSiteName.trim()) return alert('現場名を入力してください');
    onAddSite(newSiteName);
    setNewSiteName(''); setShowAddSite(false);
  };

  const handleDeleteSite = (siteName) => {
    if (!confirm(`現場「${siteName}」を削除しますか？\n関連するプロジェクト情報と日報もすべて削除されます。`)) return;
    onDeleteSite(siteName);
  };

  const toggleDisposalSite = (site) => {
    const currentSites = projectInfo.contractedDisposalSites || [];
    setProjectInfo({
      ...projectInfo,
      contractedDisposalSites: currentSites.includes(site)
        ? currentSites.filter(s => s !== site)
        : [...currentSites, site]
    });
  };

  const addExpense = () => {
    if (!expenseForm.name || !expenseForm.amount) return;
    const expenses = projectInfo.expenses || [];
    setProjectInfo({ ...projectInfo, expenses: [...expenses, { name: expenseForm.name, amount: parseFloat(expenseForm.amount) }] });
    setExpenseForm({ name: '', amount: '' });
  };
  const removeExpense = (i) => {
    const expenses = (projectInfo.expenses || []).filter((_, idx) => idx !== i);
    setProjectInfo({ ...projectInfo, expenses });
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 bg-black min-h-screen text-white">
      <div className="mb-4">
        <button onClick={() => onNavigate('home')}
          className="px-4 py-2 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
          <X className="w-4 h-4" />閉じる
        </button>
      </div>
      <SectionHeader title="現場管理 / Site Management" />
      {!showAddSite ? (
        <button onClick={() => setShowAddSite(true)}
          className="w-full mb-4 px-4 py-3 text-white text-base font-bold transition-colors flex items-center justify-center gap-2 rounded-lg"
          style={{ background: 'rgba(59,130,246,0.8)' }}>
          <Plus className="w-5 h-5" />新規現場を追加
        </button>
      ) : (
        <div className="mb-4 p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">新規現場名</label>
          <input type="text" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)}
            placeholder="例: 渋谷〇〇ビル解体工事"
            className="w-full px-4 py-3 text-white text-base font-medium focus:outline-none mb-3 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleAddSite} className="px-4 py-3 text-white font-bold transition-colors rounded-lg" style={{ background: 'rgba(59,130,246,0.8)' }}>追加</button>
            <button onClick={() => { setShowAddSite(false); setNewSiteName(''); }}
              className="px-4 py-3 font-bold transition-colors rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>キャンセル</button>
          </div>
        </div>
      )}
      {sites.length > 0 && (
        <div className="mb-8">
          <button onClick={() => setShowSiteList(!showSiteList)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg mb-2 transition-colors"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">登録済み現場 ({sites.length})</p>
            <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showSiteList ? 'rotate-180' : ''}`} />
          </button>
          {showSiteList && (
            <div className="space-y-2">
              {sites.map((site, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-white text-base font-medium">{site.name}</span>
                  <button onClick={() => handleDeleteSite(site.name)}
                    className="px-3 py-1 text-sm font-bold transition-colors rounded-lg" style={{ background: 'rgba(239,68,68,0.2)', color: '#F87171' }}>削除</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {selectedSite && (
        <>
          <SectionHeader title={`プロジェクト情報編集 (${selectedSite})`} />
          <div className="mb-6">
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">工事番号 / PROJECT NO.</label>
            <div className="px-4 py-4 rounded-md" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-white text-base font-semibold tabular-nums">{projectInfo.projectNumber || '未設定'}</div>
              <p className="text-xs text-gray-600 mt-1">※ 自動採番（編集不可）</p>
            </div>
          </div>
          <Select label="工事種別" labelEn="Work Type" options={MASTER_DATA.projectNames} value={projectInfo.workType||''} onChange={(val) => setProjectInfo({...projectInfo, workType: val})} />
          <TextInput label="発注者" labelEn="Client" value={projectInfo.client} onChange={(val) => setProjectInfo({...projectInfo, client: val})} placeholder="○○建設株式会社" />
          <TextInput label="現場住所" labelEn="Site Location" value={projectInfo.workLocation} onChange={(val) => setProjectInfo({...projectInfo, workLocation: val})} placeholder="東京都渋谷区..." />
          <Select label="営業担当" labelEn="Sales" options={MASTER_DATA.salesPersons} value={projectInfo.salesPerson} onChange={(val) => setProjectInfo({...projectInfo, salesPerson: val})} />
          <Select label="現場責任者" labelEn="Site Manager" options={MASTER_DATA.employees} value={projectInfo.siteManager} onChange={(val) => setProjectInfo({...projectInfo, siteManager: val})} />
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">工期開始 / Start</label>
              <input type="date" value={projectInfo.startDate} onChange={(e) => setProjectInfo({...projectInfo, startDate: e.target.value})}
                className="w-full px-4 py-3 text-white text-base font-medium focus:outline-none rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">工期終了 / End</label>
              <input type="date" value={projectInfo.endDate} onChange={(e) => setProjectInfo({...projectInfo, endDate: e.target.value})}
                className="w-full px-4 py-3 text-white text-base font-medium focus:outline-none rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }} />
            </div>
          </div>
          <TextInput label="売上（税抜）" labelEn="Revenue" type="number" value={projectInfo.contractAmount} onChange={(val) => setProjectInfo({...projectInfo, contractAmount: val})} placeholder="5000000" />
          <TextInput label="追加金額（税抜）" labelEn="Additional Amount" type="number" value={projectInfo.additionalAmount} onChange={(val) => setProjectInfo({...projectInfo, additionalAmount: val})} placeholder="0" />
          <div className="mb-2 mt-6">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-white/[0.06]">固定費 / Fixed Costs</p>
          </div>
          <TextInput label="回送費" labelEn="Transfer Cost" type="number" value={projectInfo.transferCost || ''} onChange={(val) => setProjectInfo({...projectInfo, transferCost: val})} placeholder="0" />
          <TextInput label="リース費" labelEn="Lease Cost" type="number" value={projectInfo.leaseCost || ''} onChange={(val) => setProjectInfo({...projectInfo, leaseCost: val})} placeholder="0" />
          <TextInput label="資材費" labelEn="Materials Cost" type="number" value={projectInfo.materialsCost || ''} onChange={(val) => setProjectInfo({...projectInfo, materialsCost: val})} placeholder="0" />
          <div className="mb-2 mt-6">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-white/[0.06]">経費 / Expenses</p>
          </div>
          <div className="mb-4" style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup><col style={{width:'45%'}}/><col style={{width:'35%'}}/><col style={{width:'20%'}}/></colgroup>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {['項目名','金額',''].map((h,i) => (
                    <th key={i} style={{ padding: '7px 10px', fontSize: '9px', fontWeight: '600', color: '#4B5563', letterSpacing: '0.04em', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(projectInfo.expenses || []).map((exp, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.85)' }}>{exp.name}</td>
                    <td style={{ padding: '8px 10px', fontSize: '12px', color: '#FCD34D', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>¥{formatCurrency(exp.amount)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <button onClick={() => removeExpense(i)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.12)', color: '#F87171', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>✕</button>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'rgba(59,130,246,0.04)', borderTop: '1px solid rgba(59,130,246,0.2)' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="text" value={expenseForm.name} onChange={e => setExpenseForm({...expenseForm, name: e.target.value})}
                      placeholder="例: 交通費" className="w-full bg-black text-white border border-white/10 rounded px-2 py-2 outline-none focus:border-blue-500" style={{fontSize:'16px'}} />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                      placeholder="金額" className="w-full bg-black text-white border border-white/10 rounded px-2 py-2 outline-none focus:border-blue-500" style={{fontSize:'16px'}} />
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <button onClick={addExpense} disabled={!expenseForm.name || !expenseForm.amount}
                      style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: (!expenseForm.name || !expenseForm.amount) ? 'not-allowed' : 'pointer', background: (!expenseForm.name || !expenseForm.amount) ? 'rgba(255,255,255,0.04)' : '#2563EB', color: (!expenseForm.name || !expenseForm.amount) ? '#374151' : 'white', fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>+</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Select label="ステータス" labelEn="Status" options={MASTER_DATA.statuses} value={projectInfo.status} onChange={(val) => setProjectInfo({...projectInfo, status: val})} />
          <TextInput label="排出事業者" labelEn="Discharger" value={projectInfo.discharger || ''} onChange={(val) => setProjectInfo({...projectInfo, discharger: val})} placeholder="株式会社LOGIO" required />
          <TextInput label="運搬会社" labelEn="Transport Company" value={projectInfo.transportCompany || ''} onChange={(val) => setProjectInfo({...projectInfo, transportCompany: val})} placeholder="〇〇運送株式会社" />
          <div className="mb-6">
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-3">
              契約処分先 / Contracted Disposal Sites <span className="text-red-500">*</span>
            </label>
            <div className="rounded-lg p-4 border border-white/[0.08] space-y-2 max-h-80 overflow-y-auto" style={{ background: 'rgba(255,255,255,0.02)' }}>
              {MASTER_DATA.disposalSites.map((site) => {
                const isSelected = (projectInfo.contractedDisposalSites || []).includes(site);
                return (
                  <button key={site} type="button" onClick={() => toggleDisposalSite(site)}
                    className={`w-full px-4 py-3 text-left text-sm rounded-md transition-colors flex items-center gap-3 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-black text-gray-300 hover:bg-gray-700'
                    }`}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-white bg-white' : 'border-gray-500'}`}>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <span className="flex-1">{site}</span>
                  </button>
                );
              })}
            </div>
            {projectInfo.contractedDisposalSites?.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">選択済み: {projectInfo.contractedDisposalSites.length}件</p>
            )}
          </div>
          <Button onClick={onSave} icon={Save}>プロジェクト情報を保存</Button>
        </>
      )}
    </div>
  );
}

// ========== ReportInputPage ==========
const SubTotal = ({ label, value }) => value > 0 ? (
  <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 4px 14px', alignItems:'center' }}>
    <span style={{ fontSize:'10px', color:'#4B5563' }}>{label}小計</span>
    <span style={{ fontSize:'13px', fontWeight:'700', color:'#60A5FA', fontVariantNumeric:'tabular-nums' }}>¥{formatCurrency(value)}</span>
  </div>
) : <div style={{marginBottom:'14px'}} />;

function ReportInputPage({ onSave, onNavigate, projectInfo, onReleaseLock }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [report, setReport] = useState({ date: new Date().toISOString().split('T')[0], weather: '', recorder: '', customRecorder: '' });
  const [workDetails, setWorkDetails] = useState({ workCategory: '', workContent: '', inHouseWorkers: [], outsourcingLabor: [], vehicles: [], machinery: [], costItems: [] });
  // ★ 半日追加
  const unitPrices = { inHouseDaytime: 25000, inHouseNighttime: 35000, inHouseNightLoading: 25000, inHouseHalfDay: 12500, outsourcingDaytime: 25000, outsourcingNighttime: 30000 };
  const [wasteItems, setWasteItems] = useState([]);
  const [scrapItems, setScrapItems] = useState([]);
  // ★ dept追加
  const [wForm, setWForm] = useState({ name:'', start:'', end:'', shift:'daytime', dept:'k1' });
  const [oForm, setOForm] = useState({ company:'', count:'', shift:'daytime' });
  const [vForm, setVForm] = useState({ type:'', number:'' });
  const [mForm, setMForm] = useState({ type:'', price:'' });
  const [wasteForm, setWasteForm] = useState({ type:'', disposal:'', qty:'', unit:'㎥', price:'', manifest:'' });
  const [scrapForm, setScrapForm] = useState({ type:'', buyer:'', qty:'', unit:'kg', price:'' });
  // ★ 課タブ
  const [currentDept, setCurrentDept] = useState('k1');

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [currentStep]);

  // ★ キャンセル時にロック解放
  const handleCancel = async () => {
    if (confirm('入力内容を破棄してホーム画面に戻りますか？')) {
      if (onReleaseLock) await onReleaseLock();
      onNavigate('home');
    }
  };

  const isStep1Valid = () => report.date && report.recorder;
  const handleSave = async () => { onSave({ ...report, recorder: report.customRecorder || report.recorder, workDetails, wasteItems, scrapItems }); };

  // ★ シフト別単価（半日追加）
  const getShiftAmount = (shift) => {
    if (shift === 'nighttime') return unitPrices.inHouseNighttime;
    if (shift === 'nightLoading') return unitPrices.inHouseNightLoading;
    if (shift === 'halfDay') return unitPrices.inHouseHalfDay;
    return unitPrices.inHouseDaytime;
  };

  const addWorker = () => {
    if (!wForm.name||!wForm.start||!wForm.end) return;
    const amount = getShiftAmount(wForm.shift);
    setWorkDetails({...workDetails, inHouseWorkers:[...workDetails.inHouseWorkers,{...wForm,amount}]});
    setWForm({name:'',start:'',end:'',shift:'daytime',dept:currentDept});
  };
  const addOutsource = () => {
    if (!oForm.company||!oForm.count) return;
    const amount = parseInt(oForm.count)*(oForm.shift==='nighttime'?unitPrices.outsourcingNighttime:unitPrices.outsourcingDaytime);
    setWorkDetails({...workDetails, outsourcingLabor:[...workDetails.outsourcingLabor,{...oForm,amount}]});
    setOForm({company:'',count:'',shift:'daytime'});
  };
  const addVehicle = () => {
    if (!vForm.type||!vForm.number) return;
    setWorkDetails({...workDetails, vehicles:[...workDetails.vehicles,{...vForm,amount:VEHICLE_UNIT_PRICES[vForm.type]||0}]});
    setVForm({type:'',number:''});
  };
  const addMachinery = () => {
    if (!mForm.type||!mForm.price) return;
    setWorkDetails({...workDetails, machinery:[...workDetails.machinery,{type:mForm.type,unitPrice:parseFloat(mForm.price)}]});
    setMForm({type:'',price:''});
  };
  const addWaste = () => {
    if (!wasteForm.type||!wasteForm.disposal||!wasteForm.qty||!wasteForm.price||!wasteForm.manifest) return;
    const qty=parseFloat(wasteForm.qty), price=parseFloat(wasteForm.price);
    setWasteItems([...wasteItems,{material:wasteForm.type,disposalSite:wasteForm.disposal,quantity:qty,unit:wasteForm.unit,unitPrice:price,amount:qty*price,manifestNumber:wasteForm.manifest}]);
    setWasteForm({type:'',disposal:'',qty:'',unit:'㎥',price:'',manifest:''});
  };
  const addScrap = () => {
    if (!scrapForm.type||!scrapForm.buyer||!scrapForm.qty||!scrapForm.price) return;
    const qty=parseFloat(scrapForm.qty), price=parseFloat(scrapForm.price);
    setScrapItems([...scrapItems,{type:scrapForm.type,buyer:scrapForm.buyer,quantity:qty,unit:scrapForm.unit,unitPrice:price,amount:-(qty*price)}]);
    setScrapForm({type:'',buyer:'',qty:'',unit:'kg',price:''});
  };

  const shiftLabel = s => s==='nighttime'?'夜間':s==='nightLoading'?'夜積':s==='halfDay'?'半日':'日勤';
  const shiftColor = s => s==='nighttime'?'#8B5CF6':s==='nightLoading'?'#6366F1':s==='halfDay'?'#F59E0B':'#3B82F6';

  const StepDots = () => (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', padding:'14px 0 10px' }}>
      {[1,2,3].map(i => (
        <div key={i} style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: i < currentStep ? '#22c55e' : i === currentStep ? '#3b82f6' : '#1f2937',
          transition: 'all 0.3s ease', flexShrink: 0,
        }} />
      ))}
    </div>
  );

  const mkCard = (color) => ({
    background: `linear-gradient(#050505,#050505) padding-box, linear-gradient(135deg,${color}) border-box`,
    border: '1.5px solid transparent', borderRadius: '12px', padding: '14px', marginBottom: '20px'
  });
  const inputCard      = mkCard('#3b82f6,#6366f1');
  const inputCardCyan  = mkCard('#22d3ee,#3b82f6');
  const inputCardAmber = mkCard('#f59e0b,#f97316');
  const inputCardGreen = mkCard('#34d399,#22d3ee');
  const inputCardRose  = mkCard('#f43f5e,#f59e0b');
  const inpSel = { width:'100%', padding:'12px 10px', background:'#000', border:'1px solid #1f2937', color:'white', fontSize:'16px', borderRadius:'9px', outline:'none', WebkitAppearance:'none', fontFamily:'inherit' };
  const inpTxt = { width:'100%', padding:'12px 10px', background:'#000', border:'1px solid #1f2937', color:'white', fontSize:'16px', borderRadius:'9px', outline:'none', fontFamily:'inherit', boxSizing:'border-box' };
  const inpLbl = { display:'block', fontSize:'10px', fontWeight:'700', color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' };
  const grid2 = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px' };
  const grid3 = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'10px' };

  // ★ ItemCard: アバターは常に1文字
  const ItemCard = ({ avatarBg, avatarColor, avatarText, name, meta, amount, amountColor, onDel }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'12px', marginBottom:'8px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
        <div style={{ width:'34px', height:'34px', borderRadius:'9px', background:avatarBg, color:avatarColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'700', flexShrink:0, fontFamily:'sans-serif' }}>{avatarText}</div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:'13px', fontWeight:'600', color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
          <div style={{ fontSize:'11px', color:'#4B5563', marginTop:'2px' }} dangerouslySetInnerHTML={{__html: meta}} />
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
        <span style={{ fontSize:'13px', fontWeight:'700', color: amountColor||'#60a5fa', whiteSpace:'nowrap' }}>{amount}</span>
        <button onClick={onDel} style={{ width:'24px', height:'24px', borderRadius:'50%', background:'rgba(239,68,68,0.1)', border:'none', color:'#ef4444', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
      </div>
    </div>
  );

  // ★ シフトボタン: 4択（半日追加）
  const ShiftBtns4 = ({ value, onChange }) => (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'5px' }}>
      {[
        ['daytime',     '日勤',   '#3b82f6'],
        ['nighttime',   '夜間',   '#8b5cf6'],
        ['nightLoading','夜積',   '#6366f1'],
        ['halfDay',     '半日 ×½','#f59e0b'],
      ].map(([v,label,color])=>(
        <button key={v} onClick={()=>onChange(v)} style={{
          padding:'10px 2px', borderRadius:'9px',
          border:`1px solid ${value===v?color:'#1f2937'}`,
          background: value===v?`${color}20`:'#0d0d0d',
          color: value===v?color:'#4B5563',
          fontSize:'11px', fontWeight:'600', cursor:'pointer', transition:'all 0.15s', lineHeight:1.3
        }}>{label}</button>
      ))}
    </div>
  );

  // ★ 課タブ（人数表記なし）
  const DeptTabs = ({ value, onChange }) => (
    <div style={{ display:'flex', gap:'4px', marginBottom:'10px', background:'#0a0a0a', borderRadius:'10px', padding:'4px', border:'1px solid #1f2937' }}>
      {[['k1','工事1課'],['ek','環境課']].map(([d,label])=>(
        <button key={d} onClick={()=>onChange(d)}
          style={{
            flex:1, padding:'8px 4px', borderRadius:'7px', border:'none',
            fontFamily:'inherit', fontSize:'12px', fontWeight:'700',
            cursor:'pointer', transition:'all .15s', textAlign:'center',
            background: value===d ? (d==='k1'?'rgba(59,130,246,0.12)':'rgba(34,197,94,0.1)') : 'transparent',
            color: value===d ? (d==='k1'?'#3b82f6':'#22c55e') : '#4B5563'
          }}>{label}</button>
      ))}
    </div>
  );

  const AddBtn = ({ onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled} style={{ width:'100%', padding:'13px', background: disabled?'rgba(255,255,255,0.02)':'rgba(59,130,246,0.08)', border:`1px solid ${disabled?'rgba(255,255,255,0.06)':'rgba(59,130,246,0.2)'}`, borderRadius:'10px', color: disabled?'#374151':'#60a5fa', fontSize:'13px', fontWeight:'600', cursor: disabled?'not-allowed':'pointer', marginTop:'8px' }}>＋ 追加する</button>
  );

  const SectionLabel = ({ ja, en }) => (
    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'10px' }}>
      <span style={{ fontSize:'10px', fontWeight:'700', color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.08em' }}>{ja} <span style={{color:'#374151'}}>/ {en}</span></span>
      <span style={{ flex:1, height:'1px', background:'#111' }} />
    </div>
  );

  const BFooter = ({ onBack, onNext, nextLabel, nextColor, disabled }) => (
    <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'42rem', padding:`12px 16px calc(12px + env(safe-area-inset-bottom,0px))`, background:'rgba(0,0,0,0.95)', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:'10px', zIndex:40 }}>
      {onBack && <button onClick={onBack} style={{ flex:1, padding:'15px', background:'#111', border:'1px solid #1f2937', color:'#6B7280', borderRadius:'12px', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>← 戻る</button>}
      <button onClick={onNext} disabled={disabled} style={{ flex:2, padding:'15px', background: disabled?'#1f2937': nextColor||'#2563eb', border:'none', color: disabled?'#4B5563':'white', borderRadius:'12px', fontSize:'15px', fontWeight:'700', cursor: disabled?'not-allowed':'pointer' }}>{nextLabel}</button>
    </div>
  );

  const workContent_tags = ['1F解体作業','2F解体作業','外壁解体','基礎解体','内装解体','鉄骨切断','産廃積込','整地作業'];

  return (
    <div style={{ background:'#000', minHeight:'100vh', overflowX:'hidden' }}>
      <style>{`@keyframes fadeUpIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} } .b-panel{animation:fadeUpIn 0.22s ease;}`}</style>

      {/* ヘッダー */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(0,0,0,0.92)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'12px 16px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
          <span style={{ fontSize:'17px', fontWeight:700 }}>日報入力</span>
          <button onClick={handleCancel} style={{ color:'#4b5563', background:'none', border:'none', cursor:'pointer', fontSize:'22px', lineHeight:1, padding:'4px' }}>×</button>
        </div>
        <StepDots />
      </div>

      {/* Step 1 */}
      {currentStep === 1 && (
        <div className="b-panel" style={{ padding:'20px 16px 100px' }}>
          <SectionLabel ja="基本情報" en="Basic Info" />
          <div style={inputCard}>
            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'11px', color:'#6B7280', marginBottom:'8px' }}>作業日 <span style={{color:'#f87171'}}>*</span></label>
              <input type="date" value={report.date} onChange={e=>setReport({...report,date:e.target.value})}
                style={{ ...inpTxt, fontSize:'16px', padding:'13px 14px', colorScheme:'dark' }} />
            </div>
            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'11px', color:'#6B7280', marginBottom:'8px' }}>天候 <span style={{color:'#f87171'}}>*</span></label>
              <select value={report.weather} onChange={e=>setReport({...report,weather:e.target.value})} style={{ ...inpSel, padding:'13px 14px', fontSize:'16px' }}>
                <option value="">選択してください</option>
                {MASTER_DATA.weather.map(w=><option key={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:'11px', color:'#6B7280', marginBottom:'8px' }}>記入者 <span style={{color:'#f87171'}}>*</span></label>
              <select value={report.recorder} onChange={e=>setReport({...report,recorder:e.target.value,customRecorder:''})} style={{ ...inpSel, padding:'13px 14px', fontSize:'16px' }}>
                <option value="">選択してください</option>
                {MASTER_DATA.employees.map(n=><option key={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <BFooter onNext={()=>setCurrentStep(2)} nextLabel="次へ →" disabled={!isStep1Valid()} />
        </div>
      )}

      {/* Step 2 */}
      {currentStep === 2 && (
        <div className="b-panel" style={{ padding:'20px 16px 100px' }}>

          {/* 施工情報 */}
          <SectionLabel ja="施工情報" en="Work Info" />
          <div style={inputCard}>
            <div style={{ marginBottom:'10px' }}>
              <label style={inpLbl}>区分</label>
              <select value={workDetails.workCategory} onChange={e=>setWorkDetails({...workDetails,workCategory:e.target.value})} style={inpSel}>
                <option value="">選択</option>
                {MASTER_DATA.workCategories.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={inpLbl}>施工内容</label>
              <input type="text" placeholder="例）1F解体作業" value={workDetails.workContent} onChange={e=>setWorkDetails({...workDetails,workContent:e.target.value})} style={inpTxt} />
              <p style={{ fontSize:'9px', color:'#374151', margin:'7px 0 5px' }}>⏱ 候補から選択</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {workContent_tags.filter(t=>!workDetails.workContent||t.includes(workDetails.workContent)).map(t=>(
                  <button key={t} onClick={()=>setWorkDetails({...workDetails,workContent:t})}
                    style={{ fontSize:'11px', color: workDetails.workContent===t?'#60a5fa':'#6B7280', background: workDetails.workContent===t?'rgba(59,130,246,0.12)':'#0f172a', border:`1px solid ${workDetails.workContent===t?'#3b82f6':'#1f2937'}`, padding:'5px 10px', borderRadius:'20px', cursor:'pointer', whiteSpace:'nowrap' }}>{t}</button>
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
              <select value={wForm.name} onChange={e=>setWForm({...wForm,name:e.target.value})} style={inpSel}>
                <option value="">選択してください</option>
                {(MASTER_DATA.inHouseWorkersByDept[currentDept==='k1'?'工事1課':'環境課']||[]).map(n=><option key={n}>{n}</option>)}
              </select>
            </div>
            {/* ★ シフト4択 */}
            <div style={{ marginBottom:'10px' }}>
              <label style={inpLbl}>区分 / Shift</label>
              <ShiftBtns4 value={wForm.shift} onChange={v=>setWForm({...wForm,shift:v})} />
            </div>
            <div style={grid2}>
              <div><label style={inpLbl}>開始</label><select value={wForm.start} onChange={e=>setWForm({...wForm,start:e.target.value})} style={inpSel}><option value="">--:--</option>{MASTER_DATA.workingHoursOptions.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={inpLbl}>終了</label><select value={wForm.end} onChange={e=>setWForm({...wForm,end:e.target.value})} style={inpSel}><option value="">--:--</option>{MASTER_DATA.workingHoursOptions.map(t=><option key={t}>{t}</option>)}</select></div>
            </div>
            <div style={{ textAlign:'right', fontSize:'12px', color:'#60a5fa', fontWeight:'600', marginBottom:'8px' }}>
              適用単価: ¥{formatCurrency(getShiftAmount(wForm.shift))}
            </div>
            <AddBtn onClick={addWorker} disabled={!wForm.name||!wForm.start||!wForm.end} />
          </div>
          {workDetails.inHouseWorkers.length>0 && <SubTotal label="自社人工" value={workDetails.inHouseWorkers.reduce((s,w)=>s+w.amount,0)} />}

          {/* 外注人工 */}
          <SectionLabel ja="外注人工" en="Outsourcing" />
          {workDetails.outsourcingLabor.map((o,i)=>(
            <ItemCard key={i}
              avatarBg="rgba(34,211,238,0.12)" avatarColor="#22d3ee"
              avatarText={o.company.charAt(0)}
              name={o.company}
              meta={`${o.count}人　<span style="color:${shiftColor(o.shift)}">${shiftLabel(o.shift)}</span>`}
              amount={`¥${formatCurrency(o.amount)}`}
              onDel={()=>setWorkDetails({...workDetails,outsourcingLabor:workDetails.outsourcingLabor.filter((_,j)=>j!==i)})} />
          ))}
          <div style={inputCardCyan}>
            <div style={grid2}>
              <div><label style={inpLbl}>会社名</label><select value={oForm.company} onChange={e=>setOForm({...oForm,company:e.target.value})} style={inpSel}><option value="">選択</option>{MASTER_DATA.outsourcingCompanies.map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label style={inpLbl}>人数</label><input type="number" min="1" value={oForm.count} onChange={e=>setOForm({...oForm,count:e.target.value})} placeholder="0" style={inpTxt} /></div>
            </div>
            <div style={{ marginBottom:'10px' }}><label style={inpLbl}>区分</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                {[['daytime','日勤','#3b82f6'],['nighttime','夜間','#8b5cf6']].map(([v,label,color])=>(
                  <button key={v} onClick={()=>setOForm({...oForm,shift:v})} style={{ padding:'11px', borderRadius:'9px', border:`1px solid ${oForm.shift===v?color:'#1f2937'}`, background: oForm.shift===v?`${color}20`:'#0d0d0d', color: oForm.shift===v?color:'#4B5563', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>{label}</button>
                ))}
              </div>
            </div>
            {oForm.count && <div style={{ textAlign:'right', fontSize:'12px', color:'#60a5fa', fontWeight:'600', marginBottom:'8px' }}>¥{formatCurrency(parseInt(oForm.count||0)*(oForm.shift==='nighttime'?unitPrices.outsourcingNighttime:unitPrices.outsourcingDaytime))}</div>}
            <AddBtn onClick={addOutsource} disabled={!oForm.company||!oForm.count} />
          </div>
          {workDetails.outsourcingLabor.length>0 && <SubTotal label="外注人工" value={workDetails.outsourcingLabor.reduce((s,o)=>s+o.amount,0)} />}

          {/* 車両 */}
          <SectionLabel ja="車両" en="Vehicles" />
          {workDetails.vehicles.map((v,i)=>(
            <ItemCard key={i}
              avatarBg="rgba(245,158,11,0.12)" avatarColor="#fbbf24"
              avatarText={v.type.charAt(0)}
              name={v.type} meta={v.number}
              amount={`¥${formatCurrency(v.amount)}`}
              onDel={()=>setWorkDetails({...workDetails,vehicles:workDetails.vehicles.filter((_,j)=>j!==i)})} />
          ))}
          <div style={inputCardAmber}>
            <div style={grid2}>
              <div><label style={inpLbl}>車種</label><select value={vForm.type} onChange={e=>setVForm({type:e.target.value,number:''})} style={inpSel}><option value="">選択</option>{MASTER_DATA.vehicles.map(v=><option key={v}>{v}</option>)}</select></div>
              <div><label style={inpLbl}>車番</label><select value={vForm.number} onChange={e=>setVForm({...vForm,number:e.target.value})} style={inpSel}><option value="">選択</option>{(MASTER_DATA.vehicleNumbersByType[vForm.type]||[]).map(n=><option key={n}>{n}</option>)}</select></div>
            </div>
            {vForm.type && <div style={{ textAlign:'right', fontSize:'12px', color:'#60a5fa', fontWeight:'600', marginBottom:'8px' }}>¥{formatCurrency(VEHICLE_UNIT_PRICES[vForm.type]||0)}</div>}
            <AddBtn onClick={addVehicle} disabled={!vForm.type||!vForm.number} />
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
              <div><label style={inpLbl}>機種</label><select value={mForm.type} onChange={e=>setMForm({...mForm,type:e.target.value})} style={inpSel}><option value="">選択</option>{MASTER_DATA.heavyMachinery.map(m=><option key={m}>{m}</option>)}</select></div>
              <div><label style={inpLbl}>単価</label><input type="number" value={mForm.price} onChange={e=>setMForm({...mForm,price:e.target.value})} placeholder="0" style={inpTxt} /></div>
            </div>
            <AddBtn onClick={addMachinery} disabled={!mForm.type||!mForm.price} />
          </div>
          {workDetails.machinery.length>0 && <SubTotal label="重機" value={workDetails.machinery.reduce((s,m)=>s+m.unitPrice,0)} />}

          <BFooter onBack={()=>setCurrentStep(1)} onNext={()=>setCurrentStep(3)} nextLabel="次へ →" />
        </div>
      )}

      {/* Step 3 */}
      {currentStep === 3 && (
        <div className="b-panel" style={{ padding:'20px 16px 100px' }}>
          <p style={{ fontSize:'12px', color:'#4B5563', marginBottom:'20px' }}>※ない場合はそのまま保存できます</p>

          {/* 産廃 */}
          <SectionLabel ja="産廃処分費" en="Waste Disposal" />
          {wasteItems.map((w,i)=>(
            <ItemCard key={i}
              avatarBg="rgba(245,158,11,0.12)" avatarColor="#fbbf24"
              avatarText="廃"
              name={w.material} meta={`${w.quantity}${w.unit}　${w.disposalSite}　<span style="color:#4B5563">${w.manifestNumber}</span>`}
              amount={`¥${formatCurrency(w.amount)}`}
              onDel={()=>setWasteItems(wasteItems.filter((_,j)=>j!==i))} />
          ))}
          <div style={inputCardGreen}>
            <div style={grid2}>
              <div><label style={inpLbl}>種類</label><select value={wasteForm.type} onChange={e=>{const t=e.target.value;const prices=MASTER_DATA.disposalSiteUnitPrices[wasteForm.disposal]||{};const auto=t&&prices[t]?String(prices[t]):wasteForm.price;setWasteForm({...wasteForm,type:t,price:auto});}} style={inpSel}><option value="">選択</option>{MASTER_DATA.wasteTypes.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={inpLbl}>処分先</label><select value={wasteForm.disposal} onChange={e=>{const d=e.target.value;const prices=MASTER_DATA.disposalSiteUnitPrices[d]||{};const auto=wasteForm.type&&prices[wasteForm.type]?String(prices[wasteForm.type]):wasteForm.price;setWasteForm({...wasteForm,disposal:d,price:auto});}} style={inpSel}><option value="">選択</option>{(projectInfo?.contractedDisposalSites||[]).map(s=><option key={s}>{s}</option>)}</select></div>
            </div>
            <div style={grid3}>
              <div><label style={inpLbl}>数量</label><input type="number" step="0.1" value={wasteForm.qty} onChange={e=>setWasteForm({...wasteForm,qty:e.target.value})} placeholder="0" style={inpTxt} /></div>
              <div><label style={inpLbl}>単位</label><select value={wasteForm.unit} onChange={e=>setWasteForm({...wasteForm,unit:e.target.value})} style={inpSel}><option value="㎥">㎥</option><option value="kg">kg</option><option value="t">t</option></select></div>
              <div><label style={inpLbl}>単価</label><input type="number" value={wasteForm.price} onChange={e=>setWasteForm({...wasteForm,price:e.target.value})} placeholder="0" style={inpTxt} /></div>
            </div>
            <div style={{ marginBottom:'10px' }}><label style={inpLbl}>マニフェスト No.</label><input type="text" value={wasteForm.manifest} onChange={e=>setWasteForm({...wasteForm,manifest:e.target.value})} placeholder="例）A-12345" style={inpTxt} /></div>
            <AddBtn onClick={addWaste} disabled={!wasteForm.type||!wasteForm.disposal||!wasteForm.qty||!wasteForm.price||!wasteForm.manifest} />
          </div>
          {wasteItems.length>0 && <SubTotal label="産廃" value={wasteItems.reduce((s,w)=>s+w.amount,0)} />}

          {/* スクラップ */}
          <SectionLabel ja="スクラップ売上" en="Scrap Revenue" />
          {scrapItems.map((s,i)=>(
            <ItemCard key={i}
              avatarBg="rgba(34,197,94,0.12)" avatarColor="#4ade80"
              avatarText={s.type.charAt(0)}
              name={s.type} meta={`${s.quantity}${s.unit}　${s.buyer}`}
              amount={`¥${formatCurrency(Math.abs(s.amount))}`} amountColor="#4ade80"
              onDel={()=>setScrapItems(scrapItems.filter((_,j)=>j!==i))} />
          ))}
          <div style={inputCardRose}>
            <div style={grid2}>
              <div><label style={inpLbl}>種類</label><select value={scrapForm.type} onChange={e=>setScrapForm({...scrapForm,type:e.target.value})} style={inpSel}><option value="">選択</option>{MASTER_DATA.scrapTypes.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={inpLbl}>買取業者</label><select value={scrapForm.buyer} onChange={e=>setScrapForm({...scrapForm,buyer:e.target.value})} style={inpSel}><option value="">選択</option>{MASTER_DATA.buyers.map(b=><option key={b}>{b}</option>)}</select></div>
            </div>
            <div style={grid3}>
              <div><label style={inpLbl}>数量</label><input type="number" step="0.1" value={scrapForm.qty} onChange={e=>setScrapForm({...scrapForm,qty:e.target.value})} placeholder="0" style={inpTxt} /></div>
              <div><label style={inpLbl}>単位</label><select value={scrapForm.unit} onChange={e=>setScrapForm({...scrapForm,unit:e.target.value})} style={inpSel}><option value="kg">kg</option><option value="㎥">㎥</option><option value="t">t</option></select></div>
              <div><label style={inpLbl}>単価</label><input type="number" value={scrapForm.price} onChange={e=>setScrapForm({...scrapForm,price:e.target.value})} placeholder="0" style={inpTxt} /></div>
            </div>
            {scrapForm.qty && scrapForm.price && (
              <div style={{ textAlign:'right', fontSize:'12px', color:'#4ade80', fontWeight:'600', marginBottom:'8px' }}>
                ¥{formatCurrency(parseFloat(scrapForm.qty||0)*parseFloat(scrapForm.price||0))}
              </div>
            )}
            <AddBtn onClick={addScrap} disabled={!scrapForm.type||!scrapForm.buyer||!scrapForm.qty||!scrapForm.price} />
          </div>
          {scrapItems.length>0 && <SubTotal label="スクラップ" value={Math.abs(scrapItems.reduce((s,i)=>s+i.amount,0))} />}

          <BFooter onBack={()=>setCurrentStep(2)} onNext={handleSave} nextLabel="保存する ✓" nextColor="#16a34a" />
        </div>
      )}
    </div>
  );
}

// ========== ReportListPage ==========
function ReportListPage({ reports, onDelete, onNavigate }) {
  const [filterCategory, setFilterCategory] = useState('');
  const [openMonths, setOpenMonths] = useState({});
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

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
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-4">
        <button onClick={() => onNavigate('home')} className="px-4 py-2 bg-black hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-sm flex items-center gap-2">
          <X className="w-4 h-4" />閉じる
        </button>
      </div>
      <div className="mb-4">
        <Select label="作業区分" labelEn="Category" options={MASTER_DATA.workCategories} value={filterCategory} onChange={setFilterCategory} placeholder="全作業" />
      </div>
      <p className="text-xs text-gray-600 mb-4">全 {filteredReports.length}件</p>
      {months.map(month => {
        const monthReports = filteredReports.filter(r => r.date.startsWith(month)).sort((a,b) => new Date(b.date)-new Date(a.date));
        const isOpen = !!openMonths[month];
        const monthCost = monthReports.reduce((sum, r) => sum +
          (r.workDetails?.inHouseWorkers?.reduce((s,w)=>s+(w.amount||0),0)||0) +
          (r.workDetails?.outsourcingLabor?.reduce((s,o)=>s+(o.amount||0),0)||0) +
          (r.workDetails?.vehicles?.reduce((s,v)=>s+(v.amount||0),0)||0) +
          (r.workDetails?.machinery?.reduce((s,m)=>s+(m.unitPrice||0),0)||0) +
          (r.wasteItems?.reduce((s,w)=>s+(w.amount||0),0)||0), 0);
        return (
          <div key={month} className="mb-3">
            <button onClick={() => toggleMonth(month)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#0f172a', border:'1px solid rgba(255,255,255,0.08)', borderRadius: isOpen ? '10px 10px 0 0' : '10px', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <span style={{ fontSize:'14px', fontWeight:700, color:'white' }}>{fmtMonth(month)}</span>
                <span style={{ fontSize:'11px', color:'#6B7280', background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:'10px' }}>{monthReports.length}件</span>
                {monthCost > 0 && <span style={{ fontSize:'11px', color:'#fbbf24', fontWeight:600 }}>¥{formatCurrency(monthCost)}</span>}
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500"/> : <ChevronDown className="w-4 h-4 text-gray-500"/>}
            </button>
            {isOpen && (
              <div style={{ border:'1px solid rgba(255,255,255,0.08)', borderTop:'none', borderRadius:'0 0 10px 10px', overflow:'hidden' }}>
                {monthReports.map((report, idx) => (
                  <ReportAccordion key={report.id} report={report} onDelete={() => onDelete(report.id)} isLast={idx === monthReports.length - 1} />
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

function ReportAccordion({ report, onDelete, isLast }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ borderBottom: isLast && !isOpen ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/50 transition-colors">
        <div className="text-left flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-lg font-bold text-white">{report.date}</span>
            <span className="text-sm text-gray-400">({getDayOfWeek(report.date)})</span>
            <span className="text-sm text-blue-400">{report.weather}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs font-medium">{report.workDetails?.workCategory || report.workCategory}</span>
            {(() => {
              const totalCost =
                (report.workDetails?.inHouseWorkers?.reduce((s,w)=>s+(w.amount||0),0)||0) +
                (report.workDetails?.outsourcingLabor?.reduce((s,o)=>s+(o.amount||0),0)||0) +
                (report.workDetails?.vehicles?.reduce((s,v)=>s+(v.amount||0),0)||0) +
                (report.workDetails?.machinery?.reduce((s,m)=>s+(m.unitPrice||0),0)||0) +
                (report.wasteItems?.reduce((s,w)=>s+(w.amount||0),0)||0);
              return totalCost > 0 && <span className="text-yellow-400 font-semibold">¥{formatCurrency(totalCost)}</span>;
            })()}
          </div>
        </div>
        <span className="text-gray-400 ml-4">{isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
      </button>
      {isOpen && (
        <div className="px-4 py-4 bg-black/30 border-t border-white/[0.08]">
          <div className="mb-4 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2 mb-2"><span className="text-xs text-gray-500">記入者:</span><span className="text-sm text-white">{report.recorder}</span></div>
            <div className="flex items-start gap-2"><span className="text-xs text-gray-500 mt-0.5">施工内容:</span><span className="text-sm text-white">{report.workDetails?.workContent || report.workContent || 'なし'}</span></div>
          </div>
          {report.workDetails && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">原価明細</p>
              {report.workDetails.inHouseWorkers?.length > 0 && (
                <div className="mb-3 rounded p-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-xs font-semibold text-blue-400 mb-2">自社人工: {report.workDetails.inHouseWorkers.length}名</p>
                  {report.workDetails.inHouseWorkers.map((w, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">• {w.name} <span className="text-gray-500">{w.start||w.startTime}-{w.end||w.endTime}</span> <span className="text-yellow-400">¥{formatCurrency(w.amount)}</span></p>
                  ))}
                </div>
              )}
              {report.workDetails.outsourcingLabor?.length > 0 && (
                <div className="mb-3 rounded p-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-xs font-semibold text-blue-400 mb-2">外注人工: {report.workDetails.outsourcingLabor.length}件</p>
                  {report.workDetails.outsourcingLabor.map((o, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">• {o.company} <span className="text-gray-500">{o.count || o.workers}人</span> <span className="text-yellow-400">¥{formatCurrency(o.amount)}</span></p>
                  ))}
                </div>
              )}
              {report.workDetails.vehicles?.length > 0 && (
                <div className="mb-3 rounded p-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-xs font-semibold text-blue-400 mb-2">車両: {report.workDetails.vehicles.length}台</p>
                  {report.workDetails.vehicles.map((v, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">• {v.type} <span className="text-gray-500">({v.number})</span> <span className="text-yellow-400">¥{formatCurrency(v.amount)}</span></p>
                  ))}
                </div>
              )}
              {report.workDetails.machinery?.length > 0 && (
                <div className="mb-3 rounded p-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-xs font-semibold text-blue-400 mb-2">重機: {report.workDetails.machinery.length}台</p>
                  {report.workDetails.machinery.map((m, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">• {m.type} <span className="text-yellow-400">¥{formatCurrency(m.unitPrice)}</span></p>
                  ))}
                </div>
              )}
            </div>
          )}
          {report.wasteItems?.length > 0 && (
            <div className="mb-4 rounded p-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs font-semibold text-red-400 mb-2">廃棄物: {report.wasteItems.length}件 / ¥{formatCurrency(report.wasteItems.reduce((s,w)=>s+w.amount,0))}</p>
              {report.wasteItems.map((waste, idx) => (
                <div key={idx} className="text-sm text-gray-300 ml-3 mb-1">
                  <p>• {waste.material} <span className="text-gray-500">{waste.quantity}{waste.unit}</span> - {waste.disposalSite}</p>
                  {waste.manifestNumber && <p className="text-xs text-gray-500 ml-4">マニフェスト: {waste.manifestNumber}</p>}
                </div>
              ))}
            </div>
          )}
          {report.scrapItems?.length > 0 && (
            <div className="mb-4 rounded p-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs font-semibold text-green-400 mb-2">スクラップ: {report.scrapItems.length}件 / ¥{formatCurrency(Math.abs(report.scrapItems.reduce((s,sc)=>s+sc.amount,0)))}</p>
              {report.scrapItems.map((scrap, idx) => (
                <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">• {scrap.type} <span className="text-gray-500">{scrap.quantity}{scrap.unit}</span> - {scrap.buyer}</p>
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => { if (window.__navigatePDF) window.__navigatePDF(report); }}
              className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />PDF出力
            </button>
            <Button variant="danger" onClick={onDelete} icon={Trash2}>削除</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== ProjectPage ==========
function ProjectPage({ projectInfo, selectedSite, onNavigate }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-4">
        <button onClick={() => onNavigate('home')} className="px-4 py-2 bg-black hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-sm flex items-center gap-2">
          <X className="w-4 h-4" />閉じる
        </button>
      </div>
      {(selectedSite || projectInfo?.workType || projectInfo?.projectName) && (
        <div className="mb-6 px-4 py-4 border rounded-md" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="text-white text-lg font-bold leading-relaxed mb-2">{selectedSite || projectInfo?.workType || projectInfo?.projectName}</div>
          {projectInfo?.workType && selectedSite && <div className="text-gray-500 text-xs mb-1">{projectInfo.workType}</div>}
          {projectInfo?.projectNumber && <div className="text-gray-500 text-xs font-medium tracking-wide">PROJECT NO.: {projectInfo.projectNumber}</div>}
        </div>
      )}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-blue-400">基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['発注者 / CLIENT', projectInfo.client], ['現場住所 / LOCATION', projectInfo.workLocation], ['営業担当 / SALES', projectInfo.salesPerson], ['現場責任者 / MANAGER', projectInfo.siteManager]].map(([label, val]) => (
              <div key={label}><p className="text-xs text-gray-500 mb-1">{label}</p><p className="text-lg font-medium text-white">{val || '-'}</p></div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4 text-blue-400">期間</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['開始日 / START DATE', projectInfo.startDate], ['終了日 / END DATE', projectInfo.endDate]].map(([label, val]) => (
              <div key={label}><p className="text-xs text-gray-500 mb-1">{label}</p><p className="text-lg font-medium text-white">{val || '-'}</p></div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4 text-blue-400">金額</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['契約金額 / CONTRACT AMOUNT', projectInfo.contractAmount, 'text-white'],
              ['追加金額 / ADDITIONAL AMOUNT', projectInfo.additionalAmount, 'text-blue-400'],
              ...(projectInfo.transferCost ? [['回送費 / TRANSFER COST', projectInfo.transferCost, 'text-gray-300']] : []),
              ...(projectInfo.leaseCost ? [['リース費 / LEASE COST', projectInfo.leaseCost, 'text-gray-300']] : []),
              ...(projectInfo.materialsCost ? [['資材費 / MATERIALS COST', projectInfo.materialsCost, 'text-gray-300']] : []),
            ].map(([label, val, color]) => (
              <div key={label}><p className="text-xs text-gray-500 mb-1">{label}</p><p className={`text-2xl font-bold ${color}`}>¥{val ? formatCurrency(parseFloat(val)) : '0'}</p></div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4 text-blue-400">ステータス</h2>
          <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
            projectInfo.status === '進行中' ? 'bg-green-900/30 text-green-400' :
            projectInfo.status === '完了' ? 'bg-blue-900/30 text-blue-400' : 'bg-black text-gray-400'
          }`}>{projectInfo.status || '-'}</span>
        </div>
      </div>
      <div className="mt-6">
        <button onClick={() => onNavigate('settings')} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
          <Settings className="w-5 h-5" />編集する
        </button>
      </div>
    </div>
  );
}

// ========== AnalysisPage ==========
function AnalysisPage({ reports, totals, projectInfo, onNavigate }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const costByCategory = { '人工費': 0, '車両費': 0, '重機費': 0, '産廃費': 0 };
  reports.forEach(r => {
    if (r.workDetails) {
      r.workDetails.inHouseWorkers?.forEach(w => costByCategory['人工費'] += w.amount || 0);
      r.workDetails.outsourcingLabor?.forEach(o => costByCategory['人工費'] += o.amount || 0);
      r.workDetails.vehicles?.forEach(v => costByCategory['車両費'] += v.amount || 0);
      r.workDetails.machinery?.forEach(m => costByCategory['重機費'] += m.unitPrice || 0);
    }
    r.wasteItems?.forEach(w => costByCategory['産廃費'] += w.amount || 0);
  });
  if (projectInfo?.transferCost) costByCategory['回送費'] = parseFloat(projectInfo.transferCost) || 0;
  if (projectInfo?.leaseCost) costByCategory['リース費'] = parseFloat(projectInfo.leaseCost) || 0;
  if (projectInfo?.materialsCost) costByCategory['資材費'] = parseFloat(projectInfo.materialsCost) || 0;

  const pieData = Object.keys(costByCategory).map(key => ({ name: key, value: costByCategory[key] })).filter(d => d.value > 0);
  const COLORS = ['#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD', '#6366F1', '#8B5CF6', '#A78BFA'];

  const monthlyData = {};
  reports.forEach(r => {
    const month = r.date.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = 0;
    if (r.workDetails) {
      r.workDetails.inHouseWorkers?.forEach(w => monthlyData[month] += w.amount || 0);
      r.workDetails.outsourcingLabor?.forEach(o => monthlyData[month] += o.amount || 0);
      r.workDetails.vehicles?.forEach(v => monthlyData[month] += v.amount || 0);
      r.workDetails.machinery?.forEach(m => monthlyData[month] += m.unitPrice || 0);
    }
    r.wasteItems?.forEach(w => monthlyData[month] += w.amount || 0);
  });
  const barData = Object.keys(monthlyData).sort().map(month => ({ month: month.substring(5), cost: Math.round(monthlyData[month] / 10000) }));
  const costRatio = totals.totalRevenue > 0 ? ((totals.accumulatedCost / totals.totalRevenue) * 100).toFixed(1) : '0.0';
  const costRatioNum = parseFloat(costRatio);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 bg-black min-h-screen">
      <div className="mb-4">
        <button onClick={() => onNavigate('home')} className="px-4 py-2 bg-black hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-sm flex items-center gap-2">
          <X className="w-4 h-4" />閉じる
        </button>
      </div>
      {(projectInfo?.workType || projectInfo?.projectName) && (
        <div className="mb-6 px-4 py-4 border rounded-md" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="text-white text-lg font-bold leading-relaxed mb-2">{projectInfo.workType || projectInfo.projectName}</div>
          {projectInfo.projectNumber && <div className="text-gray-500 text-xs font-medium tracking-wide">PROJECT NO.: {projectInfo.projectNumber}</div>}
        </div>
      )}
      <div className="mb-6">
        <SectionHeader title="財務サマリー / Financial Summary" />
        <div className="rounded-md p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
          {[
            { label: '売上 / Revenue', value: totals.totalRevenue, color: 'text-white' },
            { label: '原価 / Cost', value: totals.accumulatedCost, color: 'text-red-400/80' },
            ...(totals.accumulatedScrap > 0 ? [{ label: 'スクラップ / Scrap', value: totals.accumulatedScrap, color: 'text-white' }] : []),
            { label: '粗利 / Profit', value: totals.grossProfit, color: totals.grossProfit >= 0 ? 'text-blue-400/90' : 'text-red-400/80', bold: true },
          ].map((row, i, arr) => (
            <div key={i} className={`flex justify-between items-center py-2 ${i < arr.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
              <span className="text-xs font-medium text-gray-400">{row.label}</span>
              <span className={`${row.bold ? 'text-lg' : ''} font-semibold ${row.color} tabular-nums`}>¥{formatCurrency(row.value)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center py-2">
            <span className="text-xs font-medium text-gray-400">粗利率 / Margin</span>
            <div className="text-right">
              <span className="text-lg font-semibold text-white tabular-nums">{totals.grossProfitRateContract}%</span>
              <span className="text-xs text-gray-500 ml-2">(込み: {totals.grossProfitRateWithScrap}%)</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mb-6 rounded-md p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">原価率 / Cost Ratio</p>
            <p className={`text-4xl font-semibold tabular-nums ${costRatioNum >= 85 ? 'text-red-400' : costRatioNum >= 70 ? 'text-yellow-400' : 'text-blue-400'}`}>{costRatio}%</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 mb-2">目安</p>
            <p className={`text-lg font-semibold ${costRatioNum >= 85 ? 'text-red-400' : costRatioNum >= 70 ? 'text-yellow-400' : 'text-blue-400'}`}>
              {costRatioNum >= 85 ? '要警戒' : costRatioNum >= 70 ? '注意' : '余裕あり'}
            </p>
          </div>
        </div>
      </div>
      <SectionHeader title="原価構成比 / Cost Structure" />
      {pieData.length > 0 ? (
        <div className="rounded-md p-5 mb-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => `¥${formatCurrency(v)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2 pt-4 border-t border-white/[0.06]">
            {pieData.map((item, idx) => {
              const total = pieData.reduce((s, d) => s + d.value, 0);
              return (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-400">{item.name}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-white tabular-nums">¥{formatCurrency(item.value)}</span>
                    <span className="text-xs text-gray-500 ml-2">({((item.value / total) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-md p-8" style={{ background: 'rgba(255,255,255,0.02)' }}><p className="text-center text-gray-500 text-sm">データがありません</p></div>
      )}
      <div className="mt-8">
        <SectionHeader title="月別原価推移 / Monthly Trend" />
        {barData.length > 0 ? (
          <div className="rounded-md p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis label={{ value: '(万円)', angle: -90, position: 'insideLeft' }} stroke="#9CA3AF" />
                <Tooltip formatter={(v) => `${v}万円`} contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Bar dataKey="cost" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-md p-8" style={{ background: 'rgba(255,255,255,0.02)' }}><p className="text-center text-gray-500 text-sm">データがありません</p></div>
        )}
      </div>
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
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
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
    <div className="max-w-2xl mx-auto px-6 py-8 bg-black min-h-screen">
      <div className="mb-4">
        <button onClick={() => onNavigate('home')} className="px-4 py-2 bg-black hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-sm flex items-center gap-2">
          <X className="w-4 h-4" />閉じる
        </button>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">EXPORT</h1>
      <p className="text-gray-400 text-sm mb-8">解体作業日報をGoogle スプレッドシートに出力</p>
      <div className="border rounded-lg p-6 mb-6" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <h2 className="text-xl font-semibold text-white mb-4">スプレッドシート設定</h2>
        <div className="mb-4">
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">日報用 GAS URL <span className="text-red-500">*必須</span></label>
          <input type="text" value={gasUrl} onChange={(e) => setGasUrl(e.target.value)} placeholder="例: https://script.google.com/macros/s/..."
            className="w-full px-4 py-3 bg-black border border-white/[0.08] text-white text-sm rounded-md focus:outline-none focus:border-blue-500 mb-4" />
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">月報用 GAS URL</label>
          <input type="text" value={gasMonthlyUrl} onChange={(e) => setGasMonthlyUrl(e.target.value)} placeholder="例: https://script.google.com/macros/s/..."
            className="w-full px-4 py-3 bg-black border border-white/[0.08] text-white text-sm rounded-md focus:outline-none focus:border-green-500 mb-4" />
          <button onClick={handleSaveSettings} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Save className="inline w-4 h-4 mr-2" />保存
          </button>
        </div>
      </div>
      <div className="border rounded-lg p-6 mb-6" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <h2 className="text-xl font-semibold text-white mb-2">月報</h2>
        <p className="text-gray-400 text-sm mb-4">全現場の月報シートにこの現場の情報を反映します。</p>
        <button onClick={handleExportMonthlyReport} disabled={exporting || !gasUrl || !selectedSite}
          className={`w-full px-6 py-4 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${exporting || !gasUrl || !selectedSite ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-700 text-white hover:bg-green-600'}`}>
          <FileText className="w-5 h-5" />{exporting ? '更新中...' : '月報を更新'}
        </button>
      </div>
      <div className="border rounded-lg p-6 mb-6" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <h2 className="text-xl font-semibold text-white mb-2">解体作業日報</h2>
        <p className="text-gray-400 text-sm mb-4">LOGIO仕様の解体作業日報をスプレッドシートに自動生成します</p>
        <button onClick={handleExportWorkReport} disabled={exporting || !gasUrl || !selectedSite}
          className={`w-full px-6 py-4 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${exporting || !gasUrl || !selectedSite ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          <FileText className="w-5 h-5" />{exporting ? '作成中...' : '解体作業日報をスプシに作成'}
        </button>
        {exportStatus && (
          <div className={`mt-4 p-3 rounded-lg text-sm whitespace-pre-line ${exportStatus.startsWith('✅') ? 'bg-green-900/30 text-green-400 border border-green-800' : exportStatus.startsWith('❌') ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-blue-900/30 text-blue-400 border border-blue-800'}`}>{exportStatus}</div>
        )}
      </div>
      <div className="border rounded-lg p-6" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <h2 className="text-xl font-semibold text-white mb-4">ステータス</h2>
        <div className="space-y-3 text-sm">
          {[['最終エクスポート', lastExport || '未実行'], ['現場', selectedSite || '未選択'], ['日報データ', `${reports.length}件`]].map(([label, val]) => (
            <div key={label} className="flex justify-between py-2 border-b border-white/[0.06] last:border-b-0">
              <span className="text-gray-400">{label}</span><span className="text-white font-medium">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========== ReportPDFPage ==========
function ReportPDFPage({ report, projectInfo, onNavigate }) {
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, []);
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

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-gray-400">読み込み中...</p></div>;

  const totalInHouseWorkers = allReports.reduce((sum, r) => sum + (r.workDetails?.inHouseWorkers?.length || 0), 0);
  const totalInHouseCost = allReports.reduce((sum, r) => sum + (r.workDetails?.inHouseWorkers || []).reduce((s, w) => s + (w.amount || 0), 0), 0);
  const totalOutsourcingWorkers = allReports.reduce((sum, r) => sum + (r.workDetails?.outsourcingLabor || []).reduce((s, o) => s + (parseInt(o.count || o.workers) || 0), 0), 0);
  const totalOutsourcingCost = allReports.reduce((sum, r) => sum + (r.workDetails?.outsourcingLabor || []).reduce((s, o) => s + (o.amount || 0), 0), 0);
  const totalVehicleCost = allReports.reduce((sum, r) => sum + (r.workDetails?.vehicles || []).reduce((s, v) => s + (v.amount || 0), 0), 0);
  const totalMachineryCost = allReports.reduce((sum, r) => sum + (r.workDetails?.machinery || []).reduce((s, m) => s + (m.unitPrice || 0), 0), 0);
  const totalWasteCost = allReports.reduce((sum, r) => sum + (r.wasteItems || []).reduce((s, w) => s + (w.amount || 0), 0), 0);
  const totalScrapRevenue = allReports.reduce((sum, r) => sum + Math.abs((r.scrapItems || []).reduce((s, sc) => s + (sc.amount || 0), 0)), 0);
  const totalRevenue = (parseFloat(projectInfo.contractAmount) || 0) + (parseFloat(projectInfo.additionalAmount) || 0);
  const totalCost = totalInHouseCost + totalOutsourcingCost + totalVehicleCost + totalMachineryCost + totalWasteCost
    + (parseFloat(projectInfo.transferCost) || 0) + (parseFloat(projectInfo.leaseCost) || 0) + (parseFloat(projectInfo.materialsCost) || 0)
    + (projectInfo.expenses || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const grossProfit = totalRevenue - totalCost + totalScrapRevenue;
  const fmtDate = (dateStr) => { if (!dateStr) return ''; const p = dateStr.split('-'); return `${parseInt(p[1])}/${parseInt(p[2])}`; };
  const fmtDay = (dateStr) => { if (!dateStr) return ''; return ['日','月','火','水','木','金','土'][new Date(dateStr).getDay()]; };
  const MAX_ROWS = 20;
  const displayReports = allReports.slice(0, MAX_ROWS);
  const emptyRows = MAX_ROWS - displayReports.length;

  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'#000', overflowX:'auto', overflowY:'auto', zIndex:100, WebkitOverflowScrolling:'touch' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
        .pdf-container { font-family: 'Noto Sans JP', sans-serif; }
        .pdf-table { border-collapse: collapse; width: 100%; }
        .pdf-table th, .pdf-table td { border: 1px solid #374151; padding: 2px 4px; font-size: 9px; line-height: 1.3; white-space: nowrap; }
        .pdf-table th { background: #111827; color: #9CA3AF; font-weight: 700; text-align: center; font-size: 8px; }
        .pdf-table td { color: #E5E7EB; }
        .pdf-header-table { border-collapse: collapse; width: 100%; }
        .pdf-header-table th, .pdf-header-table td { border: 1px solid #374151; padding: 3px 6px; font-size: 10px; line-height: 1.4; }
        .pdf-header-table th { background: #111827; color: #6B7280; font-weight: 700; text-align: left; font-size: 8px; width: 80px; }
        .pdf-header-table td { color: #F3F4F6; background: #0a0a0a; }
        .result-table { border-collapse: collapse; width: 100%; }
        .result-table th, .result-table td { border: 1px solid #374151; padding: 2px 6px; font-size: 9px; }
        .result-table th { background: #111827; color: #6B7280; font-weight: 500; text-align: left; width: 70px; }
        .result-table td { color: #F3F4F6; text-align: right; background: #0a0a0a; font-variant-numeric: tabular-nums; }
        @media print {
          .no-print { display: none !important; }
          @page { size: A3 landscape; margin: 8mm; }
        }
      `}</style>
      <div className="no-print bg-black border-b border-white/[0.06] p-4 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => onNavigate('list')} className="px-4 py-2 bg-black hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-sm flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />日報一覧に戻る
        </button>
        <div className="flex items-center gap-3">
          <span className="text-gray-500 text-xs">全{allReports.length}件の日報</span>
          <button onClick={() => window.print()} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />PDF出力 / 印刷
          </button>
        </div>
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
      <div className="pdf-container bg-black p-6" style={{ minWidth: '1100px', width: '1100px', margin: '0 auto' }}>
        <div style={{ width: '1100px' }}>
          <div className="text-center mb-3">
            <h1 className="pdf-title text-xl font-black tracking-[0.3em] text-white border-b-2 border-gray-600 pb-2 inline-block px-8">解　体　作　業　日　報</h1>
            <p className="text-right text-gray-500 text-[9px] mt-1 mr-2">EMS-記-22</p>
          </div>
          <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: '320px 240px 240px 1fr' }}>
            <table className="pdf-header-table">
              <tbody>
                {[['発注者', projectInfo.client], ['プロジェクト名', report.siteName || report.site_name || ''], ['工事種別', projectInfo.workType||''], ['住所', projectInfo.workLocation], ['工期', `${projectInfo.startDate} ～ ${projectInfo.endDate}`], ['営業担当', projectInfo.salesPerson], ['責任者', projectInfo.siteManager]].map(([k, v]) => (
                  <tr key={k}><th>{k}</th><td>{v || ''}</td></tr>
                ))}
              </tbody>
            </table>
            <table className="pdf-header-table">
              <tbody>
                <tr><th>排出事業者</th><td>{projectInfo.discharger || ''}</td></tr>
                <tr><th>契約処分先</th><td className="text-[8px]" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{(projectInfo.contractedDisposalSites || []).join('\n')}</td></tr>
                <tr><th>PROJECT NO.</th><td>{projectInfo.projectNumber || ''}</td></tr>
                <tr><th>ステータス</th><td>{projectInfo.status || ''}</td></tr>
              </tbody>
            </table>
            <div></div>
            <div>
              <div className="text-center py-1 font-bold text-[10px] tracking-widest bg-yellow-500/20 text-yellow-400 border border-gray-600">【　収　支　結　果　】</div>
              <table className="result-table">
                <tbody>
                  {[
                    ['見積金額', totalRevenue], ['原価金額', totalCost], ['外注金額', totalOutsourcingCost],
                    ['追加金額', parseFloat(projectInfo.additionalAmount) || 0],
                    ...(projectInfo.transferCost ? [['回送費', parseFloat(projectInfo.transferCost)]] : []),
                    ...(projectInfo.leaseCost ? [['リース費', parseFloat(projectInfo.leaseCost)]] : []),
                    ...(projectInfo.materialsCost ? [['資材費', parseFloat(projectInfo.materialsCost)]] : []),
                    ...(projectInfo.expenses || []).map(e => [e.name, parseFloat(e.amount) || 0]),
                    ['金属売上', totalScrapRevenue],
                  ].map(([label, val]) => (
                    <tr key={label}><th>{label}</th><td>¥{formatCurrency(val)}</td></tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #374151' }}>
                    <th className="font-bold">粗利</th>
                    <td className="font-bold" style={{ color: grossProfit >= 0 ? '#60A5FA' : '#F87171' }}>¥{formatCurrency(grossProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <table className="pdf-table">
            <thead>
              <tr>
                <th rowSpan="2" style={{ width: '30px' }}>日数</th><th rowSpan="2" style={{ width: '55px' }}>日付</th>
                <th rowSpan="2" style={{ width: '20px' }}>曜</th><th rowSpan="2" style={{ width: '20px' }}>天候</th>
                <th rowSpan="2" style={{ width: '25px' }}>区分</th><th rowSpan="2" style={{ minWidth: '120px' }}>施工内容</th>
                <th colSpan="2">作業時間</th><th colSpan="2">自社人工</th><th colSpan="2">外注人工</th>
                <th colSpan="2">車両</th><th rowSpan="2" style={{ width: '50px' }}>重機</th><th colSpan="5">産廃・スクラップ</th>
              </tr>
              <tr>
                <th style={{ width: '35px' }}>開始</th><th style={{ width: '35px' }}>終了</th>
                <th style={{ width: '70px' }}>氏名</th><th style={{ width: '50px' }}>金額</th>
                <th style={{ width: '65px' }}>会社・人数</th><th style={{ width: '50px' }}>金額</th>
                <th style={{ width: '35px' }}>車種</th><th style={{ width: '35px' }}>車番</th>
                <th style={{ width: '55px' }}>発生材</th><th style={{ width: '35px' }}>数量</th>
                <th style={{ width: '50px' }}>金額</th><th style={{ width: '55px' }}>搬出先</th><th style={{ width: '55px' }}>マニNo.</th>
              </tr>
            </thead>
            <tbody>
              {displayReports.map((r, idx) => {
                const workers = r.workDetails?.inHouseWorkers || [];
                const outsourcing = r.workDetails?.outsourcingLabor || [];
                const vehicles = r.workDetails?.vehicles || [];
                const machinery = r.workDetails?.machinery || [];
                const waste = r.wasteItems || [];
                const scrap = r.scrapItems || [];
                const wasteAndScrap = [...waste, ...scrap.map(s => ({ material: s.type, quantity: s.quantity, unit: s.unit, amount: Math.abs(s.amount), disposalSite: s.buyer, manifestNumber: '-' }))];
                const maxSubRows = Math.max(1, workers.length, outsourcing.length, vehicles.length, machinery.length, wasteAndScrap.length);
                const startTimes = workers.map(w => w.start || w.startTime).filter(Boolean).sort();
                const endTimes = workers.map(w => w.end || w.endTime).filter(Boolean).sort().reverse();
                return (
                  <Fragment key={r.id}>
                    {Array.from({ length: maxSubRows }, (_, subIdx) => (
                      <tr key={`${r.id}-${subIdx}`}>
                        {subIdx === 0 && (
                          <>
                            <td rowSpan={maxSubRows} className="text-center">{idx + 1}</td>
                            <td rowSpan={maxSubRows} className="text-center text-[8px]">{fmtDate(r.date)}</td>
                            <td rowSpan={maxSubRows} className="text-center text-[8px]">{fmtDay(r.date)}</td>
                            <td rowSpan={maxSubRows} className="text-center text-[8px]">{r.weather || ''}</td>
                            <td rowSpan={maxSubRows} className="text-center text-[8px]">{r.workDetails?.workCategory || ''}</td>
                            <td rowSpan={maxSubRows} className="text-[8px]" style={{ whiteSpace: 'normal', maxWidth: '120px' }}>{r.workDetails?.workContent || ''}</td>
                            <td rowSpan={maxSubRows} className="text-center text-[8px]">{startTimes[0] || '-'}</td>
                            <td rowSpan={maxSubRows} className="text-center text-[8px]">{endTimes[0] || '-'}</td>
                          </>
                        )}
                        <td className="text-[8px]">{workers[subIdx]?.name || ''}</td>
                        <td className="text-right text-[8px]">{workers[subIdx] ? `¥${formatCurrency(workers[subIdx].amount)}` : ''}</td>
                        <td className="text-[8px]">{outsourcing[subIdx] ? `${outsourcing[subIdx].company} ${outsourcing[subIdx].count || outsourcing[subIdx].workers || ''}人` : ''}</td>
                        <td className="text-right text-[8px]">{outsourcing[subIdx] ? `¥${formatCurrency(outsourcing[subIdx].amount)}` : ''}</td>
                        <td className="text-center text-[8px]">{vehicles[subIdx]?.type || ''}</td>
                        <td className="text-center text-[8px]">{vehicles[subIdx]?.number || ''}</td>
                        <td className="text-[8px]">{machinery[subIdx]?.type || ''}</td>
                        <td className="text-[8px]">{wasteAndScrap[subIdx]?.material || ''}</td>
                        <td className="text-right text-[8px]">{wasteAndScrap[subIdx] ? `${wasteAndScrap[subIdx].quantity}${wasteAndScrap[subIdx].unit}` : ''}</td>
                        <td className="text-right text-[8px]">{wasteAndScrap[subIdx] ? `¥${formatCurrency(wasteAndScrap[subIdx].amount)}` : ''}</td>
                        <td className="text-[8px]">{wasteAndScrap[subIdx]?.disposalSite || ''}</td>
                        <td className="text-[8px]">{wasteAndScrap[subIdx]?.manifestNumber || ''}</td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
              {Array.from({ length: emptyRows }, (_, idx) => (
                <tr key={`empty-${idx}`}>
                  <td className="text-center" style={{ height: '18px' }}>{displayReports.length + idx + 1}</td>
                  <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                  <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                  <td></td><td></td><td></td><td></td><td></td>
                </tr>
              ))}
              <tr style={{ background: '#111827' }}>
                <th colSpan="8" className="text-right" style={{ background: '#111827', color: '#9CA3AF' }}>計</th>
                <td className="text-center text-[8px] font-bold" style={{ color: '#E5E7EB' }}>{totalInHouseWorkers}人</td>
                <td className="text-right text-[8px] font-bold" style={{ color: '#60A5FA' }}>¥{formatCurrency(totalInHouseCost)}</td>
                <td className="text-center text-[8px] font-bold" style={{ color: '#E5E7EB' }}>{totalOutsourcingWorkers}人</td>
                <td className="text-right text-[8px] font-bold" style={{ color: '#60A5FA' }}>¥{formatCurrency(totalOutsourcingCost)}</td>
                <td colSpan="2" className="text-right text-[8px] font-bold" style={{ color: '#60A5FA' }}>¥{formatCurrency(totalVehicleCost)}</td>
                <td className="text-right text-[8px] font-bold" style={{ color: '#60A5FA' }}>¥{formatCurrency(totalMachineryCost)}</td>
                <td colSpan="3" className="text-right text-[8px] font-bold" style={{ color: '#60A5FA' }}>¥{formatCurrency(totalWasteCost)}</td>
                <td colSpan="2" className="text-right text-[8px] font-bold" style={{ color: '#9CA3AF' }}>原価小計：</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-2 flex justify-end">
            <div className="border border-white/[0.08] bg-black px-6 py-2 flex items-center gap-4">
              <span className="text-gray-400 text-xs font-bold">原価合計</span>
              <span className="text-white text-lg font-black tabular-nums">¥{formatCurrency(totalCost)}</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// ========== メインApp ==========
export default function LOGIOApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [projectInfo, setProjectInfo] = useState({
    projectId: '', projectNumber: '', projectName: '', client: '', workLocation: '',
    salesPerson: '', siteManager: '', startDate: '', endDate: '',
    contractAmount: '', additionalAmount: '', status: '進行中',
    discharger: '', contractedDisposalSites: [], transferCost: '', leaseCost: '', materialsCost: ''
  });
  const [reports, setReports] = useState([]);
  // ★ 追加 state
  const [reloading, setReloading] = useState(false);
  const [lockStatus, setLockStatus] = useState(null);

  useEffect(() => {
    const vp = document.querySelector('meta[name="viewport"]');
    const content = currentPage === 'pdf' ? 'width=device-width, initial-scale=1' : 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
    if (vp) vp.setAttribute('content', content);
    else { const meta = document.createElement('meta'); meta.name='viewport'; meta.content=content; document.head.appendChild(meta); }
  }, [currentPage]);

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, [showSplash]);

  useEffect(() => { if (isLoggedIn) loadSites(); }, [isLoggedIn]);

  const loadSites = async () => {
    try {
      const data = await sb('sites').select('order=created_at.asc');
      if (Array.isArray(data)) setSites(data.map(s => ({ name: s.name, createdAt: s.created_at, status: s.status, projectNumber: s.project_number || '' })));
    } catch (error) { console.log('loadSites error:', error); }
  };

  const generateProjectNumber = async () => {
    const currentYear = new Date().getFullYear();
    const data = await sb('project_info').select('select=project_number');
    const allNums = Array.isArray(data) ? data.map(d => d.project_number).filter(Boolean) : [];
    const nums = allNums.filter(num => num && num.startsWith(currentYear + '-')).map(num => { const parts = num.split('-'); return parts.length === 2 ? parseInt(parts[1], 10) : 0; }).filter(num => !isNaN(num));
    return `${currentYear}-${(Math.max(...nums, 0) + 1).toString().padStart(3, '0')}`;
  };

  const handleLogin = (user) => { setCurrentUser(user); setIsLoggedIn(true); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      if (selectedSite && currentUser) siteLocks.release(selectedSite, currentUser.userId);
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
      setProjectInfo({ projectId: '', projectNumber, projectName: siteName, workType: '', client: '', workLocation: '', salesPerson: '', siteManager: '', startDate: '', endDate: '', contractAmount: '', additionalAmount: '', status: '進行中', discharger: '', transportCompany: '', contractedDisposalSites: [], transferCost: '', leaseCost: '', materialsCost: '', expenses: [] });
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

  // ★ 現場選択時にロック状態確認
  const handleSelectSite = async (siteName) => {
    setSelectedSite(siteName);
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
        setProjectInfo({ projectId: d.id || '', projectNumber: d.project_number || '', projectName: siteName, workType: d.work_type || '', client: d.client || '', workLocation: d.work_location || '', salesPerson: d.sales_person || '', siteManager: d.site_manager || '', startDate: d.start_date || '', endDate: d.end_date || '', contractAmount: d.contract_amount || '', additionalAmount: d.additional_amount || '', status: d.status || '進行中', discharger: d.discharger || '', transportCompany: d.transport_company || '', contractedDisposalSites: d.contracted_disposal_sites || [], transferCost: d.transfer_cost || '', leaseCost: d.lease_cost || '', materialsCost: d.materials_cost || '', expenses: d.expenses || '', completionDate: d.completion_date || '' });
      }
    } catch (error) { console.error('loadProjectInfo error:', error); }
  };

  const loadReports = async (siteName) => {
    try {
      const data = await sb('reports').select(`site_name=eq.${encodeURIComponent(siteName)}&order=date.asc`);
      if (Array.isArray(data)) setReports(data.map(r => ({ id: r.id, siteName: r.site_name, date: r.date, weather: r.weather, recorder: r.recorder, workDetails: r.work_details || {}, wasteItems: r.waste_items || [], scrapItems: r.scrap_items || [], createdAt: r.created_at })));
      else setReports([]);
    } catch (error) { setReports([]); }
  };

  const handleSaveProject = async () => {
    if (!selectedSite) return alert('現場を選択してください');
    try {
      await sb('project_info').upsert({ site_name: selectedSite, project_number: projectInfo.projectNumber || '', work_type: projectInfo.workType || '', client: projectInfo.client || '', work_location: projectInfo.workLocation || '', sales_person: projectInfo.salesPerson || '', site_manager: projectInfo.siteManager || '', start_date: projectInfo.startDate || '', end_date: projectInfo.endDate || '', contract_amount: parseFloat(projectInfo.contractAmount) || 0, additional_amount: parseFloat(projectInfo.additionalAmount) || 0, status: projectInfo.status || '進行中', discharger: projectInfo.discharger || '', transport_company: projectInfo.transportCompany || '', contracted_disposal_sites: projectInfo.contractedDisposalSites || [], transfer_cost: parseFloat(projectInfo.transferCost) || 0, lease_cost: parseFloat(projectInfo.leaseCost) || 0, materials_cost: parseFloat(projectInfo.materialsCost) || 0, expenses: projectInfo.expenses || [], updated_at: new Date().toISOString() }, 'site_name');
      await sb('sites').update({ project_number: projectInfo.projectNumber || '' }, `name=eq.${encodeURIComponent(selectedSite)}`);
      setSites(prev => prev.map(s => s.name === selectedSite ? { ...s, projectNumber: projectInfo.projectNumber || '' } : s));
      alert('✅ プロジェクト情報を保存しました');
      window.scrollTo({ top: 0, behavior: 'instant' });
      setCurrentPage('home');
    } catch (error) { console.error(error); alert('❌ 保存に失敗しました'); }
  };

  // ★ 保存後にロック解放
  const handleSaveReport = async (reportData) => {
    if (!selectedSite) return alert('現場を選択してください');
    try {
      await sb('reports').insert({ site_name: selectedSite, date: reportData.date, weather: reportData.weather || '', recorder: reportData.recorder || '', work_details: reportData.workDetails || {}, waste_items: reportData.wasteItems || [], scrap_items: reportData.scrapItems || [] });
      const userName = currentUser?.userId || 'unknown';
      await siteLocks.release(selectedSite, userName);
      setLockStatus(null);
      await loadReports(selectedSite);
      alert('✅ 日報を保存しました');
      window.scrollTo({ top: 0, behavior: 'instant' });
      setCurrentPage('home');
    } catch (error) { console.error(error); alert('❌ 保存に失敗しました'); }
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
      }
      report.wasteItems?.forEach(w => accumulatedCost += w.amount || 0);
      report.scrapItems?.forEach(s => accumulatedScrap += Math.abs(s.amount || 0));
    });
    accumulatedCost += (parseFloat(projectInfo.transferCost) || 0) + (parseFloat(projectInfo.leaseCost) || 0) + (parseFloat(projectInfo.materialsCost) || 0);
    const grossProfit = totalRevenue - accumulatedCost + accumulatedScrap;
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
        setCurrentPage('input');
      })();
    } else { setCurrentPage(page); }
  };

  const handlePasswordSubmit = () => {
    if (password === 'face1991') { setShowPasswordModal(false); setPassword(''); setCurrentPage('settings'); }
    else { alert('❌ パスワードが正しくありません'); setPassword(''); }
  };

  const totals = calculateTotals();
  window.__navigatePDF = (report) => { setSelectedReport(report); setCurrentPage('pdf'); window.scrollTo({ top: 0, behavior: 'instant' }); };

  if (showSplash) return <SplashScreen />;
  if (!isLoggedIn) return <LoginPage onLogin={handleLogin} />;

  // ★ ロック解放関数（ReportInputPage に渡す）
  const releaseLock = async () => {
    const userName = currentUser?.userId || 'unknown';
    await siteLocks.release(selectedSite, userName);
    setLockStatus(null);
  };

  return (
    <div className="min-h-screen bg-black flex" style={{ overflowX: currentPage === 'pdf' ? 'auto' : 'hidden' }}>
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onLogout={handleLogout} />
      <div className="flex flex-col flex-1 bg-black">
        <Header
          showMenuButton onMenuClick={() => setSidebarOpen(true)}
          onCalendar={() => setShowCalendarModal(true)}
          onExport={() => handleNavigate('export')}
          onNotification={() => setShowNotificationModal(true)}
          onReload={handleReload}
          reloading={reloading}
          notificationCount={(() => {
            const costRatio = totals.totalRevenue > 0 ? (totals.accumulatedCost / totals.totalRevenue) * 100 : 0;
            return costRatio >= 70 ? 1 : 0;
          })()}
        />
        <main className="flex-1" style={{ paddingTop: 'calc(52px + env(safe-area-inset-top, 0px))', overflowX: currentPage === 'pdf' ? 'auto' : 'hidden' }}>
          {currentPage === 'home' && (
            <HomePage
              sites={sites} selectedSite={selectedSite} onSelectSite={handleSelectSite}
              onNavigate={handleNavigate} totals={totals} projectInfo={projectInfo} reports={reports}
              lockStatus={lockStatus}
              currentUserId={currentUser?.userId}
            />
          )}
          {currentPage === 'settings' && <ProjectSettingsPage sites={sites} selectedSite={selectedSite} projectInfo={projectInfo} setProjectInfo={setProjectInfo} onSave={handleSaveProject} onAddSite={handleAddSite} onDeleteSite={handleDeleteSite} onNavigate={setCurrentPage} />}
          {currentPage === 'input' && (
            <ReportInputPage
              onSave={handleSaveReport}
              onNavigate={setCurrentPage}
              projectInfo={projectInfo}
              onReleaseLock={releaseLock}
            />
          )}
          {currentPage === 'list' && <ReportListPage reports={reports} onDelete={handleDeleteReport} onNavigate={setCurrentPage} />}
          {currentPage === 'analysis' && <AnalysisPage reports={reports} totals={totals} projectInfo={projectInfo} onNavigate={setCurrentPage} />}
          {currentPage === 'project' && <ProjectPage projectInfo={projectInfo} selectedSite={selectedSite} onNavigate={setCurrentPage} />}
          {currentPage === 'export' && <ExportPage sites={sites} reports={reports} projectInfo={projectInfo} selectedSite={selectedSite} onNavigate={setCurrentPage} />}
          {currentPage === 'pdf' && selectedReport && <ReportPDFPage report={selectedReport} projectInfo={projectInfo} onNavigate={setCurrentPage} />}
        </main>
      </div>

      {/* パスワードモーダル */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-black p-6 max-w-md w-full rounded-lg border border-white/[0.08]">
            <h2 className="text-xl font-bold text-white mb-4">管理者認証</h2>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="パスワードを入力" className="w-full px-4 py-3 bg-black border border-white/[0.08] text-white text-base rounded-md focus:outline-none focus:border-blue-500 mb-4" autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handlePasswordSubmit} className="px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">認証</button>
              <button onClick={() => { setShowPasswordModal(false); setPassword(''); }} className="px-4 py-3 bg-black border border-white/[0.08] text-gray-300 font-medium rounded-lg hover:bg-gray-700">キャンセル</button>
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
          <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50" onClick={() => setShowCalendarModal(false)} style={{ backdropFilter:'blur(4px)' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:'#0a0a0a', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'480px', padding:'24px 24px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
              <div style={{ width:'36px', height:'4px', background:'rgba(255,255,255,0.15)', borderRadius:'2px', margin:'0 auto 24px' }} />
              <p style={{ fontSize:'11px', fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'16px' }}>工期 / Schedule</p>
              {selectedSite ? (
                <>
                  <p style={{ fontSize:'16px', fontWeight:700, color:'white', marginBottom:'20px' }}>{selectedSite}</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'20px' }}>
                    {[['開始日', projectInfo?.startDate], ['終了日', projectInfo?.endDate]].map(([label, val]) => (
                      <div key={label} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'10px', padding:'14px' }}>
                        <p style={{ fontSize:'10px', color:'#6B7280', marginBottom:'6px' }}>{label}</p>
                        <p style={{ fontSize:'15px', fontWeight:600, color:'white' }}>{val || '未設定'}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom:'16px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                      <span style={{ fontSize:'12px', color:'#6B7280' }}>経過 {elapsedDays}日 / 全{totalDays}日</span>
                      <span style={{ fontSize:'12px', fontWeight:700, color: remainDays === 0 ? '#ef4444' : remainDays !== null && remainDays <= 7 ? '#f59e0b' : '#6B7280' }}>{remainDays !== null ? `残 ${remainDays}日` : '未設定'}</span>
                    </div>
                    <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:'99px', height:'6px', overflow:'hidden' }}>
                      <div style={{ width:`${progressPercent}%`, height:'100%', background:barColor, borderRadius:'99px', transition:'width 0.6s ease' }} />
                    </div>
                    <p style={{ fontSize:'24px', fontWeight:800, color:'white', marginTop:'12px' }}>{Math.round(progressPercent)}%</p>
                  </div>
                </>
              ) : (
                <p style={{ fontSize:'14px', color:'#6B7280', textAlign:'center', padding:'20px 0' }}>現場を選択してください</p>
              )}
              <button onClick={() => setShowCalendarModal(false)}
                style={{ width:'100%', padding:'14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.6)', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer', marginTop:'8px' }}>
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
          <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50" onClick={() => setShowNotificationModal(false)} style={{ backdropFilter:'blur(4px)' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:'#0a0a0a', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:'480px', padding:'24px 24px calc(24px + env(safe-area-inset-bottom, 0px))' }}>
              <div style={{ width:'36px', height:'4px', background:'rgba(255,255,255,0.15)', borderRadius:'2px', margin:'0 auto 24px' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
                <p style={{ fontSize:'11px', fontWeight:700, color:'#4B5563', textTransform:'uppercase', letterSpacing:'0.1em' }}>通知 / Notifications</p>
                {alerts.length > 0 && <span style={{ fontSize:'11px', fontWeight:700, color:'#ef4444', background:'rgba(239,68,68,0.1)', padding:'2px 8px', borderRadius:'99px' }}>{alerts.length}件</span>}
              </div>
              {alerts.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0' }}>
                  <p style={{ fontSize:'28px', marginBottom:'12px' }}>✅</p>
                  <p style={{ fontSize:'14px', color:'#6B7280' }}>アラートはありません</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'16px' }}>
                  {alerts.map((a, i) => (
                    <div key={i} style={{ background: levelBg[a.level], border:`1px solid ${levelColor[a.level]}33`, borderRadius:'12px', padding:'14px 16px', display:'flex', gap:'12px', alignItems:'flex-start' }}>
                      <span style={{ fontSize:'20px', flexShrink:0 }}>{a.icon}</span>
                      <div>
                        <p style={{ fontSize:'13px', fontWeight:700, color: levelColor[a.level], marginBottom:'4px' }}>{a.title}</p>
                        <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.5)' }}>{a.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => setShowNotificationModal(false)}
                style={{ width:'100%', padding:'14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.6)', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                閉じる
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
