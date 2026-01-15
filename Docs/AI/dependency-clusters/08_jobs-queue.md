# クラスター08: ジョブ基盤（BullMQ/Redis）

## 目的/範囲
- Chatwork 同期・サマリー下書き生成などの非同期処理をジョブ化。
- ジョブの enqueue / worker 実行 / 状態更新 / 結果保存。
- ジョブ一覧・詳細・キャンセル API を提供。

## データモデル（Prisma）
- `JobStatus`: `queued` / `processing` / `completed` / `failed` / `canceled`
- `JobType`: `chatwork_rooms_sync` / `chatwork_messages_sync` / `summary_draft`
- `Job`:
  - `payload` (Json) 入力
  - `result` (Json) 進捗や最終結果
  - `error` (Json) 失敗時の `{ name, message, stack }`
  - `userId` (nullable) 実行者紐づけ
  - `startedAt` / `finishedAt` 進捗管理
  - `createdAt` / `updatedAt` 監視用
  - `@@index([type, status])` / `@@index([createdAt])`

## 環境変数/実行モード
- `REDIS_URL`: BullMQ 接続に必須（`env.ts` で production 必須チェック）。
- `JOB_WORKER_ENABLED`: API サーバーで worker を起動するかを切替（`env.jobWorkerEnabled`）。
- `NODE_ENV`:
  - `production` かつ `REDIS_URL` 未設定なら起動時にエラー。
  - `REDIS_URL` がない場合、開発環境では inline 実行にフォールバック。

## バックエンド構成
### エントリポイント
- `backend/src/index.ts`
  - `initJobQueue(fastify.log, { enableWorker: env.jobWorkerEnabled })` を実行。
- `backend/src/worker.ts`
  - 専用 worker プロセス起動。`REDIS_URL` 不在なら即終了。

### 主要モジュール/関数
- `backend/src/services/jobQueue.ts`
  - `initJobQueue(...)`
    - `REDIS_URL` がある場合のみ `Queue` / `Worker` を singleton として生成。
    - `enableQueue` / `enableWorker` を分けて制御。
  - `enqueueJob(type, payload, userId?)`
    - `jobs` テーブルへレコード作成 → BullMQ `queue.add` へ投入。
    - queue 不在時は `production` ならエラー、非 production は inline 実行。
  - `processBullJob(job)`
    - `job.data.jobId` で DB `Job` を引き当てて `executeJob` へ。
  - `executeJob(jobId, type, payload)`
    - `status=processing` に更新 → type ごとの処理 → `completed/failed/canceled` へ遷移。
    - `JobCanceledError` なら `canceled`、それ以外は `failed` と `error` 保存。
  - `cancelJob(jobId)`
    - `jobs` を `canceled` 更新 → BullMQ のキューから削除（存在時）。
  - `isCanceled(jobId)` / `updateProgress(jobId, result)`
    - 進捗更新とキャンセル検知を DB 経由で実施。

### ジョブタイプ別ロジック
- `chatwork_rooms_sync`
  - `handleChatworkRoomsSync` → `syncChatworkRooms`（`backend/src/services/chatworkSync.ts`）
  - 結果: `{ created, updated, total }`
- `chatwork_messages_sync`
  - `handleChatworkMessagesSync`
    - 対象 room 数をカウント → `{ totalRooms, processedRooms: 0 }` を `result` に保存。
    - `syncChatworkMessages` 後に `processedRooms` と `summary` を更新。
  - 結果: `{ rooms: [{ roomId, fetched }], errors: [{ roomId, message }] }`
- `summary_draft`
  - `handleSummaryDraft` → `generateSummaryDraft`（`backend/src/services/summaryGenerator.ts`）
  - 結果: `draft` 情報（id, period, content, sourceLinks, model, tokenUsage 等）

### API
- `backend/src/routes/jobs.ts`
  - `GET /api/jobs`: type/status/limit で絞り込み（非 admin は自身の job のみ）。
  - `GET /api/jobs/:id`: 自分の job のみ参照可（admin は全件）。
  - `POST /api/jobs/:id/cancel`: `queued/processing` のみキャンセル可。
  - 失敗時の `error` は非 admin では `name`/`message` のみに縮約。
- ジョブ作成の入口（他クラスター）
  - `POST /api/chatwork/rooms/sync` → `JobType.chatwork_rooms_sync`
  - `POST /api/chatwork/messages/sync` → `JobType.chatwork_messages_sync`
  - `POST /api/companies/:id/summaries/draft` → `JobType.summary_draft`

## フロントエンド構成
- `frontend/src/pages/ChatworkSettings.tsx`
  - Chatwork 同期の enqueue と `/api/jobs/:id` ポーリング（2 秒間隔）。
  - `JobRecord` を `activeJob` として保持し、完了/失敗/キャンセルでトースト表示。
- `frontend/src/components/ui/JobProgressCard.tsx`
  - `queued/processing` 時のみキャンセルボタン表示。
  - `result.totalRooms`/`processedRooms` を進捗バーに反映。
  - `job.error?.message` を表示。
- `frontend/src/hooks/useApi.ts`
  - `useFetch`/`useMutation` で API 通信、ポーリングとキャッシュ制御。
- `frontend/src/types/entities.ts`
  - `JobRecord` 型（status/result/error などの UI 表示用定義）。

## データフロー
- Queue 実行:
  - API → `enqueueJob` → `jobs` レコード作成 → BullMQ `queue.add` →
    `worker` → `processBullJob` → `executeJob` → `status/result` 更新。
- Inline 実行（開発時フォールバック）:
  - `enqueueJob` 内で `executeJob` を直接実行 → `jobs` の `status/result` 更新。
- キャンセル:
  - `POST /api/jobs/:id/cancel` → `status=canceled` →
    `syncChatwork*` 側の `shouldCancel` で `JobCanceledError` を投げて停止。

## 関連テスト
- なし（ジョブキュー/ルートの専用テスト未整備）。

## 他クラスターとの接点
- Chatwork 同期 (`backend/src/services/chatworkSync.ts`) と Summary 生成 (`backend/src/services/summaryGenerator.ts`) が実処理。
- UI は Chatwork 設定画面で job を操作し、進捗表示に `result` を利用。
