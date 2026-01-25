# 繝�E・繧�E�縺�E�繧上ａE

## ER 蝗ｳ・郁E��也炊・・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 繝�E・繧�E�縺�E�繧�E�繝ｳ繝�EぁE���EぁE���E�髢�E�菫めE��菫�E�迸�E�縺吶�E�蝗�E�縺�E�縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: Companies繧剁E���E�蠢・↓Projects/Wholesales/Tasks/Chatwork騾�E�謳�E�縺檎ｹ九′繧翫∪縺吶・```mermaid
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

## 繝�E・繧�E�繝輔Ο繝ｼ・・FD 繝ｬ繝吶΁E・・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 繝�E・繧�E�縺後�E縺薙°繧峨←縺薙�E豬√ｌ繧九°繧堤�E��E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: 繝輔Ο繝ｳ繝遺・API竊奪B/Redis竊貞､夜ΚAPI・・hatwork/OpenAI・峨・豬√ｌ縺�E�縺吶・```mermaid
flowchart LR
  User[User] --> FE[Frontend]
  FE --> API[Backend API]
  API --> DB[(PostgreSQL)]
  API --> Redis["Redis/BullMQ"]
  API --> Chatwork[Chatwork API]
  API --> OpenAI[OpenAI API]
  Chatwork --> API
```

## 繧�E�繝吶Φ繝�E/ 繧�E�繝ｧ繝悶せ繧�E�繝ｼ繝橸�E�育樟迥�E�・・| JobType | payload | 隱�E�譏�E|
| --- | --- | --- |
| `chatwork_rooms_sync` | `{}` | 繝ｫ繝ｼ繝荳隕ｧ蜷梧悁E|
| `chatwork_messages_sync` | `{ roomId?: string, roomLimit?: number }` | 繝｡繝�Eそ繝ｼ繧�E�蜷梧悁E|
| `summary_draft` | `{ companyId, periodStart, periodEnd }` | 隕∫�E�・ラ繝ｩ繝輔ヨ逕滓�E |

## 繝�E・繧�E�霎樊嶌�E井ｸ�E�隕�Eお繝ｳ繝�EぁE���EぁE�E・| 繧�E�繝ｳ繝�EぁE���EぁE| 荳�E�縺�E�鬁E�E岼 | 蛯呵・|
| --- | --- | --- |
| User | `email`, `role`, `password` | 隱崎ｨ�E�繝ｻ讓ｩ髯・|
| Company | `name`, `normalizedName`, `status`, `tags` | CRM荳�E�蠢・|
| Contact | `companyId`, `name`, `role`, `email` | 莨夂､�E�騾�E�邨�E�蜈�E|
| Project | `companyId`, `name`, `status`, `periodStart/End` | 譯井ｻ�E� |
| Wholesale | `projectId`, `companyId`, `status`, `margin` | 蜊ｸ |
| ChatworkRoom | `roomId`, `name`, `lastSyncAt`, `isActive` | 騾�E�謳�E�繝ｫ繝ｼ繝 |
| Message | `roomId`, `messageId`, `sender`, `body`, `sentAt` | 騾�E�謳�E�繝｡繝�Eそ繝ｼ繧�E� |
| Summary | `companyId`, `content`, `type` | 遒ｺ螳夊ｦ∫�E�・|
| SummaryDraft | `companyId`, `content`, `expiresAt` | 閾�E�蜍�E函謌�E|
| Task | `targetType`, `targetId`, `assigneeId`, `status` | 繧�E�繧�E�繧�E� |
| Job | `type`, `status`, `payload`, `result` | 髱槫酔譛溷・送E�E|

## 螳溯�E�・�E��E�蛻・�E�井ｸ�E�隕∬�E��E�蜉鬁E�E岼・・**隱�E�譏趣�E�井ｸ闊ｬ・・*: ER蝗ｳ/霎樊嶌縺�E�荳�E�隕�E�E�・岼縺�E�謚懃�E�九〒縺吶めE��溯�E�・↓縺�E�莉･荳九�E霑ｽ蜉鬁E�E岼縺後≠繧翫∪縺吶・ 
- Company: `category`, `profile`, `ownerId`
- Contact: `phone`, `memo`, `sortOrder`
- Project: `conditions`, `unitPrice`, `periodStart`, `periodEnd`, `ownerId`
- Wholesale: `conditions`, `unitPrice`, `margin`, `agreedDate`, `ownerId`
- ChatworkRoom: `description`, `lastMessageId`, `lastErrorAt`, `lastErrorMessage`, `lastErrorStatus`
- Message: `labels`, `sender`, `sentAt`
- Summary / SummaryDraft: `periodStart`, `periodEnd`, `sourceLinks`, `model`, `promptVersion`, `sourceMessageCount`, `tokenUsage`, `expiresAt`・・raft縺�E�縺�E�・・- Task: `title`, `description`, `dueDate`, `assigneeId`
- Job: `error`, `startedAt`, `finishedAt`

## CRUD 繝槭ヨ繝ｪ繧�E�繧�E�・井ｸ�E�隕�E�E�・| 繝ｪ繧�E�繝ｼ繧�E� | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| Users | 笨・| 笨・| 笨・role) | - |
| Companies | 笨・| 笨・| 笨・| 笨・|
| Contacts | 笨・| 笨・| 笨・| 笨・|
| Projects | 笨・| 笨・| 笨・| 笨・|
| Wholesales | 笨・| 笨・| 笨・| 笨・|
| Messages | - | 笨・| 笨・assign/labels) | - |
| Summaries | 笨・| 笨・| - | - |
| SummaryDraft | 笨・job) | 笨・| - | - |
| Tasks | 笨・| 笨・| 笨・| 笨・|
| Jobs | 笨・enqueue) | 笨・| 笨・cancel) | - |
| Settings | - | 笨・| 笨・| - |

## 繧�E�繝ｳ繝�Eャ繧�E�繧�E� / 蛻�E�邏�E�E�域栢邊�E�E�・| 繝�E・繝悶΁E| 繧�E�繝ｳ繝�Eャ繧�E�繧�E� / 繝ｦ繝九�E繧�E� |
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

## 繧�E�繝｣繝�Eす繝･繧�E�繝ｼ險�E�險茨�E�医ヵ繝ｭ繝ｳ繝茨�E�・| 繧�E�繝ｼ | TTL | 隱�E�譏�E|
| --- | --- | --- |
| `cacheKey`・域悴謖�E�E�壽凾縺�E�URL・・| `cacheTimeMs` | `useFetch` 縺後Γ繝｢繝ｪ縺�E�菫晁E�� |

## 謨�E�蜷域�E�繝｢繝�E΁E
- 荳�E�繝�E・繧�E�・・ostgreSQL・会ｼ壼�E��E�謨�E�蜷・- 髱槫酔譛溷・送E�E�E�・ob/Queue・会ｼ夂ｵ先棡謨�E�蜷茨�E�医ず繝ｧ繝門�E�御�E�・�E�蠕�E▽・・- 隕∫�E�・ラ繝ｩ繝輔ヨ・壽悁E��蝉ｻ倥″繧�E�繝｣繝�Eす繝･・・summary_drafts.expiresAt`・・
## 繝槭ぁE���E�繝ｬ繝ｼ繧�E�繝ｧ繝ｳ驕狗畑�E育樟迥�E�・・| 迺�E�蠁E�E| 繧�E�繝槭Φ繝�E| 蛯呵・|
| --- | --- | --- |
| 髢狗匱 | `npm run migrate:dev` | Prisma migrate dev |
| 譛ｬ逡�E� | `npm run migrate:deploy` | Prisma migrate deploy |

