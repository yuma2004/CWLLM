# クラスター06 詳細: Chatwork連携・同期

## 目的/範囲
- Chatwork のルーム/メッセージをローカルテーブルへ同期。
- Chatwork ルームを企業に紐付け、メッセージを自動割り当て。
- ルームの有効/無効状態を管理。
- BullMQ の非同期ジョブで同期し、進捗を追跡。

## データモデル（Prisma）
- ChatworkRoom: `roomId`, `name`, `description`, `lastSyncAt`, `lastMessageId`, エラーフィールド, `isActive`。
- CompanyRoomLink: `companyId` と `chatworkRoomId` の結合。
- Message: Chatwork メッセージを保存（企業紐付けは任意）。
- Job: 同期タスクのキュー状態/進捗/エラーを追跡。

## バックエンド構成
### Chatwork APIクライアント
- `backend/src/services/chatwork.ts`
  - `createChatworkClient` は GET 呼び出しをラップ:
    - レート制限対応（429 + `x-ratelimit-reset`）。
    - 5xx/ネットワーク障害でリトライ。
    - `AbortController` でタイムアウト。
  - `listRooms` と `listMessages` が Chatwork エンドポイントを提供。
  - `ChatworkApiError` を status/response body 付きで送出。

### 同期オーケストレーション
- `backend/src/services/chatworkSync.ts`
  - `syncChatworkRooms`
    - `roomId` で upsert し、タイムスタンプ比較で新規/更新をカウント。
    - `shouldCancel()` が true の場合は早期終了。
  - `syncChatworkMessages`
    - 有効ルーム（または特定ルーム）と紐付け情報を取得。
    - ルームが1社にのみ紐づく場合は `companyId` を自動割り当て。
    - `createMany(..., skipDuplicates: true)` で重複を回避。
    - 成功時に `lastMessageId`/`lastSyncAt` 更新とエラー初期化。
    - エラー時は `lastErrorAt`/短縮エラーメッセージ/ステータスコードを保存。
  - `pickLatestMessageId` は数値IDを `BigInt` で比較可能なら比較。
  - `JobCanceledError` がキュー層へのキャンセルシグナル。

### ルーティング
- `backend/src/routes/chatwork.ts`
- `backend/src/routes/chatwork.handlers.ts`
- `backend/src/routes/chatwork.schemas.ts`
  - GET `/api/chatwork/rooms`（admin）登録済みルーム一覧。
  - POST `/api/chatwork/rooms/sync`（admin）ルーム同期ジョブを enqueue。
  - POST `/api/chatwork/messages/sync`（admin）メッセージ同期ジョブを enqueue。
  - PATCH `/api/chatwork/rooms/:id`（admin）`isActive` 切り替え。
  - GET `/api/companies/:id/chatwork-rooms` 紐付け済みルーム一覧。
  - POST `/api/companies/:id/chatwork-rooms` `roomId` または `chatworkRoomId` で紐付け。
    - 同一ルームの既存メッセージに `companyId` を付与。
  - DELETE `/api/companies/:id/chatwork-rooms/:roomId` 紐付け解除。
  - `enqueueJob` と Prisma エラーの上書きで重複リンクに対応。

### ジョブ実行
- `backend/src/services/jobQueue.ts`
  - BullMQ + Redis を使用（`QUEUE_NAME = cwllm-jobs`）。
  - `jobs` テーブルに状態を保存し、実行中に更新。
  - `handleChatworkMessagesSync` が総数/処理済みルームを `job.result` に書き込み。
  - Redis 未設定の場合は本番以外でインライン実行。
- `backend/src/routes/jobs.ts` がジョブ状態のポーリング/キャンセルを提供。

### 環境依存
- `CHATWORK_API_TOKEN` と任意の `CHATWORK_API_BASE_URL`。
- `REDIS_URL`（キュー/ワーカー利用）。
- `JOB_WORKER_ENABLED`（ワーカー起動制御）。

## フロントエンド構成
### 管理画面: 同期コンソール
- `frontend/src/pages/ChatworkSettings.tsx`
  - `/api/chatwork/*/sync` でルーム/メッセージ同期を開始。
  - `ChatworkJobProgress` 経由で `/api/jobs/:id` を2秒間隔でポーリング。
  - `/api/jobs/:id/cancel` でキャンセル。
  - PATCH `/api/chatwork/rooms/:id` で `isActive` を切り替え。
- `frontend/src/components/ui/JobProgressCard.tsx`
  - ステータス/進捗バー/成功・失敗数を表示。
  - キュー中/処理中ジョブのキャンセルUIを表示。

### 企業紐付けUI
- `frontend/src/pages/CompanyDetail.tsx`
  - 紐付け済みルーム表示と解除（書き込み権限）。
  - 管理者は利用可能ルームから紐付け可能。
  - `/api/companies/:id/chatwork-rooms` で紐付け/解除。

### 型と契約
- `frontend/src/types/entities.ts` が `ChatworkRoom`, `LinkedRoom`, `AvailableRoom`, `JobRecord` を定義。
- `frontend/src/lib/apiRoutes.ts` が chatwork と jobs のエンドポイントを定義。

## データフロー詳細
- ルーム同期:
  - 管理者が POST `/chatwork/rooms/sync` -> ジョブ作成。
  - ワーカーが Chatwork API を呼び出してルームを upsert。
  - `jobs` に状態/結果を保存し、UI がポーリング。
- メッセージ同期:
  - 管理者が POST `/chatwork/messages/sync` -> ジョブ作成。
  - ワーカーが有効ルームごとに取得し、`skipDuplicates` で挿入。
  - `jobs.result` に進捗を書き込み UI で表示。
- 企業紐付け:
  - 紐付けで `CompanyRoomLink` を作成し、既存メッセージに `companyId` を補完。
  - 解除は結合行を削除するが、既存メッセージは変更しない。

## 依存関係
- Chatwork API（外部）。
- BullMQ と Redis による非同期処理。
- Prisma モデル: ChatworkRoom, CompanyRoomLink, Message, Job。

## テスト
- `backend/src/routes/chatwork.test.ts`

## 他クラスターとの接点
- メッセージデータをメッセージ/検索クラスターに供給（クラスター05）。
- ジョブ基盤をサマリー下書き生成と共有（クラスター07/08）。
- 企業詳細UIでルーム紐付けを提供（クラスター02）。
