# クラスター03: 案件・卸（Projects/Wholesales）

## 目的/範囲
- 案件/卸の一覧・検索・詳細・CRUD
- 案件⇔卸⇔会社の関連一覧
- ステータス/期間/単価/マージン等の管理
- 会社/案件検索セレクタの提供

## ドメインモデル（Prisma）
- Project: `id`, `companyId`, `name`, `conditions?`, `unitPrice?`, `periodStart?`, `periodEnd?`, `status`, `ownerId?`, timestamps
  - relation: `company`, `owner`, `wholesales`, `messages`
- Wholesale: `id`, `projectId`, `companyId`, `conditions?`, `unitPrice?`, `margin?`, `status`, `agreedDate?`, `ownerId?`, timestamps
  - relation: `project`, `company`, `owner`, `messages`
- enum: `ProjectStatus` (`active/paused/closed`), `WholesaleStatus` (`active/paused/closed`)

## 依存関係
- Prisma（Project, Wholesale, Company）
- 監査ログ `backend/src/services/audit.ts`
- バリデーション/ページング/日付変換 `backend/src/utils/validation.ts`, `backend/src/utils/pagination.ts`
- RBAC `backend/src/middleware/rbac.ts`

## バックエンド構成
### ルーティング/モジュール
- `backend/src/routes/projects.ts`
- `backend/src/routes/projects.handlers.ts`
- `backend/src/routes/projects.schemas.ts`
  - 一覧/検索/CRUD/関連卸/会社別案件を一体で実装
- `backend/src/routes/wholesales.ts`
- `backend/src/routes/wholesales.handlers.ts`
- `backend/src/routes/wholesales.schemas.ts`
  - 一覧/CRUD/会社別卸
- `backend/src/routes/shared/schemas.ts`
  - `dateSchema`, `paginationSchema`
- `backend/src/utils/validation.ts`
  - `createEnumNormalizer`, `parseDate`, `parseNumber`, `isNonEmptyString`, `isNullableString`
- `backend/src/utils/prisma.ts`
  - `handlePrismaError`, `connectOrDisconnect`
- `backend/src/services/audit.ts`
  - `logAudit` で作成/更新/削除の記録

### API/エンドポイント詳細（Projects）
- `GET /api/projects`
  - クエリ: `q`, `companyId`, `status`, `sort`, `page`, `pageSize`
  - `normalizeSort` で `createdAt/updatedAt/status/name` を切替
- `GET /api/projects/search`
  - `q` 必須、`companyId` 任意、`limit`(1-50, default 20)
- `POST /api/projects`
  - `requireWriteAccess`
  - `companyId` 必須、存在確認
  - `unitPrice/periodStart/periodEnd/status` を正規化
  - `logAudit`（action: create）
- `GET /api/projects/:id`
  - `company` を include して返却
- `PATCH /api/projects/:id`
  - 既存確認後、部分更新
  - `ownerId` は `connectOrDisconnect`
  - `logAudit`（action: update, before/after）
- `DELETE /api/projects/:id`
  - 削除 + `logAudit`（action: delete, before）
- `GET /api/projects/:id/wholesales`
  - `company`/`owner` を include
- `GET /api/companies/:id/projects`
  - 会社存在確認後、案件一覧

### API/エンドポイント詳細（Wholesales）
- `GET /api/wholesales`
  - クエリ: `projectId`, `companyId`, `status`, `page`, `pageSize`
  - `project/company` を include
- `POST /api/wholesales`
  - `requireWriteAccess`
  - `projectId/companyId` の存在確認
  - `unitPrice/margin/agreedDate/status` を正規化
  - `logAudit`（action: create）
- `GET /api/wholesales/:id`
  - `project/company` を include
- `PATCH /api/wholesales/:id`
  - 既存確認後、部分更新
  - `projectId/companyId` 指定時は存在確認
  - `ownerId` は `connectOrDisconnect`
  - `logAudit`（action: update, before/after）
- `DELETE /api/wholesales/:id`
  - 削除 + `logAudit`（action: delete, before）
- `GET /api/companies/:id/wholesales`
  - 会社存在確認後、卸一覧（`project.company` を include）

### 関数索引（バックエンド）
- `normalizeProjectStatus` / `normalizeStatus`
  - enum を `createEnumNormalizer` で検証
- `normalizeSort`
  - `createdAt/updatedAt/status/name` の orderBy 生成
- `projectRoutes`（`projects.ts`）
  - list/search/create/detail/update/delete + 関連一覧
- `wholesaleRoutes`（`wholesales.ts`）
  - list/create/detail/update/delete + 会社別卸

## フロントエンド構成
- `frontend/src/pages/Projects.tsx`
  - `ProjectsFilters`/`ProjectsCreateForm`/`ProjectsTable`
  - `CompanySearchSelect` で会社選択
  - `/api/projects` 一覧 + `/api/users` で担当者候補取得
- `frontend/src/pages/ProjectDetail.tsx`
  - 案件情報の編集 + 卸の作成/編集/削除
  - `/api/projects/:id` と `/api/projects/:id/wholesales` を取得
- `frontend/src/pages/Wholesales.tsx`
  - 卸一覧 + フィルタ + モーダル編集/削除
  - `ProjectSearchSelect`/`CompanySearchSelect` を使用
- `frontend/src/pages/WholesaleDetail.tsx`
  - 卸詳細の編集/削除 + 関連タスク一覧
  - `/api/wholesales/:id` と `/api/wholesales/:id/tasks`
- `frontend/src/components/SearchSelect.tsx`
  - `/api/projects/search` と `/api/companies/search` を統一 UI で提供
- `frontend/src/types/entities.ts`, `frontend/src/types/filters.ts`
  - `Project`, `Wholesale`, `ProjectsFilters`, `WholesalesFilters`
- `frontend/src/constants/labels.ts`
  - `PROJECT_STATUS_OPTIONS`, `WHOLESALE_STATUS_OPTIONS`, `statusLabel`
- `frontend/src/utils/date.ts`, `frontend/src/utils/format.ts`
  - `formatDate`, `formatDateInput`, `formatCurrency`

### 関数索引（フロントエンド）
- `Projects`（`Projects.tsx`）
  - `handleCreate` で案件作成 → refetch
  - `useUrlSync` で `q/status/companyId/ownerId` を URL 同期
- `ProjectDetail`（`ProjectDetail.tsx`）
  - `handleUpdateProject` で案件更新
  - `handleCreateWholesale` で卸追加
  - `handleUpdateWholesale`/`confirmDeleteWholesale` で卸更新/削除
- `Wholesales`（`Wholesales.tsx`）
  - `handleEditSave` で卸更新（モーダル）
  - `handleDelete` で卸削除
- `WholesaleDetail`（`WholesaleDetail.tsx`）
  - `handleUpdateWholesale` で詳細更新
  - `handleDeleteWholesale` で削除 → 一覧へ遷移
- `SearchSelect`（`SearchSelect.tsx`）
  - detail 取得 + デバウンス検索

## データフロー
- 一覧/検索: `useUrlSync` でクエリ更新 → `/api/projects` or `/api/wholesales`
  - Projects の `sort` は `createdAt/updatedAt/status/name` のみ対応
- 作成/更新: 入力値は文字列で保持し、送信前に数値/日付に変換
- Project 詳細: `/api/projects/:id` + `/api/projects/:id/wholesales` を並列取得
- Wholesale 詳細: `/api/wholesales/:id` + `/api/wholesales/:id/tasks`
- UI フィルタの注意点
  - Projects の `ownerId` フィルタはフロントのみで、バックエンドは未使用
  - Wholesales の `unitPriceMin/Max` フィルタはフロントのみで、バックエンドは未使用
- UI だけの状態
  - `taxType` は表示用で API には送られない

## 関連テスト
- backend: `backend/src/routes/projects.test.ts`
- frontend: `frontend/src/components/SearchSelect.test.tsx`, `frontend/src/utils/date.test.ts`, `frontend/src/utils/queryString.test.ts`

## 他クラスターとの接点
- 会社: `companyId` を通じて Companies クラスターに依存（クラスター02）
- タスク: `/api/wholesales/:id/tasks` を利用（クラスター04）
- 認証: `requireAuth`/`requireWriteAccess` に依存（クラスター01）
