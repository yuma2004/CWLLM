# CWLLM Backend Architecture (Mermaid)

このドキュメントは、`CWLLM` バックエンドの主要コンポーネントとデータフローをMermaidで可視化したものです。
図の対象は Web API, Worker, Job Queue, Chatwork連携, Prisma/Postgres, Redis, 認証/RBAC, 主要CRUD を含みます。

**System Context**
目的: 外部システムとBackend全体の関係を俯瞰する。

```mermaid
flowchart LR
  user[利用者]
  admin[管理者]
  chatwork[Chatwork API]
  redis[(Redis)]
  db[(PostgreSQL)]

  subgraph Backend[CWLLM Backend]
    web[Fastify Web API]
    worker[Worker]
  end

  user -->|HTTPS| web
  admin -->|HTTPS| web

  chatwork -->|Webhook| web
  web -->|API呼び出し| chatwork
  worker -->|API呼び出し| chatwork


  web -->|BullMQ enqueue| redis
  worker -->|BullMQ consume| redis

  web -->|Prisma| db
  worker -->|Prisma| db
```

範囲: Web/Workerプロセスと外部依存の接続点。
参照ソース:
- `src/index.ts`
- `src/worker.ts`
- `src/services/jobQueue.ts`
- `src/services/chatworkScheduler.ts`
- `src/config/env.ts`
- `prisma/schema.prisma`

**Container and Component Map**
目的: Web API と Worker 内部の主要コンポーネント依存を把握する。

```mermaid
flowchart TB
  subgraph Web[Fastify Web API]
    http[HTTP Server]
    routes[Routes /api]
    validation[Zod Validation]
    rbac[RBAC/JWT]
    handlers[Route Handlers]
    errorHandler[Error Handler + preSerialization]
  end

  subgraph Worker[Worker Process]
    workerLoop[Worker Main]
    scheduler[Chatwork Auto Sync Scheduler]
  end

  subgraph Services[Services]
    chatworkSync[Chatwork Sync]
    jobQueue[Job Queue]
  end

  prisma[Prisma Client]
  db[(PostgreSQL)]
  redis[(Redis)]
  chatwork[Chatwork API]

  http --> routes --> validation --> rbac --> handlers --> errorHandler
  handlers --> prisma
  handlers --> Services

  workerLoop --> jobQueue
  workerLoop --> scheduler

  jobQueue --> redis
  scheduler --> redis

  chatworkSync --> chatwork
  chatworkSync --> prisma
  prisma --> db
```

範囲: Fastify内部の構成とWorker実行系、主要サービスの依存。
参照ソース:
- `src/index.ts`
- `src/worker.ts`
- `src/routes/index.ts`
- `src/middleware/rbac.ts`
- `src/services/chatworkSync.ts`
- `src/services/jobQueue.ts`
- `src/config/env.ts`

**Request Lifecycle**
目的: HTTPリクエストがAPIを通過する流れを整理する。

```mermaid
sequenceDiagram
  participant Client as Client
  participant Fastify as Fastify
  participant Zod as Zod Validator
  participant RBAC as RBAC/JWT
  participant Handler as Route Handler
  participant Service as Service
  participant Prisma as Prisma
  participant DB as Postgres

  Client->>Fastify: HTTP request
  Fastify->>Zod: validate body/query/params
  alt validation error
    Zod-->>Fastify: validation error
    Fastify-->>Client: 400 + normalized error
  else valid
    Fastify->>RBAC: jwtVerify + role check
    alt unauthorized/forbidden
      RBAC-->>Fastify: 401/403
      Fastify-->>Client: error payload
    else allowed
      Fastify->>Handler: execute
      Handler->>Service: business logic
      Service->>Prisma: query/mutation
      Prisma->>DB: SQL
      DB-->>Prisma: result
      Prisma-->>Service: model
      Service-->>Handler: result
      Handler-->>Fastify: payload
      Fastify-->>Client: response (preSerialization normalize)
    end
  end
```

範囲: Web API の一般的なリクエスト処理とエラー整形。
参照ソース:
- `src/index.ts`
- `src/middleware/rbac.ts`
- `src/routes/*.ts`
- `src/routes/*.handlers.ts`
- `src/utils/errors.ts`

**Chatwork同期フロー**
目的: Webhookと手動同期がJob Queueを介して実行される流れを把握する。

```mermaid
sequenceDiagram
  participant Chatwork as Chatwork
  participant Webhook as Webhook Caller
  participant Admin as Admin
  participant API as Fastify API
  participant Queue as BullMQ Queue
  participant Worker as Worker
  participant DB as Postgres

  Chatwork-->>Webhook: イベント
  Webhook->>API: POST /api/chatwork/webhook
  API->>Queue: enqueue chatwork_messages_sync

  Admin->>API: POST /api/chatwork/rooms/sync
  API->>Queue: enqueue chatwork_rooms_sync

  Admin->>API: POST /api/chatwork/messages/sync
  API->>Queue: enqueue chatwork_messages_sync

  Worker->>Queue: poll
  Queue-->>Worker: job
  Worker->>Chatwork: list rooms/messages
  Worker->>DB: upsert rooms/messages, update sync state
  DB-->>Worker: ok
  Worker-->>Queue: complete job
```

範囲: Chatwork Webhook と手動同期のジョブ化および実行。
参照ソース:
- `src/routes/chatwork.ts`
- `src/routes/chatwork.handlers.ts`
- `src/services/jobQueue.ts`
- `src/services/chatworkSync.ts`
- `src/services/chatworkScheduler.ts`
- `src/config/env.ts`

**サマリ作成フロー**
目的: サマリ作成と候補抽出の流れを追う。

```mermaid
sequenceDiagram
  participant User as User
  participant API as Fastify API
  participant DB as Postgres

  User->>API: POST /api/companies/:id/summaries
  API->>DB: create Summary
  API-->>User: 201 summary

  User->>API: GET /api/companies/:id/summaries
  API->>DB: list summaries
  DB-->>API: summaries
  API-->>User: 200 summaries

  User->>API: POST /api/summaries/:id/tasks/candidates
  API->>DB: read summary content
  DB-->>API: summary
  API-->>User: candidates
```

範囲: Summary作成、一覧取得、候補抽出。
参照ソース:
- `src/routes/summaries.ts`
- `src/routes/summaries.handlers.ts`

**Jobライフサイクル**
目的: Job状態遷移を整理する。

```mermaid
stateDiagram-v2
  [*] --> queued: enqueueJob
  queued --> processing: worker starts
  queued --> canceled: cancel before start
  processing --> completed: success
  processing --> failed: error
  processing --> canceled: cancel detected
  completed --> [*]
  failed --> [*]
  canceled --> [*]
```

範囲: Jobの状態遷移とキャンセルパス。
参照ソース:
- `src/services/jobQueue.ts`
- `prisma/schema.prisma`

補足: `REDIS_URL` が無い非本番環境では、Webプロセス内でJobを即時実行する分岐があります。

**Route Map**
目的: APIエンドポイントの全体像を把握する。

```mermaid
mindmap
  root((/api))
    auth
      "POST /auth/login"
      "POST /auth/logout"
      "GET /auth/me"
    users
      "POST /users"
      "GET /users"
      "GET /users/options"
      "PATCH /users/:id/role"
    companies
      "GET /companies"
      "GET /companies/search"
      "POST /companies"
      "GET /companies/:id"
      "PATCH /companies/:id"
      "POST /companies/:id/merge"
      "DELETE /companies/:id"
      "GET /companies/:id/contacts"
      "POST /companies/:id/contacts"
      "PATCH /contacts/:id"
      "DELETE /contacts/:id"
      "PATCH /companies/:id/contacts/reorder"
      "GET /companies/options"
    chatwork
      "POST /chatwork/webhook"
      "GET /chatwork/rooms"
      "POST /chatwork/rooms/sync"
      "PATCH /chatwork/rooms/:id"
      "POST /chatwork/messages/sync"
      "GET /companies/:id/chatwork-rooms"
      "POST /companies/:id/chatwork-rooms"
      "DELETE /companies/:id/chatwork-rooms/:roomId"
    messages
      "GET /companies/:id/messages"
      "GET /messages/search"
      "GET /messages/unassigned"
      "PATCH /messages/:id/assign-company"
      "PATCH /messages/assign-company"
      "POST /messages/:id/labels"
      "DELETE /messages/:id/labels/:label"
      "POST /messages/labels/bulk"
      "POST /messages/labels/bulk/remove"
      "GET /messages/labels"
    jobs
      "GET /jobs"
      "GET /jobs/:id"
      "POST /jobs/:id/cancel"
    tasks
      "GET /tasks"
      "GET /tasks/:id"
      "POST /tasks"
      "PATCH /tasks/:id"
      "PATCH /tasks/bulk"
      "DELETE /tasks/:id"
      "GET /me/tasks"
      "GET /companies/:id/tasks"
      "GET /projects/:id/tasks"
      "GET /wholesales/:id/tasks"
    projects
      "GET /projects"
      "GET /projects/search"
      "POST /projects"
      "GET /projects/:id"
      "PATCH /projects/:id"
      "DELETE /projects/:id"
      "GET /projects/:id/wholesales"
      "GET /companies/:id/projects"
    wholesales
      "GET /wholesales"
      "POST /wholesales"
      "GET /wholesales/:id"
      "PATCH /wholesales/:id"
      "DELETE /wholesales/:id"
      "GET /companies/:id/wholesales"
    search
      "GET /search"
    summaries
      "POST /companies/:id/summaries"
      "GET /companies/:id/summaries"
      "POST /summaries/:id/tasks/candidates"
    dashboard
      "GET /dashboard"
    feedback
      "POST /feedback"
      "GET /feedback"
      "PATCH /feedback/:id"
```

範囲: `registerRoutes` に登録される `/api` 配下のエンドポイント。
参照ソース:
- `src/routes/index.ts`
- `src/routes/*.ts`

**ER Diagram: 業務エンティティ**
目的: 会社、案件、タスクなど主要業務データの関係を整理する。

```mermaid
erDiagram
  User {
    string id
    string email
    string role
  }

  Company {
    string id
    string name
    string status
  }

  Contact {
    string id
    string companyId
    string name
  }

  Project {
    string id
    string companyId
    string ownerId
    string status
  }

  Wholesale {
    string id
    string projectId
    string companyId
    string ownerId
    string status
  }

  Task {
    string id
    string targetType
    string targetId
    string assigneeId
    string status
  }

  Company ||--o{ Contact : has
  Company ||--o{ Project : has
  Company ||--o{ Wholesale : has
  Project ||--o{ Wholesale : has
  User ||--o{ Project : owns
  User ||--o{ Wholesale : owns
  User ||--o{ Task : assigned
```

範囲: 会社、プロジェクト、卸、タスク、ユーザーの関連。
参照ソース:
- `prisma/schema.prisma`

補足: `Task.targetType + targetId` は `Company` `Project` `Wholesale` `General` を参照するポリモーフィック構造です。

**ER Diagram: 連携と運用エンティティ**
目的: Chatwork連携、メッセージ、サマリ、ジョブ、フィードバックの関係を整理する。

```mermaid
erDiagram
  Company {
    string id
    string name
  }

  User {
    string id
    string email
  }

  ChatworkRoom {
    string id
    string roomId
    boolean isActive
  }

  CompanyRoomLink {
    string id
    string companyId
    string chatworkRoomId
  }

  Message {
    string id
    string chatworkRoomId
    string roomId
    string messageId
    string companyId
  }

  Summary {
    string id
    string companyId
    string type
  }


  Job {
    string id
    string type
    string status
    string userId
  }

  Feedback {
    string id
    string userId
    string type
  }

  ChatworkRoom ||--o{ Message : has
  ChatworkRoom ||--o{ CompanyRoomLink : links
  Company ||--o{ CompanyRoomLink : links
  Company ||--o{ Message : has
  Company ||--o{ Summary : has
  User ||--o{ Job : requests
  User ||--o{ Feedback : writes
```

範囲: Chatwork連携、メッセージ、サマリ、ジョブ、フィードバック。
参照ソース:
- `prisma/schema.prisma`
- `src/services/chatworkSync.ts`
- `src/services/jobQueue.ts`

補足: `Message` は `Project` `Wholesale` にも任意で紐付きます。

**Mermaidプレビュー**
目的: 生成した図が破綻していないか確認する。
- VSCodeのMermaid拡張やGitHubのMarkdownプレビューでレンダリング確認が可能。
- 文字数が多い図は拡大表示で確認してください。
