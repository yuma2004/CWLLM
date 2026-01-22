# TODO（全体改善）

- [x] 既存の .env / backend/.env から機密値を除去し、 .env.example / backend/.env.example を整備する
- [x] DATABASE_URL_TEST のポートを docker-compose と整合させる（55432）
- [x] backend の lint エラー（chatwork.ts の no-constant-condition）を解消する
- [x] job/スケジューラの多重起動を抑制する（production 既定値・自動同期の条件見直し）
- [x] docker-compose.prod.yml に Redis を追加し REDIS_URL を設定する
- [x] render.yaml のデフォルト管理者パスワード等を廃止する（手動設定へ）
- [x] frontend の `npm run check` が完走するようにする
- [x] frontend のレイアウト/アクセシビリティ改善（サイドバーのスマホ挙動、Toast aria-label）
- [x] ログイン後のリダイレクトを元ページへ戻す
- [x] 404 ルートを追加する
- [x] CI に frontend の lint/typecheck/test/build を追加する
- [x] README の手順崩れ・誤記を修正する
