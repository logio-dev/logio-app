-- =====================================================================
-- LOGIO: project_info / reports テーブルに足りない欄を追加する
-- 作成日: 2026-11-06
--
-- 実行方法:
--   Supabase ダッシュボード → SQL Editor にこのファイルの中身を全部貼り付けて「Run」
--
-- 安全性:
--   ・欄（カラム）を「追加」するだけです。DROP / DELETE / UPDATE / TRUNCATE は含みません。
--   ・ADD COLUMN IF NOT EXISTS なので、すでにある欄はそのまま（型も中身も変わりません）。
--   ・何度実行しても同じ結果になります。
--   ・追加した欄の既存行の値は NULL（空）になります。アプリ側は NULL を「未入力」として扱います。
--     ※ DEFAULT は付けていません。misc_items などに DEFAULT '[]' を付けると、
--       アプリが旧データ（現場経費・販管費）を読み込まなくなるためです。
--
-- 型について:
--   ・日付系（start_date / end_date / payment_due_date）は text にしています。
--     アプリが未入力のとき空文字 '' を送るため、date 型だと保存エラーになります。
--   ・一覧・明細系は jsonb（アプリが JSON 配列 / オブジェクトを送るため）。
--
-- 実行状況:
--   ・2026-11-06 billing_amount / contract_type を追加済み
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- project_info（現場ごとのプロジェクト情報）
-- ---------------------------------------------------------------------
ALTER TABLE public.project_info
  ADD COLUMN IF NOT EXISTS site_name                     text,         -- 現場名（保存のキー）
  ADD COLUMN IF NOT EXISTS project_number                text,         -- PROJECT NO.
  ADD COLUMN IF NOT EXISTS work_type                     text,         -- 工事種別
  ADD COLUMN IF NOT EXISTS client                        text,         -- 発注者
  ADD COLUMN IF NOT EXISTS work_location                 text,         -- 現場住所
  ADD COLUMN IF NOT EXISTS sales_person                  text,         -- 営業担当
  ADD COLUMN IF NOT EXISTS site_manager                  text,         -- 現場責任者
  ADD COLUMN IF NOT EXISTS start_date                    text,         -- 工期開始
  ADD COLUMN IF NOT EXISTS end_date                      text,         -- 工期終了
  ADD COLUMN IF NOT EXISTS contract_type                 text,         -- 請負区分（フェイス / 入間緑化）
  ADD COLUMN IF NOT EXISTS contract_amount               numeric,      -- 見積金額
  ADD COLUMN IF NOT EXISTS additional_amount             numeric,      -- 追加金額
  ADD COLUMN IF NOT EXISTS billing_amount                numeric,      -- 請求金額
  ADD COLUMN IF NOT EXISTS status                        text,         -- ステータス
  ADD COLUMN IF NOT EXISTS discharger                    text,         -- 排出事業者
  ADD COLUMN IF NOT EXISTS transport_company             text,         -- 運搬会社（カンマ区切り）
  ADD COLUMN IF NOT EXISTS contracted_disposal_sites     jsonb,        -- 処分先一覧
  ADD COLUMN IF NOT EXISTS transfer_cost                 numeric,      -- 回送費
  ADD COLUMN IF NOT EXISTS lease_cost                    numeric,      -- リース費
  ADD COLUMN IF NOT EXISTS materials_cost                numeric,      -- 資材費
  ADD COLUMN IF NOT EXISTS expenses                      jsonb,        -- 経費
  ADD COLUMN IF NOT EXISTS outsourcing_items             jsonb,        -- 外注費（旧）
  ADD COLUMN IF NOT EXISTS sga_items                     jsonb,        -- 販管費（旧）
  ADD COLUMN IF NOT EXISTS site_expense_items            jsonb,        -- 現場経費（旧）
  ADD COLUMN IF NOT EXISTS misc_items                    jsonb,        -- 直接原価
  ADD COLUMN IF NOT EXISTS manifest_entries              jsonb,        -- マニフェスト明細
  ADD COLUMN IF NOT EXISTS manifest_discharger           text,         -- マニフェスト排出事業者
  ADD COLUMN IF NOT EXISTS site_area_m2                  numeric,      -- 面積（㎡）
  ADD COLUMN IF NOT EXISTS site_tsubo                    numeric,      -- 坪数
  ADD COLUMN IF NOT EXISTS site_use_type                 text,         -- 業態
  ADD COLUMN IF NOT EXISTS work_condition                text,         -- 備考欄
  ADD COLUMN IF NOT EXISTS payment_due_date              text,         -- 入金予定日
  ADD COLUMN IF NOT EXISTS payment_terms                 text,         -- 支払条件
  ADD COLUMN IF NOT EXISTS invoice_recipient             text,         -- 請求書送付先
  ADD COLUMN IF NOT EXISTS subcontract_amount            numeric,      -- 下請金額
  ADD COLUMN IF NOT EXISTS subcontractor                 text,         -- 下請業者
  ADD COLUMN IF NOT EXISTS subcontract_terms             text,         -- 下請の支払条件
  ADD COLUMN IF NOT EXISTS subcontract_invoice_recipient text,         -- 下請の請求書送付先
  ADD COLUMN IF NOT EXISTS documents_checklist           jsonb,        -- 書類確認チェックリスト
  ADD COLUMN IF NOT EXISTS updated_at                    timestamptz;  -- 更新日時

-- ---------------------------------------------------------------------
-- reports（作業日報）
-- ---------------------------------------------------------------------
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS site_name    text,         -- 現場名
  ADD COLUMN IF NOT EXISTS date         text,         -- 日付（YYYY-MM-DD）
  ADD COLUMN IF NOT EXISTS weather      text,         -- 天気
  ADD COLUMN IF NOT EXISTS recorder     text,         -- 記録者
  ADD COLUMN IF NOT EXISTS work_details jsonb,        -- 作業内容（人員・車両・重機など）
  ADD COLUMN IF NOT EXISTS waste_items  jsonb,        -- 廃棄物
  ADD COLUMN IF NOT EXISTS scrap_items  jsonb,        -- スクラップ
  ADD COLUMN IF NOT EXISTS photo_urls   jsonb,        -- 写真URL一覧
  ADD COLUMN IF NOT EXISTS memo         text,         -- 備考
  ADD COLUMN IF NOT EXISTS updated_by   text,         -- 更新者
  ADD COLUMN IF NOT EXISTS updated_at   timestamptz;  -- 更新日時

COMMIT;

-- アプリ（PostgREST）に新しい欄をすぐ認識させる
NOTIFY pgrst, 'reload schema';


-- =====================================================================
-- 確認用（読み取りのみ）: 実行後、欄がそろったか確認したいときに流してください
-- =====================================================================
-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name IN ('project_info', 'reports')
-- ORDER BY table_name, ordinal_position;
