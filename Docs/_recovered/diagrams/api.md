# API / めEンめEーフェーめE

## API 一覧E丁EEEE### Auth
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

### Dashboard / Search
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
**こEプロめEめEめEトでぁE**: ロめEめEンぁEJWTを発行し、Eookie/AuthorizationぁE`/api/auth/me`ぁEめEめEめEめEします、E```mermaid
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

## レート制陁E| E象 | 訁E宁E| 由来 |
| --- | --- | --- |
| `/api/auth/login` | `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | Fastify rate-limit |
| Chatwork API | 5刁E00回相当E間隔刁E御 | めEラめEめEントE部刁E御 |


## EEめEョニンめEE釁E- 珁E犁EぁE `/api` ぁE固定EバーめEョン無しEE
## Webhook めEベンE| 送EEE| 受EEめEンドEめEンE| 認訁E |
| --- | --- | --- |
| Chatwork | `/api/chatwork/webhook` | `CHATWORK_WEBHOOK_TOKEN` |

## 非同EAPIEジョブEE**誁E明E一般EE*: めEョブE菴EぁE同期APIぁE流れをEEします、E 
**こEプロめEめEめEトでぁE**: APIが`jobs`EEし、BullMQワーめEーがEEEEぁE結果をDBぁE反映します、E```mermaid
flowchart LR
  API[Backend API] --> DB[(jobs)]
  API --> Queue[(BullMQ)]
  Queue --> Worker[Worker]
  Worker --> DB
```

## OpenAPI / Swagger
- `/api/docs` ぁE Swagger UI を提E
## 外部送E搁EぁEEEEE概要EEE| 送E搁EE| 用送E| めEンドEめEンE|
| --- | --- | --- |
| Chatwork API | ルーム/メEーめE取EE| `https://api.chatwork.com/v2` |
| OpenAI API | 要EEE| `https://api.openai.com/v1/chat/completions` |



