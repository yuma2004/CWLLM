# フロントエンド / 画面まわり

## サイトマップ
**説明（一般）**: 画面構成を一覧で示す図です。  
**このプロジェクトでは**: 主要リソース（Companies/Tasks/Projects/Wholesales）と設定系画面に分かれます。
```mermaid
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
  Exports["/exports"]

  Root --> Companies
  Root --> Tasks
  Root --> Projects
  Root --> Wholesales
  Root --> Settings
  Settings --> Accounts
  Settings --> ChatworkSettings
  Settings --> Exports
  Companies --> CompanyDetail
  Tasks --> TaskDetail
  Projects --> ProjectDetail
  Wholesales --> WholesaleDetail
  Login --> Root
  Root --> NotFound
```

## 画面遷移（概要）
**説明（一般）**: 代表的な画面遷移の流れを示します。  
**このプロジェクトでは**: ダッシュボードを起点に詳細画面や設定画面へ移動します。
```mermaid
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
  Settings --> Exports
```

## コンポーネントツリー（主要）
**説明（一般）**: UIの親子関係と責務の分担を示します。  
**このプロジェクトでは**: `App` → `AuthProvider` → `ProtectedRoute` → `Layout` → 各ページの構成です。
```mermaid
flowchart TB
  App --> AuthProvider
  AuthProvider --> Routes
  Routes --> ProtectedRoute
  ProtectedRoute --> Layout
  Layout --> Pages[Pages]
  Pages --> Components[UI Components]
```

## 状態管理（現状）
**説明（一般）**: 状態の置き場所と伝播のしかたを示します。  
**このプロジェクトでは**: 認証はContext、データ取得は`useFetch`とメモリキャッシュで管理します。
```mermaid
flowchart LR
  AuthContext["AuthContext user role"] --> ProtectedRoute2[ProtectedRoute]
  LocalState["local state useState"] --> Pages2[Pages]
  useFetch["useFetch/useMutation"] --> apiRequest[apiRequest]
  apiRequest --> BackendAPI["Backend API"]
  useFetch --> Cache["In-memory cache"]
```

## データ取得フロー
**説明（一般）**: 画面がAPIからデータを取得する流れを示します。  
**このプロジェクトでは**: `useFetch` → `apiRequest` → `fetch` → API の順で呼び出します。
```mermaid
flowchart LR
  Component --> useFetch
  useFetch --> apiRequest
  apiRequest --> fetch[fetch API]
  fetch --> BackendAPI
  BackendAPI --> useFetch
  useFetch --> Component
```

## UI 状態遷移
**説明（一般）**: 読み込み/成功/空/エラーなどのUI状態を示します。  
**このプロジェクトでは**: `useFetch`の状態に合わせてローディングやエラー表示を切り替えます。
```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> loading : fetch
  loading --> success : data
  loading --> empty : no data
  loading --> error : error
  error --> loading : retry
```

## フォーム / バリデーション（概要）
| 画面 | 入力 | バリデーション |
| --- | --- | --- |
| Login | email/password | サーバ側(Zod)で検証、クライアントは最小限 |
| Company/Project/Task | 各種項目 | サーバ側(Zod)で検証 |

## アクセシビリティ（未監査・チェックリスト）
- キーボード操作で主要導線が操作可能
- フォーカスリングが視認できる
- 主要ボタンに `aria-label` が付与されている
- コントラスト比が確保されている

## i18n / デザイントークン
- i18n: 未導入（日本語固定）
- デザイントークン: 未導入（Tailwindユーティリティ中心）
