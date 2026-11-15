-- =====================================================================
-- LOGIO: 発注者名（project_info.client）をそろえる　元に戻す（ふだんは使わない）
-- 作成日: 2026-11-15（指示書「発注者名の選択式とそろえ直し」）
--
-- 実行する人: 西さん（Supabase ダッシュボード → SQL Editor にこのファイルの中身を全部貼り付けて「Run」）
-- 実行する順番: ① 控え → ② 書き換え → ③ 確認（①の結果を保存してから②を流す）
--
-- 対象: 27現場（2026-11-15 に本番を読み直して、27件とも前に確かめたときと同じことを確認済み）
--   ・client を、決めた書き方にそろえる
--   ・JLA・リーシングイノベーションの5現場は、invoice_recipient（請求先）にテナントの会社名を入れる
--   ・ほかの欄（請求金額・請求月・ステータス・contract_type・updated_at など）は触らない
--   ・データを消す命令（DROP・DELETE・TRUNCATE）は含みません
-- =====================================================================

-- ② を取り消して、① の控えと同じ値に戻したいときだけ流します。
-- ② のあとで書き換えた行（発注者・請求先が ② の値から変わっている行）は戻しません。

begin;
  update public.project_info set client = 'JLA（株式会社4COLORS）', invoice_recipient = '' where id = 'b9d20b3c-cbd3-4ee7-a964-9bad88418079' and client = 'JLA' and invoice_recipient = '4COLORS';  -- TSプラザビルディング13階
  update public.project_info set client = 'JLA（株式会社Rends）', invoice_recipient = '' where id = '11dc6130-d227-40ab-91fe-be46d6d4b231' and client = 'JLA' and invoice_recipient = 'Rends';  -- フェリスビル6階
  update public.project_info set client = 'JLA(太陽生命保険株式会社)', invoice_recipient = '' where id = '8aefead2-daca-4f98-9b9d-e55f613a11bc' and client = 'JLA' and invoice_recipient = '太陽生命保険';  -- 太陽生命日本橋ビル22F
  update public.project_info set client = 'JLA(株式会社テクノクリエイティブ)', invoice_recipient = '' where id = 'eb55a48e-9806-4395-997f-0e32200b22a1' and client = 'JLA' and invoice_recipient = 'テクノクリエイティブ';  -- 新宿マインズタワー18階貸室W　C工事
  update public.project_info set client = 'アット・ファシリティラボ株式会社' where id = '23fc348d-23a9-4492-b9f1-a1213aaa406b' and client = 'アット・ファシリティラボ';  -- エレファンテック既存空調ダクト設備撤去工事
  update public.project_info set client = 'アット・ファシリティラボ株式会社' where id = '27023520-c9d2-455c-9bed-0102140fe237' and client = 'アット・ファシリティラボ';  -- サブスク上尾本社原状回復工事
  update public.project_info set client = 'アット・ファシリティラボ株式会社' where id = 'd50cd459-7795-4abe-b7d4-dbea208aacc5' and client = 'アット・ファシリティラボ';  -- ドコモショップ館林西店原状回復工事
  update public.project_info set client = 'アット・ファシリティラボ（株）' where id = '74aa2160-23d2-4c3e-a02e-77c730ebb5ce' and client = 'アット・ファシリティラボ';  -- ピザハット館林店原状回復工事
  update public.project_info set client = 'アット・ファシリティラボ株式会社' where id = '6e349c35-b185-44d7-b6ba-c9225a520a13' and client = 'アット・ファシリティラボ';  -- 伊勢原市工場スケルトン工事
  update public.project_info set client = 'アット・ファシリティラボ株式会社' where id = 'c5c39266-cae9-40c3-97f9-e96da5da4bd3' and client = 'アット・ファシリティラボ';  -- 大手町ファーストスクエア6階撤去工事
  update public.project_info set client = 'アット・ファシリティラボ株式会社' where id = 'ffea5a11-4bfa-4c20-b21e-9c2f65c7bfd5' and client = 'アット・ファシリティラボ';  -- 銀洋新横浜ビル5階田辺ファーマ様原状回復工事
  update public.project_info set client = 'アット・ファシリティラボ株式会社' where id = '86aaa7fe-bc5a-4665-ac14-08f6088c5979' and client = 'アット・ファシリティラボ';  -- 飯田橋ファーストタワー31階弱電撤去工事
  update public.project_info set client = '3Aコーポレーション' where id = 'ded183cd-b0c6-46f6-be5f-044e0183094e' and client = 'スリーエーコーポレーション';  -- ｸ ﾘ ｱ ﾃ ｨ ﾌﾞ ﾌﾟ ﾗ ｻﾞ 3 階 原 状 回 復 工 事
  update public.project_info set client = '株式会社タキズミ' where id = 'fe99ab30-26cd-41ac-ada7-77082274bee2' and client = 'タキズミ';  -- Daiwa目黒スクエアB1F原状回復工事
  update public.project_info set client = '株式会社タキズミ' where id = 'f54d4196-1515-4b99-aab0-4d7a07fc5ccb' and client = 'タキズミ';  -- Daiwa赤坂ビルB2階受水槽撤去工事
  update public.project_info set client = '株式会社タキズミ' where id = '129fa4ad-0d78-4774-898b-67eedea9cae1' and client = 'タキズミ';  -- TPR厚木1階原状回復工事
  update public.project_info set client = '株式会社タキズミ' where id = 'b6974cff-b85c-4e35-8924-50e132473ddf' and client = 'タキズミ';  -- TraValore淵野辺2階改修工事
  update public.project_info set client = '株式会社タキズミ' where id = '3f61783a-d580-4f67-987f-98c3df189162' and client = 'タキズミ';  -- いちご広尾ビル9階男女トイレ改修工事
  update public.project_info set client = '株式会社タキズミ' where id = 'c094803e-92d4-41d2-9275-61c12bd225a9' and client = 'タキズミ';  -- いちご神宮前ビルB1階壁面ボード貼替工事
  update public.project_info set client = '株式会社タキズミ' where id = '30c7a100-dfa2-460c-9b67-1410e703c11e' and client = 'タキズミ';  -- スペーシア三軒茶屋弐番館1階原状回復工事
  update public.project_info set client = '（株）タキズミ' where id = 'd8f9e349-fa53-4a41-bd6f-31e3dcf2e144' and client = 'タキズミ';  -- 新宿通東洋ビル4階
  update public.project_info set client = '株式会社タキズミ' where id = 'eb9b2f6e-2068-48e6-ae5e-3046cc10ba7c' and client = 'タキズミ';  -- 豊海ビル1階貸付整備工事
  update public.project_info set client = '株式会社リムズ' where id = '7c01d262-cc7f-464e-8cec-97a28d879a07' and client = 'リムズ';  -- 丸柏タマビル2階原状回復工事（リムズ）
  update public.project_info set client = '株式会社パシフィックプロダクツ（株式会社Leasing Innovation）', invoice_recipient = '' where id = '505c38c1-657f-42b7-9824-9d545ed88422' and client = 'リーシングイノベーション' and invoice_recipient = 'パシフィックプロダクツ';  -- 丸柏タマビル2階パシフィックプロダクツ様解体工事
  update public.project_info set client = '川上産業株式会社' where id = 'ae1e9ac2-4243-4b91-a306-39d1ab4c8dc6' and client = '川上産業';  -- ホーマットホライゾンビル4・5階原状回復工事
  update public.project_info set client = '株式会社彩弘社' where id = 'd861c06f-dd03-441a-8172-64cb216456e2' and client = '彩弘社';  -- 上島珈琲店CORED日本橋店撤去工事
  update public.project_info set client = '株式会社藤倉工務店' where id = '05220b10-6202-43e6-bae5-4e3bcb9bede7' and client = '藤倉工務店';  -- グレイス八丁堀7階撤去工事
commit;
