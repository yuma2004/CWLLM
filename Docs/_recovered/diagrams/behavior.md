# ふるまい / 処理フロー

## シーケンス：ログイン
**説明（一般）**: 画面操作からAPI応答までの手順と役割分担を示します。  
**このプロジェクトでは**: 認証成功時にJWTを発行し、Cookieに保存して以降のAPI認証に使います。
```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant API as Backend API
  participant DB as PostgreSQL

  U->>FE: ログイン入力
  FE->>API: POST /api/auth/login
  API->>DB: user lookup
  API->>API: bcrypt compare
  API-->>FE: token + Set-Cookie
  FE-->>U: ログイン完了
```

## シーケンス：Chatwork同期（管理者）
**説明（一般）**: 非同期ジョブの起動と処理の流れを示します。  
**このプロジェクトでは**: 管理者操作でジョブを作成し、BullMQワーカーが同期を実行します。
```mermaid
sequenceDiagram
  participant Admin as Admin
  participant FE as Frontend
  participant API as Backend API
  participant DB as PostgreSQL
  participant Q as BullMQ
  participant W as Worker
  participant CW as Chatwork API

  Admin->>FE: 同期開始
  FE->>API: POST /api/chatwork/rooms/sync
  API->>DB: create Job queued
  API->>Q: enqueue job
  API-->>FE: jobId
  Q->>W: process job
  W->>CW: listRooms
  W->>DB: upsert rooms
  W->>DB: update Job status completed failed
```

## シーケンス：要約ドラフト生成
**説明（一般）**: キャッシュ確認と非同期処理の分岐を示します。  
**このプロジェクトでは**: 期限内ドラフトがあれば即返し、なければジョブ経由で生成します。
```mermaid
sequenceDiagram
  participant FE as Frontend
  participant API as Backend API
  participant DB as PostgreSQL
  participant Q as BullMQ
  participant W as Worker
  participant LLM as OpenAI/Mock

  FE->>API: POST /api/companies/:id/summaries/draft
  API->>DB: 既存ドラフト確認
  alt キャッシュあり
    API-->>FE: cached draft
  else キャッシュなし
    API->>DB: create Job queued
    API->>Q: enqueue job
    API-->>FE: 202 + jobId
    Q->>W: process job
    W->>DB: fetch messages
    W->>LLM: summarize
    W->>DB: upsert summary_draft
    W->>DB: update Job status
  end
```

## アクティビティ：Chatworkメッセージ同期
**説明（一般）**: ループ処理や分岐を含む処理の流れを示します。  
**このプロジェクトでは**: ルームごとに取得・保存し、失敗時はエラー情報を記録します。
```mermaid
flowchart TD
  Start([Start]) --> LoadRooms[対象ルーム取得]
  LoadRooms --> Loop{各ルーム}
  Loop --> Fetch["Chatwork API listMessages"]
  Fetch -->|OK| Save["createMany + updateMany"]
  Save --> UpdateRoom["room.lastSyncAt / lastMessageId 更新"]
  UpdateRoom --> Loop
  Fetch -->|Error| MarkErr["room.lastError* 更新"]
  MarkErr --> Loop
  Loop --> End([End])
```

## ステートマシン：JobStatus
**説明（一般）**: ジョブの状態遷移を示します。  
**このプロジェクトでは**: DBの`jobs.status`がqueued→processing→completed/failed/canceledで更新されます。
```mermaid
stateDiagram-v2
  [*] --> queued
  queued --> processing
  processing --> completed
  processing --> failed
  queued --> canceled
  processing --> canceled
```

## ステートマシン：TaskStatus
**説明（一般）**: タスクの状態遷移を示します。  
**このプロジェクトでは**: todo/in_progress/done/cancelledを画面とAPIで管理します。
```mermaid
stateDiagram-v2
  [*] --> todo
  todo --> in_progress
  in_progress --> done
  todo --> cancelled
  in_progress --> cancelled
  done --> cancelled
```

## タイミング：自動同期スケジュール
**説明（一般）**: 定期処理のタイミングを示します。  
**このプロジェクトでは**: 環境変数で設定した間隔でChatwork同期ジョブを投入します。
```mermaid
sequenceDiagram
  participant Scheduler as ChatworkScheduler
  participant API as Backend
  participant Q as BullMQ

  Note over Scheduler,API: env CHATWORK_AUTO_SYNC_INTERVAL_MINUTES
  loop every N minutes
    Scheduler->>API: enqueue rooms sync
    Scheduler->>API: enqueue messages sync
    API->>Q: add job
  end
```

## 相互作用概要（代表シナリオ）
**説明（一般）**: 代表的なユーザーフローを短くまとめた図です。  
**このプロジェクトでは**: ダッシュボードから会社詳細へ進み、同期や要約を実行します。
```mermaid
flowchart LR
  Login["ログイン"] --> Dashboard["ダッシュボード表示"]
  Dashboard --> Company["会社詳細"]
  Company --> Sync["Chatwork同期"]
  Company --> Draft["要約ドラフト生成"]
  Draft --> Tasks["タスク候補抽出"]
```

## 例外伝播（APIエラーハンドリング）
**説明（一般）**: 例外がどのように捕捉・整形されて返るかを示します。  
**このプロジェクトでは**: `setErrorHandler` と `normalizeErrorPayload` で共通形式に揃えます。
```mermaid
flowchart TD
  Request --> Handler
  Handler -->|throw or return| ErrorHandler["Fastify setErrorHandler"]
  ErrorHandler --> Normalize["normalizeErrorPayload"]
  Normalize --> Response["JSON Error Response"]
```

## リトライ / タイムアウト / サーキットブレーカ
**説明（一般）**: 外部API失敗時の再試行やタイムアウトの扱いを示します。  
**このプロジェクトでは**: Chatworkは簡易リトライ、OpenAIは失敗時にジョブ失敗として扱います。
```mermaid
flowchart TB
  ChatworkReq["Chatwork API Request"] -->|timeout 10s| Retry{"retry limit check"}
  Retry -->|yes default=1| ChatworkReq
  Retry -->|no| ChatworkErr["store error + job failed"]

  OpenAIReq["OpenAI Request"] -->|timeout 15s| LLMErr["error -> job failed"]
  JobQueue["Job Queue"] -->|attempts=1| NoRetry["No job retry"]
```

## 冪等性の設計（現状）
**説明（一般）**: 同じ操作を繰り返しても結果が崩れない工夫を示します。  
**このプロジェクトでは**: ユニーク制約と`upsert`で重複登録を避けます。
```mermaid
flowchart TB
  MsgSync["Message Sync"] --> Unique1["unique roomId messageId"]
  MsgSync --> CreateMany["createMany skipDuplicates"]
  Draft["Summary Draft"] --> Upsert["upsert companyId period"]
  CompanyLink["CompanyRoomLink"] --> Unique2["unique companyId chatworkRoomId"]
```

## 備考（未実装/非該当）
- 分散トランザクション / サガ：未実装
- 明示的ロック設計：未実装（DB制約に依存）
- サーキットブレーカ：未実装（簡易リトライのみ）
