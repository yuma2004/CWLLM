# 01 企業/担当者

## 1. 概要
- 企業(Company)と担当者(Contact)のCRUDと一覧/検索/フィルタを提供する
- 企業とChatworkルームの紐付けを扱い、タイムラインやタスクと連動する
- 企業詳細でメッセージ/タスク/プロジェクト/卸/サマリーを横断的に確認できるようにする

## 2. 関連ファイル
### Backend
- ルート: `backend/src/routes/companies.ts`
- ハンドラ: `backend/src/routes/companies.handlers.ts`
- スキーマ: `backend/src/routes/companies.schemas.ts`
- ユーティリティ: `backend/src/utils/normalize.ts`, `backend/src/utils/pagination.ts`, `backend/src/utils/cacheKeys.ts`, `backend/src/utils/validation.ts`
- キャッシュ: options取得で `CACHE_KEYS.companyOptions` を使用し、更新時に削除

### Frontend
- 一覧: `frontend/src/pages/Companies.tsx` と `useListPage`
- 詳細: `frontend/src/pages/CompanyDetail.tsx` (Overview/Contacts/Timeline/Projects/Wholesales/Summaries/Tasks)
- UI: `frontend/src/components/companies/*` (Filters/Table/Overview/Contacts/Timeline/Tasks/Projects/Wholesales/Summaries)

### 連携/周辺
- Chatwork連携: `POST /companies/:id/chatwork-rooms`
- メッセージ: `/companies/:id/messages`
- タスク: `/companies/:id/tasks`

## 3. データモデル
- `Company`
  - `id`, `name`, `normalizedName`
  - `category`, `status`, `tags[]`, `profile`
  - `ownerIds[]`
  - `createdAt`, `updatedAt`
  - 制約: `normalizedName` unique
- `Contact`
  - `id`, `companyId`, `name`, `role`, `email`, `phone`, `memo`
  - `sortOrder`, `sortKey`
  - `createdAt`, `updatedAt`
  - インデックス: `[companyId, sortKey]`

## 4. API
- `GET /api/companies`
  - 認可: `requireAuth`
  - Query: `q/category/status/tag/ownerId/page/pageSize`
  - Response: `{ items, pagination }`
- `GET /api/companies/search`
  - 認可: `requireAuth`
  - Query: `q, limit`
  - Response: `{ items: {id,name,status,category,tags}[] }`
- `POST /api/companies`
  - 認可: `requireWriteAccess`
  - Body: `name, category, status, tags[], profile, ownerIds[]`
  - Response: `{ company }`
- `GET /api/companies/:id`
  - 認可: `requireAuth`
  - Response: `{ company }`
- `PATCH /api/companies/:id`
  - 認可: `requireWriteAccess`
  - Body: `name/category/status/tags/profile/ownerIds`
- `DELETE /api/companies/:id`
  - 認可: `requireWriteAccess`
  - Response: `204`
- `GET /api/companies/:id/contacts`
  - 認可: `requireAuth`
  - Response: `{ contacts }`
- `GET /api/companies/:id/projects`
  - 認可: `requireAuth`
  - Response: `{ projects }`
- `GET /api/companies/:id/wholesales`
  - 認可: `requireAuth`
  - Response: `{ wholesales }`
- `GET /api/companies/:id/summaries`
  - 認可: `requireAuth`
  - Response: `{ summaries }`
- `POST /api/companies/:id/contacts`
  - 認可: `requireWriteAccess`
  - Body: `name, role, email, phone, memo`
- `PATCH /api/contacts/:id`
  - 認可: `requireWriteAccess`
  - Body: `name/role/email/phone/memo/sortOrder`
- `DELETE /api/contacts/:id`
  - 認可: `requireWriteAccess`
- `PATCH /api/companies/:id/contacts/reorder`
  - 認可: `requireWriteAccess`
  - Body: `orderedIds[]`
- `GET /api/companies/options`
  - 認可: `requireAuth`
  - Response: `{ categories, statuses, tags }`
- `POST /api/companies/:id/merge`
  - 認可: `requireAdmin`
  - Body: `sourceCompanyId`
  - Response: `{ company }`

## 5. 画面/UX
- Companies 一覧
  - 検索/フィルタ/ページングは `useListPage` で制御
  - 企業作成時にChatwork連携の有無を選択
  - ownerIds のフィルタと表示
- CompanyDetail
  - Overview: 企業情報/担当者/ステータス/タグ
  - Contacts: 連絡先の追加/編集/並び替え
  - Timeline: メッセージの時系列表示とラベル操作
  - Projects: 企業に紐づく案件一覧
  - Wholesales: 企業に紐づく卸一覧
  - Summaries: 企業に紐づくサマリー一覧
  - Tasks: 企業に紐づくタスク一覧

## 6. 実装詳細
### Backend
- `listCompaniesHandler`
  - `q` を `normalizeCompanyName` で正規化し、`name`/`normalizedName` のOR検索
  - category/status/tag/ownerId を `where` に反映
- `searchCompaniesHandler`
  - `q` + `limit` の小規模検索
- `createCompanyHandler` / `updateCompanyHandler`
  - `tags`/`ownerIds` の配列バリデーション
  - `normalizedName` の生成
  - `normalizedName` 重複時は 409 + 既存企業情報を返す
  - 会社オプションキャッシュの削除
- `createCompanyContactHandler`
  - `sortKey` を生成して `sortOrder` と併用
- `reorderContactsHandler`
  - `orderedIds` をもとに `sortKey`/`sortOrder` を transaction で更新
- `getCompanyOptionsHandler`
  - distinct + `unnest(tags)` で候補を収集
- `mergeCompanyHandler`
  - `sourceCompanyId` の関連データを `targetCompanyId` に付け替え
  - tags/ownerIds は union、category/profile は target 優先
  - messages/projects/wholesales/summaries/summaryDrafts/roomLinks/tasks を統合
  - summaryDraft と roomLink は target の重複を優先して source を削除

### Frontend
- `Companies.tsx`
  - `useListPage` の `handleSearchSubmit/clearFilter/clearAllFilters`
  - `handleCreate` でChatwork連携の分岐
  - `handleOwnerChange` の反映
- `CompanyDetail.tsx`
  - Overview/Contacts/Timeline/Projects/Wholesales/Summaries/Tasks のデータ取得と状態連携
  - `handleMergeDuplicates` のAPI連携
  - Contactsの並び替え `reorderContacts` 実装
  - `useCompanyDetailData` / `useCompanyContacts` / `useCompanyOverviewForm` へ分割

## 7. 気になる点 (Readable Code)
- 特になし（主要な整理は完了）

## 8. 改善案
- Zodに `z.preprocess` / `z.refine` を導入して入力正規化
- `CompanyDetail` を hooks とタブコンポーネントに分割
  - `useCompanyDetailData` (Company/Contacts/Messages/Projects/Wholesales/Summaries のfetch)
  - `useCompanyContacts` (追加/更新/並び替え)
  - `useCompanyOverviewForm`
- ChatworkのルームIDは `id`(内部) / `roomId`(Chatwork) に統一して扱う
- `sortKey` を追加し、並び順は `sortKey` で管理
- CompanySearchのレスポンス型を統一

## 9. TODO
- なし（対応完了）
