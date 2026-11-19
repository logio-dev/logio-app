import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { ChevronLeft, ChevronDown, Plus, Save, Trash2, BarChart3, FileText, Settings, Menu, X, Home, Check, LogOut, Calendar, Activity, TrendingUp, TrendingDown, MessageCircle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SplashScreen from './components/SplashScreen/SplashScreen';
import WacLogo from './components/WacLogo/WacLogo';
import NOTICES from './notices';


// ========== Supabase設定 ==========
// ★ Storage アップロード
async function uploadPhoto(file, siteName, date) {
  const ext = file.name.split('.').pop();
  const path = `${siteName}/${date}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const res = await fetch(`https://ruomhthswdxylopkhmnh.supabase.co/storage/v1/object/report-photos/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1b21odGhzd2R4eWxvcGtobW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzQ1NjMsImV4cCI6MjA4NzUxMDU2M30.kH60ggCa7t_M7iJQbTpgJOgUUEl_rMQZM5e6Mob6hEE`,
      'Content-Type': file.type,
    },
    body: file,
  });
  if (!res.ok) throw new Error('Upload failed: ' + res.status);
  return `https://ruomhthswdxylopkhmnh.supabase.co/storage/v1/object/public/report-photos/${encodeURIComponent(path)}`;
}

// Supabase の応答を読み、失敗なら Supabase のエラー文で Error を投げる
async function parseResponseOrThrow(res, label) {
  const bodyText = await res.text();
  if (!res.ok) {
    let parsed = null;
    try { parsed = bodyText ? JSON.parse(bodyText) : null; } catch (e) { parsed = null; }
    const msg = parsed?.message || bodyText || `${label} failed (${res.status})`;
    console.error(`${label} error:`, res.status, msg);
    throw new Error(msg);
  }
  if (!bodyText) return null;
  try { return JSON.parse(bodyText); } catch (e) { return bodyText; }
}

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
    // insert / update は失敗しても例外を出さない（既存の呼び出し元はこの動きが前提）。
    // 失敗を確実に知りたいときは insertOrThrow / updateOrThrow を使う
    async insert(data) {
      const res = await fetch(base, { method: 'POST', headers: h, body: JSON.stringify(data) });
      return res.json();
    },
    async insertOrThrow(data) {
      const res = await fetch(base, { method: 'POST', headers: h, body: JSON.stringify(data) });
      return parseResponseOrThrow(res, 'insert');
    },
    async upsert(data, onConflict) {
      const h2 = Object.assign({}, h, { 'Prefer': 'resolution=merge-duplicates,return=representation' });
      const url = onConflict ? (base + '?on_conflict=' + encodeURIComponent(onConflict)) : base;
      const res = await fetch(url, { method: 'POST', headers: h2, body: JSON.stringify(data) });
      return parseResponseOrThrow(res, 'upsert');
    },
    async update(data, filter) {
      const res = await fetch(base + '?' + filter, { method: 'PATCH', headers: h, body: JSON.stringify(data) });
      return res.json();
    },
    async updateOrThrow(data, filter) {
      const res = await fetch(base + '?' + filter, { method: 'PATCH', headers: h, body: JSON.stringify(data) });
      return parseResponseOrThrow(res, 'update');
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

// ========== ★ site_locks ヘルパー（日報の「入力中」ロック） ==========
// 使う欄: site_name（現場名）/ user_name（ログインID）/ updated_at（登録・更新日時）
// ・updated_at から LOCK_EXPIRE_MINUTES 分以上たったロックは「時間切れ」として無視する
//   （ブラウザを閉じるなどで解除されなかったロックが残り続け、入力できなくなるのを防ぐ）
// ・site_name の一意制約には頼らない（同じ現場に行が複数あっても動くよう、ほかの人の行を消してから自分の行を入れる）
const LOCK_EXPIRE_MINUTES = 60;

// 時間切れのロックか（時刻が読めないロックも時間切れとみなす）
const isLockExpired = (lock, now = Date.now()) => {
  const time = Date.parse(lock?.updated_at || '');
  if (!Number.isFinite(time)) return true;
  return now - time >= LOCK_EXPIRE_MINUTES * 60 * 1000;
};

// ほかの人の有効な（時間切れでない）ロックのうち、いちばん新しいもの
const findOtherActiveLock = (rows, userName, now = Date.now()) =>
  (Array.isArray(rows) ? rows : [])
    .filter(row => row && row.user_name !== userName && !isLockExpired(row, now))
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0] || null;

// ロックの時刻を「HH:MM」で表す
const formatLockTime = (updatedAt) => {
  const date = new Date(updatedAt || '');
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
};

const siteLocks = {
  // 日報入力を始める。ほかの人の有効なロックがあれば { ok: false, lock } を返す。
  // force: true なら、そのロックを解除して自分のロックに置き換える
  async acquire(siteName, userName, { force = false } = {}) {
    const siteFilter = `site_name=eq.${encodeURIComponent(siteName)}`;
    try {
      const db = sb('site_locks');
      const existing = await db.select(siteFilter);
      const rows = Array.isArray(existing) ? existing : [];
      const otherLock = findOtherActiveLock(rows, userName);
      if (otherLock && !force) return { ok: false, lock: otherLock, lockedBy: otherLock.user_name };
      const now = new Date().toISOString();
      // ほかの人の行（時間切れ・解除したもの）を消す
      if (rows.some(row => row && row.user_name !== userName)) {
        await db.delete(`${siteFilter}&user_name=neq.${encodeURIComponent(userName)}`);
      }
      // 自分の行があれば時刻を更新、なければ登録（どちらも updated_at に今の時刻を入れる）
      if (rows.some(row => row && row.user_name === userName)) {
        await db.update({ updated_at: now }, `${siteFilter}&user_name=eq.${encodeURIComponent(userName)}`);
      } else {
        await db.insert({ site_name: siteName, user_name: userName, updated_at: now });
      }
      return { ok: true, lock: null, lockedBy: null };
    } catch(e) {
      console.error('lock acquire error:', e);
      return { ok: true, lock: null, lockedBy: null }; // エラー時は通す
    }
  },
  async release(siteName, userName) {
    try {
      await sb('site_locks').delete(`site_name=eq.${encodeURIComponent(siteName)}&user_name=eq.${encodeURIComponent(userName)}`);
    } catch(e) { console.error('lock release error:', e); }
  },
  // 現場名の変更に合わせて、その現場のロックの site_name を新しい名前に書き換える。
  // 失敗しても例外は出さない（名前変更は成功扱いのまま）。コンソールに記録だけ残す
  async renameSite(oldName, newName) {
    try {
      const result = await sb('site_locks').update({ site_name: newName }, `site_name=eq.${encodeURIComponent(oldName)}`);
      if (!Array.isArray(result)) console.error('lock renameSite error:', oldName, '→', newName, result);
    } catch(e) { console.error('lock renameSite error:', oldName, '→', newName, e); }
  },
  // 現場の削除に合わせて、その現場のロックをすべて消す。
  // 失敗しても例外は出さない（削除は成功扱いのまま）。コンソールに記録だけ残す
  async removeSite(siteName) {
    try {
      const ok = await sb('site_locks').delete(`site_name=eq.${encodeURIComponent(siteName)}`);
      if (!ok) console.error('lock removeSite error:', siteName);
    } catch(e) { console.error('lock removeSite error:', siteName, e); }
  },
  // ホームの「入力中」表示用。時間切れのロックは無視し、ほかの人のロックを優先して返す
  async check(siteName, userName = '') {
    try {
      const data = await sb('site_locks').select(`site_name=eq.${encodeURIComponent(siteName)}`);
      const active = (Array.isArray(data) ? data : []).filter(row => row && !isLockExpired(row));
      const lock = findOtherActiveLock(active, userName) || active[0];
      return lock ? lock.user_name : null;
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
  projectNames: ['内装解体', 'スケルトン工事', '産廃処分', '木造解体', 'S造解体', 'RC造解体', '外構解体', '設備解体', 'アスベスト工事', 'その他工事'],
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
  outsourcingCompanies: ['TCY興業', 'ALTEQ', 'MC興業', 'ケー', 'マルカイ工業', '川田工業'],
  weather: ['晴', '曇', '雨', '雪'],
  workCategories: ['解体', '清掃', '積込', '搬出'],
  vehicles: ['軽バン', '2td', '3td', '4td', '4tc', '4tu', '8tc', '増td', '10tc', '東リース2t', '東リース3t', '道具車'],
  vehicleNumbersByType: {
    '軽バン': ['た1'], '2td': ['77', '201'],
    '3td': ['8736', '55', '3122', '66', '4514', '33', '3000', '1000', '6000', '44'],
    '4td': ['6994'], '4tc': ['2265', '11', '3214', '858', '8000', '4000', '5000', '8025', '88'],
    '8tc': ['7000'], '増td': ['22'], '10tc': ['181', '381'], '4tu': [], '東リース2t': [], '東リース3t': [], '道具車': []
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
  disposalSites: ['入間緑化', '石坂(直行)', '石坂(積保)', 'ワイエム', 'フルハシ', 'ミダック', 'リバー', '二光産業', '木村建設', 'ウムヴェルト', 'ギプロ', '中央環境', '戸部組', '東和アークス'],
  scrapTypes: ['金属くず'],
  buyers: ['小林金属', '高橋金属', 'ナンセイスチール', '服部金属', 'サンビーム', '光田産業', '青木商店', '長沼商事'],
  statuses: ['着工前・進行中', '完了']
};

const VEHICLE_UNIT_PRICES = {
  '軽バン': 0, '2td': 10000, '3td': 10000, '4td': 15000,
  '4tc': 15000, '4tu': 15000, '8tc': 20000, '増td': 20000, '10tc': 20000,
  '東リース2t': 10000, '東リース3t': 10000,
  '道具車': 0
};

// ★ 金属売上時の買取業者リスト(固定)
const METAL_BUYERS = ['高橋金属', '長沼金属', '小林金属', 'ナンセイスチール', '日東物産', '有明興業'];

const generateId = (prefix) => {
  if (crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
const formatCurrency = (num) => new Intl.NumberFormat('ja-JP').format(num);
const getDayOfWeek = (dateStr) => {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[new Date(dateStr).getDay()];
};
const getInHouseWorkerCount = (worker = {}) => {
  const raw = Number.parseFloat(worker.count);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return worker.shift === 'halfDay' ? 0.5 : 1;
};
const getOutsourcingCount = (entry = {}) => {
  const raw = Number.parseFloat(entry.count ?? entry.workers ?? 0);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
};

// ========== 車両費の重複除去ヘルパー ==========
// 1日の日報内で「車両」「産廃担当者の車両」「スクラップ担当者の車両」に
// 同じ車種+車番を入力した場合、車両費を1回だけ計上する
//   - vehicles[]:        type + number + amount
//   - wasteItems[]:      workerVType + workerVNumber + vehicleAmount
//   - scrapItems[]:      workerVType + workerVNumber + vehicleAmount
// キーは "車種|車番"。車種だけ・車番だけのときも区別できるように両方使う。
// 車種が空のものは集計対象外(車両費0)。
// ★ さらに「isSwap === true」の車両は車両費を計上しない(乗り換え対応)
// ★ 自動検出: 同じ担当者(workerName)が複数車両を使用する場合、2台目以降を自動的に乗り換えとみなす
function getReportVehicleCost(report) {
  if (!report) return 0;
  const map = new Map(); // key -> amount
  const workerVehicleCount = new Map(); // workerName -> count (担当者ごとの車両使用台数)
  const wd = report.workDetails || {};
  (wd.vehicles || []).forEach(v => {
    if (!v || !v.type) return;
    if (v.isSwap === true) return; // ★ 明示的に乗り換えなら除外
    const key = `${v.type}|${v.number || ''}`;
    const amt = v.amount || 0;
    if (!map.has(key) || map.get(key) < amt) map.set(key, amt);
  });
  // wasteItems/scrapItems は担当者でグルーピング
  // ★ 同担当者の「1台目」は isSwap フラグに関わらず必ず計上(誤データ対策)
  // ★ 2台目以降は isSwap=true or 自動判定で除外
  const processWorkerItem = (item, amountKey) => {
    if (!item || !item.workerVType) return;
    const workerName = item.workerName || '';
    if (workerName) {
      const count = workerVehicleCount.get(workerName) || 0;
      if (count >= 1) return; // 2台目以降は車両費計上しない(自動乗り換え)
      // 1台目だが明示的に isSwap=true なら除外
      if (item.isSwap === true) {
        workerVehicleCount.set(workerName, count + 1); // カウントは進める
        return;
      }
      workerVehicleCount.set(workerName, count + 1);
    } else {
      // 担当者なしの場合は isSwap のみで判定
      if (item.isSwap === true) return;
    }
    const key = `${item.workerVType}|${item.workerVNumber || ''}`;
    const amt = item[amountKey] || 0;
    if (!map.has(key) || map.get(key) < amt) map.set(key, amt);
  };
  (report.wasteItems || []).forEach(w => processWorkerItem(w, 'vehicleAmount'));
  (report.scrapItems || []).forEach(sc => processWorkerItem(sc, 'vehicleAmount'));
  let total = 0;
  map.forEach(v => { total += v; });
  return total;
}
// 複数日報の合計
function getReportsVehicleCost(reports) {
  return (reports || []).reduce((s, r) => s + getReportVehicleCost(r), 0);
}

// ========== 現場のお金の数え方（日報PDFの集計と同じ） ==========
// 工事売上・原価・金属売上・粗利は、どの画面でもこの2つの関数で数える。
// 保存されている金額をそのまま足すだけで、単価の計算や保存する値は変えない。
const toYen = (v) => parseFloat(v) || 0;
const sumYen = (list, key = 'amount') => (list || []).reduce((s, x) => s + toYen(x?.[key]), 0);

// 1日ぶん: 日報1件の原価（その日の分）と金属売上
function calcReportDayMoney(report) {
  const wd = report?.workDetails || {};
  const waste = report?.wasteItems || [];
  const parts = {
    inHouse: sumYen(wd.inHouseWorkers),              // 自社人工
    outsourcing: sumYen(wd.outsourcingLabor),        // 外注人工
    vehicle: getReportVehicleCost(report),           // 車両費（同じ車両は1回）
    haishi: sumYen(waste, 'haishiAmount'),           // 配車費
    machinery: sumYen(wd.machinery, 'unitPrice'),    // 重機
    envItems: sumYen(wd.envItems),                   // 旧形式: 環境課配車
    extItems: sumYen(wd.extItems),                   // 旧形式: 外部運搬
    transport: sumYen(wd.transportEntries),          // 旧形式: 配送費
    disposal: waste.reduce((s, w) => s + Math.max(toYen(w?.amount), 0), 0), // 処分費（金額がプラスの行だけ）
    dailyExpenses: sumYen(wd.dailyExpenses),         // その日の経費
  };
  const cost = Object.values(parts).reduce((s, v) => s + v, 0);
  // 金属売上: 処分の行のマイナス金額（絶対値）＋ 旧形式 scrapItems（その日の合計の絶対値。日報PDFと同じ）
  // 原価からは引かない
  const metal = waste.reduce((s, w) => s + Math.max(-toYen(w?.amount), 0), 0) + Math.abs(sumYen(report?.scrapItems));
  return { cost, parts, metal };
}

// 現場ぶん: 日報の配列と案件情報から、工事売上・原価・金属売上・粗利を数える
function calcSiteMoney(reports, projectInfo) {
  const pi = projectInfo || {};
  const days = (reports || []).map(calcReportDayMoney);
  const reportParts = {}; // 日報の分（項目ごとの合計）
  days.forEach(d => Object.entries(d.parts).forEach(([k, v]) => { reportParts[k] = (reportParts[k] || 0) + v; }));
  const reportCost = days.reduce((s, d) => s + d.cost, 0);
  const projectParts = { // 案件の分
    transfer: toYen(pi.transferCost),   // 回送費
    lease: toYen(pi.leaseCost),         // リース費
    materials: toYen(pi.materialsCost), // 資材費
    direct: sumYen(pi.miscItems || [...(pi.outsourcingItems || []), ...(pi.siteExpenseItems || []), ...(pi.sgaItems || [])]), // 直接原価
    expenses: sumYen(pi.expenses),      // 案件の経費
  };
  const projectCost = Object.values(projectParts).reduce((s, v) => s + v, 0);
  const estimateRevenue = toYen(pi.contractAmount) + toYen(pi.additionalAmount); // 見積金額＋追加金額
  const billingRevenue = toYen(pi.billingAmount);                                // 請求金額
  const isProvisional = !(billingRevenue > 0); // 請求金額が無い間は「仮」
  const revenue = isProvisional ? estimateRevenue : billingRevenue;              // 工事売上
  const cost = reportCost + projectCost;                                          // 原価
  const grossProfit = revenue - cost;                                             // 粗利（金属売上は入れない）
  return {
    revenue, isProvisional, estimateRevenue, billingRevenue,
    cost, reportCost, projectCost, reportParts, projectParts,
    metalRevenue: days.reduce((s, d) => s + d.metal, 0), // 金属売上（工事売上・原価とは別）
    grossProfit,
    grossMargin: revenue > 0 ? grossProfit / revenue * 100 : 0, // 粗利率（％）
  };
}

// ★ 乗り換え判定ヘルパー: wasteItems と scrapItems を結合した順で
// 同じ workerName の2回目以降を「自動乗り換え」として返す
// 返り値: Map<index, true> (index は結合配列内のインデックス)
function getAutoSwapIndices(wasteItems, scrapItems) {
  const swapSet = new Set();
  const seen = new Set();
  const all = [...(wasteItems||[]).map(w=>({...w,_kind:'waste'})), ...(scrapItems||[]).map(s=>({...s,_kind:'scrap'}))];
  all.forEach((item, idx) => {
    if (!item || !item.workerName || !item.workerVType) return;
    if (item.isSwap === true) { swapSet.add(`${item._kind}:${idx}`); return; }
    const key = item.workerName;
    if (seen.has(key)) {
      swapSet.add(`${item._kind}:${idx}`);
    } else {
      seen.add(key);
    }
  });
  return swapSet;
}
// 単一の wasteItems / scrapItems 配列内で、index ベースの乗り換えセットを返す
function getAutoSwapIndicesForArray(items) {
  const swapSet = new Set();
  const seen = new Set();
  (items||[]).forEach((item, idx) => {
    if (!item || !item.workerName || !item.workerVType) return;
    if (item.isSwap === true) { swapSet.add(idx); return; }
    if (seen.has(item.workerName)) {
      swapSet.add(idx);
    } else {
      seen.add(item.workerName);
    }
  });
  return swapSet;
}

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
function Header({ showMenuButton = false, onMenuClick, onReload, onSearch, reloading = false, mascots = null, themeSong = null }) {
  return (
    <header className="bg-transparent no-print" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
      borderBottom: '1px solid #E8E8E8',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      pointerEvents: 'none',
    }}>
      <style>{`@keyframes logio-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', height:'52px', paddingLeft:'16px', paddingRight:'16px', pointerEvents:'auto' }}>
        {/* 左：ハンバーガー（テーマ曲の再生中は、右隣に「♪ ■」停止ボタン） */}
        <div style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', display:'flex', alignItems:'center', gap:'4px' }}>
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
          {themeSong && themeSong.state !== 'idle' && <ThemeStopButton onStop={themeSong.stop} />}
        </div>
        {/* 中央：ロゴ */}
        <WacLogo variant="header" />
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
      <label style={{display:"block",fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>
        {label} / {labelEn} {required && <span style={{color:'#f87171'}}>*</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width:'100%', padding:'10px 12px', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.05)', color:'#fff', borderRadius:9, fontSize:15, outline:'none', boxSizing:'border-box', maxWidth:'100%', fontFamily:'inherit', WebkitAppearance:'none' }}
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
      <label style={{display:"block",fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>
        {label} / {labelEn} {required && <span style={{color:'#f87171'}}>*</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'10px 12px', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.05)', color:'#fff', borderRadius:9, fontSize:15, outline:'none', boxSizing:'border-box', maxWidth:'100%', fontFamily:'inherit' }}
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
    { id: 'settings', label: '設定・編集', icon: Settings }
  ];

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full border-r" style={{background:'#fff', borderColor:'#E8E8E8'}}>
            <div className="flex-1 h-0 overflow-y-auto" style={{ paddingTop:'calc(env(safe-area-inset-top, 0px) + 20px)', paddingBottom:'16px' }}>
              {/* ロゴの行。閉じる「✕」は行の右端（白い板の外に出すと上の帯のアイコンに重なり、幅320pxでは画面の外に出るため） */}
              <div className="flex items-center justify-between flex-shrink-0 px-4 mb-8">
                <WacLogo variant="menu" />
                <button onClick={() => setSidebarOpen(false)} aria-label="メニューを閉じる" title="メニューを閉じる"
                  className="flex items-center justify-center flex-shrink-0 h-10 w-10 rounded-full focus:outline-none">
                  <X className="h-6 w-6" style={{color:'#1C1917'}} />
                </button>
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

// ========== ブラウザに残ったログイン ==========
// 2026-11-14 アプリを開いたとき、前回のログインが会社用の2つか管理者のIDのときだけ、そのまま使う。
// それ以外のID（外した協力会社用など）や、古い形で判断できないときは null を返し、ログイン画面を出す。
// ブラウザに残ったデータは消さない（ログインし直すと上書きされる）。
// ※ ログインできるIDを変えるときは、下の LoginPage の handleLogin と一緒にここも直す。
function restoreSavedLogin() {
  try {
    const saved = JSON.parse(localStorage.getItem('wac_user'));
    const userId = saved && typeof saved === 'object' ? saved.userId : null;
    if (userId === 'face1991' || userId === 'ryokuka2005') return { type: 'company', userId };
    if (userId === 'admin2026') return { type: 'admin', userId };
  } catch {}
  return null;
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
        <div style={{width:'100%', maxWidth:360, display:'flex', flexDirection:'column', alignItems:'center', marginBottom:16}}>
          <WacLogo variant="login" />
        </div>

        {/* ログインカード */}
        <div className="login-card" style={{width:'100%', maxWidth:360}}>
          <div style={{display:'flex', gap:8, justifyContent:'center', marginBottom:14}}>
            <button className="mascot-toggle" onClick={()=>{setMascot('kun');setUserId('');setPassword('');setError('');}}
              style={{width:32,height:32,borderRadius:'50%',border:`2px solid ${mascot==='kun'?'#6366F1':'#E5E7EB'}`,background:mascot==='kun'?'#EEF2FF':'#fff',overflow:'hidden',padding:2}}>
              <img src="/face-kun.svg" alt="くん" style={{width:'100%',height:'100%'}} />
            </button>
            <button className="mascot-toggle" onClick={()=>{setMascot('chan');setUserId('');setPassword('');setError('');}}
              style={{width:32,height:32,borderRadius:'50%',border:`2px solid ${mascot==='chan'?'#EC4899':'#E5E7EB'}`,background:mascot==='chan'?'#FDF2F8':'#fff',overflow:'hidden',padding:2}}>
              <img src="/face-chan.svg" alt="ちゃん" style={{width:'100%',height:'100%'}} />
            </button>
          </div>
          <div style={{display:'flex',gap:24,justifyContent:'center',marginBottom:16}}>
            <span style={{fontSize:10,color:mascot==='kun'?'#6366F1':'#9CA3AF',fontWeight:mascot==='kun'?700:400}}>一般</span>
            <span style={{fontSize:10,color:mascot==='chan'?'#EC4899':'#9CA3AF',fontWeight:mascot==='chan'?700:400}}>管理者</span>
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


// ========== ホームの「お知らせ」欄（文は src/notices.js にだけ書く） ==========
const NOTICE_CATEGORIES = ['お知らせ', '新着', 'お願い'];
const NOTICE_NEW_DAYS = 7;       // newFrom の日から何日間「NEW」を付けるか
const NOTICE_SHOW_FIRST = 5;     // これより多いときは、この件数まで出して「もっと見る」
const NOTICE_LABEL_STYLES = {
  'お願い':   { background: '#FFC400', color: '#000' },
  '新着':     { background: '#22C55E', color: '#fff' },
  'お知らせ': { background: '#E5E7EB', color: '#374151' },
};

// notices.js に書き間違いがあっても画面が止まらないよう整える
// （見出しが空・かたまりでない行は飛ばす。種類が3つ以外なら「お知らせ」として出す）
const normalizeNotices = (list) => (Array.isArray(list) ? list : []).flatMap(item => {
  if (!item || typeof item !== 'object') return [];
  const title = typeof item.title === 'string' ? item.title.trim() : '';
  if (!title) return [];
  return [{
    category: NOTICE_CATEGORIES.includes(item.category) ? item.category : 'お知らせ',
    title,
    body: typeof item.body === 'string' && item.body.trim() ? item.body : '',
    newFrom: typeof item.newFrom === 'string' ? item.newFrom.trim() : '',
  }];
});

// newFrom（YYYY-MM-DD）の日から NOTICE_NEW_DAYS 日間だけ true。日付の書き方が違えば false
const isNoticeNew = (newFrom, today = new Date()) => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(newFrom || '');
  if (!m) return false;
  const from = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (from.getMonth() !== Number(m[2]) - 1 || from.getDate() !== Number(m[3])) return false;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((start - from) / 86400000);
  return days >= 0 && days < NOTICE_NEW_DAYS;
};

function HomeNotices() {
  const [expanded, setExpanded] = useState(false);
  const notices = normalizeNotices(NOTICES);
  if (notices.length === 0) return null; // 0件ならお知らせ欄そのものを出さない
  const collapsible = notices.length > NOTICE_SHOW_FIRST;
  const shown = collapsible && !expanded ? notices.slice(0, NOTICE_SHOW_FIRST) : notices;
  return (
    <section aria-label="お知らせ" className="mb-4" style={{ background:'#fff', borderRadius:18, padding:'14px 16px', border:'0.5px solid #E8E8E8', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
      <p style={{ fontSize:9, fontWeight:700, color:'#1E3A5F', letterSpacing:'.1em', marginBottom:5 }}>NOTICE</p>
      <h2 style={{ fontSize:15, fontWeight:800, color:'#111', marginBottom:4 }}>お知らせ</h2>
      <ul style={{ listStyle:'none', margin:0, padding:0 }}>
        {shown.map((notice, i) => (
          <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'10px 0', borderTop: i === 0 ? 'none' : '0.5px solid #EEEEEE' }}>
            <span style={{ ...NOTICE_LABEL_STYLES[notice.category], flexShrink:0, minWidth:54, textAlign:'center', boxSizing:'border-box', fontSize:10, fontWeight:700, lineHeight:1, padding:'4px 6px', borderRadius:6, marginTop:2, whiteSpace:'nowrap' }}>{notice.category}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:14, fontWeight:700, color:'#1C1917', lineHeight:1.45, overflowWrap:'anywhere' }}>
                {notice.title}
                {isNoticeNew(notice.newFrom) && <span style={{ marginLeft:6, fontSize:9, fontWeight:800, color:'#EF4444', letterSpacing:'.04em', verticalAlign:'middle' }}>NEW</span>}
              </p>
              {/* 本文は文字としてそのまま出す（改行はそのまま改行。HTML は解釈しない） */}
              {notice.body && <p style={{ fontSize:12.5, color:'#6B7280', lineHeight:1.6, marginTop:3, whiteSpace:'pre-wrap', overflowWrap:'anywhere' }}>{notice.body}</p>}
            </div>
          </li>
        ))}
      </ul>
      {collapsible && (
        <button onClick={() => setExpanded(!expanded)}
          style={{ width:'100%', marginTop:4, padding:'10px', background:'#F4F4F4', border:'none', borderRadius:10, fontSize:13, fontWeight:600, color:'#374151', cursor:'pointer', fontFamily:'inherit' }}>
          {expanded ? '閉じる' : `もっと見る（あと${notices.length - NOTICE_SHOW_FIRST}件）`}
        </button>
      )}
    </section>
  );
}

// ========== テーマ曲のバナー（お知らせ欄の下。曲・画像は public/music/） ==========
const THEME_SONG_URL = '/music/face_theme.mp3';
const THEME_SONG_VOLUME = 0.5;          // 音量（0〜1）。iPhone はブラウザから音量を変えられないので端末の音量になる
const THEME_SONG_LOAD_TIMEOUT_MS = 15000; // これだけ待っても鳴らなければ「再生できませんでした」
const THEME_BANNER_CSS = `
  @keyframes faceThemeLogoSpin { to { transform: rotate(360deg); } }
  @keyframes faceThemeLogoGlow {
    0%,100% { box-shadow: 0 0 6px 1px rgba(255,196,0,0.28); }
    50%     { box-shadow: 0 0 20px 6px rgba(255,196,0,0.62); }
  }
  @keyframes faceThemeSpin { to { transform: rotate(360deg); } }
  .face-theme-banner[data-state="playing"] .face-theme-logo { animation: faceThemeLogoSpin 8s linear infinite; }
  .face-theme-banner[data-state="playing"] .face-theme-logo-glow { animation: faceThemeLogoGlow 2s ease-in-out infinite; }
  .face-theme-spinner { animation: faceThemeSpin 0.9s linear infinite; }
  @media (prefers-reduced-motion: reduce) {
    .face-theme-banner .face-theme-logo, .face-theme-banner .face-theme-logo-glow { animation: none !important; }
  }
`;

// ★ テーマ曲を鳴らす部分（アプリ全体の土台 LOGIOApp で1つだけ使う）。
//   画面を切り替えても消えないので、現場を選んだり別の画面に移ったりしても続きが流れる。
//   止めるのは: 停止ボタン（バナー・ヘッダー）、ログアウト、最後まで流れたとき
function useThemeSong() {
  const audioRef = useRef(null);
  const errorTimerRef = useRef(null);
  const [state, setState] = useState('idle'); // idle（止まっている）/ loading（読み込み中）/ playing（再生中）
  const [failed, setFailed] = useState(false); // 「再生できませんでした」を出している

  // 再生できなかったとき: 止まった状態に戻し、短く知らせる（次のタップで読み込み直す）
  const fail = (audio) => {
    if (audioRef.current !== audio) return;
    audio.pause();
    audioRef.current = null;
    setState('idle');
    setFailed(true);
    clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setFailed(false), 3000);
  };

  // 曲は最初にタップされたときに初めて読み込む（画面を開いただけでは読み込まない）
  const getAudio = () => {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio(THEME_SONG_URL);
    audio.preload = 'auto';
    audio.volume = THEME_SONG_VOLUME;
    audio.addEventListener('playing', () => { if (audioRef.current === audio) setState('playing'); });
    audio.addEventListener('waiting', () => { if (audioRef.current === audio && !audio.paused) setState('loading'); });
    audio.addEventListener('ended', () => {
      if (audioRef.current !== audio) return;
      audio.currentTime = 0;
      setState('idle');
    });
    audio.addEventListener('error', () => fail(audio));
    audioRef.current = audio;
    return audio;
  };

  const stop = () => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.currentTime = 0; } // 次は頭から
    setState('idle');
  };

  const toggle = () => {
    setFailed(false);
    if (state !== 'idle') { stop(); return; }
    const audio = getAudio();
    setState('loading');
    const played = audio.play();
    if (played && played.catch) {
      played.catch(err => { if (err?.name !== 'AbortError') fail(audio); }); // AbortError は読み込み中に止めたとき
    }
  };

  // 読み込みがいつまでも終わらないとき（通信が切れたなど）は止める
  useEffect(() => {
    if (state !== 'loading') return undefined;
    const audio = audioRef.current;
    const timer = setTimeout(() => fail(audio), THEME_SONG_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [state]);

  // アプリが閉じられたら止める
  useEffect(() => () => {
    clearTimeout(errorTimerRef.current);
    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) { audio.pause(); audio.currentTime = 0; }
  }, []);

  return { state, failed, toggle, stop };
}

// ★ テーマ曲のバナー（見た目だけ。鳴らすのは useThemeSong）
function ThemeBanner({ song }) {
  const { state, failed, toggle } = song;
  return (
    <button type="button" onClick={toggle} className="face-theme-banner" data-state={state}
      aria-label="フェイスのテーマ曲を再生" aria-pressed={state !== 'idle'}
      style={{ position:'relative', display:'block', width:'100%', height:140, padding:0, marginBottom:16, background:'linear-gradient(135deg, #3A4558 0%, #2A3343 100%)', border:'1px solid #4A5568', borderRadius:18, boxShadow:'0 2px 8px rgba(0,0,0,0.12)', overflow:'hidden', cursor:'pointer', WebkitTapHighlightColor:'transparent' }}>
      <style>{THEME_BANNER_CSS}</style>
      {/* ロゴ（丸く切り抜いた全体を真ん中に。再生中はレコードのように回り、周りが黄色く光る） */}
      <span className="face-theme-logo-glow"
        style={{ position:'absolute', left:'50%', top:'50%', width:128, height:128, marginLeft:-64, marginTop:-64, borderRadius:'50%' }}>
        <img src="/music/face_music_logo_round.png" alt="" className="face-theme-logo" draggable={false}
          style={{ display:'block', width:128, height:128 }} />
      </span>
      {/* 再生ボタン（右端） */}
      <span aria-hidden="true"
        style={{ position:'absolute', right:16, top:'50%', width:44, height:44, marginTop:-22, borderRadius:'50%', background:'#FFC400', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {state === 'loading' ? (
          <svg className="face-theme-spinner" width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="rgba(0,0,0,0.2)" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="#111" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : state === 'playing' ? (
          <svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="1.5" fill="#111" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginLeft:3 }}><path d="M3 1.8v14.4a1 1 0 0 0 1.5.86l12-7.2a1 1 0 0 0 0-1.72l-12-7.2A1 1 0 0 0 3 1.8z" fill="#111" /></svg>
        )}
      </span>
      {failed && (
        <span role="status" style={{ position:'absolute', left:'50%', bottom:6, transform:'translateX(-50%)', fontSize:11, fontWeight:600, color:'#fff', background:'rgba(0,0,0,0.7)', padding:'3px 10px', borderRadius:999, whiteSpace:'nowrap' }}>再生できませんでした</span>
      )}
    </button>
  );
}

// ★ 再生中だけ出す小さな「♪ ■」停止ボタン（ヘッダーの左側。ヘッダーが隠れる画面では右下に浮かべる）
function ThemeStopButton({ onStop, floating = false }) {
  return (
    <button type="button" onClick={onStop} className="no-print face-theme-stop" aria-label="テーマ曲を止める" title="テーマ曲を止める"
      style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, height:28, padding:'0 9px', borderRadius:999, border:'none',
        background:'#FFC400', color:'#111', fontSize:13, fontWeight:700, lineHeight:1, cursor:'pointer', fontFamily:'inherit', WebkitTapHighlightColor:'transparent',
        ...(floating ? { position:'fixed', right:16, bottom:'calc(20px + env(safe-area-inset-bottom, 0px))', zIndex:150, height:36, padding:'0 12px', boxShadow:'0 4px 12px rgba(0,0,0,0.25)' } : {}) }}>
      <span aria-hidden="true">♪</span>
      <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10"><rect width="10" height="10" rx="1.5" fill="#111" /></svg>
    </button>
  );
}

// ========== HomePage ==========
function HomePage({ sites, selectedSite, onSelectSite, onNavigate, totals, projectInfo, reports, lockStatus, currentUserId, sitesReady, currentPage, onViewPdf, themeSong }) {
  const [financeOpen, setFinanceOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [wasteOpen, setWasteOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  // ★ 現場セレクターのタブフィルタ (all=全て / 着工前・進行中 / 完了)
  const [siteFilterTab, setSiteFilterTab] = useState('着工前・進行中');
  const [homePhotoOpen, setHomePhotoOpen] = useState(false);
  const [homePhotoUrls, setHomePhotoUrls] = useState([]);
  const [homeMemo, setHomeMemo] = useState('');
  const [homePhotoUploading, setHomePhotoUploading] = useState(false);
  const [homeSaving, setHomeSaving] = useState(false);
  // ★ 原価メモの全画面（開いたときの画面の位置を覚えておき、戻るでそこに戻す）
  const [costMemoOpen, setCostMemoOpen] = useState(false);
  const costMemoScrollY = useRef(0);
  const openCostMemo = () => { costMemoScrollY.current = window.scrollY; setCostMemoOpen(true); };
  const closeCostMemo = useCallback(() => {
    setCostMemoOpen(false);
    requestAnimationFrame(() => window.scrollTo({ top: costMemoScrollY.current, behavior: 'instant' }));
  }, []);
  useEffect(() => { setCostMemoOpen(false); }, [selectedSite]);

  const handleHomeSavePhoto = async () => {
    const latest = [...(reports||[])].sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
    if (!latest) return alert('日報がありません');
    if (!homePhotoUrls.length && !homeMemo.trim()) return alert('写真またはメモを入力してください');
    setHomeSaving(true);
    try {
      const allUrls = [...(latest.photoUrls||[]), ...homePhotoUrls];
      const newMemo = [latest.memo||'', homeMemo].filter(Boolean).join('\n');
      const droppedColumns = (await window.__updateReportPhotos(latest.id, allUrls, newMemo)) || [];
      // 保存できた方だけ入力を空にする（保存されなかった方は残す）
      const photosSaved = !droppedColumns.includes('photo_urls');
      const memoSaved = !droppedColumns.includes('memo');
      if (photosSaved) setHomePhotoUrls([]);
      if (memoSaved) setHomeMemo('');
      if (photosSaved && memoSaved) setHomePhotoOpen(false);
      alert(droppedColumns.length > 0 ? buildMissingColumnsWarning(droppedColumns, REPORT_COLUMN_LABELS) : '✅ 保存しました');
    } catch(e) { alert(`❌ 保存できませんでした\n\n理由: ${e.message}`); }
    finally { setHomeSaving(false); }
  };
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setSiteDropdownOpen(false);
    };
    if (siteDropdownOpen) { document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }
  }, [siteDropdownOpen]);

  const costRatio = totals.revenue > 0 ? (totals.cost / totals.revenue) * 100 : 0; // 原価率 ＝ 原価 ÷ 工事売上

  // 稼働日数・人工数
  const workingDays = (reports||[]).length;
  const totalInHouseRaw = (reports||[]).reduce((s,r)=>(r.workDetails?.inHouseWorkers||[]).reduce((ss,w)=>ss+getInHouseWorkerCount(w),s),0);
  const totalOutsourcingRaw = (reports||[]).reduce((s,r)=>(r.workDetails?.outsourcingLabor||[]).reduce((ss,o)=>ss+getOutsourcingCount(o),s),0);
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
              ) : (() => {
                // タブごとのカウント
                const countByStatus = {
                  '着工前・進行中': sites.filter(s => s.status === '着工前・進行中' || s.status === '進行中' || s.status === '着工前' || !s.status).length,
                  '完了':   sites.filter(s => s.status === '完了').length,
                };
                // 選択中のタブでフィルタ
                const filteredSites = sites.filter(s => {
                  if (siteFilterTab === '着工前・進行中') return s.status === '着工前・進行中' || s.status === '進行中' || s.status === '着工前' || !s.status;
                  return s.status === siteFilterTab;
                });
                return (
                  <>
                    {/* タブ切替 */}
                    <div style={{display:'flex',gap:2,padding:'8px 8px 6px',borderBottom:'1px solid #F0F0F0',background:'#FAFAFA'}}>
                      {['着工前・進行中','完了'].map(tab => (
                        <button key={tab} onClick={(e) => { e.stopPropagation(); setSiteFilterTab(tab); }}
                          style={{
                            flex:1,padding:'7px 6px',borderRadius:6,border:'none',
                            background: siteFilterTab===tab ? '#1E293B' : 'transparent',
                            color: siteFilterTab===tab ? '#fff' : '#666',
                            fontSize:11,fontWeight:siteFilterTab===tab?700:500,
                            cursor:'pointer',fontFamily:'inherit',
                            transition:'all 0.15s'
                          }}>
                          {tab} <span style={{fontSize:9,opacity:0.7,marginLeft:2}}>({countByStatus[tab]})</span>
                        </button>
                      ))}
                    </div>
                    {/* 現場リスト */}
                    <div style={{maxHeight:'320px',overflowY:'auto'}}>
                      {filteredSites.length === 0 ? (
                        <div style={{padding:'20px 16px',textAlign:'center',fontSize:12,color:'#aaa'}}>該当する現場がありません</div>
                      ) : filteredSites.map(site => (
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
                  </>
                );
              })()}
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
              <p style={{ fontSize:'10px', color:'#6b7280', marginTop:'1px' }}>閲覧は可能です。日報入力を開くと、解除して入力するか選べます</p>
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
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      <button onClick={()=>setHomePhotoOpen&&setHomePhotoOpen(!homePhotoOpen)}
                        style={{width:40,height:40,borderRadius:10,background:'#1E293B',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      </button>
                      <button onClick={()=>onViewPdf&&onViewPdf(latest)}
                        style={{display:'flex',alignItems:'center',gap:7,padding:'11px 18px',height:40,background:'#991B1B',border:'1px solid rgba(248,113,113,0.3)',borderRadius:10,cursor:'pointer',flexShrink:0,animation:'pdf-pulse 1.8s ease-out infinite'}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span style={{fontSize:12,fontWeight:700,color:'#fff'}}>PDF</span>
                      </button>
                    </div>
                  </div>
                  {/* フルスクリーンモーダルはHomePage末尾に配置 */}
                </div>
              );
            })()}

            {/* 原価メモカード（cost_memo が入っている現場だけ。押すと原価メモを全画面で出す） */}
            {projectInfo?.costMemo != null && (() => {
              const r = parseCostMemo(projectInfo.costMemo);
              const days = r.ok ? costMemoCounts(r.memo).schedule : 0;
              const hl = r.ok ? memoList(r.memo.summary).find(s => s.highlight === true && memoText(s.value)) : null;
              return (
                <button id="cost-memo-open" type="button" onClick={openCostMemo} className="mb-4"
                  style={{width:'100%',display:'block',textAlign:'left',background:'#fff',borderRadius:18,padding:'14px 16px',border:'0.5px solid #E8E8E8',boxShadow:'0 2px 8px rgba(0,0,0,0.06)',cursor:'pointer',fontFamily:'inherit'}}>
                  <span style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
                    <span style={{display:'block',minWidth:0}}>
                      <span style={{display:'block',fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.1em',marginBottom:5}}>COST MEMO</span>
                      <span style={{display:'block',fontSize:15,fontWeight:800,color:'#111',marginBottom:5}}>原価メモ</span>
                      <span style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {!r.ok && <span style={{fontSize:10,fontWeight:700,color:'#B91C1C',background:'#FEE2E2',padding:'2px 8px',borderRadius:20}}>読めません</span>}
                        {days > 0 && <span style={{fontSize:10,fontWeight:700,color:'#555',background:'#F0F0F0',padding:'2px 8px',borderRadius:20}}>段取り {days}日</span>}
                        {hl && <span style={{fontSize:10,fontWeight:800,color:COST_MEMO_BLUE,background:COST_MEMO_BLUE_SOFT,padding:'2px 8px',borderRadius:20}}>{memoText(hl.label) ? `${memoText(hl.label)} ` : ''}{memoText(hl.value)}</span>}
                      </span>
                    </span>
                    <span style={{display:'flex',alignItems:'center',gap:4,height:40,padding:'0 12px 0 16px',borderRadius:10,background:'#1E293B',color:'#fff',fontSize:12,fontWeight:700,flexShrink:0}}>
                      開く
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </span>
                  </span>
                </button>
              );
            })()}

            {/* 産廃処分費カード */}
            {(() => {
              const WASTE_COLORS = ['#d97706','#65a30d','#7c3aed','#0891b2','#dc2626','#f472b6'];
              const wasteByType = {};
              (reports||[]).forEach(r=>(r.wasteItems||[]).forEach(w=>{
                // ★ 金属売上は産廃処分費に含めない (複数条件でチェック)
                if ((w.amount||0) < 0) return;
                if (w.isScrap === true) return;
                if (w.kind === 'scrap') return;
                if (w.manifestNumber === '-') return;
                // ★ material(品目)が空・または車両名(道具車等)は処分費に含めない
                if (!w.material) return;
                if (w.material === '道具車') return;
                if ((MASTER_DATA.vehicles || []).includes(w.material)) return;
                // ★ amount(処分費金額)が0以下のものも除外
                if ((w.amount||0) <= 0) return;
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

        {/* ★ お知らせ（現場を選ぶ前だけ出す。文は src/notices.js） */}
        {!selectedSite && sitesReady && <HomeNotices />}
        {/* ★ テーマ曲のバナー（お知らせが0件でも出す。現場を選ぶとバナーは消えるが、曲は止めない） */}
        {!selectedSite && sitesReady && themeSong && <ThemeBanner song={themeSong} />}
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

      {/* ★ 原価メモ（全画面で重ねる。原価メモが消えたら閉じる） */}
      {costMemoOpen && selectedSite && projectInfo?.costMemo != null && (
        <CostMemoOverlay raw={projectInfo.costMemo} siteName={selectedSite} onBack={closeCostMemo} />
      )}

      {/* ★ 写真・メモ フルスクリーンモーダル */}
      {homePhotoOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20,backdropFilter:'blur(4px)'}} onClick={()=>setHomePhotoOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,padding:20,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.4)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:10,background:'#1E293B',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:'#111'}}>現場写真 & メモ</div>
                  <div style={{fontSize:10,color:'#888',marginTop:2}}>最新日報に追加保存</div>
                </div>
              </div>
              <button onClick={()=>setHomePhotoOpen(false)}
                style={{width:32,height:32,borderRadius:'50%',background:'#F0F0F0',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'#555'}}>✕</button>
            </div>

            <label style={{display:'block',border:'1.5px dashed #CBD5E1',borderRadius:10,padding:20,textAlign:'center',cursor:homePhotoUploading?'not-allowed':'pointer',opacity:homePhotoUploading?0.6:1,marginBottom:12}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" style={{display:'block',margin:'0 auto 8px'}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <div style={{fontSize:13,fontWeight:700,color:'#111',marginBottom:2}}>{homePhotoUploading?'アップロード中...':'ここにドロップ、またはアップロード'}</div>
              <div style={{fontSize:11,color:'#888'}}>最大5枚 · JPG / PNG / HEIC</div>
              <input type="file" accept="image/*" multiple style={{display:'none'}} disabled={homePhotoUploading}
                onChange={async(e)=>{
                  const files=Array.from(e.target.files||[]).slice(0,5-homePhotoUrls.length);
                  if(!files.length) return;
                  setHomePhotoUploading(true);
                  const lat=[...(reports||[])].sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
                  try {
                    const urls=await Promise.all(files.map(f=>uploadPhoto(f,projectInfo?.workLocation||'unknown',lat?.date||'unknown')));
                    setHomePhotoUrls(prev=>[...prev,...urls]);
                  } catch(err){alert('アップロード失敗: '+err.message);}
                  finally{setHomePhotoUploading(false);e.target.value='';}
                }}
              />
            </label>
            {homePhotoUrls.length>0 && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:12}}>
                {homePhotoUrls.map((url,i)=>(
                  <div key={i} style={{position:'relative',aspectRatio:'1',borderRadius:8,overflow:'hidden',border:'0.5px solid #E8E8E8'}}>
                    <img src={url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    <button onClick={()=>setHomePhotoUrls(homePhotoUrls.filter((_,j)=>j!==i))}
                      style={{position:'absolute',top:3,right:3,width:20,height:20,borderRadius:'50%',background:'rgba(239,68,68,0.9)',border:'none',color:'#fff',fontSize:11,cursor:'pointer'}}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{fontSize:11,fontWeight:700,color:'#1E3A5F',letterSpacing:'.06em',marginBottom:6}}>メモ</div>
            <textarea value={homeMemo} onChange={e=>setHomeMemo(e.target.value)} placeholder="備考・申し送り・翌日の予定など..."
              style={{width:'100%',minHeight:80,resize:'vertical',boxSizing:'border-box',borderRadius:10,border:'0.5px solid #E8E8E8',padding:'10px 12px',fontSize:13,background:'#F8FAFC',color:'#111',outline:'none',fontFamily:'inherit',marginBottom:14}}/>
            <button onClick={handleHomeSavePhoto} disabled={homeSaving}
              style={{width:'100%',padding:'14px',background:homeSaving?'#E8E8E8':'#16a34a',border:'none',borderRadius:10,fontSize:14,fontWeight:700,color:homeSaving?'#999':'#fff',cursor:homeSaving?'not-allowed':'pointer'}}>
              {homeSaving?'保存中...':'✓ 最新日報に保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== ProjectSettingsPage ==========
const parseNumericValue = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/[￥¥,\s]/g, '').trim();
  if (!cleaned) return 0;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatNumericInput = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const numeric = parseNumericValue(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : '';
};

// ========== 請求月（project_info.invoice_month） ==========
// 請求書の発行月か締めの月。'YYYY-MM' で保存し、未入力は null で保存する（画面では空文字。DBの空文字も未入力として扱う）
const normalizeInvoiceMonth = (value) => String(value ?? '').trim();
const formatInvoiceMonth = (value) => {
  const m = /^(\d{4})-(\d{2})$/.exec(normalizeInvoiceMonth(value));
  return m ? `${m[1]}年${Number(m[2])}月` : normalizeInvoiceMonth(value);
};
// 選択欄に並べる月：今月の3か月後から2025年1月まで（新しい順）。今の値が範囲外でも選択肢に残す
const buildInvoiceMonthOptions = (currentValue, today = new Date()) => {
  const options = [];
  let y = today.getFullYear(), m = today.getMonth() + 1 + 3;
  while (m > 12) { m -= 12; y += 1; }
  while (y > 2025 || (y === 2025 && m >= 1)) {
    options.push(`${y}-${String(m).padStart(2, '0')}`);
    m -= 1; if (m === 0) { m = 12; y -= 1; }
  }
  const current = normalizeInvoiceMonth(currentValue);
  if (current && !options.includes(current)) options.unshift(current);
  return options;
};

// ステータスを「完了」にするときに必要な項目のうち、入っていないもの
const missingForCompletion = (info) => {
  const missing = [];
  if (!(parseNumericValue(info.billingAmount) > 0)) missing.push('請求金額');
  if (!normalizeInvoiceMonth(info.invoiceMonth)) missing.push('請求月');
  return missing;
};
const completionBlockedMessage = (missing) =>
  `請求金額と請求月を入力してから、ステータスを「完了」にしてください。\n\n未入力：${missing.join('・')}`;

// 発注者名から請負区分を決める（ProjectSettingsPage と LOGIOApp の両方で使う）
const resolveContractTypeByClient = (clientName) => {
  const value = String(clientName || '').trim();
  if (!value) return 'フェイス';
  const names = ['スペース', 'バウハウス丸栄', '伊藤忠'];
  return names.some(name => value.includes(name)) ? '入間緑化' : 'フェイス';
};

// ========== 発注者名（選択式・ならし方） ==========
// 紹介元の会社。請求はテナントに直接するので、発注者＝紹介元、請求書送付先＝テナントの会社にする。
// 紹介元が増えたり変わったりしたときは、この表だけを直す
const INTRODUCER_CLIENTS = ['JLA', 'リーシングイノベーション', 'スリーエーコーポレーション'];
const CLIENT_CORP_WORDS = ['株式会社', '有限会社', '合同会社', '（株）', '(株)', '（有）', '(有)', '（同）', '(同)', '㈱', '㈲'];
const removeClientCorpWords = (s) => CLIENT_CORP_WORDS.reduce((t, w) => t.split(w).join(''), String(s ?? ''));
// 保存する形：半角カナを全角にし、「株式会社」「（株）」などを取り、前後の空白を取る
const cleanClientName = (value) => removeClientCorpWords(
  String(value ?? '').replace(/[｡-ﾟ]+/g, m => m.normalize('NFKC'))
).trim();
// 探す・比べるための形：半角・全角、ひらがな・カタカナ、大文字・小文字のちがいをなくし、
// 「株式会社」「（株）」など・空白・「・」を取る
const clientSearchKey = (value) => removeClientCorpWords(String(value ?? '').normalize('NFKC'))
  .replace(/[\s・･]/g, '')
  .toLowerCase()
  .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
// 紹介元の別名（直接原価の行などで、別の書き方をされるもの）。増えたらこの表に足す
const INTRODUCER_ALIASES = {
  'リーシングイノベーション': ['Leasing Innovation'],
};
// 発注者が紹介元か
const isIntroducerClient = (client) => INTRODUCER_CLIENTS.includes(cleanClientName(client));
// 紹介元の現場で、直接原価の行が紹介料かどうか（画面には「紹介料」と出さない。行の名前は発注者名を使う）
// 名前に「紹介元の名前・別名」「紹介」「管理費」（現場管理費なども）のどれかを含む行を紹介料にする
// （紹介料は、請求のときに「現場管理費」などの名目にしてもらうことがあるため）
const isIntroFeeItem = (itemName, client) => {
  if (!isIntroducerClient(client)) return false;
  const name = cleanClientName(client);
  const key = clientSearchKey(itemName);
  return [name, ...(INTRODUCER_ALIASES[name] || []), '紹介', '管理費'].some(w => { const k = clientSearchKey(w); return k && key.includes(k); });
};

// ========== 経費の区分（自社／外注／その他外注） ==========
// 日報の「その日の経費」と案件の「直接原価」の行に kubun として入れる（DBの欄は増やさない。行の中に足すだけ）
// 予想と実績タブで「外注経費」「その他外注費」を分けるのに使う。原価の合計は変わらない
const COST_KUBUN = ['自社', '外注', 'その他外注'];
// 名前にこれがあれば「外注」（外注会社の車代・P代・交通費・消耗品など）。
// 「ケー」（ケーブルと間違える）と短い「MC」「smb」は入れない。増えたらこの表に足す
const SUBCON_NAME_WORDS = ['TCY', 'ALTEQ', 'ALTEC', 'アルテック', 'マルカイ', 'BMY', 'MC興業', '奈良商事', '川田工業'];
// 名前にこれがあれば「その他外注」（電気業者・フロン回収・アスベスト分析など）
const OTHER_SUBCON_WORDS = ['電気', '電工', '坪井', 'フロン', 'サンキョー', '石綿', 'アスベスト', '分析', '検体', 'アイエス'];
// 名前から区分を決める（入力のときの自動選択と、区分の無い今までの行の数え方に使う）。どれにも当たらなければ「自社」
const guessCostKubun = (itemName) => {
  const key = clientSearchKey(itemName);
  const has = words => words.some(w => key.includes(clientSearchKey(w)));
  if (has(OTHER_SUBCON_WORDS)) return 'その他外注';
  if (has(SUBCON_NAME_WORDS)) return '外注';
  return '自社';
};
// 行の区分：選んであればそれ、無ければ名前から（データは書き換えない）
const costKubunOf = (item) => (COST_KUBUN.includes(item?.kubun) ? item.kubun : guessCostKubun(item?.name));

// 区分の札・ボタンの色（dark＝暗い入力欄・一覧用、light＝日報の明るい行用）
const COST_KUBUN_STYLE = {
  '自社': { dark: { bg: 'rgba(255,255,255,0.10)', fg: 'rgba(255,255,255,0.85)', bd: 'rgba(255,255,255,0.28)' }, light: { bg: '#F1F5F9', fg: '#475569', bd: '#CBD5E1' } },
  '外注': { dark: { bg: 'rgba(245,158,11,0.18)', fg: '#fbbf24', bd: 'rgba(245,158,11,0.5)' }, light: { bg: '#FEF3C7', fg: '#B45309', bd: '#FCD34D' } },
  'その他外注': { dark: { bg: 'rgba(168,85,247,0.2)', fg: '#d8b4fe', bd: 'rgba(168,85,247,0.5)' }, light: { bg: '#F3E8FF', fg: '#7E22CE', bd: '#D8B4FE' } },
};
// 一覧の行に付ける小さな札。onClick があればボタン（押すと区分を切り替える）
function CostKubunTag({ kubun, light = false, onClick, label }) {
  const c = (COST_KUBUN_STYLE[kubun] || COST_KUBUN_STYLE['自社'])[light ? 'light' : 'dark'];
  const style = { display: 'inline-block', fontSize: 10, fontWeight: 700, lineHeight: 1.3, padding: '2px 7px', borderRadius: 99, background: c.bg, color: c.fg, border: `1px solid ${c.bd}`, whiteSpace: 'nowrap', fontFamily: 'inherit' };
  if (!onClick) return <span style={style}>{label || kubun}</span>;
  return <button type="button" data-kubun-tag={kubun} aria-label={`区分：${kubun}（押すと切り替え）`} onClick={onClick} style={{ ...style, cursor: 'pointer', padding: '4px 9px' }}>{label || kubun}</button>;
}
// 区分を選ぶ3つのボタン。value が空なら名前から自動で選んだものを見せる（手で選んだら、そのあと名前を変えても変えない）
function CostKubunPicker({ id, name, value, onChange }) {
  const shown = COST_KUBUN.includes(value) ? value : guessCostKubun(name);
  return (
    <div id={id} style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>区分</span>
        {!COST_KUBUN.includes(value) && String(name || '').trim() && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>名前から自動</span>}
      </div>
      <div role="radiogroup" aria-label="区分" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
        {COST_KUBUN.map(k => {
          const on = k === shown;
          const c = COST_KUBUN_STYLE[k].dark;
          return (
            <button key={k} type="button" role="radio" aria-checked={on} data-kubun={k} onClick={() => onChange(k)}
              style={{ padding: '8px 2px', borderRadius: 8, border: `1px solid ${on ? c.bd : 'rgba(255,255,255,0.08)'}`, background: on ? c.bg : 'rgba(255,255,255,0.04)', color: on ? c.fg : 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: on ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 新しく足す名前と同じか、どちらかがもう一方を含む、今ある発注者名
const findSimilarClients = (name, names) => {
  const key = clientSearchKey(name);
  if (!key) return [];
  return names.filter(n => { const k = clientSearchKey(n); return k && (k === key || k.includes(key) || key.includes(k)); });
};

// 発注者の選択欄。今まで入っている発注者名（件数の多い順）から選ぶ。文字を打つと絞り込む。
// 一覧に無いときは「新しい発注者として追加」で直接入れる（似た名前があれば、そちらを使うか聞く）
function ClientPicker({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [similar, setSimilar] = useState(null); // { name, matches }
  const boxRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const closeIfOutside = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) { setOpen(false); setSimilar(null); setQuery(''); } };
    document.addEventListener('pointerdown', closeIfOutside);
    return () => document.removeEventListener('pointerdown', closeIfOutside);
  }, [open]);

  const key = clientSearchKey(query);
  const shown = key ? options.filter(o => clientSearchKey(o.name).includes(key)) : options;
  const typed = cleanClientName(query);                          // 追加するときに保存する形
  const typedExists = options.some(o => o.name === query.trim()); // 打った文字そのものが一覧にある
  const choose = (name) => { onChange(name); setOpen(false); setQuery(''); setSimilar(null); };
  const addNew = () => {
    if (!typed) return;
    const matches = findSimilarClients(query, options.map(o => o.name));
    if (matches.length > 0) { setSimilar({ name: typed, matches }); return; }
    choose(typed);
  };
  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); setSimilar(null); e.currentTarget.blur(); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (typedExists) choose(query.trim());
      else if (shown.length === 1) choose(shown[0].name);
      else if (typed && shown.length === 0) addNew();
    }
  };
  const item = { display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, width:'100%', padding:'11px 12px', background:'none', border:'none', borderBottom:'1px solid rgba(255,255,255,0.06)', color:'#fff', fontSize:15, textAlign:'left', cursor:'pointer', fontFamily:'inherit' };
  const smallBtn = { padding:'9px 12px', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' };

  return (
    <div className="mb-4" ref={boxRef} style={{ position:'relative' }}>
      <label style={{display:"block",fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>発注者 / Client</label>
      <input type="text" value={open ? query : (value || '')} aria-label="発注者"
        placeholder={open ? (value ? `${value}（打つと絞り込み）` : '名前を打つと絞り込み') : '一覧から選ぶ'}
        onFocus={() => { setOpen(true); setQuery(''); setSimilar(null); }}
        onChange={e => { setQuery(e.target.value); setSimilar(null); if (!open) setOpen(true); }}
        onKeyDown={onKeyDown}
        style={{ width:'100%', padding:'10px 12px', background:'rgba(0,0,0,0.25)', border: open ? '1px solid rgba(96,165,250,0.6)' : '1px solid rgba(255,255,255,0.05)', color:'#fff', borderRadius:9, fontSize:15, outline:'none', boxSizing:'border-box', maxWidth:'100%', fontFamily:'inherit' }} />
      {open && (
        <div role="listbox" aria-label="発注者の一覧" style={{ position:'absolute', left:0, right:0, top:'100%', marginTop:4, zIndex:40, maxHeight:300, overflowY:'auto', background:'#1F2937', border:'1px solid rgba(255,255,255,0.15)', borderRadius:10, boxShadow:'0 10px 30px rgba(0,0,0,0.5)' }}>
          {similar ? (
            <div style={{ padding:12 }}>
              <div style={{ fontSize:14, color:'#fde68a', lineHeight:1.6, marginBottom:10 }}>
                {similar.matches.length === 1 ? `${similar.matches[0]} がすでにあります。こちらを使いますか？` : `似た発注者がすでにあります（${similar.matches.length}件）。どれかを使いますか？`}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {similar.matches.map(m => (
                  <button key={m} type="button" onClick={() => choose(m)} style={{ ...smallBtn, background:'#2563EB', border:'none', color:'#fff' }}>{m} を使う</button>
                ))}
                <button type="button" onClick={() => choose(similar.name)} style={{ ...smallBtn, background:'transparent', border:'1px solid rgba(255,255,255,0.3)', color:'#fff' }}>「{similar.name}」をそのまま追加</button>
              </div>
            </div>
          ) : (
            <>
              {shown.map(o => (
                <button key={o.name} type="button" role="option" aria-selected={o.name === value} onClick={() => choose(o.name)}
                  style={{ ...item, background: o.name === value ? 'rgba(37,99,235,0.25)' : 'none' }}>
                  <span>{o.name === value ? '✓ ' : ''}{o.name}</span>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', flexShrink:0 }}>{o.count}件</span>
                </button>
              ))}
              {key && shown.length === 0 && <div style={{ padding:'10px 12px', fontSize:13, color:'rgba(255,255,255,0.5)' }}>「{query}」を含む発注者はありません</div>}
              {typed && !typedExists ? (
                <button type="button" onClick={addNew} style={{ ...item, color:'#93C5FD', fontWeight:700, borderBottom:'none', flexDirection:'column', alignItems:'flex-start', gap:2 }}>
                  <span>＋「{typed}」を新しい発注者として追加</span>
                  {typed !== query.trim() && <span style={{ fontSize:11, fontWeight:400, color:'rgba(255,255,255,0.5)' }}>「株式会社」などを取り、全角にそろえて保存します</span>}
                </button>
              ) : !key && (
                <div style={{ padding:'10px 12px', fontSize:12, color:'rgba(255,255,255,0.45)' }}>一覧に無いときは、名前を打つと「新しい発注者として追加」が出ます</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// project_info の欄名 → 画面の項目名（DBに欄がなく保存できなかったときの警告に使う）
const PROJECT_INFO_COLUMN_LABELS = {
  project_number: 'PROJECT NO.',
  work_type: '工事種別',
  client: '発注者',
  work_location: '現場住所',
  sales_person: '営業担当',
  site_manager: '現場責任者',
  start_date: '工期開始',
  end_date: '工期終了',
  contract_type: '請負区分',
  contract_amount: '見積金額',
  additional_amount: '追加金額',
  billing_amount: '請求金額',
  invoice_month: '請求月',
  status: 'ステータス',
  discharger: '排出事業者',
  transport_company: '運搬会社',
  contracted_disposal_sites: '処分先',
  transfer_cost: '回送費',
  lease_cost: 'リース費',
  materials_cost: '資材費',
  expenses: '経費',
  outsourcing_items: '外注費',
  sga_items: '販管費',
  site_expense_items: '現場経費',
  misc_items: '直接原価',
  manifest_entries: 'マニフェスト',
  manifest_discharger: 'マニフェスト排出事業者',
  site_area_m2: '面積',
  site_tsubo: '坪数',
  site_use_type: '業態',
  work_condition: '備考欄',
  payment_due_date: '入金予定日',
  payment_terms: '支払条件',
  invoice_recipient: '請求書送付先',
  subcontract_amount: '下請金額',
  subcontractor: '下請業者',
  subcontract_terms: '下請の支払条件',
  subcontract_invoice_recipient: '下請の請求書送付先',
  documents_checklist: '書類確認',
  forecast: '予想（原価メモ）',
  cost_memo: '原価メモ（貼り付け）',
  answer_check: '答え合わせの下書き（貼り付け）',
  updated_at: '更新日時',
};

// Supabase のエラー文から「DBにない欄」の名前を取り出す
const extractMissingColumns = (message) => {
  const text = String(message || '');
  const names = [
    // PostgREST: Could not find the 'billing_amount' column of 'project_info' in the schema cache
    ...[...text.matchAll(/Could not find the '([^']+)' column/gi)].map(m => m[1]),
    // PostgreSQL: column "billing_amount" of relation "project_info" does not exist
    ...[...text.matchAll(/column "([^"]+)" of relation "[^"]+" does not exist/gi)].map(m => m[1]),
  ];
  return Array.from(new Set(names));
};

// reports の欄名 → 画面の項目名
const REPORT_COLUMN_LABELS = {
  site_name: '現場名',
  date: '日付',
  weather: '天気',
  recorder: '記録者',
  work_details: '作業内容',
  waste_items: '廃棄物',
  scrap_items: 'スクラップ',
  photo_urls: '写真',
  memo: '備考',
  updated_by: '更新者',
  updated_at: '更新日時',
};

// 日報で、DBに欄がなければ外して保存してよい欄（それ以外が足りないときは保存失敗にする）
const REPORT_DROPPABLE_COLUMNS = ['photo_urls', 'memo', 'updated_by', 'updated_at'];

// DBにない欄を外しながら保存し直す。canDrop が true の欄だけ外す。
// 外した欄名の一覧を返す。欄の不足以外のエラー、外せない欄の不足はそのまま投げる
const saveDroppingMissingColumns = async (payload, save, canDrop) => {
  const currentPayload = { ...payload };
  const droppedColumns = [];
  // Supabase は1回のエラーで1欄しか教えてくれないため、欄の数だけ再試行できるようにする
  const maxAttempts = Object.keys(currentPayload).length + 1;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const result = await save(currentPayload);
      return { result, droppedColumns };
    } catch (error) {
      const missingColumns = extractMissingColumns(error?.message || String(error || ''));
      const droppable = missingColumns.filter(column => Object.prototype.hasOwnProperty.call(currentPayload, column));
      if (droppable.length === 0 || !droppable.every(canDrop)) throw error;
      droppable.forEach(column => {
        delete currentPayload[column];
        droppedColumns.push(column);
      });
      // 保存する欄が1つも残らなければ、保存できなかった扱いにする
      if (Object.keys(currentPayload).length === 0) throw error;
    }
  }
  throw new Error('save retry limit exceeded');
};

// 日報を1件更新する。対象の日報がなければ（削除済みなど）失敗にする
const updateReportOrThrow = async (reportId, payload) => {
  const updated = await sb('reports').updateOrThrow(payload, `id=eq.${reportId}`);
  // 対象の行がないとき、Supabase はエラーではなく空の一覧を返す
  if (Array.isArray(updated) && updated.length === 0) {
    throw new Error('対象の日報が見つかりませんでした（削除された可能性があります）');
  }
  return updated;
};

// 「○○が保存されていません（DBに欄がありません）」の警告文
const buildMissingColumnsWarning = (droppedColumns, labels) => {
  const names = droppedColumns.map(column => labels[column] || column);
  return `⚠️ ${names.join('、')}が保存されていません（DBに欄がありません）\n\n` +
    `それ以外の項目は保存しました。\n` +
    `管理者にDBへの欄の追加を依頼してください。\n` +
    `（DBの欄名: ${droppedColumns.join(', ')}）`;
};

// 保存失敗の理由を、現場の人が読んで分かる文にする
const describeSaveError = (error, labels = {}) => {
  const message = error?.message || String(error || '');
  const missingColumns = extractMissingColumns(message);
  if (missingColumns.length > 0) {
    return `DBに「${missingColumns.map(column => labels[column] || column).join('」「')}」の欄がありません（${missingColumns.join(', ')}）`;
  }
  // ブラウザごとの通信失敗の文言: Chrome / Safari / Firefox
  if (/Failed to fetch|Load failed|NetworkError/i.test(message)) {
    return '通信できませんでした。電波の状況を確認してください';
  }
  return message || '原因不明のエラー';
};

// ========== 予想（原価メモ）の入力（project_info.forecast） ==========
// 設定・編集の編集フォームで入れる。案件登録のときに、見積書の原価メモの数字を入れる
// 画面では入力欄の文字（forecastForm）を持ち、保存のときに forecast（jsonb）に直す
// 保存で送るのは、予想の欄の中身が開いたときと違うときだけ（触らなければ今の forecast を残す）
// introFee＝紹介料（紹介元の現場だけ欄を出す。欄の名前は発注者名）
// subconExpense＝外注経費（外注の車代・P代・交通費・消耗品など）、otherSubcon＝その他外注費（電気業者・フロン・アスベスト分析など）
// 11/17 原価メモの費目に合わせた：vehicle＝車両（道具車）だけ、haisha＝配車（別の欄）、menDay・menNight＝昼・夜の人工、extra＝別途（参考・合計外）
const FORECAST_NUM_FIELDS = ['men', 'menDay', 'menNight', 'days', 'laborCost', 'subconExpense', 'vehicle', 'haisha', 'disposal', 'other', 'otherSubcon', 'introFee', 'extra', 'metal'];
const FORECAST_COST_FIELDS = ['laborCost', 'subconExpense', 'vehicle', 'haisha', 'disposal', 'other', 'otherSubcon', 'introFee']; // 原価合計＝この8つの合計（別途・金属売上は入れない）
const FORECAST_DECIMAL_FIELDS = ['men', 'menDay', 'menNight', 'days']; // 小数も入れられる（0.5人工など）。金額は円の整数

// 入力の文字を数字だけにする（全角の数字は半角に。カンマ・円・空白・マイナスは取る）
const cleanForecastNumber = (value, allowDecimal) => {
  let s = String(value ?? '').replace(/[０-９．]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
  s = s.replace(allowDecimal ? /[^\d.]/g : /[^\d]/g, '');
  const dot = s.indexOf('.');
  if (dot >= 0) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  return s;
};

// forecast（DBの値）→ 入力欄の文字（無い欄は空。金額は円の整数にそろえる）
const forecastToForm = (raw) => {
  let f = raw;
  if (typeof f === 'string') { try { f = JSON.parse(f); } catch { f = null; } }
  if (!f || typeof f !== 'object' || Array.isArray(f)) f = {};
  const form = {};
  FORECAST_NUM_FIELDS.forEach(k => {
    const n = parseFloat(f[k]);
    form[k] = Number.isFinite(n) ? String(FORECAST_DECIMAL_FIELDS.includes(k) ? n : Math.round(n)) : '';
  });
  form.note = f.note != null ? String(f.note) : '';
  form.source = f.source != null ? String(f.source) : '';
  return form;
};

// 入力欄の文字 → forecast（DBに書く値）
//  ・空の数字欄は null（0 と入れた欄は 0）。原価合計 total は人工費・外注経費・車両配車・処分・その他経費・その他外注費・紹介料の合計で、入力しない
//  ・数字が全部「空か0」で、メモと元も空なら null（予想の無い現場に空の予想を作らない）
const formToForecast = (form, updatedAt = '') => {
  const nums = {};
  FORECAST_NUM_FIELDS.forEach(k => {
    const s = cleanForecastNumber(form?.[k], true);
    const n = s === '' || s === '.' ? NaN : Number(s);
    nums[k] = Number.isFinite(n) ? n : null;
  });
  const note = String(form?.note ?? '').trim();
  const source = String(form?.source ?? '').trim();
  if (!FORECAST_NUM_FIELDS.some(k => nums[k]) && !note && !source) return null;
  // 人工の計が空で、昼・夜が入っていれば、計＝昼＋夜
  if (nums.men == null && (nums.menDay != null || nums.menNight != null)) nums.men = (nums.menDay || 0) + (nums.menNight || 0);
  const total = FORECAST_COST_FIELDS.reduce((sum, k) => sum + (nums[k] || 0), 0);
  return { ...nums, total, note, source, updatedAt };
};

// 予想の欄の中身が、開いたときと違うか（同じ値に戻したときは「違わない」）
const isForecastFormChanged = (form, savedForm) =>
  JSON.stringify(formToForecast(form)) !== JSON.stringify(formToForecast(savedForm));

// 保存した日（端末の日付で 'YYYY-MM-DD'）
const forecastSavedDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 入力欄のまとまり。たたんでおき、押すと開く
// ブラウザ操作で入れやすいように、各欄に id と name（forecast-○○）を付けてある。欄は開くボタン（forecast-toggle）を押すと出る
function ForecastInputCard({ projectInfo, setProjectInfo }) {
  const [open, setOpen] = useState(false);
  const form = projectInfo.forecastForm || forecastToForm(null);
  const draft = formToForecast(form);
  const changed = isForecastFormChanged(form, projectInfo.forecastFormSaved || forecastToForm(null));
  const setField = (key, value) => setProjectInfo(prev => ({ ...prev, forecastForm: { ...(prev.forecastForm || forecastToForm(null)), [key]: value } }));
  const yen = (n) => '¥' + (Number(n) || 0).toLocaleString('ja-JP');
  // 紹介料の欄：発注者が紹介元の現場だけ出す（発注者を変えても値が残っていれば、原価合計に入っているので出したままにする）
  // 欄の名前は発注者名（「紹介料」とは出さない）
  const introName = cleanClientName(projectInfo.client) || '発注者';
  const showIntroFee = isIntroducerClient(projectInfo.client) || (form.introFee ?? '') !== '';

  // たたんだときの1行：今の入力の中身（保存した日は、保存してあって変えていないときだけ）
  // 狭い画面で言葉の途中で折れないよう、区切りごとに折り返す
  const summaryParts = (() => {
    if (!draft) return ['未入力'];
    const parts = [];
    if (draft.total) parts.push(`原価合計 ${yen(draft.total)}`);
    if (draft.men) parts.push(`人工 ${draft.men}人`);
    if (!parts.length) parts.push('メモのみ（数字は未入力）');
    const saved = projectInfo.forecast && typeof projectInfo.forecast === 'object' ? projectInfo.forecast.updatedAt : '';
    const m = String(saved || '').match(/^\d{4}-(\d{2})-(\d{2})/);
    return parts.map((p, i) => (i < parts.length - 1 ? p + '・' : p))
      .concat(!changed && saved ? [`（${m ? `${Number(m[1])}/${Number(m[2])}` : saved} 更新）`] : []);
  })();

  const labelStyle = { display:'block', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 };
  const inputStyle = { width:'100%', padding:'10px', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.05)', color:'#fff', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'monospace', minWidth:0 };
  const numberField = (key, label, placeholder) => {
    const decimal = FORECAST_DECIMAL_FIELDS.includes(key);
    const raw = form[key] ?? '';
    // 金額はカンマ付きで見せる。人工・日数は打ったとおりに見せる（「0.」の途中でも消えないように）
    const shown = decimal || raw === '' ? raw : Number(raw).toLocaleString('ja-JP');
    return (
      <div style={{ minWidth:0 }}>
        <label htmlFor={`forecast-${key}`} style={labelStyle}>{label}</label>
        <input id={`forecast-${key}`} name={`forecast-${key}`} type="text" inputMode={decimal ? 'decimal' : 'numeric'} autoComplete="off"
          value={shown} placeholder={placeholder}
          onChange={e => setField(key, cleanForecastNumber(e.target.value, decimal))}
          style={inputStyle} />
      </div>
    );
  };

  return (
    <div style={{ marginBottom:20, padding:'14px 16px', borderRadius:12, background:'#3F3F3F', border:'1px solid rgba(255,255,255,0.08)' }}>
      <button id="forecast-toggle" type="button" aria-expanded={open} aria-controls="forecast-fields" onClick={() => setOpen(o => !o)}
        style={{ width:'100%', padding:0, background:'none', border:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8, fontFamily:'inherit' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'.08em' }}>予想（原価メモ） / Forecast</div>
          <div style={{ marginTop:5, fontSize:12, fontWeight:600, color: draft ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)', lineHeight:1.4 }}>{summaryParts.map((p, i) => <span key={i} style={{ whiteSpace:'nowrap' }}>{p}</span>)}</div>
        </div>
        {changed && <span style={{ flexShrink:0, fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'rgba(251,191,36,0.15)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.3)' }}>未保存</span>}
        <GradChevron open={open} size={16} />
      </button>
      {open && (
        <div id="forecast-fields" style={{ marginTop:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:10, marginBottom:12 }}>
            {numberField('menDay', '人工 昼（人）', '例) 0')}
            {numberField('menNight', '人工 夜（人）', '例) 11')}
            {numberField('men', '人工 計（人）', '空なら昼＋夜')}
            {numberField('days', '日数', '例) 3')}
            {numberField('laborCost', '人工（金額・円）', '0')}
            {numberField('subconExpense', '外注経費（円）', '0')}
            {numberField('vehicle', '車両（道具車）（円）', '0')}
            {numberField('haisha', '配車（円）', '0')}
            {numberField('disposal', '処分（円）', '0')}
            {numberField('other', 'その他経費（円）', '0')}
            {numberField('otherSubcon', 'その他外注費（円）', '0')}
            {showIntroFee && numberField('introFee', `${introName}（円）`, '0')}
          </div>
          {/* 原価合計は自動（入力しない） */}
          <div style={{ marginBottom:12, padding:'10px 12px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.55)', whiteSpace:'nowrap' }}>原価合計（自動）</span>
              <output id="forecast-total" name="forecast-total" style={{ fontSize:16, fontWeight:800, color:'#fff', fontFamily:'monospace', fontVariantNumeric:'tabular-nums' }}>{yen(draft ? draft.total : 0)}</output>
            </div>
            <div style={{ marginTop:3, fontSize:9, color:'rgba(255,255,255,0.4)', lineHeight:1.5 }}>人工＋外注経費＋車両（道具車）＋配車＋処分＋その他経費＋その他外注費{showIntroFee ? `＋${introName}` : ''}</div>
          </div>
          <div style={{ marginBottom:12 }}>
            {numberField('extra', '別途（参考・合計外）（円）', '0')}
            <div style={{ marginTop:4, fontSize:9, color:'rgba(255,255,255,0.4)', lineHeight:1.5 }}>原価メモの「別途」。原価合計には入れません</div>
          </div>
          <div style={{ marginBottom:12 }}>
            {numberField('metal', '金属売上の見込み（円）', '0')}
            <div style={{ marginTop:4, fontSize:9, color:'rgba(255,255,255,0.4)', lineHeight:1.5 }}>プラスで入れる。原価には入れず、別に出します</div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label htmlFor="forecast-note" style={labelStyle}>メモ</label>
            <textarea id="forecast-note" name="forecast-note" value={form.note ?? ''} onChange={e => setField('note', e.target.value)} placeholder="例) 7/4版 夜間"
              style={{ ...inputStyle, fontFamily:'inherit', minHeight:64, resize:'vertical', display:'block' }} />
          </div>
          <div style={{ marginBottom:10 }}>
            <label htmlFor="forecast-source" style={labelStyle}>元</label>
            <input id="forecast-source" name="forecast-source" type="text" autoComplete="off" value={form.source ?? ''} onChange={e => setField('source', e.target.value)} placeholder="例) 原価メモ"
              style={{ ...inputStyle, fontFamily:'inherit' }} />
          </div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>
            下の「保存」で書き込みます。全部空にして保存すると、予想は消えます。
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 原価メモ（project_info.cost_memo） ==========
// 見積書の「原価メモ」の中身。案件登録のときに Claude（ブラウザ操作）が、設定・編集の「原価メモ（貼り付け）」に JSON を貼って保存する
// Wac は計算しない。書いてある文字をそのまま出す（ホームの現場カード → 原価メモの画面）
// 形（どの項目も無くてよい。知らない項目は無視する）：
//   { version, source, updatedAt, header,
//     summary: [{ label, value, strong, sub, highlight }],
//     waste:   { rows: [{ name, m3, dest, packing, cost, note }], total: { m3, cost } },
//     tasks:   { rows: [{ name, qty, unit, men }], total: { men } },
//     costs:   [{ name, day, night, total, men, detail }],   … 行は書いてあるとおりの順・名前で出す
//     schedule:[{ day, work, shift, people, days, men, m3, trucks, items, note }] }
const isPlainObject = v => !!v && typeof v === 'object' && !Array.isArray(v);
// 出す文字（文字と数字だけ。ほかの形は空）
const memoText = v => (typeof v === 'string' ? v.trim() : (typeof v === 'number' && Number.isFinite(v)) ? String(v) : '');
// 数字だけなら単位を付ける（「9」→「9人」。「9人」はそのまま）
const withUnit = (v, unit) => (v && /^\d+(\.\d+)?$/.test(v) ? v + unit : v);
const memoList = v => (Array.isArray(v) ? v.filter(isPlainObject) : []);

// 項目ごとの数（設定・編集の「読み込めました（段取り5日・廃棄物7品目…）」とホームのカードで使う）
const costMemoCounts = (m) => ({
  summary: memoList(m?.summary).length,
  waste: memoList(m?.waste?.rows).length,
  tasks: memoList(m?.tasks?.rows).length,
  costs: memoList(m?.costs).length,
  schedule: memoList(m?.schedule).length,
});
const costMemoCountParts = (m) => {
  const c = costMemoCounts(m);
  const parts = [c.schedule && `段取り${c.schedule}日`, c.waste && `廃棄物${c.waste}品目`, c.tasks && `工種${c.tasks}`, c.costs && `費目${c.costs}`].filter(Boolean);
  return parts.length ? parts : [c.summary ? `概要${c.summary}マス` : '見出しだけ'];
};
// 狭い画面で言葉の途中で折れないよう、区切りごとに折り返す
const NoWrapParts = ({ parts }) => parts.map((p, i) => <span key={i} style={{ whiteSpace:'nowrap' }}>{i < parts.length - 1 ? p + '・' : p}</span>);

// 貼った文字（JSON）か DB の値 → { ok: true, memo } か { ok: false, reason }
function parseCostMemo(raw) {
  let m = raw;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s) return { ok: false, reason: '空です' };
    try { m = JSON.parse(s); } catch (e) {
      const msg = String(e?.message || '');
      const pos = msg.match(/position (\d+)/)?.[1];
      const line = msg.match(/line (\d+)/)?.[1] || (pos != null ? String(s.slice(0, Number(pos)).split('\n').length) : '');
      return { ok: false, reason: `JSON として読めません${line ? `（${line}行目あたり）` : ''}。{ } [ ] " の閉じ忘れやカンマを見てください` };
    }
  }
  if (!isPlainObject(m)) return { ok: false, reason: 'いちばん外側が { } ではありません' };
  const checkList = (list, name) => {
    if (list == null) return '';
    if (!Array.isArray(list)) return `${name} が [ ] ではありません`;
    const bad = list.findIndex(x => !isPlainObject(x));
    return bad >= 0 ? `${name} の${bad + 1}つ目が { } ではありません` : '';
  };
  const checkTable = (t, name) => {
    if (t == null) return '';
    if (!isPlainObject(t)) return `${name} が { } ではありません`;
    if (t.total != null && !isPlainObject(t.total)) return `${name}.total が { } ではありません`;
    return checkList(t.rows, `${name}.rows`);
  };
  const reason = checkList(m.summary, 'summary') || checkTable(m.waste, 'waste') || checkTable(m.tasks, 'tasks')
    || checkList(m.costs, 'costs') || checkList(m.schedule, 'schedule');
  if (reason) return { ok: false, reason };
  const c = costMemoCounts(m);
  if (!memoText(m.header) && !c.summary && !c.waste && !c.tasks && !c.costs && !c.schedule) {
    return { ok: false, reason: '中身がありません（header・summary・waste・tasks・costs・schedule のどれも無い）' };
  }
  return { ok: true, memo: m };
}

// 保存で送るのは、中身が開いたときと違うときだけ（文字ではなく中身で比べる。空白・改行・項目の並びの違いは「同じ」）
const canonJson = v => (Array.isArray(v) ? v.map(canonJson) : isPlainObject(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonJson(v[k])])) : v);
const costMemoKey = (text) => {
  const s = String(text ?? '').trim();
  if (!s) return 'null';
  try { return JSON.stringify(canonJson(JSON.parse(s))); } catch { return 'text:' + s; }
};
const isCostMemoChanged = (text, savedText) => costMemoKey(text) !== costMemoKey(savedText);
// DB の値 → 入力欄の文字
const costMemoToText = (raw) => (raw == null ? '' : typeof raw === 'string' ? raw : JSON.stringify(raw, null, 1));

// 設定・編集の「原価メモ（貼り付け）」。たたんでおき、押すと開く
// ブラウザ操作で入れやすいように、開くボタン（cost-memo-toggle）・入力欄（cost-memo-json）・読んだ結果（cost-memo-status）に id を付けてある
function CostMemoInputCard({ projectInfo, setProjectInfo }) {
  const [open, setOpen] = useState(false);
  const text = projectInfo.costMemoText ?? '';
  const savedText = projectInfo.costMemoTextSaved ?? '';
  const changed = isCostMemoChanged(text, savedText);
  const empty = !text.trim();
  const parsed = empty ? null : parseCostMemo(text);
  const updatedAt = parsed?.ok ? memoText(parsed.memo.updatedAt) : '';
  const summaryParts = empty
    ? [changed ? '空（保存すると原価メモを消します）' : '未入力']
    : parsed.ok ? [...costMemoCountParts(parsed.memo).map((p, i, a) => (i < a.length - 1 ? p + '・' : p)), ...(updatedAt ? [`（${updatedAt}）`] : [])] : ['読めません（このままでは保存できません）'];
  const status = empty
    ? (changed ? { color: '#fbbf24', text: '空のまま保存すると、原価メモを消します（ホームの「原価メモ」も出なくなります）' } : { color: 'rgba(255,255,255,0.45)', text: '見積書の原価メモ（JSON）を貼ってください' })
    : parsed.ok ? { color: '#4ade80', text: <>読み込めました（<NoWrapParts parts={costMemoCountParts(parsed.memo)} />）</> }
    : { color: '#f87171', text: `読めません：${parsed.reason}。このままでは保存できません` };
  return (
    <div style={{ marginBottom:20, padding:'14px 16px', borderRadius:12, background:'#3F3F3F', border:'1px solid rgba(255,255,255,0.08)' }}>
      <button id="cost-memo-toggle" type="button" aria-expanded={open} aria-controls="cost-memo-fields" onClick={() => setOpen(o => !o)}
        style={{ width:'100%', padding:0, background:'none', border:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8, fontFamily:'inherit' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'.08em' }}>原価メモ（貼り付け） / Cost Memo</div>
          <div style={{ marginTop:5, fontSize:12, fontWeight:600, color: !empty && parsed?.ok ? 'rgba(255,255,255,0.85)' : !empty ? '#f87171' : 'rgba(255,255,255,0.45)', lineHeight:1.4, overflowWrap:'anywhere' }}>{summaryParts.map((p, i) => <span key={i} style={{ whiteSpace:'nowrap' }}>{p}</span>)}</div>
        </div>
        {changed && <span style={{ flexShrink:0, fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'rgba(251,191,36,0.15)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.3)' }}>未保存</span>}
        <GradChevron open={open} size={16} />
      </button>
      {open && (
        <div id="cost-memo-fields" style={{ marginTop:14 }}>
          <label htmlFor="cost-memo-json" style={{ display:'block', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>原価メモ（JSON）</label>
          <textarea id="cost-memo-json" name="cost-memo-json" value={text} spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off"
            onChange={e => { const v = e.target.value; setProjectInfo(prev => ({ ...prev, costMemoText: v })); }}
            placeholder={'{ "version": 1, "summary": [ … ], "schedule": [ … ] }'}
            style={{ width:'100%', minHeight:220, padding:'10px', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.05)', color:'#fff', borderRadius:8, fontSize:13, lineHeight:1.45, outline:'none', boxSizing:'border-box', fontFamily:'monospace', resize:'vertical', display:'block', minWidth:0 }} />
          <div id="cost-memo-status" role="status" aria-live="polite" style={{ marginTop:8, fontSize:12, fontWeight:700, color: status.color, lineHeight:1.5, overflowWrap:'anywhere' }}>{status.text}</div>
          <div style={{ marginTop:6, fontSize:9, color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>
            下の「保存」で書き込みます。触らなければ今の原価メモのまま。空にして保存すると消えます。
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 答え合わせの保存（project_info.answer_check） ==========
// 保存するのは人の判断（割り振り・チェック・確認済み）と Claude の下書き。答え（実績）は保存しない
// 形：{ version, alloc: { rows: [{ task, men }], extra: [{ name, men }], savedBy, savedAt },
//       draft: { alloc: [{ task, men, hint }], extra: [{ name, men, hint }], notes: [{ id, title, body, to }], updatedAt },
//       checked: { id: true }, confirmed: { by, at } | null, confirmedBefore: { by, at }, reflected: { at, note } }
//   confirmedBefore＝確認済みのあとで割り振り・チェックを変えて保存したときに外した確認（「確認後に変更があります」）
// どの項目も無いことがある。知らない項目は消さずにそのまま残す
const readAnswerCheck = (raw) => {
  let v = raw;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { return {}; } }
  return isPlainObject(v) ? v : {};
};
// ログインID → 画面に出す呼び名（チャットと同じ）。DB にはログインIDのまま入れる
const LOGIN_DISPLAY_NAMES = { face1991: '会社代表', ryokuka2005: '緑化担当', admin2026: '管理者' };
const loginDisplayName = (id) => LOGIN_DISPLAY_NAMES[id] || id || '−';
// 今の日時（日本時間。例 2026-11-17T15:30:00+09:00）
const jstIsoNow = (now = Date.now()) => new Date(now + 9 * 3600e3).toISOString().slice(0, 19) + '+09:00';
// 日時 → 「11/17 15:30」（日本時間）。日付だけ・読めないときは書いてあるまま
const answerSavedLabel = (iso) => {
  const s = String(iso || '');
  const t = Date.parse(s);
  if (!/T\d/.test(s) || !Number.isFinite(t)) return s;
  const d = new Date(t + 9 * 3600e3);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};
const isAnswerMenValue = (x) => x == null || x === '' || Number.isFinite(Number(x));

// 設定・編集の「答え合わせの下書き（貼り付け）」を読む
// 貼るのは draft の中身（alloc・extra・notes・updatedAt）。{"reflected": {...}} を貼ったら reflected だけ。
// {"draft": {...}} の形でも読む。返り値 { ok, draft（無ければ undefined）, reflected（無ければ undefined） } か { ok:false, reason }
const ANSWER_DRAFT_KEYS = ['alloc', 'extra', 'notes', 'updatedAt'];
function parseAnswerDraft(text) {
  const s = String(text ?? '').trim();
  if (!s) return { ok: false, reason: '空です' };
  let v;
  try { v = JSON.parse(s); } catch (e) {
    const msg = String(e?.message || '');
    const pos = msg.match(/position (\d+)/)?.[1];
    const line = msg.match(/line (\d+)/)?.[1] || (pos != null ? String(s.slice(0, Number(pos)).split('\n').length) : '');
    return { ok: false, reason: `JSON として読めません${line ? `（${line}行目あたり）` : ''}。{ } [ ] " の閉じ忘れやカンマを見てください` };
  }
  if (!isPlainObject(v)) return { ok: false, reason: 'いちばん外側が { } ではありません' };
  if (v.draft != null && !isPlainObject(v.draft)) return { ok: false, reason: 'draft が { } ではありません' };
  const src = isPlainObject(v.draft) ? v.draft : v;
  const hasDraft = ANSWER_DRAFT_KEYS.some(k => src[k] !== undefined);
  const hasReflected = v.reflected !== undefined;
  if (!hasDraft && !hasReflected) return { ok: false, reason: '中身がありません（alloc・extra・notes・updatedAt・reflected のどれも無い）' };
  if (hasReflected && !isPlainObject(v.reflected)) return { ok: false, reason: 'reflected が { } ではありません' };
  let draft;
  if (hasDraft) {
    draft = Object.fromEntries(Object.entries(src).filter(([k]) => k !== 'reflected' && k !== 'draft'));
    for (const k of ['alloc', 'extra', 'notes']) {
      if (draft[k] == null) continue;
      if (!Array.isArray(draft[k])) return { ok: false, reason: `${k} が [ ] ではありません` };
      const bad = draft[k].findIndex(x => !isPlainObject(x));
      if (bad >= 0) return { ok: false, reason: `${k} の${bad + 1}つ目が { } ではありません` };
    }
    const at = (k, i) => `${k} の${i + 1}つ目`;
    for (const [i, r] of (draft.alloc || []).entries()) {
      if (!memoText(r.task)) return { ok: false, reason: `${at('alloc', i)}に task（工種の名前）がありません` };
      if (!isAnswerMenValue(r.men)) return { ok: false, reason: `${at('alloc', i)}の men が数ではありません` };
    }
    for (const [i, r] of (draft.extra || []).entries()) {
      if (!memoText(r.name)) return { ok: false, reason: `${at('extra', i)}に name（作業の名前）がありません` };
      if (!isAnswerMenValue(r.men)) return { ok: false, reason: `${at('extra', i)}の men が数ではありません` };
    }
    const ids = new Set();
    for (const [i, n] of (draft.notes || []).entries()) {
      const id = memoText(n.id);
      if (!id) return { ok: false, reason: `${at('notes', i)}に id がありません` };
      if (ids.has(id)) return { ok: false, reason: `notes の id「${id}」が2つあります` };
      ids.add(id);
    }
    if (draft.updatedAt != null && typeof draft.updatedAt !== 'string') return { ok: false, reason: 'updatedAt が文字ではありません' };
  }
  return { ok: true, draft, reflected: hasReflected ? v.reflected : undefined };
}
const answerDraftCountParts = (p) => [
  ...(p.draft ? [`割り振り${(p.draft.alloc || []).length}`, `予想に無い作業${(p.draft.extra || []).length}`, `気づき${(p.draft.notes || []).length}`] : []),
  ...(p.reflected ? ['原価マスタに反映済みの印'] : []),
];
// DB の値 → 下書きの入力欄の文字（draft だけ）
const answerDraftToText = (raw) => { const d = readAnswerCheck(raw).draft; return isPlainObject(d) ? JSON.stringify(d, null, 1) : ''; };
// 保存の直前に読み直した answer_check に、貼った下書きを入れる（draft・reflected だけ差し替える）
// parsed が null＝欄を空にして保存 → draft を消す（割り振り・チェック・確認済みは残す）
// 新しい draft.notes に無い id のチェックは消す
function applyAnswerDraft(latestRaw, parsed) {
  const cur = readAnswerCheck(latestRaw);
  const next = { ...cur, version: cur.version ?? 1 };
  if (!parsed) { delete next.draft; return next; }
  if (parsed.draft) {
    next.draft = parsed.draft;
    const ids = new Set(memoList(parsed.draft.notes).map(n => memoText(n.id)).filter(Boolean));
    if (isPlainObject(cur.checked)) next.checked = Object.fromEntries(Object.entries(cur.checked).filter(([id]) => ids.has(id)));
  }
  if (parsed.reflected !== undefined) next.reflected = parsed.reflected;
  return next;
}
// 保存の直前に読み直した answer_check（latestRaw）に、この画面で触ったところだけを差し替える
// edits: rows＝Map(工種 → 人工の数 / null＝空にした)、extra＝予想に無い作業の一覧（触ったときだけ）、
//        checked＝Map(id → true/false)、confirm＝true（確認済みにする）/ false（確認を外す）
// 割り振り・チェックが変わったら、savedBy・savedAt を書き、確認済みなら外して confirmedBefore に残す
function mergeAnswerCheck(latestRaw, edits, userId, nowIso) {
  const cur = readAnswerCheck(latestRaw);
  const next = { ...cur, version: cur.version ?? 1 };
  const curAlloc = isPlainObject(cur.alloc) ? cur.alloc : {};
  const alloc = { ...curAlloc };
  let allocChanged = false, checkedChanged = false;
  if (edits.rows && edits.rows.size) {
    const rows = Array.isArray(curAlloc.rows) ? curAlloc.rows.map(r => (isPlainObject(r) ? { ...r } : r)) : [];
    edits.rows.forEach((men, task) => {
      const i = rows.findIndex(r => isPlainObject(r) && memoText(r.task) === task);
      if (men == null) { if (i >= 0) { rows.splice(i, 1); allocChanged = true; } return; }
      if (i >= 0) { if (Number(rows[i].men) !== men) { rows[i] = { ...rows[i], men }; allocChanged = true; } }
      else { rows.push({ task, men }); allocChanged = true; }
    });
    alloc.rows = rows;
  }
  if (edits.extra) {
    if (JSON.stringify(canonJson(curAlloc.extra ?? [])) !== JSON.stringify(canonJson(edits.extra))) allocChanged = true;
    alloc.extra = edits.extra;
  }
  const checked = { ...(isPlainObject(cur.checked) ? cur.checked : {}) };
  if (edits.checked && edits.checked.size) {
    edits.checked.forEach((on, id) => {
      if (!!checked[id] === on) return;
      checkedChanged = true;
      if (on) checked[id] = true; else delete checked[id];
    });
  }
  const changed = allocChanged || checkedChanged;
  if (changed) {
    next.alloc = { ...alloc, savedBy: userId || '', savedAt: nowIso };
    if (checkedChanged) next.checked = checked;
    if (isPlainObject(cur.confirmed)) { next.confirmedBefore = cur.confirmed; next.confirmed = null; }
  }
  if (edits.confirm === true) { next.confirmed = { by: userId || '', at: nowIso }; delete next.confirmedBefore; }
  if (edits.confirm === false) next.confirmed = null;
  return { next, changed };
}
// DB の今の answer_check を読み直す（保存の直前に使う）
async function fetchAnswerCheck(siteName) {
  const rows = await sb('project_info').select(`select=answer_check&site_name=eq.${encodeURIComponent(siteName)}`);
  if (!Array.isArray(rows)) throw new Error('案件情報を読み直せませんでした（DB に answer_check の欄が無いかもしれません）');
  if (rows.length === 0) throw new Error('この現場の案件情報（project_info）がありません');
  return rows[0].answer_check ?? null;
}

// 設定・編集の「答え合わせの下書き（貼り付け）」。たたんでおき、押すと開く
// ブラウザ操作で入れやすいように、開くボタン（answer-draft-toggle）・入力欄（answer-draft-json）・読んだ結果（answer-draft-status）に id を付けてある
function AnswerDraftInputCard({ projectInfo, setProjectInfo }) {
  const [open, setOpen] = useState(false);
  const text = projectInfo.answerDraftText ?? '';
  const savedText = projectInfo.answerDraftTextSaved ?? '';
  const changed = isCostMemoChanged(text, savedText);
  const empty = !text.trim();
  const parsed = empty ? null : parseAnswerDraft(text);
  const summary = empty
    ? (changed ? '空（保存すると下書きを消します）' : '未入力')
    : parsed.ok ? answerDraftCountParts(parsed).join('・') : '読めません（このままでは保存できません）';
  const status = empty
    ? (changed ? { color: '#fbbf24', text: '空のまま保存すると、答え合わせの下書きを消します（割り振り・チェック・確認済みは残ります）' } : { color: 'rgba(255,255,255,0.45)', text: '答え合わせの下書き（JSON）を貼ってください' })
    : parsed.ok ? { color: '#4ade80', text: `読み込めました（${answerDraftCountParts(parsed).join('・')}）` }
    : { color: '#f87171', text: `読めません：${parsed.reason}。このままでは保存できません` };
  return (
    <div style={{ marginBottom:20, padding:'14px 16px', borderRadius:12, background:'#3F3F3F', border:'1px solid rgba(255,255,255,0.08)' }}>
      <button id="answer-draft-toggle" type="button" aria-expanded={open} aria-controls="answer-draft-fields" onClick={() => setOpen(o => !o)}
        style={{ width:'100%', padding:0, background:'none', border:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8, fontFamily:'inherit' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'.08em' }}>答え合わせの下書き（貼り付け） / Answer Draft</div>
          <div style={{ marginTop:5, fontSize:12, fontWeight:600, color: !empty && parsed?.ok ? 'rgba(255,255,255,0.85)' : !empty ? '#f87171' : 'rgba(255,255,255,0.45)', lineHeight:1.4, overflowWrap:'anywhere' }}>{summary}</div>
        </div>
        {changed && <span style={{ flexShrink:0, fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'rgba(251,191,36,0.15)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.3)' }}>未保存</span>}
        <GradChevron open={open} size={16} />
      </button>
      {open && (
        <div id="answer-draft-fields" style={{ marginTop:14 }}>
          <label htmlFor="answer-draft-json" style={{ display:'block', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>下書き（JSON）</label>
          <textarea id="answer-draft-json" name="answer-draft-json" value={text} spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off"
            onChange={e => { const v = e.target.value; setProjectInfo(prev => ({ ...prev, answerDraftText: v })); }}
            placeholder={'{ "alloc": [ … ], "extra": [ … ], "notes": [ … ], "updatedAt": "2026-11-17" }'}
            style={{ width:'100%', minHeight:200, padding:'10px', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.05)', color:'#fff', borderRadius:8, fontSize:13, lineHeight:1.45, outline:'none', boxSizing:'border-box', fontFamily:'monospace', resize:'vertical', display:'block', minWidth:0 }} />
          <div id="answer-draft-status" role="status" aria-live="polite" style={{ marginTop:8, fontSize:12, fontWeight:700, color: status.color, lineHeight:1.5, overflowWrap:'anywhere' }}>{status.text}</div>
          <div style={{ marginTop:6, fontSize:9, color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>
            下の「保存」で、答え合わせの下書きだけを差し替えます（割り振り・チェック・確認済みは変えません）。{'{"reflected": {...}}'} を貼ると、原価マスタに反映済みの印だけを差し替えます。触らなければ送りません。
          </div>
        </div>
      )}
    </div>
  );
}

// 原価メモの画面（ホームの上に全画面で重ねる。上のヘッダーは残す）
// 上から 概要 → 廃棄物 → 工種と人工 → 費目 → 段取りと搬出計画 → 元。無い項目は見出しごと出さない
const COST_MEMO_BLUE = '#1D4ED8';
const COST_MEMO_BLUE_SOFT = '#DBEAFE';
const COST_MEMO_TH = { padding:'7px 8px', fontSize:10.5, fontWeight:700, color:'#6B7280', background:'#F9FAFB', borderBottom:'1px solid #E5E7EB', textAlign:'left', whiteSpace:'nowrap' };
const COST_MEMO_TD = { padding:'7px 8px', fontSize:12.5, color:'#111', borderBottom:'1px solid #F0F0F0', whiteSpace:'nowrap', verticalAlign:'top' };
const COST_MEMO_NUM = { textAlign:'right', fontVariantNumeric:'tabular-nums' };
const COST_MEMO_TOTAL = { fontWeight:800, borderTop:'1.5px solid #D1D5DB', background:'#FAFAFA' };

// 人工の札（青い丸い札）
const MenTag = ({ children }) => (
  <span data-men-tag style={{ display:'inline-block', fontSize:11.5, fontWeight:800, color:COST_MEMO_BLUE, background:COST_MEMO_BLUE_SOFT, borderRadius:999, padding:'1px 9px', whiteSpace:'nowrap', lineHeight:1.6, fontVariantNumeric:'tabular-nums' }}>{children}</span>
);

function CostMemoSection({ id, title, children }) {
  return (
    <section id={id} style={{ marginTop:20 }}>
      <h3 style={{ margin:'0 0 8px', paddingLeft:8, borderLeft:'3px solid #2563EB', fontSize:14, fontWeight:800, color:'#111', lineHeight:1.35 }}>{title}</h3>
      {children}
    </section>
  );
}

// 表は横にはみ出すときだけ、表の中で横にスクロールする（右に続きがある間は、表の下に一言出す）
function CostMemoTable({ children }) {
  const ref = useRef(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const check = () => setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
    if (ro) ro.observe(el);
    return () => { el.removeEventListener('scroll', check); if (ro) ro.disconnect(); };
  }, []);
  return (
    <>
      <div ref={ref} className="cost-memo-table" style={{ background:'#fff', border:'0.5px solid #E8E8E8', borderRadius:12, overflowX:'auto', maxWidth:'100%', WebkitOverflowScrolling:'touch' }}>
        <table style={{ borderCollapse:'collapse', width:'100%' }}>{children}</table>
      </div>
      {more && <div className="cost-memo-more" style={{ marginTop:4, fontSize:10.5, color:'#9CA3AF', textAlign:'right' }}>右に続きがあります（表を横にずらす）→</div>}
    </>
  );
}

function CostMemoView({ raw, siteName }) {
  const parsed = parseCostMemo(raw);
  const t = memoText;
  const m = parsed.ok ? parsed.memo : {};
  // 行の文字だけを取り出す（全部空の行は出さない）
  const rowsOf = (list, keys) => memoList(list).map(r => Object.fromEntries(keys.map(k => [k, t(r[k])]))).filter(r => keys.some(k => r[k]));
  const totalOf = (tb, keys) => { if (!isPlainObject(tb?.total)) return null; const o = Object.fromEntries(keys.map(k => [k, t(tb.total[k])])); return keys.some(k => o[k]) ? o : null; };
  const summary = memoList(m.summary).map(s => ({ label: t(s.label), value: t(s.value), strong: t(s.strong), sub: t(s.sub), highlight: s.highlight === true }))
    .filter(s => s.label || s.value || s.strong || s.sub);
  const waste = rowsOf(m.waste?.rows, ['name', 'm3', 'dest', 'packing', 'cost', 'note']);
  const wasteTotal = totalOf(m.waste, ['m3', 'cost']);
  const tasks = rowsOf(m.tasks?.rows, ['name', 'qty', 'unit', 'men']);
  const tasksTotal = totalOf(m.tasks, ['men']);
  const costs = rowsOf(m.costs, ['name', 'day', 'night', 'total', 'men', 'detail']);
  const schedule = rowsOf(m.schedule, ['day', 'work', 'shift', 'people', 'days', 'men', 'm3', 'trucks', 'items', 'note']);
  // 費目の人工の札：行に men があればその数。無ければ、名前が「人工」の行だけ概要の「合計人工」の数
  const summaryMen = summary.find(s => s.label === '合計人工')?.value || '';
  const costMen = (r) => withUnit(r.men || (r.name === '人工' ? summaryMen : ''), '人工');
  // 列は、どこかの行に中身があるものだけ出す
  const has = (rows, total, k) => rows.some(r => r[k]) || !!total?.[k];
  const wasteCols = [['name', '品目'], ['m3', '㎥', true], ['dest', '処分先'], ['packing', '荷姿'], ['cost', '処分費', true], ['note', '備考']].filter(([k]) => k === 'name' || has(waste, wasteTotal, k));
  const costCols = [['day', '昼（万）'], ['night', '夜（万）'], ['total', '計（万）']].filter(([k]) => has(costs, null, k));
  const isTotalRow = (name) => /合計\s*$/.test(name);

  return (
    <div style={{ maxWidth:672, margin:'0 auto', padding:'14px 16px calc(48px + env(safe-area-inset-bottom, 0px))' }}>
      <div style={{ fontSize:17, fontWeight:800, color:'#111', lineHeight:1.35, overflowWrap:'anywhere' }}>{siteName}</div>
      {t(m.header) && <div id="cost-memo-header" style={{ marginTop:3, fontSize:12, color:'#666', lineHeight:1.5, overflowWrap:'anywhere' }}>{t(m.header)}</div>}

      {!parsed.ok && (
        <div id="cost-memo-error" style={{ marginTop:16, padding:'14px 16px', background:'#fff', border:'1px solid #FCA5A5', borderRadius:14 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'#B91C1C' }}>原価メモを読めません</div>
          <div style={{ marginTop:4, fontSize:12, color:'#666', lineHeight:1.6, overflowWrap:'anywhere' }}>{parsed.reason}。設定・編集の「原価メモ（貼り付け）」を直してください。</div>
        </div>
      )}

      {summary.length > 0 && (
        <CostMemoSection id="cost-memo-summary" title="概要">
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:8 }}>
            {summary.map((s, i) => (
              <div key={i} data-highlight={s.highlight ? 'true' : undefined}
                style={{ minWidth:0, padding:'9px 11px', borderRadius:12, background: s.highlight ? '#EFF6FF' : '#fff', border: s.highlight ? '1px solid #3B82F6' : '0.5px solid #E8E8E8' }}>
                {s.label && <div style={{ fontSize:10.5, fontWeight:700, color: s.highlight ? COST_MEMO_BLUE : '#6B7280', lineHeight:1.4 }}>{s.label}</div>}
                {s.value && <div style={{ marginTop:2, fontSize: s.highlight ? 18 : 15, fontWeight:800, color: s.highlight ? COST_MEMO_BLUE : '#111', lineHeight:1.35, overflowWrap:'anywhere', fontVariantNumeric:'tabular-nums' }}>{s.value}</div>}
                {s.strong && <div style={{ marginTop:2, fontSize:13, fontWeight:800, color:'#111', lineHeight:1.4, overflowWrap:'anywhere' }}>{s.strong}</div>}
                {s.sub && <div style={{ marginTop:2, fontSize:11, color:'#9CA3AF', lineHeight:1.45, overflowWrap:'anywhere' }}>{s.sub}</div>}
              </div>
            ))}
          </div>
        </CostMemoSection>
      )}

      {(waste.length > 0 || wasteTotal) && (
        <CostMemoSection id="cost-memo-waste" title="廃棄物">
          <CostMemoTable>
            <thead><tr>{wasteCols.map(([k, label, num]) => <th key={k} style={{ ...COST_MEMO_TH, ...(num ? { textAlign:'right' } : {}) }}>{label}</th>)}</tr></thead>
            <tbody>
              {waste.map((r, i) => (
                <tr key={i}>{wasteCols.map(([k, , num]) => <td key={k} style={{ ...COST_MEMO_TD, ...(num ? COST_MEMO_NUM : {}), ...(k === 'name' ? { fontWeight:700 } : {}), ...(k === 'note' ? { whiteSpace:'normal', minWidth:'8em', color:'#666', fontSize:11.5 } : {}) }}>{r[k]}</td>)}</tr>
              ))}
              {wasteTotal && <tr>{wasteCols.map(([k, , num]) => <td key={k} style={{ ...COST_MEMO_TD, ...COST_MEMO_TOTAL, ...(num ? COST_MEMO_NUM : {}) }}>{k === 'name' ? '合計' : (wasteTotal[k] || '')}</td>)}</tr>}
            </tbody>
          </CostMemoTable>
        </CostMemoSection>
      )}

      {(tasks.length > 0 || tasksTotal) && (
        <CostMemoSection id="cost-memo-tasks" title="工種と人工">
          <CostMemoTable>
            <thead><tr><th style={COST_MEMO_TH}>工種</th><th style={{ ...COST_MEMO_TH, textAlign:'right' }}>数量</th><th style={{ ...COST_MEMO_TH, textAlign:'right', color:COST_MEMO_BLUE }}>人工</th></tr></thead>
            <tbody>
              {tasks.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...COST_MEMO_TD, whiteSpace:'normal', minWidth:'9em', lineHeight:1.45 }}>{r.name}</td>
                  <td style={{ ...COST_MEMO_TD, ...COST_MEMO_NUM }}>{r.qty}{r.unit}</td>
                  <td data-men-cell style={{ ...COST_MEMO_TD, ...COST_MEMO_NUM, fontWeight:800, fontSize:14, color:COST_MEMO_BLUE }}>{r.men}</td>
                </tr>
              ))}
              {tasksTotal && (
                <tr>
                  <td style={{ ...COST_MEMO_TD, ...COST_MEMO_TOTAL }}>合計</td>
                  <td style={{ ...COST_MEMO_TD, ...COST_MEMO_TOTAL }}></td>
                  <td data-men-cell style={{ ...COST_MEMO_TD, ...COST_MEMO_TOTAL, ...COST_MEMO_NUM, fontSize:14, color:COST_MEMO_BLUE }}>{tasksTotal.men}</td>
                </tr>
              )}
            </tbody>
          </CostMemoTable>
        </CostMemoSection>
      )}

      {costs.length > 0 && (
        <CostMemoSection id="cost-memo-costs" title="費目">
          <CostMemoTable>
            <thead><tr><th style={COST_MEMO_TH}>費目</th>{costCols.map(([k, label]) => <th key={k} style={{ ...COST_MEMO_TH, textAlign:'right' }}>{label}</th>)}</tr></thead>
            <tbody>
              {costs.map((r, i) => {
                const total = isTotalRow(r.name);
                // 説明（detail）は、行の下に表の幅いっぱいで出す（狭い列で言葉が割れないように）
                const cell = { ...COST_MEMO_TD, ...(total ? COST_MEMO_TOTAL : {}), ...(r.detail ? { borderBottom:'none', paddingBottom:2 } : {}) };
                const men = costMen(r);
                return (
                  <Fragment key={i}>
                    <tr>
                      <td style={{ ...cell, whiteSpace:'normal', minWidth:'8.5em', lineHeight:1.45 }}>
                        <span style={{ fontWeight: total ? 800 : 700 }}>{r.name}</span>
                        {men && <span style={{ marginLeft:6 }}><MenTag>{men}</MenTag></span>}
                      </td>
                      {costCols.map(([k]) => <td key={k} style={{ ...cell, ...COST_MEMO_NUM }}>{r[k]}</td>)}
                    </tr>
                    {r.detail && (
                      <tr className="cost-memo-detail">
                        <td colSpan={1 + costCols.length} style={{ ...COST_MEMO_TD, ...(total ? { background:'#FAFAFA' } : {}), paddingTop:0, whiteSpace:'normal', fontSize:10.5, color:'#9CA3AF', lineHeight:1.45 }}>{r.detail}</td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </CostMemoTable>
        </CostMemoSection>
      )}

      {schedule.length > 0 && (
        <CostMemoSection id="cost-memo-schedule" title="段取りと搬出計画">
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {schedule.map((r, i) => {
              const title = [r.day ? (/^\d+$/.test(r.day) ? `${r.day}日目` : r.day) : '', r.days && r.days !== '1' ? `（${withUnit(r.days, '日')}）` : ''].join('');
              const meta = [[r.shift, withUnit(r.people, '人')].filter(Boolean).join(' '), withUnit(r.trucks, '台'), withUnit(r.m3, '㎥')].filter(Boolean).join('・');
              return (
                <div key={i} className="cost-memo-day" style={{ padding:'10px 12px', background:'#fff', border:'0.5px solid #E8E8E8', borderRadius:12, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
                    <div style={{ flex:1, minWidth:0, lineHeight:1.45 }}>
                      {title && <span style={{ fontSize:14, fontWeight:800, color:'#111', marginRight:8 }}>{title}</span>}
                      {meta && <span style={{ fontSize:12, color:'#6B7280', fontVariantNumeric:'tabular-nums' }}>{meta}</span>}
                    </div>
                    {r.men && <span style={{ flexShrink:0 }}><MenTag>{withUnit(r.men, '人工')}</MenTag></span>}
                  </div>
                  {r.work && <div style={{ marginTop:4, fontSize:13, color:'#111', lineHeight:1.55, overflowWrap:'anywhere' }}>{r.work}</div>}
                  {r.items && <div style={{ marginTop:3, fontSize:12, color:'#6B7280', lineHeight:1.5, overflowWrap:'anywhere' }}>出す物：{r.items}</div>}
                  {r.note && <div style={{ marginTop:3, fontSize:12, color:'#6B7280', lineHeight:1.5, overflowWrap:'anywhere' }}>メモ：{r.note}</div>}
                </div>
              );
            })}
          </div>
        </CostMemoSection>
      )}

      {(t(m.source) || t(m.updatedAt)) && (
        <div id="cost-memo-source" style={{ marginTop:22, paddingTop:10, borderTop:'1px solid #E5E7EB', fontSize:11, color:'#9CA3AF', lineHeight:1.6, overflowWrap:'anywhere' }}>
          {t(m.source) && <div>元：{t(m.source)}</div>}
          {t(m.updatedAt) && <div>更新：{t(m.updatedAt)}</div>}
        </div>
      )}
    </div>
  );
}

// 全画面の重ね（ホームの上。上のヘッダーは見えたまま、下のナビは隠れる）。戻るでホームの同じ位置に戻る
function CostMemoOverlay({ raw, siteName, onBack }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onBack(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onBack]);
  return (
    <div id="cost-memo-view" role="dialog" aria-modal="true" aria-label="原価メモ"
      style={{ position:'fixed', top:'calc(52px + env(safe-area-inset-top, 0px))', left:0, right:0, bottom:0, zIndex:35, background:'#F5F7FA', overflowY:'auto', overflowX:'hidden', overscrollBehavior:'contain', WebkitOverflowScrolling:'touch' }}>
      <div style={{ position:'sticky', top:0, zIndex:1, background:'#fff', borderBottom:'1px solid #E5E7EB' }}>
        <div style={{ maxWidth:672, margin:'0 auto', display:'flex', alignItems:'center', gap:10, padding:'9px 16px' }}>
          <button id="cost-memo-back" type="button" onClick={onBack}
            style={{ display:'flex', alignItems:'center', gap:4, padding:'8px 12px', background:'#F3F4F6', border:'1px solid #E5E7EB', borderRadius:8, fontSize:12, fontWeight:700, color:'#374151', cursor:'pointer', flexShrink:0, fontFamily:'inherit' }}>
            <ChevronLeft className="w-4 h-4" />戻る
          </button>
          <span style={{ fontSize:15, fontWeight:800, color:'#111' }}>原価メモ</span>
        </div>
      </div>
      <CostMemoView raw={raw} siteName={siteName} />
    </div>
  );
}

function ProjectSettingsPage({ sites, selectedSite, projectInfo, setProjectInfo, onSave, onAddSite, onDeleteSite, onRenameSite, onNavigate, onSelectSite, onStatusChange }) {
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [openCard, setOpenCard] = useState(null);
  const [showAllSites, setShowAllSites] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ name: '', amount: '' });
  const [editingName, setEditingName] = useState(null);
  const [editNameVal, setEditNameVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // ★ ステータスフィルタタブ
  const [statusFilter, setStatusFilter] = useState('all');
  // ★ アコーディオングループ展開state(デフォルト全グループ折りたたみ)
  const [groupExpanded, setGroupExpanded] = useState({ '着工前・進行中': false, '完了': false });
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.body.scrollTop=0; document.documentElement.scrollTop=0; }, []);
  // 発注者の選択肢：今まで入っている発注者名（重複なし・空は除く）を、使われている件数の多い順に
  const clientOptions = React.useMemo(() => {
    const counts = new Map();
    sites.forEach(s => { const c = String(s.projectInfo?.client ?? '').trim(); if (c) counts.set(c, (counts.get(c) || 0) + 1); });
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ja'));
  }, [sites]);

  const handleAddSite = async () => {
    if (!newSiteName.trim()) return alert('現場名を入力してください');
    const name = newSiteName.trim();
    const added = await onAddSite(name);
    if (!added) {
      return;
    }
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
      <div className="max-w-2xl mx-auto px-4 py-6" style={{ paddingBottom:'calc(160px + env(safe-area-inset-bottom,0px))', boxSizing:'border-box', width:'100%', maxWidth:'42rem', margin:'0 auto' }}>

        {/* 閉じるボタン */}
        <button onClick={() => onNavigate('home')}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:10, background:'#fff', border:'0.5px solid #E8E8E8', color:'#1E3A5F', fontSize:12, fontWeight:600, cursor:'pointer', marginBottom:12 }}>
          <X className="w-4 h-4" />閉じる
        </button>

        {/* タイトル */}
        <div id="site-management-top" style={{ marginBottom:24 }}>
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

        {/* ★ ステータスタブ + 検索 */}
        {/* タブ削除済み(アコーディオン3グループのみ表示) */}

        {/* セクションラベル */}
        {sites.length > 0 && (
          <div style={{position:'relative',marginBottom:10}}>
            <svg style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',opacity:0.4,pointerEvents:'none'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="現場名を検索..."
              style={{width:'100%',padding:'9px 12px 9px 32px',borderRadius:9,border:'0.5px solid #E8E8E8',background:'#fff',color:'#111',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}/>
          </div>
        )}
        {sites.length > 0 && searchQuery && (
          <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginBottom:8,paddingLeft:2}}>
            検索結果: {sites.filter(s=>s.name.toLowerCase().includes(searchQuery.toLowerCase())).length}件
          </div>
        )}

        {/* アコーディオンカード */}
        {(()=>{
          // ステータスフィルタ + 検索
          const filtered = sites.filter(s => {
            // ステータス判定
            if (statusFilter !== 'all') {
              if (statusFilter === '着工前・進行中') {
                if (s.status && s.status !== '着工前・進行中' && s.status !== '進行中' && s.status !== '着工前') return false;
              } else {
                if (s.status !== statusFilter) return false;
              }
            }
            // 検索
            if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
          });

          // ★「すべて」タブ + 検索なし → アコーディオングループ表示
          const isAccordionMode = statusFilter === 'all' && !searchQuery;
          let displayed, remaining;
          // displayedに「グループヘッダー」と「現場」を混在させる
          if (isAccordionMode) {
            const grpActive = filtered.filter(s => !s.status || s.status === '着工前・進行中' || s.status === '進行中' || s.status === '着工前');
            const grpDone = filtered.filter(s => s.status === '完了');
            displayed = [];
            // ★ 全てのアイテムをdisplayedに入れて、表示状態(_visible)で管理
            displayed.push({ _isGroup:true, key:'着工前・進行中', items:grpActive });
            grpActive.forEach(s => displayed.push({ ...s, _visible: groupExpanded['着工前・進行中'], _grpKey:'着工前・進行中' }));
            displayed.push({ _isGroup:true, key:'完了', items:grpDone });
            grpDone.forEach(s => displayed.push({ ...s, _visible: groupExpanded['完了'], _grpKey:'完了' }));
            remaining = 0;
          } else {
            displayed = (searchQuery || showAllSites) ? filtered : filtered.slice(0, 5);
            remaining = filtered.length - displayed.length;
          }
          return (<>
            {filtered.length === 0 && sites.length > 0 && (
              <div style={{padding:'30px 20px',textAlign:'center',color:'#999',fontSize:13,background:'#2D2D2D',borderRadius:12}}>
                {searchQuery ? `「${searchQuery}」に一致する現場がありません` : `「${statusFilter}」の現場はありません`}
              </div>
            )}
            {displayed.map((site) => {
              // ★ グループヘッダーの場合 (案C: 同色ネイビー + 左縦線アクセント)
              if (site._isGroup) {
                const grp = site.key;
                // 各グループの左縦線色
                const accent = grp === '着工前・進行中' ? '#3B82F6'
                  : '#6B7280';
                const isExp = !!groupExpanded[grp];
                const cnt = site.items.length;
                const isDisabled = cnt === 0;
                return (
                  <button key={'grp-'+grp} onClick={()=> !isDisabled && setGroupExpanded(prev=>({...prev,[grp]:!prev[grp]}))} disabled={isDisabled}
                    style={{
                      width:'100%', padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'center',
                      background: '#1E3A5F',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      borderRight: '1px solid rgba(255,255,255,0.06)',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      borderLeft: `4px solid ${accent}`,
                      color: '#fff',
                      borderRadius:10, cursor: isDisabled ? 'default' : 'pointer',
                      fontSize:13, fontWeight:700, fontFamily:'inherit',
                      marginTop: grp === '着工前・進行中' ? 0 : 14, marginBottom:6,
                      opacity: isDisabled ? 0.5 : 1,
                      transition:'background .15s, transform .15s'
                    }}
                    onMouseEnter={e=>{ if(!isDisabled) e.currentTarget.style.background='#234A75'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='#1E3A5F'; }}>
                    <span>{grp}</span>
                    <span style={{fontSize:11,padding:'2px 9px',background:'rgba(255,255,255,0.15)',borderRadius:99,fontWeight:700,display:'flex',alignItems:'center',gap:5}}>
                      {cnt}件
                      {!isDisabled && (
                        <span style={{display:'inline-block',transition:'transform .25s cubic-bezier(0.4, 0, 0.2, 1)',transform: isExp ? 'rotate(90deg)' : 'rotate(0deg)',fontSize:10}}>▶</span>
                      )}
                    </span>
                  </button>
                );
              }
              // ★ 通常の現場カード
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

          // 受注金額のフォーマット
          const formatMoney = (n) => {
            const num = Number(n) || 0;
            if (num === 0) return null;
            return '¥' + num.toLocaleString();
          };
          const moneyDisplay = formatMoney(cardInfo.contractAmount);

          // ステータス色
          const statusColor = cardInfo.status === '完了' ? '#888' : '#00D48F';
          const statusBg = cardInfo.status === '完了' ? 'rgba(136,136,136,0.15)' : 'rgba(0,212,143,0.15)';

          // ★ アコーディオンモードの_visibleフラグでmaxHeightアニメ
          // _visible:false → 折りたたみ(高さ0)
          // _visible:true → 完全表示(maxHeight制限なし)
          // _visible:undefined → 通常モード(制限なし)
          const wrapperStyle = (site._visible === false) ? {
            maxHeight: 0,
            opacity: 0,
            overflow: 'hidden',
            marginBottom: 0,
            transition: 'max-height .35s cubic-bezier(0.4, 0, 0.2, 1), opacity .25s ease, margin-bottom .25s ease'
          } : (site._visible === true ? {
            maxHeight: 'none',
            opacity: 1,
            marginBottom: 8,
            transition: 'opacity .25s ease'
          } : {});

          return (
            <div key={site.name} style={{
              ...wrapperStyle,
              borderRadius:14, marginBottom: wrapperStyle.marginBottom !== undefined ? wrapperStyle.marginBottom : 8,
              width:'100%', maxWidth: site._visible === false ? 0 : '100vw',
              boxSizing:'border-box', minWidth:0,
              border: site._visible === false ? 'none' : '1px solid rgba(255,255,255,0.06)',
              background: site._visible === false ? 'transparent' : '#2D2D2D',
              boxShadow: site._visible === false ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
              outline: isSelected ? '2px solid rgba(0,212,143,0.4)' : 'none',
            }}>
              {/* カードヘッダー (Apple Health風) */}
              <div role="button" tabIndex={0} onClick={() => {
                  if (!isSelected && !isOpen) onSelectSite && onSelectSite(site.name);
                  setOpenCard(isOpen ? null : site.name);
                }} onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!isSelected && !isOpen) onSelectSite && onSelectSite(site.name); setOpenCard(isOpen ? null : site.name); } }}
                style={{ width:'100%', padding:'14px 16px', background:'none', border:'none', cursor:'pointer', textAlign:'left', display:'flex', flexDirection:'column', gap:10 }}>

                {/* 上段: 番号 + ステータス + 編集ボタン */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontFamily:"'SF Mono', monospace", letterSpacing:'0.08em' }}>
                    {pjNo || cardInfo.projectNumber || '番号未設定'}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {isSelected && (
                      <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'rgba(0,212,143,0.15)', color:'#00D48F', border:'1px solid rgba(0,212,143,0.2)' }}>選択中</span>
                    )}
                    {cardInfo.status && (
                      <span style={{ padding:'3px 9px', borderRadius:99, fontSize:10, fontWeight:700, background:statusBg, color:statusColor }}>
                        ● {cardInfo.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* 中段: 現場名 */}
                {editingName === site.name ? (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }} onClick={e=>e.stopPropagation()}>
                    <input
                      type="text" value={editNameVal}
                      onChange={e=>setEditNameVal(e.target.value)}
                      onKeyDown={e=>{ if(e.key==='Enter'){ onRenameSite(site.name,editNameVal); setEditingName(null); } if(e.key==='Escape') setEditingName(null); }}
                      autoFocus
                      style={{ flex:1, padding:'6px 10px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(0,212,143,0.5)', borderRadius:7, color:'#fff', fontSize:16, fontWeight:700, outline:'none' }}
                    />
                    <button onClick={e=>{ e.stopPropagation(); onRenameSite(site.name,editNameVal); setEditingName(null); }}
                      style={{ padding:'5px 10px', borderRadius:7, border:'none', background:'rgba(0,212,143,0.2)', color:'#00D48F', fontSize:11, fontWeight:700, cursor:'pointer' }}>保存</button>
                    <button onClick={e=>{ e.stopPropagation(); setEditingName(null); }}
                      style={{ padding:'5px 8px', borderRadius:7, border:'none', background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.65)', fontSize:11, cursor:'pointer' }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    <div style={{ fontSize:16, fontWeight:700, color:'#fff', lineHeight:1.3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', minWidth:0, flex:1 }}>{site.name}</div>
                    <button onClick={e=>{ e.stopPropagation(); setEditingName(site.name); setEditNameVal(site.name); }}
                      style={{ padding:'2px 7px', borderRadius:5, border:'none', background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.55)', fontSize:9, cursor:'pointer', flexShrink:0 }}>編集</button>
                  </div>
                )}

                {/* 下段: 金額 + 工期日付 */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.7)', fontFamily:"'SF Mono', monospace" }}>
                    {moneyDisplay || '—'}
                  </div>
                  {(cardInfo.startDate || cardInfo.endDate) ? (
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontFamily:"'SF Mono', monospace", flexShrink:0 }}>
                      {cardInfo.startDate ? cardInfo.startDate.replace(/-/g,'/').slice(5) : '?'}
                      {' 〜 '}
                      {cardInfo.endDate ? cardInfo.endDate.replace(/-/g,'/').slice(5) : '?'}
                    </div>
                  ) : (
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', flexShrink:0 }}>—</div>
                  )}
                  <GradChevron open={isOpen} size={16}/>
                </div>

              </div>

              {/* 展開コンテンツ */}
              {isOpen && (
                <div style={{ padding:'0 10px 14px', borderTop:'1px solid #EBEBEB', width:'100%', maxWidth:'100%', boxSizing:'border-box', overflow:'hidden' }}>
                  <div style={{ paddingTop:16, minWidth:0, width:'100%', maxWidth:'100%' }}>
                    {isSelected ? (
                      <>
                        {/* タブ削除 - 基本情報のみ */}
                        {false && (
                        <div style={{display:'flex',gap:4,background:'rgba(255,255,255,0.06)',borderRadius:10,padding:4,marginBottom:16}}>
                          {[['basic','基本情報']].map(([t,label])=>(
                            <button key={t} onClick={()=>setProjectInfo({...projectInfo,_formTab:t})}
                              style={{flex:1,padding:'8px',border:'none',borderRadius:7,fontSize:13,fontWeight:500,cursor:'pointer',
                                background:(projectInfo._formTab||'basic')===t?'#fff':'transparent',
                                color:(projectInfo._formTab||'basic')===t?'#111':'rgba(255,255,255,0.5)',transition:'all 0.15s'}}>
                              {label}
                            </button>
                          ))}
                        </div>
                        )}

                        {/* 受注情報タブは削除 (基本情報に統合) */}
                        {false && (projectInfo._formTab||'basic')==='order' && (
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
                                <input type="text" inputMode="numeric"
                                  value={projectInfo.subcontractAmount ? Number(String(projectInfo.subcontractAmount).replace(/,/g,'')).toLocaleString() : ''}
                                  onChange={e=>setProjectInfo({...projectInfo,subcontractAmount:e.target.value.replace(/,/g,'')})}
                                  placeholder="0"
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
                        {/* ★ 基本情報カード */}
                        <div style={{ marginBottom:20, padding:'16px', borderRadius:12, background:'#3F3F3F', border:'1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:14 }}>基本情報 / Basic Info</div>
                          {/* 工事番号 (読み取り専用) */}
                          <div style={{ marginBottom:14 }}>
                            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>工事番号 / PROJECT NO.</label>
                            <div style={{ padding:'10px 12px', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:8, fontSize:14, color:'rgba(255,255,255,0.55)', boxSizing:'border-box', width:'100%' }}>
                              {cardInfo.projectNumber || pjNo || '未採番'}　<span style={{ fontSize:10 }}>※ 自動採番（編集不可）</span>
                            </div>
                          </div>
{/* セクション1: 契約情報 */}
<div style={{ fontSize:9, color:'#fbbf24', fontWeight:700, letterSpacing:'.08em', marginBottom:8, paddingBottom:4, borderBottom:'1px solid rgba(251,191,36,0.3)' }}>契約情報</div>
<Select label="請負区分" labelEn="Contract Type" options={['フェイス','入間緑化']} value={projectInfo.contractType||''} onChange={v=>setProjectInfo({...projectInfo,contractType:v})} />
<Select label="工事種別" labelEn="Work Type" options={MASTER_DATA.projectNames} value={projectInfo.workType||''} onChange={v=>setProjectInfo({...projectInfo,workType:v})} />
                        <ClientPicker value={projectInfo.client||''} options={clientOptions} onChange={v=>setProjectInfo({...projectInfo, client: v, contractType: resolveContractTypeByClient(v)})} />
                        {/* 請求書送付先（紹介元の案件は、請求先のテナントの会社をここに入れる） */}
                        <div className="mb-4">
                          <label style={{display:"block",fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>請求書送付先 / Invoice To</label>
                          <input type="text" value={projectInfo.invoiceRecipient||''} onChange={e=>setProjectInfo({...projectInfo,invoiceRecipient:e.target.value})} placeholder="例) 経理部 田中様"
                            style={{ width:'100%', padding:'10px 12px', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.05)', color:'#fff', borderRadius:9, fontSize:15, outline:'none', boxSizing:'border-box', maxWidth:'100%', fontFamily:'inherit' }} />
                          {INTRODUCER_CLIENTS.includes(cleanClientName(projectInfo.client)) && (
                            <div style={{marginTop:6,fontSize:10,lineHeight:1.5,color:'#fbbf24'}}>※ 紹介案件は、請求先の会社（テナント）を請求書送付先に入れてください</div>
                          )}
                        </div>
                        <TextInput label="現場住所" labelEn="Site Location" value={projectInfo.workLocation||''} onChange={v=>setProjectInfo({...projectInfo,workLocation:v})} placeholder="東京都渋谷区..." />

                        {/* セクション2: 担当者 */}
                        <div style={{ fontSize:9, color:'#fbbf24', fontWeight:700, letterSpacing:'.08em', marginTop:16, marginBottom:8, paddingBottom:4, borderBottom:'1px solid rgba(251,191,36,0.3)' }}>担当者</div>
                        <Select label="営業担当" labelEn="Sales" options={MASTER_DATA.salesPersons} value={projectInfo.salesPerson||''} onChange={v=>setProjectInfo({...projectInfo,salesPerson:v})} />
                        {/* ★ 現場責任者: マスタ候補から選択 + 直接入力可能 */}
                        <div style={{ marginBottom:12 }}>
                          <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>現場責任者 / SITE MANAGER</label>
                          {MASTER_DATA.employees && MASTER_DATA.employees.length > 0 && (
                            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:6}}>
                              {MASTER_DATA.employees.map(emp => (
                                <button key={emp} onClick={()=>setProjectInfo({...projectInfo,siteManager:emp})}
                                  style={{padding:'5px 10px',borderRadius:6,border:`1px solid ${projectInfo.siteManager===emp?'#FBBF24':'rgba(255,255,255,0.15)'}`,background:projectInfo.siteManager===emp?'rgba(251,191,36,0.2)':'rgba(255,255,255,0.08)',color:projectInfo.siteManager===emp?'#FBBF24':'#fff',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
                                  {emp}
                                </button>
                              ))}
                            </div>
                          )}
                          <input type="text" value={projectInfo.siteManager||''} onChange={e=>setProjectInfo({...projectInfo,siteManager:e.target.value})} placeholder="マスタにない名前は直接入力(他社現場監督等)" style={{width:'100%',padding:10,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:7,color:'#fff',fontSize:13,fontFamily:'inherit'}} />
                        </div>

                        {/* セクション3: 工期・金額 */}
                        <div style={{ fontSize:9, color:'#fbbf24', fontWeight:700, letterSpacing:'.08em', marginTop:16, marginBottom:8, paddingBottom:4, borderBottom:'1px solid rgba(251,191,36,0.3)' }}>工期・金額</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                          <div>
                            <label style={{ display:'block', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>工期開始</label>
                            <input type="date" value={projectInfo.startDate||''} onChange={e=>setProjectInfo({...projectInfo,startDate:e.target.value})}
                              style={{ width:'100%', padding:'10px', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.05)', color:'#fff', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', colorScheme:'dark' }} />
                          </div>
                          <div>
                            <label style={{ display:'block', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>工期終了</label>
                            <input type="date" value={projectInfo.endDate||''} onChange={e=>setProjectInfo({...projectInfo,endDate:e.target.value})}
                              style={{ width:'100%', padding:'10px', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.05)', color:'#fff', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', colorScheme:'dark' }} />
                          </div>
                        </div>
                        <div style={{marginBottom:12}}>
                        <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>見積金額（想定金額） / ESTIMATED AMOUNT</label>
                        <input type="text" inputMode="numeric"
                          value={projectInfo.contractAmount ? Number(String(projectInfo.contractAmount).replace(/,/g,'')).toLocaleString() : ''}
                          onChange={e=>setProjectInfo({...projectInfo,contractAmount:e.target.value.replace(/,/g,'')})}
                          placeholder="5,000,000"
                          style={{width:'100%',padding:'10px',background:'rgba(0,0,0,0.25)',border:'1px solid rgba(255,255,255,0.05)',color:'#fff',borderRadius:8,fontSize:14,outline:'none',boxSizing:'border-box',fontFamily:'monospace'}}/>
                      </div>
                        <div style={{marginBottom:12, padding:'10px 10px 12px', borderRadius:10, background: parseNumericValue(projectInfo.billingAmount) <= 0 ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255,255,255,0.04)', border: parseNumericValue(projectInfo.billingAmount) <= 0 ? '1px solid rgba(239,68,68,0.75)' : '1px solid rgba(255,255,255,0.08)', boxShadow: parseNumericValue(projectInfo.billingAmount) <= 0 ? '0 0 0 1px rgba(239,68,68,0.25)' : 'none' }}>
                        <label style={{display:'block',fontSize:9,fontWeight:700,color: parseNumericValue(projectInfo.billingAmount) <= 0 ? '#fca5a5' : 'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>請求金額 / BILLING AMOUNT</label>
                        <input type="text" inputMode="numeric"
                          value={formatNumericInput(projectInfo.billingAmount)}
                          onChange={e=>setProjectInfo({...projectInfo, billingAmount: e.target.value.replace(/[^\d.]/g, '')})}
                          placeholder="0"
                          style={{width:'100%',padding:'10px',background:'rgba(17,24,39,0.42)',border: parseNumericValue(projectInfo.billingAmount) <= 0 ? '1px solid rgba(239,68,68,0.9)' : '1px solid rgba(255,255,255,0.12)',color:'#fbbf24',borderRadius:8,fontSize:14,outline:'none',boxSizing:'border-box',fontFamily:'monospace',fontWeight:700,boxShadow: parseNumericValue(projectInfo.billingAmount) <= 0 ? 'inset 0 0 0 1px rgba(239,68,68,0.2)' : 'none'}}/>
                          <div style={{marginTop:8,fontSize:10, lineHeight:1.5, color:'#fca5a5'}}>※ 請求金額と請求月を入力しないとステータスを「完了」に移行できません。</div>
                      </div>
                        {/* 請求月（'YYYY-MM'。未入力は空文字）。未入力の間は、請求金額の欄と同じ赤い枠を付ける */}
                        {(() => {
                          const missing = !normalizeInvoiceMonth(projectInfo.invoiceMonth);
                          return (
                            <div style={{marginBottom:12, padding:'10px 10px 12px', borderRadius:10, background: missing ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255,255,255,0.04)', border: missing ? '1px solid rgba(239,68,68,0.75)' : '1px solid rgba(255,255,255,0.08)', boxShadow: missing ? '0 0 0 1px rgba(239,68,68,0.25)' : 'none' }}>
                              <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:5}}>
                                <label style={{fontSize:9,fontWeight:700,color: missing ? '#fca5a5' : 'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'.06em'}}>請求月 / INVOICE MONTH</label>
                                <span style={{fontSize:9,color:'rgba(255,255,255,0.4)'}}>請求書の発行月か締めの月</span>
                              </div>
                              <select value={normalizeInvoiceMonth(projectInfo.invoiceMonth)} onChange={e=>setProjectInfo({...projectInfo, invoiceMonth: e.target.value})}
                                style={{width:'100%',padding:'10px',background:'rgba(17,24,39,0.42)',border: missing ? '1px solid rgba(239,68,68,0.9)' : '1px solid rgba(255,255,255,0.12)',color:'#fff',borderRadius:8,fontSize:14,outline:'none',boxSizing:'border-box',maxWidth:'100%',fontFamily:'inherit',WebkitAppearance:'none',boxShadow: missing ? 'inset 0 0 0 1px rgba(239,68,68,0.2)' : 'none'}}>
                                <option value="" style={{background:'#fff',color:'#111'}}>未入力</option>
                                {buildInvoiceMonthOptions(projectInfo.invoiceMonth).map(v => <option key={v} value={v} style={{background:'#fff',color:'#111'}}>{formatInvoiceMonth(v)}</option>)}
                              </select>
                            </div>
                          );
                        })()}
                        <div>
                        <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>追加金額（税抜） / ADDITIONAL</label>
                        <input type="text" inputMode="numeric"
                          value={projectInfo.additionalAmount ? Number(String(projectInfo.additionalAmount).replace(/,/g,'')).toLocaleString() : ''}
                          onChange={e=>setProjectInfo({...projectInfo,additionalAmount:e.target.value.replace(/,/g,'')})}
                          placeholder="0"
                          style={{width:'100%',padding:'10px',background:'rgba(0,0,0,0.25)',border:'1px solid rgba(255,255,255,0.05)',color:'#fff',borderRadius:8,fontSize:14,outline:'none',boxSizing:'border-box',fontFamily:'monospace'}}/>
                      </div>
                        </div>
                        {/* ★ 基本情報カード閉じ */}

                        {/* ★ 予想（原価メモ）：project_info.forecast。たたんでおき、押すと開く */}
                        <ForecastInputCard projectInfo={projectInfo} setProjectInfo={setProjectInfo} />

                        {/* ★ 原価メモ（貼り付け）：project_info.cost_memo。たたんでおき、押すと開く */}
                        <CostMemoInputCard projectInfo={projectInfo} setProjectInfo={setProjectInfo} />

                        {/* ★ 答え合わせの下書き（貼り付け）：project_info.answer_check の draft・reflected。たたんでおき、押すと開く */}
                        <AnswerDraftInputCard projectInfo={projectInfo} setProjectInfo={setProjectInfo} />

                        {/* ★ 現場詳細 */}
                        <div style={{ marginBottom:20, padding:'14px 16px', borderRadius:12, background:'#3F3F3F', border:'1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>現場詳細 / Site Details</div>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
                            <div>
                              <label style={{ display:'block', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>面積 (㎡)</label>
                              <input type="number" value={projectInfo.siteAreaM2||''} onChange={e=>setProjectInfo({...projectInfo,siteAreaM2:e.target.value})} placeholder="例) 150"
                                style={{ width:'100%', padding:'10px', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.05)', color:'#fff', borderRadius:8, fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
                            </div>
                            <div>
                              <label style={{ display:'block', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>坪数 (坪)</label>
                              <input type="number" value={projectInfo.siteTsubo||''} onChange={e=>setProjectInfo({...projectInfo,siteTsubo:e.target.value})} placeholder="例) 45"
                                style={{ width:'100%', padding:'10px', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.05)', color:'#fff', borderRadius:8, fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
                            </div>
                            <div>
                              <label style={{ display:'block', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:5 }}>業態</label>
                              <input type="text" value={projectInfo.siteUseType||''} onChange={e=>setProjectInfo({...projectInfo,siteUseType:e.target.value})} placeholder="例) 商業"
                                style={{ width:'100%', padding:'10px', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.05)', color:'#fff', borderRadius:8, fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} />
                            </div>
                          </div>
                        </div>

                        {/* ★ 備考欄（工事条件・メモ等） */}
                        <div style={{ marginBottom:20, padding:'14px 16px', borderRadius:12, background:'#3F3F3F', border:'1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>備考欄（工事条件・メモ等）</div>
                          <textarea value={projectInfo.workCondition||''} onChange={e=>setProjectInfo({...projectInfo,workCondition:e.target.value})} placeholder="例) アスベスト有り、夜間作業あり..."
                            style={{ width:'100%', padding:'10px', background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.05)', color:'#fff', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit', minHeight:92, resize:'vertical' }} />
                        </div>

                        {/* ===== 経費2分類タブ ===== */}
                        {(()=>{
                          const activeTab = projectInfo._costTab||'out';
                          const MISC_QUICK=['パーキング代','高速代','交通費','経費','道具代','東リース','アクティオ','パノラマ','ペッカー','集塵機','高所作業車','コンプレッサー','ミニユンボ','アタッチメント','アスベスト分析費'];
                          // 自動移行：既存の現場経費・販管費をmiscItemsに統合（初回のみ）
                          const miscItems = projectInfo.miscItems !== undefined ? projectInfo.miscItems :
                            [...(projectInfo.siteExpenseItems||[]), ...(projectInfo.sgaItems||[])];
                          // onKubun があれば、行に区分の札を付ける（押すと 自社→外注→その他外注 と切り替わる）。
                          // 紹介元の現場の紹介元の行は、区分より先に紹介元として数えるので、発注者名の札（押せない）にする
                          const renderItems=(items,delFn,color,border,onKubun)=>items.map((item,i)=>(
                            <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 10px',borderRadius:9,marginBottom:5,background:'#3F3F3F',border:'1px solid rgba(255,255,255,0.08)'}}>
                              <div style={{width:34,height:34,borderRadius:8,background:'rgba(255,255,255,0.1)',color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,flexShrink:0,border:`1px solid ${border}`}}>{item.name.slice(0,3)}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:700,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div>
                                <div style={{fontSize:10,color:'rgba(255,255,255,0.55)',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginTop:2}}>
                                  <span style={{fontFamily:'monospace'}}>{item.days?`${item.days}日`:'日数未設定'}</span>
                                  {onKubun && (isIntroFeeItem(item.name, projectInfo.client)
                                    ? <CostKubunTag kubun="自社" label={cleanClientName(projectInfo.client)} />
                                    : <CostKubunTag kubun={costKubunOf(item)} onClick={()=>onKubun(i, COST_KUBUN[(COST_KUBUN.indexOf(costKubunOf(item))+1)%COST_KUBUN.length])} />)}
                                </div>
                              </div>
                              <div style={{fontSize:12,fontWeight:700,color:'#fbbf24',fontVariantNumeric:'tabular-nums',whiteSpace:'nowrap'}}>¥{formatCurrency(item.amount)}</div>
                              <button onClick={()=>delFn(i)} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(239,68,68,0.25)',cursor:'pointer',background:'rgba(239,68,68,0.1)',color:'#f87171',fontSize:13,fontWeight:700}}>✕</button>
                            </div>
                          ));
                          const renderForm=(key,quick,color,grad,addFn)=>{
                            const name=projectInfo[`_${key}Name`]||'', days=projectInfo[`_${key}Days`]||'', amt=projectInfo[`_${key}Amt`]||'';
                            const rgb=key==='out'?'59,130,246':'168,85,247';
                            return (
                              <div style={{padding:12,borderRadius:10,background:'#3F3F3F',border:'1px solid rgba(255,255,255,0.08)',marginTop:4}}>
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
                                {/* 区分（自社／外注／その他外注）。既定は名前から自動 */}
                                <CostKubunPicker id={`${key}-kubun`} name={name} value={projectInfo[`_${key}Kubun`]||''} onChange={k=>setProjectInfo({...projectInfo,[`_${key}Kubun`]:k})} />
                                <button disabled={!name} onClick={()=>addFn(name,days,amt,projectInfo[`_${key}Kubun`]||guessCostKubun(name))}
                                  style={{width:'100%',padding:'11px',borderRadius:9,border:'none',background:!name?'rgba(255,255,255,0.04)':grad,color:!name?'#374151':'white',fontSize:13,fontWeight:700,cursor:!name?'not-allowed':'pointer',fontFamily:'inherit',opacity:!name?0.4:1}}>
                                  ＋ 追加
                                </button>
                              </div>
                            );
                          };
                          return (
                            <div style={{marginBottom:16}}>
                              {/* リース・機材・資材・経費等のみ */}
                              {renderItems(miscItems,(i)=>setProjectInfo({...projectInfo,miscItems:miscItems.filter((_,j)=>j!==i)}),'#a855f7','rgba(168,85,247,0.12)',
                                (i,kubun)=>setProjectInfo({...projectInfo,miscItems:miscItems.map((it,j)=>j===i?{...it,kubun}:it)}))}
                              {miscItems.length>0&&<div style={{display:'flex',justifyContent:'flex-end',gap:8,padding:'4px 4px',borderTop:'1px solid rgba(168,85,247,0.1)',marginBottom:2}}><span style={{fontSize:10,color:'rgba(255,255,255,0.45)',fontFamily:'monospace'}}>小計</span><span style={{fontSize:14,fontWeight:800,color:'#a855f7',fontVariantNumeric:'tabular-nums'}}>¥{formatCurrency(miscItems.reduce((s,i)=>s+(parseFloat(i.amount)||0),0))}</span></div>}
                              {renderForm('misc',MISC_QUICK,'#a855f7','linear-gradient(135deg,#7c3aed,#a855f7)',(name,days,amt,kubun)=>{const ni={name,days:days?parseInt(days):null,amount:parseFloat(amt)||0,kubun};setProjectInfo({...projectInfo,miscItems:[...miscItems,ni],_miscName:'',_miscDays:'',_miscAmt:'',_miscKubun:''});})}
                              <div style={{marginTop:12,padding:'12px 14px',borderRadius:10,background:'#3F3F3F',border:'1px solid rgba(255,255,255,0.08)'}}>
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
                                                                        <div style={{ marginBottom:16, padding:'10px 10px 12px', borderRadius:10, background: (projectInfo.status !== '完了' && parseNumericValue(projectInfo.billingAmount) <= 0) ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255,255,255,0.04)', border: (projectInfo.status !== '完了' && parseNumericValue(projectInfo.billingAmount) <= 0) ? '1px solid rgba(239,68,68,0.75)' : '1px solid rgba(255,255,255,0.08)', boxShadow: (projectInfo.status !== '完了' && parseNumericValue(projectInfo.billingAmount) <= 0) ? '0 0 0 1px rgba(239,68,68,0.25)' : 'none' }}>
                                  <label style={{display:'block',fontSize:9,fontWeight:700,color: (projectInfo.status !== '完了' && parseNumericValue(projectInfo.billingAmount) <= 0) ? '#fca5a5' : 'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>ステータス / STATUS</label>
                                  <select value={projectInfo.status||''} onChange={(e)=>onStatusChange ? onStatusChange(e.target.value) : setProjectInfo({ ...projectInfo, status: e.target.value })}
                                    style={{ width:'100%', padding:'11px 12px', background:'rgba(17,24,39,0.42)', border: (projectInfo.status !== '完了' && parseNumericValue(projectInfo.billingAmount) <= 0) ? '1px solid rgba(239,68,68,0.9)' : '1px solid rgba(255,255,255,0.12)', color:'#fff', borderRadius:8, fontSize:14, outline:'none', boxSizing:'border-box', maxWidth:'100%', fontFamily:'inherit', WebkitAppearance:'none', boxShadow: (projectInfo.status !== '完了' && parseNumericValue(projectInfo.billingAmount) <= 0) ? 'inset 0 0 0 1px rgba(239,68,68,0.2)' : 'none' }}>
                                    <option value="" style={{background:'#fff',color:'#111'}}>選択してください</option>
                                    {MASTER_DATA.statuses.map(opt => <option key={opt} value={opt} style={{background:'#fff',color:'#111'}}>{opt}</option>)}
                                  </select>
                                  <div style={{marginTop:8,fontSize:10,lineHeight:1.5,color:'#fca5a5'}}>
                                    ※ 請求金額・原価の入力確認後に完了へ移行してください。
                                  </div>
                                </div>
                        {/* マニフェスト */}
                        <div style={{marginBottom:16}}>
                          <label style={{display:'block',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>マニフェスト / MANIFEST</label>
                          {/* 排出事業者（1回のみ） */}
                          <div style={{marginBottom:14, padding:'10px 10px 12px', borderRadius:10, background: !projectInfo.manifestDischarger?.trim() ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255,255,255,0.04)', border: !projectInfo.manifestDischarger?.trim() ? '1px solid rgba(239,68,68,0.75)' : '1px solid rgba(255,255,255,0.08)', boxShadow: !projectInfo.manifestDischarger?.trim() ? '0 0 0 1px rgba(239,68,68,0.25)' : 'none' }}>
                            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, fontSize:9, fontWeight:700, color: !projectInfo.manifestDischarger?.trim() ? '#fca5a5' : 'rgba(255,255,255,0.45)', letterSpacing:'.08em', marginBottom:6}}>
                              <span>排出事業者</span>
                            </div>
                            <input type="text" value={projectInfo.manifestDischarger||''} onChange={e=>setProjectInfo({...projectInfo,manifestDischarger:e.target.value})}
                              placeholder="排出事業者名を入力"
                              aria-label="排出事業者"
                              required
                              style={{width:'100%',padding:'11px 12px',background:'rgba(17,24,39,0.42)',border: !projectInfo.manifestDischarger?.trim() ? '1px solid rgba(239,68,68,0.9)' : '1px solid rgba(255,255,255,0.12)',color:'#fff',borderRadius:8,fontSize:14,outline:'none',boxSizing:'border-box',fontFamily:'inherit',fontWeight:600,boxShadow: !projectInfo.manifestDischarger?.trim() ? 'inset 0 0 0 1px rgba(239,68,68,0.2)' : 'none'}}/>
                          </div>
                          {/* マニ伝種類 */}
                          <div style={{marginBottom:14}}>
                            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.35)',letterSpacing:'.08em',marginBottom:4}}>マニ伝種類</div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                              {['紙マニフェスト','電子マニフェスト'].map(v=>(
                                <button key={v} onClick={()=>setProjectInfo({...projectInfo,manifestType:projectInfo.manifestType===v?'':v})}
                                  style={{padding:'10px',borderRadius:8,border:`1px solid ${projectInfo.manifestType===v?'rgba(96,165,250,0.5)':'rgba(255,255,255,0.1)'}`,background:projectInfo.manifestType===v?'rgba(59,130,246,0.15)':'rgba(255,255,255,0.04)',color:projectInfo.manifestType===v?'#60a5fa':'rgba(255,255,255,0.55)',fontSize:12,fontWeight:projectInfo.manifestType===v?700:500,cursor:'pointer',fontFamily:'inherit'}}>
                                  {v}
                                </button>
                              ))}
                            </div>
                          </div>
                          {/* 交付担当者 */}
                          <div style={{marginBottom:14}}>
                            <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.35)',letterSpacing:'.08em',marginBottom:4}}>交付担当者</div>
                            <input type="text" value={projectInfo.manifestIssuer||''} onChange={e=>setProjectInfo({...projectInfo,manifestIssuer:e.target.value})}
                              placeholder="氏名を入力"
                              style={{width:'100%',padding:'9px 11px',background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}/>
                          </div>
                          <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:12}}>
                            {/* ヘッダー非表示（縦並びに変更） */}
                            {/* 行 */}
                            {(projectInfo.manifestRows||[]).map((row,i)=>(
                              <div key={i} style={{background:'#3F3F3F',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'10px 12px',marginBottom:8,position:'relative'}}>
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
                                    <option value="" style={{color:'#000',background:'#F3F4F6'}}>処分先を選択</option>
                                    {MASTER_DATA.disposalSites.map(s=><option key={s} value={s} style={{color:'#000',background:'#F3F4F6'}}>{s}</option>)}
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
                                    <select value={['入間緑化','自社運搬','奈良商事'].includes(row.transport)?row.transport:(row.transport?'__custom__':'')} onChange={e=>{
                                      const rows=[...(projectInfo.manifestRows||[])];
                                      if(e.target.value==='__custom__'){
                                        rows[i]={...rows[i],transport:rows[i].transport&&!['入間緑化','自社運搬','奈良商事'].includes(rows[i].transport)?rows[i].transport:''};
                                      } else {
                                        rows[i]={...rows[i],transport:e.target.value};
                                      }
                                      setProjectInfo({...projectInfo,manifestRows:rows});
                                    }} style={{width:'100%',padding:'9px 8px',background:'rgba(255,255,255,0.08)',border:'none',color:row.transport?'#fff':'rgba(255,255,255,0.3)',borderRadius:8,fontSize:13,outline:'none',fontFamily:'inherit',WebkitAppearance:'none',boxSizing:'border-box'}}>
                                      <option value="" style={{color:'#000',background:'#F3F4F6'}}>選択</option>
                                      {['入間緑化','自社運搬','奈良商事'].map(t=><option key={t} value={t} style={{color:'#000',background:'#F3F4F6'}}>{t}</option>)}
                                      <option value="__custom__" style={{color:'#000',background:'#F3F4F6'}}>リストにない場合</option>
                                    </select>
                                    {row.transport && !['入間緑化','自社運搬','奈良商事'].includes(row.transport) && (
                                      <input type="text" value={row.transport} onChange={e=>{
                                        const rows=[...(projectInfo.manifestRows||[])];
                                        rows[i]={...rows[i],transport:e.target.value};
                                        setProjectInfo({...projectInfo,manifestRows:rows});
                                      }} placeholder="運搬会社名を入力" style={{marginTop:6,width:'100%',padding:'9px 8px',background:'rgba(59,130,246,0.12)',border:'1px solid rgba(59,130,246,0.3)',color:'#60a5fa',borderRadius:8,fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}}/>
                                    )}
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
                              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 12px',background:'#3F3F3F',border:'1px solid rgba(255,255,255,0.08)',borderRadius:9,marginTop:10}}>
                                <span style={{fontSize:12,color:'#aaa'}}>合計枚数</span>
                                <span style={{fontSize:18,fontWeight:700,color:'#60a5fa'}}>{(projectInfo.manifestRows||[]).reduce((s,r)=>s+(parseInt(r.count)||0),0)}枚</span>
                              </div>
                            )}
                            {/* 備考欄 */}
                            <div style={{marginTop:14}}>
                              <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.35)',letterSpacing:'.08em',marginBottom:4}}>備考欄</div>
                              <textarea value={projectInfo.manifestRemarks||''} onChange={e=>setProjectInfo({...projectInfo,manifestRemarks:e.target.value})}
                                placeholder="例) 新規取引になります。"
                                style={{width:'100%',padding:'9px 11px',background:'rgba(255,255,255,0.08)',border:'none',color:'#fff',borderRadius:8,fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit',minHeight:64,resize:'vertical'}}/>
                            </div>
                          </div>
                        </div>
                        {/* 保存・受注表PDF・削除 */}
                        <div id="site-management-top-anchor" style={{ display:'flex', gap:8, marginTop:8 }}>
                          <button onClick={async()=>{ 
                            await onSave();
                            // 現場管理の先頭にスクロール (ホームに戻らず)
                            setTimeout(()=>{
                              const el = document.getElementById('site-management-top');
                              if (el) el.scrollIntoView({behavior:'smooth',block:'start'});
                              else window.scrollTo({top:0,behavior:'smooth'});
                            }, 100);
                          }} style={{ flex:2, padding:'13px', background:'linear-gradient(135deg,#2563EB,#4f46e5)', border:'none', color:'#fff', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                            <Save className="w-4 h-4" />保存
                          </button>
                          <button onClick={async()=>{ await onSave(true); onNavigate('order_pdf'); }} style={{ flex:2, padding:'13px', background:'#991B1B', border:'none', color:'#fff', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                            <FileText className="w-4 h-4" />受注表PDF
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
                style={{width:'100%',padding:'12px',border:'1px solid rgba(59,130,246,0.3)',borderRadius:10,background:'rgba(59,130,246,0.08)',color:'#60a5fa',fontSize:13,fontWeight:700,cursor:'pointer',marginTop:8,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(59,130,246,0.15)';e.currentTarget.style.borderColor='rgba(59,130,246,0.5)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(59,130,246,0.08)';e.currentTarget.style.borderColor='rgba(59,130,246,0.3)';}}>
                ↓ 残り{remaining}件を表示
              </button>
            )}
            {showAllSites && !searchQuery && (
              <button onClick={()=>setShowAllSites(false)}
                style={{width:'100%',padding:'10px',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,background:'rgba(255,255,255,0.04)',color:'#888',fontSize:12,fontWeight:700,cursor:'pointer',marginTop:8,fontFamily:'inherit'}}>
                ▲ 閉じる
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

// ========== 処分費の自動計算（unit_prices。ワイエム・入間緑化開発） ==========
const YM_VENDOR = 'ワイエム';
const IRIMA_VENDOR = '入間緑化開発';
// 単価表（unit_prices）を使う業者と、処分先の名前がその業者に当たるかの決め方。業者を足すときはここに1行足す
// ※入間緑化開発は処分先の名前で判定する（案件の請負区分 contract_type の「入間緑化」とは別物）
const PRICE_MASTER_VENDORS = [
  { vendor: YM_VENDOR, matches: (name) => name === YM_VENDOR },             // 完全一致（今までどおり）
  { vendor: IRIMA_VENDOR, matches: (name) => name.includes('入間緑化') },   // 「入間緑化」「入間緑化開発」「入間緑化開発㈱」など
];
const WASTE_TYPE_OTHER = '__other__'; // 種類プルダウンの「その他（直接入力）」
const WASTE_UNIT_OPTIONS = ['㎥', 'kg', 't'];
const isYmDisposal = (disposal) => String(disposal || '').trim() === YM_VENDOR;

// 処分先の名前から、単価表を使う業者を決める（当たらなければ null＝手入力）
const priceVendorForDisposal = (disposal) => {
  const name = String(disposal || '').trim();
  if (!name) return null;
  const hit = PRICE_MASTER_VENDORS.find(v => v.matches(name));
  return hit ? hit.vendor : null;
};

// 単価表を業者ごとに分けて読む。読めない・行がない業者は空の一覧（自動にならないだけで、手入力で使える）
async function loadPriceMasters() {
  const byVendor = Object.fromEntries(PRICE_MASTER_VENDORS.map(v => [v.vendor, []]));
  try {
    const vendors = `(${PRICE_MASTER_VENDORS.map(v => `"${v.vendor}"`).join(',')})`;
    const data = await sb('unit_prices').select(`vendor=in.${encodeURIComponent(vendors)}&active=eq.true&order=sort_order.asc.nullslast`);
    if (!Array.isArray(data)) return byVendor;
    data
      .filter(row => row && row.item && row.active !== false && byVendor[row.vendor])
      .sort((a, b) => (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9))
      .forEach(row => byVendor[row.vendor].push(row));
    return byVendor;
  } catch (e) {
    console.warn('unit_prices を読めませんでした（手入力で続けます）:', e);
    return byVendor;
  }
}

// 業者ごとの「品名 → 単価の行」の表
const buildPriceMaps = (byVendor) => Object.fromEntries(
  Object.entries(byVendor || {}).map(([vendor, rows]) => [vendor, new Map((rows || []).map(row => [row.item, row]))])
);

// 処分先に当たる業者の単価表（業者に当たらない・行がないときは null）
const masterMapFor = (disposal, priceMaps) => {
  const vendor = priceVendorForDisposal(disposal);
  const map = vendor && priceMaps ? priceMaps[vendor] : null;
  return map && map.size > 0 ? map : null;
};

// 産廃フォームの空の状態。ワイエム配車タブの産廃処分は処分先をワイエムにしておく
const blankWasteForm = (tab, mode = 'cost') => ({
  mode, type: mode === 'tool' ? '道具車' : '',
  disposal: (tab === 'ext' && mode === 'cost') ? YM_VENDOR : '',
  qty: '', unit: mode === 'revenue' ? 'kg' : '㎥', price: '', manifest: '',
  haisha: '', driver: '', vType: '', vNumber: '', haishiShift: '', haishiOverride: false, haishiPrice: '',
  workerName: '', workerVType: '', workerVNumber: '', volumeM3: '', isSwap: false,
  // priceSource: 'master'=単価マスタで自動 / 'manual'=手入力。priceOverride: 自動の金額を手で直した
  priceSource: 'manual', priceOverride: false, unitPrice: 0,
  typeCustom: false, // 単価表のある処分先で「その他（直接入力）」を選んだ
  carried: false,    // 前の行から処分先・マニNo.・担当者/車両を引き継いだだけの状態
});

// 処分費 = 数量 × 単価（円未満は四捨五入）
const calcMasterAmount = (qty, unitPrice) => {
  const q = parseFloat(qty);
  if (!Number.isFinite(q) || q <= 0) return '';
  return String(Math.round(q * (Number(unitPrice) || 0)));
};

// 単価表の品目を選んでいれば、その行を返す（その他・単価表のない処分先・表にない品名は null）
const getMasterRow = (form, priceMaps) => {
  if (form.typeCustom) return null;
  const map = masterMapFor(form.disposal, priceMaps);
  return map ? map.get(form.type) || null : null;
};

// 単価表の単位・単価を入れて処分費を計算する（手で直した行は金額を変えない）
const applyMasterPrice = (form, row) => {
  const unitPrice = Number(row.price) || 0;
  const next = { ...form, unit: row.unit || form.unit, unitPrice, priceSource: 'master' };
  if (!next.priceOverride) next.price = calcMasterAmount(next.qty, unitPrice);
  return next;
};

// 自動で入れた単位・処分費を外し、手入力の状態に戻す
const clearAutoPrice = (form) => ({
  ...form,
  ...(form.priceSource === 'master' ? { price: '', unit: '㎥' } : {}),
  priceSource: 'manual', priceOverride: false, unitPrice: 0,
});

// 処分先を変えたとき（指示書 3-2。ワイエム・入間緑化開発で共通）
const changeWasteDisposal = (form, disposal, priceMaps) => {
  const next = { ...form, disposal };
  // 単価表が読めている業者だけを対象にする（読めていなければ今までどおり）
  const fromVendor = masterMapFor(form.disposal, priceMaps) ? priceVendorForDisposal(form.disposal) : null;
  const toMap = masterMapFor(disposal, priceMaps);
  const toVendor = toMap ? priceVendorForDisposal(disposal) : null;
  if (fromVendor === toVendor) return next;
  // 単価表のある処分先 → ほか: 種類を空にして自由入力へ。自動の処分費は 0 に戻す
  const base = fromVendor ? { ...clearAutoPrice(next), type: '', typeCustom: false } : next;
  if (!toVendor) return base;
  // → 単価表のある処分先: 種類が品名と完全一致ならそのまま使う。違えば空にしてプルダウンから選ばせる
  const row = toMap.get(base.type);
  if (row) return applyMasterPrice({ ...base, typeCustom: false, priceOverride: false }, row);
  return { ...clearAutoPrice(base), type: '', typeCustom: false };
};

// 種類のプルダウンを選んだとき
const selectWasteType = (form, value, priceMaps) => {
  if (value === WASTE_TYPE_OTHER) return { ...clearAutoPrice(form), type: '', typeCustom: true };
  const map = masterMapFor(form.disposal, priceMaps);
  const row = map && map.get(value);
  if (!row) return { ...clearAutoPrice(form), type: '', typeCustom: false };
  return applyMasterPrice({ ...form, type: value, typeCustom: false, priceOverride: false }, row);
};

// 数量を変えたとき: 単価表の品目なら処分費を計算し直す（手で直した行は金額を変えない）
const changeWasteQty = (form, qty, priceMaps) => {
  const next = { ...form, qty };
  const row = getMasterRow(next, priceMaps);
  return row ? applyMasterPrice(next, row) : next;
};

// 処分費を手で直したとき: 自動の行なら手修正にする（以降は数量を変えても上書きしない）
const changeWastePrice = (form, price) => ({
  ...form, price,
  priceOverride: form.priceSource === 'master' ? true : form.priceOverride === true,
});

// 「自動に戻す」
const resetWasteAutoPrice = (form, priceMaps) => {
  const row = getMasterRow(form, priceMaps);
  return row ? applyMasterPrice({ ...form, priceOverride: false }, row) : form;
};

// wasteItems の行に入れる単位・単価の情報（指示書 3-5）
const wastePriceFields = (form) => {
  const isMaster = form.priceSource === 'master' && !form.typeCustom && priceVendorForDisposal(form.disposal) !== null && !!form.type;
  return isMaster
    ? { unit: form.unit, unitPrice: Number(form.unitPrice) || 0, priceSource: 'master', priceOverride: form.priceOverride === true }
    : { unit: form.unit, unitPrice: 0, priceSource: 'manual', priceOverride: false };
};

// 追加したあとのフォーム: 処分先・マニNo.・担当者/車両を引き継ぎ、種類・数量・処分費は空にする（指示書 3-4）
const wasteFormAfterAdd = (prev, tab) => ({
  ...blankWasteForm(tab, 'cost'),
  disposal: prev.disposal || '', manifest: prev.manifest || '',
  workerName: prev.workerName || '', workerVType: prev.workerVType || '', workerVNumber: prev.workerVNumber || '',
  driver: prev.driver || '', vType: prev.vType || '', vNumber: prev.vNumber || '',
  carried: true,
});

// 引き継いだだけで、種類・数量・処分費が空のフォーム（「入力中」とみなさない）
const isCarriedOnlyWasteForm = (form) => form.carried === true && !form.type && !form.qty && !form.price;

// 産廃フォームに「追加していない入力」が残っているか（空の状態・引き継いだだけの状態は除く）
const WASTE_ENTRY_FIELDS = ['type', 'disposal', 'qty', 'price', 'manifest', 'workerName', 'workerVType', 'workerVNumber', 'driver', 'vType', 'vNumber', 'haishiShift', 'haishiPrice', 'volumeM3'];
const isWasteFormPending = (form, tab) => {
  if (!form || isCarriedOnlyWasteForm(form)) return false;
  const blank = blankWasteForm(tab, form.mode || 'cost');
  return WASTE_ENTRY_FIELDS.some(key => String(form[key] ?? '').trim() !== String(blank[key] ?? '').trim());
};

// 配車費が例外金額（手入力）の行か。古い日報の印のない行も、昼夜なしで金額があれば例外金額とみなす
const isHaishiOverrideItem = (item) => !!item && (item.haishiOverride === true || (!item.haishiShift && (item.haishiAmount || 0) > 0));

// ワイエム配車の行のマニフェストNo.（空欄・金属売上の「-」は対象外）
const extManifestKey = (item) => {
  if (!item || item.isScrap === true || (item.amount || 0) < 0) return '';
  const manifest = String(item.manifestNumber || '').trim();
  return manifest && manifest !== '-' ? manifest : '';
};

// 同じ担当者の、この行より前（beforeIdx より前）の行に、同じ車両（車種・車番）があるか。
// 乗換（車を乗り換えた）と、同じ車で運んだ品目を分けただけの行を表示で区別するために使う
const hasEarlierSameVehicle = (items, item, beforeIdx) =>
  !!item && !!item.workerName && !!item.workerVType &&
  (items || []).some((w, j) => j < beforeIdx && w && w.workerName === item.workerName &&
    (w.workerVType || '') === (item.workerVType || '') &&
    String(w.workerVNumber || '').trim() === String(item.workerVNumber || '').trim());

// 乗換の印を行の順番で付け直す（担当者ごとに、車両つきの1行目は印なし・2行目以降は印あり）。
// 保存済みの日報を開いたときと同じ決め方。行の削除・上書きで1行目に印が残り、車両費が日計から落ちるのを防ぐ
const normalizeSwapFlags = (items) => {
  const seen = new Set();
  return (items || []).map(item => {
    if (!item) return item;
    if (!item.workerName || !item.workerVType) return item.isSwap === true ? { ...item, isSwap: false } : item;
    const isSwap = seen.has(item.workerName);
    seen.add(item.workerName);
    return item.isSwap === isSwap ? item : { ...item, isSwap };
  });
};

// 日報入力の自社人工・重機・経費：入力欄に残っている中身を一覧に入れる（「次へ」と保存で使う）。
// 外注人工（applyOFormToOutsourcing）と同じ決まり:
//  ・行をタップ中: 新しい行は足さず、タップした行を入力欄の中身で上書きする（その欄の「＋ 追加する」と同じ）。
//    入力欄を変えていなければ、行はそのまま。入力が足りなければ何もしない
//  ・タップしていないとき: 入力が足りていれば、新しい行として足す（今までどおり）
//  form / loaded: いまの入力欄と、行をタップして読み込んだときの入力欄（同じ名前の欄どうしで比べる）
//  makeRow(元の行): 入力欄から作る行（上書きのときは元の行、足すときは null が渡る）
//  戻り値: { list: 入れたあとの一覧, used: 入力欄の中身を使ったか（使ったら入力欄を空にしてよい） }
const applyFormToRows = (list, { editingIdx, form, loaded, isValid, makeRow }) => {
  if (editingIdx !== null && list[editingIdx]) {
    const keys = new Set([...Object.keys(form), ...Object.keys(loaded || {})]);
    const unchanged = !!loaded && [...keys].every(k => String(form[k] ?? '') === String(loaded[k] ?? ''));
    if (unchanged) return { list, used: true };
    if (!isValid) return { list, used: false };
    const next = [...list];
    next[editingIdx] = makeRow(list[editingIdx]);
    return { list: next, used: true };
  }
  if (!isValid) return { list, used: false };
  return { list: [...list, makeRow(null)], used: true };
};

function ReportInputPage({ onSave, onNavigate, projectInfo, onReleaseLock, editReport, onUpdate, unitPricesByVendor = {} }) {
  const isEditMode = !!editReport;
  // 業者ごとの単価表（ワイエム・入間緑化開発）。読めない・行がない業者は空 → 種類は自由入力・処分費は手入力のまま
  const priceMaps = buildPriceMaps(unitPricesByVendor);
  const hasAnyPriceMaster = Object.values(priceMaps).some(map => map.size > 0);
  const [currentStep, setCurrentStep] = useState(1);
  const [report, setReport] = useState(
    isEditMode
      ? { date: editReport.date, weather: editReport.weather, recorder: editReport.recorder, customRecorder: '' }
      : { date: new Date().toISOString().split('T')[0], weather: '', recorder: '', customRecorder: '' }
  );
  const [workDetails, setWorkDetails] = useState(
    isEditMode ? (() => {
      const wd = { ...(editReport.workDetails || { workCategory:'', workContent:'', inHouseWorkers:[], outsourcingLabor:[], vehicles:[], machinery:[], envItems:[], extItems:[], costItems:[], dailyExpenses:[] }) };
      // 経費の入力途中の値（前は日報の中に _expName / _expAmt として保存していた）は読み込まない。
      // 入力欄は空から始め、保存し直すとこの2つは日報から消える
      delete wd._expName;
      delete wd._expAmt;
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
  // ★ 編集モード時、旧scrapItems(金属売上)を wasteItems にマージして表示
  // ★ さらに同じ担当者の2件目以降を自動的に isSwap: true に再判定
  const [wasteItems, setWasteItems] = useState(() => {
    if (!isEditMode) return [];
    const w = editReport.wasteItems || [];
    const s = editReport.scrapItems || [];
    // 旧scrapItemsをwasteItems互換形式に変換 (amountをマイナスに、isScrap:trueに)
    const migrated = s.map(sc => ({
      ...sc,
      amount: -Math.abs(sc.amount || 0),
      isScrap: true,
      kind: 'scrap',
      manifestNumber: sc.manifestNumber || '-',
    }));
    const merged = [...w, ...migrated];
    // ★ isSwap を再判定: 同担当者の1台目はfalse、2台目以降はtrue
    const seen = new Set();
    return merged.map(item => {
      if (!item || !item.workerName || !item.workerVType) {
        return {...item, isSwap: false};
      }
      const name = item.workerName;
      if (seen.has(name)) {
        return {...item, isSwap: true};
      } else {
        seen.add(name);
        return {...item, isSwap: false};
      }
    });
  });
  const [scrapItems, setScrapItems] = useState([]); // ★ マージ後は空に(保存時に分離)
  const [editingWasteIdx, setEditingWasteIdx] = useState(null);
  const [editingScrapIdx, setEditingScrapIdx] = useState(null);
  // ★ 編集中インデックス (自社/外注/車両/機械/経費)
  const [editingWIdx, setEditingWIdx] = useState(null);
  const [editingOIdx, setEditingOIdx] = useState(null);
  // 外注人工：行をタップして入力欄に読み込んだときの中身（入力欄を変えたかどうかを見るため）
  const oFormLoadedRef = useRef(null);
  const [editingVIdx, setEditingVIdx] = useState(null);
  const [editingMIdx, setEditingMIdx] = useState(null);
  const [editingExpIdx, setEditingExpIdx] = useState(null);
  const [expKubun, setExpKubun] = useState(''); // 経費の区分（空＝名前から自動）。workDetails には入れない（日報に保存しない）
  const [expForm, setExpForm] = useState({ name:'', amt:'' }); // 経費の入力欄（項目名・金額）。workDetails には入れない（日報に保存しない）
  // 自社人工・重機・経費：行をタップして入力欄に読み込んだときの中身（入力欄を変えたかどうかを見るため。外注人工の oFormLoadedRef と同じ）
  const wFormLoadedRef = useRef(null);
  const mFormLoadedRef = useRef(null);
  const expFormLoadedRef = useRef(null);
  const [photoUrls, setPhotoUrls] = useState(isEditMode ? (editReport.photoUrls || []) : []);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [memoText, setMemoText] = useState(isEditMode ? (editReport.memo || '') : '');
  const [photoAccordion, setPhotoAccordion] = useState(false);
  // ★ 半日追加
  const unitPrices = { inHouseDaytime: 25000, inHouseNighttime: 35000, inHouseNightLoading: 25000, inHouseHalfDay: 12500, outsourcingDaytime: 25000, outsourcingNighttime: 30000 };
  // ★ dept追加
  const [wForm, setWForm] = useState({ name:'', start:'', end:'', shift:'daytime', dept:'k1' });
  const [oForm, setOForm] = useState({ company:'', count:'', shift:'daytime', start:'', end:'' });
  const [vForm, setVForm] = useState({ type:'', number:'' });
  const [mForm, setMForm] = useState({ type:'', price:'' });
  const [wasteForm, setWasteForm] = useState({ mode:'cost', type:'', disposal:'', qty:'', unit:'㎥', price:'', manifest:'', haisha:'', driver:'', vType:'', vNumber:'', haishiShift:'', haishiOverride:false, haishiPrice:'', workerName:'', workerVType:'', workerVNumber:'', volumeM3:'', isSwap:false });
  const [scrapForm, setScrapForm] = useState({ type:'金属くず', buyer:'', qty:'', unit:'kg', price:'', manifest:'', volumeM3:'', workerName:'', workerVType:'', workerVNumber:'', isSwap:false });

  // ★ 自動検出: wasteForm.workerName と scrapForm.workerName が変わったら、既存リストに同名がいるか確認して自動でisSwap切り替え
  useEffect(() => {
    const name = (wasteForm.workerName||'').trim();
    // ★ 編集中は自動再判定しない: 既存データの isSwap を勝手に書き換えない
    if (editingWasteIdx !== null) return;
    // 担当者・車両が未入力なら isSwap は false に戻す
    if (!name || !wasteForm.workerVType) {
      if (wasteForm.isSwap === true) setWasteForm(prev => ({...prev, isSwap: false}));
      return;
    }
    // 既存wasteItems・scrapItemsに同じ担当者の車両アイテムがあるか確認 (編集中アイテムは除外)
    const isDup = wasteItems.some((w, i) => i !== editingWasteIdx && w.workerName === name && w.workerVType)
               || scrapItems.some((s, i) => i !== editingScrapIdx && s.workerName === name && s.workerVType);
    if (isDup !== (wasteForm.isSwap === true)) {
      setWasteForm(prev => ({...prev, isSwap: isDup}));
    }
  }, [wasteForm.workerName, wasteForm.workerVType, wasteItems, scrapItems, editingWasteIdx, editingScrapIdx]);

  useEffect(() => {
    const name = (scrapForm.workerName||'').trim();
    if (editingScrapIdx !== null) return;
    if (!name || !scrapForm.workerVType) {
      if (scrapForm.isSwap === true) setScrapForm(prev => ({...prev, isSwap: false}));
      return;
    }
    const isDup = wasteItems.some((w, i) => i !== editingWasteIdx && w.workerName === name && w.workerVType)
               || scrapItems.some((s, i) => i !== editingScrapIdx && s.workerName === name && s.workerVType);
    if (isDup !== (scrapForm.isSwap === true)) {
      setScrapForm(prev => ({...prev, isSwap: isDup}));
    }
  }, [scrapForm.workerName, scrapForm.workerVType, wasteItems, scrapItems, editingWasteIdx, editingScrapIdx]);
  // ★ 課タブ
  const [currentDept, setCurrentDept] = useState('k1');
  // ★ 産廃入力の自社運搬タブ内の部署タブ (k1=工事1課 / k2=環境課)
  const [wasteSelfDept, setWasteSelfDept] = useState('k1');
  // ★ 産廃入力の3タブ (self=自社運搬 / env=環境課配車 / ext=ワイエム配車)
  const [wasteTab, setWasteTab] = useState('self');
  // ★ タブごとの mode (処分=cost / 売上=revenue) を独立管理
  const [wasteModeByTab, setWasteModeByTab] = useState({ self:'cost', env:'cost', ext:'cost' });
  const ENV_PRICES = { day:20000, night:30000 };
  const EXT_PRICES = { day:22000, night:32000 };

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [currentStep]);

  // ★ キャンセル時にロック解放
  const handleCancel = async () => {
    const msg = isEditMode ? '編集を破棄してホーム画面に戻りますか？' : '入力内容を破棄してホーム画面に戻りますか？';
    if (confirm(msg)) {
      if (onReleaseLock) await onReleaseLock();
      window.scrollTo({top:0,behavior:'instant'});
      onNavigate('home');
    }
  };

  const isStep1Valid = () => report.date && report.recorder;
  const [isSaving, setIsSaving] = useState(false);
  // ★ Step2の「次へ」: 自社/外注/車両/機械/経費の自動追加
  const handleStep2Next = () => {
    let newWorkDetails = workDetails;
    // 自社人工（行をタップ中なら、新しい行は足さずにその行を上書きする）
    const worker = applyWFormToWorkers(newWorkDetails.inHouseWorkers || []);
    if (worker.used) {
      newWorkDetails = {...newWorkDetails, inHouseWorkers: worker.list};
      setWForm({name:'',start:'',end:'',shift:'daytime',dept:currentDept});
      setEditingWIdx(null);
    }
    // 外注人工（行をタップ中なら、新しい行は足さずにその行を上書きする）
    const outsource = applyOFormToOutsourcing(newWorkDetails.outsourcingLabor || []);
    if (outsource.used) {
      newWorkDetails = {...newWorkDetails, outsourcingLabor: outsource.list};
      setOForm({company:'',count:'',shift:'daytime',start:'',end:''});
      setEditingOIdx(null);
    }
    // 車両
    if (vForm && vForm.type) {
      newWorkDetails = {...newWorkDetails, vehicles:[...(newWorkDetails.vehicles||[]), {...vForm, amount: VEHICLE_UNIT_PRICES[vForm.type]||0}]};
      setVForm({type:'',number:'',driver:''});
    }
    // 重機（行をタップ中なら、新しい行は足さずにその行を上書きする）
    const machine = applyMFormToMachinery(newWorkDetails.machinery || []);
    if (machine.used) {
      newWorkDetails = {...newWorkDetails, machinery: machine.list};
      setMForm({type:'',price:''});
      setEditingMIdx(null);
    }
    // 経費（行をタップ中なら、新しい行は足さずにその行を上書きする）
    const expense = applyExpFormToExpenses(newWorkDetails.dailyExpenses || []);
    if (expense.used) {
      newWorkDetails = {...newWorkDetails, dailyExpenses: expense.list};
      setExpForm({name:'', amt:''});
      setExpKubun('');
      setEditingExpIdx(null);
    }
    setWorkDetails(newWorkDetails);
    setCurrentStep(3);
  };
  const handleSave = async () => {
    if (isSaving) return;
    // ★ 産廃フォームに「追加」していない入力があれば保存しない（どのタブでも自社運搬として勝手に保存しない）
    if (isWasteFormPending(wasteForm, wasteTab)) {
      alert((editingWasteIdx !== null
        ? '編集中の行があります。『この内容で上書き』か『キャンセル』を押してから保存してください'
        : '入力中の行があります。『＋追加する』を押してから保存してください')
        + '\n\n（いらない入力は、上の「自社運搬／環境課配車／ワイエム配車」のタブを押し直すと消えます）');
      return;
    }
    setIsSaving(true);
    try {
      // ★ 自動追加: 入力中フォームに値があれば、保存前に自動でリストに追加
      let finalWorkDetails = workDetails;
      let finalWasteItems = wasteItems;
      let finalScrapItems = scrapItems;

      // 自社人工フォーム自動追加 (氏名があれば)。行をタップ中なら、足さずにその行を上書きする
      const worker = applyWFormToWorkers(finalWorkDetails.inHouseWorkers || []);
      if (worker.used) {
        finalWorkDetails = { ...finalWorkDetails, inHouseWorkers: worker.list };
      }
      // 外注人工フォーム自動追加 (会社名+人数があれば)。行をタップ中なら、足さずにその行を上書きする
      //（編集の「✓ 人数を変更したらここで更新」は Step2 から直接ここに来る）
      const outsource = applyOFormToOutsourcing(finalWorkDetails.outsourcingLabor || []);
      if (outsource.used) {
        finalWorkDetails = { ...finalWorkDetails, outsourcingLabor: outsource.list };
      }
      // 車両フォーム自動追加 (車種があれば)
      if (vForm && vForm.type) {
        finalWorkDetails = {
          ...finalWorkDetails,
          vehicles: [...(finalWorkDetails.vehicles||[]), {...vForm, amount: VEHICLE_UNIT_PRICES[vForm.type]||0}]
        };
      }
      // 機械フォーム自動追加 (種類があれば)。行をタップ中なら、足さずにその行を上書きする
      const machine = applyMFormToMachinery(finalWorkDetails.machinery || []);
      if (machine.used) {
        finalWorkDetails = { ...finalWorkDetails, machinery: machine.list };
      }
      // 経費は、行をタップ中のときだけ、その行を上書きする（タップしていない入力は今までどおり足さない）
      if (editingExpIdx !== null) {
        const expense = applyExpFormToExpenses(finalWorkDetails.dailyExpenses || []);
        if (expense.used) {
          finalWorkDetails = { ...finalWorkDetails, dailyExpenses: expense.list };
        }
      }

      // 産廃フォームの入力中の行は自動で追加しない（保存の前に止めている）
      // 金属売上フォーム自動追加
      if (scrapForm && scrapForm.type && scrapForm.buyer && parseFloat(scrapForm.qty) > 0) {
        const qty = parseFloat(scrapForm.qty);
        const total = parseFloat(scrapForm.price) || 0;
        const scrapVehicleAmount = VEHICLE_UNIT_PRICES[scrapForm.workerVType] || 0;
        const newScrapItem = {
          type: scrapForm.type, buyer: scrapForm.buyer, quantity: qty,
          unit: scrapForm.unit, unitPrice: 0, amount: -total,
          manifestNumber: scrapForm.manifest || '',
          volumeM3: scrapForm.volumeM3 ? parseFloat(scrapForm.volumeM3) : null,
          workerName: scrapForm.workerName || '', workerVType: scrapForm.workerVType || '',
          workerVNumber: scrapForm.workerVNumber || '', vehicleAmount: scrapVehicleAmount
        };
        if (editingScrapIdx !== null) {
          finalScrapItems = [...scrapItems];
          finalScrapItems[editingScrapIdx] = newScrapItem;
        } else {
          finalScrapItems = [...scrapItems, newScrapItem];
        }
      }

      const data = { ...report, recorder: report.customRecorder || report.recorder, workDetails: finalWorkDetails, wasteItems: finalWasteItems, scrapItems: finalScrapItems, photoUrls, memo: memoText };
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
  const getShiftCount = (shift) => (shift === 'halfDay' ? 0.5 : 1);

  const addWorker = () => {
    const actualName = wForm.name.trim();
    if (!actualName) return;
    const count = getShiftCount(wForm.shift);
    const amount = getShiftAmount(wForm.shift);
    if (editingWIdx !== null) {
      const list = [...workDetails.inHouseWorkers];
      list[editingWIdx] = {...wForm, count, amount};
      setWorkDetails({...workDetails, inHouseWorkers: list});
      setEditingWIdx(null);
    } else {
      setWorkDetails({...workDetails, inHouseWorkers:[...workDetails.inHouseWorkers,{...wForm, count, amount}]});
    }
    setWForm({name:'',start:'',end:'',shift:'daytime',dept:currentDept});
  };
  const loadWorkerForEdit = (i) => {
    const w = workDetails.inHouseWorkers[i];
    if (!w) return;
    const form = {name:w.name||'', start:w.start||'', end:w.end||'', shift:w.shift||'daytime', dept:w.dept||'k1'};
    setWForm(form);
    wFormLoadedRef.current = form;
    if (w.dept) setCurrentDept(w.dept);
    setEditingWIdx(i);
  };
  // 自社人工：入力欄に残っている中身を一覧に入れる（「次へ」と、保存・「✓ 人数を変更したらここで更新」で使う。決まりは applyFormToRows）
  const applyWFormToWorkers = (list) => applyFormToRows(list, {
    editingIdx: editingWIdx, form: wForm, loaded: wFormLoadedRef.current,
    isValid: !!(wForm.name || '').trim(),
    makeRow: () => ({...wForm, count: getShiftCount(wForm.shift), amount: getShiftAmount(wForm.shift)}),
  });
  const addOutsource = () => {
    const actualCompany = oForm.company.trim();
    if (!actualCompany) return;
    const count = parseFloat(oForm.count) || 0;
    if (count <= 0) return;
    const basePrice = oForm.shift==='nighttime'?unitPrices.outsourcingNighttime:unitPrices.outsourcingDaytime;
    const amount = count * basePrice;
    if (editingOIdx !== null) {
      const list = [...workDetails.outsourcingLabor];
      list[editingOIdx] = {...oForm, count, amount};
      setWorkDetails({...workDetails, outsourcingLabor: list});
      setEditingOIdx(null);
    } else {
      setWorkDetails({...workDetails, outsourcingLabor:[...workDetails.outsourcingLabor,{...oForm,count,amount}]});
    }
    setOForm({company:'',count:'',shift:'daytime',start:'',end:''});
  };
  const loadOutsourceForEdit = (i) => {
    const o = workDetails.outsourcingLabor[i];
    if (!o) return;
    const form = {company:o.company||'', count:String(o.count||''), shift:o.shift||'daytime', start:o.start||'', end:o.end||''};
    setOForm(form);
    oFormLoadedRef.current = form;
    setEditingOIdx(i);
  };
  // 外注人工：入力欄に残っている中身を一覧に入れる（「次へ」と、保存・「✓ 人数を変更したらここで更新」で使う）
  //  ・行をタップ中: 新しい行は足さず、タップした行を入力欄の中身で上書きする（「＋ 追加する」を押したときと同じ）。
  //    入力欄を変えていなければ、行はそのまま。会社名か人数が空なら何もしない
  //  ・タップしていないとき: 会社名と人数があれば、新しい行として足す（今までどおり）
  //  戻り値: { list: 入れたあとの一覧, used: 入力欄の中身を使ったか（使ったら入力欄を空にしてよい） }
  const applyOFormToOutsourcing = (list) => {
    const company = (oForm.company || '').trim();
    const count = parseFloat(oForm.count) || 0;
    const basePrice = oForm.shift === 'nighttime' ? unitPrices.outsourcingNighttime : unitPrices.outsourcingDaytime;
    const amount = count * basePrice;
    if (editingOIdx !== null && list[editingOIdx]) {
      const loaded = oFormLoadedRef.current;
      const unchanged = !!loaded && ['company','count','shift','start','end'].every(k => String(oForm[k] ?? '') === String(loaded[k] ?? ''));
      if (unchanged) return { list, used: true };
      if (!company || count <= 0) return { list, used: false };
      const next = [...list];
      next[editingOIdx] = {...oForm, count, amount};
      return { list: next, used: true };
    }
    if (!company || count <= 0) return { list, used: false };
    return { list: [...list, {...oForm, count, amount}], used: true };
  };
  const addVehicle = () => {
    if (!vForm.type) return;
    if (editingVIdx !== null) {
      const list = [...workDetails.vehicles];
      list[editingVIdx] = {...vForm, amount: VEHICLE_UNIT_PRICES[vForm.type]||0};
      setWorkDetails({...workDetails, vehicles: list});
      setEditingVIdx(null);
    } else {
      setWorkDetails({...workDetails, vehicles:[...workDetails.vehicles,{...vForm,amount:VEHICLE_UNIT_PRICES[vForm.type]||0}]});
    }
    setVForm({type:'',number:'',driver:''});
  };
  const loadVehicleForEdit = (i) => {
    const v = workDetails.vehicles[i];
    if (!v) return;
    setVForm({type:v.type||'', number:v.number||'', driver:v.driver||''});
    setEditingVIdx(i);
  };
  const addMachinery = () => {
    if (!mForm.type) return;
    if (editingMIdx !== null) {
      const list = [...workDetails.machinery];
      list[editingMIdx] = {type: mForm.type, unitPrice: parseFloat(mForm.price)||0};
      setWorkDetails({...workDetails, machinery: list});
      setEditingMIdx(null);
    } else {
      setWorkDetails({...workDetails, machinery:[...workDetails.machinery,{type:mForm.type,unitPrice:parseFloat(mForm.price)||0}]});
    }
    setMForm({type:'',price:''});
  };
  const loadMachineryForEdit = (i) => {
    const m = workDetails.machinery[i];
    if (!m) return;
    const form = {type:m.type||'', price:String(m.unitPrice||'')};
    setMForm(form);
    mFormLoadedRef.current = form;
    setEditingMIdx(i);
  };
  // 重機：入力欄に残っている中身を一覧に入れる（「次へ」と、保存・「✓ 人数を変更したらここで更新」で使う。決まりは applyFormToRows）
  const applyMFormToMachinery = (list) => applyFormToRows(list, {
    editingIdx: editingMIdx, form: mForm, loaded: mFormLoadedRef.current,
    isValid: !!mForm.type,
    makeRow: () => ({type: mForm.type, unitPrice: parseFloat(mForm.price)||0}),
  });
  const loadExpenseForEdit = (i) => {
    const e = (workDetails.dailyExpenses || [])[i];
    if (!e) return;
    const kubun = COST_KUBUN.includes(e.kubun) ? e.kubun : ''; // 区分の無い今までの行は、名前から自動で見せる
    setExpForm({name: e.name || '', amt: String(e.amount || '')});
    setExpKubun(kubun);
    expFormLoadedRef.current = {name: e.name || '', amt: String(e.amount || ''), kubun};
    setEditingExpIdx(i);
  };
  // 経費：入力欄に残っている中身を一覧に入れる（「次へ」と、行をタップ中の保存・「✓ 人数を変更したらここで更新」で使う。決まりは applyFormToRows）
  //  上書きのときは、その行のほかの項目は残す（「＋ 追加する」と同じ）
  const applyExpFormToExpenses = (list) => {
    const name = (expForm.name || '').trim();
    const amount = parseFloat(expForm.amt) || 0;
    const kubun = expKubun || guessCostKubun(name);
    return applyFormToRows(list, {
      editingIdx: editingExpIdx, form: {...expForm, kubun: expKubun}, loaded: expFormLoadedRef.current,
      isValid: !!name,
      makeRow: (prev) => (prev ? {...prev, name, amount, kubun} : {name, amount, kubun}),
    });
  };
  // ※ envForm / extForm の入力UIは未実装のため、addEnv / addExt は削除しました
  //   （未定義変数 envForm, extForm, ENV_PRICES, EXT_PRICES, setEnvForm, setExtForm を参照しており、
  //    呼び出されると ReferenceError でクラッシュするデッドコードでした）
  const addWaste = () => {
    if (!wasteForm.type||!wasteForm.disposal||!wasteForm.qty) return;
    const qty=parseFloat(wasteForm.qty)||0, price=parseFloat(wasteForm.price)||0;
    const ENV_P={day:20000,night:30000}, EXT_P={day:22000,night:32000};
    let haishiAmount=0;
    if(wasteForm.haisha==='env'&&wasteForm.haishiShift) haishiAmount=ENV_P[wasteForm.haishiShift];
    else if(wasteForm.haisha==='ext') haishiAmount=wasteForm.haishiOverride?parseFloat(wasteForm.haishiPrice)||0:(wasteForm.haishiShift?EXT_P[wasteForm.haishiShift]:0);
    const workerVehicleAmount = VEHICLE_UNIT_PRICES[wasteForm.workerVType] || 0;
    const newItem = {
      material:wasteForm.type, disposalSite:wasteForm.disposal,
      quantity:qty, unit:wasteForm.unit, unitPrice:0, amount:price,
      manifestNumber:wasteForm.manifest,
      haisha:wasteForm.haisha||'', driver:wasteForm.driver||'',
      vType:wasteForm.vType||'', vNumber:wasteForm.vNumber||'',
      haishiShift:wasteForm.haishiShift||'', haishiAmount,
      workerName:wasteForm.workerName||'', workerVType:wasteForm.workerVType||'',
      workerVNumber:wasteForm.workerVNumber||'', vehicleAmount:workerVehicleAmount,
      volumeM3: wasteForm.volumeM3 ? parseFloat(wasteForm.volumeM3) : null,
    };
    if (editingWasteIdx !== null) {
      const items = [...wasteItems];
      items[editingWasteIdx] = newItem;
      setWasteItems(items);
      setEditingWasteIdx(null);
    } else {
      setWasteItems([...wasteItems, newItem]);
    }
    setWasteForm(prev=>({mode:prev.mode||'cost',type:'',disposal:'',qty:'',unit:'㎥',price:'',manifest:'',haisha:'',driver:'',vType:'',vNumber:'',haishiShift:'',haishiOverride:false,haishiPrice:'',workerName:'',workerVType:'',workerVNumber:'',volumeM3:''}));
  };
  const addScrap = () => {
    if (!scrapForm.type||!scrapForm.buyer||!scrapForm.qty) return;
    const qty=parseFloat(scrapForm.qty), total=parseFloat(scrapForm.price)||0;
    const scrapVehicleAmount = VEHICLE_UNIT_PRICES[scrapForm.workerVType] || 0;
    const newItem = {type:scrapForm.type,buyer:scrapForm.buyer,quantity:qty,unit:scrapForm.unit,unitPrice:0,amount:-total,manifestNumber:scrapForm.manifest||'',volumeM3:scrapForm.volumeM3?parseFloat(scrapForm.volumeM3):null,workerName:scrapForm.workerName||'',workerVType:scrapForm.workerVType||'',workerVNumber:scrapForm.workerVNumber||'',vehicleAmount:scrapVehicleAmount,isSwap:scrapForm.isSwap===true};
    if (editingScrapIdx !== null) {
      const items = [...scrapItems];
      items[editingScrapIdx] = newItem;
      setScrapItems(items);
      setEditingScrapIdx(null);
    } else {
      setScrapItems([...scrapItems, newItem]);
    }
    setScrapForm({type:'金属くず',buyer:'',qty:'',unit:'kg',price:'',manifest:'',volumeM3:'',workerName:'',workerVType:'',workerVNumber:''});
  };

  // ★ wasteItems の配車費を付け直す（行の追加・上書き・削除のあと）
  //   ・例外金額（手入力）の行は金額を変えない
  //   ・ワイエム配車でマニフェストNo.がある行は、マニフェストNo.だけで判定する（1台＝マニ1枚）。
  //     同じマニフェストNo.の1行目だけ配車費を付け、2行目以降は0。違うマニフェストNo.なら別に付ける
  //   ・環境課配車と、マニフェストNo.が空欄のワイエム配車は、車両（運転者・車種・車番・昼夜）で判定する。
  //     同じ配車の1行目だけ配車費を付け、2行目以降は0
  const normalizeHaishiAmounts = (items) => {
    const chargedSlots = new Set();        // 配車費を付けた配車（kind+運転者+車種+車番+昼夜）
    const chargedExtManifests = new Set(); // 配車費を付けたワイエム配車のマニフェストNo.
    return items.map(it => {
      if (!it) return it;
      const kind = it.haisha || it.kind || '';
      if (kind !== 'env' && kind !== 'ext') return it;
      const prices = kind === 'env' ? ENV_PRICES : EXT_PRICES;
      const slot = `${kind}|${it.driver||''}|${it.vType||''}|${it.vNumber||''}|${it.haishiShift||''}`;
      const manifest = kind === 'ext' ? extManifestKey(it) : '';
      if (isHaishiOverrideItem(it)) {
        if (manifest) chargedExtManifests.add(manifest);
        return it;
      }
      if (manifest) {
        if (chargedExtManifests.has(manifest)) return { ...it, haishiAmount: 0 };
        chargedExtManifests.add(manifest);
        chargedSlots.add(slot);
        return { ...it, haishiAmount: prices[it.haishiShift] || 0 };
      }
      if (chargedSlots.has(slot)) return { ...it, haishiAmount: 0 };
      chargedSlots.add(slot);
      return { ...it, haishiAmount: prices[it.haishiShift] || 0 };
    });
  };

  // 行を追加・上書きしたあとのフォーム。
  // 産廃処分で新しい行を追加したときは、処分先・マニNo.・担当者/車両を引き継ぐ（指示書 3-4）
  const resetWasteFormAfterAdd = (prev, wasOverwrite) => {
    const mode = wasteModeByTab[wasteTab] || 'cost';
    if (!wasOverwrite && mode === 'cost') return wasteFormAfterAdd(prev, wasteTab);
    return blankWasteForm(wasteTab, mode);
  };

  // ★ 4タブ用の追加関数群
  // 自社運搬 (担当者+車両、配車費なし) - 処分/道具車/売上モード対応
  const addSelfWaste = () => {
    // ★ 道具車/空車対応: 車種が入っていれば、種類・処分先・数量なしでも追加OK
    const isToolMode = (wasteModeByTab[wasteTab]||'cost') === 'tool';
    const hasWaste = wasteForm.type && wasteForm.disposal && wasteForm.qty;
    const hasVehicle = wasteForm.workerVType;
    if (!isToolMode && !hasWaste && !hasVehicle) return;
    if (isToolMode && !wasteForm.workerVType) return;
    const qty = parseFloat(wasteForm.qty)||0, price = parseFloat(wasteForm.price)||0;
    const workerVehicleAmount = VEHICLE_UNIT_PRICES[wasteForm.workerVType] || 0;
    const isRevenue = (wasteModeByTab[wasteTab]||'cost') === 'revenue';

    // ★ 編集中は現在のフォーム値を尊重し、新規追加時だけ重複判定を行う
    const computeIsSwap = () => {
      if (editingWasteIdx !== null) return wasteForm.isSwap === true;
      const workerName = (wasteForm.workerName||'').trim();
      if (!workerName || !wasteForm.workerVType) return false;
      const existingWaste = wasteItems.some((w, i) => i !== editingWasteIdx && w.workerName === workerName && w.workerVType);
      const existingScrap = scrapItems.some((s, i) => i !== editingScrapIdx && s.workerName === workerName && s.workerVType);
      return existingWaste || existingScrap;
    };
    const computedIsSwap = computeIsSwap();

    const isOutsourceVehicle = wasteSelfDept === 'out';
    const newItem = {
      kind: isToolMode ? 'tool' : 'self',
      isScrap: isRevenue,
      isToolVehicle: isToolMode, // ★ 道具車フラグ
      isOutsource: isOutsourceVehicle, // ★ 外注車フラグ (個人名なし、車番手入力)
      material: isToolMode ? '道具車' : wasteForm.type,
      disposalSite: isToolMode ? '' : wasteForm.disposal,
      quantity: isToolMode ? 0 : qty,
      ...wastePriceFields(wasteForm),
      amount: isToolMode ? 0 : (isRevenue ? -Math.abs(price) : price),
      manifestNumber: isToolMode ? '' : (isRevenue ? '-' : (wasteForm.manifest||'')),
      haisha:'', haishiAmount:0,
      workerName: isOutsourceVehicle ? '' : (wasteForm.workerName||''),
      workerVType:wasteForm.workerVType||'',
      workerVNumber:wasteForm.workerVNumber||'',
      vehicleAmount:workerVehicleAmount,
      volumeM3: wasteForm.volumeM3 ? parseFloat(wasteForm.volumeM3) : null,
      isSwap: isOutsourceVehicle ? false : computedIsSwap, // ★ 外注は乗り換え判定対象外
    };
    if (editingWasteIdx !== null) {
      const items = [...wasteItems]; items[editingWasteIdx] = newItem;
      setWasteItems(normalizeSwapFlags(items)); setEditingWasteIdx(null);
    } else {
      setWasteItems([...wasteItems, newItem]);
    }
    setWasteForm(prev => resetWasteFormAfterAdd(prev, editingWasteIdx !== null));
  };
  // 環境課配車 (運転者+車両+シフト + 産廃情報)
  const addEnvWaste = () => {
    if (!wasteForm.type||!wasteForm.disposal||!wasteForm.qty) return;
    if (!wasteForm.driver) return;
    // ★ シフト未選択時、同配車の既存シフトを自動継承
    let effectiveShift = wasteForm.haishiShift;
    if (!effectiveShift) {
      const existing = wasteItems.find((it,idx)=>
        idx !== editingWasteIdx &&
        (it.haisha==='env' || it.kind==='env') &&
        (it.driver||'') === (wasteForm.driver||'') &&
        (it.vType||'') === (wasteForm.vType||'') &&
        (it.vNumber||'') === (wasteForm.vNumber||'')
      );
      if (existing) effectiveShift = existing.haishiShift;
      else return; // シフト未選択かつ既存もない場合は中止
    }
    const qty = parseFloat(wasteForm.qty)||0, price = parseFloat(wasteForm.price)||0;
    // ★ 同配車(運転者+車両+シフト)が既に計上されているか判定
    const alreadyCounted = wasteItems.some((it,idx)=>
      idx !== editingWasteIdx &&
      (it.haisha==='env' || it.kind==='env') &&
      (it.driver||'') === (wasteForm.driver||'') &&
      (it.vType||'') === (wasteForm.vType||'') &&
      (it.vNumber||'') === (wasteForm.vNumber||'') &&
      it.haishiShift === effectiveShift
    );
    const haishiAmount = alreadyCounted ? 0 : (ENV_PRICES[effectiveShift] || 0);
    const isRevenue = (wasteModeByTab[wasteTab]||'cost') === 'revenue';
    const newItem = {
      kind:'env',
      isScrap: isRevenue,
      material:wasteForm.type, disposalSite:wasteForm.disposal,
      quantity:qty, ...wastePriceFields(wasteForm),
      amount: isRevenue ? -Math.abs(price) : price,
      manifestNumber: isRevenue ? '-' : (wasteForm.manifest||''),
      haisha:'env',
      driver:wasteForm.driver,
      vType:wasteForm.vType||'', vNumber:wasteForm.vNumber||'',
      haishiShift:effectiveShift, haishiAmount,
      workerName:'', workerVType:'', workerVNumber:'', vehicleAmount:0,
      volumeM3: wasteForm.volumeM3 ? parseFloat(wasteForm.volumeM3) : null,
    };
    if (editingWasteIdx !== null) {
      const items = [...wasteItems]; items[editingWasteIdx] = newItem;
      setWasteItems(normalizeHaishiAmounts(items)); setEditingWasteIdx(null);
    } else {
      setWasteItems(normalizeHaishiAmounts([...wasteItems, newItem]));
    }
    setWasteForm(prev => resetWasteFormAfterAdd(prev, editingWasteIdx !== null));
  };
  // ★ ワイエム配車: 同じマニフェストNo.の配車費をすでに計上している行（この行より前）
  const findExtManifestCountedBy = (form) => {
    const manifest = String(form.manifest || '').trim();
    if (!manifest || (form.mode || 'cost') !== 'cost') return null;
    const limit = editingWasteIdx !== null ? editingWasteIdx : wasteItems.length;
    return wasteItems.find((it, j) => j < limit && detectKind(it) === 'ext' && extManifestKey(it) === manifest) || null;
  };
  // ワイエム配車 (シフト or 例外金額 + 車両任意 + 産廃情報)
  const addExtWaste = () => {
    if (!wasteForm.type||!wasteForm.disposal||!wasteForm.qty) return;
    const isRevenue = (wasteModeByTab[wasteTab]||'cost') === 'revenue';
    const hasManifest = !isRevenue && !!String(wasteForm.manifest||'').trim();
    // 例外金額の行は、同じマニフェストNo.でも金額をそのまま使う
    const manifestCountedBy = wasteForm.haishiOverride ? null : findExtManifestCountedBy(wasteForm);
    // ★ シフト/例外金額未選択時、同じマニフェストNo.の行 → 同配車の既存シフトの順で自動継承
    let effectiveShiftExt = wasteForm.haishiShift;
    if (!wasteForm.haishiOverride && !effectiveShiftExt) {
      const existing = manifestCountedBy || wasteItems.find((it,idx)=>
        idx !== editingWasteIdx &&
        (it.haisha==='ext' || it.kind==='ext') &&
        (it.vType||'') === (wasteForm.vType||'') &&
        (it.vNumber||'') === (wasteForm.vNumber||'') &&
        !it.haishiOverride
      );
      if (existing) effectiveShiftExt = existing.haishiShift;
      else return;
    }
    const qty = parseFloat(wasteForm.qty)||0, price = parseFloat(wasteForm.price)||0;
    // ★ 同配車(車両+シフト)が既に計上されているか判定 (例外金額・マニフェストNo.がある行は対象外)
    const alreadyCountedExt = !wasteForm.haishiOverride && !hasManifest && wasteItems.some((it,idx)=>
      idx !== editingWasteIdx &&
      (it.haisha==='ext' || it.kind==='ext') &&
      (it.vType||'') === (wasteForm.vType||'') &&
      (it.vNumber||'') === (wasteForm.vNumber||'') &&
      it.haishiShift === effectiveShiftExt &&
      !it.haishiOverride
    );
    const haishiAmount = wasteForm.haishiOverride
      ? (parseFloat(wasteForm.haishiPrice)||0)
      : ((manifestCountedBy || alreadyCountedExt) ? 0 : (EXT_PRICES[effectiveShiftExt] || 0));
    const newItem = {
      kind:'ext',
      // ★ 例外金額の行に印を残す（印がないと配車費の付け直しで 0 に戻ってしまっていた）
      haishiOverride: wasteForm.haishiOverride === true,
      isScrap: isRevenue,
      material:wasteForm.type, disposalSite:wasteForm.disposal,
      quantity:qty, ...wastePriceFields(wasteForm),
      amount: isRevenue ? -Math.abs(price) : price,
      manifestNumber: isRevenue ? '-' : (wasteForm.manifest||''),
      haisha:'ext',
      driver:'',
      vType:wasteForm.vType||'', vNumber:wasteForm.vNumber||'',
      haishiShift:effectiveShiftExt||'', haishiAmount,
      workerName:'', workerVType:'', workerVNumber:'', vehicleAmount:0,
      volumeM3: wasteForm.volumeM3 ? parseFloat(wasteForm.volumeM3) : null,
    };
    if (editingWasteIdx !== null) {
      const items = [...wasteItems]; items[editingWasteIdx] = newItem;
      setWasteItems(normalizeHaishiAmounts(items)); setEditingWasteIdx(null);
    } else {
      setWasteItems(normalizeHaishiAmounts([...wasteItems, newItem]));
    }
    setWasteForm(prev => resetWasteFormAfterAdd(prev, editingWasteIdx !== null));
  };

  const detectKind = (w) => {
    if (w.haisha === 'env') return 'env';
    if (w.haisha === 'ext') return 'ext';
    if (w.kind === 'env') return 'env';
    if (w.kind === 'ext') return 'ext';
    return 'self';
  };
  // ★ スクラップ(売上)判定 - kind とは独立した属性
  const isScrap = (w) => {
    if (!w) return false;
    return w.isScrap === true || (w.amount || 0) < 0 || w.manifestNumber === '-' || w.kind === 'scrap';
  };
  // ★ 編集用: wasteItem を form にロード (mode 復元あり)
  const loadWasteForEdit = (idx) => {
    const w = wasteItems[idx];
    const kind = detectKind(w);
    const scrap = isScrap(w);
    setEditingWasteIdx(idx);
    setWasteTab(kind); // 配車種別タブを開く (scrap でもタブは self/env/ext のいずれか)
    // ★ 該当タブの mode を scrap に応じて設定
    setWasteModeByTab(prev => ({...prev, [kind]: scrap ? 'revenue' : 'cost'}));
    // ★ 自社運搬の部署タブを復元 (外注車の場合は 'out')
    if (kind === 'self' || kind === 'tool') {
      if (w.isOutsource === true) setWasteSelfDept('out');
    }
    setWasteForm({
      mode: scrap ? 'revenue' : 'cost',
      type:w.material, disposal:w.disposalSite,
      qty:String(w.quantity), unit: scrap ? 'kg' : (w.unit||'㎥'),
      price:String(Math.abs(w.amount||0)),  // 表示は絶対値
      manifest:(w.manifestNumber==='-'?'':w.manifestNumber||''),
      haisha:w.haisha||'',
      driver:w.driver||'', vType:w.vType||'', vNumber:w.vNumber||'',
      // 例外金額の行は金額ごと開く（印のない古い行も、シフトなしで金額があれば例外金額とみなす）
      haishiShift:w.haishiShift||'',
      haishiOverride: kind === 'ext' && isHaishiOverrideItem(w),
      haishiPrice: kind === 'ext' && isHaishiOverrideItem(w) ? String(w.haishiAmount||0) : '',
      workerName:w.workerName||'', workerVType:w.workerVType||'', workerVNumber:w.workerVNumber||'',
      volumeM3: w.volumeM3 ? String(w.volumeM3) : '',
      isSwap: w.isSwap === true,
      // priceSource がない既存の行は手入力扱い（金額を勝手に計算し直さない。指示書 3-6）
      priceSource: w.priceSource === 'master' ? 'master' : 'manual',
      priceOverride: w.priceOverride === true,
      unitPrice: w.priceSource === 'master' ? (Number(w.unitPrice) || 0) : 0,
      // 単価表のある処分先で、表にない品名なら「その他（直接入力）」として開く
      typeCustom: !scrap && !!masterMapFor(w.disposalSite, priceMaps) && !!w.material && !masterMapFor(w.disposalSite, priceMaps).has(w.material),
      carried: false,
    });
  };
  // ★ 編集キャンセル
  const cancelEdit = () => {
    setEditingWasteIdx(null);
    setWasteForm(blankWasteForm(wasteTab, wasteModeByTab[wasteTab] || 'cost'));
    setScrapForm({type:'金属くず',buyer:'',qty:'',unit:'kg',price:'',manifest:'',volumeM3:'',workerName:'',workerVType:'',workerVNumber:''});
  };
  // ★ タブに応じた add 関数 (scrap は mode='revenue' で各タブから入力)
  const handleAddByTab = () => {
    if (wasteTab === 'self') addSelfWaste();
    else if (wasteTab === 'env') addEnvWaste();
    else if (wasteTab === 'ext') addExtWaste();
  };

  const shiftLabel = s => s==='nighttime'?'夜間':s==='nightLoading'?'夜間環境課':s==='halfDay'?'半日':'日勤';
  const shiftColor = s => s==='nighttime'?'#8B5CF6':s==='nightLoading'?'#6366F1':s==='halfDay'?'#F59E0B':'#3B82F6';

  const StepDots = () => (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'8px', padding:'14px 0 10px' }}>
      {[1,2,3].map(i => (
        <div key={i} style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: i < currentStep ? '#22c55e' : i === currentStep ? '#2563EB' : '#E8E8E8',
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

  // ★ 産廃フォームの 処分先 → 種類 / 数量・単位・処分費（自社運搬・環境課配車・ワイエム配車で共通）
  //   処分先がワイエム・入間緑化開発で単価表が読めていれば、種類はその業者の品目のプルダウン、単位と処分費は自動
  const renderWasteMainFields = ({ isRev, accentDark, inputBorder }) => {
    const optStyle = { color:'#000', background:'#fff' };
    const masterMap = !isRev ? masterMapFor(wasteForm.disposal, priceMaps) : null;
    const masterRows = masterMap ? [...masterMap.values()] : []; // 業者ごとに分かれている（ほかの業者の品目は混ざらない）
    const masterSelectable = masterRows.length > 0;
    const masterRow = !isRev ? getMasterRow(wasteForm, priceMaps) : null;
    const isAuto = !!masterRow && wasteForm.priceSource === 'master';
    const setDisposal = (value) => setWasteForm(prev => isRev ? { ...prev, disposal: value } : changeWasteDisposal(prev, value, priceMaps));
    const disposalChips = isRev
      ? METAL_BUYERS
      : [...(projectInfo?.contractedDisposalSites||[]),...(projectInfo?.manifestRows||[]).map(r=>r.disposal).filter(Boolean).filter(d=>!(projectInfo?.contractedDisposalSites||[]).includes(d)).filter((d,i,a)=>a.indexOf(d)===i)];
    // プルダウンの中身: よく使う（ある業者だけ）→ 分類ごと（分類のない品目はそのまま並べる）→ その他（直接入力）
    const popularRows = masterRows.filter(row => row.popular);
    const plainRows = masterRows.filter(row => !row.category);
    const masterGroups = [];
    masterRows.filter(row => row.category).forEach(row => {
      let group = masterGroups.find(g => g.category === row.category);
      if (!group) { group = { category: row.category, rows: [] }; masterGroups.push(group); }
      group.rows.push(row);
    });
    const unitOptions = [...WASTE_UNIT_OPTIONS, ...(wasteForm.unit && !WASTE_UNIT_OPTIONS.includes(wasteForm.unit) ? [wasteForm.unit] : [])];
    return (<>
      <div style={grid2}>
        {/* 処分先（先に選ぶ） */}
        <div>
          <label style={inpLbl}>{isRev?'買取業者':'処分先'}</label>
          {disposalChips.length > 0 && (
            <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:6}}>
              {disposalChips.map(s=>(
                <button key={s} onClick={()=>setDisposal(s)}
                  style={{padding:'4px 9px',borderRadius:7,border:`1px solid ${wasteForm.disposal===s?accentDark:'rgba(255,255,255,0.12)'}`,background:wasteForm.disposal===s?accentDark:'rgba(255,255,255,0.08)',color:wasteForm.disposal===s?'#1F1F1F':accentDark,fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <input type="text" value={wasteForm.disposal} onChange={e=>setDisposal(e.target.value)} placeholder={isRev?'買取業者を入力':'処分先を入力'} style={{...inpTxt,border:inputBorder}} />
        </div>
        {/* 種類（処分先で切り替え） */}
        <div>
          <label style={inpLbl}>種類</label>
          {masterSelectable ? (<>
            <select value={wasteForm.typeCustom ? WASTE_TYPE_OTHER : (masterMap.has(wasteForm.type) ? wasteForm.type : '')}
              onChange={e=>{ const v = e.target.value; setWasteForm(prev => selectWasteType(prev, v, priceMaps)); }}
              style={{...inpSel,border:inputBorder}}>
              <option value="" style={optStyle}>種類を選択</option>
              {popularRows.length > 0 && (
                <optgroup label="よく使う" style={optStyle}>
                  {popularRows.map(row => <option key={`popular-${row.item}`} value={row.item} style={optStyle}>{row.item}</option>)}
                </optgroup>
              )}
              {plainRows.map(row => <option key={`plain-${row.item}`} value={row.item} style={optStyle}>{row.item}</option>)}
              {masterGroups.map(group => (
                <optgroup key={group.category} label={group.category} style={optStyle}>
                  {group.rows.map(row => <option key={`${group.category}-${row.item}`} value={row.item} style={optStyle}>{row.item}</option>)}
                </optgroup>
              ))}
              <option value={WASTE_TYPE_OTHER} style={optStyle}>その他（直接入力）</option>
            </select>
            {wasteForm.typeCustom && (
              <input type="text" value={wasteForm.type} onChange={e=>{ const v = e.target.value; setWasteForm(prev => ({ ...prev, type: v })); }} placeholder="品名を入力" style={{...inpTxt,border:inputBorder,marginTop:6}} autoFocus />
            )}
          </>) : (<>
            <input type="text" value={wasteForm.type} onChange={e=>{ const v = e.target.value; setWasteForm(prev => ({ ...prev, type: v })); }}
              placeholder={isRev ? '金属くず・鉄くず等' : '木くず・廃プラ等'}
              style={{...inpTxt,border:inputBorder}} />
            {/* 処分先が未選択のとき（自由入力はできる） */}
            {!isRev && hasAnyPriceMaster && !String(wasteForm.disposal||'').trim() && (
              <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:4,lineHeight:1.4}}>先に処分先を選んでください</div>
            )}
          </>)}
        </div>
      </div>
      <div style={{...grid3, marginBottom: isAuto ? 4 : grid3.marginBottom}}>
        <div><label style={inpLbl}>数量</label><input type="number" step="0.1" value={wasteForm.qty} onChange={e=>{ const v = e.target.value; setWasteForm(prev => isRev ? { ...prev, qty: v } : changeWasteQty(prev, v, priceMaps)); }} placeholder="0" style={{...inpTxt,border:inputBorder}} /></div>
        <div><label style={inpLbl}>単位</label>{isRev ? (<div style={{...inpTxt,border:inputBorder,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(6,182,212,0.1)',color:'#22D3EE',fontWeight:700}}>kg</div>) : (
          <select value={wasteForm.unit} disabled={isAuto} onChange={e=>{ const v = e.target.value; setWasteForm(prev => ({ ...prev, unit: v })); }} style={{...inpSel,border:inputBorder,opacity:isAuto?0.75:1}}>
            {unitOptions.map(u => <option key={u} value={u} style={optStyle}>{u}</option>)}
          </select>
        )}</div>
        <div><label style={{...inpLbl,color:isRev?accentDark:'#fff',fontWeight:isRev?700:500}}>{isRev?'売上金額':'処分費'}</label><input type="number" value={wasteForm.price} onChange={e=>{ const v = e.target.value; setWasteForm(prev => isRev ? { ...prev, price: v } : changeWastePrice(prev, v)); }} placeholder="0" style={{...inpTxt,border:isRev?'1px solid #06B6D4':inputBorder,color:isRev?accentDark:'#fff',fontWeight:isRev?500:400}} /></div>
      </div>
      {/* 処分費の根拠（自動の行だけ）。手で直した行は「自動に戻す」 */}
      {isAuto && (
        <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:8,marginBottom:10,fontSize:10,color:'rgba(255,255,255,0.55)'}}>
          {wasteForm.priceOverride ? (<>
            <span>手で修正済み</span>
            <button onClick={()=>setWasteForm(prev => resetWasteAutoPrice(prev, priceMaps))}
              style={{padding:'3px 10px',borderRadius:6,border:`1px solid ${accentDark}`,background:'transparent',color:accentDark,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>自動に戻す</button>
          </>) : (
            <span style={{fontVariantNumeric:'tabular-nums'}}>@{formatCurrency(wasteForm.unitPrice)}/{wasteForm.unit}{parseFloat(wasteForm.qty) > 0 ? ` × ${wasteForm.qty}${wasteForm.unit}` : ''}</span>
          )}
        </div>
      )}
    </>);
  };

  // ★ マニフェスト No.（産廃処分のみ。3タブ共通）
  const renderWasteManifestField = (inputBorder) => (
    <div style={{marginBottom:10}}>
      <label style={inpLbl}>マニフェスト No. <span style={{color:'rgba(255,255,255,0.3)',fontWeight:400,fontSize:'9px'}}>(任意)</span></label>
      <input type="text" value={wasteForm.manifest} onChange={e=>setWasteForm({...wasteForm,manifest:e.target.value})} placeholder="例）A-12345" style={{...inpTxt,border:inputBorder}} />
      <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',marginTop:4,lineHeight:1.4}}>品目が複数あるときは1品目ずつ追加（同じNo.でOK）</div>
    </div>
  );

  // ★ ItemCard: アバターは常に1文字
  const ItemCard = ({ avatarBg, avatarColor, avatarText, name, meta, amount, amountColor, onDel, onEdit, isEditing }) => (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'12px 14px',
      background: isEditing ? 'rgba(245,158,11,0.08)' : 'linear-gradient(135deg,#fff 0%,#F0F9FF 100%)',
      border: isEditing ? '2px solid rgba(245,158,11,0.6)' : '2px solid #60A5FA',
      borderRadius:'12px',
      marginBottom:'8px',
      boxShadow: isEditing ? 'none' : '0 2px 8px rgba(96,165,250,0.15)',
      cursor: onEdit ? 'pointer' : 'default'
    }} onClick={onEdit}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
        <div style={{ width:'34px', height:'34px', borderRadius:'9px', background:'#2563EB', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'700', flexShrink:0, fontFamily:'sans-serif' }}>{avatarText}</div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:'13px', fontWeight:'700', color:'#1E40AF', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
          <div style={{ fontSize:'11px', color:'#64748B', marginTop:'2px' }} dangerouslySetInnerHTML={{__html: meta}} />
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
        {isEditing && <span style={{ fontSize:9, background:'rgba(245,158,11,0.2)', color:'#B45309', border:'1px solid rgba(245,158,11,0.4)', borderRadius:4, padding:'2px 7px', fontWeight:700 }}>編集中</span>}
        <span style={{ fontSize:'13px', fontWeight:'700', color: amountColor||'#1E40AF', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums' }}>{amount}</span>
        {onEdit && !isEditing && <span style={{ fontSize:11, color:'#94A3B8', flexShrink:0 }}>✏️</span>}
        <button onClick={(e)=>{e.stopPropagation(); onDel && onDel();}} style={{ width:'32px', height:'32px', borderRadius:'8px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171', fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:700 }}>✕</button>
      </div>
    </div>
  );

  // ★ シフトボタン: 4択（半日追加）
  const ShiftBtns4 = ({ value, onChange }) => (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px' }}>
      {[
        ['daytime',     '日勤',   '#2563EB'],
        ['nighttime',   '夜間',   '#7C3AED'],
        ['nightLoading','夜間環境課',   '#4F46E5'],
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
      <style>{`@keyframes add-pulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.7);transform:scale(1)}50%{box-shadow:0 0 0 12px rgba(16,185,129,0);transform:scale(1.02)}}`}</style>
      <button onClick={onClick} disabled={disabled} style={{ width:'100%', padding:'13px', background: disabled?'rgba(255,255,255,0.05)': pulse ? 'linear-gradient(135deg,#10B981,#059669)' : '#991B1B', border:`1px solid ${disabled?'rgba(255,255,255,0.08)': pulse ? 'rgba(16,185,129,0.5)' : 'rgba(248,113,113,0.3)'}`, borderRadius:'10px', color: disabled?'rgba(255,255,255,0.2)':'#fff', fontSize:'13px', fontWeight:'700', cursor: disabled?'not-allowed':'pointer', marginTop:'8px', animation: pulse ? 'add-pulse 1.5s ease-out infinite' : 'none' }}>{label || '＋ 追加する'}</button>
    </>
  );

  const SectionLabel = ({ ja, en, pending }) => (
    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'8px' }}>
      <span style={{ fontSize:'10px', fontWeight:'700', color:'#1C1917', textTransform:'uppercase', letterSpacing:'0.08em' }}>{ja} <span style={{color:'#999'}}>/ {en}</span></span>
      <span style={{ flex:1, height:'1px', background:'#E8E8E8' }} />
      {pending && (
        <span style={{ fontSize:9, fontWeight:700, padding:'2px 8px', background:'rgba(245,158,11,0.15)', color:'#B45309', border:'1px solid rgba(245,158,11,0.4)', borderRadius:4, animation:'pending-blink 1.5s ease-in-out infinite' }}>⚠ 未追加あり</span>
      )}
      <style>{`@keyframes pending-blink{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );

  const BFooter = ({ onBack, onNext, nextLabel, nextColor, disabled }) => (
    <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:'42rem', padding:`12px 16px calc(12px + env(safe-area-inset-bottom,0px))`, background:'#fff', borderTop:'1px solid #E8E8E8', display:'flex', gap:'10px', zIndex:40 }}>
      {onBack && <button onClick={onBack} style={{ flex:1, padding:'15px', background:'#F4F4F4', border:'none', color:'#666', borderRadius:'12px', fontSize:'14px', fontWeight:'600', cursor:'pointer' }}>← 戻る</button>}
      <button onClick={onNext} disabled={disabled} style={{ flex:2, padding:'15px', background: disabled?'#E8E8E8': nextColor||'#2563eb', border:'none', color: disabled?'#999':'white', borderRadius:'12px', fontSize:'15px', fontWeight:'700', cursor: disabled?'not-allowed':'pointer' }}>{nextLabel}</button>
    </div>
  );

  const workContent_tags = ['養生','間仕切解体','天井解体','ボード搬出'];

  return (
    <div style={{ background:'#fff', minHeight:'100vh', overflowX:'hidden' }}>
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
        <StepDots />
      </div>

      {/* Step 1 */}
      {currentStep === 1 && (
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
      {currentStep === 2 && (
        <div className="b-panel" style={{ padding:'16px 16px 100px', background:'#fff', maxWidth:'42rem', margin:'0 auto', boxSizing:'border-box' }}>

          {/* 施工情報 */}
          <SectionLabel ja="施工情報" en="Work Info" />
          <div style={inputCard}>
            <div>
              <label style={inpLbl}>施工内容</label>
              <input type="text" placeholder="例）養生、間仕切解体、天井解体、ボード搬出" value={workDetails.workContent} onChange={e=>setWorkDetails({...workDetails,workContent:e.target.value})} style={inpTxt} />
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
          <SectionLabel ja="自社人工" en="In-House Labor" pending={!!wForm.name.trim()} />
          {workDetails.inHouseWorkers.map((w,i)=>(
            <ItemCard key={i}
              avatarBg={`${shiftColor(w.shift)}20`} avatarColor={shiftColor(w.shift)}
              avatarText={w.name.charAt(0)}
              name={w.name}
              meta={`${w.start} → ${w.end}　<span style="color:${shiftColor(w.shift)}">${shiftLabel(w.shift)}</span>　<span style="font-size:9px;color:${w.dept==='k1'?'#3b82f6':'#22c55e'};background:${w.dept==='k1'?'rgba(59,130,246,0.1)':'rgba(34,197,94,0.1)'};padding:1px 5px;border-radius:4px">${w.dept==='k1'?'工事1課':'環境課'}</span>`}
              amount={`¥${formatCurrency(w.amount)}`}
              onEdit={()=>loadWorkerForEdit(i)}
              isEditing={editingWIdx===i}
              onDel={()=>{ if(editingWIdx===i){setEditingWIdx(null); setWForm({name:'',start:'',end:'',shift:'daytime',dept:currentDept});} else if(editingWIdx!==null && i<editingWIdx){setEditingWIdx(editingWIdx-1);} /* 上の行を消したら、タップ中の行の番号を1つ詰める（ほかの行を上書きしないように） */ setWorkDetails({...workDetails,inHouseWorkers:workDetails.inHouseWorkers.filter((_,j)=>j!==i)})}} />
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
            <AddBtn onClick={addWorker} disabled={!wForm.name.trim()} pulse={!!wForm.name.trim()} />
          </div>
          {workDetails.inHouseWorkers.length>0 && <SubTotal label="自社人工" value={workDetails.inHouseWorkers.reduce((s,w)=>s+w.amount,0)} />}

          {/* 外注人工 */}
          <SectionLabel ja="外注人工" en="Outsourcing" pending={!!(oForm.company.trim() && parseFloat(oForm.count) > 0)} />
          {isEditMode && workDetails.outsourcingLabor.length > 0 && (
            <button onClick={handleSave} disabled={isSaving}
              style={{width:'100%',padding:'13px',background:'rgba(34,197,94,0.25)',border:'1.5px solid rgba(34,197,94,0.5)',borderRadius:10,color:'#4ade80',fontSize:14,fontWeight:700,cursor:'pointer',marginBottom:10,fontFamily:'inherit'}}>
              {isSaving ? '更新中...' : '✓ 人数を変更したらここで更新'}
            </button>
          )}
          {workDetails.outsourcingLabor.map((o,i)=>{
            const isEditing = editingOIdx===i;
            return (
            <div key={i} style={{
              borderRadius:11, marginBottom:6,
              background: isEditing ? 'rgba(245,158,11,0.08)' : 'linear-gradient(135deg,#fff 0%,#F0F9FF 100%)',
              border: isEditing ? '2px solid rgba(245,158,11,0.6)' : '2px solid #60A5FA',
              boxShadow: isEditing ? 'none' : '0 2px 8px rgba(96,165,250,0.15)',
              padding:'10px 12px', display:'flex', alignItems:'center', gap:10,
              cursor: 'pointer'
            }} onClick={()=>loadOutsourceForEdit(i)}>
              <div style={{width:36,height:36,borderRadius:9,background:'#2563EB',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,flexShrink:0}}>{(o.company||'').charAt(0)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'#1E40AF'}}>{o.company}</div>
                <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                  <input type="number" min="0" step="0.5" inputMode="decimal" value={o.count||''} onClick={e=>e.stopPropagation()} onChange={e=>{
                    const entries=[...workDetails.outsourcingLabor];
                    const newCount = Number.parseFloat(e.target.value) || 0;
                    const newAmount = newCount * (o.shift==='nighttime'?30000:25000);
                    entries[i]={...entries[i],count:newCount,amount:newAmount};
                    setWorkDetails({...workDetails,outsourcingLabor:entries});
                  }} style={{width:60,padding:'6px 8px',background:'#fff',border:'1.5px solid #60A5FA',color:'#1E40AF',borderRadius:7,fontSize:18,fontWeight:700,textAlign:'center',outline:'none',fontFamily:'inherit'}}/>
                  <span style={{fontSize:12,color:'#64748B'}}>人</span>
                  {o.start && o.end && <span style={{fontSize:11,color:'#64748B'}}>{o.start} → {o.end}</span>}
                  <span style={{color:shiftColor(o.shift),fontSize:11,fontWeight:700}}>{shiftLabel(o.shift)}</span>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
                {isEditing && <span style={{ fontSize:9, background:'rgba(245,158,11,0.2)', color:'#B45309', border:'1px solid rgba(245,158,11,0.4)', borderRadius:4, padding:'2px 7px', fontWeight:700 }}>編集中</span>}
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#1E40AF',fontVariantNumeric:'tabular-nums'}}>¥{formatCurrency(o.amount)}</div>
                </div>
                {!isEditing && <span style={{ fontSize:11, color:'#94A3B8' }}>✏️</span>}
                <button onClick={(e)=>{e.stopPropagation(); if(isEditing){setEditingOIdx(null); setOForm({company:'',count:'',shift:'daytime',start:'',end:''});} else if(editingOIdx!==null && i<editingOIdx){setEditingOIdx(editingOIdx-1);} /* 上の行を消したら、タップ中の行の番号を1つ詰める（ほかの行を上書きしないように） */ setWorkDetails({...workDetails,outsourcingLabor:workDetails.outsourcingLabor.filter((_,j)=>j!==i)})}}
                  style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(239,68,68,0.25)',cursor:'pointer',background:'rgba(239,68,68,0.08)',color:'#f87171',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>✕</button>
              </div>
            </div>
            );
          })}
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
                <input type="number" inputMode="decimal" step="0.25" min="0" value={oForm.count||''} onChange={e=>setOForm({...oForm,count:e.target.value})} placeholder="例) 1.5" style={{...inpTxt,textAlign:'center',fontSize:16,fontWeight:700}} />
                <div style={{display:'flex',flexWrap:'wrap',gap:3,marginTop:6}}>
                  {[0.25,0.5,0.75,1,1.5,2,2.5,3,4,5,10].map(n=>{
                    const selected = parseFloat(oForm.count) === n;
                    return (
                      <button key={n} onClick={()=>setOForm({...oForm,count:String(n)})}
                        style={{padding:'5px 9px',borderRadius:6,border:`1px solid ${selected?'rgba(34,211,238,0.5)':'rgba(255,255,255,0.1)'}`,background:selected?'rgba(34,211,238,0.18)':'rgba(255,255,255,0.05)',color:selected?'#67E8F9':'rgba(255,255,255,0.7)',fontSize:10,fontWeight:selected?700:400,cursor:'pointer',fontFamily:'inherit'}}>
                        {n === 0.25 ? '¼' : n === 0.5 ? '½' : n === 0.75 ? '¾' : n}
                      </button>
                    );
                  })}
                </div>
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
            <AddBtn onClick={addOutsource} disabled={!oForm.company.trim()||!oForm.count} pulse={!!(oForm.company.trim() && parseFloat(oForm.count) > 0)} />
          </div>
          {workDetails.outsourcingLabor.length>0 && <SubTotal label="外注人工" value={workDetails.outsourcingLabor.reduce((s,o)=>s+o.amount,0)} />}

          {/* ★ 車両セクションは産廃側で入力するため Step2 からは削除 */}

          {/* 重機 */}
          <SectionLabel ja="重機" en="Machinery" pending={!!mForm.type} />
          {workDetails.machinery.map((m,i)=>(
            <ItemCard key={i}
              avatarBg="rgba(99,102,241,0.12)" avatarColor="#818cf8"
              avatarText="機"
              name={m.type} meta=""
              amount={`¥${formatCurrency(m.unitPrice)}`}
              onEdit={()=>loadMachineryForEdit(i)}
              isEditing={editingMIdx===i}
              onDel={()=>{ if(editingMIdx===i){setEditingMIdx(null); setMForm({type:'',price:''});} else if(editingMIdx!==null && i<editingMIdx){setEditingMIdx(editingMIdx-1);} /* 上の行を消したら、タップ中の行の番号を1つ詰める */ setWorkDetails({...workDetails,machinery:workDetails.machinery.filter((_,j)=>j!==i)})}} />
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
            <AddBtn onClick={addMachinery} disabled={!mForm.type} pulse={!!mForm.type} />
          </div>
          {workDetails.machinery.length>0 && <SubTotal label="重機" value={workDetails.machinery.reduce((s,m)=>s+m.unitPrice,0)} />}

          {/* 経費 */}
          <SectionLabel ja="経費" en="Expenses" pending={!!(expForm.name||'').trim()} />
          {(workDetails.dailyExpenses||[]).map((e,i)=>{
            const isEditing = editingExpIdx===i;
            return (
            <div key={i} style={{
              borderRadius:11, marginBottom:6,
              background: isEditing ? 'rgba(245,158,11,0.08)' : 'linear-gradient(135deg,#fff 0%,#F0F9FF 100%)',
              border: isEditing ? '2px solid rgba(245,158,11,0.6)' : '2px solid #60A5FA',
              boxShadow: isEditing ? 'none' : '0 2px 8px rgba(96,165,250,0.15)',
              padding:'10px 12px', display:'flex', alignItems:'center', gap:8,
              cursor: 'pointer'
            }} onClick={()=>loadExpenseForEdit(i)}>
              <div style={{width:34,height:34,borderRadius:9,background:'#2563EB',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,flexShrink:0}}>{(e.name||'').charAt(0)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'#1E40AF'}}>{e.name}</div>
                <div style={{fontSize:10,color:'#64748B',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                  <span>¥{formatCurrency(e.amount)}</span>
                  {/* 札は外注・その他外注のときだけ */}
                  {costKubunOf(e) !== '自社' && <CostKubunTag kubun={costKubunOf(e)} light />}
                </div>
              </div>
              {isEditing && <span style={{ fontSize:9, background:'rgba(245,158,11,0.2)', color:'#B45309', border:'1px solid rgba(245,158,11,0.4)', borderRadius:4, padding:'2px 7px', fontWeight:700 }}>編集中</span>}
              {!isEditing && <span style={{ fontSize:11, color:'#94A3B8' }}>✏️</span>}
              <button onClick={(ev)=>{ev.stopPropagation(); if(isEditing){setEditingExpIdx(null); setExpKubun(''); setExpForm({name:'', amt:''});} else if(editingExpIdx!==null && i<editingExpIdx){setEditingExpIdx(editingExpIdx-1);} /* 上の行を消したら、タップ中の行の番号を1つ詰める */ setWorkDetails({...workDetails,dailyExpenses:(workDetails.dailyExpenses||[]).filter((_,j)=>j!==i)});}}
                style={{width:28,height:28,borderRadius:7,border:'1px solid rgba(239,68,68,0.25)',cursor:'pointer',background:'rgba(239,68,68,0.08)',color:'#f87171',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontWeight:700}}>✕</button>
            </div>
            );
          })}
          <div style={inputCard}>
            <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
              {['パーキング代','高速代','交通費','経費','道具代','アスベスト分析費'].map(n=>(
                <button key={n} onClick={()=>setExpForm({...expForm,name:n})}
                  style={{padding:'4px 9px',borderRadius:7,border:`1px solid ${expForm.name===n?'rgba(59,130,246,0.5)':'rgba(255,255,255,0.1)'}`,background:expForm.name===n?'rgba(59,130,246,0.3)':'rgba(255,255,255,0.08)',color:expForm.name===n?'#93C5FD':'rgba(255,255,255,0.5)',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{n}</button>
              ))}
            </div>
            <div style={{...grid2,marginBottom:8}}>
              <div>
                <label style={inpLbl}>項目名</label>
                <input type="text" value={expForm.name} onChange={e=>setExpForm({...expForm,name:e.target.value})} placeholder="例）パーキング代" style={inpTxt} />
              </div>
              <div>
                <label style={inpLbl}>金額</label>
                <input type="number" value={expForm.amt} onChange={e=>setExpForm({...expForm,amt:e.target.value})} placeholder="0" style={inpTxt} />
              </div>
            </div>
            {/* 区分（自社／外注／その他外注）。既定は名前から自動 */}
            <CostKubunPicker id="exp-kubun" name={expForm.name} value={expKubun} onChange={setExpKubun} />
            <AddBtn onClick={()=>{
              const name=(expForm.name||'').trim();
              const amt=parseFloat(expForm.amt)||0;
              if(!name) return;
              const kubun = expKubun || guessCostKubun(name);
              if (editingExpIdx !== null) {
                const list = [...(workDetails.dailyExpenses||[])];
                list[editingExpIdx] = {...list[editingExpIdx], name, amount: amt, kubun};
                setWorkDetails({...workDetails, dailyExpenses: list});
                setEditingExpIdx(null);
              } else {
                setWorkDetails({...workDetails,dailyExpenses:[...(workDetails.dailyExpenses||[]),{name,amount:amt,kubun}]});
              }
              setExpForm({name:'', amt:''});
              setExpKubun('');
            }} disabled={!(expForm.name||'').trim()} pulse={!!(expForm.name||'').trim()} />
          </div>
          {(workDetails.dailyExpenses||[]).length>0 && <SubTotal label="経費" value={(workDetails.dailyExpenses||[]).reduce((s,e)=>s+(e.amount||0),0)} />}

          <BFooter onBack={()=>setCurrentStep(1)} onNext={handleStep2Next} nextLabel="次へ →" />
        </div>
      )}

      {/* Step 3 */}
      {/* Step 3 */}
      {currentStep === 3 && (
        <div className="b-panel" style={{ padding:'16px 16px 100px', background:'#fff', maxWidth:'42rem', margin:'0 auto', boxSizing:'border-box' }}>
          <p style={{ fontSize:'12px', color:'rgba(255,255,255,0.45)', marginBottom:'14px' }}>※ない場合はそのまま保存できます</p>

          {/* 産廃 (4タブ統合) */}
          <SectionLabel ja="産廃・スクラップ" en="Waste & Scrap" pending={!!(isWasteFormPending(wasteForm, wasteTab) || (scrapForm && scrapForm.buyer && parseFloat(scrapForm.qty) > 0))} />

          {/* 入力済みリスト */}
          {editingWasteIdx === null && wasteItems.length > 0 && (
            <div style={{fontSize:11,color:'rgba(245,158,11,0.9)',marginBottom:6,padding:'5px 10px',background:'rgba(245,158,11,0.06)',borderRadius:7,border:'1px dashed rgba(245,158,11,0.25)'}}>
              ✏️ 行をタップすると編集できます
            </div>
          )}
          {wasteItems.map((w,i)=>{
            const k = detectKind(w);
            const scrap = isScrap(w);
            // scrap時はシアン、それ以外はkindに応じて
            const tagColor = scrap ? '#0E7490' : (k==='env'?'#15803D':k==='ext'?'#4338CA':'#B45309');
            const tagBg    = scrap ? 'rgba(34,211,238,0.15)' : (k==='env'?'rgba(34,197,94,0.15)':k==='ext'?'rgba(99,102,241,0.15)':'rgba(245,158,11,0.15)');
            const tagLabel = scrap
              ? `${k==='env'?'環境課':k==='ext'?'ワイエム':'自社'}/売上`
              : (k==='env'?'環境課':k==='ext'?'ワイエム':'自社');
            return (
              <div key={i} onClick={()=>loadWasteForEdit(i)} style={{borderRadius:11,marginBottom:6,overflow:'hidden',cursor:'pointer',
                background: editingWasteIdx===i ? 'rgba(245,158,11,0.08)' : '#FFFBEB',
                border: editingWasteIdx===i ? '2px solid rgba(245,158,11,0.6)' : '1px solid #FDE68A'
              }}>
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px'}}>
                  <div style={{width:36,height:36,borderRadius:9,background:tagBg,color:tagColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,flexShrink:0}}>{(w.material||'').slice(0,2)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2,flexWrap:'wrap'}}>
                      <span style={{fontSize:9,fontWeight:700,color:tagColor,background:tagBg,padding:'1px 6px',borderRadius:4}}>{tagLabel}</span>
                      {w.isSwap && (hasEarlierSameVehicle(wasteItems, w, i)
                        ? <span style={{fontSize:9,fontWeight:700,color:'#475569',background:'rgba(100,116,139,0.15)',border:'1px solid rgba(100,116,139,0.4)',padding:'1px 6px',borderRadius:4}}>同じ車両（車両費計上済み）</span>
                        : <span style={{fontSize:9,fontWeight:700,color:'#7C3AED',background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.4)',padding:'1px 6px',borderRadius:4}}>🔄 乗換</span>)}
                      <div style={{fontSize:13,fontWeight:700,color:'#1C1917'}}>{w.material} → {w.disposalSite}</div>
                    </div>
                    <div style={{fontSize:10,color:'#999'}}>{w.quantity}{w.unit}　{w.manifestNumber&&w.manifestNumber!=='-'?`マニ:${w.manifestNumber}`:''}{k==='env'&&w.driver?`　運転:${w.driver}`:''}{w.haishiAmount?`　配車:¥${formatCurrency(w.haishiAmount)}`:((k==='env'||k==='ext')&&!isHaishiOverrideItem(w)&&(w.haishiShift||(k==='ext'&&extManifestKey(w)&&wasteItems.slice(0,i).some(x=>detectKind(x)==='ext'&&extManifestKey(x)===extManifestKey(w))))?'　配車費計上済み':'')}{w.workerVType?`　車両:${w.workerVType}${w.workerVNumber?'/'+w.workerVNumber:''}${w.isSwap&&!hasEarlierSameVehicle(wasteItems, w, i)?' (乗換)':''}`:''}</div>
                  </div>
                  {editingWasteIdx===i
                    ? <span style={{fontSize:9,background:'rgba(245,158,11,0.2)',color:'#B45309',border:'1px solid rgba(245,158,11,0.4)',borderRadius:4,padding:'2px 7px',flexShrink:0,fontWeight:700}}>編集中</span>
                    : <span style={{fontSize:11,color:'rgba(245,158,11,0.5)',flexShrink:0}}>✏️</span>
                  }
                  <div style={{fontSize:12,fontWeight:700,color:scrap?'#0E7490':'#B45309',fontVariantNumeric:'tabular-nums',flexShrink:0}}>¥{formatCurrency(Math.abs(w.amount))}</div>
                  <button onClick={e=>{e.stopPropagation();if(editingWasteIdx===i){cancelEdit();}setWasteItems(normalizeSwapFlags(normalizeHaishiAmounts(wasteItems.filter((_,j)=>j!==i))));}} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(239,68,68,0.25)',cursor:'pointer',background:'rgba(239,68,68,0.1)',color:'#f87171',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,flexShrink:0}}>✕</button>
                </div>
              </div>
            );
          })}

          {/* タブ切り替え (3種類: 金属くずは各タブの「売上」セグメントで入力) */}
          <div style={{position:'relative',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:0,marginBottom:10,marginTop:8,padding:4,background:'#F1F1F1',borderRadius:10,border:'1px solid #E8E8E8'}}>
            {/* スライドインジケータ */}
            <div style={{
              position:'absolute',
              top:4, bottom:4,
              left:4,
              width:'calc((100% - 8px) / 3)',
              transform:`translateX(${wasteTab==='self'?0:wasteTab==='env'?100:200}%)`,
              background: wasteTab==='self'?'#FBBF24':wasteTab==='env'?'#4ade80':'#a5b4fc',
              borderRadius:7,
              transition:'transform 0.28s cubic-bezier(0.4,0,0.2,1), background 0.2s',
              zIndex:0,
            }} />
            {[
              ['self','自社運搬','#92400E'],
              ['env','環境課配車','#0E3A1E'],
              ['ext','ワイエム配車','#26215C'],
            ].map(([v,label,activeColor])=>(
              <button key={v} onClick={()=>{ 
                if (editingWasteIdx!==null) cancelEdit();
                setWasteTab(v);
                // ★ タブ切替時にフォーム完全クリア(産廃/金属の独立化)
                const currentMode = wasteModeByTab[v]||'cost';
                setWasteForm(blankWasteForm(v, currentMode));
                setEditingWasteIdx(null);
              }}
                style={{
                  position:'relative',zIndex:1,
                  padding:'11px 4px',borderRadius:7,border:'none',
                  background:'transparent',
                  color:wasteTab===v?activeColor:'#9CA3AF',
                  fontSize:12,fontWeight:wasteTab===v?700:500,cursor:'pointer',fontFamily:'inherit',
                  transition:'color 0.2s, font-weight 0.2s',
                }}>{label}</button>
            ))}
          </div>

          {/* 説明バナー (アクティブタブ+セグメントに連動) */}
          {(() => {
            const isRev = (wasteModeByTab[wasteTab]||'cost') === 'revenue';
            const info = {
              self: isRev
                ? { color:'#0E7490', bg:'rgba(34,211,238,0.08)', icon:'自', iconBg:'#06B6D4', title:'自社運搬 / 売上（金属）', desc:'自社の担当者が金属くず等を運搬・売却。金額はマイナス計上で原価から控除' }
                : { color:'#B45309', bg:'rgba(245,158,11,0.08)', icon:'自', iconBg:'#FBBF24', title:'自社運搬', desc:'自社の担当者と車両で運搬した産廃を入力' },
              env: isRev
                ? { color:'#0E7490', bg:'rgba(34,211,238,0.08)', icon:'環', iconBg:'#06B6D4', title:'環境課配車 / 売上（金属）', desc:'環境課の配車で金属を運搬・売却。配車費は通常通りコスト、売上はマイナス計上' }
                : { color:'#15803D', bg:'rgba(34,197,94,0.08)', icon:'環', iconBg:'#4ade80', title:'環境課配車', desc:'環境課の運転者が配車で運搬（昼¥20,000/夜¥30,000）' },
              ext: isRev
                ? { color:'#0E7490', bg:'rgba(34,211,238,0.08)', icon:'ワ', iconBg:'#06B6D4', title:'ワイエム配車 / 売上（金属）', desc:'ワイエム配車で金属を運搬・売却。配車費は通常通りコスト、売上はマイナス計上' }
                : { color:'#4338CA', bg:'rgba(99,102,241,0.08)', icon:'ワ', iconBg:'#a5b4fc', title:'ワイエム配車', desc:'ワイエム配車（昼¥22,000/夜¥32,000・例外金額可）' },
            }[wasteTab];
            return (
              <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',marginBottom:10,background:info.bg,border:`1px solid ${info.color}33`,borderLeft:`3px solid ${info.color}`,borderRadius:'0 8px 8px 0'}}>
                <div style={{width:28,height:28,borderRadius:7,background:info.iconBg,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>{info.icon}</div>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:info.color}}>{info.title}</div>
                  <div style={{fontSize:10,color:'#666',marginTop:1,lineHeight:1.4}}>{info.desc}</div>
                </div>
              </div>
            );
          })()}

          {/* === 自社運搬フォーム === */}
          {wasteTab === 'self' && (() => {
            const isRev = (wasteModeByTab[wasteTab]||'cost') === 'revenue';
            const isTool = (wasteModeByTab[wasteTab]||'cost') === 'tool';
            const cardBg = isTool ? '#1F1B2E' : isRev ? '#172832' : '#2A2620';
            const cardBorder = isTool ? '2px solid #818CF8' : isRev ? '2px solid #06B6D4' : '2px solid #FBBF24';
            const accentDark = isTool ? '#A5B4FC' : isRev ? '#22D3EE' : '#FBBF24';
            const accentBg = isTool ? 'rgba(129,140,248,0.15)' : isRev ? 'rgba(34,211,238,0.15)' : 'rgba(251,191,36,0.15)';
            const inputBorder = isTool ? '1px solid rgba(129,140,248,0.3)' : isRev ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(251,191,36,0.3)';
            const allWorkers = (MASTER_DATA.inHouseWorkersByDept[wasteSelfDept==='k1'?'工事1課':'環境課'])||[];
            return (
            <div style={{background:cardBg,border:cardBorder,borderRadius:14,padding:14,marginBottom:10}}>
              {/* セグメント: 処分 / 道具車 / 売上(金属) */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <span style={{fontSize:11,fontWeight:700,color:accentDark,padding:'3px 10px',background:accentBg,borderRadius:6}}>
                  自社運搬{isRev?' / 売上（金属）':''}{isTool?' / 道具車':''}
                </span>
              </div>
              {/* 処分/道具車/売上 3分割カード */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:14}}>
                <button onClick={()=>{setWasteModeByTab({...wasteModeByTab,[wasteTab]:'cost'});setWasteForm(blankWasteForm(wasteTab,'cost'));setEditingWasteIdx(null);}}
                  style={{padding:'12px 4px',borderRadius:10,border:(!isRev && !isTool)?`2px solid ${accentDark}`:'2px solid rgba(255,255,255,0.12)',background:(!isRev && !isTool)?accentBg:'rgba(255,255,255,0.04)',cursor:'pointer',fontFamily:'inherit',textAlign:'center',transition:'all 0.15s'}}>
                  <div style={{fontSize:12,fontWeight:700,color:(!isRev && !isTool)?accentDark:'rgba(255,255,255,0.5)'}}>産廃処分</div>
                  <div style={{fontSize:9,color:(!isRev && !isTool)?accentDark:'rgba(255,255,255,0.35)',marginTop:2,opacity:0.8}}>廃プラ等</div>
                </button>
                <button onClick={()=>{setWasteModeByTab({...wasteModeByTab,[wasteTab]:'tool'});setWasteForm(blankWasteForm(wasteTab,'tool'));setEditingWasteIdx(null);}}
                  style={{padding:'12px 4px',borderRadius:10,border:isTool?'2px solid #818CF8':'2px solid rgba(255,255,255,0.12)',background:isTool?'rgba(129,140,248,0.15)':'rgba(255,255,255,0.04)',cursor:'pointer',fontFamily:'inherit',textAlign:'center',transition:'all 0.15s'}}>
                  <div style={{fontSize:12,fontWeight:700,color:isTool?'#A5B4FC':'rgba(255,255,255,0.5)'}}>道具車</div>
                  <div style={{fontSize:9,color:isTool?'#A5B4FC':'rgba(255,255,255,0.35)',marginTop:2,opacity:0.8}}>担当者+車両</div>
                </button>
                <button onClick={()=>{setWasteModeByTab({...wasteModeByTab,[wasteTab]:'revenue'});setWasteForm(blankWasteForm(wasteTab,'revenue'));setEditingWasteIdx(null);}}
                  style={{padding:'12px 4px',borderRadius:10,border:isRev?'2px solid #06B6D4':'2px solid rgba(255,255,255,0.12)',background:isRev?'rgba(6,182,212,0.15)':'rgba(255,255,255,0.04)',cursor:'pointer',fontFamily:'inherit',textAlign:'center',transition:'all 0.15s'}}>
                  <div style={{fontSize:12,fontWeight:700,color:isRev?'#22D3EE':'rgba(255,255,255,0.5)'}}>金属売上</div>
                  <div style={{fontSize:9,color:isRev?'#67e8f9':'rgba(255,255,255,0.35)',marginTop:2,opacity:0.8}}>鉄・銅くず等</div>
                </button>
              </div>

              {!isTool && (<>
              {renderWasteMainFields({ isRev, accentDark, inputBorder })}
              {!isRev && renderWasteManifestField(inputBorder)}
              {isRev && (
                <div style={{marginBottom:10}}>
                  <label style={{...inpLbl,color:'#22D3EE',fontWeight:700}}>㎥換算 <span style={{color:'rgba(255,255,255,0.4)',fontWeight:400,fontSize:'9px'}}>(任意・後日入力可)</span></label>
                  <input type="number" step="0.1" value={wasteForm.volumeM3||''} onChange={e=>setWasteForm({...wasteForm,volumeM3:e.target.value})} placeholder="例）2.5" style={{...inpTxt,border:'1px solid #06B6D4',color:'#22D3EE',fontWeight:500}} />
                  <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',marginTop:4,lineHeight:1.4}}>kg入力後に後日㎥数値を追加すれば、PDFで「kg/㎥」併記され、㎥合計に加算されます</div>
                </div>
              )}
              </>)}
              {isTool && (
                <div style={{padding:'10px 14px',background:'rgba(129,140,248,0.1)',border:'1px solid rgba(129,140,248,0.3)',borderRadius:10,display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <div style={{width:32,height:32,borderRadius:8,background:'rgba(129,140,248,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>🚐</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'#A5B4FC'}}>道具車</div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,0.6)',marginTop:2}}>担当者と車両のみ入力。発生材は「道具車」として記録、数量・金額は空欄</div>
                  </div>
                </div>
              )}

              {/* 担当者 + 車両 (部署タブ + チップ) */}
              <div style={{padding:12,borderRadius:10,background:'rgba(0,0,0,0.25)',border:'1px solid rgba(255,255,255,0.05)',marginBottom:10}}>
                <label style={{...inpLbl,marginBottom:8}}>担当者 / 車両 <span style={{color:'rgba(255,255,255,0.3)',fontSize:9,fontWeight:400}}>(任意)</span></label>
                {/* 部署タブ (工事1課 / 環境課 / 外注車) */}
                <div style={{display:'flex',gap:5,marginBottom:8}}>
                  {[['k1','工事1課'],['k2','環境課'],['out','外注車']].map(([v,label])=>(
                    <button key={v} onClick={()=>{
                      setWasteSelfDept(v);
                      if (v === 'out') {
                        setWasteForm(prev=>({...prev,workerName:'',workerVNumber:''}));
                      } else {
                        setWasteForm(prev=>({...prev,workerVNumber:''}));
                      }
                    }}
                      style={{padding:'4px 12px',borderRadius:6,border:`1px solid ${wasteSelfDept===v?accentDark:'rgba(255,255,255,0.12)'}`,background:wasteSelfDept===v?accentDark:'rgba(255,255,255,0.08)',color:wasteSelfDept===v?'#1F1F1F':accentDark,fontSize:11,fontWeight:wasteSelfDept===v?600:500,cursor:'pointer',fontFamily:'inherit'}}>{label}</button>
                  ))}
                </div>
                {/* 担当者チップ - 外注車時は非表示 */}
                {wasteSelfDept !== 'out' ? (<>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:6}}>
                    {allWorkers.map(n=>(
                      <button key={n} onClick={()=>setWasteForm({...wasteForm,workerName:n})}
                        style={{padding:'4px 9px',borderRadius:6,border:`1px solid ${wasteForm.workerName===n?accentDark:'rgba(255,255,255,0.1)'}`,background:wasteForm.workerName===n?accentDark:'rgba(255,255,255,0.06)',color:wasteForm.workerName===n?'#1F1F1F':'rgba(255,255,255,0.8)',fontSize:11,fontWeight:wasteForm.workerName===n?600:400,cursor:'pointer',fontFamily:'inherit'}}>{n}</button>
                    ))}
                  </div>
                  <input type="text" value={wasteForm.workerName} onChange={e=>setWasteForm({...wasteForm,workerName:e.target.value})} placeholder="マスタにない名前は直接入力" style={{...inpTxt,marginBottom:8,fontSize:12}}/>
                </>) : (
                  <div style={{padding:'8px 10px',background:'rgba(251,191,36,0.08)',border:'1px dashed rgba(251,191,36,0.35)',borderRadius:8,marginBottom:8,fontSize:11,color:'rgba(255,255,255,0.7)',lineHeight:1.4}}>
                    外注車：個人名は記録しません。車種と車番のみ入力してください。
                  </div>
                )}
                <div style={grid2}>
                  <div>
                    <label style={inpLbl}>車種</label>
                    <select value={wasteForm.workerVType} onChange={e=>setWasteForm({...wasteForm,workerVType:e.target.value,workerVNumber:''})} style={inpSel}>
                      <option value="" style={{color:"#000",background:"#fff"}}>選択</option>
                      {MASTER_DATA.vehicles.map(v=><option key={v} style={{color:"#000",background:"#fff"}}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={inpLbl}>車番{wasteSelfDept==='out' && <span style={{color:'rgba(255,255,255,0.4)',fontSize:9,marginLeft:4}}>(手入力)</span>}</label>
                    {wasteSelfDept === 'out' ? (
                      <input type="text" value={(wasteForm.workerVNumber||'').trim()} onChange={e=>setWasteForm({...wasteForm,workerVNumber:e.target.value})} placeholder="例）奈良商事ダンプ" style={{...inpTxt,color:'#fff'}} />
                    ) : (() => {
                      const candidates = MASTER_DATA.vehicleNumbersByType[wasteForm.workerVType] || [];
                      const inMaster = candidates.includes(wasteForm.workerVNumber);
                      const isCustom = wasteForm.workerVNumber && !inMaster;
                      return (
                        <>
                          <select value={isCustom ? '__custom__' : (wasteForm.workerVNumber||'')} onChange={e=>{
                            if (e.target.value === '__custom__') {
                              // __custom__選択時: 既に非マスタ値があればそのまま、なければスペース1つで入力欄を出す
                              setWasteForm({...wasteForm, workerVNumber: (wasteForm.workerVNumber && !candidates.includes(wasteForm.workerVNumber)) ? wasteForm.workerVNumber : ' '});
                            } else {
                              setWasteForm({...wasteForm, workerVNumber: e.target.value});
                            }
                          }} style={inpSel}>
                            <option value="" style={{color:"#000",background:"#fff"}}>選択</option>
                            {candidates.map(n=><option key={n} value={n} style={{color:"#000",background:"#fff"}}>{n}</option>)}
                            <option value="__custom__" style={{color:"#000",background:"#fff"}}>マスタにない場合</option>
                          </select>
                          {isCustom && (
                            <input type="text" value={(wasteForm.workerVNumber||'').trim()} onChange={e=>setWasteForm({...wasteForm,workerVNumber:e.target.value||' '})} placeholder="車番を入力" style={{...inpTxt,marginTop:6,color:'#fff'}} autoFocus />
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                {wasteForm.workerVType && (
                  <div style={{marginTop:8,padding:'8px 10px',background:wasteForm.isSwap?'rgba(124,58,237,0.15)':'rgba(255,255,255,0.04)',border:`1px solid ${wasteForm.isSwap?'rgba(124,58,237,0.5)':'rgba(255,255,255,0.12)'}`,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:8}}
                    onClick={()=>setWasteForm({...wasteForm,isSwap:!wasteForm.isSwap})}>
                    <div style={{width:18,height:18,border:`2px solid ${wasteForm.isSwap?'#7C3AED':'rgba(255,255,255,0.4)'}`,borderRadius:4,background:wasteForm.isSwap?'#7C3AED':'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12,fontWeight:700,flexShrink:0}}>{wasteForm.isSwap?'✓':''}</div>
                    <div style={{flex:1,fontSize:11,fontWeight:600,color:wasteForm.isSwap?'#C4B5FD':'rgba(255,255,255,0.7)'}}>
                      {wasteForm.isSwap && hasEarlierSameVehicle(wasteItems, wasteForm, editingWasteIdx !== null ? editingWasteIdx : wasteItems.length)
                        ? '同じ車両（車両費計上済み）'
                        : '🔄 乗り換え車両(車両費は計上しない)'}
                    </div>
                    {wasteForm.isSwap && <span style={{fontSize:11,fontWeight:700,color:'#C4B5FD'}}>¥0</span>}
                  </div>
                )}
                {wasteForm.workerVType && !wasteForm.isSwap && (
                  <div style={{marginTop:6,fontSize:11,color:'#3b82f6',textAlign:'right',fontWeight:700}}>
                    車両費: ¥{formatCurrency(VEHICLE_UNIT_PRICES[wasteForm.workerVType]||0)}
                  </div>
                )}
              </div>

              {editingWasteIdx !== null ? (
                <div style={{display:'flex',gap:6}}>
                  <button onClick={handleAddByTab} disabled={!((wasteForm.type&&wasteForm.disposal&&wasteForm.qty) || wasteForm.workerVType)}
                    style={{flex:2,padding:'11px',background:accentDark,border:'none',borderRadius:9,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✓ この内容で上書き</button>
                  <button onClick={cancelEdit} style={{flex:1,padding:'11px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:9,color:'#aaa',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>キャンセル</button>
                </div>
              ) : (
                <AddBtn onClick={handleAddByTab} disabled={!((wasteForm.type&&wasteForm.disposal&&wasteForm.qty) || (wasteForm.workerVType && !isCarriedOnlyWasteForm(wasteForm)))} pulse={!!((wasteForm.type&&wasteForm.disposal&&wasteForm.qty) || (wasteForm.workerVType && !isCarriedOnlyWasteForm(wasteForm)))} />
              )}
            </div>
            );
          })()}

          {/* === 環境課配車フォーム === */}
          {wasteTab === 'env' && (() => {
            const isRev = (wasteModeByTab[wasteTab]||'cost') === 'revenue';
            const cardBg = isRev ? '#172832' : '#1F2822';
            const cardBorder = isRev ? '2px solid #06B6D4' : '2px solid #4ade80';
            const accentDark = isRev ? '#22D3EE' : '#4ade80';
            const accentBg = isRev ? 'rgba(34,211,238,0.15)' : 'rgba(34,197,94,0.15)';
            const inputBorder = isRev ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(34,197,94,0.3)';
            const envWorkers = MASTER_DATA.inHouseWorkersByDept['環境課']||[];
            return (
            <div style={{background:cardBg,border:cardBorder,borderRadius:14,padding:14,marginBottom:10}}>
              {/* セグメント: 処分 / 売上(金属) */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <span style={{fontSize:11,fontWeight:700,color:accentDark,padding:'3px 10px',background:accentBg,borderRadius:6}}>
                  環境課配車{isRev?' / 売上（金属）':''}
                </span>
              </div>
              {/* 処分/売上 2分割カード */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                <button onClick={()=>{setWasteModeByTab({...wasteModeByTab,[wasteTab]:'cost'});setWasteForm(blankWasteForm(wasteTab,'cost'));setEditingWasteIdx(null);}}
                  style={{padding:'12px 8px',borderRadius:10,border:!isRev?`2px solid ${accentDark}`:'2px solid rgba(255,255,255,0.12)',background:!isRev?accentBg:'rgba(255,255,255,0.04)',cursor:'pointer',fontFamily:'inherit',textAlign:'center',transition:'all 0.15s'}}>
                  <div style={{fontSize:13,fontWeight:700,color:!isRev?accentDark:'rgba(255,255,255,0.5)'}}>産廃処分</div>
                  <div style={{fontSize:9,color:!isRev?accentDark:'rgba(255,255,255,0.35)',marginTop:2,opacity:0.8}}>廃プラ・ボード等</div>
                </button>
                <button onClick={()=>{setWasteModeByTab({...wasteModeByTab,[wasteTab]:'revenue'});setWasteForm(blankWasteForm(wasteTab,'revenue'));setEditingWasteIdx(null);}}
                  style={{padding:'12px 8px',borderRadius:10,border:isRev?'2px solid #06B6D4':'2px solid rgba(255,255,255,0.12)',background:isRev?'rgba(6,182,212,0.15)':'rgba(255,255,255,0.04)',cursor:'pointer',fontFamily:'inherit',textAlign:'center',transition:'all 0.15s'}}>
                  <div style={{fontSize:13,fontWeight:700,color:isRev?'#22D3EE':'rgba(255,255,255,0.5)'}}>金属売上</div>
                  <div style={{fontSize:9,color:isRev?'#67e8f9':'rgba(255,255,255,0.35)',marginTop:2,opacity:0.8}}>鉄・銅くず等</div>
                </button>
              </div>

              {/* 産廃情報 */}
              {renderWasteMainFields({ isRev, accentDark, inputBorder })}
              {!isRev && renderWasteManifestField(inputBorder)}
              {isRev && (
                <div style={{marginBottom:10}}>
                  <label style={{...inpLbl,color:'#22D3EE',fontWeight:700}}>㎥換算 <span style={{color:'rgba(255,255,255,0.4)',fontWeight:400,fontSize:'9px'}}>(任意・後日入力可)</span></label>
                  <input type="number" step="0.1" value={wasteForm.volumeM3||''} onChange={e=>setWasteForm({...wasteForm,volumeM3:e.target.value})} placeholder="例）2.5" style={{...inpTxt,border:'1px solid #06B6D4',color:'#22D3EE',fontWeight:500}} />
                  <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',marginTop:4,lineHeight:1.4}}>kg入力後に後日㎥数値を追加すれば、PDFで「kg/㎥」併記され、㎥合計に加算されます</div>
                </div>
              )}

              {/* 運転者 (環境課フルネームチップ) */}
              <label style={{...inpLbl,marginBottom:6}}>運転者 <span style={{color:'#f87171'}}>*</span></label>
              <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:6}}>
                {envWorkers.map(d=>(
                  <button key={d} onClick={()=>setWasteForm({...wasteForm,driver:d})}
                    style={{padding:'4px 9px',borderRadius:6,border:`1px solid ${wasteForm.driver===d?accentDark:'rgba(255,255,255,0.1)'}`,background:wasteForm.driver===d?accentDark:'rgba(255,255,255,0.06)',color:wasteForm.driver===d?'#1F1F1F':accentDark,fontSize:11,fontWeight:wasteForm.driver===d?600:400,cursor:'pointer',fontFamily:'inherit'}}>{d}</button>
                ))}
              </div>
              <input type="text" value={wasteForm.driver} onChange={e=>setWasteForm({...wasteForm,driver:e.target.value})} placeholder="マスタにない名前は直接入力" style={{...inpTxt,marginBottom:10,fontSize:12}}/>

              {/* 車両 */}
              <label style={{...inpLbl,marginBottom:6}}>使用車両</label>
              <div style={{...grid2,marginBottom:10}}>
                <div>
                  <label style={inpLbl}>車種</label>
                  <select value={wasteForm.vType} onChange={e=>setWasteForm({...wasteForm,vType:e.target.value,vNumber:''})} style={{...inpSel,border:inputBorder}}>
                    <option value="" style={{color:"#000",background:"#fff"}}>選択</option>{MASTER_DATA.vehicles.map(v=><option key={v} style={{color:"#000",background:"#fff"}}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={inpLbl}>車番</label>
                  {(() => {
                    const candidates = MASTER_DATA.vehicleNumbersByType[wasteForm.vType] || [];
                    const inMaster = candidates.includes(wasteForm.vNumber);
                    const isCustom = wasteForm.vNumber && !inMaster;
                    return (
                      <>
                        <select value={isCustom ? '__custom__' : (wasteForm.vNumber||'')} onChange={e=>{
                          if (e.target.value === '__custom__') {
                            setWasteForm({...wasteForm, vNumber: (wasteForm.vNumber && !candidates.includes(wasteForm.vNumber)) ? wasteForm.vNumber : ' '});
                          } else {
                            setWasteForm({...wasteForm, vNumber: e.target.value});
                          }
                        }} style={{...inpSel,border:inputBorder}}>
                          <option value="" style={{color:"#000",background:"#fff"}}>選択</option>
                          {candidates.map(n=><option key={n} value={n} style={{color:"#000",background:"#fff"}}>{n}</option>)}
                          <option value="__custom__" style={{color:"#000",background:"#fff"}}>マスタにない場合</option>
                        </select>
                        {isCustom && (
                          <input type="text" value={(wasteForm.vNumber||'').trim()} onChange={e=>setWasteForm({...wasteForm,vNumber:e.target.value||' '})} placeholder="車番を入力" style={{...inpTxt,border:inputBorder,marginTop:6,color:'#fff'}} autoFocus />
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* シフト */}
              <label style={{...inpLbl,marginBottom:6}}>シフト <span style={{color:'#f87171'}}>*</span></label>
              <div style={{...grid2,marginBottom:8,marginTop:14}}>
                {[['day','昼',20000],['night','夜',30000]].map(([v,label,price])=>{
                  const counted = wasteItems.some((it,idx)=>
                    idx !== editingWasteIdx &&
                    (it.haisha==='env' || it.kind==='env') &&
                    (it.driver||'') === (wasteForm.driver||'') &&
                    (it.vType||'') === (wasteForm.vType||'') &&
                    (it.vNumber||'') === (wasteForm.vNumber||'') &&
                    it.haishiShift === v &&
                    wasteForm.driver && wasteForm.vType
                  );
                  return (
                  <button key={v} onClick={()=>{ if (!counted) setWasteForm({...wasteForm,haishiShift:v}); }} disabled={counted}
                    style={{position:'relative',padding:'10px',borderRadius:9,border:`1px solid ${wasteForm.haishiShift===v?accentDark:'rgba(255,255,255,0.1)'}`,background:wasteForm.haishiShift===v?accentBg:'rgba(255,255,255,0.05)',cursor:counted?'not-allowed':'pointer',fontFamily:'inherit',textAlign:'center',opacity:counted?0.55:1}}>
                    {counted && (
                      <span style={{position:'absolute',top:-9,left:'50%',transform:'translateX(-50%)',fontSize:9,background:accentDark,color:'#fff',padding:'2px 8px',borderRadius:10,fontWeight:700,whiteSpace:'nowrap'}}>配車費計上済み</span>
                    )}
                    <div style={{fontSize:13,fontWeight:800,color:wasteForm.haishiShift===v?accentDark:'rgba(255,255,255,0.7)'}}>{label}</div>
                    <div style={{fontSize:10,fontFamily:'monospace',color:counted?'rgba(255,255,255,0.5)':(wasteForm.haishiShift===v?accentDark:'rgba(255,255,255,0.5)')}}>
                      {counted ? <><s>¥{formatCurrency(price)}</s> → ¥0</> : `¥${formatCurrency(price)}`}
                    </div>
                  </button>
                  );
                })}
              </div>

              {(() => {
                // 同配車(運転者+車両)が既に計上されているかチェック
                const hasExistingShift = wasteItems.some((it,idx)=>
                  idx !== editingWasteIdx &&
                  (it.haisha==='env' || it.kind==='env') &&
                  (it.driver||'') === (wasteForm.driver||'') &&
                  (it.vType||'') === (wasteForm.vType||'') &&
                  (it.vNumber||'') === (wasteForm.vNumber||'') &&
                  wasteForm.driver && wasteForm.vType
                );
                const isFormValid = wasteForm.type && wasteForm.disposal && wasteForm.qty && wasteForm.driver && (wasteForm.haishiShift || hasExistingShift);
                return editingWasteIdx !== null ? (
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={handleAddByTab} disabled={!isFormValid}
                      style={{flex:2,padding:'11px',background:accentDark,border:'none',borderRadius:9,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✓ この内容で上書き</button>
                    <button onClick={cancelEdit} style={{flex:1,padding:'11px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:9,color:'#aaa',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>キャンセル</button>
                  </div>
                ) : (
                  <AddBtn onClick={handleAddByTab} disabled={!isFormValid} pulse={isFormValid} />
                );
              })()}
            </div>
            );
          })()}

          {/* === ワイエム配車フォーム === */}
          {wasteTab === 'ext' && (() => {
            const isRev = (wasteModeByTab[wasteTab]||'cost') === 'revenue';
            const cardBg = isRev ? '#172832' : '#24232E';
            const cardBorder = isRev ? '2px solid #06B6D4' : '2px solid #a5b4fc';
            const accentDark = isRev ? '#22D3EE' : '#a5b4fc';
            const accentBg = isRev ? 'rgba(34,211,238,0.15)' : 'rgba(165,180,252,0.15)';
            const inputBorder = isRev ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(165,180,252,0.3)';
            // 同じマニフェストNo.の配車費をすでに計上している行（あればこの行の配車費は ¥0）
            const extManifestCountedBy = !isRev && !wasteForm.haishiOverride ? findExtManifestCountedBy(wasteForm) : null;
            const extHasManifest = !isRev && !!String(wasteForm.manifest||'').trim();
            return (
            <div style={{background:cardBg,border:cardBorder,borderRadius:14,padding:14,marginBottom:10}}>
              {/* セグメント: 処分 / 売上(金属) */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <span style={{fontSize:11,fontWeight:700,color:accentDark,padding:'3px 10px',background:accentBg,borderRadius:6}}>
                  ワイエム配車{isRev?' / 売上（金属）':''}
                </span>
              </div>
              {/* 処分/売上 2分割カード */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
                <button onClick={()=>{setWasteModeByTab({...wasteModeByTab,[wasteTab]:'cost'});setWasteForm(blankWasteForm(wasteTab,'cost'));setEditingWasteIdx(null);}}
                  style={{padding:'12px 8px',borderRadius:10,border:!isRev?`2px solid ${accentDark}`:'2px solid rgba(255,255,255,0.12)',background:!isRev?accentBg:'rgba(255,255,255,0.04)',cursor:'pointer',fontFamily:'inherit',textAlign:'center',transition:'all 0.15s'}}>
                  <div style={{fontSize:13,fontWeight:700,color:!isRev?accentDark:'rgba(255,255,255,0.5)'}}>産廃処分</div>
                  <div style={{fontSize:9,color:!isRev?accentDark:'rgba(255,255,255,0.35)',marginTop:2,opacity:0.8}}>廃プラ・ボード等</div>
                </button>
                <button onClick={()=>{setWasteModeByTab({...wasteModeByTab,[wasteTab]:'revenue'});setWasteForm(blankWasteForm(wasteTab,'revenue'));setEditingWasteIdx(null);}}
                  style={{padding:'12px 8px',borderRadius:10,border:isRev?'2px solid #06B6D4':'2px solid rgba(255,255,255,0.12)',background:isRev?'rgba(6,182,212,0.15)':'rgba(255,255,255,0.04)',cursor:'pointer',fontFamily:'inherit',textAlign:'center',transition:'all 0.15s'}}>
                  <div style={{fontSize:13,fontWeight:700,color:isRev?'#22D3EE':'rgba(255,255,255,0.5)'}}>金属売上</div>
                  <div style={{fontSize:9,color:isRev?'#67e8f9':'rgba(255,255,255,0.35)',marginTop:2,opacity:0.8}}>鉄・銅くず等</div>
                </button>
              </div>

              {/* 産廃情報 */}
              {renderWasteMainFields({ isRev, accentDark, inputBorder })}
              {!isRev && renderWasteManifestField(inputBorder)}
              {isRev && (
                <div style={{marginBottom:10}}>
                  <label style={{...inpLbl,color:'#22D3EE',fontWeight:700}}>㎥換算 <span style={{color:'rgba(255,255,255,0.4)',fontWeight:400,fontSize:'9px'}}>(任意・後日入力可)</span></label>
                  <input type="number" step="0.1" value={wasteForm.volumeM3||''} onChange={e=>setWasteForm({...wasteForm,volumeM3:e.target.value})} placeholder="例）2.5" style={{...inpTxt,border:'1px solid #06B6D4',color:'#22D3EE',fontWeight:500}} />
                  <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',marginTop:4,lineHeight:1.4}}>kg入力後に後日㎥数値を追加すれば、PDFで「kg/㎥」併記され、㎥合計に加算されます</div>
                </div>
              )}

              {/* シフト */}
              <label style={{...inpLbl,marginBottom:6}}>シフト <span style={{color:'#f87171'}}>*</span> <span style={{color:'rgba(255,255,255,0.3)',fontWeight:400,fontSize:'9px'}}>※例外時は下のチェック</span></label>
              <div style={{...grid2,marginBottom:8,marginTop:14}}>
                {[['day','昼',22000],['night','夜',32000]].map(([v,label,price])=>{
                  // マニフェストNo.がある行はマニフェストNo.だけで判定。空欄なら同じ車両・昼夜で配車費を付けた行があるか
                  const counted = !!extManifestCountedBy || (!extHasManifest && wasteItems.some((it,idx)=>
                    idx !== editingWasteIdx &&
                    (it.haisha==='ext' || it.kind==='ext') &&
                    (it.vType||'') === (wasteForm.vType||'') &&
                    (it.vNumber||'') === (wasteForm.vNumber||'') &&
                    it.haishiShift === v &&
                    !isHaishiOverrideItem(it) &&
                    (it.haishiAmount||0) > 0 &&
                    wasteForm.vType
                  ));
                  return (
                  <button key={v} onClick={()=>{ if (!counted) setWasteForm({...wasteForm,haishiShift:v,haishiOverride:false}); }} disabled={counted}
                    style={{position:'relative',padding:'10px',borderRadius:9,border:`1px solid ${!wasteForm.haishiOverride&&wasteForm.haishiShift===v?accentDark:'rgba(255,255,255,0.1)'}`,background:!wasteForm.haishiOverride&&wasteForm.haishiShift===v?accentBg:'rgba(255,255,255,0.05)',cursor:counted?'not-allowed':'pointer',fontFamily:'inherit',textAlign:'center',opacity:counted?0.55:1}}>
                    {counted && (
                      <span style={{position:'absolute',top:-9,left:'50%',transform:'translateX(-50%)',fontSize:9,background:accentDark,color:'#fff',padding:'2px 8px',borderRadius:10,fontWeight:700,whiteSpace:'nowrap'}}>配車費計上済み</span>
                    )}
                    <div style={{fontSize:13,fontWeight:800,color:!wasteForm.haishiOverride&&wasteForm.haishiShift===v?accentDark:'rgba(255,255,255,0.7)'}}>{label}</div>
                    <div style={{fontSize:10,fontFamily:'monospace',color:counted?'rgba(255,255,255,0.5)':(!wasteForm.haishiOverride&&wasteForm.haishiShift===v?accentDark:'rgba(255,255,255,0.5)')}}>
                      {counted ? <><s>¥{formatCurrency(price)}</s> → ¥0</> : `¥${formatCurrency(price)}`}
                    </div>
                  </button>
                  );
                })}
              </div>

              {/* 車両 (任意) */}
              <label style={{...inpLbl,marginBottom:6}}>使用車両 <span style={{color:'rgba(255,255,255,0.3)',fontWeight:400,fontSize:'9px'}}>(任意)</span></label>
              <div style={{...grid2,marginBottom:8}}>
                <div>
                  <label style={inpLbl}>車種</label>
                  <select value={wasteForm.vType||''} onChange={e=>setWasteForm({...wasteForm,vType:e.target.value,vNumber:''})} style={{...inpSel,border:inputBorder}}>
                    <option value="" style={{color:"#000",background:"#fff"}}>選択</option>{MASTER_DATA.vehicles.map(v=><option key={v} style={{color:"#000",background:"#fff"}}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={inpLbl}>車番</label>
                  {(() => {
                    const candidates = MASTER_DATA.vehicleNumbersByType[wasteForm.vType] || [];
                    const inMaster = candidates.includes(wasteForm.vNumber||'');
                    const isCustom = (wasteForm.vNumber||'') && !inMaster;
                    return (
                      <>
                        <select value={isCustom ? '__custom__' : (wasteForm.vNumber||'')} onChange={e=>{
                          if (e.target.value === '__custom__') {
                            setWasteForm({...wasteForm, vNumber: ((wasteForm.vNumber||'') && !candidates.includes(wasteForm.vNumber||'')) ? wasteForm.vNumber : ' '});
                          } else {
                            setWasteForm({...wasteForm, vNumber: e.target.value});
                          }
                        }} style={{...inpSel,border:inputBorder}}>
                          <option value="" style={{color:"#000",background:"#fff"}}>選択</option>
                          {candidates.map(n=><option key={n} value={n} style={{color:"#000",background:"#fff"}}>{n}</option>)}
                          <option value="__custom__" style={{color:"#000",background:"#fff"}}>マスタにない場合</option>
                        </select>
                        {isCustom && (
                          <input type="text" value={(wasteForm.vNumber||'').trim()} onChange={e=>setWasteForm({...wasteForm,vNumber:e.target.value||' '})} placeholder="車番を入力" style={{...inpTxt,border:inputBorder,marginTop:6,color:'#fff'}} autoFocus />
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {extManifestCountedBy ? (
                <div style={{fontSize:11,color:accentDark,marginBottom:8,lineHeight:1.5}}>同じマニフェストNo.（{String(wasteForm.manifest||'').trim()}）の配車費は計上済みです。この行の配車費は ¥0 です。</div>
              ) : (<>
              <button onClick={()=>setWasteForm({...wasteForm,haishiOverride:!wasteForm.haishiOverride,haishiShift:''})}
                style={{display:'flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',padding:0,fontFamily:'inherit',marginBottom:6}}>
                <div style={{width:14,height:14,borderRadius:3,border:`1px solid ${wasteForm.haishiOverride?accentDark:'rgba(255,255,255,0.3)'}`,background:wasteForm.haishiOverride?accentDark:'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'#1F1F1F',flexShrink:0}}>{wasteForm.haishiOverride?'✓':''}</div>
                <span style={{fontSize:11,color:wasteForm.haishiOverride?accentDark:'rgba(255,255,255,0.5)'}}>遠方・例外あり（金額を手入力）</span>
              </button>
              {wasteForm.haishiOverride && (
                <input type="number" value={wasteForm.haishiPrice} onChange={e=>setWasteForm({...wasteForm,haishiPrice:e.target.value})} placeholder="配車費を入力" style={{...inpTxt,border:`1px solid ${accentDark}`,marginBottom:8}}/>
              )}
              </>)}

              {(() => {
                // 同配車(車両)が既に計上されているかチェック
                const hasExistingShiftExt = wasteItems.some((it,idx)=>
                  idx !== editingWasteIdx &&
                  (it.haisha==='ext' || it.kind==='ext') &&
                  (it.vType||'') === (wasteForm.vType||'') &&
                  (it.vNumber||'') === (wasteForm.vNumber||'') &&
                  !it.haishiOverride &&
                  wasteForm.vType
                );
                const isFormValid = wasteForm.type && wasteForm.disposal && wasteForm.qty && (wasteForm.haishiOverride || wasteForm.haishiShift || hasExistingShiftExt || !!extManifestCountedBy);
                return editingWasteIdx !== null ? (
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={handleAddByTab} disabled={!isFormValid}
                      style={{flex:2,padding:'11px',background:accentDark,border:'none',borderRadius:9,color:'#fff',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✓ この内容で上書き</button>
                    <button onClick={cancelEdit} style={{flex:1,padding:'11px',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:9,color:'#aaa',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>キャンセル</button>
                  </div>
                ) : (
                  <AddBtn onClick={handleAddByTab} disabled={!isFormValid} pulse={isFormValid} />
                );
              })()}
            </div>
            );
          })()}

          {wasteItems.length>0 && (
            <SubTotal label="産廃合計（売上は除く）" value={wasteItems.filter(w=>w.amount>0).reduce((s,w)=>s+w.amount,0)} />
          )}
          {wasteItems.filter(w=>w.amount<0).length>0 && (
            <SubTotal label="スクラップ売上" value={Math.abs(wasteItems.filter(w=>w.amount<0).reduce((s,w)=>s+w.amount,0))} />
          )}

          <BFooter onBack={()=>setCurrentStep(2)} onNext={handleSave} nextLabel={isSaving?(isEditMode?'更新中...':'保存中...'):(isEditMode?'更新する ✓':'保存する ✓')} nextColor="#16a34a" disabled={isSaving} />
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
        // 月の合計 ＝ 1日ぶんの原価の合計（金属売上は引かない・その日の経費は入れる）
        const monthCost = monthReports.reduce((sum, r) => sum + calcReportDayMoney(r).cost, 0);
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
            <span style={{fontSize:15,fontWeight:700,color:"#fff"}}>{report.date}</span>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.6)"}}>({getDayOfWeek(report.date)})</span>
            
            {/* 記入者＋更新日時 */}
            <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontFamily:'monospace', background:'#E8E8E8', border:'none', padding:'2px 7px', borderRadius:99, color:'#555' }}>
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
              // 日計 ＝ その日の原価（金属売上は引かない・その日の経費は入れる）
              const totalCost = calcReportDayMoney(report).cost;
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
                  <p style={{fontSize:11,fontWeight:700,color:"#1D4ED8",marginBottom:6}}>自社人工: {report.workDetails.inHouseWorkers.reduce((sum, w) => sum + getInHouseWorkerCount(w), 0)}人</p>
                  {report.workDetails.inHouseWorkers.map((w, idx) => (
                    <p key={idx} style={{fontSize:12,color:"#333",marginLeft:8,marginBottom:4}}>• {w.name} <span style={{color:"#999"}}>{w.start||w.startTime}-{w.end||w.endTime}</span> <span style={{color:"#999"}}>{getInHouseWorkerCount(w)}人</span> <span style={{color:"#B45309",fontWeight:600}}>¥{formatCurrency(w.amount)}</span></p>
                  ))}
                </div>
              )}
              {report.workDetails.outsourcingLabor?.length > 0 && (
                <div style={{marginBottom:10,borderRadius:8,padding:"10px 12px",background:"#F0F0F0"}}>
                  <p style={{fontSize:11,fontWeight:700,color:"#0369A1",marginBottom:6}}>外注人工: {report.workDetails.outsourcingLabor.reduce((sum, o) => sum + getOutsourcingCount(o), 0)}人</p>
                  {report.workDetails.outsourcingLabor.map((o, idx) => (
                    <p key={idx} style={{fontSize:12,color:"#333",marginLeft:8,marginBottom:4}}>• {o.company} <span style={{color:"#999"}}>{getOutsourcingCount(o)}人</span> <span style={{color:"#B45309",fontWeight:600}}>¥{formatCurrency(o.amount)}</span></p>
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
          {/* 写真・メモ表示 */}
          {(report.photoUrls?.length > 0 || report.memo) && (
            <div style={{marginBottom:10}}>
              {report.photoUrls?.length > 0 && (
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.1em',marginBottom:6}}>現場写真</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
                    {report.photoUrls.map((url,i)=>(
                      <div key={i} style={{aspectRatio:'1',borderRadius:8,overflow:'hidden',border:'0.5px solid #E8E8E8'}}>
                        <img src={url} alt={`写真${i+1}`} style={{width:'100%',height:'100%',objectFit:'cover',cursor:'pointer'}} onClick={()=>window.open(url,'_blank')}/>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {report.memo && (
                <div style={{padding:'8px 12px',background:'#F8FAFC',borderRadius:10,border:'0.5px solid #E8E8E8'}}>
                  <div style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.1em',marginBottom:4}}>メモ</div>
                  <div style={{fontSize:12,color:'#555',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{report.memo}</div>
                </div>
              )}
            </div>
          )}
          {report.wasteItems?.length > 0 && (
            <div className="mb-4 rounded p-2" style={{ background: '#2D2D2D' }}>
              {(() => {
                const disposalItems = report.wasteItems.filter(w => (w.amount||0) > 0 && !w.isScrap && w.manifestNumber !== '-' && w.kind !== 'scrap');
                const disposalTotal = disposalItems.reduce((s,w) => s + (w.amount||0), 0);
                return (
                  <p className="text-xs font-semibold text-red-400 mb-2">廃棄物: {disposalItems.length}件 / ¥{formatCurrency(disposalTotal)}</p>
                );
              })()}
              {report.wasteItems.map((waste, idx) => (
                <div key={idx} className="text-sm text-gray-300 ml-3 mb-1">
                  <p>• {waste.material} <span className="text-gray-500">{waste.quantity}{waste.unit}</span> - {waste.disposalSite}</p>
                  {waste.haisha==='env' && (
                    <div style={{display:'flex',alignItems:'center',gap:5,marginTop:4,padding:'3px 8px',borderRadius:6,background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.15)',width:'fit-content'}}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                      <span style={{fontSize:10,fontWeight:700,color:'#4ade80',fontFamily:'monospace'}}>環境課配車 / {waste.driver}{waste.vType?` ${waste.vType}(${waste.vNumber})`:''} {waste.haishiShift==='day'?'昼':'夜'} {(waste.haishiAmount||0) > 0 ? `¥${formatCurrency(waste.haishiAmount||0)}` : <span style={{background:'rgba(34,197,94,0.2)',color:'#86efac',padding:'1px 6px',borderRadius:10,fontSize:9,fontWeight:700,marginLeft:2}}>計上済み</span>}</span>
                    </div>
                  )}
                  {waste.haisha==='ext' && (
                    <div style={{display:'flex',alignItems:'center',gap:5,marginTop:4,padding:'3px 8px',borderRadius:6,background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.15)',width:'fit-content'}}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                      <span style={{fontSize:10,fontWeight:700,color:'#a5b4fc',fontFamily:'monospace'}}>ワイエム配車 {waste.haishiShift==='day'?'昼':waste.haishiShift==='night'?'夜':'例外'} {(waste.haishiAmount||0) > 0 ? `¥${formatCurrency(waste.haishiAmount||0)}` : <span style={{background:'rgba(165,180,252,0.25)',color:'#c4b5fd',padding:'1px 6px',borderRadius:10,fontSize:9,fontWeight:700,marginLeft:2}}>計上済み</span>}</span>
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
              background:projectInfo.status==='完了'?'rgba(37,99,235,0.2)':'rgba(34,197,94,0.2)',
              color:projectInfo.status==='完了'?'#93C5FD':'#4ade80'
            }}>{projectInfo.status}</span>
          )}
        </div>
      )}
      <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:10,border:'0.5px solid #E8E8E8',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
        <div style={{fontSize:9,fontWeight:700,color:'#1E3A5F',letterSpacing:'.1em',marginBottom:12}}>基本情報</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[['発注者','CLIENT',projectInfo.client],['現場住所','LOCATION',projectInfo.workLocation],['営業担当','SALES',projectInfo.salesPerson],['現場責任者','MANAGER',projectInfo.siteManager]].map(([ja,en,val])=>(
            <div key={ja}><p style={{fontSize:9,color:'#1E3A5F',fontWeight:700,letterSpacing:'.08em',marginBottom:2}}>{ja} / {en}</p>
              {ja==='現場住所' && val ? (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val)}`} target="_blank" rel="noopener noreferrer"
                  style={{fontSize:14,fontWeight:500,color:'#2563EB',textDecoration:'none',display:'flex',alignItems:'center',gap:4}}>
                  {val}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              ) : <p style={{fontSize:14,fontWeight:500,color:'#111'}}>{val||'-'}</p>}
            </div>
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

// ========== 予想と実績（原価分析の「予想と実績」タブ） ==========
// 予想＝project_info.forecast（受注時に原価メモの数字を、設定・編集の「予想（原価メモ）」で入れる）
// 実績＝calcSiteMoney の値をそのまま使う（ここで足し直さない）
// 判定と項目分けの関数は画面とは別にしてある（管理画面の月の一覧でも使う）
const fcNum = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const toMan = (yen) => Math.round(fcNum(yen) / 10000); // 円 → 万円（四捨五入）
const toSen = (yen) => Math.round(fcNum(yen) / 1000);   // 円 → 千円（四捨五入）。予想と実績の原価は千円単位で比べる
const toYenInt = (yen) => Math.round(fcNum(yen));        // 円の整数（11/18 予想と実績は原価メモに合わせて円で見せる）

// forecast（jsonb）を読む。空、または原価合計も人工も0なら null（＝予想なし）
// 形：{ men, days, laborCost, subconExpense（外注経費）, vehicle, disposal, other, otherSubcon（その他外注費）, introFee（紹介料）,
//        metal（金属売上の見込み・プラス・原価に入れない）, total, note, source, updatedAt }
// subconExpense・otherSubcon の無い前の予想は 0 として読む
function readForecast(raw) {
  let f = raw;
  if (typeof f === 'string') { try { f = JSON.parse(f); } catch { return null; } }
  if (!f || typeof f !== 'object' || Array.isArray(f)) return null;
  const laborCost = fcNum(f.laborCost), subconExpense = fcNum(f.subconExpense), vehicle = fcNum(f.vehicle), haisha = fcNum(f.haisha), disposal = fcNum(f.disposal);
  const other = fcNum(f.other), otherSubcon = fcNum(f.otherSubcon), introFee = fcNum(f.introFee);
  const total = f.total != null && f.total !== '' ? fcNum(f.total) : laborCost + subconExpense + vehicle + haisha + disposal + other + otherSubcon + introFee;
  const menDay = fcNum(f.menDay), menNight = fcNum(f.menNight);
  const men = f.men != null && f.men !== '' ? fcNum(f.men) : menDay + menNight;
  if (total === 0 && men === 0) return null;
  return {
    men, menDay, menNight, hasShift: menDay + menNight > 0, days: fcNum(f.days), laborCost, subconExpense, vehicle, haisha, disposal, other, otherSubcon, introFee,
    extra: fcNum(f.extra), metal: fcNum(f.metal), total,
    note: f.note ? String(f.note) : '', source: f.source ? String(f.source) : '', updatedAt: f.updatedAt ? String(f.updatedAt) : '',
  };
}

// 実績の原価を項目に分ける（calcSiteMoney の内訳をまとめ直すだけなので、項目の合計＝calcSiteMoney の原価）
// ここに無い日報の内訳（重機・その日の経費）と、案件の分（回送費・リース費・資材費・直接原価・案件の経費）は、まず「その他経費」に入れ、
// その日の経費と直接原価のうち、区分が「外注」の行は外注経費、「その他外注」の行はその他外注費へ移す（区分の無い行は名前で決める）
const ACTUAL_COST_GROUP = {
  inHouse: 'laborCost', outsourcing: 'laborCost',                                                       // 自社人工・外注人工
  vehicle: 'vehicle',                                                                                    // 車両（道具車・自社運搬の車両費）
  haishi: 'haisha', envItems: 'haisha', extItems: 'haisha', transport: 'haisha',                       // 配車（産廃の配車費・環境課配車・外部運搬・旧形式）
  disposal: 'disposal',                                                                                  // 処分費（プラスの行）
};
// 区分 → 移す先（「自社」はその他経費のまま）
const COST_KUBUN_GROUP = { '外注': 'subconExpense', 'その他外注': 'otherSubcon' };
// 紹介元の現場では、案件の直接原価のうち紹介料の行（isIntroFeeItem）を、区分より先に introFee に分ける
// （日報の経費と直接原価の一覧は calcSiteMoney と同じものを同じ数え方（toYen）で使うので、項目の合計＝calcSiteMoney の原価のまま）
function splitActualCost(money, reports, projectInfo) {
  const out = { men: 0, menDay: 0, menNight: 0, laborCost: 0, subconExpense: 0, vehicle: 0, haisha: 0, disposal: 0, other: 0, otherSubcon: 0, introFee: 0, total: money?.cost || 0 };
  Object.entries(money?.reportParts || {}).forEach(([k, v]) => { out[ACTUAL_COST_GROUP[k] || 'other'] += v || 0; });
  Object.values(money?.projectParts || {}).forEach(v => { out.other += v || 0; });
  // その他経費から、ほかの項目へ移す
  const moveFromOther = (to, amount) => { if (!to || !amount) return; out[to] += amount; out.other -= amount; };
  (reports || []).forEach(r => {
    const list = r?.workDetails?.dailyExpenses;
    (Array.isArray(list) ? list : []).forEach(e => moveFromOther(COST_KUBUN_GROUP[costKubunOf(e)], toYen(e?.amount)));
  });
  const pi = projectInfo || {};
  const items = pi.miscItems || [...(pi.outsourcingItems || []), ...(pi.siteExpenseItems || []), ...(pi.sgaItems || [])];
  (Array.isArray(items) ? items : []).forEach(it => {
    if (isIntroFeeItem(it?.name, pi.client)) moveFromOther('introFee', toYen(it?.amount));
    else moveFromOther(COST_KUBUN_GROUP[costKubunOf(it)], toYen(it?.amount));
  });
  // 人工（人）は日報から数える（ホーム画面の人工数と同じ数え方）
  // 昼・夜は日報の shift で分ける（nighttime・nightLoading など night で始まるものが夜）
  const isNight = (x) => String(x?.shift || '').startsWith('night');
  (reports || []).forEach(r => {
    (r.workDetails?.inHouseWorkers || []).forEach(w => { const n = getInHouseWorkerCount(w); out.men += n; out[isNight(w) ? 'menNight' : 'menDay'] += n; });
    (r.workDetails?.outsourcingLabor || []).forEach(o => { const n = getOutsourcingCount(o); out.men += n; out[isNight(o) ? 'menNight' : 'menDay'] += n; });
  });
  return out;
}

// 判定：'ok'＝◎・'mid'＝○・'ng'＝×（多くても少なくても、ずれの大きさだけで決める）
// 金額は万円に丸めて比べる。万円で同じなら◎、予想0万で実績ありは×。
// ずれ ±5%以内◎・±15%以内○。割り算をせず整数で比べる（±5%ちょうど・±15%ちょうどで判定がぶれないように）
function gradeForecastYen(forecastYen, actualYen) {
  const f = toSen(forecastYen), a = toSen(actualYen);
  if (f === a) return 'ok';
  if (f === 0) return 'ng';
  const gap = Math.abs(a - f) * 100, base = Math.abs(f);
  return gap <= 5 * base ? 'ok' : gap <= 15 * base ? 'mid' : 'ng';
}
// 人工は ±1人◎・±3人○
function gradeForecastMen(forecastMen, actualMen) {
  const gap = Math.round(Math.abs(fcNum(actualMen) - fcNum(forecastMen)) * 100) / 100;
  return gap <= 1 ? 'ok' : gap <= 3 ? 'mid' : 'ng';
}
// 原価合計のずれ（％、万円に丸めた値で、小数1桁に四捨五入）。予想が0万なら null
// 境目だけは、見せる数字と判定が食い違わないようにする（5.04% は「5.0%」でなく「5.1%」と出す。判定は○のため）
function forecastGapPercent(forecastYen, actualYen) {
  const f = toSen(forecastYen), a = toSen(actualYen);
  if (f === 0) return null;
  const pct = (a - f) / Math.abs(f) * 100;
  const grade = gradeForecastYen(forecastYen, actualYen);
  let shown = Math.round(Math.abs(pct) * 10) / 10;
  if (grade !== 'ok' && shown <= 5) shown = 5.1;
  if (grade === 'ng' && shown <= 15) shown = 15.1;
  return Math.sign(pct) * shown;
}
const FORECAST_MARK = { ok: '◎', mid: '○', ng: '×' };

// 1現場の予想と実績を並べる。予想なしなら null
// money＝calcSiteMoney の戻り値（projectInfo で数えたもの）、reports＝その現場の日報、projectInfo＝案件情報（見積金額＝予想の工事売上）
function buildForecastComparison(forecastRaw, money, reports, projectInfo) {
  const forecast = readForecast(forecastRaw);
  if (!forecast) return null;
  const actual = splitActualCost(money, reports, projectInfo);
  const contractAmount = projectInfo?.contractAmount;
  // 金額は円（#,##0）。原価メモと同じ。◎○×は千円単位で比べる。並びは原価メモの費目と同じ
  const yenRow = (key, label) => ({ key, label, decimals: 0, forecast: toYenInt(forecast[key]), actual: toYenInt(actual[key]), grade: gradeForecastYen(forecast[key], actual[key]) });
  const menRow = (key, label, sub) => ({ key, label, sub, forecast: forecast[key], actual: actual[key], grade: gradeForecastMen(forecast[key], actual[key]) });
  const costRows = [
    // 人工の人数：予想に昼・夜があれば 昼・夜・計 の3行、なければ計だけ
    ...(forecast.hasShift ? [menRow('menDay', '人工 昼（人）', true), menRow('menNight', '人工 夜（人）', true), menRow('men', '人工 計（人）', true)]
                          : [menRow('men', '人工（人）')]),
    yenRow('laborCost', '人工（円）'),
    yenRow('subconExpense', '外注経費（円）'),
    yenRow('vehicle', '車両（道具車）（円）'),
    yenRow('haisha', '配車（円）'),
    yenRow('disposal', '処分（円）'),
    yenRow('other', 'その他経費（円）'),
    yenRow('otherSubcon', 'その他外注費（円）'),
  ];
  // 紹介料の行：名前は発注者名（「紹介料」とは出さない）。予想も実績も0なら出さない
  if (forecast.introFee || actual.introFee) costRows.push(yenRow('introFee', `${cleanClientName(projectInfo?.client) || '発注者'}（円）`));
  const extra = forecast.extra ? toYenInt(forecast.extra) : null; // 別途（参考・合計外）。予想だけ
  const total = { ...yenRow('total', '原価合計（円）'), forecastYen: forecast.total, actualYen: actual.total, pct: forecastGapPercent(forecast.total, actual.total) };
  const isProvisional = !!money?.isProvisional;
  const forecastRevenue = fcNum(contractAmount);            // 予想の工事売上＝見積金額
  const forecastProfit = forecastRevenue - forecast.total;  // 予想の粗利＝見積金額 − 予想の原価合計
  const revenue = money?.revenue || 0;
  const salesRows = [
    { key: 'revenue', label: '工事売上（円）', forecast: toYenInt(forecastRevenue), actual: toYenInt(revenue), provisional: isProvisional },
    { key: 'grossProfit', label: '粗利（円）', forecast: toYenInt(forecastProfit), actual: toYenInt(money?.grossProfit), provisional: isProvisional },
    // 粗利率は財務タブと同じく小数1桁で見せる。工事売上が0なら出さない
    { key: 'grossMargin', label: '粗利率（％）', percent: true, provisional: isProvisional,
      forecast: forecastRevenue > 0 ? forecastProfit / forecastRevenue * 100 : null,
      actual: revenue > 0 ? (money?.grossMargin || 0) : null },
    { key: 'metal', label: '金属売上（円）', forecast: toYenInt(forecast.metal), actual: toYenInt(money?.metalRevenue), provisional: false },
  ];
  return { forecast, actual, costRows, total, extra, salesRows, isProvisional };
}

// 色は管理画面の試作（120fde5）と同じ。色だけでなく ◎○× も必ず出す
const FORECAST_COLORS = {
  ok: { badge: '#16a34a', badgeText: '#fff', soft: 'rgba(22,163,74,.18)', text: '#4ade80' },
  mid: { badge: '#f59e0b', badgeText: '#111', soft: 'rgba(245,158,11,.18)', text: '#fbbf24' },
  ng: { badge: '#e11d48', badgeText: '#fff', soft: 'rgba(225,29,72,.2)', text: '#fb7185' },
};
const signedNum = (n, decimals = 0) => {
  const r = decimals ? Number(n.toFixed(decimals)) : Math.round(n);
  return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toLocaleString('ja-JP', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

function ForecastActualTab({ comparison: c }) {
  const card = { background: '#121212', border: '1px solid #262626', borderRadius: 12, padding: '12px 12px', marginBottom: 12, color: '#EDEDED' };
  const title = { fontSize: 12, color: '#999', marginBottom: 8 };
  if (!c) {
    return <div style={{ ...card, color: '#bbb', fontSize: 13, padding: '16px 14px' }}>この現場はまだ予想が入っていません（1日仕事など）</div>;
  }
  // 見出しは折り返さない（発注者名の長い行があっても「予想」「実績」が1字ずつに折れないように）
  const head = { fontWeight: 400, color: '#777', fontSize: 11, textAlign: 'right', padding: '2px 2px 4px', whiteSpace: 'nowrap' };
  const cell = { padding: '5px 2px', textAlign: 'right', fontSize: 14, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
  const labelCell = { ...cell, textAlign: 'left', fontSize: 12, color: '#bbb', whiteSpace: 'normal' };
  const line = { borderTop: '1px solid #2c2c2c', paddingTop: 8 };
  const num = (v, decimals = 0) => v == null ? '—' : Number(v).toLocaleString('ja-JP', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const Diff = ({ grade, children }) => (
    <span style={{ fontWeight: 800, borderRadius: 6, padding: '1px 6px', fontSize: 13, background: FORECAST_COLORS[grade].soft, color: FORECAST_COLORS[grade].text, whiteSpace: 'nowrap' }}>
      {FORECAST_MARK[grade]} {children}
    </span>
  );
  const Head = () => (
    <thead><tr><th style={{ ...head, textAlign: 'left' }}>項目</th><th style={head}>予想</th><th style={head}>実績</th><th style={head}>差</th></tr></thead>
  );
  const t = c.total;
  const g = FORECAST_COLORS[t.grade];
  const word = t.forecast === t.actual ? 'ぴったり' : t.actual > t.forecast ? '実績が多かった' : '実績が少なかった';
  const legend = { padding: '2px 9px', borderRadius: 999, fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' };

  return (
    <>
      {/* 原価の当たり具合 */}
      <div style={card}>
        <div style={title}>原価の当たり具合</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: g.text, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {t.pct == null ? '—' : `${signedNum(t.pct, Number.isInteger(t.pct) ? 0 : 1)}%`}
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: g.badge, color: g.badgeText }}>
            {FORECAST_MARK[t.grade]} {word}
          </span>
        </div>
        <div style={{ fontSize: 14, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
          予想 {num(t.forecast)}円 → 実績 {num(t.actual)}円（{signedNum(t.actual - t.forecast)}円）
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
          <span style={{ ...legend, background: FORECAST_COLORS.ok.badge, color: FORECAST_COLORS.ok.badgeText }}>◎ ずれ ±5%以内</span>
          <span style={{ ...legend, background: FORECAST_COLORS.mid.badge, color: FORECAST_COLORS.mid.badgeText }}>○ ±15%以内</span>
          <span style={{ ...legend, background: FORECAST_COLORS.ng.badge, color: FORECAST_COLORS.ng.badgeText }}>× ±15%超</span>
          <span style={{ color: '#888', fontSize: 11 }}>（人工は ±1人◎・±3人○）</span>
        </div>
      </div>

      {/* 原価 */}
      <div style={card}>
        <div style={title}>原価</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <Head />
          <tbody>
            {c.costRows.map(r => {
              const decimals = r.decimals ?? (!(Number.isInteger(r.forecast) && Number.isInteger(r.actual)) ? 1 : 0);
              return (
                <tr key={r.key}>
                  <td style={r.sub ? { ...labelCell, paddingLeft: 10 } : labelCell}>{r.label}</td>
                  <td style={cell}>{num(r.forecast, decimals)}</td>
                  <td style={{ ...cell, fontWeight: 800 }}>{num(r.actual, decimals)}</td>
                  <td style={cell}><Diff grade={r.grade}>{signedNum(r.actual - r.forecast, decimals)}</Diff></td>
                </tr>
              );
            })}
            <tr>
              <td style={{ ...labelCell, ...line, color: '#EDEDED', fontWeight: 700 }}>{t.label}</td>
              <td style={{ ...cell, ...line }}>{num(t.forecast)}</td>
              <td style={{ ...cell, ...line, fontWeight: 800 }}>{num(t.actual)}</td>
              <td style={{ ...cell, ...line }}><Diff grade={t.grade}>{signedNum(t.actual - t.forecast)}</Diff></td>
            </tr>
            {c.extra != null && (
              <tr>
                <td style={{ ...labelCell, color: '#888' }}>別途（参考・合計外）</td>
                <td style={{ ...cell, color: '#888' }}>{num(c.extra)}</td>
                <td style={{ ...cell, color: '#666' }}>—</td>
                <td style={cell}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 売上と粗利（差に色は付けない） */}
      <div style={card}>
        <div style={title}>売上と粗利</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <Head />
          <tbody>
            {c.salesRows.map(r => {
              const decimals = r.percent ? 1 : 0;
              // 差は見せている数字どうしの差にする（粗利率は小数1桁にそろえてから引く）
              const f = r.forecast == null ? null : Number(r.forecast.toFixed(decimals));
              const a = r.actual == null ? null : Number(r.actual.toFixed(decimals));
              return (
                <tr key={r.key}>
                  <td style={labelCell}>{r.label}</td>
                  <td style={cell}>{num(f, decimals)}</td>
                  <td style={{ ...cell, fontWeight: 800 }}>
                    {num(a, decimals)}{r.provisional && <span style={{ fontSize: 10, fontWeight: 400, color: '#fbbf24' }}>（仮）</span>}
                  </td>
                  <td style={{ ...cell, color: '#bbb' }}>{f == null || a == null ? '—' : signedNum(a - f, decimals)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ fontSize: 11, color: '#888', marginTop: 8, lineHeight: 1.6 }}>予想の工事売上は見積金額。粗利 ＝ 工事売上 − 原価。金属売上は粗利に入れず、別に出します。</div>
      </div>

      {c.isProvisional && (
        <div style={{ marginBottom: 12, padding: '6px 10px', borderRadius: 8, fontSize: 12, lineHeight: 1.6, background: 'rgba(245,158,11,.15)', color: '#B45309', border: '1px solid rgba(245,158,11,.4)' }}>
          仮：請求金額が入ると、実績の工事売上と粗利が変わることがあります
        </div>
      )}

      <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7 }}>
        {c.forecast.note && <div>予想の元：{c.forecast.source || '原価メモ'}（{c.forecast.note}）</div>}
        <div>実績は日報と案件の経費から、財務タブの原価と同じ数え方で集計しています。</div>
      </div>
    </>
  );
}

// ========== 答え合わせ（予想と実績タブ。原価メモのある現場だけ） ==========
// 予想＝原価メモ（project_info.cost_memo）と予想（forecast）、答え＝日報。
// 答えは開くたびに日報から数える。何も保存しない（DB も変えない）。
// 費目は今の ForecastActualTab をそのまま出す（calcSiteMoney・buildForecastComparison の数え方は変えない）。
// 判定は今の予想と実績タブと同じ関数（金額＝gradeForecastYen、人工・日数・台数＝gradeForecastMen）。㎥ だけ gradeAnswerAmount。

// ■ 品目の対応表（日報の品目名 → 原価メモの廃棄物の行）
//   ・名前に下の言葉が入っていれば、そのグループ。全角・半角、大文字・小文字、空白の違いは見ない
//   ・長い言葉を先に見る（「ガラスパーティション」は「ガラス」より長い「パーティション」で PT。「ガラ陶」「ガラス」は「ガラ」より先）
//   ・同じ長さの言葉が2つ当たるときは、この表で上にあるグループを先にする
//     （例：「廃プラ(断熱材)」は「廃プラ」「断熱材」がどちらも3文字なので、上にある GW）
//   ・「(石綿)」は、石綿入りと書いた行（例：ガレキ(石綿)）を、ガレキより先に石綿にするための言葉
//   ・どこにも入らない名前は、その名前のまま1つのグループ（＝予想外の行）。ただしスクラップの行は「金属」に入れる
//   ・原価メモの行に match（言葉の配列）があれば、この表より先にそれを使う
//   ・言葉を足すときは、この表に足すだけでよい
const WASTE_GROUPS = [
  { group: 'PB', words: ['PB', '石膏ボード', '廃石膏ボード', '解体ボード', 'ボード'] },
  { group: 'GW', words: ['GW', 'グラスウール', '断熱材', 'ロックウール'] },
  { group: 'PT', words: ['PT', 'パーティション', 'パーテーション', 'パーテーシヨン'] },
  { group: 'ガラス', words: ['ガラス', 'ガラス陶磁器くず', 'ガラ陶'] },
  { group: '木くず', words: ['木くず', '木屑', 'きくず'] },
  { group: '混合', words: ['混合', '管理型混合', '安定型混合', '混合ボード入り', '混合ボード', 'ボード混合'] },
  { group: '廃プラ', words: ['廃プラ', '廃プラスチック', 'プラ'] },
  { group: '金属', words: ['金属', '金属くず', '鉄くず', '鉄', '雑線', 'LGS', 'スクラップ'] },
  { group: 'がれき', words: ['がれき', 'コンクリート', 'ガレキ', 'ガラ'] },
  { group: '繊維くず', words: ['繊維くず', '畳'] },
  { group: '石綿', words: ['石綿', 'アスベスト', '含有建材', '(石綿)'] },
  { group: 'OAフロア', words: ['OAフロア'] },
];
// スクラップの行で、表のどこにも入らない名前（エアコン・配線・名前なしなど）を入れるグループ
const WASTE_SCRAP_GROUP = '金属';

// 名前を比べる形にそろえる（全角・半角、大文字・小文字、空白の違いを見ない）
const wasteNameKey = (s) => String(s ?? '').normalize('NFKC').toUpperCase().replace(/\s+/g, '');
// 長い言葉が先。同じ長さなら表で上にあるグループが先
const WASTE_GROUP_WORDS = WASTE_GROUPS
  .flatMap((g, gi) => g.words.map(w => ({ key: wasteNameKey(w), group: g.group, gi })))
  .filter(w => w.key)
  .sort((a, b) => b.key.length - a.key.length || a.gi - b.gi);
// 品目名 → グループ名（どこにも入らなければ null）
const wasteGroupOf = (name) => {
  const k = wasteNameKey(name);
  return k ? (WASTE_GROUP_WORDS.find(w => k.includes(w.key))?.group || null) : null;
};

// 原価メモの文字から数を読む（"19"・"13.5"・"19.0万"・"3台" → 19・13.5・19・3）。読めなければ null
const answerMemoNum = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const m = String(v ?? '').normalize('NFKC').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};
// 原価メモの処分費 → 円。"19.0万" は万円、"83,900円" は円として読む
const answerMemoYen = (v) => {
  const n = answerMemoNum(v);
  if (n == null) return null;
  const s = String(v);
  if (/万/.test(s)) return n * 10000;           // 前の原価メモ（"19.0万"）
  if (/円/.test(s)) return n;                   // 11/18 からの原価メモ（"83,900円"）
  return Math.abs(n) >= 1000 ? n : n * 10000;   // 単位なし：1000以上は円、それより小さい数は前の万円として読む
};
const isM3Unit = (u) => ['M3', '立米'].includes(wasteNameKey(u)); // ㎥ は NFKC で m3 になる
const answerRound = (n) => Math.round((Number(n) || 0) * 100) / 100;
// 数の見せ方：16・4.5・2,260（小数は1桁まで）／55.0（いつも小数1桁）／38.5万
const ansNum = (n, d = 1) => (Math.round((Number(n) || 0) * 10 ** d) / 10 ** d).toLocaleString('ja-JP', { maximumFractionDigits: d });
const ansFixed1 = (n) => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ansYen = (yen) => `${Math.round(toYen(yen)).toLocaleString('ja-JP')}円`; // 11/18 答え合わせの金額も円（#,##0円）
const ansSigned = (n) => { const r = Math.round(n * 10) / 10; return signedNum(r, Number.isInteger(r) ? 0 : 1); };
const answerMonthDay = (date) => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(date || ''));
  return m ? `${Number(m[2])}/${Number(m[3])}` : String(date || '');
};
const answerDayLabel = (date) => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(date || ''));
  if (!m) return String(date || '');
  const wd = '日月火水木金土'[new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay()];
  return `${Number(m[2])}/${Number(m[3])}（${wd}）`;
};
// 処分先が同じか（「入間緑化」と「入間緑化開発」、「石坂」と「石坂(積保)」は同じとみなす）
const answerSameVendor = (a, b) => {
  const x = wasteNameKey(a), y = wasteNameKey(b);
  return !!x && !!y && (x.includes(y) || y.includes(x));
};
const SCRAP_DEST = 'スクラップ売却';
const isSaleDest = (dest) => /売却|スクラップ/.test(String(dest || ''));

// ㎥ の判定。金額と同じ決まり（±5%以内◎・±15%以内○・それより大きい×）を 0.1㎥ 単位で比べる
// 予想0で実績あり＝予想外、予想が書いていない・予想も実績も0＝「−」
function gradeAnswerAmount(p, a) {
  if (p == null) return 'none';
  const f = Math.round(p * 10), x = Math.round((a || 0) * 10);
  if (f === 0) return x === 0 ? 'none' : 'extra';
  if (f === x) return 'ok';
  const gap = Math.abs(x - f) * 100, base = Math.abs(f);
  return gap <= 5 * base ? 'ok' : gap <= 15 * base ? 'mid' : 'ng';
}
const ANSWER_MARK = { ...FORECAST_MARK, extra: '予想外', none: '−' };
const ANSWER_NONE_COLORS = { badge: '#3F3F46', badgeText: '#E5E7EB', soft: 'rgba(255,255,255,.08)', text: '#A1A1AA' };
const answerColors = (grade) => (grade === 'extra' ? FORECAST_COLORS.ng : FORECAST_COLORS[grade] || ANSWER_NONE_COLORS);

// 日報1件の廃棄物・スクラップの行を、答え合わせで使う形にそろえる
// （道具車だけの行と、車だけ入れた行（名前・数量・金額なし）は入れない）
// 産廃：㎥は unit が ㎥ なら quantity、それ以外は volumeM3（無ければ null＝㎥なし）。処分費＝プラスの金額
// スクラップ（isScrap・マイナスの金額・古い scrap_items）：㎥は volumeM3。売却額＝マイナスを外した額
function answerWasteRowsOf(report) {
  const rows = [];
  const m3Of = (item, scrap, qty) => {
    if (!scrap && isM3Unit(item.unit)) return qty;
    const v = parseFloat(item.volumeM3);
    if (Number.isFinite(v) && v > 0) return v;
    return scrap && isM3Unit(item.unit) ? qty : null;
  };
  (report?.wasteItems || []).forEach(w => {
    if (!w) return;
    const name = String(w.material ?? '').trim();
    const amount = toYen(w.amount), qty = parseFloat(w.quantity) || 0;
    if (w.isToolVehicle === true || w.kind === 'tool' || (name === '道具車' && !amount && !qty)) return;
    if (!name && !qty && !amount) return;
    const scrap = w.isScrap === true || amount < 0 || w.kind === 'scrap';
    rows.push({ name, scrap, qty, unit: String(w.unit || ''), m3: m3Of(w, scrap, qty), cost: Math.max(amount, 0), sale: Math.max(-amount, 0), site: String(w.disposalSite || '').trim(), date: report.date });
  });
  (report?.scrapItems || []).forEach(s => {
    if (!s) return;
    const qty = parseFloat(s.quantity) || 0;
    rows.push({ name: String(s.type ?? '').trim(), scrap: true, qty, unit: String(s.unit || ''), m3: m3Of(s, true, qty), cost: 0, sale: Math.abs(toYen(s.amount)), site: String(s.buyer || '').trim(), date: report.date });
  });
  return rows;
}

// 1行の数量の見せ方（産廃の㎥は数だけ。それ以外は「580kg・3.5㎥」「180kg・㎥なし」）
const answerQtyText = (e) => {
  if (isM3Unit(e.unit)) return e.scrap ? `${ansNum(e.qty)}㎥` : ansNum(e.qty);
  const base = `${ansNum(e.qty, 2)}${e.unit || ''}`;
  return e.m3 != null ? `${base}・${ansNum(e.m3)}㎥` : `${base}・㎥なし`;
};
// 実績の中身：「品目名 数量（月/日）」。同じ日の行は「＋」、日ちがいは「・」、品目名ちがいは「／」でつなぐ
// スクラップは買取先、産廃は処分先が原価メモと違うときだけ、日付の横に出す
function answerEntriesText(entries, dest) {
  const byName = new Map();
  entries.forEach(e => {
    const name = e.name || '（名前なし）';
    const note = e.scrap ? e.site : (dest && e.site && !answerSameVendor(e.site, dest) ? e.site : '');
    if (!byName.has(name)) byName.set(name, new Map());
    const days = byName.get(name);
    const k = `${e.date}|${note}`;
    if (!days.has(k)) days.set(k, { date: e.date, note, qtys: [] });
    days.get(k).qtys.push(answerQtyText(e));
  });
  return [...byName].map(([name, days]) => `${name} ${[...days.values()]
    .map(d => `${d.qtys.join('＋')}（${[answerMonthDay(d.date), d.note].filter(Boolean).join(' ')}）`).join('・')}`).join('／');
}

// 廃棄物の表：行は原価メモ waste.rows の順。日報の行は品目の対応表でグループにして、同じグループの行に入れる
// 原価メモに無いグループは、下に「（予想外）」の行として足す
function buildAnswerWaste(memo, reports) {
  const memoRows = memoList(memo?.waste?.rows).map((r, i) => {
    const name = memoText(r.name);
    return {
      i, name, extra: false, dest: memoText(r.dest),
      group: wasteGroupOf(name) || wasteNameKey(name),
      match: (Array.isArray(r.match) ? r.match : []).map(memoText).filter(Boolean),
      p: answerMemoNum(r.m3), pCost: answerMemoYen(r.cost), entries: [],
    };
  }).filter(r => r.name);
  const matchWords = memoRows
    .flatMap(r => r.match.map(w => ({ key: wasteNameKey(w), row: r })))
    .filter(x => x.key)
    .sort((a, b) => b.key.length - a.key.length || a.row.i - b.row.i);
  const rowByGroup = new Map();
  memoRows.forEach(r => { if (!rowByGroup.has(r.group)) rowByGroup.set(r.group, r); });
  const extras = new Map();
  const sorted = [...(reports || [])].filter(Boolean).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  sorted.forEach(rep => answerWasteRowsOf(rep).forEach(e => {
    const key = wasteNameKey(e.name);
    let target = key ? matchWords.find(x => key.includes(x.key))?.row : null;
    if (!target) {
      const tableGroup = wasteGroupOf(e.name);
      const group = tableGroup || (e.scrap ? WASTE_SCRAP_GROUP : (key || '（名前なし）'));
      target = rowByGroup.get(group);
      if (!target) {
        if (!extras.has(group)) {
          const shown = tableGroup || (e.scrap ? WASTE_SCRAP_GROUP : (e.name || '（名前なし）'));
          extras.set(group, { name: shown, extra: true, dest: '', group, p: null, pCost: null, entries: [] });
        }
        target = extras.get(group);
      }
    }
    target.entries.push(e);
  }));

  const rows = [...memoRows, ...extras.values()].map((r, idx) => {
    const ent = r.entries;
    const a = answerRound(ent.reduce((s, e) => s + (e.m3 || 0), 0));
    const cost = ent.reduce((s, e) => s + e.cost, 0);
    const sale = ent.reduce((s, e) => s + e.sale, 0);
    const hasScrap = ent.some(e => e.scrap);
    const sites = [...new Set(ent.map(e => (e.scrap ? SCRAP_DEST : (e.site || '（処分先なし）'))))];
    let destText;
    if (r.extra || !r.dest) destText = sites.join('・') || r.dest || '−';
    else if (!ent.length || sites.every(s => answerSameVendor(s, r.dest) || (s === SCRAP_DEST && isSaleDest(r.dest)))) destText = r.dest;
    else destText = `予想 ${r.dest}／実績 ${sites.join('・')}`;
    const merged = !r.extra && rowByGroup.get(r.group) !== r ? rowByGroup.get(r.group) : null;
    let src = ent.length ? answerEntriesText(ent, r.dest) : (merged ? `「${merged.name}」の行に入れた` : '日報に行なし');
    if (sale > 0) src += `　売上 ${ansYen(sale)}`;
    const grade = r.extra ? 'extra' : gradeAnswerAmount(r.p, a);
    return {
      key: `${r.extra ? 'x' : 'm'}${idx}`, name: r.extra ? `${r.name}（予想外）` : r.name, group: r.group, extra: r.extra,
      dest: destText, p: r.p, a, grade, diff: r.p == null && !r.extra ? '' : ansSigned(a - (r.p || 0)),
      pCost: r.pCost, pCostText: r.pCost != null ? `${ansYen(r.pCost)}` : (isSaleDest(r.dest) ? '売却' : '−'),
      cost, aCostText: cost === 0 && hasScrap ? '売却' : `${ansYen(cost)}`,
      src, noM3: ent.filter(e => e.m3 == null).map(e => `${e.name || '（名前なし）'}${ansNum(e.qty, 2)}${e.unit || ''}`),
    };
  });
  const pList = memoRows.filter(r => r.p != null);
  const totalP = pList.length ? answerRound(pList.reduce((s, r) => s + r.p, 0)) : null;
  const totalA = answerRound(rows.reduce((s, r) => s + r.a, 0));
  const pCosts = memoRows.filter(r => r.pCost != null);
  const total = {
    p: totalP, a: totalA, grade: gradeAnswerAmount(totalP, totalA), diff: totalP == null ? '' : ansSigned(totalA - totalP),
    pCost: pCosts.length ? pCosts.reduce((s, r) => s + r.pCost, 0) : null,
    cost: rows.reduce((s, r) => s + r.cost, 0),
  };
  const metalA = answerRound(rows.filter(r => r.group === '金属').reduce((s, r) => s + r.a, 0));
  return { rows, total, metalA, noM3: rows.flatMap(r => r.noM3) };
}

// 道具車：その日報で車両費を数える車（getReportVehicleCost と同じ決め方）
// 同じ車（車種＋車番）は1台。同じ担当者の2台目以降と、乗換の行は数えない。返り値は 車種＋車番 → 車種
function toolCarsOfReport(report) {
  const cars = new Map();
  (report?.workDetails?.vehicles || []).forEach(v => {
    if (!v || !v.type || v.isSwap === true) return;
    cars.set(`${v.type}|${v.number || ''}`, v.type);
  });
  const seenWorkers = new Set();
  [...(report?.wasteItems || []), ...(report?.scrapItems || [])].forEach(item => {
    if (!item || !item.workerVType) return;
    const worker = item.workerName || '';
    if (worker) {
      if (seenWorkers.has(worker)) return;
      seenWorkers.add(worker);
      if (item.isSwap === true) return;
    } else if (item.isSwap === true) return;
    cars.set(`${item.workerVType}|${item.workerVNumber || ''}`, item.workerVType);
  });
  return cars;
}
// 配車：その日に来た配車の台数（配車費を付けるときと同じ決め方。normalizeHaishiAmounts）
// 環境課配車は 運転者・車種・車番・昼夜 が同じ行を1台。ワイエム配車は同じマニフェストNo.を1台（無ければ車両と昼夜）、例外金額の行は1行1台
function haishaTripCount(items) {
  const slots = new Set(), manifests = new Set();
  let n = 0;
  (items || []).forEach(it => {
    if (!it) return;
    const kind = it.haisha || it.kind || '';
    if (kind !== 'env' && kind !== 'ext') return;
    const slot = `${kind}|${it.driver || ''}|${it.vType || ''}|${it.vNumber || ''}|${it.haishiShift || ''}`;
    const manifest = kind === 'ext' ? extManifestKey(it) : '';
    if (isHaishiOverrideItem(it)) {
      if (manifest) { if (manifests.has(manifest)) return; manifests.add(manifest); }
      n += 1;
      return;
    }
    if (manifest) {
      if (manifests.has(manifest)) return;
      manifests.add(manifest); slots.add(slot); n += 1;
      return;
    }
    if (slots.has(slot)) return;
    slots.add(slot); n += 1;
  });
  return n;
}

const isNightShift = (s) => s === 'nighttime' || s === 'nightLoading';
const answerTimeMin = (s) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(s || '').trim()); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const answerTimeText = (min) => (min === 1440 ? '24:00' : `${Math.floor((min % 1440) / 60)}:${String(min % 60).padStart(2, '0')}`);

// 日報を日ごとにまとめる（同じ日に日報が2件あれば1日にまとめる）
function buildAnswerDays(reports) {
  const byDate = new Map();
  [...(reports || [])].filter(r => r && r.date)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach(r => { if (!byDate.has(r.date)) byDate.set(r.date, []); byDate.get(r.date).push(r); });
  return [...byDate].map(([date, reps]) => {
    const inHouse = reps.flatMap(r => r.workDetails?.inHouseWorkers || []).filter(Boolean);
    const outs = reps.flatMap(r => r.workDetails?.outsourcingLabor || []).filter(Boolean);
    const companies = new Map();
    outs.forEach(o => { const c = String(o.company || '外注').trim() || '外注'; companies.set(c, (companies.get(c) || 0) + getOutsourcingCount(o)); });
    const loading = inHouse.filter(w => w.shift === 'nightLoading').reduce((s, w) => s + getInHouseWorkerCount(w), 0);
    const self = inHouse.filter(w => w.shift !== 'nightLoading').reduce((s, w) => s + getInHouseWorkerCount(w), 0);
    const outMen = [...companies.values()].reduce((s, n) => s + n, 0);
    const shifts = [...inHouse, ...outs].map(w => w.shift).filter(Boolean);
    const night = shifts.some(isNightShift), day = shifts.some(s => !isNightShift(s));
    // 開始〜終了：自社と外注のいちばん早い開始〜いちばん遅い終了（終了が開始より前なら次の日）
    const spans = [...inHouse, ...outs].map(w => {
      const s = answerTimeMin(w.start), e = answerTimeMin(w.end);
      return s == null || e == null ? null : { s, e: e <= s ? e + 1440 : e };
    }).filter(Boolean);
    const time = spans.length ? `${answerTimeText(Math.min(...spans.map(x => x.s)))}〜${answerTimeText(Math.max(...spans.map(x => x.e)))}` : '';
    const cars = new Map();
    reps.forEach(r => toolCarsOfReport(r).forEach((type, k) => cars.set(k, type)));
    const waste = reps.flatMap(answerWasteRowsOf);
    return {
      date, label: answerDayLabel(date),
      shift: night && day ? '昼夜' : night ? '夜' : day ? '昼' : '',
      men: self + loading + outMen,
      menParts: [...[...companies].map(([c, n]) => `${c} ${ansNum(n)}`), self ? `自社 ${ansNum(self)}` : '', loading ? `自社積込 ${ansNum(loading)}` : ''].filter(Boolean),
      time,
      work: reps.map(r => String(r.workDetails?.workContent || '').trim()).filter(Boolean).join('／'),
      waste, toolCars: cars.size, toolTypes: [...new Set(cars.values())],
      haisha: haishaTripCount(reps.flatMap(r => r.wasteItems || [])),
    };
  });
}

// 原価メモ・予想・日報から、答え合わせの画面に出すものを作る（数えるだけ。何も保存しない）
// comparison＝buildForecastComparison の結果（予想なしなら null）、money＝calcSiteMoney の結果
function buildAnswerCheck(memo, comparison, reports, money, projectInfo) {
  const list = Array.isArray(reports) ? reports : [];
  const forecast = comparison?.forecast || null;
  const actual = comparison?.actual || splitActualCost(money, list, projectInfo);
  const days = buildAnswerDays(list);
  const waste = buildAnswerWaste(memo, list);
  const plan = memoList(memo?.schedule).map(r => ({
    day: memoText(r.day), shift: memoText(r.shift), people: memoText(r.people), work: memoText(r.work),
    days: answerMemoNum(r.days), men: answerMemoNum(r.men), m3: answerMemoNum(r.m3), m3Text: memoText(r.m3),
    trucks: memoText(r.trucks), items: memoText(r.items),
  })).filter(r => r.day || r.work || r.people || r.m3Text || r.items);
  // 予定の日数：schedule の行の数（days が書いてあれば、その合計）
  const planDays = plan.length ? plan.reduce((s, r) => s + (r.days > 0 ? r.days : 1), 0) : null;
  const summaryList = memoList(memo?.summary);
  const daySummary = summaryList.find(s => memoText(s.label) === '人数・想定日数') || summaryList.find(s => /日数/.test(memoText(s.label)));
  const fmtMen = (n) => `${ansNum(n)}人工`;

  // ① 人数・日数
  const daysPred = daySummary ? [memoText(daySummary.value), memoText(daySummary.strong)].filter(Boolean).join('　') : '';
  const card1 = {
    key: 'days', label: '人数・日数',
    pred: daysPred || (planDays != null ? `${ansNum(planDays)}日` : null),
    act: `${days.length}日`,
    grade: planDays != null ? gradeForecastMen(planDays, days.length) : 'none',
    sub: days.length ? `${days.map(d => ansNum(d.men)).join('・')}人` : '日報なし',
  };
  // ② 合計人工（実績＝今の予想と実績タブと同じ数）
  const companies = new Map();
  let selfMen = 0;
  list.forEach(r => {
    (r.workDetails?.outsourcingLabor || []).forEach(o => { if (!o) return; const c = String(o.company || '外注').trim() || '外注'; companies.set(c, (companies.get(c) || 0) + getOutsourcingCount(o)); });
    (r.workDetails?.inHouseWorkers || []).forEach(w => { if (w) selfMen += getInHouseWorkerCount(w); });
  });
  const outMen = [...companies.values()].reduce((s, n) => s + n, 0);
  const card2 = {
    key: 'men', label: '合計人工',
    pred: forecast ? fmtMen(forecast.men) : null,
    act: fmtMen(actual.men),
    grade: forecast ? gradeForecastMen(forecast.men, actual.men) : 'none',
    sub: [outMen ? `外注${ansNum(outMen)}（${[...companies.keys()].join('・')}）` : '', selfMen ? `自社${ansNum(selfMen)}` : ''].filter(Boolean).join('＋'),
  };
  // ③ 廃棄物㎥
  const wasteSub = [
    waste.metalA ? `処分${ansFixed1(waste.total.a - waste.metalA)}㎥＋金属${ansFixed1(waste.metalA)}㎥` : '',
    waste.noM3.length ? `（${waste.noM3.join('・')}は㎥なし）` : '',
  ].join('');
  const card3 = {
    key: 'waste', label: '廃棄物',
    pred: waste.total.p != null ? `${ansFixed1(waste.total.p)}㎥` : null,
    act: `${ansFixed1(waste.total.a)}㎥`,
    grade: waste.total.grade,
    sub: wasteSub,
  };
  // ④ 処分費（実績＝今の予想と実績タブの「処分」と同じ数）
  const card4 = {
    key: 'disposal', label: '処分費',
    pred: forecast ? `${ansYen(forecast.disposal)}` : null,
    act: `${ansYen(actual.disposal)}`,
    grade: forecast ? gradeForecastYen(forecast.disposal, actual.disposal) : 'none',
    sub: '',
  };
  // ⑤ 搬出車（道具車は台×日。予想は原価メモの check）
  const check = isPlainObject(memo?.check) ? memo.check : null;
  const pTool = answerMemoNum(check?.toolCarDays), pHaisha = answerMemoNum(check?.haisha);
  const hasCheck = pTool != null || pHaisha != null;
  const aTool = days.reduce((s, d) => s + d.toolCars, 0), aHaisha = days.reduce((s, d) => s + d.haisha, 0);
  const card5 = {
    key: 'trucks', label: '搬出車',
    pred: hasCheck ? `道具車${pTool != null ? ansNum(pTool) : '−'}日・配車${pHaisha != null ? ansNum(pHaisha) : '−'}台` : null,
    act: `道具車${aTool}日・配車${aHaisha}台`,
    grade: hasCheck ? gradeForecastMen((pTool || 0) + (pHaisha || 0), aTool + aHaisha) : 'none',
    sub: '',
  };
  // ⑥ 原価・粗利（今の予想と実績タブと同じ数）
  const margin = comparison?.salesRows?.find(r => r.key === 'grossMargin');
  const revenue = money?.revenue || 0;
  const pct = (v) => (v == null ? '−' : `${(Math.round(v * 10) / 10).toFixed(1)}%`);
  const card6 = {
    key: 'cost', label: '原価・粗利',
    pred: forecast ? `${ansYen(forecast.total)}・粗利${pct(margin?.forecast)}` : null,
    act: `${ansYen(actual.total)}・粗利${pct(revenue > 0 ? money?.grossMargin || 0 : null)}${money?.isProvisional ? '（仮）' : ''}`,
    grade: forecast ? gradeForecastYen(forecast.total, actual.total) : 'none',
    sub: (money?.metalRevenue || 0) > 0 ? `金属売上${ansYen(money.metalRevenue)}は別` : '',
  };

  // 段取り：予定（schedule の1行）と日報（1日）を、早い順に横に並べる
  const pairs = Array.from({ length: Math.max(plan.length, days.length) }, (_, i) => ({ plan: plan[i] || null, day: days[i] || null }));
  const planMen = plan.some(r => r.men != null || (answerMemoNum(r.people) != null))
    ? plan.reduce((s, r) => s + (r.men != null ? r.men : (answerMemoNum(r.people) || 0) * (r.days > 0 ? r.days : 1)), 0) : null;
  const planM3 = plan.some(r => r.m3 != null) ? plan.reduce((s, r) => s + (r.m3 || 0), 0) : null;
  const planNight = plan.length > 0 && plan.every(r => /夜/.test(r.shift));
  const actualNight = days.length > 0 && days.every(d => d.shift === '夜');
  const planTotal = plan.length
    ? ['予定 ' + `${ansNum(planDays)}${planNight ? '夜' : '日'}`, planMen != null ? fmtMen(planMen) : '', planM3 != null ? `${ansFixed1(planM3)}㎥` : ''].filter(Boolean).join('・')
    : '予定 −';
  const actualTotal = ['実績 ' + `${days.length}${actualNight ? '夜' : '日'}`, fmtMen(actual.men), `${ansFixed1(waste.total.a)}㎥`].join('・');

  return {
    done: projectInfo?.status === '完了',
    cards: [card1, card2, card3, card4, card5, card6],
    waste, pairs, planTotal, actualTotal,
    menActual: actual.men, days, // 工種と人工（割り振り）で使う：日報の合計人工（概要②と同じ数）と、日ごとの施工内容
  };
}

// 表（狭い画面では表の中で横にずらす。右に続きがあるあいだは下に案内を出す）
function AnswerTable({ id, cols, children }) {
  const ref = useRef(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const check = () => setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
    if (ro) ro.observe(el);
    return () => { el.removeEventListener('scroll', check); if (ro) ro.disconnect(); };
  }, []);
  return (
    <>
      {/* 幅0＋最小幅100%：表の幅（minWidth）で、外の原価分析のページが広がらないようにする */}
      <div ref={ref} id={id} className="answer-table" style={{ overflowX: 'auto', width: 0, minWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
        {/* 列の幅は cols で決め打ち（中身の長い列につられて、左の列が広がらないように） */}
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: cols.reduce((s, x) => s + x, 0), minWidth: '100%' }}>
          <colgroup>{cols.map((x, i) => <col key={i} style={{ width: x }} />)}</colgroup>
          {children}
        </table>
      </div>
      {more && <div className="answer-more" style={{ marginTop: 6, fontSize: 10.5, color: '#888', textAlign: 'right' }}>右に続きがあります（表を横にずらす）→</div>}
    </>
  );
}

const ANSWER_CARD = { background: '#121212', border: '1px solid #262626', borderRadius: 12, padding: '12px 12px', marginBottom: 12, color: '#EDEDED' };
const ANSWER_TITLE = { fontSize: 12, color: '#999', marginBottom: 8 };

// ◎○×・予想外・− の札（色は今の予想と実績タブのもの）
function AnswerMark({ grade, solid = false, children }) {
  const c = answerColors(grade);
  return (
    <span data-grade={grade} style={{ fontWeight: 800, borderRadius: solid ? 999 : 6, padding: solid ? '2px 9px' : '1px 6px', fontSize: 12, whiteSpace: 'nowrap',
      background: solid ? c.badge : c.soft, color: solid ? c.badgeText : c.text }}>
      {ANSWER_MARK[grade]}{children != null && children !== '' ? ` ${children}` : ''}
    </span>
  );
}

// 実績人工の入力：空＝未入力（null）。0 以上で 0.5 刻みの数だけ受け付ける（それ以外は NaN）
const parseAllocMen = (text) => {
  const s = String(text ?? '').normalize('NFKC').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && Math.round(n * 2) === n * 2 ? n : NaN;
};
const allocMenText = (v) => (v == null || v === '' ? '' : String(v));

// 5. 工種と人工（実績人工の割り振り）と 6. 気づき・反映候補。保存するのは割り振り・チェック・確認済みだけ
// ac＝DB の answer_check（projectInfo.answerCheck）、menActual＝日報の合計人工（概要②と同じ数）、days＝日報を日ごとにまとめたもの
// 保存は、直前に DB の answer_check を読み直し、この画面で触ったところだけを差し替えて書く（mergeAnswerCheck）
function AnswerWorkPanel({ memo, ac, menActual, days, siteName, userId, onSaved, leaveGuardRef }) {
  const base = readAnswerCheck(ac);
  const baseAlloc = isPlainObject(base.alloc) ? base.alloc : {};
  const draft = isPlainObject(base.draft) ? base.draft : {};
  const [rowEdits, setRowEdits] = useState({});       // 工種 → 入力欄の文字（触った行だけ）
  const [extraEdit, setExtraEdit] = useState(null);   // 予想に無い作業の一覧（触ったときだけ）
  const [checkedEdits, setCheckedEdits] = useState({}); // 気づきの id → true/false（触ったものだけ）
  const [showWork, setShowWork] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);       // { kind: 'ok' | 'warn' | 'error', text }

  const tasks = memoList(memo?.tasks?.rows)
    .map(r => ({ name: memoText(r.name), qty: memoText(r.qty), unit: memoText(r.unit), men: answerMemoNum(r.men) }))
    .filter(t => t.name);
  const baseRows = memoList(baseAlloc.rows);
  const baseMenOf = (task) => baseRows.find(r => memoText(r.task) === task)?.men;
  // 今の原価メモに無い工種の割り振り（原価メモを直したときなど）。消さずに出す
  const orphans = baseRows.map(r => memoText(r.task)).filter(t => t && !tasks.some(x => x.name === t));
  const draftAlloc = new Map(memoList(draft.alloc).map(r => [memoText(r.task), r]));
  const draftExtra = memoList(draft.extra);
  const notes = memoList(draft.notes);

  const rowText = (task) => (rowEdits[task] !== undefined ? rowEdits[task] : allocMenText(baseMenOf(task)));
  const baseExtra = memoList(baseAlloc.extra).map(e => ({ ...e, menText: allocMenText(e.men) }));
  const extraList = extraEdit ?? baseExtra;
  const isChecked = (id) => (checkedEdits[id] !== undefined ? checkedEdits[id] : !!(isPlainObject(base.checked) && base.checked[id]));
  const cleanExtra = (list) => list.map(({ menText, ...e }) => {
    const out = { ...e, name: String(e.name ?? '').trim() };
    const men = parseAllocMen(menText);
    if (men == null) delete out.men; else out.men = men;
    return out;
  }).filter(e => e.name || e.men != null);

  // 触ったところ（保存していない変更）
  const baseMenNum = (t) => { const v = baseMenOf(t); return v == null || v === '' ? null : Number(v); };
  const rowDirty = Object.keys(rowEdits).filter(t => parseAllocMen(rowEdits[t]) !== baseMenNum(t)); // 読めない数（NaN）も「変更あり」
  const extraDirty = !!extraEdit && JSON.stringify(canonJson(cleanExtra(extraEdit))) !== JSON.stringify(canonJson(cleanExtra(baseExtra)));
  const checkedDirty = Object.keys(checkedEdits).filter(id => checkedEdits[id] !== !!(isPlainObject(base.checked) && base.checked[id]));
  const dirty = rowDirty.length > 0 || extraDirty || checkedDirty.length > 0;

  // 画面を離れるとき（ページ・現場・タブの切り替え、ブラウザを閉じる）に「保存していません」
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  useEffect(() => {
    if (!leaveGuardRef) return undefined;
    leaveGuardRef.current = () => (dirtyRef.current ? '保存していません。\n工種と人工・気づきのチェックの変更が消えます。このまま移りますか？' : null);
    return () => { leaveGuardRef.current = null; };
  }, [leaveGuardRef]);
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  // 合計
  const allTaskNames = [...tasks.map(t => t.name), ...orphans];
  const invalid = [
    ...allTaskNames.filter(t => Number.isNaN(parseAllocMen(rowText(t)))),
    ...extraList.filter(e => Number.isNaN(parseAllocMen(e.menText))).map(e => String(e.name || '予想に無い作業')),
  ];
  const noName = extraList.some(e => !String(e.name ?? '').trim() && parseAllocMen(e.menText) != null);
  const sumOf = (arr) => answerRound(arr.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0));
  const predSum = sumOf(tasks.map(t => t.men));
  const allocSum = sumOf([...allTaskNames.map(t => parseAllocMen(rowText(t))), ...extraList.map(e => parseAllocMen(e.menText))]);
  const actualMen = answerRound(menActual || 0);
  const rest = answerRound(actualMen - allocSum);
  const restLine = Math.abs(rest) < 0.01
    ? { kind: 'ok', text: '割り振り完了（日報の合計と一致）' }
    : rest > 0 ? { kind: 'warn', text: `日報の合計 ${ansNum(actualMen)}人工のうち、あと ${ansNum(rest)}人工` }
    : { kind: 'over', text: `日報の合計より ${ansNum(-rest)}人工多い` };
  const restColor = { ok: '#4ade80', warn: '#fbbf24', over: '#fb7185' }[restLine.kind];

  // 下書きをそのまま使う：空の欄だけに下書きの数を入れる（入っている欄は変えない）。予想に無い作業の下書きは、まだ無い名前だけ足す
  const fillTasks = tasks.filter(t => !String(rowText(t.name)).trim() && draftAlloc.get(t.name)?.men != null && draftAlloc.get(t.name).men !== '');
  const fillExtra = draftExtra.filter(d => memoText(d.name) && !extraList.some(e => String(e.name ?? '').trim() === memoText(d.name)));
  const useDraft = () => {
    if (fillTasks.length) setRowEdits(prev => ({ ...prev, ...Object.fromEntries(fillTasks.map(t => [t.name, allocMenText(draftAlloc.get(t.name).men)])) }));
    if (fillExtra.length) setExtraEdit([...extraList, ...fillExtra.map(d => ({ name: memoText(d.name), menText: allocMenText(d.men) }))]);
    setMessage(null);
  };
  const setExtraAt = (i, patch) => setExtraEdit(extraList.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  // 保存（confirm：undefined＝保存、true＝確認済みにする、false＝確認を外す）
  const run = async (confirm) => {
    if (confirm !== false) {
      if (invalid.length) { setMessage({ kind: 'error', text: `実績人工は 0 以上・0.5 刻みの数で入れてください（${invalid.join('・')}）` }); return; }
      if (noName) { setMessage({ kind: 'error', text: '予想に無い作業の名前を入れてください' }); return; }
    }
    setSaving(true); setMessage(null);
    try {
      const latest = await fetchAnswerCheck(siteName);
      const edits = confirm === false ? { confirm } : {
        rows: new Map(rowDirty.map(t => [t, parseAllocMen(rowEdits[t])])),
        extra: extraDirty ? cleanExtra(extraEdit) : null,
        checked: new Map(checkedDirty.map(id => [id, checkedEdits[id]])),
        confirm,
      };
      const { next, changed } = mergeAnswerCheck(latest, edits, userId, jstIsoNow());
      const wasConfirmed = isPlainObject(readAnswerCheck(latest).confirmed);
      if (!changed && confirm === undefined) {
        onSaved(latest);
        setRowEdits({}); setExtraEdit(null); setCheckedEdits({});
        setMessage({ kind: 'ok', text: '変更はありませんでした（今の保存の中身を読み込みました）' });
        return;
      }
      const rows = await sb('project_info').updateOrThrow({ answer_check: next }, `site_name=eq.${encodeURIComponent(siteName)}`);
      if (!Array.isArray(rows) || rows.length === 0) throw new Error('この現場の案件情報（project_info）が見つかりません');
      onSaved(rows[0].answer_check ?? next);
      if (confirm !== false) { setRowEdits({}); setExtraEdit(null); setCheckedEdits({}); }
      setMessage({ kind: 'ok', text: confirm === true ? '確認済みにしました' : confirm === false ? '確認を外しました'
        : wasConfirmed ? '保存しました。確認済みを外しました（確認後に変更があります）' : '保存しました' });
    } catch (e) {
      setMessage({ kind: 'error', text: `保存できませんでした：${e?.message || e}` });
    } finally {
      setSaving(false);
    }
  };

  const confirmed = isPlainObject(base.confirmed) ? base.confirmed : null;
  const confirmedBefore = !confirmed && isPlainObject(base.confirmedBefore) ? base.confirmedBefore : null;
  const reflected = isPlainObject(base.reflected) ? base.reflected : null;
  const who = (o) => [loginDisplayName(o?.by), answerSavedLabel(o?.at)].filter(Boolean).join('・');

  const input = (invalidNow) => ({ width: '100%', boxSizing: 'border-box', padding: '5px 6px', borderRadius: 6, fontSize: 14, fontWeight: 700, textAlign: 'right', color: '#111', fontFamily: 'inherit',
    background: invalidNow ? '#FEE2E2' : '#FEF9C3', border: `1px solid ${invalidNow ? '#ef4444' : '#EAB308'}`, outline: 'none', fontVariantNumeric: 'tabular-nums' });
  const head = { fontWeight: 400, color: '#777', fontSize: 11, textAlign: 'right', padding: '2px 4px 6px', borderBottom: '1px solid #2c2c2c', verticalAlign: 'bottom' };
  const textHead = { ...head, textAlign: 'left' };
  const cell = { padding: '6px 4px', textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', borderBottom: '1px solid #222', verticalAlign: 'middle' };
  const textCell = { ...cell, textAlign: 'left', whiteSpace: 'normal', fontSize: 12, color: '#bbb', overflowWrap: 'anywhere' };
  const smallBtn = { padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minHeight: 36 };
  const msgColor = { ok: '#4ade80', warn: '#fbbf24', error: '#fb7185' };

  return (
    <>
      {/* 5. 工種と人工（実績人工の割り振り。黄色の欄） */}
      <div id="answer-alloc" style={ANSWER_CARD}>
        <div style={{ ...ANSWER_TITLE, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span>工種と人工</span>
          {(draftAlloc.size > 0 || draftExtra.length > 0) && (
            <button id="answer-draft-use" type="button" onClick={useDraft} disabled={!fillTasks.length && !fillExtra.length}
              style={{ ...smallBtn, minHeight: 32, padding: '5px 10px', background: 'transparent', color: fillTasks.length || fillExtra.length ? '#fbbf24' : '#666', border: `1px solid ${fillTasks.length || fillExtra.length ? 'rgba(251,191,36,.5)' : '#333'}`, cursor: fillTasks.length || fillExtra.length ? 'pointer' : 'default' }}>
              下書きをそのまま使う
            </button>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 8, lineHeight: 1.6 }}>黄色の欄に、日報の人工を工種ごとに割り振ります（0.5 刻み）。薄い字は Claude の下書きです。</div>
        {/* 日報の施工内容（たたんでおき、押すと開く） */}
        <button id="answer-work-toggle" type="button" aria-expanded={showWork} onClick={() => setShowWork(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', marginBottom: 8, background: '#1A1A1A', border: '1px solid #2C2C2C', borderRadius: 8, color: '#ddd', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
          <span>日報の施工内容（{days.length}日）</span><GradChevron open={showWork} size={14} />
        </button>
        {showWork && (
          <div id="answer-work-list" style={{ marginBottom: 10, padding: '6px 10px', background: '#1A1A1A', border: '1px solid #2C2C2C', borderRadius: 8 }}>
            {days.length === 0 && <div style={{ fontSize: 12, color: '#888' }}>日報がありません</div>}
            {days.map(d => (
              <div key={d.date} style={{ fontSize: 12, color: '#ccc', lineHeight: 1.6, padding: '3px 0', overflowWrap: 'anywhere' }}>
                <span style={{ color: '#fff', fontWeight: 700, marginRight: 6, fontVariantNumeric: 'tabular-nums' }}>{answerMonthDay(d.date)}</span>{d.work || '（施工内容なし）'}
              </div>
            ))}
          </div>
        )}
        {tasks.length === 0 && orphans.length === 0 && extraList.length === 0 ? (
          <div style={{ fontSize: 13, color: '#bbb', marginBottom: 8 }}>原価メモに工種がありません。「予想に無い作業を足す」で行を足せます</div>
        ) : (
          // 320px の画面でも、工種〜実績人工（黄色の欄）までが最初から見える幅
          <AnswerTable id="answer-alloc-table" cols={[96, 50, 44, 72, 210]}>
            <thead>
              <tr>
                <th style={textHead}>工種</th>
                <th style={head}>数量</th>
                <th style={head}>予想人工</th>
                <th style={head}>実績人工</th>
                <th style={textHead}>手がかり</th>
              </tr>
            </thead>
            <tbody>
              {[...tasks, ...orphans.map(name => ({ name, orphan: true }))].map(t => {
                const v = rowText(t.name);
                const bad = Number.isNaN(parseAllocMen(v));
                const d = draftAlloc.get(t.name);
                return (
                  <tr key={`t:${t.name}`} data-task={t.name}>
                    <td style={{ ...textCell, color: '#EDEDED', fontWeight: 700 }}>{t.name}</td>
                    <td style={cell}>{t.orphan ? '−' : [t.qty, t.unit].filter(Boolean).join('') || '−'}</td>
                    <td style={cell}>{t.men == null ? '−' : ansNum(t.men)}</td>
                    <td style={cell}>
                      <input type="text" inputMode="decimal" className="answer-alloc-input" aria-label={`${t.name} の実績人工`} value={v}
                        placeholder={d?.men != null && d.men !== '' ? allocMenText(d.men) : ''}
                        onChange={e => { const val = e.target.value; setRowEdits(prev => ({ ...prev, [t.name]: val })); setMessage(null); }}
                        style={input(bad)} />
                    </td>
                    <td style={textCell}>{t.orphan ? '今の原価メモに無い工種' : (memoText(d?.hint) || '−')}</td>
                  </tr>
                );
              })}
              {extraList.map((e, i) => {
                const bad = Number.isNaN(parseAllocMen(e.menText));
                const d = draftExtra.find(x => memoText(x.name) === String(e.name ?? '').trim());
                return (
                  <tr key={`x:${i}`} className="answer-extra-row">
                    {/* 名前の欄は 工種〜予想人工 の3列ぶん */}
                    <td style={textCell} colSpan={3}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input type="text" className="answer-extra-name" aria-label="予想に無い作業の名前" value={e.name ?? ''} placeholder="作業の名前"
                          onChange={ev => { setExtraAt(i, { name: ev.target.value }); setMessage(null); }}
                          style={{ ...input(false), textAlign: 'left', fontSize: 12, fontWeight: 600, minWidth: 0, flex: 1, padding: '5px 4px' }} />
                        <button type="button" className="answer-extra-delete" aria-label={`「${e.name || '予想に無い作業'}」を消す`}
                          onClick={() => { setExtraEdit(extraList.filter((_, j) => j !== i)); setMessage(null); }}
                          style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 6, border: '1px solid #444', background: '#222', color: '#fb7185', fontSize: 14, cursor: 'pointer', lineHeight: 1 }}>×</button>
                      </div>
                    </td>
                    <td style={cell}>
                      <input type="text" inputMode="decimal" className="answer-extra-men" aria-label={`${e.name || '予想に無い作業'} の実績人工`} value={e.menText ?? ''}
                        onChange={ev => { setExtraAt(i, { menText: ev.target.value }); setMessage(null); }}
                        style={input(bad)} />
                    </td>
                    <td style={textCell}>{memoText(d?.hint) || '予想に無い作業'}</td>
                  </tr>
                );
              })}
            </tbody>
          </AnswerTable>
        )}
        <button id="answer-extra-add" type="button" onClick={() => { setExtraEdit([...extraList, { name: '', menText: '' }]); setMessage(null); }}
          style={{ ...smallBtn, marginTop: 8, background: '#1A1A1A', color: '#ddd', border: '1px dashed #555' }}>＋ 予想に無い作業を足す</button>
        <div id="answer-alloc-total" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #2c2c2c', fontSize: 12.5, color: '#ddd', lineHeight: 1.7, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ display: 'inline-block', marginRight: 10 }}>予想人工 {ansNum(predSum)}</span>
          <span style={{ display: 'inline-block', marginRight: 10 }}>実績人工 {ansNum(allocSum)}</span>
          <span style={{ display: 'inline-block' }}>日報の合計 {ansNum(actualMen)}人工</span>
          <div id="answer-alloc-rest" data-kind={restLine.kind} style={{ fontSize: 13, fontWeight: 800, color: restColor, marginTop: 2 }}>{restLine.text}</div>
        </div>
      </div>

      {/* 6. 気づき・反映候補（Claude の下書きにチェック） */}
      <div id="answer-notes" style={ANSWER_CARD}>
        <div style={ANSWER_TITLE}>気づき・反映候補</div>
        {notes.length === 0 ? (
          <div style={{ fontSize: 13, color: '#bbb' }}>気づきはまだありません（Claudeが下書きを入れます）</div>
        ) : notes.map((n, i) => {
          const id = memoText(n.id);
          return (
            <label key={id || `n${i}`} className="answer-note" data-id={id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px', marginBottom: 8, background: '#1A1A1A', border: '1px solid #2C2C2C', borderRadius: 10, cursor: id ? 'pointer' : 'default' }}>
              <input type="checkbox" checked={!!id && isChecked(id)} disabled={!id}
                onChange={e => { const on = e.target.checked; setCheckedEdits(prev => ({ ...prev, [id]: on })); setMessage(null); }}
                style={{ width: 20, height: 20, marginTop: 1, flexShrink: 0, accentColor: '#f59e0b' }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1.5, overflowWrap: 'anywhere' }}>{memoText(n.title) || '（題なし）'}</span>
                {memoText(n.body) && <span style={{ display: 'block', fontSize: 12, color: '#bbb', lineHeight: 1.6, marginTop: 2, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{memoText(n.body)}</span>}
                {memoText(n.to) && <span style={{ display: 'block', fontSize: 11, color: '#999', lineHeight: 1.5, marginTop: 4, overflowWrap: 'anywhere' }}>反映先の候補：{memoText(n.to)}</span>}
              </span>
            </label>
          );
        })}
        <div id="answer-notes-count" style={{ fontSize: 12, color: '#ddd', marginTop: 2 }}>チェックした候補：{notes.filter(n => memoText(n.id) && isChecked(memoText(n.id))).length}件</div>
      </div>

      {/* 保存と確認済み */}
      <div id="answer-check-actions" style={ANSWER_CARD}>
        {confirmed && <div id="answer-confirmed" style={{ fontSize: 13, fontWeight: 800, color: '#4ade80', marginBottom: 6 }}>確認済み（{who(confirmed)}）</div>}
        {confirmedBefore && <div id="answer-changed-after-confirm" style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 6, overflowWrap: 'anywhere' }}>確認後に変更があります（前の確認：{who(confirmedBefore)}）</div>}
        {reflected && <div id="answer-reflected" style={{ fontSize: 12, color: '#93C5FD', marginBottom: 6, overflowWrap: 'anywhere' }}>原価マスタに反映済み（{[memoText(reflected.at), memoText(reflected.note)].filter(Boolean).join('・')}）</div>}
        {dirty && <div id="answer-unsaved" style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>保存していない変更があります</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button id="answer-check-save" type="button" onClick={() => run(undefined)} disabled={saving || !dirty}
            style={{ ...smallBtn, flex: '1 1 120px', minHeight: 44, fontSize: 14, border: 'none', background: dirty && !saving ? '#FFC400' : '#333', color: dirty && !saving ? '#111' : '#777', cursor: dirty && !saving ? 'pointer' : 'default' }}>
            {saving ? '保存中…' : '保存'}
          </button>
          <button id="answer-check-confirm" type="button" onClick={() => run(!confirmed)} disabled={saving}
            style={{ ...smallBtn, flex: '1 1 120px', minHeight: 44, fontSize: 14, background: 'transparent', color: confirmed ? '#ddd' : '#4ade80', border: `1px solid ${confirmed ? '#555' : 'rgba(74,222,128,.5)'}` }}>
            {confirmed ? '確認を外す' : '確認済みにする'}
          </button>
        </div>
        {message && <div id="answer-check-message" role="status" style={{ fontSize: 12, fontWeight: 700, color: msgColor[message.kind], marginTop: 8, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{message.text}</div>}
        {baseAlloc.savedAt && <div id="answer-last-saved" style={{ fontSize: 11, color: '#888', marginTop: 8 }}>最後の保存：{[loginDisplayName(baseAlloc.savedBy), answerSavedLabel(baseAlloc.savedAt)].filter(Boolean).join('・')}</div>}
      </div>
    </>
  );
}

function AnswerCheckTab({ memo, reports, totals, projectInfo, siteName, userId, onAnswerCheckSaved, leaveGuardRef }) {
  const comparison = React.useMemo(() => buildForecastComparison(projectInfo?.forecast, totals, reports, projectInfo), [projectInfo, totals, reports]);
  const a = React.useMemo(() => buildAnswerCheck(memo, comparison, reports, totals, projectInfo), [memo, comparison, reports, totals, projectInfo]);
  const head = { fontWeight: 400, color: '#777', fontSize: 11, textAlign: 'right', padding: '2px 4px 6px', whiteSpace: 'nowrap', borderBottom: '1px solid #2c2c2c', verticalAlign: 'bottom' };
  const textHead = { ...head, textAlign: 'left', whiteSpace: 'normal' };
  const cell = { padding: '7px 4px', textAlign: 'right', fontSize: 13, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', borderBottom: '1px solid #222', verticalAlign: 'top' };
  const textCell = { ...cell, textAlign: 'left', whiteSpace: 'normal', fontSize: 12, color: '#bbb', overflowWrap: 'anywhere' };
  const box = { background: '#1A1A1A', border: '1px solid #2C2C2C', borderRadius: 10, padding: '9px 10px', minWidth: 0 };
  const w = a.waste;
  return (
    <div id="answer-check">
      {/* 答えの状態の札 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span id="answer-state" data-state={a.done ? 'done' : 'wip'} style={{ padding: '4px 12px', borderRadius: 999, fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', color: '#111',
          background: a.done ? '#FFC400' : '#fff', border: a.done ? '1px solid #FFC400' : '1px solid #D1D5DB' }}>
          {a.done ? '答え 確定' : '答え 途中'}
        </span>
        {!a.done && <span id="answer-state-note" style={{ flex: '1 1 200px', fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>ステータスが完了（請求チェック済み）になると確定します。外注経費などは請求チェックまで入りません</span>}
      </div>

      {/* 1. 概要（6枠） */}
      <div id="answer-summary" style={ANSWER_CARD}>
        <div style={ANSWER_TITLE}>概要</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {a.cards.map(c => (
            <div key={c.key} data-key={c.key} className="answer-card" style={box}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#bbb', fontWeight: 700 }}>{c.label}</span>
                <AnswerMark grade={c.grade} solid />
              </div>
              <div className="answer-pred" style={{ fontSize: 11.5, color: '#999', lineHeight: 1.5, overflowWrap: 'anywhere' }}>予想　{c.pred ?? '−'}</div>
              <div className="answer-act" style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1.4, marginTop: 2, overflowWrap: 'anywhere', fontVariantNumeric: 'tabular-nums' }}>{c.act}</div>
              {c.sub && <div className="answer-sub" style={{ fontSize: 11, color: '#888', lineHeight: 1.5, marginTop: 3, overflowWrap: 'anywhere' }}>{c.sub}</div>}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#888', marginTop: 10, lineHeight: 1.6 }}>◎ ずれ ±5%以内　○ ±15%以内　× ±15%超（人工・日数・台数は ±1◎・±3○）</div>
      </div>

      {/* 2. 廃棄物 */}
      <div id="answer-waste" style={ANSWER_CARD}>
        <div style={ANSWER_TITLE}>廃棄物</div>
        {w.rows.length === 0 ? (
          <div style={{ fontSize: 13, color: '#bbb' }}>原価メモにも日報にも、廃棄物の行がありません</div>
        ) : (
          // 390px の画面なら、品目〜差（判定）までが最初から見える幅
          <AnswerTable id="answer-waste-table" cols={[74, 80, 44, 44, 88, 66, 66, 250]}>
            <thead>
              <tr>
                <th style={textHead}>品目（原価メモ）</th>
                <th style={textHead}>処分先</th>
                <th style={head}>予想㎥</th>
                <th style={head}>実績㎥</th>
                <th style={head}>差</th>
                <th style={head}>予想処分費</th>
                <th style={head}>実績処分費</th>
                <th style={textHead}>実績の中身（日報）</th>
              </tr>
            </thead>
            <tbody>
              {w.rows.map(r => (
                <tr key={r.key} data-group={r.group} data-grade={r.grade} data-extra={r.extra ? '1' : undefined}>
                  <td style={{ ...textCell, color: '#EDEDED', fontWeight: 700 }}>{r.name}</td>
                  <td style={textCell}>{r.dest}</td>
                  <td style={cell}>{r.p == null ? '−' : ansNum(r.p)}</td>
                  <td style={{ ...cell, fontWeight: 800 }}>{ansNum(r.a)}</td>
                  <td style={cell}><AnswerMark grade={r.grade}>{r.diff}</AnswerMark></td>
                  <td style={cell}>{r.pCostText}</td>
                  <td style={{ ...cell, fontWeight: 800 }}>{r.aCostText}</td>
                  <td style={textCell}>{r.src}</td>
                </tr>
              ))}
              <tr data-total="1">
                <td style={{ ...textCell, color: '#EDEDED', fontWeight: 700, borderBottom: 'none' }}>合計</td>
                <td style={{ ...textCell, borderBottom: 'none' }}></td>
                <td style={{ ...cell, borderBottom: 'none' }}>{w.total.p == null ? '−' : ansFixed1(w.total.p)}</td>
                <td style={{ ...cell, fontWeight: 800, borderBottom: 'none' }}>{ansFixed1(w.total.a)}</td>
                <td style={{ ...cell, borderBottom: 'none' }}><AnswerMark grade={w.total.grade}>{w.total.diff}</AnswerMark></td>
                <td style={{ ...cell, borderBottom: 'none' }}>{w.total.pCost == null ? '−' : `${ansYen(w.total.pCost)}`}</td>
                <td style={{ ...cell, fontWeight: 800, borderBottom: 'none' }}>{`${ansYen(w.total.cost)}`}</td>
                <td style={{ ...textCell, borderBottom: 'none' }}></td>
              </tr>
            </tbody>
          </AnswerTable>
        )}
      </div>

      {/* 3. 費目（今の予想と実績タブをそのまま。「原価の当たり具合」もここ） */}
      <div id="answer-costs" style={{ marginBottom: 12 }}>
        <ForecastActualTab comparison={comparison} />
      </div>

      {/* 4. 段取り（予定 ⇄ 日報） */}
      <div id="answer-schedule" style={ANSWER_CARD}>
        <div style={ANSWER_TITLE}>段取り（予定 ⇄ 日報）</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 11, color: '#777' }}>予定（原価メモ）</div>
          <div style={{ fontSize: 11, color: '#777' }}>日報</div>
        </div>
        {a.pairs.length === 0 && <div style={{ fontSize: 13, color: '#bbb' }}>予定も日報もありません</div>}
        {a.pairs.map((pr, i) => {
          const p = pr.plan, d = pr.day;
          const extraDay = !p && !!d;
          const planOut = p ? [`搬出${p.m3Text ? ` ${withUnit(p.m3Text, '㎥')}` : ''}${p.items ? `（${p.items}）` : ''}`, p.trucks ? withUnit(p.trucks, '台') : ''].join('') : '';
          let dayOut = '', dayCars = '';
          if (d) {
            const byName = new Map();
            d.waste.forEach(e => {
              const n = e.name || '（名前なし）';
              if (!byName.has(n)) byName.set(n, { m3: 0, all: true, qty: 0, unit: e.unit });
              const o = byName.get(n);
              if (e.m3 != null) o.m3 += e.m3; else o.all = false;
              o.qty += e.qty;
            });
            const m3 = d.waste.reduce((s, e) => s + (e.m3 || 0), 0);
            dayOut = d.waste.length
              ? `搬出 ${ansFixed1(m3)}㎥（${[...byName].map(([n, o]) => `${n} ${o.all ? ansNum(o.m3) : `${ansNum(o.qty, 2)}${o.unit || ''}`}`).join('・')}）`
              : '搬出なし';
            dayCars = [d.toolCars ? `道具車 ${d.toolTypes.join('・')}` : '', d.haisha ? `配車${d.haisha}` : ''].filter(Boolean).join('＋');
          }
          return (
            <div key={i} className="answer-day" data-extra={extraDay ? '1' : undefined} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginBottom: 8 }}>
              <div className="answer-plan" style={{ ...box, ...(p ? {} : { borderStyle: 'dashed', color: '#777' }) }}>
                {p ? (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{/^\d+$/.test(p.day) ? `${p.day}日目` : (p.day || `${i + 1}日目`)}</div>
                    <div style={{ fontSize: 12, color: '#ddd', marginTop: 2 }}>{[p.shift, p.people ? withUnit(p.people, '人') : ''].filter(Boolean).join(' ') || '−'}</div>
                    {p.work && <div style={{ fontSize: 11.5, color: '#bbb', marginTop: 3, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{p.work}</div>}
                    {planOut && <div style={{ fontSize: 11, color: '#999', marginTop: 3, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{planOut}</div>}
                  </>
                ) : <div style={{ fontSize: 12 }}>（予定なし）</div>}
              </div>
              <div className="answer-actual" style={{ ...box, ...(extraDay ? { background: 'rgba(245,158,11,.14)', border: '1px solid #f59e0b' } : {}), ...(d ? {} : { borderStyle: 'dashed', color: '#777' }) }}>
                {d ? (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 800, color: extraDay ? '#fbbf24' : '#fff' }}>{d.label}</div>
                    <div style={{ fontSize: 12, color: '#ddd', marginTop: 2, overflowWrap: 'anywhere' }}>{[d.shift, `${ansNum(d.men)}人`].filter(Boolean).join(' ')}{d.menParts.length ? `（${d.menParts.join('＋')}）` : ''}</div>
                    {d.time && <div style={{ fontSize: 11, color: '#999', marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>{d.time}</div>}
                    {d.work && <div style={{ fontSize: 11.5, color: '#bbb', marginTop: 3, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{d.work}</div>}
                    <div style={{ fontSize: 11, color: '#999', marginTop: 3, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{dayOut}</div>
                    {dayCars && <div style={{ fontSize: 11, color: '#999', marginTop: 1, overflowWrap: 'anywhere' }}>{dayCars}</div>}
                  </>
                ) : <div style={{ fontSize: 12 }}>日報なし</div>}
              </div>
            </div>
          );
        })}
        <div id="answer-schedule-total" style={{ fontSize: 13, color: '#EDEDED', marginTop: 4, lineHeight: 1.6, fontVariantNumeric: 'tabular-nums' }}>
          {/* 「予定 …」「→ 実績 …」をそれぞれひとかたまりで折り返す */}
          <span style={{ display: 'inline-block' }}>{a.planTotal}</span>
          <span style={{ display: 'inline-block' }}><span style={{ color: '#777', margin: '0 6px' }}>→</span>{a.actualTotal}</span>
        </div>
      </div>

      {/* 5. 工種と人工・6. 気づき・反映候補・保存と確認済み */}
      <AnswerWorkPanel memo={memo} ac={projectInfo?.answerCheck} menActual={a.menActual} days={a.days}
        siteName={siteName} userId={userId} onSaved={onAnswerCheckSaved} leaveGuardRef={leaveGuardRef} />

      <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7 }}>答え（実績）は、開くたびに日報から数えています（保存しません）。保存するのは、工種と人工の割り振り・気づきのチェック・確認済みだけです。</div>
    </div>
  );
}

// ========== AnalysisPage ==========
// 原価内訳の色（項目ごとに固定。どの現場でも同じ項目は同じ色）
// 本番で出る5項目（人工費・産廃費・車両費・直接原価・経費）には、色の見え方が違う人にも見分けやすい5色を当てている
const COST_CATEGORY_COLORS = {
  '人工費': '#3366CC',     // 青
  '産廃費': '#D55E00',     // 朱（赤みのオレンジ）
  '車両費': '#22A06B',     // 緑
  '直接原価': '#CC79A7',   // 赤紫
  '経費': '#E8CF2E',       // 黄
  '重機費': '#93C5FD',     // 水色
  '回送費': '#0B7A75',     // 青緑
  'リース費': '#F4A6C0',   // 桃
  '資材費': '#A0522D',     // 茶
  '案件の経費': '#7F7F7F', // 灰
  '環境課配車': '#BDBDBD', // 旧形式
  '外部運搬': '#4D4D4D',   // 旧形式
  '配送費': '#A3A3A3',     // 旧形式
};
const COST_BREAKDOWN_BG = '#F4F4F4'; // 原価内訳のカードの背景（グラフの切れ目の線もこの色）
const ANALYSIS_TABS = [['forecast', '予想と実績'], ['finance', '財務'], ['breakdown', '原価内訳']];

// 現場が変わると作り直す（App 側で key に現場名を入れている）ので、いつも「予想と実績」から始まる
function AnalysisPage({ reports, totals, projectInfo, onNavigate, siteName, currentUserId, onAnswerCheckSaved, leaveGuardRef }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); document.body.scrollTop=0; document.documentElement.scrollTop=0; }, []);
  const [activeTab, setActiveTab] = useState('forecast');
  const chartRef1 = React.useRef(null);
  // 原価メモ（読めないとき・無いときは null。そのときの予想と実績タブは今のまま）
  const answerMemo = React.useMemo(() => {
    if (projectInfo?.costMemo == null) return null;
    const parsed = parseCostMemo(projectInfo.costMemo);
    return parsed.ok ? parsed.memo : null;
  }, [projectInfo?.costMemo]);

  // データ計算（項目の合計が財務タブの「原価」と一致する。数え方は calcSiteMoney と同じ）
  const rp = totals.reportParts || {};
  const pp = totals.projectParts || {};
  const costByCategory = {
    '人工費': (rp.inHouse || 0) + (rp.outsourcing || 0), // 自社人工＋外注人工
    '車両費': (rp.vehicle || 0) + (rp.haishi || 0),      // 車両費（配車費込み）
    '重機費': rp.machinery || 0,
    '産廃費': rp.disposal || 0,                          // 処分費（金属売上は含めない）
    '環境課配車': rp.envItems || 0,                      // 旧形式（金額があるときだけ出る）
    '外部運搬': rp.extItems || 0,                        // 旧形式
    '回送費': pp.transfer || 0,
    'リース費': pp.lease || 0,
    '資材費': pp.materials || 0,
    '経費': rp.dailyExpenses || 0,                       // その日の経費
    '配送費': rp.transport || 0,                         // 旧形式
    '直接原価': pp.direct || 0,
    '案件の経費': pp.expenses || 0,
  };

  // 金額の大きい順。凡例・ドーナツ・棒はこの順で、色は項目ごとに固定
  const pieData = Object.keys(costByCategory).map(key => ({ name: key, value: costByCategory[key], color: COST_CATEGORY_COLORS[key] || '#7F7F7F' })).filter(d => d.value > 0).sort((a,b) => b.value - a.value);
  const pieKey = pieData.map(d => `${d.name}:${d.value}`).join('|'); // 数字が変わったらドーナツを描き直す
  const totalCost = pieData.reduce((s,d) => s+d.value, 0);

  const grossMargin = totals.grossMargin.toFixed(1);
  const kari = totals.isProvisional ? '（仮）' : ''; // 請求金額が無い間は「仮」
  const grossMarginNum = parseFloat(grossMargin);
  const marginColor = grossMarginNum >= 40 ? '#639922' : grossMarginNum >= 20 ? '#BA7517' : '#D85A30';

  // Chart.js動的ロード
  // 読み込みが終わるまではグラフを描かない（途中でタブを押しても画面が真っ白にならないように）。
  // 読み込みが終わったら chartReady が true になり、開いているタブのグラフを描く。
  const [chartReady, setChartReady] = useState(() => !!window.Chart);
  React.useEffect(() => {
    if (window.Chart) { setChartReady(true); return; }
    const src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    let script = document.querySelector(`script[src="${src}"]`); // 前に開いたときの読み込み中のものがあれば使い回す
    if (!script) {
      script = document.createElement('script');
      script.src = src;
      document.head.appendChild(script);
    }
    const onLoad = () => setChartReady(!!window.Chart);
    script.addEventListener('load', onLoad);
    return () => script.removeEventListener('load', onLoad);
  }, []);

  // 原価内訳のドーナツを描く。タブを開いたときと、開いたまま数字が変わったとき（読み込みが後から終わったときなど）に描き直す
  React.useEffect(() => {
    if (!chartReady || activeTab !== 'breakdown' || !chartRef1.current || pieData.length === 0) return;
    const chart = new window.Chart(chartRef1.current, {
      type: 'doughnut',
      // 切れ目に背景と同じ色の細い線を入れて、隣どうしの色を分ける
      data: { labels: pieData.map(d=>d.name), datasets: [{ data: pieData.map(d=>d.value), backgroundColor: pieData.map(d=>d.color), borderWidth: 2, borderColor: COST_BREAKDOWN_BG }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} }, cutout:'65%' }
    });
    return () => chart.destroy();
  }, [activeTab, chartReady, pieKey]);

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
        {/* 予想と実績・財務・原価内訳の3つ。狭い画面（360px未満）だけ字を12pxにする */}
        {ANALYSIS_TABS.map(([id, t]) => (
          <button key={id} onClick={()=>{
            // 予想と実績タブで保存していない割り振り・チェックがあれば、ほかのタブに移る前に確かめる
            if (id !== activeTab) { const msg = leaveGuardRef?.current?.(); if (msg && !window.confirm(msg)) return; }
            setActiveTab(id);
          }}
            style={{flex:1,padding:'8px 2px',whiteSpace:'nowrap',border: id===activeTab?'0.5px solid #E8E8E8':'none',borderRadius:7,fontSize:'clamp(12px, 3.6vw, 13px)',fontWeight:500,cursor:'pointer',background:id===activeTab?'#fff':'transparent',color:id===activeTab?'#111':'#888',transition:'all 0.15s'}}>
            {t}
          </button>
        ))}
      </div>

      {/* 予想と実績タブ（予想＝project_info.forecast、実績＝calcSiteMoney）
          原価メモが読める現場は、答え合わせ（札・概要・廃棄物・費目・段取り）。費目は今の表をそのまま出す */}
      {activeTab === 'forecast' && (answerMemo
        ? <AnswerCheckTab memo={answerMemo} reports={reports} totals={totals} projectInfo={projectInfo}
            siteName={siteName} userId={currentUserId} onAnswerCheckSaved={onAnswerCheckSaved} leaveGuardRef={leaveGuardRef} />
        : <ForecastActualTab comparison={buildForecastComparison(projectInfo?.forecast, totals, reports, projectInfo)} />
      )}

      {/* 財務タブ */}
      {activeTab === 'finance' && (
        <>
          {/* 3つの箱が狭い画面（320px）でもはみ出さないよう、金額の字と箱の左右の余白を画面の幅に合わせて小さくする（390px以上は今までどおり 15px・10px） */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
            {[
              {label:`工事売上${kari}`,value:`¥${formatCurrency(totals.revenue)}`,color:'#111'},
              {label:'原価',value:`¥${formatCurrency(totals.cost)}`,color:'#D85A30'},
              {label:`粗利${kari}`,value:`¥${formatCurrency(totals.grossProfit)}`,color:'#639922'},
            ].map((k,i) => (
              <div key={i} style={{background:'#fff',borderRadius:14,padding:'12px clamp(6px, calc(5.72vw - 12.3px), 10px)',border:'0.5px solid #E8E8E8'}}>
                <div style={{fontSize:11,color:'#1E3A5F',marginBottom:4}}>{k.label}</div>
                <div style={{fontSize:'clamp(12px, 3.85vw, 15px)',fontWeight:500,color:k.color,fontVariantNumeric:'tabular-nums',whiteSpace:'nowrap'}}>{k.value}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:18,padding:16,marginBottom:12,display:'flex',flexDirection:'column',alignItems:'center',border:'0.5px solid #E8E8E8'}}>
            <div style={{fontSize:12,color:'#1E3A5F',marginBottom:6}}>粗利率{kari} / Gross Margin</div>
            <div style={{fontSize:36,fontWeight:500,color:marginColor,fontVariantNumeric:'tabular-nums'}}>{grossMargin}%</div>
            <div style={{width:'100%',height:8,background:'#F0F0F0',borderRadius:4,overflow:'hidden',margin:'10px 0 6px'}}>
              <div style={{width:`${Math.min(100,grossMarginNum)}%`,height:'100%',background:marginColor,borderRadius:4,transition:'width 0.8s ease'}}></div>
            </div>
            {totals.metalRevenue > 0 && <div style={{fontSize:12,color:'#888'}}>金属売上 ¥{formatCurrency(totals.metalRevenue)}</div>}
          </div>
          <div style={{background:'#2C2825',borderRadius:12,padding:14}}>
            <div style={{fontSize:12,color:'#888',marginBottom:10}}>収支内訳</div>
            {[
              {label:'工事売上',value:totals.revenue,color:'#378ADD'},
              {label:'原価',value:totals.cost,color:'#D85A30'},
              {label:'粗利',value:Math.abs(totals.grossProfit),color:marginColor},
            ].map((b,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{fontSize:11,color:'#888',width:52,textAlign:'right',flexShrink:0}}>{b.label}</div>
                <div style={{flex:1,height:10,background:'#F0F0F0',borderRadius:5,overflow:'hidden'}}>
                  <div style={{width:`${Math.round((b.value/Math.max(totals.revenue,1))*100)}%`,height:'100%',background:b.color,borderRadius:5,transition:'width 0.8s ease'}}></div>
                </div>
                <div style={{fontSize:11,color:'#888',width:60,flexShrink:0,fontVariantNumeric:'tabular-nums'}}>¥{formatCurrency(b.value)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 原価内訳タブ（凡例・ドーナツ・棒は金額の大きい順で、色は項目ごとに固定） */}
      {activeTab === 'breakdown' && (
        <>
          <div style={{background:COST_BREAKDOWN_BG,borderRadius:12,padding:14,marginBottom:12}}>
            <div style={{fontSize:12,color:'#888',marginBottom:10}}>原価構成比</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:10}}>
              {pieData.map((d,i) => (
                <span key={i} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#888'}}>
                  <span style={{width:8,height:8,borderRadius:2,background:d.color,flexShrink:0}}></span>
                  {d.name} {totalCost>0?Math.round((d.value/totalCost)*100):0}%
                </span>
              ))}
            </div>
            {/* グラフの canvas は最初 300px の幅をとるので、狭い画面（320px）で画面を広げないよう max-width を付ける */}
            {pieData.length > 0
              ? <div style={{position:'relative',width:'100%',height:200}}><canvas ref={chartRef1} role="img" aria-label="原価構成比ドーナツグラフ" style={{maxWidth:'100%'}}></canvas></div>
              : <div style={{textAlign:'center',padding:32,color:'#888',fontSize:13}}>データがありません</div>
            }
          </div>
          <div style={{background:COST_BREAKDOWN_BG,borderRadius:12,padding:14}}>
            <div style={{fontSize:12,color:'#888',marginBottom:10}}>カテゴリ別金額</div>
            {pieData.map((d,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{fontSize:11,color:'#888',width:60,textAlign:'right',flexShrink:0}}>{d.name}</div>
                <div style={{flex:1,height:10,background:'#E8E8E8',borderRadius:5,overflow:'hidden'}}>
                  <div style={{width:`${Math.round((d.value/maxBar)*100)}%`,height:'100%',background:d.color,borderRadius:5}}></div>
                </div>
                <div style={{fontSize:11,color:'#888',width:60,flexShrink:0,fontVariantNumeric:'tabular-nums'}}>¥{formatCurrency(d.value)}</div>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}


// ========== ExportPage ==========
// 2026-11-14 入口を外した。使っていないため（左のメニューの「EXPORT」と上の帯のボタン）。
// 関数は残してある。戻すときは Sidebar の navItems に { id: 'export', … } を足す。
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

  const handlePrint = () => {
    const prev = document.title;
    const sitename = projectInfo.projectName || projectInfo.workType || '受注表';
    const datestr = new Date().toISOString().slice(0,10);
    document.title = `受注表_${sitename}_${datestr}`;
    setTimeout(() => {
      window.print();
      setTimeout(() => { document.title = prev; }, 500);
    }, 100);
  };
  const handleDownload = () => {
    // PDF保存の案内表示後に印刷ダイアログを開く
    // ブラウザの印刷ダイアログで「送信先 → PDFとして保存」を選ぶ
    const prev = document.title;
    const sitename = projectInfo.projectName || projectInfo.workType || '受注表';
    const datestr = new Date().toISOString().slice(0,10);
    document.title = `受注表_${sitename}_${datestr}`;
    setTimeout(() => {
      window.print();
      setTimeout(() => { document.title = prev; }, 500);
    }, 100);
  };

  const fmt = (v) => v ? `¥${Number(v).toLocaleString()}` : '—';
  const contractAmtTax = projectInfo.contractAmount ? Math.round(Number(projectInfo.contractAmount) * 1.1) : 0;

  return (
    <div style={{background:'#F5F7FA',minHeight:'100vh'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .order-pdf { box-shadow: none !important; padding: 12mm !important; max-width: none !important; margin: 0 !important; }
          @page { size: A4 portrait; margin: 6mm 8mm; }
          /* A4縦サイズに収めるため全体を縮小 */
          .order-pdf { font-size: 9px !important; }
          .order-pdf h1 { font-size: 16px !important; }
          .order-table th, .order-table td { padding: 3px 5px !important; font-size: 9px !important; }
        }
        .order-table { border-collapse: collapse; width: 100%; }
        .order-table th, .order-table td { border: 1px solid #555; padding: 6px 8px; font-size: 11px; }
        .order-table th { background: #374151; color: #fff; font-weight: 700; text-align: center; }
      `}</style>

      {/* 操作バー */}
      <div className="no-print" style={{background:'#1E293B',padding:'10px 16px',display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
        <button onClick={()=>{
            onNavigate('settings');
            setTimeout(()=>{
              const el = document.getElementById('site-management-top');
              if (el) el.scrollIntoView({behavior:'smooth',block:'start'});
              else window.scrollTo({top:0,behavior:'smooth'});
            }, 150);
          }} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'rgba(255,255,255,0.1)',border:'0.5px solid rgba(255,255,255,0.2)',borderRadius:8,fontSize:12,fontWeight:600,color:'#fff',cursor:'pointer'}}>
          <X className="w-4 h-4"/>閉じる
        </button>
        <div style={{flex:1}}/>
        <button onClick={handlePrint} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.3)',borderRadius:8,fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>
          🖨 印刷
        </button>
        <button onClick={handleDownload} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'#DC2626',border:'none',borderRadius:8,fontSize:12,fontWeight:700,color:'#fff',cursor:'pointer'}}>
          <FileText className="w-4 h-4"/>PDFダウンロード
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
              <th style={{width:110}}>請負区分</th>
              <td colSpan={5}>{projectInfo.contractType || ''}</td>
            </tr>
            <tr>
              <th>発注先（会社名）</th>
              <td colSpan={5}>{projectInfo.client || ''}</td>
            </tr>
            <tr>
              <th>工事名</th>
              <td colSpan={5}>{projectInfo.projectName || ''}</td>
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
            <tr>
              <th>受注金額</th>
              <td colSpan={2}>{fmt(projectInfo.contractAmount)}</td>
              <td colSpan={3} style={{fontSize:10,color:'#555'}}>（税込 {fmt(contractAmtTax)}）</td>
            </tr>
          </tbody>
        </table>

        {/* マニフェスト */}
        <div style={{fontWeight:700,fontSize:12,marginBottom:6,borderBottom:'2px solid #374151',paddingBottom:4}}>【マニフェスト】</div>
        <table className="order-table" style={{marginBottom:6}}>
          <tbody>
            <tr>
              <th style={{width:110}}>排出事業者</th>
              <td colSpan={3}>{projectInfo.manifestDischarger || ''}</td>
            </tr>
            <tr>
              <th>マニ伝種類</th>
              <td colSpan={3}>{projectInfo.manifestType || ''}</td>
            </tr>
            {projectInfo.manifestIssuer && (
              <tr>
                <th>交付担当者</th>
                <td colSpan={3}>{projectInfo.manifestIssuer}</td>
              </tr>
            )}
          </tbody>
        </table>
        <table className="order-table" style={{marginBottom:16}}>
          <thead>
            <tr>
              <th style={{width:'40%'}}>運搬</th>
              <th style={{width:'40%'}}>処分</th>
              <th style={{width:'20%'}}>枚数</th>
            </tr>
          </thead>
          <tbody>
            {(projectInfo.manifestRows||[{disposal:'',transport:'',count:''}]).map((row,i)=>(
              <tr key={i}>
                <td>{row.transport||''}</td>
                <td>{row.disposal||''}</td>
                <td style={{textAlign:'center'}}>{row.count ? `${row.count}枚` : ''}</td>
              </tr>
            ))}
            {Array.from({length:Math.max(0, 4-(projectInfo.manifestRows||[]).length)}).map((_,i)=>(
              <tr key={`empty-${i}`}><td>&nbsp;</td><td></td><td></td></tr>
            ))}
          </tbody>
        </table>

        {/* 備考欄 */}
        <div style={{fontWeight:700,fontSize:12,marginBottom:6,borderBottom:'2px solid #374151',paddingBottom:4}}>【備考欄】</div>
        <div style={{border:'1px solid #555',minHeight:80,padding:'8px 10px',fontSize:11,whiteSpace:'pre-wrap',marginBottom:16,lineHeight:1.6}}>
          {projectInfo.manifestRemarks || ''}
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

// ========== 日報PDFの「原価小計」の数え方 ==========
// 表の右下の「原価小計」と同じ数え方。リース・経費・日々経費は入れない。
// ページごとの小計（そのページの日報）と、解体原価㎡単価（全部の日報）の両方でこれを使う。
function calcPdfCostSubtotal(rows) {
  const sum = (f) => (rows || []).reduce((s, r) => s + f(r), 0);
  const inHouse     = sum(r => (r.workDetails?.inHouseWorkers || []).reduce((a, w) => a + (w.amount || 0), 0));   // 自社人工
  const outsourcing = sum(r => (r.workDetails?.outsourcingLabor || []).reduce((a, o) => a + (o.amount || 0), 0)); // 外注人工
  const vehicle     = getReportsVehicleCost(rows);                                                                 // 車両（同じ車両は1回）
  const haishi      = sum(r => (r.wasteItems || []).reduce((a, w) => a + (w.haishiAmount || 0), 0));               // 配車
  const machinery   = sum(r => (r.workDetails?.machinery || []).reduce((a, m) => a + (m.unitPrice || 0), 0));      // 重機
  const disposal    = sum(r => (r.wasteItems || []).reduce((a, w) => a + ((w.amount || 0) > 0 ? w.amount : 0), 0)); // 処分費（金額がプラスの行だけ）
  const env         = sum(r => (r.workDetails?.envItems || []).reduce((a, t) => a + (t.amount || 0), 0));          // 環境課
  const ext         = sum(r => (r.workDetails?.extItems || []).reduce((a, t) => a + (t.amount || 0), 0));          // 外注
  const transport   = sum(r => (r.workDetails?.transportEntries || []).reduce((a, t) => a + (parseFloat(t.amount) || 0), 0)); // 配送費
  const total = inHouse + outsourcing + vehicle + haishi + machinery + disposal + env + ext + transport;
  return { inHouse, outsourcing, vehicle, haishi, machinery, disposal, env, ext, transport, total };
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
            // ★修正: photo_urls と memo も読み込み（PDF経由で写真・メモを参照する場合に対応）
            setAllReports(data.map(r => ({
              id: r.id,
              date: r.date,
              weather: r.weather,
              recorder: r.recorder,
              workDetails: r.work_details || {},
              wasteItems: r.waste_items || [],
              scrapItems: r.scrap_items || [],
              photoUrls: r.photo_urls || [],
              memo: r.memo || '',
              createdAt: r.created_at,
            })));
          } else { setAllReports([report]); }
        } else { setAllReports([report]); }
      } catch (error) {
        console.error('PDF loadAllReports error:', error);
        setAllReports([report]);
      }
      setLoading(false);
    };
    loadAllReports();
  }, [report]);

  if (loading) return <div className="min-h-screen bg-transparent flex items-center justify-center"><p className="text-gray-400">読み込み中...</p></div>;

  const totalInHouseWorkers = allReports.reduce((sum, r) => sum + ((r.workDetails?.inHouseWorkers || []).reduce((s, w) => s + getInHouseWorkerCount(w), 0)), 0);
  const totalInHouseCost = allReports.reduce((sum, r) => sum + (r.workDetails?.inHouseWorkers || []).reduce((s, w) => s + (w.amount || 0), 0), 0);
  const totalOutsourcingWorkers = allReports.reduce((sum, r) => sum + (r.workDetails?.outsourcingLabor || []).reduce((s, o) => s + getOutsourcingCount(o), 0), 0);
  const totalOutsourcingCost = allReports.reduce((sum, r) => sum + (r.workDetails?.outsourcingLabor || []).reduce((s, o) => s + (o.amount || 0), 0), 0);
  const totalVehicleCost = allReports.reduce((sum, r) => sum + (r.workDetails?.vehicles || []).reduce((s, v) => s + (v.amount || 0), 0), 0);
  const totalWasteVehicleCost = allReports.reduce((sum, r) => sum + (r.wasteItems || []).reduce((s, w) => s + (w.vehicleAmount || 0), 0) + (r.scrapItems || []).reduce((s, sc) => s + (sc.vehicleAmount || 0), 0), 0);
  // ★ 重複除去後の総車両費(同一車両は1回のみ計上)
  const totalAllVehicleCost = getReportsVehicleCost(allReports);
  const totalMachineryCost = allReports.reduce((sum, r) => sum + (r.workDetails?.machinery || []).reduce((s, m) => s + (m.unitPrice || 0), 0), 0);
  // ★ 産廃処分費 (処分のみ、プラスの金額)
  const totalWasteDisposal = allReports.reduce((sum, r) => sum + (r.wasteItems || []).reduce((s, w) => s + ((w.amount || 0) > 0 ? w.amount : 0), 0), 0);
  // ★ 金属売上 (wasteItems のマイナス金額の絶対値)
  const totalMetalRevenue = allReports.reduce((sum, r) => sum + (r.wasteItems || []).reduce((s, w) => s + ((w.amount || 0) < 0 ? Math.abs(w.amount) : 0), 0), 0);
  // ★ 純額: 処分費 - 金属売上 (原価計算用)
  const totalWasteCost = totalWasteDisposal - totalMetalRevenue;
  const totalHaishiCost = allReports.reduce((sum, r) => sum + (r.wasteItems || []).reduce((s, w) => s + (w.haishiAmount || 0), 0), 0);
  // ★ 環境課・外注人工費 (envItems + extItems)
  const totalEnvExtCost = allReports.reduce((sum, r) => sum + (r.workDetails?.envItems || []).reduce((s,t)=>s+(parseFloat(t.amount)||0),0) + (r.workDetails?.extItems || []).reduce((s,t)=>s+(parseFloat(t.amount)||0),0), 0);
  // ★ 配送費 (transportEntries)
  const totalTransportCost = allReports.reduce((sum, r) => sum + (r.workDetails?.transportEntries || []).reduce((s,t)=>s+(parseFloat(t.amount)||0),0), 0);
  const totalDailyExpenses = allReports.reduce((sum, r) => sum + (r.workDetails?.dailyExpenses || []).reduce((s,e)=>s+(parseFloat(e.amount)||0),0), 0);
  // ★ 金属売上: 旧 scrapItems + 新 wasteItems(amount < 0 or isScrap) の両方を合算
  const totalScrapRevenue = allReports.reduce((sum, r) => {
    const oldScrap = Math.abs((r.scrapItems || []).reduce((s, sc) => s + (sc.amount || 0), 0));
    const newScrap = (r.wasteItems || []).reduce((s, w) => s + ((w.amount || 0) < 0 ? Math.abs(w.amount) : 0), 0);
    return sum + oldScrap + newScrap;
  }, 0);
  const estimateRevenue = (parseFloat(projectInfo.contractAmount) || 0) + (parseFloat(projectInfo.additionalAmount) || 0);
  const formalRevenue = parseFloat(projectInfo.billingAmount) || 0;
  const totalRevenue = formalRevenue > 0 ? formalRevenue : estimateRevenue;
  const isRevenueProvisional = !(formalRevenue > 0);
  // ★ 車両費は重複除去後の totalAllVehicleCost を使う(haishiAmount は別フィールドなので加算)
  // ★ 原価合計 = 純粋な原価のみ(金属売上は控除しない)
  const totalCost = totalInHouseCost + totalOutsourcingCost + totalAllVehicleCost + totalHaishiCost + totalMachineryCost + totalEnvExtCost + totalTransportCost + totalWasteDisposal + totalDailyExpenses
    + (parseFloat(projectInfo.transferCost) || 0) + (parseFloat(projectInfo.leaseCost) || 0) + (parseFloat(projectInfo.materialsCost) || 0)
    + (projectInfo.miscItems || [...(projectInfo.outsourcingItems||[]),...(projectInfo.siteExpenseItems||[]),...(projectInfo.sgaItems||[])]).reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
    + (projectInfo.expenses || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const grossProfit = totalRevenue - totalCost;
  // ★ 全部の日報の原価小計（各ページの原価小計の合計と同じ数。解体原価㎡単価に使う）
  const allCostSubtotal = calcPdfCostSubtotal(allReports).total;
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
          @page { size: A3 landscape; margin: 4mm 6mm; }
          .pdf-container { zoom: 0.92; }
          .pdf-page-break { page-break-before: always; page-break-inside: avoid; }
          .pdf-container { page-break-inside: avoid; }
          /* 表ヘッダーがページ越しでも繰り返されるように */
          thead { display: table-header-group; }
          tfoot { display: table-row-group; }
        }
      `}</style>
      <div className="no-print border-b sticky top-0 z-50" style={{ background:'#fff', borderColor:'#E5E7EB' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => onNavigate('home')} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:"#F3F4F6",border:"1px solid #E5E7EB",borderRadius:8,fontSize:12,fontWeight:600,color:"#374151",cursor:"pointer",flexShrink:0}}>
            <ChevronLeft className="w-4 h-4" />ホームに戻る
          </button>
          <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
            <span style={{fontSize:11,color:'#9CA3AF',whiteSpace:'nowrap'}}>全{allReports.length}件</span>
            <button onClick={() => {
              // ★ PDFファイル名に現場名を自動反映
              const siteName = report.siteName || report.site_name || projectInfo.projectName || '解体作業日報';
              const today = new Date();
              const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
              const originalTitle = document.title;
              document.title = `解体日報_${siteName}_${dateStr}`;
              setTimeout(() => {
                window.print();
                setTimeout(() => { document.title = originalTitle; }, 500);
              }, 100);
            }} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'#2563EB',border:'none',borderRadius:8,color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
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
          // ★ 原価小計とその内訳（数え方は calcPdfCostSubtotal。リース費・経費・日々経費は含めない）
          const pageCost = calcPdfCostSubtotal(pageRows);
          const pageInHouseWorkers = pageRows.reduce((s,r)=>s+(r.workDetails?.inHouseWorkers||[]).reduce((a,w)=>a+getInHouseWorkerCount(w),0),0);
          const pageInHouseCost    = pageCost.inHouse;
          const pageOutWorkers     = pageRows.reduce((s,r)=>s+(r.workDetails?.outsourcingLabor||[]).reduce((a,o)=>a+getOutsourcingCount(o),0),0);
          const pageOutCost        = pageCost.outsourcing;
          const pageVehicleCost    = pageRows.reduce((s,r)=>s+(r.workDetails?.vehicles||[]).reduce((a,v)=>a+(v.amount||0),0),0);
          const pageHaishiCost     = pageCost.haishi;
          const pageWasteVehicleCost = pageRows.reduce((s,r)=>s+(r.wasteItems||[]).reduce((a,w)=>a+(w.vehicleAmount||0),0)+(r.scrapItems||[]).reduce((a,sc)=>a+(sc.vehicleAmount||0),0),0);
          // ★ 重複除去後のページ車両費合計
          const pageAllVehicleCost = pageCost.vehicle;
          const pageMachineryCost  = pageCost.machinery;
          // ★ 産廃処分費 (処分のみ、金額プラスのもの)
          const pageWasteDisposal  = pageCost.disposal;
          // ★ 金属売上 (マイナス金額の絶対値、売上として別表示)
          const pageMetalRevenue   = pageRows.reduce((s,r)=>s+(r.wasteItems||[]).reduce((a,w)=>a+((w.amount||0) < 0 ? Math.abs(w.amount) : 0),0),0);
          // ★ 純額(参考表示用): 処分費 - 売上
          const pageWasteCost      = pageWasteDisposal - pageMetalRevenue;
          // ★ 日々経費(参考表示用)- 原価小計には含めない
          const pageDailyExpCost = pageRows.reduce((s,r)=>s+(r.workDetails?.dailyExpenses||[]).reduce((a,e)=>a+(parseFloat(e.amount)||0),0),0);
          // ★ 原価小計 = 日報の純粋な原価のみ(リース費・経費・日々経費は含めない)
          const pageTotal          = pageCost.total;

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
          // ★ 総㎥: 処分+金属どちらも含む (金属は volumeM3 があれば加算)
          const wQty   = allReports.reduce((s,r)=>(r.wasteItems||[]).reduce((a,w)=>a+(w.unit==='㎥'?(parseFloat(w.quantity)||0):(w.volumeM3?parseFloat(w.volumeM3)||0:0)),s),0)
                       + allReports.reduce((s,r)=>(r.scrapItems||[]).reduce((a,sc)=>a+(sc.volumeM3?parseFloat(sc.volumeM3)||0:0),s),0);
          const laborC = allReports.reduce((s,r)=>s+(r.workDetails?.inHouseWorkers||[]).reduce((a,w)=>a+(w.amount||0),0)+(r.workDetails?.outsourcingLabor||[]).reduce((a,o)=>a+(o.amount||0),0),0);
          // ★ 処分費㎥単価 = 処分費（処分の行の金額がプラスのものだけ。金属売上は足さない）÷ 総㎥
          const unitWaste   = wQty   > 0 ? Math.round(totalWasteDisposal/wQty) : 0;
          const unitLaborM2 = areaM2 > 0 ? Math.round(laborC/areaM2)    : 0;
          // ★ 解体原価㎡単価 = 全部の日報の原価小計（表の右下と同じ数え方）÷ 面積
          const unitCostM2  = areaM2 > 0 ? Math.round(allCostSubtotal/areaM2) : 0;

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
                          {[
                            ['見積金額（想定金額）', estimateRevenue, '#1D4ED8'],
                            ['請求金額', formalRevenue, '#DC2626'],
                            ['原価金額', totalCost, '#D97706']
                          ].map(([label, val, color]) => (
                            <tr key={label}><th style={{ color: color, fontWeight: 700 }}>{label}</th><td style={{ color: color, fontWeight: 700 }}>¥{formatCurrency(val)}</td></tr>
                          ))}
                          <tr style={{ borderTop: '2px solid #374151' }}>
                            <th style={{color:'#B45309',fontWeight:700}}>{isRevenueProvisional ? '粗利（仮）' : '粗利'}</th>
                            <td style={{ color: grossProfit >= 0 ? '#1D4ED8' : '#DC2626', fontWeight:700 }}>¥{formatCurrency(grossProfit)}</td>
                          </tr>
                          <tr>
                            <th style={{color:'#B45309'}}>{isRevenueProvisional ? '粗利率（仮）' : '粗利率'}</th>
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
                      <div style={{ marginTop:10, border:'1px solid #374151', background:'#f9fafb', padding:'8px 10px', width:'100%' }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#374151', borderBottom:'1px solid #D1D5DB', paddingBottom:4, marginBottom:6 }}>【備考欄（工事条件・メモ等)】</div>
                        <div style={{ fontSize:9, color:'#374151', lineHeight:1.6, whiteSpace:'pre-wrap', minHeight:'4.5em' }}>
                          {projectInfo.workCondition || '—'}
                        </div>
                      </div>
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

                // ★ kind判定 (配車種別を優先、scrap は別属性)
                const kindOf = (w) => {
                  if (w.haisha === 'env') return 'env';
                  if (w.haisha === 'ext') return 'ext';
                  if (w.kind === 'env') return 'env';
                  if (w.kind === 'ext') return 'ext';
                  if (w.kind === 'scrap') return 'scrap';  // 旧データ: scrap指定も残す
                  if (w.amount < 0 || w.manifestNumber === '-') return 'scrap';  // 旧データ推定
                  return 'self';
                };
                // ★ スクラップ判定(売上) - kind とは独立
                const isScrap = (w) => {
                  if (!w) return false;
                  return w.isScrap === true || (w.amount || 0) < 0 || w.manifestNumber === '-' || w.kind === 'scrap';
                };

                // 配車種別で分離 (env/ext/self)
                const envWaste  = waste.filter(w=>kindOf(w)==='env');
                const extWaste  = waste.filter(w=>kindOf(w)==='ext');
                const normWaste = waste.filter(w=>kindOf(w)==='self' && !isScrap(w));
                // ★ self タブのスクラップ(新UI) + 旧データのscrap + 旧 scrapItems[] を統合
                const selfScrap = waste.filter(w=>kindOf(w)==='self' && isScrap(w));
                const oldScrap = waste.filter(w=>kindOf(w)==='scrap');
                const scrapInWaste = [...selfScrap, ...oldScrap]
                  .map(w=>({ material:w.material, quantity:w.quantity, unit:w.unit, volumeM3:w.volumeM3||null, amount:Math.abs(w.amount), disposalSite:w.disposalSite, manifestNumber:'-', envDriver:'', extHaisha:false, vType:'', vNumber:'', workerName:w.workerName||'', workerVType:w.workerVType||'', workerVNumber:w.workerVNumber||'', isOutsource: w.isOutsource === true }));
                // ★ 乗り換え判定: wasteItems と scrapItems を結合した順で、同担当者の2回目以降を「乗り換え」とマーク
                const swapMap = new Map(); // (kind, idx) -> isSwap
                {
                  const seen = new Set();
                  waste.forEach((w, i) => {
                    if (!w || !w.workerName || !w.workerVType) return;
                    if (w.isSwap === true) { swapMap.set(`waste:${i}`, true); return; }
                    if (seen.has(w.workerName)) swapMap.set(`waste:${i}`, true);
                    else seen.add(w.workerName);
                  });
                  scrap.forEach((s, i) => {
                    if (!s || !s.workerName || !s.workerVType) return;
                    if (s.isSwap === true) { swapMap.set(`scrap:${i}`, true); return; }
                    if (seen.has(s.workerName)) swapMap.set(`scrap:${i}`, true);
                    else seen.add(s.workerName);
                  });
                }
                const scrapRows = [
                  ...scrapInWaste,
                  ...scrap.map((s, idx)=>({ material:s.type, quantity:s.quantity, unit:s.unit, volumeM3:s.volumeM3||null, amount:Math.abs(s.amount), disposalSite:s.buyer, manifestNumber:'-', envDriver:'', extHaisha:false, vType:'', vNumber:'', workerName:s.workerName||'', workerVType:s.workerVType||'', workerVNumber:s.workerVNumber||'', isSwap: swapMap.get(`scrap:${idx}`)||false })),
                ];

                // 行データ統合：自社人工、外注、車両、重機、産廃を行単位で対応
                // 環境課配車行は (運転者) + 車両 + その産廃 を同じ行に
                const envWorkerRows = envWaste.map(w=>({ name:`(${w.driver})/${w.haishiShift==='night'?'夜間':'昼間'}`, amount:0, isEnv:true, vType:w.vType||'', vNumber:w.vNumber||'', haishiShift:w.haishiShift, waste:{ material:w.material, quantity:w.quantity, unit:w.unit, amount:w.amount, disposalSite:w.disposalSite, manifestNumber:w.manifestNumber||'', envDriver:w.driver, extHaisha:false, vType:w.vType||'', vNumber:w.vNumber||'', isScrap: isScrap(w) } }));
                // ワイエム配車産廃行
                // ★修正: 以前は subIdx で直接引いていたため、自社運搬の産廃行と行位置が衝突し
                //   同じ日の自社運搬の産廃が1件消える不具合があった。
                //   → 独立した行として wasteAndScrap に連結し、車両欄には配車車両(車種/車番)を出す。
                const extWasteRows = extWaste.map(w=>({ material:w.material, quantity:w.quantity, unit:w.unit, volumeM3:w.volumeM3||null, amount:w.amount, disposalSite:w.disposalSite, manifestNumber:w.manifestNumber||'', envDriver:'', extHaisha:true, vType:w.vType||'', vNumber:w.vNumber||'', workerName:'', workerVType:w.vType||'', workerVNumber:w.vNumber||'', isExt:true, isScrap: isScrap(w) }));
                // 通常産廃＋スクラップ
                const rawNormWasteRows = [...normWaste.map((w, _wIdx)=>{
                  const origIdx = waste.indexOf(w);
                  return { material:w.material, quantity:w.quantity, unit:w.unit, amount:w.amount, disposalSite:w.disposalSite, manifestNumber:w.manifestNumber||'', envDriver:'', extHaisha:false, vType:'', vNumber:'', workerName:w.workerName||'', workerVType:w.workerVType||'', workerVNumber:w.workerVNumber||'', isSwap: swapMap.get(`waste:${origIdx}`)||false, isOutsource: w.isOutsource === true, isToolVehicle: w.isToolVehicle === true || w.kind === 'tool' };
                }), ...scrapRows];
                // ★ 担当者(workerName)ごとにグループ化して並び替え
                //   workersの登場順に従って、同じ担当者の産廃・スクラップを連続して並べる
                //   → 同じ担当者の2件目以降は表示時に「〃」になる
                const normWasteRows = (() => {
                  const workerOrder = workers.map(w => w.name);
                  const grouped = [];
                  const used = new Set();
                  // 1) workers の登場順に該当する産廃を集める
                  workerOrder.forEach(wname => {
                    rawNormWasteRows.forEach((row, idx) => {
                      if (used.has(idx)) return;
                      if (row.workerName === wname) {
                        grouped.push(row);
                        used.add(idx);
                      }
                    });
                  });
                  // 2) どのworkerにもマッチしなかった残り(workerName未設定など)は最後に元の順で
                  rawNormWasteRows.forEach((row, idx) => {
                    if (!used.has(idx)) grouped.push(row);
                  });
                  return grouped;
                })();
                const allWorkers = [ ...workers, ...envWorkerRows ];
                // ★修正: baseWorkerRows を normWasteRows の並びに合わせて再構築
                //   各normWasteRowsエントリの workerName に対応する worker を探し、
                //   初出なら本物(金額あり)、2回目以降なら isDitto(〃) として配置する。
                //   これにより氏名と金額が正しく対応する(間野の金額は間野の行に表示される)。
                const baseWorkerRows = (() => {
                  const result = [];
                  const usedWorkerIdx = new Set();
                  // 1) normWasteRows の並びに従って worker を配置
                  normWasteRows.forEach((row) => {
                    // ★ 外注車行は自社作業員と結び付けない (空ダミーを置く)
                    if (row.isOutsource === true) {
                      result.push({ name: '', amount: 0, isOutsource: true });
                      return;
                    }
                    const wname = row.workerName;
                    if (wname) {
                      const wIdx = workers.findIndex((w, i) => !usedWorkerIdx.has(i) && w.name === wname);
                      if (wIdx >= 0) {
                        result.push(workers[wIdx]);
                        usedWorkerIdx.add(wIdx);
                        return;
                      }
                      // 既出の同名workerがいれば isDitto として配置
                      const existingIdx = workers.findIndex(w => w.name === wname);
                      if (existingIdx >= 0) {
                        result.push({ ...workers[existingIdx], isDitto: true, amount: 0 });
                        return;
                      }
                    }
                    // workerName未設定 or 該当workerなし: 未使用workerを順に or 最後のworkerをisDittoで補完
                    const nextUnused = workers.findIndex((w, i) => !usedWorkerIdx.has(i));
                    if (nextUnused >= 0) {
                      result.push(workers[nextUnused]);
                      usedWorkerIdx.add(nextUnused);
                    } else if (workers.length > 0) {
                      const last = workers[workers.length - 1];
                      result.push({ ...last, isDitto: true, amount: 0 });
                    }
                  });
                  // 2) 産廃で使われなかった残りの worker を末尾に追加(産廃を持たない作業員)
                  workers.forEach((w, i) => {
                    if (!usedWorkerIdx.has(i)) result.push(w);
                  });
                  return result;
                })();
                // ★ 行の並び: [自社運搬の産廃行] → [産廃を持たない作業員行] → [ワイエム配車行] → [環境課配車行]
                //   wasteAndScrap と effectiveWorkers は index を 1:1 で対応させる
                //   (作業員のみの行は産廃なし=null、ワイエム配車行は自社人工なし=空ダミー)
                const padCount = Math.max(0, baseWorkerRows.length - normWasteRows.length);
                const wasteAndScrap = [
                  ...normWasteRows,
                  ...Array.from({ length: padCount }, () => null),
                  ...extWasteRows,
                ];
                const effectiveWorkers = (() => {
                  const result = [
                    ...baseWorkerRows,
                    ...extWasteRows.map(() => ({ name: '', amount: 0, isExt: true })),
                    ...envWorkerRows,
                  ];
                  // 産廃も作業員も空のとき、最低限 workers を返す
                  if (result.length === 0) return [...workers, ...envWorkerRows];
                  return result;
                })();
                const maxSubRows = Math.max(1, effectiveWorkers.length, outsourcing.length, vehicles.length, machinery.length, envWorkerRows.length + wasteAndScrap.length);
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
                        {(()=>{
                          const isEnvRow = effectiveWorkers[subIdx]?.isEnv;
                          const isDittoRow = effectiveWorkers[subIdx]?.isDitto;
                          // ★修正: isDittoは除外しない (産廃側のnormIdxと同じロジックに統一)
                          //   これにより isDitto行でも wasteAndScrap[normIdx2] を参照でき、
                          //   その産廃に紐づく workerName(例:間野)があれば「〃」ではなくその名前を表示できる
                          let normIdx2 = 0;
                          for(let k=0;k<subIdx;k++){if(!effectiveWorkers[k]?.isEnv) normIdx2++;}
                          const wRow = !isEnvRow ? wasteAndScrap[normIdx2] : null;
                          const workerFromWaste = wRow?.workerName || '';
                          const workerFromSelf = effectiveWorkers[subIdx]?.name || '';
                          // 各行の「実名」を計算する関数(env行は括弧付き、それ以外はworkerName優先→自社人工名)
                          const resolveName = (idx) => {
                            const isE = effectiveWorkers[idx]?.isEnv;
                            const isD = effectiveWorkers[idx]?.isDitto;
                            const self = effectiveWorkers[idx]?.name || '';
                            if (isE) {
                              const shift = effectiveWorkers[idx]?.haishiShift;
                              const suffix = shift === 'night' ? '夜間' : '昼間';
                              const cleanName = self.replace(/[()]/g,'').replace(/\/(昼間|夜間|環配)$/,'');
                              return `(${cleanName})/${suffix}`;
                            }
                            // wasteAndScrap[idx相当]のworkerNameを取得
                            let nIdx = 0;
                            for(let k=0;k<idx;k++){if(!effectiveWorkers[k]?.isEnv) nIdx++;}
                            const w = wasteAndScrap[nIdx];
                            // ★ 外注車行・ワイエム配車行は自社人工欄に何も表示しない
                            if (w?.isOutsource === true || w?.isExt === true) return '';
                            const fromW = w?.workerName || '';
                            if (isD) return fromW || '';  // isDitto行は自社人工名は出さない(直後の同名チェックで〃に)
                            return fromW || self;
                          };
                          const currentName = resolveName(subIdx);
                          const prevName = subIdx > 0 ? resolveName(subIdx - 1) : '';
                          // ★ 直前と同じ名前なら「〃」表示(env行同士の比較は除く - env行は括弧付きで別扱い)
                          let displayName;
                          if (isEnvRow) {
                            displayName = currentName;
                          } else if (currentName && currentName === prevName) {
                            displayName = '〃';
                          } else {
                            displayName = currentName || (isDittoRow ? '〃' : '');
                          }
                          // ★ 外注車行・ワイエム配車行は自社人工金額を表示しない(個人名なし＝金額なし)
                          const isOutsourceRow = wRow?.isOutsource === true || wRow?.isExt === true;
                          return (<>
                            <td className="text-[8px]" style={isEnvRow?{color:'#374151'}:{}}>{displayName}</td>
                            <td className="text-right text-[8px]">{effectiveWorkers[subIdx]&&!isEnvRow&&!isDittoRow&&!isOutsourceRow?`¥${formatCurrency(effectiveWorkers[subIdx].amount)}`:''}</td>
                          </>);
                        })()}
                        <td className="text-[8px]">{outsourcing[subIdx] ? `${outsourcing[subIdx].company} ${getOutsourcingCount(outsourcing[subIdx])}人` : ''}</td>
                        <td className="text-right text-[8px]">{outsourcing[subIdx] ? `¥${formatCurrency(outsourcing[subIdx].amount)}` : ''}</td>
                        {/* 車両：通常車両 or 環境課車両 or ワイエム or 〃 */}
                        {(()=>{
                          const isEnvRow2 = effectiveWorkers[subIdx]?.isEnv;
                          const isDittoRow2 = effectiveWorkers[subIdx]?.isDitto;
                          // ★修正: isDittoは除外しない (担当者・産廃のnormIdxと同じロジックに統一)
                          let normIdx3 = 0;
                          for(let k=0;k<subIdx;k++){if(!effectiveWorkers[k]?.isEnv) normIdx3++;}
                          const wRow2 = !isEnvRow2 ? wasteAndScrap[normIdx3] : null;
                          // ★ ワイエム配車行は入力された配車車両(車種/車番)を表示。未入力なら「配車/ワイエム」
                          const vt = (wRow2?.isExt ? ((wRow2.workerVType || '配車')) : '')
                            || vehicles[subIdx]?.type
                            || (isEnvRow2 ? effectiveWorkers[subIdx].vType : '')
                            || (wRow2?.workerVType || '')
                            || (isDittoRow2 ? '〃' : '');
                          const vn = (wRow2?.isExt ? ((wRow2.workerVNumber || 'ワイエム')) : '')
                            || (vehicles[subIdx] ? vehicles[subIdx].number
                            : (isEnvRow2 ? effectiveWorkers[subIdx].vNumber : '')
                            || (wRow2?.workerVNumber || '')
                            || (isDittoRow2 ? '〃' : ''));
                          // ★ 前行の車種・車番を取得して、連続する同じ値なら 〃 に置換
                          const resolveVehicle = (idx) => {
                            const isE = effectiveWorkers[idx]?.isEnv;
                            const isD = effectiveWorkers[idx]?.isDitto;
                            let nIdx = 0;
                            for(let k=0;k<idx;k++){if(!effectiveWorkers[k]?.isEnv) nIdx++;}
                            const w = !isE ? wasteAndScrap[nIdx] : null;
                            const t = (w?.isExt ? (w.workerVType || '配車') : '')
                              || vehicles[idx]?.type
                              || (isE ? effectiveWorkers[idx].vType : '')
                              || (w?.workerVType || '');
                            const n = (w?.isExt ? (w.workerVNumber || 'ワイエム') : '')
                              || (vehicles[idx] ? vehicles[idx].number
                              : (isE ? effectiveWorkers[idx].vNumber : '')
                              || (w?.workerVNumber || ''));
                            return { t, n, isD };
                          };
                          const prev = subIdx > 0 ? resolveVehicle(subIdx - 1) : { t:'', n:'', isD:false };
                          const curT = vt === '〃' ? '' : vt;
                          const curN = vn === '〃' ? '' : vn;
                          // 直前と同じ車種・車番なら 〃 表示
                          let showT = vt, showN = vn;
                          if (curT && curT === prev.t && curN === prev.n) {
                            showT = '〃';
                            showN = '〃';
                          }
                          // ★ 乗り換え判定: wRow2 が isSwap なら車番に★を追加
                          const isSwapRow = wRow2?.isSwap === true;
                          // ★ ワイエム配車行は車番の下に「（ワイエム車）」を併記して自社車両と区別する
                          const showExtLabel = wRow2?.isExt === true && showN !== '〃' && !!(wRow2.workerVNumber || '');
                          return (<>
                            <td className="text-center text-[8px]">{showT}</td>
                            <td className="text-center text-[8px]">
                              {showN}{isSwapRow && showN !== '〃' ? <span style={{color:'#7C3AED',fontWeight:700,marginLeft:1}}>★</span> : null}
                              {showExtLabel ? <div style={{fontSize:'6px',lineHeight:1.15,color:'#4338CA',fontWeight:700}}>（ワイエム車）</div> : null}
                            </td>
                          </>);
                        })()}
                        <td className="text-[8px]">{machinery[subIdx]?.type || ''}</td>
                        {/* 産廃：環境課行はwaste、それ以外(自社運搬・ワイエム配車)はwasteAndScrap */}
                        {(()=>{
                          const envW = effectiveWorkers[subIdx]?.isEnv ? effectiveWorkers[subIdx].waste : null;
                          // ★修正: ワイエム配車行は wasteAndScrap に統合済み(subIdx直引きの衝突を解消)
                          // ★修正: isDittoは除外しない
                          //   isDitto行は「自社人工を〃で補完する行」だが、wasteAndScrapに合わせて足された行のため、
                          //   産廃データ(断熱材・金属など2件目以降)はisDitto行に表示する必要がある。
                          //   isEnv行のみ除外する(環境課行は envW を使うため wasteAndScrap のindexを進めない)。
                          let normIdx = -1;
                          if (!effectiveWorkers[subIdx]?.isEnv) {
                            normIdx = 0;
                            for (let k = 0; k < subIdx; k++) {
                              if (!effectiveWorkers[k]?.isEnv) normIdx++;
                            }
                          }
                          const normW = (normIdx >= 0) ? wasteAndScrap[normIdx] : null;
                          // ★ 優先順位: 環境課配車行 > 通常産廃/ワイエム配車行
                          const w = envW || normW;
                          // ★ isScrap判定: manifestNumber==='-' または amount<0 または isScrapフラグ
                          // ★ 道具車行の判定(先に判定)
                          const isToolRow = w && (w.isToolVehicle === true || w.kind === 'tool' || (w.material === '道具車' && (!w.amount || w.amount === 0) && (!w.quantity || w.quantity === 0)));
                          // ★ スクラップ判定(道具車は除外)
                          const isScrapRow = w && !isToolRow && ((w.amount||0) < 0 || w.isScrap === true || (w.manifestNumber==='-' && w.material !== '道具車'));
                          return (<>
                            <td className="text-[8px]">{w?.material||''}</td>
                            <td className="text-right text-[8px]" style={{whiteSpace:'nowrap'}}>{isToolRow ? '' : (w ? (w.volumeM3 ? `${w.quantity}${w.unit}/${w.volumeM3}㎥` : `${w.quantity}${w.unit}`) : '')}</td>
                            <td className="text-right text-[8px]" style={isScrapRow?{color:'#ef4444',fontWeight:700}:{}}>{isToolRow ? '' : (w?`¥${formatCurrency(Math.abs(w.amount||0))}`:'')}</td>
                            <td className="text-right text-[8px]" style={isScrapRow?{color:'#ef4444'}:{}}>{isToolRow ? '' : (w?.disposalSite||'')}</td>
                            <td className="text-right text-[8px]" style={isScrapRow?{color:'#ef4444',fontWeight:700}:{}}>{isToolRow ? '' : (isScrapRow?'スクラップ':(w?.manifestNumber||''))}</td>
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
                    <td colSpan="2" className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#374151' }}>¥{formatCurrency(pageAllVehicleCost + pageHaishiCost)}</td>
                    <td className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#374151' }}>¥{formatCurrency(pageMachineryCost)}</td>
                    <td colSpan="2" className="text-center text-[8px] font-bold" style={{ color: '#fff', background:'#374151', whiteSpace:'nowrap' }}>{(pageRows.reduce((s,r)=>(r.wasteItems||[]).reduce((a,w)=>a+(w.unit==='㎥'?(parseFloat(w.quantity)||0):(w.volumeM3?parseFloat(w.volumeM3)||0:0)),s),0)+pageRows.reduce((s,r)=>(r.scrapItems||[]).reduce((a,sc)=>a+(sc.volumeM3?parseFloat(sc.volumeM3)||0:0),s),0)).toFixed(1)}㎥</td><td className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#374151', whiteSpace:'nowrap' }}>¥{formatCurrency(pageWasteDisposal)}</td>
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
                      <td colSpan="2" className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#1a1a2e' }}>¥{formatCurrency(totalAllVehicleCost + totalHaishiCost)}</td>
                      <td className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#1a1a2e' }}>¥{formatCurrency(totalMachineryCost)}</td>
                      <td colSpan="2" className="text-center text-[8px] font-bold" style={{ color: '#fff', background:'#1a1a2e', whiteSpace:'nowrap' }}>{(allReports.reduce((s,r)=>(r.wasteItems||[]).reduce((a,w)=>a+(w.unit==='㎥'?(parseFloat(w.quantity)||0):(w.volumeM3?parseFloat(w.volumeM3)||0:0)),s),0)+allReports.reduce((s,r)=>(r.scrapItems||[]).reduce((a,sc)=>a+(sc.volumeM3?parseFloat(sc.volumeM3)||0:0),s),0)).toFixed(1)}㎥</td><td className="text-right text-[8px] font-bold" style={{ color: '#93C5FD', background:'#1a1a2e', whiteSpace:'nowrap' }}>¥{formatCurrency(totalWasteDisposal)}</td>
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

// ========== 管理画面「売上」タブ ==========
// 請求月（invoice_month）ごとに、工事売上・原価・粗利・金属売上を集計する。
// ・1現場の金額は calcSiteMoney（日報PDFと同じ数え方）で出す。ここで別の計算はしない
// ・請求月が入っている現場は、ステータスに関係なく集計に入れる。請求月が空の現場は入れない
// ・請求金額がまだ無い現場は、見積＋追加で「仮」として数える
// ・DBは読むだけ
const SALES_UNSET = '（未入力）';
const salesLabel = (v) => (String(v ?? '').trim() === '' ? SALES_UNSET : String(v));
const salesYen = (n) => `¥${formatCurrency(Math.round(n))}`;
const salesRate = (profit, revenue) => (revenue > 0 ? `${(profit / revenue * 100).toFixed(1)}%` : '—');

// 表をすべて読む（1回で返ってくる件数に上限があるので、空になるまで続けて読む）
async function loadAllRowsForSales(table, columns, order) {
  const all = [];
  for (let offset = 0; ; ) {
    const page = await sb(table).select(`select=${columns}&order=${order}&limit=1000&offset=${offset}`);
    if (!Array.isArray(page)) throw new Error(`${table} を読み込めませんでした`);
    if (page.length === 0) return all;
    all.push(...page);
    offset += page.length;
  }
}

// project_info の1行を、calcSiteMoney が読む形にする（お金の欄は loadProjectInfo と同じ読み方）。
// 請求金額は DB の値そのまま（完了でも見積＋追加で埋めない。請求金額が無ければ「仮」になる）
function salesProjectInfoFromRow(d) {
  const list = (v) => (Array.isArray(v) ? v : []);
  const rawMisc = d.misc_items !== undefined && d.misc_items !== null ? d.misc_items : [...list(d.site_expense_items), ...list(d.sga_items)];
  return {
    contractAmount: d.contract_amount || '',
    additionalAmount: d.additional_amount || '',
    billingAmount: d.billing_amount != null ? String(d.billing_amount) : '',
    transferCost: d.transfer_cost || '',
    leaseCost: d.lease_cost || '',
    materialsCost: d.materials_cost || '',
    expenses: list(d.expenses),
    outsourcingItems: list(d.outsourcing_items),
    sgaItems: list(d.sga_items),
    siteExpenseItems: list(d.site_expense_items),
    miscItems: list(rawMisc),
  };
}

// 現場の配列の合計（件数・工事売上・原価・粗利・金属売上・うち仮）
function sumSalesSites(list) {
  return list.reduce((t, s) => ({
    count: t.count + 1,
    revenue: t.revenue + s.revenue,
    cost: t.cost + s.cost,
    grossProfit: t.grossProfit + s.grossProfit,
    metalRevenue: t.metalRevenue + s.metalRevenue,
    provisionalCount: t.provisionalCount + (s.isProvisional ? 1 : 0),
    provisionalRevenue: t.provisionalRevenue + (s.isProvisional ? s.revenue : 0),
  }), { count: 0, revenue: 0, cost: 0, grossProfit: 0, metalRevenue: 0, provisionalCount: 0, provisionalRevenue: 0 });
}

// 月別の棒グラフ（工事売上と粗利）。ライブラリは使わず SVG で描く
function SalesBarChart({ months, isMobile }) {
  const W = isMobile ? 380 : 760, H = isMobile ? 200 : 230;
  const padL = isMobile ? 40 : 52, padR = 6, padT = 12, padB = 24;
  const vals = months.flatMap(m => [m.revenue, m.grossProfit]);
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals);
  const span = (max - min) || 1;
  const y = (v) => padT + (max - v) / span * (H - padT - padB);
  const groupW = (W - padL - padR) / months.length;
  const barW = groupW * 0.34;
  const man = (v) => `${Math.round(v / 10000).toLocaleString()}万`;
  const fs = isMobile ? 9 : 11;
  const ticks = [max, 0, ...(min < 0 ? [min] : [])].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block' }} role="img" aria-label="月別の工事売上と粗利のグラフ">
      {ticks.map(v => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'} />
          <text x={padL - 4} y={y(v) + 3} textAnchor="end" fontSize={fs} fill="#888">{v === 0 ? '0' : man(v)}</text>
        </g>
      ))}
      {months.map((m, i) => {
        const x0 = padL + i * groupW + groupW * 0.13;
        const bar = (v, x, color, label) => (
          <rect x={x} y={Math.min(y(v), y(0))} width={barW} height={Math.max(Math.abs(y(v) - y(0)), v !== 0 ? 1 : 0)} fill={color} rx="1.5">
            <title>{`${m.label} ${label} ${salesYen(v)}`}</title>
          </rect>
        );
        return (
          <g key={m.key}>
            {bar(m.revenue, x0, '#3B82F6', '工事売上')}
            {bar(m.grossProfit, x0 + barW + groupW * 0.06, m.grossProfit >= 0 ? '#00D68F' : '#FF4D4D', '粗利')}
            <text x={padL + i * groupW + groupW / 2} y={H - 7} textAnchor="middle" fontSize={fs} fill="#888">{i + 1}{isMobile ? '' : '月'}</text>
          </g>
        );
      })}
    </svg>
  );
}

function AdminSalesTab({ isMobile }) {
  const thisYear = new Date().getFullYear();
  const [data, setData] = useState({ loading: true, error: '', projects: [], reports: [] });
  const [year, setYear] = useState(thisYear);
  const [person, setPerson] = useState('全員');
  const [contract, setContract] = useState('全部');
  const [openMonth, setOpenMonth] = useState(null);
  const [openClient, setOpenClient] = useState(null);
  const [showMissing, setShowMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [projects, reports] = await Promise.all([
          loadAllRowsForSales('project_info', '*', 'site_name.asc'),
          loadAllRowsForSales('reports', 'id,site_name,work_details,waste_items,scrap_items', 'id.asc'),
        ]);
        if (alive) setData({ loading: false, error: '', projects, reports });
      } catch (e) {
        if (alive) setData({ loading: false, error: e?.message || String(e), projects: [], reports: [] });
      }
    })();
    return () => { alive = false; };
  }, []);

  // 1現場ずつの金額（calcSiteMoney）
  const sites = React.useMemo(() => {
    const reportsBySite = new Map();
    data.reports.forEach(r => {
      if (!reportsBySite.has(r.site_name)) reportsBySite.set(r.site_name, []);
      reportsBySite.get(r.site_name).push({ workDetails: r.work_details || {}, wasteItems: r.waste_items || [], scrapItems: r.scrap_items || [] });
    });
    return data.projects.filter(d => d.site_name).map(d => {
      const money = calcSiteMoney(reportsBySite.get(d.site_name) || [], salesProjectInfoFromRow(d));
      return {
        siteName: d.site_name,
        salesPerson: salesLabel(d.sales_person),
        client: salesLabel(d.client),
        // 請負区分は設定・編集と同じ決め方（DBの値、空なら発注者名から）
        contractType: d.contract_type || resolveContractTypeByClient(d.client || ''),
        status: (d.status === '着工前' || d.status === '進行中') ? '着工前・進行中' : (d.status || '着工前・進行中'),
        invoiceMonth: normalizeInvoiceMonth(d.invoice_month),
        revenue: money.revenue, cost: money.cost, grossProfit: money.grossProfit,
        metalRevenue: money.metalRevenue, isProvisional: money.isProvisional,
      };
    });
  }, [data]);

  // 担当の選択肢：全員／営業担当1人ずつ（件数の多い順）／（未入力）
  const personOptions = React.useMemo(() => {
    const counts = new Map();
    sites.forEach(s => counts.set(s.salesPerson, (counts.get(s.salesPerson) || 0) + 1));
    const names = [...counts.keys()].filter(n => n !== SALES_UNSET).sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b, 'ja'));
    return ['全員', ...names, ...(counts.has(SALES_UNSET) ? [SALES_UNSET] : [])];
  }, [sites]);
  const yearOptions = React.useMemo(() => {
    const ys = new Set([thisYear]);
    sites.forEach(s => { const m = /^(\d{4})-\d{2}$/.exec(s.invoiceMonth); if (m) ys.add(Number(m[1])); });
    return [...ys].sort((a, b) => b - a);
  }, [sites, thisYear]);

  const scoped = sites.filter(s => (person === '全員' || s.salesPerson === person) && (contract === '全部' || s.contractType === contract));
  const inYear = scoped.filter(s => /^\d{4}-\d{2}$/.test(s.invoiceMonth) && s.invoiceMonth.startsWith(`${year}-`));
  const months = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    const list = inYear.filter(s => s.invoiceMonth === key).sort((a, b) => b.revenue - a.revenue);
    return { key, label: `${i + 1}月`, list, ...sumSalesSites(list) };
  });
  const total = sumSalesSites(inYear);
  const clientMap = new Map();
  inYear.forEach(s => { if (!clientMap.has(s.client)) clientMap.set(s.client, []); clientMap.get(s.client).push(s); });
  const clients = [...clientMap.entries()]
    .map(([client, list]) => ({ client, list: [...list].sort((a, b) => b.revenue - a.revenue), ...sumSalesSites(list) }))
    .sort((a, b) => b.revenue - a.revenue);
  const missing = scoped.filter(s => s.status === '完了' && !s.invoiceMonth).sort((a, b) => a.siteName.localeCompare(b.siteName, 'ja'));

  // ---------- 見た目 ----------
  const card = { background:'#0F0F0F', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, padding: isMobile ? '14px' : '18px 20px', marginBottom: isMobile ? 16 : 20 };
  const cardTitle = { fontSize:13, fontWeight:600, marginBottom:10 };
  const th = { padding:'8px 10px', fontSize:11, color:'#888', fontWeight:500, textAlign:'right', whiteSpace:'nowrap', borderBottom:'1px solid rgba(255,255,255,0.08)' };
  const td = { padding:'9px 10px', fontSize:12, textAlign:'right', whiteSpace:'nowrap', fontFamily:"'SF Mono', monospace", borderBottom:'1px solid rgba(255,255,255,0.05)' };
  const left = { textAlign:'left', fontFamily:'inherit' };
  const selectStyle = { padding:'8px 10px', background:'#141414', color:'#EDEDED', border:'1px solid rgba(255,255,255,0.12)', borderRadius:7, fontSize:13, fontFamily:'inherit', minWidth: isMobile ? 0 : 120, width: isMobile ? '100%' : 'auto' };
  const profitColor = (v) => (v < 0 ? '#FF4D4D' : '#EDEDED');
  const kariBadge = <span style={{ marginLeft:6, padding:'1px 5px', borderRadius:4, fontSize:10, fontWeight:700, color:'#F5A623', background:'rgba(245,166,35,0.12)', border:'1px solid rgba(245,166,35,0.35)', fontFamily:'inherit' }}>仮</span>;
  const kariCell = (t) => (t.provisionalCount > 0 ? <span style={{ color:'#F5A623' }}>{t.provisionalCount}件・{salesYen(t.provisionalRevenue)}</span> : <span style={{ color:'#555' }}>—</span>);

  // 月か発注者の中の現場一覧
  const siteList = (list) => (
    <div style={{ padding:'6px 0 10px 12px' }}>
      <table style={{ borderCollapse:'collapse', width:'100%' }}>
        <thead><tr>
          <th style={{ ...th, ...left }}>現場名</th><th style={{ ...th, ...left }}>営業担当</th><th style={{ ...th, ...left }}>請求月</th><th style={th}>工事売上</th><th style={th}>粗利</th>
        </tr></thead>
        <tbody>
          {list.map(s => (
            <tr key={s.siteName}>
              <td style={{ ...td, ...left, whiteSpace:'normal', minWidth:140 }}>{s.siteName}</td>
              <td style={{ ...td, ...left }}>{s.salesPerson}</td>
              <td style={{ ...td, ...left }}>{formatInvoiceMonth(s.invoiceMonth)}</td>
              <td style={td}>{salesYen(s.revenue)}{s.isProvisional && kariBadge}</td>
              <td style={{ ...td, color: profitColor(s.grossProfit) }}>{salesYen(s.grossProfit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (data.loading) return <div style={{ textAlign:'center', padding:40, color:'#888' }}>売上を読み込み中...</div>;
  if (data.error) return <div style={{ ...card, color:'#FF4D4D' }}>読み込めませんでした：{data.error}</div>;

  return (
    <div>
      {/* 絞り込み */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, auto)', justifyContent: isMobile ? 'stretch' : 'start', gap: isMobile ? 8 : 12, marginBottom:14 }}>
        {[
          ['年', year, v => { setYear(Number(v)); setOpenMonth(null); setOpenClient(null); }, yearOptions.map(y => [y, `${y}年`])],
          ['担当', person, v => { setPerson(v); setOpenMonth(null); setOpenClient(null); }, personOptions.map(p => [p, p])],
          ['請負区分', contract, v => { setContract(v); setOpenMonth(null); setOpenClient(null); }, ['全部', 'フェイス', '入間緑化'].map(c => [c, c])],
        ].map(([label, value, onChange, options]) => (
          <label key={label} style={{ display:'flex', flexDirection:'column', gap:4, fontSize:11, color:'#888', minWidth:0 }}>
            {label}
            <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>
              {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        ))}
      </div>

      {/* 完了なのに請求月が空の現場（集計に入らない） */}
      <div style={{ marginBottom: isMobile ? 16 : 20 }}>
        <button onClick={() => missing.length > 0 && setShowMissing(v => !v)}
          style={{ width:'100%', textAlign:'left', padding:'10px 12px', borderRadius:8, cursor: missing.length > 0 ? 'pointer' : 'default', fontSize:13, fontFamily:'inherit',
            background: missing.length > 0 ? 'rgba(245,166,35,0.08)' : '#0F0F0F', border: `1px solid ${missing.length > 0 ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.08)'}`, color: missing.length > 0 ? '#F5A623' : '#888' }}>
          {missing.length > 0 ? '⚠ ' : ''}完了なのに請求月が空の現場：<b>{missing.length}件</b>
          {missing.length > 0 && <span style={{ float:'right' }}>{showMissing ? '閉じる ▲' : '一覧 ▼'}</span>}
        </button>
        {showMissing && missing.length > 0 && (
          <div style={{ ...card, marginTop:8, marginBottom:0, overflowX:'auto' }}>
            <div style={{ fontSize:11, color:'#888', marginBottom:6 }}>この現場は集計に入っていません。設定・編集で請求月を入れると、その月に入ります。</div>
            <table style={{ borderCollapse:'collapse', width:'100%' }}>
              <thead><tr><th style={{ ...th, ...left }}>現場名</th><th style={{ ...th, ...left }}>営業担当</th><th style={{ ...th, ...left }}>発注者</th></tr></thead>
              <tbody>
                {missing.map(s => (
                  <tr key={s.siteName}>
                    <td style={{ ...td, ...left, whiteSpace:'normal', minWidth:140 }}>{s.siteName}</td>
                    <td style={{ ...td, ...left }}>{s.salesPerson}</td>
                    <td style={{ ...td, ...left, whiteSpace:'normal' }}>{s.client}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 月別の表 */}
      <div style={card}>
        <div style={cardTitle}>月別（{year}年・請求月ごと）</div>
        <div style={{ fontSize:11, color:'#888', marginBottom:8, lineHeight:1.6 }}>
          請求月が入っている現場だけを数えます。請求金額がまだ無い現場は、見積＋追加で「仮」として数えます。金属売上は工事売上・粗利に入れません。行を押すと現場の一覧が出ます。
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse', width:'100%', minWidth:720 }}>
            <thead><tr>
              <th style={{ ...th, ...left }}>月</th><th style={th}>件数</th><th style={th}>工事売上</th><th style={th}>うち仮</th><th style={th}>原価</th><th style={th}>粗利</th><th style={th}>粗利率</th><th style={th}>金属売上</th>
            </tr></thead>
            <tbody>
              {months.map(m => (
                <Fragment key={m.key}>
                  <tr className={m.count > 0 ? 'admin-row' : undefined} onClick={() => m.count > 0 && setOpenMonth(openMonth === m.key ? null : m.key)} style={{ cursor: m.count > 0 ? 'pointer' : 'default', color: m.count > 0 ? '#EDEDED' : '#555' }}>
                    <td style={{ ...td, ...left }}>{m.count > 0 ? (openMonth === m.key ? '▼ ' : '▶ ') : ''}{m.label}</td>
                    <td style={td}>{m.count}</td>
                    <td style={td}>{m.count > 0 ? salesYen(m.revenue) : '—'}</td>
                    <td style={td}>{kariCell(m)}</td>
                    <td style={td}>{m.count > 0 ? salesYen(m.cost) : '—'}</td>
                    <td style={{ ...td, color: m.count > 0 ? profitColor(m.grossProfit) : undefined }}>{m.count > 0 ? salesYen(m.grossProfit) : '—'}</td>
                    <td style={td}>{m.count > 0 ? salesRate(m.grossProfit, m.revenue) : '—'}</td>
                    <td style={td}>{m.count > 0 ? salesYen(m.metalRevenue) : '—'}</td>
                  </tr>
                  {openMonth === m.key && <tr><td colSpan={8} style={{ padding:0, background:'#0B0B0B' }}>{siteList(m.list)}</td></tr>}
                </Fragment>
              ))}
              <tr style={{ fontWeight:700 }}>
                <td style={{ ...td, ...left, borderTop:'2px solid rgba(255,255,255,0.15)' }}>{year}年 合計</td>
                <td style={{ ...td, borderTop:'2px solid rgba(255,255,255,0.15)' }}>{total.count}</td>
                <td style={{ ...td, borderTop:'2px solid rgba(255,255,255,0.15)' }}>{salesYen(total.revenue)}</td>
                <td style={{ ...td, borderTop:'2px solid rgba(255,255,255,0.15)' }}>{kariCell(total)}</td>
                <td style={{ ...td, borderTop:'2px solid rgba(255,255,255,0.15)' }}>{salesYen(total.cost)}</td>
                <td style={{ ...td, borderTop:'2px solid rgba(255,255,255,0.15)', color: profitColor(total.grossProfit) }}>{salesYen(total.grossProfit)}</td>
                <td style={{ ...td, borderTop:'2px solid rgba(255,255,255,0.15)' }}>{salesRate(total.grossProfit, total.revenue)}</td>
                <td style={{ ...td, borderTop:'2px solid rgba(255,255,255,0.15)' }}>{salesYen(total.metalRevenue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 月別の棒グラフ */}
      <div style={card}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:8, flexWrap:'wrap' }}>
          <div style={{ ...cardTitle, marginBottom:0 }}>月別グラフ（{year}年）</div>
          <span style={{ fontSize:11, color:'#888', display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10, height:10, borderRadius:2, background:'#3B82F6', display:'inline-block' }}/>工事売上</span>
          <span style={{ fontSize:11, color:'#888', display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10, height:10, borderRadius:2, background:'#00D68F', display:'inline-block' }}/>粗利（赤はマイナス）</span>
        </div>
        <SalesBarChart months={months} isMobile={isMobile} />
      </div>

      {/* 発注者別の表 */}
      <div style={card}>
        <div style={cardTitle}>発注者別（{year}年・工事売上の多い順）</div>
        {clients.length === 0 ? (
          <div style={{ fontSize:12, color:'#888', padding:'8px 0' }}>この範囲に、請求月の入った現場はありません。</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ borderCollapse:'collapse', width:'100%', minWidth:520 }}>
              <thead><tr>
                <th style={{ ...th, ...left }}>発注者</th><th style={th}>件数</th><th style={th}>工事売上</th><th style={th}>粗利</th><th style={th}>粗利率</th>
              </tr></thead>
              <tbody>
                {clients.map(c => (
                  <Fragment key={c.client}>
                    <tr className="admin-row" onClick={() => setOpenClient(openClient === c.client ? null : c.client)} style={{ cursor:'pointer' }}>
                      <td style={{ ...td, ...left, whiteSpace:'normal' }}>{openClient === c.client ? '▼ ' : '▶ '}{c.client}</td>
                      <td style={td}>{c.count}</td>
                      <td style={td}>{salesYen(c.revenue)}{c.provisionalCount > 0 && kariBadge}</td>
                      <td style={{ ...td, color: profitColor(c.grossProfit) }}>{salesYen(c.grossProfit)}</td>
                      <td style={td}>{salesRate(c.grossProfit, c.revenue)}</td>
                    </tr>
                    {openClient === c.client && <tr><td colSpan={5} style={{ padding:0, background:'#0B0B0B' }}>{siteList(c.list)}</td></tr>}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== AdminPage (管理者ページ) ==========
function AdminPage({ currentUser, onLogout }) {
  const [adminTab, setAdminTab] = useState('dashboard');
  const [sites, setSites] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  // ★ モバイル対応
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // データ取得
  useEffect(() => {
    (async () => {
      try {
        const sitesData = await sb('sites').select('order=created_at.desc');
        const reportsData = await sb('reports').select('order=date.desc&limit=1000');
        setSites(Array.isArray(sitesData) ? sitesData : []);
        setReports(Array.isArray(reportsData) ? reportsData : []);
      } catch (e) { console.error('AdminPage load:', e); }
      setLoading(false);
    })();
  }, []);

  // 集計ロジック
  const calcStats = () => {
    const now = new Date();
    const thisMonth = now.getFullYear() * 100 + now.getMonth() + 1;
    const lastMonth = now.getMonth() === 0 ? (now.getFullYear() - 1) * 100 + 12 : now.getFullYear() * 100 + now.getMonth();

    let mRevenue = 0, mCost = 0, lRevenue = 0, lCost = 0;
    const siteStats = {};

    reports.forEach(r => {
      if (!r.date) return;
      const d = new Date(r.date);
      const ym = d.getFullYear() * 100 + d.getMonth() + 1;
      const siteName = r.site_name || '';

      // 日報から原価を計算 (workDetails内のコストデータ)
      const wd = r.work_details || {};
      const selfCost = (wd.selfWorkers || 0) * 20000;
      const envCost = (wd.envWorkers || 0) * 20000;
      const extCost = (wd.extWorkers || 0) * 22000;
      const vehCost = (wd.vehicles || []).reduce((s, v) => s + (Number(v.unitPrice) || 0), 0);
      const transCost = (wd.transportEntries || []).reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const dispCost = (r.waste_items || []).reduce((s, w) => s + (Number(w.disposalCost) || 0), 0);
      const totalCost = selfCost + envCost + extCost + vehCost + transCost + dispCost;

      if (ym === thisMonth) { mCost += totalCost; }
      if (ym === lastMonth) { lCost += totalCost; }

      if (!siteStats[siteName]) siteStats[siteName] = { cost: 0, count: 0 };
      siteStats[siteName].cost += totalCost;
      siteStats[siteName].count++;
    });

    // 売上: sitesの contract_amount をプロジェクト完了時に計上する簡易バージョン
    sites.forEach(s => {
      const amt = Number(s.contract_amount) || 0;
      // 今月の進行中現場の受注金額を暫定的に今月売上とする
      if (s.status === '着工前・進行中' || s.status === '進行中' || s.status === '着工前' || !s.status) mRevenue += amt * 0.3; // 進捗30%と仮定
      if (s.status === '完了') mRevenue += amt * 0.1;
    });

    const mProfit = mRevenue - mCost;
    const profitRate = mRevenue > 0 ? (mProfit / mRevenue * 100) : 0;
    const inProgressCount = sites.filter(s => s.status === '着工前・進行中' || s.status === '進行中' || s.status === '着工前' || !s.status).length;
    const completingCount = sites.filter(s => {
      if (!s.end_date) return false;
      const end = new Date(s.end_date);
      const monthLater = new Date(); monthLater.setMonth(monthLater.getMonth() + 1);
      return end <= monthLater && (s.status === '着工前・進行中' || s.status === '進行中' || s.status === '着工前' || !s.status);
    }).length;

    return { mRevenue, mCost, mProfit, profitRate, lRevenue, lCost, inProgressCount, completingCount, siteStats };
  };

  const stats = calcStats();
  const prevDiff = stats.lCost > 0 ? ((stats.mCost - stats.lCost) / stats.lCost * 100).toFixed(1) : 0;

  // 過去12ヶ月の月次推移
  const monthlyData = (() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = d.getFullYear() * 100 + d.getMonth() + 1;
      const label = `${d.getMonth() + 1}月`;
      let cost = 0;
      reports.forEach(r => {
        if (!r.date) return;
        const rd = new Date(r.date);
        if (rd.getFullYear() * 100 + rd.getMonth() + 1 === ym) {
          const wd = r.work_details || {};
          cost += (wd.selfWorkers || 0) * 20000 + (wd.envWorkers || 0) * 20000 + (wd.extWorkers || 0) * 22000 +
                  (wd.vehicles || []).reduce((s, v) => s + (Number(v.unitPrice) || 0), 0) +
                  (wd.transportEntries || []).reduce((s, t) => s + (Number(t.amount) || 0), 0) +
                  (r.waste_items || []).reduce((s, w) => s + (Number(w.disposalCost) || 0), 0);
        }
      });
      months.push({ label, cost, revenue: cost * 1.3 });
    }
    return months;
  })();

  const maxY = Math.max(1000000, ...monthlyData.map(m => m.revenue));

  // 現場別ランキング
  const siteRanking = sites
    .filter(s => s.status === '着工前・進行中' || s.status === '進行中' || s.status === '着工前' || s.status === '完了' || !s.status)
    .map(s => {
      const cost = stats.siteStats[s.name]?.cost || 0;
      const revenue = (Number(s.contract_amount) || 0) * 0.3;
      return { ...s, cost, revenue, profit: revenue - cost, rate: revenue > 0 ? (revenue - cost) / revenue * 100 : 0 };
    })
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  const fmt = (n) => '¥' + Math.round(n).toLocaleString();
  const fmtM = (n) => {
    if (n >= 10000000) return '¥' + (n / 10000000).toFixed(1) + '千万';
    if (n >= 1000000) return '¥' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 10000) return '¥' + Math.round(n / 10000) + '万';
    return '¥' + Math.round(n).toLocaleString();
  };

  // ========== UI ==========
  return (
    <div style={{ background:'#0A0A0A', color:'#EDEDED', minHeight:'100vh', fontFamily:"'Inter', -apple-system, 'Hiragino Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes shimmer { 0%{opacity:.4}50%{opacity:1}100%{opacity:.4} }
        .admin-nav-item:hover { background:#141414 !important; color:#EDEDED !important; }
        .admin-card:hover { border-color:rgba(255,255,255,0.12) !important; }
        .admin-row:hover td { background:#141414 !important; }
      `}</style>

      {/* モバイル用オーバーレイ */}
      {isMobile && mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9, backdropFilter:'blur(4px)' }}/>
      )}

      {/* サイドバー */}
      <aside style={{ 
        position:'fixed', top:0, left:0, bottom:0, 
        width: isMobile ? 260 : 220, 
        background:'#0F0F0F', 
        borderRight:'1px solid rgba(255,255,255,0.08)', 
        padding:'20px 14px', 
        zIndex:10,
        transform: (isMobile && !mobileMenuOpen) ? 'translateX(-100%)' : 'translateX(0)',
        transition:'transform .25s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowY:'auto'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 8px', marginBottom:28 }}>
          <div style={{ width:28, height:28, borderRadius:6, background:'linear-gradient(135deg,#00D68F,#00A86B)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'#000', fontSize:14 }}>W</div>
          <div style={{ fontWeight:700, fontSize:15, letterSpacing:'-0.01em', flex:1 }}>Wac Admin</div>
          {isMobile && (
            <button onClick={() => setMobileMenuOpen(false)} style={{ background:'transparent', border:'none', color:'#888', cursor:'pointer', fontSize:18, padding:4 }}>✕</button>
          )}
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:10, color:'#555', textTransform:'uppercase', letterSpacing:'0.1em', padding:'0 10px', marginBottom:6, fontWeight:600 }}>Overview</div>
          {[
            ['dashboard', '📊', 'ダッシュボード'],
            ['sales', '💴', '売上'],
            ['budget', '🎯', '予算・実績'],
            ['analysis', '📈', '分析'],
          ].map(([id, icon, label]) => (
            <div key={id} className="admin-nav-item" onClick={() => { setAdminTab(id); setMobileMenuOpen(false); }}
              style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 10px', borderRadius:6, color: adminTab===id ? '#EDEDED' : '#888', cursor:'pointer', fontSize:13, fontWeight:500, background: adminTab===id ? '#141414' : 'transparent', position:'relative' }}>
              {adminTab===id && <div style={{ position:'absolute', left:-2, top:6, bottom:6, width:3, background:'#00D68F', borderRadius:2 }}/>}
              <span style={{ fontSize:14 }}>{icon}</span>{label}
            </div>
          ))}
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:10, color:'#555', textTransform:'uppercase', letterSpacing:'0.1em', padding:'0 10px', marginBottom:6, fontWeight:600 }}>Management</div>
          {[
            ['sites', '🏗', '現場管理'],
            ['master', '🗂', 'マスタ'],
            ['users', '👥', 'ユーザー'],
          ].map(([id, icon, label]) => (
            <div key={id} className="admin-nav-item" onClick={() => { setAdminTab(id); setMobileMenuOpen(false); }}
              style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 10px', borderRadius:6, color: adminTab===id ? '#EDEDED' : '#888', cursor:'pointer', fontSize:13, fontWeight:500, background: adminTab===id ? '#141414' : 'transparent' }}>
              <span style={{ fontSize:14 }}>{icon}</span>{label}
            </div>
          ))}
        </div>

        <div style={{ position:'absolute', bottom:20, left:14, right:14 }}>
          <div style={{ padding:'10px', background:'#141414', borderRadius:6, display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'#2D3548', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>AD</div>
            <div style={{ flex:1, fontSize:12 }}>
              <div style={{ fontWeight:600 }}>{currentUser?.userId || 'admin'}</div>
              <div style={{ fontSize:10, color:'#888' }}>管理者</div>
            </div>
            <button onClick={onLogout} style={{ background:'transparent', border:'none', color:'#888', cursor:'pointer', fontSize:14 }}>⎋</button>
          </div>
        </div>
      </aside>

      {/* メイン */}
      <main style={{ marginLeft: isMobile ? 0 : 220, minHeight:'100vh' }}>
        {/* ヘッダー */}
        <div style={{ padding: isMobile ? '14px 16px' : '20px 32px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(10,10,10,0.85)', backdropFilter:'blur(12px)', position:'sticky', top:0, zIndex:5, gap:10 }}>
          {isMobile && (
            <button onClick={() => setMobileMenuOpen(true)} style={{ background:'transparent', border:'none', color:'#EDEDED', cursor:'pointer', padding:6, marginLeft:-6, display:'flex', alignItems:'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          )}
          <div style={{ flex:1, minWidth:0 }}>
            <h1 style={{ fontSize: isMobile ? 16 : 20, fontWeight:600, letterSpacing:'-0.01em', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {adminTab==='dashboard' ? 'ダッシュボード' : adminTab==='sales' ? '売上' : adminTab==='budget' ? '予算・実績' : adminTab==='analysis' ? '分析' : adminTab==='sites' ? '現場管理' : adminTab==='master' ? 'マスタ' : adminTab==='users' ? 'ユーザー' : ''}
            </h1>
            {!isMobile && <div style={{ fontSize:12, color:'#888', marginTop:2 }}>リアルタイム経営状況 · {new Date().getFullYear()}年{new Date().getMonth()+1}月</div>}
          </div>
          {/* 期間の切り替えはダッシュボード用。売上タブは自分の絞り込み（年・担当・請負区分）を使うので出さない */}
          {adminTab !== 'sales' && (
          <div style={{ display:'flex', gap:2, padding:3, background:'#0F0F0F', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, flexShrink:0 }}>
            {[['24h','24h'],['7d','7d'],['30d','30d'],['1y','1y']].map(([v,l]) => (
              <button key={v} onClick={()=>setPeriod(v)} style={{ padding: isMobile ? '4px 8px' : '5px 12px', background: period===v?'#141414':'transparent', border:'none', color: period===v?'#EDEDED':'#888', fontSize: isMobile ? 11 : 12, cursor:'pointer', borderRadius:5, fontFamily:'inherit', fontWeight: period===v?600:500 }}>{l}</button>
            ))}
          </div>
          )}
        </div>

        {/* コンテンツ */}
        <div style={{ padding: isMobile ? '16px' : '24px 32px' }}>

        {loading && <div style={{ textAlign:'center', padding:40, color:'#888' }}>読み込み中...</div>}

        {!loading && adminTab === 'dashboard' && (
          <>
            {/* KPI 4カード */}
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? 8 : 12, marginBottom: isMobile ? 20 : 28 }}>
              <div className="admin-card" style={{ padding: isMobile?'14px':'18px 20px', background:'#0F0F0F', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9 }}>
                <div style={{ fontSize:11, color:'#888', fontWeight:500, marginBottom:6 }}>📈 今月売上</div>
                <div style={{ fontSize: isMobile?20:26, fontWeight:600, letterSpacing:'-0.02em', fontFamily:"'SF Mono', monospace" }}>{fmtM(stats.mRevenue)}</div>
                <div style={{ fontSize:12, marginTop:8, color:'#888' }}>暫定 · 契約額×進捗</div>
              </div>
              <div className="admin-card" style={{ padding: isMobile?'14px':'18px 20px', background:'#0F0F0F', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9 }}>
                <div style={{ fontSize:11, color:'#888', fontWeight:500, marginBottom:6 }}>📦 今月原価</div>
                <div style={{ fontSize: isMobile?20:26, fontWeight:600, letterSpacing:'-0.02em', fontFamily:"'SF Mono', monospace" }}>{fmtM(stats.mCost)}</div>
                <div style={{ fontSize:12, marginTop:8, color: Number(prevDiff) > 0 ? '#FF4D4D' : '#00D68F' }}>
                  {Number(prevDiff) > 0 ? '↑' : '↓'} {Math.abs(Number(prevDiff))}% 前月比
                </div>
              </div>
              <div className="admin-card" style={{ padding: isMobile?'14px':'18px 20px', background:'#0F0F0F', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9 }}>
                <div style={{ fontSize:11, color:'#888', fontWeight:500, marginBottom:6 }}>✨ 粗利</div>
                <div style={{ fontSize: isMobile?20:26, fontWeight:600, letterSpacing:'-0.02em', fontFamily:"'SF Mono', monospace", color: stats.mProfit >= 0 ? '#EDEDED' : '#FF4D4D' }}>{fmtM(stats.mProfit)}</div>
                <div style={{ fontSize:12, marginTop:8, color: stats.profitRate >= 30 ? '#00D68F' : '#F5A623' }}>粗利率 {stats.profitRate.toFixed(1)}%</div>
              </div>
              <div className="admin-card" style={{ padding: isMobile?'14px':'18px 20px', background:'#0F0F0F', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9 }}>
                <div style={{ fontSize:11, color:'#888', fontWeight:500, marginBottom:6 }}>🏗 着工前・進行中現場</div>
                <div style={{ fontSize: isMobile?20:26, fontWeight:600, letterSpacing:'-0.02em', fontFamily:"'SF Mono', monospace" }}>{stats.inProgressCount}<span style={{ fontSize:13, color:'#888', fontWeight:500, marginLeft:2 }}>件</span></div>
                <div style={{ fontSize:12, marginTop:8, color:'#888' }}>完了予定 {stats.completingCount}件</div>
              </div>
            </div>

            {/* 売上・粗利推移 */}
            <div style={{ background:'#0F0F0F', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, marginBottom:12 }}>
              <div style={{ padding: isMobile?'12px 14px':'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, letterSpacing:'-0.01em' }}>📊 月次推移</div>
                  <div style={{ fontSize:11, color:'#888', marginTop:2 }}>過去12ヶ月 · 原価ベース</div>
                </div>
                <div style={{ display:'flex', gap:14, fontSize:11, color:'#888' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10, height:2, background:'#00D68F' }}/>売上</span>
                  <span style={{ display:'flex', alignItems:'center', gap:5 }}><span style={{ width:10, height:2, background:'#F5A623' }}/>原価</span>
                </div>
              </div>
              <div style={{ padding: isMobile?12:20 }}>
                <svg viewBox="0 0 600 200" preserveAspectRatio="none" style={{ width:'100%', height: isMobile ? 160 : 200 }}>
                  <line x1="0" y1="50" x2="600" y2="50" stroke="rgba(255,255,255,0.04)"/>
                  <line x1="0" y1="100" x2="600" y2="100" stroke="rgba(255,255,255,0.04)"/>
                  <line x1="0" y1="150" x2="600" y2="150" stroke="rgba(255,255,255,0.04)"/>
                  <defs>
                    <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00D68F" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#00D68F" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F5A623" stopOpacity="0.15"/>
                      <stop offset="100%" stopColor="#F5A623" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {(() => {
                    const w = 600, h = 200;
                    const step = w / (monthlyData.length - 1);
                    const scaleY = (v) => h - (v / maxY) * (h - 20);
                    const salesPoints = monthlyData.map((m, i) => `${i * step},${scaleY(m.revenue)}`).join(' L ');
                    const costPoints = monthlyData.map((m, i) => `${i * step},${scaleY(m.cost)}`).join(' L ');
                    return (
                      <>
                        <path d={`M ${salesPoints} L ${w},${h} L 0,${h} Z`} fill="url(#gradSales)"/>
                        <path d={`M ${costPoints} L ${w},${h} L 0,${h} Z`} fill="url(#gradCost)"/>
                        <path d={`M ${salesPoints}`} fill="none" stroke="#00D68F" strokeWidth="1.8"/>
                        <path d={`M ${costPoints}`} fill="none" stroke="#F5A623" strokeWidth="1.8"/>
                        {monthlyData.map((m, i) => (
                          <g key={i}>
                            <text x={i * step} y={h - 3} textAnchor="middle" fill="#555" fontSize="9">{m.label}</text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* 現場パフォーマンス */}
            <div style={{ background:'#0F0F0F', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9 }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize:13, fontWeight:600 }}>🏆 現場パフォーマンス</div>
                <div style={{ fontSize:11, color:'#888', marginTop:2 }}>今月の粗利 · TOP 5</div>
              </div>
              <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth: isMobile ? 600 : 'auto' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: isMobile?'8px 12px':'10px 20px', textAlign:'left', color:'#888', fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'.08em' }}>#</th>
                    <th style={{ padding: isMobile?'8px 12px':'10px 20px', textAlign:'left', color:'#888', fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'.08em' }}>現場</th>
                    <th style={{ padding: isMobile?'8px 12px':'10px 20px', textAlign:'left', color:'#888', fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'.08em' }}>ステータス</th>
                    <th style={{ padding: isMobile?'8px 12px':'10px 20px', textAlign:'right', color:'#888', fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'.08em' }}>売上</th>
                    <th style={{ padding: isMobile?'8px 12px':'10px 20px', textAlign:'right', color:'#888', fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'.08em' }}>原価</th>
                    <th style={{ padding: isMobile?'8px 12px':'10px 20px', textAlign:'right', color:'#888', fontSize:11, fontWeight:500, textTransform:'uppercase', letterSpacing:'.08em' }}>粗利率</th>
                  </tr>
                </thead>
                <tbody>
                  {siteRanking.length === 0 ? (
                    <tr><td colSpan="6" style={{ padding:40, textAlign:'center', color:'#555' }}>データがありません</td></tr>
                  ) : siteRanking.map((s, i) => (
                    <tr key={i} className="admin-row" style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                      <td style={{ padding: isMobile?'10px 12px':'12px 20px', color:'#888', fontFamily:"'SF Mono', monospace", fontSize:12 }}>{String(i+1).padStart(2,'0')}</td>
                      <td style={{ padding: isMobile?'10px 12px':'12px 20px', fontWeight:500 }}>{s.name}</td>
                      <td style={{ padding:'12px 20px' }}>
                        {s.status === '完了' ? <span style={{ padding:'2px 8px', background:'rgba(0,214,143,0.15)', color:'#00D68F', borderRadius:99, fontSize:11, fontWeight:500 }}>● 完了</span>
                          : <span style={{ padding:'2px 8px', background:'rgba(59,130,246,0.15)', color:'#3B82F6', borderRadius:99, fontSize:11, fontWeight:500 }}>● {s.status || '着工前・進行中'}</span>}
                      </td>
                      <td style={{ padding: isMobile?'10px 12px':'12px 20px', textAlign:'right', fontFamily:"'SF Mono', monospace", fontSize:12 }}>{fmt(s.revenue)}</td>
                      <td style={{ padding: isMobile?'10px 12px':'12px 20px', textAlign:'right', fontFamily:"'SF Mono', monospace", fontSize:12 }}>{fmt(s.cost)}</td>
                      <td style={{ padding: isMobile?'10px 12px':'12px 20px', textAlign:'right', fontFamily:"'SF Mono', monospace", fontSize:12, color: s.rate >= 30 ? '#00D68F' : s.rate >= 20 ? '#F5A623' : '#FF4D4D', fontWeight:600 }}>{s.rate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}

        {!loading && adminTab === 'budget' && (
          <div style={{ padding:40, background:'#0F0F0F', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🎯</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>予算・実績機能</div>
            <div style={{ fontSize:13, color:'#888' }}>現場ごとの予算と実績を管理 - 次回実装予定</div>
          </div>
        )}

        {!loading && adminTab === 'analysis' && (
          <div style={{ padding:40, background:'#0F0F0F', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📈</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>分析機能</div>
            <div style={{ fontSize:13, color:'#888' }}>詳細なグラフ・分析 - 次回実装予定</div>
          </div>
        )}

        {!loading && adminTab === 'sales' && <AdminSalesTab isMobile={isMobile} />}

        {!loading && adminTab === 'sites' && (
          <div style={{ background:'#0F0F0F', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9 }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize:13, fontWeight:600 }}>🏗 現場一覧</div>
              <div style={{ fontSize:11, color:'#888', marginTop:2 }}>全 {sites.length} 件</div>
            </div>
            <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth: isMobile ? 600 : 'auto' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ padding: isMobile?'8px 12px':'10px 20px', textAlign:'left', color:'#888', fontSize:11, fontWeight:500 }}>現場</th>
                  <th style={{ padding: isMobile?'8px 12px':'10px 20px', textAlign:'left', color:'#888', fontSize:11, fontWeight:500 }}>番号</th>
                  <th style={{ padding: isMobile?'8px 12px':'10px 20px', textAlign:'left', color:'#888', fontSize:11, fontWeight:500 }}>ステータス</th>
                  <th style={{ padding: isMobile?'8px 12px':'10px 20px', textAlign:'right', color:'#888', fontSize:11, fontWeight:500 }}>受注金額</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s, i) => (
                  <tr key={i} className="admin-row" style={{ borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                    <td style={{ padding: isMobile?'10px 12px':'12px 20px', fontWeight:500 }}>{s.name}</td>
                    <td style={{ padding: isMobile?'10px 12px':'12px 20px', color:'#888', fontFamily:"'SF Mono', monospace", fontSize:12 }}>{s.project_number || '-'}</td>
                    <td style={{ padding:'12px 20px' }}>
                      <span style={{ padding:'2px 8px', background:'rgba(59,130,246,0.15)', color:'#3B82F6', borderRadius:99, fontSize:11 }}>{s.status || '着工前・進行中'}</span>
                    </td>
                    <td style={{ padding: isMobile?'10px 12px':'12px 20px', textAlign:'right', fontFamily:"'SF Mono', monospace", fontSize:12 }}>{s.contract_amount ? fmt(Number(s.contract_amount)) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {!loading && adminTab === 'master' && (
          <div style={{ padding:40, background:'#0F0F0F', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🗂</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>マスタ管理</div>
            <div style={{ fontSize:13, color:'#888' }}>勘定科目・処分場・運搬業者のマスタ - 次回実装予定</div>
          </div>
        )}

        {!loading && adminTab === 'users' && (
          <div style={{ padding:40, background:'#0F0F0F', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>👥</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>ユーザー管理</div>
            <div style={{ fontSize:13, color:'#888' }}>アカウント管理・権限設定 - 次回実装予定</div>
          </div>
        )}

        </div>
      </main>
    </div>
  );
}

// ========== ChatPage (現場チャット) ==========
function ChatPage({ sites, currentUser, selectedSite, onSelectSite, onNavigate }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState(selectedSite ? 'chat' : 'siteList'); // 'siteList' or 'chat'
  const [activeSite, setActiveSite] = useState(selectedSite || '');
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const userId = currentUser?.userId || 'unknown';
  const userName = currentUser?.userId === 'face1991' ? '会社代表' 
    : currentUser?.userId === 'ryokuka2005' ? '緑化担当'
    : currentUser?.userId === 'admin2026' ? '管理者'
    : currentUser?.userId || 'ゲスト';

  // メッセージ読み込み
  const loadMessages = async (siteName) => {
    if (!siteName) return;
    setLoading(true);
    try {
      const url = `site_name=eq.${encodeURIComponent(siteName)}&order=created_at.asc&limit=200`;
      const data = await sb('site_messages').select(url);
      setMessages(data || []);
      // 既読マーク
      markAsRead(data || []);
    } catch (e) { console.error('load messages error:', e); }
    setLoading(false);
  };

  // 未読数を現場ごとに取得(サイトリスト用)
  const loadUnreadCounts = async () => {
    if (!sites || sites.length === 0) return;
    try {
      const data = await sb('site_messages').select('order=created_at.desc&limit=500');
      const counts = {};
      (data || []).forEach(m => {
        const readBy = m.read_by || [];
        if (!readBy.includes(userId) && m.user_id !== userId) {
          counts[m.site_name] = (counts[m.site_name] || 0) + 1;
        }
      });
      setUnreadCounts(counts);
    } catch (e) { console.error('load unread error:', e); }
  };

  // 既読マーク
  const markAsRead = async (msgs) => {
    const unread = msgs.filter(m => {
      const readBy = m.read_by || [];
      return !readBy.includes(userId) && m.user_id !== userId;
    });
    if (unread.length === 0) return;
    for (const m of unread) {
      const newReadBy = [...(m.read_by || []), userId];
      await sb('site_messages').update({ read_by: newReadBy }, `id=eq.${m.id}`);
    }
  };

  // メッセージ送信
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeSite) return;
    const text = newMessage.trim();
    setNewMessage('');
    try {
      const result = await sb('site_messages').insert({
        site_name: activeSite,
        user_id: userId,
        user_name: userName,
        message: text,
        image_url: null,
        read_by: [userId]
      });
      // Realtimeで入ってくる前に、即座にローカル追加
      if (Array.isArray(result) && result[0]) {
        setMessages(prev => [...prev, result[0]]);
      }
    } catch (e) { console.error('send error:', e); alert('送信失敗'); }
  };

  // 写真アップロード
  const uploadImage = async (file) => {
    if (!file || !activeSite) return;
    setUploading(true);
    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${activeSite}_${timestamp}_${Math.random().toString(36).slice(2,8)}.${ext}`;
      
      const _url = 'https://ruomhthswdxylopkhmnh.supabase.co';
      const _key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1b21odGhzd2R4eWxvcGtobW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzQ1NjMsImV4cCI6MjA4NzUxMDU2M30.kH60ggCa7t_M7iJQbTpgJOgUUEl_rMQZM5e6Mob6hEE';
      
      const uploadRes = await fetch(`${_url}/storage/v1/object/chat-images/${encodeURIComponent(filename)}`, {
        method: 'POST',
        headers: {
          'apikey': _key,
          'Authorization': 'Bearer ' + _key,
          'Content-Type': file.type
        },
        body: file
      });
      if (!uploadRes.ok) throw new Error('upload failed');
      
      const imageUrl = `${_url}/storage/v1/object/public/chat-images/${encodeURIComponent(filename)}`;
      const result = await sb('site_messages').insert({
        site_name: activeSite,
        user_id: userId,
        user_name: userName,
        message: null,
        image_url: imageUrl,
        read_by: [userId]
      });
      if (Array.isArray(result) && result[0]) {
        setMessages(prev => [...prev, result[0]]);
      }
    } catch (e) { console.error('upload error:', e); alert('画像アップロード失敗'); }
    setUploading(false);
  };

  // 初回読み込み + 未読カウント
  useEffect(() => { loadUnreadCounts(); }, [sites]);
  useEffect(() => {
    if (view === 'chat' && activeSite) {
      loadMessages(activeSite);
    }
  }, [view, activeSite]);

  // Supabase Realtime: 他の人の投稿を受信
  useEffect(() => {
    if (view !== 'chat' || !activeSite) return;
    const _url = 'https://ruomhthswdxylopkhmnh.supabase.co';
    const _key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1b21odGhzd2R4eWxvcGtobW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzQ1NjMsImV4cCI6MjA4NzUxMDU2M30.kH60ggCa7t_M7iJQbTpgJOgUUEl_rMQZM5e6Mob6hEE';
    const wsUrl = _url.replace('https://', 'wss://') + '/realtime/v1/websocket?apikey=' + _key + '&vsn=1.0.0';
    let ws;
    let pingInterval;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        // 購読
        ws.send(JSON.stringify({
          topic: 'realtime:public:site_messages',
          event: 'phx_join',
          payload: { config: { postgres_changes: [{ event: 'INSERT', schema: 'public', table: 'site_messages' }] } },
          ref: '1'
        }));
        pingInterval = setInterval(() => {
          if (ws.readyState === 1) ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: 'hb' }));
        }, 30000);
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.event === 'postgres_changes' && msg.payload?.data?.record) {
            const newMsg = msg.payload.data.record;
            if (newMsg.site_name === activeSite && newMsg.user_id !== userId) {
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                markAsRead([newMsg]);
                return [...prev, newMsg];
              });
            }
          }
        } catch (err) {}
      };
    } catch (e) { console.error('ws error:', e); }
    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, [view, activeSite, userId]);

  // 自動スクロール
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 日付区切り
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const days = ['日','月','火','水','木','金','土'];
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} (${days[d.getDay()]})`;
  };
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };
  const getAvatar = (name) => {
    if (!name) return '?';
    return name.charAt(0);
  };
  const getAvatarColor = (name) => {
    if (!name) return '#888';
    const colors = ['#3B82F6','#22c55e','#a855f7','#F59E0B','#EC4899','#06B6D4','#10B981','#F97316'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // ========== サイト選択画面 ==========
  if (view === 'siteList') {
    return (
      <div style={{padding:'16px',minHeight:'calc(100vh - 60px)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
          <MessageCircle className="w-6 h-6" style={{color:'#3B82F6'}}/>
          <div>
            <h2 style={{fontSize:20,fontWeight:800,color:'#fff',margin:0}}>チャット</h2>
            <p style={{fontSize:11,color:'#999',margin:0,marginTop:2}}>現場を選んでチャットを開始</p>
          </div>
        </div>

        {sites.length === 0 ? (
          <div style={{padding:'40px 20px',textAlign:'center',color:'#888',fontSize:13}}>
            現場が登録されていません
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {sites.map(site => {
              const unread = unreadCounts[site.name] || 0;
              return (
                <button key={site.name} onClick={()=>{setActiveSite(site.name); setView('chat'); onSelectSite && onSelectSite(site.name);}}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:'#1E293B',border:'1px solid #2D3548',borderRadius:12,cursor:'pointer',fontFamily:'inherit',textAlign:'left',transition:'all .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#252B3D'}
                  onMouseLeave={e=>e.currentTarget.style.background='#1E293B'}>
                  <div style={{width:40,height:40,borderRadius:10,background:'rgba(59,130,246,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <MessageCircle className="w-5 h-5" style={{color:'#60a5fa'}}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{site.name}</div>
                    {site.projectNumber && <div style={{fontSize:10,color:'#888',marginTop:2}}>{site.projectNumber}</div>}
                  </div>
                  {unread > 0 && (
                    <div style={{minWidth:22,height:22,borderRadius:11,background:'#EF4444',color:'#fff',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 7px',flexShrink:0}}>
                      {unread > 99 ? '99+' : unread}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ========== チャット画面 ==========
  const groupedMessages = [];
  let lastDate = '';
  messages.forEach(m => {
    const dStr = formatDate(m.created_at);
    if (dStr !== lastDate) {
      groupedMessages.push({ type: 'date', dateStr: dStr, id: 'date-' + m.created_at });
      lastDate = dStr;
    }
    groupedMessages.push({ type: 'msg', ...m });
  });

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 52px - env(safe-area-inset-top, 0px))',background:'#FAFAFA'}}>
      {/* ヘッダー */}
      <div style={{padding:'12px 14px',background:'#1E293B',color:'#fff',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <button onClick={()=>{setView('siteList');loadUnreadCounts();}} 
          style={{padding:'6px',background:'transparent',border:'none',color:'#fff',cursor:'pointer',display:'flex'}}>
          <ChevronLeft className="w-5 h-5"/>
        </button>
        <div style={{width:8,height:8,borderRadius:'50%',background:'#22c55e'}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{activeSite}</div>
          <div style={{fontSize:9,color:'#aaa'}}>{messages.length}件の投稿</div>
        </div>
      </div>

      {/* メッセージリスト */}
      <div style={{flex:1,overflowY:'auto',padding:'14px',display:'flex',flexDirection:'column',gap:10}}>
        {loading && (
          <div style={{textAlign:'center',padding:20,color:'#999',fontSize:12}}>読み込み中...</div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{textAlign:'center',padding:40,color:'#999',fontSize:13}}>
            まだメッセージはありません<br/>
            <span style={{fontSize:11,color:'#bbb'}}>最初のメッセージを送ってみよう</span>
          </div>
        )}
        {groupedMessages.map((item, idx) => {
          if (item.type === 'date') {
            return (
              <div key={item.id} style={{display:'flex',justifyContent:'center',margin:'6px 0'}}>
                <span style={{fontSize:10,color:'#999',background:'#fff',padding:'3px 12px',borderRadius:99,border:'1px solid #E0E0E0'}}>{item.dateStr}</span>
              </div>
            );
          }
          const isMine = item.user_id === userId;
          const readCount = (item.read_by || []).length;
          if (isMine) {
            return (
              <div key={item.id} style={{display:'flex',flexDirection:'column',alignItems:'flex-end'}}>
                <div style={{fontSize:10,color:'#666',marginBottom:3}}>あなた · {formatTime(item.created_at)}</div>
                {item.message && (
                  <div style={{background:'#3B82F6',padding:'9px 13px',borderRadius:'14px 14px 4px 14px',fontSize:13,color:'#fff',lineHeight:1.5,display:'inline-block',maxWidth:'80%',wordBreak:'break-word',whiteSpace:'pre-wrap'}}>{item.message}</div>
                )}
                {item.image_url && (
                  <img src={item.image_url} alt="uploaded" style={{maxWidth:240,maxHeight:240,borderRadius:10,marginTop:4,cursor:'pointer'}} onClick={()=>window.open(item.image_url,'_blank')}/>
                )}
                {readCount > 1 && <div style={{fontSize:9,color:'#22c55e',marginTop:2}}>既読 {readCount - 1}</div>}
              </div>
            );
          }
          return (
            <div key={item.id} style={{display:'flex',gap:8}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:getAvatarColor(item.user_name),display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>{getAvatar(item.user_name)}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:'#666',marginBottom:3}}>{item.user_name} · {formatTime(item.created_at)}</div>
                {item.message && (
                  <div style={{background:'#fff',padding:'9px 13px',borderRadius:'14px 14px 14px 4px',border:'1px solid #E8E8E8',fontSize:13,color:'#333',lineHeight:1.5,display:'inline-block',maxWidth:'80%',wordBreak:'break-word',whiteSpace:'pre-wrap'}}>{item.message}</div>
                )}
                {item.image_url && (
                  <img src={item.image_url} alt="uploaded" style={{maxWidth:240,maxHeight:240,borderRadius:10,marginTop:4,cursor:'pointer',display:'block'}} onClick={()=>window.open(item.image_url,'_blank')}/>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef}/>
      </div>

      {/* 入力バー */}
      <div style={{padding:'10px 12px',background:'#fff',borderTop:'1px solid #E8E8E8',display:'flex',gap:6,alignItems:'center',flexShrink:0,paddingBottom:'calc(10px + env(safe-area-inset-bottom, 0px))'}}>
        <input type="file" accept="image/*" ref={fileInputRef} style={{display:'none'}} onChange={e=>{
          const f = e.target.files?.[0];
          if (f) uploadImage(f);
          e.target.value = '';
        }}/>
        <button onClick={()=>fileInputRef.current?.click()} disabled={uploading}
          style={{width:36,height:36,borderRadius:'50%',background:'#F3F4F6',border:'none',fontSize:18,cursor:uploading?'not-allowed':'pointer',opacity:uploading?0.5:1}}>
          📷
        </button>
        <input type="text" value={newMessage} onChange={e=>setNewMessage(e.target.value)}
          onKeyDown={e=>{ if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={uploading ? '画像アップロード中...' : 'メッセージを入力...'}
          disabled={uploading}
          style={{flex:1,padding:'9px 14px',background:'#F3F4F6',border:'none',borderRadius:20,fontSize:13,outline:'none',fontFamily:'inherit',color:'#1C1917'}}/>
        <button onClick={sendMessage} disabled={!newMessage.trim() || uploading}
          style={{padding:'9px 16px',background:(!newMessage.trim()||uploading)?'#CBD5E1':'#3B82F6',border:'none',color:'#fff',borderRadius:20,fontSize:12,fontWeight:700,cursor:(!newMessage.trim()||uploading)?'not-allowed':'pointer',fontFamily:'inherit'}}>
          送信
        </button>
      </div>
    </div>
  );
}


export default function LOGIOApp() {
  // ★ 起動アニメーション: 毎回起動時に表示
  const [showSplash, setShowSplash] = useState(true);
  const [splashReady, setSplashReady] = useState(false);
  // 前回のログイン（会社用・管理者のIDのときだけ使う。restoreSavedLogin を参照）
  const [currentUser, setCurrentUser] = useState(restoreSavedLogin);
  // 画面を離れる前の確認。予想と実績タブの割り振り・チェックに保存していない変更があるあいだだけ、
  // その画面が「保存していません…」の文を返す関数をここに入れる（無ければ null）
  const leaveGuardRef = useRef(null);
  const confirmLeave = () => { const msg = leaveGuardRef.current?.(); return !msg || window.confirm(msg); };
  const [isLoggedIn, setIsLoggedIn] = useState(() => currentUser !== null);
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
  // ワイエムの処分単価（ログイン後に1回読む。読めなければ空 = 手入力で使う）
  const [unitPricesByVendor, setUnitPricesByVendor] = useState({}); // 業者ごとの処分単価（ワイエム・入間緑化開発）
  // ★ テーマ曲（アプリ全体で1つ。画面を切り替えても続きが流れる。ログアウトで止める）
  const themeSong = useThemeSong();
  useEffect(() => { if (!isLoggedIn) themeSong.stop(); }, [isLoggedIn]);

  const defaultProjectInfo = {
    projectId: '', projectNumber: '', projectName: '', client: '', workLocation: '',
    salesPerson: '', siteManager: '', startDate: '', endDate: '',
    contractType: 'フェイス', contractAmount: '', additionalAmount: '', billingAmount: '', status: '着工前・進行中',
    invoiceMonth: '', // 請求月 'YYYY-MM'
    // DBから読んだときの値（保存のときに「完了以外→完了」「請求月を新しく入れた」を見分ける）
    savedStatus: '', savedInvoiceMonth: '',
    savedContractType: null, // DBの請負区分（null のままなら、発注者から決めた値を見せている）
    billingFilledFromEstimate: '', // 完了でDBの請求金額が空のとき、見せるために入れた見積＋追加（入れていなければ空）
    // 予想（project_info.forecast）。forecast＝DBから読んだ値（原価分析の「予想と実績」で使う）、
    // forecastForm＝「予想（原価メモ）」の入力欄の文字、forecastFormSaved＝開いたとき（保存したとき）の入力欄の文字
    forecast: null, forecastForm: forecastToForm(null), forecastFormSaved: forecastToForm(null),
    // 原価メモ（project_info.cost_memo）。costMemo＝DBから読んだ値（ホームの原価メモで使う）、
    // costMemoText＝「原価メモ（貼り付け）」の入力欄の文字、costMemoTextSaved＝開いたとき（保存したとき）の入力欄の文字
    costMemo: null, costMemoText: '', costMemoTextSaved: '',
    // 答え合わせ（project_info.answer_check）。answerCheck＝DBから読んだ値（原価分析の「予想と実績」で使う）、
    // answerDraftText＝「答え合わせの下書き（貼り付け）」の入力欄の文字、answerDraftTextSaved＝開いたとき（保存したとき）の入力欄の文字
    answerCheck: null, answerDraftText: '', answerDraftTextSaved: '',
    discharger: '', contractedDisposalSites: [], transferCost: '', leaseCost: '', materialsCost: '',
    siteTsubo: '', siteUseType: '', workCondition: '',
    outsourcingItems: [], sgaItems: [], manifestRows: [{disposal:'',transport:'',count:'1'}], manifestDischarger: '', miscItems: [],
    paymentDueDate: '', paymentTerms: '', invoiceRecipient: '',
    subcontractAmount: '', subcontractor: '', subcontractTerms: '', subcontractInvoiceRecipient: '',
    documentsChecklist: {work:false,paperManifest:false,eManifest:false,treatmentContract:false,estimateContract:false,signboard:false,preInvoice:false,postInvoice:false,safetyDocs:false}
  };

  const normalizeProjectInfo = (overrides = {}, siteName = '') => {
    const safeChecklist = { ...defaultProjectInfo.documentsChecklist, ...(overrides.documentsChecklist || {}) };
    const safeManifestRows = Array.isArray(overrides.manifestRows) && overrides.manifestRows.length > 0
      ? overrides.manifestRows
      : (Array.isArray(overrides.manifest_entries) && overrides.manifest_entries.length > 0 ? overrides.manifest_entries : [{disposal:'',transport:'',count:'1'}]);
    return {
      ...defaultProjectInfo,
      ...overrides,
      projectName: overrides.projectName || siteName || defaultProjectInfo.projectName,
      status: overrides.status || '着工前・進行中',
      contractType: overrides.contractType || resolveContractTypeByClient(overrides.client || ''),
      documentsChecklist: safeChecklist,
      manifestRows: safeManifestRows,
      miscItems: Array.isArray(overrides.miscItems) ? overrides.miscItems : [],
      expenses: Array.isArray(overrides.expenses) ? overrides.expenses : [],
      contractedDisposalSites: Array.isArray(overrides.contractedDisposalSites) ? overrides.contractedDisposalSites : [],
      outsourcingItems: Array.isArray(overrides.outsourcingItems) ? overrides.outsourcingItems : [],
      sgaItems: Array.isArray(overrides.sgaItems) ? overrides.sgaItems : [],
      siteExpenseItems: Array.isArray(overrides.siteExpenseItems) ? overrides.siteExpenseItems : [],
      siteTsubo: overrides.siteTsubo ?? '',
      siteUseType: overrides.siteUseType ?? '',
      workCondition: overrides.workCondition ?? '',
    };
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
    let cancelled = false;
    const initializeApp = async () => {
      if (!isLoggedIn) {
        if (!cancelled) setSplashReady(true);
        return;
      }
      // 単価マスタは現場一覧と並行して読む（失敗しても空の一覧が返るだけで止まらない）
      loadPriceMasters().then(byVendor => { if (!cancelled) setUnitPricesByVendor(byVendor); });
      try {
        await loadSites();
      } finally {
        if (!cancelled) setSplashReady(true);
      }
    };

    initializeApp();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const loadSites = async () => {
    try {
      const data = await sb('sites').select('order=created_at.asc');
      if (Array.isArray(data)) {
        const seenNames = new Set();
        const dedupedSites = data.filter(s => {
          const key = String(s?.name ?? '').trim().toLowerCase();
          if (!key || seenNames.has(key)) return false;
          seenNames.add(key);
          return true;
        });

        // ★ 全現場のproject_infoを一括ロード(金額・工期表示のため)
        const piData = await sb('project_info').select('order=site_name.asc');
        const piMap = {};
        if (Array.isArray(piData)) {
          piData.forEach(p => {
            if (p.site_name) {
              piMap[p.site_name] = {
                projectNumber: p.project_number || '',
                workType: p.work_type || '',
                client: p.client || '',
                workLocation: p.work_location || '',
                salesPerson: p.sales_person || '',
                siteManager: p.site_manager || '',
                startDate: p.start_date || '',
                endDate: p.end_date || '',
                contractAmount: p.contract_amount || '',
                additionalAmount: p.additional_amount || '',
                status: p.status || '',
              };
            }
          });
        }
        setSites(dedupedSites.map(s => {
          const piStatus = piMap[s.name]?.status;
          // ★ status: project_info優先、なければsites、両方trim()
          let resolvedStatus = (piStatus || s.status || '').trim();
          // 空文字なら未設定なので、デフォルトを'着工前・進行中'に
          if (!resolvedStatus) resolvedStatus = '着工前・進行中';
          // 旧ステータスを新ステータスに正規化
          if (resolvedStatus === '着工前' || resolvedStatus === '進行中') resolvedStatus = '着工前・進行中';
          return {
            name: s.name,
            createdAt: s.created_at,
            status: resolvedStatus,
            projectNumber: piMap[s.name]?.projectNumber || s.project_number || '',
            projectInfo: piMap[s.name] || null
          };
        }));
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
      themeSong.stop(); // テーマ曲はログアウトで止める
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
        const locker = await siteLocks.check(selectedSite, currentUser?.userId || 'unknown');
        setLockStatus(locker);
      }
    } catch(e) { console.error(e); }
    setTimeout(() => setReloading(false), 600);
  };

  const handleAddSite = async (siteName) => {
    try {
      const normalizedName = String(siteName || '').trim();
      if (!normalizedName) {
        alert('現場名を入力してください');
        return false;
      }

      const existingSites = await sb('sites').select();
      const duplicate = Array.isArray(existingSites) && existingSites.some(s => {
        const current = String(s?.name ?? '').trim().toLowerCase();
        return current && current === normalizedName.toLowerCase();
      });
      if (duplicate) {
        alert(`同じ現場名は登録できません: ${normalizedName}`);
        return false;
      }

      const projectNumber = await generateProjectNumber();
      await sb('sites').insert({ name: normalizedName, project_number: projectNumber, status: '着工前・進行中' });
      await sb('project_info').insert({ site_name: normalizedName, project_number: projectNumber, work_type: '', client: '', work_location: '', sales_person: '', site_manager: '', start_date: '', end_date: '', contract_amount: 0, additional_amount: 0, status: '着工前・進行中', discharger: '', transport_company: '', contracted_disposal_sites: [], transfer_cost: 0, lease_cost: 0, materials_cost: 0, expenses: [] });
      setSites(prev => [...prev, { name: normalizedName, projectNumber, status: '着工前・進行中' }]);
      setSelectedSite(normalizedName);
      setProjectInfo({ projectId: '', projectNumber, projectName: normalizedName, contractType: 'フェイス', workType: '', client: '', workLocation: '', salesPerson: '', siteManager: '', startDate: '', endDate: '', contractAmount: '', additionalAmount: '', billingAmount: '', invoiceMonth: '', status: '着工前・進行中', savedStatus: '着工前・進行中', discharger: '', transportCompany: '', contractedDisposalSites: [], transferCost: '', leaseCost: '', materialsCost: '', expenses: [], outsourcingItems: [], sgaItems: [], manifestRows: [{disposal:'',transport:'',count:'1'}], manifestDischarger: '', manifestType: '', manifestIssuer: '', manifestRemarks: '', miscItems: [], paymentDueDate: '', paymentTerms: '', invoiceRecipient: '', subcontractAmount: '', subcontractor: '', subcontractTerms: '', subcontractInvoiceRecipient: '', documentsChecklist: {work:false,paperManifest:false,eManifest:false,treatmentContract:false,estimateContract:false,signboard:false,preInvoice:false,postInvoice:false,safetyDocs:false} });
      alert(`✅ 現場「${normalizedName}」を追加しました\nPROJECT NO.: ${projectNumber}`);
      return true;
    } catch (error) { console.error(error); alert('❌ 現場の追加に失敗しました'); return false; }
  };

  const handleDeleteSite = async (siteName) => {
    try {
      await sb('sites').delete(`name=eq.${encodeURIComponent(siteName)}`);
      await sb('project_info').delete(`site_name=eq.${encodeURIComponent(siteName)}`);
      await sb('reports').delete(`site_name=eq.${encodeURIComponent(siteName)}`);
      // site_locks: その現場の入力中ロックも消す（失敗しても削除は成功扱い）
      await siteLocks.removeSite(siteName);
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
      // site_locks: 入力中ロックの現場名も書き換える（失敗しても名前変更は成功扱い）
      await siteLocks.renameSite(oldName, n);
      setSites(prev => prev.map(s => s.name === oldName ? { ...s, name: n } : s));
      if (selectedSite === oldName) { setSelectedSite(n); }
      alert(`✅ 現場名を「${n}」に変更しました`);
    } catch (error) { console.error(error); alert('❌ 現場名の変更に失敗しました'); }
  };

  // ★ 現場選択時にロック状態確認
  const handleSelectSite = async (siteName) => {
    if (siteName !== selectedSite && !confirmLeave()) return; // 保存していない割り振り・チェックがあれば確かめる
    setSelectedSite(siteName);
    setProjectInfo(normalizeProjectInfo({ projectName: siteName }, siteName));
    setReports([]);
    await loadProjectInfo(siteName);
    await loadReports(siteName);
    const locker = await siteLocks.check(siteName, currentUser?.userId || 'unknown');
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
        const normalizedStatus = (d.status === '着工前' || d.status === '進行中') ? '着工前・進行中' : (d.status || '着工前・進行中');
        const estimateBase = (parseFloat(d.contract_amount) || 0) + (parseFloat(d.additional_amount) || 0);
        // 完了でDBの請求金額が空なら、見積＋追加を請求金額として見せる（画面だけ。開いて保存しただけではDBに書かない）
        const billingFilledFromEstimate = d.billing_amount == null && normalizedStatus === '完了' ? String(estimateBase) : '';
        const contractType = d.contract_type || resolveContractTypeByClient(d.client || '');
        const info = normalizeProjectInfo({
          projectId: d.id || '',
          projectNumber: d.project_number || '',
          projectName: siteName,
          workType: d.work_type || '',
          client: d.client || '',
          workLocation: d.work_location || '',
          salesPerson: d.sales_person || '',
          siteManager: d.site_manager || '',
          startDate: d.start_date || '',
          endDate: d.end_date || '',
          contractType,
          savedContractType: d.contract_type ?? null,
          contractAmount: d.contract_amount || '',
          additionalAmount: d.additional_amount || '',
          billingAmount: d.billing_amount != null ? String(d.billing_amount) : billingFilledFromEstimate,
          billingFilledFromEstimate,
          invoiceMonth: normalizeInvoiceMonth(d.invoice_month),
          savedInvoiceMonth: normalizeInvoiceMonth(d.invoice_month),
          status: normalizedStatus,
          savedStatus: normalizedStatus,
          discharger: d.discharger || '',
          transportCompany: d.transport_company || '',
          contractedDisposalSites: Array.isArray(d.contracted_disposal_sites) ? d.contracted_disposal_sites : [],
          transferCost: d.transfer_cost || '',
          leaseCost: d.lease_cost || '',
          materialsCost: d.materials_cost || '',
          expenses: Array.isArray(d.expenses) ? d.expenses : [],
          outsourcingItems: Array.isArray(d.outsourcing_items) ? d.outsourcing_items : [],
          sgaItems: Array.isArray(d.sga_items) ? d.sga_items : [],
          siteExpenseItems: Array.isArray(d.site_expense_items) ? d.site_expense_items : [],
          miscItems,
          manifestRows: Array.isArray(d.manifest_entries) && d.manifest_entries.length > 0 ? d.manifest_entries : [{disposal:'',transport:'',count:'1'}],
          manifestDischarger: d.manifest_discharger || d.discharger || '',
          completionDate: d.completion_date || '',
          siteAreaM2: d.site_area_m2 != null ? String(d.site_area_m2) : '',
          siteTsubo: d.site_tsubo != null ? String(d.site_tsubo) : '',
          siteUseType: d.site_use_type || '',
          workCondition: d.work_condition || '',
          paymentDueDate: d.payment_due_date || '',
          paymentTerms: d.payment_terms || '',
          invoiceRecipient: d.invoice_recipient || '',
          subcontractAmount: d.subcontract_amount != null ? String(d.subcontract_amount) : '',
          subcontractor: d.subcontractor || '',
          subcontractTerms: d.subcontract_terms || '',
          subcontractInvoiceRecipient: d.subcontract_invoice_recipient || '',
          documentsChecklist: d.documents_checklist || {work:false,paperManifest:false,eManifest:false,treatmentContract:false,estimateContract:false,signboard:false,preInvoice:false,postInvoice:false,safetyDocs:false},
          forecast: d.forecast ?? null, // 予想（原価分析の「予想と実績」で使う。欄が無いDBでは null＝予想なし）
          forecastForm: forecastToForm(d.forecast),
          forecastFormSaved: forecastToForm(d.forecast),
          costMemo: d.cost_memo ?? null, // 原価メモ（欄が無いDBでは null＝原価メモなし）
          costMemoText: costMemoToText(d.cost_memo),
          costMemoTextSaved: costMemoToText(d.cost_memo),
          answerCheck: d.answer_check ?? null, // 答え合わせ（割り振り・チェック・確認済み・下書き。欄が無いDBでは null）
          answerDraftText: answerDraftToText(d.answer_check),
          answerDraftTextSaved: answerDraftToText(d.answer_check),
        }, siteName);
        setProjectInfo(info);
        return info;
      }
      setProjectInfo(normalizeProjectInfo({ projectName: siteName }, siteName));
    } catch (error) { console.error('loadProjectInfo error:', error); }
    return null;
  };

  const loadReports = async (siteName) => {
    try {
      const data = await sb('reports').select(`site_name=eq.${encodeURIComponent(siteName)}&order=date.asc`);
      if (Array.isArray(data)) setReports(data.map(r => ({ id: r.id, siteName: r.site_name, date: r.date, weather: r.weather, recorder: r.recorder, workDetails: r.work_details || {}, wasteItems: r.waste_items || [], scrapItems: r.scrap_items || [], createdAt: r.created_at, updatedBy: r.updated_by || '', updatedAt: r.updated_at || r.created_at || '', photoUrls: r.photo_urls || [], memo: r.memo || '' })));
      else setReports([]);
    } catch (error) { setReports([]); }
  };

  // 「完了以外 → 完了」にするときだけ、請求金額と請求月を確かめる
  // （すでに完了の現場は止めない。過去の完了現場には請求月が無いため）
  const isBecomingDone = (info, nextStatus) => nextStatus === '完了' && info.savedStatus !== '完了';

  const handleStatusChange = (nextStatus) => {
    if (isBecomingDone(projectInfo, nextStatus)) {
      const missing = missingForCompletion(projectInfo);
      if (missing.length > 0) { alert(completionBlockedMessage(missing)); return; }
    }
    setProjectInfo({ ...projectInfo, status: nextStatus });
  };

  const handleSaveProject = async (silent = false) => {
    if (!selectedSite) return alert('現場を選択してください');
    const becomingDone = isBecomingDone(projectInfo, projectInfo.status);
    if (becomingDone) {
      const missing = missingForCompletion(projectInfo);
      if (missing.length > 0) { alert(completionBlockedMessage(missing)); return; }
    }
    const billingValue = parseNumericValue(projectInfo.billingAmount);
    const invoiceMonth = normalizeInvoiceMonth(projectInfo.invoiceMonth);
    // 請求金額をDBに書くかどうか
    //  ・完了にするとき：画面に出ている請求金額を必ず書く
    //  ・すでに完了の現場で請求月を新しく入れたとき：画面に出ている請求金額も書く（請求月を入れる＝請求金額も確定）
    //  ・見積＋追加を見せているだけの完了現場：請求金額の欄を変えたときだけ書く（開いて保存しただけでは書かない）
    //  ・それ以外：今までどおり、欄に何か入っていれば書く
    const invoiceMonthNewlySetOnDone = projectInfo.savedStatus === '完了' && !!invoiceMonth && !normalizeInvoiceMonth(projectInfo.savedInvoiceMonth);
    const billingEntered = projectInfo.billingAmount !== '' && projectInfo.billingAmount !== null && projectInfo.billingAmount !== undefined;
    const showingEstimateOnly = !!projectInfo.billingFilledFromEstimate && projectInfo.billingAmount === projectInfo.billingFilledFromEstimate;
    const writeBilling = becomingDone || invoiceMonthNewlySetOnDone || (billingEntered && !showingEstimateOnly);
    // 予想（原価メモ）は、予想の欄の中身が開いたときと違うときだけ送る
    // （触らずに保存したときは送らない＝今の forecast を残す。開いている間に別の所で入れた予想も上書きしない）
    const forecastFormSent = projectInfo.forecastForm;
    const writeForecast = isForecastFormChanged(forecastFormSent, projectInfo.forecastFormSaved);
    const forecastValue = writeForecast ? formToForecast(forecastFormSent, forecastSavedDate()) : null;
    // 原価メモも、中身が開いたときと違うときだけ送る（触らずに保存したときは送らない＝今の cost_memo を残す）
    // 空にしたら null。形が違うときは、ほかの欄も含めて保存しない（貼った文字は残る）
    const costMemoTextSent = projectInfo.costMemoText ?? '';
    const writeCostMemo = isCostMemoChanged(costMemoTextSent, projectInfo.costMemoTextSaved ?? '');
    let costMemoValue = null;
    if (writeCostMemo && costMemoTextSent.trim()) {
      const parsedMemo = parseCostMemo(costMemoTextSent);
      if (!parsedMemo.ok) {
        alert(`❌ 保存していません\n\n原価メモ（貼り付け）を読めません：${parsedMemo.reason}\n\n直すか、空にしてから保存してください。`);
        return;
      }
      costMemoValue = parsedMemo.memo;
    }
    // 答え合わせの下書きも、中身が開いたときと違うときだけ送る（触らずに保存したときは answer_check を送らない）
    // 送るときは、保存の直前に DB の answer_check を読み直し、draft（と reflected）だけを差し替える（割り振り・チェック・確認済みは変えない）
    const answerDraftTextSent = projectInfo.answerDraftText ?? '';
    const writeAnswerDraft = isCostMemoChanged(answerDraftTextSent, projectInfo.answerDraftTextSaved ?? '');
    let answerDraftParsed = null;
    if (writeAnswerDraft && answerDraftTextSent.trim()) {
      answerDraftParsed = parseAnswerDraft(answerDraftTextSent);
      if (!answerDraftParsed.ok) {
        alert(`❌ 保存していません\n\n答え合わせの下書き（貼り付け）を読めません：${answerDraftParsed.reason}\n\n直すか、空にしてから保存してください。`);
        return;
      }
    }
    try {
      const contractTypeValue = projectInfo.contractType || resolveContractTypeByClient(projectInfo.client || '');
      // 請負区分は、DBに値があるときか、発注者から決めた値と違う値を選んだときだけ送る
      // （DBが null で選び直していなければ null のまま。読むときは null なら発注者から決めるので、見え方は同じ）
      const writeContractType = projectInfo.savedContractType != null
        || contractTypeValue !== resolveContractTypeByClient(cleanClientName(projectInfo.client));
      // 送る欄はここに書いたものだけ（DBは送った欄だけを書き換える）。
      // forecast（予想）と cost_memo（原価メモ）は、その欄を変えたときだけ下で足す
      const projectPayload = {
        site_name: selectedSite,
        project_number: projectInfo.projectNumber || '',
        work_type: projectInfo.workType || '',
        client: cleanClientName(projectInfo.client), // 半角カナを全角に、「株式会社」などを取り、前後の空白を取って保存
        work_location: projectInfo.workLocation || '',
        sales_person: projectInfo.salesPerson || '',
        site_manager: projectInfo.siteManager || '',
        start_date: projectInfo.startDate || '',
        end_date: projectInfo.endDate || '',
        contract_type: contractTypeValue,
        contract_amount: parseFloat(projectInfo.contractAmount) || 0,
        additional_amount: parseFloat(projectInfo.additionalAmount) || 0,
        status: projectInfo.status || '着工前・進行中',
        discharger: projectInfo.manifestDischarger || '',
        transport_company: (projectInfo.manifestRows||[]).map(r=>r.transport).filter(Boolean).join(','),
        contracted_disposal_sites: [...new Set((projectInfo.manifestRows||[]).map(r=>r.disposal).filter(Boolean))],
        transfer_cost: parseFloat(projectInfo.transferCost) || 0,
        lease_cost: parseFloat(projectInfo.leaseCost) || 0,
        materials_cost: parseFloat(projectInfo.materialsCost) || 0,
        expenses: projectInfo.expenses || [],
        outsourcing_items: projectInfo.outsourcingItems || [],
        sga_items: projectInfo.sgaItems || [],
        site_expense_items: projectInfo.siteExpenseItems || [],
        // 0件でも [] を保存する（送らないとDBの古い一覧が残り、全部消しても次に開くと戻ってくる）
        misc_items: Array.isArray(projectInfo.miscItems) ? projectInfo.miscItems : [],
        manifest_entries: projectInfo.manifestRows || [],
        manifest_discharger: projectInfo.manifestDischarger || '',
        site_area_m2: projectInfo.siteAreaM2 ? parseFloat(projectInfo.siteAreaM2) : null,
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
        updated_at: new Date().toISOString(),
      };
      projectPayload.invoice_month = invoiceMonth || null; // 未入力は null（空の文字にしない）
      if (!writeContractType) delete projectPayload.contract_type;
      if (writeBilling) projectPayload.billing_amount = billingValue > 0 ? billingValue : null;
      if (writeForecast) projectPayload.forecast = forecastValue; // 全部空なら null（予想を消す）
      if (writeCostMemo) projectPayload.cost_memo = costMemoValue; // 空なら null（原価メモを消す）
      if (writeAnswerDraft) projectPayload.answer_check = applyAnswerDraft(await fetchAnswerCheck(selectedSite), answerDraftParsed);

      // DBに欄がない項目は外して保存し直し、外した項目は画面で警告する（site_name は外さない）
      const { droppedColumns } = await saveDroppingMissingColumns(
        projectPayload,
        payload => sb('project_info').upsert(payload, 'site_name'),
        column => column !== 'site_name'
      );
      // 保存できたので、「DBから読んだときの値」を今の値にそろえる（続けて保存したときの判定のため）
      setProjectInfo(prev => ({
        ...prev,
        savedStatus: projectPayload.status,
        client: projectPayload.client,
        savedInvoiceMonth: droppedColumns.includes('invoice_month') ? prev.savedInvoiceMonth : invoiceMonth,
        savedContractType: writeContractType && !droppedColumns.includes('contract_type') ? contractTypeValue : prev.savedContractType,
        billingFilledFromEstimate: writeBilling && !droppedColumns.includes('billing_amount') ? '' : prev.billingFilledFromEstimate,
        // 予想を書いたら、原価分析のタブにすぐ出るように forecast を今の値にし、「開いたときの中身」も送った中身にそろえる
        ...(writeForecast && !droppedColumns.includes('forecast') ? { forecast: forecastValue, forecastFormSaved: forecastFormSent } : {}),
        // 原価メモを書いたら、ホームのカードにすぐ出るように costMemo を今の値にし、「開いたときの中身」も送った中身にそろえる
        ...(writeCostMemo && !droppedColumns.includes('cost_memo') ? { costMemo: costMemoValue, costMemoTextSaved: costMemoTextSent } : {}),
        // 答え合わせの下書きを書いたら、原価分析にすぐ出るように answerCheck を今の値にし、「開いたときの中身」も送った中身にそろえる
        ...(writeAnswerDraft && !droppedColumns.includes('answer_check') ? { answerCheck: projectPayload.answer_check, answerDraftTextSaved: answerDraftTextSent } : {}),
      }));
      await sb('sites').update({ project_number: projectInfo.projectNumber || '', status: projectInfo.status || '着工前・進行中' }, `name=eq.${encodeURIComponent(selectedSite)}`);
      // 保存した発注者名を現場一覧にも入れる（新しく足した発注者が、すぐ選択肢に出るように）
      setSites(prev => prev.map(s => s.name === selectedSite ? { ...s, projectNumber: projectInfo.projectNumber || '', status: projectInfo.status || '着工前・進行中', projectInfo: s.projectInfo ? { ...s.projectInfo, client: projectPayload.client } : s.projectInfo } : s));
      if (droppedColumns.length > 0) {
        // 保存されなかった項目があるときは silent 指定でも必ず知らせる
        console.warn('project_info: DBに欄がないため保存されなかった項目:', droppedColumns);
        alert(buildMissingColumnsWarning(droppedColumns, PROJECT_INFO_COLUMN_LABELS));
      } else if (!silent) {
        alert('✅ プロジェクト情報を保存しました');
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (error) { console.error(error); alert('❌ 保存に失敗しました: ' + (error?.message || JSON.stringify(error))); }
  };

  // ★ 保存後にロック解放
  // 戻り値: 保存できたら true。失敗したら理由を表示して false（入力画面に留まるので入力内容は消えない）
  const handleSaveReport = async (reportData) => {
    if (!selectedSite) { alert('現場を選択してください'); return false; }
    const now = new Date().toISOString();
    const updatedBy = reportData.recorder || currentUser?.userId || '';
    const payload = { site_name: selectedSite, date: reportData.date, weather: reportData.weather || '', recorder: reportData.recorder || '', work_details: reportData.workDetails || {}, waste_items: reportData.wasteItems || [], scrap_items: reportData.scrapItems || [], updated_by: updatedBy, updated_at: now, photo_urls: reportData.photoUrls || [], memo: reportData.memo || '' };
    let droppedColumns = [];
    try {
      // 写真・備考・更新者・更新日時の欄がDBになければ、外して保存し直す（外した項目は警告する）
      ({ droppedColumns } = await saveDroppingMissingColumns(
        payload,
        p => sb('reports').insertOrThrow(p),
        column => REPORT_DROPPABLE_COLUMNS.includes(column)
      ));
    } catch (error) {
      console.error('handleSaveReport error:', error);
      alert(`❌ 日報を保存できませんでした\n\n理由: ${describeSaveError(error, REPORT_COLUMN_LABELS)}\n\n入力した内容は画面に残っています。`);
      return false;
    }
    // ここから先は保存済み。ロック解除や再読み込みが失敗しても「保存失敗」とは出さない
    // （出すと保存し直されて日報が二重に登録されるため）
    const userName = currentUser?.userId || 'unknown';
    await siteLocks.release(selectedSite, userName);
    setLockStatus(null);
    await loadReports(selectedSite);
    if (droppedColumns.length > 0) {
      console.warn('reports: DBに欄がないため保存されなかった項目:', droppedColumns);
      alert(buildMissingColumnsWarning(droppedColumns, REPORT_COLUMN_LABELS));
    } else {
      alert('✅ 日報を保存しました');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    setCurrentPage('home');
    return true;
  };

  // 戻り値: 更新できたら true。失敗したら理由を表示して false（編集画面に留まる）
  const handleUpdateReport = async (reportId, reportData) => {
    const now = new Date().toISOString();
    const updatedBy = reportData.recorder || currentUser?.userId || '';
    const wd = {
      ...reportData.workDetails,
      outsourcingLabor: (reportData.workDetails?.outsourcingLabor || []).map(o => ({
        ...o,
        count: parseFloat(o.count || o.workers || 0),
      }))
    };
    // ★修正: photo_urls と memo も更新対象に含める（編集時に消失するバグの修正）
    const payload = { date: reportData.date, weather: reportData.weather || '', recorder: reportData.recorder || '', work_details: wd, waste_items: reportData.wasteItems || [], scrap_items: reportData.scrapItems || [], photo_urls: reportData.photoUrls || [], memo: reportData.memo || '', updated_by: updatedBy, updated_at: now };
    let droppedColumns = [];
    try {
      ({ droppedColumns } = await saveDroppingMissingColumns(
        payload,
        p => updateReportOrThrow(reportId, p),
        column => REPORT_DROPPABLE_COLUMNS.includes(column)
      ));
    } catch (error) {
      console.error('handleUpdateReport error:', error);
      alert(`❌ 日報を更新できませんでした\n\n理由: ${describeSaveError(error, REPORT_COLUMN_LABELS)}\n\n入力した内容は画面に残っています。`);
      return false;
    }
    await loadReports(selectedSite);
    setEditingReport(null);
    if (droppedColumns.length > 0) {
      console.warn('reports: DBに欄がないため保存されなかった項目:', droppedColumns);
      alert(buildMissingColumnsWarning(droppedColumns, REPORT_COLUMN_LABELS));
    } else {
      alert('✅ 日報を更新しました');
    }
    setCurrentPage('home');
    return true;
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm('この日報を削除しますか？')) return;
    try {
      await sb('reports').delete(`id=eq.${reportId}`);
      setReports(prev => prev.filter(r => r.id !== reportId));
      alert('✅ 日報を削除しました');
    } catch (error) { alert('❌ 削除に失敗しました'); }
  };

  // ★ ほかの人が入力中のときの確認画面（「解除して入力する」→ true / 「やめる」→ false）
  const [lockPrompt, setLockPrompt] = useState(null); // { lockedBy, since, resolve }
  const askLockTakeover = (lock) => new Promise(resolve => {
    setLockPrompt({ lockedBy: lock?.user_name || '', since: formatLockTime(lock?.updated_at), resolve });
  });
  const answerLockPrompt = (takeOver) => {
    const prompt = lockPrompt;
    setLockPrompt(null);
    if (prompt) prompt.resolve(takeOver);
  };

  // ★ handleNavigate: 日報入力時にロック取得
  const handleNavigate = (page) => {
    // 予想と実績タブで保存していない割り振り・チェックがあれば、移る前に確かめる
    if (page !== currentPage && !confirmLeave()) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (page === 'input') {
      (async () => {
        if (!selectedSite) return;
        const userName = currentUser?.userId || 'unknown';
        // 時間切れ（LOCK_EXPIRE_MINUTES 分以上前）のロックは、確認なしで自分のロックに置き換わる
        const result = await siteLocks.acquire(selectedSite, userName);
        if (!result.ok) {
          // ほかの人が入力中: 「解除して入力する」か「やめる」かを選んでもらう
          const takeOver = await askLockTakeover(result.lock);
          if (!takeOver) return;
          await siteLocks.acquire(selectedSite, userName, { force: true });
        }
        setLockStatus(userName);
        setEditingReport(null);
        setCurrentPage('input');
      })();
    } else { setCurrentPage(page); }
  };

  // handlePasswordSubmit: パスワード認証廃止に伴い削除

  // 工事売上・原価・金属売上・粗利（日報PDFの集計と同じ数え方）
  const totals = calcSiteMoney(reports, projectInfo);
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
  // ホーム画面からの写真・メモ追加。失敗したら理由を Error で投げる（呼び出し側で表示）
  // 戻り値: DBに欄がなく保存されなかった欄名の一覧
  window.__updateReportPhotos = async (reportId, photoUrls, memo) => {
    const now = new Date().toISOString();
    let droppedColumns = [];
    try {
      ({ droppedColumns } = await saveDroppingMissingColumns(
        { photo_urls: photoUrls, memo: memo, updated_at: now },
        p => updateReportOrThrow(reportId, p),
        column => REPORT_DROPPABLE_COLUMNS.includes(column)
      ));
    } catch (error) {
      console.error('updateReportPhotos error:', error);
      throw new Error(describeSaveError(error, REPORT_COLUMN_LABELS));
    }
    if (droppedColumns.length > 0) console.warn('reports: DBに欄がないため保存されなかった項目:', droppedColumns);
    if (selectedSite) await loadReports(selectedSite);
    return droppedColumns;
  };

  window.__navigatePdf = async (report) => {
    let info = projectInfo;
    const fetched = await loadProjectInfo(selectedSite);
    if (fetched) info = fetched;
    setSelectedReport({ ...report, _projectInfo: info });
    setCurrentPage('pdf');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (showSplash) return <SplashScreen ready={splashReady} onFinish={() => setShowSplash(false)} />;
  if (!isLoggedIn) return <LoginPage onLogin={handleLogin} />;
  // ★ 管理者ログイン時は AdminPage を表示
  if (currentUser?.type === 'admin') return <AdminPage currentUser={currentUser} onLogout={handleLogout} />;

  // ★ マスコット常駐ロジック（ホーム・日報一覧・分析ページのみ表示）
  const MASCOT_PAGES = ['home', 'list', 'analysis'];
  const showMascot = MASCOT_PAGES.includes(currentPage);

  // ★ ロック解放関数（ReportInputPage に渡す）
  const releaseLock = async () => {
    const userName = currentUser?.userId || 'unknown';
    await siteLocks.release(selectedSite, userName);
    setLockStatus(null);
  };

  // 日報PDFの画面は全画面でヘッダーの上に重なる（テーマ曲の停止ボタンはヘッダーではなく右下に出す）
  const pdfCoversHeader = currentPage === 'pdf' && !!selectedReport;

  return (
    <div className="min-h-screen bg-transparent flex" style={{ overflowX: (currentPage === 'pdf' || currentPage === 'order_pdf') ? 'auto' : 'hidden' }}>
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onLogout={handleLogout} />
      <div className="flex flex-col flex-1 bg-transparent">
        <Header
          showMenuButton onMenuClick={() => setSidebarOpen(true)}
          onReload={handleReload}
          onSearch={() => setShowSearchModal(true)}
          reloading={reloading}
          themeSong={pdfCoversHeader ? null : themeSong}
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
              themeSong={themeSong}
            />
          )}
          {currentPage === 'settings' && <ProjectSettingsPage sites={sites} selectedSite={selectedSite} projectInfo={projectInfo} setProjectInfo={setProjectInfo} onSave={handleSaveProject} onAddSite={handleAddSite} onDeleteSite={handleDeleteSite} onRenameSite={handleRenameSite} onNavigate={handleNavigate} onSelectSite={handleSelectSite} onStatusChange={handleStatusChange} />}
          {currentPage === 'input' && (
            <ReportInputPage
              key={editingReport ? editingReport.id : 'new'}
              onSave={handleSaveReport}
              onNavigate={handleNavigate}
              projectInfo={projectInfo}
              onReleaseLock={releaseLock}
              editReport={editingReport}
              onUpdate={handleUpdateReport}
              unitPricesByVendor={unitPricesByVendor}
            />
          )}
          {currentPage === 'list' && <ReportListPage reports={reports} onDelete={handleDeleteReport} onNavigate={handleNavigate} onEdit={(report) => { setEditingReport(report); setCurrentPage('input'); }} />}
          {/* key＝現場名：現場を選び直したら原価分析を作り直し、「予想と実績」から出す */}
          {currentPage === 'analysis' && <AnalysisPage key={selectedSite} reports={reports} totals={totals} projectInfo={projectInfo} onNavigate={handleNavigate}
            siteName={selectedSite} currentUserId={currentUser?.userId} leaveGuardRef={leaveGuardRef}
            onAnswerCheckSaved={value => setProjectInfo(prev => (prev.projectName === selectedSite ? { ...prev, answerCheck: value } : prev))} />}
          {currentPage === 'project' && <ProjectPage projectInfo={projectInfo} selectedSite={selectedSite} onNavigate={handleNavigate} />}
          {currentPage === 'export' && <ExportPage sites={sites} reports={reports} projectInfo={projectInfo} selectedSite={selectedSite} onNavigate={handleNavigate} />}
          {currentPage === 'pdf' && selectedReport && <ReportPDFPage report={selectedReport} projectInfo={projectInfo} onNavigate={handleNavigate} />}
          {/* 日報PDFの画面はヘッダーが隠れるので、再生中は右下に停止ボタンを浮かべる */}
          {pdfCoversHeader && themeSong.state !== 'idle' && <ThemeStopButton floating onStop={themeSong.stop} />}
          {currentPage === 'order_pdf' && <OrderPDFPage projectInfo={projectInfo} onNavigate={handleNavigate} />}
        </main>
      </div>

      {/* パスワードモーダル削除済み - 現場管理は誰でも入れる */}

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
        const costRatio = totals.revenue > 0 ? (totals.cost / totals.revenue) * 100 : 0; // 原価率 ＝ 原価 ÷ 工事売上


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

      {/* ★ ほかの人が入力中のときの確認（解除して入力する / やめる） */}
      {lockPrompt && (
        <div role="dialog" aria-modal="true" aria-labelledby="lock-prompt-title"
          style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ width:'100%', maxWidth:'360px', background:'#fff', borderRadius:'16px', padding:'20px', boxShadow:'0 20px 50px rgba(0,0,0,0.3)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
              <span style={{ fontSize:'20px' }}>🔒</span>
              <p id="lock-prompt-title" style={{ fontSize:'15px', fontWeight:700, color:'#1C1917' }}>入力中の人がいます</p>
            </div>
            <p style={{ fontSize:'14px', color:'#1C1917', lineHeight:1.6 }}>
              {lockPrompt.lockedBy}さんが {lockPrompt.since || '--:--'} から入力中です。解除して入力しますか？
            </p>
            <p style={{ fontSize:'11px', color:'#6b7280', lineHeight:1.5, marginTop:'6px' }}>
              解除しても、{lockPrompt.lockedBy}さんが入力中の内容は保存できます（同じ日の日報が2件になることがあります）。
            </p>
            <div style={{ display:'flex', gap:'8px', marginTop:'16px' }}>
              <button onClick={() => answerLockPrompt(false)}
                style={{ flex:1, padding:'12px', borderRadius:'10px', border:'1px solid #E5E7EB', background:'#F3F4F6', color:'#374151', fontSize:'14px', fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>やめる</button>
              <button onClick={() => answerLockPrompt(true)}
                style={{ flex:2, padding:'12px', borderRadius:'10px', border:'none', background:'#F59E0B', color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>解除して入力する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
