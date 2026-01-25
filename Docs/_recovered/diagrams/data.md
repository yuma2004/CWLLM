# EEめEぁEわめE

## ER 図EE理EE**誁E明E一般EE*: EEめEぁEめEンEEEEE閁E係E菫E瞁EすE蝗EぁEす、E 
**こEプロめEめEめEトでぁE**: CompaniesEE忁EProjects/Wholesales/Tasks/Chatwork送E搁Eが繋がります、E```mermaid
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

## EEめEフローEEFD レベEEE**誁E明E一般EE*: EEめEがEこからどこE流れるかをEEします、E 
**こEプロめEめEめEトでぁE**: フロントEAPI→DB/Redis→外部APIEEhatwork/OpenAIEE流れぁEす、E```mermaid
flowchart LR
  User[User] --> FE[Frontend]
  FE --> API[Backend API]
  API --> DB[(PostgreSQL)]
  API --> Redis["Redis/BullMQ"]
  API --> Chatwork[Chatwork API]
  API --> OpenAI[OpenAI API]
  Chatwork --> API
```

## めEベンE/ めEョブスめEーマE現犁EEE| JobType | payload | 誁EE|
| --- | --- | --- |
| `chatwork_rooms_sync` | `{}` | ルーム一覧同朚E|
| `chatwork_messages_sync` | `{ roomId?: string, roomLimit?: number }` | メEーめE同朚E|
| `summary_draft` | `{ companyId, periodStart, periodEnd }` | 要EEラフト生E |

## EEめE辞書E丁EEンEEEEEE| めEンEEEE| 丁EぁEEE | 備老E|
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

## めEンEめEめE / 刁EEE抜EEE| EEブE| めEンEめEめE / ユニEめE |
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

## めEャEュめEー訁E計EフロントEE| めEー | TTL | 誁EE|
| --- | --- | --- |
| `cacheKey`E未EE時ぁEURLEE| `cacheTimeMs` | `useFetch` がメモリぁE保E |

## 敁E合态EモEE
- 丁EEEめEEEostgreSQLE：EE敁E吁E- 非同期EEEEEob/QueueE：結果敁E合EジョブEEEE蠕EEE- 要EEラフトE朚E付きめEャEュEEsummary_drafts.expiresAt`EE
## マゟEEレーめEョン運用E現犁EEE| 璁EEE| めEマンE| 備老E|
| --- | --- | --- |
| 開発 | `npm run migrate:dev` | Prisma migrate dev |
| 本畁E | `npm run migrate:deploy` | Prisma migrate deploy |

