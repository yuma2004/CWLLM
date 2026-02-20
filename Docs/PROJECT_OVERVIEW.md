# PROJECT OVERVIEW (CWLLMv)

このファイルは、CWLLMv を短時間で把握するための集約資料です。

## 1. 目的

- Chatwork 連携を前提に、営業活動の実務データを管理するアプリ。
- 主な管理対象:
- 会社 (`companies`)
- 連絡先 (`contacts`)
- 案件 (`projects`)
- 卸 (`wholesales`)
- タスク (`tasks`)
- Chatwork メッセージ (`messages`)
- 要約 (`summaries`)
- ジョブ (`jobs`)
- フィードバック (`feedbacks`)

## 2. 技術構成

- モノレポ構成:
- `frontend`: React + TypeScript + Vite
- `backend`: Fastify + TypeScript + Prisma
- `infra`: Docker Compose (PostgreSQL/Redis)
- DB: PostgreSQL
- キュー: Redis + BullMQ

## 3. 起動とテスト

### 3.1 ローカル起動

```bash
cp .env.example .env
cp backend/.env.example backend/.env
npm run dev:db
npm run dev:backend
npm run dev:frontend
```

### 3.2 よく使うコマンド

```bash
# backend
npm --prefix backend run dev
npm --prefix backend test -- --run

# frontend
npm --prefix frontend run dev
npm --prefix frontend test -- --run
```

## 4. 環境変数（重要）

### 4.1 フロント

- `VITE_API_BASE_URL`: API ベース URL
- `VITE_MOCK_AUTH`: 認証モック切り替え

### 4.2 バックエンド

- `BACKEND_PORT`
- `NODE_ENV`
- `RUN_MODE` (`web` / `worker`)
- `DATABASE_URL`
- `DATABASE_URL_TEST`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_ROLE`
- `CHATWORK_API_TOKEN`
- `CHATWORK_API_BASE_URL`
- `REDIS_URL`
- `JOB_WORKER_ENABLED`

## 5. API 構成（`/api` prefix）

`backend/src/routes/index.ts` で以下を登録:

- `auth`
- `users`
- `companies`
- `chatwork`
- `messages`
- `jobs`
- `tasks`
- `projects`
- `wholesales`
- `search`
- `summaries`
- `dashboard`
- `feedback`

補助エンドポイント:

- OpenAPI UI: `/api/docs`
- Health check: `/healthz`

## 6. フロント主要ルート

`frontend/src/constants/routes.tsx` の保護ルート:

- `/`
- `/feedback`
- `/companies`, `/companies/:id`
- `/tasks`, `/tasks/:id`
- `/projects`, `/projects/:id`
- `/wholesales/:id`
- `/settings/accounts` (admin)
- `/settings/chatwork` (admin)

## 7. データモデル要点（Prisma）

スキーマ: `backend/prisma/schema.prisma`

- 認証/権限:
- `User` (`role`: `admin` / `employee`)
- 営業ドメイン:
- `Company` -> `Contact`, `Project`, `Wholesale`, `Message`, `Summary`
- `Project` は `Company` に属し、`ownerId` で `User` と紐付く
- `Wholesale` は `Project` と `Company` の両方に紐付く
- タスク:
- `Task` (`targetType`, `targetId`) で対象を汎用参照
- Chatwork:
- `ChatworkRoom`
- `CompanyRoomLink` (会社とルームの多対多リンク)
- `Message` (`roomId`, `messageId`) ユニーク
- 非同期処理:
- `Job` (`chatwork_rooms_sync`, `chatwork_messages_sync`)
- その他:
- `Feedback`, `Summary`

## 8. 実装の読み順（推奨）

1. `backend/src/index.ts`
2. `backend/src/routes/index.ts`
3. `backend/prisma/schema.prisma`
4. `frontend/src/App.tsx`
5. `frontend/src/constants/routes.tsx`
6. 各ページ (`frontend/src/pages/*.tsx`)
7. feature ロジック (`frontend/src/features/**`)

## 9. 最近のリファクタ要点

- ページロジックの hook 分離:
- `frontend/src/features/projects/useProjectsPage.ts`
- `frontend/src/features/projects/useProjectDetailPage.ts`
- `frontend/src/features/tasks/useTasksPage.ts`
- `frontend/src/features/chatwork/useChatworkSettingsPage.ts`
- メッセージ関連 service 分離:
- `backend/src/services/messages.ts`

## 10. 変更時の着眼点

- API 契約を壊さない（レスポンスキー/HTTP ステータス）
- ルート追加時は:
- バックエンド: `routes/index.ts` へ登録
- フロント: `constants/routes.tsx` へ追加
- 新しい永続項目は:
- Prisma schema 変更
- migration
- handler/service/types の順で反映
- Chatwork 同期変更時は:
- `chatwork*` service と `jobs` 周辺をセットで確認

## 11. ドキュメント方針

- 詳細な Chatwork API 仕様は `Docs/ChatWork_API仕様.md` を参照。
- それ以外の高頻度参照は本ファイルを起点にする。
