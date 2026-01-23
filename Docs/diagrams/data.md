# 繝・・繧ｿ縺ｾ繧上ｊ

## ER 蝗ｳ・郁ｫ也炊・・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 繝・・繧ｿ縺ｮ繧ｨ繝ｳ繝・ぅ繝・ぅ縺ｨ髢｢菫ゅｒ菫ｯ迸ｰ縺吶ｋ蝗ｳ縺ｧ縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: Companies繧剃ｸｭ蠢・↓Projects/Wholesales/Tasks/Chatwork騾｣謳ｺ縺檎ｹ九′繧翫∪縺吶・```mermaid
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

## 繝・・繧ｿ繝輔Ο繝ｼ・・FD 繝ｬ繝吶Ν0・・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 繝・・繧ｿ縺後←縺薙°繧峨←縺薙∈豬√ｌ繧九°繧堤､ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: 繝輔Ο繝ｳ繝遺・API竊奪B/Redis竊貞､夜ΚAPI・・hatwork/OpenAI・峨・豬√ｌ縺ｧ縺吶・```mermaid
flowchart LR
  User[User] --> FE[Frontend]
  FE --> API[Backend API]
  API --> DB[(PostgreSQL)]
  API --> Redis["Redis/BullMQ"]
  API --> Chatwork[Chatwork API]
  API --> OpenAI[OpenAI API]
  Chatwork --> API
```

## 繧､繝吶Φ繝・/ 繧ｸ繝ｧ繝悶せ繧ｭ繝ｼ繝橸ｼ育樟迥ｶ・・| JobType | payload | 隱ｬ譏・|
| --- | --- | --- |
| `chatwork_rooms_sync` | `{}` | 繝ｫ繝ｼ繝荳隕ｧ蜷梧悄 |
| `chatwork_messages_sync` | `{ roomId?: string, roomLimit?: number }` | 繝｡繝・そ繝ｼ繧ｸ蜷梧悄 |
| `summary_draft` | `{ companyId, periodStart, periodEnd }` | 隕∫ｴ・ラ繝ｩ繝輔ヨ逕滓・ |

## 繝・・繧ｿ霎樊嶌・井ｸｻ隕√お繝ｳ繝・ぅ繝・ぅ・・| 繧ｨ繝ｳ繝・ぅ繝・ぅ | 荳ｻ縺ｪ鬆・岼 | 蛯呵・|
| --- | --- | --- |
| User | `email`, `role`, `password` | 隱崎ｨｼ繝ｻ讓ｩ髯・|
| Company | `name`, `normalizedName`, `status`, `tags` | CRM荳ｭ蠢・|
| Contact | `companyId`, `name`, `role`, `email` | 莨夂､ｾ騾｣邨｡蜈・|
| Project | `companyId`, `name`, `status`, `periodStart/End` | 譯井ｻｶ |
| Wholesale | `projectId`, `companyId`, `status`, `margin` | 蜊ｸ |
| ChatworkRoom | `roomId`, `name`, `lastSyncAt`, `isActive` | 騾｣謳ｺ繝ｫ繝ｼ繝 |
| Message | `roomId`, `messageId`, `sender`, `body`, `sentAt` | 騾｣謳ｺ繝｡繝・そ繝ｼ繧ｸ |
| Summary | `companyId`, `content`, `type` | 遒ｺ螳夊ｦ∫ｴ・|
| SummaryDraft | `companyId`, `content`, `expiresAt` | 閾ｪ蜍慕函謌・|
| Task | `targetType`, `targetId`, `assigneeId`, `status` | 繧ｿ繧ｹ繧ｯ |
| Job | `type`, `status`, `payload`, `result` | 髱槫酔譛溷・逅・|
| AppSetting | `key`, `value` | 險ｭ螳・|

## 螳溯｣・ｷｮ蛻・ｼ井ｸｻ隕∬ｿｽ蜉鬆・岼・・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: ER蝗ｳ/霎樊嶌縺ｯ荳ｻ隕・・岼縺ｮ謚懃ｲ九〒縺吶ょｮ溯｣・↓縺ｯ莉･荳九・霑ｽ蜉鬆・岼縺後≠繧翫∪縺吶・ 
- Company: `category`, `profile`, `ownerId`
- Contact: `phone`, `memo`, `sortOrder`
- Project: `conditions`, `unitPrice`, `periodStart`, `periodEnd`, `ownerId`
- Wholesale: `conditions`, `unitPrice`, `margin`, `agreedDate`, `ownerId`
- ChatworkRoom: `description`, `lastMessageId`, `lastErrorAt`, `lastErrorMessage`, `lastErrorStatus`
- Message: `labels`, `sender`, `sentAt`
- Summary / SummaryDraft: `periodStart`, `periodEnd`, `sourceLinks`, `model`, `promptVersion`, `sourceMessageCount`, `tokenUsage`, `expiresAt`・・raft縺ｮ縺ｿ・・- Task: `title`, `description`, `dueDate`, `assigneeId`
- Job: `error`, `startedAt`, `finishedAt`

## CRUD 繝槭ヨ繝ｪ繧ｯ繧ｹ・井ｸｻ隕・ｼ・| 繝ｪ繧ｽ繝ｼ繧ｹ | Create | Read | Update | Delete |
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

## 繧､繝ｳ繝・ャ繧ｯ繧ｹ / 蛻ｶ邏・ｼ域栢邊具ｼ・| 繝・・繝悶Ν | 繧､繝ｳ繝・ャ繧ｯ繧ｹ / 繝ｦ繝九・繧ｯ |
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
| app_settings | `key` unique |

## 繧ｭ繝｣繝・す繝･繧ｭ繝ｼ險ｭ險茨ｼ医ヵ繝ｭ繝ｳ繝茨ｼ・| 繧ｭ繝ｼ | TTL | 隱ｬ譏・|
| --- | --- | --- |
| `cacheKey`・域悴謖・ｮ壽凾縺ｯURL・・| `cacheTimeMs` | `useFetch` 縺後Γ繝｢繝ｪ縺ｫ菫晄戟 |

## 謨ｴ蜷域ｧ繝｢繝・Ν
- 荳ｻ繝・・繧ｿ・・ostgreSQL・会ｼ壼ｼｷ謨ｴ蜷・- 髱槫酔譛溷・逅・ｼ・ob/Queue・会ｼ夂ｵ先棡謨ｴ蜷茨ｼ医ず繝ｧ繝門ｮ御ｺ・ｒ蠕・▽・・- 隕∫ｴ・ラ繝ｩ繝輔ヨ・壽悄髯蝉ｻ倥″繧ｭ繝｣繝・す繝･・・summary_drafts.expiresAt`・・
## 繝槭う繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ驕狗畑・育樟迥ｶ・・| 迺ｰ蠅・| 繧ｳ繝槭Φ繝・| 蛯呵・|
| --- | --- | --- |
| 髢狗匱 | `npm run migrate:dev` | Prisma migrate dev |
| 譛ｬ逡ｪ | `npm run migrate:deploy` | Prisma migrate deploy |
