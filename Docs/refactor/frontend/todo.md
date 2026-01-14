# フロントエンドリファクタ TODO

## 事前確認
- [x] エンコーディング修正の要否確認（対象なし）
- [x] `frontend` のベースラインテスト実行（npm test / lint / typecheck / build）

## 共通ユーティリティ
- [x] クエリ文字列ヘルパー追加（テスト含む）
- [x] エラー状態ヘルパー追加

## ページ別リファクタ（1タスク=1コミット）
- [x] Companies: フィルタ/作成/テーブル分割、クエリヘルパー導入
- [x] Projects: フィルタ/作成/テーブル分割、クエリヘルパー導入
- [x] Wholesales: フィルタ/作成/テーブル分割、クエリヘルパー導入
- [x] Tasks: フィルタ/一括操作/テーブル/カンバン分割、クエリヘルパー導入
- [x] Exports: 出力種別ごとのフィルタ分割とダウンロードヘルパー再利用
- [x] ChatworkSettings: ジョブポーリング/ルーム一覧の切り出し
- [x] CompanyDetail: 概要/担当者/タイムライン/Chatwork/タスクの分割

## UI一貫性
- [x] StatusBadge のマッピングを `constants/labels.ts` と整合
- [x] 安全な範囲で FormInput/FormSelect/FormTextarea に置換
- [x] 閉じるアイコンを共通 SVG に統一

## エンコーディング（承認が必要）
- [x] 文字化け有無の確認と UTF-8（BOMなし）への変換（対象なし）
- [x] 変換後の表示確認（対象なし）

## 検証
- [x] 単体テスト / lint / typecheck / build 実行
- [ ] 任意: E2E テスト（Playwright）※ DB 未起動で失敗（localhost:5432）
