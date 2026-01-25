# フロントエンE/ 画靁EぁEわめE

## めEめEトEEE
**誁E明E一般EE*: 画靁E構EE覧ぁE示す図ぁEす、E 
**こEプロめEめEめEトでぁE**: 丁EEめEーめEEEompanies/Tasks/Projects/WholesalesEと訁E定糁E画靁EぁE刁Eれます、E```mermaid
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

## 画靁E遷移E概要EEE**誁E明E一般EE*: 代衁E皁E画靁E遷移ぁE流れをEEします、E 
**こEプロめEめEめEトでぁE**: ダEュボEドE襍ｷ炁EぁE詁E細画靁EめEEE定画靁EぁE移動しぁEす、E```mermaid
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

## めEンポEネントツリーE丁EEEE**誁E明E一般EE*: UIぁE親E係EE責務E刁EEEEします、E 
**こEプロめEめEめEトでぁE**: `App` E`AuthProvider` E`ProtectedRoute` E`Layout` E吁EEーめEぁE構EぁEす、E```mermaid
flowchart TB
  App --> AuthProvider
  AuthProvider --> Routes
  Routes --> ProtectedRoute
  ProtectedRoute --> Layout
  Layout --> Pages[Pages]
  Pages --> Components[UI Components]
```

## 犁E態箁EEEE現犁EEE**誁E明E一般EE*: 犁E態E置き堁EyEぁE伝EぁEしかたを礁Eします、E 
**こEプロめEめEめEトでぁE**: 認訁EぁEContext、デーめE取EE`useFetch`ぁEメモリめEャEュぁE管EEEぁEす、E```mermaid
flowchart LR
  AuthContext["AuthContext user role"] --> ProtectedRoute2[ProtectedRoute]
  LocalState["local state useState"] --> Pages2[Pages]
  useFetch["useFetch/useMutation"] --> apiRequest[apiRequest]
  apiRequest --> BackendAPI["Backend API"]
  useFetch --> Cache["In-memory cache"]
```

## EEめE取Eフロー
**誁E明E一般EE*: 画靁EがAPIからEEめEを取得EEれをEEします、E 
**こEプロめEめEめEトでぁE**: `useFetch` E`apiRequest` E`fetch` EAPI ぁEEE呁EぁEEします、E```mermaid
flowchart LR
  Component --> useFetch
  useFetch --> apiRequest
  apiRequest --> fetch[fetch API]
  fetch --> BackendAPI
  BackendAPI --> useFetch
  useFetch --> Component
```

## UI 犁E態E移
**誁E明E一般EE*: 誁EぁE込ぁE/成功/穁E/めEラーぁEぁEぁEUI犁E態を礁Eします、E 
**こEプロめEめEめEトでぁE**: `useFetch`ぁE犁E態E合E縺てローEEｳめEめEラー衁E示をEり替えます、E```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> loading : fetch
  loading --> success : data
  loading --> empty : no data
  loading --> error : error
  error --> loading : retry
```

## フォーム / EEEめEョンE概要EEE| 画靁E | 入E| EEEめEョン |
| --- | --- | --- |
| Login | email/password | めEーバE(Zod)ぁEEE、クラめEめEントE最EE|
| Company/Project/Task | 吁EEEEE | めEーバE(Zod)ぁEEE |

## めEめEめEめEビリEEE未盁E査・EEリめEトEE- めEーボEド挅Eで丁EEE線が操E咡EE
- フォーめEめEリンめEが視EできEE
- 丁EEEめEンぁE `aria-label` がEEEEてぁEEE
- めEントラめEトEが確保EEてぁEEE

## i18n / EめEントEめEン
- i18n: 未EEE日本語固定EE- EめEントEめEン: 未EEEEailwindユーEEｪEEE忁EEE

