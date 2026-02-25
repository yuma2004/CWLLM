# REQUIREMENTS BASELINE (CWLLMv)

最終更新: 2026-02-24

## 1. 目的

- Chatwork 連携を前提に、営業実務データを一元管理し、案件推進の遅延と情報分断を減らす。
- 本書は「要件の判断基準」を固定し、実装とテストの受け入れ判定を可能にする。

## 2. 利用者と権限

- `admin`: 全機能（設定、同期、全件閲覧・更新、ユーザー管理）を利用可能。
- `employee`: 日常業務機能（企業、案件、卸、タスク、フィードバック、参照系）を利用可能。

## 3. スコープ

### 3.1 In Scope

- 認証 (`auth`)
- ユーザー管理 (`users`)
- 企業/連絡先管理 (`companies`, `contacts`)
- 案件/卸管理 (`projects`, `wholesales`)
- タスク管理 (`tasks`)
- Chatwork ルーム・メッセージ同期 (`chatwork`, `messages`, `jobs`)
- 検索 (`search`)
- 要約 (`summaries`)
- ダッシュボード (`dashboard`)
- フィードバック (`feedback`)

### 3.2 Out of Scope

- LLM 自動要約ドラフト生成
- 外部SaaSへの追加連携（Chatwork 以外）
- マルチテナント分離

## 4. 機能要件 (FR)

| ID | 要件 | 受け入れ条件 (抜粋) |
| --- | --- | --- |
| FR-001 | ログイン/ログアウト/自己情報取得 | 正しい資格情報でログイン成功、誤りで `401`、`/auth/me` は認証時のみ `200` |
| FR-002 | RBAC | `admin` 限定ルートは `employee` で `403`、未認証は `401` |
| FR-003 | 企業と連絡先の管理 | 企業 CRUD、連絡先 CRUD/並び替えが API と UI で操作可能 |
| FR-004 | 案件/卸の管理 | 案件 CRUD、卸 CRUD が企業/案件に整合して操作可能 |
| FR-005 | タスク管理 | 作成/更新/削除/一括更新、対象別参照、担当者と期限の更新が可能 |
| FR-006 | Chatwork ルーム同期 | 手動同期でジョブ起票し、ルーム一覧が更新される |
| FR-007 | Chatwork メッセージ同期/Webhook | Webhook 署名検証、イベント種別判定、クールダウン付きで同期ジョブ起票 |
| FR-008 | ダッシュボード | 期限バケット別タスク、最近更新企業、未割当メッセージ件数を表示 |
| FR-009 | フィードバック | ログインユーザーが投稿可能、改善系の編集ルールを満たす |
| FR-010 | ジョブ可視化/キャンセル | ジョブ状態が参照可能で、未終了ジョブをキャンセルできる |
| FR-011 | 要約管理 | 要約作成/一覧/候補抽出が企業単位で利用可能 |

## 5. 非機能要件 (NFR)

本リポジトリで未固定だったため、運用可能な暫定基準を以下に固定する。

| ID | 要件 | 基準値/条件 |
| --- | --- | --- |
| NFR-001 | 品質ゲート | CI で `backend: lint/build/test`, `frontend: lint/typecheck/test/build` が全通過 |
| NFR-002 | API 応答性能 | 一般 CRUD の通常時 p95 を 500ms 以下（DB障害時は除く） |
| NFR-003 | 同期ジョブ耐障害性 | ルーム単位エラーで全体停止しない、`429/5xx` は再試行 |
| NFR-004 | セキュリティ | 本番は `JWT_SECRET` 必須、Cookie `httpOnly`、認証失敗時は機密情報非露出 |
| NFR-005 | 可用性 | `/healthz` で稼働判定可能、SIGTERM/SIGINT で正常停止 |
| NFR-006 | 監査可能性 | `x-request-id` 付与、リクエスト完了ログ、認証情報はログで redact |
| NFR-007 | データ整合性 | Prisma migration でスキーマ管理、主キー/ユニーク制約を維持 |
| NFR-008 | バックアップ運用 | `infra/scripts/backup.ps1` / `restore.ps1` で復旧手順を維持 |

## 6. 変更管理ルール

機能追加・変更時は以下を同一PRで更新する。

1. API: `backend/src/routes/*.ts` と `*.schemas.ts`
2. ドメインロジック: `backend/src/services/**`
3. 永続化: `backend/prisma/schema.prisma` と migration
4. UI: `frontend/src/pages/**`, `frontend/src/features/**`, `frontend/src/constants/routes.tsx`
5. テスト: backend route/service test、frontend page/feature test、必要に応じて e2e
6. ドキュメント: 本書と `Docs/REQUIREMENTS_TRACE.md`

