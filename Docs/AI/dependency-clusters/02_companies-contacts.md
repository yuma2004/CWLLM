# クラスター02: 会社・連絡先（Companies/Contacts）

## 目的/範囲
- 会社の一覧/検索/詳細/CRUD
- 連絡先の CRUD / 並び替え / 重複統合
- 会社オプション（カテゴリ/ステータス/タグ）の抽出
- 会社と Chatwork ルーム紐付け UI（API は Chatwork クラスター）

## ドメインモデル（Prisma）
- Company: `id`, `name`, `normalizedName`(unique), `category?`, `status`(default "active"), `tags`(string[]), `profile?`, `ownerId?`, timestamps
  - relation: `owner(User)`, `contacts`, `projects`, `wholesales`, `messages`, `summaries`, `roomLinks`
- Contact: `id`, `companyId`, `name`, `role?`, `email?`, `phone?`, `memo?`, `sortOrder`(default 0), timestamps
  - index: `(companyId, sortOrder)`

## 依存関係
- Prisma（Company, Contact）
- 監査ログ `backend/src/services/audit.ts`
- 文字正規化 `backend/src/utils/normalize.ts`
- TTLキャッシュ `backend/src/utils/ttlCache.ts`
- ページング/バリデーション `backend/src/utils/pagination.ts`, `backend/src/utils/validation.ts`
- RBAC `backend/src/middleware/rbac.ts`

## バックエンド構成
### ルーティング/モジュール
- `backend/src/routes/companies.ts`
  - `/api/companies*` と `/api/contacts*` を定義
- `backend/src/routes/companies.schemas.ts`
  - Zod schema: `companySchema`, `contactSchema`, list/search/query/params
- `backend/src/routes/companies.handlers.ts`
  - CRUD/検索/オプション/連絡先/並び替えロジック
- `backend/src/services/audit.ts`
  - `logAudit` による作成/更新/削除ログ
- `backend/src/utils/normalize.ts`
  - `normalizeCompanyName` (NFKC + lowercase + 記号/空白除去)
- `backend/src/utils/pagination.ts`
  - `parsePagination`, `buildPaginatedResponse`
- `backend/src/utils/validation.ts`
  - `isNonEmptyString`, `isNullableString`, `parseStringArray`
- `backend/src/utils/prisma.ts`
  - `handlePrismaError`, `connectOrDisconnect`
- `backend/src/utils/ttlCache.ts`
  - `companies:options` の TTL キャッシュ

### API/エンドポイント詳細
- `GET /api/companies`
  - クエリ: `q`, `category`, `status`, `tag`, `ownerId`, `page`, `pageSize`
  - `normalizeCompanyName` で名前検索（`name`/`normalizedName` の OR）
  - `parsePagination`（max 1000）→ `buildPaginatedResponse`
- `GET /api/companies/search`
  - `q` 必須、`limit`(1-50, default 20)
  - `name`/`normalizedName` で部分一致
- `POST /api/companies`
  - `requireWriteAccess`
  - `name` 必須 + `parseStringArray(tags)`
  - `normalizedName` を生成して作成
  - `logAudit`（action: create）
- `GET /api/companies/:id`
  - 会社詳細取得、存在しなければ 404
- `PATCH /api/companies/:id`
  - `name/category/status/profile/ownerId/tags` の個別更新
  - `ownerId` は `connectOrDisconnect`
  - `logAudit`（action: update, before/after）
- `DELETE /api/companies/:id`
  - 削除 + `logAudit`（action: delete, before）
- `GET /api/companies/:id/contacts`
  - 会社存在確認後、`sortOrder asc` → `createdAt asc` で取得
- `POST /api/companies/:id/contacts`
  - `name` 必須
  - `sortOrder` を `max + 1` で採番
- `PATCH /api/contacts/:id`
  - `role/email/phone/memo` は nullable 許可
  - `sortOrder` は非負整数のみ
- `DELETE /api/contacts/:id`
  - 単純削除
- `PATCH /api/companies/:id/contacts/reorder`
  - `orderedIds` 必須、同一会社の ID であることを検証
  - `sortOrder` を順番通りに更新（transaction）
- `GET /api/companies/options`
  - TTL 60s キャッシュ
  - `category/status` は `distinct`
  - `tags` は `unnest(tags)` の raw SQL
  - 文字列を sort して返却

### 関数索引（バックエンド）
- `listCompaniesHandler` / `searchCompaniesHandler`
  - フィルタ/検索 + ページング
- `createCompanyHandler` / `updateCompanyHandler` / `deleteCompanyHandler`
  - 会社 CRUD + `logAudit`
- `listCompanyContactsHandler` / `createCompanyContactHandler`
  - 連絡先一覧/作成（`sortOrder` 管理）
- `updateContactHandler` / `deleteContactHandler`
  - 連絡先更新/削除
- `reorderContactsHandler`
  - `orderedIds` に基づく `sortOrder` 再採番
- `getCompanyOptionsHandler`
  - カテゴリ/ステータス/タグの集計 + TTL キャッシュ

## フロントエンド構成
- `frontend/src/pages/Companies.tsx`
  - `CompaniesFilters`/`CompaniesCreateForm`/`CompaniesTable` を内部定義
  - `useUrlSync` でクエリ同期、`useDebouncedValue` で検索遅延
  - `/api/companies` 一覧 + `/api/companies/options` を取得
  - Admin の場合 `/api/chatwork/rooms` からチャットワーク部屋を選択可能
  - 作成後は `/api/companies/:id/chatwork-rooms` に POST して紐付け
- `frontend/src/pages/CompanyDetail.tsx`
  - `Tabs` で `overview/timeline/tasks`
  - Overview: カテゴリ/ステータス/タグ/プロフィールのインライン編集
  - Contacts: 追加/編集/削除/並び替え + 重複統合
  - Timeline: `/api/messages/*` でメッセージ検索 + ラベル管理
  - Chatwork: 連携ルームの一覧/追加/解除
- `frontend/src/components/SearchSelect.tsx`
  - `CompanySearchSelect` が `/api/companies/search` と `/api/companies/:id` を内包
- `frontend/src/hooks/useUrlSync.ts`
  - フィルタ/ページングを URL と同期
- `frontend/src/hooks/useDebouncedValue.ts`
  - 検索入力のデバウンス
- `frontend/src/hooks/usePagination.ts`
  - タイムラインやタスクのローカルページング
- `frontend/src/types/entities.ts`, `frontend/src/types/filters.ts`
  - `Company`, `Contact`, `CompanyOptions`, `CompaniesFilters`
- `frontend/src/utils/queryString.ts`
  - `buildQueryString` で API クエリ生成

### 関数索引（フロントエンド）
- `Companies`（`Companies.tsx`）
  - `handleCreate` で会社作成 + ルーム紐付け
  - `mergedCategories/mergedStatuses` で標準候補と API 候補をマージ
- `CompanyDetail`（`CompanyDetail.tsx`）
  - `handleAddContact`/`handleSaveContact`/`handleConfirmDeleteContact`
  - `reorderContacts`/`moveContact` で並び替え
  - `handleMergeDuplicates` で重複統合（スコア高い連絡先を残す）
  - `handleUpdateCompany` でタグ/プロフィール/カテゴリ/ステータス更新
  - `handleAddLabel`/`handleRemoveLabel` でメッセージラベル編集
  - `handleAddRoom`/`handleRemoveRoom` で Chatwork 連携更新
- `SearchSelect`（`SearchSelect.tsx`）
  - `useFetch` で detail/search を自動取得
  - 選択時に `onChange(id, option)` を通知

## データフロー
- 一覧/検索: `Companies.tsx` → `/api/companies` → ページング更新
- フィルタ同期: `useUrlSync` → URL の `page/pageSize/q/...` を維持
- 会社オプション: `/api/companies/options` を 60s キャッシュ
- 連絡先並び替え: UI で順序変更 → `/contacts/reorder` → 失敗時ロールバック
- 重複統合: `email`/`phone` をキーにグルーピング
  - `contactScore` の高いものを primary にし、必要なら更新 → 残りを削除
- タイムライン: `messages.search` と `companies/:id/messages` を使い分け
  - ラベル追加/削除は `messages/:id/labels` で操作

## 関連テスト
- backend: `backend/src/routes/companies.test.ts`
- frontend: `frontend/src/pages/Companies.test.tsx`, `frontend/src/pages/CompanyDetail.test.tsx`, `frontend/src/components/SearchSelect.test.tsx`

## 他クラスターとの接点
- タスク: `CompanyTasksSection` が `/api/companies/:id/tasks` を利用（クラスター04）
- メッセージ: `/api/messages/*` と `/api/companies/:id/messages`（クラスター05）
- Chatwork連携: `/api/companies/:id/chatwork-rooms`（クラスター06）
- 案件/卸: `Company` が `Project`/`Wholesale` の外部キー（クラスター03）
