# フロント/バックエンドの機能・依存関係マップ

## バックエンド

### エントリと基盤
- `backend/src/index.ts`: Fastifyサーバ、JWT、Cookie、CORS、レート制限、Swagger、エラー処理、ジョブキュー初期化。
- `backend/src/worker.ts`: BullMQ/Redisのジョブワーカー単体起動。

### APIルート（`/api`）
- routes は handlers/schemas に分割 (`routes/<name>.ts`, `routes/<name>.handlers.ts`, `routes/<name>.schemas.ts`)
- auth (`/auth/*`): ログイン/ログアウト/現在ユーザー -> Prisma User + bcryptjs + fastify-jwt。
- users (`/users*`): ユーザー一覧/オプション/ロール変更 -> Prisma + TTLキャッシュ。
- companies/contacts (`/companies*`, `/contacts*`): 企業/連絡先CRUD -> Prisma + 監査ログ。
- tasks (`/tasks*`, `/me/tasks`, `/companies/:id/tasks`, `/projects/:id/tasks`, `/wholesales/:id/tasks`):
  タスク管理 -> Prisma + ターゲット情報付与 + 監査ログ。
- projects (`/projects*`, `/companies/:id/projects`): 案件CRUD/卸一覧 -> Prisma + 監査ログ。
- wholesales (`/wholesales*`, `/companies/:id/wholesales`): 卸CRUD -> Prisma + 監査ログ。
- messages (`/companies/:id/messages`, `/messages/search`, `/messages/labels`, `/messages/*/labels`):
  メッセージ検索/ラベル -> Prisma + PostgreSQL全文検索 + TTLキャッシュ。
- chatwork (`/chatwork/*`, `/companies/:id/chatwork-rooms*`):
  Chatwork同期 -> Prisma + ジョブキュー（ルーム/メッセージ同期）。
- summaries (`/companies/:id/summaries*`, `/summaries/:id/tasks/candidates`):
  サマリー下書き/登録 -> ジョブキュー -> サマリー生成 -> LLM。
- jobs (`/jobs*`): ジョブ一覧/詳細/キャンセル -> Prisma + BullMQ。
- dashboard (`/dashboard`): ダッシュボード集計 -> Prisma + ターゲット情報付与。
- search (`/search`): 横断検索 -> Prisma + normalizeCompanyName。
- settings (`/settings`): アプリ設定 -> Prisma。
- export (`/export/*.csv`): CSV出力 -> Prisma。
- audit logs (`/audit-logs`): 監査ログ一覧 -> Prisma。

### サービス
- `services/chatwork.ts`: Chatwork APIクライアント（fetch + リトライ）。
- `services/chatworkSync.ts`: ルーム/メッセージ同期 -> Chatwork API + Prisma。
- `services/jobQueue.ts`: BullMQキュー/ワーカー + Redis、同期/サマリーのジョブ実行。
- `services/summaryGenerator.ts`: メッセージ抽出 -> LLM -> サマリー下書き。
- `services/llm.ts`: OpenAI またはモック。
- `services/audit.ts`: 監査ログ書き込み（Prisma）。
- `services/taskTargets.ts`: ターゲット名解決（company/project/wholesale）。

### データストア/外部依存
- PostgreSQL（Prisma, `DATABASE_URL`）。
- Redis（BullMQ, `REDIS_URL`）。
- Chatwork API（`CHATWORK_API_TOKEN`, `CHATWORK_API_BASE_URL`）。
- OpenAI API（`OPENAI_API_KEY`, `OPENAI_MODEL`）。

## フロントエンド

### エントリとルーティング
- `frontend/src/main.tsx`: Reactルート + BrowserRouter。
- `frontend/src/App.tsx`: AuthProvider + ProtectedRoute + ルート定義。
- `frontend/src/constants/routes.tsx`: ページルート設定。

### APIレイヤー
- `frontend/src/lib/apiRoutes.ts`: バックエンドURLマップ。
- `frontend/src/lib/apiClient.ts`: fetchラッパ（認証ヘッダ + Cookie）。
- `frontend/src/lib/apiRequest.ts`: Abort/リトライなどの共通リクエスト処理。
- `frontend/src/hooks/useApi.ts`: fetch/mutation、キャッシュ、リトライ。
- `frontend/src/hooks/useListQuery.ts`: 一覧のfilters/paginationからクエリ文字列を生成。
- `frontend/src/lib/apiCache.ts`: メモリキャッシュ。

### 認証 / RBAC
- `frontend/src/contexts/AuthContext.tsx`: `/api/auth` login/logout/me + localStorage token。
- `frontend/src/components/ProtectedRoute.tsx`, `frontend/src/hooks/usePermissions.ts`。

### ページ -> APIエンドポイント
- Home: `/api/dashboard`。
- Companies: `/api/companies`, `/api/companies/options`, `/api/chatwork/rooms`（admin）。
- CompanyDetail: `/api/companies/:id`, `/api/companies/:id/contacts`,
  `/api/companies/:id/messages`, `/api/messages/labels`,
  `/api/companies/:id/chatwork-rooms`, `/api/chatwork/rooms`。
- ChatworkSettings: `/api/chatwork/rooms`, `/api/chatwork/rooms/sync`,
  `/api/chatwork/messages/sync`, `/api/jobs`。
- Tasks: `/api/tasks`, `/api/me/tasks`, `/api/tasks/bulk`, `/api/users/options`。
- TaskDetail: `/api/tasks/:id`, `/api/users/options`。
- Projects: `/api/projects`, `/api/users`。
- ProjectDetail: `/api/projects/:id`, `/api/projects/:id/wholesales`, `/api/wholesales`。
- Wholesales: `/api/wholesales`, `/api/companies/:id`, `/api/projects/:id`（フィルタ）。
- WholesaleDetail: `/api/wholesales/:id`, `/api/wholesales/:id/tasks`。
- Settings: `/api/settings`。
- Exports: `/api/export/companies.csv`, `/api/export/tasks.csv`,
  `/api/companies/options`, `/api/users/options`。
- Login: `/api/auth/login`（AuthContext）。

### UI/挙動の依存
- Kanbanボードは`@dnd-kit/*`でドラッグ＆ドロップ。
- Tailwind CSSでスタイリング。

## フロントエンド <-> バックエンド対応
- `frontend/src/lib/apiRoutes.ts`は`backend/src/routes/*`と対応。
- ジョブ駆動（Chatwork同期、サマリー下書き）は`/api/jobs`で進捗/ポーリング。
