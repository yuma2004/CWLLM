# アーキテクチャ / 構造

## システムコンテキスト（C4 Context）
**説明（一般）**: 利用者・外部システム・自システムの関係と境界をざっくり掴む図です。  
**このプロジェクトでは**: ブラウザ利用者がフロント経由でAPIを使い、Chatwork/OpenAIと連携します。
```mermaid
flowchart TB
  subgraph Users[利用者]
    Admin[管理者]
    Staff["一般ユーザー sales/ops/readonly"]
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
**説明（一般）**: 主要な実行単位（UI/API/ワーカー/DB/キャッシュ）をまとめて示します。  
**このプロジェクトでは**: APIとBullMQワーカーがPostgreSQLとRedisを共有し、外部APIへアクセスします。
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

## バックエンド・コンポーネント図（UML Component 相当）
**説明（一般）**: バックエンド内部の構成要素と依存関係を示します。  
**このプロジェクトでは**: Routes→Handlers→Services→Prismaの流れで、同期/要約などの機能が実装されています。
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

## 論理アーキテクチャ（層・責務）
**説明（一般）**: 層ごとの責務と依存方向を整理する図です。  
**このプロジェクトでは**: UI→API→Service→Infraの一方向で、DB/Redis/外部APIはInfra側に集約しています。
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

## 物理アーキテクチャ（Dev / Prod）
**説明（一般）**: 実行環境での配置（プロセス/コンテナ/サービス）を示します。  
**このプロジェクトでは**: 開発はVite+FastifyとDockerのDB/Redis、運用はRenderまたはDocker構成です。
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

## ネットワーク構成 / トラフィックフロー
**説明（一般）**: リクエストの入口から内部・外部連携までの通信経路を示します。  
**このプロジェクトでは**: ブラウザ→フロント→API→DB/Redis→外部APIの流れになります。
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

## 認証・認可境界（Trust Boundary）
**説明（一般）**: どこで認証・認可が行われるか、信頼境界を示す図です。  
**このプロジェクトでは**: JWT検証とRBACはバックエンド内で実施し、クライアントは未信頼前提です。
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

## ストレージ / キャッシュ配置
**説明（一般）**: データの保存先・キャッシュの配置を示します。  
**このプロジェクトでは**: フロントはuseFetchのメモリキャッシュ、バックはPostgreSQL/Redisを利用します。
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

## ジョブ基盤 / イベント駆動の全体
**説明（一般）**: 非同期処理の流れとキュー/ワーカーの関係を示します。  
**このプロジェクトでは**: Chatwork同期や要約生成はジョブ化され、BullMQワーカーが処理します。
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

## 依存関係グラフ（モジュール依存）
**説明（一般）**: モジュール間の依存方向を俯瞰する図です。  
**このプロジェクトでは**: Routes/Handlers/Servicesが中心で、Prisma/Redis/外部APIへ依存します。
```mermaid
flowchart TB
  Routes3[Routes] --> Handlers3[Handlers] --> Services3[Services] --> Utils[Utils]
  Services3 --> Prisma3["Prisma Client"] --> DB5[(PostgreSQL)]
  Services3 --> Redis4[(Redis)]
  Services3 --> External2["Chatwork OpenAI"]
  Middleware2[Middleware] --> Services3
```

## モジュール構成（リポジトリ）
**説明（一般）**: リポジトリの主要ディレクトリ構成を示します。  
**このプロジェクトでは**: frontend/backend/infra/Docsに分割して責務を明確化しています。
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

  Backend --> Routes4["routes/"]
  Backend --> Services4["services/"]
  Backend --> Middleware4["middleware/"]
  Backend --> Utils4["utils/"]
  Backend --> Prisma4["prisma/"]
```

## レイヤー図（Presentation / Domain / Infra）
**説明（一般）**: プレゼンテーション/ドメイン/インフラの抽象層を示します。  
**このプロジェクトでは**: Routes/Servicesがドメイン相当、Prisma/Redis/外部APIがインフラ相当です。
```mermaid
flowchart TB
  PresentationLayer[Presentation]
  DomainLayer[Domain / Use-Case]
  InfraLayer[Infrastructure]

  PresentationLayer --> DomainLayer --> InfraLayer
```

## Hexagonal（Ports & Adapters）
**説明（一般）**: コアと外部アダプタの境界を示す設計図です。  
**このプロジェクトでは**: InboundはHTTP/Scheduler、OutboundはDB/Redis/Chatwork/OpenAIです。
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

## DDD Context Map（境界づけ）
**説明（一般）**: 業務領域（コンテキスト）間の関係を示します。  
**このプロジェクトでは**: Companiesを中心にProjects/Wholesales/Tasksが連携します。
```mermaid
flowchart LR
  Accounts["Accounts Users"]
  CRM["CRM Companies Contacts"]
  Projects["Projects"]
  Wholesales["Wholesales"]
  Messaging["Messaging Chatwork Rooms Messages"]
  Tasks["Tasks"]
  Summaries["Summaries"]
  Reporting["Exports Dashboard"]

  CRM --> Projects
  CRM --> Wholesales
  Messaging --> CRM
  Messaging --> Summaries
  Projects --> Tasks
  Wholesales --> Tasks
  Summaries --> Tasks
  Reporting --> CRM
  Reporting --> Tasks
```

## 4+1 ビュー（対応表）
| View | 対応図 |
| --- | --- |
| Logical | 論理アーキテクチャ / レイヤー図 |
| Process | ジョブ基盤 / イベント駆動 / シーケンス |
| Development | モジュール構成 / 依存関係 |
| Physical | 物理アーキテクチャ / ネットワーク |
| Scenarios | シーケンス図（ログイン・同期・要約） |

## 責務分割（サマリ）
| 領域 | 主担当 | 役割 |
| --- | --- | --- |
| 画面/UI | Frontend | 画面表示、入力、API呼び出し |
| 認証/認可 | Backend | JWT発行、RBAC、アクセス制御 |
| 業務ロジック | Backend Services | 同期/要約/タスク化等 |
| 永続化 | PostgreSQL + Prisma | 主要データの永続化 |
| 非同期処理 | Redis + BullMQ | Chatwork同期・要約生成の実行 |
| 外部連携 | Chatwork/OpenAI | メッセージ取得・要約生成 |
