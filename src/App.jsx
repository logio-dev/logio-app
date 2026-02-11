import React, { useState, useEffect, useRef, Fragment } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Save, Trash2, BarChart3, FileText, Settings, Menu, X, Home, Check, LogOut } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
// ========== Part2: サイドバー、スプラッシュ、ログイン画面 ==========

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
// ========== Part3: プロジェクト設定、日報一覧、原価分析、Export ==========

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
// ========== Part4完全版v2 前半: 日報入力（色統一: bg-gray-800）==========

function ReportInputPage({ onSave, onNavigate, projectInfo }) {
  const [currentStep, setCurrentStep] = useState(1);
  
  const [report, setReport] = useState({
    date: new Date().toISOString().split('T')[0],
    weather: '',
    workCategory: '',
    recorder: '',
    customRecorder: ''
  });

  const [workDetails, setWorkDetails] = useState({
    workCategory: '',
    workContent: '',
    startTime: '',
    endTime: '',
    workingMinutes: 0,
    inHouseWorkers: [],
    outsourcingLabor: [],
    vehicles: [],
    machinery: [],
    costItems: []
  });
  
  const [unitPrices] = useState({
    inHouseDaytime: 25000,
    inHouseNighttime: 35000,
    inHouseNightLoading: 25000,
    outsourcingDaytime: 25000,
    outsourcingNighttime: 30000
  });

  const [wasteItems, setWasteItems] = useState([]);
  const [scrapItems, setScrapItems] = useState([]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const handleCancel = () => {
    if (confirm('入力内容を破棄してホーム画面に戻りますか？')) {
      onNavigate('home');
    }
  };

  const isStep1Valid = () => {
    return report.date && (report.recorder || report.customRecorder);
  };

  const handleSave = async () => {
    const finalRecorder = report.customRecorder || report.recorder;
    const finalReport = {
      ...report,
      recorder: finalRecorder,
      workDetails,
      wasteItems,
      scrapItems
    };
    
    onSave(finalReport);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 bg-black min-h-screen relative pb-24">
      {/* 右下フローティング閉じるボタン */}
      <button
        onClick={() => onNavigate('home')}
        className="fixed right-6 bottom-6 z-50 w-14 h-14 bg-black/80 hover:bg-black border-2 border-white rounded-full flex items-center justify-center shadow-lg transition-all"
        style={{ backdropFilter: 'blur(10px)' }}
      >
        <X className="w-6 h-6 text-white" />
      </button>
      
      {/* Step Indicator */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3].map((step) => (
          <div
            key={step}
            className={`w-3 h-3 rounded-full ${
              step === currentStep ? 'bg-blue-500' : step < currentStep ? 'bg-blue-300' : 'bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* ================ Step1: 基本情報 ================ */}
      {currentStep === 1 && (
        <div>
          <SectionHeader title="基本情報 / Basic Info" />
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">
                作業日 <span className="text-red-500">*</span>
              </label>
              <input 
                type="date" 
                value={report.date} 
                onChange={(e) => setReport({...report, date: e.target.value})} 
                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">
                天候 <span className="text-red-500">*</span>
              </label>
              <select
                value={report.weather}
                onChange={(e) => setReport({...report, weather: e.target.value})}
                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">選択してください</option>
                {MASTER_DATA.weather.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            
            {/* 記入者（その他（手入力）オプション付き） */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">
                記入者 <span className="text-red-500">*</span>
              </label>
              <select
                value={report.recorder}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__custom__') {
                    const customName = prompt('記入者名を入力してください');
                    if (customName) {
                      setReport({...report, recorder: '', customRecorder: customName});
                    }
                  } else {
                    setReport({...report, recorder: val, customRecorder: ''});
                  }
                }}
                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">選択してください</option>
                {MASTER_DATA.employees.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
                <option value="__custom__">その他（手入力）</option>
              </select>
              {report.customRecorder && (
                <p className="text-xs text-blue-400 mt-2">入力値: {report.customRecorder}</p>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <button
              onClick={handleCancel}
              className="py-4 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-base min-h-[56px]"
            >
              キャンセル
            </button>
            <button 
              onClick={() => setCurrentStep(2)} 
              disabled={!isStep1Valid()}
              className="py-4 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors font-medium text-base min-h-[56px]"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {/* ================ Step2: 原価明細 ================ */}
      {currentStep === 2 && (
        <div>
          <SectionHeader title="原価明細 / Cost Details" />
          
          {/* 施工内容 */}
          <div className="mb-8 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-base font-semibold text-white mb-4">施工内容</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">区分</label>
                <select
                  value={workDetails.workCategory}
                  onChange={(e) => setWorkDetails({...workDetails, workCategory: e.target.value})}
                  className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="">選択してください</option>
                  {MASTER_DATA.workCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">内容</label>
                <input
                  type="text"
                  placeholder="施工内容を入力してください"
                  value={workDetails.workContent}
                  onChange={(e) => setWorkDetails({...workDetails, workContent: e.target.value})}
                  className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="my-8 border-t border-gray-700"></div>
          
          {/* 自社人工（その他（手入力）オプション付き） */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-4">
              自社人工
            </label>
            
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">作業員</label>
                  <select
                    id="worker-name-select"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">選択してください</option>
                    {MASTER_DATA.inHouseWorkers.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    <option value="__custom__">その他（手入力）</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">開始</label>
                    <select
                      id="worker-start-input"
                      className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                      defaultValue=""
                    >
                      <option value="">--:--</option>
                      {MASTER_DATA.workingHoursOptions.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">終了</label>
                    <select
                      id="worker-end-input"
                      className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                      defaultValue=""
                    >
                      <option value="">--:--</option>
                      {MASTER_DATA.workingHoursOptions.map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">区分</label>
                  <select
                    id="worker-shift-input"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    defaultValue="daytime"
                  >
                    <option value="daytime">日勤 (¥{formatCurrency(unitPrices.inHouseDaytime)})</option>
                    <option value="nighttime">夜間 (¥{formatCurrency(unitPrices.inHouseNighttime)})</option>
                    <option value="nightLoading">夜間積込 (¥{formatCurrency(unitPrices.inHouseNightLoading)})</option>
                  </select>
                </div>
                
                <button
                  onClick={() => {
                    const nameSelect = document.getElementById('worker-name-select');
                    let name = nameSelect.value;
                    
                    if (name === '__custom__') {
                      name = prompt('作業員名を入力してください');
                      if (!name) return;
                    } else if (!name) {
                      alert('作業員を選択してください');
                      return;
                    }
                    
                    const startTime = document.getElementById('worker-start-input').value;
                    const endTime = document.getElementById('worker-end-input').value;
                    const shiftType = document.getElementById('worker-shift-input').value;
                    
                    if (!startTime || !endTime) {
                      alert('開始時刻と終了時刻を選択してください');
                      return;
                    }
                    
                    let amount = unitPrices.inHouseDaytime;
                    if (shiftType === 'nighttime') amount = unitPrices.inHouseNighttime;
                    if (shiftType === 'nightLoading') amount = unitPrices.inHouseNightLoading;
                    
                    setWorkDetails({
                      ...workDetails,
                      inHouseWorkers: [...workDetails.inHouseWorkers, { name, startTime, endTime, shiftType, amount }]
                    });
                    
                    nameSelect.value = '';
                    document.getElementById('worker-start-input').value = '';
                    document.getElementById('worker-end-input').value = '';
                    document.getElementById('worker-shift-input').value = 'daytime';
                  }}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-base min-h-[56px]"
                >
                  登録
                </button>
              </div>
            </div>
            
            {/* 登録済み作業員リスト */}
            {workDetails.inHouseWorkers.length > 0 && (
              <>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-gray-400">登録済み: {workDetails.inHouseWorkers.length}名</p>
                  {workDetails.inHouseWorkers.map((worker, index) => (
                    <div key={index} className="bg-gray-900/50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-white text-base font-medium mb-1">{worker.name}</p>
                          <p className="text-sm text-gray-400">{worker.startTime} - {worker.endTime}</p>
                        </div>
                        <button
                          onClick={() => {
                            const newWorkers = workDetails.inHouseWorkers.filter((_, i) => i !== index);
                            setWorkDetails({...workDetails, inHouseWorkers: newWorkers});
                          }}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded transition-colors min-h-[40px] min-w-[40px]"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <select
                          value={worker.shiftType}
                          onChange={(e) => {
                            const newType = e.target.value;
                            let newAmount = unitPrices.inHouseDaytime;
                            if (newType === 'nighttime') newAmount = unitPrices.inHouseNighttime;
                            if (newType === 'nightLoading') newAmount = unitPrices.inHouseNightLoading;
                            const newWorkers = [...workDetails.inHouseWorkers];
                            newWorkers[index] = { ...newWorkers[index], shiftType: newType, amount: newAmount };
                            setWorkDetails({...workDetails, inHouseWorkers: newWorkers});
                          }}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                        >
                          <option value="daytime">日勤 (¥{formatCurrency(unitPrices.inHouseDaytime)})</option>
                          <option value="nighttime">夜間 (¥{formatCurrency(unitPrices.inHouseNighttime)})</option>
                          <option value="nightLoading">夜間積込 (¥{formatCurrency(unitPrices.inHouseNightLoading)})</option>
                        </select>
                        <div className="text-right">
                          <span className="text-white font-semibold text-lg">¥{formatCurrency(worker.amount)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-white text-xl font-semibold">
                    小計: ¥{formatCurrency(workDetails.inHouseWorkers.reduce((sum, w) => sum + w.amount, 0))}
                  </p>
                </div>
              </>
            )}
          </div>

// Part4v2前半ここまで - 後半（App_FINAL_part4_v2_SECOND.jsx）に続く
          {/* 外注人工（その他（手入力）対応） */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-4">
              外注人工
            </label>
            
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">会社名</label>
                  <select
                    id="outsourcing-company-select"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">選択してください</option>
                    {MASTER_DATA.outsourcingCompanies.map((company) => (
                      <option key={company} value={company}>{company}</option>
                    ))}
                    <option value="__custom__">その他（手入力）</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">人数</label>
                    <input
                      id="outsourcing-workers-input"
                      type="number"
                      placeholder="3"
                      min="1"
                      className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">区分</label>
                    <select
                      id="outsourcing-shift-input"
                      className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                      defaultValue="daytime"
                    >
                      <option value="daytime">日勤 (¥{formatCurrency(unitPrices.outsourcingDaytime)})</option>
                      <option value="nighttime">夜間 (¥{formatCurrency(unitPrices.outsourcingNighttime)})</option>
                    </select>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    const companySelect = document.getElementById('outsourcing-company-select');
                    let company = companySelect.value;
                    
                    if (company === '__custom__') {
                      company = prompt('会社名を入力してください');
                      if (!company) return;
                    } else if (!company) {
                      alert('会社名を選択してください');
                      return;
                    }
                    
                    const workersInput = document.getElementById('outsourcing-workers-input');
                    const workers = parseInt(workersInput.value);
                    const shiftType = document.getElementById('outsourcing-shift-input').value;
                    
                    if (!workers || workers < 1) {
                      alert('人数を入力してください');
                      return;
                    }
                    
                    const amount = workers * (shiftType === 'daytime' ? unitPrices.outsourcingDaytime : unitPrices.outsourcingNighttime);
                    
                    setWorkDetails({
                      ...workDetails,
                      outsourcingLabor: [...workDetails.outsourcingLabor, { company, workers, shiftType, amount }]
                    });
                    
                    companySelect.value = '';
                    workersInput.value = '';
                    document.getElementById('outsourcing-shift-input').value = 'daytime';
                  }}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-base min-h-[56px]"
                >
                  登録
                </button>
              </div>
            </div>
            
            {/* 登録済み外注リスト */}
            {workDetails.outsourcingLabor.length > 0 && (
              <>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-gray-400">登録済み: {workDetails.outsourcingLabor.length}件</p>
                  {workDetails.outsourcingLabor.map((item, index) => (
                    <div key={index} className="bg-gray-900/50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-white text-base font-medium mb-1">{item.company}</p>
                          <p className="text-sm text-gray-400">{item.workers}人</p>
                        </div>
                        <button
                          onClick={() => {
                            const newLabor = workDetails.outsourcingLabor.filter((_, i) => i !== index);
                            setWorkDetails({...workDetails, outsourcingLabor: newLabor});
                          }}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded transition-colors min-h-[40px] min-w-[40px]"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <select
                          value={item.shiftType}
                          onChange={(e) => {
                            const newType = e.target.value;
                            const newAmount = item.workers * (newType === 'daytime' ? unitPrices.outsourcingDaytime : unitPrices.outsourcingNighttime);
                            const newLabor = [...workDetails.outsourcingLabor];
                            newLabor[index] = { ...newLabor[index], shiftType: newType, amount: newAmount };
                            setWorkDetails({...workDetails, outsourcingLabor: newLabor});
                          }}
                          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                        >
                          <option value="daytime">日勤 (¥{formatCurrency(unitPrices.outsourcingDaytime)}/人)</option>
                          <option value="nighttime">夜間 (¥{formatCurrency(unitPrices.outsourcingNighttime)}/人)</option>
                        </select>
                        <div className="text-right">
                          <span className="text-white font-semibold text-lg">¥{formatCurrency(item.amount)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-white text-xl font-semibold">
                    小計: ¥{formatCurrency(workDetails.outsourcingLabor.reduce((sum, item) => sum + item.amount, 0))}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="my-8 border-t border-gray-700"></div>

          {/* 車両 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-4">
              車両
            </label>
            
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">種類</label>
                  <select
                    id="vehicle-type-input"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">選択してください</option>
                    {MASTER_DATA.vehicles.map((vehicle) => (
                      <option key={vehicle} value={vehicle}>{vehicle}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">車両番号</label>
                  <input
                    id="vehicle-number-input"
                    type="text"
                    placeholder="例: 品川500あ1234"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">金額</label>
                  <input
                    id="vehicle-amount-input"
                    type="number"
                    placeholder="30000"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <button
                  onClick={() => {
                    const typeSelect = document.getElementById('vehicle-type-input');
                    const type = typeSelect.value;
                    const number = document.getElementById('vehicle-number-input').value;
                    const amount = parseFloat(document.getElementById('vehicle-amount-input').value);
                    
                    if (!type) {
                      alert('車両の種類を選択してください');
                      return;
                    }
                    
                    if (!number || !amount) {
                      alert('車両番号と金額を入力してください');
                      return;
                    }
                    
                    setWorkDetails({
                      ...workDetails,
                      vehicles: [...workDetails.vehicles, { type, number, amount }]
                    });
                    
                    typeSelect.value = '';
                    document.getElementById('vehicle-number-input').value = '';
                    document.getElementById('vehicle-amount-input').value = '';
                  }}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-base min-h-[56px]"
                >
                  登録
                </button>
              </div>
            </div>
            
            {/* 登録済み車両リスト */}
            {workDetails.vehicles.length > 0 && (
              <>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-gray-400">登録済み: {workDetails.vehicles.length}台</p>
                  {workDetails.vehicles.map((vehicle, index) => (
                    <div key={index} className="bg-gray-900/50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-white text-base font-medium mb-1">{vehicle.type}</p>
                          <p className="text-sm text-gray-400">{vehicle.number}</p>
                          <p className="text-white font-semibold text-lg mt-2">¥{formatCurrency(vehicle.amount)}</p>
                        </div>
                        <button
                          onClick={() => {
                            const newVehicles = workDetails.vehicles.filter((_, i) => i !== index);
                            setWorkDetails({...workDetails, vehicles: newVehicles});
                          }}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded transition-colors min-h-[40px] min-w-[40px]"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-white text-xl font-semibold">
                    小計: ¥{formatCurrency(workDetails.vehicles.reduce((sum, v) => sum + v.amount, 0))}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* ナビゲーションボタン */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            <button
              onClick={() => setCurrentStep(1)}
              className="py-4 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-base min-h-[56px]"
            >
              ← 戻る
            </button>
            <button
              onClick={handleCancel}
              className="py-4 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-base min-h-[56px]"
            >
              キャンセル
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="py-4 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-base min-h-[56px]"
            >
              次へ →
            </button>
          </div>
        </div>
      )}

// Part4v2中盤ここまで - 後半（Step3）に続く
      {/* ================ Step3: 廃棄物・スクラップ ================ */}
      {currentStep === 3 && (
        <div>
          <SectionHeader title="廃棄物・スクラップ / Waste & Scrap" />
          
          <p className="text-sm text-gray-400 mb-6">※ 廃棄物・スクラップがない場合はそのまま保存できます</p>

          {/* 廃棄物処分費（その他（手入力）対応） */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-4">
              廃棄物処分費
            </label>
            
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">発生材</label>
                  <select
                    id="waste-material-select"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">選択</option>
                    {MASTER_DATA.wasteTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="__custom__">その他（手入力）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">処分先</label>
                  <select
                    id="waste-disposal-input"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">選択</option>
                    {projectInfo?.contractedDisposalSites && projectInfo.contractedDisposalSites.length > 0 ? (
                      projectInfo.contractedDisposalSites.map((site) => (
                        <option key={site} value={site}>{site}</option>
                      ))
                    ) : (
                      <option value="" disabled>※ 契約処分先を設定してください</option>
                    )}
                  </select>
                  {(!projectInfo?.contractedDisposalSites || projectInfo.contractedDisposalSites.length === 0) && (
                    <p className="text-xs text-red-400 mt-2">※ プロジェクト設定で契約処分先を登録してください</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">数量</label>
                    <input
                      id="waste-quantity-input"
                      type="number"
                      step="0.1"
                      placeholder="10"
                      className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">単位</label>
                    <select
                      id="waste-unit-input"
                      className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                      defaultValue="㎥"
                    >
                      <option value="kg">kg</option>
                      <option value="㎥">㎥</option>
                      <option value="t">t</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">単価</label>
                  <input
                    id="waste-unitprice-input"
                    type="number"
                    placeholder="11000"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">マニフェスト番号</label>
                  <input
                    id="waste-manifest-input"
                    type="text"
                    placeholder="ABC123"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <button
                  onClick={() => {
                    const materialSelect = document.getElementById('waste-material-select');
                    let material = materialSelect.value;
                    
                    if (material === '__custom__') {
                      material = prompt('発生材を入力してください');
                      if (!material) return;
                    } else if (!material) {
                      alert('発生材を選択してください');
                      return;
                    }
                    
                    const disposalSelect = document.getElementById('waste-disposal-input');
                    let disposalSite = disposalSelect.value;
                    
                    if (!disposalSite) {
                      alert('処分先を選択してください');
                      return;
                    }
                    
                    const quantity = parseFloat(document.getElementById('waste-quantity-input').value);
                    const unit = document.getElementById('waste-unit-input').value;
                    const unitPrice = parseFloat(document.getElementById('waste-unitprice-input').value);
                    const manifestNumber = document.getElementById('waste-manifest-input').value;
                    
                    if (!quantity || !unitPrice || !manifestNumber) {
                      alert('すべての項目を入力してください（マニフェスト番号は必須です）');
                      return;
                    }
                    
                    const amount = quantity * unitPrice;
                    
                    setWasteItems([...wasteItems, {
                      material,
                      disposalSite,
                      quantity,
                      unit,
                      unitPrice,
                      amount,
                      manifestNumber
                    }]);
                    
                    materialSelect.value = '';
                    disposalSelect.value = '';
                    document.getElementById('waste-quantity-input').value = '';
                    document.getElementById('waste-unit-input').value = '㎥';
                    document.getElementById('waste-unitprice-input').value = '';
                    document.getElementById('waste-manifest-input').value = '';
                  }}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-base min-h-[56px]"
                >
                  登録
                </button>
              </div>
            </div>
            
            {/* 登録済み廃棄物リスト */}
            {wasteItems.length > 0 && (
              <>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-gray-400">登録済み: {wasteItems.length}件</p>
                  {wasteItems.map((item, index) => (
                    <div key={index} className="bg-gray-900/50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-white text-base font-medium">{item.material} | {item.disposalSite}</p>
                          <p className="text-sm text-gray-400">
                            {item.quantity}{item.unit} × ¥{formatCurrency(item.unitPrice)} = ¥{formatCurrency(item.amount)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">マニフェスト: {item.manifestNumber}</p>
                        </div>
                        <button
                          onClick={() => {
                            const newItems = wasteItems.filter((_, i) => i !== index);
                            setWasteItems(newItems);
                          }}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded transition-colors min-h-[40px] min-w-[40px]"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-white text-xl font-semibold">
                    小計: ¥{formatCurrency(wasteItems.reduce((sum, item) => sum + item.amount, 0))}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* スクラップ売上（その他（手入力）対応） */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-4">
              スクラップ売上
            </label>
            
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">種類</label>
                  <select
                    id="scrap-type-select"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">選択</option>
                    {MASTER_DATA.scrapTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="__custom__">その他（手入力）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">買取業者</label>
                  <select
                    id="scrap-buyer-select"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">選択</option>
                    {MASTER_DATA.buyers.map((buyer) => (
                      <option key={buyer} value={buyer}>{buyer}</option>
                    ))}
                    <option value="__custom__">その他（手入力）</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">数量</label>
                    <input
                      id="scrap-quantity-input"
                      type="number"
                      step="0.1"
                      placeholder="120"
                      className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">単位</label>
                    <select
                      id="scrap-unit-input"
                      className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                      defaultValue="kg"
                    >
                      <option value="kg">kg</option>
                      <option value="㎥">㎥</option>
                      <option value="t">t</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">単価</label>
                  <input
                    id="scrap-unitprice-input"
                    type="number"
                    placeholder="85"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <button
                  onClick={() => {
                    const typeSelect = document.getElementById('scrap-type-select');
                    let type = typeSelect.value;
                    
                    if (type === '__custom__') {
                      type = prompt('スクラップ種類を入力してください');
                      if (!type) return;
                    } else if (!type) {
                      alert('種類を選択してください');
                      return;
                    }
                    
                    const buyerSelect = document.getElementById('scrap-buyer-select');
                    let buyer = buyerSelect.value;
                    
                    if (buyer === '__custom__') {
                      buyer = prompt('買取業者を入力してください');
                      if (!buyer) return;
                    } else if (!buyer) {
                      alert('買取業者を選択してください');
                      return;
                    }
                    
                    const quantity = parseFloat(document.getElementById('scrap-quantity-input').value);
                    const unit = document.getElementById('scrap-unit-input').value;
                    const unitPrice = parseFloat(document.getElementById('scrap-unitprice-input').value);
                    
                    if (!quantity || !unitPrice) {
                      alert('数量と単価を入力してください');
                      return;
                    }
                    
                    const amount = -(quantity * unitPrice);
                    
                    setScrapItems([...scrapItems, {
                      type,
                      buyer,
                      quantity,
                      unit,
                      unitPrice,
                      amount
                    }]);
                    
                    typeSelect.value = '';
                    buyerSelect.value = '';
                    document.getElementById('scrap-quantity-input').value = '';
                    document.getElementById('scrap-unit-input').value = 'kg';
                    document.getElementById('scrap-unitprice-input').value = '';
                  }}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-base min-h-[56px]"
                >
                  登録
                </button>
              </div>
            </div>
            
            {/* 登録済みスクラップリスト */}
            {scrapItems.length > 0 && (
              <>
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-gray-400">登録済み: {scrapItems.length}件</p>
                  {scrapItems.map((item, index) => (
                    <div key={index} className="bg-gray-900/50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-white text-base font-medium">{item.type} | {item.buyer}</p>
                          <p className="text-sm text-gray-400">
                            {item.quantity}{item.unit} × ¥{formatCurrency(item.unitPrice)} = ¥{formatCurrency(Math.abs(item.amount))}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const newItems = scrapItems.filter((_, i) => i !== index);
                            setScrapItems(newItems);
                          }}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded transition-colors min-h-[40px] min-w-[40px]"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 bg-gray-800/50 rounded-lg">
                  <p className="text-white text-xl font-semibold">
                    小計: ¥{formatCurrency(Math.abs(scrapItems.reduce((sum, item) => sum + item.amount, 0)))}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            <button
              onClick={() => setCurrentStep(2)}
              className="py-4 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-base min-h-[56px]"
            >
              ← 戻る
            </button>
            <button
              onClick={handleCancel}
              className="py-4 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-base min-h-[56px]"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="py-4 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-base min-h-[56px]"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Part4v2後半ここまで - Part4完了！
// 日報一覧ページ
function ReportListPage({ reports, onDelete, onNavigate }) {
  const [filterMonth, setFilterMonth] = useState('');
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
        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          閉じる
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
    <div className="border border-gray-700 rounded-lg mb-3 overflow-hidden bg-gray-900/30">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="text-left flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-lg font-bold text-white">{report.date}</span>
            <span className="text-sm text-gray-400">({getDayOfWeek(report.date)})</span>
            <span className="text-sm text-blue-400">{report.weather}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs font-medium">
              {report.workDetails?.workCategory || report.workCategory}
            </span>
            {(() => {
              const totalCost = 
                (report.workDetails?.inHouseWorkers?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0) +
                (report.workDetails?.outsourcingLabor?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0) +
                (report.workDetails?.vehicles?.reduce((sum, v) => sum + (v.amount || 0), 0) || 0) +
                (report.workDetails?.machinery?.reduce((sum, m) => sum + (m.unitPrice || 0), 0) || 0) +
                (report.workDetails?.costItems?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0) +
                (report.wasteItems?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0);
              return totalCost > 0 && (
                <span className="text-yellow-400 font-semibold">¥{formatCurrency(totalCost)}</span>
              );
            })()}
          </div>
        </div>
        <span className="text-gray-400 ml-4">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </span>
      </button>

      {isOpen && (
        <div className="px-4 py-4 bg-gray-800/30 border-t border-gray-700">
          <div className="mb-4 pb-4 border-b border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500">記入者:</span>
              <span className="text-sm text-white">{report.recorder}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-500 mt-0.5">施工内容:</span>
              <span className="text-sm text-white">{report.workDetails?.workContent || report.workContent || 'なし'}</span>
            </div>
          </div>

          {report.workDetails && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">原価明細</p>
              
              {report.workDetails.inHouseWorkers?.length > 0 && (
                <div className="mb-3 bg-gray-900/30 rounded p-2">
                  <p className="text-xs font-semibold text-blue-400 mb-2">自社人工: {report.workDetails.inHouseWorkers.length}名</p>
                  {report.workDetails.inHouseWorkers.map((w, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">
                      • {w.name} <span className="text-gray-500">{w.startTime}-{w.endTime}</span> <span className="text-yellow-400">¥{formatCurrency(w.amount)}</span>
                    </p>
                  ))}
                </div>
              )}
              
              {report.workDetails.outsourcingLabor?.length > 0 && (
                <div className="mb-3 bg-gray-900/30 rounded p-2">
                  <p className="text-xs font-semibold text-blue-400 mb-2">外注人工: {report.workDetails.outsourcingLabor.length}件</p>
                  {report.workDetails.outsourcingLabor.map((o, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">
                      • {o.company} <span className="text-gray-500">{o.workers}人</span> <span className="text-yellow-400">¥{formatCurrency(o.amount)}</span>
                    </p>
                  ))}
                </div>
              )}
              
              {report.workDetails.vehicles?.length > 0 && (
                <div className="mb-3 bg-gray-900/30 rounded p-2">
                  <p className="text-xs font-semibold text-blue-400 mb-2">車両: {report.workDetails.vehicles.length}台</p>
                  {report.workDetails.vehicles.map((v, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">
                      • {v.type} <span className="text-gray-500">({v.number})</span> <span className="text-yellow-400">¥{formatCurrency(v.amount)}</span>
                    </p>
                  ))}
                </div>
              )}
              
              {report.workDetails.costItems?.length > 0 && (
                <div className="mb-3 bg-gray-900/30 rounded p-2">
                  <p className="text-xs font-semibold text-blue-400 mb-2">その他原価: {report.workDetails.costItems.length}件</p>
                  {report.workDetails.costItems.map((c, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">
                      • {c.category} {c.machineryName && <span className="text-gray-500">- {c.machineryName}</span>} <span className="text-yellow-400">¥{formatCurrency(c.amount)}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {report.wasteItems && report.wasteItems.length > 0 && (
            <div className="mb-4 bg-gray-900/30 rounded p-2">
              <p className="text-xs font-semibold text-red-400 mb-2">
                廃棄物: {report.wasteItems.length}件 / ¥{formatCurrency(report.wasteItems.reduce((s, w) => s + w.amount, 0))}
              </p>
              {report.wasteItems.map((waste, idx) => (
                <div key={idx} className="text-sm text-gray-300 ml-3 mb-1">
                  <p>• {waste.material} <span className="text-gray-500">{waste.quantity}{waste.unit}</span> - {waste.disposalSite}</p>
                  {waste.manifestNumber && <p className="text-xs text-gray-500 ml-4">マニフェスト: {waste.manifestNumber}</p>}
                </div>
              ))}
            </div>
          )}

          {report.scrapItems && report.scrapItems.length > 0 && (
            <div className="mb-4 bg-gray-900/30 rounded p-2">
              <p className="text-xs font-semibold text-green-400 mb-2">
                スクラップ売上: {report.scrapItems.length}件 / ¥{formatCurrency(Math.abs(report.scrapItems.reduce((s, sc) => s + sc.amount, 0)))}
              </p>
              {report.scrapItems.map((scrap, idx) => (
                <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">
                  • {scrap.type} <span className="text-gray-500">{scrap.quantity}{scrap.unit}</span> - {scrap.buyer}
                </p>
              ))}
            </div>
          )}

          <div className="mt-4">
            <Button variant="danger" onClick={onDelete} icon={Trash2}>削除</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ProjectPage
function ProjectPage({ projectInfo, onNavigate }) {
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

      {projectInfo?.projectName && (
        <div className="mb-6 px-4 py-4 bg-gray-900/50 border border-gray-800 rounded-md">
          <div className="text-white text-lg font-bold leading-relaxed mb-2">
            {projectInfo.projectName}
          </div>
          {projectInfo.projectNumber && (
            <div className="text-gray-500 text-xs font-medium tracking-wide">
              PROJECT NO.: {projectInfo.projectNumber}
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-blue-400">基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">発注者 / CLIENT</p>
              <p className="text-lg font-medium">{projectInfo.client || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">現場住所 / LOCATION</p>
              <p className="text-lg font-medium">{projectInfo.workLocation || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">営業担当 / SALES</p>
              <p className="text-lg font-medium">{projectInfo.salesPerson || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">現場責任者 / MANAGER</p>
              <p className="text-lg font-medium">{projectInfo.siteManager || '-'}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-blue-400">期間</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">開始日 / START DATE</p>
              <p className="text-lg font-medium">{projectInfo.startDate || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">終了日 / END DATE</p>
              <p className="text-lg font-medium">{projectInfo.endDate || '-'}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-blue-400">金額</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">契約金額 / CONTRACT AMOUNT</p>
              <p className="text-2xl font-bold text-white">
                ¥{projectInfo.contractAmount ? Number(projectInfo.contractAmount).toLocaleString() : '0'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">追加金額 / ADDITIONAL AMOUNT</p>
              <p className="text-2xl font-bold text-blue-400">
                ¥{projectInfo.additionalAmount ? Number(projectInfo.additionalAmount).toLocaleString() : '0'}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-blue-400">ステータス</h2>
          <div>
            <p className="text-xs text-gray-500 mb-1">状態 / STATUS</p>
            <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
              projectInfo.status === '進行中' ? 'bg-green-900/30 text-green-400' :
              projectInfo.status === '完了' ? 'bg-blue-900/30 text-blue-400' :
              'bg-gray-800 text-gray-400'
            }`}>
              {projectInfo.status || '-'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => onNavigate('settings')}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Settings className="w-5 h-5" />
          編集する
        </button>
      </div>
    </div>
  );
}

// Part5ここまで - AnalysisPageとExportPageは次のメッセージで
// 原価分析ページ
function AnalysisPage({ reports, totals, projectInfo, onNavigate }) {
  const costByCategory = { '材料費': 0, '外注費': 0, '経費': 0 };

  reports.forEach(r => {
    r.costLines?.forEach(c => {
      const category = c.costCategory === '労務費' ? '経費' : c.costCategory;
      if (costByCategory[category] !== undefined) {
        costByCategory[category] = (costByCategory[category] || 0) + c.amount;
      } else {
        costByCategory['経費'] += c.amount;
      }
    });
    r.wasteLines?.forEach(w => {
      costByCategory['経費'] += w.disposalCost;
    });
  });

  const pieData = Object.keys(costByCategory).map(key => ({
    name: key,
    value: costByCategory[key]
  })).filter(d => d.value > 0);

  const COLORS = ['#1E3A8A', '#3B82F6', '#60A5FA'];

  const monthlyData = {};
  reports.forEach(r => {
    const month = r.date.substring(0, 7);
    if (!monthlyData[month]) monthlyData[month] = 0;
    r.costLines?.forEach(c => monthlyData[month] += c.amount);
    r.wasteLines?.forEach(w => monthlyData[month] += w.disposalCost);
  });

  const barData = Object.keys(monthlyData).sort().map(month => ({
    month: month.substring(5),
    cost: Math.round(monthlyData[month] / 10000)
  }));

  const costRatio = totals.totalRevenue > 0 ? ((totals.accumulatedCost / totals.totalRevenue) * 100).toFixed(1) : '0.0';
  const costRatioNum = parseFloat(costRatio);
  let costRatioStatus = '余裕あり';
  let costRatioColor = 'text-blue-400';
  if (costRatioNum >= 85) {
    costRatioStatus = '要警戒';
    costRatioColor = 'text-red-400';
  } else if (costRatioNum >= 70) {
    costRatioStatus = '注意';
    costRatioColor = 'text-gray-400';
  }

  const amountStrokeStyle = {
    textShadow: '0 0 1px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)'
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 bg-black min-h-screen">
      <div className="mb-4">
        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          閉じる
        </button>
      </div>
      
      {projectInfo?.projectName && (
        <div className="mb-6 px-4 py-4 bg-gray-900/50 border border-gray-800 rounded-md">
          <div className="text-white text-lg font-bold leading-relaxed mb-2">
            {projectInfo.projectName}
          </div>
          {projectInfo.projectNumber && (
            <div className="text-gray-500 text-xs font-medium tracking-wide">
              PROJECT NO.: {projectInfo.projectNumber}
            </div>
          )}
        </div>
      )}
      
      <div className="mb-6">
        <SectionHeader title="財務サマリー / Financial Summary" />
        <div className="bg-gray-900/50 rounded-md p-5 space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-xs font-medium text-gray-400">売上 / Revenue</span>
            <span className="text-lg font-semibold text-white tabular-nums" style={amountStrokeStyle}>¥{formatCurrency(totals.totalRevenue)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-xs font-medium text-gray-400">原価 / Cost</span>
            <span className="text-lg font-semibold text-red-400/50 tabular-nums" style={amountStrokeStyle}>¥{formatCurrency(totals.accumulatedCost)}</span>
          </div>
          {totals.accumulatedScrap > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-xs font-medium text-gray-400">スクラップ / Scrap</span>
              <span className="text-lg font-semibold text-white tabular-nums" style={amountStrokeStyle}>¥{formatCurrency(totals.accumulatedScrap)}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-b-2 border-gray-700">
            <span className="text-xs font-medium text-gray-400">粗利 / Profit</span>
            <span className={`text-lg font-semibold tabular-nums ${totals.grossProfit >= 0 ? 'text-blue-400/60' : 'text-red-400/50'}`} style={amountStrokeStyle}>
              ¥{formatCurrency(totals.grossProfit)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-xs font-medium text-gray-400">粗利率 / Margin</span>
            <div className="text-right">
              <span className="text-lg font-semibold text-white tabular-nums" style={amountStrokeStyle}>{totals.grossProfitRateContract}%</span>
              <span className="text-xs text-gray-500 ml-2">(込み: {totals.grossProfitRateWithScrap}%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 bg-gray-900/50 rounded-md p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">原価率 / Cost Ratio</p>
            <p className={`text-4xl font-semibold ${costRatioColor} tabular-nums`} style={amountStrokeStyle}>{costRatio}%</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 mb-2">目安</p>
            <p className={`text-lg font-semibold ${costRatioColor}`}>{costRatioStatus}</p>
          </div>
        </div>
      </div>

      <SectionHeader title="原価構成比 / Cost Structure" />
      
      {pieData.length > 0 ? (
        <div className="bg-gray-900/50 rounded-md p-5 mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `¥${formatCurrency(value)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2 pt-4 border-t border-gray-800">
            {pieData.map((item, idx) => {
              const total = pieData.reduce((s, d) => s + d.value, 0);
              const percent = ((item.value / total) * 100).toFixed(1);
              return (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-400">{item.name}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-white tabular-nums">¥{formatCurrency(item.value)}</span>
                    <span className="text-xs text-gray-500 ml-2">({percent}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-gray-900/50 rounded-md p-8">
          <p className="text-center text-gray-500 text-sm">データがありません</p>
        </div>
      )}

      <div className="mt-8">
        <SectionHeader title="月別原価推移 / Monthly Trend" />
        
        {barData.length > 0 ? (
          <div className="bg-gray-900/50 rounded-md p-5">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis label={{ value: '(万円)', angle: -90, position: 'insideLeft' }} stroke="#9CA3AF" />
                <Tooltip formatter={(value) => `${value}万円`} contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <Bar dataKey="cost" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-gray-900/50 rounded-md p-8">
            <p className="text-center text-gray-500 text-sm">データがありません</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Exportページ
function ExportPage({ sites, reports, projectInfo, selectedSite, onNavigate }) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [gasUrl, setGasUrl] = useState('');
  const [autoExport, setAutoExport] = useState(false);
  const [lastExport, setLastExport] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const idResult = await window.storage.get('logio-spreadsheet-id');
      const gasUrlResult = await window.storage.get('logio-gas-url');
      const autoResult = await window.storage.get('logio-auto-export');
      const lastResult = await window.storage.get('logio-last-export');
      
      if (idResult?.value) setSpreadsheetId(idResult.value);
      if (gasUrlResult?.value) setGasUrl(gasUrlResult.value);
      if (autoResult?.value) setAutoExport(autoResult.value === 'true');
      if (lastResult?.value) setLastExport(lastResult.value);
    };
    loadSettings();
  }, []);

  const handleSaveSpreadsheetId = async () => {
    await window.storage.set('logio-spreadsheet-id', spreadsheetId);
    if (gasUrl) {
      await window.storage.set('logio-gas-url', gasUrl);
    }
    setExportStatus('✅ 設定を保存しました');
    setTimeout(() => setExportStatus(''), 3000);
  };

  const handleToggleAutoExport = async (checked) => {
    setAutoExport(checked);
    await window.storage.set('logio-auto-export', checked.toString());
  };

  const handleManualExport = async () => {
    if (!gasUrl) {
      setExportStatus('❌ GAS URLを入力してください');
      return;
    }

    setExporting(true);
    setExportStatus('📤 エクスポート中...');

    try {
      const siteData = {
        siteName: sites.find(s => s.name === selectedSite)?.name || '',
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
        contractedDisposalSites: projectInfo.contractedDisposalSites || []
      };

      const payload = {
        action: 'exportAll',
        siteData: siteData,
        reportData: reports
      };

      await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });

      const now = new Date().toLocaleString('ja-JP');
      setLastExport(now);
      await window.storage.set('logio-last-export', now);
      
      setExportStatus(`✅ エクスポート完了！（${now}）\n現場データ: 1件、日報データ: ${reports.length}件`);
    } catch (error) {
      setExportStatus('❌ エクスポートに失敗しました: ' + error.message);
      console.error('Export error:', error);
    } finally {
      setExporting(false);
      setTimeout(() => setExportStatus(''), 8000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 bg-black min-h-screen">
      <div className="mb-4">
        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          閉じる
        </button>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2">EXPORT</h1>
      <p className="text-gray-400 text-sm mb-8">データをGoogle スプレッドシートにエクスポート</p>

      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">スプレッドシート設定</h2>
        
        <div className="mb-4">
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
            スプレッドシートID
          </label>
          <input
            type="text"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="例: 1RJdfmvUbMI3S48K9cOGTcigKsu5yMo_c"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white text-sm rounded-md focus:outline-none focus:border-blue-500 mb-3"
          />
          
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2 mt-4">
            GAS URL <span className="text-red-500">*必須</span>
          </label>
          <input
            type="text"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="例: https://script.google.com/macros/s/..."
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white text-sm rounded-md focus:outline-none focus:border-blue-500 mb-3"
          />
          
          <button
            onClick={handleSaveSpreadsheetId}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="inline w-4 h-4 mr-2" />
            保存
          </button>
        </div>

        <div className="text-xs text-gray-500 bg-gray-800 p-3 rounded">
          <p className="font-medium mb-2">💡 設定方法:</p>
          <p className="mb-1"><strong>1. スプレッドシートIDの取得:</strong></p>
          <p className="ml-3 mb-2">URLから「/d/」と「/edit」の間の文字列をコピー</p>
          <p className="mb-1"><strong>2. GAS URLの取得:</strong></p>
          <p className="ml-3 mb-1">Apps Script → デプロイ → 新しいデプロイ</p>
          <p className="ml-3 mb-1">種類: ウェブアプリ → 全員 → デプロイ</p>
          <p className="ml-3">ウェブアプリのURLをコピー</p>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">自動エクスポート</h3>
            <p className="text-sm text-gray-400">データ保存時に自動的にエクスポート</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoExport}
              onChange={(e) => handleToggleAutoExport(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">手動エクスポート</h2>
        
        <button
          onClick={handleManualExport}
          disabled={exporting || !gasUrl}
          className={`w-full px-6 py-4 font-bold rounded-lg transition-colors ${
            exporting || !gasUrl
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <ChevronUp className="inline w-5 h-5 mr-2" />
          {exporting ? 'エクスポート中...' : 'エクスポート実行'}
        </button>

        {exportStatus && (
          <div className={`mt-4 p-3 rounded-lg text-sm whitespace-pre-line ${
            exportStatus.startsWith('✅') 
              ? 'bg-green-900/30 text-green-400 border border-green-800'
              : exportStatus.startsWith('❌')
              ? 'bg-red-900/30 text-red-400 border border-red-800'
              : 'bg-blue-900/30 text-blue-400 border border-blue-800'
          }`}>
            {exportStatus}
          </div>
        )}
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">ステータス</h2>
        
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">最終エクスポート</span>
            <span className="text-white font-medium">
              {lastExport || '未実行'}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">現場データ</span>
            <span className="text-white font-medium">{sites.length}件</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-400">日報データ</span>
            <span className="text-white font-medium">{reports.length}件</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Part5追加ここまで
export default function LOGIOApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  
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
  const [reports, setReports] = useState([]);
  
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
        if (sitesResult?.value) {
          const parsedSites = JSON.parse(sitesResult.value);
          setSites(parsedSites);
        }

        const selectedResult = await window.storage.get('logio-selected-site');
        if (selectedResult?.value) {
          setSelectedSite(selectedResult.value);
          
          const projectResult = await window.storage.get(`logio-project-${selectedResult.value}`);
          if (projectResult?.value) {
            setProjectInfo(JSON.parse(projectResult.value));
          }
          
          const reportsResult = await window.storage.get(`logio-reports-${selectedResult.value}`);
          if (reportsResult?.value) {
            setReports(JSON.parse(reportsResult.value));
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    if (isLoggedIn) {
      loadData();
    }
  }, [isLoggedIn]);

  const handleLogin = (userId) => {
    setIsLoggedIn(true);
    setCurrentUser(userId);
    setCurrentView('home');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setCurrentView('login');
      setSelectedSite(null);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleNavigate = (view) => {
    if (view === 'settings') {
      setShowPasswordModal(true);
      return;
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === 'face1991') {
      setShowPasswordModal(false);
      setPasswordInput('');
      setCurrentView('settings');
      window.scrollTo({ top: 0, behavior: 'instant' });
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

      const reportsResult = await window.storage.get(`logio-reports-${siteName}`);
      if (reportsResult?.value) {
        setReports(JSON.parse(reportsResult.value));
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('Failed to load site data:', error);
    }
  };

  const handleDeleteSite = async (siteName) => {
    if (confirm(`現場「${siteName}」を削除しますか？\nこの操作は取り消せません。`)) {
      const newSites = sites.filter(s => s.name !== siteName);
      setSites(newSites);
      await window.storage.set('logio-sites', JSON.stringify(newSites));
      
      try {
        await window.storage.delete(`logio-project-${siteName}`);
        await window.storage.delete(`logio-reports-${siteName}`);
      } catch (error) {
        console.error('Failed to delete site data:', error);
      }
      
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
        setReports([]);
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

  const handleSaveReport = async (reportData) => {
    const newReport = {
      ...reportData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    const newReports = [...reports, newReport];
    setReports(newReports);
    
    if (selectedSite) {
      await window.storage.set(`logio-reports-${selectedSite}`, JSON.stringify(newReports));
    }
    
    handleNavigate('home');
  };

  const handleDeleteReport = async (reportId) => {
    if (confirm('この日報を削除しますか？')) {
      const newReports = reports.filter(r => r.id !== reportId);
      setReports(newReports);
      
      if (selectedSite) {
        await window.storage.set(`logio-reports-${selectedSite}`, JSON.stringify(newReports));
      }
    }
  };

  const calculateTotals = () => {
    const contractAmount = Number(projectInfo.contractAmount) || 0;
    const additionalAmount = Number(projectInfo.additionalAmount) || 0;
    const totalRevenue = contractAmount + additionalAmount;

    let accumulatedCost = 0;
    let accumulatedScrap = 0;

    reports.forEach(report => {
      if (report.workDetails) {
        accumulatedCost += (report.workDetails.inHouseWorkers || []).reduce((sum, w) => sum + (w.amount || 0), 0);
        accumulatedCost += (report.workDetails.outsourcingLabor || []).reduce((sum, o) => sum + (o.amount || 0), 0);
        accumulatedCost += (report.workDetails.vehicles || []).reduce((sum, v) => sum + (v.amount || 0), 0);
        accumulatedCost += (report.workDetails.machinery || []).reduce((sum, m) => sum + (m.unitPrice || 0), 0);
        accumulatedCost += (report.workDetails.costItems || []).reduce((sum, c) => sum + (c.amount || 0), 0);
      }
      
      if (report.wasteItems) {
        accumulatedCost += report.wasteItems.reduce((sum, w) => sum + (w.amount || 0), 0);
      }
      
      if (report.scrapItems) {
        accumulatedScrap += Math.abs(report.scrapItems.reduce((sum, s) => sum + (s.amount || 0), 0));
      }
    });

    const grossProfit = totalRevenue - accumulatedCost;
    const grossProfitWithScrap = grossProfit + accumulatedScrap;
    const grossProfitRateContract = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';
    const grossProfitRateWithScrap = totalRevenue > 0 ? ((grossProfitWithScrap / totalRevenue) * 100).toFixed(1) : '0.0';

    return {
      totalRevenue,
      accumulatedCost,
      accumulatedScrap,
      grossProfit,
      grossProfitWithScrap,
      grossProfitRateContract,
      grossProfitRateWithScrap
    };
  };

  const totals = calculateTotals();

  if (showSplash) {
    return <SplashScreen />;
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        selectedSite={selectedSite}
      />

      <div className="flex-1 overflow-y-auto">
        {currentView === 'home' && (
          <HomePage
            selectedSite={selectedSite}
            sites={sites}
            onSelectSite={handleSelectSite}
            onAddSite={handleAddSite}
            onDeleteSite={handleDeleteSite}
            onNavigate={handleNavigate}
            projectInfo={projectInfo}
            totals={totals}
            reportsCount={reports.length}
          />
        )}

        {currentView === 'settings' && (
          <ProjectSettingsPage
            projectInfo={projectInfo}
            onSave={handleSaveProject}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'input' && (
          <ReportInputPage
            onSave={handleSaveReport}
            onNavigate={handleNavigate}
            projectInfo={projectInfo}
          />
        )}

        {currentView === 'list' && (
          <ReportListPage
            reports={reports}
            onDelete={handleDeleteReport}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'project' && (
          <ProjectPage
            projectInfo={projectInfo}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'analysis' && (
          <AnalysisPage
            reports={reports}
            totals={totals}
            projectInfo={projectInfo}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'export' && (
          <ExportPage
            sites={sites}
            reports={reports}
            projectInfo={projectInfo}
            selectedSite={selectedSite}
            onNavigate={handleNavigate}
          />
        )}
      </div>

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
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
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

// Part6 メインApp完全版ここまで
