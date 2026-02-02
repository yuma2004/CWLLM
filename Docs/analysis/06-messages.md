# 06 メッセージ

## 1. 概要
- Chatwork メッセージを保存し、会社/案件/卸に紐づける
- メッセージの検索とラベル管理を提供する

## 2. 関連ファイル
### Backend
- ルート: `backend/src/routes/messages.ts`
- ハンドラ: `backend/src/routes/messages.handlers.ts`
- スキーマ: `backend/src/routes/messages.schemas.ts`

### Frontend
- タイムライン: `frontend/src/components/companies/CompanyTimelineTab.tsx`
- 詳細: `frontend/src/pages/CompanyDetail.tsx`

## 3. データモデル
- `Message`: `roomId`, `messageId`, `sender`, `body`, `sentAt`, `labels[]`, `companyId`, `projectId`, `wholesaleId`
- 制約/インデックス: `@@unique([roomId, messageId])`, `@@index([companyId])`, `@@index([companyId, sentAt])`, `GIN(labels)`

## 4. API
- `GET /api/companies/:id/messages`
- `GET /api/messages/search`
- `GET /api/messages/unassigned`
- `PATCH /api/messages/:id/assign-company`
- `PATCH /api/messages/assign-company`
- `POST /api/messages/:id/labels` / `DELETE /api/messages/:id/labels/:label`
- `POST /api/messages/labels/bulk` / `POST /api/messages/labels/bulk/remove`
- `GET /api/messages/labels`

## 5. 実装ポイント
- `listCompanyMessagesHandler`
  - label/date フィルタ + pagination
  - 1ページ目のみ on-demand sync を enqueue
- `searchMessagesHandler`
  - `q` か `messageId` で検索
  - `Prisma.sql` で `to_tsvector` を利用
- `normalizeLabel`
  - 最大30文字、改行/タブを拒否
- `CompanyTimelineTab`
  - Chatwork形式(info/code/quote)のレンダリング
  - `onAddLabel/onRemoveLabel` を提供

## 6. 気になる点
- **全文検索**: `to_tsvector(body)` 用の GIN インデックス確認
- **GETで同期**: on-demand sync がGETに入っている
- **バリデーション**: Zod `min(1)` と `normalizeLabel` の責務が曖昧
- **トランザクション**: bulk label の更新単位
- **検索条件**: `messageSearchQuerySchema` は `q or messageId` を強制できていない

## 7. 改善案
- `normalizeLabel` に合わせた Zod 制約を整理
- `searchMessagesHandler` の SQL を読みやすく整理
- on-demand sync を `POST /messages/sync` へ分離検討
- `body` の全文検索インデックスを最適化
- UI のコード構成を整理

## 8. TODO
- assign/label 操作のUX改善
- search の `q` と `messageId` の優先順位を明確化
- on-demand sync の仕様決定
