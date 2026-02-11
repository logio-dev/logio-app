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
