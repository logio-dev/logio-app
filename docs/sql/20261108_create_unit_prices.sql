-- =====================================================================
-- LOGIO: 単価マスタ unit_prices の作成と、ワイエムの初期データ（61品目）
-- 作成日: 2026-11-08（改修指示書「ワイエム処分費の自動計算」2章）
--
-- 実行方法:
--   Supabase ダッシュボード → SQL Editor にこのファイルの中身を全部貼り付けて「Run」
--
-- このSQLがすること:
--   1. unit_prices テーブルを作る（すでにあれば作らない）
--   2. RLS を有効にし、anon・authenticated には SELECT（読むだけ）を許可する。
--      INSERT・UPDATE・DELETE はできない（アプリは読むだけ）。
--      ※ sites／reports は RLS 無効・全権限だが、unit_prices はそれに合わせず読むだけにしている
--   3. ワイエムの初期データ61品目を入れる（unit_prices_seed_ワイエム.sql と同じ中身）
--
-- 安全性:
--   ・データを消す命令（DROP TABLE・DELETE・TRUNCATE）は含みません。
--   ・何度実行しても同じ結果になります（テーブル・ポリシーはあれば作らない。
--     初期データは on conflict do update なので重複しない）。
--   ・2回目以降に流すと、初期データの61品目は、このファイルの単価・並び順などで上書きされます。
--     SQL Editor で単価を変えたあとに流し直すと、その変更が初期データの値に戻るので注意してください。
--
-- 単価を変えるとき（SQL Editor は RLS の対象外なので、ここから変更できます）:
--   update public.unit_prices set price = 11000, updated_at = now()
--   where vendor = 'ワイエム' and item = '廃石膏ボード(改修・解体系)';
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. テーブル（指示書 2-1 のとおり）
-- ---------------------------------------------------------------------
create table if not exists public.unit_prices (
  id            bigint generated always as identity primary key,
  vendor        text    not null,            -- 今回は 'ワイエム' だけ。あとで '東リース' も入れる
  item          text    not null,            -- 請求書の品名（そのまま種類に入れる名前）
  category      text,                        -- プルダウンのグループ名
  unit          text,                        -- ㎥・台・枚・個・台 など
  price         numeric not null default 0,  -- 処分単価（税抜）
  safety_fee    numeric not null default 0,  -- 東リース用（今回は使わない）
  env_fee       numeric not null default 0,  -- 東リース用（今回は使わない）
  base_fee      numeric not null default 0,  -- 東リース用（今回は使わない）
  monthly_price numeric,                     -- 東リース用（今回は使わない）
  popular       boolean not null default false, -- プルダウンの「よく使う」に出す
  sort_order    int,
  active        boolean not null default true,  -- false はプルダウンに出さない
  note          text,
  updated_at    timestamptz not null default now(),
  unique (vendor, item)
);

-- ---------------------------------------------------------------------
-- 2. RLS と権限: anon・authenticated は読むだけ
-- ---------------------------------------------------------------------
alter table public.unit_prices enable row level security;

-- Supabase は新しいテーブルに anon・authenticated の全権限を自動で付けるため、
-- いったん外して SELECT だけ付け直す（RLS と二重の守り。データは消えません）
revoke all on table public.unit_prices from anon, authenticated;
grant select on table public.unit_prices to anon, authenticated;

-- 読むだけのポリシー（すでにあれば作らない）
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'unit_prices' and policyname = 'unit_prices_select_for_app'
  ) then
    create policy unit_prices_select_for_app on public.unit_prices
      for select to anon, authenticated using (true);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. 初期データ（unit_prices_seed_ワイエム.sql の中身そのまま）
-- ---------------------------------------------------------------------
-- unit_prices 初期データ（2026-11-07 生成）
-- ワイエム：フェイス宛請求 2023.10〜2026.09（直近2年でいちばん多い単価）
insert into public.unit_prices (vendor,item,category,unit,price,safety_fee,env_fee,base_fee,monthly_price,popular,sort_order,active,note) values
('ワイエム','廃石膏ボード(改修・解体系)','石膏ボード・ボード類','㎥',10000,0,0,0,null,true,1,true,null),
('ワイエム','m3ボード付きパーテーション','石膏ボード・ボード類','㎥',10000,0,0,0,null,true,2,true,null),
('ワイエム','混合ボード入り','石膏ボード・ボード類','㎥',13000,0,0,0,null,true,3,true,null),
('ワイエム','石膏ボード(管理型)','石膏ボード・ボード類','㎥',25000,0,0,0,null,true,4,true,null),
('ワイエム','廃石膏ボード(新築系)','石膏ボード・ボード類','㎥',7000,0,0,0,null,false,5,true,null),
('ワイエム','m3パーテーション','石膏ボード・ボード類','㎥',10000,0,0,0,null,false,6,true,null),
('ワイエム','ケイカル板','石膏ボード・ボード類','㎥',15000,0,0,0,null,false,7,true,null),
('ワイエム','m3紙付きパーテーション','石膏ボード・ボード類','㎥',10000,0,0,0,null,false,8,true,null),
('ワイエム','岩綿吸音板','石膏ボード・ボード類','㎥',15000,0,0,0,null,false,9,true,null),
('ワイエム','木毛セメント板','石膏ボード・ボード類','㎥',20000,0,0,0,null,false,10,true,null),
('ワイエム','石膏ボード(岩綿吸音板付)','石膏ボード・ボード類','㎥',15000,0,0,0,null,false,11,true,null),
('ワイエム','混合(管理型)','混合廃棄物','㎥',10500,0,0,0,null,true,12,true,null),
('ワイエム','混合(安定型)','混合廃棄物','㎥',10500,0,0,0,null,false,13,true,null),
('ワイエム','混合廃棄物(ミンチ)','混合廃棄物','㎥',25000,0,0,0,null,false,14,true,null),
('ワイエム','混合(特殊)','混合廃棄物','㎥',12000,0,0,0,null,false,15,true,null),
('ワイエム','がれき類','がれき・コンクリート','㎥',15000,0,0,0,null,true,16,true,null),
('ワイエム','コンクリートガラ','がれき・コンクリート','㎥',5000,0,0,0,null,true,17,true,null),
('ワイエム','ALC','がれき・コンクリート','㎥',15000,0,0,0,null,false,18,true,null),
('ワイエム','ALC(リサイクル不可)','がれき・コンクリート','㎥',15000,0,0,0,null,false,19,true,null),
('ワイエム','がれき類(特殊)','がれき・コンクリート','㎥',25000,0,0,0,null,false,20,true,null),
('ワイエム','地中障害物','がれき・コンクリート','㎥',25000,0,0,0,null,false,21,true,null),
('ワイエム','アスファルト防水材付ガラ','がれき・コンクリート','㎥',15000,0,0,0,null,false,22,true,null),
('ワイエム','コンクリートブロック','がれき・コンクリート','㎥',12000,0,0,0,null,false,23,true,null),
('ワイエム','タイル','がれき・コンクリート','㎥',15000,0,0,0,null,false,24,true,null),
('ワイエム','ガラス','ガラス・陶磁器','㎥',15000,0,0,0,null,true,25,true,null),
('ワイエム','ガラスくず及び陶磁器くず','ガラス・陶磁器','㎥',15000,0,0,0,null,false,26,true,null),
('ワイエム','タイルカーペット','床材','㎥',18000,0,0,0,null,true,27,true,null),
('ワイエム','Pタイル','床材','㎥',15000,0,0,0,null,false,28,true,null),
('ワイエム','長尺シート','床材','㎥',15000,0,0,0,null,false,29,true,null),
('ワイエム','ジュータン・カーペット','床材','㎥',15000,0,0,0,null,false,30,true,null),
('ワイエム','ビニール系床材','床材','㎥',15000,0,0,0,null,false,31,true,null),
('ワイエム','OAフロアー(タコヤキ)','OAフロア','㎥',15000,0,0,0,null,false,32,true,null),
('ワイエム','OAフロアー','OAフロア','㎥',15000,0,0,0,null,false,33,true,null),
('ワイエム','OAフロアー(がれき類)','OAフロア','㎥',15000,0,0,0,null,false,34,true,null),
('ワイエム','OAフロアー(ネットワークフロア)','OAフロア','㎥',15000,0,0,0,null,false,35,true,null),
('ワイエム','OAフロアー(廃プラ)','OAフロア','㎥',15000,0,0,0,null,false,36,true,null),
('ワイエム','廃プラスチック類','廃プラ・断熱材','㎥',9000,0,0,0,null,true,37,true,null),
('ワイエム','グラスウール','廃プラ・断熱材','㎥',10000,0,0,0,null,false,38,true,null),
('ワイエム','スタイロ畳','廃プラ・断熱材','枚',2500,0,0,0,null,false,39,true,null),
('ワイエム','発泡スチロール','廃プラ・断熱材','㎥',9000,0,0,0,null,false,40,true,null),
('ワイエム','防水シート','廃プラ・断熱材','㎥',15000,0,0,0,null,false,41,true,null),
('ワイエム','エンビ管','廃プラ・断熱材','㎥',5000,0,0,0,null,false,42,true,null),
('ワイエム','スタイロフォーム','廃プラ・断熱材','㎥',10000,0,0,0,null,false,43,true,null),
('ワイエム','ロックウール','廃プラ・断熱材','㎥',10000,0,0,0,null,false,44,true,null),
('ワイエム','発泡ウレタン','廃プラ・断熱材','㎥',8000,0,0,0,null,false,45,true,null),
('ワイエム','防水材','廃プラ・断熱材','㎥',15000,0,0,0,null,false,46,true,null),
('ワイエム','木くず','木くず','㎥',5000,0,0,0,null,true,47,true,null),
('ワイエム','木くず(リサイクル不可)','木くず','㎥',10000,0,0,0,null,false,48,true,null),
('ワイエム','金属くず','金属・紙','㎥',1000,0,0,0,null,true,49,true,null),
('ワイエム','ダンボール','金属・紙','㎥',1000,0,0,0,null,false,50,true,null),
('ワイエム','業務用家電(大)','家具・家電・金庫','個・台',5000,0,0,0,null,false,51,true,null),
('ワイエム','ソファー(2人掛以上)','家具・家電・金庫','個・台',4000,0,0,0,null,false,52,true,null),
('ワイエム','モニター','家具・家電・金庫','個・台',2000,0,0,0,null,false,53,true,null),
('ワイエム','椅子','家具・家電・金庫','個・台',2000,0,0,0,null,false,54,true,null),
('ワイエム','金庫(中)','家具・家電・金庫','個・台',20000,0,0,0,null,false,55,true,null),
('ワイエム','金庫(小)','家具・家電・金庫','個・台',5000,0,0,0,null,false,56,true,null),
('ワイエム','4tコンテナ','車両・割増','台',22000,0,0,0,null,false,57,false,'車両・割増：処分の種類リストには出さない（配車費はアプリの昼22,000／夜32,000）'),
('ワイエム','夜勤割増料金','車両・割増','回',10000,0,0,0,null,false,58,false,'車両・割増：処分の種類リストには出さない（配車費はアプリの昼22,000／夜32,000）'),
('ワイエム','4tダンプ','車両・割増','台',22000,0,0,0,null,false,59,false,'車両・割増：処分の種類リストには出さない（配車費はアプリの昼22,000／夜32,000）'),
('ワイエム','2tダンプ','車両・割増','台',21000,0,0,0,null,false,60,false,'車両・割増：処分の種類リストには出さない（配車費はアプリの昼22,000／夜32,000）'),
('ワイエム','キャンセル','車両・割増','回',10000,0,0,0,null,false,61,false,'車両・割増：処分の種類リストには出さない（配車費はアプリの昼22,000／夜32,000）')
on conflict (vendor,item) do update set category=excluded.category, unit=excluded.unit, price=excluded.price, safety_fee=excluded.safety_fee, env_fee=excluded.env_fee, base_fee=excluded.base_fee, monthly_price=excluded.monthly_price, popular=excluded.popular, sort_order=excluded.sort_order, active=excluded.active, note=excluded.note, updated_at=now();

COMMIT;

-- アプリ（PostgREST）に新しいテーブルをすぐ認識させる
NOTIFY pgrst, 'reload schema';


-- =====================================================================
-- 確認用（読み取りのみ）: 実行後に1つずつ流すと確認できます
-- =====================================================================
-- 件数: 61 / active 56 / よく使う 12 になるはず
-- select count(*) as total,
--        count(*) filter (where active) as active,
--        count(*) filter (where popular) as popular
-- from public.unit_prices where vendor = 'ワイエム';
--
-- RLS: rls_enabled = true、ポリシーは SELECT の1つだけ、権限は anon・authenticated とも SELECT だけになるはず
-- select relrowsecurity as rls_enabled from pg_class where oid = 'public.unit_prices'::regclass;
-- select policyname, cmd, roles from pg_policies where schemaname = 'public' and tablename = 'unit_prices';
-- select grantee, string_agg(privilege_type, ', ') from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'unit_prices' and grantee in ('anon','authenticated') group by grantee;
