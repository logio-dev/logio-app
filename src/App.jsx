import React, { useState, useEffect, useRef, Fragment } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Save, Trash2, BarChart3, FileText, Settings, Menu, X, Home, Check, LogOut } from 'lucide-react';

console.log('✅ LOGIO: Module loaded successfully');

console.log('✅ LOGIO: Module loaded successfully');

// ========== localStorage ラッパー ==========
if (typeof window !== 'undefined') {
  window.storage = {
    async get(key) {
      try {
        const value = localStorage.getItem(key);
        return value ? { key, value, shared: false } : null;
      } catch (error) {
        console.error('localStorage.getItem error:', error);
        return null;
      }
    },
    async set(key, value) {
      try {
        localStorage.setItem(key, value);
        return { key, value, shared: false };
      } catch (error) {
        console.error('localStorage.setItem error:', error);
        return null;
      }
    },
    async delete(key) {
      try {
        localStorage.removeItem(key);
        return { key, deleted: true, shared: false };
      } catch (error) {
        console.error('localStorage.removeItem error:', error);
        return { key, deleted: false, shared: false };
      }
    },
    async list(prefix) {
      try {
        const keys = Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix));
        return { keys, prefix, shared: false };
      } catch (error) {
        console.error('localStorage.keys error:', error);
        return { keys: [], prefix, shared: false };
      }
    }
  };
}

// ========== LOGIOロゴ ==========
function LOGIOLogo({ className = "", size = "md", animated = false }) {
  const sizeStyles = {
    xs: "text-lg",
    sm: "text-xl",
    md: "text-4xl",
    lg: "text-5xl",
    xl: "text-6xl"
  };
  
  const elephantSizes = {
    xs: 40,
    sm: 50,
    md: 90,
    lg: 120,
    xl: 150
  };
  
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@900&display=swap');
        
        .logio-char {
          display: inline-block;
          opacity: ${animated ? 0 : 1};
        }
        
        ${animated ? `
        .logio-char-animated {
          animation: charFloatUpCinematic 1.8s ease-in-out forwards;
        }
        
        .logio-char-0 { animation-delay: 0s; }
        .logio-char-1 { animation-delay: 0.25s; }
        .logio-char-2 { animation-delay: 0.5s; }
        .logio-char-3 { animation-delay: 0.75s; }
        .logio-char-4 { animation-delay: 1.0s; }
        
        @keyframes charFloatUpCinematic {
          0% {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
          50% {
            opacity: 0.5;
          }
          70% {
            opacity: 1;
            transform: translateY(-8px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .elephant-silhouette {
          opacity: 0;
          animation: elephantCinematicEntry 2.5s ease-in-out 1.2s forwards;
        }
        
        @keyframes elephantCinematicEntry {
          0% {
            opacity: 0;
            transform: scale(0.7) translateY(20px);
          }
          40% {
            opacity: 0.06;
          }
          100% {
            opacity: 0.12;
            transform: scale(1) translateY(0);
          }
        }
        ` : ''}
        
        .elephant-static {
          opacity: 0.12;
        }
      `}</style>
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        <div className={`absolute inset-0 flex items-center justify-center ${animated ? 'elephant-silhouette' : 'elephant-static'}`}>
          <svg width={elephantSizes[size]} height={elephantSizes[size]} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <g>
              <rect x="70" y="80" width="80" height="60" rx="30" fill="#ffffff" opacity="0.12"/>
              <circle cx="90" cy="70" r="35" fill="#ffffff" opacity="0.12"/>
              <ellipse cx="65" cy="60" rx="20" ry="30" fill="#ffffff" opacity="0.12"/>
              <ellipse cx="115" cy="60" rx="20" ry="30" fill="#ffffff" opacity="0.12"/>
              <path 
                d="M 90,95 Q 85,110 75,125 Q 70,135 65,145 Q 60,155 55,165"
                stroke="#ffffff" 
                strokeWidth="12" 
                fill="none" 
                opacity="0.12"
                strokeLinecap="round"
              />
              <rect x="75" y="135" width="12" height="30" rx="6" fill="#ffffff" opacity="0.12"/>
              <rect x="95" y="135" width="12" height="30" rx="6" fill="#ffffff" opacity="0.12"/>
              <rect x="115" y="135" width="12" height="30" rx="6" fill="#ffffff" opacity="0.12"/>
              <rect x="135" y="135" width="12" height="30" rx="6" fill="#ffffff" opacity="0.12"/>
              <path 
                d="M 150,110 Q 155,115 158,125"
                stroke="#ffffff" 
                strokeWidth="5" 
                fill="none" 
                opacity="0.12"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>
        
        <span 
          className={`text-white ${sizeStyles[size]} relative z-10`}
          style={{ 
            fontFamily: 'Roboto Condensed, -apple-system, BlinkMacSystemFont, sans-serif',
            fontWeight: 900,
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}
        >
          <span className={`logio-char ${animated ? 'logio-char-animated logio-char-0' : ''}`}>L</span>
          <span className={`logio-char ${animated ? 'logio-char-animated logio-char-1' : ''}`}>O</span>
          <span className={`logio-char ${animated ? 'logio-char-animated logio-char-2' : ''}`}>G</span>
          <span className={`logio-char ${animated ? 'logio-char-animated logio-char-3' : ''}`}>I</span>
          <span className={`logio-char ${animated ? 'logio-char-animated logio-char-4' : ''}`}>O</span>
        </span>
      </div>
    </>
  );
}

const amountStrokeStyle = {
  textShadow: '0 0 3px rgba(0,0,0,0.9), 0 0 5px rgba(0,0,0,0.7), 1px 1px 3px rgba(0,0,0,1), -1px -1px 3px rgba(0,0,0,1)'
};

// ========== マスタデータ（MM興業追加、撤去・養生削除） ==========
const MASTER_DATA = {
  projectNames: ['内装解体', 'スケルトン解体', '建物解体', '外装解体', '外構解体', 'アスベスト除去', '設備解体', '躯体解体'],
  salesPersons: ['間野', '八ツ田', '木嶋', '西', '鈴木', '原'],
  employees: ['五十嵐悠哉', '折田優作', '稲葉正輝', '井ケ田浩寿', '大野勝也', '石森達也', '一村琢磨', '間野昂平'],
  inHouseWorkers: ['五十嵐悠哉', '井ケ田浩寿', '稲葉正輝', '石森達也', '一村琢磨', '間野昂平', '折田優作', '大野勝也'],
  outsourcingCompanies: ['TCY興業', 'ALTEQ', '山田興業', '川田工業', 'マルカイ工業', 'MM興業'],
  weather: ['晴', '曇', '雨', '雪'],
  workCategories: ['解体', '清掃', '積込', '搬出'],
  vehicles: ['軽バン', '2td', '3td', '4td', '4tc', '8tc', '増td', '10tc'],
  vehicleNumbersByType: {
    '軽バン': ['た1'],
    '2td': ['77', '201'],
    '3td': ['8736', '55', '3122', '66', '4514', '33', '3000', '1000', '6000', '44'],
    '4td': ['6994'],
    '4tc': ['2265', '11', '3214', '858', '8000', '4000', '5000', '8025', '88'],
    '8tc': ['7000'],
    '増td': ['22'],
    '10tc': ['181', '381']
  },
  vehicleNumbers: ['100', '181', '200', '201', '226', '300', '312', '381', '451', '480', '500', '858', '909', '1000', '1100', '1810', '2000', '3000', '3214', '3381', '3648', '4000', '4514', '4803', '5000', '5888', '6000', '6994', '7000', '7567', '8000', '8025', '8580', '8736', '9272'],
  heavyMachinery: ['PC78US', 'PC138US', 'その他（フリー入力）'],
  workingHoursOptions: (() => {
    const options = [];
    for (let hours = 0; hours <= 24; hours++) {
      for (let minutes = 0; minutes < 60; minutes += 30) {
        if (hours === 24 && minutes > 0) break;
        const h = String(hours).padStart(2, '0');
        const m = String(minutes).padStart(2, '0');
        options.push(`${h}:${m}`);
      }
    }
    return options;
  })(),
  costCategories: {
    '材料費': ['養生材', '仮設材', '消耗品', '燃料費'],
    '外注費': ['人工', '重機リース', '車両リース', '専門工事'],
    '経費': ['駐車代', '交通費', '通信費', '事務用品', '道具代', 'その他']
  },
  wasteTypes: ['混合廃棄物', '木くず', '廃プラ', 'がら陶', 'コンクリートがら', '金属くず', '石膏ボード', 'ガラス'],
  disposalSites: ['木村建材', '二光産業', 'ギプロ', 'ウムヴェルト', '日栄興産', '戸部組', 'リバー', 'ワイエムエコフューチャー', '東和アークス', 'ヤマゼン', '入間緑化', '石坂産業'],
  scrapTypes: ['鉄くず', '銅線', 'アルミ', 'ステンレス', '真鍮'],
  buyers: ['小林金属', '高橋金属', 'ナンセイスチール', '服部金属', 'サンビーム', '光田産業', '青木商店', '長沼商事'],
  statuses: ['進行中', '完了', '中断']
};

const VEHICLE_UNIT_PRICES = {
  '軽バン': 0,
  '2td': 10000,
  '3td': 10000,
  '4td': 15000,
  '4tc': 15000,
  '8tc': 20000,
  '増td': 20000,
  '10tc': 20000
};

// ========== 共通コンポーネント ==========

function Header({ title, showMenuButton = false, onMenuClick }) {
  return (
    <header className="bg-black px-6 py-5 flex items-center sticky top-0 z-40 border-b border-gray-900">
      {showMenuButton && (
        <button onClick={onMenuClick} className="mr-4 text-white hover:text-gray-300 transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8H21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M6 16H18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
      
      <LOGIOLogo size="xs" />
      {title && <span className="ml-4 text-gray-400 text-sm font-medium">{title}</span>}
    </header>
  );
}

function Select({ label, labelEn, options, value, onChange, placeholder = "選択してください", required = false }) {
  return (
    <div className="mb-6">
      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label} / {labelEn} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border-2 border-gray-300 text-black text-base font-medium focus:outline-none focus:border-blue-900"
        required={required}
      >
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };
  
  return (
    <div className="mb-6 relative" ref={dropdownRef}>
      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label} / {labelEn}
      </label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-md text-left focus:outline-none focus:border-blue-500 transition-colors relative"
      >
        {selectedOption ? (
          <div>
            <div className="text-white text-base font-medium">{selectedOption.title}</div>
            {selectedOption.subtitle && (
              <div className="text-gray-500 text-xs mt-1">{selectedOption.subtitle}</div>
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-base">{placeholder}</div>
        )}
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-xl max-h-80 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className="w-full px-4 py-3 text-left hover:bg-blue-600 transition-colors border-b border-gray-800 last:border-b-0 relative"
            >
              <div className="pr-8">
                <div className="text-white text-base font-medium">{option.title}</div>
                {option.subtitle && (
                  <div className="text-gray-500 text-xs mt-1">{option.subtitle}</div>
                )}
              </div>
              {value === option.value && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Part1の残りのコンポーネント...
// (TextInput, NumericInput, Button, MetricCardなど)

function TextInput({ label, labelEn, value, onChange, placeholder = "", type = "text", required = false }) {
  return (
    <div className="mb-4">
      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label} / {labelEn} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-white border-2 border-gray-300 text-black text-base font-medium focus:outline-none focus:border-blue-900"
        required={required}
      />
    </div>
  );
}

function Button({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled = false }) {
  const baseClass = "w-full px-6 py-4 font-bold text-lg transition-all flex items-center justify-center gap-2";
  const variants = {
    primary: disabled ? "bg-gray-400 text-gray-200 cursor-not-allowed" : "bg-blue-900 text-white hover:bg-blue-800",
    secondary: "bg-white text-black border-2 border-gray-300 hover:bg-gray-100",
    danger: "bg-red-600 text-white hover:bg-red-500"
  };
  
  return (
    <button onClick={onClick} className={`${baseClass} ${variants[variant]} ${className}`} disabled={disabled}>
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  );
}

function MetricCard({ label, value, unit = "", type = "neutral", rawValue = 0, subValue = null, subLabel = null }) {
  const styles = {
    neutral: "bg-gray-900/50",
    revenue: "bg-gray-900/50",
    cost: "bg-gray-900/50",
    profit: "bg-gray-900/50",
    rate: "bg-gray-900/50",
    scrap: "bg-gray-900/50"
  };

  const textStyles = {
    neutral: "text-white",
    revenue: "text-white",
    cost: "text-red-400/80",
    profit: rawValue > 0 ? "text-blue-400/90" : "text-red-400/80",
    rate: "text-white",
    scrap: "text-white"
  };

  return (
    <div className={`${styles[type]} rounded-md p-4 flex flex-col gap-2`}>
      <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">{label}</p>
      <div>
        <p className={`text-xl font-semibold ${textStyles[type]} tabular-nums`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
          {unit}{value}
        </p>
        {subValue && (
          <p className="text-gray-500 text-xs mt-1 tabular-nums">
            {subLabel && <span className="mr-1">{subLabel}</span>}
            {subValue}
          </p>
        )}
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

const generateId = (prefix) => {
  if (crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const formatCurrency = (num) => new Intl.NumberFormat('ja-JP').format(num);

const getDayOfWeek = (dateStr) => {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const date = new Date(dateStr);
  return days[date.getDay()];
};

// Part1ここまで
// サイドバー（ログアウトボタン付き）
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

  const handleNavigate = (page) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-black border-r border-gray-900">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none"
              >
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
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full group flex items-center px-3 py-3 text-sm font-medium transition-colors min-h-[48px] ${
                        currentPage === item.id
                          ? 'bg-white text-black'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
            
            {/* ログアウトボタン - グラスモーフィズム + 矢印 */}
            <div className="p-4 border-t border-gray-800">
              <button
                onClick={onLogout}
                className="w-full px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors flex items-center gap-3 rounded-lg"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                }}
              >
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

// スプラッシュ画面（左上移動アニメーション削除）
function SplashScreen() {
  return (
    <>
      <style>{`
        @keyframes fadeInOut {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        
        .splash-container {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: black;
          animation: fadeInOut 3s ease-in-out forwards;
        }
      `}</style>
      <div className="splash-container">
        <LOGIOLogo size="md" animated={true} />
      </div>
    </>
  );
}

// ログイン画面（種別削除、色統一、プレースホルダー変更）
function LoginPage({ onLogin }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    
    // 自社ログイン判定
    if ((userId === 'face1991' && password === 'face1991') ||
        (userId === 'ryokuka2005' && password === 'ryokuka2005')) {
      onLogin({ type: 'company', userId });
      return;
    }
    
    // 協力会社ログイン判定
    const validPartnerIds = ['TCY001', 'ALT001', 'YMD001', 'KWD001', 'MRK001', 'MM001'];
    if (validPartnerIds.includes(userId)) {
      const expectedPass = userId.toLowerCase();
      if (password === expectedPass) {
        onLogin({ type: 'partner', userId });
        return;
      }
    }
    
    setError('IDまたはパスワードが正しくありません');
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center justify-center mb-10">
          <LOGIOLogo size="lg" />
        </div>
        
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
          <div className="mb-6">
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
              ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="IDを入力"
              className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="パスワードを入力"
              className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          
          {error && (
            <div className="mb-6 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <button
            onClick={handleLogin}
            className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-base transition-colors"
          >
            ログイン
          </button>
        </div>
      </div>
    </div>
  );
}

// ホームページ
function HomePage({ sites, selectedSite, onSelectSite, onNavigate, totals, projectInfo }) {
  const siteOptions = sites.map(site => ({
    value: site.name,
    title: site.name,
    subtitle: site.projectNumber ? `PROJECT NO.: ${site.projectNumber}` : 'PROJECT NO.: -'
  }));
  
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 bg-black min-h-screen">
      <DarkSelect
        label="現場"
        labelEn="PROJECT"
        options={siteOptions}
        value={selectedSite}
        onChange={onSelectSite}
        placeholder="現場を選択してください"
      />

      {selectedSite && (
        <>
          <div className="mb-3">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="売上 / Revenue" value={formatCurrency(totals.totalRevenue)} unit="¥" type="revenue" rawValue={totals.totalRevenue} />
              <MetricCard label="原価 / Cost" value={formatCurrency(totals.accumulatedCost)} unit="¥" type="cost" rawValue={totals.accumulatedCost} />
              <MetricCard label="粗利 / Profit" value={formatCurrency(totals.grossProfit)} unit="¥" type="profit" rawValue={totals.grossProfit} />
              <MetricCard 
                label="粗利率 / Margin" 
                value={`${totals.grossProfitRateContract}%`} 
                unit="" 
                type="rate" 
                rawValue={parseFloat(totals.grossProfitRateContract)}
                subValue={`(込み: ${totals.grossProfitRateWithScrap}%)`}
              />
            </div>
          </div>

          {totals.accumulatedScrap > 0 && (
            <div className="mb-8">
              <MetricCard 
                label="スクラップ / Scrap" 
                value={formatCurrency(totals.accumulatedScrap)} 
                unit="¥" 
                type="scrap" 
                rawValue={totals.accumulatedScrap} 
              />
            </div>
          )}

          <div className="mt-8 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => onNavigate('input')}
                className="flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">日報入力</span>
              </button>
              <button 
                onClick={() => onNavigate('list')}
                className="flex items-center justify-center gap-2 py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">日報一覧</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <button 
              onClick={() => onNavigate('analysis')}
              className="flex items-center justify-center gap-2 py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">原価分析</span>
            </button>
            <button 
              onClick={() => onNavigate('settings')}
              className="flex items-center justify-center gap-2 py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">設定</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Part2ここまで
// プロジェクト設定ページ（契約処分先チェックボックス対応）
function ProjectSettingsPage({ sites, selectedSite, projectInfo, setProjectInfo, onSave, onAddSite, onDeleteSite, onNavigate }) {
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');

  const handleAddSite = () => {
    if (!newSiteName.trim()) return alert('現場名を入力してください');
    onAddSite(newSiteName);
    setNewSiteName('');
    setShowAddSite(false);
  };

  const handleDeleteSite = (siteName) => {
    if (!confirm(`現場「${siteName}」を削除しますか？\n関連するプロジェクト情報と日報もすべて削除されます。`)) return;
    onDeleteSite(siteName);
  };

  // 契約処分先のチェックボックス制御
  const toggleDisposalSite = (site) => {
    const currentSites = projectInfo.contractedDisposalSites || [];
    if (currentSites.includes(site)) {
      setProjectInfo({
        ...projectInfo,
        contractedDisposalSites: currentSites.filter(s => s !== site)
      });
    } else {
      setProjectInfo({
        ...projectInfo,
        contractedDisposalSites: [...currentSites, site]
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-4">
        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          閉じる
        </button>
      </div>
      
      <SectionHeader title="現場管理 / Site Management" />
      
      {!showAddSite ? (
        <button
          onClick={() => setShowAddSite(true)}
          className="w-full mb-6 px-4 py-3 bg-blue-900 text-white text-base font-bold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          新規現場を追加
        </button>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 border-2 border-gray-300">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            新規現場名 / New Site Name
          </label>
          <input
            type="text"
            value={newSiteName}
            onChange={(e) => setNewSiteName(e.target.value)}
            placeholder="例: 渋谷〇〇ビル解体工事"
            className="w-full px-4 py-3 bg-white border-2 border-gray-300 text-black text-base font-medium focus:outline-none focus:border-blue-900 mb-3"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAddSite}
              className="px-4 py-3 bg-blue-900 text-white font-bold hover:bg-blue-800 transition-colors"
            >
              追加
            </button>
            <button
              onClick={() => { setShowAddSite(false); setNewSiteName(''); }}
              className="px-4 py-3 bg-white border-2 border-gray-300 text-black font-bold hover:bg-gray-100 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {sites.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            登録済み現場 / Registered Sites ({sites.length})
          </p>
          <div className="space-y-2">
            {sites.map((site, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300">
                <span className="text-base font-medium">{site.name}</span>
                <button
                  onClick={() => handleDeleteSite(site.name)}
                  className="px-3 py-1 bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-colors"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedSite && (
        <>
          <SectionHeader title={`プロジェクト情報編集 / Project Settings (${selectedSite})`} />
          
          <div className="mb-6">
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
              工事番号 / PROJECT NO.
            </label>
            <div className="px-4 py-4 bg-gray-900/30 border border-gray-800 rounded-md">
              <div className="text-white text-base font-semibold tabular-nums">
                {projectInfo.projectNumber || '未設定'}
              </div>
              <p className="text-xs text-gray-600 mt-1">※ 自動採番されます（編集不可）</p>
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
              <input type="date" value={projectInfo.startDate} onChange={(e) => setProjectInfo({...projectInfo, startDate: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-gray-300 text-black text-base font-medium focus:outline-none focus:border-blue-900" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">工期終了 / End</label>
              <input type="date" value={projectInfo.endDate} onChange={(e) => setProjectInfo({...projectInfo, endDate: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-gray-300 text-black text-base font-medium focus:outline-none focus:border-blue-900" />
            </div>
          </div>

          <TextInput label="売上（税抜）" labelEn="Revenue" type="number" value={projectInfo.contractAmount} onChange={(val) => setProjectInfo({...projectInfo, contractAmount: val})} placeholder="5000000" />
          <TextInput label="追加金額（税抜）" labelEn="Additional Amount" type="number" value={projectInfo.additionalAmount} onChange={(val) => setProjectInfo({...projectInfo, additionalAmount: val})} placeholder="0" />
          <Select label="ステータス" labelEn="Status" options={MASTER_DATA.statuses} value={projectInfo.status} onChange={(val) => setProjectInfo({...projectInfo, status: val})} />

          <TextInput 
            label="排出事業者" 
            labelEn="Discharger" 
            value={projectInfo.discharger || ''} 
            onChange={(val) => setProjectInfo({...projectInfo, discharger: val})} 
            placeholder="株式会社LOGIO" 
            required
          />

          {/* 契約処分先 - チェックボックス一覧 */}
          <div className="mb-6">
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-3">
              契約処分先 / Contracted Disposal Sites <span className="text-red-500">*</span>
            </label>
            
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 space-y-2 max-h-80 overflow-y-auto">
              {MASTER_DATA.disposalSites.map((site) => {
                const isSelected = (projectInfo.contractedDisposalSites || []).includes(site);
                return (
                  <button
                    key={site}
                    type="button"
                    onClick={() => toggleDisposalSite(site)}
                    className={`w-full px-4 py-3 text-left text-sm rounded-md transition-colors flex items-center gap-3 ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'border-white bg-white' : 'border-gray-500'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <span className="flex-1">{site}</span>
                  </button>
                );
              })}
            </div>
            
            {projectInfo.contractedDisposalSites && projectInfo.contractedDisposalSites.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                選択済み: {projectInfo.contractedDisposalSites.length}件
              </p>
            )}
            
            {(!projectInfo.contractedDisposalSites || projectInfo.contractedDisposalSites.length === 0) && (
              <p className="text-xs text-gray-500 mt-2">※ 契約処分先を選択してください（必須）</p>
            )}
          </div>

          <Button onClick={onSave} icon={Save}>プロジェクト情報を保存</Button>
        </>
      )}
    </div>
  );
}

// 日報一覧、原価分析、Exportページは前回のコードをそのまま使用
// ここでは省略し、Part4に記載

// Part3ここまで

// ========== メインApp（完全版・2本線ハンバーガー） ==========

export default function LOGIOApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('login');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [projectInfo, setProjectInfo] = useState({
    projectNumber: '',
    projectName: '',
    client: '',
    workLocation: '',
    salesPerson: '',
    siteManager: '',
    startDate: '',
    endDate: '',
    contractAmount: 0,
    additionalAmount: 0,
    status: '',
    discharger: '',
    contractedDisposalSites: []
  });
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const sitesResult = await window.storage.get('logio-sites');
        if (sitesResult?.value) setSites(JSON.parse(sitesResult.value));

        const selectedResult = await window.storage.get('logio-selected-site');
        if (selectedResult?.value) {
          setSelectedSite(selectedResult.value);
          const projectResult = await window.storage.get(`logio-project-${selectedResult.value}`);
          if (projectResult?.value) setProjectInfo(JSON.parse(projectResult.value));
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    if (isLoggedIn) loadData();
  }, [isLoggedIn]);

  const handleLogin = (userData) => {
    setIsLoggedIn(true);
    setCurrentPage('home');
  };

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      setIsLoggedIn(false);
      setCurrentPage('login');
      setSelectedSite(null);
      setSidebarOpen(false);
    }
  };

  const handleNavigate = (page) => {
    if (page === 'settings') {
      setShowPasswordModal(true);
      return;
    }
    setCurrentPage(page);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === 'face1991') {
      setShowPasswordModal(false);
      setPasswordInput('');
      setCurrentPage('settings');
    } else {
      alert('パスワードが正しくありません');
      setPasswordInput('');
    }
  };

  const handleAddSite = async (siteName) => {
    const newSites = [...sites, { name: siteName, createdAt: new Date().toISOString() }];
    setSites(newSites);
    await window.storage.set('logio-sites', JSON.stringify(newSites));
  };

  const handleSelectSite = async (siteName) => {
    setSelectedSite(siteName);
    await window.storage.set('logio-selected-site', siteName);
    try {
      const projectResult = await window.storage.get(`logio-project-${siteName}`);
      if (projectResult?.value) {
        setProjectInfo(JSON.parse(projectResult.value));
      } else {
        setProjectInfo({
          projectNumber: '',
          projectName: '',
          client: '',
          workLocation: '',
          salesPerson: '',
          siteManager: '',
          startDate: '',
          endDate: '',
          contractAmount: 0,
          additionalAmount: 0,
          status: '',
          discharger: '',
          contractedDisposalSites: []
        });
      }
    } catch (error) {
      console.error('Failed to load site data:', error);
    }
  };

  const handleDeleteSite = async (siteName) => {
    if (confirm(`現場「${siteName}」を削除しますか？`)) {
      const newSites = sites.filter(s => s.name !== siteName);
      setSites(newSites);
      await window.storage.set('logio-sites', JSON.stringify(newSites));
      await window.storage.delete(`logio-project-${siteName}`);
      if (selectedSite === siteName) {
        setSelectedSite(null);
        await window.storage.delete('logio-selected-site');
        setProjectInfo({
          projectNumber: '',
          projectName: '',
          client: '',
          workLocation: '',
          salesPerson: '',
          siteManager: '',
          startDate: '',
          endDate: '',
          contractAmount: 0,
          additionalAmount: 0,
          status: '',
          discharger: '',
          contractedDisposalSites: []
        });
      }
    }
  };

  const handleSaveProject = async (data) => {
    setProjectInfo(data);
    if (selectedSite) {
      await window.storage.set(`logio-project-${selectedSite}`, JSON.stringify(data));
    }
    handleNavigate('home');
  };

  if (showSplash) return <SplashScreen />;
  if (!isLoggedIn) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ヘッダー：ハンバーガー + LOGIOロゴ */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-gray-900 px-6 py-5 flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-white hover:text-gray-300 transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 8H21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M6 16H18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
        <LOGIOLogo size="xs" />
      </div>

      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onLogout={handleLogout}
      />

      <main className="pt-20">
        {currentPage === 'home' && (
          <HomePage
            selectedSite={selectedSite}
            sites={sites}
            onSelectSite={handleSelectSite}
            onAddSite={handleAddSite}
            onDeleteSite={handleDeleteSite}
            onNavigate={handleNavigate}
            projectInfo={projectInfo}
            totals={{ 
              totalRevenue: Number(projectInfo.contractAmount || 0) + Number(projectInfo.additionalAmount || 0),
              accumulatedCost: 0,
              accumulatedScrap: 0,
              grossProfit: Number(projectInfo.contractAmount || 0) + Number(projectInfo.additionalAmount || 0),
              grossProfitRateContract: '0.0',
              grossProfitRateWithScrap: '0.0'
            }}
            reportsCount={0}
          />
        )}

        {currentPage === 'settings' && (
          <ProjectSettingsPage
            sites={sites}
            selectedSite={selectedSite}
            projectInfo={projectInfo}
            setProjectInfo={setProjectInfo}
            onSave={handleSaveProject}
            onAddSite={handleAddSite}
            onDeleteSite={handleDeleteSite}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage !== 'home' && currentPage !== 'settings' && (
          <div className="p-8 text-center">
            <p className="text-gray-400 text-lg mt-20">📝 この機能は Phase2/3 で追加されます</p>
          </div>
        )}
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-white">パスワード入力</h2>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="パスワードを入力"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordInput('');
                }}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg"
              >
                キャンセル
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
