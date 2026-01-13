# Plan

create-plan スキルに沿って、バックエンドの重複削減と可読性向上を最小限の変更で進める計画をまとめる。既存API挙動を維持し、小さな共通化を段階的に適用する。

## Scope
- In: `backend/src/routes/**` の入力検証/レスポンス整形/Prismaエラー処理、`backend/src/utils/**` の共通化、`backend/src/services/**` の重複整理、関連テスト
- Out: `frontend/`、`infra/`、DBスキーマ/マイグレーション、外部API仕様変更、新機能追加

## Action items
[x] 俯瞰: `rg` でルート間の重複パターン（バリデーション、ページング、Prismaエラー処理、監査ログ、optionsキャッシュ）を棚卸しする（例: `backend/src/routes/*.ts`）
[x] 方針化: 既存 `backend/src/utils/*` に沿って共通化単位を決め、配置先（`backend/src/routes/shared/` か `backend/src/utils/`）を決める
[x] 共通化: 文字列/配列検証、ページングレスポンス、Prismaエラー変換、not found 判定を最小ヘルパーにまとめる
[x] 適用: 代表ルート（例: `backend/src/routes/companies.ts`, `backend/src/routes/tasks.ts`）で共通ヘルパーを適用し、レスポンス/ステータスを維持する
[x] 横展開: 他ルートへ順次適用し、二重チェックと同型のレスポンス整形を削除する
[x] 整理: 未使用ユーティリティ/重複型定義を参照検索で特定し、安全に削除する
[x] エッジ検証: 400/401/403/404/409/422/429 の整形、空配列/空文字/nullable、キャッシュTTL、RBAC境界を確認する（既存ロジックとエラーノーマライズの流れを確認）
[x] テスト/検証: `cd backend; npm run test; npm run lint; npm run build` を実行し、必要ならルート単位のテストを最小追加する（test: 49件pass `--run`, lint: OK, build: OK）

## Open questions
- なし
