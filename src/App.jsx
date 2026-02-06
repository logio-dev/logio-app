import React, { useState, useEffect, useRef, Fragment } from 'react';
import { ChevronLeft, ChevronDown, ChevronUp, Plus, Save, Trash2, BarChart3, FileText, Settings, Menu, X, Home, Check } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

console.log('✅ LOGIO: Module loaded successfully');

// ========== localStorage ラッパー（window.storage互換） ==========
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
// ========== LOGIOロゴ（インダストリアル・力強い） ==========
function LOGIOLogo({ className = "", size = "md", animated = false }) {
  const sizeStyles = {
    xs: "text-lg",      // ヘッダー用 (18px)
    sm: "text-xl",      // サイドバー用 (20px)
    md: "text-4xl",     // 現場選択用 (36px)
    lg: "text-5xl",     // 現場選択用 (48px)
    xl: "text-6xl"      // スプラッシュ用 (60px)
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
        {/* 象のシルエット（背景・可愛いデザイン） */}
        <div className={`absolute inset-0 flex items-center justify-center ${animated ? 'elephant-silhouette' : 'elephant-static'}`}>
          <svg width={elephantSizes[size]} height={elephantSizes[size]} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            {/* 可愛い象のシルエット */}
            <g>
              {/* 体 */}
              <rect x="70" y="80" width="80" height="60" rx="30" fill="#ffffff" opacity="0.12"/>
              
              {/* 頭 */}
              <circle cx="90" cy="70" r="35" fill="#ffffff" opacity="0.12"/>
              
              {/* 耳（左） */}
              <ellipse cx="65" cy="60" rx="20" ry="30" fill="#ffffff" opacity="0.12"/>
              
              {/* 耳（右） */}
              <ellipse cx="115" cy="60" rx="20" ry="30" fill="#ffffff" opacity="0.12"/>
              
              {/* 鼻 */}
              <path 
                d="M 90,95 Q 85,110 75,125 Q 70,135 65,145 Q 60,155 55,165"
                stroke="#ffffff" 
                stroke-width="12" 
                fill="none" 
                opacity="0.12"
                stroke-linecap="round"
              />
              
              {/* 足（4本） */}
              <rect x="75" y="135" width="12" height="30" rx="6" fill="#ffffff" opacity="0.12"/>
              <rect x="95" y="135" width="12" height="30" rx="6" fill="#ffffff" opacity="0.12"/>
              <rect x="115" y="135" width="12" height="30" rx="6" fill="#ffffff" opacity="0.12"/>
              <rect x="135" y="135" width="12" height="30" rx="6" fill="#ffffff" opacity="0.12"/>
              
              {/* 尻尾 */}
              <path 
                d="M 150,110 Q 155,115 158,125"
                stroke="#ffffff" 
                stroke-width="5" 
                fill="none" 
                opacity="0.12"
                stroke-linecap="round"
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

// ========== 数字の縁取りスタイル ==========
const amountStrokeStyle = {
  textShadow: '0 0 3px rgba(0,0,0,0.9), 0 0 5px rgba(0,0,0,0.7), 1px 1px 3px rgba(0,0,0,1), -1px -1px 3px rgba(0,0,0,1)'
};

// ========== マスタデータ ==========
const MASTER_DATA = {
  projectNames: ['内装解体', 'スケルトン解体', '建物解体', '外装解体', '外構解体', 'アスベスト除去', '設備解体', '躯体解体'],
  salesPersons: ['間野', '八ツ田', '木嶋', '西', '鈴木', '原'],
  employees: ['五十嵐悠哉', '折田優作', '稲葉正輝', '井ケ田浩寿', '大野勝也', '石森達也', '一村琢磨', '間野昂平'],
  inHouseWorkers: ['五十嵐悠哉', '井ケ田浩寿', '稲葉正輝', '石森達也', '一村琢磨', '間野昂平', '折田優作', '大野勝也'],
  outsourcingCompanies: ['TCY興業', 'ALTEQ', '山田興業', '川田工業', 'マルカイ工業'],
  weather: ['晴', '曇', '雨', '雪'],
  workCategories: ['解体', '撤去', '清掃', '積込', '養生', '搬出'],
  vehicles: ['軽バン', '2td', '3td', '4td', '4tc', '8tc', '増td', '10tc'],
  // 車種ごとの車番マッピング
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
  // 作業時間オプション（10分単位、0:00〜24:00）
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
  // 労務費を削除し、外注費に「人工」を追加、経費に「駐車代」「道具代」を追加
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

// 車両単価設定（グローバル）
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
      {/* ハンバーガーメニュー（不均等2本線） */}
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
        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 text-white text-base font-medium rounded-md focus:outline-none focus:border-blue-500 transition-colors"
        required={required}
      >
        <option value="" className="bg-gray-900">{placeholder}</option>
        {options.map((opt) => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>)}
      </select>
    </div>
  );
}

// カスタムセレクト（2行表示対応）
function DarkSelect({ label, labelEn, options, value, onChange, placeholder = "選択してください" }) {
  console.log('🎯 DarkSelect: Rendering', { label, optionsCount: options?.length, value });
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // 選択中のオプションを取得
  const selectedOption = options.find(opt => opt.value === value);
  
  // 外側クリックでドロップダウンを閉じる
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
      
      {/* 選択ボタン */}
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
      
      {/* ドロップダウン */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-xl max-h-80 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className="w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-b-0 relative"
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

// チップ式マルチセレクト（車両・重機用）
// プルダウン式複数選択（スマホ最適化）
function MultiSelectDropdown({ label, labelEn, options, selected = [], onChange, placeholder = "選択してください" }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };
  
  return (
    <div className="mb-6">
      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label} / {labelEn}
      </label>
      
      {/* 選択ボタン */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 text-white rounded-md focus:outline-none focus:border-blue-500 text-left flex justify-between items-center"
      >
        <span className="text-base">
          {selected.length > 0 ? `${selected.length}件選択` : placeholder}
        </span>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* 選択済みアイテム表示 */}
      {selected.length > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          {selected.join('、')}
        </div>
      )}
      
      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="mt-2 bg-gray-900 border border-gray-700 rounded-md max-h-60 overflow-y-auto">
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleOption(option)}
                className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span>{option}</span>
                {isSelected && <Check className="w-4 h-4" />}
              </button>
            );
          })}
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
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:border-blue-500"
        required={required}
      />
    </div>
  );
}

// 数値入力用（手動入力、スマホキーボード対応）※統一版
function NumericInput({ label, labelEn, value, onChange, placeholder = "0", unit = "", min = 0 }) {
  const toNumberString = (v) => String(v ?? '').replace(/[^\d.]/g, ''); // 数字と小数点以外除去
  const handleChange = (raw) => {
    const cleaned = toNumberString(raw);
    // 画面表示は文字列のまま持つ（今の実装と互換）
    if (cleaned === '') return onChange('');
    // マイナスを許さない（min=0 デフォ）
    const num = Math.max(min, parseFloat(cleaned) || 0);
    // 余計な桁を戻さないため、入力中は cleaned を優先でもOK
    onChange(String(num));
  };
  return (
    <div className="mb-4">
      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label} / {labelEn}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-4 pr-12 bg-gray-800 border border-gray-700 text-white text-2xl font-semibold text-right rounded-md focus:outline-none focus:border-blue-500 tabular-nums"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}
        />
        {unit && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function TextArea({ label, labelEn, value, onChange, placeholder = "", rows = 3 }) {
  return (
    <div className="mb-4">
      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label} / {labelEn}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:border-blue-500 resize-none"
      />
    </div>
  );
}

// 大きいステッパーUI（作業員数用）
function BigStepper({ label, labelEn, value, onChange, min = 0, max = 99 }) {
  return (
    <div className="mb-4">
      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label} / {labelEn}
      </label>
      <div className="flex items-center gap-4 bg-gray-900/50 rounded-md p-4">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-14 h-14 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center text-3xl font-bold transition-colors"
        >
          −
        </button>
        <div className="flex-1 text-center">
          <div className="text-5xl font-bold text-white tabular-nums">{value}</div>
          <div className="text-xs text-gray-500 mt-1">人</div>
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-14 h-14 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center text-3xl font-bold transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

// 金額入力用（手動入力、スマホキーボード対応）
function AmountInput({ label, labelEn, value, onChange, placeholder = "0" }) {
  return (
    <div className="mb-4">
      <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
        {label} / {labelEn}
      </label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl font-semibold">¥</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-4 bg-gray-800 border border-gray-700 text-white text-2xl font-semibold text-right rounded-md focus:outline-none focus:border-blue-500 tabular-nums"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}
        />
      </div>
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

// 株価アプリ風のメトリックカード
function MetricCard({ label, value, unit = "", type = "neutral", rawValue = 0, subValue = null, subLabel = null }) {
  const styles = {
    neutral: "bg-gray-900/50",
    revenue: "bg-gray-900/50",
    cost: "bg-gray-900/50",
    profit: "bg-gray-900/50",
    rate: "bg-gray-900/50",
    scrap: "bg-gray-900/50"
  };

  // 数字のみに色を付ける（ラベルはすべて同色）
  const textStyles = {
    neutral: "text-white",
    revenue: "text-white",                                           // 売上: ホワイト
    cost: "text-red-400/80",                                         // 原価: 薄い赤
    profit: rawValue > 0 ? "text-blue-400/90" : "text-red-400/80",  // 粗利: プラス→控えめな青 / マイナス→薄い赤
    rate: "text-white",                                              // 粗利率: ホワイト
    scrap: "text-white"                                              // スクラップ: ホワイト
  };

  return (
    <div className={`${styles[type]} rounded-md p-4 flex flex-col gap-2`}>
      {/* ラベル: すべて同色（text-gray-500） */}
      <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">{label}</p>
      <div>
        {/* 数字: タイプごとに色分け、text-xlに縮小 */}
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

// ステップインジケーター
function StepIndicator({ currentStep, totalSteps }) {
  return (
    <div className="mb-6 bg-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        {[...Array(totalSteps)].map((_, i) => (
          <Fragment key={i}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
              i + 1 <= currentStep ? 'bg-gray-900 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {i + 1 < currentStep ? <Check className="w-6 h-6" /> : i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div className={`flex-1 h-1 mx-2 ${i + 1 < currentStep ? 'bg-gray-900' : 'bg-gray-300'}`} />
            )}
          </Fragment>
        ))}
      </div>
      <div className="text-center text-sm font-medium text-gray-700">
        ステップ {currentStep} / {totalSteps}
      </div>
    </div>
  );
}

// ========== ユーティリティ関数 ==========
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

// ========== サイドバーコンポーネント ==========
function Sidebar({ currentPage, onNavigate, sidebarOpen, setSidebarOpen }) {
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
      {/* サイドバー（ハンバーガーメニューで開閉） */}
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
          </div>
        </div>
      )}
    </>
  );
}

// ========== 画面コンポーネント ==========

// スプラッシュ画面（Apple風アニメーション）
function SplashScreen() {
  return (
    <>
      <style>{`
        @keyframes appleFadeIn {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          40% {
            opacity: 1;
            transform: scale(1.05);
          }
          60% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes moveToTopLeft {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50vw + 100px), calc(-50vh + 30px)) scale(0.5);
            opacity: 1;
          }
        }
        
        .splash-container {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: black;
        }
        
        .splash-logo {
          animation: 
            appleFadeIn 1.4s ease-out forwards,
            moveToTopLeft 1.0s ease-in-out 1.9s forwards;
        }
      `}</style>
      <div className="splash-container">
        <div className="splash-logo">
          <LOGIOLogo size="md" animated={false} />
        </div>
      </div>
    </>
  );
}

// 現場選択専用画面
function SiteSelectionPage({ sites, onSelectSite, onRequestAddSite }) {
  console.log('🏗️ SiteSelectionPage: Rendering', { sitesCount: sites.length });
  
  // 現場が存在しない場合
  if (sites.length === 0) {
    console.log('📝 SiteSelectionPage: No sites - showing add site form');
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          {/* ロゴ */}
          <div className="flex flex-col items-center justify-center mb-10">
            <LOGIOLogo size="lg" />
          </div>
          
          {/* 現場未登録メッセージ */}
          <div className="text-center mb-8">
            <p className="text-gray-600 text-sm mb-6">現場が登録されていません</p>
            
            {/* 新規現場登録ボタン */}
            <button
              onClick={() => {
                console.log('🔘 SiteSelectionPage: 新規現場登録ボタンがクリックされました');
                onRequestAddSite();
              }}
              className="w-full px-6 py-4 bg-gray-900/30 border border-gray-700 rounded-md text-gray-400 hover:bg-gray-900/50 hover:border-gray-600 hover:text-gray-300 transition-colors flex items-center justify-center gap-3"
            >
              <Plus className="w-5 h-5" />
              <span className="text-base font-medium">新規現場を登録</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // 現場が存在する場合（従来のUI）
  const siteOptions = sites.map(site => ({
    value: site.name,
    title: site.name,
    subtitle: site.projectNumber ? `PROJECT NO.: ${site.projectNumber}` : 'PROJECT NO.: -'
  }));
  
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* ロゴ */}
        <div className="flex flex-col items-center justify-center mb-10">
          <LOGIOLogo size="lg" />
        </div>
        
        {/* 現場選択 */}
        <DarkSelect
          label="現場"
          labelEn="PROJECT"
          options={siteOptions}
          value=""
          onChange={onSelectSite}
          placeholder="現場を選択してください"
        />
      </div>
    </div>
  );
}

function HomePage({ sites, selectedSite, onSelectSite, onNavigate, totals, projectInfo }) {
  // DarkSelect用のoptions配列を作成
  const siteOptions = sites.map(site => ({
    value: site.name,
    title: site.name,
    subtitle: site.projectNumber ? `PROJECT NO.: ${site.projectNumber}` : 'PROJECT NO.: -'
  }));
  
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 bg-black min-h-screen">
      {/* 現場選択 */}
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
          {/* メインKPI: 2×2グリッド（株価アプリ風） */}
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

          {/* スクラップ売上 - MetricCardで統一 */}
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

          {/* タブ風ナビゲーション */}
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

// PROJECT画面（プロジェクト情報の表示専用）
function ProjectPage({ projectInfo, onNavigate }) {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* 閉じるボタン */}
        <div className="mb-4">
          <button
            onClick={() => onNavigate('home')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            閉じる
          </button>
        </div>
        
        <h1 className="text-3xl font-bold mb-8">PROJECT情報</h1>
        
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 space-y-6">
          {/* プロジェクト基本情報 */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-blue-400">基本情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">プロジェクトID / PROJECT ID</p>
                <p className="text-lg font-medium">{projectInfo.projectId || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">プロジェクト番号 / PROJECT NUMBER</p>
                <p className="text-lg font-medium">{projectInfo.projectNumber || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-gray-500 mb-1">プロジェクト名 / PROJECT NAME</p>
                <p className="text-lg font-medium">{projectInfo.projectName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">クライアント / CLIENT</p>
                <p className="text-lg font-medium">{projectInfo.client || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">作業場所 / LOCATION</p>
                <p className="text-lg font-medium">{projectInfo.workLocation || '-'}</p>
              </div>
            </div>
          </div>

          {/* プロジェクト担当者 */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-blue-400">担当者</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">営業担当 / SALES PERSON</p>
                <p className="text-lg font-medium">{projectInfo.salesPerson || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">現場監督 / SITE MANAGER</p>
                <p className="text-lg font-medium">{projectInfo.siteManager || '-'}</p>
              </div>
            </div>
          </div>

          {/* プロジェクト期間 */}
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

          {/* 金額情報 */}
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

          {/* ステータス */}
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

        {/* 編集ボタン */}
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
    </div>
  );
}

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

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* 戻るボタン */}
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
          
          {/* PROJECT NO. - 表示のみ（編集不可） */}
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

          {/* 排出事業者 */}
          <TextInput 
            label="排出事業者" 
            labelEn="Discharger" 
            value={projectInfo.discharger || ''} 
            onChange={(val) => setProjectInfo({...projectInfo, discharger: val})} 
            placeholder="株式会社LOGIO" 
            required
          />

          {/* 契約処分先 */}
          <div className="mb-6">
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
              契約処分先 / Contracted Disposal Sites <span className="text-red-500">*</span>
            </label>
            
            {/* 追加フォーム */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-4">
              <div className="flex gap-2">
                <select
                  id="disposal-site-select"
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 text-white text-base rounded-md focus:outline-none focus:border-blue-500"
                  defaultValue=""
                >
                  <option value="">選択してください</option>
                  {MASTER_DATA.disposalSites.map((site) => (
                    <option key={site} value={site}>{site}</option>
                  ))}
                  <option value="__custom__">その他（手入力）</option>
                </select>
                <button
                  onClick={() => {
                    const select = document.getElementById('disposal-site-select');
                    let site = select.value;
                    
                    if (site === '__custom__') {
                      site = prompt('処分先名を入力してください');
                      if (!site) return;
                    } else if (!site) {
                      alert('処分先を選択してください');
                      return;
                    }
                    
                    if (projectInfo.contractedDisposalSites?.includes(site)) {
                      alert('既に登録されています');
                      return;
                    }
                    
                    setProjectInfo({
                      ...projectInfo,
                      contractedDisposalSites: [...(projectInfo.contractedDisposalSites || []), site]
                    });
                    
                    select.value = '';
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  追加
                </button>
              </div>
            </div>
            
            {/* 登録済みリスト */}
            {projectInfo.contractedDisposalSites && projectInfo.contractedDisposalSites.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">登録済み: {projectInfo.contractedDisposalSites.length}件</p>
                {projectInfo.contractedDisposalSites.map((site, index) => (
                  <div key={index} className="bg-gray-900/50 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-white text-sm">{site}</span>
                    <button
                      onClick={() => {
                        const newSites = projectInfo.contractedDisposalSites.filter((_, i) => i !== index);
                        setProjectInfo({...projectInfo, contractedDisposalSites: newSites});
                      }}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {(!projectInfo.contractedDisposalSites || projectInfo.contractedDisposalSites.length === 0) && (
              <p className="text-xs text-gray-500">※ 契約処分先を追加してください（必須）</p>
            )}
          </div>

          <Button onClick={onSave} icon={Save}>プロジェクト情報を保存</Button>
        </>
      )}
    </div>
  );
}

// ========== 3ステップ日報入力 ==========
// ⚠️ ここから先がPart2に続きます ⚠️
// ========== Part2: 日報入力画面（スマホ最適化版）+ 残りの画面 ==========

function ReportInputPage({ onSave, onNavigate, projectInfo }) {
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step1: 基本情報
  const [report, setReport] = useState({
    date: new Date().toISOString().split('T')[0],
    weather: '',
    workCategory: '',
    recorder: '',
    customRecorder: ''
  });

  // Step2: 作業内容・人員・稼働
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
  
  // 単価設定（初期値）
  const [unitPrices] = useState({
    inHouseDaytime: 25000,
    inHouseNighttime: 35000,
    inHouseNightLoading: 25000,
    outsourcingDaytime: 25000,
    outsourcingNighttime: 30000
  });
  
  // 作業時間（時:分）を分に変換
  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + minutes;
  };
  
  // 分を時:分に変換
  const minutesToTime = (minutes) => {
    if (!minutes) return '00:00';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Step3: 廃棄物・スクラップ
  const [wasteItems, setWasteItems] = useState([]);
  const [scrapItems, setScrapItems] = useState([]);
  
  // 旧構造（後で削除）
  const [costLines, setCostLines] = useState([]);
  const [currentCost, setCurrentCost] = useState({ costCategory: '', costItem: '', quantity: '', unitPrice: '' });
  const [wasteLines, setWasteLines] = useState([]);
  const [currentWaste, setCurrentWaste] = useState({ wasteType: '', disposalSite: '', manifestNumber: '', quantity: '', unitDisposalCost: '' });
  const [customDisposalSite, setCustomDisposalSite] = useState('');
  const [scrapLines, setScrapLines] = useState([]);
  const [currentScrap, setCurrentScrap] = useState({ scrapType: '', buyer: '', quantity: '', unitPrice: '' });

  // ステップ変更時に画面を最上部にスクロール
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // 下書き保存・読み込み
  useEffect(() => {
    loadDraft();
  }, []);

  const loadDraft = async () => {
    try {
      const draft = await window.storage.get('logio-draft-report');
      if (draft?.value) {
        const data = JSON.parse(draft.value);
        setReport(data.report || report);
        setWorkDetails({
          workCategory: data.workDetails?.workCategory || '',
          workContent: data.workDetails?.workContent || '',
          startTime: data.workDetails?.startTime || '',
          endTime: data.workDetails?.endTime || '',
          workingMinutes: data.workDetails?.workingMinutes || 0,
          inHouseWorkers: data.workDetails?.inHouseWorkers || [],
          outsourcingLabor: data.workDetails?.outsourcingLabor || [],
          vehicles: data.workDetails?.vehicles || [],
          machinery: data.workDetails?.machinery || [],
          costItems: data.workDetails?.costItems || []
        });
        setWasteItems(data.wasteItems || []);
        setScrapItems(data.scrapItems || []);
        setCurrentStep(data.currentStep || 1);
      }
    } catch (error) {
      console.log('下書きなし');
    }
  };

  const saveDraft = async () => {
    try {
      const draftData = {
        report,
        workDetails,
        wasteItems,
        scrapItems,
        currentStep
      };
      await window.storage.set('logio-draft-report', JSON.stringify(draftData));
      alert('✅ 下書きを保存しました');
    } catch (error) {
      alert('❌ 下書き保存に失敗しました');
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    if (confirm('入力内容を破棄してホーム画面に戻りますか？')) {
      onNavigate('home');
    }
  };

  // Step1の必須チェック
  const isStep1Valid = () => {
    return report.date && report.recorder;
  };

  // 最終保存
  const handleSave = async () => {
    const finalReport = {
      ...report,
      workDetails,
      wasteItems,
      scrapItems
    };
    
    // 下書きを削除
    try {
      await window.storage.delete('logio-draft-report');
    } catch (error) {
      console.log('下書き削除失敗');
    }
    
    onSave(finalReport);
  };

  // 合計計算（workDetailsから）
  const costTotal = 
    (workDetails.inHouseWorkers?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0) +
    (workDetails.outsourcingLabor?.reduce((sum, o) => sum + (o.amount || 0), 0) || 0) +
    (workDetails.vehicles?.reduce((sum, v) => sum + (v.amount || 0), 0) || 0) +
    (workDetails.machinery?.reduce((sum, m) => sum + (m.unitPrice || 0), 0) || 0) +
    (workDetails.costItems?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0);
  const wasteTotal = wasteItems?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
  const scrapTotal = wasteItems?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 bg-black min-h-screen">
      {/* 閉じるボタン */}
      <div className="mb-4">
        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-base flex items-center gap-2 min-h-[48px]"
        >
          <X className="w-5 h-5" />
          閉じる
        </button>
      </div>
      
      <StepIndicator currentStep={currentStep} totalSteps={3} />

      {/* Step1: 基本情報（スマホ最適化版 - 縦並び） */}
      {currentStep === 1 && (
        <div>
          <SectionHeader title="基本情報 / Basic Info" />
          
          {/* 縦並びレイアウト */}
          <div className="space-y-4">
            {/* 作業日 */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">
                作業日 <span className="text-red-500">*</span>
              </label>
              <input 
                type="date" 
                value={report.date} 
                onChange={(e) => setReport({...report, date: e.target.value})} 
                className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500" 
              />
            </div>
            
            {/* 天候 */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">
                天候 <span className="text-red-500">*</span>
              </label>
              <select
                value={report.weather}
                onChange={(e) => setReport({...report, weather: e.target.value})}
                className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">選択してください</option>
                {MASTER_DATA.weather.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            
            {/* 記入者 */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-3">
                記入者 <span className="text-red-500">*</span>
              </label>
              <input
                list="recorders-list"
                value={report.recorder || ''}
                onChange={(e) => setReport({...report, recorder: e.target.value})}
                placeholder="選択または入力"
                className="w-full px-4 py-4 bg-gray-900/50 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
              />
              <datalist id="recorders-list">
                {MASTER_DATA.employees.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* ボタン */}
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

      {/* Step2: 原価明細（スマホ最適化版） */}
      {currentStep === 2 && (
        <div>
          <SectionHeader title="原価明細 / Cost Details" />
          
          {/* 施工内容（縦並び） */}
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
          
          {/* 自社人工（縦並び最適化） */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-4">
              自社人工
            </label>
            
            {/* 入力フォーム（縦並び） */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">作業員</label>
                  <select
                    id="worker-name-input"
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
                    const nameSelect = document.getElementById('worker-name-input');
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
                    
                    // リセット
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
            
            {/* 登録済みリスト */}
            {workDetails.inHouseWorkers.length > 0 && (
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
            )}
            
            {workDetails.inHouseWorkers.length > 0 && (
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-white text-xl font-semibold">
                  小計: ¥{formatCurrency(workDetails.inHouseWorkers.reduce((sum, w) => sum + w.amount, 0))}
                </p>
              </div>
            )}
          </div>
          
          {/* 外注人工（縦並び最適化） */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-4">
              外注人工
            </label>
            
            {/* 入力フォーム（縦並び） */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">会社名</label>
                  <select
                    id="outsourcing-company-input"
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
                      <option value="daytime">日勤</option>
                      <option value="nighttime">夜間</option>
                    </select>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    const companySelect = document.getElementById('outsourcing-company-input');
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
                    
                    // リセット
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
            
            {/* 登録済みリスト */}
            {workDetails.outsourcingLabor.length > 0 && (
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
            )}
            
            {workDetails.outsourcingLabor.length > 0 && (
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-white text-xl font-semibold">
                  小計: ¥{formatCurrency(workDetails.outsourcingLabor.reduce((sum, item) => sum + item.amount, 0))}
                </p>
              </div>
            )}
          </div>
          
          {/* 車両（縦並び最適化） */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-4">
              車両
            </label>
            
            {/* 入力フォーム（縦並び） */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">車種</label>
                  <select
                    id="vehicle-type-input"
                    onChange={(e) => {
                      const type = e.target.value;
                      const numbers = MASTER_DATA.vehicleNumbersByType[type] || [];
                      const numberSelect = document.getElementById('vehicle-number-input');
                      numberSelect.innerHTML = '<option value="">選択</option>';
                      numbers.forEach(num => {
                        const option = document.createElement('option');
                        option.value = num;
                        option.textContent = num;
                        numberSelect.appendChild(option);
                      });
                    }}
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">選択</option>
                    {MASTER_DATA.vehicles.map((vehicle) => (
                      <option key={vehicle} value={vehicle}>
                        {vehicle}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">車番</label>
                  <select
                    id="vehicle-number-input"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="">選択</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    const type = document.getElementById('vehicle-type-input').value;
                    const number = document.getElementById('vehicle-number-input').value;
                    
                    if (!type || !number) {
                      alert('車種と車番を選択してください');
                      return;
                    }
                    
                    const amount = VEHICLE_UNIT_PRICES[type] || 0;
                    
                    setWorkDetails({
                      ...workDetails,
                      vehicles: [...workDetails.vehicles, { type, number, amount }]
                    });
                    
                    // リセット
                    document.getElementById('vehicle-type-input').value = '';
                    document.getElementById('vehicle-number-input').innerHTML = '<option value="">選択</option>';
                  }}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-base min-h-[56px]"
                >
                  登録
                </button>
              </div>
            </div>
            
            {/* 登録済みリスト */}
            {workDetails.vehicles.length > 0 && (
              <div className="space-y-3 mb-4">
                <p className="text-sm text-gray-400">登録済み: {workDetails.vehicles.length}台</p>
                {workDetails.vehicles.map((vehicle, index) => (
                  <div key={index} className="bg-gray-900/50 rounded-lg p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-white text-base font-medium">{vehicle.type} ({vehicle.number})</p>
                      <p className="text-sm text-gray-400">¥{formatCurrency(vehicle.amount)}</p>
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
                ))}
              </div>
            )}
            
            {workDetails.vehicles.length > 0 && (
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-white text-xl font-semibold">
                  小計: ¥{formatCurrency(workDetails.vehicles.reduce((sum, v) => sum + v.amount, 0))}
                </p>
              </div>
            )}
          </div>
          
          {/* その他原価（縦並び最適化） */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-4">
              その他原価
            </label>
            
            {/* 入力フォーム（縦並び） */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">原価区分</label>
                  <select
                    id="cost-category-input"
                    onChange={(e) => {
                      const category = e.target.value;
                      const machinerySelect = document.getElementById('machinery-name-select');
                      const usageDateInput = document.getElementById('usage-date-inline');
                      const usageDaysInput = document.getElementById('usage-days-inline');
                      
                      // 全て非表示
                      machinerySelect.style.display = 'none';
                      usageDateInput.style.display = 'none';
                      usageDaysInput.style.display = 'none';
                      
                      // 区分によって表示切替
                      if (category === '自社重機') {
                        machinerySelect.style.display = 'block';
                        usageDateInput.style.display = 'block';
                        usageDaysInput.style.display = 'block';
                      } else if (category === '回送費') {
                        usageDateInput.style.display = 'block';
                        usageDaysInput.style.display = 'block';
                      } else if (category === 'リース費') {
                        usageDaysInput.style.display = 'block';
                      }
                    }}
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">選択</option>
                    <option value="自社重機">自社重機</option>
                    <option value="回送費">回送費</option>
                    <option value="リース費">リース費</option>
                    <option value="材料費">材料費</option>
                    <option value="駐車代">駐車代</option>
                  </select>
                </div>
                
                {/* 重機名（自社重機のみ） */}
                <div id="machinery-name-select" style={{display: 'none'}}>
                  <label className="block text-sm text-gray-400 mb-2">重機名</label>
                  <select
                    id="machinery-name-input"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">選択</option>
                    <option value="PC78US">PC78US</option>
                    <option value="PC138US">PC138US</option>
                    <option value="__custom__">その他</option>
                  </select>
                </div>
                
                {/* 使用日（自社重機・回送費） */}
                <div id="usage-date-inline" style={{display: 'none'}}>
                  <label className="block text-sm text-gray-400 mb-2">使用日</label>
                  <input
                    id="usage-date-input"
                    type="date"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                {/* 使用日数（自社重機・回送費・リース費） */}
                <div id="usage-days-inline" style={{display: 'none'}}>
                  <label className="block text-sm text-gray-400 mb-2">日数</label>
                  <input
                    id="usage-days-input"
                    type="number"
                    placeholder="3"
                    min="1"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                {/* 金額（全て） */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">金額</label>
                  <input
                    id="cost-amount-input"
                    type="number"
                    placeholder="50000"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <button
                  onClick={() => {
                    const category = document.getElementById('cost-category-input').value;
                    const amount = parseInt(document.getElementById('cost-amount-input').value);
                    
                    if (!category || !amount) {
                      alert('原価区分と金額を入力してください');
                      return;
                    }
                    
                    const newItem = { category, amount };
                    
                    // 重機名（自社重機のみ）
                    if (category === '自社重機') {
                      const machinerySelect = document.getElementById('machinery-name-input');
                      let machineryName = machinerySelect.value;
                      if (machineryName === '__custom__') {
                        machineryName = prompt('重機名を入力してください');
                        if (!machineryName) return;
                      } else if (!machineryName) {
                        alert('重機名を選択してください');
                        return;
                      }
                      newItem.machineryName = machineryName;
                    }
                    
                    // 使用日（自社重機・回送費）
                    if (category === '自社重機' || category === '回送費') {
                      const usageDate = document.getElementById('usage-date-input').value;
                      if (!usageDate) {
                        alert('使用日を入力してください');
                        return;
                      }
                      newItem.usageDate = usageDate;
                    }
                    
                    // 使用日数（自社重機・回送費・リース費）
                    if (category === '自社重機' || category === '回送費' || category === 'リース費') {
                      const usageDays = parseInt(document.getElementById('usage-days-input').value);
                      if (!usageDays) {
                        alert('使用日数を入力してください');
                        return;
                      }
                      newItem.usageDays = usageDays;
                    }
                    
                    setWorkDetails({
                      ...workDetails,
                      costItems: [...workDetails.costItems, newItem]
                    });
                    
                    // リセット
                    document.getElementById('cost-category-input').value = '';
                    document.getElementById('machinery-name-input').value = '';
                    document.getElementById('usage-date-input').value = '';
                    document.getElementById('usage-days-input').value = '';
                    document.getElementById('cost-amount-input').value = '';
                    document.getElementById('machinery-name-select').style.display = 'none';
                    document.getElementById('usage-date-inline').style.display = 'none';
                    document.getElementById('usage-days-inline').style.display = 'none';
                  }}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-base min-h-[56px]"
                >
                  登録
                </button>
              </div>
            </div>
            
            {/* 登録済みリスト */}
            {workDetails.costItems.length > 0 && (
              <div className="space-y-3 mb-4">
                <p className="text-sm text-gray-400">登録済み: {workDetails.costItems.length}件</p>
                {workDetails.costItems.map((item, index) => (
                  <div key={index} className="bg-gray-900/50 rounded-lg p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-white text-base font-medium">
                        {item.category}
                        {item.machineryName && ` - ${item.machineryName}`}
                      </p>
                      <p className="text-sm text-gray-400">
                        {item.usageDate && `使用日: ${item.usageDate} `}
                        {item.usageDays && `${item.usageDays}日 `}
                        ¥{formatCurrency(item.amount)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const newItems = workDetails.costItems.filter((_, i) => i !== index);
                        setWorkDetails({...workDetails, costItems: newItems});
                      }}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded transition-colors min-h-[40px] min-w-[40px]"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {workDetails.costItems.length > 0 && (
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-white text-xl font-semibold">
                  小計: ¥{formatCurrency(workDetails.costItems.reduce((sum, c) => sum + c.amount, 0))}
                </p>
              </div>
            )}
          </div>
          
          {/* ボタン */}
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

      {/* Step3: 廃棄物・スクラップ（スマホ最適化版） */}
      {currentStep === 3 && (
        <div>
          <SectionHeader title="廃棄物・スクラップ / Waste & Scrap" />
          
          <p className="text-sm text-gray-400 mb-6">※ 廃棄物・スクラップがない場合はそのまま保存できます</p>

          {/* 廃棄物処分費（縦並び最適化） */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-4">
              廃棄物処分費
            </label>
            
            {/* 入力フォーム（縦並び） */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">発生材</label>
                  <select
                    id="waste-material-input"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">選択</option>
                    {MASTER_DATA.wasteTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="__custom__">その他</option>
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
                    const materialSelect = document.getElementById('waste-material-input');
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
                    
                    // リセット
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
            
            {/* 登録済みリスト */}
            {wasteItems.length > 0 && (
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
            )}
            
            {wasteItems.length > 0 && (
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-white text-xl font-semibold">
                  小計: ¥{formatCurrency(wasteItems.reduce((sum, item) => sum + item.amount, 0))}
                </p>
              </div>
            )}
          </div>

          {/* スクラップ売上（縦並び最適化） */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-400 mb-4">
              スクラップ売上
            </label>
            
            {/* 入力フォーム（縦並び） */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 mb-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">種類</label>
                  <select
                    id="scrap-type-input"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">選択</option>
                    {MASTER_DATA.scrapTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="__custom__">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">買取業者</label>
                  <select
                    id="scrap-buyer-input"
                    className="w-full px-4 py-4 bg-gray-800 border border-gray-700 text-white text-base rounded-lg focus:outline-none focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="">選択</option>
                    {MASTER_DATA.buyers.map((buyer) => (
                      <option key={buyer} value={buyer}>{buyer}</option>
                    ))}
                    <option value="__custom__">その他</option>
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
                    const typeSelect = document.getElementById('scrap-type-input');
                    let type = typeSelect.value;
                    
                    if (type === '__custom__') {
                      type = prompt('スクラップ種類を入力してください');
                      if (!type) return;
                    } else if (!type) {
                      alert('種類を選択してください');
                      return;
                    }
                    
                    const buyerSelect = document.getElementById('scrap-buyer-input');
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
                    
                    // リセット
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
            
            {/* 登録済みリスト */}
            {scrapItems.length > 0 && (
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
            )}
            
            {scrapItems.length > 0 && (
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <p className="text-white text-xl font-semibold">
                  小計: ¥{formatCurrency(Math.abs(scrapItems.reduce((sum, item) => sum + item.amount, 0)))}
                </p>
              </div>
            )}
          </div>

          {/* ボタン */}
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


function ReportListPage({ reports, onDelete, onNavigate }) {
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const filteredReports = reports.filter(r => {
    if (filterMonth && !r.date.startsWith(filterMonth)) return false;
    // 新旧データ構造に対応
    const category = r.workDetails?.workCategory || r.workCategory;
    if (filterCategory && category !== filterCategory) return false;
    return true;
  });

  const months = [...new Set(reports.map(r => r.date.substring(0, 7)))].sort().reverse();

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* 戻るボタン */}
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
  
  // 分を時:分に変換
  const minutesToTimeDisplay = (minutes) => {
    if (!minutes) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}時間${m > 0 ? m + '分' : ''}`;
  };

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
          {/* 記入者と施工内容 */}
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

          {/* 原価明細 */}
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
              
              {report.workDetails.machinery?.length > 0 && (
                <div className="mb-3 bg-gray-900/30 rounded p-2">
                  <p className="text-xs font-semibold text-blue-400 mb-2">重機: {report.workDetails.machinery.length}台</p>
                  {report.workDetails.machinery.map((m, idx) => (
                    <p key={idx} className="text-sm text-gray-300 ml-3 mb-1">
                      • {m.name} <span className="text-yellow-400">¥{formatCurrency(m.unitPrice)}</span>
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

          {/* 廃棄物 */}
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

          {/* スクラップ */}
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

          {/* 旧データ構造もサポート */}
          {report.costLines && report.costLines.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">原価（旧）: {report.costLines.length}件 / ¥{formatCurrency(report.costLines.reduce((s, c) => s + c.amount, 0))}</p>
              {report.costLines.map((cost, idx) => (
                <p key={idx} className="text-sm ml-2">・{cost.costCategory} - {cost.costItem} ¥{formatCurrency(cost.amount)}</p>
              ))}
            </div>
          )}

          {report.wasteLines && report.wasteLines.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">廃棄物（旧）: {report.wasteLines.length}件 / ¥{formatCurrency(report.wasteLines.reduce((s, w) => s + w.disposalCost, 0))}</p>
              {report.wasteLines.map((waste, idx) => (
                <div key={idx} className="text-sm ml-2">
                  <p>・{waste.wasteType} {waste.quantity}㎥ - {waste.disposalSite}</p>
                  {waste.manifestNumber && <p className="text-xs text-gray-500 ml-4">伝票: {waste.manifestNumber}</p>}
                </div>
              ))}
            </div>
          )}

          {report.scrapLines && report.scrapLines.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">スクラップ（旧）: {report.scrapLines.length}件 / ¥{formatCurrency(report.scrapLines.reduce((s, sc) => s + sc.salesAmount, 0))}</p>
              {report.scrapLines.map((scrap, idx) => (
                <p key={idx} className="text-sm ml-2">・{scrap.scrapType} {scrap.quantity}kg - {scrap.buyer}</p>
              ))}
            </div>
          )}

          <div className="text-sm text-gray-600">
            {report.vehicleType && <p>使用車両: {report.vehicleType}{report.vehicleNumber && ` (${report.vehicleNumber})`}</p>}
            <p>使用重機: {report.heavyMachinery?.join(', ') || 'なし'}</p>
            <p>記入者: {report.recorder}</p>
          </div>

          <div className="mt-4">
            <Button variant="danger" onClick={onDelete} icon={Trash2}>削除</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisPage({ reports, totals, projectInfo, onNavigate }) {
  // 労務費を除外し、既存の労務費データは経費に集約
  const costByCategory = { '材料費': 0, '外注費': 0, '経費': 0 };

  reports.forEach(r => {
    r.costLines?.forEach(c => {
      // 労務費は経費として集計
      const category = c.costCategory === '労務費' ? '経費' : c.costCategory;
      if (costByCategory[category] !== undefined) {
        costByCategory[category] = (costByCategory[category] || 0) + c.amount;
      } else {
        // 未定義カテゴリは経費扱い
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

  // 原価率計算
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 bg-black min-h-screen">
      {/* 戻るボタン */}
      <div className="mb-4">
        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors font-medium text-sm flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          閉じる
        </button>
      </div>
      
      {/* 現場情報カード */}
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
      
      {/* メインKPIサマリー */}
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

      {/* 原価率指標 */}
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

// EXPORTページ
function ExportPage({ sites, reports, projectInfo, selectedSite, onNavigate }) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [gasUrl, setGasUrl] = useState('');
  const [autoExport, setAutoExport] = useState(false);
  const [lastExport, setLastExport] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

  // 設定を読み込み
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

  // スプレッドシートIDとGAS URLを保存
  const handleSaveSpreadsheetId = async () => {
    await window.storage.set('logio-spreadsheet-id', spreadsheetId);
    if (gasUrl) {
      await window.storage.set('logio-gas-url', gasUrl);
    }
    setExportStatus('✅ 設定を保存しました');
    setTimeout(() => setExportStatus(''), 3000);
  };

  // 自動エクスポート設定を保存
  const handleToggleAutoExport = async (checked) => {
    setAutoExport(checked);
    await window.storage.set('logio-auto-export', checked.toString());
  };

  // 手動エクスポート
  const handleManualExport = async () => {
    if (!gasUrl) {
      setExportStatus('❌ GAS URLを入力してください');
      return;
    }

    setExporting(true);
    setExportStatus('📤 エクスポート中...');

    try {
      // 現場データを準備
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

      // デバッグ: 送信データをコンソールに出力
      console.log('🚀 エクスポートデータ:', payload);
      console.log('📍 GAS URL:', gasUrl);
      console.log('📊 現場:', selectedSite);
      console.log('📝 日報件数:', reports.length);

      // GASにデータ送信
      const response = await fetch(gasUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        mode: 'no-cors' // GASはno-corsが必要
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
      {/* 閉じるボタン */}
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

      {/* スプレッドシートID設定 */}
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
          <p className="mt-2 text-gray-600">例: https://docs.google.com/spreadsheets/d/<span className="text-blue-400">1RJdfmvU...</span>/edit</p>
        </div>
      </div>

      {/* 自動エクスポート設定 */}
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

      {/* 手動エクスポート */}
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

      {/* ステータス表示 */}
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

// ========== メインアプリ ==========
export default function LOGIOApp() {
  console.log('🚀 LOGIOApp: Component starting...');
  
  const [showSplash, setShowSplash] = useState(true); // スプラッシュを有効化
  const [currentPage, setCurrentPage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordSuccessCallback, setPasswordSuccessCallback] = useState(null);
  
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  
  console.log('📊 LOGIOApp: State initialized', { 
    showSplash, 
    currentPage, 
    sitesCount: sites.length, 
    selectedSite 
  });
  const [projectInfo, setProjectInfo] = useState({
    projectId: '', projectNumber: '', projectName: '', client: '', workLocation: '',
    salesPerson: '', siteManager: '', startDate: '', endDate: '',
    contractAmount: '', additionalAmount: '', status: '進行中',
    discharger: '',           // 排出事業者
    contractedDisposalSites: []  // 契約処分先（配列）
  });
  const [reports, setReports] = useState([]);

  // スプラッシュ画面タイマー（Apple風アニメーション: 3.3秒）
  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3300);
    return () => clearTimeout(timer);
  }, [showSplash]);

  useEffect(() => { loadSites(); }, []);

  const loadSites = async () => {
    try {
      const stored = await window.storage.get('logio-sites');
      if (stored?.value) {
        const loadedSites = JSON.parse(stored.value);
        
        // 各サイトのprojectNumberを取得
        const sitesWithNumbers = await Promise.all(
          loadedSites.map(async (site) => {
            try {
              const projectStored = await window.storage.get(`logio-project-${site.name}`);
              if (projectStored?.value) {
                const projectData = JSON.parse(projectStored.value);
                return { ...site, projectNumber: projectData.projectNumber || '' };
              }
            } catch (error) {
              return { ...site, projectNumber: '' };
            }
            return { ...site, projectNumber: '' };
          })
        );
        
        setSites(sitesWithNumbers);
      }
    } catch (error) { console.log('初回起動'); }
  };

  // PROJECT NO. 自動採番関数
  const generateProjectNumber = async () => {
    const currentYear = new Date().getFullYear();
    const yearPrefix = currentYear.toString();
    
    // 全サイトのprojectNumberを収集
    const allProjectNumbers = [];
    for (const site of sites) {
      try {
        const stored = await window.storage.get(`logio-project-${site.name}`);
        if (stored?.value) {
          const projectData = JSON.parse(stored.value);
          if (projectData.projectNumber) {
            allProjectNumbers.push(projectData.projectNumber);
          }
        }
      } catch (error) {
        console.log(`Failed to load project info for ${site.name}`);
      }
    }
    
    // 当年のprojectNumberのみ抽出
    const currentYearNumbers = allProjectNumbers
      .filter(num => num.startsWith(yearPrefix + '-'))
      .map(num => {
        const parts = num.split('-');
        return parts.length === 2 ? parseInt(parts[1], 10) : 0;
      })
      .filter(num => !isNaN(num));
    
    // 最大連番を取得
    const maxNumber = currentYearNumbers.length > 0 ? Math.max(...currentYearNumbers) : 0;
    
    // 新規番号を採番（3桁ゼロ埋め）
    const newNumber = (maxNumber + 1).toString().padStart(3, '0');
    
    return `${yearPrefix}-${newNumber}`;
  };

  const handleAddSite = async (siteName) => {
    try {
      // PROJECT NO.を自動採番
      const projectNumber = await generateProjectNumber();
      
      // 新規サイト作成（projectNumberを含む）
      const newSite = {
        name: siteName,
        createdAt: new Date().toISOString(),
        status: '進行中',
        projectNumber: projectNumber
      };
      const updatedSites = [...sites, newSite];
      setSites(updatedSites);
      await window.storage.set('logio-sites', JSON.stringify(updatedSites));
      
      // projectInfoを初期化して保存
      const initialProjectInfo = {
        projectId: '',
        projectNumber: projectNumber,
        projectName: siteName,
        client: '',
        workLocation: '',
        salesPerson: '',
        siteManager: '',
        startDate: '',
        endDate: '',
        contractAmount: '',
        additionalAmount: '',
        status: '進行中'
      };
      
      await window.storage.set(`logio-project-${siteName}`, JSON.stringify(initialProjectInfo));
      
      setSelectedSite(siteName);
      setProjectInfo(initialProjectInfo);
      
      alert(`✅ 現場「${siteName}」を追加しました\nPROJECT NO.: ${projectNumber}`);
    } catch (error) {
      alert('❌ 現場の追加に失敗しました');
      console.error(error);
    }
  };

  const handleDeleteSite = async (siteName) => {
    try {
      const updatedSites = sites.filter(s => s.name !== siteName);
      setSites(updatedSites);
      await window.storage.set('logio-sites', JSON.stringify(updatedSites));
      await window.storage.delete(`logio-project-${siteName}`);
      await window.storage.delete(`logio-reports-${siteName}`);
      
      // 削除された現場が選択中の場合、現場選択画面に戻る
      if (selectedSite === siteName) {
        setSelectedSite('');
      }
      
      alert(`✅ 現場「${siteName}」を削除しました`);
    } catch (error) {
      alert('❌ 現場の削除に失敗しました');
    }
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
        contractAmount: '', additionalAmount: '', status: '進行中'
      });
    } catch (error) { console.log('プロジェクト情報なし'); }
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
      const newReport = {
        id: Date.now(),
        reportId: generateId('R'),
        projectId: projectInfo.projectId || generateId('P'),
        ...reportData,
        createdAt: new Date().toISOString()
      };
      
      const updatedReports = [...reports, newReport];
      setReports(updatedReports);
      await window.storage.set(`logio-reports-${selectedSite}`, JSON.stringify(updatedReports));
      
      alert('✅ 日報を保存しました');
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
      // 新しいデータ構造: workDetails
      if (report.workDetails) {
        // 自社人工
        report.workDetails.inHouseWorkers?.forEach(w => accumulatedCost += w.amount || 0);
        // 外注人工
        report.workDetails.outsourcingLabor?.forEach(o => accumulatedCost += o.amount || 0);
        // 車両
        report.workDetails.vehicles?.forEach(v => accumulatedCost += v.amount || 0);
        // 重機
        report.workDetails.machinery?.forEach(m => accumulatedCost += m.unitPrice || 0);
        // その他原価
        report.workDetails.costItems?.forEach(c => accumulatedCost += c.amount || 0);
      }
      
      // 廃棄物
      report.wasteItems?.forEach(w => accumulatedCost += w.amount || 0);
      
      // スクラップ（マイナス値なので加算でOK）
      report.scrapItems?.forEach(s => accumulatedScrap += Math.abs(s.amount || 0));
      
      // 旧データ構造も一応サポート
      report.costLines?.forEach(cost => accumulatedCost += cost.amount || 0);
      report.wasteLines?.forEach(waste => accumulatedCost += waste.disposalCost || 0);
      report.scrapLines?.forEach(scrap => accumulatedScrap += scrap.salesAmount || 0);
    });
    
    // 粗利（スクラップ込み）
    const grossProfit = totalRevenue - accumulatedCost + accumulatedScrap;
    
    // 粗利率（契約ベース）= 粗利 ÷ 売上 × 100
    const grossProfitRateContract = totalRevenue > 0 ? (grossProfit / totalRevenue * 100).toFixed(1) : '0.0';
    
    // 粗利率（スクラップ込み）= 粗利 ÷ (売上 + スクラップ) × 100
    const totalRevenueWithScrap = totalRevenue + accumulatedScrap;
    const grossProfitRateWithScrap = totalRevenueWithScrap > 0 ? (grossProfit / totalRevenueWithScrap * 100).toFixed(1) : '0.0';
    
    return { 
      totalRevenue, 
      accumulatedCost, 
      accumulatedScrap, 
      grossProfit,                    // 粗利（スクラップ込み）
      grossProfitRateContract,        // 粗利率（契約ベース）
      grossProfitRateWithScrap        // 粗利率（スクラップ込み）
    };
  };

  const handleNavigate = (page) => {
    if (page === 'settings') {
      setPasswordSuccessCallback(() => () => setCurrentPage('settings'));
      setShowPasswordModal(true);
      setPassword('');
    } else {
      setCurrentPage(page);
    }
  };

  const handleRequestAddSite = () => {
    console.log('🔑 handleRequestAddSite: パスワードモーダルを表示します');
    setPasswordSuccessCallback(() => () => setCurrentPage('settings'));
    setShowPasswordModal(true);
    console.log('🔑 handleRequestAddSite: showPasswordModal =', true);
    setPassword('');
  };

  const handlePasswordSubmit = () => {
    if (password === 'face1991') {
      setShowPasswordModal(false);
      setPassword('');
      
      // コールバックがあれば実行、なければ設定画面に遷移
      if (passwordSuccessCallback) {
        passwordSuccessCallback();
        setPasswordSuccessCallback(null);
      } else {
        setCurrentPage('settings');
      }
    } else {
      alert('❌ パスワードが正しくありません');
      setPassword('');
    }
  };

  const totals = calculateTotals();

  console.log('🎨 LOGIOApp: Render decision', {
    showSplash,
    selectedSite,
    sitesCount: sites.length,
    showPasswordModal
  });

  // スプラッシュ画面を表示
  if (showSplash) {
    console.log('💫 LOGIOApp: Rendering SplashScreen');
    return <SplashScreen />;
  }

  console.log('🏠 LOGIOApp: Rendering main app');

  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={handleNavigate} 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex flex-col flex-1 bg-black">
        <Header 
          showMenuButton 
          onMenuClick={() => setSidebarOpen(true)} 
        />

        <main className="flex-1">
          {currentPage === 'home' && <HomePage sites={sites} selectedSite={selectedSite} onSelectSite={handleSelectSite} onNavigate={handleNavigate} totals={totals} projectInfo={projectInfo} />}
          {currentPage === 'project' && <ProjectPage projectInfo={projectInfo} onNavigate={setCurrentPage} />}
          {currentPage === 'settings' && <ProjectSettingsPage sites={sites} selectedSite={selectedSite} projectInfo={projectInfo} setProjectInfo={setProjectInfo} onSave={handleSaveProject} onAddSite={handleAddSite} onDeleteSite={handleDeleteSite} onNavigate={setCurrentPage} />}
          {currentPage === 'input' && <ReportInputPage onSave={handleSaveReport} onNavigate={setCurrentPage} projectInfo={projectInfo} />}
          {currentPage === 'list' && <ReportListPage reports={reports} onDelete={handleDeleteReport} onNavigate={setCurrentPage} />}
          {currentPage === 'analysis' && <AnalysisPage reports={reports} totals={totals} projectInfo={projectInfo} onNavigate={setCurrentPage} />}
          {currentPage === 'export' && <ExportPage sites={sites} reports={reports} projectInfo={projectInfo} selectedSite={selectedSite} onNavigate={setCurrentPage} />}
        </main>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 p-6 max-w-md w-full rounded-lg border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">管理者認証</h2>
            <p className="text-sm text-gray-400 mb-4">設定・編集には管理者パスワードが必要です</p>
            
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
              パスワード / Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="パスワードを入力"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white text-base font-medium rounded-md focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handlePasswordSubmit}
                className="px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                認証
              </button>
              <button
                onClick={() => { setShowPasswordModal(false); setPassword(''); }}
                className="px-4 py-3 bg-gray-800 border border-gray-700 text-gray-300 font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
