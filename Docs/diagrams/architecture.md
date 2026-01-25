# 繧�E�繝ｼ繧�E�繝�Eけ繝�E΁E/ 讒矩�E�

## 繧�E�繧�E�繝�EΒ繧�E�繝ｳ繝�Eく繧�E�繝茨�E�・4 Context・・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 蛻�E�逕ｨ閠・・螟夜Κ繧�E�繧�E�繝�EΒ繝ｻ閾�E�繧�E�繧�E�繝�EΒ縺�E�髢�E�菫めE�E蠁E�E阜繧偵�E�縺�E�縺上ｊ謗ｴ繧蝗ｳ縺�E�縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: 繝悶Λ繧�E�繧�E�蛻�E�逕ｨ閠・′繝輔Ο繝ｳ繝育�E�檎罰縺�E�API繧剁E���E�縺・�E�hatwork/OpenAI縺�E�騾�E�謳�E�縺励∪縺吶・```mermaid
flowchart TB
  subgraph Users[蛻�E�逕ｨ閠・
    Admin[邂｡送E�E・
    Staff["荳闊ｬ繝ｦ繝ｼ繧�E�繝ｼ employee"]
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
**隱�E�譏趣�E�井ｸ闊ｬ・・*: 荳�E�隕�E↑螳溯�E�悟�E菴搾�E�・I/API/繝ｯ繝ｼ繧�E�繝ｼ/DB/繧�E�繝｣繝�Eす繝･・峨�E�縺�E�縺�E�繧√※遉ｺ縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: API縺�E�BullMQ繝ｯ繝ｼ繧�E�繝ｼ縺訓ostgreSQL縺�E�Redis繧貞�E譛峨�E�縲∝､夜ΚAPI縺�E�繧�E�繧�E�繧�E�繧�E�縺励∪縺吶・```mermaid
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

## 繝�Eャ繧�E�繧�E�繝ｳ繝峨・繧�E�繝ｳ繝昴・繝阪Φ繝亥峙�E・ML Component 逶�E�蠖難�E�・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 繝�Eャ繧�E�繧�E�繝ｳ繝牙・驛ｨ縺�E�讒区・隕∫�E��E�縺�E�萓晏�E�倬未菫めE��遉�E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: Routes竊辿andlers竊担ervices竊単risma縺�E�豬√ｌ縺�E�縲∝�E譛�E隕∫�E�・↑縺�E�縺�E�讖溯・縺悟ｮ溯�E�・�E�E��後※縺・∪縺吶・```mermaid
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

## 隲也炊繧�E�繝ｼ繧�E�繝�Eけ繝�EΕ�E亥�E��E�繝ｻ雋ｬ蜍呻�E�・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 螻�E�縺斐�E縺�E�雋ｬ蜍吶→萓晏ｭ俶婿蜷代�E�謨�E�送E�E☁E��句峙縺�E�縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: UI竊佁EI竊担ervice竊棚nfra縺�E�荳譁E��蜷代〒縲�E�B/Redis/螟夜ΚAPI縺�E�Infra蛛ｴ縺�E�髮・�E�・�E�縺�E�縺・∪縺吶・```mermaid
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

## 迚ｩ送E�EぁE��ｼ繧�E�繝�Eけ繝�EΕ�E・ev / Prod・・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 螳溯�E�檎�E蠁E�E〒縺�E�驟咲�E��E�・医・繝ｭ繧�E�繧�E�/繧�E�繝ｳ繝�Eリ/繧�E�繝ｼ繝薙せ�E峨�E�遉�E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: 髢狗匱縺�E�Vite+Fastify縺�E�Docker縺�E�DB/Redis縲・°逕ｨ縺�E�Render縺�E�縺溘�EDocker讒区・縺�E�縺吶・```mermaid
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

## 繝阪ャ繝医Ρ繝ｼ繧�E�讒区・ / 繝医Λ繝輔ぅ繝�Eけ繝輔Ο繝ｼ
**隱�E�譏趣�E�井ｸ闊ｬ・・*: 繝ｪ繧�E�繧�E�繧�E�繝医・蜈･蜿�E�縺九ｉ蜀・Κ繝ｻ螟夜Κ騾�E�謳�E�縺�E�縺�E�縺�E�騾壻�E��E�邨瑚ｷ�E�繧堤�E��E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: 繝悶Λ繧�E�繧�E�竊�Eヵ繝ｭ繝ｳ繝遺・API竊奪B/Redis竊貞､夜ΚAPI縺�E�豬√ｌ縺�E�縺�E�繧翫∪縺吶・```mermaid
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

## 隱崎ｨ�E�繝ｻ隱榊庁E��E�E阜�E・rust Boundary・・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 縺�E�縺薙〒隱崎ｨ�E�繝ｻ隱榊庁E��瑚｡後ｏ繧後ｋ縺九∽�E��E�鬁E��蠁E�E阜繧堤�E��E�縺吝峙縺�E�縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: JWT讀懁E���E�縺�E�RBAC縺�E�繝�Eャ繧�E�繧�E�繝ｳ繝牙・縺�E�螳滓命縺励√け繝ｩ繧�E�繧�E�繝ｳ繝医・譛ｪ菫�E�鬁E��蜑肴署縺�E�縺吶・```mermaid
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

## 繧�E�繝医Ξ繝ｼ繧�E� / 繧�E�繝｣繝�Eす繝･驟咲�E��E�
**隱�E�譏趣�E�井ｸ闊ｬ・・*: 繝�E・繧�E�縺�E�菫晏ｭ伜�E繝ｻ繧�E�繝｣繝�Eす繝･縺�E�驟咲�E��E�繧堤�E��E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: 繝輔Ο繝ｳ繝医・useFetch縺�E�繝｡繝｢繝ｪ繧�E�繝｣繝�Eす繝･縲√ヰ繝�Eけ縺�E�PostgreSQL/Redis繧貞茜逕ｨ縺励∪縺吶・```mermaid
flowchart LR
  FECache["Frontend In-Memory Cache useFetch cacheKey"]
  API3[Backend API]
  DB3[(PostgreSQL)]
  Redis3[(Redis BullMQ)]

  FECache --> API3
  API3 --> DB3
  API3 --> Redis3
```

## 繧�E�繝ｧ繝門渕逶�E� / 繧�E�繝吶Φ繝磯�E�・虚縺�E�蜈ｨ菴・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 髱槫酔譛溷・送E�E・豬√ｌ縺�E�繧�E�繝･繝ｼ/繝ｯ繝ｼ繧�E�繝ｼ縺�E�髢�E�菫めE��遉�E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: Chatwork蜷梧悁E��・�E�∫�E�・函謌�E・繧�E�繝ｧ繝門喧縺輔ｌ縲。ullMQ繝ｯ繝ｼ繧�E�繝ｼ縺悟�E送E�E�E�縺�E�縺吶・```mermaid
flowchart TB
  UI[Frontend] -->|POST chatwork sync| API4[Backend API]
  API4 -->|create Job| DB4[(PostgreSQL)]
  API4 -->|enqueue job| Queue[(BullMQ Queue)]
  Queue --> Worker[Worker]
  Worker -->|process| Chatwork2[Chatwork API]
  Worker -->|process| OpenAI2[OpenAI API]
  Worker -->|update status result| DB4
```

## 萓晏�E�倬未菫めE��繝ｩ繝包�E�医Δ繧�E�繝･繝ｼ繝ｫ萓晏�E�偁E��・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 繝｢繧�E�繝･繝ｼ繝ｫ髢薙�E萓晏�E�俶婿蜷代�E�菫�E�迸�E�縺吶�E�蝗�E�縺�E�縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: Routes/Handlers/Services縺御�E��E�蠢・〒縲�E�risma/Redis/螟夜ΚAPI縺�E�萓晏�E�倥�E�縺�E�縺吶・```mermaid
flowchart TB
  Routes3[Routes] --> Handlers3[Handlers] --> Services3[Services] --> Utils[Utils]
  Services3 --> Prisma3["Prisma Client"] --> DB5[(PostgreSQL)]
  Services3 --> Redis4[(Redis)]
  Services3 --> External2["Chatwork OpenAI"]
  Middleware2[Middleware] --> Services3
```

## 繝｢繧�E�繝･繝ｼ繝ｫ讒区・・医Μ繝昴ず繝医Μ�E・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 繝ｪ繝昴ず繝医Μ縺�E�荳�E�隕�Eョ繧�E�繝ｬ繧�E�繝医Μ讒区・繧堤�E��E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: frontend/backend/infra/Docs縺�E�蛻・牡縺励※雋ｬ蜍吶�E�譏守｢�E�蛹悶�E�縺�E�縺・∪縺吶・```mermaid
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

## 繝ｬ繧�E�繝､繝ｼ蝗ｳ・・resentation / Domain / Infra・・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 繝励Ξ繧�E�繝ｳ繝�E・繧�E�繝ｧ繝ｳ/繝峨Γ繧�E�繝ｳ/繧�E�繝ｳ繝輔Λ縺�E�謚ｽ雎｡螻�E�繧堤�E��E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: Routes/Services縺後ラ繝｡繧�E�繝ｳ逶�E�蠖薙�E�risma/Redis/螟夜ΚAPI縺後う繝ｳ繝輔Λ逶�E�蠖薙〒縺吶・```mermaid
flowchart TB
  PresentationLayer[Presentation]
  DomainLayer[Domain / Use-Case]
  InfraLayer[Infrastructure]

  PresentationLayer --> DomainLayer --> InfraLayer
```

## Hexagonal・・orts & Adapters・・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 繧�E�繧�E�縺�E�螟夜Κ繧�E�繝繝励ち縺�E�蠁E�E阜繧堤�E��E�縺呵�E��E�險亥峙縺�E�縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: Inbound縺�E�HTTP/Scheduler縲�E�utbound縺�E�DB/Redis/Chatwork/OpenAI縺�E�縺吶・```mermaid
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

## DDD Context Map・亥�E�・阜縺�E�縺托ｼ・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 讌ｭ蜍咎�E�伜沺・医さ繝ｳ繝�Eく繧�E�繝茨�E�蛾俣縺�E�髢�E�菫めE��遉�E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: Companies繧剁E���E�蠢・↓Projects/Wholesales/Tasks縺碁E��E�謳�E�縺励∪縺吶・```mermaid
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

## 4+1 繝薙Η繝ｼ・亥�E��E�蠢懁E���E�・・| View | 蟁E��蠢懷峁E|
| --- | --- |
| Logical | 隲也炊繧�E�繝ｼ繧�E�繝�Eけ繝�E΁E/ 繝ｬ繧�E�繝､繝ｼ蝗ｳ |
| Process | 繧�E�繝ｧ繝門渕逶�E� / 繧�E�繝吶Φ繝磯�E�・虁E/ 繧�E�繝ｼ繧�E�繝ｳ繧�E� |
| Development | 繝｢繧�E�繝･繝ｼ繝ｫ讒区・ / 萓晏�E�倬未菫・|
| Physical | 迚ｩ送E�EぁE��ｼ繧�E�繝�Eけ繝�E΁E/ 繝阪ャ繝医Ρ繝ｼ繧�E� |
| Scenarios | 繧�E�繝ｼ繧�E�繝ｳ繧�E�蝗ｳ・医Ο繧�E�繧�E�繝ｳ繝ｻ蜷梧悁E��ｻ隕∫�E�・�E�・|

## 雋ｬ蜍吝・蜑ｲ・医し繝槭Μ�E・| 鬁E��沺 | 荳�E�諡・�E�・| 蠖ｹ蜑ｲ |
| --- | --- | --- |
| 逕ｻ髱�E�/UI | Frontend | 逕ｻ髱�E�陦�E�遉ｺ縲∝�E蜉帙、PI蜻�E�縺�E�蜁E��縺・|
| 隱崎ｨ�E�/隱榊庁E| Backend | JWT逋ｺ陦後ヽBAC縲√い繧�E�繧�E�繧�E�蛻�E�蠕｡ |
| 讌ｭ蜍吶Ο繧�E�繝�EぁE| Backend Services | 蜷梧悁E隕∫�E�・繧�E�繧�E�繧�E�蛹也ｭ・|
| 豌ｸ邯壼喧 | PostgreSQL + Prisma | 荳�E�隕�Eョ繝ｼ繧�E�縺�E�豌ｸ邯壼喧 |
| 髱槫酔譛溷・送E�E| Redis + BullMQ | Chatwork蜷梧悁E��ｻ隕∫�E�・函謌�E・螳溯�E�・|
| 螟夜Κ騾�E�謳�E� | Chatwork/OpenAI | 繝｡繝�Eそ繝ｼ繧�E�蜿門�E�励・隕∫�E�・函謌�E|
