# API / 繧､繝ｳ繧ｿ繝ｼ繝輔ぉ繝ｼ繧ｹ

## API 荳隕ｧ・井ｸｻ隕・ｼ・### Auth
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
| `/api/companies` | POST | 笨・| admin/sales/ops |
| `/api/companies/:id` | GET | 笨・| any |
| `/api/companies/:id` | PATCH | 笨・| admin/sales/ops |
| `/api/companies/:id` | DELETE | 笨・| admin/sales/ops |
| `/api/companies/search` | GET | 笨・| any |
| `/api/companies/options` | GET | 笨・| any |
| `/api/companies/:id/contacts` | GET | 笨・| any |
| `/api/companies/:id/contacts` | POST | 笨・| admin/sales/ops |
| `/api/companies/:id/contacts/reorder` | PATCH | 笨・| admin/sales/ops |
| `/api/contacts/:id` | PATCH | 笨・| admin/sales/ops |
| `/api/contacts/:id` | DELETE | 笨・| admin/sales/ops |
| `/api/companies/:id/projects` | GET | 笨・| any |
| `/api/companies/:id/wholesales` | GET | 笨・| any |
| `/api/companies/:id/tasks` | GET | 笨・| any |
| `/api/companies/:id/messages` | GET | 笨・| any |
| `/api/companies/:id/summaries` | GET | 笨・| any |
| `/api/companies/:id/summaries` | POST | 笨・| admin/sales/ops |
| `/api/companies/:id/summaries/draft` | POST | 笨・| admin/sales/ops |

### Projects / Wholesales
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/projects` | GET | 笨・| any |
| `/api/projects` | POST | 笨・| admin/sales/ops |
| `/api/projects/:id` | GET | 笨・| any |
| `/api/projects/:id` | PATCH | 笨・| admin/sales/ops |
| `/api/projects/:id` | DELETE | 笨・| admin/sales/ops |
| `/api/projects/search` | GET | 笨・| any |
| `/api/projects/:id/wholesales` | GET | 笨・| any |
| `/api/projects/:id/tasks` | GET | 笨・| any |
| `/api/wholesales` | GET | 笨・| any |
| `/api/wholesales` | POST | 笨・| admin/sales/ops |
| `/api/wholesales/:id` | GET | 笨・| any |
| `/api/wholesales/:id` | PATCH | 笨・| admin/sales/ops |
| `/api/wholesales/:id` | DELETE | 笨・| admin/sales/ops |
| `/api/wholesales/:id/tasks` | GET | 笨・| any |

### Messages
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/messages/search` | GET | 笨・| any |
| `/api/messages/unassigned` | GET | 笨・| any |
| `/api/messages/:id/assign-company` | PATCH | 笨・| admin/sales/ops |
| `/api/messages/assign-company` | PATCH | 笨・| admin/sales/ops |
| `/api/messages/:id/labels` | POST | 笨・| admin/sales/ops |
| `/api/messages/:id/labels/:label` | DELETE | 笨・| admin/sales/ops |
| `/api/messages/labels` | GET | 笨・| any |
| `/api/messages/labels/bulk` | POST | 笨・| admin/sales/ops |
| `/api/messages/labels/bulk/remove` | POST | 笨・| admin/sales/ops |

### Tasks
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/tasks` | GET | 笨・| any |
| `/api/tasks` | POST | 笨・| admin/sales/ops |
| `/api/tasks/:id` | GET | 笨・| any |
| `/api/tasks/:id` | PATCH | 笨・| admin/sales/ops |
| `/api/tasks/:id` | DELETE | 笨・| admin/sales/ops |
| `/api/tasks/bulk` | PATCH | 笨・| admin/sales/ops |
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
| `/api/companies/:id/chatwork-rooms` | POST | 笨・| admin/sales/ops |
| `/api/companies/:id/chatwork-rooms/:roomId` | DELETE | 笨・| admin/sales/ops |

### Dashboard / Settings / Search
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/api/dashboard` | GET | 笨・| any |
| `/api/settings` | GET | 笨・| admin |
| `/api/settings` | PATCH | 笨・| admin |
| `/api/search` | GET | 笨・| any |

### Health
| Endpoint | Method | Auth | Role |
| --- | --- | --- | --- |
| `/healthz` | GET | - | - |

## 隱崎ｨｼ繝輔Ο繝ｼ
**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 繝ｭ繧ｰ繧､繝ｳ縺九ｉ隱崎ｨｼ貂医∩API蛻ｩ逕ｨ縺ｾ縺ｧ縺ｮ豬√ｌ繧堤､ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: 繝ｭ繧ｰ繧､繝ｳ縺ｧJWT繧堤匱陦後＠縲，ookie/Authorization縺ｧ`/api/auth/me`縺ｫ繧｢繧ｯ繧ｻ繧ｹ縺励∪縺吶・```mermaid
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

## 繧ｹ繝・・繧ｿ繧ｹ / 繧ｨ繝ｩ繝ｼ繧ｳ繝ｼ繝我ｸ隕ｧ
| HTTP | Code | 隱ｬ譏・|
| --- | --- | --- |
| 400 | `BAD_REQUEST` | 蜈･蜉帑ｸ肴ｭ｣ |
| 401 | `UNAUTHORIZED` | 隱崎ｨｼ螟ｱ謨・|
| 403 | `FORBIDDEN` | 讓ｩ髯蝉ｸ崎ｶｳ |
| 404 | `NOT_FOUND` | 繝ｪ繧ｽ繝ｼ繧ｹ荳榊惠 |
| 409 | `CONFLICT` | 遶ｶ蜷・|
| 422 | `VALIDATION_ERROR` | 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ |
| 429 | `TOO_MANY_REQUESTS` | 繝ｬ繝ｼ繝亥宛髯・|
| 500 | `INTERNAL_SERVER_ERROR` | 莠域悄縺励↑縺・お繝ｩ繝ｼ |

Prisma 萓句､悶・繝・ヴ繝ｳ繧ｰ・井ｾ具ｼ・
- `P2025` 竊・404
- `P2002` 竊・409
- `P2003` 竊・400

## 繝ｬ繝ｼ繝亥宛髯・| 蟇ｾ雎｡ | 險ｭ螳・| 逕ｱ譚･ |
| --- | --- | --- |
| `/api/auth/login` | `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW_MS` | Fastify rate-limit |
| Chatwork API | 5蛻・00蝗樒嶌蠖薙・髢馴囈蛻ｶ蠕｡ | 繧ｯ繝ｩ繧､繧｢繝ｳ繝亥・驛ｨ蛻ｶ蠕｡ |


## 繝舌・繧ｸ繝ｧ繝九Φ繧ｰ譁ｹ驥・- 迴ｾ迥ｶ縺ｯ `/api` 縺ｧ蝗ｺ螳夲ｼ医ヰ繝ｼ繧ｸ繝ｧ繝ｳ辟｡縺暦ｼ・
## Webhook 繧､繝吶Φ繝・| 騾∽ｿ｡蜈・| 蜿嶺ｿ｡繧ｨ繝ｳ繝峨・繧､繝ｳ繝・| 隱崎ｨｼ |
| --- | --- | --- |
| Chatwork | `/api/chatwork/webhook` | `CHATWORK_WEBHOOK_TOKEN` |

## 髱槫酔譛・API・医ず繝ｧ繝厄ｼ・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 繧ｸ繝ｧ繝悶ｒ菴ｿ縺・撼蜷梧悄API縺ｮ豬√ｌ繧堤､ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: API縺形jobs`繧剃ｽ懈・縺励。ullMQ繝ｯ繝ｼ繧ｫ繝ｼ縺悟・逅・＠縺ｦ邨先棡繧奪B縺ｫ蜿肴丐縺励∪縺吶・```mermaid
flowchart LR
  API[Backend API] --> DB[(jobs)]
  API --> Queue[(BullMQ)]
  Queue --> Worker[Worker]
  Worker --> DB
```

## OpenAPI / Swagger
- `/api/docs` 縺ｧ Swagger UI 繧呈署萓・
## 螟夜Κ騾｣謳ｺ縺ｮ螂醍ｴ・ｼ域ｦりｦ・ｼ・| 騾｣謳ｺ蜈・| 逕ｨ騾・| 繧ｨ繝ｳ繝峨・繧､繝ｳ繝・|
| --- | --- | --- |
| Chatwork API | 繝ｫ繝ｼ繝/繝｡繝・そ繝ｼ繧ｸ蜿門ｾ・| `https://api.chatwork.com/v2` |
| OpenAI API | 隕∫ｴ・函謌・| `https://api.openai.com/v1/chat/completions` |
