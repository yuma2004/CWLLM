# フロントエンド リファクタリング計画（セキュリティ/冗長性の極小化）

## 目的
- 既存の挙動・画面・APIを維持したまま、フロントエンドの攻撃面（漏えい/誤送信/実装ブレ）と重複実装を最小化する。
- 差分は小さく分割し、各フェーズで `npm --prefix frontend test/lint/typecheck` を通す。

## 制約（非ゴール）
- 仕様変更/機能追加/ロジック改善は行わない（挙動維持）。
- 新しいランタイム依存関係は追加しない（必要なら提案して停止）。
- 大規模な移動/リネームは避け、段階的に進める。

## 現状の重点箇所（2026-01-20 時点の調査）

### セキュリティ（攻撃面の増加要因）
- `frontend/src/contexts/AuthContext.tsx` がログイン時に `auth_token` を localStorage に保存（3箇所）。
- `frontend/src/lib/apiClient.ts` が localStorage の `auth_token` を読み、`Authorization: Bearer ...` を自動付与。
- `backend/src/index.ts` は Cookie（HttpOnly）と Authorization の両方に対応しており、現状は「Cookie + Bearer」の二重認証になりやすい。
- `frontend/src/lib/apiClient.ts` が `http(s)://` の絶対URLを許容しているため、誤用時に外部ドメインへ `Authorization` や Cookie（`credentials: include`）を送ってしまう余地がある（現状コードでは絶対URL利用は検出されていない）。

### 冗長（同型コードが複数ファイルに重複）
- リスト/検索ページで同じ型の処理が複数箇所に存在。
  - `handleSearchSubmit` が 4 箇所（Companies/Projects/Tasks/Wholesales）
  - `setPagination((prev) => ({ ...prev, ...data.pagination }))` が 5 箇所（Companies/Projects/Tasks/Wholesales/WholesaleDetail）
  - `key: '/'` で検索フォーカスが 4 箇所
- `Projects.tsx` と `Wholesales.tsx` はフィルタUI構造（Card + grid + submit + ActiveFilters）が類似しており、細部が徐々にズレやすい。
- `frontend/src/pages/CompanyDetail.tsx` が大きく、ページ内ロジック/セクションUIの肥大化が進みやすい。

## 「どこを」「どう減らすか」一覧（優先度順）

| 対象 | 現状（冗長/リスク） | どう減らす（挙動維持） | 削減効果 | 影響/確認 |
|---|---|---|---|---|
| 認証トークン | localStorage保存 + Authorization自動付与 + Cookie（include）で経路が複数 | **Cookie一本化を第一候補**（localStorage保存と Authorization 自動付与を段階廃止）。移行前は token I/O を 1 箇所に集約し、置き換えを安全化 | XSS時の永続トークン窃取リスクを大幅低減、認証経路が単純化 | クロスドメイン環境で Cookie 条件（SameSite/secure/CORS）確認。`/api/auth/me` で復帰できること |
| 外部URL誤送信 | `apiClient` が absolute URL を許可しうる | absolute URL には **Authorization を付けない/credentialsをomit**、もしくは API_BASE_URL のみ許可（allowlist） | 「うっかり外部ドメインへ機密送信」を構造的に封じる | 既存コードが absolute URL を使っていないことを `rg` で確認済み（必要なら例外ルール化） |
| リストページ共通処理 | `handleSearchSubmit`/pagination更新/`'/'`ショートカットが散在 | `useListPage`（または小さなヘルパー群）として抽出し、ページから重複ロジックを除去 | 実装ブレ・バグ混入箇所を削減、修正箇所が1箇所になる | `Companies/Projects/Tasks/Wholesales/WholesaleDetail` の振る舞い同一を確認 |
| フィルタUI | Projects/Wholesales で類似フォームが別実装 | フィルタフォームの「枠」だけ共通化（Grid/Submit/ActiveFilters領域）し、個別フィールドはslot/childrenで差し替え | UI崩れ/操作差の発生源を削減、ページ差分が減る | `eslint`/`test` での差分確認 + 画面操作の目視 |
| 巨大ページ分割 | `CompanyDetail.tsx` が肥大化 | セクションを `components/companies/...` へ抽出（Propsは最小）し、ページは composition に寄せる | 可読性・レビュー性改善、局所変更の差分が小さくなる | ルーティング/権限/データ取得経路は維持。既存テストがあれば追加せずまず維持 |

## フェーズ計画

### Phase 0: ベースライン固定（必須）
- `npm --prefix frontend test`
- `npm --prefix frontend lint`
- `npm --prefix frontend typecheck`
- 重複指標をメモ（`rg` の件数）：`auth_token`/`handleSearchSubmit`/`setPagination((prev)=>...)`/`key: '/'` など

### Phase 1: セキュリティ最小化（優先度: 高）
#### 1-1. 認証経路の一本化（推奨: Cookie）
- 目標: `localStorage` に認証トークンを置かない（`auth_token` を 0 箇所へ）。
- 手順（段階実施）:
  1) token操作を `lib` に集約（置き換え容易化）
  2) `apiClient` の Authorization 自動付与をオプトイン（必要な箇所のみ）へ寄せる
  3) `AuthContext` から localStorage 永続化を削除し、`/api/auth/me` の結果で復帰する
- 追加で強く推奨（バックエンド調整が許可される場合）:
  - ログインレスポンスから `token` を返さない（Cookieのみ）にして、JS側でトークンが見えない構造にする

#### 1-2. 絶対URLへの認証付与禁止（漏えい面の封鎖）
- `apiClient` の `buildUrl()`/`prepareRequest()` の責務を見直し:
  - `http(s)://` のURLは **許可しない**（または allowlist 方式）
  - 許可する場合でも `Authorization` は付けず、`credentials` も `omit`

### Phase 2: リスト/検索の冗長削減（優先度: 高）
- `useUrlSync` + `useListQuery` + `useFetch` + pagination更新/検索submit を束ねる小さな共通関数/Hookを作り、ページから重複を削除。
- 最初の対象（重複が多い順）:
  1) `frontend/src/pages/Companies.tsx`
  2) `frontend/src/pages/Projects.tsx`
  3) `frontend/src/pages/Wholesales.tsx`
  4) `frontend/src/pages/Tasks.tsx`（extraParams/viewMode があるため最後に合わせる）

### Phase 3: 巨大ページの局所分割（優先度: 中）
- `frontend/src/pages/CompanyDetail.tsx` を UIセクション単位で `components/companies/` 配下へ抽出し、ページの責務を「データ取得/イベント配線」に寄せる。

### Phase 4: 未使用コード/余剰機能の削除（優先度: 中）
- `lint/typecheck` を通しながら unused import/export を削除。
- 未使用オプション（例: `useApi` の `retry` 系が実使用されていない等）は、使用状況を `rg` で確定してから削減候補にする。

## 完了条件（最小・客観）
- `npm --prefix frontend test` / `lint` / `typecheck` が通る。
- 認証トークンの永続化が localStorage から排除されている（または少なくとも token I/O が 1 箇所に集約され、段階移行できる状態）。
- 重複指標が減っている（例: `handleSearchSubmit` と pagination 更新が共通化により 0〜1 箇所相当に集約）。

