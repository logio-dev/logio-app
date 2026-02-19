import React, { useState, useEffect, useRef, Fragment } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Save, Trash2, BarChart3, FileText, Settings, Menu, X, Home, Check, LogOut, Calendar, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

console.log('✅ LOGIO Phase5: Module loaded successfully');

// ========== localStorage ラッパー ==========
if (typeof window !== 'undefined') {
  window.storage = {
    async get(key) {
      try {
        const value = localStorage.getItem(key);
        return value ? { key, value, shared: false } : null;
      } catch (error) { return null; }
    },
    async set(key, value) {
      try {
        localStorage.setItem(key, value);
        return { key, value, shared: false };
      } catch (error) { return null; }
    },
    async delete(key) {
      try {
        localStorage.removeItem(key);
        return { key, deleted: true, shared: false };
      } catch (error) { return { key, deleted: false, shared: false }; }
    },
    async list(prefix) {
      try {
        const keys = Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix));
        return { keys, prefix, shared: false };
      } catch (error) { return { keys: [], prefix, shared: false }; }
    }
  };
}

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
  inHouseWorkers: ['五十嵐悠哉', '井ケ田浩寿', '稲葉正輝', '石森達也', '一村琢磨', '間野昂平', '折田優作', '大野勝也'],
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
  heavyMachinery: ['PC78US', 'PC138US', 'その他（フリー入力）'],
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
  wasteTypes: ['混合廃棄物', '木くず', '廃プラ', 'がら陶', 'コンクリートがら', '金属くず', '石膏ボード', 'ガラス'],
  disposalSites: ['木村建材', '二光産業', 'ギプロ', 'ウムヴェルト', '日栄興産', '戸部組', 'リバー', 'ワイエムエコフューチャー', '東和アークス', 'ヤマゼン', '入間緑化', '石坂産業'],
  scrapTypes: ['鉄くず', '銅線', 'アルミ', 'ステンレス', '真鍮'],
  buyers: ['小林金属', '高橋金属', 'ナンセイスチール', '服部金属', 'サンビーム', '光田産業', '青木商店', '長沼商事'],
  statuses: ['進行中', '完了', '中断']
};

const VEHICLE_UNIT_PRICES = {
  '軽バン': 0, '2td': 10000, '3td': 10000, '4td': 15000,
  '4tc': 15000, '8tc': 20000, '増td': 20000, '10tc': 20000
};

// ========== 共通ユーティリティ ==========
const generateId = (prefix) => {
  if (crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
const formatCurrency = (num) => new Intl.NumberFormat('ja-JP').format(num);
const getDayOfWeek = (dateStr) => {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[new Date(dateStr).getDay()];
};

// ========== 共通コンポーネント ==========

// ★ ヘッダー（DashboardSample準拠）
function Header({ title, showMenuButton = false, onMenuClick }) {
  return (
    <header className="bg-black px-5 py-4 flex items-center justify-between sticky top-0 z-40"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <button onClick={onMenuClick} className="transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={e => e.currentTarget.style.color='white'}
            onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.6)'}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M3 8H21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M6 16H18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
        <span className="text-white font-extrabold" style={{ fontSize: '22px', letterSpacing: '-0.03em', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>LOGIO</span>
      </div>
      <div className="flex items-center gap-1">
        <button className="p-2 transition-colors rounded-lg" style={{ color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.8)'}
          onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.4)'}>
          <Calendar className="w-5 h-5" />
        </button>
        <button className="p-2 transition-colors rounded-lg" style={{ color: 'rgba(255,255,255,0.4)' }}
          onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.8)'}
          onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.4)'}>
          <Activity className="w-5 h-5" />
        </button>
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
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
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
            <div className="p-4 border-t border-white/[0.06]">
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

// ========== ★ HomePage（DashboardSample.jsx完全準拠） ==========
// ========== ★ HomePage（DashboardSample完全準拠・最近の日報折りたたみ） ==========
function HomePage({ sites, selectedSite, onSelectSite, onNavigate, totals, projectInfo, reports }) {
  const [financeOpen, setFinanceOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(true);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setSiteDropdownOpen(false);
    };
    if (siteDropdownOpen) { document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }
  }, [siteDropdownOpen]);

  // 原価率
  const costRatio = totals.totalRevenue > 0 ? (totals.accumulatedCost / totals.totalRevenue) * 100 : 0;
  const costRatioFixed = costRatio.toFixed(1);
  let costBarColor = "#3B82F6";
  let costBarBg = "rgba(59,130,246,0.12)";
  let costStatus = "Good";
  if (costRatio >= 85) { costBarColor = "#EF4444"; costBarBg = "rgba(239,68,68,0.12)"; costStatus = "危険"; }
  else if (costRatio >= 70) { costBarColor = "#F59E0B"; costBarBg = "rgba(245,158,11,0.12)"; costStatus = "注意"; }

  // 工期
  const today = new Date(); today.setHours(0,0,0,0);
  const start = projectInfo?.startDate ? new Date(projectInfo.startDate) : null;
  const end = projectInfo?.endDate ? new Date(projectInfo.endDate) : null;
  const totalDays = start && end ? Math.max(1, Math.ceil((end - start) / 86400000)) : 1;
  const elapsedDays = start ? Math.max(0, Math.ceil((today - start) / 86400000)) : 0;
  const remainDays = end ? Math.max(0, Math.ceil((end - today) / 86400000)) : null;
  const progressPercent = Math.min(100, (elapsedDays / totalDays) * 100);

  // 日別コスト（直近7日）
  const getDailyCosts = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayReports = (reports || []).filter(r => r.date === dateStr);
      const cost = dayReports.reduce((sum, r) => sum +
        (r.workDetails?.inHouseWorkers?.reduce((s,w)=>s+(w.amount||0),0)||0) +
        (r.workDetails?.outsourcingLabor?.reduce((s,o)=>s+(o.amount||0),0)||0) +
        (r.workDetails?.vehicles?.reduce((s,v)=>s+(v.amount||0),0)||0) +
        (r.workDetails?.machinery?.reduce((s,m)=>s+(m.unitPrice||0),0)||0) +
        (r.wasteItems?.reduce((s,w)=>s+(w.amount||0),0)||0), 0);
      days.push({ cost, label: ['日','月','火','水','木','金','土'][d.getDay()] });
    }
    return days;
  };
  const dailyData = getDailyCosts();
  const maxCost = Math.max(...dailyData.map(d=>d.cost), 1);

  // 最近の日報
  const recentReports = [...(reports||[])].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3).map(r => ({
    date: r.date,
    workCategory: r.workDetails?.workCategory || '',
    workContent: r.workDetails?.workContent || '',
    cost: (r.workDetails?.inHouseWorkers?.reduce((s,w)=>s+(w.amount||0),0)||0) +
          (r.workDetails?.outsourcingLabor?.reduce((s,o)=>s+(o.amount||0),0)||0) +
          (r.workDetails?.vehicles?.reduce((s,v)=>s+(v.amount||0),0)||0) +
          (r.workDetails?.machinery?.reduce((s,m)=>s+(m.unitPrice||0),0)||0) +
          (r.wasteItems?.reduce((s,w)=>s+(w.amount||0),0)||0)
  }));

  const selectedSiteData = sites.find(s => s.name === selectedSite);
  const projectNumber = selectedSiteData?.projectNumber || projectInfo?.projectNumber || '';

  const card = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', transition: 'border-color 0.15s ease' };

  return (
    <div className="min-h-screen bg-black text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
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
        .logio-mini-bar { background: rgba(59,130,246,0.6); border-radius: 2px 2px 0 0; min-height: 2px; }
        .logio-activity-line { position:relative; padding-left:20px; }
        .logio-activity-line::before { content:''; position:absolute; left:3px; top:0; bottom:0; width:1px; background:rgba(255,255,255,0.06); }
        .logio-activity-dot { position:absolute; left:0; top:6px; width:7px; height:7px; border-radius:50%; background:#3B82F6; border:2px solid #000; }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 py-5">

        {/* 現場セレクター */}
        <div className="relative mb-5" ref={dropdownRef}>
          <button onClick={() => setSiteDropdownOpen(!siteDropdownOpen)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left"
            style={card}>
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
            <div className="grid grid-cols-2 gap-3 mb-6">
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

            {/* ナビボタン */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              <button onClick={() => onNavigate('input')}
                className="logio-nav-btn flex flex-col items-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">
                <Plus className="w-5 h-5" />
                <span className="font-semibold" style={{ fontSize: '11px' }}>日報入力</span>
              </button>
              {[
                { id:'list', icon:FileText, label:'日報一覧' },
                { id:'analysis', icon:BarChart3, label:'原価分析' },
                { id:'settings', icon:Settings, label:'設定' },
              ].map(({ id, icon:Icon, label }) => (
                <button key={id} onClick={() => onNavigate(id)}
                  className="logio-nav-btn flex flex-col items-center gap-2 py-4 rounded-xl transition-colors text-gray-400 hover:text-white"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Icon className="w-5 h-5" />
                  <span className="font-medium" style={{ fontSize: '11px' }}>{label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {!selectedSite && sites.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-600 text-sm mb-4">現場が登録されていません</p>
            <button onClick={() => onNavigate('settings')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors">
              現場を追加する
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ========== ★ ProjectSettingsPage ==========
function ProjectSettingsPage({ sites, selectedSite, projectInfo, setProjectInfo, onSave, onAddSite, onDeleteSite, onNavigate }) {
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [showSiteList, setShowSiteList] = useState(false); // ★ デフォルト折りたたみ
  // ★ 経費state
  const [expenseForm, setExpenseForm] = useState({ name: '', amount: '' });

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

  // ★ 経費の追加・削除
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

      {/* ★ 登録済み現場 - デフォルト折りたたみ */}
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
            <div className="px-4 py-4 rgba(255,255,255,0.02) border border-white/[0.06] rounded-md">
              <div className="text-white text-base font-semibold tabular-nums">{projectInfo.projectNumber || '未設定'}</div>
              <p className="text-xs text-gray-600 mt-1">※ 自動採番（編集不可）</p>
            </div>
          </div>

          <Select label="工事名" labelEn="Project Name" options={MASTER_DATA.projectNames} value={projectInfo.projectName} onChange={(val) => setProjectInfo({...projectInfo, projectName: val})} />
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

          {/* 固定費 */}
          <div className="mb-2 mt-6">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-white/[0.06]">固定費 / Fixed Costs</p>
          </div>
          <TextInput label="回送費" labelEn="Transfer Cost" type="number" value={projectInfo.transferCost || ''} onChange={(val) => setProjectInfo({...projectInfo, transferCost: val})} placeholder="0" />
          <TextInput label="リース費" labelEn="Lease Cost" type="number" value={projectInfo.leaseCost || ''} onChange={(val) => setProjectInfo({...projectInfo, leaseCost: val})} placeholder="0" />
          <TextInput label="資材費" labelEn="Materials Cost" type="number" value={projectInfo.materialsCost || ''} onChange={(val) => setProjectInfo({...projectInfo, materialsCost: val})} placeholder="0" />

          {/* ★ 経費セクション */}
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
                {/* 入力行 */}
                <tr style={{ background: 'rgba(59,130,246,0.04)', borderTop: '1px solid rgba(59,130,246,0.2)' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="text" value={expenseForm.name} onChange={e => setExpenseForm({...expenseForm, name: e.target.value})}
                      placeholder="例: 交通費" className="w-full bg-black text-white text-xs border border-white/10 rounded px-2 py-2 outline-none focus:border-blue-500" />
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                      placeholder="金額" className="w-full bg-black text-white text-xs border border-white/10 rounded px-2 py-2 outline-none focus:border-blue-500" />
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

          {/* 契約処分先 チェックボックス */}
          <div className="mb-6">
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-3">
              契約処分先 / Contracted Disposal Sites <span className="text-red-500">*</span>
            </label>
            <div className="rgba(255,255,255,0.02) rounded-lg p-4 border border-white/[0.08] space-y-2 max-h-80 overflow-y-auto">
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
// 共通テーブルコンポーネント
const RowTable = ({ headers, widths, children }) => (
  <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <colgroup>{widths.map((w,i) => <col key={i} style={{width:w}} />)}</colgroup>
      <thead>
        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
          {headers.map((h,i) => (
            <th key={i} style={{ padding: '6px 6px', fontSize: '9px', fontWeight: '600', color: '#4B5563', letterSpacing: '0.04em', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);
const RTd = ({ children, center, right, money, input }) => (
  <td style={{ padding: input ? '5px 5px' : '7px 6px', fontSize: '12px', color: money ? '#FCD34D' : 'rgba(255,255,255,0.85)', textAlign: center ? 'center' : right ? 'right' : 'left', borderBottom: '1px solid rgba(255,255,255,0.03)', fontVariantNumeric: money ? 'tabular-nums' : 'normal' }}>{children}</td>
);
const rSel = "w-full bg-black text-white border border-white/10 rounded px-1 py-1.5 outline-none focus:border-blue-500 text-xs";
const rInp = "w-full bg-black text-white border border-white/10 rounded px-1 py-1.5 outline-none focus:border-blue-500 text-xs";
const AddRowBtn = ({ onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{ width:'26px', height:'26px', borderRadius:'5px', border:'none', cursor: disabled?'not-allowed':'pointer', background: disabled?'rgba(255,255,255,0.04)':'#2563EB', color: disabled?'#374151':'white', fontSize:'16px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' }}>+</button>
);
const DelRowBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ width:'22px', height:'22px', borderRadius:'4px', border:'none', cursor:'pointer', background:'rgba(239,68,68,0.12)', color:'#F87171', fontSize:'11px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto' }}>✕</button>
);
const SubTotal = ({ label, value }) => value > 0 ? (
  <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 10px', background:'rgba(255,255,255,0.02)', borderRadius:'6px', marginBottom:'16px' }}>
    <span style={{ fontSize:'11px', color:'#6B7280' }}>{label}小計</span>
    <span style={{ fontSize:'13px', fontWeight:'700', color:'#60A5FA', fontVariantNumeric:'tabular-nums' }}>¥{formatCurrency(value)}</span>
  </div>
) : null;

function ReportInputPage({ onSave, onNavigate, projectInfo }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [report, setReport] = useState({ date: new Date().toISOString().split('T')[0], weather: '', recorder: '', customRecorder: '' });
  const [workDetails, setWorkDetails] = useState({ workCategory: '', workContent: '', inHouseWorkers: [], outsourcingLabor: [], vehicles: [], machinery: [], costItems: [] });
  const unitPrices = { inHouseDaytime: 25000, inHouseNighttime: 35000, inHouseNightLoading: 25000, outsourcingDaytime: 25000, outsourcingNighttime: 30000 };
  const [wasteItems, setWasteItems] = useState([]);
  const [scrapItems, setScrapItems] = useState([]);

  // 入力フォームstate（一行形式）
  const [wForm, setWForm] = useState({ name:'', start:'', end:'', shift:'daytime' });
  const [oForm, setOForm] = useState({ company:'', count:'', shift:'daytime' });
  const [vForm, setVForm] = useState({ type:'', number:'' });
  const [mForm, setMForm] = useState({ type:'', price:'' });
  const [wasteForm, setWasteForm] = useState({ type:'', disposal:'', qty:'', unit:'㎥', price:'', manifest:'' });
  const [scrapForm, setScrapForm] = useState({ type:'', buyer:'', qty:'', unit:'kg', price:'' });

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [currentStep]);

  const handleCancel = () => { if (confirm('入力内容を破棄してホーム画面に戻りますか？')) onNavigate('home'); };
  const isStep1Valid = () => report.date && ((report.recorder && report.recorder !== '__custom__') || report.customRecorder);
  const handleSave = async () => { onSave({ ...report, recorder: report.customRecorder || report.recorder, workDetails, wasteItems, scrapItems }); };

  // 登録ハンドラ
  const addWorker = () => {
    if (!wForm.name||!wForm.start||!wForm.end) return;
    const amount = wForm.shift==='nighttime'?unitPrices.inHouseNighttime:wForm.shift==='nightLoading'?unitPrices.inHouseNightLoading:unitPrices.inHouseDaytime;
    setWorkDetails({...workDetails, inHouseWorkers:[...workDetails.inHouseWorkers,{...wForm,amount}]});
    setWForm({name:'',start:'',end:'',shift:'daytime'});
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

  const shiftLabel = s => s==='nighttime'?'夜間':s==='nightLoading'?'夜積':'日勤';
  const shiftColor = s => s==='nighttime'?'#8B5CF6':s==='nightLoading'?'#6366F1':'#3B82F6';

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 bg-black min-h-screen relative pb-24">
      <button onClick={() => onNavigate('home')}
        className="fixed right-6 bottom-6 z-50 w-14 h-14 bg-black/80 hover:bg-black border-2 border-white rounded-full flex items-center justify-center shadow-lg transition-all"
        style={{ backdropFilter: 'blur(10px)' }}>
        <X className="w-6 h-6 text-white" />
      </button>

      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3].map((step) => (
          <div key={step} className={`w-3 h-3 rounded-full ${step === currentStep ? 'bg-blue-500' : step < currentStep ? 'bg-blue-300' : 'bg-gray-700'}`} />
        ))}
      </div>

      {/* ===== Step 1: 基本情報 ===== */}
      {currentStep === 1 && (
        <div>
          <SectionHeader title="基本情報 / Basic Info" />
          <div className="mb-8 rounded-lg p-4 border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">作業日 <span className="text-red-500">*</span></label>
                <input type="date" value={report.date} onChange={(e) => setReport({...report, date: e.target.value})}
                  className="w-full px-4 py-4 bg-black border border-white/[0.08] text-white text-base rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">天候 <span className="text-red-500">*</span></label>
                <select value={report.weather} onChange={(e) => setReport({...report, weather: e.target.value})}
                  className="w-full px-4 py-4 bg-black border border-white/[0.08] text-white text-base rounded-lg focus:outline-none focus:border-blue-500">
                  <option value="">選択してください</option>
                  {MASTER_DATA.weather.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">記入者 <span className="text-red-500">*</span></label>
                <select value={report.recorder} onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__custom__') { setReport({...report, recorder: '__custom__', customRecorder: ''}); }
                  else { setReport({...report, recorder: val, customRecorder: ''}); }
                }} className="w-full px-4 py-4 bg-black border border-white/[0.08] text-white text-base rounded-lg focus:outline-none focus:border-blue-500">
                  <option value="">選択してください</option>
                  {MASTER_DATA.employees.map((name) => <option key={name} value={name}>{name}</option>)}
                  <option value="__custom__">その他（手入力）</option>
                </select>
                {report.recorder === '__custom__' && (
                  <input type="text" value={report.customRecorder} onChange={e => setReport({...report, customRecorder: e.target.value})}
                    placeholder="記入者名を入力" className="w-full mt-2 px-4 py-4 bg-black border border-blue-500 text-white text-base rounded-lg focus:outline-none" autoFocus />
                )}
              </div>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <button onClick={handleCancel} className="py-4 px-4 bg-black hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-base">キャンセル</button>
            <button onClick={() => setCurrentStep(2)} disabled={!isStep1Valid()}
              className="py-4 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors font-medium text-base">次へ</button>
          </div>
        </div>
      )}

      {/* ===== Step 2: 原価明細 ===== */}
      {currentStep === 2 && (
        <div>
          <SectionHeader title="原価明細 / Cost Details" />

          {/* 施工内容 */}
          <div className="mb-6 rounded-lg p-4 border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">区分</label>
                <select value={workDetails.workCategory} onChange={(e) => setWorkDetails({...workDetails, workCategory: e.target.value})}
                  className="w-full px-3 py-3 bg-black border border-white/[0.08] text-white text-sm rounded-lg focus:outline-none focus:border-blue-500">
                  <option value="">選択</option>
                  {MASTER_DATA.workCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">内容</label>
                <input type="text" placeholder="施工内容" value={workDetails.workContent}
                  onChange={(e) => setWorkDetails({...workDetails, workContent: e.target.value})}
                  className="w-full px-3 py-3 bg-black border border-white/[0.08] text-white text-sm rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>

          {/* ---- 自社人工 ---- */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">自社人工</p>
          <RowTable headers={['氏名','開始','終了','区分','金額','']} widths={['24%','13%','13%','17%','22%','11%']}>
            {workDetails.inHouseWorkers.map((w,i) => (
              <tr key={i}>
                <RTd>{w.name}</RTd>
                <RTd center>{w.start}</RTd>
                <RTd center>{w.end}</RTd>
                <RTd center><span style={{fontSize:'9px',padding:'2px 4px',borderRadius:'3px',background:`${shiftColor(w.shift)}22`,color:shiftColor(w.shift),fontWeight:'600'}}>{shiftLabel(w.shift)}</span></RTd>
                <RTd right money>¥{formatCurrency(w.amount)}</RTd>
                <RTd center><DelRowBtn onClick={() => setWorkDetails({...workDetails, inHouseWorkers: workDetails.inHouseWorkers.filter((_,j)=>j!==i)})}/></RTd>
              </tr>
            ))}
            <tr style={{background:'rgba(59,130,246,0.04)',borderTop:'1px solid rgba(59,130,246,0.2)'}}>
              <RTd input><select value={wForm.name} onChange={e=>setWForm({...wForm,name:e.target.value})} className={rSel}><option value="">氏名</option>{MASTER_DATA.inHouseWorkers.map(n=><option key={n}>{n}</option>)}</select></RTd>
              <RTd input><select value={wForm.start} onChange={e=>setWForm({...wForm,start:e.target.value})} className={rSel}><option value="">開始</option>{MASTER_DATA.workingHoursOptions.map(t=><option key={t}>{t}</option>)}</select></RTd>
              <RTd input><select value={wForm.end} onChange={e=>setWForm({...wForm,end:e.target.value})} className={rSel}><option value="">終了</option>{MASTER_DATA.workingHoursOptions.map(t=><option key={t}>{t}</option>)}</select></RTd>
              <RTd input><select value={wForm.shift} onChange={e=>setWForm({...wForm,shift:e.target.value})} className={rSel}><option value="daytime">日勤</option><option value="nighttime">夜間</option><option value="nightLoading">夜積</option></select></RTd>
              <RTd right><span style={{fontSize:'10px',color:'#60A5FA'}}>¥{formatCurrency(wForm.shift==='nighttime'?unitPrices.inHouseNighttime:wForm.shift==='nightLoading'?unitPrices.inHouseNightLoading:unitPrices.inHouseDaytime)}</span></RTd>
              <RTd center><AddRowBtn onClick={addWorker} disabled={!wForm.name||!wForm.start||!wForm.end}/></RTd>
            </tr>
          </RowTable>
          <SubTotal label="自社人工" value={workDetails.inHouseWorkers.reduce((s,w)=>s+w.amount,0)} />

          {/* ---- 外注人工 ---- */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">外注人工</p>
          <RowTable headers={['会社名','人数','区分','金額','']} widths={['30%','14%','20%','25%','11%']}>
            {workDetails.outsourcingLabor.map((o,i) => (
              <tr key={i}>
                <RTd>{o.company}</RTd>
                <RTd center>{o.count}人</RTd>
                <RTd center><span style={{fontSize:'9px',padding:'2px 4px',borderRadius:'3px',background:`${shiftColor(o.shift)}22`,color:shiftColor(o.shift),fontWeight:'600'}}>{shiftLabel(o.shift)}</span></RTd>
                <RTd right money>¥{formatCurrency(o.amount)}</RTd>
                <RTd center><DelRowBtn onClick={() => setWorkDetails({...workDetails, outsourcingLabor: workDetails.outsourcingLabor.filter((_,j)=>j!==i)})}/></RTd>
              </tr>
            ))}
            <tr style={{background:'rgba(59,130,246,0.04)',borderTop:'1px solid rgba(59,130,246,0.2)'}}>
              <RTd input><select value={oForm.company} onChange={e=>setOForm({...oForm,company:e.target.value})} className={rSel}><option value="">会社名</option>{MASTER_DATA.outsourcingCompanies.map(c=><option key={c}>{c}</option>)}</select></RTd>
              <RTd input><input type="number" min="1" value={oForm.count} onChange={e=>setOForm({...oForm,count:e.target.value})} placeholder="人数" className={rInp}/></RTd>
              <RTd input><select value={oForm.shift} onChange={e=>setOForm({...oForm,shift:e.target.value})} className={rSel}><option value="daytime">日勤</option><option value="nighttime">夜間</option></select></RTd>
              <RTd right><span style={{fontSize:'10px',color:'#60A5FA'}}>{oForm.count?`¥${formatCurrency(parseInt(oForm.count||0)*(oForm.shift==='nighttime'?unitPrices.outsourcingNighttime:unitPrices.outsourcingDaytime))}`:'-'}</span></RTd>
              <RTd center><AddRowBtn onClick={addOutsource} disabled={!oForm.company||!oForm.count}/></RTd>
            </tr>
          </RowTable>
          <SubTotal label="外注人工" value={workDetails.outsourcingLabor.reduce((s,o)=>s+o.amount,0)} />

          {/* ---- 車両 ---- */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">車両</p>
          <RowTable headers={['車種','車番','金額','']} widths={['30%','28%','30%','12%']}>
            {workDetails.vehicles.map((v,i) => (
              <tr key={i}>
                <RTd>{v.type}</RTd>
                <RTd center>{v.number}</RTd>
                <RTd right money>¥{formatCurrency(v.amount)}</RTd>
                <RTd center><DelRowBtn onClick={() => setWorkDetails({...workDetails, vehicles: workDetails.vehicles.filter((_,j)=>j!==i)})}/></RTd>
              </tr>
            ))}
            <tr style={{background:'rgba(59,130,246,0.04)',borderTop:'1px solid rgba(59,130,246,0.2)'}}>
              <RTd input><select value={vForm.type} onChange={e=>setVForm({type:e.target.value,number:''})} className={rSel}><option value="">車種</option>{MASTER_DATA.vehicles.map(v=><option key={v}>{v}</option>)}</select></RTd>
              <RTd input><select value={vForm.number} onChange={e=>setVForm({...vForm,number:e.target.value})} className={rSel}><option value="">車番</option>{(MASTER_DATA.vehicleNumbersByType[vForm.type]||[]).map(n=><option key={n}>{n}</option>)}</select></RTd>
              <RTd right><span style={{fontSize:'10px',color:'#60A5FA'}}>{vForm.type?`¥${formatCurrency(VEHICLE_UNIT_PRICES[vForm.type]||0)}`:'-'}</span></RTd>
              <RTd center><AddRowBtn onClick={addVehicle} disabled={!vForm.type||!vForm.number}/></RTd>
            </tr>
          </RowTable>
          <SubTotal label="車両" value={workDetails.vehicles.reduce((s,v)=>s+v.amount,0)} />

          {/* ---- 重機 ---- */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">重機</p>
          <RowTable headers={['機種','単価','']} widths={['50%','38%','12%']}>
            {workDetails.machinery.map((m,i) => (
              <tr key={i}>
                <RTd>{m.type}</RTd>
                <RTd right money>¥{formatCurrency(m.unitPrice)}</RTd>
                <RTd center><DelRowBtn onClick={() => setWorkDetails({...workDetails, machinery: workDetails.machinery.filter((_,j)=>j!==i)})}/></RTd>
              </tr>
            ))}
            <tr style={{background:'rgba(59,130,246,0.04)',borderTop:'1px solid rgba(59,130,246,0.2)'}}>
              <RTd input><select value={mForm.type} onChange={e=>setMForm({...mForm,type:e.target.value})} className={rSel}><option value="">機種</option>{MASTER_DATA.heavyMachinery.map(m=><option key={m}>{m}</option>)}</select></RTd>
              <RTd input><input type="number" value={mForm.price} onChange={e=>setMForm({...mForm,price:e.target.value})} placeholder="単価" className={rInp}/></RTd>
              <RTd center><AddRowBtn onClick={addMachinery} disabled={!mForm.type||!mForm.price}/></RTd>
            </tr>
          </RowTable>
          <SubTotal label="重機" value={workDetails.machinery.reduce((s,m)=>s+m.unitPrice,0)} />

          <div className="mt-8 grid grid-cols-3 gap-3">
            <button onClick={() => setCurrentStep(1)} className="py-4 px-3 bg-black hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-base">← 戻る</button>
            <button onClick={handleCancel} className="py-4 px-3 bg-black hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-base">キャンセル</button>
            <button onClick={() => setCurrentStep(3)} className="py-4 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-base">次へ →</button>
          </div>
        </div>
      )}

      {/* ===== Step 3: 産廃・スクラップ ===== */}
      {currentStep === 3 && (
        <div>
          <SectionHeader title="産廃・スクラップ / Waste & Scrap" />
          <p className="text-sm text-gray-400 mb-6">※ない場合はそのまま保存できます</p>

          {/* ---- 産廃 ---- */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">産廃処分費</p>
          <RowTable headers={['種類','処分先','数量','単価','マニNo.','']} widths={['17%','17%','13%','13%','28%','12%']}>
            {wasteItems.map((w,i) => (
              <tr key={i}>
                <RTd>{w.material}</RTd>
                <RTd>{w.disposalSite}</RTd>
                <RTd center>{w.quantity}{w.unit}</RTd>
                <RTd right money>¥{formatCurrency(w.unitPrice)}</RTd>
                <RTd>{w.manifestNumber}</RTd>
                <RTd center><DelRowBtn onClick={() => setWasteItems(wasteItems.filter((_,j)=>j!==i))}/></RTd>
              </tr>
            ))}
            <tr style={{background:'rgba(59,130,246,0.04)',borderTop:'1px solid rgba(59,130,246,0.2)'}}>
              <RTd input><select value={wasteForm.type} onChange={e=>setWasteForm({...wasteForm,type:e.target.value})} className={rSel}><option value="">種類</option>{MASTER_DATA.wasteTypes.map(t=><option key={t}>{t}</option>)}</select></RTd>
              <RTd input><select value={wasteForm.disposal} onChange={e=>setWasteForm({...wasteForm,disposal:e.target.value})} className={rSel}><option value="">処分先</option>{(projectInfo?.contractedDisposalSites||[]).map(s=><option key={s}>{s}</option>)}</select></RTd>
              <RTd input>
                <div style={{display:'flex',gap:'2px'}}>
                  <input type="number" step="0.1" value={wasteForm.qty} onChange={e=>setWasteForm({...wasteForm,qty:e.target.value})} placeholder="数量" className={rInp} style={{width:'55%'}}/>
                  <select value={wasteForm.unit} onChange={e=>setWasteForm({...wasteForm,unit:e.target.value})} className={rSel} style={{width:'45%'}}><option value="㎥">㎥</option><option value="kg">kg</option><option value="t">t</option></select>
                </div>
              </RTd>
              <RTd input><input type="number" value={wasteForm.price} onChange={e=>setWasteForm({...wasteForm,price:e.target.value})} placeholder="単価" className={rInp}/></RTd>
              <RTd input><input type="text" value={wasteForm.manifest} onChange={e=>setWasteForm({...wasteForm,manifest:e.target.value})} placeholder="マニNo." className={rInp}/></RTd>
              <RTd center><AddRowBtn onClick={addWaste} disabled={!wasteForm.type||!wasteForm.disposal||!wasteForm.qty||!wasteForm.price||!wasteForm.manifest}/></RTd>
            </tr>
          </RowTable>
          <SubTotal label="産廃" value={wasteItems.reduce((s,w)=>s+w.amount,0)} />

          {/* ---- スクラップ ---- */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">スクラップ売上</p>
          <RowTable headers={['種類','買取業者','数量','単価','']} widths={['20%','22%','18%','18%','22%','']}>
            {scrapItems.map((s,i) => (
              <tr key={i}>
                <RTd>{s.type}</RTd>
                <RTd>{s.buyer}</RTd>
                <RTd center>{s.quantity}{s.unit}</RTd>
                <RTd right money>¥{formatCurrency(s.unitPrice)}</RTd>
                <RTd center><DelRowBtn onClick={() => setScrapItems(scrapItems.filter((_,j)=>j!==i))}/></RTd>
              </tr>
            ))}
            <tr style={{background:'rgba(59,130,246,0.04)',borderTop:'1px solid rgba(59,130,246,0.2)'}}>
              <RTd input><select value={scrapForm.type} onChange={e=>setScrapForm({...scrapForm,type:e.target.value})} className={rSel}><option value="">種類</option>{MASTER_DATA.scrapTypes.map(t=><option key={t}>{t}</option>)}</select></RTd>
              <RTd input><select value={scrapForm.buyer} onChange={e=>setScrapForm({...scrapForm,buyer:e.target.value})} className={rSel}><option value="">買取業者</option>{MASTER_DATA.buyers.map(b=><option key={b}>{b}</option>)}</select></RTd>
              <RTd input>
                <div style={{display:'flex',gap:'2px'}}>
                  <input type="number" step="0.1" value={scrapForm.qty} onChange={e=>setScrapForm({...scrapForm,qty:e.target.value})} placeholder="数量" className={rInp} style={{width:'55%'}}/>
                  <select value={scrapForm.unit} onChange={e=>setScrapForm({...scrapForm,unit:e.target.value})} className={rSel} style={{width:'45%'}}><option value="kg">kg</option><option value="㎥">㎥</option><option value="t">t</option></select>
                </div>
              </RTd>
              <RTd input><input type="number" value={scrapForm.price} onChange={e=>setScrapForm({...scrapForm,price:e.target.value})} placeholder="単価" className={rInp}/></RTd>
              <RTd center><AddRowBtn onClick={addScrap} disabled={!scrapForm.type||!scrapForm.buyer||!scrapForm.qty||!scrapForm.price}/></RTd>
            </tr>
          </RowTable>
          <SubTotal label="スクラップ" value={Math.abs(scrapItems.reduce((s,i)=>s+i.amount,0))} />

          <div className="mt-8 grid grid-cols-3 gap-3">
            <button onClick={() => setCurrentStep(2)} className="py-4 px-3 bg-black hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-base">← 戻る</button>
            <button onClick={handleCancel} className="py-4 px-3 bg-black hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-base">キャンセル</button>
            <button onClick={handleSave} className="py-4 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-base flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ========== ReportListPage ==========
function ReportListPage({ reports, onDelete, onNavigate }) {
  const [filterMonth, setFilterMonth] = useState('');

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const [filterCategory, setFilterCategory] = useState('');

  const filteredReports = reports.filter(r => {
    if (filterMonth && !r.date.startsWith(filterMonth)) return false;
    const category = r.workDetails?.workCategory || r.workCategory;
    if (filterCategory && category !== filterCategory) return false;
    return true;
  });
  const months = [...new Set(reports.map(r => r.date.substring(0, 7)))].sort().reverse();

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-4">
        <button onClick={() => onNavigate('home')}
          className="px-4 py-2 bg-black hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-sm flex items-center gap-2">
          <X className="w-4 h-4" />閉じる
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Select label="月" labelEn="Month" options={months} value={filterMonth} onChange={setFilterMonth} placeholder="全期間" />
        <Select label="作業区分" labelEn="Category" options={MASTER_DATA.workCategories} value={filterCategory} onChange={setFilterCategory} placeholder="全作業" />
      </div>
      <p className="text-sm text-gray-600 mb-4">全 {filteredReports.length}件</p>
      {filteredReports.sort((a, b) => new Date(b.date) - new Date(a.date)).map(report => (
        <ReportAccordion key={report.id} report={report} onDelete={() => onDelete(report.id)} />
      ))}
      {filteredReports.length === 0 && <p className="text-center text-gray-400 py-12">該当する日報がありません</p>}
    </div>
  );
}

function ReportAccordion({ report, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-white/[0.08] rounded-lg mb-3 overflow-hidden rgba(255,255,255,0.02)">
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
                <div className="mb-3 rgba(255,255,255,0.02) rounded p-2">
                  <p className="text-xs font-semibold text-blue-400 mb-2">自社人工: {report.workDetails.inHouseWorkers.length}名</p>
                  {report.workDetails.inHouseWorkers.map((w, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">• {w.name} <span className="text-gray-500">{w.startTime}-{w.endTime}</span> <span className="text-yellow-400">¥{formatCurrency(w.amount)}</span></p>
                  ))}
                </div>
              )}
              {report.workDetails.outsourcingLabor?.length > 0 && (
                <div className="mb-3 rgba(255,255,255,0.02) rounded p-2">
                  <p className="text-xs font-semibold text-blue-400 mb-2">外注人工: {report.workDetails.outsourcingLabor.length}件</p>
                  {report.workDetails.outsourcingLabor.map((o, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">• {o.company} <span className="text-gray-500">{o.workers}人</span> <span className="text-yellow-400">¥{formatCurrency(o.amount)}</span></p>
                  ))}
                </div>
              )}
              {report.workDetails.vehicles?.length > 0 && (
                <div className="mb-3 rgba(255,255,255,0.02) rounded p-2">
                  <p className="text-xs font-semibold text-blue-400 mb-2">車両: {report.workDetails.vehicles.length}台</p>
                  {report.workDetails.vehicles.map((v, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">• {v.type} <span className="text-gray-500">({v.number})</span> <span className="text-yellow-400">¥{formatCurrency(v.amount)}</span></p>
                  ))}
                </div>
              )}
              {report.workDetails.machinery?.length > 0 && (
                <div className="mb-3 rgba(255,255,255,0.02) rounded p-2">
                  <p className="text-xs font-semibold text-blue-400 mb-2">重機: {report.workDetails.machinery.length}台</p>
                  {report.workDetails.machinery.map((m, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">• {m.type} <span className="text-yellow-400">¥{formatCurrency(m.unitPrice)}</span></p>
                  ))}
                </div>
              )}
            </div>
          )}
          {report.wasteItems?.length > 0 && (
            <div className="mb-4 rgba(255,255,255,0.02) rounded p-2">
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
            <div className="mb-4 rgba(255,255,255,0.02) rounded p-2">
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
function ProjectPage({ projectInfo, onNavigate }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-4">
        <button onClick={() => onNavigate('home')} className="px-4 py-2 bg-black hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-sm flex items-center gap-2">
          <X className="w-4 h-4" />閉じる
        </button>
      </div>
      {projectInfo?.projectName && (
        <div className="mb-6 px-4 py-4 rgba(255,255,255,0.02) border border-white/[0.06] rounded-md">
          <div className="text-white text-lg font-bold leading-relaxed mb-2">{projectInfo.projectName}</div>
          {projectInfo.projectNumber && <div className="text-gray-500 text-xs font-medium tracking-wide">PROJECT NO.: {projectInfo.projectNumber}</div>}
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
  // 追加費用項目
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
      {projectInfo?.projectName && (
        <div className="mb-6 px-4 py-4 rgba(255,255,255,0.02) border border-white/[0.06] rounded-md">
          <div className="text-white text-lg font-bold leading-relaxed mb-2">{projectInfo.projectName}</div>
          {projectInfo.projectNumber && <div className="text-gray-500 text-xs font-medium tracking-wide">PROJECT NO.: {projectInfo.projectNumber}</div>}
        </div>
      )}
      <div className="mb-6">
        <SectionHeader title="財務サマリー / Financial Summary" />
        <div className="rgba(255,255,255,0.02) rounded-md p-5 space-y-3">
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
      <div className="mb-6 rgba(255,255,255,0.02) rounded-md p-5">
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
        <div className="rgba(255,255,255,0.02) rounded-md p-5 mb-6">
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
        <div className="rgba(255,255,255,0.02) rounded-md p-8"><p className="text-center text-gray-500 text-sm">データがありません</p></div>
      )}
      <div className="mt-8">
        <SectionHeader title="月別原価推移 / Monthly Trend" />
        {barData.length > 0 ? (
          <div className="rgba(255,255,255,0.02) rounded-md p-5">
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
          <div className="rgba(255,255,255,0.02) rounded-md p-8"><p className="text-center text-gray-500 text-sm">データがありません</p></div>
        )}
      </div>
    </div>
  );
}

// ========== ★ ExportPage（スプシ改善: 契約処分先改行 + セクション追加） ==========
function ExportPage({ sites, reports, projectInfo, selectedSite, onNavigate }) {
  const [gasUrl, setGasUrl] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [lastExport, setLastExport] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const gasUrlResult = await window.storage.get('logio-gas-url');
      const lastResult = await window.storage.get('logio-last-export');
      if (gasUrlResult?.value) setGasUrl(gasUrlResult.value);
      if (lastResult?.value) setLastExport(lastResult.value);
    };
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    if (gasUrl) await window.storage.set('logio-gas-url', gasUrl);
    setExportStatus('✅ 設定を保存しました');
    setTimeout(() => setExportStatus(''), 3000);
  };

  // ★ スプシ改善版エクスポート（契約処分先改行 + 追加費用セクション）
  const handleExportWorkReport = async () => {
    if (!gasUrl) { setExportStatus('❌ GAS URLを入力してください'); return; }
    if (!selectedSite) { setExportStatus('❌ 現場を選択してください'); return; }
    if (reports.length === 0) { setExportStatus('❌ 日報データがありません'); return; }

    setExporting(true);
    setExportStatus('📤 解体作業日報をスプレッドシートに作成中...');

    try {
      const siteData = {
        siteName: selectedSite,
        projectNumber: projectInfo.projectNumber || '',
        projectName: projectInfo.projectName || '',
        client: projectInfo.client || '',
        workLocation: projectInfo.workLocation || '',
        salesPerson: projectInfo.salesPerson || '',
        siteManager: projectInfo.siteManager || '',
        startDate: projectInfo.startDate || '',
        endDate: projectInfo.endDate || '',
        contractAmount: projectInfo.contractAmount || 0,
        additionalAmount: projectInfo.additionalAmount || 0,
        status: projectInfo.status || '',
        discharger: projectInfo.discharger || '',
        contractedDisposalSites: projectInfo.contractedDisposalSites || [],
        transferCost: projectInfo.transferCost || 0,
        leaseCost: projectInfo.leaseCost || 0,
        materialsCost: projectInfo.materialsCost || 0,
      };

      const payload = {
        action: 'exportWorkReport',
        siteData,
        reportData: reports,
      };

      await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });

      const now = new Date().toLocaleString('ja-JP');
      setLastExport(now);
      await window.storage.set('logio-last-export', now);
      setExportStatus(`✅ 解体作業日報をスプレッドシートに作成しました！（${now}）\n日報データ: ${reports.length}件`);
    } catch (error) {
      setExportStatus('❌ エクスポートに失敗しました: ' + error.message);
    } finally {
      setExporting(false);
      setTimeout(() => setExportStatus(''), 8000);
    }
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

      <div className="rgba(255,255,255,0.02) border border-white/[0.06] rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">スプレッドシート設定</h2>
        <div className="mb-4">
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">GAS URL <span className="text-red-500">*必須</span></label>
          <input type="text" value={gasUrl} onChange={(e) => setGasUrl(e.target.value)} placeholder="例: https://script.google.com/macros/s/..."
            className="w-full px-4 py-3 bg-black border border-white/[0.08] text-white text-sm rounded-md focus:outline-none focus:border-blue-500 mb-3" />
          <button onClick={handleSaveSettings} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Save className="inline w-4 h-4 mr-2" />保存
          </button>
        </div>
      </div>

      {/* ★ エクスポートデータプレビュー（スプシ改善確認用） */}
      {selectedSite && (
        <div className="rgba(255,255,255,0.02) border border-white/[0.06] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">エクスポートデータ確認</h2>

          {/* 基本情報 */}
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">基本情報</p>
          <div className="space-y-2 mb-4">
            {[
              ['現場', selectedSite],
              ['PROJECT NO.', projectInfo.projectNumber || '未設定'],
              ['発注者', projectInfo.client || '-'],
              ['工期', `${projectInfo.startDate || '-'} ～ ${projectInfo.endDate || '-'}`],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-1 border-b border-white/[0.06]">
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-xs text-white">{val}</span>
              </div>
            ))}
          </div>

          {/* 契約処分先（改行プレビュー） */}
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">契約処分先（スプシ内改行）</p>
          <div className="bg-black/60 rounded p-3 mb-4">
            {(projectInfo.contractedDisposalSites || []).length > 0 ? (
              <div className="space-y-1">
                {(projectInfo.contractedDisposalSites || []).map((site, i) => (
                  <p key={i} className="text-xs text-gray-300">↵ {site}</p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600">未設定</p>
            )}
          </div>

          {/* 追加費用セクション */}
          {(projectInfo.transferCost || projectInfo.leaseCost || projectInfo.materialsCost) && (
            <>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">追加費用セクション（スプシ新規追加）</p>
              <div className="space-y-2 mb-4">
                {[
                  ['回送費', projectInfo.transferCost],
                  ['リース費', projectInfo.leaseCost],
                  ['資材費', projectInfo.materialsCost],
                ].filter(([, v]) => v).map(([label, val]) => (
                  <div key={label} className="flex justify-between py-1 border-b border-white/[0.06]">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-xs text-white">¥{formatCurrency(parseFloat(val))}</span>
                  </div>
                ))}
                <div className="flex justify-between py-1">
                  <span className="text-xs font-semibold text-gray-400">追加費用合計</span>
                  <span className="text-xs font-semibold text-blue-400">
                    ¥{formatCurrency((parseFloat(projectInfo.transferCost)||0) + (parseFloat(projectInfo.leaseCost)||0) + (parseFloat(projectInfo.materialsCost)||0))}
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="text-xs text-gray-500">日報データ: {reports.length}件</div>
        </div>
      )}

      <div className="rgba(255,255,255,0.02) border border-white/[0.06] rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">解体作業日報</h2>
        <p className="text-gray-400 text-sm mb-4">LOGIO仕様の解体作業日報をスプレッドシートに自動生成します</p>
        <button onClick={handleExportWorkReport} disabled={exporting || !gasUrl || !selectedSite}
          className={`w-full px-6 py-4 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            exporting || !gasUrl || !selectedSite ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
          <FileText className="w-5 h-5" />
          {exporting ? '作成中...' : '解体作業日報をスプシに作成'}
        </button>
        {exportStatus && (
          <div className={`mt-4 p-3 rounded-lg text-sm whitespace-pre-line ${
            exportStatus.startsWith('✅') ? 'bg-green-900/30 text-green-400 border border-green-800' :
            exportStatus.startsWith('❌') ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-blue-900/30 text-blue-400 border border-blue-800'
          }`}>{exportStatus}</div>
        )}
      </div>

      <div className="rgba(255,255,255,0.02) border border-white/[0.06] rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">ステータス</h2>
        <div className="space-y-3 text-sm">
          {[['最終エクスポート', lastExport || '未実行'], ['現場', selectedSite || '未選択'], ['日報データ', `${reports.length}件`]].map(([label, val]) => (
            <div key={label} className="flex justify-between py-2 border-b border-white/[0.06] last:border-b-0">
              <span className="text-gray-400">{label}</span>
              <span className="text-white font-medium">{val}</span>
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

  useEffect(() => {
    const loadAllReports = async () => {
      try {
        const sitesList = await window.storage.get('logio-sites');
        if (sitesList?.value) {
          const sites = JSON.parse(sitesList.value);
          for (const site of sites) {
            const stored = await window.storage.get(`logio-reports-${site.name}`);
            if (stored?.value) {
              const reports = JSON.parse(stored.value);
              if (reports.some(r => r.id === report.id)) {
                setAllReports(reports.sort((a, b) => new Date(a.date) - new Date(b.date)));
                break;
              }
            }
          }
        }
      } catch (error) { setAllReports([report]); }
      setLoading(false);
    };
    loadAllReports();
  }, [report]);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><p className="text-gray-400">読み込み中...</p></div>;

  const totalInHouseWorkers = allReports.reduce((sum, r) => sum + (r.workDetails?.inHouseWorkers?.length || 0), 0);
  const totalInHouseCost = allReports.reduce((sum, r) => sum + (r.workDetails?.inHouseWorkers || []).reduce((s, w) => s + (w.amount || 0), 0), 0);
  const totalOutsourcingWorkers = allReports.reduce((sum, r) => sum + (r.workDetails?.outsourcingLabor || []).reduce((s, o) => s + (o.workers || 0), 0), 0);
  const totalOutsourcingCost = allReports.reduce((sum, r) => sum + (r.workDetails?.outsourcingLabor || []).reduce((s, o) => s + (o.amount || 0), 0), 0);
  const totalVehicleCost = allReports.reduce((sum, r) => sum + (r.workDetails?.vehicles || []).reduce((s, v) => s + (v.amount || 0), 0), 0);
  const totalMachineryCost = allReports.reduce((sum, r) => sum + (r.workDetails?.machinery || []).reduce((s, m) => s + (m.unitPrice || 0), 0), 0);
  const totalWasteCost = allReports.reduce((sum, r) => sum + (r.wasteItems || []).reduce((s, w) => s + (w.amount || 0), 0), 0);
  const totalScrapRevenue = allReports.reduce((sum, r) => sum + Math.abs((r.scrapItems || []).reduce((s, sc) => s + (sc.amount || 0), 0)), 0);
  const totalRevenue = (parseFloat(projectInfo.contractAmount) || 0) + (parseFloat(projectInfo.additionalAmount) || 0);
  const totalCost = totalInHouseCost + totalOutsourcingCost + totalVehicleCost + totalMachineryCost + totalWasteCost;
  const grossProfit = totalRevenue - totalCost + totalScrapRevenue;

  const fmtDate = (dateStr) => { if (!dateStr) return ''; const p = dateStr.split('-'); return `${parseInt(p[1])}/${parseInt(p[2])}`; };
  const fmtDay = (dateStr) => { if (!dateStr) return ''; return ['日','月','火','水','木','金','土'][new Date(dateStr).getDay()]; };

  const MAX_ROWS = 20;
  const displayReports = allReports.slice(0, MAX_ROWS);
  const emptyRows = MAX_ROWS - displayReports.length;

  return (
    <div className="min-h-screen bg-black">
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
          body, html { margin: 0 !important; padding: 0 !important; background: white !important; }
          @page { size: A3 landscape; margin: 8mm; }
          .pdf-container { background: white !important; color: black !important; padding: 0 !important; }
          .pdf-title { color: black !important; border-color: black !important; }
          .pdf-table th, .pdf-table td, .pdf-header-table th, .pdf-header-table td, .result-table th, .result-table td { border-color: #000 !important; color: #000 !important; }
          .pdf-table th, .pdf-header-table th, .result-table th { background: #f0f0f0 !important; color: #333 !important; }
          .pdf-table td, .pdf-header-table td, .result-table td { background: white !important; }
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

      <div className="pdf-container bg-black p-6 overflow-x-auto" style={{ minWidth: '1100px' }}>
        <div style={{ width: '1100px', margin: '0 auto' }}>
          <div className="text-center mb-3">
            <h1 className="pdf-title text-xl font-black tracking-[0.3em] text-white border-b-2 border-gray-600 pb-2 inline-block px-8">解　体　作　業　日　報</h1>
            <p className="text-right text-gray-500 text-[9px] mt-1 mr-2">EMS-記-22</p>
          </div>

          <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: '320px 240px 240px 1fr' }}>
            <table className="pdf-header-table">
              <tbody>
                {[['発注者', projectInfo.client], ['工事名', projectInfo.projectName], ['住所', projectInfo.workLocation], ['工期', `${projectInfo.startDate} ～ ${projectInfo.endDate}`], ['営業担当', projectInfo.salesPerson], ['責任者', projectInfo.siteManager]].map(([k, v]) => (
                  <tr key={k}><th>{k}</th><td>{v || ''}</td></tr>
                ))}
              </tbody>
            </table>
            <table className="pdf-header-table">
              <tbody>
                <tr><th>排出事業者</th><td>{projectInfo.discharger || ''}</td></tr>
                {/* ★ 契約処分先: 改行区切りで表示 */}
                <tr>
                  <th>契約処分先</th>
                  <td className="text-[8px]" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {(projectInfo.contractedDisposalSites || []).join('\n')}
                  </td>
                </tr>
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
                    ['見積金額', totalRevenue],
                    ['原価金額', totalCost],
                    ['外注金額', totalOutsourcingCost],
                    ['追加金額', parseFloat(projectInfo.additionalAmount) || 0],
                    ...(projectInfo.transferCost ? [['回送費', parseFloat(projectInfo.transferCost)]] : []),
                    ...(projectInfo.leaseCost ? [['リース費', parseFloat(projectInfo.leaseCost)]] : []),
                    ...(projectInfo.materialsCost ? [['資材費', parseFloat(projectInfo.materialsCost)]] : []),
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
                <th rowSpan="2" style={{ width: '30px' }}>日数</th>
                <th rowSpan="2" style={{ width: '55px' }}>日付</th>
                <th rowSpan="2" style={{ width: '20px' }}>曜</th>
                <th rowSpan="2" style={{ width: '20px' }}>天候</th>
                <th rowSpan="2" style={{ width: '25px' }}>区分</th>
                <th rowSpan="2" style={{ minWidth: '120px' }}>施工内容</th>
                <th colSpan="2">作業時間</th>
                <th colSpan="2">自社人工</th>
                <th colSpan="2">外注人工</th>
                <th colSpan="2">車両</th>
                <th rowSpan="2" style={{ width: '50px' }}>重機</th>
                <th colSpan="5">産廃・スクラップ</th>
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
                const startTimes = workers.map(w => w.startTime).filter(Boolean).sort();
                const endTimes = workers.map(w => w.endTime).filter(Boolean).sort().reverse();
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
                        <td className="text-[8px]">{outsourcing[subIdx] ? `${outsourcing[subIdx].company} ${outsourcing[subIdx].workers}人` : ''}</td>
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
  const [password, setPassword] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [projectInfo, setProjectInfo] = useState({
    projectId: '', projectNumber: '', projectName: '', client: '', workLocation: '',
    salesPerson: '', siteManager: '', startDate: '', endDate: '',
    contractAmount: '', additionalAmount: '', status: '進行中',
    discharger: '', contractedDisposalSites: [],
    transferCost: '', leaseCost: '', materialsCost: ''
  });
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, [showSplash]);

  useEffect(() => { if (isLoggedIn) loadSites(); }, [isLoggedIn]);

  const loadSites = async () => {
    try {
      const stored = await window.storage.get('logio-sites');
      if (stored?.value) {
        const loadedSites = JSON.parse(stored.value);
        const sitesWithNumbers = await Promise.all(
          loadedSites.map(async (site) => {
            try {
              const projectStored = await window.storage.get(`logio-project-${site.name}`);
              if (projectStored?.value) {
                const projectData = JSON.parse(projectStored.value);
                return { ...site, projectNumber: projectData.projectNumber || '' };
              }
            } catch (error) {}
            return { ...site, projectNumber: '' };
          })
        );
        setSites(sitesWithNumbers);
      }
    } catch (error) { console.log('初回起動'); }
  };

  const generateProjectNumber = async () => {
    const currentYear = new Date().getFullYear();
    const allProjectNumbers = [];
    for (const site of sites) {
      try {
        const stored = await window.storage.get(`logio-project-${site.name}`);
        if (stored?.value) {
          const projectData = JSON.parse(stored.value);
          if (projectData.projectNumber) allProjectNumbers.push(projectData.projectNumber);
        }
      } catch (error) {}
    }
    const currentYearNumbers = allProjectNumbers
      .filter(num => num.startsWith(currentYear + '-'))
      .map(num => { const parts = num.split('-'); return parts.length === 2 ? parseInt(parts[1], 10) : 0; })
      .filter(num => !isNaN(num));
    const maxNumber = currentYearNumbers.length > 0 ? Math.max(...currentYearNumbers) : 0;
    return `${currentYear}-${(maxNumber + 1).toString().padStart(3, '0')}`;
  };

  const handleLogin = (user) => {
    setCurrentUser(user); setIsLoggedIn(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      setIsLoggedIn(false); setCurrentUser(null); setSelectedSite(''); setSidebarOpen(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleAddSite = async (siteName) => {
    try {
      const projectNumber = await generateProjectNumber();
      const newSite = { name: siteName, createdAt: new Date().toISOString(), status: '進行中', projectNumber };
      const updatedSites = [...sites, newSite];
      setSites(updatedSites);
      await window.storage.set('logio-sites', JSON.stringify(updatedSites));
      const initialProjectInfo = {
        projectId: '', projectNumber, projectName: siteName, client: '', workLocation: '',
        salesPerson: '', siteManager: '', startDate: '', endDate: '',
        contractAmount: '', additionalAmount: '', status: '進行中',
        discharger: '', contractedDisposalSites: [],
        transferCost: '', leaseCost: '', materialsCost: ''
      };
      await window.storage.set(`logio-project-${siteName}`, JSON.stringify(initialProjectInfo));
      setSelectedSite(siteName); setProjectInfo(initialProjectInfo);
      alert(`✅ 現場「${siteName}」を追加しました\nPROJECT NO.: ${projectNumber}`);
    } catch (error) { alert('❌ 現場の追加に失敗しました'); }
  };

  const handleDeleteSite = async (siteName) => {
    try {
      const updatedSites = sites.filter(s => s.name !== siteName);
      setSites(updatedSites);
      await window.storage.set('logio-sites', JSON.stringify(updatedSites));
      await window.storage.delete(`logio-project-${siteName}`);
      await window.storage.delete(`logio-reports-${siteName}`);
      if (selectedSite === siteName) setSelectedSite('');
      alert(`✅ 現場「${siteName}」を削除しました`);
    } catch (error) { alert('❌ 現場の削除に失敗しました'); }
  };

  const handleSelectSite = async (siteName) => {
    setSelectedSite(siteName);
    await loadProjectInfo(siteName);
    await loadReports(siteName);
  };

  const loadProjectInfo = async (siteName) => {
    try {
      const stored = await window.storage.get(`logio-project-${siteName}`);
      if (stored?.value) setProjectInfo(JSON.parse(stored.value));
      else setProjectInfo({
        projectId: '', projectNumber: '', projectName: '', client: '', workLocation: '',
        salesPerson: '', siteManager: '', startDate: '', endDate: '',
        contractAmount: '', additionalAmount: '', status: '進行中',
        discharger: '', contractedDisposalSites: [],
        transferCost: '', leaseCost: '', materialsCost: ''
      });
    } catch (error) {}
  };

  const loadReports = async (siteName) => {
    try {
      const stored = await window.storage.get(`logio-reports-${siteName}`);
      setReports(stored?.value ? JSON.parse(stored.value) : []);
    } catch (error) { setReports([]); }
  };

  const handleSaveProject = async () => {
    if (!selectedSite) return alert('現場を選択してください');
    try {
      const updatedInfo = { ...projectInfo, projectId: projectInfo.projectId || generateId('P'), updatedAt: new Date().toISOString() };
      await window.storage.set(`logio-project-${selectedSite}`, JSON.stringify(updatedInfo));
      setProjectInfo(updatedInfo);
      alert('✅ プロジェクト情報を保存しました');
      setCurrentPage('home');
    } catch (error) { alert('❌ 保存に失敗しました'); }
  };

  const handleSaveReport = async (reportData) => {
    if (!selectedSite) return alert('現場を選択してください');
    try {
      const newReport = { id: Date.now(), reportId: generateId('R'), projectId: projectInfo.projectId || generateId('P'), ...reportData, createdAt: new Date().toISOString() };
      const updatedReports = [...reports, newReport];
      setReports(updatedReports);
      await window.storage.set(`logio-reports-${selectedSite}`, JSON.stringify(updatedReports));
      alert('✅ 日報を保存しました');
      window.scrollTo({ top: 0, behavior: 'instant' });
      setCurrentPage('home');
    } catch (error) { alert('❌ 保存に失敗しました'); }
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm('この日報を削除しますか？')) return;
    try {
      const updatedReports = reports.filter(r => r.id !== reportId);
      setReports(updatedReports);
      await window.storage.set(`logio-reports-${selectedSite}`, JSON.stringify(updatedReports));
      alert('✅ 日報を削除しました');
    } catch (error) { alert('❌ 削除に失敗しました'); }
  };

  const calculateTotals = () => {
    const totalRevenue = (parseFloat(projectInfo.contractAmount) || 0) + (parseFloat(projectInfo.additionalAmount) || 0);
    let accumulatedCost = 0;
    let accumulatedScrap = 0;
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
    // ★ 追加費用も原価に含める
    accumulatedCost += (parseFloat(projectInfo.transferCost) || 0);
    accumulatedCost += (parseFloat(projectInfo.leaseCost) || 0);
    accumulatedCost += (parseFloat(projectInfo.materialsCost) || 0);

    const grossProfit = totalRevenue - accumulatedCost + accumulatedScrap;
    const grossProfitRateContract = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(1) : '0.0';
    const grossProfitRateWithScrap = (totalRevenue + accumulatedScrap) > 0 ? (grossProfit / (totalRevenue + accumulatedScrap) * 100).toFixed(1) : '0.0';
    return { totalRevenue, accumulatedCost, accumulatedScrap, grossProfit, grossProfitRateContract, grossProfitRateWithScrap };
  };

  const handleNavigate = (page) => {
    if (page === 'settings') { setShowPasswordModal(true); setPassword(''); }
    else setCurrentPage(page);
  };

  const handlePasswordSubmit = () => {
    if (password === 'face1991') { setShowPasswordModal(false); setPassword(''); setCurrentPage('settings'); }
    else { alert('❌ パスワードが正しくありません'); setPassword(''); }
  };

  const totals = calculateTotals();
  window.__navigatePDF = (report) => { setSelectedReport(report); setCurrentPage('pdf'); window.scrollTo({ top: 0, behavior: 'instant' }); };

  if (showSplash) return <SplashScreen />;
  if (!isLoggedIn) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onLogout={handleLogout} />
      <div className="flex flex-col flex-1 bg-black">
        <Header showMenuButton onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1">
          {currentPage === 'home' && (
            <HomePage
              sites={sites} selectedSite={selectedSite} onSelectSite={handleSelectSite}
              onNavigate={handleNavigate} totals={totals} projectInfo={projectInfo} reports={reports}
            />
          )}
          {currentPage === 'settings' && (
            <ProjectSettingsPage
              sites={sites} selectedSite={selectedSite} projectInfo={projectInfo}
              setProjectInfo={setProjectInfo} onSave={handleSaveProject}
              onAddSite={handleAddSite} onDeleteSite={handleDeleteSite} onNavigate={setCurrentPage}
            />
          )}
          {currentPage === 'input' && <ReportInputPage onSave={handleSaveReport} onNavigate={setCurrentPage} projectInfo={projectInfo} />}
          {currentPage === 'list' && <ReportListPage reports={reports} onDelete={handleDeleteReport} onNavigate={setCurrentPage} />}
          {currentPage === 'analysis' && <AnalysisPage reports={reports} totals={totals} projectInfo={projectInfo} onNavigate={setCurrentPage} />}
          {currentPage === 'project' && <ProjectPage projectInfo={projectInfo} onNavigate={setCurrentPage} />}
          {currentPage === 'export' && <ExportPage sites={sites} reports={reports} projectInfo={projectInfo} selectedSite={selectedSite} onNavigate={setCurrentPage} />}
          {currentPage === 'pdf' && selectedReport && <ReportPDFPage report={selectedReport} projectInfo={projectInfo} onNavigate={setCurrentPage} />}
        </main>
      </div>
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
    </div>
  );
}
