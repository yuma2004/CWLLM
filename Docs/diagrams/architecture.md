# 繧｢繝ｼ繧ｭ繝・け繝√Ε / 讒矩

## 繧ｷ繧ｹ繝・Β繧ｳ繝ｳ繝・く繧ｹ繝茨ｼ・4 Context・・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 蛻ｩ逕ｨ閠・・螟夜Κ繧ｷ繧ｹ繝・Β繝ｻ閾ｪ繧ｷ繧ｹ繝・Β縺ｮ髢｢菫ゅ→蠅・阜繧偵＊縺｣縺上ｊ謗ｴ繧蝗ｳ縺ｧ縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: 繝悶Λ繧ｦ繧ｶ蛻ｩ逕ｨ閠・′繝輔Ο繝ｳ繝育ｵ檎罰縺ｧAPI繧剃ｽｿ縺・，hatwork/OpenAI縺ｨ騾｣謳ｺ縺励∪縺吶・```mermaid
flowchart TB
  subgraph Users[蛻ｩ逕ｨ閠・
    Admin[邂｡逅・・
    Staff["荳闊ｬ繝ｦ繝ｼ繧ｶ繝ｼ sales/ops/readonly"]
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
**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 荳ｻ隕√↑螳溯｡悟腰菴搾ｼ・I/API/繝ｯ繝ｼ繧ｫ繝ｼ/DB/繧ｭ繝｣繝・す繝･・峨ｒ縺ｾ縺ｨ繧√※遉ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: API縺ｨBullMQ繝ｯ繝ｼ繧ｫ繝ｼ縺訓ostgreSQL縺ｨRedis繧貞・譛峨＠縲∝､夜ΚAPI縺ｸ繧｢繧ｯ繧ｻ繧ｹ縺励∪縺吶・```mermaid
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

## 繝舌ャ繧ｯ繧ｨ繝ｳ繝峨・繧ｳ繝ｳ繝昴・繝阪Φ繝亥峙・・ML Component 逶ｸ蠖難ｼ・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 繝舌ャ繧ｯ繧ｨ繝ｳ繝牙・驛ｨ縺ｮ讒区・隕∫ｴ縺ｨ萓晏ｭ倬未菫ゅｒ遉ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: Routes竊辿andlers竊担ervices竊単risma縺ｮ豬√ｌ縺ｧ縲∝酔譛・隕∫ｴ・↑縺ｩ縺ｮ讖溯・縺悟ｮ溯｣・＆繧後※縺・∪縺吶・```mermaid
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

## 隲也炊繧｢繝ｼ繧ｭ繝・け繝√Ε・亥ｱ､繝ｻ雋ｬ蜍呻ｼ・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 螻､縺斐→縺ｮ雋ｬ蜍吶→萓晏ｭ俶婿蜷代ｒ謨ｴ逅・☆繧句峙縺ｧ縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: UI竊但PI竊担ervice竊棚nfra縺ｮ荳譁ｹ蜷代〒縲．B/Redis/螟夜ΚAPI縺ｯInfra蛛ｴ縺ｫ髮・ｴ・＠縺ｦ縺・∪縺吶・```mermaid
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

## 迚ｩ逅・い繝ｼ繧ｭ繝・け繝√Ε・・ev / Prod・・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 螳溯｡檎腸蠅・〒縺ｮ驟咲ｽｮ・医・繝ｭ繧ｻ繧ｹ/繧ｳ繝ｳ繝・リ/繧ｵ繝ｼ繝薙せ・峨ｒ遉ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: 髢狗匱縺ｯVite+Fastify縺ｨDocker縺ｮDB/Redis縲・°逕ｨ縺ｯRender縺ｾ縺溘・Docker讒区・縺ｧ縺吶・```mermaid
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

## 繝阪ャ繝医Ρ繝ｼ繧ｯ讒区・ / 繝医Λ繝輔ぅ繝・け繝輔Ο繝ｼ
**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 繝ｪ繧ｯ繧ｨ繧ｹ繝医・蜈･蜿｣縺九ｉ蜀・Κ繝ｻ螟夜Κ騾｣謳ｺ縺ｾ縺ｧ縺ｮ騾壻ｿ｡邨瑚ｷｯ繧堤､ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: 繝悶Λ繧ｦ繧ｶ竊偵ヵ繝ｭ繝ｳ繝遺・API竊奪B/Redis竊貞､夜ΚAPI縺ｮ豬√ｌ縺ｫ縺ｪ繧翫∪縺吶・```mermaid
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

## 隱崎ｨｼ繝ｻ隱榊庄蠅・阜・・rust Boundary・・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 縺ｩ縺薙〒隱崎ｨｼ繝ｻ隱榊庄縺瑚｡後ｏ繧後ｋ縺九∽ｿ｡鬆ｼ蠅・阜繧堤､ｺ縺吝峙縺ｧ縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: JWT讀懆ｨｼ縺ｨRBAC縺ｯ繝舌ャ繧ｯ繧ｨ繝ｳ繝牙・縺ｧ螳滓命縺励√け繝ｩ繧､繧｢繝ｳ繝医・譛ｪ菫｡鬆ｼ蜑肴署縺ｧ縺吶・```mermaid
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

## 繧ｹ繝医Ξ繝ｼ繧ｸ / 繧ｭ繝｣繝・す繝･驟咲ｽｮ
**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 繝・・繧ｿ縺ｮ菫晏ｭ伜・繝ｻ繧ｭ繝｣繝・す繝･縺ｮ驟咲ｽｮ繧堤､ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: 繝輔Ο繝ｳ繝医・useFetch縺ｮ繝｡繝｢繝ｪ繧ｭ繝｣繝・す繝･縲√ヰ繝・け縺ｯPostgreSQL/Redis繧貞茜逕ｨ縺励∪縺吶・```mermaid
flowchart LR
  FECache["Frontend In-Memory Cache useFetch cacheKey"]
  API3[Backend API]
  DB3[(PostgreSQL)]
  Redis3[(Redis BullMQ)]

  FECache --> API3
  API3 --> DB3
  API3 --> Redis3
```

## 繧ｸ繝ｧ繝門渕逶､ / 繧､繝吶Φ繝磯ｧ・虚縺ｮ蜈ｨ菴・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 髱槫酔譛溷・逅・・豬√ｌ縺ｨ繧ｭ繝･繝ｼ/繝ｯ繝ｼ繧ｫ繝ｼ縺ｮ髢｢菫ゅｒ遉ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: Chatwork蜷梧悄繧・ｦ∫ｴ・函謌舌・繧ｸ繝ｧ繝門喧縺輔ｌ縲。ullMQ繝ｯ繝ｼ繧ｫ繝ｼ縺悟・逅・＠縺ｾ縺吶・```mermaid
flowchart TB
  UI[Frontend] -->|POST chatwork sync| API4[Backend API]
  API4 -->|create Job| DB4[(PostgreSQL)]
  API4 -->|enqueue job| Queue[(BullMQ Queue)]
  Queue --> Worker[Worker]
  Worker -->|process| Chatwork2[Chatwork API]
  Worker -->|process| OpenAI2[OpenAI API]
  Worker -->|update status result| DB4
```

## 萓晏ｭ倬未菫ゅげ繝ｩ繝包ｼ医Δ繧ｸ繝･繝ｼ繝ｫ萓晏ｭ假ｼ・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 繝｢繧ｸ繝･繝ｼ繝ｫ髢薙・萓晏ｭ俶婿蜷代ｒ菫ｯ迸ｰ縺吶ｋ蝗ｳ縺ｧ縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: Routes/Handlers/Services縺御ｸｭ蠢・〒縲￣risma/Redis/螟夜ΚAPI縺ｸ萓晏ｭ倥＠縺ｾ縺吶・```mermaid
flowchart TB
  Routes3[Routes] --> Handlers3[Handlers] --> Services3[Services] --> Utils[Utils]
  Services3 --> Prisma3["Prisma Client"] --> DB5[(PostgreSQL)]
  Services3 --> Redis4[(Redis)]
  Services3 --> External2["Chatwork OpenAI"]
  Middleware2[Middleware] --> Services3
```

## 繝｢繧ｸ繝･繝ｼ繝ｫ讒区・・医Μ繝昴ず繝医Μ・・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 繝ｪ繝昴ず繝医Μ縺ｮ荳ｻ隕√ョ繧｣繝ｬ繧ｯ繝医Μ讒区・繧堤､ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: frontend/backend/infra/Docs縺ｫ蛻・牡縺励※雋ｬ蜍吶ｒ譏守｢ｺ蛹悶＠縺ｦ縺・∪縺吶・```mermaid
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

## 繝ｬ繧､繝､繝ｼ蝗ｳ・・resentation / Domain / Infra・・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 繝励Ξ繧ｼ繝ｳ繝・・繧ｷ繝ｧ繝ｳ/繝峨Γ繧､繝ｳ/繧､繝ｳ繝輔Λ縺ｮ謚ｽ雎｡螻､繧堤､ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: Routes/Services縺後ラ繝｡繧､繝ｳ逶ｸ蠖薙￣risma/Redis/螟夜ΚAPI縺後う繝ｳ繝輔Λ逶ｸ蠖薙〒縺吶・```mermaid
flowchart TB
  PresentationLayer[Presentation]
  DomainLayer[Domain / Use-Case]
  InfraLayer[Infrastructure]

  PresentationLayer --> DomainLayer --> InfraLayer
```

## Hexagonal・・orts & Adapters・・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 繧ｳ繧｢縺ｨ螟夜Κ繧｢繝繝励ち縺ｮ蠅・阜繧堤､ｺ縺呵ｨｭ險亥峙縺ｧ縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: Inbound縺ｯHTTP/Scheduler縲＾utbound縺ｯDB/Redis/Chatwork/OpenAI縺ｧ縺吶・```mermaid
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

## DDD Context Map・亥｢・阜縺･縺托ｼ・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 讌ｭ蜍咎伜沺・医さ繝ｳ繝・く繧ｹ繝茨ｼ蛾俣縺ｮ髢｢菫ゅｒ遉ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: Companies繧剃ｸｭ蠢・↓Projects/Wholesales/Tasks縺碁｣謳ｺ縺励∪縺吶・```mermaid
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

## 4+1 繝薙Η繝ｼ・亥ｯｾ蠢懆｡ｨ・・| View | 蟇ｾ蠢懷峙 |
| --- | --- |
| Logical | 隲也炊繧｢繝ｼ繧ｭ繝・け繝√Ε / 繝ｬ繧､繝､繝ｼ蝗ｳ |
| Process | 繧ｸ繝ｧ繝門渕逶､ / 繧､繝吶Φ繝磯ｧ・虚 / 繧ｷ繝ｼ繧ｱ繝ｳ繧ｹ |
| Development | 繝｢繧ｸ繝･繝ｼ繝ｫ讒区・ / 萓晏ｭ倬未菫・|
| Physical | 迚ｩ逅・い繝ｼ繧ｭ繝・け繝√Ε / 繝阪ャ繝医Ρ繝ｼ繧ｯ |
| Scenarios | 繧ｷ繝ｼ繧ｱ繝ｳ繧ｹ蝗ｳ・医Ο繧ｰ繧､繝ｳ繝ｻ蜷梧悄繝ｻ隕∫ｴ・ｼ・|

## 雋ｬ蜍吝・蜑ｲ・医し繝槭Μ・・| 鬆伜沺 | 荳ｻ諡・ｽ・| 蠖ｹ蜑ｲ |
| --- | --- | --- |
| 逕ｻ髱｢/UI | Frontend | 逕ｻ髱｢陦ｨ遉ｺ縲∝・蜉帙、PI蜻ｼ縺ｳ蜃ｺ縺・|
| 隱崎ｨｼ/隱榊庄 | Backend | JWT逋ｺ陦後ヽBAC縲√い繧ｯ繧ｻ繧ｹ蛻ｶ蠕｡ |
| 讌ｭ蜍吶Ο繧ｸ繝・け | Backend Services | 蜷梧悄/隕∫ｴ・繧ｿ繧ｹ繧ｯ蛹也ｭ・|
| 豌ｸ邯壼喧 | PostgreSQL + Prisma | 荳ｻ隕√ョ繝ｼ繧ｿ縺ｮ豌ｸ邯壼喧 |
| 髱槫酔譛溷・逅・| Redis + BullMQ | Chatwork蜷梧悄繝ｻ隕∫ｴ・函謌舌・螳溯｡・|
| 螟夜Κ騾｣謳ｺ | Chatwork/OpenAI | 繝｡繝・そ繝ｼ繧ｸ蜿門ｾ励・隕∫ｴ・函謌・|
