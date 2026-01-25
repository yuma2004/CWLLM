# 図衁EEE体まぁEめEEE

> 生EE Docs/diagrams/*.md

---

# めEーめEEEE/ 構送E

## めEめEEめEンEめEトEE4 ContextEE
**誁E明E一般EE*: 刁E用老EE外部めEめEE・臁EめEめEEぁE閁E係EEEEをE縺Eくり掴む図ぁEす、E 
**こEプロめEめEめEトでぁE**: ブラめEめE刁E用老EフロントE由ぁEAPIEEぁEEhatwork/OpenAIぁE送E搁Eします、E
```mermaid
flowchart TB
  subgraph Users[刁E用老E
    Admin[管EEE
    Staff["一般ユーめEー employee"]
  end

  subgraph System[CWLLM]
    FE["Frontend React + Vite"]
    BE["Backend API Fastify"]
  end

  DB[(PostgreSQL)]
  Redis[(Redis BullMQ)]
  Chatwork[Chatwork API]
  OpenAI[OpenAI API]

  Admin --> FE
  Staff --> FE
  FE --> BE
  BE --> DB
  BE --> Redis
  BE --> Chatwork
  BE --> OpenAI
  Chatwork --> BE
```

## C4 Container
**誁E明E一般EE*: 丁EE実EE位EEI/API/ワーめEー/DB/めEャEュEE縺EぁEめて示します、E 
**こEプロめEめEめEトでぁE**: APIぁEBullMQワーめEーがPostgreSQLぁERedisをE有E、外部APIぁEめEめEめEめEします、E
```mermaid
flowchart LR
  User[Browser]
  FE["Frontend SPA React + Vite"]
  API["Backend API Fastify"]
  Worker["Job Worker BullMQ"]
  DB[(PostgreSQL)]
  Redis[(Redis)]
  Chatwork[Chatwork API]
  OpenAI[OpenAI API]

  User --> FE
  FE -->|HTTPS JSON| API
  API -->|SQL| DB
  API -->|Redis protocol| Redis
  API -->|HTTPS| Chatwork
  API -->|HTTPS| OpenAI
  Worker -->|Redis protocol| Redis
  Worker -->|SQL| DB
  Worker -->|HTTPS| Chatwork
  Worker -->|HTTPS| OpenAI
```

## EめEめEンドEめEンポEネント図EEML Component 盁E当EE
**誁E明E一般EE*: EめEめEンドE部ぁE構E要EEぁE依E関係E遉Eします、E 
**こEプロめEめEめEトでぁE**: Routes→Handlers→Services→PrismaぁE流れぁE、EE要EEぁEぁE機Eが実EEEEてぁEす、E
```mermaid
flowchart TB
  subgraph FastifyApp[Fastify App]
    Routes[Routes]
    Middleware[RBAC / JWT / RateLimit]
    Handlers[Handlers]
    Services[Services]
    Prisma[Prisma Client]
  end

  subgraph ServicesBox[Services]
    JobQueue[Job Queue / Worker]
    ChatworkSync[Chatwork Sync]
    SummaryGen[Summary Generator]
    ChatworkScheduler[Chatwork Scheduler]
    LLMClient[LLM Client]
    ChatworkClient[Chatwork Client]
  end

  Routes --> Middleware --> Handlers --> Services --> Prisma
  Services --> JobQueue
  Services --> ChatworkSync
  Services --> SummaryGen
  Services --> ChatworkScheduler
  SummaryGen --> LLMClient
  ChatworkSync --> ChatworkClient
  Prisma --> DB[(PostgreSQL)]
  JobQueue --> Redis[(Redis)]
  ChatworkClient --> Chatwork[Chatwork API]
  LLMClient --> OpenAI[OpenAI API]
```

## 論理めEーめEEEEEE・責務EE
**誁E明E一般EE*: 屁EごEぁE責務と依存方向E謨EEEE図ぁEす、E 
**こEプロめEめEめEトでぁE**: UIEI→Service→InfraぁE一E向で、EB/Redis/外部APIぁEInfra側ぁE雁EEEEぁEぁEす、E
```mermaid
flowchart TB
  subgraph Presentation[Presentation]
    UI[React UI]
  end
  subgraph API[API Layer]
    Routes2[Fastify Routes]
    Auth[Auth / RBAC]
  end
  subgraph Service[Service / Use-Case]
    Domain[Business Logic]
    Jobs[Job Orchestration]
  end
  subgraph Infra[Infrastructure]
    Prisma2[Prisma]
    Redis2[Redis BullMQ]
    External[Chatwork / OpenAI]
  end

  UI --> Routes2 --> Auth --> Domain --> Prisma2
  Domain --> Jobs --> Redis2
  Domain --> External
```

## 物EEEｼめEEEEEev / ProdEE
**誁E明E一般EE*: 実EEEEぁE配EEEEロめEめE/めEンE/めEービスEE遉Eします、E 
**こEプロめEめEめEトでぁE**: 開発ぁEVite+FastifyぁEDockerぁEDB/Redis、E用ぁERenderぁEたEDocker構EぁEす、E
```mermaid
flowchart TB
  subgraph Dev[Local Dev]
    BrowserDev[Browser]
    FEDev["Vite Dev Server :5173"]
    BEDev["Fastify Dev :3000"]
    DBDev[(Postgres Docker)]
    RedisDev[(Redis Docker)]
    BrowserDev --> FEDev --> BEDev
    BEDev --> DBDev
    BEDev --> RedisDev
  end

  subgraph Prod[Production Render or Docker]
    BrowserProd[Browser]
    FEProd["Static Site"]
    BEProd["Backend API Docker"]
    DBProd[(Managed Postgres)]
    RedisProd[(Managed Redis)]
    BrowserProd --> FEProd --> BEProd
    BEProd --> DBProd
    BEProd --> RedisProd
  end
```

## ネットワーめE構E / トラフィEフロー
**誁E明E一般EE*: リめEめEめEトE入叁Eから冁E・外部送E搁EぁEぁEぁE通EE経跁EをEEします、E 
**こEプロめEめEめEトでぁE**: ブラめEめEEロントEAPI→DB/Redis→外部APIぁE流れぁEぁEります、E
```mermaid
flowchart LR
  User[Browser]
  FE["Frontend static"]
  API["Backend API"]
  DB[(PostgreSQL)]
  Redis[(Redis)]
  Chatwork[Chatwork API]
  OpenAI[OpenAI API]

  User -->|HTTPS| FE
  FE -->|HTTPS api| API
  API -->|SQL| DB
  API -->|Redis protocol| Redis
  API -->|HTTPS| Chatwork
  API -->|HTTPS| OpenAI
  Chatwork -->|Webhook| API
```

## 認訁E・認咡EEEEErust BoundaryEE
**誁E明E一般EE*: ぁEこで認訁E・認咡E行われるか、EEEEEをEEす図ぁEす、E 
**こEプロめEめEめEトでぁE**: JWTEEぁERBACぁEEめEめEンドEぁE実施し、クラめEめEントE未俁EE前提ぁEす、E
```mermaid
flowchart TB
  subgraph Client[Untrusted Client]
    Browser
  end
  subgraph Server[Trusted Backend]
    API2[Fastify API]
    JWT[JWT Verify]
    RBAC[RBAC]
  end
  Browser -->|Cookie Authorization| API2 --> JWT --> RBAC
  API2 --> DB2[(PostgreSQL)]
```

## めEトレーめE / めEャEュ配EE
**誁E明E一般EE*: EEめEぁE保存E・めEャEュぁE配EEをEEします、E 
**こEプロめEめEめEトでぁE**: フロントEuseFetchぁEメモリめEャEュ、バEぁEPostgreSQL/Redisを利用します、E
```mermaid
flowchart LR
  FECache["Frontend In-Memory Cache useFetch cacheKey"]
  API3[Backend API]
  DB3[(PostgreSQL)]
  Redis3[(Redis BullMQ)]

  FECache --> API3
  API3 --> DB3
  API3 --> Redis3
```

## めEョブ基盁E / めEベントEEぁE全佁E
**誁E明E一般EE*: 非同期EEEE流れぁEめEュー/ワーめEーぁE閁E係E遉Eします、E 
**こEプロめEめEめEトでぁE**: Chatwork同朚EEEEEEEめEョブ化され、BullMQワーめEーがEEEEぁEす、E
```mermaid
flowchart TB
  UI[Frontend] -->|POST chatwork sync| API4[Backend API]
  API4 -->|create Job| DB4[(PostgreSQL)]
  API4 -->|enqueue job| Queue[(BullMQ Queue)]
  Queue --> Worker[Worker]
  Worker -->|process| Chatwork2[Chatwork API]
  Worker -->|process| OpenAI2[OpenAI API]
  Worker -->|update status result| DB4
```

## 依E関係EラフEモめEュール依EEE
**誁E明E一般EE*: モめEュール間E依E方向E菫E瞁EすE蝗EぁEす、E 
**こEプロめEめEめEトでぁE**: Routes/Handlers/ServicesがEE忁E、Erisma/Redis/外部APIぁE依EEぁEす、E
```mermaid
flowchart TB
  Routes3[Routes] --> Handlers3[Handlers] --> Services3[Services] --> Utils[Utils]
  Services3 --> Prisma3["Prisma Client"] --> DB5[(PostgreSQL)]
  Services3 --> Redis4[(Redis)]
  Services3 --> External2["Chatwork OpenAI"]
  Middleware2[Middleware] --> Services3
```

## モめEュール構EEリポジトリEE
**誁E明E一般EE*: リポジトリぁE丁EEめEレめEトリ構EをEEします、E 
**こEプロめEめEめEトでぁE**: frontend/backend/infra/DocsぁE刁Eして責務E譏守｢E化EぁEぁEす、E
```mermaid
flowchart TB
  Repo["CWLLM Repo"]
  Repo --> Frontend["frontend/"]
  Repo --> Backend["backend/"]
  Repo --> Infra["infra/"]
  Repo --> Docs["Docs/"]

  Frontend --> Pages["pages/"]
  Frontend --> Components["components/"]
  Frontend --> Hooks["hooks/"]
  Frontend --> Contexts["contexts/"]
  Frontend --> Lib["lib/"]
  Frontend --> Constants["constants/"]
  Frontend --> Types["types/"]
  Frontend --> UtilsFe["utils/"]

  Backend --> Routes4["routes/"]
  Backend --> Services4["services/"]
  Backend --> Middleware4["middleware/"]
  Backend --> Utils4["utils/"]
  Backend --> Prisma4["prisma/"]
  Backend --> Config["config/"]
  Backend --> TypesBe["types/"]
  Backend --> Test["test/"]
  Backend --> Worker["worker.ts"]
```

## レめEヤー図EEresentation / Domain / InfraEE
**誁E明E一般EE*: プレめEンEEめEョン/ドメめEン/めEンフラぁE抽象屁EをEEします、E 
**こEプロめEめEめEトでぁE**: Routes/ServicesがドメめEン盁E当、Erisma/Redis/外部APIがインフラ盁E当です、E
```mermaid
flowchart TB
  PresentationLayer[Presentation]
  DomainLayer[Domain / Use-Case]
  InfraLayer[Infrastructure]

  PresentationLayer --> DomainLayer --> InfraLayer
```

## HexagonalEEorts & AdaptersEE
**誁E明E一般EE*: めEめEぁE外部めEダプタぁEEEをEEすEE計図ぁEす、E 
**こEプロめEめEめEトでぁE**: InboundぁEHTTP/Scheduler、EutboundぁEDB/Redis/Chatwork/OpenAIぁEす、E
```mermaid
flowchart LR
  subgraph Core[Core / Use-Case]
    UseCases[Services]
  end
  subgraph Inbound[Inbound Adapters]
    HTTP[Fastify Routes]
    Scheduler[Chatwork Scheduler]
  end
  subgraph Outbound[Outbound Adapters]
    DBAdapter["Prisma / PostgreSQL"]
    QueueAdapter["Redis BullMQ"]
    ChatworkAdapter["Chatwork API"]
    LLMAdapter["OpenAI API"]
  end
  HTTP --> UseCases
  Scheduler --> UseCases
  UseCases --> DBAdapter
  UseCases --> QueueAdapter
  UseCases --> ChatworkAdapter
  UseCases --> LLMAdapter
```

## DDD Context MapEEEぁEけ！E
**誁E明E一般EE*: 業務E域EコンEめEトE間ぁE閁E係E遉Eします、E 
**こEプロめEめEめEトでぁE**: CompaniesEE忁EProjects/Wholesales/TasksがEE搁Eします、E
```mermaid
flowchart LR
  Accounts["Accounts Users"]
  CRM["CRM Companies Contacts"]
  Projects["Projects"]
  Wholesales["Wholesales"]
  Messaging["Messaging Chatwork Rooms Messages"]
  Tasks["Tasks"]
  Summaries["Summaries"]

  CRM --> Projects
  CRM --> Wholesales
  Messaging --> CRM
  Messaging --> Summaries
  Projects --> Tasks
  Wholesales --> Tasks
  Summaries --> Tasks
```

## 4+1 ビューEEEEEEE
| View | E応E|
| --- | --- |
| Logical | 論理めEーめEEEE/ レめEヤー図 |
| Process | めEョブ基盁E / めEベントEEE/ めEーめEンめE |
| Development | モめEュール構E / 依E関俁E|
| Physical | 物EEEｼめEEEE/ ネットワーめE |
| Scenarios | めEーめEンめE図EロめEめEン・同朚Eｻ要EEEE|

## 責務E割EサマリEE
| E沺 | 丁E拁EEE| 役割 |
| --- | --- | --- |
| 画靁E/UI | Frontend | 画靁E衁E示、E力、API呁EぁEEぁE|
| 認訁E/認咡E| Backend | JWT発行、RBAC、アめEめEめE刁E御 |
| 業務ロめEEE| Backend Services | 同朚E要EEめEめEめE化筁E|
| 永続化 | PostgreSQL + Prisma | 丁EEーめEぁE永続化 |
| 非同期EEE| Redis + BullMQ | Chatwork同朚Eｻ要EEEE実EE|
| 外部送E搁E | Chatwork/OpenAI | メEーめE取EE要EEE|

---

# ぁEるまぁE/ EEEロー

## めEーめEンめEEロめEめEン
**誁E明E一般EE*: 画靁E操EからAPIEまぁEぁEyEEE役割刁EEEEします、E 
**こEプロめEめEめEトでぁE**: 認訁E成功時にJWTを発行し、EookieぁE保存EぁE以降EAPI認訁EぁE佁EぁEす、E
```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant API as Backend API
  participant DB as PostgreSQL

  U->>FE: ロめEめEン入E
  FE->>API: POST /api/auth/login
  API->>DB: user lookup
  API->>API: bcrypt compare
  API-->>FE: token + Set-Cookie
  FE-->>U: ロめEめEン完EE
```

## めEーめEンめEEChatwork同朚EEEEEEEEE
**誁E明E一般EE*: 非同期ジョブE起動EEEEE流れをEEします、E 
**こEプロめEめEめEトでぁE**: 管EEEEでめEョブE菴Eし、BullMQワーめEーがE期を実EしぁEす、E
```mermaid
sequenceDiagram
  participant Admin as Admin
  participant FE as Frontend
  participant API as Backend API
  participant DB as PostgreSQL
  participant Q as BullMQ
  participant W as Worker
  participant CW as Chatwork API

  Admin->>FE: 同朚EEE
  FE->>API: POST /api/chatwork/rooms/sync
  API->>DB: create Job queued
  API->>Q: enqueue job
  API-->>FE: jobId
  Q->>W: process job
  W->>CW: listRooms
  W->>DB: upsert rooms
  W->>DB: update Job status completed failed
```

## めEーめEンめEE要EEラフト生E
**誁E明E一般EE*: めEャEュ確認と非同期EEEE刁EEを礁Eします、E 
**こEプロめEめEめEトでぁE**: E冁EラフトがあれE即返E、EけE縺EめEョブ経由ぁE生Eします、E
```mermaid
sequenceDiagram
  participant FE as Frontend
  participant API as Backend API
  participant DB as PostgreSQL
  participant Q as BullMQ
  participant W as Worker
  participant LLM as OpenAI/Mock

  FE->>API: POST /api/companies/:id/summaries/draft
  API->>DB: 既Eラフト確誁E
  alt めEャEュあEE
    API-->>FE: cached draft
  else めEャEュぁEぁE
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

## めEめEEE薙めEEChatworkメEーめE同朚E
**誁E明E一般EE*: ループEEEEEEEを吁EむEEEE流れをEEします、E 
**こEプロめEめEめEトでぁE**: ルームごEぁE取EE保存E、夁E敗時ぁEめEラー惁EEEを記録します、E
```mermaid
flowchart TD
  Start([Start]) --> LoadRooms[E象ルーム取EE
  LoadRooms --> Loop{吁Eーム}
  Loop --> Fetch["Chatwork API listMessages"]
  Fetch -->|OK| Save["createMany + updateMany"]
  Save --> UpdateRoom["room.lastSyncAt / lastMessageId 更E"]
  UpdateRoom --> Loop
  Fetch -->|Error| MarkErr["room.lastError* 更E"]
  MarkErr --> Loop
  Loop --> End([End])
```

## めEEEトEめEンEJobStatus
**誁E明E一般EE*: めEョブE犁E態E移をEEします、E 
**こEプロめEめEめEトでぁE**: DBぁE`jobs.status`がqueued→processing→completed/failed/canceledぁE更EされぁEす、E
```mermaid
stateDiagram-v2
  [*] --> queued
  queued --> processing
  processing --> completed
  processing --> failed
  queued --> canceled
  processing --> canceled
```

## めEEEトEめEンETaskStatus
**誁E明E一般EE*: めEめEめEぁE犁E態E移をEEします、E 
**こEプロめEめEめEトでぁE**: todo/in_progress/done/cancelledを画靁EぁEAPIぁE管EEEぁEす、E
```mermaid
stateDiagram-v2
  [*] --> todo
  todo --> in_progress
  in_progress --> done
  todo --> cancelled
  in_progress --> cancelled
  done --> cancelled
```

## めEめEミンめEEE動同期スめEめEュール
**誁E明E一般EE*: 定朚EEEEEめEめEミンめEをEEします、E 
**こEプロめEめEめEトでぁE**: 璁EEEE数ぁE訁E定EE隔でChatwork同朚EEョブE謚募Eします、E
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

## 盁EEE概EEE仁E衁EめEナリめEEE
**誁E明E一般EE*: 代衁E皁EユーめEーフローを短くまぁEめた図ぁEす、E 
**こEプロめEめEめEトでぁE**: ダEュボEドから会礁E詁E細ぁE送EぁE、E期めEEEE螳EしぁEす、E
```mermaid
flowchart LR
  Login["ロめEめEン"] --> Dashboard["ダEュボEドEE示"]
  Dashboard --> Company["会礁E詁E細"]
  Company --> Sync["Chatwork同朚E]
  Company --> Draft["要EEラフト生E"]
  Draft --> Tasks["めEめEめE候E抽凁E"]
```

## 例E伝EEEPIめEラーハンドリンめEEE
**誁E明E一般EE*: 例EがぁEぁEようぁE捕捉・敁E形されぁE返E縺を礁Eします、E 
**こEプロめEめEめEトでぁE**: `setErrorHandler` ぁE `normalizeErrorPayload` ぁE共通EE式E揁EぁEす、E
```mermaid
flowchart TD
  Request --> Handler
  Handler -->|throw or return| ErrorHandler["Fastify setErrorHandler"]
  ErrorHandler --> Normalize["normalizeErrorPayload"]
  Normalize --> Response["JSON Error Response"]
```

## リトラめE / めEめEムめEめEE/ めEーめEEブレーめE
**誁E明E一般EE*: 外部API失敗時ぁE再詁E行めEEめEムめEめEトEyEぁEE遉Eします、E 
**こEプロめEめEめEトでぁE**: ChatworkぁEE易リトラめE、EpenAIぁE失敗時ぁEめEョブEE敗としてyEぁEす、E
```mermaid
flowchart TB
  ChatworkReq["Chatwork API Request"] -->|timeout 10s| Retry{"retry limit check"}
  Retry -->|yes default=1| ChatworkReq
  Retry -->|no| ChatworkErr["store error + job failed"]

  OpenAIReq["OpenAI Request"] -->|timeout 15s| LLMErr["error -> job failed"]
  JobQueue["Job Queue"] -->|attempts=1| NoRetry["No job retry"]
```

## 冁E等态EぁE訁E計E現犁EEE
**誁E明E一般EE*: 同じ操Eを繁Eり返しぁEも結果が崁EれEぁEEE夫をEEします、E 
**こEプロめEめEめEトでぁE**: ユニEめE刁EE`upsert`ぁE重褁E錁Eを避けます、E
```mermaid
flowchart TB
  MsgSync["Message Sync"] --> Unique1["unique roomId messageId"]
  MsgSync --> CreateMany["createMany skipDuplicates"]
  Draft["Summary Draft"] --> Upsert["upsert companyId period"]
  CompanyLink["CompanyRoomLink"] --> Unique2["unique companyId chatworkRoomId"]
```

## 備老EE未実EE非EE当EE
- 刁EトランめEめEめEョン / めEめEE未実EE
- 明礁E皁EE訁E計E未実EEEEB刁EE依EE
- めEーめEEブレーめEE未実EEEEE易リトラめEぁEぁEEE

---

# EEめEぁEわめE

## ER 図EE理EE
**誁E明E一般EE*: EEめEぁEめEンEEEEE閁E係E菫E瞁EすE蝗EぁEす、E 
**こEプロめEめEめEトでぁE**: CompaniesEE忁EProjects/Wholesales/Tasks/Chatwork送E搁Eが繋がります、E
```mermaid
erDiagram
  USER {
    string id PK
    string email
    string role
  }
  COMPANY {
    string id PK
    string name
    string normalizedName
    string ownerId FK
  }
  CONTACT {
    string id PK
    string companyId FK
    string name
  }
  PROJECT {
    string id PK
    string companyId FK
    string ownerId FK
    string status
  }
  WHOLESALE {
    string id PK
    string projectId FK
    string companyId FK
    string ownerId FK
    string status
  }
  CHATWORK_ROOM {
    string id PK
    string roomId UK
    boolean isActive
  }
  COMPANY_ROOM_LINK {
    string id PK
    string companyId FK
    string chatworkRoomId FK
  }
  MESSAGE {
    string id PK
    string chatworkRoomId FK
    string roomId
    string messageId
    string companyId FK
    string projectId FK
    string wholesaleId FK
  }
  SUMMARY {
    string id PK
    string companyId FK
    string type
  }
  SUMMARY_DRAFT {
    string id PK
    string companyId FK
  }
  TASK {
    string id PK
    string targetType
    string targetId
    string assigneeId FK
    string status
  }
  JOB {
    string id PK
    string type
    string status
    string userId FK
  }
  AUDIT_LOG {
    string id PK
    string entityType
    string entityId
  }
  APP_SETTING {
    string id PK
    string key UK
  }

  USER ||--o{ COMPANY : owns
  COMPANY ||--o{ CONTACT : has
  COMPANY ||--o{ PROJECT : has
  PROJECT ||--o{ WHOLESALE : has
  COMPANY ||--o{ WHOLESALE : has
  CHATWORK_ROOM ||--o{ MESSAGE : contains
  COMPANY ||--o{ MESSAGE : assigned
  PROJECT ||--o{ MESSAGE : assigned
  WHOLESALE ||--o{ MESSAGE : assigned
  COMPANY ||--o{ SUMMARY : has
  COMPANY ||--o{ SUMMARY_DRAFT : has
  COMPANY ||--o{ COMPANY_ROOM_LINK : links
  CHATWORK_ROOM ||--o{ COMPANY_ROOM_LINK : links
  USER ||--o{ TASK : assigned
  USER ||--o{ JOB : created
```

## EEめEフローEEFD レベEEE
**誁E明E一般EE*: EEめEがEこからどこE流れるかをEEします、E 
**こEプロめEめEめEトでぁE**: フロントEAPI→DB/Redis→外部APIEEhatwork/OpenAIEE流れぁEす、E
```mermaid
flowchart LR
  User[User] --> FE[Frontend]
  FE --> API[Backend API]
  API --> DB[(PostgreSQL)]
  API --> Redis["Redis/BullMQ"]
  API --> Chatwork[Chatwork API]
  API --> OpenAI[OpenAI API]
  Chatwork --> API
```

## めEベンE/ めEョブスめEーマE現犁EEE
| JobType | payload | 誁EE|
| --- | --- | --- |
| `chatwork_rooms_sync` | `{}` | ルーム一覧同朚E|
| `chatwork_messages_sync` | `{ roomId?: string, roomLimit?: number }` | メEーめE同朚E|
| `summary_draft` | `{ companyId, periodStart, periodEnd }` | 要EEラフト生E |

## EEめE辞書E丁EEンEEEEEE
| めEンEEEE| 丁EぁEEE | 備老E|
| --- | --- | --- |
| User | `email`, `role`, `password` | 認訁E・権陁E|
| Company | `name`, `normalizedName`, `status`, `tags` | CRM丁E忁E|
| Contact | `companyId`, `name`, `role`, `email` | 会礁E送E絁EE|
| Project | `companyId`, `name`, `status`, `periodStart/End` | 案仁E |
| Wholesale | `projectId`, `companyId`, `status`, `margin` | 卸 |
| ChatworkRoom | `roomId`, `name`, `lastSyncAt`, `isActive` | 送E搁Eルーム |
| Message | `roomId`, `messageId`, `sender`, `body`, `sentAt` | 送E搁EメEーめE |
| Summary | `companyId`, `content`, `type` | 確定要EE|
| SummaryDraft | `companyId`, `content`, `expiresAt` | 臁EEE|
| Task | `targetType`, `targetId`, `assigneeId`, `status` | めEめEめE |
| Job | `type`, `status`, `payload`, `result` | 非同期EEE|

## 実EEEE刁EE丁E要EE加EEEE**誁E明E一般EE*: ER図/辞書ぁE丁EEEEぁE抜Eです。EEEぁE以下E追加EEがあります、E 
- Company: `category`, `profile`, `ownerId`
- Contact: `phone`, `memo`, `sortOrder`
- Project: `conditions`, `unitPrice`, `periodStart`, `periodEnd`, `ownerId`
- Wholesale: `conditions`, `unitPrice`, `margin`, `agreedDate`, `ownerId`
- ChatworkRoom: `description`, `lastMessageId`, `lastErrorAt`, `lastErrorMessage`, `lastErrorStatus`
- Message: `labels`, `sender`, `sentAt`
- Summary / SummaryDraft: `periodStart`, `periodEnd`, `sourceLinks`, `model`, `promptVersion`, `sourceMessageCount`, `tokenUsage`, `expiresAt`EEraftぁEぁEEE- Task: `title`, `description`, `dueDate`, `assigneeId`
- Job: `error`, `startedAt`, `finishedAt`

## CRUD マトリめEめEE丁EEEE| リめEーめE | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| Users | ✁E| ✁E| ✁Erole) | - |
| Companies | ✁E| ✁E| ✁E| ✁E|
| Contacts | ✁E| ✁E| ✁E| ✁E|
| Projects | ✁E| ✁E| ✁E| ✁E|
| Wholesales | ✁E| ✁E| ✁E| ✁E|
| Messages | - | ✁E| ✁Eassign/labels) | - |
| Summaries | ✁E| ✁E| - | - |
| SummaryDraft | ✁Ejob) | ✁E| - | - |
| Tasks | ✁E| ✁E| ✁E| ✁E|
| Jobs | ✁Eenqueue) | ✁E| ✁Ecancel) | - |
| Settings | - | ✁E| ✁E| - |

## めEンEめEめE / 刁EEE抜EEE
| EEブE| めEンEめEめE / ユニEめE |
| --- | --- |
| companies | `normalizedName` unique |
| contacts | `(companyId, sortOrder)` |
| projects | `(companyId)` |
| wholesales | `(companyId, projectId)` |
| chatwork_rooms | `roomId` unique |
| company_room_links | `(companyId, chatworkRoomId)` unique |
| messages | `unique(roomId, messageId)`, `(companyId)`, `(companyId, sentAt)` |
| summary_drafts | `unique(companyId, periodStart, periodEnd)`, `(companyId, periodStart, periodEnd)` |
| tasks | `(targetType, targetId)`, `(dueDate, status)`, `(assigneeId)` |
| jobs | `(type, status)`, `(createdAt)` |

## めEャEュめEー訁E計EフロントEE
| めEー | TTL | 誁EE|
| --- | --- | --- |
| `cacheKey`E未EE時ぁEURLEE| `cacheTimeMs` | `useFetch` がメモリぁE保E |

## 敁E合态EモEE
- 丁EEEめEEEostgreSQLE：EE敁E吁E
- 非同期EEEEEob/QueueE：結果敁E合EジョブEEEE蠕EEE
- 要EEラフトE朚E付きめEャEュEEsummary_drafts.expiresAt`EE

## マゟEEレーめEョン運用E現犁EEE
| 璁EEE| めEマンE| 備老E|
| --- | --- | --- |
| 開発 | `npm run migrate:dev` | Prisma migrate dev |
| 本畁E | `npm run migrate:deploy` | Prisma migrate deploy |

---

# API / めEンめEーフェーめE

## API 一覧E丁EEEE
### Auth
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/auth/login` | POST | - | - |
| `/api/auth/logout` | POST | - | - |
| `/api/auth/me` | GET | ✁E| any |

### Users
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/users` | GET | ✁E| admin |
| `/api/users` | POST | ✁E| admin |
| `/api/users/options` | GET | ✁E| any |
| `/api/users/:id/role` | PATCH | ✁E| admin |

### Companies / Contacts / Related
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/companies` | GET | ✁E| any |
| `/api/companies` | POST | ✁E| admin/employee |
| `/api/companies/:id` | GET | ✁E| any |
| `/api/companies/:id` | PATCH | ✁E| admin/employee |
| `/api/companies/:id` | DELETE | ✁E| admin/employee |
| `/api/companies/search` | GET | ✁E| any |
| `/api/companies/options` | GET | ✁E| any |
| `/api/companies/:id/contacts` | GET | ✁E| any |
| `/api/companies/:id/contacts` | POST | ✁E| admin/employee |
| `/api/companies/:id/contacts/reorder` | PATCH | ✁E| admin/employee |
| `/api/contacts/:id` | PATCH | ✁E| admin/employee |
| `/api/contacts/:id` | DELETE | ✁E| admin/employee |
| `/api/companies/:id/projects` | GET | ✁E| any |
| `/api/companies/:id/wholesales` | GET | ✁E| any |
| `/api/companies/:id/tasks` | GET | ✁E| any |
| `/api/companies/:id/messages` | GET | ✁E| any |
| `/api/companies/:id/summaries` | GET | ✁E| any |
| `/api/companies/:id/summaries` | POST | ✁E| admin/employee |
| `/api/companies/:id/summaries/draft` | POST | ✁E| admin/employee |

### Projects / Wholesales
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/projects` | GET | ✁E| any |
| `/api/projects` | POST | ✁E| admin/employee |
| `/api/projects/:id` | GET | ✁E| any |
| `/api/projects/:id` | PATCH | ✁E| admin/employee |
| `/api/projects/:id` | DELETE | ✁E| admin/employee |
| `/api/projects/search` | GET | ✁E| any |
| `/api/projects/:id/wholesales` | GET | ✁E| any |
| `/api/projects/:id/tasks` | GET | ✁E| any |
| `/api/wholesales` | GET | ✁E| any |
| `/api/wholesales` | POST | ✁E| admin/employee |
| `/api/wholesales/:id` | GET | ✁E| any |
| `/api/wholesales/:id` | PATCH | ✁E| admin/employee |
| `/api/wholesales/:id` | DELETE | ✁E| admin/employee |
| `/api/wholesales/:id/tasks` | GET | ✁E| any |

### Messages
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/messages/search` | GET | ✁E| any |
| `/api/messages/unassigned` | GET | ✁E| any |
| `/api/messages/:id/assign-company` | PATCH | ✁E| admin/employee |
| `/api/messages/assign-company` | PATCH | ✁E| admin/employee |
| `/api/messages/:id/labels` | POST | ✁E| admin/employee |
| `/api/messages/:id/labels/:label` | DELETE | ✁E| admin/employee |
| `/api/messages/labels` | GET | ✁E| any |
| `/api/messages/labels/bulk` | POST | ✁E| admin/employee |
| `/api/messages/labels/bulk/remove` | POST | ✁E| admin/employee |

### Tasks
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/tasks` | GET | ✁E| any |
| `/api/tasks` | POST | ✁E| admin/employee |
| `/api/tasks/:id` | GET | ✁E| any |
| `/api/tasks/:id` | PATCH | ✁E| admin/employee |
| `/api/tasks/:id` | DELETE | ✁E| admin/employee |
| `/api/tasks/bulk` | PATCH | ✁E| admin/employee |
| `/api/me/tasks` | GET | ✁E| any |

### Jobs / Summaries
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/jobs` | GET | ✁E| any |
| `/api/jobs/:id` | GET | ✁E| any |
| `/api/jobs/:id/cancel` | POST | ✁E| any |
| `/api/summaries/:id/tasks/candidates` | POST | ✁E| any |

### Chatwork
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/chatwork/rooms` | GET | ✁E| admin |
| `/api/chatwork/rooms/sync` | POST | ✁E| admin |
| `/api/chatwork/rooms/:id` | PATCH | ✁E| admin |
| `/api/chatwork/messages/sync` | POST | ✁E| admin |
| `/api/chatwork/webhook` | POST | - | - |
| `/api/companies/:id/chatwork-rooms` | GET | ✁E| any |
| `/api/companies/:id/chatwork-rooms` | POST | ✁E| admin/employee |
| `/api/companies/:id/chatwork-rooms/:roomId` | DELETE | ✁E| admin/employee |

### Dashboard / Export / Audit / Search
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/dashboard` | GET | ✁E| any |
| `/api/search` | GET | ✁E| any |

### Health
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/healthz` | GET | - | - |

## 認訁Eフロー
**誁E明E一般EE*: ロめEめEンから認訁E済みAPI刁E用ぁEぁEぁE流れをEEします、E 
**こEプロめEめEめEトでぁE**: ロめEめEンぁEJWTを発行し、Eookie/AuthorizationぁE`/api/auth/me`ぁEめEめEめEめEします、E
```mermaid
sequenceDiagram
  participant FE as Frontend
  participant API as Backend
  participant DB as PostgreSQL

  FE->>API: POST /api/auth/login
  API->>DB: find user
  API-->>FE: token + Set-Cookie
  FE->>API: GET /api/auth/me (Cookie/Authorization)
  API-->>FE: user
  FE->>API: POST /api/auth/logout
  API-->>FE: clear cookie
```

## めEEEめEめE / めEラーめEーEE覧
| HTTP | Code | 誁EE|
| --- | --- | --- |
| 400 | `BAD_REQUEST` | 入力不EE |
| 401 | `UNAUTHORIZED` | 認訁E失敁E|
| 403 | `FORBIDDEN` | 権限不趁E |
| 404 | `NOT_FOUND` | リめEーめE不在 |
| 409 | `CONFLICT` | 竁E吁E|
| 422 | `VALIDATION_ERROR` | EEEめEョン |
| 429 | `TOO_MANY_REQUESTS` | レート制陁E|
| 500 | `INTERNAL_SERVER_ERROR` | 予期しなぁEラー |

Prisma 例EEEンめEE例EE
- `P2025` E404
- `P2002` E409
- `P2003` E400

## レート制陁E
| E象 | 訁E宁E| 由来 |
| --- | --- | --- |
| `/api/auth/login` | `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | Fastify rate-limit |
| Chatwork API | 5刁E00回相当E間隔刁E御 | めEラめEめEントE部刁E御 |

## ペEめEンめE / フィルめE / めEートEクめEリあEEE

## EEめEョニンめEE釁E
- 珁E犁EぁE `/api` ぁE固定EバーめEョン無しEE

## Webhook めEベンE
| 送EEE| 受EEめEンドEめEンE| 認訁E |
| --- | --- | --- |
| Chatwork | `/api/chatwork/webhook` | `CHATWORK_WEBHOOK_TOKEN` |

## 非同EAPIEジョブEE
**誁E明E一般EE*: めEョブE菴EぁE同期APIぁE流れをEEします、E 
**こEプロめEめEめEトでぁE**: APIが`jobs`EEし、BullMQワーめEーがEEEEぁE結果をDBぁE反映します、E
```mermaid
flowchart LR
  API[Backend API] --> DB[(jobs)]
  API --> Queue[(BullMQ)]
  Queue --> Worker[Worker]
  Worker --> DB
```

## OpenAPI / Swagger
- `/api/docs` ぁE Swagger UI を提E

## 外部送E搁EぁEEEEE概要EEE
| 送E搁EE| 用送E| めEンドEめEンE|
| --- | --- | --- |
| Chatwork API | ルーム/メEーめE取EE| `https://api.chatwork.com/v2` |
| OpenAI API | 要EEE| `https://api.openai.com/v1/chat/completions` |

---

# フロントエンE/ 画靁EぁEわめE

## めEめEトEEE
**誁E明E一般EE*: 画靁E構EE覧ぁE示す図ぁEす、E 
**こEプロめEめEめEトでぁE**: 丁EEめEーめEEEompanies/Tasks/Projects/WholesalesEと訁E定糁E画靁EぁE刁Eれます、E
```mermaid
flowchart TB
  Root["/"]
  Login["/login"]
  NotFound["*"]
  Companies["/companies"]
  CompanyDetail["/companies/:id"]
  Tasks["/tasks"]
  TaskDetail["/tasks/:id"]
  Projects["/projects"]
  ProjectDetail["/projects/:id"]
  WholesaleDetail["/wholesales/:id"]
  Accounts["/settings/accounts"]
  ChatworkSettings["/settings/chatwork"]

  Root --> Companies
  Root --> Tasks
  Root --> Projects
  Root --> Accounts
  Root --> ChatworkSettings
  Companies --> CompanyDetail
  Tasks --> TaskDetail
  Projects --> ProjectDetail
  ProjectDetail --> WholesaleDetail
  Login --> Root
  Root --> NotFound
```

## 画靁E遷移E概要EEE
**誁E明E一般EE*: 代衁E皁E画靁E遷移ぁE流れをEEします、E 
**こEプロめEめEめEトでぁE**: ダEュボEドE襍ｷ炁EぁE詁E細画靁EめEEE定画靁EぁE移動しぁEす、E
```mermaid
flowchart LR
  Login[Login] --> Home[Dashboard]
  Home --> Companies
  Home --> Tasks
  Home --> Projects
  Companies --> CompanyDetail
  Projects --> ProjectDetail
  ProjectDetail --> WholesaleDetail
  Root --> Accounts
  Root --> ChatworkSettings
```

## めEンポEネントツリーE丁EEEE
**誁E明E一般EE*: UIぁE親E係EE責務E刁EEEEします、E 
**こEプロめEめEめEトでぁE**: `App` E`AuthProvider` E`ProtectedRoute` E`Layout` E吁EEーめEぁE構EぁEす、E
```mermaid
flowchart TB
  App --> AuthProvider
  AuthProvider --> Routes
  Routes --> ProtectedRoute
  ProtectedRoute --> Layout
  Layout --> Pages[Pages]
  Pages --> Components[UI Components]
```

## 犁E態箁EEEE現犁EEE
**誁E明E一般EE*: 犁E態E置き堁EyEぁE伝EぁEしかたを礁Eします、E 
**こEプロめEめEめEトでぁE**: 認訁EぁEContext、デーめE取EE`useFetch`ぁEメモリめEャEュぁE管EEEぁEす、E
```mermaid
flowchart LR
  AuthContext["AuthContext user role"] --> ProtectedRoute2[ProtectedRoute]
  LocalState["local state useState"] --> Pages2[Pages]
  useFetch["useFetch/useMutation"] --> apiRequest[apiRequest]
  apiRequest --> BackendAPI["Backend API"]
  useFetch --> Cache["In-memory cache"]
```

## EEめE取Eフロー
**誁E明E一般EE*: 画靁EがAPIからEEめEを取得EEれをEEします、E 
**こEプロめEめEめEトでぁE**: `useFetch` E`apiRequest` E`fetch` EAPI ぁEEE呁EぁEEします、E
```mermaid
flowchart LR
  Component --> useFetch
  useFetch --> apiRequest
  apiRequest --> fetch[fetch API]
  fetch --> BackendAPI
  BackendAPI --> useFetch
  useFetch --> Component
```

## UI 犁E態E移
**誁E明E一般EE*: 誁EぁE込ぁE/成功/穁E/めEラーぁEぁEぁEUI犁E態を礁Eします、E 
**こEプロめEめEめEトでぁE**: `useFetch`ぁE犁E態E合E縺てローEEｳめEめEラー衁E示をEり替えます、E
```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> loading : fetch
  loading --> success : data
  loading --> empty : no data
  loading --> error : error
  error --> loading : retry
```

## フォーム / EEEめEョンE概要EEE
| 画靁E | 入E| EEEめEョン |
| --- | --- | --- |
| Login | email/password | めEーバE(Zod)ぁEEE、クラめEめEントE最EE|
| Company/Project/Task | 吁EEEEE | めEーバE(Zod)ぁEEE |

## めEめEめEめEビリEEE未盁E査・EEリめEトEE
- めEーボEド挅Eで丁EEE線が操E咡EE
- フォーめEめEリンめEが視EできEE
- 丁EEEめEンぁE `aria-label` がEEEEてぁEEE
- めEントラめEトEが確保EEてぁEEE

## i18n / EめEントEめEン
- i18n: 未EEE日本語固定EE
- EめEントEめEン: 未EEEEailwindユーEEｪEEE忁EEE

---

# 実EEEE訁E/ EEE

## めEラめE図E丁EEンポEネントEE
**誁E明E一般EE*: 丁EEラめE/めEンめEフェーめEぁE閁E係E遉Eします、E 
**こEプロめEめEめEトでぁE**: `LLMClient`がOpenAI/MockぁE刁E叁E胁E、ジョブが同朚E要EEE蜻EぁEEします、E
```mermaid
classDiagram
  class LLMClient {
    +summarize(messages)
  }
  class OpenAILLMClient
  class MockLLMClient
  LLMClient <|.. OpenAILLMClient
  LLMClient <|.. MockLLMClient

  class ChatworkClient {
    +listRooms()
    +listMessages(roomId, force)
  }

  class JobQueue {
    +enqueueJob(type, payload, userId)
    +cancelJob(jobId)
  }

  class ChatworkSync {
    +syncChatworkRooms()
    +syncChatworkMessages()
  }

  class SummaryGenerator {
    +generateSummaryDraft(companyId, periodStart, periodEnd)
  }

  SummaryGenerator --> LLMClient
  ChatworkSync --> ChatworkClient
  JobQueue --> ChatworkSync
  JobQueue --> SummaryGenerator
```

## めEンめEフェーめEEEEE抜EEE
| めEンめEフェーめE | 入E| EE|
| --- | --- | --- |
| `LLMClient.summarize` | `LLMInputMessage[]` | `LLMResult` |
| `ChatworkClient.listRooms` | - | `ChatworkRoom[]` |
| `ChatworkClient.listMessages` | `roomId`, `force` | `ChatworkMessage[]` |
| `enqueueSummaryDraftJob` | `companyId, periodStart, periodEnd` | `Job` |
| `cancelJob` | `jobId` | `Job` |

## 例EEE訁E
| 種刁E | 発生溁E| yEぁE|
| --- | --- | --- |
| `ChatworkApiError` | Chatwork API | ルームぁEめEラー記録、ジョブEE敁E|
| `JobCanceledError` | JobEEE| `canceled` ぁE終EE|
| API Error Payload | API | `buildErrorPayload` ぁE絁E一 |

## めEラーメEーめEEEE
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid period",
    "details": {}
  }
}
```

## ロめE訁E計EEPIEE
| フィールE| 冁EEE |
| --- | --- |
| `requestId` | `x-request-id` |
| `method` | HTTPメめEE |
| `url` | リめEめEめEERL |
| `statusCode` | めEEEめEめE |
| `userId` / `role` | JWT由来 |

## 訁E定頁EE環EEE数EE`NODE_ENV`, `PORT`, `BACKEND_PORT`, `JWT_SECRET`, `CORS_ORIGINS`,  
`DATABASE_URL`, `DATABASE_URL_TEST`,  
`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `TRUST_PROXY`,  
`CHATWORK_API_TOKEN`, `CHATWORK_API_BASE_URL`, `CHATWORK_AUTO_SYNC_ENABLED`,  
`CHATWORK_AUTO_SYNC_INTERVAL_MINUTES`, `CHATWORK_AUTO_SYNC_ROOM_LIMIT`,  
`CHATWORK_NEW_ROOMS_ACTIVE`, `CHATWORK_WEBHOOK_TOKEN`,  
`CHATWORK_WEBHOOK_COOLDOWN_SECONDS`,  
`OPENAI_API_KEY`, `OPENAI_MODEL`, `REDIS_URL`, `JOB_WORKER_ENABLED`

### Seed / Eト用E仁E意EE`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_ROLE`

## Feature FlagsEEEEEE
| 変E| 盁E皁E|
| --- | --- |
| `CHATWORK_AUTO_SYNC_ENABLED` | 臁E動同E/OFF |
| `JOB_WORKER_ENABLED` | Worker有効匁E|
| `CHATWORK_NEW_ROOMS_ACTIVE` | E規ルームぁE初EActive |

## 依EラめEブラリE丁EEEE
### Backend
- Fastify / Prisma / BullMQ / Redis / Zod / bcryptjs
- OpenAI 呁EぁEEしE標溁EfetchEE

### Frontend
- React / React Router
- Tailwind CSS + clsx / tailwind-merge
- @dnd-kitEE&D UIEE

## ADR
- ぁEぁE管EEEEてぁEせんEEE加すE蝣E合E `Docs/ADR/` 推奨EE

---

# EE/ 品EE

## Eト戦畁EE俁E瞁EEE
**誁E明E一般EE*: ぁEぁEレめEヤーぁE何をEトEかぁE全体像ぁEす、E 
**こEプロめEめEめEトでぁE**: Front/BackぁEユニットテめEトとPlaywright E2EEE用します、E
```mermaid
flowchart TB
  UnitFE[Frontend Unit (Vitest)]
  UnitBE[Backend Unit (Vitest)]
  E2E[Playwright E2E]
  UnitFE --> E2E
  UnitBE --> E2E
```

## EトピラミッE
**誁E明E一般EE*: ユニットE絁E合EE2EぁE比率をEEす老EEぁEす、E 
**こEプロめEめEめEトでぁE**: ユニット丁E忁E、EEローをE2EぁE補EEします、E
```mermaid
flowchart TB
  E2E2[E2E]
  Integration[Integration/API]
  Unit[Unit]
  Unit --> Integration --> E2E2
```

## EトE画E現犁EEE
| 種刁E | 盁E皁E| めEマンE|
| --- | --- | --- |
| Frontend Unit | めEンポEネンEフッめE | `cd frontend && npm run test` |
| Backend Unit | ルーEめEービゟE| `cd backend && npm run test` |
| E2E | UI一送E動佁E| `cd frontend && npm run test:e2e` |

## 璁EEEEトリめEめEE現犁EEE
| 璁EEE| OS | ブラめEめE |
| --- | --- | --- |
| ローめEル | Windows/macOS/Linux | Playwright (Chromium) |
| CI | Ubuntu | Playwright (EめEルE |

## モEE/ めEめEブ方釁E
- 外部APIEEhatwork/OpenAIEE忁EEE応じぁEモEE
- ユニットテめEトEDB依EE貂帙ｉ縺E

## 品EEめEートEEIEE
| E象 | 実EE|
| --- | --- |
| Backend | lint Ebuild Etest |
| Frontend | lint Etypecheck Etest Ebuild |

---

# CI/CD / リリーめE

## CI パゟE励めEン
**誁E明E一般EE*: ビルドEEEトE臁E動EEE流れをEEします、E 
**こEプロめEめEめEトでぁE**: Front/BackをEけて lint Ebuild Etest を回します、E
```mermaid
flowchart LR
  subgraph Backend
    B1[checkout] --> B2[setup node] --> B3[npm ci] --> B4[lint] --> B5[build] --> B6[test]
  end
  subgraph Frontend
    F1[checkout] --> F2[setup node] --> F3[npm ci] --> F4[lint] --> F5[typecheck] --> F6[test] --> F7[build]
  end
```

## CD / EEロめEフローE現犁EEE
**誁E明E一般EE*: リリーめEぁEぁEぁE流れをEEします、E 
**こEプロめEめEめEトでぁE**: Docker/StaticぁEビルドEERenderぁEたEComposeぁEEEロめEします、E
```mermaid
flowchart LR
  Push[Push/Tag] --> Build[Build Docker/Static]
  Build --> Deploy[Deploy (Render or Docker Compose)]
```

## 璁EEEE覧
| 璁EEE| 構E |
| --- | --- |
| Dev | ローめEル (Vite + Fastify + Docker DB/Redis) |
| Prod | Render or Docker Compose (docker-compose.prod.yml) |

## ロールEめEE方針EE
- Docker Compose: 前EめEメーめEぁE再赁EE
- Render: 盁E前EEEロめEぁE戻すEダEュボEド挅EEE

---

# 運E/ 盁EE/ めEンめEEE

## 盁E視E現犁EEE
| EE | 取E方E|
| --- | --- |
| ヘルめEEEE| `/healthz` |
| めEプリロめE | Fastify logger |
| めEョブロめE | Job status / error in DB |

## SLI / SLOE未定羁EEE
| EEE| 盁EE| 備老E|
| --- | --- | --- |
| API成功EE| TBD | 未定羁E |
| レめEEめE | TBD | 未定羁E |

## めEラートルールE未定羁EEE
- 盁E視基盁EぁE敁E備後E訁E宁E

## RunbookE最小EE
1. `/healthz` をEE誁E
2. めEプリロめEEEequestIdEE遒E誁E
3. DB/Redis ぁE疎通碁E誁E
4. 忁EEE応じぁE再赁EE

## めEンめEEトタめEムラめEンEテンプレEE
| 時刻 | 事豁E | E忁E| 影韁E |
| --- | --- | --- | --- |

## EめEめEEE / リめEトゟE
**誁E明E一般EE*: EめEめEEE取Eと復EE基本皁E流れをEEします、E 
**こEプロめEめEめEトでぁE**: `pg_dump`/`pg_restore`EまたEめEめEリプトEでPostgreSQLを扱ぁEす、E
```mermaid
flowchart LR
  DB[(PostgreSQL)] -->|pg_dump| Backup[backup.dump]
  Backup -->|pg_restore| DB
```

## 依EEめEービス一覧
| めEービゟE| 用送E| 備老E|
| --- | --- | --- |
| Chatwork API | メEーめE/ルーム取EE| 外E|
| OpenAI API | 要EEE| 外E|
| PostgreSQL | 丁EDB | Render / Docker |
| Redis | Job Queue | Render / Docker |

---

# めEめEュリEE

## 脁EEモEンめEEEFD + Trust BoundaryEE
**誁E明E一般EE*: EEめEぁE流れぁE俁EEEEを咡E化して脁EEを洗E蜃Eします、E 
**こEプロめEめEめEトでぁE**: ブラめEめEぁE未俁EE、バEめEンドが認訁E/認咡EE外部API送E搁EぁE丁E忁Eす、E
```mermaid
flowchart TB
  subgraph Client[Untrusted]
    Browser[Browser]
  end
  subgraph Server[Trusted]
    API[Backend API]
    DB[(PostgreSQL)]
    Redis[(Redis)]
  end
  External["External APIs Chatwork OpenAI"]

  Browser -->|HTTPS| API
  API --> DB
  API --> Redis
  API -->|HTTPS| External
  External --> API
```

## STRIDEE現犁EぁEEEE
| 脁EEE| E忁E|
| --- | --- |
| Spoofing | JWT + RBAC |
| Tampering | DB刁EE/ 盁E査ロめE |
| Information Disclosure | Cookie `httpOnly`, `secure`(prod) |
| Denial of Service | rate-limit (login) |
| Elevation of Privilege | `requireAdmin` / `requireWriteAccess` |

## 権限EトリめEめEE概略EE
| 役割 | 誁EぁE取EE| 書き辁EぁE | 管EE|
| --- | --- | --- | --- |
| admin | ✁E| ✁E| ✁E|
| employee | ✁E| ✁E| - |

## 秘寁E堁EぁE取E謁EぁEロー
**誁E明E一般EE*: 秘寁E堁EがEこで刁E用されるかをEEします、E 
**こEプロめEめEめEトでぁE**: `.env`/璁EEEE数から取EE、Ehatwork/OpenAIぁE認訁EヘッダぁE佁EぁEす、E
```mermaid
flowchart LR
  Env[".env / Render Env"] --> Backend["Backend Process"]
  Backend -->|Authorization: Bearer| OpenAI["OpenAI API"]
  Backend -->|x-chatworktoken| Chatwork["Chatwork API"]
```

## 暗号匁E
- パスワーE bcrypt ハッめEュ
- 通EE: HTTPSEデプロめE璁EEE依EE
- Cookie: `httpOnly`, `secure`(production)

## 盁E査ロめE訁E訁E
| EE | 冁EEE |
| --- | --- |
| entityType / entityId | E象 |
| action | create/update/delete |
| changes | before/after |
| userId | 操EEE|

## SBOME依E覧EE
- `frontend/package.json`
- `backend/package.json`

## めEめEュリEEEトE画E現犁EEE
| 種刁E | 実施 |
| --- | --- |
| SAST | 未EE |
| DAST | 未EE |
| yEレビュー | 適宁E|





