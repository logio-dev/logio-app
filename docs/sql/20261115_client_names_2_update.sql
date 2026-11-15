-- =====================================================================
-- LOGIO: 発注者名（project_info.client）をそろえる　② 書き換え
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

-- 1件ずつ id を指定して書き換えます。
-- 安全のため、次のときは1件も書き換えずに止まり、エラーに現場名が出ます（その場合は Claude に知らせてください）:
--   ・その id の行が無い、または発注者が ① のときの値から変わっている
--   ・請求先を入れる行で、請求先にすでに何か入っている（上書きしない）
-- 成功すると「Success. No rows returned」と出ます。続けて ③ で確かめてください。

do $$
declare n int;
begin
  -- TSプラザビルディング13階（今：JLA（株式会社4COLORS））
  update public.project_info set client = 'JLA', invoice_recipient = '4COLORS'
   where id = 'b9d20b3c-cbd3-4ee7-a964-9bad88418079' and client = 'JLA（株式会社4COLORS）' and coalesce(invoice_recipient, '') = '';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'TSプラザビルディング13階'; end if;

  -- フェリスビル6階（今：JLA（株式会社Rends））
  update public.project_info set client = 'JLA', invoice_recipient = 'Rends'
   where id = '11dc6130-d227-40ab-91fe-be46d6d4b231' and client = 'JLA（株式会社Rends）' and coalesce(invoice_recipient, '') = '';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'フェリスビル6階'; end if;

  -- 太陽生命日本橋ビル22F（今：JLA(太陽生命保険株式会社)）
  update public.project_info set client = 'JLA', invoice_recipient = '太陽生命保険'
   where id = '8aefead2-daca-4f98-9b9d-e55f613a11bc' and client = 'JLA(太陽生命保険株式会社)' and coalesce(invoice_recipient, '') = '';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', '太陽生命日本橋ビル22F'; end if;

  -- 新宿マインズタワー18階貸室W　C工事（今：JLA(株式会社テクノクリエイティブ)）
  update public.project_info set client = 'JLA', invoice_recipient = 'テクノクリエイティブ'
   where id = 'eb55a48e-9806-4395-997f-0e32200b22a1' and client = 'JLA(株式会社テクノクリエイティブ)' and coalesce(invoice_recipient, '') = '';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', '新宿マインズタワー18階貸室W　C工事'; end if;

  -- エレファンテック既存空調ダクト設備撤去工事（今：アット・ファシリティラボ株式会社）
  update public.project_info set client = 'アット・ファシリティラボ'
   where id = '23fc348d-23a9-4492-b9f1-a1213aaa406b' and client = 'アット・ファシリティラボ株式会社';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'エレファンテック既存空調ダクト設備撤去工事'; end if;

  -- サブスク上尾本社原状回復工事（今：アット・ファシリティラボ株式会社）
  update public.project_info set client = 'アット・ファシリティラボ'
   where id = '27023520-c9d2-455c-9bed-0102140fe237' and client = 'アット・ファシリティラボ株式会社';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'サブスク上尾本社原状回復工事'; end if;

  -- ドコモショップ館林西店原状回復工事（今：アット・ファシリティラボ株式会社）
  update public.project_info set client = 'アット・ファシリティラボ'
   where id = 'd50cd459-7795-4abe-b7d4-dbea208aacc5' and client = 'アット・ファシリティラボ株式会社';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'ドコモショップ館林西店原状回復工事'; end if;

  -- ピザハット館林店原状回復工事（今：アット・ファシリティラボ（株））
  update public.project_info set client = 'アット・ファシリティラボ'
   where id = '74aa2160-23d2-4c3e-a02e-77c730ebb5ce' and client = 'アット・ファシリティラボ（株）';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'ピザハット館林店原状回復工事'; end if;

  -- 伊勢原市工場スケルトン工事（今：アット・ファシリティラボ株式会社）
  update public.project_info set client = 'アット・ファシリティラボ'
   where id = '6e349c35-b185-44d7-b6ba-c9225a520a13' and client = 'アット・ファシリティラボ株式会社';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', '伊勢原市工場スケルトン工事'; end if;

  -- 大手町ファーストスクエア6階撤去工事（今：アット・ファシリティラボ株式会社）
  update public.project_info set client = 'アット・ファシリティラボ'
   where id = 'c5c39266-cae9-40c3-97f9-e96da5da4bd3' and client = 'アット・ファシリティラボ株式会社';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', '大手町ファーストスクエア6階撤去工事'; end if;

  -- 銀洋新横浜ビル5階田辺ファーマ様原状回復工事（今：アット・ファシリティラボ株式会社）
  update public.project_info set client = 'アット・ファシリティラボ'
   where id = 'ffea5a11-4bfa-4c20-b21e-9c2f65c7bfd5' and client = 'アット・ファシリティラボ株式会社';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', '銀洋新横浜ビル5階田辺ファーマ様原状回復工事'; end if;

  -- 飯田橋ファーストタワー31階弱電撤去工事（今：アット・ファシリティラボ株式会社）
  update public.project_info set client = 'アット・ファシリティラボ'
   where id = '86aaa7fe-bc5a-4665-ac14-08f6088c5979' and client = 'アット・ファシリティラボ株式会社';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', '飯田橋ファーストタワー31階弱電撤去工事'; end if;

  -- ｸ ﾘ ｱ ﾃ ｨ ﾌﾞ ﾌﾟ ﾗ ｻﾞ 3 階 原 状 回 復 工 事（今：3Aコーポレーション）
  update public.project_info set client = 'スリーエーコーポレーション'
   where id = 'ded183cd-b0c6-46f6-be5f-044e0183094e' and client = '3Aコーポレーション';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'ｸ ﾘ ｱ ﾃ ｨ ﾌﾞ ﾌﾟ ﾗ ｻﾞ 3 階 原 状 回 復 工 事'; end if;

  -- Daiwa目黒スクエアB1F原状回復工事（今：株式会社タキズミ）
  update public.project_info set client = 'タキズミ'
   where id = 'fe99ab30-26cd-41ac-ada7-77082274bee2' and client = '株式会社タキズミ';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'Daiwa目黒スクエアB1F原状回復工事'; end if;

  -- Daiwa赤坂ビルB2階受水槽撤去工事（今：株式会社タキズミ）
  update public.project_info set client = 'タキズミ'
   where id = 'f54d4196-1515-4b99-aab0-4d7a07fc5ccb' and client = '株式会社タキズミ';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'Daiwa赤坂ビルB2階受水槽撤去工事'; end if;

  -- TPR厚木1階原状回復工事（今：株式会社タキズミ）
  update public.project_info set client = 'タキズミ'
   where id = '129fa4ad-0d78-4774-898b-67eedea9cae1' and client = '株式会社タキズミ';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'TPR厚木1階原状回復工事'; end if;

  -- TraValore淵野辺2階改修工事（今：株式会社タキズミ）
  update public.project_info set client = 'タキズミ'
   where id = 'b6974cff-b85c-4e35-8924-50e132473ddf' and client = '株式会社タキズミ';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'TraValore淵野辺2階改修工事'; end if;

  -- いちご広尾ビル9階男女トイレ改修工事（今：株式会社タキズミ）
  update public.project_info set client = 'タキズミ'
   where id = '3f61783a-d580-4f67-987f-98c3df189162' and client = '株式会社タキズミ';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'いちご広尾ビル9階男女トイレ改修工事'; end if;

  -- いちご神宮前ビルB1階壁面ボード貼替工事（今：株式会社タキズミ）
  update public.project_info set client = 'タキズミ'
   where id = 'c094803e-92d4-41d2-9275-61c12bd225a9' and client = '株式会社タキズミ';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'いちご神宮前ビルB1階壁面ボード貼替工事'; end if;

  -- スペーシア三軒茶屋弐番館1階原状回復工事（今：株式会社タキズミ）
  update public.project_info set client = 'タキズミ'
   where id = '30c7a100-dfa2-460c-9b67-1410e703c11e' and client = '株式会社タキズミ';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'スペーシア三軒茶屋弐番館1階原状回復工事'; end if;

  -- 新宿通東洋ビル4階（今：（株）タキズミ）
  update public.project_info set client = 'タキズミ'
   where id = 'd8f9e349-fa53-4a41-bd6f-31e3dcf2e144' and client = '（株）タキズミ';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', '新宿通東洋ビル4階'; end if;

  -- 豊海ビル1階貸付整備工事（今：株式会社タキズミ）
  update public.project_info set client = 'タキズミ'
   where id = 'eb9b2f6e-2068-48e6-ae5e-3046cc10ba7c' and client = '株式会社タキズミ';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', '豊海ビル1階貸付整備工事'; end if;

  -- 丸柏タマビル2階原状回復工事（リムズ）（今：株式会社リムズ）
  update public.project_info set client = 'リムズ'
   where id = '7c01d262-cc7f-464e-8cec-97a28d879a07' and client = '株式会社リムズ';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', '丸柏タマビル2階原状回復工事（リムズ）'; end if;

  -- 丸柏タマビル2階パシフィックプロダクツ様解体工事（今：株式会社パシフィックプロダクツ（株式会社Leasing Innovation））
  update public.project_info set client = 'リーシングイノベーション', invoice_recipient = 'パシフィックプロダクツ'
   where id = '505c38c1-657f-42b7-9824-9d545ed88422' and client = '株式会社パシフィックプロダクツ（株式会社Leasing Innovation）' and coalesce(invoice_recipient, '') = '';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', '丸柏タマビル2階パシフィックプロダクツ様解体工事'; end if;

  -- ホーマットホライゾンビル4・5階原状回復工事（今：川上産業株式会社）
  update public.project_info set client = '川上産業'
   where id = 'ae1e9ac2-4243-4b91-a306-39d1ab4c8dc6' and client = '川上産業株式会社';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'ホーマットホライゾンビル4・5階原状回復工事'; end if;

  -- 上島珈琲店CORED日本橋店撤去工事（今：株式会社彩弘社）
  update public.project_info set client = '彩弘社'
   where id = 'd861c06f-dd03-441a-8172-64cb216456e2' and client = '株式会社彩弘社';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', '上島珈琲店CORED日本橋店撤去工事'; end if;

  -- グレイス八丁堀7階撤去工事（今：株式会社藤倉工務店）
  update public.project_info set client = '藤倉工務店'
   where id = '05220b10-6202-43e6-bae5-4e3bcb9bede7' and client = '株式会社藤倉工務店';
  get diagnostics n = row_count; if n <> 1 then raise exception '書き換えられない行がありました：%（何も書き換えていません）', 'グレイス八丁堀7階撤去工事'; end if;
end $$;
