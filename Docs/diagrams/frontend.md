# フロントエンド / 画面・ルーティング・状態

## 目的
- フロントエンドの処理フローを俯瞰できるようにする
- ルート、認証、データ取得、状態遷移の関係を可視化する

## サイトマップ / ルート一覧
**出典**: `frontend/src/App.tsx`, `frontend/src/constants/routes.tsx`
```mermaid
flowchart TB
  Root["/"]
  Login["/login"]
  NotFound["*"]
  Home["/"]
  Feedback["/feedback"]
  Companies["/companies"]
  CompanyDetail["/companies/:id"]
  Tasks["/tasks"]
  TaskDetail["/tasks/:id"]
  Projects["/projects"]
  ProjectDetail["/projects/:id"]
  WholesaleDetail["/wholesales/:id"]
  Accounts["/settings/accounts"]
  ChatworkSettings["/settings/chatwork"]

  Root --> Home
  Root --> Feedback
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

## 画面遷移（代表フロー）
**説明**: ログイン後に主要画面へ遷移する流れを示す。
```mermaid
flowchart LR
  Login[Login] --> Home[Dashboard]
  Home --> Feedback
  Home --> Companies
  Companies --> CompanyDetail
  Home --> Tasks
  Tasks --> TaskDetail
  Home --> Projects
  Projects --> ProjectDetail
  ProjectDetail --> WholesaleDetail
  Home --> Accounts
  Home --> ChatworkSettings
```

## コンポーネント構成（起点）
**説明**: ルーティングとレイアウトの責務の流れ。
```mermaid
flowchart TB
  BrowserRouter --> App
  App --> AuthProvider
  AuthProvider --> Suspense
  Suspense --> Routes
  Routes --> ProtectedRoute
  ProtectedRoute --> Layout
  Layout --> Pages
  Pages --> UIComponents[UI Components]
```

## 認証とルートガード
**説明**: トークン確認、認証済み判定、ガードの流れ。
```mermaid
sequenceDiagram
  actor User
  participant Browser
  participant Router as BrowserRouter
  participant App
  participant Auth as AuthProvider
  participant Guard as ProtectedRoute
  participant Page
  participant API as Backend API

  User->>Browser: URLへアクセス
  Browser->>Router: SPA起動
  Router->>App: ルート描画
  App->>Auth: AuthProvider初期化
  Auth->>Auth: getAuthToken (localStorage)
  alt tokenあり
    Auth->>API: GET /auth/me (useFetch)
    API-->>Auth: user
    Auth-->>App: userセット
  else tokenなし
    Auth-->>App: userなし
  end
  App->>Guard: ProtectedRoute評価
  alt loading
    Guard-->>Browser: LoadingState
  else 未認証
    Guard-->>Router: /loginへ遷移
  else 認証OK
    Guard->>Page: Layout + Page描画
    Page->>API: データ取得 (useFetch)
    API-->>Page: データ
  end
```

## データ取得とキャッシュ
**説明**: `useFetch` を中心とした取得とキャッシュの流れ。
```mermaid
flowchart LR
  Component --> useFetch
  useFetch -->|cacheKey/ttl| Cache[apiCache]
  useFetch --> apiRequest
  apiRequest --> fetch[fetch API]
  fetch --> BackendAPI
  BackendAPI --> useFetch
  useFetch --> Component
```

## 楽観的更新（Tasks）
**説明**: 更新即時反映 + 失敗時ロールバック。
```mermaid
flowchart TB
  UI[User edits task] --> Optimistic[applyOptimisticTaskUpdate]
  Optimistic --> UIUpdate[UI updates immediately]
  UIUpdate --> Mutation[useMutation PATCH /tasks/:id]
  Mutation -->|success| Refetch[refetchTasks + toast]
  Mutation -->|error| Rollback[restoreOptimisticTasks + setError]
```

## 一覧ページのURL同期（useListPage）
**説明**: フィルタ・ページネーションの状態をURLと同期。
```mermaid
flowchart LR
  URL[location.search] --> UrlSync[useUrlSync]
  UrlSync --> Filters[filters / extraParams / pagination]
  Filters --> Query[useListQuery -> queryString]
  Query --> Fetch[useFetch(buildUrl)]
  Fetch --> API
  API --> Fetch
  Fetch --> Data[setData]
  Data --> Paginate[usePaginationSync]
  Paginate --> UrlSync
```

## UI状態遷移（useFetch / useMutation）
```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> loading : fetch
  loading --> success : data
  loading --> empty : no data
  loading --> error : error
  error --> loading : retry
```

## i18n
- i18nは未導入（文言は各コンポーネントに直書き）。