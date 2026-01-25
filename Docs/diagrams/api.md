# API / 繧�E�繝ｳ繧�E�繝ｼ繝輔ぉ繝ｼ繧�E�

## API 荳隕ｧ・井ｸ�E�隕�E�E�・### Auth
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/auth/login` | POST | - | - |
| `/api/auth/logout` | POST | - | - |
| `/api/auth/me` | GET | 笨・| any |

### Users
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/users` | GET | 笨・| admin |
| `/api/users` | POST | 笨・| admin |
| `/api/users/options` | GET | 笨・| any |
| `/api/users/:id/role` | PATCH | 笨・| admin |

### Companies / Contacts / Related
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/companies` | GET | 笨・| any |
| `/api/companies` | POST | 笨・| admin/employee |
| `/api/companies/:id` | GET | 笨・| any |
| `/api/companies/:id` | PATCH | 笨・| admin/employee |
| `/api/companies/:id` | DELETE | 笨・| admin/employee |
| `/api/companies/search` | GET | 笨・| any |
| `/api/companies/options` | GET | 笨・| any |
| `/api/companies/:id/contacts` | GET | 笨・| any |
| `/api/companies/:id/contacts` | POST | 笨・| admin/employee |
| `/api/companies/:id/contacts/reorder` | PATCH | 笨・| admin/employee |
| `/api/contacts/:id` | PATCH | 笨・| admin/employee |
| `/api/contacts/:id` | DELETE | 笨・| admin/employee |
| `/api/companies/:id/projects` | GET | 笨・| any |
| `/api/companies/:id/wholesales` | GET | 笨・| any |
| `/api/companies/:id/tasks` | GET | 笨・| any |
| `/api/companies/:id/messages` | GET | 笨・| any |
| `/api/companies/:id/summaries` | GET | 笨・| any |
| `/api/companies/:id/summaries` | POST | 笨・| admin/employee |
| `/api/companies/:id/summaries/draft` | POST | 笨・| admin/employee |

### Projects / Wholesales
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/projects` | GET | 笨・| any |
| `/api/projects` | POST | 笨・| admin/employee |
| `/api/projects/:id` | GET | 笨・| any |
| `/api/projects/:id` | PATCH | 笨・| admin/employee |
| `/api/projects/:id` | DELETE | 笨・| admin/employee |
| `/api/projects/search` | GET | 笨・| any |
| `/api/projects/:id/wholesales` | GET | 笨・| any |
| `/api/projects/:id/tasks` | GET | 笨・| any |
| `/api/wholesales` | GET | 笨・| any |
| `/api/wholesales` | POST | 笨・| admin/employee |
| `/api/wholesales/:id` | GET | 笨・| any |
| `/api/wholesales/:id` | PATCH | 笨・| admin/employee |
| `/api/wholesales/:id` | DELETE | 笨・| admin/employee |
| `/api/wholesales/:id/tasks` | GET | 笨・| any |

### Messages
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/messages/search` | GET | 笨・| any |
| `/api/messages/unassigned` | GET | 笨・| any |
| `/api/messages/:id/assign-company` | PATCH | 笨・| admin/employee |
| `/api/messages/assign-company` | PATCH | 笨・| admin/employee |
| `/api/messages/:id/labels` | POST | 笨・| admin/employee |
| `/api/messages/:id/labels/:label` | DELETE | 笨・| admin/employee |
| `/api/messages/labels` | GET | 笨・| any |
| `/api/messages/labels/bulk` | POST | 笨・| admin/employee |
| `/api/messages/labels/bulk/remove` | POST | 笨・| admin/employee |

### Tasks
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/tasks` | GET | 笨・| any |
| `/api/tasks` | POST | 笨・| admin/employee |
| `/api/tasks/:id` | GET | 笨・| any |
| `/api/tasks/:id` | PATCH | 笨・| admin/employee |
| `/api/tasks/:id` | DELETE | 笨・| admin/employee |
| `/api/tasks/bulk` | PATCH | 笨・| admin/employee |
| `/api/me/tasks` | GET | 笨・| any |

### Jobs / Summaries
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/jobs` | GET | 笨・| any |
| `/api/jobs/:id` | GET | 笨・| any |
| `/api/jobs/:id/cancel` | POST | 笨・| any |
| `/api/summaries/:id/tasks/candidates` | POST | 笨・| any |

### Chatwork
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/chatwork/rooms` | GET | 笨・| admin |
| `/api/chatwork/rooms/sync` | POST | 笨・| admin |
| `/api/chatwork/rooms/:id` | PATCH | 笨・| admin |
| `/api/chatwork/messages/sync` | POST | 笨・| admin |
| `/api/chatwork/webhook` | POST | - | - |
| `/api/companies/:id/chatwork-rooms` | GET | 笨・| any |
| `/api/companies/:id/chatwork-rooms` | POST | 笨・| admin/employee |
| `/api/companies/:id/chatwork-rooms/:roomId` | DELETE | 笨・| admin/employee |

### Dashboard / Search
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/dashboard` | GET | 笨・| any |
| `/api/search` | GET | 笨・| any |

### Health
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/healthz` | GET | - | - |

## 隱崎ｨ�E�繝輔Ο繝ｼ
**隱�E�譏趣�E�井ｸ闊ｬ・・*: 繝ｭ繧�E�繧�E�繝ｳ縺九ｉ隱崎ｨ�E�貂医∩API蛻�E�逕ｨ縺�E�縺�E�縺�E�豬√ｌ繧堤�E��E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: 繝ｭ繧�E�繧�E�繝ｳ縺�E�JWT繧堤匱陦後＠縲�E�ookie/Authorization縺�E�`/api/auth/me`縺�E�繧�E�繧�E�繧�E�繧�E�縺励∪縺吶・```mermaid
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

## 繧�E�繝�E・繧�E�繧�E� / 繧�E�繝ｩ繝ｼ繧�E�繝ｼ繝�E�E�隕ｧ
| HTTP | Code | 隱�E�譏�E|
| --- | --- | --- |
| 400 | `BAD_REQUEST` | 蜈･蜉帑ｸ肴�E��E� |
| 401 | `UNAUTHORIZED` | 隱崎ｨ�E�螟ｱ謨・|
| 403 | `FORBIDDEN` | 讓ｩ髯蝉ｸ崎ｶ�E� |
| 404 | `NOT_FOUND` | 繝ｪ繧�E�繝ｼ繧�E�荳榊惠 |
| 409 | `CONFLICT` | 遶�E�蜷・|
| 422 | `VALIDATION_ERROR` | 繝�EΜ繝�E・繧�E�繝ｧ繝ｳ |
| 429 | `TOO_MANY_REQUESTS` | 繝ｬ繝ｼ繝亥宛髯・|
| 500 | `INTERNAL_SERVER_ERROR` | 莠域悄縺励↑縺・お繝ｩ繝ｼ |

Prisma 萓句�E�悶・繝�Eヴ繝ｳ繧�E�・井ｾ具�E�・
- `P2025` 竊�E404
- `P2002` 竊�E409
- `P2003` 竊�E400

## 繝ｬ繝ｼ繝亥宛髯・| 蟁E��雎｡ | 險�E�螳・| 逕ｱ譚･ |
| --- | --- | --- |
| `/api/auth/login` | `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | Fastify rate-limit |
| Chatwork API | 5蛻・00蝗樒嶌蠖薙・髢馴囈蛻�E�蠕｡ | 繧�E�繝ｩ繧�E�繧�E�繝ｳ繝亥・驛ｨ蛻�E�蠕｡ |


## 繝�E・繧�E�繝ｧ繝九Φ繧�E�譁E��驥・- 迴�E�迥�E�縺�E� `/api` 縺�E�蝗ｺ螳夲�E�医ヰ繝ｼ繧�E�繝ｧ繝ｳ辟｡縺暦�E�・
## Webhook 繧�E�繝吶Φ繝�E| 騾∽�E��E�蜈�E| 蜿嶺�E��E�繧�E�繝ｳ繝峨・繧�E�繝ｳ繝�E| 隱崎ｨ�E� |
| --- | --- | --- |
| Chatwork | `/api/chatwork/webhook` | `CHATWORK_WEBHOOK_TOKEN` |

## 髱槫酔譛�EAPI・医ず繝ｧ繝厄�E�・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 繧�E�繝ｧ繝悶�E�菴�E�縺・撼蜷梧悄API縺�E�豬√ｌ繧堤�E��E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: API縺形jobs`繧剁E��懈�E縺励。ullMQ繝ｯ繝ｼ繧�E�繝ｼ縺悟�E送E�E�E�縺�E�邨先棡繧奪B縺�E�蜿肴丐縺励∪縺吶・```mermaid
flowchart LR
  API[Backend API] --> DB[(jobs)]
  API --> Queue[(BullMQ)]
  Queue --> Worker[Worker]
  Worker --> DB
```

## OpenAPI / Swagger
- `/api/docs` 縺�E� Swagger UI 繧呈署萓�E
## 螟夜Κ騾�E�謳�E�縺�E�螂�E�E�・�E�域ｦりｦ・�E�・| 騾�E�謳�E�蜈�E| 逕ｨ騾・| 繧�E�繝ｳ繝峨・繧�E�繝ｳ繝�E|
| --- | --- | --- |
| Chatwork API | 繝ｫ繝ｼ繝/繝｡繝�Eそ繝ｼ繧�E�蜿門�E�・| `https://api.chatwork.com/v2` |
| OpenAI API | 隕∫�E�・函謌�E| `https://api.openai.com/v1/chat/completions` |



