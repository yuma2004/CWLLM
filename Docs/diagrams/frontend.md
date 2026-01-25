# 繝輔Ο繝ｳ繝医お繝ｳ繝�E/ 逕ｻ髱�E�縺�E�繧上ａE

## 繧�E�繧�E�繝医・繝�E・
**隱�E�譏趣�E�井ｸ闊ｬ・・*: 逕ｻ髱�E�讒区・繧剁E��隕ｧ縺�E�遉ｺ縺吝峙縺�E�縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: 荳�E�隕�EΜ繧�E�繝ｼ繧�E�・・ompanies/Tasks/Projects/Wholesales・峨→險�E�螳夂ｳ�E�逕ｻ髱�E�縺�E�蛻・°繧後∪縺吶・```mermaid
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
  WholesaleDetail["/wholesales/:id"]
  Accounts["/settings/accounts"]
  ChatworkSettings["/settings/chatwork"]

  Root --> Companies
  Root --> Tasks
  Root --> Projects
  Root --> Accounts
  Root --> ChatworkSettings
  Companies --> CompanyDetail
  Tasks --> TaskDetail
  Projects --> ProjectDetail
  ProjectDetail --> WholesaleDetail
  Login --> Root
  Root --> NotFound
```

## 逕ｻ髱�E�驕ｷ遘ｻ・域ｦりｦ・�E�・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 莉｣陦�E�逧・↑逕ｻ髱�E�驕ｷ遘ｻ縺�E�豬√ｌ繧堤�E��E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: 繝繝�Eす繝･繝懊・繝峨�E�襍ｷ轤�E�縺�E�隧�E�邏ｰ逕ｻ髱�E�繧・�E��E�螳夂判髱�E�縺�E�遘ｻ蜍輔＠縺�E�縺吶・```mermaid
flowchart LR
  Login[Login] --> Home[Dashboard]
  Home --> Companies
  Home --> Tasks
  Home --> Projects
  Companies --> CompanyDetail
  Projects --> ProjectDetail
  ProjectDetail --> WholesaleDetail
  Root --> Accounts
  Root --> ChatworkSettings
```

## 繧�E�繝ｳ繝昴・繝阪Φ繝医ヤ繝ｪ繝ｼ・井ｸ�E�隕�E�E�・**隱�E�譏趣�E�井ｸ闊ｬ・・*: UI縺�E�隕ｪ蟁E��未菫めE�E雋ｬ蜍吶・蛻・琁E��堤�E��E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: `App` 竊�E`AuthProvider` 竊�E`ProtectedRoute` 竊�E`Layout` 竊�E蜷・・繝ｼ繧�E�縺�E�讒区・縺�E�縺吶・```mermaid
flowchart TB
  App --> AuthProvider
  AuthProvider --> Routes
  Routes --> ProtectedRoute
  ProtectedRoute --> Layout
  Layout --> Pages[Pages]
  Pages --> Components[UI Components]
```

## 迥�E�諷狗ｮ�E�送E�E�E�育樟迥�E�・・**隱�E�譏趣�E�井ｸ闊ｬ・・*: 迥�E�諷九�E鄂ｮ縺榊�E�謁E�縺�E�莨晁E��縺�E�縺励°縺溘ｒ遉�E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: 隱崎ｨ�E�縺�E�Context縲√ョ繝ｼ繧�E�蜿門�E�励・`useFetch`縺�E�繝｡繝｢繝ｪ繧�E�繝｣繝�Eす繝･縺�E�邂｡送E�E�E�縺�E�縺吶・```mermaid
flowchart LR
  AuthContext["AuthContext user role"] --> ProtectedRoute2[ProtectedRoute]
  LocalState["local state useState"] --> Pages2[Pages]
  useFetch["useFetch/useMutation"] --> apiRequest[apiRequest]
  apiRequest --> BackendAPI["Backend API"]
  useFetch --> Cache["In-memory cache"]
```

## 繝�E・繧�E�蜿門�E�励ヵ繝ｭ繝ｼ
**隱�E�譏趣�E�井ｸ闊ｬ・・*: 逕ｻ髱�E�縺窟PI縺九ｉ繝�E・繧�E�繧貞叙蠕励☁E��区�E�√ｌ繧堤�E��E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: `useFetch` 竊�E`apiRequest` 竊�E`fetch` 竊�EAPI 縺�E�鬁E�E〒蜻�E�縺�E�蜁E��縺励∪縺吶・```mermaid
flowchart LR
  Component --> useFetch
  useFetch --> apiRequest
  apiRequest --> fetch[fetch API]
  fetch --> BackendAPI
  BackendAPI --> useFetch
  useFetch --> Component
```

## UI 迥�E�諷矩・遘ｻ
**隱�E�譏趣�E�井ｸ闊ｬ・・*: 隱�E�縺�E�霎ｼ縺�E�/謌仙粥/遨�E�/繧�E�繝ｩ繝ｼ縺�E�縺�E�縺�E�UI迥�E�諷九ｒ遉�E�縺励∪縺吶・ 
**縺薙�E繝励Ο繧�E�繧�E�繧�E�繝医〒縺�E�**: `useFetch`縺�E�迥�E�諷九�E蜷医�E�縺帙※繝ｭ繝ｼ繝�EぁE��ｳ繧�E�繧・お繝ｩ繝ｼ陦�E�遉ｺ繧貞�E繧頑崛縺医∪縺吶・```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> loading : fetch
  loading --> success : data
  loading --> empty : no data
  loading --> error : error
  error --> loading : retry
```

## 繝輔か繝ｼ繝 / 繝�EΜ繝�E・繧�E�繝ｧ繝ｳ・域ｦりｦ・�E�・| 逕ｻ髱�E� | 蜈･蜉�E| 繝�EΜ繝�E・繧�E�繝ｧ繝ｳ |
| --- | --- | --- |
| Login | email/password | 繧�E�繝ｼ繝仙�E(Zod)縺�E�讀懁E���E�縲√け繝ｩ繧�E�繧�E�繝ｳ繝医・譛蟁E��剁E|
| Company/Project/Task | 蜷・�E��E�鬁E�E岼 | 繧�E�繝ｼ繝仙�E(Zod)縺�E�讀懁E���E� |

## 繧�E�繧�E�繧�E�繧�E�繝薙Μ繝�EぁE�E域悴逶�E�譟ｻ繝ｻ繝�Eぉ繝�Eけ繝ｪ繧�E�繝茨�E�・- 繧�E�繝ｼ繝懊・繝画桁E��懊〒荳�E�隕�E�E�守ｷ壹′謫堺�E�懷庁E���E�
- 繝輔か繝ｼ繧�E�繧�E�繝ｪ繝ｳ繧�E�縺瑚ｦ冶�E�阪〒縺阪�E�E
- 荳�E�隕�E・繧�E�繝ｳ縺�E� `aria-label` 縺御�E�倁E��弱�E�E��後※縺・�E�E
- 繧�E�繝ｳ繝医Λ繧�E�繝域�E�斐′遒ｺ菫昴�E�E��後※縺・�E�E

## i18n / 繝�Eじ繧�E�繝ｳ繝医・繧�E�繝ｳ
- i18n: 譛ｪ蟁E��・・域律譛ｬ隱槫崋螳夲�E�・- 繝�Eじ繧�E�繝ｳ繝医・繧�E�繝ｳ: 譛ｪ蟁E��・・・ailwind繝ｦ繝ｼ繝�EぁE��ｪ繝�EぁE���E�蠢・�E�・

