# 繝輔Ο繝ｳ繝医お繝ｳ繝・/ 逕ｻ髱｢縺ｾ繧上ｊ

## 繧ｵ繧､繝医・繝・・
**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 逕ｻ髱｢讒区・繧剃ｸ隕ｧ縺ｧ遉ｺ縺吝峙縺ｧ縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: 荳ｻ隕√Μ繧ｽ繝ｼ繧ｹ・・ompanies/Tasks/Projects/Wholesales・峨→險ｭ螳夂ｳｻ逕ｻ髱｢縺ｫ蛻・°繧後∪縺吶・```mermaid
flowchart TB
  Root["/"]
  Login["/login"]
  NotFound["*"]
  Companies["/companies"]
  CompanyDetail["/companies/:id"]
  Tasks["/tasks"]
  TaskDetail["/tasks/:id"]
  Projects["/projects"]
  ProjectDetail["/projects/:id"]
  Wholesales["/wholesales"]
  WholesaleDetail["/wholesales/:id"]
  Settings["/settings"]
  Accounts["/settings/accounts"]
  ChatworkSettings["/settings/chatwork"]

  Root --> Companies
  Root --> Tasks
  Root --> Projects
  Root --> Wholesales
  Root --> Settings
  Settings --> Accounts
  Settings --> ChatworkSettings
  Companies --> CompanyDetail
  Tasks --> TaskDetail
  Projects --> ProjectDetail
  Wholesales --> WholesaleDetail
  Login --> Root
  Root --> NotFound
```

## 逕ｻ髱｢驕ｷ遘ｻ・域ｦりｦ・ｼ・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 莉｣陦ｨ逧・↑逕ｻ髱｢驕ｷ遘ｻ縺ｮ豬√ｌ繧堤､ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: 繝繝・す繝･繝懊・繝峨ｒ襍ｷ轤ｹ縺ｫ隧ｳ邏ｰ逕ｻ髱｢繧・ｨｭ螳夂判髱｢縺ｸ遘ｻ蜍輔＠縺ｾ縺吶・```mermaid
flowchart LR
  Login[Login] --> Home[Dashboard]
  Home --> Companies
  Home --> Tasks
  Home --> Projects
  Home --> Wholesales
  Companies --> CompanyDetail
  Projects --> ProjectDetail
  Wholesales --> WholesaleDetail
  Settings --> Accounts
  Settings --> ChatworkSettings
```

## 繧ｳ繝ｳ繝昴・繝阪Φ繝医ヤ繝ｪ繝ｼ・井ｸｻ隕・ｼ・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: UI縺ｮ隕ｪ蟄宣未菫ゅ→雋ｬ蜍吶・蛻・球繧堤､ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: `App` 竊・`AuthProvider` 竊・`ProtectedRoute` 竊・`Layout` 竊・蜷・・繝ｼ繧ｸ縺ｮ讒区・縺ｧ縺吶・```mermaid
flowchart TB
  App --> AuthProvider
  AuthProvider --> Routes
  Routes --> ProtectedRoute
  ProtectedRoute --> Layout
  Layout --> Pages[Pages]
  Pages --> Components[UI Components]
```

## 迥ｶ諷狗ｮ｡逅・ｼ育樟迥ｶ・・**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 迥ｶ諷九・鄂ｮ縺榊ｴ謇縺ｨ莨晄眺縺ｮ縺励°縺溘ｒ遉ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: 隱崎ｨｼ縺ｯContext縲√ョ繝ｼ繧ｿ蜿門ｾ励・`useFetch`縺ｨ繝｡繝｢繝ｪ繧ｭ繝｣繝・す繝･縺ｧ邂｡逅・＠縺ｾ縺吶・```mermaid
flowchart LR
  AuthContext["AuthContext user role"] --> ProtectedRoute2[ProtectedRoute]
  LocalState["local state useState"] --> Pages2[Pages]
  useFetch["useFetch/useMutation"] --> apiRequest[apiRequest]
  apiRequest --> BackendAPI["Backend API"]
  useFetch --> Cache["In-memory cache"]
```

## 繝・・繧ｿ蜿門ｾ励ヵ繝ｭ繝ｼ
**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 逕ｻ髱｢縺窟PI縺九ｉ繝・・繧ｿ繧貞叙蠕励☆繧区ｵ√ｌ繧堤､ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: `useFetch` 竊・`apiRequest` 竊・`fetch` 竊・API 縺ｮ鬆・〒蜻ｼ縺ｳ蜃ｺ縺励∪縺吶・```mermaid
flowchart LR
  Component --> useFetch
  useFetch --> apiRequest
  apiRequest --> fetch[fetch API]
  fetch --> BackendAPI
  BackendAPI --> useFetch
  useFetch --> Component
```

## UI 迥ｶ諷矩・遘ｻ
**隱ｬ譏趣ｼ井ｸ闊ｬ・・*: 隱ｭ縺ｿ霎ｼ縺ｿ/謌仙粥/遨ｺ/繧ｨ繝ｩ繝ｼ縺ｪ縺ｩ縺ｮUI迥ｶ諷九ｒ遉ｺ縺励∪縺吶・ 
**縺薙・繝励Ο繧ｸ繧ｧ繧ｯ繝医〒縺ｯ**: `useFetch`縺ｮ迥ｶ諷九↓蜷医ｏ縺帙※繝ｭ繝ｼ繝・ぅ繝ｳ繧ｰ繧・お繝ｩ繝ｼ陦ｨ遉ｺ繧貞・繧頑崛縺医∪縺吶・```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> loading : fetch
  loading --> success : data
  loading --> empty : no data
  loading --> error : error
  error --> loading : retry
```

## 繝輔か繝ｼ繝 / 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ・域ｦりｦ・ｼ・| 逕ｻ髱｢ | 蜈･蜉・| 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ |
| --- | --- | --- |
| Login | email/password | 繧ｵ繝ｼ繝仙・(Zod)縺ｧ讀懆ｨｼ縲√け繝ｩ繧､繧｢繝ｳ繝医・譛蟆城剞 |
| Company/Project/Task | 蜷・ｨｮ鬆・岼 | 繧ｵ繝ｼ繝仙・(Zod)縺ｧ讀懆ｨｼ |

## 繧｢繧ｯ繧ｻ繧ｷ繝薙Μ繝・ぅ・域悴逶｣譟ｻ繝ｻ繝√ぉ繝・け繝ｪ繧ｹ繝茨ｼ・- 繧ｭ繝ｼ繝懊・繝画桃菴懊〒荳ｻ隕∝ｰ守ｷ壹′謫堺ｽ懷庄閭ｽ
- 繝輔か繝ｼ繧ｫ繧ｹ繝ｪ繝ｳ繧ｰ縺瑚ｦ冶ｪ阪〒縺阪ｋ
- 荳ｻ隕√・繧ｿ繝ｳ縺ｫ `aria-label` 縺御ｻ倅ｸ弱＆繧後※縺・ｋ
- 繧ｳ繝ｳ繝医Λ繧ｹ繝域ｯ斐′遒ｺ菫昴＆繧後※縺・ｋ

## i18n / 繝・じ繧､繝ｳ繝医・繧ｯ繝ｳ
- i18n: 譛ｪ蟆主・・域律譛ｬ隱槫崋螳夲ｼ・- 繝・じ繧､繝ｳ繝医・繧ｯ繝ｳ: 譛ｪ蟆主・・・ailwind繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ荳ｭ蠢・ｼ・
