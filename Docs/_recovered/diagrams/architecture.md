# めEーめEEEE/ 構送E

## めEめEEめEンEめEトEE4 ContextEE**誁E明E一般EE*: 刁E用老EE外部めEめEE・臁EめEめEEぁE閁E係EEEEをE縺Eくり掴む図ぁEす、E 
**こEプロめEめEめEトでぁE**: ブラめEめE刁E用老EフロントE由ぁEAPIEEぁEEhatwork/OpenAIぁE送E搁Eします、E```mermaid
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
**こEプロめEめEめEトでぁE**: APIぁEBullMQワーめEーがPostgreSQLぁERedisをE有E、外部APIぁEめEめEめEめEします、E```mermaid
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

## EめEめEンドEめEンポEネント図EEML Component 盁E当EE**誁E明E一般EE*: EめEめEンドE部ぁE構E要EEぁE依E関係E遉Eします、E 
**こEプロめEめEめEトでぁE**: Routes→Handlers→Services→PrismaぁE流れぁE、EE要EEぁEぁE機Eが実EEEEてぁEす、E```mermaid
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

## 論理めEーめEEEEEE・責務EE**誁E明E一般EE*: 屁EごEぁE責務と依存方向E謨EEEE図ぁEす、E 
**こEプロめEめEめEトでぁE**: UIEI→Service→InfraぁE一E向で、EB/Redis/外部APIぁEInfra側ぁE雁EEEEぁEぁEす、E```mermaid
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

## 物EEEｼめEEEEEev / ProdEE**誁E明E一般EE*: 実EEEEぁE配EEEEロめEめE/めEンE/めEービスEE遉Eします、E 
**こEプロめEめEめEトでぁE**: 開発ぁEVite+FastifyぁEDockerぁEDB/Redis、E用ぁERenderぁEたEDocker構EぁEす、E```mermaid
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
**こEプロめEめEめEトでぁE**: ブラめEめEEロントEAPI→DB/Redis→外部APIぁE流れぁEぁEります、E```mermaid
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

## 認訁E・認咡EEEEErust BoundaryEE**誁E明E一般EE*: ぁEこで認訁E・認咡E行われるか、EEEEEをEEす図ぁEす、E 
**こEプロめEめEめEトでぁE**: JWTEEぁERBACぁEEめEめEンドEぁE実施し、クラめEめEントE未俁EE前提ぁEす、E```mermaid
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
**こEプロめEめEめEトでぁE**: フロントEuseFetchぁEメモリめEャEュ、バEぁEPostgreSQL/Redisを利用します、E```mermaid
flowchart LR
  FECache["Frontend In-Memory Cache useFetch cacheKey"]
  API3[Backend API]
  DB3[(PostgreSQL)]
  Redis3[(Redis BullMQ)]

  FECache --> API3
  API3 --> DB3
  API3 --> Redis3
```

## めEョブ基盁E / めEベントEEぁE全佁E**誁E明E一般EE*: 非同期EEEE流れぁEめEュー/ワーめEーぁE閁E係E遉Eします、E 
**こEプロめEめEめEトでぁE**: Chatwork同朚EEEEEEEめEョブ化され、BullMQワーめEーがEEEEぁEす、E```mermaid
flowchart TB
  UI[Frontend] -->|POST chatwork sync| API4[Backend API]
  API4 -->|create Job| DB4[(PostgreSQL)]
  API4 -->|enqueue job| Queue[(BullMQ Queue)]
  Queue --> Worker[Worker]
  Worker -->|process| Chatwork2[Chatwork API]
  Worker -->|process| OpenAI2[OpenAI API]
  Worker -->|update status result| DB4
```

## 依E関係EラフEモめEュール依EEE**誁E明E一般EE*: モめEュール間E依E方向E菫E瞁EすE蝗EぁEす、E 
**こEプロめEめEめEトでぁE**: Routes/Handlers/ServicesがEE忁E、Erisma/Redis/外部APIぁE依EEぁEす、E```mermaid
flowchart TB
  Routes3[Routes] --> Handlers3[Handlers] --> Services3[Services] --> Utils[Utils]
  Services3 --> Prisma3["Prisma Client"] --> DB5[(PostgreSQL)]
  Services3 --> Redis4[(Redis)]
  Services3 --> External2["Chatwork OpenAI"]
  Middleware2[Middleware] --> Services3
```

## モめEュール構EEリポジトリEE**誁E明E一般EE*: リポジトリぁE丁EEめEレめEトリ構EをEEします、E 
**こEプロめEめEめEトでぁE**: frontend/backend/infra/DocsぁE刁Eして責務E譏守｢E化EぁEぁEす、E```mermaid
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

## レめEヤー図EEresentation / Domain / InfraEE**誁E明E一般EE*: プレめEンEEめEョン/ドメめEン/めEンフラぁE抽象屁EをEEします、E 
**こEプロめEめEめEトでぁE**: Routes/ServicesがドメめEン盁E当、Erisma/Redis/外部APIがインフラ盁E当です、E```mermaid
flowchart TB
  PresentationLayer[Presentation]
  DomainLayer[Domain / Use-Case]
  InfraLayer[Infrastructure]

  PresentationLayer --> DomainLayer --> InfraLayer
```

## HexagonalEEorts & AdaptersEE**誁E明E一般EE*: めEめEぁE外部めEダプタぁEEEをEEすEE計図ぁEす、E 
**こEプロめEめEめEトでぁE**: InboundぁEHTTP/Scheduler、EutboundぁEDB/Redis/Chatwork/OpenAIぁEす、E```mermaid
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

## DDD Context MapEEEぁEけ！E**誁E明E一般EE*: 業務E域EコンEめEトE間ぁE閁E係E遉Eします、E 
**こEプロめEめEめEトでぁE**: CompaniesEE忁EProjects/Wholesales/TasksがEE搁Eします、E```mermaid
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

## 4+1 ビューEEEEEEE| View | E応E|
| --- | --- |
| Logical | 論理めEーめEEEE/ レめEヤー図 |
| Process | めEョブ基盁E / めEベントEEE/ めEーめEンめE |
| Development | モめEュール構E / 依E関俁E|
| Physical | 物EEEｼめEEEE/ ネットワーめE |
| Scenarios | めEーめEンめE図EロめEめEン・同朚Eｻ要EEEE|

## 責務E割EサマリEE| E沺 | 丁E拁EEE| 役割 |
| --- | --- | --- |
| 画靁E/UI | Frontend | 画靁E衁E示、E力、API呁EぁEEぁE|
| 認訁E/認咡E| Backend | JWT発行、RBAC、アめEめEめE刁E御 |
| 業務ロめEEE| Backend Services | 同朚E要EEめEめEめE化筁E|
| 永続化 | PostgreSQL + Prisma | 丁EEーめEぁE永続化 |
| 非同期EEE| Redis + BullMQ | Chatwork同朚Eｻ要EEEE実EE|
| 外部送E搁E | Chatwork/OpenAI | メEーめE取EE要EEE|
