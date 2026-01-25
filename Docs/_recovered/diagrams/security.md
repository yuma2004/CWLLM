# めEめEュリEE

## 脁EEモEンめEEEFD + Trust BoundaryEE**誁E明E一般EE*: EEめEぁE流れぁE俁EEEEを咡E化して脁EEを洗E蜃Eします、E 
**こEプロめEめEめEトでぁE**: ブラめEめEぁE未俁EE、バEめEンドが認訁E/認咡EE外部API送E搁EぁE丁E忁Eす、E```mermaid
flowchart TB
  subgraph Client[Untrusted]
    Browser[Browser]
  end
  subgraph Server[Trusted]
    API[Backend API]
    DB[(PostgreSQL)]
    Redis[(Redis)]
  end
  External["External APIs Chatwork OpenAI"]

  Browser -->|HTTPS| API
  API --> DB
  API --> Redis
  API -->|HTTPS| External
  External --> API
```

## STRIDEE現犁EぁEEEE| 脁EEE| E忁E|
| --- | --- |
| Spoofing | JWT + RBAC |
| Tampering | DB刁EE/ 盁E査ロめE |
| Information Disclosure | Cookie `httpOnly`, `secure`(prod) |
| Denial of Service | rate-limit (login) |
| Elevation of Privilege | `requireAdmin` / `requireWriteAccess` |

## 権限EトリめEめEE概略EE| 役割 | 誁EぁE取EE| 書き辁EぁE | 管EE|
| --- | --- | --- | --- |
| admin | ✁E| ✁E| ✁E|
| employee | ✁E| ✁E| - |

## 秘寁E堁EぁE取E謁EぁEロー
**誁E明E一般EE*: 秘寁E堁EがEこで刁E用されるかをEEします、E 
**こEプロめEめEめEトでぁE**: `.env`/璁EEEE数から取EE、Ehatwork/OpenAIぁE認訁EヘッダぁE佁EぁEす、E```mermaid
flowchart LR
  Env[".env / Render Env"] --> Backend["Backend Process"]
  Backend -->|Authorization: Bearer| OpenAI["OpenAI API"]
  Backend -->|x-chatworktoken| Chatwork["Chatwork API"]
```

## 暗号匁E- パスワーE bcrypt ハッめEュ
- 通EE: HTTPSEデプロめE璁EEE依EE- Cookie: `httpOnly`, `secure`(production)

## 盁E査ロめE訁E訁E| EE | 冁EEE |
| --- | --- |
| entityType / entityId | E象 |
| action | create/update/delete |
| changes | before/after |
| userId | 操EEE|

## SBOME依E覧EE- `frontend/package.json`
- `backend/package.json`

## めEめEュリEEEトE画E現犁EEE| 種刁E | 実施 |
| --- | --- |
| SAST | 未EE |
| DAST | 未EE |
| yEレビュー | 適宁E|

