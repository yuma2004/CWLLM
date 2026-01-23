# 繧ｻ繧ｭ繝･繝ｪ繝・ぅ

## 閼・ｨ√Δ繝・Μ繝ｳ繧ｰ・・FD + Trust Boundary・・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 繝・・繧ｿ縺ｮ豬√ｌ縺ｨ菫｡鬆ｼ蠅・阜繧貞庄隕門喧縺励※閼・ｨ√ｒ豢励＞蜃ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: 繝悶Λ繧ｦ繧ｶ縺ｯ譛ｪ菫｡鬆ｼ縲√ヰ繝・け繧ｨ繝ｳ繝峨′隱崎ｨｼ/隱榊庄縺ｨ螟夜ΚAPI騾｣謳ｺ縺ｮ荳ｭ蠢・〒縺吶・```mermaid
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

## STRIDE・育樟迥ｶ縺ｮ蟇ｾ遲厄ｼ・| 閼・ｨ・| 蟇ｾ蠢・|
| --- | --- |
| Spoofing | JWT + RBAC |
| Tampering | DB蛻ｶ邏・/ 逶｣譟ｻ繝ｭ繧ｰ |
| Information Disclosure | Cookie `httpOnly`, `secure`(prod) |
| Denial of Service | rate-limit (login) |
| Elevation of Privilege | `requireAdmin` / `requireWriteAccess` |

## 讓ｩ髯舌・繝医Μ繧ｯ繧ｹ・域ｦら払・・| 蠖ｹ蜑ｲ | 隱ｭ縺ｿ蜿悶ｊ | 譖ｸ縺崎ｾｼ縺ｿ | 邂｡逅・|
| --- | --- | --- | --- |
| admin | 笨・| 笨・| 笨・|
| sales | 笨・| 笨・| - |
| ops | 笨・| 笨・| - |
| readonly | 笨・| - | - |

## 遘伜ｯ・ュ蝣ｱ縺ｮ蜿悶ｊ謇ｱ縺・ヵ繝ｭ繝ｼ
**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 遘伜ｯ・ュ蝣ｱ縺後←縺薙〒蛻ｩ逕ｨ縺輔ｌ繧九°繧堤､ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: `.env`/迺ｰ蠅・､画焚縺九ｉ蜿門ｾ励＠縲，hatwork/OpenAI縺ｮ隱崎ｨｼ繝倥ャ繝縺ｧ菴ｿ縺・∪縺吶・```mermaid
flowchart LR
  Env[".env / Render Env"] --> Backend["Backend Process"]
  Backend -->|Authorization: Bearer| OpenAI["OpenAI API"]
  Backend -->|x-chatworktoken| Chatwork["Chatwork API"]
```

## 證怜捷蛹・- 繝代せ繝ｯ繝ｼ繝・ bcrypt 繝上ャ繧ｷ繝･
- 騾壻ｿ｡: HTTPS・医ョ繝励Ο繧､迺ｰ蠅・↓萓晏ｭ假ｼ・- Cookie: `httpOnly`, `secure`(production)

## 逶｣譟ｻ繝ｭ繧ｰ險ｭ險・| 鬆・岼 | 蜀・ｮｹ |
| --- | --- |
| entityType / entityId | 蟇ｾ雎｡ |
| action | create/update/delete |
| changes | before/after |
| userId | 謫堺ｽ懆・|

## SBOM・井ｾ晏ｭ倅ｸ隕ｧ・・- `frontend/package.json`
- `backend/package.json`

## 繧ｻ繧ｭ繝･繝ｪ繝・ぅ繝・せ繝郁ｨ育判・育樟迥ｶ・・| 遞ｮ蛻･ | 螳滓命 |
| --- | --- |
| SAST | 譛ｪ蟆主・ |
| DAST | 譛ｪ蟆主・ |
| 謇句虚繝ｬ繝薙Η繝ｼ | 驕ｩ螳・|
